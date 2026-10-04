// ── TinyCloud storage-full detection and copy (shared browser + backend) ──
//
// Storage is an account-wide budget. When it is full the node refuses writes
// that would grow storage (HTTP 402 `STORAGE_QUOTA_EXCEEDED`, or 413
// `STORAGE_LIMIT_REACHED` when one write is larger than what is left) while
// reads keep working. Copy follows the TinyCloud storage-full messaging spec
// §5: say "storage", never "quota" or "Limit: 0".

/** Where the owner frees up space or changes plan. */
export const MANAGE_STORAGE_URL = "https://account.tinycloud.xyz/billing";
export const MANAGE_STORAGE_LABEL = "Manage storage";

export const STORAGE_FULL_SAVE_MESSAGE =
  "Your TinyCloud storage is full, so this change was not saved. Reading still works. Free up space or upgrade your plan to save again.";

export const STORAGE_TOO_LARGE_SAVE_MESSAGE =
  "This change is larger than the TinyCloud storage you have left, so it was not saved. Reading still works. Free up space or upgrade your plan to save it.";

export const STORAGE_READ_ONLY_TITLE = "Storage full: read-only.";
export const STORAGE_READ_ONLY_MESSAGE =
  "Your TinyCloud storage, shared by all your TinyCloud apps, is full. You can still view and copy your data. Saving changes is paused until you free up space or upgrade your plan.";

export type StorageErrorCode = "STORAGE_QUOTA_EXCEEDED" | "STORAGE_LIMIT_REACHED";

const STORAGE_CODES: Record<string, true> = {
  STORAGE_QUOTA_EXCEEDED: true,
  STORAGE_LIMIT_REACHED: true,
};

// SDKs before the TC-619 release surface a SQL 402 as `NETWORK_ERROR` with the
// node's text ("SQL batch failed: 402 - Storage quota exceeded. Used: …"), so
// fall back to the node's wording and to this module's own copy.
const STORAGE_FULL_TEXT =
  /storage quota exceeded|write exceeds remaining storage|storage is full|storage you have left/i;
const WRITE_TOO_LARGE_TEXT = /write exceeds remaining storage|storage you have left/i;

/** Nested error shapes seen in practice: Error.cause, SDK `{ ok: false, error }`. */
const MAX_DEPTH = 4;

function findStorageCode(error: unknown, depth: number): StorageErrorCode | null {
  if (depth > MAX_DEPTH || error == null) return null;
  if (typeof error === "string") {
    if (!STORAGE_FULL_TEXT.test(error)) return null;
    return WRITE_TOO_LARGE_TEXT.test(error) ? "STORAGE_LIMIT_REACHED" : "STORAGE_QUOTA_EXCEEDED";
  }
  if (typeof error !== "object") return null;

  const record = error as { code?: unknown; error?: unknown; message?: unknown; cause?: unknown };
  // Backend bodies use the node's lowercase ids ("storage_quota_exceeded") as `error`.
  for (const candidate of [record.code, record.error]) {
    if (typeof candidate !== "string") continue;
    const code = candidate.toUpperCase();
    if (STORAGE_CODES[code]) return code as StorageErrorCode;
  }
  return (
    findStorageCode(record.message, depth + 1) ??
    (typeof record.error === "object" ? findStorageCode(record.error, depth + 1) : null) ??
    findStorageCode(record.cause, depth + 1)
  );
}

/**
 * The storage code when a write failed because the owner's TinyCloud storage
 * is full (or the write is larger than what is left), else null. Accepts
 * thrown errors, SDK result objects, backend error bodies, and plain strings.
 */
export function storageErrorCode(error: unknown): StorageErrorCode | null {
  return findStorageCode(error, 0);
}

export function isStorageFullError(error: unknown): boolean {
  return storageErrorCode(error) !== null;
}

/** The spec's "write rejected" sentence for a storage code. */
export function storageSaveMessage(code: StorageErrorCode): string {
  return code === "STORAGE_LIMIT_REACHED"
    ? STORAGE_TOO_LARGE_SAVE_MESSAGE
    : STORAGE_FULL_SAVE_MESSAGE;
}

/**
 * Error carrying a storage code and the spec copy. Thrown in place of raw
 * node text so callers can show `message` and still detect the code.
 */
export class StorageFullError extends Error {
  readonly code: StorageErrorCode;

  constructor(code: StorageErrorCode, options?: { cause?: unknown }) {
    super(storageSaveMessage(code), options);
    this.name = "StorageFullError";
    this.code = code;
  }
}
