import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import { SyncControl } from "../components/SyncControl";
import type { ApiClient } from "@listen/client";

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

function firefliesJob(overrides: Record<string, unknown> = {}) {
  return {
    id: "job-1",
    source: "fireflies",
    status: "queued",
    mode: "incremental",
    synced: 0,
    repaired: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    ...overrides,
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

  it("renders Sync Fireflies and Reset buttons when hasFireflies is true", () => {
    render(
      <SyncControl
        api={api}
        backendUrl="http://localhost:3001"
        getAccessToken={getAccessToken}
        onSyncComplete={onSyncComplete}
        hasFireflies={true}
      />,
    );
    expect(screen.getByRole("button", { name: /sync fireflies/i })).toBeInTheDocument();
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
        hasFireflies={true}
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
        hasFireflies={true}
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

  it("starts Fireflies as a background job and polls until completion", async () => {
    const getMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/config/webhook-status") {
        return Promise.resolve({ configured: false, pendingCount: 0, webhookUrl: "" });
      }
      if (url === "/api/sync/fireflies/jobs/current") {
        return Promise.resolve(null);
      }
      if (url === "/api/sync/fireflies/jobs/job-1") {
        return Promise.resolve(
          firefliesJob({ status: "completed", synced: 2, total: 2, current: 2 }),
        );
      }
      return Promise.resolve(null);
    });
    const postMock = vi.fn().mockResolvedValue(firefliesJob());
    api = mockApi({ get: getMock, post: postMock });

    render(
      <SyncControl
        api={api}
        backendUrl="http://localhost:3001"
        getAccessToken={getAccessToken}
        onSyncComplete={onSyncComplete}
        hasFireflies={true}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /sync fireflies/i }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith("/api/sync/fireflies/jobs", { mode: "incremental" });
    });
    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith("/api/sync/fireflies/jobs/job-1");
    });
    await waitFor(() => {
      expect(onSyncComplete).toHaveBeenCalledTimes(1);
    });
  });

  it("retries a transient Fireflies job 404 after starting a background job", async () => {
    let jobPolls = 0;
    const getMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/config/webhook-status") {
        return Promise.resolve({ configured: false, pendingCount: 0, webhookUrl: "" });
      }
      if (url === "/api/sync/fireflies/jobs/current") {
        return Promise.resolve(null);
      }
      if (url === "/api/sync/fireflies/jobs/job-1") {
        jobPolls++;
        if (jobPolls === 1) {
          return Promise.reject(new Error("API error (404): Sync job not found."));
        }
        return Promise.resolve(
          firefliesJob({ status: "completed", synced: 2, total: 2, current: 2 }),
        );
      }
      return Promise.resolve(null);
    });
    const postMock = vi.fn().mockResolvedValue(firefliesJob({ status: "listing" }));
    api = mockApi({ get: getMock, post: postMock });

    render(
      <SyncControl
        api={api}
        backendUrl="http://localhost:3001"
        getAccessToken={getAccessToken}
        onSyncComplete={onSyncComplete}
        hasFireflies={true}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /sync fireflies/i }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith("/api/sync/fireflies/jobs", { mode: "incremental" });
    });
    await waitFor(
      () => {
        expect(jobPolls).toBeGreaterThanOrEqual(2);
      },
      { timeout: 3_000 },
    );
    expect(onSyncComplete).toHaveBeenCalledTimes(1);
  });

  it("resumes polling an active Fireflies job on mount", async () => {
    const getMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/config/webhook-status") {
        return Promise.resolve({ configured: false, pendingCount: 0, webhookUrl: "" });
      }
      if (url === "/api/sync/fireflies/jobs/current") {
        return Promise.resolve(firefliesJob({ status: "listing", totalListed: 12 }));
      }
      if (url === "/api/sync/fireflies/jobs/job-1") {
        return Promise.resolve(
          firefliesJob({ status: "completed", synced: 3, total: 3, current: 3 }),
        );
      }
      return Promise.resolve(null);
    });
    api = mockApi({ get: getMock });

    render(
      <SyncControl
        api={api}
        backendUrl="http://localhost:3001"
        getAccessToken={getAccessToken}
        onSyncComplete={onSyncComplete}
        hasFireflies={true}
      />,
    );

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith("/api/sync/fireflies/jobs/current");
    });
    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith("/api/sync/fireflies/jobs/job-1");
    });
    await waitFor(() => {
      expect(onSyncComplete).toHaveBeenCalledTimes(1);
    });
  });

  // ── New source-specific button tests ─────────────────────────────

  it("shows Sync Fireflies button when hasFireflies is true", () => {
    render(
      <SyncControl
        api={api}
        backendUrl="http://localhost:3001"
        getAccessToken={getAccessToken}
        onSyncComplete={onSyncComplete}
        hasFireflies={true}
        hasGoogleMeet={false}
      />,
    );
    expect(screen.getByRole("button", { name: /sync fireflies/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sync google meet/i })).not.toBeInTheDocument();
  });

  it("shows Sync Google Meet button when hasGoogleMeet is true", () => {
    // When hasGoogleMeet is true, the component also fetches GM webhook status
    const getMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/config/webhook-status")
        return Promise.resolve({ configured: false, pendingCount: 0, webhookUrl: "" });
      if (url === "/api/webhooks/google-meet/status")
        return Promise.resolve({
          enabled: false,
          subscriptionActive: false,
          expiresAt: null,
          pendingCount: 0,
          failedCount: 0,
        });
      return Promise.resolve({});
    });
    api = mockApi({ get: getMock });

    render(
      <SyncControl
        api={api}
        backendUrl="http://localhost:3001"
        getAccessToken={getAccessToken}
        onSyncComplete={onSyncComplete}
        hasFireflies={false}
        hasGoogleMeet={true}
      />,
    );
    expect(screen.queryByRole("button", { name: /sync fireflies/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sync google meet/i })).toBeInTheDocument();
  });

  it("shows Sync Granola button when hasGranola is true", () => {
    render(
      <SyncControl
        api={api}
        backendUrl="http://localhost:3001"
        getAccessToken={getAccessToken}
        onSyncComplete={onSyncComplete}
        hasFireflies={false}
        hasGranola={true}
        hasGoogleMeet={false}
      />,
    );
    expect(screen.queryByRole("button", { name: /sync fireflies/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sync granola/i })).toBeInTheDocument();
  });

  it("shows both sync buttons when both sources connected", () => {
    // When hasGoogleMeet is true, the component also fetches GM webhook status
    const getMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/config/webhook-status")
        return Promise.resolve({ configured: false, pendingCount: 0, webhookUrl: "" });
      if (url === "/api/webhooks/google-meet/status")
        return Promise.resolve({
          enabled: false,
          subscriptionActive: false,
          expiresAt: null,
          pendingCount: 0,
          failedCount: 0,
        });
      return Promise.resolve({});
    });
    api = mockApi({ get: getMock });

    render(
      <SyncControl
        api={api}
        backendUrl="http://localhost:3001"
        getAccessToken={getAccessToken}
        onSyncComplete={onSyncComplete}
        hasFireflies={true}
        hasGranola={true}
        hasGoogleMeet={true}
      />,
    );
    expect(screen.getByRole("button", { name: /sync fireflies/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sync granola/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sync google meet/i })).toBeInTheDocument();
  });

  // ── Google Meet webhook status tests ────────────────────────────────

  it("fetches Google Meet webhook status when hasGoogleMeet is true", async () => {
    const getMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/config/webhook-status")
        return Promise.resolve({ configured: false, pendingCount: 0, webhookUrl: "" });
      if (url === "/api/webhooks/google-meet/status")
        return Promise.resolve({
          enabled: true,
          subscriptionActive: false,
          expiresAt: null,
          pendingCount: 0,
          failedCount: 0,
        });
      return Promise.resolve({});
    });
    api = mockApi({ get: getMock });

    render(
      <SyncControl
        api={api}
        backendUrl="http://localhost:3001"
        getAccessToken={getAccessToken}
        onSyncComplete={onSyncComplete}
        hasGoogleMeet={true}
      />,
    );

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith("/api/webhooks/google-meet/status");
    });
  });

  it("shows Live badge with expiry for Google Meet when subscription is active", async () => {
    const fiveDaysFromNow = new Date(Date.now() + 5 * 86_400_000).toISOString();
    const getMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/config/webhook-status")
        return Promise.resolve({ configured: false, pendingCount: 0, webhookUrl: "" });
      if (url === "/api/webhooks/google-meet/status")
        return Promise.resolve({
          enabled: true,
          subscriptionActive: true,
          expiresAt: fiveDaysFromNow,
          pendingCount: 0,
          failedCount: 0,
        });
      return Promise.resolve({});
    });
    api = mockApi({ get: getMock });

    render(
      <SyncControl
        api={api}
        backendUrl="http://localhost:3001"
        getAccessToken={getAccessToken}
        onSyncComplete={onSyncComplete}
        hasFireflies={false}
        hasGoogleMeet={true}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/live/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/5d/i)).toBeInTheDocument();
  });

  it("shows pending count for Google Meet transcripts", async () => {
    const getMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/config/webhook-status")
        return Promise.resolve({ configured: false, pendingCount: 0, webhookUrl: "" });
      if (url === "/api/webhooks/google-meet/status")
        return Promise.resolve({
          enabled: true,
          subscriptionActive: true,
          expiresAt: null,
          pendingCount: 2,
          failedCount: 0,
        });
      return Promise.resolve({});
    });
    api = mockApi({ get: getMock });

    render(
      <SyncControl
        api={api}
        backendUrl="http://localhost:3001"
        getAccessToken={getAccessToken}
        onSyncComplete={onSyncComplete}
        hasFireflies={false}
        hasGoogleMeet={true}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/google meet transcripts waiting/i)).toBeInTheDocument();
    });
  });

  it("hides Google Meet webhook UI when not enabled", async () => {
    const getMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/config/webhook-status")
        return Promise.resolve({ configured: false, pendingCount: 0, webhookUrl: "" });
      if (url === "/api/webhooks/google-meet/status")
        return Promise.resolve({
          enabled: false,
          subscriptionActive: false,
          expiresAt: null,
          pendingCount: 0,
          failedCount: 0,
        });
      return Promise.resolve({});
    });
    api = mockApi({ get: getMock });

    render(
      <SyncControl
        api={api}
        backendUrl="http://localhost:3001"
        getAccessToken={getAccessToken}
        onSyncComplete={onSyncComplete}
        hasFireflies={false}
        hasGoogleMeet={true}
      />,
    );

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith("/api/webhooks/google-meet/status");
    });

    expect(screen.queryByText(/live/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/google meet transcripts waiting/i)).not.toBeInTheDocument();
  });

  it("does not fetch Google Meet status when hasGoogleMeet is false", async () => {
    const getMock = vi.fn().mockResolvedValue({
      configured: false,
      pendingCount: 0,
      webhookUrl: "",
    });
    api = mockApi({ get: getMock });

    render(
      <SyncControl
        api={api}
        backendUrl="http://localhost:3001"
        getAccessToken={getAccessToken}
        onSyncComplete={onSyncComplete}
        hasFireflies={true}
        hasGoogleMeet={false}
      />,
    );

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith("/api/config/webhook-status");
    });

    expect(getMock).not.toHaveBeenCalledWith("/api/webhooks/google-meet/status");
  });
});
