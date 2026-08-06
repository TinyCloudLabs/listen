import { readFileSync } from "fs";
import { createHash } from "crypto";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  canonicalizeNetworkId,
  isCapabilitySubset,
  resolveManifest,
  resolveSecretPath,
  validateManifest,
  type Manifest,
  type PermissionEntry,
} from "@tinycloud/sdk-core";
import type { ServerInfoPermission } from "@listen/core";
import {
  GOOGLE_MEET_TOKENS_SECRET_NAME,
  GOOGLE_MEET_TOKENS_SECRET_SCOPE,
} from "./services/google-tokens.js";
import { OTTER_COOKIE_SECRET_NAME, OTTER_COOKIE_SECRET_SCOPE } from "./services/otter-secret.js";

export interface DescribedPermissionEntry extends PermissionEntry {
  description?: string;
}

export interface BackendDelegationConfig {
  name: string;
  expiry?: string;
  permissions: ServerInfoPermission[];
}

export interface ConversationManifest extends Omit<Manifest, "permissions"> {
  manifest_version?: 1;
  permissions?: DescribedPermissionEntry[];
}

const __dirname = dirname(fileURLToPath(import.meta.url));
export const MANIFEST_PATH = resolve(__dirname, "../../manifest.json");
const MANIFEST_VERSION = 1;
const BACKEND_DELEGATION_NAME = "Listen Backend";
const BACKEND_DELEGATION_EXPIRY = "7d";
export const FIREFLIES_SECRET_NAME = "FIREFLIES_API_KEY";
export const FIREFLIES_SECRET_VAULT_KEY = `secrets/${FIREFLIES_SECRET_NAME}`;
export const GRANOLA_SECRET_NAME = "GRANOLA_API_KEY";
export const GRANOLA_SECRET_VAULT_KEY = `secrets/${GRANOLA_SECRET_NAME}`;
export const SOUNDCORE_SESSION_SECRET_NAME = "SOUNDCORE_SESSION";
export const SOUNDCORE_AUTH_TOKEN_SECRET_NAME = "SOUNDCORE_AUTH_TOKEN";
export const SOUNDCORE_UID_SECRET_NAME = "SOUNDCORE_UID";
export const SOUNDCORE_OPENUDID_SECRET_NAME = "SOUNDCORE_OPENUDID";
export const TRANSCRIPTION_SECRET_NAMES = ["ASSEMBLYAI_API_KEY", "DEEPGRAM_API_KEY"] as const;
const SOUNDCORE_SECRET_NAMES = [
  SOUNDCORE_SESSION_SECRET_NAME,
  SOUNDCORE_AUTH_TOKEN_SECRET_NAME,
  SOUNDCORE_UID_SECRET_NAME,
  SOUNDCORE_OPENUDID_SECRET_NAME,
] as const;
const BACKEND_SECRET_GRANTS = [
  {
    name: FIREFLIES_SECRET_NAME,
    actions: ["get"],
    description: `Read the encrypted ${FIREFLIES_SECRET_NAME} payload for backend workflows.`,
  },
  {
    name: GRANOLA_SECRET_NAME,
    actions: ["get"],
    description: `Read the encrypted ${GRANOLA_SECRET_NAME} payload for backend workflows.`,
  },
  ...SOUNDCORE_SECRET_NAMES.map((name) => ({
    name,
    actions: ["get"],
    description: `Read the encrypted ${name} payload for Soundcore sync.`,
  })),
  ...TRANSCRIPTION_SECRET_NAMES.map((name) => ({
    name,
    actions: ["get"],
    description: `Read the encrypted ${name} payload for backend workflows.`,
  })),
  {
    name: GOOGLE_MEET_TOKENS_SECRET_NAME,
    scope: GOOGLE_MEET_TOKENS_SECRET_SCOPE,
    actions: ["get", "put", "del"],
    description: "Read, write, and delete encrypted Google Meet OAuth tokens.",
  },
  {
    name: OTTER_COOKIE_SECRET_NAME,
    scope: OTTER_COOKIE_SECRET_SCOPE,
    actions: ["get", "put", "del"],
    description: "Read, write, and delete the encrypted Otter session cookie.",
  },
] as const;

export function ownerDidFromAddress(address: string, chainId = 1): string {
  return `did:pkh:eip155:${chainId}:${address}`;
}

function defaultEncryptionNetworkId(ownerDid: string): string {
  return `urn:tinycloud:encryption:${ownerDid}:default`;
}

