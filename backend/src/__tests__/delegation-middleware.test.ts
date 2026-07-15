import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";

const mockDeserializeDelegation = mock((serialized: string) => ({
  expiry: new Date(Date.now() + 86400_000),
  path: "",
  actions: [],
  resources: [],
  _serialized: serialized,
}));

mock.module("@tinycloud/node-sdk", () => ({
  deserializeDelegation: mockDeserializeDelegation,
}));

import express from "express";
import type { Server } from "http";
import type { Request, Response, NextFunction } from "express";
import { createDelegationMiddleware } from "../middleware/delegation.js";
import { backendDelegationPolicyHash } from "../manifest.js";

interface StoredEntry {
  serialized: string;
  grantedAt: string;
  expiresAt: string;
  actions: string[];
  path: string;
  policyHash?: string;
}

function createMockDelegationStore() {
  const data = new Map<string, StoredEntry>();
  const store = {
    _data: data,
    _loadCalls: 0,
    store: async (identifier: string, serialized: string, metadata: any) => {
      data.set(identifier, {
        serialized,
        grantedAt: metadata.grantedAt ?? new Date().toISOString(),
        expiresAt: metadata.expiresAt,
        actions: metadata.actions,
        path: metadata.path,
        policyHash: metadata.policyHash,
      });
    },
    load: async (identifier: string) => {
      store._loadCalls += 1;
      return data.get(identifier) ?? null;
    },
    remove: async (identifier: string) => {
      data.delete(identifier);
    },
    isActive: async (identifier: string) => {
      const entry = data.get(identifier);
      if (!entry) return false;
      return new Date(entry.expiresAt).getTime() > Date.now();
    },
  };

  return store;
}

function createMockDelegationCache() {
  const cache = new Map<
    string,
    {
      delegatedAccess: any;
      meta?: { expiresAt: string; policyHash?: string };
      lastStoreCheckAt: number;
    }
  >();

  return {
    _cache: cache,
    get: (key: string) => cache.get(key)?.delegatedAccess ?? null,
    getEntry: (key: string) => cache.get(key) ?? null,
    set: (key: string, access: any, meta?: { expiresAt: string; policyHash?: string }) => {
      cache.set(key, {
        delegatedAccess: access,
        meta,
        lastStoreCheckAt: meta ? Date.now() : 0,
      });
    },
    markStoreChecked: (key: string, meta?: { expiresAt: string; policyHash?: string }) => {
      const entry = cache.get(key);
      if (!entry) return;
      entry.lastStoreCheckAt = Date.now();
      if (meta !== undefined) {
        entry.meta = meta;
      }
    },
    evict: (key: string) => {
      cache.delete(key);
    },
    has: (key: string) => cache.has(key),
    clear: () => cache.clear(),
    get size() {
      return cache.size;
    },
  };
}

const TEST_ADDRESS = "0xTEST";
const TEST_DID = "did:pkh:eip155:1:0xTEST";
const TEST_PRINCIPAL_DID = TEST_DID;

function mockAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.user = { address: TEST_ADDRESS };
  next();
}

function createApp(
  store: ReturnType<typeof createMockDelegationStore>,
  cache: ReturnType<typeof createMockDelegationCache>,
) {
  const mockUseDelegation = mock(async () => ({
    kv: {},
    sql: {},
  }));
  const app = express();
  const delegationMiddleware = createDelegationMiddleware({
    node: { useDelegation: mockUseDelegation } as any,
    store: store as any,
    cache: cache as any,
    backendDid: TEST_DID,
  });

  app.use(mockAuthMiddleware);
  app.get("/protected", delegationMiddleware, (req, res) => {
    res.json({ ok: true, hasDelegation: Boolean(req.delegatedAccess) });
  });

  return { app, mockUseDelegation };
}

function startServer(app: express.Express): Promise<{ server: Server; port: number }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const port = (server.address() as any).port;
      resolve({ server, port });
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

