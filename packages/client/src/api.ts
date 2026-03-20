import type { ApiError } from "@tinyboilerplate/core";
import type { TokenStore, TokenRefreshConfig } from "./tokens.js";

// ── Types ────────────────────────────────────────────────────────────

export interface ApiClientConfig {
  /** Token store for JWT-based auth. Sends Authorization: Bearer header. */
  tokenStore: TokenStore;
  /** If provided, auto-refreshes expired tokens before requests. */
  refreshConfig?: TokenRefreshConfig;
}

export interface ApiClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  del<T>(path: string): Promise<T>;
}

// ── API Client ───────────────────────────────────────────────────────

/**
 * Create a fetch wrapper that auto-attaches a Bearer token from the TokenStore.
 * Handles token refresh transparently.
 */
export function createApiClient(backendUrl: string, config: ApiClientConfig): ApiClient {
  const { tokenStore, refreshConfig } = config;

  async function request<T>(path: string, init: RequestInit, isRetry = false): Promise<T> {
    // Auto-refresh expired tokens before the request
    if (tokenStore.isExpired() && refreshConfig) {
      await tokenStore.refresh(refreshConfig);
    }

    const accessToken = tokenStore.getAccessToken();
    if (!accessToken) {
      throw new Error("Not authenticated. Please sign in.");
    }

    const res = await fetch(`${backendUrl}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // On 401, try refreshing the token once and retry
    if (res.status === 401 && !isRetry && refreshConfig) {
      try {
        await tokenStore.refresh(refreshConfig);
        return request<T>(path, init, true);
      } catch {
        throw new Error("Session expired. Please sign in again.");
      }
    }

    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({
        error: `HTTP ${res.status}`,
        message: res.statusText,
      }));
      throw new Error(`API error (${res.status}): ${err.message}`);
    }

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
