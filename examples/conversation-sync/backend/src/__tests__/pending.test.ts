import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import express from "express";
import type { Server } from "http";
import type { Request, Response, NextFunction } from "express";
import { createWebhookRouter } from "../routes/webhooks.js";

// ── Constants ───────────────────────────────────────────────────────

const PENDING_KV_KEY = "/app.webhooks/pending/fireflies";
const FIREFLIES_KEY_PATH = "/app.conversations/config/fireflies-key";

// ── Helpers ─────────────────────────────────────────────────────────

function createMockBackendKV() {
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
  };
}

function createMockAccess(apiKey?: string) {
  const kvData = new Map<string, string>();
  if (apiKey) kvData.set(FIREFLIES_KEY_PATH, apiKey);

  return {
    _kvData: kvData,
    kv: {
      get: async (key: string) => {
        const val = kvData.get(key);
        if (val === undefined) return { ok: true, data: { data: null } };
        return { ok: true, data: { data: val } };
      },
      put: async (key: string, value: string) => {
        kvData.set(key, value);
        return { ok: true };
      },
    },
    sql: {
      query: async () => ({ ok: true, data: { rows: [], columns: [] } }),
      execute: async () => ({ ok: true, data: { changes: 1 } }),
    },
  };
}

function mockAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.user = { sub: "test-sub" };
  next();
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

function pendingItems(...meetingIds: string[]) {
  return meetingIds.map((id) => ({
    meetingId: id,
    receivedAt: "2026-01-01T00:00:00Z",
  }));
}

// ── Tests ────────────────────────────────────────────────────────────

describe("GET /api/webhooks/fireflies/pending", () => {
  let server: Server;
  let port: number;
  let backendKV: ReturnType<typeof createMockBackendKV>;
  let mockAccess: ReturnType<typeof createMockAccess>;
  let syncFn: ReturnType<typeof mock>;

  function createApp(overrides?: { authMiddleware?: any; delegationMiddleware?: any }) {
    const delegationMiddleware =
      overrides?.delegationMiddleware ??
      ((req: Request, _res: Response, next: NextFunction) => {
        req.delegatedAccess = mockAccess as any;
        next();
      });

    const app = express();
    app.use(
      "/api/webhooks",
      createWebhookRouter({
        backendKV,
        tryGetDelegatedAccess: async () => null,
        authMiddleware: overrides?.authMiddleware ?? mockAuthMiddleware,
        delegationMiddleware,
        syncFn,
      }),
    );
    return app;
  }

  beforeEach(async () => {
    backendKV = createMockBackendKV();
    mockAccess = createMockAccess("test-fireflies-key");

    syncFn = mock(async (meetingId: string) => ({
      status: "created" as const,
      meetingId,
      conversationId: `conv-${meetingId}`,
      title: `Meeting ${meetingId}`,
      startedAt: "2026-01-01T00:00:00Z",
    }));

    const app = createApp();
    ({ server, port } = await startServer(app));
  });

  afterEach(async () => {
    await closeServer(server);
  });

  function getPending() {
    return fetch(`http://localhost:${port}/api/webhooks/fireflies/pending`);
  }

  // ── Auth ─────────────────────────────────────────────────────────

  it("returns 401 when auth rejects", async () => {
    await closeServer(server);
    const noAuth = (_req: Request, res: Response) => {
      res.status(401).json({ error: "missing_token" });
    };
    const app = createApp({ authMiddleware: noAuth });
    ({ server, port } = await startServer(app));

    const res = await getPending();
    expect(res.status).toBe(401);
  });

  it("returns 403 when delegation missing", async () => {
    await closeServer(server);
    const noDelegation = (_req: Request, res: Response) => {
      res.status(403).json({ error: "no_delegation" });
    };
    const app = createApp({ delegationMiddleware: noDelegation });
    ({ server, port } = await startServer(app));

    const res = await getPending();
    expect(res.status).toBe(403);
  });

  // ── Empty queue ──────────────────────────────────────────────────

  it("returns empty arrays when no pending items", async () => {
    const res = await getPending();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ processed: [], skipped: [], errors: [] });
  });

  // ── Processing ───────────────────────────────────────────────────

  it("processes pending items and returns results", async () => {
    backendKV._data.set(PENDING_KV_KEY, JSON.stringify(pendingItems("m1", "m2")));

    const res = await getPending();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processed).toHaveLength(2);
    expect(body.processed[0].meetingId).toBe("m1");
    expect(body.processed[1].meetingId).toBe("m2");
  });

  it("calls syncFn for each pending meetingId", async () => {
    backendKV._data.set(PENDING_KV_KEY, JSON.stringify(pendingItems("m1", "m2")));

    await getPending();

    expect(syncFn).toHaveBeenCalledTimes(2);
    expect(syncFn.mock.calls[0][0]).toBe("m1");
    expect(syncFn.mock.calls[1][0]).toBe("m2");
  });

  it("removes processed items from pending queue", async () => {
    backendKV._data.set(PENDING_KV_KEY, JSON.stringify(pendingItems("m1", "m2")));

    await getPending();

    const remaining = JSON.parse(backendKV._data.get(PENDING_KV_KEY)!);
    expect(remaining).toHaveLength(0);
  });

  // ── Dedup (skipped) ──────────────────────────────────────────────

  it("reports skipped items from dedup", async () => {
    syncFn = mock(async (meetingId: string) => ({
      status: "skipped" as const,
      meetingId,
    }));

    await closeServer(server);
    const app = createApp();
    ({ server, port } = await startServer(app));

    backendKV._data.set(PENDING_KV_KEY, JSON.stringify(pendingItems("m1")));

    const res = await getPending();
    const body = await res.json();
    expect(body.skipped).toHaveLength(1);
    expect(body.skipped[0].meetingId).toBe("m1");
    expect(body.processed).toHaveLength(0);
  });

  it("removes skipped items from pending queue", async () => {
    syncFn = mock(async (meetingId: string) => ({
      status: "skipped" as const,
      meetingId,
    }));

    await closeServer(server);
    const app = createApp();
    ({ server, port } = await startServer(app));

    backendKV._data.set(PENDING_KV_KEY, JSON.stringify(pendingItems("m1")));

    await getPending();

    const remaining = JSON.parse(backendKV._data.get(PENDING_KV_KEY)!);
    expect(remaining).toHaveLength(0);
  });

  // ── Errors ───────────────────────────────────────────────────────

  it("keeps failed items in pending queue", async () => {
    syncFn = mock(async (meetingId: string) => {
      if (meetingId === "m2") {
        return { status: "error" as const, meetingId, error: "API timeout" };
      }
      return {
        status: "created" as const,
        meetingId,
        conversationId: `conv-${meetingId}`,
      };
    });

    await closeServer(server);
    const app = createApp();
    ({ server, port } = await startServer(app));

    backendKV._data.set(PENDING_KV_KEY, JSON.stringify(pendingItems("m1", "m2", "m3")));

    const res = await getPending();
    const body = await res.json();

    expect(body.processed).toHaveLength(2);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].meetingId).toBe("m2");
    expect(body.errors[0].error).toBe("API timeout");

    // Only m2 remains in queue
    const remaining = JSON.parse(backendKV._data.get(PENDING_KV_KEY)!);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].meetingId).toBe("m2");
  });

  // ── Missing API key ──────────────────────────────────────────────

  it("returns 400 when Fireflies API key not configured", async () => {
    mockAccess._kvData.delete(FIREFLIES_KEY_PATH);

    backendKV._data.set(PENDING_KV_KEY, JSON.stringify(pendingItems("m1")));

    const res = await getPending();
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("no_api_key");
  });
});

