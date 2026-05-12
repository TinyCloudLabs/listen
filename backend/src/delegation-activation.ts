import { deserializeDelegation, type TinyCloudNode } from "@tinycloud/node-sdk";

type PortableDelegation = Parameters<TinyCloudNode["useDelegation"]>[0];
export type PortableDelegationSet = PortableDelegation | PortableDelegation[];
type DelegatedAccess = Awaited<ReturnType<TinyCloudNode["useDelegation"]>>;
type ServiceResult =
  | { ok: true; data?: unknown }
  | {
      ok: false;
      error: {
        code: string;
        service: string;
        message: string;
        cause?: unknown;
        meta?: Record<string, unknown>;
      };
    };

const DELEGATION_BUNDLE_FORMAT = "listen.delegation-bundle";
const VAULT_PUBLIC_KEY_PATH = ".well-known/vault-pubkey";

interface DelegationBundle {
  format: typeof DELEGATION_BUNDLE_FORMAT;
  version: 1;
  delegations: string[];
}

interface PortableResource {
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

let backendSecretsUnlock: Promise<ServiceResult> | null = null;

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

export async function ensureBackendSecretsPrivateIdentity(
  node: TinyCloudNode,
): Promise<ServiceResult> {
  if (hasPrivateEncryptionIdentity(node)) {
    return { ok: true, data: undefined };
  }

  if (!backendSecretsUnlock) {
    backendSecretsUnlock = unlockBackendSecretsPrivateIdentity(node).finally(() => {
      backendSecretsUnlock = null;
    });
  }

  const unlock = await backendSecretsUnlock;
  if (!unlock.ok) return unlock;
  if (hasPrivateEncryptionIdentity(node)) {
    return { ok: true, data: undefined };
  }

  return secretError("Backend vault unlock did not produce a private encryption identity");
}

export async function activatePortableDelegation(
  node: TinyCloudNode,
  delegation: PortableDelegationSet,
): Promise<DelegatedAccess> {
  const delegations = portableDelegations(delegation);
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
    return activateResource(node, only.delegation, only.resource);
  }

  const accessByService = new Map<string, DelegatedAccess>();
  const activated = await Promise.all(
    activatableResources.map(async ({ delegation, resource }) => {
      const service = normalizeResourceService(resource.service);
      const access = await activateResource(node, delegation, resource);
      if (!accessByService.has(service)) {
        accessByService.set(service, access);
      }
      return { service, resource, access };
    }),
  );

  const combined = activated[0].access as DelegatedAccess & Record<string, unknown>;

  for (const [service, access] of accessByService.entries()) {
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

function activateResource(
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

function extractPortableResources(delegation: PortableDelegation): PortableResource[] {
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

  const kv = createFullPathSecretsKV(secretResources);
  const secrets = {
    get vault() {
      return node.secrets.vault;
    },
    get isUnlocked() {
      return node.secrets.isUnlocked;
    },
    unlock: (signer?: unknown) => node.secrets.unlock(signer),
    lock: () => node.secrets.lock(),
    get: async (name: string) => {
      if (!/^[A-Z][A-Z0-9_]*$/.test(name)) {
        return secretError(`Invalid secret name: ${name}`);
      }

      const unlock = await ensureBackendSecretsPrivateIdentity(node);
      if (!unlock.ok) return unlock;

      const result = await node.secrets.vault.getShared<{ value?: unknown }>(
        "",
        `secrets/${name}`,
        { kv },
      );

      if (!result.ok) return result;

      const value = result.data.value.value;
      if (typeof value !== "string") {
        return secretError(`Secret ${name} did not contain a string value`);
      }

      return { ok: true, data: value };
    },
    put: async () => secretError("Delegated backend secret writes are not supported"),
    delete: async () => secretError("Delegated backend secret deletes are not supported"),
    list: async () => secretError("Delegated backend secret listing is not supported"),
  };

  Object.defineProperty(combined, "secrets", { value: secrets, configurable: true });
}

function hasPrivateEncryptionIdentity(node: TinyCloudNode): boolean {
  const vault = node.secrets.vault as unknown as {
    encryptionIdentity?: { privateKey?: Uint8Array };
  };
  return node.secrets.isUnlocked && vault.encryptionIdentity?.privateKey?.length === 32;
}

async function unlockBackendSecretsPrivateIdentity(node: TinyCloudNode): Promise<ServiceResult> {
  const vault = node.secrets.vault as unknown as {
    config?: { tc?: { readPublicSpace?: (...args: unknown[]) => Promise<unknown> } };
  };
  const tc = vault.config?.tc;
  const readPublicSpace = tc?.readPublicSpace;

  if (!tc || typeof readPublicSpace !== "function") {
    node.secrets.lock();
    return node.secrets.unlock() as Promise<ServiceResult>;
  }

  node.secrets.lock();
  tc.readPublicSpace = async (...args: unknown[]) => {
    if (args[2] === VAULT_PUBLIC_KEY_PATH) {
      return { ok: true, data: null };
    }
    return readPublicSpace.apply(tc, args);
  };

  try {
    return (await node.secrets.unlock()) as ServiceResult;
  } finally {
    tc.readPublicSpace = readPublicSpace;
  }
}

function createFullPathSecretsKV(secretResources: ActivatedResource[]) {
  return {
    get: async <V>(key: string, options?: { raw?: boolean }) => {
      const match = findSecretResource(secretResources, key, "tinycloud.kv/get");
      if (!match) return secretError(`No delegated secret read permission for ${key}`);
      return match.access.kv.get<V>(key, { ...options, prefix: "" });
    },
  };
}

function findSecretResource(
  resources: ActivatedResource[],
  key: string,
  action: string,
): ActivatedResource | null {
  return (
    resources.find(({ resource }) => {
      if (!resource.actions.includes(action)) return false;
      return key === resource.path || key.startsWith(`${resource.path.replace(/\/$/, "")}/`);
    }) ?? null
  );
}

function isSecretsSpace(space: string | undefined): boolean {
  return space === "secrets" || space?.endsWith(":secrets") === true;
}

function secretError(message: string) {
  return {
    ok: false as const,
    error: {
      code: "SECRET_ACCESS_FAILED",
      service: "secrets",
      message,
    },
  };
}
