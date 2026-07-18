// ── Session Persistence ──────────────────────────────────────────────
//
// Reads/clears TinyCloud sessions from BrowserSessionStorage's localStorage.
// Kept in a separate file to avoid importing @tinycloud/web-sdk (browser-only).

/** Session data read from BrowserSessionStorage for restoring without SIWE. */
export interface PersistedTinyCloudSession {
  address: string;
  chainId: number;
  did: string;
  expiresAt: string;
  spaceId?: string;
}

/** localStorage key prefix used by BrowserSessionStorage. */
const TC_SESSION_KEY_PREFIX = "tinycloud:session:";

/**
 * Check if a TinyCloud session is persisted in BrowserSessionStorage.
 *
 * SDK sign-in restores BrowserSessionStorage first, but does not validate the
 * restored parent against the node. We read the metadata directly so the app
 * can run its explicit restore-and-validation path before accepting it.
 */
export function loadPersistedSession(address: string): PersistedTinyCloudSession | null {
  try {
    const raw = localStorage.getItem(TC_SESSION_KEY_PREFIX + address.toLowerCase());
    if (!raw) return null;

    const data = JSON.parse(raw);

    // Check expiry
    if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
      localStorage.removeItem(TC_SESSION_KEY_PREFIX + address.toLowerCase());
      return null;
    }

    // Build primary DID from address + chainId
    const chainId = data.chainId ?? 1;
    const did = `did:pkh:eip155:${chainId}:${data.address}`;

    return {
      address: data.address,
      chainId,
      did,
      expiresAt: data.expiresAt,
      spaceId:
        typeof data.tinycloudSession?.spaceId === "string"
          ? data.tinycloudSession.spaceId
          : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Clear the persisted TinyCloud session from BrowserSessionStorage.
 * Used during sign-out when TinyCloudWeb instance isn't available (restored sessions).
 */
export function clearPersistedSession(address: string): void {
  try {
    localStorage.removeItem(TC_SESSION_KEY_PREFIX + address.toLowerCase());
  } catch {
    // localStorage unavailable
  }
}
