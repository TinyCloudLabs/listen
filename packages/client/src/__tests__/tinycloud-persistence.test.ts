import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { loadPersistedSession, clearPersistedSession } from "../session-persistence.js";

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
    _store: store,
  };
}

// ── Valid persisted session (matches what BrowserSessionStorage.save writes) ──

function makePersistedSession(overrides: Record<string, any> = {}) {
  return {
    address: "0xABCdef1234567890ABCdef1234567890ABCdef12",
    chainId: 1,
    sessionKey: JSON.stringify({ kty: "OKP", crv: "Ed25519", x: "test" }),
    siwe: "example.com wants you to sign in...",
    signature: "0xsig",
    tinycloudSession: {
      delegationHeader: "header-value",
      delegationCid: "cid-value",
      spaceId: "space-123",
      spaces: { public: "public-space" },
      verificationMethod: "did:key:z6Mk...",
    },
    expiresAt: new Date(Date.now() + 3600_000).toISOString(), // 1 hour from now
    createdAt: new Date().toISOString(),
    version: "1.0",
    ...overrides,
  };
}

const TEST_ADDRESS = "0xABCdef1234567890ABCdef1234567890ABCdef12";
const STORAGE_KEY = `tinycloud:session:${TEST_ADDRESS.toLowerCase()}`;

describe("loadPersistedSession", () => {
  let mockStorage: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    mockStorage = createLocalStorageMock();
    (globalThis as any).localStorage = mockStorage;
  });

  afterEach(() => {
    delete (globalThis as any).localStorage;
  });

  test("returns session data when valid session exists", () => {
    const session = makePersistedSession();
    mockStorage.setItem(STORAGE_KEY, JSON.stringify(session));

    const result = loadPersistedSession(TEST_ADDRESS);

    expect(result).not.toBeNull();
    expect(result!.address).toBe(TEST_ADDRESS);
    expect(result!.chainId).toBe(1);
    expect(result!.did).toBe(`did:pkh:eip155:1:${TEST_ADDRESS}`);
    expect(result!.expiresAt).toBe(session.expiresAt);
    expect(result!.spaceId).toBe("space-123");
  });

  test("returns null when no session exists", () => {
    const result = loadPersistedSession(TEST_ADDRESS);
    expect(result).toBeNull();
  });

  test("returns null and cleans up when session is expired", () => {
    const session = makePersistedSession({
      expiresAt: new Date(Date.now() - 1000).toISOString(), // already expired
    });
    mockStorage.setItem(STORAGE_KEY, JSON.stringify(session));

    const result = loadPersistedSession(TEST_ADDRESS);

    expect(result).toBeNull();
    // Should clean up expired entry
    expect(mockStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  test("handles corrupted data gracefully", () => {
    mockStorage.setItem(STORAGE_KEY, "not-valid-json{{{");

    const result = loadPersistedSession(TEST_ADDRESS);
    expect(result).toBeNull();
  });

  test("address lookup is case-insensitive", () => {
    const session = makePersistedSession();
    mockStorage.setItem(STORAGE_KEY, JSON.stringify(session));

    // Use uppercase address — should still find it since key is lowercased
    const result = loadPersistedSession(TEST_ADDRESS.toUpperCase());
    expect(result).not.toBeNull();
    expect(result!.address).toBe(TEST_ADDRESS);
  });

  test("builds correct DID for non-mainnet chainId", () => {
    const session = makePersistedSession({ chainId: 137 }); // Polygon
    mockStorage.setItem(STORAGE_KEY, JSON.stringify(session));

    const result = loadPersistedSession(TEST_ADDRESS);
    expect(result!.did).toBe(`did:pkh:eip155:137:${TEST_ADDRESS}`);
    expect(result!.chainId).toBe(137);
  });

  test("defaults chainId to 1 when missing", () => {
    const session = makePersistedSession();
    delete (session as any).chainId;
    mockStorage.setItem(STORAGE_KEY, JSON.stringify(session));

    const result = loadPersistedSession(TEST_ADDRESS);
    expect(result!.chainId).toBe(1);
    expect(result!.did).toContain("eip155:1:");
  });
});

describe("clearPersistedSession", () => {
  let mockStorage: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    mockStorage = createLocalStorageMock();
    (globalThis as any).localStorage = mockStorage;
  });

  afterEach(() => {
    delete (globalThis as any).localStorage;
  });

  test("removes session from localStorage", () => {
    mockStorage.setItem(STORAGE_KEY, JSON.stringify(makePersistedSession()));
    expect(mockStorage.getItem(STORAGE_KEY)).not.toBeNull();

    clearPersistedSession(TEST_ADDRESS);
    expect(mockStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  test("is case-insensitive", () => {
    mockStorage.setItem(STORAGE_KEY, JSON.stringify(makePersistedSession()));

    clearPersistedSession(TEST_ADDRESS.toUpperCase());
    expect(mockStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  test("does not throw when no session exists", () => {
    expect(() => clearPersistedSession(TEST_ADDRESS)).not.toThrow();
  });
});

describe("full restore flow simulation", () => {
  let mockStorage: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    mockStorage = createLocalStorageMock();
    (globalThis as any).localStorage = mockStorage;
  });

  afterEach(() => {
    delete (globalThis as any).localStorage;
  });

  test("sign-in saves → reload loads → sign-out clears", () => {
    // Simulate BrowserSessionStorage.save() during sign-in
    const session = makePersistedSession();
    mockStorage.setItem(STORAGE_KEY, JSON.stringify(session));

    // Simulate page reload — loadPersistedSession
    const restored = loadPersistedSession(TEST_ADDRESS);
    expect(restored).not.toBeNull();
    expect(restored!.address).toBe(TEST_ADDRESS);
    expect(restored!.did).toBe(`did:pkh:eip155:1:${TEST_ADDRESS}`);

    // Simulate sign-out — clearPersistedSession
    clearPersistedSession(TEST_ADDRESS);
    expect(loadPersistedSession(TEST_ADDRESS)).toBeNull();
  });

  test("expired TC session blocks restore even with valid tokens", () => {
    // TC session expired
    const session = makePersistedSession({
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    });
    mockStorage.setItem(STORAGE_KEY, JSON.stringify(session));

    const result = loadPersistedSession(TEST_ADDRESS);
    expect(result).toBeNull();
  });
});
