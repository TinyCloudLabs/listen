import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import {
  composeManifestWithDelegatees,
  connectWallet,
  createAndSignIn,
  createApiClient,
  createManifestDelegation,
  createPermissionDelegation,
  checkDelegationStatus,
  clearPersistedSession,
  loadPersistedSession,
  requestNonce,
  sendDelegation,
  restoreTinyCloudWeb,
  verifySession,
} from "@listen/client";

// ── Mocks ────────────────────────────────────────────────────────────

(globalThis as unknown as { HTMLElement?: unknown }).HTMLElement ??= class HTMLElement {};
(globalThis as unknown as { customElements?: unknown }).customElements ??= {
  define() {},
  get() {
    return undefined;
  },
};

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDel = vi.fn();
const mockSecretGet = vi.fn();
const mockSecretDelete = vi.fn();
const mockTinyCloudQuery = vi.fn();
const mockTinyCloudKvGet = vi.fn();

const mockApiClient = { get: mockGet, post: mockPost, put: mockPut, del: mockDel };
const mockTinyCloudSignStrategy = {
  type: "callback",
  openKeyAutoSign: true,
  handler: vi.fn(),
};

vi.mock("@listen/client", () => {
  class MockSessionStore {
    private storageKey: string;

    constructor(storageKey = "listen:session") {
      this.storageKey = storageKey;
    }

    private read() {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : null;
    }

    hasSession() {
      return this.read() !== null;
    }

    isExpired() {
      const session = this.read();
      if (!session) return true;
      return Date.now() >= session.expiresAt - 30_000;
    }

    getAddress() {
      return this.read()?.address ?? null;
    }

    getToken() {
      return this.read()?.token ?? null;
    }

    setSession(token: string, expiresIn: number, address?: string) {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify({
          token,
          expiresAt: Date.now() + expiresIn * 1000,
          address,
        }),
      );
    }

    clear() {
      localStorage.removeItem(this.storageKey);
    }
  }
  return {
    connectWallet: vi.fn(),
    requestNonce: vi.fn(),
    verifySession: vi.fn(),
    createAndSignIn: vi.fn(),
    restoreTinyCloudWeb: vi.fn(() => Promise.resolve(null)),
    createApiClient: vi.fn(() => mockApiClient),
    createManifestDelegation: vi.fn(),
    createPermissionDelegation: vi.fn(),
    clearPersistedSession: vi.fn(),
    loadPersistedSession: vi.fn(() => null),
    sendDelegation: vi.fn(),
    revokeDelegation: vi.fn(() => Promise.resolve()),
    checkDelegationStatus: vi.fn(() => Promise.resolve({ status: "none", expiresAt: null })),
    loadAppManifest: vi.fn().mockResolvedValue({
      app_id: "com.test.listen",
      name: "Listen",
      defaults: true,
    }),
    composeManifestWithBackend: vi.fn((manifest) => ({
      manifests: [manifest],
      resources: [],
      delegationTargets: [
        {
          did: "did:key:backend",
          name: "Backend",
          expiryMs: 604800000,
          permissions: [],
        },
      ],
      registryRecords: [],
      expiryMs: 2592000000,
      includePublicSpace: true,
    })),
    composeManifestWithDelegatees: vi.fn((manifest, delegatees) => ({
      manifests: [manifest],
      resources: [],
      delegationTargets: delegatees.map((delegatee: { did: string; name?: string }) => ({
        did: delegatee.did,
        name: delegatee.name ?? "Delegatee",
        expiryMs: 604800000,
        permissions: [],
      })),
      registryRecords: [],
      expiryMs: 604800000,
      includePublicSpace: true,
    })),
    resolveManifestPermissions: vi.fn().mockReturnValue([
      {
        service: "tinycloud.kv",
        space: "applications",
        path: "com.test.listen/",
        actions: ["tinycloud.kv/get", "tinycloud.kv/put"],
      },
    ]),
    resolveManifestPermissionPath: vi
      .fn()
      .mockReturnValue("com.test.listen/conversations/conversation"),
    isListenDebugEnabled: vi.fn(() => false),
    installListenDebugFetchLogger: vi.fn(),
    listenDebugFetch: vi.fn((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init)),
    listenDebugLog: vi.fn(),
    startListenDebugStep: vi.fn(() => ({
      complete: vi.fn(),
      fail: vi.fn(),
    })),
    SessionStore: MockSessionStore,
  };
});

import { App } from "../App";
import { backendWorkspaceCacheKey, writeBackendWorkspaceCache } from "../lib/backendWorkspaceCache";
import { recordBackendDelegationGrant } from "../lib/backendDelegationRenewal";

// ── Helpers ──────────────────────────────────────────────────────────

function createMockStorage(): Storage {
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
  };
}

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    statusText: "OK",
    json: () => Promise.resolve(body),
  } as Response;
}

function workspaceState(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    delegation: {
      status: "active",
      stored: true,
      validPolicy: true,
      expiresAt: "2026-05-18T00:00:00.000Z",
      activation: "active",
      ...(overrides.delegation as Record<string, unknown> | undefined),
    },
    backendReadableSecrets: {
      fireflies: { readable: true },
      granola: { readable: true },
      soundcoreSession: { readable: false },
      soundcoreAuthToken: { readable: false },
      soundcoreUid: { readable: false },
      soundcoreOpenudid: { readable: false },
      assemblyai: { readable: true },
      deepgram: { readable: true },
      ...(overrides.backendReadableSecrets as Record<string, unknown> | undefined),
    },
    googleMeet: {
      available: true,
      connected: false,
      ...(overrides.googleMeet as Record<string, unknown> | undefined),
    },
    conversations: {
      hasAny: false,
      total: 0,
      ...(overrides.conversations as Record<string, unknown> | undefined),
    },
  };
}

