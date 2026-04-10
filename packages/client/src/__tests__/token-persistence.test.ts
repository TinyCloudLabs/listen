import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { SessionStore } from "../tokens.js";

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

describe("SessionStore — localStorage persistence", () => {
  let mockStorage: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    mockStorage = createLocalStorageMock();
    (globalThis as any).localStorage = mockStorage;
  });

  afterEach(() => {
    delete (globalThis as any).localStorage;
  });

  // ── setSession writes to localStorage ────────────────────────────────

  test("setSession persists to localStorage", () => {
    const store = new SessionStore();
    store.setSession("token-1", 3600, "0xABC");

    const raw = mockStorage.getItem("tinyboilerplate:session");
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw!);
    expect(parsed.token).toBe("token-1");
    expect(parsed.address).toBe("0xABC");
    expect(parsed.expiresAt).toBeGreaterThan(Date.now());
  });

  // ── constructor loads from localStorage ─────────────────────────────

  test("new SessionStore loads persisted session from localStorage", () => {
    // First store saves
    const store1 = new SessionStore();
    store1.setSession("token-1", 3600, "0xABC");

    // Second store (simulates page reload) should auto-load
    const store2 = new SessionStore();
    expect(store2.hasSession()).toBe(true);
    expect(store2.getToken()).toBe("token-1");
    expect(store2.getAddress()).toBe("0xABC");
    expect(store2.isExpired()).toBe(false);
  });

  // ── address persistence ─────────────────────────────────────────────

  test("getAddress returns stored address after reload", () => {
    const store1 = new SessionStore();
    store1.setSession("t", 3600, "0xDEADBEEF");

    const store2 = new SessionStore();
    expect(store2.getAddress()).toBe("0xDEADBEEF");
  });

  test("getAddress returns null when no address was stored", () => {
    const store1 = new SessionStore();
    store1.setSession("t", 3600); // no address

    const store2 = new SessionStore();
    expect(store2.hasSession()).toBe(true);
    expect(store2.getAddress()).toBeNull();
  });

  // ── expired session is not loaded ───────────────────────────────────

  test("constructor discards expired session from localStorage", () => {
    // Manually write expired session
    mockStorage.setItem(
      "tinyboilerplate:session",
      JSON.stringify({
        token: "expired",
        expiresAt: Date.now() - 1000, // already expired
        address: "0xOLD",
      }),
    );

    const store = new SessionStore();
    expect(store.hasSession()).toBe(false);
    expect(store.getToken()).toBeNull();
    // Should also clean up localStorage
    expect(mockStorage.getItem("tinyboilerplate:session")).toBeNull();
  });

  // ── clear removes from localStorage ─────────────────────────────────

  test("clear removes session from localStorage", () => {
    const store = new SessionStore();
    store.setSession("t", 3600, "0xABC");
    expect(mockStorage.getItem("tinyboilerplate:session")).not.toBeNull();

    store.clear();
    expect(mockStorage.getItem("tinyboilerplate:session")).toBeNull();
    expect(store.hasSession()).toBe(false);
  });

  // ── custom storageKey ─────────────────────────────────��─────────────

  test("custom storageKey isolates storage", () => {
    const store1 = new SessionStore("app1:session");
    store1.setSession("t1", 3600, "0x111");

    const store2 = new SessionStore("app2:session");
    store2.setSession("t2", 3600, "0x222");

    // Each reads its own key
    const reload1 = new SessionStore("app1:session");
    expect(reload1.getToken()).toBe("t1");

    const reload2 = new SessionStore("app2:session");
    expect(reload2.getToken()).toBe("t2");
  });

  // ── corrupted localStorage ──────────────────────────────────────────

  test("handles corrupted localStorage gracefully", () => {
    mockStorage.setItem("tinyboilerplate:session", "not-valid-json{{{");

    const store = new SessionStore();
    expect(store.hasSession()).toBe(false);
  });

  // ── full round-trip simulating sign-in → reload → restore ───────────

  test("full round-trip: sign-in → reload → session available with address", () => {
    // Simulate sign-in
    const signInStore = new SessionStore();
    signInStore.setSession("token-xyz", 3600, "0xUser123");

    expect(signInStore.hasSession()).toBe(true);
    expect(signInStore.getAddress()).toBe("0xUser123");

    // Simulate page reload — new SessionStore instance
    const reloadStore = new SessionStore();

    // Verify the restore preconditions the App.tsx useEffect checks:
    expect(reloadStore.hasSession()).toBe(true); // session exists
    expect(reloadStore.isExpired()).toBe(false); // not expired
    expect(reloadStore.getAddress()).not.toBeNull(); // address available
    expect(reloadStore.getAddress()).toBe("0xUser123"); // correct address
    expect(reloadStore.getToken()).toBe("token-xyz");
  });
});
