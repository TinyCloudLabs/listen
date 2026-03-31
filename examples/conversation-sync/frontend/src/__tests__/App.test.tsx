import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";

// ── Mocks ────────────────────────────────────────────────────────────

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDel = vi.fn();

const mockApiClient = { get: mockGet, post: mockPost, put: mockPut, del: mockDel };

vi.mock("@tinyboilerplate/client", () => {
  class MockTokenStore {
    hasTokens() {
      return true;
    }
    isExpired() {
      return false;
    }
    getAddress() {
      return "0xabc123";
    }
    getAccessToken() {
      return "mock-token";
    }
    setTokens() {}
    clear() {}
  }
  return {
    openKeySignIn: vi.fn(),
    createAndSignIn: vi.fn(),
    createApiClient: vi.fn(() => mockApiClient),
    createDelegation: vi.fn(),
    sendDelegation: vi.fn(),
    checkDelegationStatus: vi.fn().mockResolvedValue({ status: "active" }),
    revokeDelegation: vi.fn(),
    TokenStore: MockTokenStore,
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

    // Default: fireflies key exists, webhook status OK, no pending
    mockGet.mockImplementation((url: string) => {
      if (url === "/api/config/fireflies-key/exists") {
        return Promise.resolve({ exists: true });
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
});
