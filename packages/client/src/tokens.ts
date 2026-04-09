// ── Types ────────────────────────────────────────────────────────────

export interface StoredSession {
  token: string;
  expiresAt: number; // Unix timestamp in ms
  address?: string; // Which user this session belongs to
}

// ── Session Store ───────────────────────────────────────────────────

/**
 * In-memory session token store.
 * Framework-agnostic: wire into React state, Vue refs, or any other system.
 *
 * No refresh logic — when expired, user re-signs SIWE.
 */
export class SessionStore {
  private session: StoredSession | null = null;
  private storageKey: string;

  /** Buffer before actual expiry (30 seconds). */
  private static readonly EXPIRY_BUFFER_MS = 30_000;

  constructor(storageKey = "tinyboilerplate:session") {
    this.storageKey = storageKey;
    this._loadFromStorage();
  }

  /**
   * Store a session token.
   * `expiresIn` is in seconds (as returned by the backend verify endpoint).
   */
  setSession(token: string, expiresIn: number, address?: string): void {
    this.session = {
      token,
      expiresAt: Date.now() + expiresIn * 1000,
      address,
    };
    this._saveToStorage();
  }

  /** Get the current session token, or null if not set. */
  getToken(): string | null {
    return this.session?.token ?? null;
  }

  /** Check whether a session has been set. */
  hasSession(): boolean {
    return this.session !== null;
  }

  /**
   * Returns true if the session token is expired or about to expire
   * (within EXPIRY_BUFFER_MS).
   */
  isExpired(): boolean {
    if (!this.session) return true;
    return Date.now() >= this.session.expiresAt - SessionStore.EXPIRY_BUFFER_MS;
  }

  /** Get the address associated with the stored session. */
  getAddress(): string | null {
    return this.session?.address ?? null;
  }

  /** Clear the stored session (e.g., on sign-out). */
  clear(): void {
    this.session = null;
    this._removeFromStorage();
  }

  /** Persist session to localStorage. */
  private _saveToStorage(): void {
    try {
      if (this.session) {
        localStorage.setItem(this.storageKey, JSON.stringify(this.session));
      }
    } catch {
      // localStorage unavailable (SSR, private browsing, etc.)
    }
  }

  /** Load session from localStorage on construction. */
  private _loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed: StoredSession = JSON.parse(raw);
        // Only restore if not already expired
        if (parsed.expiresAt > Date.now()) {
          this.session = parsed;
        } else {
          localStorage.removeItem(this.storageKey);
        }
      }
    } catch {
      // localStorage unavailable or corrupt data
    }
  }

  /** Remove session from localStorage. */
  private _removeFromStorage(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // localStorage unavailable
    }
  }
}
