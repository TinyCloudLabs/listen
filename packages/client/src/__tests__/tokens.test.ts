import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { TokenStore, type TokenRefreshConfig } from "../tokens.js";

describe("TokenStore", () => {
  let store: TokenStore;

  beforeEach(() => {
    store = new TokenStore();
  });

  // ── setTokens / getters ──────────────────────────────────────────────

  test("setTokens stores tokens correctly", () => {
    store.setTokens("access-123", "refresh-456", 3600);

    expect(store.getAccessToken()).toBe("access-123");
    expect(store.getRefreshToken()).toBe("refresh-456");
    expect(store.hasTokens()).toBe(true);
  });

  test("getAccessToken returns null when no tokens are set", () => {
    expect(store.getAccessToken()).toBeNull();
  });

  test("getRefreshToken returns null when no tokens are set", () => {
    expect(store.getRefreshToken()).toBeNull();
  });

  // ── hasTokens ────────────────────────────────────────────────────────

  test("hasTokens returns false when no tokens are set", () => {
    expect(store.hasTokens()).toBe(false);
  });

  test("hasTokens returns true after tokens are set", () => {
    store.setTokens("a", "r", 3600);
    expect(store.hasTokens()).toBe(true);
  });

  // ── isExpired ────────────────────────────────────────────────────────

  test("isExpired returns false for fresh tokens", () => {
    // 1 hour expiry — well outside the 30s buffer
    store.setTokens("a", "r", 3600);
    expect(store.isExpired()).toBe(false);
  });

  test("isExpired returns true when token is within 30s buffer of expiry", () => {
    // Set expiry to 20 seconds — within the 30s buffer
    store.setTokens("a", "r", 20);
    expect(store.isExpired()).toBe(true);
  });

  test("isExpired returns true when no tokens are set", () => {
    expect(store.isExpired()).toBe(true);
  });

  test("isExpired returns true when token is already expired", () => {
    // 0 seconds means expires immediately
    store.setTokens("a", "r", 0);
    expect(store.isExpired()).toBe(true);
  });

  // ── clear ────────────────────────────────────────────────────────────

  test("clear removes all tokens", () => {
    store.setTokens("a", "r", 3600);
    expect(store.hasTokens()).toBe(true);

    store.clear();

    expect(store.hasTokens()).toBe(false);
    expect(store.getAccessToken()).toBeNull();
    expect(store.getRefreshToken()).toBeNull();
    expect(store.isExpired()).toBe(true);
  });

  // ── refresh ──────────────────────────────────────────────────────────

  describe("refresh", () => {
    const refreshConfig: TokenRefreshConfig = {
      openKeyHost: "https://openkey.example.com",
      clientId: "test-client-id",
    };

    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    test("calls the token endpoint with correct params", async () => {
      store.setTokens("old-access", "old-refresh", 3600);

      let capturedUrl: string | undefined;
      let capturedInit: RequestInit | undefined;

      globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
        capturedUrl = input.toString();
        capturedInit = init;
        return new Response(
          JSON.stringify({
            access_token: "new-access",
            refresh_token: "new-refresh",
            expires_in: 7200,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }) as typeof fetch;

      await store.refresh(refreshConfig);

      expect(capturedUrl).toBe("https://api.openkey.example.com/api/auth/oauth2/token");
      expect(capturedInit?.method).toBe("POST");
      expect(capturedInit?.headers).toEqual({
        "Content-Type": "application/x-www-form-urlencoded",
      });

      const body = new URLSearchParams(capturedInit?.body as string);
      expect(body.get("grant_type")).toBe("refresh_token");
      expect(body.get("refresh_token")).toBe("old-refresh");
      expect(body.get("client_id")).toBe("test-client-id");
    });

    test("updates stored tokens on success", async () => {
      store.setTokens("old-access", "old-refresh", 3600);

      globalThis.fetch = (async () => {
        return new Response(
          JSON.stringify({
            access_token: "new-access",
            refresh_token: "new-refresh",
            expires_in: 7200,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }) as typeof fetch;

      await store.refresh(refreshConfig);

      expect(store.getAccessToken()).toBe("new-access");
      expect(store.getRefreshToken()).toBe("new-refresh");
      expect(store.isExpired()).toBe(false);
    });

    test("keeps old refresh token when server does not return a new one", async () => {
      store.setTokens("old-access", "old-refresh", 3600);

      globalThis.fetch = (async () => {
        return new Response(
          JSON.stringify({
            access_token: "new-access",
            // no refresh_token in response
            expires_in: 7200,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }) as typeof fetch;

      await store.refresh(refreshConfig);

      expect(store.getAccessToken()).toBe("new-access");
      expect(store.getRefreshToken()).toBe("old-refresh");
    });

    test("clears tokens on failure", async () => {
      store.setTokens("old-access", "old-refresh", 3600);

      globalThis.fetch = (async () => {
        return new Response("Invalid grant", { status: 400 });
      }) as typeof fetch;

      await expect(store.refresh(refreshConfig)).rejects.toThrow("Token refresh failed");

      expect(store.hasTokens()).toBe(false);
      expect(store.getAccessToken()).toBeNull();
    });

    test("throws when no refresh token available", async () => {
      // No tokens set at all
      await expect(store.refresh(refreshConfig)).rejects.toThrow("No refresh token available");
    });
  });
});
