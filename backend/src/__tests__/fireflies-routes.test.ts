import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import express from "express";
import type { Server } from "http";
import type { Request, Response, NextFunction } from "express";
import { createFirefliesRouter } from "../routes/fireflies.js";

// ── Mock KV Store ────────────────────────────────────────────────────

function createMockKV() {
  const data = new Map<string, string>();
  return {
    _data: data,
    get: async (key: string) => {
      const val = data.get(key);
      if (val === undefined) return { ok: true, data: { data: null } };
      return { ok: true, data: { data: val } };
    },
    put: async (key: string, value: string) => {
      data.set(key, value);
      return { ok: true };
    },
    delete: async (key: string) => {
      data.delete(key);
      return { ok: true };
    },
  };
}

let secretReadOverride: (() => Promise<any>) | null = null;

// ── Mock Fireflies Client ────────────────────────────────────────────

function createMockClientFactory() {
  let getUserResult: (() => Promise<any>) | null = null;
  let lastApiKey: string | null = null;

  return {
    setGetUserResult(fn: () => Promise<any>) {
      getUserResult = fn;
    },
    getLastApiKey() {
      return lastApiKey;
    },
    factory(apiKey: string) {
      lastApiKey = apiKey;
      return {
        getUser: () => getUserResult!(),
      };
    },
  };
}

// ── Test Helpers ─────────────────────────────────────────────────────

const TEST_SUB = "test-sub";
const KV_KEY = "config/fireflies-key";

function mockAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.user = { sub: TEST_SUB };
  next();
}

function createApp(
  mockKV: ReturnType<typeof createMockKV>,
  clientFactory: ReturnType<typeof createMockClientFactory>,
) {
  const mockDelegationMiddleware = (req: Request, _res: Response, next: NextFunction) => {
    req.delegatedAccess = {
      kv: mockKV,
      secrets: {
        get: async () => {
          if (secretReadOverride) return secretReadOverride();
          const val = mockKV._data.get(KV_KEY);
          if (val === undefined) return { ok: false, error: { code: "KEY_NOT_FOUND" } };
          return { ok: true, data: val };
        },
      },
    } as any;
    next();
  };

  const app = express();
  app.use(express.json());
  app.use(
    "/api/fireflies",
    createFirefliesRouter({
      authMiddleware: mockAuthMiddleware,
      delegationMiddleware: mockDelegationMiddleware,
      createClient: clientFactory.factory,
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

// ── Tests ────────────────────────────────────────────────────────────

describe("Fireflies Routes", () => {
  let mockKV: ReturnType<typeof createMockKV>;
  let clientFactory: ReturnType<typeof createMockClientFactory>;
  let server: Server;
  let port: number;

  beforeEach(async () => {
    secretReadOverride = null;
    mockKV = createMockKV();
    clientFactory = createMockClientFactory();
    const app = createApp(mockKV, clientFactory);
    ({ server, port } = await startServer(app));
  });

  afterEach(async () => {
    await closeServer(server);
  });

  // ── GET /api/fireflies/user ─────────────────────────────────────

  describe("GET /api/fireflies/user", () => {
    it("returns Fireflies user profile when valid key is stored", async () => {
      mockKV._data.set(KV_KEY, "valid-api-key");
      clientFactory.setGetUserResult(async () => ({
        name: "Roman",
        email: "roman@tinycloud.xyz",
        is_admin: true,
      }));

      const res = await fetch(`http://localhost:${port}/api/fireflies/user`);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        name: "Roman",
        email: "roman@tinycloud.xyz",
        is_admin: true,
      });
    });

    it("returns 404 when no API key is stored", async () => {
      const res = await fetch(`http://localhost:${port}/api/fireflies/user`);

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("no_api_key");
    });

    it("returns 503 when reading the delegated API key is unavailable", async () => {
      secretReadOverride = async () => {
        throw Object.assign(new Error("grant missing"), { code: "grant_not_found" });
      };

      const res = await fetch(`http://localhost:${port}/api/fireflies/user`);

      expect(res.status).toBe(503);
      expect(await res.json()).toMatchObject({
        error: "fireflies_secret_unavailable",
        secretCode: "grant_not_found",
      });
    });

    it("returns 503 when a successful delegated API key payload is malformed", async () => {
      secretReadOverride = async () => ({ ok: true, data: "" });

      const res = await fetch(`http://localhost:${port}/api/fireflies/user`);

      expect(res.status).toBe(503);
      expect(await res.json()).toMatchObject({
        error: "fireflies_secret_unavailable",
        secretCode: "INVALID_SECRET_RESPONSE",
      });
    });

    it("returns 401 when Fireflies rejects the API key (HTTP 401)", async () => {
      mockKV._data.set(KV_KEY, "invalid-key");
      clientFactory.setGetUserResult(async () => {
        throw new Error("Fireflies API error: 401 Unauthorized");
      });

      const res = await fetch(`http://localhost:${port}/api/fireflies/user`);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("fireflies_auth_error");
    });

    it("returns 401 when Fireflies returns a GraphQL auth error", async () => {
      mockKV._data.set(KV_KEY, "bad-key");
      clientFactory.setGetUserResult(async () => {
        throw new Error("Not authenticated");
      });

      const res = await fetch(`http://localhost:${port}/api/fireflies/user`);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("fireflies_auth_error");
    });

    it("passes the stored API key to the client factory", async () => {
      mockKV._data.set(KV_KEY, "my-secret-key");
      clientFactory.setGetUserResult(async () => ({
        name: "A",
        email: "a@b.com",
        is_admin: false,
      }));

      await fetch(`http://localhost:${port}/api/fireflies/user`);

      expect(clientFactory.getLastApiKey()).toBe("my-secret-key");
    });

    it("returns 500 for non-auth Fireflies errors", async () => {
      mockKV._data.set(KV_KEY, "valid-key");
      clientFactory.setGetUserResult(async () => {
        throw new Error("Network failure");
      });

      const res = await fetch(`http://localhost:${port}/api/fireflies/user`);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("fireflies_error");
    });
  });

  // ── Auth/Delegation required ──────────────────────────────────

  describe("Auth and delegation enforcement", () => {
    it("returns 401 when auth middleware rejects", async () => {
      const noAuthMiddleware = (_req: Request, res: Response, _next: NextFunction) => {
        res.status(401).json({ error: "unauthenticated" });
      };
      const mockDelegationMiddleware = (_req: Request, _res: Response, next: NextFunction) => {
        next();
      };

      const app = express();
      app.use(express.json());
      app.use(
        "/api/fireflies",
        createFirefliesRouter({
          authMiddleware: noAuthMiddleware as any,
          delegationMiddleware: mockDelegationMiddleware,
        }),
      );
      const { server: s, port: p } = await startServer(app);

      try {
        const res = await fetch(`http://localhost:${p}/api/fireflies/user`);
        expect(res.status).toBe(401);
      } finally {
        await closeServer(s);
      }
    });

    it("returns 403 when delegation middleware rejects", async () => {
      const noDelegationMiddleware = (_req: Request, res: Response, _next: NextFunction) => {
        res.status(403).json({ error: "no_delegation" });
      };

      const app = express();
      app.use(express.json());
      app.use(
        "/api/fireflies",
        createFirefliesRouter({
          authMiddleware: mockAuthMiddleware,
          delegationMiddleware: noDelegationMiddleware as any,
        }),
      );
      const { server: s, port: p } = await startServer(app);

      try {
        const res = await fetch(`http://localhost:${p}/api/fireflies/user`);
        expect(res.status).toBe(403);
      } finally {
        await closeServer(s);
      }
    });
  });
});
