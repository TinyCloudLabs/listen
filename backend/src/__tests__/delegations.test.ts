import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";

// ── Mock @tinycloud/node-sdk BEFORE importing the route ───────────────

const TEST_ADDRESS = "0xTEST";
const TEST_DID = "did:pkh:eip155:1:0xTEST";
const SECRET_NAMES = [
  "FIREFLIES_API_KEY",
  "GRANOLA_API_KEY",
  "SOUNDCORE_SESSION",
  "SOUNDCORE_AUTH_TOKEN",
  "SOUNDCORE_UID",
  "SOUNDCORE_OPENUDID",
  "ASSEMBLYAI_API_KEY",
  "DEEPGRAM_API_KEY",
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
      actions: ["tinycloud.sql/read", "tinycloud.sql/write", "tinycloud.sql/schema"],
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
      service: "tinycloud.kv",
      space: "secrets",
      path: "vault/secrets/scoped/listen/OTTER_COOKIE",
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
import { delegationContentIdentity } from "@listen/server";
import { createDelegationRouter } from "../routes/delegations.js";
import { createDelegationActivator, type DelegationActivator } from "../delegation-activation.js";

// ── In-Memory Delegation Store ────────────────────────────────────────

interface StoredEntry {
  revision: string;
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
        resources: metadata.resources,
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

// ── In-Memory Delegation Cache ────────────────────────────────────────

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
  activatorOverride?: DelegationActivator,
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
  const activator = activatorOverride ?? createDelegationActivator(mockNode, cache as any);
  app.use(express.json());
  app.use(
    "/api/delegations",
    createDelegationRouter({
      did: TEST_DID,
      store: store as any,
      cache: cache as any,
      activator,
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

    it("returns a 500 ApiError when a successful store envelope is malformed", async () => {
      if (server) await closeServer(server);

      const brokenStore = {
        ...store,
        load: async () => {
          throw Object.assign(new Error("invalid successful KV response"), {
            code: "delegation_store_invalid_response",
          });
        },
      };
      const brokenApp = createApp(brokenStore as any, cache);
      const result = await startServer(brokenApp);
      server = result.server;
      baseUrl = `http://localhost:${result.port}`;

      const res = await fetch(`${baseUrl}/api/delegations/status`);

      expect(res.status).toBe(500);
      expect(await res.json()).toMatchObject({
        error: "status_check_failed",
      });
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

    it("returns stable 'stale' status without removing the stored row", async () => {
      const expiresAt = new Date(Date.now() + 1000).toISOString();
      await store.store(TEST_ADDRESS, "old-delegation", {
        expiresAt,
        actions: [],
        path: "items/",
      });
      cache.set(
        TEST_ADDRESS,
        delegationContentIdentity("old-delegation"),
        (await store.load(TEST_ADDRESS))!.revision,
        { kv: {}, sql: {} },
      );

      const res = await fetch(`${baseUrl}/api/delegations/status`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("stale");
      expect(body.expiresAt).toBe(expiresAt);

      expect(await store.load(TEST_ADDRESS)).not.toBeNull();
      expect(cache.has(TEST_ADDRESS)).toBe(false);

      const repeated = await fetch(`${baseUrl}/api/delegations/status`);
      expect((await repeated.json()).status).toBe("stale");
      expect(await store.load(TEST_ADDRESS)).not.toBeNull();
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

    it("returns stable 'expired' status and preserves the stored row", async () => {
      // Store expired delegation and cache entry
      await store.store(TEST_ADDRESS, "old-delegation", {
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        actions: [],
        path: "items/",
      });
      cache.set(
        TEST_ADDRESS,
        delegationContentIdentity("old-delegation"),
        (await store.load(TEST_ADDRESS))!.revision,
        { kv: {}, sql: {} },
      );

      await fetch(`${baseUrl}/api/delegations/status`);

      // Store remains the source of truth until replacement or explicit DELETE.
      const stored = await store.load(TEST_ADDRESS);
      expect(stored).not.toBeNull();
      expect(cache.has(TEST_ADDRESS)).toBe(false);

      const repeated = await fetch(`${baseUrl}/api/delegations/status`);
      expect((await repeated.json()).status).toBe("expired");
      expect(await store.load(TEST_ADDRESS)).not.toBeNull();
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
    it("returns coded 503 when the durable store rejects a malformed KV write result", async () => {
      store.store = async () => {
        throw Object.assign(new Error("invalid successful KV write response"), {
          code: "delegation_store_invalid_response",
        });
      };

      const res = await fetch(`${baseUrl}/api/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialized: "malformed-store-result" }),
      });

      expect(res.status).toBe(503);
      expect(await res.json()).toMatchObject({ error: "delegation_store_unavailable" });
    });

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

      expect(mockUseDelegation).toHaveBeenCalledTimes(13);
      expect(mockUseDelegation.mock.calls.map((call) => call[0].path)).toEqual([
        "xyz.tinycloud.listen/",
        "xyz.tinycloud.listen/conversations",
        DEFAULT_ENCRYPTION_NETWORK_ID,
        "vault/secrets/FIREFLIES_API_KEY",
        "vault/secrets/GRANOLA_API_KEY",
        "vault/secrets/SOUNDCORE_SESSION",
        "vault/secrets/SOUNDCORE_AUTH_TOKEN",
        "vault/secrets/SOUNDCORE_UID",
        "vault/secrets/SOUNDCORE_OPENUDID",
        "vault/secrets/ASSEMBLYAI_API_KEY",
        "vault/secrets/DEEPGRAM_API_KEY",
        "vault/secrets/scoped/listen/GOOGLE_MEET_TOKENS",
        "vault/secrets/scoped/listen/OTTER_COOKIE",
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
      expect(stored!.resources?.length).toBe(16);
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
          actions: ["tinycloud.sql/read", "tinycloud.sql/write", "tinycloud.sql/schema"],
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
          service: "tinycloud.kv",
          space: "secrets",
          path: "vault/secrets/scoped/listen/OTTER_COOKIE",
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

    it("rejects an already-expired delegation with 400 and stores nothing", async () => {
      mockDeserializeDelegation.mockImplementationOnce((serialized: string) => ({
        expiry: new Date(Date.now() - 1000),
        resources: fullPolicyResources(),
        _serialized: serialized,
      }));

      const res = await fetch(`${baseUrl}/api/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialized: "expired-at-grant" }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("delegation_expired_at_grant");
      expect(body.message).toContain("fresh delegation");

      expect(await store.load(TEST_ADDRESS)).toBeNull();
      expect(cache.has(TEST_ADDRESS)).toBe(false);
      expect(mockUseDelegation).not.toHaveBeenCalled();
    });

    it("rejects a delegation that expires within the acceptance margin", async () => {
      mockDeserializeDelegation.mockImplementationOnce((serialized: string) => ({
        expiry: new Date(Date.now() + 10_000),
        resources: fullPolicyResources(),
        _serialized: serialized,
      }));

      const res = await fetch(`${baseUrl}/api/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialized: "expires-too-soon" }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("delegation_expired_at_grant");
      expect(await store.load(TEST_ADDRESS)).toBeNull();
    });

    it("accepts a delegation that expires beyond the acceptance margin", async () => {
      mockDeserializeDelegation.mockImplementationOnce((serialized: string) => ({
        expiry: new Date(Date.now() + 120_000),
        resources: fullPolicyResources(),
        _serialized: serialized,
      }));

      const res = await fetch(`${baseUrl}/api/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialized: "short-but-valid" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("active");
      expect(await store.load(TEST_ADDRESS)).not.toBeNull();
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

    it("reports a POST superseded when DELETE wins during activation", async () => {
      if (server) await closeServer(server);

      let markActivationStarted!: () => void;
      const activationStarted = new Promise<void>((resolve) => {
        markActivationStarted = resolve;
      });
      let finishActivation!: () => void;
      const activationPending = new Promise<any>((resolve) => {
        finishActivation = () => resolve({ spaceId: "old" });
      });
      const activator: DelegationActivator = {
        activate: async () => {
          markActivationStarted();
          return activationPending;
        },
        invalidate: () => {},
      };
      const raceApp = createApp(store, cache, undefined, activator);
      const result = await startServer(raceApp);
      server = result.server;
      baseUrl = `http://localhost:${result.port}`;

      const postRequest = fetch(`${baseUrl}/api/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialized: "superseded-by-delete" }),
      });
      await activationStarted;

      expect((await fetch(`${baseUrl}/api/delegations`, { method: "DELETE" })).status).toBe(200);
      finishActivation();

      const response = await postRequest;
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ error: "delegation_superseded" });
      expect(await store.load(TEST_ADDRESS)).toBeNull();
    });

    it("reports a rejected activation superseded when DELETE wins", async () => {
      if (server) await closeServer(server);

      let markActivationStarted!: () => void;
      const activationStarted = new Promise<void>((resolve) => {
        markActivationStarted = resolve;
      });
      let rejectActivation!: () => void;
      const activationPending = new Promise<any>((_resolve, reject) => {
        rejectActivation = () => reject(new Error("node unavailable"));
      });
      const activator: DelegationActivator = {
        activate: async () => {
          markActivationStarted();
          return activationPending;
        },
        invalidate: () => {},
      };
      const raceApp = createApp(store, cache, undefined, activator);
      const result = await startServer(raceApp);
      server = result.server;
      baseUrl = `http://localhost:${result.port}`;

      const postRequest = fetch(`${baseUrl}/api/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialized: "rejected-after-delete" }),
      });
      await activationStarted;

      expect((await fetch(`${baseUrl}/api/delegations`, { method: "DELETE" })).status).toBe(200);
      rejectActivation();

      const response = await postRequest;
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ error: "delegation_superseded" });
      expect(await store.load(TEST_ADDRESS)).toBeNull();
    });

    it("reports an older POST superseded when a newer POST wins", async () => {
      if (server) await closeServer(server);

      let markFirstActivationStarted!: () => void;
      const firstActivationStarted = new Promise<void>((resolve) => {
        markFirstActivationStarted = resolve;
      });
      let finishFirstActivation!: () => void;
      const firstActivationPending = new Promise<any>((resolve) => {
        finishFirstActivation = () => resolve({ spaceId: "old" });
      });
      const activator: DelegationActivator = {
        activate: async (_address, serialized) => {
          if (serialized === "grant-a") {
            markFirstActivationStarted();
            return firstActivationPending;
          }
          return { spaceId: "new" } as any;
        },
        invalidate: () => {},
      };
      const raceApp = createApp(store, cache, undefined, activator);
      const result = await startServer(raceApp);
      server = result.server;
      baseUrl = `http://localhost:${result.port}`;

      const firstPost = fetch(`${baseUrl}/api/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialized: "grant-a" }),
      });
      await firstActivationStarted;

      const secondPost = await fetch(`${baseUrl}/api/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialized: "grant-b" }),
      });
      expect(secondPost.status).toBe(200);
      expect((await secondPost.json()).activation).toBe("active");

      finishFirstActivation();
      const firstResponse = await firstPost;
      expect(firstResponse.status).toBe(409);
      expect(await firstResponse.json()).toMatchObject({ error: "delegation_superseded" });
      expect((await store.load(TEST_ADDRESS))?.serialized).toBe("grant-b");
    });

    it("reports a rejected older POST superseded when a newer POST wins", async () => {
      if (server) await closeServer(server);

      let markFirstActivationStarted!: () => void;
      const firstActivationStarted = new Promise<void>((resolve) => {
        markFirstActivationStarted = resolve;
      });
      let rejectFirstActivation!: () => void;
      const firstActivationPending = new Promise<any>((_resolve, reject) => {
        rejectFirstActivation = () => reject(new Error("node unavailable"));
      });
      const activator: DelegationActivator = {
        activate: async (_address, serialized) => {
          if (serialized === "rejected-grant-a") {
            markFirstActivationStarted();
            return firstActivationPending;
          }
          return { spaceId: "new" } as any;
        },
        invalidate: () => {},
      };
      const raceApp = createApp(store, cache, undefined, activator);
      const result = await startServer(raceApp);
      server = result.server;
      baseUrl = `http://localhost:${result.port}`;

      const firstPost = fetch(`${baseUrl}/api/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialized: "rejected-grant-a" }),
      });
      await firstActivationStarted;

      const secondPost = await fetch(`${baseUrl}/api/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialized: "grant-b" }),
      });
      expect(secondPost.status).toBe(200);
      rejectFirstActivation();

      const firstResponse = await firstPost;
      expect(firstResponse.status).toBe(409);
      expect(await firstResponse.json()).toMatchObject({ error: "delegation_superseded" });
      expect((await store.load(TEST_ADDRESS))?.serialized).toBe("grant-b");
    });

    it("uses the durable revision to supersede identical POSTs", async () => {
      if (server) await closeServer(server);

      let activationCount = 0;
      let markFirstActivationStarted!: () => void;
      const firstActivationStarted = new Promise<void>((resolve) => {
        markFirstActivationStarted = resolve;
      });
      let finishFirstActivation!: () => void;
      const firstActivationPending = new Promise<any>((resolve) => {
        finishFirstActivation = () => resolve({ spaceId: "old" });
      });
      const activator: DelegationActivator = {
        activate: async (_address, _serialized, identity, revision) => {
          if (activationCount++ === 0) {
            markFirstActivationStarted();
            return firstActivationPending;
          }
          const access = { spaceId: "new" } as any;
          cache.set(TEST_ADDRESS, identity, revision, access);
          return access;
        },
        invalidate: () => {},
      };
      const raceApp = createApp(store, cache, undefined, activator);
      const result = await startServer(raceApp);
      server = result.server;
      baseUrl = `http://localhost:${result.port}`;

      const firstPost = fetch(`${baseUrl}/api/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialized: "identical-grant" }),
      });
      await firstActivationStarted;

      const secondPost = await fetch(`${baseUrl}/api/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialized: "identical-grant" }),
      });
      expect(secondPost.status).toBe(200);
      expect((await secondPost.json()).activation).toBe("active");

      finishFirstActivation();
      const firstResponse = await firstPost;
      expect(firstResponse.status).toBe(409);

      const current = await store.load(TEST_ADDRESS);
      expect(current?.serialized).toBe("identical-grant");
      expect(current?.revision).toBeDefined();
      expect(cache._cache.get(TEST_ADDRESS)).toMatchObject({
        revision: current!.revision,
        access: { spaceId: "new" },
      });
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

    it("prevents activation started during revocation from repopulating cache", async () => {
      if (server) await closeServer(server);

      await store.store(TEST_ADDRESS, "still-loadable", {
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        actions: [],
        path: "",
      });

      let markRemoveStarted!: () => void;
      const removeStarted = new Promise<void>((resolve) => {
        markRemoveStarted = resolve;
      });
      let finishRemove!: () => void;
      const removePending = new Promise<void>((resolve) => {
        finishRemove = resolve;
      });
      const removeStored = store.remove.bind(store);
      store.remove = async (identifier: string) => {
        markRemoveStarted();
        await removePending;
        await removeStored(identifier);
      };

      let finishActivation!: (access: any) => void;
      const activationPending = new Promise<any>((resolve) => {
        finishActivation = resolve;
      });
      const activator = createDelegationActivator({} as any, cache as any, () => activationPending);
      const raceApp = createApp(store, cache, undefined, activator);
      const result = await startServer(raceApp);
      server = result.server;
      baseUrl = `http://localhost:${result.port}`;

      const deleteRequest = fetch(`${baseUrl}/api/delegations`, { method: "DELETE" });
      await removeStarted;
      expect(await store.load(TEST_ADDRESS)).not.toBeNull();

      const racedActivation = activator.activate(
        TEST_ADDRESS,
        "still-loadable",
        "test-identity",
        (await store.load(TEST_ADDRESS))!.revision,
      );
      finishRemove();
      expect((await deleteRequest).status).toBe(200);

      finishActivation({ spaceId: "revoked" });
      await racedActivation;
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

    it("returns revoke_failed when durable removal is not confirmed", async () => {
      await store.store(TEST_ADDRESS, "cannot-delete", {
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        actions: [],
        path: "",
      });
      store.remove = async () => {
        throw new Error("delete unavailable");
      };

      const res = await fetch(`${baseUrl}/api/delegations`, { method: "DELETE" });
      expect(res.status).toBe(500);
      expect(await res.json()).toMatchObject({ error: "revoke_failed" });
      expect(await store.load(TEST_ADDRESS)).not.toBeNull();
    });
  });
});
