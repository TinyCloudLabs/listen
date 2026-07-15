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

  return {
    _data: data,
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
  const cache = new Map<string, any>();

  return {
    _cache: cache,
    get: (key: string) => cache.get(key) ?? null,
    set: (key: string, access: any) => {
      cache.set(key, access);
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

  it("treats an expired tombstone as terminal even when the delete no-ops", async () => {
    // Simulate TC-140: kv.delete silently no-ops, so remove() leaves the row.
    // A revoke tombstone (serialized "", actions [], past expiresAt) plus a
    // stale policyHash must still 401 delegation_expired — proving expiry is
    // checked before policyHash and the undeletable row stays terminal.
    if (server) await closeServer(server);

    const nonDeletingStore = createMockDelegationStore();
    nonDeletingStore.remove = async () => {}; // delete no-op

    const setup = createApp(nonDeletingStore, cache);
    const started = await startServer(setup.app);
    server = started.server;
    baseUrl = `http://localhost:${started.port}`;

    await nonDeletingStore.store(TEST_ADDRESS, "", {
      expiresAt: new Date(Date.now() - 1).toISOString(),
      actions: [],
      path: "",
      policyHash: "stale-policy",
    });

    const res = await fetch(`${baseUrl}/protected`);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("delegation_expired");
    // Row survives the failed delete but is still read back as expired.
    expect(await nonDeletingStore.load(TEST_ADDRESS)).not.toBeNull();
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
});
