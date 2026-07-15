import { DELEGATION_CACHE_TTL_MS } from "@listen/core";
import type { DelegatedAccess } from "@tinycloud/node-sdk";

// ── Types ────────────────────────────────────────────────────────────

interface CacheEntryMeta {
  expiresAt: string;
  policyHash?: string;
}

interface CacheEntry {
  delegatedAccess: DelegatedAccess;
  cachedAt: number;
  meta?: CacheEntryMeta;
  lastStoreCheckAt: number;
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
  get(address: string): DelegatedAccess | null {
    return this.getEntry(address)?.delegatedAccess ?? null;
  }

  /**
   * Get a cached DelegatedAccess entry for the given address.
   * Returns null if not cached or if the entry has expired.
   */
  getEntry(address: string): {
    delegatedAccess: DelegatedAccess;
    meta?: CacheEntryMeta;
    lastStoreCheckAt: number;
  } | null {
    const entry = this.cache.get(address);

    if (!entry) return null;

    if (Date.now() - entry.cachedAt > this.ttlMs) {
      // TTL expired — remove stale entry
      this.cache.delete(address);
      return null;
    }

    // Move to end for LRU eviction (delete + re-insert)
    this.cache.delete(address);
    this.cache.set(address, entry);

    return {
      delegatedAccess: entry.delegatedAccess,
      meta: entry.meta,
      lastStoreCheckAt: entry.lastStoreCheckAt,
    };
  }

  /**
   * Cache a DelegatedAccess for the given address.
   */
  set(address: string, delegatedAccess: DelegatedAccess, meta?: CacheEntryMeta): void {
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    const now = Date.now();
    this.cache.set(address, {
      delegatedAccess,
      cachedAt: now,
      meta,
      lastStoreCheckAt: now,
    });
  }

  /**
   * Record that the backing delegation store was checked for an existing entry.
   */
  markStoreChecked(address: string, meta?: CacheEntryMeta): void {
    const entry = this.cache.get(address);

    if (!entry) return;

    entry.lastStoreCheckAt = Date.now();
    if (meta !== undefined) {
      entry.meta = meta;
    }
  }

  /**
   * Explicitly evict an address from the cache.
   * Use this when a delegation is revoked or a 401 is received.
   */
  evict(address: string): void {
    this.cache.delete(address);
  }

  /**
   * Check whether the cache has a valid (non-expired) entry for the address.
   */
  has(address: string): boolean {
    return this.get(address) !== null;
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
