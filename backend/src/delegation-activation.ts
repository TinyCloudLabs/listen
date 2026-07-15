import {
  VaultHeaders,
  deserializeDelegation,
  resolveSecretPath,
  type TinyCloudNode,
} from "@tinycloud/node-sdk";

type PortableDelegation = Parameters<TinyCloudNode["useDelegation"]>[0];
export type PortableDelegationSet = PortableDelegation | PortableDelegation[];
type DelegatedAccess = Awaited<ReturnType<TinyCloudNode["useDelegation"]>>;

const DELEGATION_BUNDLE_FORMAT = "listen.delegation-bundle";

interface DelegationBundle {
  format: typeof DELEGATION_BUNDLE_FORMAT;
  version: 1;
  delegations: string[];
}

export interface PortableResource {
  service: string;
  space?: string;
  path: string;
  actions: string[];
}

interface ActivatedResource {
  service: string;
  resource: PortableResource;
  access: DelegatedAccess;
}

interface ActivatableResource {
  delegation: PortableDelegation;
  resource: PortableResource;
}

export class DelegationActivationError extends Error {
  readonly resource: PortableResource;
  readonly cause: unknown;

  constructor(resource: PortableResource, cause: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause);
    super(`Failed to activate delegated resource ${resource.service}:${resource.path}: ${message}`);
    this.name = "DelegationActivationError";
    this.resource = resource;
    this.cause = cause;
  }
}

interface InlineEncryptedEnvelope {
  v: number;
  networkId: string;
  alg: string;
  encryptedSymmetricKey: string;
  encryptedSymmetricKeyHash: string;
  ciphertext: string;
  keyVersion: number;
  metadata?: Record<string, string>;
}

type DecryptEnvelopeResult =
  | { ok: true; data: Uint8Array }
  | { ok: false; error: { code: string; message: string } };

interface EncryptionCapableNode {
  encryption?: {
    decryptEnvelope(
      envelope: InlineEncryptedEnvelope,
      options: { proofs: string[] },
    ): Promise<DecryptEnvelopeResult>;
    encryptToNetwork(
      networkId: string,
      plaintext: Uint8Array,
      options: { aad: Uint8Array; metadata: Record<string, string> },
    ): Promise<
      | { ok: true; data: InlineEncryptedEnvelope }
      | { ok: false; error: { code: string; message: string } }
    >;
  };
}

interface SecretScopeOptions {
  scope?: string;
}

export function deserializePortableDelegationSet(serialized: string): PortableDelegationSet {
  try {
    const parsed = JSON.parse(serialized) as unknown;
    if (isDelegationBundle(parsed)) {
      return parsed.delegations.map((delegation) => deserializeDelegation(delegation));
    }
  } catch {
    // Non-bundle SDK delegations are opaque serialized strings.
  }

  return deserializeDelegation(serialized);
}

export function portableDelegations(input: PortableDelegationSet): PortableDelegation[] {
  return Array.isArray(input) ? input : [input];
}

export function portableDelegationExpiry(input: PortableDelegationSet): Date | null {
  const expiries = portableDelegations(input)
    .map((delegation) => delegation.expiry)
    .filter((expiry): expiry is Date => expiry instanceof Date);

  if (expiries.length === 0) return null;
  return new Date(Math.min(...expiries.map((expiry) => expiry.getTime())));
}

/**
 * Delegations minted in the browser can carry the node URL that was current
 * at grant time in their `host` field — including ephemeral per-CVM dstack
 * URLs (e.g. `<app-id>-8000.dstack-…phala.network`) that die on every node
 * redeploy. `useDelegation` prefers `delegation.host` over the configured
 * host, so activation then targets a dead origin (hangs while the old CVM
 * drains, Cloudflare 525 after it's gone). The capability itself is
 * host-independent; the backend's configured TINYCLOUD_HOST is
 * authoritative, so drop the pinned host before activating.
 */
function withoutPinnedHost(delegation: PortableDelegation): PortableDelegation {
  if (!(delegation as { host?: unknown }).host) return delegation;
  return { ...delegation, host: undefined };
}

