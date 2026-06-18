import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import express from "express";
import type { Server } from "http";
import type { Request, Response, NextFunction } from "express";
import { createConfigRouter } from "../routes/config.js";

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

function createMockSQL() {
  const calls: Array<{ method: string; sql: string; params?: unknown[] }> = [];
  return {
    _calls: calls,
    query: async (sql: string) => {
      calls.push({ method: "query", sql });
      if (sql.includes("SELECT id, transcript_json FROM conversation")) {
        return {
          ok: true,
          data: {
            columns: ["id", "transcript_json"],
            rows: [
              ["conv-1", null],
              ["conv-2", JSON.stringify([{ speaker_name: "Ada", text: "Current" }])],
              ["conv-3", null],
            ],
          },
        };
      }
      return { ok: true, data: { rows: [], columns: [] } };
    },
    execute: async (sql: string, params?: unknown[]) => {
      calls.push({ method: "execute", sql, params });
      return { ok: true, data: { changes: 1 } };
    },
  };
}

// ── Test Helpers ─────────────────────────────────────────────────────

const TEST_SUB = "test-sub";
const SECRET_KV_KEY = "xyz.tinycloud.listen/webhooks/config/fireflies-secret";
const PENDING_KV_KEY = "xyz.tinycloud.listen/webhooks/pending/fireflies";

function mockAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.user = { sub: TEST_SUB };
  next();
}

