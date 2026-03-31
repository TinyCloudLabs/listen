// ── Item (the abstract CRUD entity) ──────────────────────────────────

export interface Item {
  id: string;
  title: string;
  data?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemInput {
  title: string;
  data?: string;
}

export interface UpdateItemInput {
  title?: string;
  data?: string;
}

// ── Delegation ───────────────────────────────────────────────────────

export type DelegationStatus = "active" | "expired" | "none";

export interface StoredDelegation {
  serialized: string;
  grantedAt: string;
  expiresAt: string;
  actions: string[];
  path: string;
}

// ── Server Info ──────────────────────────────────────────────────────

export interface ServerInfo {
  did: string;
  status: string;
}

// ── API Responses ────────────────────────────────────────────────────

export interface ItemResponse {
  item: Item;
}

export interface ItemListResponse {
  items: Item[];
}

export interface DelegationResponse {
  status: DelegationStatus;
  expiresAt: string | null;
}

export interface ApiError {
  error: string;
  message: string;
}

// ── Store Selection ──────────────────────────────────────────────────

export type StoreType = "kv" | "sql" | "duckdb";

// ── Constants ────────────────────────────────────────────────────────

/** Default TinyCloud actions for item CRUD (KV + SQL + DuckDB) */
export const DEFAULT_DELEGATION_ACTIONS = [
  "tinycloud.kv/get",
  "tinycloud.kv/put",
  "tinycloud.kv/del",
  "tinycloud.kv/list",
  "tinycloud.sql/read",
  "tinycloud.sql/write",
  "tinycloud.duckdb/read",
  "tinycloud.duckdb/write",
] as const;

/** Default delegation path scope — empty string means full access (same as default TinyCloud session) */
export const DEFAULT_DELEGATION_PATH = "";

/** Default delegation expiry: 1 year */
export const DEFAULT_DELEGATION_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000;

/** DelegatedAccess cache TTL: 50 minutes (under 1-hour sub-session cap) */
export const DELEGATION_CACHE_TTL_MS = 50 * 60 * 1000;

// ── Utilities ───────────────────────────────────────────────────────

/**
 * Derive the OpenKey API host from a frontend or API host.
 * "https://openkey.so" → "https://api.openkey.so"
 * "https://api.openkey.so" → "https://api.openkey.so" (no change)
 * "http://localhost:3000" → "http://localhost:3000" (no change)
 */
export function deriveApiHost(host: string): string {
  try {
    const url = new URL(host);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return host;
    }
    if (url.hostname.startsWith("api.")) {
      return host;
    }
    return `${url.protocol}//api.${url.host}`;
  } catch {
    return host;
  }
}
