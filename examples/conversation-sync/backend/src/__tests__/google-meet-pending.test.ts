import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import express from "express";
import type { Server } from "http";
import type { Request, Response, NextFunction } from "express";
import { createGoogleMeetPushRouter } from "../routes/google-meet-webhooks.js";

// ── Constants ───────────────────────────────────────────────────────

const PENDING_KV_KEY = "/app.webhooks/pending/google-meet";
const FAILED_KV_KEY = "/app.webhooks/failed/google-meet";
const GOOGLE_TOKENS_PATH = "/app.conversations/config/google-tokens";
const EXPECTED_AUDIENCE = "https://example.com/api/webhooks/google-meet";
const EXPECTED_EMAIL = "sa@project.iam.gserviceaccount.com";

const MOCK_TOKENS = {
  access_token: "ya29.test",
  refresh_token: "1//test-refresh",
};

// ── Helpers ─────────────────────────────────────────────────────────

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
  };
}

function createMockAccess(opts?: { existingSourceIds?: string[] }) {
  const kvStore = createMockKV();
  return {
    _kvStore: kvStore,
    sql: {
      query: async (_sql: string, params?: any[]) => {
        const sourceId = params?.[0];
        if (opts?.existingSourceIds?.includes(sourceId)) {
          return { ok: true, data: { rows: [{ source_id: sourceId }] } };
        }
        return { ok: true, data: { rows: [] } };
      },
      execute: async () => ({ ok: true }),
    },
    kv: kvStore,
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

function pendingItems(...names: string[]) {
  return names.map((name) => ({
    conferenceRecordName: name,
    receivedAt: "2026-01-01T00:00:00Z",
  }));
}

// ── Tests ────────────────────────────────────────────────────────────

describe("GET /api/webhooks/google-meet/pending", () => {
  let server: Server;
  let port: number;
  let backendKV: ReturnType<typeof createMockKV>;
  let mockAccess: ReturnType<typeof createMockAccess>;
  let syncFn: ReturnType<typeof mock>;

  function createApp(overrides?: { authMiddleware?: any; delegationMiddleware?: any }) {
    const delegationMiddleware =
      overrides?.delegationMiddleware ??
      ((req: Request, _res: Response, next: NextFunction) => {
        req.delegatedAccess = mockAccess as any;
        next();
      });

    // Pre-store Google tokens in user KV
    mockAccess.kv.put(GOOGLE_TOKENS_PATH, JSON.stringify(MOCK_TOKENS));

    const app = express();
    app.use(express.json());
    app.use(
      "/api/webhooks/google-meet",
      createGoogleMeetPushRouter({
        backendKV,
        tryGetDelegatedAccess: async () => null,
        expectedAudience: EXPECTED_AUDIENCE,
        expectedEmail: EXPECTED_EMAIL,
        verifyToken: () => true,
        authMiddleware: overrides?.authMiddleware ?? mockAuthMiddleware,
        delegationMiddleware,
        syncConference: syncFn as any,
      }),
    );
    return app;
  }

  beforeEach(async () => {
    backendKV = createMockKV();
    mockAccess = createMockAccess();

    syncFn = mock(async (conferenceRecordName: string) => ({
      status: "created" as const,
      conferenceRecordName,
      conversationId: `conv-${conferenceRecordName}`,
      title: `Meeting ${conferenceRecordName}`,
    }));

    const app = createApp();
    ({ server, port } = await startServer(app));
  });

  afterEach(async () => {
    if (server) await closeServer(server);
  });

  function getPending() {
    return fetch(`http://localhost:${port}/api/webhooks/google-meet/pending`);
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
    backendKV._data.set(
      PENDING_KV_KEY,
      JSON.stringify(pendingItems("conferenceRecords/abc", "conferenceRecords/def")),
    );

    const res = await getPending();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processed).toHaveLength(2);
    expect(body.processed[0].conferenceRecordName).toBe("conferenceRecords/abc");
    expect(body.processed[1].conferenceRecordName).toBe("conferenceRecords/def");
  });

  it("calls syncConference for each pending item", async () => {
    backendKV._data.set(
      PENDING_KV_KEY,
      JSON.stringify(pendingItems("conferenceRecords/abc", "conferenceRecords/def")),
    );

    await getPending();

    expect(syncFn).toHaveBeenCalledTimes(2);
    expect(syncFn.mock.calls[0][0]).toBe("conferenceRecords/abc");
    expect(syncFn.mock.calls[1][0]).toBe("conferenceRecords/def");
  });

  it("removes processed items from pending queue", async () => {
    backendKV._data.set(PENDING_KV_KEY, JSON.stringify(pendingItems("conferenceRecords/abc")));

    await getPending();

    const remaining = JSON.parse(backendKV._data.get(PENDING_KV_KEY)!);
    expect(remaining).toHaveLength(0);
  });

  // ── Dedup (skipped) ──────────────────────────────────────────────

  it("reports skipped items", async () => {
    syncFn = mock(async (name: string) => ({
      status: "skipped" as const,
      conferenceRecordName: name,
    }));

    await closeServer(server);
    const app = createApp();
    ({ server, port } = await startServer(app));

    backendKV._data.set(PENDING_KV_KEY, JSON.stringify(pendingItems("conferenceRecords/abc")));

    const res = await getPending();
    const body = await res.json();
    expect(body.skipped).toHaveLength(1);
    expect(body.skipped[0].conferenceRecordName).toBe("conferenceRecords/abc");
    expect(body.processed).toHaveLength(0);
  });

  // ── Partial failure ──────────────────────────────────────────────

  it("keeps failed items in pending queue, removes successful ones", async () => {
    syncFn = mock(async (name: string) => {
      if (name === "conferenceRecords/fail") {
        return { status: "error" as const, conferenceRecordName: name, error: "API timeout" };
      }
      return {
        status: "created" as const,
        conferenceRecordName: name,
        conversationId: `conv-${name}`,
      };
    });

    await closeServer(server);
    const app = createApp();
    ({ server, port } = await startServer(app));

    backendKV._data.set(
      PENDING_KV_KEY,
      JSON.stringify(
        pendingItems("conferenceRecords/ok1", "conferenceRecords/fail", "conferenceRecords/ok2"),
      ),
    );

    const res = await getPending();
    const body = await res.json();

    expect(body.processed).toHaveLength(2);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].conferenceRecordName).toBe("conferenceRecords/fail");
    expect(body.errors[0].error).toBe("API timeout");

    // Only failed item remains in queue
    const remaining = JSON.parse(backendKV._data.get(PENDING_KV_KEY)!);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].conferenceRecordName).toBe("conferenceRecords/fail");
  });

  it("stores failed items in failed events queue", async () => {
    syncFn = mock(async (name: string) => ({
      status: "error" as const,
      conferenceRecordName: name,
      error: "Google API error",
    }));

    await closeServer(server);
    const app = createApp();
    ({ server, port } = await startServer(app));

    backendKV._data.set(PENDING_KV_KEY, JSON.stringify(pendingItems("conferenceRecords/fail1")));

    await getPending();

    const failed = JSON.parse(backendKV._data.get(FAILED_KV_KEY)!);
    expect(failed).toHaveLength(1);
    expect(failed[0].conferenceRecordName).toBe("conferenceRecords/fail1");
    expect(failed[0].error).toBe("Google API error");
    expect(failed[0].failedAt).toBeDefined();
  });

  // ── No Google tokens ─────────────────────────────────────────────

  it("returns 400 when Google tokens not configured", async () => {
    mockAccess._kvStore._data.delete(GOOGLE_TOKENS_PATH);

    await closeServer(server);
    // Create app WITHOUT pre-storing tokens
    const delegationMiddleware = (req: Request, _res: Response, next: NextFunction) => {
      req.delegatedAccess = mockAccess as any;
      next();
    };
    const app = express();
    app.use(express.json());
    app.use(
      "/api/webhooks/google-meet",
      createGoogleMeetPushRouter({
        backendKV,
        tryGetDelegatedAccess: async () => null,
        expectedAudience: EXPECTED_AUDIENCE,
        expectedEmail: EXPECTED_EMAIL,
        verifyToken: () => true,
        authMiddleware: mockAuthMiddleware,
        delegationMiddleware,
        syncConference: syncFn as any,
      }),
    );
    ({ server, port } = await startServer(app));

    backendKV._data.set(PENDING_KV_KEY, JSON.stringify(pendingItems("conferenceRecords/abc")));

    const res = await getPending();
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("no_google_tokens");
  });
});

