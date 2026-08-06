import { describe, expect, it, mock } from "bun:test";
import { DelegationCache, delegationContentIdentity } from "@listen/server";
import type { StoredDelegation } from "@listen/core";
import { createDelegationActivator } from "../delegation-activation.js";
import { classifyStoredDelegation, createDelegationResolver } from "../delegation-resolver.js";

const ADDRESS = "0xOWNER";
const POLICY = "policy-current";

function stored(serialized: string, overrides: Partial<StoredDelegation> = {}): StoredDelegation {
  return {
    revision: `revision-${serialized}`,
    serialized,
    grantedAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2027-01-01T00:00:00.000Z",
    actions: ["kv/read"],
    path: "/",
    policyHash: POLICY,
    ...overrides,
  };
}

function createStore(initial: StoredDelegation | null) {
  let current = initial;
  return {
    get current() {
      return current;
    },
    set(value: StoredDelegation | null) {
      current = value;
    },
    load: async () => current,
    store: async () => {},
    remove: async () => {},
  };
}

describe("delegation resolver", () => {
  it("propagates malformed durable-store responses as operational errors", async () => {
    const error = Object.assign(new Error("invalid successful KV response"), {
      code: "delegation_store_invalid_response",
    });
    const resolver = createDelegationResolver({
      store: { load: async () => Promise.reject(error) } as any,
      cache: new DelegationCache(),
      activator: {} as any,
      policyHashForAddress: () => POLICY,
    });

    await expect(resolver.resolve(ADDRESS)).rejects.toMatchObject({
      code: "delegation_store_invalid_response",
    });
  });

  it("classifies expired and stale rows without changing them", () => {
    const expired = stored("expired", { expiresAt: "2020-01-01T00:00:00.000Z" });
    const stale = stored("stale", { policyHash: "policy-old" });

    expect(classifyStoredDelegation(expired, POLICY, Date.parse("2026-01-01"))).toEqual({
      kind: "expired",
      stored: expired,
    });
    expect(classifyStoredDelegation(stale, POLICY, Date.parse("2026-01-01"))).toEqual({
      kind: "stale",
      stored: stale,
    });
    expect(expired.serialized).toBe("expired");
    expect(stale.serialized).toBe("stale");
  });

  it("uses the current stored identity across resolver instances", async () => {
    const store = createStore(stored("grant-a"));
    const cache = new DelegationCache();
    const activated = mock(async (serialized: string) => ({ value: serialized }) as any);
    const makeResolver = () => {
      const activator = createDelegationActivator({} as any, cache, activated);
      return createDelegationResolver({
        store: store as any,
        cache,
        activator,
        policyHashForAddress: () => POLICY,
      });
    };

    const first = await makeResolver().resolve(ADDRESS);
    expect(first.kind).toBe("active");
    expect(activated).toHaveBeenCalledTimes(1);

    store.set(stored("grant-b"));
    const second = await makeResolver().resolve(ADDRESS);
    expect(second.kind).toBe("active");
    expect((second as any).access.value).toBe("grant-b");
    expect(activated).toHaveBeenCalledTimes(2);
    expect(cache.get(ADDRESS, delegationContentIdentity("grant-b"), "revision-grant-b")).toEqual({
      value: "grant-b",
    });
    expect(cache.get(ADDRESS, delegationContentIdentity("grant-a"), "revision-grant-a")).toBeNull();
  });

  it("classifies slow activation as a timeout without evicting a replacement", async () => {
    const store = createStore(stored("slow-grant"));
    const cache = new DelegationCache();
    const resolver = createDelegationResolver({
      store: store as any,
      cache,
      activator: createDelegationActivator(
        {} as any,
        cache,
        mock(async () => {
          await new Promise<void>((resolve) => setTimeout(resolve, 25));
          return { value: "slow" } as any;
        }),
      ),
      policyHashForAddress: () => POLICY,
    });

    const result = await resolver.resolve(ADDRESS, { activationTimeoutMs: 1 });

    expect(result.kind).toBe("timeout");
  });

  it("does not let a delayed old read cache a replacement grant", async () => {
    const grantA = stored("grant-a");
    const grantB = stored("grant-b");
    let releaseFirstLoad!: () => void;
    let firstLoad = true;
    const store = {
      current: grantA as StoredDelegation | null,
      load: async () => {
        if (firstLoad) {
          firstLoad = false;
          await new Promise<void>((resolve) => {
            releaseFirstLoad = resolve;
          });
          return grantA;
        }
        return store.current;
      },
      store: async () => {},
      remove: async () => {},
    };
    const cache = new DelegationCache();
    const activated = mock(async (serialized: string) => ({ value: serialized }) as any);
    const resolver = createDelegationResolver({
      store: store as any,
      cache,
      activator: createDelegationActivator({} as any, cache, activated),
      policyHashForAddress: () => POLICY,
    });

    const pending = resolver.resolve(ADDRESS);
    store.current = grantB;
    releaseFirstLoad();

    const result = await pending;
    expect(result.kind).toBe("active");
    expect((result as any).access.value).toBe("grant-b");
    expect(activated.mock.calls.map(([serialized]) => serialized)).toEqual(["grant-a", "grant-b"]);
    expect(cache.get(ADDRESS, delegationContentIdentity("grant-b"), "revision-grant-b")).toEqual({
      value: "grant-b",
    });
    expect(cache.get(ADDRESS, delegationContentIdentity("grant-a"), "revision-grant-a")).toBeNull();
  });

  it.each([
    ["expired", { expiresAt: "2020-01-01T00:00:00.000Z" }],
    ["stale", { policyHash: "policy-old" }],
  ])("does not let a delayed %s read evict a replacement cache entry", async (_kind, overrides) => {
    const oldGrant = stored("grant-old", overrides);
    const newGrant = stored("grant-new");
    let releaseRead!: () => void;
    let firstLoad = true;
    const store = {
      current: oldGrant as StoredDelegation | null,
      load: async () => {
        if (firstLoad) {
          firstLoad = false;
          await new Promise<void>((resolve) => {
            releaseRead = resolve;
          });
          return oldGrant;
        }
        return store.current;
      },
      store: async () => {},
      remove: async () => {},
    };
    const cache = new DelegationCache();
    cache.set(ADDRESS, delegationContentIdentity(newGrant.serialized), newGrant.revision, {
      value: "new",
    } as any);
    const resolver = createDelegationResolver({
      store: store as any,
      cache,
      activator: createDelegationActivator(
        {} as any,
        cache,
        mock(async () => ({}) as any),
      ),
      policyHashForAddress: () => POLICY,
    });

    const pending = resolver.resolve(ADDRESS);
    store.current = newGrant;
    releaseRead();

    expect((await pending).kind).toBe(_kind);
    expect(
      cache.get(ADDRESS, delegationContentIdentity(newGrant.serialized), newGrant.revision),
    ).toEqual({ value: "new" });
  });
});
