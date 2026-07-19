import { describe, test, expect, beforeEach } from "bun:test";
import { DelegationCache, delegationContentIdentity } from "../delegation-cache.js";
import type { DelegatedAccess } from "@tinycloud/node-sdk";

const IDENTITY_A = "sha256:a";
const IDENTITY_B = "sha256:b";
const REVISION_A = "revision-a";
const REVISION_B = "revision-b";

function makeDelegatedAccess(): DelegatedAccess {
  return { kv: { fake: "kv" }, sql: { fake: "sql" } };
}

describe("DelegationCache", () => {
  let cache: DelegationCache;

  beforeEach(() => {
    cache = new DelegationCache();
  });

  test("get returns null for unknown address", () => {
    expect(cache.get("0xUnknown", IDENTITY_A, REVISION_A)).toBeNull();
  });

  test("set + get stores and retrieves DelegatedAccess", () => {
    const access = makeDelegatedAccess();
    cache.set("0xABC", IDENTITY_A, REVISION_A, access);
    expect(cache.get("0xABC", IDENTITY_A, REVISION_A)).toBe(access);
  });

  test("keys are case-sensitive (JWT sub values)", () => {
    const access = makeDelegatedAccess();
    cache.set("user-ABC", IDENTITY_A, REVISION_A, access);

    expect(cache.get("user-ABC", IDENTITY_A, REVISION_A)).toBe(access);
    expect(cache.get("user-abc", IDENTITY_A, REVISION_A)).toBeNull();
  });

  test("same address with a replacement identity misses", () => {
    const access = makeDelegatedAccess();
    cache.set("0xABC", IDENTITY_A, REVISION_A, access);

    expect(cache.get("0xABC", IDENTITY_B, REVISION_A)).toBeNull();
    expect(cache.has("0xABC", IDENTITY_B, REVISION_A)).toBe(false);
    expect(cache.get("0xABC", IDENTITY_A, REVISION_A)).toBe(access);
  });

  test("same content with a new durable revision misses", () => {
    cache.set("0xABC", IDENTITY_A, REVISION_A, makeDelegatedAccess());
    expect(cache.get("0xABC", IDENTITY_A, REVISION_B)).toBeNull();
  });

  test("evictIfRevision preserves a newer replacement", () => {
    cache.set("0xABC", IDENTITY_B, REVISION_B, makeDelegatedAccess());

    cache.evictIfRevision("0xABC", REVISION_A);
    expect(cache.get("0xABC", IDENTITY_B, REVISION_B)).not.toBeNull();

    cache.evictIfRevision("0xABC", REVISION_B);
    expect(cache.get("0xABC", IDENTITY_B, REVISION_B)).toBeNull();
  });

  test("content identity changes with exact serialized content", () => {
    expect(delegationContentIdentity("grant-a")).not.toBe(delegationContentIdentity("grant-a "));
  });

  test("get returns null after TTL expires", async () => {
    const shortCache = new DelegationCache(50);
    const access = makeDelegatedAccess();
    shortCache.set("0xABC", IDENTITY_A, REVISION_A, access);

    expect(shortCache.get("0xABC", IDENTITY_A, REVISION_A)).toBe(access);
    await new Promise((r) => setTimeout(r, 60));
    expect(shortCache.get("0xABC", IDENTITY_A, REVISION_A)).toBeNull();
  });

  test("evict removes an entry", () => {
    const access = makeDelegatedAccess();
    cache.set("0xABC", IDENTITY_A, REVISION_A, access);
    expect(cache.get("0xABC", IDENTITY_A, REVISION_A)).toBe(access);

    cache.evict("0xABC");
    expect(cache.get("0xABC", IDENTITY_A, REVISION_A)).toBeNull();
  });

  test("evict requires exact key match", () => {
    cache.set("user-ABC", IDENTITY_A, REVISION_A, makeDelegatedAccess());
    cache.evict("user-abc");
    expect(cache.get("user-ABC", IDENTITY_A, REVISION_A)).not.toBeNull();

    cache.evict("user-ABC");
    expect(cache.get("user-ABC", IDENTITY_A, REVISION_A)).toBeNull();
  });

  test("has returns true for a cached entry", () => {
    cache.set("0xABC", IDENTITY_A, REVISION_A, makeDelegatedAccess());
    expect(cache.has("0xABC", IDENTITY_A, REVISION_A)).toBe(true);
  });

  test("has returns false for a missing entry", () => {
    expect(cache.has("0xMissing", IDENTITY_A, REVISION_A)).toBe(false);
  });

  test("has returns false after TTL expires", async () => {
    const shortCache = new DelegationCache(50);
    shortCache.set("0xABC", IDENTITY_A, REVISION_A, makeDelegatedAccess());

    expect(shortCache.has("0xABC", IDENTITY_A, REVISION_A)).toBe(true);
    await new Promise((r) => setTimeout(r, 60));
    expect(shortCache.has("0xABC", IDENTITY_A, REVISION_A)).toBe(false);
  });

  test("clear removes all entries", () => {
    cache.set("0xA", IDENTITY_A, REVISION_A, makeDelegatedAccess());
    cache.set("0xB", IDENTITY_A, REVISION_A, makeDelegatedAccess());
    cache.set("0xC", IDENTITY_A, REVISION_A, makeDelegatedAccess());

    expect(cache.size).toBe(3);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get("0xA", IDENTITY_A, REVISION_A)).toBeNull();
    expect(cache.get("0xB", IDENTITY_A, REVISION_A)).toBeNull();
    expect(cache.get("0xC", IDENTITY_A, REVISION_A)).toBeNull();
  });

  test("size returns count of entries", () => {
    expect(cache.size).toBe(0);
    cache.set("0xA", IDENTITY_A, REVISION_A, makeDelegatedAccess());
    expect(cache.size).toBe(1);
    cache.set("0xB", IDENTITY_A, REVISION_A, makeDelegatedAccess());
    expect(cache.size).toBe(2);
  });

  test("LRU eviction keeps frequently accessed entries", () => {
    const smallCache = new DelegationCache(undefined, 3);
    const a1 = makeDelegatedAccess();
    const a2 = makeDelegatedAccess();
    const a3 = makeDelegatedAccess();

    smallCache.set("0xA", IDENTITY_A, REVISION_A, a1);
    smallCache.set("0xB", IDENTITY_A, REVISION_A, a2);
    smallCache.set("0xC", IDENTITY_A, REVISION_A, a3);
    smallCache.get("0xA", IDENTITY_A, REVISION_A);

    const a4 = makeDelegatedAccess();
    smallCache.set("0xD", IDENTITY_A, REVISION_A, a4);

    expect(smallCache.get("0xA", IDENTITY_A, REVISION_A)).toBe(a1);
    expect(smallCache.get("0xB", IDENTITY_A, REVISION_A)).toBeNull();
    expect(smallCache.get("0xC", IDENTITY_A, REVISION_A)).not.toBeNull();
    expect(smallCache.get("0xD", IDENTITY_A, REVISION_A)).toBe(a4);
  });

  test("TTL expiry auto-removes stale entries on get", async () => {
    const shortCache = new DelegationCache(50);
    shortCache.set("0xStale", IDENTITY_A, REVISION_A, makeDelegatedAccess());

    await new Promise((r) => setTimeout(r, 60));
    expect(shortCache.size).toBe(1);
    expect(shortCache.get("0xStale", IDENTITY_A, REVISION_A)).toBeNull();
    expect(shortCache.size).toBe(0);
  });
});
