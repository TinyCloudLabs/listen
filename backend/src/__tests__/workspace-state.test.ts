import { describe, it, expect, afterEach, mock } from "bun:test";

const mockDeserializeDelegation = mock((serialized: string) => ({
  expiry: new Date(Date.now() + 86_400_000),
  resources: [
    {
      service: "tinycloud.kv",
      space: "applications",
      path: "xyz.tinycloud.listen/",
      actions: ["tinycloud.kv/get"],
    },
  ],
  _serialized: serialized,
}));

mock.module("@tinycloud/node-sdk", () => ({
  deserializeDelegation: mockDeserializeDelegation,
}));

import express from "express";
import type { Server } from "http";
import type { Request, Response, NextFunction } from "express";
import {
  createWorkspaceStateRouter,
  bustWorkspaceSecretsCache,
} from "../routes/workspace-state.js";
import { backendDelegationPolicyHash, ownerDidFromAddress } from "../manifest.js";

const TEST_ADDRESS = "0xTEST";
const BACKEND_DID = "did:key:backend";

interface StoredEntry {
  serialized: string;
  grantedAt: string;
  expiresAt: string;
  actions: string[];
  path: string;
  policyHash?: string;
}

function createMockStore() {
  const data = new Map<string, StoredEntry>();
  return {
    _data: data,
    store: async (identifier: string, serialized: string, metadata: Partial<StoredEntry>) => {
      data.set(identifier, {
        serialized,
        grantedAt: metadata.grantedAt ?? new Date().toISOString(),
        expiresAt: metadata.expiresAt ?? new Date(Date.now() + 86_400_000).toISOString(),
        actions: metadata.actions ?? [],
        path: metadata.path ?? "",
        policyHash: metadata.policyHash,
      });
    },
    load: async (identifier: string) => data.get(identifier) ?? null,
    remove: async (identifier: string) => {
      data.delete(identifier);
    },
  };
}

function createMockCache() {
  const data = new Map<string, unknown>();
  return {
    get: (identifier: string) => data.get(identifier) ?? null,
    set: (identifier: string, value: unknown) => {
      data.set(identifier, value);
    },
    evict: (identifier: string) => {
      data.delete(identifier);
    },
    has: (identifier: string) => data.has(identifier),
  };
}

function mockAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.user = { sub: "test-sub", address: TEST_ADDRESS };
  next();
}

function createAccess() {
  return {
    secrets: {
      get: async (name: string) =>
        name === "GRANOLA_API_KEY"
          ? { ok: false, error: { code: "KEY_NOT_FOUND" } }
          : { ok: true, data: "secret-value" },
    },
    kv: {
      get: async (key: string) =>
        key === "config/google-tokens"
          ? { ok: true, data: { data: JSON.stringify({ access_token: "token" }) } }
          : { ok: false, error: { code: "KV_NOT_FOUND" } },
    },
    sql: {
      db: () => ({
        query: async () => ({
          ok: true,
          data: { rows: [[3]], columns: ["total"] },
        }),
      }),
    },
  };
}

function createApp({
  store = createMockStore(),
  cache = createMockCache(),
  node = { useDelegation: mock(async () => createAccess()) },
} = {}) {
  const app = express();
  app.use(express.json());
  app.use(
    "/api/workspace-state",
    createWorkspaceStateRouter({
      node: node as any,
      did: BACKEND_DID,
      store: store as any,
      cache: cache as any,
      authMiddleware: mockAuthMiddleware,
    }),
  );
  return { app, store, cache, node };
}

function currentPolicyHash() {
  return backendDelegationPolicyHash(BACKEND_DID, ownerDidFromAddress(TEST_ADDRESS));
}

function startServer(app: express.Express): Promise<{ server: Server; port: number }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      resolve({ server, port: (server.address() as any).port });
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

describe("Workspace State Routes", () => {
  let server: Server;
  let port: number;

  afterEach(async () => {
    await closeServer(server);
    mockDeserializeDelegation.mockClear();
  });

  it("returns empty state when no delegation is stored", async () => {
    const { app } = createApp();
    ({ server, port } = await startServer(app));

    const res = await fetch(`http://localhost:${port}/api/workspace-state`);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.delegation).toMatchObject({
      status: "none",
      stored: false,
      validPolicy: false,
      expiresAt: null,
      activation: "unknown",
    });
    expect(body.backendReadableSecrets.fireflies.readable).toBeNull();
    expect(body.conversations.hasAny).toBeNull();
  });

  it("returns cached delegated state without activating again", async () => {
    const store = createMockStore();
    const cache = createMockCache();
    const node = { useDelegation: mock(async () => createAccess()) };
    await store.store(TEST_ADDRESS, "stored-delegation", {
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      policyHash: currentPolicyHash(),
    });
    cache.set(TEST_ADDRESS, createAccess());
    const { app } = createApp({ store, cache, node });
    ({ server, port } = await startServer(app));

    const res = await fetch(`http://localhost:${port}/api/workspace-state`);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.delegation).toMatchObject({
      status: "active",
      stored: true,
      validPolicy: true,
      activation: "active",
    });
    expect(body.backendReadableSecrets.fireflies.readable).toBe(true);
    expect(body.backendReadableSecrets.granola.readable).toBe(false);
    expect(body.googleMeet.connected).toBe(true);
    expect(body.conversations).toEqual({ hasAny: true, total: 3 });
    expect(node.useDelegation).not.toHaveBeenCalled();
  });

  it("reports stored delegation when activation fails", async () => {
    const store = createMockStore();
    const node = {
      useDelegation: mock(async () => {
        throw new Error("activation failed");
      }),
    };
    await store.store(TEST_ADDRESS, "stored-delegation", {
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      policyHash: currentPolicyHash(),
    });
    const { app, cache } = createApp({ store, node });
    ({ server, port } = await startServer(app));

    const res = await fetch(`http://localhost:${port}/api/workspace-state`);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.delegation.status).toBe("active");
    expect(body.delegation.stored).toBe(true);
    expect(body.delegation.activation).toBe("failed");
    expect(body.backendReadableSecrets.fireflies.readable).toBeNull();
    expect(body.conversations.hasAny).toBeNull();
    expect(cache.has(TEST_ADDRESS)).toBe(false);
  });
});

