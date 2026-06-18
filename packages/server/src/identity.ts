import { TinyCloudNode, type Manifest } from "@tinycloud/node-sdk";

// ── Configuration ────────────────────────────────────────────────────

export interface BackendIdentityConfig {
  /** Ethereum private key with 0x prefix */
  privateKey: string;
  /** TinyCloud node host */
  host?: string;
  /** KV key prefix for backend data */
  prefix?: string;
  /** Automatically create a space if one doesn't exist */
  autoCreateSpace?: boolean;
}

export interface BackendIdentity {
  node: TinyCloudNode;
  did: string;
}

function backendIdentityManifest(spaceName: string): Manifest {
  return {
    manifest_version: 1,
    app_id: "xyz.tinycloud.listen.backend",
    name: "Listen Backend",
    defaults: false,
    permissions: [
      {
        service: "tinycloud.kv",
        space: spaceName,
        path: "delegations/",
        actions: ["get", "put", "del", "list", "metadata"],
        skipPrefix: true,
      },
      {
        service: "tinycloud.kv",
        space: spaceName,
        path: "xyz.tinycloud.listen/",
        actions: ["get", "put", "del", "list", "metadata"],
        skipPrefix: true,
      },
    ],
  };
}

// ── Create Backend Identity ──────────────────────────────────────────

/**
 * Initialize a TinyCloudNode instance with the given private key,
 * sign in, and return the node + its DID.
 *
 * This is the backend's own identity — used to store delegations
 * and access user data via delegated capabilities.
 */
export async function createBackendIdentity(
  config: BackendIdentityConfig,
): Promise<BackendIdentity> {
  const prefix = config.prefix ?? "listen-be";
  const node = new TinyCloudNode({
    privateKey: config.privateKey,
    host: config.host ?? "https://node.tinycloud.xyz",
    prefix,
    autoCreateSpace: config.autoCreateSpace ?? true,
    enablePublicSpace: false,
    manifest: backendIdentityManifest(prefix),
    includeAccountRegistryPermissions: false,
  });

  await node.signIn();

  return {
    node,
    did: node.did,
  };
}

// ── Session Error Detection ──────────────────────────────────────────

const SESSION_ERROR_PATTERN =
  /\b(session\s+expired|invalid\s+session|token\s+expired|expired\s+credentials?|unauthorized|unauthenticated|sign.?in\s*required)\b|\b401\b(?![\d-])/i;

function isSessionError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return SESSION_ERROR_PATTERN.test(message);
}

// ── Session Refresh Wrapper ──────────────────────────────────────────

/**
 * Wraps an async function so that if it fails with a session-related error,
 * the node re-signs-in and the function is retried once.
 *
 * Use this around any TinyCloud KV/SQL operation that might fail due
 * to an expired session.
 */
export async function withSessionRefresh<T>(node: TinyCloudNode, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    if (isSessionError(err)) {
      // Re-authenticate and retry once
      await node.signIn();
      return fn();
    }

    throw err;
  }
}
