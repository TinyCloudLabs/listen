import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { STORAGE_FULL_SAVE_MESSAGE } from "@listen/core";
import type { ApiClient } from "@listen/client";
import { GlobalSyncIndicator } from "../GlobalSyncIndicator";
import {
  clearStorageFull,
  confirmStorageWritable,
  isStorageFull,
  markStorageFull,
} from "../../lib/storageStatus";

function firefliesJob(overrides: Record<string, unknown> = {}) {
  return { id: "job-1", status: "syncing", synced: 0, failed: 0, ...overrides };
}

/** Serve one Fireflies job per poll; other sources have no job. */
function apiServing(jobs: Array<Record<string, unknown>>): ApiClient {
  let poll = 0;
  const get = vi.fn(async (path: string) => {
    if (path !== "/api/sync/fireflies/jobs/current") return null;
    return jobs[Math.min(poll++, jobs.length - 1)];
  });
  return { get, post: vi.fn(), put: vi.fn(), del: vi.fn() } as unknown as ApiClient;
}

/** Let the pending poll settle, then run the next scheduled one. */
async function nextPoll() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(15_000);
  });
}

describe("GlobalSyncIndicator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    clearStorageFull();
  });

  it("enters read-only mode for a job that already stopped on full storage", async () => {
    render(
      <GlobalSyncIndicator
        api={apiServing([firefliesJob({ status: "failed", message: STORAGE_FULL_SAVE_MESSAGE })])}
      />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(isStorageFull()).toBe(true);

    // Re-reading the same stale job after a later save must not re-enter read-only.
    act(() => confirmStorageWritable());
    await nextPoll();
    expect(isStorageFull()).toBe(false);
  });

  it("shows the storage copy when a watched job stops on full storage", async () => {
    render(
      <GlobalSyncIndicator
        api={apiServing([
          firefliesJob(),
          firefliesJob({ status: "failed", synced: 2, message: STORAGE_FULL_SAVE_MESSAGE }),
        ])}
      />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await nextPoll();

    expect(screen.getByText(STORAGE_FULL_SAVE_MESSAGE)).toBeInTheDocument();
    expect(isStorageFull()).toBe(true);
  });

  it("leaves read-only once a watched job completes with saves", async () => {
    act(() => markStorageFull());
    render(
      <GlobalSyncIndicator
        api={apiServing([firefliesJob(), firefliesJob({ status: "completed", synced: 1 })])}
      />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(isStorageFull()).toBe(true);

    await nextPoll();
    expect(isStorageFull()).toBe(false);
  });

  it("does not re-enter read-only when a remount reloads a failure a later save superseded", async () => {
    vi.setSystemTime(new Date("2026-10-05T10:00:00Z"));
    const staleFailure = firefliesJob({
      status: "failed",
      message: STORAGE_FULL_SAVE_MESSAGE,
      completedAt: "2026-10-05T09:59:00Z",
    });
    const first = render(<GlobalSyncIndicator api={apiServing([staleFailure])} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(isStorageFull()).toBe(true);

    // The owner frees space and a save succeeds; then the indicator remounts
    // (route change, mobile shell) and reloads the same old job.
    act(() => confirmStorageWritable());
    first.unmount();
    render(<GlobalSyncIndicator api={apiServing([staleFailure])} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(isStorageFull()).toBe(false);
  });

  it("still enters read-only for a storage failure that finished after the last save", async () => {
    vi.setSystemTime(new Date("2026-10-05T10:00:00Z"));
    act(() => confirmStorageWritable());

    render(
      <GlobalSyncIndicator
        api={apiServing([
          firefliesJob({
            id: "job-2",
            status: "failed",
            message: STORAGE_FULL_SAVE_MESSAGE,
            completedAt: "2026-10-05T10:05:00Z",
          }),
        ])}
      />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(isStorageFull()).toBe(true);
  });
});