function toArrayRows(objects: Record<string, unknown>[]): { rows: unknown[][]; columns: string[] } {
  if (objects.length === 0) return { rows: [], columns: [] };
  const columns = Object.keys(objects[0]!);
  return {
    columns,
    rows: objects.map((obj) => columns.map((column) => obj[column])),
  };
}

function mockTinyCloudConversationPage(
  conversations: Record<string, unknown>[],
  total = conversations.length,
) {
  mockTinyCloudQuery.mockImplementation((sql: string) => {
    if (sql.includes("COUNT(*) AS total")) {
      return Promise.resolve({ ok: true, data: toArrayRows([{ total }]) });
    }
    if (sql.includes("participant_count")) {
      return Promise.resolve({ ok: true, data: toArrayRows(conversations) });
    }
    return Promise.resolve({ ok: true, data: toArrayRows([]) });
  });
}

function mockAuthFlow() {
  vi.mocked(connectWallet).mockResolvedValue({
    address: "0xabc123",
    keyId: "key_test",
    openkey: {} as never,
    web3Provider: {
      getNetwork: vi.fn().mockResolvedValue({ chainId: 1 }),
    },
    tinycloudSignStrategy: mockTinyCloudSignStrategy,
  });
  vi.mocked(requestNonce).mockResolvedValue("mock-nonce");
  vi.mocked(createAndSignIn).mockResolvedValue({
    tcw: {
      did: "did:pkh:eip155:1:0xabc123",
      hosts: ["http://localhost:5112"],
      secrets: {
        unlock: vi.fn().mockResolvedValue({ ok: true }),
        get: mockSecretGet,
        delete: mockSecretDelete,
      },
      sql: {
        db: vi.fn(() => ({
          query: mockTinyCloudQuery,
          migrations: { apply: vi.fn().mockResolvedValue({ ok: true }) },
        })),
      },
      kv: {
        get: mockTinyCloudKvGet,
      },
      signOut: vi.fn(),
    },
    session: { siwe: "mock-siwe", signature: "mock-signature" },
  });
  vi.mocked(verifySession).mockResolvedValue({ token: "mock-token", expiresIn: 3600 });
  vi.mocked(createManifestDelegation).mockResolvedValue({
    serialized: "mock-delegation",
    prompted: false,
  });
  vi.mocked(createPermissionDelegation).mockResolvedValue({
    serialized: "mock-delegation",
    prompted: false,
  });
  vi.mocked(sendDelegation).mockResolvedValue({
    status: "active",
    expiresAt: "2026-05-18T00:00:00.000Z",
  });
  vi.mocked(checkDelegationStatus).mockResolvedValue({ status: "none", expiresAt: null });
  vi.mocked(composeManifestWithDelegatees).mockImplementation((manifest, delegatees) => ({
    manifests: [manifest],
    resources: [],
    delegationTargets: delegatees.map((delegatee) => ({
      did: delegatee.did,
      name: delegatee.name ?? "Delegatee",
      expiryMs: 604800000,
      permissions: [],
    })),
    registryRecords: [],
    expiryMs: 604800000,
    includePublicSpace: true,
  }));
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/server-info")) {
        return Promise.resolve(
          jsonResponse({
            did: "did:key:backend",
            status: "ready",
            name: "Backend",
            expiry: "7d",
            permissions: [],
          }),
        );
      }
      if (url.endsWith("/info")) {
        return Promise.resolve(
          jsonResponse({
            did: "did:key:agent",
            status: "ready",
            name: "Agent",
            expiry: "7d",
            permissions: [],
          }),
        );
      }
      return Promise.resolve(jsonResponse({}));
    }),
  );
}

function storeBackendSession(address = "0xabc123") {
  localStorage.setItem(
    "listen:session",
    JSON.stringify({
      token: "persisted-token",
      expiresAt: Date.now() + 3600_000,
      address,
    }),
  );
}

async function renderAndSignIn() {
  render(<App />);
  fireEvent.click(screen.getAllByRole("button", { name: /open app/i })[0]);

  await waitFor(() => {
    expect(createAndSignIn).toHaveBeenCalled();
  });
}

function expectLastSignInUsedLocalManifest() {
  const lastCall = vi.mocked(createAndSignIn).mock.calls.at(-1);
  expect(lastCall?.[1]).toEqual(
    expect.objectContaining({
      autoCreateSpace: true,
      manifest: expect.objectContaining({
        app_id: "xyz.tinycloud.listen",
        name: "Listen",
        defaults: true,
      }),
    }),
  );
  expect(lastCall?.[1]).not.toHaveProperty("capabilityRequest");
}

async function openUserMenu() {
  const userName = await screen.findByText("0xabc1…c123");
  const userButton = userName.closest("button");
  expect(userButton).toBeTruthy();
  fireEvent.click(userButton!);
}

// ── Tests ────────────────────────────────────────────────────────────

