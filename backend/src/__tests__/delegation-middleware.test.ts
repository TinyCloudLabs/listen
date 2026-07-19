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
import { delegationContentIdentity } from "@listen/server";
import type { Server } from "http";
import type { Request, Response, NextFunction } from "express";
import { createDelegationMiddleware } from "../middleware/delegation.js";
import { createDelegationActivator } from "../delegation-activation.js";
import { backendDelegationPolicyHash } from "../manifest.js";

interface StoredEntry {
  revision: string;
  serialized: string;
  grantedAt: string;
  expiresAt: string;
  actions: string[];
  path: string;
  policyHash?: string;
}

function createMockDelegationStore() {
  const data = new Map<string, StoredEntry>();
  let revision = 0;

  return {
    _data: data,
    store: async (identifier: string, serialized: string, metadata: any) => {
      const entry = {
        revision: `revision-${++revision}`,
        serialized,
        grantedAt: metadata.grantedAt ?? new Date().toISOString(),
        expiresAt: metadata.expiresAt,
        actions: metadata.actions,
        path: metadata.path,
        policyHash: metadata.policyHash,
      };
      data.set(identifier, entry);
      return entry;
    },
    load: async (identifier: string) => {
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
}

function createMockDelegationCache() {
  const cache = new Map<string, { identity: string; revision: string; access: any }>();

  return {
    _cache: cache,
    get: (key: string, identity: string, revision: string) => {
      const entry = cache.get(key);
      if (!entry || entry.identity !== identity || entry.revision !== revision) return null;
      return entry.access;
    },
    set: (key: string, identity: string, revision: string, access: any) => {
      cache.set(key, { identity, revision, access });
    },
    evict: (key: string) => {
      cache.delete(key);
    },
    evictIfRevision: (key: string, revision: string) => {
      if (cache.get(key)?.revision === revision) cache.delete(key);
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
  activationTimeoutMs?: number,
) {
  const mockUseDelegation = mock(async () => ({
    kv: {},
    sql: {},
  }));
  const app = express();
  const activator = createDelegationActivator(
    { useDelegation: mockUseDelegation } as any,
    cache as any,
  );
  const delegationMiddleware = createDelegationMiddleware({
    store: store as any,
    cache: cache as any,
    activator,
    backendDid: TEST_DID,
    activationTimeoutMs,
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
    const current = await store.load(TEST_ADDRESS);
    cache.set(TEST_ADDRESS, delegationContentIdentity("current-delegation"), current!.revision, {
      kv: {},
      sql: {},
    });

    const res = await fetch(`${baseUrl}/protected`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, hasDelegation: true });
    expect(cache.has(TEST_ADDRESS)).toBe(true);
    expect(mockUseDelegation).not.toHaveBeenCalled();
  });

  it("does not mutate a cache entry when the stored policy is stale", async () => {
    await store.store(TEST_ADDRESS, "old-delegation", {
      expiresAt: new Date(Date.now() + 1000).toISOString(),
      actions: [],
      path: "",
      policyHash: "old-policy",
    });
    cache.set(TEST_ADDRESS, "test-identity", "test-revision", { kv: {}, sql: {} });

    const res = await fetch(`${baseUrl}/protected`);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("delegation_stale");
    expect(await store.load(TEST_ADDRESS)).not.toBeNull();
    expect(cache.has(TEST_ADDRESS)).toBe(true);
    expect(mockUseDelegation).not.toHaveBeenCalled();
  });

  it("does not mutate a cache entry when the stored delegation is expired", async () => {
    await store.store(TEST_ADDRESS, "expired-delegation", {
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      actions: [],
      path: "",
      policyHash: backendDelegationPolicyHash(TEST_DID, TEST_PRINCIPAL_DID),
    });
    cache.set(TEST_ADDRESS, "test-identity", "test-revision", { kv: {}, sql: {} });

    const res = await fetch(`${baseUrl}/protected`);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("delegation_expired");
    expect(await store.load(TEST_ADDRESS)).not.toBeNull();
    expect(cache.has(TEST_ADDRESS)).toBe(true);
    expect(mockUseDelegation).not.toHaveBeenCalled();
  });

  it("does not mutate a cache entry when the stored delegation is missing", async () => {
    cache.set(TEST_ADDRESS, "test-identity", "test-revision", { kv: {}, sql: {} });

    const res = await fetch(`${baseUrl}/protected`);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("no_delegation");
    expect(cache.has(TEST_ADDRESS)).toBe(true);
    expect(mockUseDelegation).not.toHaveBeenCalled();
  });

  it("returns 504 when activation exceeds the middleware timeout", async () => {
    await store.store(TEST_ADDRESS, "slow-delegation", {
      expiresAt: new Date(Date.now() + 1000).toISOString(),
      actions: [],
      path: "",
      policyHash: backendDelegationPolicyHash(TEST_DID, TEST_PRINCIPAL_DID),
    });
    const slowApp = createApp(store, cache, 5);
    slowApp.mockUseDelegation.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ kv: {}, sql: {} }), 50)),
    );
    const slowServer = await startServer(slowApp.app);
    try {
      const res = await fetch(`http://localhost:${slowServer.port}/protected`);
      expect(res.status).toBe(504);
      expect((await res.json()).error).toBe("gateway_timeout");
    } finally {
      await closeServer(slowServer.server);
    }
  });
});
