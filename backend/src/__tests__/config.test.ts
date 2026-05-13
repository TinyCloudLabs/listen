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
const SECRET_KV_KEYS: Record<string, string> = {
  FIREFLIES_API_KEY: "config/fireflies-key",
  GRANOLA_API_KEY: "config/granola-key",
  ASSEMBLYAI_API_KEY: "config/assemblyai-key",
  DEEPGRAM_API_KEY: "config/deepgram-key",
};

function mockAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.user = { sub: TEST_SUB };
  next();
}

function createApp(mockKV: ReturnType<typeof createMockKV>) {
  const mockDelegationMiddleware = (req: Request, _res: Response, next: NextFunction) => {
    req.delegatedAccess = {
      kv: mockKV,
      secrets: {
        get: async (secretName: string) => {
          const result = await mockKV.get(SECRET_KV_KEYS[secretName] ?? secretName);
          if (result.ok) return { ok: true, data: result.data?.data };
          if (result.error?.code === "KV_NOT_FOUND") {
            return { ok: false, error: { code: "KEY_NOT_FOUND" } };
          }
          return result;
        },
      },
    } as any;
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

  describe("GET /api/config transcription key existence", () => {
    it("returns exists for AssemblyAI and Deepgram without revealing values", async () => {
      mockKV._data.set("config/assemblyai-key", "assembly-secret");
      mockKV._data.set("config/deepgram-key", "deepgram-secret");

      const assemblyRes = await fetch(`http://localhost:${port}/api/config/assemblyai-key/exists`);
      const deepgramRes = await fetch(`http://localhost:${port}/api/config/deepgram-key/exists`);

      expect(assemblyRes.status).toBe(200);
      expect(deepgramRes.status).toBe(200);
      const assemblyBody = await assemblyRes.json();
      const deepgramBody = await deepgramRes.json();
      expect(assemblyBody).toEqual({ exists: true });
      expect(deepgramBody).toEqual({ exists: true });
      expect(JSON.stringify({ assemblyBody, deepgramBody })).not.toContain("secret");
    });

    it("returns exists: false when a transcription provider key is missing", async () => {
      const res = await fetch(`http://localhost:${port}/api/config/deepgram-key/exists`);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ exists: false });
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
        const res = await fetch(`http://localhost:${p}/api/config/fireflies-key/exists`);
        expect(res.status).toBe(403);
      } finally {
        await closeServer(s);
      }
    });
  });
});