function secretVaultPath(secretName: string, scope?: string): string {
  return resolveSecretPath(secretName, scope ? { scope } : undefined).permissionPaths.vault;
}

function backendSecretPermissions(): ServerInfoPermission[] {
  return BACKEND_SECRET_GRANTS.map((grant) => ({
    service: "tinycloud.kv",
    space: "secrets",
    path: secretVaultPath(grant.name, "scope" in grant ? grant.scope : undefined),
    actions: [...grant.actions],
    skipPrefix: true,
    description: grant.description,
  }));
}

function backendEncryptionPermissions(ownerDid?: string): ServerInfoPermission[] {
  if (!ownerDid) return [];

  return [
    {
      service: "tinycloud.encryption",
      space: "encryption",
      path: defaultEncryptionNetworkId(ownerDid),
      actions: ["decrypt"],
      skipPrefix: true,
      description: "Decrypt Listen secrets through the user's default encryption network.",
    },
  ];
}

function backendDelegationPermissions(
  _backendDid: string,
  ownerDid?: string,
): ServerInfoPermission[] {
  return [
    {
      service: "tinycloud.kv",
      path: "/",
      actions: ["get", "put", "del", "list", "metadata"],
      description:
        "Store per-user sync configuration, transcript blobs, webhook state, and external service tokens.",
    },
    {
      service: "tinycloud.sql",
      path: "conversations",
      actions: ["read", "write", "schema"],
      description:
        "Read and write normalized conversation records, and create/migrate the conversations schema (ensureSchema) so the backend can seed fresh accounts.",
    },
    ...backendSecretPermissions(),
    ...backendEncryptionPermissions(ownerDid),
  ];
}

function runtimeGrantPermissions(
  _backendDid: string,
  ownerDid?: string,
): DescribedPermissionEntry[] {
  return backendEncryptionPermissions(ownerDid);
}

function validateConversationManifest(manifest: Manifest): ConversationManifest {
  const withUnknownFields = manifest as Manifest & {
    backend?: unknown;
    delegations?: unknown;
    manifest_version?: unknown;
    permissions?: unknown;
  };

  if (withUnknownFields.backend !== undefined) {
    throw new Error("manifest.backend is no longer supported; declare user permissions directly");
  }

  if (withUnknownFields.delegations !== undefined) {
    throw new Error("Listen delegates from app code; manifest.delegations is not used");
  }

  const manifestVersion = withUnknownFields.manifest_version ?? MANIFEST_VERSION;
  if (manifestVersion !== MANIFEST_VERSION) {
    throw new Error(`manifest.manifest_version must be ${MANIFEST_VERSION}`);
  }

  if (
    withUnknownFields.permissions !== undefined &&
    !Array.isArray(withUnknownFields.permissions)
  ) {
    throw new Error("manifest.permissions must be an array when provided");
  }

  for (const [index, permission] of (withUnknownFields.permissions ?? []).entries()) {
    if (
      typeof permission === "object" &&
      permission !== null &&
      "description" in permission &&
      typeof (permission as { description?: unknown }).description !== "string"
    ) {
      throw new Error(`manifest.permissions[${index}].description must be a string when provided`);
    }
  }

  return manifest as ConversationManifest;
}

export function loadConversationManifest(): ConversationManifest {
  const raw = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8")) as ConversationManifest;
  return validateConversationManifest(validateManifest(raw));
}

function resolveManifestPermissions(
  manifest: ConversationManifest,
  permissions: readonly ServerInfoPermission[],
): ServerInfoPermission[] {
  const { secrets: _secrets, ...manifestWithoutGeneratedResources } = manifest;
  const resolved = resolveManifest({
    ...manifestWithoutGeneratedResources,
    defaults: false,
    permissions: permissions.map((permission) => ({
      service: permission.service,
      ...(permission.space !== undefined ? { space: permission.space } : {}),
      path: permission.path,
      actions: [...permission.actions],
      ...(permission.skipPrefix !== undefined ? { skipPrefix: permission.skipPrefix } : {}),
    })),
  }).resources;

  return resolved.map((permission, index) => ({
    service: permission.service,
    space: permission.space,
    path: permission.path,
    actions: [...permission.actions],
    skipPrefix: permissions[index]?.skipPrefix,
    description: permissions[index]?.description,
  }));
}

