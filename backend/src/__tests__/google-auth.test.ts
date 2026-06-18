import { describe, it, expect, beforeEach, mock, afterEach } from "bun:test";

// ── Mock fetch ──────────────────────────────────────────────────────

const mockFetch = mock<typeof globalThis.fetch>(() => Promise.resolve(new Response("{}")));

const originalFetch = globalThis.fetch;

// ── Import after mock setup ─────────────────────────────────────────

import {
  buildAuthUrl,
  exchangeCode,
  refreshAccessToken,
  GoogleAuthRevokedError,
} from "../services/google-auth.js";

// ── Helpers ─────────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function lastFetchCall() {
  const calls = mockFetch.mock.calls;
  return calls[calls.length - 1];
}

// ── Tests ───────────────────────────────────────────────────────────

describe("Google Auth Service", () => {
  const TEST_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
  const TEST_CLIENT_SECRET = "test-client-secret";

  beforeEach(() => {
    mockFetch.mockReset();
    globalThis.fetch = mockFetch as any;
    process.env.GOOGLE_CLIENT_ID = TEST_CLIENT_ID;
    process.env.GOOGLE_CLIENT_SECRET = TEST_CLIENT_SECRET;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
  });

  // ── buildAuthUrl() ──────────────────────────────────────────────

  describe("buildAuthUrl()", () => {
    it("returns a Google OAuth consent URL", () => {
      const url = buildAuthUrl("http://localhost:3001/api/auth/google/callback", "abc123");
      expect(url).toStartWith("https://accounts.google.com/o/oauth2/v2/auth");
    });

    it("includes client_id from env", () => {
      const url = buildAuthUrl("http://localhost:3001/callback", "state1");
      const params = new URL(url).searchParams;
      expect(params.get("client_id")).toBe(TEST_CLIENT_ID);
    });

    it("includes redirect_uri parameter", () => {
      const redirectUri = "http://localhost:3001/api/auth/google/callback";
      const url = buildAuthUrl(redirectUri, "state1");
      const params = new URL(url).searchParams;
      expect(params.get("redirect_uri")).toBe(redirectUri);
    });

    it("includes state parameter", () => {
      const url = buildAuthUrl("http://localhost:3001/callback", "my-state-value");
      const params = new URL(url).searchParams;
      expect(params.get("state")).toBe("my-state-value");
    });

    it("requests meetings.space.readonly scope", () => {
      const url = buildAuthUrl("http://localhost:3001/callback", "s");
      const params = new URL(url).searchParams;
      expect(params.get("scope")).toContain(
        "https://www.googleapis.com/auth/meetings.space.readonly",
      );
    });

    it("requests drive.meet.readonly scope for transcript document fallback", () => {
      const url = buildAuthUrl("http://localhost:3001/callback", "s");
      const params = new URL(url).searchParams;
      expect(params.get("scope")).toContain("https://www.googleapis.com/auth/drive.meet.readonly");
    });

    it("sets access_type=offline for refresh token", () => {
      const url = buildAuthUrl("http://localhost:3001/callback", "s");
      const params = new URL(url).searchParams;
      expect(params.get("access_type")).toBe("offline");
    });

    it("sets prompt=consent to force re-auth", () => {
      const url = buildAuthUrl("http://localhost:3001/callback", "s");
      const params = new URL(url).searchParams;
      expect(params.get("prompt")).toBe("consent");
    });

    it("sets response_type=code", () => {
      const url = buildAuthUrl("http://localhost:3001/callback", "s");
      const params = new URL(url).searchParams;
      expect(params.get("response_type")).toBe("code");
    });
  });

  // ── exchangeCode() ─────────────────────────────────────────────

  describe("exchangeCode()", () => {
    const TOKEN_RESPONSE = {
      access_token: "ya29.access-token",
      refresh_token: "1//refresh-token",
      expires_in: 3599,
      scope: "https://www.googleapis.com/auth/meetings.space.readonly",
      token_type: "Bearer",
    };

    it("sends POST to Google token endpoint", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(TOKEN_RESPONSE));

      await exchangeCode("auth-code-123", "http://localhost:3001/callback");

      const [url, init] = lastFetchCall();
      expect(url).toBe("https://oauth2.googleapis.com/token");
      expect((init as RequestInit).method).toBe("POST");
    });

    it("sends form-encoded body with correct params", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(TOKEN_RESPONSE));

      await exchangeCode("auth-code-123", "http://localhost:3001/callback");

      const [, init] = lastFetchCall();
      const body = new URLSearchParams((init as RequestInit).body as string);
      expect(body.get("code")).toBe("auth-code-123");
      expect(body.get("client_id")).toBe(TEST_CLIENT_ID);
      expect(body.get("client_secret")).toBe(TEST_CLIENT_SECRET);
      expect(body.get("redirect_uri")).toBe("http://localhost:3001/callback");
      expect(body.get("grant_type")).toBe("authorization_code");
    });

    it("returns token data on success", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(TOKEN_RESPONSE));

      const result = await exchangeCode("auth-code-123", "http://localhost:3001/callback");

      expect(result.access_token).toBe("ya29.access-token");
      expect(result.refresh_token).toBe("1//refresh-token");
      expect(result.expires_in).toBe(3599);
    });

    it("throws on non-200 response", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ error: "invalid_grant", error_description: "Bad code" }, 400),
      );

      await expect(exchangeCode("bad-code", "http://localhost:3001/callback")).rejects.toThrow();
    });
  });

  // ── refreshAccessToken() ───────────────────────────────────────

  describe("refreshAccessToken()", () => {
    const REFRESH_RESPONSE = {
      access_token: "ya29.new-access-token",
      expires_in: 3599,
      scope: "https://www.googleapis.com/auth/meetings.space.readonly",
      token_type: "Bearer",
    };

    it("sends POST to Google token endpoint", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(REFRESH_RESPONSE));

      await refreshAccessToken("1//refresh-token");

      const [url, init] = lastFetchCall();
      expect(url).toBe("https://oauth2.googleapis.com/token");
      expect((init as RequestInit).method).toBe("POST");
    });

    it("sends form-encoded body with refresh_token grant", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(REFRESH_RESPONSE));

      await refreshAccessToken("1//refresh-token");

      const [, init] = lastFetchCall();
      const body = new URLSearchParams((init as RequestInit).body as string);
      expect(body.get("refresh_token")).toBe("1//refresh-token");
      expect(body.get("client_id")).toBe(TEST_CLIENT_ID);
      expect(body.get("client_secret")).toBe(TEST_CLIENT_SECRET);
      expect(body.get("grant_type")).toBe("refresh_token");
    });

    it("returns new access token on success", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(REFRESH_RESPONSE));

      const result = await refreshAccessToken("1//refresh-token");

      expect(result.access_token).toBe("ya29.new-access-token");
      expect(result.expires_in).toBe(3599);
    });

    it("throws GoogleAuthRevokedError on invalid_grant", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ error: "invalid_grant", error_description: "Token has been revoked." }, 400),
      );

      await expect(refreshAccessToken("revoked-token")).rejects.toBeInstanceOf(
        GoogleAuthRevokedError,
      );
    });

    it("throws generic error on other failures", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ error: "server_error", error_description: "Something broke" }, 500),
      );

      const err = await refreshAccessToken("some-token").catch((e) => e);
      expect(err).toBeInstanceOf(Error);
      expect(err).not.toBeInstanceOf(GoogleAuthRevokedError);
    });
  });

  // ── GoogleAuthRevokedError ─────────────────────────────────────

  describe("GoogleAuthRevokedError", () => {
    it("is an instance of Error", () => {
      const err = new GoogleAuthRevokedError("revoked");
      expect(err).toBeInstanceOf(Error);
    });

    it("has correct name", () => {
      const err = new GoogleAuthRevokedError("revoked");
      expect(err.name).toBe("GoogleAuthRevokedError");
    });
  });
});