describe("Workspace State Routes — secret readability cache", () => {
  const servers: Server[] = [];

  afterEach(async () => {
    await Promise.all(servers.splice(0).map((s) => closeServer(s)));
  });

  // Only the 8 workspace-secret probes are cached; googleTokensExist probes a
  // separate google secret on every request, so filter it out of the counter.
  const isWorkspaceSecret = (name: string) =>
    name.endsWith("_API_KEY") || name.startsWith("SOUNDCORE_");

  function createCountingAccess() {
    const getCalls: string[] = [];
    return {
      _getCalls: getCalls,
      secrets: {
        get: async (name: string) => {
          if (isWorkspaceSecret(name)) getCalls.push(name);
          return name === "GRANOLA_API_KEY"
            ? { ok: false, error: { code: "KEY_NOT_FOUND" } }
            : { ok: true, data: "secret-value" };
        },
      },
      kv: {
        get: async (key: string) =>
          key === "config/google-tokens"
            ? { ok: true, data: { data: JSON.stringify({ access_token: "token" }) } }
            : { ok: false, error: { code: "KV_NOT_FOUND" } },
      },
      sql: {
        db: () => ({
          query: async () => ({ ok: true, data: { rows: [[3]], columns: ["total"] } }),
        }),
      },
    };
  }

  async function appForAddress(address: string, access: ReturnType<typeof createCountingAccess>) {
    const store = createMockStore();
    const cache = createMockCache();
    await store.store(address, "stored-delegation", {
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      policyHash: backendDelegationPolicyHash(BACKEND_DID, ownerDidFromAddress(address)),
    });
    cache.set(address, access);
    const app = express();
    app.use(express.json());
    app.use(
      "/api/workspace-state",
      createWorkspaceStateRouter({
        node: { useDelegation: mock(async () => access) } as any,
        did: BACKEND_DID,
        store: store as any,
        cache: cache as any,
        authMiddleware: (req: Request, _res: Response, next: NextFunction) => {
          req.user = { sub: "s", address } as any;
          next();
        },
      }),
    );
    const { server: srv, port } = await startServer(app);
    servers.push(srv);
    return { port };
  }

  it("serves a cached readability hint without re-probing within the TTL", async () => {
    const address = "0xCACHE_A";
    bustWorkspaceSecretsCache(address);
    const access = createCountingAccess();
    const { port } = await appForAddress(address, access);

    const first = await fetch(`http://localhost:${port}/api/workspace-state`);
    expect(first.status).toBe(200);
    expect(access._getCalls.length).toBe(8);

    const second = await fetch(`http://localhost:${port}/api/workspace-state`);
    expect(second.status).toBe(200);
    // Second request within the TTL performs zero secret probes.
    expect(access._getCalls.length).toBe(8);
  });

  it("re-probes when ?fresh=1 is set", async () => {
    const address = "0xCACHE_B";
    bustWorkspaceSecretsCache(address);
    const access = createCountingAccess();
    const { port } = await appForAddress(address, access);

    await fetch(`http://localhost:${port}/api/workspace-state`);
    expect(access._getCalls.length).toBe(8);

    await fetch(`http://localhost:${port}/api/workspace-state?fresh=1`);
    expect(access._getCalls.length).toBe(16);
  });

  it("re-probes after the cache entry is busted", async () => {
    const address = "0xCACHE_C";
    bustWorkspaceSecretsCache(address);
    const access = createCountingAccess();
    const { port } = await appForAddress(address, access);

    await fetch(`http://localhost:${port}/api/workspace-state`);
    expect(access._getCalls.length).toBe(8);

    bustWorkspaceSecretsCache(address);
    await fetch(`http://localhost:${port}/api/workspace-state`);
    expect(access._getCalls.length).toBe(16);
  });

  it("does not share cache entries across addresses", async () => {
    const addressA = "0xCACHE_D1";
    const addressB = "0xCACHE_D2";
    bustWorkspaceSecretsCache(addressA);
    bustWorkspaceSecretsCache(addressB);
    const accessA = createCountingAccess();
    const accessB = createCountingAccess();
    const a = await appForAddress(addressA, accessA);
    const b = await appForAddress(addressB, accessB);

    await fetch(`http://localhost:${a.port}/api/workspace-state`);
    await fetch(`http://localhost:${b.port}/api/workspace-state`);

    // Each address probed independently; neither served the other's cache.
    expect(accessA._getCalls.length).toBe(8);
    expect(accessB._getCalls.length).toBe(8);
  });
});
