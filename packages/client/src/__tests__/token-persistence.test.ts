import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { TokenStore } from "../tokens.js";

// ── localStorage mock ────────────────────────────────────────────────

function createLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (index: number) => [...store.keys()][index] ?? null,
    _store: store, // for test inspection
  };
}

describe("TokenStore — localStorage persistence", () => {
  let mockStorage: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    mockStorage = createLocalStorageMock();
    (globalThis as any).localStorage = mockStorage;
  });

  afterEach(() => {
    delete (globalThis as any).localStorage;
  });

  // ── setTokens writes to localStorage ────────────────────────────────

  test("setTokens persists to localStorage", () => {
    const store = new TokenStore();
    store.setTokens("access-1", "refresh-1", 3600, "0xABC");

    const raw = mockStorage.getItem("tinyboilerplate:tokens");
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw!);
    expect(parsed.accessToken).toBe("access-1");
    expect(parsed.refreshToken).toBe("refresh-1");
    expect(parsed.address).toBe("0xABC");
    expect(parsed.expiresAt).toBeGreaterThan(Date.now());
  });

  // ── constructor loads from localStorage ─────────────────────────────

  test("new TokenStore loads persisted tokens from localStorage", () => {
    // First store saves
    const store1 = new TokenStore();
    store1.setTokens("access-1", "refresh-1", 3600, "0xABC");

    // Second store (simulates page reload) should auto-load
    const store2 = new TokenStore();
    expect(store2.hasTokens()).toBe(true);
    expect(store2.getAccessToken()).toBe("access-1");
    expect(store2.getRefreshToken()).toBe("refresh-1");
    expect(store2.getAddress()).toBe("0xABC");
    expect(store2.isExpired()).toBe(false);
  });

  // ── address persistence ─────────────────────────────────────────────

  test("getAddress returns stored address after reload", () => {
    const store1 = new TokenStore();
    store1.setTokens("a", "r", 3600, "0xDEADBEEF");

    const store2 = new TokenStore();
    expect(store2.getAddress()).toBe("0xDEADBEEF");
  });

  test("getAddress returns null when no address was stored", () => {
    const store1 = new TokenStore();
    store1.setTokens("a", "r", 3600); // no address

    const store2 = new TokenStore();
    expect(store2.hasTokens()).toBe(true);
    expect(store2.getAddress()).toBeNull();
  });

  // ── expired tokens are not loaded ───────────────────────────────────

  test("constructor discards expired tokens from localStorage", () => {
    // Manually write expired tokens
    mockStorage.setItem(
      "tinyboilerplate:tokens",
      JSON.stringify({
        accessToken: "expired",
        refreshToken: "expired-r",
        expiresAt: Date.now() - 1000, // already expired
        address: "0xOLD",
      }),
    );

    const store = new TokenStore();
    expect(store.hasTokens()).toBe(false);
    expect(store.getAccessToken()).toBeNull();
    // Should also clean up localStorage
    expect(mockStorage.getItem("tinyboilerplate:tokens")).toBeNull();
  });

  // ── clear removes from localStorage ─────────────────────────────────

  test("clear removes tokens from localStorage", () => {
    const store = new TokenStore();
    store.setTokens("a", "r", 3600, "0xABC");
    expect(mockStorage.getItem("tinyboilerplate:tokens")).not.toBeNull();

    store.clear();
    expect(mockStorage.getItem("tinyboilerplate:tokens")).toBeNull();
    expect(store.hasTokens()).toBe(false);
  });

  // ── custom storageKey ───────────────────────────────────────────────

  test("custom storageKey isolates storage", () => {
    const store1 = new TokenStore("app1:tokens");
    store1.setTokens("a1", "r1", 3600, "0x111");

    const store2 = new TokenStore("app2:tokens");
    store2.setTokens("a2", "r2", 3600, "0x222");

    // Each reads its own key
    const reload1 = new TokenStore("app1:tokens");
    expect(reload1.getAccessToken()).toBe("a1");

    const reload2 = new TokenStore("app2:tokens");
    expect(reload2.getAccessToken()).toBe("a2");
  });

  // ── refresh preserves address ───────────────────────────────────────

  test("refresh preserves address in localStorage", async () => {
    const originalFetch = globalThis.fetch;

    try {
      const store = new TokenStore();
      store.setTokens("old-access", "old-refresh", 3600, "0xKEEP");

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

      await store.refresh({
        openKeyHost: "https://openkey.example.com",
        clientId: "test",
      });

      // Address should be preserved after refresh
      expect(store.getAddress()).toBe("0xKEEP");

      // And persisted to localStorage
      const reloaded = new TokenStore();
      expect(reloaded.getAddress()).toBe("0xKEEP");
      expect(reloaded.getAccessToken()).toBe("new-access");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // ── corrupted localStorage ──────────────────────────────────────────

  test("handles corrupted localStorage gracefully", () => {
    mockStorage.setItem("tinyboilerplate:tokens", "not-valid-json{{{");

    const store = new TokenStore();
    expect(store.hasTokens()).toBe(false);
  });

  // ── full round-trip simulating sign-in → reload → restore ───────────

  test("full round-trip: sign-in → reload → tokens available with address", () => {
    // Simulate sign-in
    const signInStore = new TokenStore();
    signInStore.setTokens("access-xyz", "refresh-xyz", 3600, "0xUser123");

    expect(signInStore.hasTokens()).toBe(true);
    expect(signInStore.getAddress()).toBe("0xUser123");

    // Simulate page reload — new TokenStore instance
    const reloadStore = new TokenStore();

    // Verify the restore preconditions the App.tsx useEffect checks:
    expect(reloadStore.hasTokens()).toBe(true); // ✅ tokens exist
    expect(reloadStore.isExpired()).toBe(false); // ✅ not expired
    expect(reloadStore.getAddress()).not.toBeNull(); // ✅ address available
    expect(reloadStore.getAddress()).toBe("0xUser123"); // ✅ correct address
    expect(reloadStore.getAccessToken()).toBe("access-xyz");
  });
});