describe("App manual sign-in processing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("localStorage", createMockStorage());
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    mockAuthFlow();
    vi.mocked(loadPersistedSession).mockReturnValue(null);
    mockSecretGet.mockResolvedValue({ ok: true, data: "saved-secret" });
    mockSecretDelete.mockResolvedValue({ ok: true });
    mockTinyCloudConversationPage([]);
    mockTinyCloudKvGet.mockResolvedValue({ ok: true, data: { data: null } });

    // Default: backfill returns no updates
    mockPost.mockResolvedValue({ updated: 0, still_missing: 0 });

    // Default: fireflies key exists, google-meet not connected, webhook status OK, no pending
    mockGet.mockImplementation((url: string) => {
      if (url === "/api/workspace-state") {
        return Promise.resolve(workspaceState());
      }
      if (url === "/api/config/fireflies-key/exists") {
        return Promise.resolve({ exists: true });
      }
      if (url === "/api/config/google-meet/connected") {
        return Promise.resolve({ connected: false });
      }
      if (url === "/api/config/webhook-status") {
        return Promise.resolve({ configured: true, pendingCount: 0, webhookUrl: "" });
      }
      if (url === "/api/webhooks/fireflies/pending") {
        return Promise.resolve({ processed: [], skipped: [], errors: [] });
      }
      if (url === "/api/webhooks/google-meet/check") {
        return Promise.resolve({ status: "not_configured" });
      }
      if (url === "/api/webhooks/google-meet/pending") {
        return Promise.resolve({ processed: [], skipped: [], errors: [] });
      }
      if (url.startsWith("/api/conversations")) {
        return Promise.resolve({ conversations: [], total: 0 });
      }
      return Promise.resolve({});
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("stays on the landing page when no stored session exists", () => {
    render(<App />);

    expect(screen.getAllByRole("button", { name: /open app/i })).toHaveLength(2);
    expect(connectWallet).not.toHaveBeenCalled();
    expect(createAndSignIn).not.toHaveBeenCalled();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("shows the landing page on load even when a valid stored backend session exists", () => {
    storeBackendSession();
    vi.mocked(loadPersistedSession).mockReturnValue({
      address: "0xabc123",
      chainId: 1,
      did: "did:pkh:eip155:1:0xabc123",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      spaceId: "tinycloud:pkh:eip155:1:0xabc123:applications",
    });

    render(<App />);

    expect(screen.getAllByRole("button", { name: /open app/i })).toHaveLength(2);
    expect(connectWallet).not.toHaveBeenCalled();
    expect(restoreTinyCloudWeb).not.toHaveBeenCalled();
    expect(requestNonce).not.toHaveBeenCalled();
    expect(createAndSignIn).not.toHaveBeenCalled();
    expect(verifySession).not.toHaveBeenCalled();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("restores a valid stored backend session silently after the user opens the app", async () => {
    storeBackendSession();
    vi.mocked(loadPersistedSession).mockReturnValue({
      address: "0xabc123",
      chainId: 1,
      did: "did:pkh:eip155:1:0xabc123",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      spaceId: "tinycloud:pkh:eip155:1:0xabc123:applications",
    });

    render(<App />);
    fireEvent.click(screen.getAllByRole("button", { name: /open app/i })[0]);

    expect(await screen.findByText("0xabc1…c123")).toBeInTheDocument();
    expect(connectWallet).not.toHaveBeenCalled();
    expect(requestNonce).not.toHaveBeenCalled();
    expect(createAndSignIn).not.toHaveBeenCalled();
    expect(verifySession).not.toHaveBeenCalled();
    expect(restoreTinyCloudWeb).toHaveBeenCalledWith(
      "0xabc123",
      expect.objectContaining({
        autoCreateSpace: true,
        capabilityRequest: expect.objectContaining({
          delegationTargets: expect.arrayContaining([
            expect.objectContaining({ did: "did:key:backend" }),
          ]),
        }),
      }),
    );
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/api/workspace-state");
    });
  });

  it("stores active backend workspace readiness locally until delegation expiry", async () => {
    const expiresAt = new Date(Date.now() + 3600_000).toISOString();
    mockGet.mockImplementation((url: string) => {
      if (url === "/api/workspace-state") {
        return Promise.resolve(workspaceState({ delegation: { expiresAt } }));
      }
      if (url === "/api/config/webhook-status") {
        return Promise.resolve({ configured: true, pendingCount: 0, webhookUrl: "" });
      }
      if (url === "/api/webhooks/fireflies/pending") {
        return Promise.resolve({ processed: [], skipped: [], errors: [] });
      }
      if (url.startsWith("/api/conversations")) {
        return Promise.resolve({ conversations: [], total: 0 });
      }
      return Promise.resolve({});
    });

    await renderAndSignIn();

    await waitFor(() => {
      const raw = localStorage.getItem(backendWorkspaceCacheKey("0xabc123", "did:key:backend"));
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!)).toMatchObject({
        address: "0xabc123",
        backendDid: "did:key:backend",
        expiresAt,
        backendReadableSecrets: {
          fireflies: { readable: true },
          granola: { readable: true },
        },
      });
    });
  });

  it("hydrates backend readiness from a valid local cache without checking workspace state", async () => {
    storeBackendSession();
    vi.mocked(loadPersistedSession).mockReturnValue({
      address: "0xabc123",
      chainId: 1,
      did: "did:pkh:eip155:1:0xabc123",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      spaceId: "tinycloud:pkh:eip155:1:0xabc123:applications",
    });
    vi.mocked(restoreTinyCloudWeb).mockResolvedValue(null);
    writeBackendWorkspaceCache(
      "0xabc123",
      "did:key:backend",
      workspaceState({
        delegation: { expiresAt: new Date(Date.now() + 3600_000).toISOString() },
        conversations: { hasAny: true, total: 1 },
      }),
    );

    render(<App />);
    fireEvent.click(screen.getAllByRole("button", { name: /open app/i })[0]);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/api/webhooks/fireflies/pending");
    });
    expect(mockGet).not.toHaveBeenCalledWith("/api/workspace-state");
  });

  it("clears cached backend readiness when an API call reports delegated access failure", async () => {
    storeBackendSession();
    vi.mocked(loadPersistedSession).mockReturnValue({
      address: "0xabc123",
      chainId: 1,
      did: "did:pkh:eip155:1:0xabc123",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      spaceId: "tinycloud:pkh:eip155:1:0xabc123:applications",
    });
    vi.mocked(restoreTinyCloudWeb).mockResolvedValue(null);
    writeBackendWorkspaceCache(
      "0xabc123",
      "did:key:backend",
      workspaceState({
        delegation: { expiresAt: new Date(Date.now() + 3600_000).toISOString() },
      }),
    );
    mockPost.mockRejectedValueOnce(new Error("API error (500): Unauthorized Action"));

    render(<App />);
    fireEvent.click(screen.getAllByRole("button", { name: /open app/i })[0]);

    await waitFor(() => {
      expect(localStorage.getItem(backendWorkspaceCacheKey("0xabc123", "did:key:backend"))).toBe(
        null,
      );
    });
  });

  it("renders updated landing page copy and links", () => {
    render(<App />);

    expect(screen.queryByText(/watch demo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/made in monochrome/i)).not.toBeInTheDocument();
    expect(screen.getByText("© 2026 TinyCloud, Inc.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /interoperable apps/i })).toHaveAttribute(
      "href",
      "https://tinycloud.xyz/interoperable-apps",
    );
    expect(
      screen.getByText(/I recorded everything across meetings, notes, and files/i),
    ).toBeInTheDocument();
  });

  it("calls pending endpoint after manual sign-in with active delegation", async () => {
    await renderAndSignIn();

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/api/webhooks/fireflies/pending");
    });
  });

  it("clears persisted TinyCloud session before starting a fresh SIWE sign-in", async () => {
    await renderAndSignIn();

    expect(clearPersistedSession).toHaveBeenCalledWith("0xabc123");
    expect(requestNonce).toHaveBeenCalledWith("http://localhost:3001", "0xabc123");
    expect(createAndSignIn).toHaveBeenCalled();
  });

  it("purges Listen local data on sign-out", async () => {
    await renderAndSignIn();

    localStorage.setItem(
      backendWorkspaceCacheKey("0xabc123", "did:key:backend"),
      JSON.stringify({ cached: true }),
    );
    localStorage.setItem(
      "listen:conversation-page:v1:/api/conversations?limit=20&offset=0",
      JSON.stringify({ conversations: [], total: 0 }),
    );
    localStorage.setItem("listen:conversation-detail:v1:01ABC", JSON.stringify({ data: {} }));
    localStorage.setItem("listen:conversation-notes:01ABC", JSON.stringify([{ body: "draft" }]));
    localStorage.setItem("listen:shared-with-me:v1", JSON.stringify(["share-token"]));
    localStorage.setItem("listen:theme", "dark");
    localStorage.setItem("listen:capability-version", "soundcore-secrets-v2");
    localStorage.setItem("tinycloud:session:0xabc123", JSON.stringify({ address: "0xabc123" }));
    localStorage.setItem("lastSyncTimestamp", "2026-03-24T15:00:00.000Z");
    localStorage.setItem("unrelated", "keep");

    await openUserMenu();
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));

    await waitFor(() => {
      expect(localStorage.getItem("listen:session")).toBeNull();
    });
    expect(
      localStorage.getItem(backendWorkspaceCacheKey("0xabc123", "did:key:backend")),
    ).toBeNull();
    expect(
      localStorage.getItem("listen:conversation-page:v1:/api/conversations?limit=20&offset=0"),
    ).toBeNull();
    expect(localStorage.getItem("listen:conversation-detail:v1:01ABC")).toBeNull();
    expect(localStorage.getItem("listen:conversation-notes:01ABC")).toBeNull();
    expect(localStorage.getItem("listen:shared-with-me:v1")).toBeNull();
    expect(localStorage.getItem("listen:theme")).toBeNull();
    expect(localStorage.getItem("listen:capability-version")).toBeNull();
    expect(localStorage.getItem("tinycloud:session:0xabc123")).toBeNull();
    expect(localStorage.getItem("lastSyncTimestamp")).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("keep");
  });

  it("does not pass a sign strategy into TinyCloud sign-in (bootstrap is server-side)", async () => {
    await renderAndSignIn();

    const lastCall = vi.mocked(createAndSignIn).mock.calls.at(-1);
    expect(lastCall?.[1]).not.toHaveProperty("signStrategy");
  });

  it("does not post backend delegation after manual sign-in when none is stored", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/api/workspace-state") {
        return Promise.resolve(
          workspaceState({
            delegation: {
              status: "none",
              stored: false,
              validPolicy: false,
              expiresAt: null,
              activation: "unknown",
            },
            backendReadableSecrets: {
              fireflies: { readable: null },
              granola: { readable: null },
              soundcoreAuthToken: { readable: null },
              soundcoreUid: { readable: null },
              soundcoreOpenudid: { readable: null },
              assemblyai: { readable: null },
              deepgram: { readable: null },
            },
          }),
        );
      }
      if (url.startsWith("/api/conversations")) {
        return Promise.resolve({ conversations: [], total: 0 });
      }
      return Promise.resolve({});
    });

    await renderAndSignIn();

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/api/workspace-state");
    });
    expect(sendDelegation).not.toHaveBeenCalled();
    expect(createManifestDelegation).not.toHaveBeenCalled();
    expect(createPermissionDelegation).not.toHaveBeenCalled();
  });

  it("keeps the frontend signed in when the workspace state check fails", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/api/workspace-state") {
        return Promise.reject(new Error("Too many workspace state requests"));
      }
      if (url.startsWith("/api/conversations")) {
        return Promise.resolve({ conversations: [], total: 0 });
      }
      return Promise.resolve({});
    });

    await renderAndSignIn();

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/api/workspace-state");
    });
    expect(await screen.findByText("0xabc1…c123")).toBeInTheDocument();
  });

  it("renders direct TinyCloud conversations while backend workspace state is still loading", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/api/workspace-state") return new Promise(() => {});
      if (url.startsWith("/api/conversations")) {
        return Promise.resolve({ conversations: [], total: 0 });
      }
      return Promise.resolve({});
    });
    mockTinyCloudConversationPage([
      {
        id: "01ABC",
        title: "Planning",
        source: "fireflies",
        source_url: null,
        started_at: "2026-05-14T14:00:00Z",
        duration_secs: 1200,
        summary: "Roadmap",
        created_at: "2026-05-14T14:30:00Z",
        participant_count: 2,
      },
    ]);

    await renderAndSignIn();

    expect(await screen.findByText("Planning")).toBeInTheDocument();
    expect(mockGet).not.toHaveBeenCalledWith(expect.stringMatching(/^\/api\/conversations/));
  });

  it("renders cached backend conversations while workspace checks are still loading", async () => {
    storeBackendSession();
    vi.mocked(loadPersistedSession).mockReturnValue({
      address: "0xabc123",
      chainId: 1,
      did: "did:pkh:eip155:1:0xabc123",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      spaceId: "tinycloud:pkh:eip155:1:0xabc123:applications",
    });
    vi.mocked(restoreTinyCloudWeb).mockResolvedValue(null);
    mockGet.mockImplementation((url: string) => {
      if (url === "/api/workspace-state") return new Promise(() => {});
      if (url.startsWith("/api/conversations")) return new Promise(() => {});
      return Promise.resolve({});
    });
    localStorage.setItem(
      "listen:conversation-page:v1:/api/conversations?limit=20&offset=0",
      JSON.stringify({
        conversations: [
          {
            id: "cached-1",
            title: "Cached Planning",
            source: "fireflies",
            source_url: null,
            started_at: "2026-05-14T14:00:00Z",
            duration_secs: 1200,
            summary: "Roadmap",
            created_at: "2026-05-14T14:30:00Z",
            participant_count: 2,
          },
        ],
        total: 1,
        cachedAt: "2026-05-14T14:30:00.000Z",
      }),
    );

    render(<App />);
    fireEvent.click(screen.getAllByRole("button", { name: /open app/i })[0]);

    expect(await screen.findByText("Cached Planning")).toBeInTheDocument();
    expect(screen.queryByText("Checking workspace state.")).not.toBeInTheDocument();
    expect(screen.getByText(/checking workspace access/i)).toBeInTheDocument();
  });

  it("falls back to direct TinyCloud sign-in when backend bootstrap is offline", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("backend offline"))),
    );
    mockTinyCloudConversationPage([
      {
        id: "01OFFLINE",
        title: "Offline Planning",
        source: "fireflies",
        source_url: null,
        started_at: "2026-05-14T14:00:00Z",
        duration_secs: 1200,
        summary: "Roadmap",
        created_at: "2026-05-14T14:30:00Z",
        participant_count: 2,
      },
    ]);

    await renderAndSignIn();

    expect(await screen.findByText("Offline Planning")).toBeInTheDocument();
    expectLastSignInUsedLocalManifest();
    expect(requestNonce).not.toHaveBeenCalled();
    expect(verifySession).not.toHaveBeenCalled();
    expect(createApiClient).not.toHaveBeenCalled();
    expect(mockGet).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Backend offline\. Sync and source setup are unavailable/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reconnect backend/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sync fireflies/i })).not.toBeInTheDocument();
  });

  it("does not silently fall back to direct mode during explicit backend reconnect", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("backend offline"))),
    );
    mockTinyCloudConversationPage([
      {
        id: "01OFFLINE",
        title: "Offline Planning",
        source: "fireflies",
        source_url: null,
        started_at: "2026-05-14T14:00:00Z",
        duration_secs: 1200,
        summary: "Roadmap",
        created_at: "2026-05-14T14:30:00Z",
        participant_count: 2,
      },
    ]);

    await renderAndSignIn();
    expect(await screen.findByText("Offline Planning")).toBeInTheDocument();
    expect(createAndSignIn).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /reconnect backend/i }));

    await waitFor(() => {
      expect(screen.getByText(/Backend reconnect failed:/i)).toBeInTheDocument();
    });
    expect(createAndSignIn).toHaveBeenCalledTimes(1);
  });

  it("falls back to direct TinyCloud sign-in when nonce request fails", async () => {
    vi.mocked(requestNonce).mockRejectedValueOnce(new Error("nonce unavailable"));

    await renderAndSignIn();

    await screen.findAllByText(/Backend offline/i);
    expectLastSignInUsedLocalManifest();
    expect(verifySession).not.toHaveBeenCalled();
    expect(createApiClient).not.toHaveBeenCalled();
    expect(sendDelegation).not.toHaveBeenCalled();
  });

  it("falls back to a local-manifest TinyCloud session when backend verification fails", async () => {
    vi.mocked(verifySession).mockRejectedValueOnce(new Error("verify unavailable"));

    await renderAndSignIn();

    await waitFor(() => {
      expect(createAndSignIn).toHaveBeenCalledTimes(2);
    });
    await screen.findAllByText(/Backend offline/i);
    expect(verifySession).toHaveBeenCalledWith(
      "http://localhost:3001",
      "mock-siwe",
      "mock-signature",
    );
    expectLastSignInUsedLocalManifest();
    expect(createApiClient).not.toHaveBeenCalled();
    expect(sendDelegation).not.toHaveBeenCalled();
  });

  it("does not renew backend delegation just because the connected workspace sees an expired record", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/api/workspace-state") {
        return Promise.resolve(
          workspaceState({
            delegation: {
              status: "expired",
              stored: false,
              validPolicy: false,
              expiresAt: "2026-05-10T00:46:27.000Z",
              activation: "unknown",
            },
            backendReadableSecrets: {
              fireflies: { readable: null },
              granola: { readable: null },
              soundcoreAuthToken: { readable: null },
              soundcoreUid: { readable: null },
              soundcoreOpenudid: { readable: null },
              assemblyai: { readable: null },
              deepgram: { readable: null },
            },
          }),
        );
      }
      if (url.startsWith("/api/conversations")) {
        return Promise.resolve({ conversations: [], total: 0 });
      }
      return Promise.resolve({});
    });

    await renderAndSignIn();

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/api/workspace-state");
    });
    expect(sendDelegation).not.toHaveBeenCalled();
    expect(createManifestDelegation).not.toHaveBeenCalled();
  });

  it("silently renews the backend delegation when sign-in finds the stored one expired", async () => {
    vi.mocked(checkDelegationStatus).mockResolvedValue({
      status: "expired",
      expiresAt: "2026-05-01T00:00:00.000Z",
    });

    await renderAndSignIn();

    await waitFor(() => {
      expect(sendDelegation).toHaveBeenCalledTimes(1);
    });
    expect(sendDelegation).toHaveBeenCalledWith(
      expect.any(String),
      "mock-delegation",
      "mock-token",
    );
    expect(createManifestDelegation).toHaveBeenCalledWith(
      expect.anything(),
      "did:key:backend",
      expect.objectContaining({
        delegationTargets: expect.arrayContaining([
          expect.objectContaining({ did: "did:key:backend" }),
        ]),
      }),
    );
    // Core manifest delegation covers the full backend policy; the
    // secret-scoped variant is reserved for explicit setup actions.
    expect(createPermissionDelegation).not.toHaveBeenCalled();
  });

  it("renews at sign-in when the delegation row is gone but a prior grant is recorded", async () => {
    recordBackendDelegationGrant("0xabc123", "did:key:backend");
    // Default checkDelegationStatus mock reports status "none" (row deleted).

    await renderAndSignIn();

    await waitFor(() => {
      expect(sendDelegation).toHaveBeenCalledTimes(1);
    });
    expect(createManifestDelegation).toHaveBeenCalledTimes(1);
  });

  it("silently renews the backend delegation during session restore", async () => {
    storeBackendSession();
    vi.mocked(loadPersistedSession).mockReturnValue({
      address: "0xabc123",
      chainId: 1,
      did: "did:pkh:eip155:1:0xabc123",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      spaceId: "tinycloud:pkh:eip155:1:0xabc123:applications",
    });
    vi.mocked(restoreTinyCloudWeb).mockResolvedValue({
      tcw: {
        did: "did:pkh:eip155:1:0xabc123",
        hosts: ["http://localhost:5112"],
        spaceId: "tinycloud:pkh:eip155:1:0xabc123:applications",
        signOut: vi.fn(),
      },
    } as never);
    vi.mocked(checkDelegationStatus).mockResolvedValue({
      status: "expired",
      expiresAt: "2026-05-01T00:00:00.000Z",
    });

    render(<App />);
    fireEvent.click(screen.getAllByRole("button", { name: /open app/i })[0]);

    await waitFor(() => {
      expect(sendDelegation).toHaveBeenCalledTimes(1);
    });
    expect(createAndSignIn).not.toHaveBeenCalled();
    expect(connectWallet).not.toHaveBeenCalled();
  });

  it("does not renew during session restore when the user never granted", async () => {
    storeBackendSession();
    vi.mocked(loadPersistedSession).mockReturnValue({
      address: "0xabc123",
      chainId: 1,
      did: "did:pkh:eip155:1:0xabc123",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      spaceId: "tinycloud:pkh:eip155:1:0xabc123:applications",
    });
    vi.mocked(restoreTinyCloudWeb).mockResolvedValue({
      tcw: {
        did: "did:pkh:eip155:1:0xabc123",
        hosts: ["http://localhost:5112"],
        spaceId: "tinycloud:pkh:eip155:1:0xabc123:applications",
        signOut: vi.fn(),
      },
    } as never);
    // Default checkDelegationStatus mock reports "none" and no grant record
    // exists — silent renewal must not turn into an implicit first grant.

    render(<App />);
    fireEvent.click(screen.getAllByRole("button", { name: /open app/i })[0]);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/api/workspace-state");
    });
    expect(sendDelegation).not.toHaveBeenCalled();
    expect(createManifestDelegation).not.toHaveBeenCalled();
  });

  it("does not treat an unreadable Fireflies secret as connected during sign-in", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/api/workspace-state") {
        return Promise.resolve(
          workspaceState({
            backendReadableSecrets: {
              fireflies: { readable: false },
              granola: { readable: true },
              soundcoreAuthToken: { readable: true },
              soundcoreUid: { readable: true },
              soundcoreOpenudid: { readable: true },
              assemblyai: { readable: true },
              deepgram: { readable: true },
            },
          }),
        );
      }
      if (url === "/api/config/fireflies-key/exists") {
        return Promise.resolve({ exists: false });
      }
      if (url === "/api/config/google-meet/connected") {
        return Promise.resolve({ connected: false });
      }
      if (url.startsWith("/api/conversations")) {
        return Promise.resolve({ conversations: [], total: 0 });
      }
      return Promise.resolve({});
    });

    await renderAndSignIn();

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/api/workspace-state");
    });
    expect(screen.queryByText(/finish fireflies access/i)).not.toBeInTheDocument();
    expect(mockGet).not.toHaveBeenCalledWith("/api/webhooks/fireflies/pending");
  });

  it("opens Soundcore credential setup from Connections when another source is connected", async () => {
    mockSecretGet.mockImplementation((secretName: string) => {
      if (secretName.startsWith("SOUNDCORE_")) {
        return Promise.resolve({
          ok: false,
          error: { code: "key_not_found", message: "Secret not found" },
        });
      }
      return Promise.resolve({ ok: true, data: "saved-secret" });
    });

    await renderAndSignIn();

    fireEvent.click(await screen.findByRole("button", { name: /^settings$/i }));

    await waitFor(() => {
      expect(screen.getAllByRole("heading", { name: /connections/i }).length).toBeGreaterThan(0);
    });
    expect(await screen.findByText(/available connections/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /add credentials/i }));

    expect(await screen.findByText(/Soundcore web session/i)).toBeInTheDocument();
    expect(screen.getByText(/Paste Soundcore values/i)).toBeInTheDocument();
  });

  it("detects saved Soundcore credentials after reload", async () => {
    mockSecretGet.mockImplementation((secretName: string) => {
      if (secretName.startsWith("SOUNDCORE_")) {
        return Promise.resolve({ ok: true, data: "saved-soundcore-secret" });
      }
      return Promise.resolve({
        ok: false,
        error: { code: "key_not_found", message: "Secret not found" },
      });
    });
    mockGet.mockImplementation((url: string) => {
      if (url === "/api/workspace-state") {
        return Promise.resolve(
          workspaceState({
            backendReadableSecrets: {
              fireflies: { readable: false },
              granola: { readable: false },
              soundcoreAuthToken: { readable: true },
              soundcoreUid: { readable: true },
              soundcoreOpenudid: { readable: true },
              assemblyai: { readable: false },
              deepgram: { readable: false },
            },
            conversations: { hasAny: true, total: 1 },
          }),
        );
      }
      if (url === "/api/webhooks/google-meet/check") {
        return Promise.resolve({ status: "not_configured" });
      }
      if (url.startsWith("/api/conversations")) {
        return Promise.resolve({ conversations: [], total: 1 });
      }
      return Promise.resolve({});
    });

    await renderAndSignIn();

    await waitFor(() => {
      expect(screen.getByText(/connected · 1 source/i)).toBeInTheDocument();
    });

    fireEvent.click(await screen.findByRole("button", { name: /^settings$/i }));

    await waitFor(() => {
      expect(screen.getAllByText("Soundcore").length).toBeGreaterThan(0);
    });
    expect(screen.queryByRole("button", { name: /add credentials/i })).not.toBeInTheDocument();
  });

  it("filters the library to a source when its sidebar row is clicked", async () => {
    await renderAndSignIn();

    fireEvent.click(await screen.findByRole("button", { name: /^Fireflies$/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /fireflies transcripts/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/library \/ fireflies/i)).toBeInTheDocument();
  });

  it("shows banner when pending items were processed", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/api/workspace-state") {
        return Promise.resolve(workspaceState());
      }
      if (url === "/api/config/fireflies-key/exists") {
        return Promise.resolve({ exists: true });
      }
      if (url === "/api/config/google-meet/connected") {
        return Promise.resolve({ connected: false });
      }
      if (url === "/api/config/webhook-status") {
        return Promise.resolve({ configured: true, pendingCount: 0, webhookUrl: "" });
      }
      if (url === "/api/webhooks/fireflies/pending") {
        return Promise.resolve({
          processed: [
            { status: "created", meetingId: "m1", conversationId: "c1", title: "Meeting 1" },
            { status: "created", meetingId: "m2", conversationId: "c2", title: "Meeting 2" },
          ],
          skipped: [],
          errors: [],
        });
      }
      if (url.startsWith("/api/conversations")) {
        return Promise.resolve({ conversations: [], total: 0 });
      }
      return Promise.resolve({});
    });

    await renderAndSignIn();

    await waitFor(() => {
      expect(screen.getByText(/processed 2 new transcripts from webhooks/i)).toBeInTheDocument();
    });
  });

  it("does not show banner when no pending items processed", async () => {
    await renderAndSignIn();

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/api/webhooks/fireflies/pending");
    });

    expect(screen.queryByText(/processed.*transcripts from webhooks/i)).not.toBeInTheDocument();
  });

  it("does not block app load if pending processing fails", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/api/workspace-state") {
        return Promise.resolve(workspaceState());
      }
      if (url === "/api/config/fireflies-key/exists") {
        return Promise.resolve({ exists: true });
      }
      if (url === "/api/config/google-meet/connected") {
        return Promise.resolve({ connected: false });
      }
      if (url === "/api/config/webhook-status") {
        return Promise.resolve({ configured: false, pendingCount: 0, webhookUrl: "" });
      }
      if (url === "/api/webhooks/fireflies/pending") {
        return Promise.reject(new Error("server error"));
      }
      if (url.startsWith("/api/conversations")) {
        return Promise.resolve({ conversations: [], total: 0 });
      }
      return Promise.resolve({});
    });

    await renderAndSignIn();

    // App should still render (not crash)
    await waitFor(() => {
      expect(screen.getByText(/^listen$/i)).toBeInTheDocument();
    });
  });

  it("shows singular message for 1 processed transcript", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/api/workspace-state") {
        return Promise.resolve(workspaceState());
      }
      if (url === "/api/config/fireflies-key/exists") {
        return Promise.resolve({ exists: true });
      }
      if (url === "/api/config/google-meet/connected") {
        return Promise.resolve({ connected: false });
      }
      if (url === "/api/config/webhook-status") {
        return Promise.resolve({ configured: true, pendingCount: 0, webhookUrl: "" });
      }
      if (url === "/api/webhooks/fireflies/pending") {
        return Promise.resolve({
          processed: [
            { status: "created", meetingId: "m1", conversationId: "c1", title: "Meeting 1" },
          ],
          skipped: [],
          errors: [],
        });
      }
      if (url.startsWith("/api/conversations")) {
        return Promise.resolve({ conversations: [], total: 0 });
      }
      return Promise.resolve({});
    });

    await renderAndSignIn();

    await waitFor(() => {
      expect(screen.getByText(/processed 1 new transcript from webhooks/i)).toBeInTheDocument();
    });
  });

  it("checks workspace state after manual sign-in", async () => {
    await renderAndSignIn();

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/api/workspace-state");
    });
  });

  it("does not disconnect Fireflies when confirmation is cancelled", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);

    await renderAndSignIn();
    await openUserMenu();
    fireEvent.click(await screen.findByRole("button", { name: /disconnect fireflies/i }));

    expect(window.confirm).toHaveBeenCalledWith(expect.stringMatching(/disconnect fireflies/i));
    expect(mockSecretDelete).not.toHaveBeenCalled();
  });

  it("disconnects Fireflies after confirmation", async () => {
    await renderAndSignIn();
    await openUserMenu();
    fireEvent.click(await screen.findByRole("button", { name: /disconnect fireflies/i }));

    await waitFor(() => {
      expect(mockSecretDelete).toHaveBeenCalledWith("FIREFLIES_API_KEY");
    });
  });

  it("shows the under-development state when chat beta is disabled", async () => {
    await renderAndSignIn();

    fireEvent.click(await screen.findByRole("button", { name: /chat/i }));

    expect(await screen.findByText(/chat is under development/i)).toBeInTheDocument();
    expect(screen.queryByText(/ask about your synced transcripts/i)).not.toBeInTheDocument();
    expect(mockGet).not.toHaveBeenCalledWith("/api/conversations?limit=100&offset=0");
  });

  it("renders chat when the chat beta flag is enabled", async () => {
    vi.stubEnv("VITE_ENABLE_CHAT", "true");

    await renderAndSignIn();
    mockTinyCloudQuery.mockClear();

    fireEvent.click(await screen.findByRole("button", { name: /chat/i }));

    expect(await screen.findByText(/ask about your synced transcripts/i)).toBeInTheDocument();
    expect(screen.queryByText(/chat is under development/i)).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mockTinyCloudQuery).toHaveBeenCalledWith(
        expect.stringContaining("participant_count"),
        [100, 0],
      );
    });
    expect(mockGet).not.toHaveBeenCalledWith("/api/conversations?limit=100&offset=0");
  });
});

