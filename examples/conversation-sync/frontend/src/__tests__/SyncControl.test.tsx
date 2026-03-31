import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { render, screen, waitFor, cleanup } from "@testing-library/react";
=======
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
} from "@testing-library/react";
>>>>>>> ffd94d9 (TC-1306: Build SyncControl component (sync button, progress, limit selector))
=======
import { render, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
=======
import { render, screen, waitFor, cleanup } from "@testing-library/react";
>>>>>>> eafdd67 (test: update frontend tests for redesigned components)
import { SyncControl } from "../components/SyncControl";
import type { ApiClient } from "@tinyboilerplate/client";

function mockApi(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
<<<<<<< HEAD
<<<<<<< HEAD
    get: vi.fn().mockResolvedValue({ configured: false, pendingCount: 0, webhookUrl: "" }),
=======
    get: vi.fn(),
>>>>>>> ffd94d9 (TC-1306: Build SyncControl component (sync button, progress, limit selector))
=======
    get: vi.fn().mockResolvedValue({ configured: false, pendingCount: 0, webhookUrl: "" }),
>>>>>>> fa5f0e1 (TC-1316: Frontend auto-process pending on load + webhook status in SyncControl)
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
<<<<<<< HEAD
<<<<<<< HEAD
  const getAccessToken = vi.fn().mockReturnValue("test-token");
=======
>>>>>>> ffd94d9 (TC-1306: Build SyncControl component (sync button, progress, limit selector))
=======
  const getAccessToken = vi.fn().mockReturnValue("test-token");
>>>>>>> eafdd67 (test: update frontend tests for redesigned components)

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

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> eafdd67 (test: update frontend tests for redesigned components)
  it("renders Sync All and Reset buttons", () => {
=======
  it("renders Sync Fireflies and Reset buttons when hasFireflies is true", () => {
>>>>>>> c024b29 (TC-1326: Frontend source picker, Google OAuth popup, sync control, source filter)
    render(
      <SyncControl
        api={api}
        backendUrl="http://localhost:3001"
        getAccessToken={getAccessToken}
        onSyncComplete={onSyncComplete}
        hasFireflies={true}
      />,
<<<<<<< HEAD
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
=======
  it("renders Sync Now button and limit selector", () => {
    render(<SyncControl api={api} onSyncComplete={onSyncComplete} />);
    expect(screen.getByRole("button", { name: /sync now/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("has limit options 10, 20, 50 with 20 as default", () => {
    render(<SyncControl api={api} onSyncComplete={onSyncComplete} />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("20");
    const options = screen.getAllByRole("option");
    expect(options.map((o) => (o as HTMLOptionElement).value)).toEqual(["10", "20", "50"]);
  });

  it("calls POST /api/sync/fireflies with selected limit on click", async () => {
    const postMock = vi.fn().mockResolvedValue({ synced: 5, skipped: 3, failed: 0, errors: [] });
    api = mockApi({ post: postMock });

    render(<SyncControl api={api} onSyncComplete={onSyncComplete} />);

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "50" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sync now/i }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith("/api/sync/fireflies", {
        limit: 50,
      });
    });
  });

  it("shows syncing message during sync", async () => {
    let resolveSync!: (v: any) => void;
    const postMock = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveSync = resolve;
      }),
=======
>>>>>>> eafdd67 (test: update frontend tests for redesigned components)
    );
    expect(screen.getByRole("button", { name: /sync all/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
  });

<<<<<<< HEAD
  it("shows success message on completed sync", async () => {
    const postMock = vi.fn().mockResolvedValue({ synced: 5, skipped: 3, failed: 0, errors: [] });
    api = mockApi({ post: postMock });

    render(<SyncControl api={api} onSyncComplete={onSyncComplete} />);
    fireEvent.click(screen.getByRole("button", { name: /sync now/i }));

    await waitFor(() => {
      expect(screen.getByText(/synced 5 conversations/i)).toBeInTheDocument();
      expect(screen.getByText(/3 already up to date/i)).toBeInTheDocument();
    });
  });

  it("shows partial failure message with details", async () => {
    const postMock = vi.fn().mockResolvedValue({
      synced: 3,
      skipped: 1,
      failed: 2,
      errors: ["abc123: timeout", "def456: rate limit"],
    });
    api = mockApi({ post: postMock });

    render(<SyncControl api={api} onSyncComplete={onSyncComplete} />);
    fireEvent.click(screen.getByRole("button", { name: /sync now/i }));

    await waitFor(() => {
      expect(screen.getByText(/synced 3/i)).toBeInTheDocument();
      expect(screen.getByText(/2 failed/i)).toBeInTheDocument();
      expect(screen.getByText(/abc123: timeout/i)).toBeInTheDocument();
    });
  });

  it("shows timeout message after 60 seconds", async () => {
    vi.useFakeTimers();
    const postMock = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
    api = mockApi({ post: postMock });

    render(<SyncControl api={api} onSyncComplete={onSyncComplete} />);
    fireEvent.click(screen.getByRole("button", { name: /sync now/i }));

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });

    expect(screen.getByText(/sync is taking longer than expected/i)).toBeInTheDocument();
    expect(screen.getByText(/try again with a smaller batch/i)).toBeInTheDocument();
  });

  it("calls onSyncComplete after successful sync", async () => {
    const postMock = vi.fn().mockResolvedValue({ synced: 2, skipped: 0, failed: 0, errors: [] });
    api = mockApi({ post: postMock });

    render(<SyncControl api={api} onSyncComplete={onSyncComplete} />);
    fireEvent.click(screen.getByRole("button", { name: /sync now/i }));

    await waitFor(() => {
      expect(onSyncComplete).toHaveBeenCalledOnce();
    });
  });

  it("does not call onSyncComplete on full failure", async () => {
    const postMock = vi.fn().mockRejectedValue(new Error("Server error"));
    api = mockApi({ post: postMock });

    render(<SyncControl api={api} onSyncComplete={onSyncComplete} />);
    fireEvent.click(screen.getByRole("button", { name: /sync now/i }));

    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeInTheDocument();
    });
    expect(onSyncComplete).not.toHaveBeenCalled();
  });

  it("stores last sync timestamp in localStorage on success", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T15:00:00Z"));
    const postMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve({ synced: 1, skipped: 0, failed: 0, errors: [] }));
    api = mockApi({ post: postMock });

    render(<SyncControl api={api} onSyncComplete={onSyncComplete} />);
    fireEvent.click(screen.getByRole("button", { name: /sync now/i }));

    // Advance timers to allow microtasks + setTimeout in waitFor to resolve
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

<<<<<<< HEAD
    expect(localStorage.getItem("lastSyncTimestamp")).toBe(
      "2026-03-24T15:00:00.000Z",
    );
>>>>>>> ffd94d9 (TC-1306: Build SyncControl component (sync button, progress, limit selector))
=======
    expect(localStorage.getItem("lastSyncTimestamp")).toBe("2026-03-24T15:00:00.000Z");
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
  });

  it("displays last synced time from localStorage", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T15:10:00Z"));
<<<<<<< HEAD
<<<<<<< HEAD
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
=======
    localStorage.setItem(
      "lastSyncTimestamp",
      new Date("2026-03-24T15:00:00Z").toISOString(),
    );
=======
    localStorage.setItem("lastSyncTimestamp", new Date("2026-03-24T15:00:00Z").toISOString());
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)

    render(<SyncControl api={api} onSyncComplete={onSyncComplete} />);
    expect(screen.getByText(/last synced: 10 minutes ago/i)).toBeInTheDocument();
  });

  it("shows error message on API error", async () => {
    const postMock = vi.fn().mockRejectedValue(new Error("Network failure"));
    api = mockApi({ post: postMock });

    render(<SyncControl api={api} onSyncComplete={onSyncComplete} />);
    fireEvent.click(screen.getByRole("button", { name: /sync now/i }));

    await waitFor(() => {
      expect(screen.getByText(/network failure/i)).toBeInTheDocument();
    });
>>>>>>> ffd94d9 (TC-1306: Build SyncControl component (sync button, progress, limit selector))
  });

  // ── Webhook status tests ───────────────────────────────────────────

=======
>>>>>>> eafdd67 (test: update frontend tests for redesigned components)
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
        hasGoogleMeet={true}
      />,
    );
    expect(screen.getByRole("button", { name: /sync fireflies/i })).toBeInTheDocument();
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
