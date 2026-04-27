import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { resolveManifest, validateManifest, type Manifest } from "@tinycloud/node-sdk/core";
import type { ServerInfoPermission } from "@tinyboilerplate/core";

export interface BackendManifestConfig {
  name?: string;
  expiry?: string;
  permissions: ServerInfoPermission[];
}

export interface ConversationManifest extends Manifest {
  backend?: BackendManifestConfig;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
export const MANIFEST_PATH = resolve(__dirname, "../../manifest.json");

function validateBackendConfig(manifest: ConversationManifest): BackendManifestConfig {
  const backend = manifest.backend;
  if (!backend || !Array.isArray(backend.permissions) || backend.permissions.length === 0) {
    throw new Error("manifest.backend.permissions must declare the backend delegation scope");
  }

  validateManifest({
    ...manifest,
    defaults: false,
    delegations: [
      {
        to: "did:example:backend",
        name: backend.name,
        expiry: backend.expiry,
        permissions: backend.permissions,
      },
    ],
  });

  return backend;
}

export function loadConversationManifest(): ConversationManifest {
  const raw = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8")) as ConversationManifest;
  const manifest = validateManifest(raw) as ConversationManifest;
  validateBackendConfig(manifest);
  return manifest;
}

export function backendManifestConfig(): BackendManifestConfig {
  return validateBackendConfig(loadConversationManifest());
}

export function runtimeManifestForBackend(did: string): Manifest {
  const manifest = loadConversationManifest();
  const backend = validateBackendConfig(manifest);
  const { backend: _backend, delegations, ...publicManifest } = manifest;

  return {
    ...publicManifest,
    delegations: [
      ...(delegations ?? []),
      {
        to: did,
        name: backend.name,
        expiry: backend.expiry,
        permissions: backend.permissions.map((permission) => ({
          service: permission.service,
          space: permission.space,
          path: permission.path,
          actions: [...permission.actions],
        })),
      },
    ],
  };
}

export function resolveAppPath(path: string, service = "tinycloud.kv"): string {
  const manifest = loadConversationManifest();
  const resolved = resolveManifest({
    ...manifest,
    defaults: false,
    backend: undefined,
    permissions: [
      {
        service,
        space: "default",
        path,
        actions: service === "tinycloud.sql" ? ["read"] : ["get"],
      },
    ],
    delegations: undefined,
  } as Manifest).resources[0];

  if (!resolved) {
    throw new Error(`Failed to resolve manifest path: ${path}`);
  }

  return resolved.path;
}
