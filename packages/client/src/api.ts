import type { ApiError } from "@listen/core";
import type { SessionStore } from "./tokens.js";
import { listenDebugFetch } from "./debug.js";

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

/**
 * Error thrown for non-ok API responses, carrying the HTTP status and the
 * backend's machine-readable error code (e.g. "no_delegation",
 * "delegation_expired") so callers can react without parsing messages.
 */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
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

    const method = init.method ?? "GET";
    const res = await listenDebugFetch(
      `${backendUrl}${path}`,
      {
        ...init,
        headers: {
          ...init.headers,
          Authorization: `Bearer ${token}`,
          "X-Requested-With": "Listen",
        },
      },
      { client: "api", method, path },
    );

    // On 401, clear session — no auto-refresh with SIWE. Exception:
    // `delegation_expired` means the backend session is still valid and only
    // the stored delegation aged out, so the session must survive for a
    // silent re-delegation.
    if (res.status === 401) {
      const err: ApiError = await res.json().catch(() => ({
        error: "unauthorized",
        message: res.statusText,
      }));
      if (err.error === "delegation_expired") {
        throw new ApiRequestError(res.status, err.error, `API error (401): ${err.message}`);
      }
      sessionStore.clear();
      throw new Error("Session expired. Please sign in again.");
    }

    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({
        error: `HTTP ${res.status}`,
        message: res.statusText,
      }));
      throw new ApiRequestError(res.status, err.error, `API error (${res.status}): ${err.message}`);
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