export async function activatePortableDelegation(
  node: TinyCloudNode,
  delegation: PortableDelegationSet,
): Promise<DelegatedAccess> {
  const delegations = portableDelegations(delegation).map(withoutPinnedHost);
  const resources = delegations.flatMap(extractPortableResources);
  const activatableResources = delegations.flatMap((entry) =>
    extractPortableResources(entry)
      .filter((resource) => normalizeResourceService(resource.service) !== "capabilities")
      .map((resource) => ({ delegation: entry, resource })),
  );

  if (delegations.length === 1 && resources.length <= 1) {
    return node.useDelegation(delegations[0]);
  }

  if (activatableResources.length === 0) {
    if (delegations.length === 1) return node.useDelegation(delegations[0]);
    throw new Error("Delegation bundle does not include activatable resources");
  }

  if (activatableResources.length === 1) {
    const only = activatableResources[0];
    return activateResourceWithContext(node, only.delegation, only.resource);
  }

  // Activate resources SEQUENTIALLY. The node serializes same-chain
  // operations behind per-chain guards, so N parallel activations don't
  // overlap — they contend (guard queue thrash + epoch-append conflicts)
  // and the whole batch reliably exceeds every timeout. Measured on prod
  // (tinycloud-node#115): 15 resources sequentially ≈ 33s total (~1.7s
  // each); the same 15 in Promise.all never completed within 180s.
  const activated: ActivatedResource[] = [];
  for (const { delegation, resource } of activatableResources) {
    const service = normalizeResourceService(resource.service);
    const access = await activateResourceWithContext(node, delegation, resource);
    activated.push({ service, resource, access });
  }

  const accessByService = new Map<string, ActivatedResource>();
  for (const entry of activated) {
    const current = accessByService.get(entry.service);
    if (!current || shouldPreferActivatedResource(entry, current)) {
      accessByService.set(entry.service, entry);
    }
  }

  const combined = activated[0].access as DelegatedAccess & Record<string, unknown>;

  for (const [service, { access }] of accessByService.entries()) {
    if (service === "kv") {
      Object.defineProperty(combined, "kv", { value: access.kv, configurable: true });
    } else if (service === "sql") {
      Object.defineProperty(combined, "sql", { value: access.sql, configurable: true });
    } else if (service === "duckdb") {
      Object.defineProperty(combined, "duckdb", { value: access.duckdb, configurable: true });
    } else if (service === "hooks") {
      Object.defineProperty(combined, "hooks", { value: access.hooks, configurable: true });
    }
  }

  attachDelegatedSecrets(node, combined, activated);

  return combined;
}

function shouldPreferActivatedResource(
  candidate: ActivatedResource,
  current: ActivatedResource,
): boolean {
  if (candidate.service !== "kv") return false;

  const candidateIsSecret = isSecretsSpace(candidate.resource.space);
  const currentIsSecret = isSecretsSpace(current.resource.space);
  if (currentIsSecret && !candidateIsSecret) return true;
  if (candidateIsSecret && !currentIsSecret) return false;

  return current.resource.path !== "/" && candidate.resource.path === "/";
}

function isDelegationBundle(value: unknown): value is DelegationBundle {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Partial<DelegationBundle>;
  return (
    entry.format === DELEGATION_BUNDLE_FORMAT &&
    entry.version === 1 &&
    Array.isArray(entry.delegations) &&
    entry.delegations.every((delegation) => typeof delegation === "string")
  );
}

export function activateResource(
  node: TinyCloudNode,
  delegation: PortableDelegation,
  resource: PortableResource,
): Promise<DelegatedAccess> {
  const service = normalizeResourceService(resource.service);
  return node.useDelegation({
    ...delegation,
    spaceId: resource.space?.startsWith("tinycloud:") ? resource.space : delegation.spaceId,
    path: resource.path,
    actions: resource.actions.map((action) => normalizeResourceAction(action, service)),
    resources: [{ ...resource, space: resource.space ?? delegation.spaceId }],
  });
}

export async function activateResourceWithContext(
  node: TinyCloudNode,
  delegation: PortableDelegation,
  resource: PortableResource,
): Promise<DelegatedAccess> {
  try {
    return await activateResource(node, delegation, resource);
  } catch (err) {
    throw new DelegationActivationError(resource, err);
  }
}

export function extractPortableResources(delegation: PortableDelegation): PortableResource[] {
  const resources = (delegation as { resources?: unknown }).resources;
  if (!Array.isArray(resources)) return [];

  return resources.flatMap((resource) => {
    if (typeof resource !== "object" || resource === null) return [];
    const entry = resource as {
      service?: unknown;
      space?: unknown;
      path?: unknown;
      actions?: unknown;
    };
    if (
      typeof entry.service !== "string" ||
      typeof entry.path !== "string" ||
      !Array.isArray(entry.actions) ||
      !entry.actions.every((action) => typeof action === "string")
    ) {
      return [];
    }

    return [
      {
        service: entry.service,
        ...(typeof entry.space === "string" ? { space: entry.space } : {}),
        path: entry.path,
        actions: [...entry.actions],
      },
    ];
  });
}

function normalizeResourceService(service: string): string {
  return service.startsWith("tinycloud.") ? service.slice("tinycloud.".length) : service;
}

function normalizeResourceAction(action: string, service: string): string {
  return action.includes("/") ? action : `tinycloud.${service}/${action}`;
}

