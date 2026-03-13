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
 * Key format: `delegations/{address}` in the backend's KV space.
 */
export class DelegationStore {
  constructor(private readonly node: TinyCloudNode) {}

  /**
   * Store a serialized delegation for a user address.
   */
  async store(
    address: string,
    serialized: string,
    metadata: DelegationMetadata,
  ): Promise<void> {
    const key = this.keyFor(address);
    const record: StoredDelegation = {
      serialized,
      grantedAt: metadata.grantedAt ?? new Date().toISOString(),
      expiresAt: metadata.expiresAt,
      actions: metadata.actions,
      path: metadata.path,
    };

    await withSessionRefresh(this.node, () =>
      this.node.kv.put(key, JSON.stringify(record)),
    );
  }

  /**
   * Load the stored delegation for a user address.
   * Returns null if no delegation exists.
   */
  async load(address: string): Promise<StoredDelegation | null> {
    const key = this.keyFor(address);

    const result = await withSessionRefresh(this.node, () =>
      this.node.kv.get(key),
    );

    const raw = (result as any)?.data;
    if (!raw) return null;

    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      return parsed as StoredDelegation;
    } catch {
      // Corrupted data — treat as missing
      return null;
    }
  }

  /**
   * Remove the stored delegation for a user address.
   */
  async remove(address: string): Promise<void> {
    const key = this.keyFor(address);

    await withSessionRefresh(this.node, () =>
      this.node.kv.delete(key),
    );
  }

  /**
   * Check whether a stored delegation exists and is not expired.
   */
  async isActive(address: string): Promise<boolean> {
    const stored = await this.load(address);
    if (!stored) return false;
    return new Date(stored.expiresAt).getTime() > Date.now();
  }

  private keyFor(address: string): string {
    return `delegations/${address.toLowerCase()}`;
  }
}
