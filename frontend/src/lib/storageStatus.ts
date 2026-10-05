import { useSyncExternalStore } from "react";
import { StorageFullError, storageErrorCode } from "@listen/core";

// Read-only state entered on the first storage rejection (spec §4.5): the
// owner's TinyCloud storage is full, reads keep working, saves are paused.
// Cleared by the next successful write.

let storageFull = false;
const listeners = new Set<() => void>();

function setStorageFull(next: boolean): void {
  if (storageFull === next) return;
  storageFull = next;
  for (const listener of listeners) listener();
}

export function markStorageFull(): void {
  setStorageFull(true);
}

export function clearStorageFull(): void {
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
  if ((counts?.synced ?? 0) + (counts?.repaired ?? 0) > 0) clearStorageFull();
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
