import { deriveApiHost } from "@tinyboilerplate/core";
export { deriveApiHost };

// ── Types ────────────────────────────────────────────────────────────

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in ms
  address?: string; // Which user these tokens belong to
}

export interface TokenRefreshConfig {
  /** OpenKey host, e.g. "https://openkey.so" (API host is derived automatically) */
  openKeyHost: string;
  /** OAuth client ID */
  clientId: string;
}

// ── Token Store ──────────────────────────────────────────────────────

/**
 * In-memory JWT token store with refresh logic.
 * Framework-agnostic: wire into React state, Vue refs, or any other system.
 */
export class TokenStore {
  private tokens: StoredTokens | null = null;
  private refreshPromise: Promise<void> | null = null;
  private storageKey: string;

  /** Buffer before actual expiry to trigger refresh (30 seconds). */
  private static readonly EXPIRY_BUFFER_MS = 30_000;

  constructor(storageKey = "tinyboilerplate:tokens") {
    this.storageKey = storageKey;
    this._loadFromStorage();
  }

  /**
   * Store tokens from an OAuth flow or refresh response.
   * `expiresIn` is in seconds (as returned by OAuth token endpoints).
   */
  setTokens(accessToken: string, refreshToken: string | undefined, expiresIn: number, address?: string): void {
    this.tokens = {
      accessToken,
      refreshToken: refreshToken ?? "",
      expiresAt: Date.now() + expiresIn * 1000,
      address,
    };
    this._saveToStorage();
  }

  /** Get the current access token, or null if not set. */
  getAccessToken(): string | null {
    return this.tokens?.accessToken ?? null;
  }

  /** Get the current refresh token, or null if not set. */
  getRefreshToken(): string | null {
    return this.tokens?.refreshToken ?? null;
  }

  /** Check whether tokens have been set. */
  hasTokens(): boolean {
    return this.tokens !== null;
  }

  /**
   * Returns true if the access token is expired or about to expire
   * (within EXPIRY_BUFFER_MS).
   */
  isExpired(): boolean {
    if (!this.tokens) return true;
    return Date.now() >= this.tokens.expiresAt - TokenStore.EXPIRY_BUFFER_MS;
  }

  /** Get the address associated with the stored tokens. */
  getAddress(): string | null {
    return this.tokens?.address ?? null;
  }

  /** Clear all stored tokens (e.g., on sign-out). */
  clear(): void {
    this.tokens = null;
    this._removeFromStorage();
  }

  /**
   * Refresh the access token using the stored refresh token.
   * Deduplicates concurrent calls — multiple 401s share one in-flight refresh.
   */
  async refresh(config: TokenRefreshConfig): Promise<void> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this._doRefresh(config).finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  /**
   * Internal: performs the actual token refresh.
   * Calls the OpenKey token endpoint with grant_type=refresh_token.
   */
  private async _doRefresh(config: TokenRefreshConfig): Promise<void> {
    const refreshToken = this.tokens?.refreshToken;
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const apiHost = deriveApiHost(config.openKeyHost);
    const res = await fetch(`${apiHost}/api/auth/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: config.clientId,
      }),
    });

    if (!res.ok) {
      // Clear tokens on refresh failure — user needs to re-authenticate
      this.clear();
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Token refresh failed: ${text}`);
    }

    const data = await res.json();
    this.setTokens(
      data.access_token,
      data.refresh_token ?? refreshToken, // Some providers don't rotate refresh tokens
      data.expires_in,
      this.tokens?.address,
    );
  }

  /** Persist tokens to localStorage. */
  private _saveToStorage(): void {
    try {
      if (this.tokens) {
        localStorage.setItem(this.storageKey, JSON.stringify(this.tokens));
      }
    } catch {
      // localStorage unavailable (SSR, private browsing, etc.)
    }
  }

  /** Load tokens from localStorage on construction. */
  private _loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed: StoredTokens = JSON.parse(raw);
        // Only restore if not already expired
        if (parsed.expiresAt > Date.now()) {
          this.tokens = parsed;
        } else {
          localStorage.removeItem(this.storageKey);
        }
      }
    } catch {
      // localStorage unavailable or corrupt data
    }
  }

  /** Remove tokens from localStorage. */
  private _removeFromStorage(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // localStorage unavailable
    }
  }
}
