import type { ApiError } from "@tinyboilerplate/core";

// ── Types ────────────────────────────────────────────────────────────

export interface ApiClientConfig {
  /** User's blockchain address. Sent as X-User-Address header for auth. */
  userAddress: string;
}

export interface ApiClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  del<T>(path: string): Promise<T>;
}

// ── API Client ───────────────────────────────────────────────────────

/**
 * Create a fetch wrapper that auto-attaches the X-User-Address header.
 */
export function createApiClient(
  backendUrl: string,
  config: ApiClientConfig,
): ApiClient {
  const { userAddress } = config;

  async function request<T>(path: string, init: RequestInit): Promise<T> {
    const res = await fetch(`${backendUrl}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        "X-User-Address": userAddress,
      },
    });

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
