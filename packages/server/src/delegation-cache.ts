import { DELEGATION_CACHE_TTL_MS } from "@listen/core";
import type { DelegatedAccess } from "@tinycloud/node-sdk";
import { createHash } from "node:crypto";

// ── Types ────────────────────────────────────────────────────────────

interface CacheEntry {
  identity: string;
  revision: string;
  delegatedAccess: DelegatedAccess;
  cachedAt: number;
}

export function delegationContentIdentity(serialized: string): string {
  return createHash("sha256").update(serialized, "utf8").digest("hex");
}

// ── Delegation Cache ─────────────────────────────────────────────────

/**
 * In-memory cache for DelegatedAccess objects.
 *
 * Each entry has a TTL of DELEGATION_CACHE_TTL_MS (50 minutes),
 * which is safely under the 1-hour TinyCloud sub-session cap.
 *
 * On cache miss or expiry, callers should re-activate the delegation
 * via `node.useDelegation()`.
 */
export class DelegationCache {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs: number;

  constructor(
    ttlMs?: number,
    private readonly maxSize: number = 10_000,
  ) {
    this.ttlMs = ttlMs ?? DELEGATION_CACHE_TTL_MS;
  }

  /**
   * Get a cached DelegatedAccess for the given address.
   * Returns null if not cached or if the entry has expired.
   */
  get(address: string, identity: string, revision: string): DelegatedAccess | null {
    const entry = this.cache.get(address);

    if (!entry) return null;

    if (entry.identity !== identity || entry.revision !== revision) {
      // A delayed read for an older generation must not evict a newer one.
      return null;
    }

    if (Date.now() - entry.cachedAt > this.ttlMs) {
      // TTL expired — remove stale entry
      this.cache.delete(address);
      return null;
    }

    // Move to end for LRU eviction (delete + re-insert)
    this.cache.delete(address);
    this.cache.set(address, entry);

    return entry.delegatedAccess;
  }

  /**
   * Cache a DelegatedAccess for the given address.
   */
  set(address: string, identity: string, revision: string, delegatedAccess: DelegatedAccess): void {
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(address, {
      identity,
      revision,
      delegatedAccess,
      cachedAt: Date.now(),
    });
  }

  /**
   * Explicitly evict an address from the cache.
   * Use this when a delegation is revoked or a 401 is received.
   */
  evict(address: string): void {
    this.cache.delete(address);
  }

  /** Evict only when the cache still contains the observed durable revision. */
  evictIfRevision(address: string, revision: string): void {
    if (this.cache.get(address)?.revision === revision) this.cache.delete(address);
  }

  /**
   * Check whether the cache has a valid (non-expired) entry for the address.
   */
  has(address: string, identity: string, revision: string): boolean {
    return this.get(address, identity, revision) !== null;
  }

  /**
   * Remove all entries from the cache.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Number of entries currently in the cache (including possibly expired ones).
   */
  get size(): number {
    return this.cache.size;
  }
}
