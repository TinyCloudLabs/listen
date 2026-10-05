import { useSyncExternalStore } from "react";
import { StorageFullError, storageErrorCode } from "@listen/core";

// Read-only state entered on the first storage rejection (spec §4.5): the
// owner's TinyCloud storage is full, reads keep working, saves are paused.
// Left by the next confirmed save. The ordering of failures and recovery lives
// here, not in components, so a remounted component that reloads an old failed
// sync job cannot re-enter read-only after a later save.

let storageFull = false;
/** Epoch ms when a save last confirmed storage accepts writes; 0 = not yet. */
let writableConfirmedAt = 0;
const listeners = new Set<() => void>();

function setStorageFull(next: boolean): void {
  if (storageFull === next) return;
  storageFull = next;
  for (const listener of listeners) listener();
}

export function markStorageFull(): void {
  setStorageFull(true);
}

/** A save just succeeded: leave read-only and supersede earlier storage failures. */
export function confirmStorageWritable(): void {
  writableConfirmedAt = Date.now();
  setStorageFull(false);
}

/** Forget all storage state, e.g. on sign-out before another account signs in. */
export function clearStorageFull(): void {
  writableConfirmedAt = 0;
  setStorageFull(false);
}

export function isStorageFull(): boolean {
  return storageFull;
}

export function subscribeStorageFull(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStorageFull(): boolean {
  return useSyncExternalStore(subscribeStorageFull, isStorageFull, isStorageFull);
}

/** Records a finished sync reports as written to storage. */
export interface SyncSaveCounts {
  synced?: number;
  repaired?: number;
}

/**
 * Leave read-only once a finished sync confirms it saved something. Starting a
 * sync job succeeds even while storage is full, and a sync that saved nothing
 * proves nothing, so neither clears the notice.
 */
export function noteSyncSaves(counts: SyncSaveCounts | null | undefined): void {
  if ((counts?.synced ?? 0) + (counts?.repaired ?? 0) > 0) confirmStorageWritable();
}

/** A finished sync job as the job-current endpoints report it. */
export interface FinishedSyncJob {
  message?: string;
  completedAt?: string;
  updatedAt?: string;
}

/**
 * True when `job` failed for storage but a save confirmed storage writable
 * after the job failed, so the failure no longer describes storage now. This
 * holds for watched jobs too: a poll that only now sees a failure dated before
 * the confirmation is a delayed observation, not a new failure. A job without
 * a failure time cannot be ordered: a watched one is treated as current, one
 * loaded after the fact as stale.
 */
export function isSupersededStorageFailure(job: FinishedSyncJob, watched = false): boolean {
  if (writableConfirmedAt === 0 || !storageErrorCode(job)) return false;
  const failedAt = Date.parse(job.completedAt ?? job.updatedAt ?? "");
  if (Number.isNaN(failedAt)) return !watched;
  return failedAt <= writableConfirmedAt;
}

/**
 * Route a failed write through the read-only state. A storage rejection
 * enters read-only mode and comes back as `StorageFullError`, whose message
 * is the spec's save copy; any other error is returned unchanged.
 */
export function storageAwareError(error: unknown): unknown {
  if (error instanceof StorageFullError) {
    markStorageFull();
    return error;
  }
  const code = storageErrorCode(error);
  if (!code) return error;
  markStorageFull();
  return new StorageFullError(code, { cause: error });
}
