import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";

// ── Mocks ────────────────────────────────────────────────────────────

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDel = vi.fn();

const mockApiClient = { get: mockGet, post: mockPost, put: mockPut, del: mockDel };

vi.mock("@tinyboilerplate/client", () => {
  class MockSessionStore {
    hasSession() {
      return true;
    }
    isExpired() {
      return false;
    }
    getAddress() {
      return "0xabc123";
    }
    getToken() {
      return "mock-token";
    }
    setSession() {}
    clear() {}
  }
  return {
    connectWallet: vi.fn(),
    requestNonce: vi.fn(),
    verifySession: vi.fn(),
    createAndSignIn: vi.fn(),
    createApiClient: vi.fn(() => mockApiClient),
    createDelegation: vi.fn(),
    sendDelegation: vi.fn(),
    checkDelegationStatus: vi.fn().mockResolvedValue({ status: "active" }),
    revokeDelegation: vi.fn(),
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

// ── Tests ────────────────────────────────────────────────────────────

describe("App auto-process pending", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("localStorage", createMockStorage());

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

  it("calls pending endpoint after session restore with active delegation", async () => {
    render(<App />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/api/webhooks/fireflies/pending");
    });
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

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/processed 2 new transcripts from webhooks/i)).toBeInTheDocument();
    });
  });

  it("does not show banner when no pending items processed", async () => {
    render(<App />);

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

    render(<App />);

    // App should still render (not crash)
    await waitFor(() => {
      expect(screen.getByText(/conversation sync/i)).toBeInTheDocument();
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

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/processed 1 new transcript from webhooks/i)).toBeInTheDocument();
    });
  });

  it("checks google-meet connected status after session restore", async () => {
    render(<App />);
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/api/config/google-meet/connected");
    });
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
    mockPost.mockResolvedValue({ updated: 0, still_missing: 0 });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("calls Google Meet webhook check after session restore when Google Meet is connected", async () => {
    mockGet.mockImplementation(gmMockGet());

    render(<App />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/api/webhooks/google-meet/check");
    });
  });

  it("shows lapsed banner when webhook check returns lapsed status", async () => {
    mockGet.mockImplementation(gmMockGet({ "google-meet/check": { status: "lapsed" } }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/real-time sync was inactive/i)).toBeInTheDocument();
    });
    expect(screen.getByText("Sync Now")).toBeInTheDocument();
  });

  it("does not show lapsed banner when webhook check returns active", async () => {
    mockGet.mockImplementation(gmMockGet({ "google-meet/check": { status: "active" } }));

    render(<App />);

    // Wait for the check call to complete
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/api/webhooks/google-meet/check");
    });

    expect(screen.queryByText(/real-time sync was inactive/i)).not.toBeInTheDocument();
  });

  it("Sync Now button on lapsed banner triggers manual sync", async () => {
    mockGet.mockImplementation(gmMockGet({ "google-meet/check": { status: "lapsed" } }));

    render(<App />);

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

    render(<App />);

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

    render(<App />);

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

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText(/processed 2 google meet transcripts from webhooks/i),
      ).toBeInTheDocument();
    });
  });
});
