import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import express from "express";
import type { Server } from "http";
import type { Request, Response, NextFunction } from "express";
import { createConfigRouter } from "../routes/config.js";

// ── Constants ───────────────────────────────────────────────────────

const GOOGLE_TOKENS_PATH = "config/google-tokens";
const SUBSCRIPTION_KV_KEY = "xyz.tinycloud.listen/webhooks/config/google-meet-subscription";
const PENDING_KV_KEY = "xyz.tinycloud.listen/webhooks/pending/google-meet";
const FAILED_KV_KEY = "xyz.tinycloud.listen/webhooks/failed/google-meet";
const USER_SUB_KV_PATH = "xyz.tinycloud.listen/webhooks/config/google-meet-user-sub";

const MOCK_TOKENS = {
  access_token: "ya29.test",
  refresh_token: "1//test-refresh",
};

const MOCK_METADATA = {
  subscriptionName: "subscriptions/abc123",
  googleUserId: "google-user-1",
  expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
};

// ── Helpers ─────────────────────────────────────────────────────────

function createMockKV() {
  const data = new Map<string, string>();
  return {
    _data: data,
    get: async (key: string) => {
      const val = data.get(key);
      if (val === undefined) return { ok: false, error: { code: "KV_NOT_FOUND" } };
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

// ── Tests ────────────────────────────────────────────────────────────

describe("DELETE /api/config/google-meet (disconnect cleanup)", () => {
  let server: Server;
  let port: number;
  let backendKV: ReturnType<typeof createMockKV>;
  let userKV: ReturnType<typeof createMockKV>;
  let deleteSubscriptionFn: ReturnType<typeof mock>;

  function createApp() {
    const delegationMiddleware = (req: Request, _res: Response, next: NextFunction) => {
      req.delegatedAccess = { kv: userKV } as any;
      next();
    };

    const app = express();
    app.use(express.json());
    app.use(
      "/api/config",
      createConfigRouter({
        authMiddleware: mockAuthMiddleware,
        delegationMiddleware,
        backendKV,
        deleteSubscription: deleteSubscriptionFn as any,
      }),
    );
    return app;
  }

  beforeEach(async () => {
    backendKV = createMockKV();
    userKV = createMockKV();
    deleteSubscriptionFn = mock(async () => {});

    // Pre-store tokens and subscription metadata
    userKV._data.set(GOOGLE_TOKENS_PATH, JSON.stringify(MOCK_TOKENS));
    backendKV._data.set(SUBSCRIPTION_KV_KEY, JSON.stringify(MOCK_METADATA));
    backendKV._data.set(USER_SUB_KV_PATH, "test-sub");
    backendKV._data.set(PENDING_KV_KEY, JSON.stringify([{ conferenceRecordName: "a" }]));
    backendKV._data.set(FAILED_KV_KEY, JSON.stringify([{ conferenceRecordName: "b" }]));

    const app = createApp();
    ({ server, port } = await startServer(app));
  });

  afterEach(async () => {
    if (server) await closeServer(server);
  });

  function deleteGoogleMeet() {
    return fetch(`http://localhost:${port}/api/config/google-meet`, { method: "DELETE" });
  }

  it("returns ok: true", async () => {
    const res = await deleteGoogleMeet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("calls deleteMeetSubscription with metadata and access token", async () => {
    await deleteGoogleMeet();

    expect(deleteSubscriptionFn).toHaveBeenCalledTimes(1);
    const [metadata, token] = deleteSubscriptionFn.mock.calls[0];
    expect(metadata.subscriptionName).toBe(MOCK_METADATA.subscriptionName);
    expect(token).toBe(MOCK_TOKENS.access_token);
  });

  it("deletes Google tokens from user KV", async () => {
    await deleteGoogleMeet();
    expect(userKV._data.has(GOOGLE_TOKENS_PATH)).toBe(false);
  });

  it("clears subscription metadata from backend KV", async () => {
    await deleteGoogleMeet();
    const result = await backendKV.get(SUBSCRIPTION_KV_KEY);
    // Should be cleared (empty string or null)
    expect(!result.data.data).toBe(true);
  });

  it("clears pending queue from backend KV", async () => {
    await deleteGoogleMeet();
    const result = await backendKV.get(PENDING_KV_KEY);
    const parsed = JSON.parse(result.data.data!);
    expect(parsed).toEqual([]);
  });

  it("clears failed events from backend KV", async () => {
    await deleteGoogleMeet();
    const result = await backendKV.get(FAILED_KV_KEY);
    const parsed = JSON.parse(result.data.data!);
    expect(parsed).toEqual([]);
  });

  it("clears user sub from backend KV", async () => {
    await deleteGoogleMeet();
    const result = await backendKV.get(USER_SUB_KV_PATH);
    expect(!result.data.data).toBe(true);
  });

  it("succeeds when no subscription metadata exists", async () => {
    backendKV._data.delete(SUBSCRIPTION_KV_KEY);

    const res = await deleteGoogleMeet();
    expect(res.status).toBe(200);
    expect(deleteSubscriptionFn).not.toHaveBeenCalled();
  });

  it("succeeds when no Google tokens exist", async () => {
    userKV._data.delete(GOOGLE_TOKENS_PATH);

    const res = await deleteGoogleMeet();
    expect(res.status).toBe(200);
    expect(deleteSubscriptionFn).not.toHaveBeenCalled();
  });

  it("succeeds even if deleteMeetSubscription throws", async () => {
    deleteSubscriptionFn = mock(async () => {
      throw new Error("API error");
    });

    await closeServer(server);
    const app = createApp();
    ({ server, port } = await startServer(app));

    const res = await deleteGoogleMeet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("still clears KV even if deleteMeetSubscription throws", async () => {
    deleteSubscriptionFn = mock(async () => {
      throw new Error("API error");
    });

    await closeServer(server);
    const app = createApp();
    ({ server, port } = await startServer(app));

    await deleteGoogleMeet();

    // Tokens should still be deleted
    expect(userKV._data.has(GOOGLE_TOKENS_PATH)).toBe(false);
    // Pending should be cleared
    const pending = JSON.parse((await backendKV.get(PENDING_KV_KEY)).data.data!);
    expect(pending).toEqual([]);
  });
});
