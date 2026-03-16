import type { TokenStore, TokenRefreshConfig } from "./tokens.js";
import type { ApiError } from "@tinyboilerplate/core";

// ── Types ────────────────────────────────────────────────────────────

export interface ApiClientConfig {
  /** Token refresh configuration. If omitted, auto-refresh is disabled. */
  refreshConfig?: TokenRefreshConfig;
  /** User's blockchain address (from connectWallet). Sent as X-User-Address header. */
  userAddress?: string;
}

export interface ApiClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  del<T>(path: string): Promise<T>;
}

// ── API Client ───────────────────────────────────────────────────────

/**
 * Create a fetch wrapper that auto-attaches the JWT bearer token
 * and auto-refreshes on expiry.
 *
 * Returns an object with typed get/post/put/del methods.
 */
export function createApiClient(
  backendUrl: string,
  tokenStore: TokenStore,
  config?: ApiClientConfig,
): ApiClient {
  /**
   * Ensure the access token is fresh before making a request.
   */
  async function ensureFreshToken(): Promise<string> {
    if (tokenStore.isExpired() && config?.refreshConfig) {
      await tokenStore.refresh(config.refreshConfig);
    }
    const token = tokenStore.getAccessToken();
    if (!token) {
      throw new Error("No access token available. Sign in first.");
    }
    return token;
  }

  /**
   * Core request function with auto-refresh retry.
   */
  async function request<T>(path: string, init: RequestInit): Promise<T> {
    let token = await ensureFreshToken();

    let res = await fetch(`${backendUrl}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${token}`,
        ...(config?.userAddress ? { "X-User-Address": config.userAddress } : {}),
      },
    });

    // If we get a 401 and have refresh config, try refreshing once
    if (res.status === 401 && config?.refreshConfig) {
      try {
        await tokenStore.refresh(config.refreshConfig);
        token = tokenStore.getAccessToken()!;

        res = await fetch(`${backendUrl}${path}`, {
          ...init,
          headers: {
            ...init.headers,
            Authorization: `Bearer ${token}`,
            ...(config?.userAddress ? { "X-User-Address": config.userAddress } : {}),
          },
        });
      } catch {
        // Refresh failed — surface the original 401
      }
    }

    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({
        error: `HTTP ${res.status}`,
        message: res.statusText,
      }));
      throw new Error(`API error (${res.status}): ${err.message}`);
    }

    // 204 No Content — return undefined as T
    if (res.status === 204) {
      return undefined as T;
    }

    return res.json() as Promise<T>;
  }

  return {
    get<T>(path: string): Promise<T> {
      return request<T>(path, { method: "GET" });
    },

    post<T>(path: string, body?: unknown): Promise<T> {
      return request<T>(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    },

    put<T>(path: string, body?: unknown): Promise<T> {
      return request<T>(path, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    },

    del<T>(path: string): Promise<T> {
      return request<T>(path, { method: "DELETE" });
    },
  };
}