function attachDelegatedSecrets(
  node: TinyCloudNode,
  combined: DelegatedAccess & Record<string, unknown>,
  activated: ActivatedResource[],
): void {
  const secretResources = activated.filter(
    ({ service, resource }) => service === "kv" && isSecretsSpace(resource.space),
  );

  if (secretResources.length === 0) return;
  const decryptProofCids = activated
    .filter(({ service }) => service === "encryption")
    .map(({ access }) => delegationProofCid(access))
    .filter((cid): cid is string => typeof cid === "string" && cid.length > 0);

  const secrets = {
    get: async (name: string, options?: SecretScopeOptions) => {
      const pathResult = delegatedSecretPath(name, options);
      if (!pathResult.ok) return pathResult;
      const { secretKey } = pathResult.data;
      const match = findSecretResource(secretResources, secretKey, "tinycloud.kv/get");
      if (!match) {
        return secretError(`No delegated secret read permission for ${secretKey}`, "KEY_NOT_FOUND");
      }

      const result = await match.access.kv.get<unknown>(secretKey, { raw: true, prefix: "" });
      if (!result.ok) {
        const code =
          result.error?.code === "KV_NOT_FOUND"
            ? "KEY_NOT_FOUND"
            : (result.error?.code ?? "SECRET_ACCESS_FAILED");
        return secretError(result.error?.message ?? `Failed to read ${secretKey}`, code);
      }

      const envelopeResult = parseEncryptedEnvelope(result.data?.data, secretKey);
      if (!envelopeResult.ok) return envelopeResult;

      const kvProofCid = delegationProofCid(match.access);
      const proofs = [...new Set([kvProofCid, ...decryptProofCids].filter(Boolean))] as string[];
      if (proofs.length === 0) {
        return secretError(`No decrypt proof available for ${secretKey}`, "DECRYPT_DENIED");
      }

      const encryption = (node as TinyCloudNode & EncryptionCapableNode).encryption;
      if (!encryption) {
        return secretError("TinyCloud encryption service is not available", "DECRYPT_UNAVAILABLE");
      }

      const decrypted = await encryption.decryptEnvelope(envelopeResult.data, {
        proofs,
      });
      if (!decrypted.ok) {
        return secretError(decrypted.error.message, decrypted.error.code);
      }

      const valueResult = parseSecretPayload(decrypted.data, secretKey);
      if (!valueResult.ok) return valueResult;

      return { ok: true, data: valueResult.data };
    },
    put: async (name: string, value: string, options?: SecretScopeOptions) => {
      const pathResult = delegatedSecretPath(name, options);
      if (!pathResult.ok) return pathResult;
      const { vaultKey, secretKey } = pathResult.data;
      const match = findSecretResource(secretResources, secretKey, "tinycloud.kv/put");
      if (!match) {
        return secretError(`No delegated secret write permission for ${secretKey}`, "AUTH_DENIED");
      }

      const encryption = (node as TinyCloudNode & EncryptionCapableNode).encryption;
      if (!encryption?.encryptToNetwork) {
        return secretError("TinyCloud encryption service is not available", "ENCRYPT_UNAVAILABLE");
      }

      const ownerDid = ownerDidFromDelegation(match.access.delegation);
      if (!ownerDid) {
        return secretError(
          "Unable to resolve delegation owner for secret encryption",
          "AUTH_DENIED",
        );
      }

      const now = new Date().toISOString();
      const plaintext = new TextEncoder().encode(
        JSON.stringify({ value, createdAt: now, updatedAt: now }),
      );
      const spaceId = match.access.spaceId ?? `${ownerDid}:secrets`;
      const encrypted = await encryption.encryptToNetwork(
        `urn:tinycloud:encryption:${ownerDid}:default`,
        plaintext,
        {
          aad: new TextEncoder().encode(`tinycloud.vault:${spaceId}:${vaultKey}`),
          metadata: {
            [VaultHeaders.VERSION]: "2",
            [VaultHeaders.CIPHER]: "tinycloud-network-envelope",
            [VaultHeaders.CONTENT_TYPE]: "application/json",
          },
        },
      );
      if (!encrypted.ok) {
        return secretError(encrypted.error.message, encrypted.error.code);
      }

      const result = await match.access.kv.put(secretKey, JSON.stringify(encrypted.data), {
        prefix: "",
      });
      if (!result.ok) {
        return secretError(
          result.error?.message ?? `Failed to write ${secretKey}`,
          result.error?.code,
        );
      }

      return { ok: true, data: undefined };
    },
    delete: async (name: string, options?: SecretScopeOptions) => {
      const pathResult = delegatedSecretPath(name, options);
      if (!pathResult.ok) return pathResult;
      const { secretKey } = pathResult.data;
      const match = findSecretResource(secretResources, secretKey, "tinycloud.kv/del");
      if (!match) {
        return secretError(`No delegated secret delete permission for ${secretKey}`, "AUTH_DENIED");
      }

      const result = await match.access.kv.delete(secretKey, { prefix: "" });
      if (!result.ok) {
        return secretError(
          result.error?.message ?? `Failed to delete ${secretKey}`,
          result.error?.code,
        );
      }

      return { ok: true, data: undefined };
    },
    list: async () => secretError("Delegated backend secret listing is not supported"),
  };

  Object.defineProperty(combined, "secrets", { value: secrets, configurable: true });
}

