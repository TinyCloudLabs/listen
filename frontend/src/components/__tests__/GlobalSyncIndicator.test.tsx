import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { ApiRequestError } from "@listen/client";
import { GlobalSyncIndicator } from "../GlobalSyncIndicator";

const api = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
};

let hidden = false;

function setHidden(value: boolean) {
  hidden = value;
}

// Flush pending microtasks + timers up to `ms` inside act so React state
// updates settle.
async function flush(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function renderIndicator(overrides: Partial<Parameters<typeof GlobalSyncIndicator>[0]> = {}) {
  return render(<GlobalSyncIndicator api={api as never} {...overrides} />);
}

function job(overrides: Record<string, unknown> = {}) {
  return { id: "g1", status: "syncing", synced: 0, skipped: 0, failed: 0, ...overrides };
}

describe("GlobalSyncIndicator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    hidden = false;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => hidden,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("polls the consolidated endpoint and renders an active job from any source key", async () => {
    api.get.mockResolvedValue({ fireflies: null, granola: job(), "google-meet": null });

    renderIndicator();
    await flush();

    expect(api.get).toHaveBeenCalledWith("/api/sync/jobs");
    expect(screen.getByText(/Syncing Granola/)).toBeInTheDocument();
  });

  it("reschedules at 5s while active and 60s while idle", async () => {
    api.get.mockResolvedValue({ fireflies: null, granola: job(), "google-meet": null });
    renderIndicator();
    await flush();
    expect(api.get).toHaveBeenCalledTimes(1);

    await flush(5000);
    expect(api.get).toHaveBeenCalledTimes(2);

    cleanup();
    vi.clearAllMocks();

    api.get.mockResolvedValue({ fireflies: null, granola: null, "google-meet": null });
    renderIndicator();
    await flush();
    expect(api.get).toHaveBeenCalledTimes(1);

    await flush(59000);
    expect(api.get).toHaveBeenCalledTimes(1);
    await flush(1000);
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it("fires a completion notice only for a watched active->terminal transition", async () => {
    api.get.mockResolvedValueOnce({ fireflies: null, granola: job(), "google-meet": null });
    renderIndicator();
    await flush();
    expect(screen.getByText(/Syncing Granola/)).toBeInTheDocument();

    api.get.mockResolvedValue({
      fireflies: null,
      granola: job({ status: "completed", synced: 3 }),
      "google-meet": null,
    });
    await flush(5000);

    expect(screen.getByText(/Granola sync complete/)).toBeInTheDocument();
  });

  it("does not fire a notice for a job already terminal on first sight", async () => {
    api.get.mockResolvedValue({
      fireflies: null,
      granola: job({ status: "completed", synced: 3 }),
      "google-meet": null,
    });

    renderIndicator();
    await flush();

    expect(screen.queryByText(/sync complete/)).not.toBeInTheDocument();
  });

  it("does not poll while the tab is hidden and resumes on visibility", async () => {
    api.get.mockResolvedValue({ fireflies: null, granola: null, "google-meet": null });
    setHidden(true);

    renderIndicator();
    await flush();
    expect(api.get).not.toHaveBeenCalled();

    await flush(60000);
    expect(api.get).not.toHaveBeenCalled();

    setHidden(false);
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it("backs off after a failure and jumps to the ceiling on 429", async () => {
    api.get.mockRejectedValue(new Error("network down"));
    renderIndicator();
    await flush();
    expect(api.get).toHaveBeenCalledTimes(1);

    await flush(59000);
    expect(api.get).toHaveBeenCalledTimes(1);
    await flush(1000);
    expect(api.get).toHaveBeenCalledTimes(2);

    cleanup();
    vi.clearAllMocks();

    api.get.mockRejectedValue(new ApiRequestError(429, "rate_limited", "too many"));
    renderIndicator();
    await flush();
    expect(api.get).toHaveBeenCalledTimes(1);

    await flush(299000);
    expect(api.get).toHaveBeenCalledTimes(1);
    await flush(1000);
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});