describe("DELETE /api/webhooks/fireflies/pending", () => {
  let server: Server;
  let port: number;
  let backendKV: ReturnType<typeof createMockBackendKV>;
  let mockAccess: ReturnType<typeof createMockAccess>;

  function createApp(overrides?: { authMiddleware?: any; delegationMiddleware?: any }) {
    const delegationMiddleware =
      overrides?.delegationMiddleware ??
      ((req: Request, _res: Response, next: NextFunction) => {
        req.delegatedAccess = mockAccess as any;
        next();
      });

    const app = express();
    app.use(
      "/api/webhooks",
      createWebhookRouter({
        backendKV,
        tryGetDelegatedAccess: async () => null,
        authMiddleware: overrides?.authMiddleware ?? mockAuthMiddleware,
        delegationMiddleware,
      }),
    );
    return app;
  }

  beforeEach(async () => {
    backendKV = createMockBackendKV();
    mockAccess = createMockAccess("test-key");

    const app = createApp();
    ({ server, port } = await startServer(app));
  });

  afterEach(async () => {
    await closeServer(server);
  });

  function deletePending() {
    return fetch(`http://localhost:${port}/api/webhooks/fireflies/pending`, {
      method: "DELETE",
    });
  }

  // ── Auth ─────────────────────────────────────────────────────────

  it("returns 401 when auth rejects", async () => {
    await closeServer(server);
    const noAuth = (_req: Request, res: Response) => {
      res.status(401).json({ error: "missing_token" });
    };
    const app = createApp({ authMiddleware: noAuth });
    ({ server, port } = await startServer(app));

    const res = await deletePending();
    expect(res.status).toBe(401);
  });

  it("returns 403 when delegation missing", async () => {
    await closeServer(server);
    const noDelegation = (_req: Request, res: Response) => {
      res.status(403).json({ error: "no_delegation" });
    };
    const app = createApp({ delegationMiddleware: noDelegation });
    ({ server, port } = await startServer(app));

    const res = await deletePending();
    expect(res.status).toBe(403);
  });

  // ── Clear ────────────────────────────────────────────────────────

  it("returns cleared: 0 when no pending items", async () => {
    const res = await deletePending();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ cleared: 0 });
  });

  it("clears all pending items and returns count", async () => {
    backendKV._data.set(PENDING_KV_KEY, JSON.stringify(pendingItems("m1", "m2", "m3")));

    const res = await deletePending();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ cleared: 3 });
  });

  it("empties the pending queue in KV", async () => {
    backendKV._data.set(PENDING_KV_KEY, JSON.stringify(pendingItems("m1", "m2")));

    await deletePending();

    const remaining = JSON.parse(backendKV._data.get(PENDING_KV_KEY)!);
    expect(remaining).toHaveLength(0);
  });

  it("handles malformed JSON in pending queue", async () => {
    backendKV._data.set(PENDING_KV_KEY, "not-valid-json");

    const res = await deletePending();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ cleared: 0 });
  });
});
