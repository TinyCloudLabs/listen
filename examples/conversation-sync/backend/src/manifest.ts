import { readFileSync } from "fs";
import { createHash } from "crypto";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  isCapabilitySubset,
  resolveManifest,
  validateManifest,
  type Manifest,
  type PermissionEntry,
} from "@tinycloud/node-sdk/core";
import type { ServerInfoPermission } from "@tinyboilerplate/core";

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
const BACKEND_DELEGATION_NAME = "Conversation Sync Backend";
const BACKEND_DELEGATION_EXPIRY = "7d";
export const FIREFLIES_SECRET_NAME = "FIREFLIES_API_KEY";
export const FIREFLIES_SECRET_VAULT_KEY = `secrets/${FIREFLIES_SECRET_NAME}`;

function firefliesSecretGrantPath(backendDid: string): string {
  return `grants/${backendDid}/${FIREFLIES_SECRET_VAULT_KEY}`;
}

function backendDelegationPermissions(backendDid: string): ServerInfoPermission[] {
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
      actions: ["read", "write"],
      description: "Read and write normalized conversation records created from transcript sync.",
    },
    {
      service: "tinycloud.kv",
      space: "secrets",
      path: `vault/${FIREFLIES_SECRET_VAULT_KEY}`,
      actions: ["get"],
      skipPrefix: true,
      description: "Read the encrypted Fireflies API key payload for backend sync.",
    },
    {
      service: "tinycloud.kv",
      space: "secrets",
      path: firefliesSecretGrantPath(backendDid),
      actions: ["get"],
      skipPrefix: true,
      description: "Read the Fireflies API key vault grant shared with this backend.",
    },
  ];
}

function runtimeGrantPermissions(backendDid: string): DescribedPermissionEntry[] {
  return [
    {
      service: "tinycloud.kv",
      space: "secrets",
      path: firefliesSecretGrantPath(backendDid),
      actions: ["get", "put"],
      skipPrefix: true,
      description: "Share the Fireflies API key with the Listen backend for sync.",
    },
  ];
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
    throw new Error("conversation-sync delegates from app code; manifest.delegations is not used");
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

function validateBackendDelegationPolicy(manifest: ConversationManifest, backendDid: string): void {
  const granted = resolveManifest(manifest).resources;
  const requested = resolveManifestPermissions(manifest, backendDelegationPermissions(backendDid));
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

export function backendDelegationResolvedPermissions(backendDid: string): ServerInfoPermission[] {
  const manifest = runtimeManifest(backendDid);
  validateBackendDelegationPolicy(manifest, backendDid);
  return resolveManifestPermissions(manifest, backendDelegationPermissions(backendDid));
}

export function backendDelegationPolicyHash(backendDid: string): string {
  const permissions = backendDelegationResolvedPermissions(backendDid).map((permission) => ({
    service: permission.service,
    space: permission.space,
    path: permission.path,
    actions: [...permission.actions].sort(),
  }));

  return createHash("sha256").update(JSON.stringify(permissions)).digest("hex");
}

export function delegationCoversBackendPolicy(
  permissions: readonly ServerInfoPermission[],
  backendDid: string,
): boolean {
  const requested = backendDelegationResolvedPermissions(backendDid);
  const granted = permissions.map((permission) => ({
    service: permission.service,
    ...(permission.space !== undefined ? { space: permission.space } : {}),
    path: permission.path,
    actions: [...permission.actions],
  }));

  return isCapabilitySubset(requested, granted).subset;
}

export function runtimeManifest(backendDid?: string): Manifest {
  const manifest = loadConversationManifest();
  if (!backendDid) return manifest;

  return {
    ...manifest,
    permissions: [...(manifest.permissions ?? []), ...runtimeGrantPermissions(backendDid)],
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
