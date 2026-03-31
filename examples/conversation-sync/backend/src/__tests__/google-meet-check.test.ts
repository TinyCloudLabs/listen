import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import express from "express";
import type { Server } from "http";
import type { Request, Response, NextFunction } from "express";
import { createGoogleMeetPushRouter } from "../routes/google-meet-webhooks.js";
import type { SubscriptionMetadata, RenewalResult } from "../services/pubsub-manager.js";

// ── Constants ───────────────────────────────────────────────────────

const SUBSCRIPTION_KV_KEY = "/app.webhooks/config/google-meet-subscription";
const PENDING_KV_KEY = "/app.webhooks/pending/google-meet";
const FAILED_KV_KEY = "/app.webhooks/failed/google-meet";
const GOOGLE_TOKENS_PATH = "/app.conversations/config/google-tokens";
const EXPECTED_AUDIENCE = "https://example.com/api/webhooks/google-meet";
const EXPECTED_EMAIL = "sa@project.iam.gserviceaccount.com";

const MOCK_TOKENS = {
  access_token: "ya29.test",
  refresh_token: "1//test-refresh",
};

const MOCK_METADATA: SubscriptionMetadata = {
  subscriptionName: "subscriptions/abc123",
  googleUserId: "google-user-1",
  expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
  createdAt: new Date().toISOString(),
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

function createMockAccess() {
  const kvStore = createMockKV();
  return {
    _kvStore: kvStore,
    sql: {
      query: async () => ({ ok: true, data: { rows: [] } }),
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

// ── Tests: GET /check ───────────────────────────────────────────────

describe("GET /api/webhooks/google-meet/check", () => {
  let server: Server;
  let port: number;
  let backendKV: ReturnType<typeof createMockKV>;
  let mockAccess: ReturnType<typeof createMockAccess>;
  let checkAndRenewFn: ReturnType<typeof mock>;

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
        checkAndRenew: checkAndRenewFn as any,
      }),
    );
    return app;
  }

  beforeEach(async () => {
    backendKV = createMockKV();
    mockAccess = createMockAccess();

    checkAndRenewFn = mock(async (): Promise<RenewalResult> => ({
      status: "active",
    }));

    const app = createApp();
    ({ server, port } = await startServer(app));
  });

  afterEach(async () => {
    if (server) await closeServer(server);
  });

  function getCheck() {
    return fetch(`http://localhost:${port}/api/webhooks/google-meet/check`);
  }

  // ── Auth ─────────────────────────────────────────────────────────

  it("returns 401 when auth rejects", async () => {
    await closeServer(server);
    const noAuth = (_req: Request, res: Response) => {
      res.status(401).json({ error: "missing_token" });
    };
    const app = createApp({ authMiddleware: noAuth });
    ({ server, port } = await startServer(app));

    const res = await getCheck();
    expect(res.status).toBe(401);
  });

  it("returns 403 when delegation missing", async () => {
    await closeServer(server);
    const noDelegation = (_req: Request, res: Response) => {
      res.status(403).json({ error: "no_delegation" });
    };
    const app = createApp({ delegationMiddleware: noDelegation });
    ({ server, port } = await startServer(app));

    const res = await getCheck();
    expect(res.status).toBe(403);
  });

  // ── Not configured ────────────────────────────────────────────────

  it("returns not_configured when no subscription metadata", async () => {
    const res = await getCheck();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "not_configured" });
  });

  // ── Active ────────────────────────────────────────────────────────

  it("returns active with expiresAt when >24h remaining", async () => {
    backendKV._data.set(SUBSCRIPTION_KV_KEY, JSON.stringify(MOCK_METADATA));

    checkAndRenewFn = mock(async (): Promise<RenewalResult> => ({ status: "active" }));
    await closeServer(server);
    const app = createApp();
    ({ server, port } = await startServer(app));

    const res = await getCheck();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("active");
    expect(body.expiresAt).toBe(MOCK_METADATA.expiresAt);
  });

  it("calls checkAndRenew with metadata and access token", async () => {
    backendKV._data.set(SUBSCRIPTION_KV_KEY, JSON.stringify(MOCK_METADATA));

    const res = await getCheck();
    expect(res.status).toBe(200);

    expect(checkAndRenewFn).toHaveBeenCalledTimes(1);
    const [metadata, token] = checkAndRenewFn.mock.calls[0];
    expect(metadata.subscriptionName).toBe(MOCK_METADATA.subscriptionName);
    expect(token).toBe(MOCK_TOKENS.access_token);
  });

  // ── Renewed ───────────────────────────────────────────────────────

  it("returns renewed with new expiresAt and updates metadata in KV", async () => {
    backendKV._data.set(SUBSCRIPTION_KV_KEY, JSON.stringify(MOCK_METADATA));

    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const renewedMetadata: SubscriptionMetadata = {
      ...MOCK_METADATA,
      expiresAt: newExpiry,
    };

    checkAndRenewFn = mock(async (): Promise<RenewalResult> => ({
      status: "renewed",
      metadata: renewedMetadata,
    }));
    await closeServer(server);
    const app = createApp();
    ({ server, port } = await startServer(app));

    const res = await getCheck();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("renewed");
    expect(body.expiresAt).toBe(newExpiry);

    // Verify metadata was updated in backend KV
    const stored = JSON.parse(backendKV._data.get(SUBSCRIPTION_KV_KEY)!);
    expect(stored.expiresAt).toBe(newExpiry);
  });

  // ── Lapsed ────────────────────────────────────────────────────────

  it("returns lapsed with message when subscription expired", async () => {
    backendKV._data.set(SUBSCRIPTION_KV_KEY, JSON.stringify(MOCK_METADATA));

    checkAndRenewFn = mock(async (): Promise<RenewalResult> => ({ status: "lapsed" }));
    await closeServer(server);
    const app = createApp();
    ({ server, port } = await startServer(app));

    const res = await getCheck();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("lapsed");
    expect(body.message).toBeDefined();
  });

  // ── No Google tokens ─────────────────────────────────────────────

  it("returns 400 when subscription exists but no Google tokens", async () => {
    backendKV._data.set(SUBSCRIPTION_KV_KEY, JSON.stringify(MOCK_METADATA));
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
        checkAndRenew: checkAndRenewFn as any,
      }),
    );
    ({ server, port } = await startServer(app));

    const res = await getCheck();
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("no_google_tokens");
  });
});

