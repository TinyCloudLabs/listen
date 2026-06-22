import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";

// ── Mock @tinycloud/node-sdk BEFORE importing the route ───────────────

const TEST_ADDRESS = "0xTEST";
const TEST_DID = "did:pkh:eip155:1:0xTEST";
const SECRET_NAMES = [
  "FIREFLIES_API_KEY",
  "ASSEMBLYAI_API_KEY",
  "DEEPGRAM_API_KEY",
  "GRANOLA_API_KEY",
];
const DEFAULT_ENCRYPTION_NETWORK_ID = `urn:tinycloud:encryption:${TEST_DID}:default`;

function fullPolicyResources(space = "applications") {
  return [
    {
      service: "tinycloud.kv",
      space,
      path: "xyz.tinycloud.listen/",
      actions: [
        "tinycloud.kv/get",
        "tinycloud.kv/put",
        "tinycloud.kv/del",
        "tinycloud.kv/list",
        "tinycloud.kv/metadata",
      ],
    },
    {
      service: "tinycloud.sql",
      space,
      path: "xyz.tinycloud.listen/conversations",
      actions: ["tinycloud.sql/read", "tinycloud.sql/write"],
    },
    {
      service: "tinycloud.encryption",
      space: "encryption",
      path: DEFAULT_ENCRYPTION_NETWORK_ID,
      actions: ["tinycloud.encryption/decrypt"],
    },
    {
      service: "tinycloud.capabilities",
      space: "applications",
      path: "",
      actions: ["tinycloud.capabilities/read"],
    },
    {
      service: "tinycloud.capabilities",
      space: "encryption",
      path: "",
      actions: ["tinycloud.capabilities/read"],
    },
    ...SECRET_NAMES.map((secretName) => ({
      service: "tinycloud.kv",
      space: "secrets",
      path: `vault/secrets/${secretName}`,
      actions: ["tinycloud.kv/get"],
    })),
    {
      service: "tinycloud.kv",
      space: "secrets",
      path: "vault/secrets/scoped/listen/GOOGLE_MEET_TOKENS",
      actions: ["tinycloud.kv/get", "tinycloud.kv/put", "tinycloud.kv/del"],
    },
    {
      service: "tinycloud.capabilities",
      space: "secrets",
      path: "",
      actions: ["tinycloud.capabilities/read"],
    },
  ];
}

const mockDeserializeDelegation = mock((serialized: string) => ({
  expiry: new Date(Date.now() + 86400_000),
  actions: ["tinycloud.kv/get", "tinycloud.kv/put"],
  path: "",
  resources: fullPolicyResources(),
  ownerAddress: "0xTEST",
  _serialized: serialized,
}));

const mockUseDelegation = mock(async (_delegation: any) => ({
  kv: {
    get: async () => ({}),
    put: async () => ({}),
    list: async () => ({}),
    delete: async () => ({}),
  },
  sql: { execute: async () => ({}), query: async () => ({}) },
}));

mock.module("@tinycloud/node-sdk", () => ({
  deserializeDelegation: mockDeserializeDelegation,
}));

import express from "express";
import type { Server } from "http";
import type { Request, Response, NextFunction } from "express";
import { createDelegationRouter } from "../routes/delegations.js";

// ── In-Memory Delegation Store ────────────────────────────────────────

interface StoredEntry {
  serialized: string;
  grantedAt: string;
  expiresAt: string;
  actions: string[];
  path: string;
  policyHash?: string;
  resources?: Array<{ service: string; space?: string; path: string; actions: string[] }>;
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
        resources: metadata.resources,
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

// ── In-Memory Delegation Cache ────────────────────────────────────────

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

// ── Test Helpers ──────────────────────────────────────────────────────

function mockAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.user = { address: TEST_ADDRESS };
  req.headers.authorization = "Bearer test-token";
  next();
}

