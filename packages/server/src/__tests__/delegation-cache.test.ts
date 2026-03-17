import { describe, test, expect, beforeEach } from "bun:test";
import { DelegationCache } from "../delegation-cache.js";
import type { DelegatedAccess } from "@tinycloud/node-sdk";

function makeDelegatedAccess(): DelegatedAccess {
  return { kv: { fake: "kv" }, sql: { fake: "sql" } };
}

describe("DelegationCache", () => {
  let cache: DelegationCache;

  beforeEach(() => {
    cache = new DelegationCache();
  });

  test("get returns null for unknown address", () => {
    expect(cache.get("0xUnknown")).toBeNull();
  });

  test("set + get stores and retrieves DelegatedAccess", () => {
    const access = makeDelegatedAccess();
    cache.set("0xABC", access);
    expect(cache.get("0xABC")).toBe(access);
  });

  test("keys are case-sensitive (JWT sub values)", () => {
    const access = makeDelegatedAccess();
    cache.set("user-ABC", access);

    expect(cache.get("user-ABC")).toBe(access);
    expect(cache.get("user-abc")).toBeNull();
  });

  test("get returns null after TTL expires", async () => {
    const shortCache = new DelegationCache(50); // 50ms TTL
    const access = makeDelegatedAccess();
    shortCache.set("0xABC", access);

    expect(shortCache.get("0xABC")).toBe(access);

    await new Promise((r) => setTimeout(r, 60));

    expect(shortCache.get("0xABC")).toBeNull();
  });

  test("evict removes an entry", () => {
    const access = makeDelegatedAccess();
    cache.set("0xABC", access);
    expect(cache.get("0xABC")).toBe(access);

    cache.evict("0xABC");
    expect(cache.get("0xABC")).toBeNull();
  });

  test("evict requires exact key match", () => {
    cache.set("user-ABC", makeDelegatedAccess());
    cache.evict("user-abc");
    expect(cache.get("user-ABC")).not.toBeNull(); // different case = different key

    cache.evict("user-ABC");
    expect(cache.get("user-ABC")).toBeNull();
  });

  test("has returns true for a cached entry", () => {
    cache.set("0xABC", makeDelegatedAccess());
    expect(cache.has("0xABC")).toBe(true);
  });

  test("has returns false for a missing entry", () => {
    expect(cache.has("0xMissing")).toBe(false);
  });

  test("has returns false after TTL expires", async () => {
    const shortCache = new DelegationCache(50);
    shortCache.set("0xABC", makeDelegatedAccess());

    expect(shortCache.has("0xABC")).toBe(true);

    await new Promise((r) => setTimeout(r, 60));

    expect(shortCache.has("0xABC")).toBe(false);
  });

  test("clear removes all entries", () => {
    cache.set("0xA", makeDelegatedAccess());
    cache.set("0xB", makeDelegatedAccess());
    cache.set("0xC", makeDelegatedAccess());

    expect(cache.size).toBe(3);

    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.get("0xA")).toBeNull();
    expect(cache.get("0xB")).toBeNull();
    expect(cache.get("0xC")).toBeNull();
  });

  test("size returns count of entries", () => {
    expect(cache.size).toBe(0);

    cache.set("0xA", makeDelegatedAccess());
    expect(cache.size).toBe(1);

    cache.set("0xB", makeDelegatedAccess());
    expect(cache.size).toBe(2);
  });

  test("TTL expiry auto-removes stale entries on get", async () => {
    const shortCache = new DelegationCache(50);
    shortCache.set("0xStale", makeDelegatedAccess());

    await new Promise((r) => setTimeout(r, 60));

    // size still shows 1 (not yet cleaned up)
    expect(shortCache.size).toBe(1);

    // calling get triggers cleanup
    expect(shortCache.get("0xStale")).toBeNull();

    // now size should be 0
    expect(shortCache.size).toBe(0);
  });
});