describe("Delegation Middleware", () => {
  let server: Server;
  let baseUrl: string;
  let store: ReturnType<typeof createMockDelegationStore>;
  let cache: ReturnType<typeof createMockDelegationCache>;
  let mockUseDelegation: ReturnType<typeof mock>;

  beforeEach(async () => {
    store = createMockDelegationStore();
    cache = createMockDelegationCache();
    mockDeserializeDelegation.mockClear();

    const setup = createApp(store, cache);
    mockUseDelegation = setup.mockUseDelegation;
    const result = await startServer(setup.app);
    server = result.server;
    baseUrl = `http://localhost:${result.port}`;
  });

  afterEach(async () => {
    if (server) await closeServer(server);
  });

  it("uses a cached delegation when the stored policy is current", async () => {
    await store.store(TEST_ADDRESS, "current-delegation", {
      expiresAt: new Date(Date.now() + 1000).toISOString(),
      actions: [],
      path: "",
      policyHash: backendDelegationPolicyHash(TEST_DID, TEST_PRINCIPAL_DID),
    });
    cache.set(TEST_ADDRESS, { kv: {}, sql: {} });

    const res = await fetch(`${baseUrl}/protected`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, hasDelegation: true });
    expect(cache.has(TEST_ADDRESS)).toBe(true);
    expect(mockUseDelegation).not.toHaveBeenCalled();
  });

  it("evicts a cached delegation when the stored policy is stale", async () => {
    await store.store(TEST_ADDRESS, "old-delegation", {
      expiresAt: new Date(Date.now() + 1000).toISOString(),
      actions: [],
      path: "",
      policyHash: "old-policy",
    });
    cache.set(TEST_ADDRESS, { kv: {}, sql: {} });

    const res = await fetch(`${baseUrl}/protected`);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("delegation_stale");
    expect(await store.load(TEST_ADDRESS)).toBeNull();
    expect(cache.has(TEST_ADDRESS)).toBe(false);
    expect(mockUseDelegation).not.toHaveBeenCalled();
  });

  it("evicts a cached delegation when the stored delegation is expired", async () => {
    await store.store(TEST_ADDRESS, "expired-delegation", {
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      actions: [],
      path: "",
      policyHash: backendDelegationPolicyHash(TEST_DID, TEST_PRINCIPAL_DID),
    });
    cache.set(TEST_ADDRESS, { kv: {}, sql: {} });

    const res = await fetch(`${baseUrl}/protected`);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("delegation_expired");
    expect(await store.load(TEST_ADDRESS)).toBeNull();
    expect(cache.has(TEST_ADDRESS)).toBe(false);
    expect(mockUseDelegation).not.toHaveBeenCalled();
  });

  it("evicts a cached delegation when the stored delegation is missing", async () => {
    cache.set(TEST_ADDRESS, { kv: {}, sql: {} });

    const res = await fetch(`${baseUrl}/protected`);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("no_delegation");
    expect(cache.has(TEST_ADDRESS)).toBe(false);
    expect(mockUseDelegation).not.toHaveBeenCalled();
  });

  it("fast path skips the store when cached metadata is fresh", async () => {
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    await store.store(TEST_ADDRESS, "current-delegation", {
      expiresAt,
      actions: [],
      path: "",
      policyHash: backendDelegationPolicyHash(TEST_DID, TEST_PRINCIPAL_DID),
    });
    cache.set(
      TEST_ADDRESS,
      { kv: {}, sql: {} },
      {
        expiresAt,
        policyHash: backendDelegationPolicyHash(TEST_DID, TEST_PRINCIPAL_DID),
      },
    );

    const res = await fetch(`${baseUrl}/protected`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, hasDelegation: true });
    expect(store._loadCalls).toBe(0);
    expect(mockUseDelegation).not.toHaveBeenCalled();
  });

  it("revalidates against the store after the revalidation TTL", async () => {
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    cache.set(
      TEST_ADDRESS,
      { kv: {}, sql: {} },
      {
        expiresAt,
        policyHash: backendDelegationPolicyHash(TEST_DID, TEST_PRINCIPAL_DID),
      },
    );
    const entry = cache._cache.get(TEST_ADDRESS);
    expect(entry).toBeDefined();
    entry!.lastStoreCheckAt = Date.now() - 46_000;

    const res = await fetch(`${baseUrl}/protected`);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("no_delegation");
    expect(cache.has(TEST_ADDRESS)).toBe(false);
  });

  it("local expiry check is exact", async () => {
    const expiresAt = new Date(Date.now() - 1000).toISOString();
    await store.store(TEST_ADDRESS, "expired-delegation", {
      expiresAt,
      actions: [],
      path: "",
      policyHash: backendDelegationPolicyHash(TEST_DID, TEST_PRINCIPAL_DID),
    });
    cache.set(
      TEST_ADDRESS,
      { kv: {}, sql: {} },
      {
        expiresAt,
        policyHash: backendDelegationPolicyHash(TEST_DID, TEST_PRINCIPAL_DID),
      },
    );

    const res = await fetch(`${baseUrl}/protected`);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("delegation_expired");
    expect(await store.load(TEST_ADDRESS)).toBeNull();
    expect(cache.has(TEST_ADDRESS)).toBe(false);
  });

  it("detects a revoke tombstone at the next revalidation", async () => {
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    await store.store(TEST_ADDRESS, "current-delegation", {
      expiresAt,
      actions: [],
      path: "",
      policyHash: backendDelegationPolicyHash(TEST_DID, TEST_PRINCIPAL_DID),
    });
    cache.set(
      TEST_ADDRESS,
      { kv: {}, sql: {} },
      {
        expiresAt,
        policyHash: backendDelegationPolicyHash(TEST_DID, TEST_PRINCIPAL_DID),
      },
    );
    // Batch B revoke-by-tombstone-overwrite: kv.delete is a silent no-op under TC-140.
    await store.store(TEST_ADDRESS, "revoked-delegation", {
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      actions: [],
      path: "",
      policyHash: backendDelegationPolicyHash(TEST_DID, TEST_PRINCIPAL_DID),
    });
    const entry = cache._cache.get(TEST_ADDRESS);
    expect(entry).toBeDefined();
    entry!.lastStoreCheckAt = Date.now() - 46_000;

    const res = await fetch(`${baseUrl}/protected`);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("delegation_expired");
    expect(cache.has(TEST_ADDRESS)).toBe(false);
  });

  it("stale policy hash forces the slow path", async () => {
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    await store.store(TEST_ADDRESS, "old-delegation", {
      expiresAt,
      actions: [],
      path: "",
      policyHash: "old-policy",
    });
    cache.set(
      TEST_ADDRESS,
      { kv: {}, sql: {} },
      {
        expiresAt,
        policyHash: "old-policy",
      },
    );

    const res = await fetch(`${baseUrl}/protected`);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("delegation_stale");
    expect(cache.has(TEST_ADDRESS)).toBe(false);
    expect(mockUseDelegation).not.toHaveBeenCalled();
  });

  it("DELEGATION_STORE_REVALIDATE_MS=0 disables the fast path (killswitch)", async () => {
    const originalRevalidateMs = process.env.DELEGATION_STORE_REVALIDATE_MS;

    await closeServer(server);

    try {
      process.env.DELEGATION_STORE_REVALIDATE_MS = "0";
      store = createMockDelegationStore();
      cache = createMockDelegationCache();
      const setup = createApp(store, cache);
      mockUseDelegation = setup.mockUseDelegation;
      const result = await startServer(setup.app);
      server = result.server;
      baseUrl = `http://localhost:${result.port}`;

      const expiresAt = new Date(Date.now() + 60_000).toISOString();
      await store.store(TEST_ADDRESS, "current-delegation", {
        expiresAt,
        actions: [],
        path: "",
        policyHash: backendDelegationPolicyHash(TEST_DID, TEST_PRINCIPAL_DID),
      });
      cache.set(
        TEST_ADDRESS,
        { kv: {}, sql: {} },
        {
          expiresAt,
          policyHash: backendDelegationPolicyHash(TEST_DID, TEST_PRINCIPAL_DID),
        },
      );
      const entry = cache._cache.get(TEST_ADDRESS);
      expect(entry).toBeDefined();
      entry!.lastStoreCheckAt = Date.now();

      const first = await fetch(`${baseUrl}/protected`);
      const second = await fetch(`${baseUrl}/protected`);

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(store._loadCalls).toBe(2);
    } finally {
      if (originalRevalidateMs === undefined) {
        delete process.env.DELEGATION_STORE_REVALIDATE_MS;
      } else {
        process.env.DELEGATION_STORE_REVALIDATE_MS = originalRevalidateMs;
      }
    }
  });
});
