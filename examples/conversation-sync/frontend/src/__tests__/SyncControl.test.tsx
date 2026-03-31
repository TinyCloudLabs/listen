import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { SyncControl } from "../components/SyncControl";
import type { ApiClient } from "@tinyboilerplate/client";

function mockApi(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    get: vi.fn().mockResolvedValue({ configured: false, pendingCount: 0, webhookUrl: "" }),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
    ...overrides,
  };
}

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

describe("SyncControl", () => {
  let api: ApiClient;
  let onSyncComplete: ReturnType<typeof vi.fn>;
  const getAccessToken = vi.fn().mockReturnValue("test-token");

  beforeEach(() => {
    api = mockApi();
    onSyncComplete = vi.fn();
    vi.stubGlobal("localStorage", createMockStorage());
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders Sync All and Reset buttons", () => {
    render(
      <SyncControl
        api={api}
        backendUrl="http://localhost:3001"
        getAccessToken={getAccessToken}
        onSyncComplete={onSyncComplete}
      />,
    );
    expect(screen.getByRole("button", { name: /sync all/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
  });

  it("fetches webhook status on mount", async () => {
    const getMock = vi.fn().mockResolvedValue({
      configured: true,
      pendingCount: 0,
      webhookUrl: "http://localhost:3001/api/webhooks/fireflies",
    });
    api = mockApi({ get: getMock });

    render(
      <SyncControl
        api={api}
        backendUrl="http://localhost:3001"
        getAccessToken={getAccessToken}
        onSyncComplete={onSyncComplete}
      />,
    );

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith("/api/config/webhook-status");
    });
  });

  it("shows 'Live' badge when webhook is configured", async () => {
    const getMock = vi.fn().mockResolvedValue({
      configured: true,
      pendingCount: 0,
      webhookUrl: "http://localhost:3001/api/webhooks/fireflies",
    });
    api = mockApi({ get: getMock });

    render(
      <SyncControl
        api={api}
        backendUrl="http://localhost:3001"
        getAccessToken={getAccessToken}
        onSyncComplete={onSyncComplete}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/live/i)).toBeInTheDocument();
    });
  });

  it("does not show Live badge when webhook is not configured", async () => {
    const getMock = vi.fn().mockResolvedValue({
      configured: false,
      pendingCount: 0,
      webhookUrl: "http://localhost:3001/api/webhooks/fireflies",
    });
    api = mockApi({ get: getMock });

    render(
      <SyncControl
        api={api}
        backendUrl="http://localhost:3001"
        getAccessToken={getAccessToken}
        onSyncComplete={onSyncComplete}
      />,
    );

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith("/api/config/webhook-status");
    });

    expect(screen.queryByText(/live/i)).not.toBeInTheDocument();
  });

  it("shows pending count when there are pending items", async () => {
    const getMock = vi.fn().mockResolvedValue({
      configured: true,
      pendingCount: 3,
      webhookUrl: "http://localhost:3001/api/webhooks/fireflies",
    });
    api = mockApi({ get: getMock });

    render(
      <SyncControl
        api={api}
        backendUrl="http://localhost:3001"
        getAccessToken={getAccessToken}
        onSyncComplete={onSyncComplete}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/transcripts queued from webhook/i)).toBeInTheDocument();
    });
  });

  it("does not show webhook badge if fetch fails", async () => {
    const getMock = vi.fn().mockRejectedValue(new Error("fetch failed"));
    api = mockApi({ get: getMock });

    render(
      <SyncControl
        api={api}
        backendUrl="http://localhost:3001"
        getAccessToken={getAccessToken}
        onSyncComplete={onSyncComplete}
      />,
    );

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith("/api/config/webhook-status");
    });

    expect(screen.queryByText(/live/i)).not.toBeInTheDocument();
  });

  it("displays last synced time from localStorage", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T15:10:00Z"));
    localStorage.setItem("lastSyncTimestamp", new Date("2026-03-24T15:00:00Z").toISOString());

    render(
      <SyncControl
        api={api}
        backendUrl="http://localhost:3001"
        getAccessToken={getAccessToken}
        onSyncComplete={onSyncComplete}
      />,
    );
    expect(screen.getByText(/10 min ago/i)).toBeInTheDocument();
  });
});