function createApp(
  store: ReturnType<typeof createMockDelegationStore>,
  cache: ReturnType<typeof createMockDelegationCache>,
  writeLimiter?: RequestHandler,
) {
  const mockNode = {
    useDelegation: mockUseDelegation,
    secrets: {
      isUnlocked: true,
      vault: { encryptionIdentity: { privateKey: new Uint8Array(32) } },
      unlock: async () => ({ ok: true }),
      lock: () => {},
    },
  } as any;

  const app = express();
  app.use(express.json());
  app.use(
    "/api/delegations",
    createDelegationRouter({
      node: mockNode,
      did: TEST_DID,
      store: store as any,
      cache: cache as any,
      authMiddleware: mockAuthMiddleware,
      writeLimiter,
    }),
  );
  return app;
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

// ── Tests ─────────────────────────────────────────────────────────────

describe("Delegation Routes", () => {
  let server: Server;
  let baseUrl: string;
  let store: ReturnType<typeof createMockDelegationStore>;
  let cache: ReturnType<typeof createMockDelegationCache>;

  beforeEach(async () => {
    store = createMockDelegationStore();
    cache = createMockDelegationCache();
    mockDeserializeDelegation.mockClear();
    mockUseDelegation.mockClear();

    const app = createApp(store, cache);
    const result = await startServer(app);
    server = result.server;
    baseUrl = `http://localhost:${result.port}`;
  });

  afterEach(async () => {
    if (server) await closeServer(server);
  });

  // ── GET /api/delegations/status ───────────────────────────────────

  describe("GET /api/delegations/status", () => {
    it("returns 'none' when no delegation exists", async () => {
      const res = await fetch(`${baseUrl}/api/delegations/status`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("none");
      expect(body.expiresAt).toBeNull();
    });

    it("does not apply the write limiter to status checks", async () => {
      if (server) await closeServer(server);

      const limiter: RequestHandler = (_req, res) => {
        res.status(429).json({ error: "rate_limited" });
      };
      const limitedApp = createApp(store, cache, limiter);
      const result = await startServer(limitedApp);
      server = result.server;
      baseUrl = `http://localhost:${result.port}`;

      const statusRes = await fetch(`${baseUrl}/api/delegations/status`);
      expect(statusRes.status).toBe(200);

      const postRes = await fetch(`${baseUrl}/api/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialized: "test-delegation-data" }),
      });
      expect(postRes.status).toBe(429);
    });

    it("returns 'active' after storing a delegation", async () => {
      // Store a delegation first
      await fetch(`${baseUrl}/api/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialized: "test-delegation-data" }),
      });

      const res = await fetch(`${baseUrl}/api/delegations/status`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("active");
      expect(body.expiresAt).toBeDefined();
    });

    it("returns 'none' and removes stale delegations without the current policy hash", async () => {
      await store.store(TEST_ADDRESS, "old-delegation", {
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        actions: [],
        path: "items/",
      });
      cache.set(TEST_ADDRESS, { kv: {}, sql: {} });

      const res = await fetch(`${baseUrl}/api/delegations/status`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("none");

      expect(await store.load(TEST_ADDRESS)).toBeNull();
      expect(cache.has(TEST_ADDRESS)).toBe(false);
    });

    it("returns 'expired' for expired delegations", async () => {
      // Manually store an expired delegation
      await store.store(TEST_ADDRESS, "old-delegation", {
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        actions: [],
        path: "items/",
      });

      const res = await fetch(`${baseUrl}/api/delegations/status`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("expired");
    });

    it("cleans up expired delegation from store and cache", async () => {
      // Store expired delegation and cache entry
      await store.store(TEST_ADDRESS, "old-delegation", {
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        actions: [],
        path: "items/",
      });
      cache.set(TEST_ADDRESS, { kv: {}, sql: {} });

      await fetch(`${baseUrl}/api/delegations/status`);

      // Store should be cleaned
      const stored = await store.load(TEST_ADDRESS);
      expect(stored).toBeNull();
      // Cache should be evicted
      expect(cache.has(TEST_ADDRESS)).toBe(false);
    });

    it("returns 'none' after DELETE", async () => {
      // Store a delegation
      await fetch(`${baseUrl}/api/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialized: "delegation-to-delete" }),
      });

      // Delete it
      await fetch(`${baseUrl}/api/delegations`, {
        method: "DELETE",
      });

      // Check status
      const res = await fetch(`${baseUrl}/api/delegations/status`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("none");
      expect(body.expiresAt).toBeNull();
    });
  });

  // ── POST /api/delegations ─────────────────────────────────────────

  describe("POST /api/delegations", () => {
    it("stores a delegation and returns 'active' status", async () => {
      const res = await fetch(`${baseUrl}/api/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialized: "test-delegation-data" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("active");
      expect(body.activation).toBe("active");
      expect(body.expiresAt).toBeDefined();
    });

    it("calls deserializeDelegation with the serialized data", async () => {
      await fetch(`${baseUrl}/api/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialized: "my-delegation-string" }),
      });

      expect(mockDeserializeDelegation).toHaveBeenCalledWith("my-delegation-string");
    });

    it("calls node.useDelegation to activate", async () => {
      await fetch(`${baseUrl}/api/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialized: "activatable" }),
      });

      expect(mockUseDelegation).toHaveBeenCalledTimes(8);
      expect(mockUseDelegation.mock.calls.map((call) => call[0].path)).toEqual([
        "xyz.tinycloud.listen/",
        "xyz.tinycloud.listen/conversations",
        DEFAULT_ENCRYPTION_NETWORK_ID,
        "vault/secrets/FIREFLIES_API_KEY",
        "vault/secrets/ASSEMBLYAI_API_KEY",
        "vault/secrets/DEEPGRAM_API_KEY",
        "vault/secrets/GRANOLA_API_KEY",
        "vault/secrets/scoped/listen/GOOGLE_MEET_TOKENS",
      ]);
    });

    it("persists delegation to the store", async () => {
      await fetch(`${baseUrl}/api/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialized: "persistent-delegation" }),
      });

      const stored = await store.load(TEST_ADDRESS);
      expect(stored).not.toBeNull();
      expect(stored!.serialized).toBe("persistent-delegation");
      expect(stored!.actions).toContain("tinycloud.kv/get");
      expect(stored!.actions).toContain("tinycloud.sql/write");
      expect(stored!.path).toContain("tinycloud.sql:xyz.tinycloud.listen/conversations");
      expect(stored!.policyHash).toBeDefined();
      expect(stored!.resources?.length).toBe(11);
    });

    it("accepts SDK portable resources with short service names and fully qualified spaces", async () => {
      mockDeserializeDelegation.mockImplementationOnce((serialized: string) => ({
        expiry: new Date(Date.now() + 86400_000),
        resources: fullPolicyResources("tinycloud:pkh:eip155:1:0xTEST:applications").map(
          (resource) =>
            resource.space === "secrets"
              ? {
                  ...resource,
                  service: resource.service.replace("tinycloud.", ""),
                  space: "tinycloud:pkh:eip155:1:0xTEST:secrets",
                }
              : resource.service === "tinycloud.encryption"
                ? {
                    ...resource,
                    service: resource.service.replace("tinycloud.", ""),
                    space: "tinycloud:pkh:eip155:1:0xTEST:applications",
                  }
                : { ...resource, service: resource.service.replace("tinycloud.", "") },
        ),
        _serialized: serialized,
      }));

      const res = await fetch(`${baseUrl}/api/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialized: "sdk-portable-delegation" }),
      });

      expect(res.status).toBe(200);
      const stored = await store.load(TEST_ADDRESS);
      expect(stored!.resources).toEqual([
        {
          service: "tinycloud.kv",
          space: "applications",
          path: "xyz.tinycloud.listen/",
          actions: [
            "tinycloud.kv/get",
            "tinycloud.kv/put",
            "tinycloud.kv/del",
            "tinycloud.kv/list",
            "tinycloud.kv/metadata",
          ],
        },
        {
          service: "tinycloud.sql",
          space: "applications",
          path: "xyz.tinycloud.listen/conversations",
          actions: ["tinycloud.sql/read", "tinycloud.sql/write"],
        },
        {
          service: "tinycloud.encryption",
          space: "encryption",
          path: DEFAULT_ENCRYPTION_NETWORK_ID,
          actions: ["tinycloud.encryption/decrypt"],
        },
        {
          service: "tinycloud.capabilities",
          space: "applications",
          path: "",
          actions: ["tinycloud.capabilities/read"],
        },
        {
          service: "tinycloud.capabilities",
          space: "encryption",
          path: "",
          actions: ["tinycloud.capabilities/read"],
        },
        ...SECRET_NAMES.map((secretName) => ({
          service: "tinycloud.kv",
          space: "secrets",
          path: `vault/secrets/${secretName}`,
          actions: ["tinycloud.kv/get"],
        })),
        {
          service: "tinycloud.kv",
          space: "secrets",
          path: "vault/secrets/scoped/listen/GOOGLE_MEET_TOKENS",
          actions: ["tinycloud.kv/get", "tinycloud.kv/put", "tinycloud.kv/del"],
        },
        {
          service: "tinycloud.capabilities",
          space: "secrets",
          path: "",
          actions: ["tinycloud.capabilities/read"],
        },
      ]);
    });

    it("caches the DelegatedAccess", async () => {
      await fetch(`${baseUrl}/api/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialized: "cacheable" }),
      });

      expect(cache.has(TEST_ADDRESS)).toBe(true);
    });

    it("returns 400 without serialized field", async () => {
      const res = await fetch(`${baseUrl}/api/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("invalid_body");
    });

    it("returns 400 with non-string serialized field", async () => {
      const res = await fetch(`${baseUrl}/api/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialized: 12345 }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("invalid_body");
    });

    it("returns 400 when deserializeDelegation throws", async () => {
      mockDeserializeDelegation.mockImplementationOnce(() => {
        throw new Error("Invalid delegation format");
      });

      const res = await fetch(`${baseUrl}/api/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialized: "bad-data" }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("invalid_delegation");
      expect(body.message).toBe("Failed to process delegation");
    });

    it("stores the delegation when immediate activation rejects", async () => {
      mockUseDelegation.mockImplementationOnce(async () => {
        throw new Error("Delegation verification failed");
      });

      const res = await fetch(`${baseUrl}/api/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialized: "unverifiable" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("active");
      expect(body.activation).toBe("pending");
      expect(body.expiresAt).toBeDefined();

      const stored = await store.load(TEST_ADDRESS);
      expect(stored).not.toBeNull();
      expect(stored!.serialized).toBe("unverifiable");
      expect(cache.has(TEST_ADDRESS)).toBe(false);
    });
  });

  // ── DELETE /api/delegations ───────────────────────────────────────

  describe("DELETE /api/delegations", () => {
    it("removes a stored delegation", async () => {
      // Store first
      await fetch(`${baseUrl}/api/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialized: "to-delete" }),
      });
      expect(await store.load(TEST_ADDRESS)).not.toBeNull();

      // Delete
      const res = await fetch(`${baseUrl}/api/delegations`, {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("none");
      expect(body.expiresAt).toBeNull();

      // Verify removed
      expect(await store.load(TEST_ADDRESS)).toBeNull();
    });

    it("evicts cached DelegatedAccess", async () => {
      // Store and cache
      await fetch(`${baseUrl}/api/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialized: "cached-to-delete" }),
      });
      expect(cache.has(TEST_ADDRESS)).toBe(true);

      // Delete
      await fetch(`${baseUrl}/api/delegations`, {
        method: "DELETE",
      });

      expect(cache.has(TEST_ADDRESS)).toBe(false);
    });

    it("succeeds even when no delegation exists", async () => {
      const res = await fetch(`${baseUrl}/api/delegations`, {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("none");
    });
  });
});
