import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import express from "express";
import type { Server } from "http";
import type { Request, Response, NextFunction } from "express";
import { createGoogleAuthRouter } from "../routes/google-auth.js";
import type { GoogleTokenResponse } from "../services/google-auth.js";
import type { SubscriptionMetadata } from "../services/pubsub-manager.js";

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

// ── Test Helpers ─────────────────────────────────────────────────────

const TEST_SUB = "test-user-sub";
const TOKENS_KV_PATH = "/app.conversations/config/google-tokens";
const SUBSCRIPTION_KV_PATH = "/app.webhooks/config/google-meet-subscription";
const USER_SUB_KV_PATH = "/app.webhooks/config/google-meet-user-sub";

const TEST_GOOGLE_USER_ID = "google-user-12345";

function mockAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.user = { sub: TEST_SUB };
  next();
}

const DEFAULT_TOKEN_RESPONSE: GoogleTokenResponse = {
  access_token: "ya29.test-access",
  refresh_token: "1//test-refresh",
  expires_in: 3599,
  scope: "https://www.googleapis.com/auth/meetings.space.readonly",
  token_type: "Bearer",
};

const DEFAULT_SUBSCRIPTION_METADATA: SubscriptionMetadata = {
  subscriptionName: "subscriptions/sub-123",
  googleUserId: TEST_GOOGLE_USER_ID,
  expiresAt: "2026-04-07T00:00:00Z",
  createdAt: "2026-03-31T00:00:00Z",
};

