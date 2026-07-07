const LISTEN_STORAGE_PREFIX = "listen:";
const TINYCLOUD_SESSION_PREFIX = "tinycloud:session:";
const LEGACY_LAST_SYNC_KEY = "lastSyncTimestamp";

function shouldPurgeLocalStorageKey(key: string): boolean {
  return (
    key.startsWith(LISTEN_STORAGE_PREFIX) ||
    key.startsWith(TINYCLOUD_SESSION_PREFIX) ||
    key === LEGACY_LAST_SYNC_KEY
  );
}

export function purgeListenLocalData(): void {
  if (typeof window === "undefined") return;

  try {
    const { localStorage } = window;
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key && shouldPurgeLocalStorageKey(key)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Storage may be unavailable in private browsing or tests.
  }
}