function createApp(
  backendKV: ReturnType<typeof createMockKV>,
  frontendUrl?: string,
  delegatedAccess?: Record<string, unknown>,
) {
  const delegationKV = createMockKV();
  const mockDelegationMiddleware = (req: Request, _res: Response, next: NextFunction) => {
    req.delegatedAccess = { kv: delegationKV, ...delegatedAccess } as any;
    next();
  };

  const app = express();
  app.use(express.json());
  app.use(
    "/api/config",
    createConfigRouter({
      authMiddleware: mockAuthMiddleware,
      delegationMiddleware: mockDelegationMiddleware,
      backendKV,
      frontendUrl,
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

describe("Webhook Config Routes", () => {
  let backendKV: ReturnType<typeof createMockKV>;
  let server: Server;
  let port: number;

  beforeEach(async () => {
    backendKV = createMockKV();
    const app = createApp(backendKV, "http://localhost:3001");
    ({ server, port } = await startServer(app));
  });

  afterEach(async () => {
    await closeServer(server);
  });

  // ── PUT /api/config/webhook-secret ────────────────────────────────

  describe("PUT /api/config/webhook-secret", () => {
    it("stores webhook secret in backend KV and returns ok", async () => {
      const res = await fetch(`http://localhost:${port}/api/config/webhook-secret`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: "whsec_test123" }),
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
      expect(backendKV._data.get(SECRET_KV_KEY)).toBe("whsec_test123");
    });

    it("returns 400 when secret is missing", async () => {
      const res = await fetch(`http://localhost:${port}/api/config/webhook-secret`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("invalid_body");
    });

    it("returns 400 when secret is empty string", async () => {
      const res = await fetch(`http://localhost:${port}/api/config/webhook-secret`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: "" }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("invalid_body");
    });

    it("returns 400 when secret is not a string", async () => {
      const res = await fetch(`http://localhost:${port}/api/config/webhook-secret`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: 12345 }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("invalid_body");
    });

    it("overwrites an existing secret", async () => {
      backendKV._data.set(SECRET_KV_KEY, "old-secret");

      const res = await fetch(`http://localhost:${port}/api/config/webhook-secret`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: "new-secret" }),
      });

      expect(res.status).toBe(200);
      expect(backendKV._data.get(SECRET_KV_KEY)).toBe("new-secret");
    });
  });

  // ── GET /api/config/webhook-status ────────────────────────────────

  describe("GET /api/config/webhook-status", () => {
    it("returns configured: true when secret exists", async () => {
      backendKV._data.set(SECRET_KV_KEY, "some-secret");

      const res = await fetch(`http://localhost:${port}/api/config/webhook-status`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.configured).toBe(true);
    });

    it("returns configured: false when no secret", async () => {
      const res = await fetch(`http://localhost:${port}/api/config/webhook-status`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.configured).toBe(false);
    });

    it("returns pendingCount from backend KV", async () => {
      backendKV._data.set(PENDING_KV_KEY, JSON.stringify(["meeting1", "meeting2", "meeting3"]));

      const res = await fetch(`http://localhost:${port}/api/config/webhook-status`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pendingCount).toBe(3);
    });

    it("returns pendingCount 0 when no pending data", async () => {
      const res = await fetch(`http://localhost:${port}/api/config/webhook-status`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pendingCount).toBe(0);
    });

    it("returns webhookUrl from backend host (ignores frontendUrl)", async () => {
      const res = await fetch(`http://localhost:${port}/api/config/webhook-status`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.webhookUrl).toBe(`http://localhost:${port}/api/webhooks/fireflies`);
    });

    it("derives webhookUrl from request host when no frontendUrl", async () => {
      const app = createApp(backendKV);
      const { server: s, port: p } = await startServer(app);

      try {
        const res = await fetch(`http://localhost:${p}/api/config/webhook-status`);

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.webhookUrl).toBe(`http://localhost:${p}/api/webhooks/fireflies`);
      } finally {
        await closeServer(s);
      }
    });

    it("does not reveal the secret value", async () => {
      backendKV._data.set(SECRET_KV_KEY, "super-secret-value");

      const res = await fetch(`http://localhost:${port}/api/config/webhook-status`);

      const body = await res.json();
      expect(JSON.stringify(body)).not.toContain("super-secret-value");
    });
  });

  describe("POST /api/config/migrate-transcripts", () => {
    it("migrates missing SQL transcript fields from legacy KV blobs", async () => {
      const userKV = createMockKV();
      const userSQL = createMockSQL();
      userKV._data.set(
        "xyz.tinycloud.listen/transcript/conv-1",
        JSON.stringify([{ speakerName: "Sam", text: "Hello", startTime: 0 }]),
      );
      const app = createApp(backendKV, "http://localhost:3001", { kv: userKV, sql: userSQL });
      const { server: s, port: p } = await startServer(app);

      try {
        const res = await fetch(`http://localhost:${p}/api/config/migrate-transcripts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toMatchObject({
          scanned: 3,
          migrated: 1,
          skipped: 1,
          missing: 1,
          failed: 0,
        });

        const update = userSQL._calls.find(
          (call) =>
            call.method === "execute" &&
            call.sql.includes("UPDATE conversation SET transcript_json = ?"),
        );
        expect(update).toBeDefined();
        expect(JSON.parse(update!.params![0] as string)[0].speaker_name).toBe("Sam");
        expect(update!.params![1]).toBe("[00:00] Sam: Hello");
      } finally {
        await closeServer(s);
      }
    });
  });

  // ── Auth required ─────────────────────────────────────────────────

  describe("Auth enforcement for webhook config", () => {
    it("returns 401 for webhook-secret when auth rejects", async () => {
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
          backendKV,
        }),
      );
      const { server: s, port: p } = await startServer(app);

      try {
        const res = await fetch(`http://localhost:${p}/api/config/webhook-secret`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secret: "test" }),
        });
        expect(res.status).toBe(401);
      } finally {
        await closeServer(s);
      }
    });

    it("returns 401 for webhook-status when auth rejects", async () => {
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
          backendKV,
        }),
      );
      const { server: s, port: p } = await startServer(app);

      try {
        const res = await fetch(`http://localhost:${p}/api/config/webhook-status`);
        expect(res.status).toBe(401);
      } finally {
        await closeServer(s);
      }
    });

    it("webhook-secret does NOT require delegation middleware", async () => {
      // Delegation rejects, but webhook-secret should still work
      const failDelegationMiddleware = (_req: Request, res: Response, _next: NextFunction) => {
        res.status(403).json({ error: "no_delegation" });
      };

      const app = express();
      app.use(express.json());
      app.use(
        "/api/config",
        createConfigRouter({
          authMiddleware: mockAuthMiddleware,
          delegationMiddleware: failDelegationMiddleware as any,
          backendKV,
        }),
      );
      const { server: s, port: p } = await startServer(app);

      try {
        const res = await fetch(`http://localhost:${p}/api/config/webhook-secret`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secret: "test-secret" }),
        });
        // Should succeed because webhook-secret doesn't use delegation
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true });
      } finally {
        await closeServer(s);
      }
    });
  });
});
