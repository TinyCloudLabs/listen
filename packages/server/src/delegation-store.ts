import type { TinyCloudNode } from "@tinycloud/node-sdk";
import type { StoredDelegation } from "@tinyboilerplate/core";
import { withSessionRefresh } from "./identity.js";

// ── Types ────────────────────────────────────────────────────────────

export interface DelegationMetadata {
  grantedAt?: string;
  expiresAt: string;
  actions: string[];
  path: string;
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
    };

    await withSessionRefresh(this.node, () => this.node.kv.put(key, record));
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
   */
  async remove(identifier: string): Promise<void> {
    const key = this.keyFor(identifier);

    await withSessionRefresh(this.node, () => this.node.kv.delete(key));
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
