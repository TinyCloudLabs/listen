import type { ApiError } from "@listen/core";
import type { SessionStore } from "./tokens.js";

// ── Types ────────────────────────────────────────────────────────────

export interface ApiClientConfig {
  /** Session store for Bearer token auth. */
  sessionStore: SessionStore;
}

export interface ApiClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  del<T>(path: string): Promise<T>;
}

// ── API Client ───────────────────────────────────────────────────────

/**
 * Create a fetch wrapper that auto-attaches a Bearer token from the SessionStore.
 * On 401, clears the session — user must re-authenticate via SIWE.
 */
export function createApiClient(backendUrl: string, config: ApiClientConfig): ApiClient {
  const { sessionStore } = config;

  async function request<T>(path: string, init: RequestInit): Promise<T> {
    const token = sessionStore.getToken();
    if (!token) {
      throw new Error("Not authenticated. Please sign in.");
    }

    if (sessionStore.isExpired()) {
      sessionStore.clear();
      throw new Error("Session expired. Please sign in again.");
    }

    const res = await fetch(`${backendUrl}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${token}`,
        "X-Requested-With": "Listen",
      },
    });

    // On 401, clear session — no auto-refresh with SIWE
    if (res.status === 401) {
      sessionStore.clear();
      throw new Error("Session expired. Please sign in again.");
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