// ── Google Meet Webhook Tests ─────────────────────────────────────────

/**
 * Helper: builds a mockGet implementation with Google Meet connected
 * and optional overrides for check / pending endpoints.
 */
function gmMockGet(overrides: Record<string, unknown> = {}) {
  return (url: string) => {
    if (url === "/api/workspace-state") {
      return Promise.resolve(
        workspaceState({
          googleMeet: { available: true, connected: true },
        }),
      );
    }
    if (url === "/api/config/fireflies-key/exists") {
      return Promise.resolve({ exists: true });
    }
    if (url === "/api/config/google-meet/connected") {
      return Promise.resolve({ connected: true });
    }
    if (url === "/api/config/webhook-status") {
      return Promise.resolve({ configured: true, pendingCount: 0, webhookUrl: "" });
    }
    if (url === "/api/webhooks/fireflies/pending") {
      return Promise.resolve({ processed: [], skipped: [], errors: [] });
    }
    if (url === "/api/webhooks/google-meet/check") {
      return Promise.resolve(overrides["google-meet/check"] ?? { status: "not_configured" });
    }
    if (url === "/api/webhooks/google-meet/pending") {
      return Promise.resolve(
        overrides["google-meet/pending"] ?? { processed: [], skipped: [], errors: [] },
      );
    }
    if (url.startsWith("/api/conversations")) {
      return Promise.resolve({ conversations: [], total: 0 });
    }
    return Promise.resolve({});
  };
}

