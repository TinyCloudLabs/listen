import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import express from "express";
import type { Server } from "http";
import type { Request, Response, NextFunction } from "express";
import { createGoogleAuthRouter } from "../routes/google-auth.js";
import type { GoogleTokenResponse } from "../services/google-auth.js";

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
const TOKENS_KV_PATH = "config/google-tokens";
const TEST_CLIENT_ID = "test-client-id.apps.googleusercontent.com";

function mockAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.user = { sub: TEST_SUB };
  next();
}

function createMockDelegationMiddleware(mockKV: ReturnType<typeof createMockKV>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.delegatedAccess = { kv: mockKV } as any;
    next();
  };
}

const DEFAULT_TOKEN_RESPONSE: GoogleTokenResponse = {
  access_token: "ya29.test",
  refresh_token: "1//test-refresh",
  expires_in: 3599,
  scope: "https://www.googleapis.com/auth/meetings.space.readonly",
  token_type: "Bearer",
};

function createApp(
  mockKV: ReturnType<typeof createMockKV>,
  opts?: {
    exchangeCode?: (code: string, redirectUri: string) => Promise<GoogleTokenResponse>;
  },
) {
  const app = express();
  app.use(express.json());

  // OAuth initiate + callback
  app.use(
    "/api/auth/google",
    createGoogleAuthRouter({
      authMiddleware: mockAuthMiddleware,
      delegationMiddleware: createMockDelegationMiddleware(mockKV),
      resolveDelegation: async (_sub: string) => ({ kv: mockKV }) as any,
      exchangeCode: opts?.exchangeCode ?? (async () => DEFAULT_TOKEN_RESPONSE),
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

describe("Google Auth Routes", () => {
  let mockKV: ReturnType<typeof createMockKV>;
  let server: Server;
  let port: number;

  beforeEach(async () => {
    mockKV = createMockKV();
    process.env.GOOGLE_CLIENT_ID = TEST_CLIENT_ID;
    process.env.GOOGLE_CLIENT_SECRET = "test-secret";

    const app = createApp(mockKV);
    ({ server, port } = await startServer(app));
  });

  afterEach(async () => {
    await closeServer(server);
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REDIRECT_URI;
  });

  // ── GET /api/auth/google (initiate) ─────────────────────────────

  describe("GET /api/auth/google", () => {
    it("returns an authUrl pointing to Google consent screen", async () => {
      const res = await fetch(`http://localhost:${port}/api/auth/google`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.authUrl).toStartWith("https://accounts.google.com/o/oauth2/v2/auth");
    });

    it("includes a state parameter in the authUrl", async () => {
      const res = await fetch(`http://localhost:${port}/api/auth/google`);
      const body = await res.json();
      const url = new URL(body.authUrl);
      expect(url.searchParams.get("state")).toBeTruthy();
    });

    it("derives redirect_uri from the request host", async () => {
      const res = await fetch(`http://localhost:${port}/api/auth/google`);
      const body = await res.json();
      const url = new URL(body.authUrl);
      const redirectUri = url.searchParams.get("redirect_uri");
      expect(redirectUri).toContain("/api/auth/google/callback");
    });

    it("uses GOOGLE_REDIRECT_URI when configured", async () => {
      process.env.GOOGLE_REDIRECT_URI = "https://api.listen.tinycloud.xyz/api/auth/google/callback";

      const res = await fetch(`http://localhost:${port}/api/auth/google`);
      const body = await res.json();
      const url = new URL(body.authUrl);

      expect(url.searchParams.get("redirect_uri")).toBe(
        "https://api.listen.tinycloud.xyz/api/auth/google/callback",
      );
    });

    it("uses forwarded proto and host when no redirect URI override is configured", async () => {
      const res = await fetch(`http://localhost:${port}/api/auth/google`, {
        headers: {
          "x-forwarded-proto": "https",
          "x-forwarded-host": "api.listen.tinycloud.xyz",
        },
      });
      const body = await res.json();
      const url = new URL(body.authUrl);

      expect(url.searchParams.get("redirect_uri")).toBe(
        "https://api.listen.tinycloud.xyz/api/auth/google/callback",
      );
    });
  });

  // ── GET /api/auth/google/callback ───────────────────────────────

  describe("GET /api/auth/google/callback", () => {
    async function initiateAuth(): Promise<string> {
      const res = await fetch(`http://localhost:${port}/api/auth/google`);
      const body = await res.json();
      const url = new URL(body.authUrl);
      return url.searchParams.get("state")!;
    }

    it("exchanges code and returns HTML that closes popup", async () => {
      const state = await initiateAuth();

      const res = await fetch(
        `http://localhost:${port}/api/auth/google/callback?code=test-code&state=${state}`,
        { redirect: "manual" },
      );

      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain("window.opener.postMessage");
      expect(html).toContain("google-auth-success");
      expect(html).toContain("window.close()");
    });

    it("stores tokens in user KV at correct path", async () => {
      // Use a custom app with specific token response to verify storage
      await closeServer(server);
      const customTokens: GoogleTokenResponse = {
        access_token: "ya29.stored",
        refresh_token: "1//stored-refresh",
        expires_in: 3599,
        scope: "https://www.googleapis.com/auth/meetings.space.readonly",
        token_type: "Bearer",
      };
      const app = createApp(mockKV, { exchangeCode: async () => customTokens });
      ({ server, port } = await startServer(app));

      const state = await initiateAuth();
      await fetch(
        `http://localhost:${port}/api/auth/google/callback?code=test-code&state=${state}`,
        { redirect: "manual" },
      );

      const stored = mockKV._data.get(TOKENS_KV_PATH);
      expect(stored).toBeDefined();

      const tokens = JSON.parse(stored!);
      expect(tokens.access_token).toBe("ya29.stored");
      expect(tokens.refresh_token).toBe("1//stored-refresh");
    });

    it("returns 400 when state is missing", async () => {
      const res = await fetch(`http://localhost:${port}/api/auth/google/callback?code=test-code`, {
        redirect: "manual",
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when code is missing", async () => {
      const res = await fetch(
        `http://localhost:${port}/api/auth/google/callback?state=some-state`,
        { redirect: "manual" },
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 when state is invalid/expired", async () => {
      const res = await fetch(
        `http://localhost:${port}/api/auth/google/callback?code=test-code&state=invalid-state`,
        { redirect: "manual" },
      );
      expect(res.status).toBe(400);
    });

    it("state can only be used once", async () => {
      const state = await initiateAuth();

      // First use succeeds
      const res1 = await fetch(
        `http://localhost:${port}/api/auth/google/callback?code=code1&state=${state}`,
        { redirect: "manual" },
      );
      expect(res1.status).toBe(200);

      // Second use with same state fails
      const res2 = await fetch(
        `http://localhost:${port}/api/auth/google/callback?code=code2&state=${state}`,
        { redirect: "manual" },
      );
      expect(res2.status).toBe(400);
    });

    it("returns error HTML when token exchange fails", async () => {
      await closeServer(server);
      const app = createApp(mockKV, {
        exchangeCode: async () => {
          throw new Error("Token exchange failed");
        },
      });
      ({ server, port } = await startServer(app));

      const state = await initiateAuth();
      const res = await fetch(
        `http://localhost:${port}/api/auth/google/callback?code=bad-code&state=${state}`,
        { redirect: "manual" },
      );

      expect(res.status).toBe(200); // Still 200, shows error in HTML popup
      const html = await res.text();
      expect(html).toContain("google-auth-error");
    });
  });

  // ── 501 when GOOGLE_CLIENT_ID not set ──────────────────────────

  describe("501 when unconfigured", () => {
    it("returns 501 for auth initiation when GOOGLE_CLIENT_ID not set", async () => {
      delete process.env.GOOGLE_CLIENT_ID;

      const res = await fetch(`http://localhost:${port}/api/auth/google`);

      expect(res.status).toBe(501);
      const body = await res.json();
      expect(body.error).toBe("not_configured");
    });

    it("returns 501 for callback when GOOGLE_CLIENT_ID not set", async () => {
      delete process.env.GOOGLE_CLIENT_ID;

      const res = await fetch(`http://localhost:${port}/api/auth/google/callback?code=x&state=y`, {
        redirect: "manual",
      });

      expect(res.status).toBe(501);
    });
  });
});
