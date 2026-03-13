import { TinyCloudNode } from "@tinycloud/node-sdk";

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
  const node = new TinyCloudNode({
    privateKey: config.privateKey,
    host: config.host ?? "https://node.tinycloud.xyz",
    prefix: config.prefix ?? "boilerplate-be",
    autoCreateSpace: config.autoCreateSpace ?? true,
  });

  await node.signIn();

  return {
    node,
    did: node.did,
  };
}

// ── Session Refresh Wrapper ──────────────────────────────────────────

/**
 * Wraps an async function so that if it fails with a session-related error,
 * the node re-signs-in and the function is retried once.
 *
 * Use this around any TinyCloud KV/SQL operation that might fail due
 * to an expired session.
 */
export async function withSessionRefresh<T>(
  node: TinyCloudNode,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    // Check for session expiry / authorization errors
    const isSessionError =
      message.includes("session") ||
      message.includes("expired") ||
      message.includes("unauthorized") ||
      message.includes("401") ||
      message.includes("Unauthorized");

    if (isSessionError) {
      // Re-authenticate and retry once
      await node.signIn();
      return fn();
    }

    throw err;
  }
}