describe("Google Meet webhook check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("localStorage", createMockStorage());
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    mockAuthFlow();
    mockPost.mockResolvedValue({ updated: 0, still_missing: 0 });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("calls Google Meet webhook check after manual sign-in when Google Meet is connected", async () => {
    mockGet.mockImplementation(gmMockGet());

    await renderAndSignIn();

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/api/webhooks/google-meet/check");
    });
  });

  it("shows lapsed banner when webhook check returns lapsed status", async () => {
    mockGet.mockImplementation(gmMockGet({ "google-meet/check": { status: "lapsed" } }));

    await renderAndSignIn();

    await waitFor(() => {
      expect(screen.getByText(/real-time sync was inactive/i)).toBeInTheDocument();
    });
    expect(screen.getByText("Sync Now")).toBeInTheDocument();
  });

  it("does not show lapsed banner when webhook check returns active", async () => {
    mockGet.mockImplementation(gmMockGet({ "google-meet/check": { status: "active" } }));

    await renderAndSignIn();

    // Wait for the check call to complete
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/api/webhooks/google-meet/check");
    });

    expect(screen.queryByText(/real-time sync was inactive/i)).not.toBeInTheDocument();
  });

  it("Sync Now button on lapsed banner triggers manual sync", async () => {
    mockGet.mockImplementation(gmMockGet({ "google-meet/check": { status: "lapsed" } }));

    await renderAndSignIn();

    await waitFor(() => {
      expect(screen.getByText("Sync Now")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Sync Now"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/api/sync/google-meet");
    });
  });

  it("dismiss button hides lapsed banner", async () => {
    mockGet.mockImplementation(gmMockGet({ "google-meet/check": { status: "lapsed" } }));

    await renderAndSignIn();

    await waitFor(() => {
      expect(screen.getByText(/real-time sync was inactive/i)).toBeInTheDocument();
    });

    // The dismiss button renders as × character
    const dismissBtn = screen.getAllByRole("button").find((btn) => btn.textContent === "\u00d7");
    expect(dismissBtn).toBeTruthy();
    fireEvent.click(dismissBtn!);

    await waitFor(() => {
      expect(screen.queryByText(/real-time sync was inactive/i)).not.toBeInTheDocument();
    });
  });

  it("calls Google Meet pending endpoint when Google Meet is connected", async () => {
    mockGet.mockImplementation(gmMockGet());

    await renderAndSignIn();

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/api/webhooks/google-meet/pending");
    });
  });

  it("shows banner when Google Meet pending items processed", async () => {
    mockGet.mockImplementation(
      gmMockGet({
        "google-meet/pending": {
          processed: [{ id: 1 }, { id: 2 }],
          skipped: [],
          errors: [],
        },
      }),
    );

    await renderAndSignIn();

    await waitFor(() => {
      expect(
        screen.getByText(/processed 2 google meet transcripts from webhooks/i),
      ).toBeInTheDocument();
    });
  });

  it("does not disconnect Google Meet when confirmation is cancelled", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    mockGet.mockImplementation(gmMockGet());

    await renderAndSignIn();
    await openUserMenu();
    fireEvent.click(await screen.findByRole("button", { name: /disconnect google meet/i }));

    expect(window.confirm).toHaveBeenCalledWith(expect.stringMatching(/disconnect google meet/i));
    expect(mockDel).not.toHaveBeenCalledWith("/api/config/google-meet");
  });

  it("disconnects Google Meet after confirmation", async () => {
    mockGet.mockImplementation(gmMockGet());

    await renderAndSignIn();
    await openUserMenu();
    fireEvent.click(await screen.findByRole("button", { name: /disconnect google meet/i }));

    await waitFor(() => {
      expect(mockDel).toHaveBeenCalledWith("/api/config/google-meet");
    });
  });
});