describe("DELETE /api/webhooks/google-meet/pending", () => {
  let server: Server;
  let port: number;
  let backendKV: ReturnType<typeof createMockKV>;
  let mockAccess: ReturnType<typeof createMockAccess>;

  function createApp(overrides?: { authMiddleware?: any; delegationMiddleware?: any }) {
    const delegationMiddleware =
      overrides?.delegationMiddleware ??
      ((req: Request, _res: Response, next: NextFunction) => {
        req.delegatedAccess = mockAccess as any;
        next();
      });

    const app = express();
    app.use(express.json());
    app.use(
      "/api/webhooks/google-meet",
      createGoogleMeetPushRouter({
        backendKV,
        tryGetDelegatedAccess: async () => null,
        expectedAudience: EXPECTED_AUDIENCE,
        expectedEmail: EXPECTED_EMAIL,
        verifyToken: () => true,
        authMiddleware: overrides?.authMiddleware ?? mockAuthMiddleware,
        delegationMiddleware,
      }),
    );
    return app;
  }

  beforeEach(async () => {
    backendKV = createMockKV();
    mockAccess = createMockAccess();

    const app = createApp();
    ({ server, port } = await startServer(app));
  });

  afterEach(async () => {
    if (server) await closeServer(server);
  });

  function deletePending() {
    return fetch(`http://localhost:${port}/api/webhooks/google-meet/pending`, {
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
    backendKV._data.set(
      PENDING_KV_KEY,
      JSON.stringify(
        pendingItems("conferenceRecords/a", "conferenceRecords/b", "conferenceRecords/c"),
      ),
    );

    const res = await deletePending();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ cleared: 3 });
  });

  it("empties the pending queue in KV", async () => {
    backendKV._data.set(PENDING_KV_KEY, JSON.stringify(pendingItems("conferenceRecords/a")));

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
