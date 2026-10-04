import type { Response } from "express";
import { StorageFullError, storageErrorCode, storageSaveMessage } from "@listen/core";

/**
 * Throw `StorageFullError` when an SDK write result is a storage rejection.
 * The SDK returns write failures as `{ ok: false, error }` instead of
 * throwing, so without this check a write refused because the owner's
 * TinyCloud storage is full would pass as saved. Other failures keep their
 * existing handling.
 */
export function throwIfStorageRejected(result: unknown): void {
  if ((result as { ok?: unknown } | null)?.ok !== false) return;
  const error = (result as { error?: unknown }).error;
  const code = storageErrorCode(error);
  if (code) throw new StorageFullError(code, { cause: error });
}

/**
 * Answer with the typed storage error when `error` is a storage rejection:
 * 402 `storage_quota_exceeded` (or 413 `storage_limit_reached`) with the spec
 * copy as `message`. Returns false, sending nothing, for any other error.
 */
export function sendStorageError(res: Response, error: unknown): boolean {
  const code = storageErrorCode(error);
  if (!code) return false;
  res.status(code === "STORAGE_LIMIT_REACHED" ? 413 : 402).json({
    error: code.toLowerCase(),
    code,
    message: storageSaveMessage(code),
  });
  return true;
}
