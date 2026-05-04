import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import express from "express";
import type { Server } from "http";
import type { Request, Response, NextFunction } from "express";
import { createConfigRouter } from "../routes/config.js";

// ── Mock KV Store ────────────────────────────────────────────────────

function createMockKV() {
  const data = new Map<string, string>();
  let failPut: string | null = null;
  let failGet: string | null = null;

  return {
    _data: data,
    _failNextPut(message = "write denied") {
      failPut = message;
    },
    _failNextGet(message = "read denied") {
      failGet = message;
    },
    get: async (key: string) => {
      if (failGet) {
        const message = failGet;
        failGet = null;
        return { ok: false, error: { code: "AUTH_UNAUTHORIZED", message } };
      }
      const val = data.get(key);
      if (val === undefined) return { ok: false, error: { code: "KV_NOT_FOUND" } };
      return { ok: true, data: { data: val } };
    },
    put: async (key: string, value: string) => {
      if (failPut) {
        const message = failPut;
        failPut = null;
        return { ok: false, error: { code: "AUTH_UNAUTHORIZED", message } };
      }
      data.set(key, value);
      return { ok: true };
    },
    delete: async (key: string) => {
      data.delete(key);
      return { ok: true };
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

function createApp(mockKV: ReturnType<typeof createMockKV>) {
  const mockDelegationMiddleware = (req: Request, _res: Response, next: NextFunction) => {
    req.delegatedAccess = { kv: mockKV } as any;
    next();
  };

  const app = express();
  app.use(express.json());
  app.use(
    "/api/config",
    createConfigRouter({
      authMiddleware: mockAuthMiddleware,
      delegationMiddleware: mockDelegationMiddleware,
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

describe("Config Routes", () => {
  let mockKV: ReturnType<typeof createMockKV>;
  let server: Server;
  let port: number;

  beforeEach(async () => {
    mockKV = createMockKV();
    const app = createApp(mockKV);
    ({ server, port } = await startServer(app));
  });

  afterEach(async () => {
    await closeServer(server);
  });

  // ── PUT /api/config/fireflies-key ─────────────────────────────────

  describe("PUT /api/config/fireflies-key", () => {
    it("stores API key in KV and returns ok", async () => {
      const res = await fetch(`http://localhost:${port}/api/config/fireflies-key`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: "test-api-key-123" }),
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
      expect(mockKV._data.get(KV_KEY)).toBe("test-api-key-123");
    });

    it("returns 400 when apiKey is missing", async () => {
      const res = await fetch(`http://localhost:${port}/api/config/fireflies-key`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("invalid_body");
    });

    it("returns 400 when apiKey is empty string", async () => {
      const res = await fetch(`http://localhost:${port}/api/config/fireflies-key`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: "" }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("invalid_body");
    });

    it("returns 400 when apiKey is not a string", async () => {
      const res = await fetch(`http://localhost:${port}/api/config/fireflies-key`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: 12345 }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("invalid_body");
    });

    it("overwrites an existing key", async () => {
      mockKV._data.set(KV_KEY, "old-key");

      const res = await fetch(`http://localhost:${port}/api/config/fireflies-key`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: "new-key" }),
      });

      expect(res.status).toBe(200);
      expect(mockKV._data.get(KV_KEY)).toBe("new-key");
    });

    it("returns 500 when TinyCloud rejects the KV write", async () => {
      mockKV._failNextPut("delegation missing kv/put");

      const res = await fetch(`http://localhost:${port}/api/config/fireflies-key`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: "new-key" }),
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("store_failed");
      expect(mockKV._data.has(KV_KEY)).toBe(false);
    });

    it("returns 500 when the post-write verification read fails", async () => {
      mockKV._failNextGet("delegation missing kv/get");

      const res = await fetch(`http://localhost:${port}/api/config/fireflies-key`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: "new-key" }),
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("store_verification_failed");
    });
  });

  // ── DELETE /api/config/fireflies-key ──────────────────────────────

  describe("DELETE /api/config/fireflies-key", () => {
    it("deletes the key from KV and returns ok", async () => {
      mockKV._data.set(KV_KEY, "some-key");

      const res = await fetch(`http://localhost:${port}/api/config/fireflies-key`, {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
      expect(mockKV._data.has(KV_KEY)).toBe(false);
    });

    it("succeeds even when no key exists", async () => {
      const res = await fetch(`http://localhost:${port}/api/config/fireflies-key`, {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    });
  });

  // ── GET /api/config/fireflies-key/exists ──────────────────────────

  describe("GET /api/config/fireflies-key/exists", () => {
    it("returns exists: true when key is stored", async () => {
      mockKV._data.set(KV_KEY, "some-key");

      const res = await fetch(`http://localhost:${port}/api/config/fireflies-key/exists`);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ exists: true });
    });

    it("returns exists: false when no key is stored", async () => {
      const res = await fetch(`http://localhost:${port}/api/config/fireflies-key/exists`);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ exists: false });
    });

    it("returns 500 when TinyCloud rejects the existence check", async () => {
      mockKV._failNextGet("delegation missing kv/get");

      const res = await fetch(`http://localhost:${port}/api/config/fireflies-key/exists`);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("check_failed");
    });

    it("does not reveal the key value", async () => {
      mockKV._data.set(KV_KEY, "secret-api-key");

      const res = await fetch(`http://localhost:${port}/api/config/fireflies-key/exists`);

      const body = await res.json();
      expect(JSON.stringify(body)).not.toContain("secret-api-key");
    });
  });

  // ── Google Meet config routes ────────────────────────────────────

  const GOOGLE_TOKENS_PATH = "config/google-tokens";

  describe("GET /api/config/google-meet/connected", () => {
    it("returns connected: false when no tokens stored", async () => {
      const res = await fetch(`http://localhost:${port}/api/config/google-meet/connected`);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ connected: false });
    });

    it("returns connected: true when tokens exist", async () => {
      mockKV._data.set(
        GOOGLE_TOKENS_PATH,
        JSON.stringify({ access_token: "ya29.x", refresh_token: "1//x" }),
      );

      const res = await fetch(`http://localhost:${port}/api/config/google-meet/connected`);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ connected: true });
    });
  });

  describe("DELETE /api/config/google-meet", () => {
    it("deletes tokens from KV and returns ok", async () => {
      mockKV._data.set(
        GOOGLE_TOKENS_PATH,
        JSON.stringify({ access_token: "ya29.x", refresh_token: "1//x" }),
      );

      const res = await fetch(`http://localhost:${port}/api/config/google-meet`, {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
      expect(mockKV._data.has(GOOGLE_TOKENS_PATH)).toBe(false);
    });

    it("succeeds even when no tokens exist", async () => {
      const res = await fetch(`http://localhost:${port}/api/config/google-meet`, {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    });
  });

  // ── Auth/Delegation required ──────────────────────────────────────

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
        "/api/config",
        createConfigRouter({
          authMiddleware: noAuthMiddleware as any,
          delegationMiddleware: mockDelegationMiddleware,
        }),
      );
      const { server: s, port: p } = await startServer(app);

      try {
        const res = await fetch(`http://localhost:${p}/api/config/fireflies-key/exists`);
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
        "/api/config",
        createConfigRouter({
          authMiddleware: mockAuthMiddleware,
          delegationMiddleware: noDelegationMiddleware as any,
        }),
      );
      const { server: s, port: p } = await startServer(app);

      try {
        const res = await fetch(`http://localhost:${p}/api/config/fireflies-key`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: "test" }),
        });
        expect(res.status).toBe(403);
      } finally {
        await closeServer(s);
      }
    });
  });
});
