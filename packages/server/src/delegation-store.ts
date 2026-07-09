import type { TinyCloudNode } from "@tinycloud/node-sdk";
import type { StoredDelegation } from "@listen/core";
import { withSessionRefresh } from "./identity.js";

// ── Types ────────────────────────────────────────────────────────────

export interface DelegationMetadata {
  grantedAt?: string;
  expiresAt: string;
  actions: string[];
  path: string;
  policyHash?: string;
  resources?: StoredDelegation["resources"];
}

// ── Delegation Store ─────────────────────────────────────────────────

/**
 * Persists and retrieves user delegations using the backend's own
 * TinyCloud KV store.
 *
 * Key format: `delegations/{identifier}` in the backend's KV space.
 */
export class DelegationStore {
  constructor(private readonly node: TinyCloudNode) {}

  /**
   * Store a serialized delegation for a user identifier.
   */
  async store(identifier: string, serialized: string, metadata: DelegationMetadata): Promise<void> {
    const key = this.keyFor(identifier);
    const record: StoredDelegation = {
      serialized,
      grantedAt: metadata.grantedAt ?? new Date().toISOString(),
      expiresAt: metadata.expiresAt,
      actions: metadata.actions,
      path: metadata.path,
      policyHash: metadata.policyHash,
      resources: metadata.resources,
    };

    const result = await withSessionRefresh(this.node, () => this.node.kv.put(key, record));
    assertKvWriteSucceeded(result, `store delegation for ${identifier}`);
  }

  /**
   * Load the stored delegation for a user identifier.
   * Returns null if no delegation exists.
   */
  async load(identifier: string): Promise<StoredDelegation | null> {
    const key = this.keyFor(identifier);

    const result = await withSessionRefresh(this.node, () => this.node.kv.get(key));

    const response = (result as any)?.data;
    if (!response) return null;

    try {
      // KV get returns { data: value } — unwrap it
      let raw = response.data ?? response;
      if (typeof raw === "string") raw = JSON.parse(raw);

      // Validate required StoredDelegation fields
      if (
        typeof raw !== "object" ||
        raw === null ||
        typeof raw.serialized !== "string" ||
        typeof raw.expiresAt !== "string" ||
        !Array.isArray(raw.actions)
      ) {
        console.warn(
          `[DelegationStore] Invalid delegation shape for ${identifier}:`,
          Object.keys(raw ?? {}),
        );
        return null;
      }

      return raw as StoredDelegation;
    } catch (err) {
      console.warn(
        `[DelegationStore] Failed to parse stored delegation for ${identifier}:`,
        err instanceof Error ? err.message : err,
      );
      return null;
    }
  }

  /**
   * Remove the stored delegation for a user identifier.
   *
   * Delete failures are logged but not thrown: callers (middleware/status
   * cleanup) must keep their response semantics even when the node cannot
   * delete the row. A known node-side kv.delete bug on overwritten keys is
   * tracked separately; store() overwrites still succeed, so renewal fixes
   * the state even when deletion fails.
   */
  async remove(identifier: string): Promise<void> {
    const key = this.keyFor(identifier);

    const result = await withSessionRefresh(this.node, () => this.node.kv.delete(key));
    if (
      typeof result === "object" &&
      result !== null &&
      "ok" in result &&
      (result as { ok?: unknown }).ok === false
    ) {
      console.error(
        `[DelegationStore] Failed to delete delegation for ${identifier}:`,
        (result as { error?: unknown }).error ?? result,
      );
    }
  }

  /**
   * Durably revoke a stored delegation.
   *
   * Overwrites the row with an already-expired tombstone (`kv.put` overwrites
   * succeed where `kv.delete` silently no-ops on overwritten keys — TC-140),
   * then attempts a best-effort delete. The tombstone reads back through
   * load() as an expired record, and expiry is checked before policyHash at
   * every consumer, so a revoked delegation is terminal even if the delete
   * no-ops. Throws only if the tombstone write itself fails (so the route's
   * 500 is honest).
   */
  async revoke(identifier: string): Promise<void> {
    await this.store(identifier, "", {
      expiresAt: new Date(Date.now() - 1).toISOString(),
      actions: [],
      path: "",
    });
    await this.remove(identifier); // best-effort; logs on failure
  }

  /**
   * Check whether a stored delegation exists and is not expired.
   */
  async isActive(identifier: string): Promise<boolean> {
    const stored = await this.load(identifier);
    if (!stored) return false;
    return new Date(stored.expiresAt).getTime() > Date.now();
  }

  private keyFor(identifier: string): string {
    if (
      !identifier ||
      identifier.includes("/") ||
      identifier.includes("\\") ||
      identifier.includes("..")
    ) {
      throw new Error("Invalid delegation identifier");
    }
    return `delegations/${identifier}`;
  }
}

function assertKvWriteSucceeded(result: unknown, operation: string): void {
  if (
    typeof result === "object" &&
    result !== null &&
    "ok" in result &&
    (result as { ok?: unknown }).ok === false
  ) {
    const error = (result as { error?: { message?: unknown } }).error;
    const message =
      typeof error?.message === "string" ? error.message : "TinyCloud KV write failed";
    throw new Error(`Failed to ${operation}: ${message}`);
  }
}