function validateBackendDelegationPolicy(
  manifest: ConversationManifest,
  backendDid: string,
  ownerDid?: string,
): void {
  const granted = resolveManifest(manifest).resources;
  const requested = resolveManifestPermissions(
    manifest,
    backendDelegationPermissions(backendDid, ownerDid),
  );
  const { subset, missing } = isCapabilitySubset(requested, granted);

  if (!subset) {
    throw new Error(
      `backend delegation policy exceeds manifest permissions: ${missing
        .map((permission) => `${permission.service}:${permission.path}`)
        .join(", ")}`,
    );
  }
}

export function backendManifestConfig(backendDid: string): BackendDelegationConfig {
  const manifest = runtimeManifest(backendDid);
  validateBackendDelegationPolicy(manifest, backendDid);

  return {
    name: BACKEND_DELEGATION_NAME,
    expiry: BACKEND_DELEGATION_EXPIRY,
    permissions: backendDelegationPermissions(backendDid).map((permission) => ({
      service: permission.service,
      space: permission.space,
      path: permission.path,
      actions: [...permission.actions],
      skipPrefix: permission.skipPrefix,
      description: permission.description,
    })),
  };
}

export function backendDelegationResolvedPermissions(
  backendDid: string,
  ownerDid?: string,
): ServerInfoPermission[] {
  const manifest = runtimeManifest(backendDid, ownerDid);
  validateBackendDelegationPolicy(manifest, backendDid, ownerDid);
  return resolveManifestPermissions(manifest, backendDelegationPermissions(backendDid, ownerDid));
}

export function backendDelegationPolicyHash(backendDid: string, ownerDid?: string): string {
  const permissions = backendDelegationResolvedPermissions(backendDid, ownerDid).map((permission) =>
    normalizePermissionForPolicyHash({
      service: permission.service,
      space: permission.space,
      path: permission.path,
      actions: [...permission.actions].sort(),
    }),
  );

  return createHash("sha256").update(JSON.stringify(permissions)).digest("hex");
}

export function delegationCoversBackendPolicy(
  permissions: readonly ServerInfoPermission[],
  backendDid: string,
  ownerDid?: string,
): boolean {
  const requested = normalizePermissionsForSdkComparison(
    backendDelegationResolvedPermissions(backendDid, ownerDid),
  );
  const granted = normalizePermissionsForSdkComparison(
    permissions.map((permission) => ({
      service: permission.service,
      space: permission.space,
      path: permission.path,
      actions: [...permission.actions],
    })),
  );

  return isCapabilitySubset(requested, granted).subset;
}

function normalizePermissionsForSdkComparison(
  permissions: readonly {
    service: string;
    space?: string;
    path: string;
    actions: string[];
  }[],
) {
  return permissions.flatMap((permission) => {
    const normalized = normalizePermissionForPolicyComparison(permission);
    return normalized.actions.map((action) => ({ ...normalized, actions: [action] }));
  });
}

function normalizePermissionForPolicyHash(permission: {
  service: string;
  space?: string;
  path: string;
  actions: string[];
}) {
  const normalized = normalizePermissionForPolicyComparison(permission);

  return {
    service: normalized.service,
    space: normalized.space,
    path: normalized.path,
    actions: normalized.actions,
  };
}

function normalizePermissionForPolicyComparison(permission: {
  service: string;
  space?: string;
  path: string;
  actions: string[];
}) {
  return {
    service: permission.service,
    ...(permission.space !== undefined ? { space: permission.space } : {}),
    path: normalizePermissionPathForPolicyComparison(permission),
    actions: [...permission.actions],
  };
}

function normalizePermissionPathForPolicyComparison(permission: {
  service: string;
  path: string;
}): string {
  if (permission.service !== "tinycloud.encryption") {
    return permission.path;
  }

  return canonicalizeNetworkId(permission.path);
}

export function runtimeManifest(backendDid?: string, ownerDid?: string): Manifest {
  const manifest = loadConversationManifest();
  if (!backendDid) return manifest;

  return {
    ...manifest,
    permissions: [
      ...(manifest.permissions ?? []),
      ...runtimeGrantPermissions(backendDid, ownerDid),
    ],
  };
}

export function resolveAppPath(path: string, service = "tinycloud.kv"): string {
  const manifest = loadConversationManifest();
  const { secrets: _secrets, ...manifestWithoutGeneratedResources } = manifest;
  const resolved = resolveManifest({
    ...manifestWithoutGeneratedResources,
    defaults: false,
    permissions: [
      {
        service,
        path,
        actions: service === "tinycloud.sql" ? ["read"] : ["get"],
      },
    ],
  } as Manifest).resources[0];

  if (!resolved) {
    throw new Error(`Failed to resolve manifest path: ${path}`);
  }

  return resolved.path;
}
