// ── Types ────────────────────────────────────────────────────────────

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in ms
}

export interface TokenRefreshConfig {
  /** OpenKey host, e.g. "https://openkey.so" */
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

  /** Buffer before actual expiry to trigger refresh (30 seconds). */
  private static readonly EXPIRY_BUFFER_MS = 30_000;

  /**
   * Store tokens from an OAuth flow or refresh response.
   * `expiresIn` is in seconds (as returned by OAuth token endpoints).
   */
  setTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
    this.tokens = {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
    };
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

  /** Clear all stored tokens (e.g., on sign-out). */
  clear(): void {
    this.tokens = null;
  }

  /**
   * Refresh the access token using the stored refresh token.
   * Calls the OpenKey token endpoint with grant_type=refresh_token.
   */
  async refresh(config: TokenRefreshConfig): Promise<void> {
    const refreshToken = this.tokens?.refreshToken;
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const res = await fetch(`${config.openKeyHost}/api/auth/oauth2/token`, {
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
    );
  }
}
