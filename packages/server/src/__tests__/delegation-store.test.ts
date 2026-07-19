import { describe, test, expect, mock, beforeEach } from "bun:test";
import { DelegationStore, type DelegationMetadata } from "../delegation-store.js";

interface StoredDelegation {
  revision: string;
  serialized: string;
  grantedAt: string;
  expiresAt: string;
  actions: string[];
  path: string;
}

function createMockNode() {
  return {
    kv: {
      get: mock(() => Promise.resolve({ data: null })),
      put: mock(() => Promise.resolve({ ok: true })),
      delete: mock(() => Promise.resolve()),
    },
    signIn: mock(() => Promise.resolve()),
  };
}

function makeDelegation(overrides?: Partial<StoredDelegation>): StoredDelegation {
  return {
    revision: "revision-test",
    serialized: "base64-encoded-delegation",
    grantedAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-12-31T23:59:59.000Z",
    actions: ["kv/read", "kv/write"],
    path: "/app/data",
    ...overrides,
  };
}

function makeMetadata(overrides?: Partial<DelegationMetadata>): DelegationMetadata {
  return {
    grantedAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-12-31T23:59:59.000Z",
    actions: ["kv/read", "kv/write"],
    path: "/app/data",
    ...overrides,
  };
}

describe("DelegationStore", () => {
  let mockNode: ReturnType<typeof createMockNode>;
  let store: DelegationStore;

  beforeEach(() => {
    mockNode = createMockNode();
    store = new DelegationStore(mockNode as any);
  });

  describe("store", () => {
    test("calls kv.put with correct key and JSON payload", async () => {
      const metadata = makeMetadata();

      await store.store("0xAbC123", "serialized-data", metadata);

      expect(mockNode.kv.put).toHaveBeenCalledTimes(1);
      const [key, value] = mockNode.kv.put.mock.calls[0];
      expect(key).toBe("delegations/0xAbC123");

      // Value is passed as object (SDK handles serialization)
      const parsed = typeof value === "string" ? JSON.parse(value) : value;
      expect(parsed.serialized).toBe("serialized-data");
      expect(parsed.revision).toEqual(expect.any(String));
      expect(parsed.grantedAt).toBe(metadata.grantedAt);
      expect(parsed.expiresAt).toBe(metadata.expiresAt);
      expect(parsed.actions).toEqual(metadata.actions);
      expect(parsed.path).toBe(metadata.path);
    });

    test("uses current timestamp when grantedAt is omitted", async () => {
      const metadata = makeMetadata();
      delete (metadata as any).grantedAt;

      const before = new Date().toISOString();
      await store.store("0xABC", "data", metadata);
      const after = new Date().toISOString();

      const [, value] = mockNode.kv.put.mock.calls[0];
      const parsed = typeof value === "string" ? JSON.parse(value) : value;
      expect(parsed.grantedAt >= before).toBe(true);
      expect(parsed.grantedAt <= after).toBe(true);
    });

    test("throws when TinyCloud KV reports a failed write", async () => {
      mockNode.kv.put = mock(() =>
        Promise.resolve({
          ok: false,
          error: { message: 'Failed to put key "delegations/0xABC": 404 - Space not found' },
        }),
      );

      await expect(store.store("0xABC", "data", makeMetadata())).rejects.toThrow(
        "Failed to store delegation for 0xABC",
      );
    });

    test.each([undefined, {}, { ok: "true" }])(
      "rejects malformed KV write envelope %#",
      async (result) => {
        mockNode.kv.put = mock(() => Promise.resolve(result as any));

        await expect(store.store("0xABC", "data", makeMetadata())).rejects.toMatchObject({
          code: "delegation_store_invalid_response",
        });
      },
    );
  });

  describe("load", () => {
    test("calls kv.get and parses the result", async () => {
      const delegation = makeDelegation();
      mockNode.kv.get = mock(() => Promise.resolve({ data: JSON.stringify(delegation) }));

      const result = await store.load("0xAbC123");

      expect(mockNode.kv.get).toHaveBeenCalledTimes(1);
      const [key] = mockNode.kv.get.mock.calls[0];
      expect(key).toBe("delegations/0xAbC123");

      expect(result).toEqual(delegation);
    });

    test("parses real TinyCloud KV response envelopes", async () => {
      const delegation = makeDelegation();
      mockNode.kv.get = mock(() =>
        Promise.resolve({
          ok: true,
          data: {
            data: delegation,
            headers: {},
          },
        }),
      );

      const result = await store.load("0xAbC123");

      expect(result).toEqual(delegation);
    });

    test("assigns a stable generation to delegation rows written before revisions existed", async () => {
      const { revision: _revision, ...legacyDelegation } = makeDelegation();
      mockNode.kv.get = mock(() => Promise.resolve({ data: JSON.stringify(legacyDelegation) }));

      const first = await store.load("0xAbC123");
      const second = await store.load("0xAbC123");

      expect(first).toEqual(second);
      expect(first?.revision).toMatch(/^legacy:[0-9a-f]{64}$/);
      expect(first?.serialized).toBe(legacyDelegation.serialized);
    });

    test("returns null when kv.get returns no data", async () => {
      mockNode.kv.get = mock(() => Promise.resolve({ data: null }));

      const result = await store.load("0xABC");
      expect(result).toBeNull();
    });

    test("returns null when KV confirms the key is missing", async () => {
      mockNode.kv.get = mock(() =>
        Promise.resolve({ ok: false, error: { code: "key_not_found", message: "missing" } }),
      );

      const result = await store.load("0xABC");
      expect(result).toBeNull();
    });

    test("does not treat grant_not_found as an absent durable delegation row", async () => {
      mockNode.kv.get = mock(() =>
        Promise.resolve({
          ok: false,
          error: { code: "grant_not_found", message: "delegation grant missing" },
        }),
      );

      await expect(store.load("0xABC")).rejects.toThrow("grant_not_found");
    });

    test("throws when kv.get returns an unclassified response", async () => {
      mockNode.kv.get = mock(() => Promise.resolve({}));

      await expect(store.load("0xABC")).rejects.toMatchObject({
        code: "delegation_store_invalid_response",
      });
    });

    test.each([
      { ok: true, data: undefined },
      { ok: true, data: {} },
      { ok: true, data: { data: undefined } },
      { ok: true, data: { data: { unexpected: true } } },
    ])("throws on malformed successful KV envelope %#", async (response) => {
      mockNode.kv.get = mock(() => Promise.resolve(response));

      await expect(store.load("0xABC")).rejects.toMatchObject({
        code: "delegation_store_invalid_response",
      });
    });

    test("returns null only for an explicit nested null payload", async () => {
      mockNode.kv.get = mock(() => Promise.resolve({ ok: true, data: { data: null } }));

      await expect(store.load("0xABC")).resolves.toBeNull();
    });

    test("throws on corrupted data", async () => {
      mockNode.kv.get = mock(() => Promise.resolve({ data: "not-valid-json{{{" }));

      await expect(store.load("0xABC")).rejects.toThrow("Failed to load delegation");
    });

    test("throws when parsed data has missing required fields", async () => {
      mockNode.kv.get = mock(() => Promise.resolve({ data: JSON.stringify({ serialized: "ok" }) }));

      await expect(store.load("0xABC")).rejects.toThrow("invalid delegation record shape");
    });

    test("throws when parsed data has wrong field types", async () => {
      mockNode.kv.get = mock(() =>
        Promise.resolve({
          data: JSON.stringify({
            serialized: 123,
            expiresAt: "2026-12-31",
            actions: [],
          }),
        }),
      );

      await expect(store.load("0xABC")).rejects.toThrow("invalid delegation record shape");
    });

    test("throws when expiry metadata is not finite", async () => {
      mockNode.kv.get = mock(() =>
        Promise.resolve({
          data: JSON.stringify({
            serialized: "ok",
            expiresAt: "not-a-date",
            actions: [],
          }),
        }),
      );

      await expect(store.load("0xABC")).rejects.toThrow("invalid delegation record shape");
    });

    test("throws when KV reports a failed read", async () => {
      mockNode.kv.get = mock(() =>
        Promise.resolve({ ok: false, error: { code: "KV_READ_FAILED", message: "unavailable" } }),
      );

      await expect(store.load("0xABC")).rejects.toThrow("KV_READ_FAILED");
    });
  });

  describe("remove", () => {
    test("calls kv.delete with correct key", async () => {
      await store.remove("0xAbC123");

      expect(mockNode.kv.delete).toHaveBeenCalledTimes(1);
      const [key] = mockNode.kv.delete.mock.calls[0];
      expect(key).toBe("delegations/0xAbC123");
    });

    test("throws when kv.delete reports failure", async () => {
      mockNode.kv.delete = mock(() =>
        Promise.resolve({ ok: false, error: { code: "kv_delete_failed", message: "boom" } }),
      );
      await expect(store.remove("0xAbC123")).rejects.toThrow("kv_delete_failed");

      expect(mockNode.kv.delete).toHaveBeenCalledTimes(1);
    });

    test("throws when delete reports success but the row remains", async () => {
      const delegation = makeDelegation();
      mockNode.kv.get = mock(() => Promise.resolve({ data: JSON.stringify(delegation) }));

      await expect(store.remove("0xAbC123")).rejects.toThrow("record still exists");
    });

    test("accepts an explicit not-found delete after confirming absence", async () => {
      mockNode.kv.delete = mock(() =>
        Promise.resolve({ ok: false, error: { code: "KEY_NOT_FOUND" } }),
      );
      mockNode.kv.get = mock(() => Promise.resolve({ ok: true, data: { data: null } }));

      await expect(store.remove("0xAbC123")).resolves.toBeUndefined();
    });
  });

  describe("isActive", () => {
    test("returns true for non-expired delegation", async () => {
      const futureDate = new Date(Date.now() + 3600_000).toISOString();
      const delegation = makeDelegation({ expiresAt: futureDate });
      mockNode.kv.get = mock(() => Promise.resolve({ data: JSON.stringify(delegation) }));

      expect(await store.isActive("0xABC")).toBe(true);
    });

    test("returns false for expired delegation", async () => {
      const pastDate = new Date(Date.now() - 3600_000).toISOString();
      const delegation = makeDelegation({ expiresAt: pastDate });
      mockNode.kv.get = mock(() => Promise.resolve({ data: JSON.stringify(delegation) }));

      expect(await store.isActive("0xABC")).toBe(false);
    });

    test("returns false when no delegation exists", async () => {
      mockNode.kv.get = mock(() => Promise.resolve({ data: null }));

      expect(await store.isActive("0xABC")).toBe(false);
    });
  });

  describe("key format", () => {
    test("keys preserve case (sub values are case-sensitive)", async () => {
      await store.store("UserABC123", "data", makeMetadata());
      const [key] = mockNode.kv.put.mock.calls[0];
      expect(key).toBe("delegations/UserABC123");
    });

    test("keys are prefixed with delegations/", async () => {
      await store.load("my-sub-id");
      const [key] = mockNode.kv.get.mock.calls[0];
      expect(key).toBe("delegations/my-sub-id");
    });
  });
});
