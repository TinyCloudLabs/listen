import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import {
  checkDelegationStatus,
  composeManifestWithDelegatees,
  connectWallet,
  createAndSignIn,
  createManifestDelegation,
  clearPersistedSession,
  loadPersistedSession,
  requestNonce,
  sendDelegation,
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
const mockSecretDelete = vi.fn();
const mockTinyCloudQuery = vi.fn();
const mockTinyCloudKvGet = vi.fn();

const mockApiClient = { get: mockGet, post: mockPost, put: mockPut, del: mockDel };

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
    createApiClient: vi.fn(() => mockApiClient),
    createManifestDelegation: vi.fn(),
    clearPersistedSession: vi.fn(),
    loadPersistedSession: vi.fn(() => null),
    sendDelegation: vi.fn(),
    checkDelegationStatus: vi.fn().mockResolvedValue({ status: "active" }),
    revokeDelegation: vi.fn(),
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
    SessionStore: MockSessionStore,
  };
});

import { App } from "../App";

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
    web3Provider: {},
  });
  vi.mocked(requestNonce).mockResolvedValue("mock-nonce");
  vi.mocked(createAndSignIn).mockResolvedValue({
    tcw: {
      did: "did:pkh:eip155:1:0xabc123",
      hosts: ["http://localhost:5112"],
      secrets: {
        unlock: vi.fn().mockResolvedValue({ ok: true }),
        get: vi.fn().mockResolvedValue({ ok: true, data: "fireflies-key" }),
        delete: mockSecretDelete,
      },
      sql: {
        db: vi.fn(() => ({ query: mockTinyCloudQuery })),
      },
      kv: {
        get: mockTinyCloudKvGet,
      },
      signOut: vi.fn(),
    },
    session: { siwe: "mock-siwe", signature: "mock-signature" },
  });
  vi.mocked(verifySession).mockResolvedValue({ token: "mock-token", expiresIn: 3600 });
  vi.mocked(checkDelegationStatus).mockResolvedValue({ status: "active" });
  vi.mocked(createManifestDelegation).mockResolvedValue({
    serialized: "mock-delegation",
    prompted: false,
  });
  vi.mocked(sendDelegation).mockResolvedValue({
    status: "active",
    expiresAt: "2026-05-18T00:00:00.000Z",
  });
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
    mockSecretDelete.mockResolvedValue({ ok: true });
    mockTinyCloudConversationPage([]);
    mockTinyCloudKvGet.mockResolvedValue({ ok: true, data: { data: null } });

    // Default: backfill returns no updates
    mockPost.mockResolvedValue({ updated: 0, still_missing: 0 });

    // Default: fireflies key exists, google-meet not connected, webhook status OK, no pending
    mockGet.mockImplementation((url: string) => {
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

  it("restores a valid stored backend session on load without a fresh SIWE flow", async () => {
    storeBackendSession();
    vi.mocked(loadPersistedSession).mockReturnValue({
      address: "0xabc123",
      chainId: 1,
      did: "did:pkh:eip155:1:0xabc123",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });

    render(<App />);

    expect(await screen.findByText("0xabc1…c123")).toBeInTheDocument();
    expect(connectWallet).not.toHaveBeenCalled();
    expect(requestNonce).not.toHaveBeenCalled();
    expect(createAndSignIn).not.toHaveBeenCalled();
    expect(verifySession).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(checkDelegationStatus).toHaveBeenCalledWith(
        "http://localhost:3001",
        "persisted-token",
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

  it("posts backend delegation after manual sign-in when none is stored", async () => {
    vi.mocked(checkDelegationStatus)
      .mockResolvedValueOnce({ status: "none", expiresAt: null })
      .mockResolvedValue({ status: "active" });

    await renderAndSignIn();

    await waitFor(() => {
      expect(sendDelegation).toHaveBeenCalledWith(
        "http://localhost:3001",
        "mock-delegation",
        "mock-token",
      );
    });
    expect(createManifestDelegation).toHaveBeenCalledWith(
      expect.objectContaining({ did: "did:pkh:eip155:1:0xabc123" }),
      "did:key:backend",
      expect.objectContaining({
        delegationTargets: expect.arrayContaining([
          expect.objectContaining({ did: "did:key:backend" }),
        ]),
      }),
    );
  });

  it("keeps the frontend signed in when the backend delegation status check fails", async () => {
    vi.mocked(checkDelegationStatus).mockRejectedValueOnce(
      new Error("Failed to check delegation status: Too many delegation requests"),
    );

    await renderAndSignIn();

    await waitFor(() => {
      expect(checkDelegationStatus).toHaveBeenCalledWith("http://localhost:3001", "mock-token");
    });
    expect(await screen.findByText("0xabc1…c123")).toBeInTheDocument();
    expect(createManifestDelegation).not.toHaveBeenCalled();
    expect(sendDelegation).not.toHaveBeenCalled();
  });

  it("renders direct TinyCloud conversations while backend delegation status is still loading", async () => {
    let resolveDelegationStatus!: (value: { status: "active" }) => void;
    vi.mocked(checkDelegationStatus).mockReturnValue(
      new Promise((resolve) => {
        resolveDelegationStatus = resolve;
      }),
    );
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

    resolveDelegationStatus({ status: "active" });
  });

  it("renews backend delegation when the connected workspace sees an expired record", async () => {
    vi.mocked(checkDelegationStatus).mockResolvedValueOnce({
      status: "expired",
      expiresAt: "2026-05-10T00:46:27.000Z",
    });

    await renderAndSignIn();

    await waitFor(() => {
      expect(sendDelegation).toHaveBeenCalledWith(
        "http://localhost:3001",
        "mock-delegation",
        "mock-token",
      );
    });
  });

  it("requires Fireflies access when the backend cannot read the shared secret", async () => {
    mockGet.mockImplementation((url: string) => {
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
      expect(screen.getAllByText(/finish fireflies access/i).length).toBeGreaterThan(0);
    });
    expect(mockGet).not.toHaveBeenCalledWith("/api/webhooks/fireflies/pending");
  });

  it("shows banner when pending items were processed", async () => {
    mockGet.mockImplementation((url: string) => {
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

  it("checks google-meet connected status after manual sign-in", async () => {
    await renderAndSignIn();

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/api/config/google-meet/connected");
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