function delegatedSecretPath(
  name: string,
  options?: SecretScopeOptions,
): { ok: true; data: { vaultKey: string; secretKey: string } } | ReturnType<typeof secretError> {
  try {
    const resolved = resolveSecretPath(name, options);
    return {
      ok: true,
      data: {
        vaultKey: resolved.vaultKey,
        secretKey: resolved.permissionPaths.vault,
      },
    };
  } catch (err) {
    return secretError(err instanceof Error ? err.message : String(err), "INVALID_SECRET_NAME");
  }
}

function delegationProofCid(access: DelegatedAccess): string | undefined {
  const maybeAccess = access as DelegatedAccess & {
    delegation?: { cid?: string };
    restorable?: { delegationCid?: string };
  };
  return maybeAccess.restorable?.delegationCid ?? maybeAccess.delegation?.cid;
}

function parseEncryptedEnvelope(
  rawEnvelope: unknown,
  secretKey: string,
): { ok: true; data: InlineEncryptedEnvelope } | ReturnType<typeof secretError> {
  const parsed = typeof rawEnvelope === "string" ? tryParseJson(rawEnvelope) : rawEnvelope;

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as Partial<InlineEncryptedEnvelope>).v !== "number" ||
    typeof (parsed as Partial<InlineEncryptedEnvelope>).networkId !== "string" ||
    typeof (parsed as Partial<InlineEncryptedEnvelope>).alg !== "string" ||
    typeof (parsed as Partial<InlineEncryptedEnvelope>).encryptedSymmetricKey !== "string" ||
    typeof (parsed as Partial<InlineEncryptedEnvelope>).encryptedSymmetricKeyHash !== "string" ||
    typeof (parsed as Partial<InlineEncryptedEnvelope>).ciphertext !== "string" ||
    typeof (parsed as Partial<InlineEncryptedEnvelope>).keyVersion !== "number"
  ) {
    return secretError(
      `Secret ${secretKey} did not contain an encrypted envelope`,
      "INVALID_ENVELOPE",
    );
  }

  return { ok: true, data: parsed as InlineEncryptedEnvelope };
}

function findSecretResource(
  resources: ActivatedResource[],
  key: string,
  action: string,
): ActivatedResource | null {
  return (
    resources.find(({ resource }) => {
      const service = normalizeResourceService(resource.service);
      if (!resource.actions.some((entry) => normalizeResourceAction(entry, service) === action)) {
        return false;
      }
      return key === resource.path || key.startsWith(`${resource.path.replace(/\/$/, "")}/`);
    }) ?? null
  );
}

function ownerDidFromDelegation(delegation: DelegatedAccess["delegation"]): string | null {
  const entry = delegation as {
    ownerAddress?: unknown;
    address?: unknown;
    chainId?: unknown;
    spaceId?: unknown;
  };
  const address = typeof entry.ownerAddress === "string" ? entry.ownerAddress : entry.address;
  if (typeof address === "string" && address) {
    const chainId = typeof entry.chainId === "number" ? entry.chainId : 1;
    return `did:pkh:eip155:${chainId}:${address}`;
  }

  if (typeof entry.spaceId === "string") {
    const match = entry.spaceId.match(/^(did:pkh:eip155:\d+:0x[a-fA-F0-9]{40})(?::[^:]+)?$/);
    return match?.[1] ?? null;
  }

  return null;
}

function isSecretsSpace(space: string | undefined): boolean {
  return space === "secrets" || space?.endsWith(":secrets") === true;
}

function parseSecretPayload(
  plaintext: Uint8Array,
  secretKey: string,
): { ok: true; data: string } | ReturnType<typeof secretError> {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(plaintext)) as {
      value?: unknown;
    };
    if (typeof parsed.value !== "string") {
      return secretError(`Secret ${secretKey} did not contain a string value`, "INVALID_ENVELOPE");
    }
    return { ok: true, data: parsed.value };
  } catch {
    return secretError(`Secret ${secretKey} did not contain valid JSON`, "INVALID_ENVELOPE");
  }
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function secretError(message: string, code = "SECRET_ACCESS_FAILED") {
  return {
    ok: false as const,
    error: {
      code,
      message,
    },
  };
}