// ── Tests: GET /status ──────────────────────────────────────────────

describe("GET /api/webhooks/google-meet/status", () => {
  let server: Server;
  let port: number;
  let backendKV: ReturnType<typeof createMockKV>;
  let mockAccess: ReturnType<typeof createMockAccess>;

  function createApp(overrides?: { authMiddleware?: any }) {
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
        delegationMiddleware: (req: Request, _res: Response, next: NextFunction) => {
          req.delegatedAccess = mockAccess as any;
          next();
        },
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

  function getStatus() {
    return fetch(`http://localhost:${port}/api/webhooks/google-meet/status`);
  }

  it("returns 401 when auth rejects", async () => {
    await closeServer(server);
    const noAuth = (_req: Request, res: Response) => {
      res.status(401).json({ error: "missing_token" });
    };
    const app = createApp({ authMiddleware: noAuth });
    ({ server, port } = await startServer(app));

    const res = await getStatus();
    expect(res.status).toBe(401);
  });

  it("returns not enabled when no subscription metadata", async () => {
    const res = await getStatus();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(true);
    expect(body.subscriptionActive).toBe(false);
    expect(body.expiresAt).toBeNull();
    expect(body.pendingCount).toBe(0);
    expect(body.failedCount).toBe(0);
  });

  it("returns active subscription with counts", async () => {
    backendKV._data.set(SUBSCRIPTION_KV_KEY, JSON.stringify(MOCK_METADATA));
    backendKV._data.set(
      PENDING_KV_KEY,
      JSON.stringify([{ conferenceRecordName: "a", receivedAt: "2026-01-01" }]),
    );
    backendKV._data.set(
      FAILED_KV_KEY,
      JSON.stringify([
        { conferenceRecordName: "b", error: "fail", failedAt: "2026-01-01" },
        { conferenceRecordName: "c", error: "fail", failedAt: "2026-01-01" },
      ]),
    );

    const res = await getStatus();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(true);
    expect(body.subscriptionActive).toBe(true);
    expect(body.expiresAt).toBe(MOCK_METADATA.expiresAt);
    expect(body.pendingCount).toBe(1);
    expect(body.failedCount).toBe(2);
  });

  it("returns subscriptionActive=false when subscription expired", async () => {
    const expired: SubscriptionMetadata = {
      ...MOCK_METADATA,
      expiresAt: new Date(Date.now() - 1000).toISOString(), // already expired
    };
    backendKV._data.set(SUBSCRIPTION_KV_KEY, JSON.stringify(expired));

    const res = await getStatus();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.subscriptionActive).toBe(false);
    expect(body.expiresAt).toBe(expired.expiresAt);
  });
});