function createApp(
  userKV: ReturnType<typeof createMockKV>,
  opts?: {
    backendKV?: ReturnType<typeof createMockKV>;
    exchangeCode?: (code: string, redirectUri: string) => Promise<GoogleTokenResponse>;
    fetchGoogleUserInfo?: (accessToken: string) => Promise<{ sub: string }>;
    isWebhooksEnabled?: () => boolean;
    createMeetSubscription?: (
      projectId: string,
      googleUserId: string,
      accessToken: string,
    ) => Promise<SubscriptionMetadata>;
    pubSubProjectId?: string;
  },
) {
  const app = express();
  app.use(express.json());

  app.use(
    "/api/auth/google",
    createGoogleAuthRouter({
      authMiddleware: mockAuthMiddleware,
      delegationMiddleware: (req: Request, _res: Response, next: NextFunction) => {
        req.delegatedAccess = { kv: userKV } as any;
        next();
      },
      resolveDelegation: async (_sub: string) => ({ kv: userKV }) as any,
      exchangeCode: opts?.exchangeCode ?? (async () => DEFAULT_TOKEN_RESPONSE),
      fetchGoogleUserInfo:
        opts?.fetchGoogleUserInfo ?? (async () => ({ sub: TEST_GOOGLE_USER_ID })),
      backendKV: opts?.backendKV,
      isWebhooksEnabled: opts?.isWebhooksEnabled,
      createMeetSubscription: opts?.createMeetSubscription,
      pubSubProjectId: opts?.pubSubProjectId,
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

describe("Google Auth Callback — userinfo + subscription", () => {
  let userKV: ReturnType<typeof createMockKV>;
  let backendKV: ReturnType<typeof createMockKV>;
  let server: Server;
  let port: number;

  beforeEach(() => {
    userKV = createMockKV();
    backendKV = createMockKV();
    process.env.GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
    process.env.GOOGLE_CLIENT_SECRET = "test-secret";
  });

  afterEach(async () => {
    if (server) await closeServer(server);
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
  });

  async function initiateAndCallback(
    appPort: number,
    extraOpts?: { code?: string },
  ): Promise<globalThis.Response> {
    // Initiate to get state
    const initRes = await fetch(`http://localhost:${appPort}/api/auth/google`);
    const { authUrl } = await initRes.json();
    const state = new URL(authUrl).searchParams.get("state")!;

    // Hit callback
    return fetch(
      `http://localhost:${appPort}/api/auth/google/callback?code=${extraOpts?.code ?? "test-code"}&state=${state}`,
      { redirect: "manual" },
    );
  }

  // ── Always fetches userinfo and stores googleUserId ────────────────

  it("stores googleUserId alongside tokens in user KV", async () => {
    const app = createApp(userKV);
    ({ server, port } = await startServer(app));

    const res = await initiateAndCallback(port);
    expect(res.status).toBe(200);

    const stored = JSON.parse(userKV._data.get(TOKENS_KV_PATH)!);
    expect(stored.googleUserId).toBe(TEST_GOOGLE_USER_ID);
    expect(stored.access_token).toBe("ya29.test-access");
  });

  it("calls fetchGoogleUserInfo with the access token from exchange", async () => {
    let capturedToken: string | undefined;
    const app = createApp(userKV, {
      fetchGoogleUserInfo: async (accessToken) => {
        capturedToken = accessToken;
        return { sub: TEST_GOOGLE_USER_ID };
      },
    });
    ({ server, port } = await startServer(app));

    await initiateAndCallback(port);
    expect(capturedToken).toBe("ya29.test-access");
  });

  // ── With webhooks enabled ─────────────────────────────────────────

  it("creates subscription and stores metadata in backend KV when webhooks enabled", async () => {
    let createCalled = false;
    const app = createApp(userKV, {
      backendKV,
      isWebhooksEnabled: () => true,
      pubSubProjectId: "test-project",
      createMeetSubscription: async (_projectId, _userId, _token) => {
        createCalled = true;
        return DEFAULT_SUBSCRIPTION_METADATA;
      },
    });
    ({ server, port } = await startServer(app));

    const res = await initiateAndCallback(port);
    expect(res.status).toBe(200);
    expect(createCalled).toBe(true);

    // Subscription metadata stored in backend KV
    const subMeta = JSON.parse(backendKV._data.get(SUBSCRIPTION_KV_PATH)!);
    expect(subMeta.subscriptionName).toBe("subscriptions/sub-123");
    expect(subMeta.googleUserId).toBe(TEST_GOOGLE_USER_ID);
  });

  it("stores user sub in backend KV for push handler delegation lookup", async () => {
    const app = createApp(userKV, {
      backendKV,
      isWebhooksEnabled: () => true,
      pubSubProjectId: "test-project",
      createMeetSubscription: async () => DEFAULT_SUBSCRIPTION_METADATA,
    });
    ({ server, port } = await startServer(app));

    await initiateAndCallback(port);

    const storedSub = backendKV._data.get(USER_SUB_KV_PATH);
    expect(storedSub).toBe(TEST_SUB);
  });

  it("passes correct args to createMeetSubscription", async () => {
    let capturedArgs: { projectId: string; userId: string; token: string } | undefined;
    const app = createApp(userKV, {
      backendKV,
      isWebhooksEnabled: () => true,
      pubSubProjectId: "my-gcp-project",
      createMeetSubscription: async (projectId, userId, token) => {
        capturedArgs = { projectId, userId, token };
        return DEFAULT_SUBSCRIPTION_METADATA;
      },
    });
    ({ server, port } = await startServer(app));

    await initiateAndCallback(port);

    expect(capturedArgs!.projectId).toBe("my-gcp-project");
    expect(capturedArgs!.userId).toBe(TEST_GOOGLE_USER_ID);
    expect(capturedArgs!.token).toBe("ya29.test-access");
  });

  // ── Without webhooks ──────────────────────────────────────────────

  it("skips subscription creation when webhooks not enabled", async () => {
    let createCalled = false;
    const app = createApp(userKV, {
      isWebhooksEnabled: () => false,
      createMeetSubscription: async () => {
        createCalled = true;
        return DEFAULT_SUBSCRIPTION_METADATA;
      },
    });
    ({ server, port } = await startServer(app));

    const res = await initiateAndCallback(port);
    expect(res.status).toBe(200);
    expect(createCalled).toBe(false);

    // Tokens still stored with googleUserId
    const stored = JSON.parse(userKV._data.get(TOKENS_KV_PATH)!);
    expect(stored.googleUserId).toBe(TEST_GOOGLE_USER_ID);
  });

  it("skips subscription when isWebhooksEnabled not provided (default)", async () => {
    const app = createApp(userKV);
    ({ server, port } = await startServer(app));

    const res = await initiateAndCallback(port);
    expect(res.status).toBe(200);

    // No subscription metadata in backend KV
    expect(backendKV._data.has(SUBSCRIPTION_KV_PATH)).toBe(false);
  });

  // ── Userinfo failure ──────────────────────────────────────────────

  it("still stores tokens when userinfo fails, without googleUserId", async () => {
    const app = createApp(userKV, {
      fetchGoogleUserInfo: async () => {
        throw new Error("userinfo endpoint unavailable");
      },
    });
    ({ server, port } = await startServer(app));

    const res = await initiateAndCallback(port);
    expect(res.status).toBe(200);

    const stored = JSON.parse(userKV._data.get(TOKENS_KV_PATH)!);
    expect(stored.access_token).toBe("ya29.test-access");
    expect(stored.googleUserId).toBeUndefined();
  });

  it("skips subscription creation when userinfo fails", async () => {
    let createCalled = false;
    const app = createApp(userKV, {
      backendKV,
      isWebhooksEnabled: () => true,
      pubSubProjectId: "test-project",
      fetchGoogleUserInfo: async () => {
        throw new Error("userinfo failed");
      },
      createMeetSubscription: async () => {
        createCalled = true;
        return DEFAULT_SUBSCRIPTION_METADATA;
      },
    });
    ({ server, port } = await startServer(app));

    await initiateAndCallback(port);
    expect(createCalled).toBe(false);
  });

  // ── Subscription creation failure ─────────────────────────────────

  it("still succeeds when subscription creation fails (graceful degradation)", async () => {
    const app = createApp(userKV, {
      backendKV,
      isWebhooksEnabled: () => true,
      pubSubProjectId: "test-project",
      createMeetSubscription: async () => {
        throw new Error("Workspace Events API error");
      },
    });
    ({ server, port } = await startServer(app));

    const res = await initiateAndCallback(port);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("google-auth-success");

    // Tokens still stored
    const stored = JSON.parse(userKV._data.get(TOKENS_KV_PATH)!);
    expect(stored.access_token).toBe("ya29.test-access");
    expect(stored.googleUserId).toBe(TEST_GOOGLE_USER_ID);
  });
});
