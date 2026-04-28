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
  /** Hash of the backend permission policy this delegation was issued for. */
  policyHash?: string;
  /** Full multi-resource grant metadata when available. */
  resources?: ServerInfoPermission[];
}

// ── Server Info ──────────────────────────────────────────────────────

/**
 * Permission entry shape used in {@link ServerInfo.permissions}. This is
 * deliberately kept as a plain object (no import from `@tinycloud/sdk-core`)
 * so the `core` package has no runtime TinyCloud deps — the frontend and
 * backend both massage this into a TinyCloud manifest `PermissionEntry`
 * when building or consuming the manifest.
 *
 * `service` uses the long form (e.g. `"tinycloud.kv"`) so the frontend
 * can turn these entries into a delegate manifest without translation.
 */
export interface ServerInfoPermission {
  service: string;
  space?: string;
  path: string;
  actions: string[];
  /** Optional user/agent-facing context for why the permission is needed. */
  description?: string;
}

/**
 * Shape of `/api/server-info`. The backend advertises its identity plus
 * the capabilities it needs the user to grant via a delegation. The
 * frontend composes this with the app manifest into a single signed
 * capability request, then materializes the delegation after sign-in.
 */
export interface ServerInfo {
  did: string;
  status: string;
  /** Human-readable name for the permission modal. Optional. */
  name?: string;
  /**
   * Expiry override for the backend delegation as an ms-format duration
   * string (e.g. `"7d"`, `"1h"`). Optional — defaults to the manifest's
   * own expiry.
   */
  expiry?: string;
  /**
   * Permissions the backend needs the user to delegate to it. Always
   * present for backends that participate in delegation flows; omitted
   * (or empty array) for backends that operate without delegation.
   */
  permissions?: ServerInfoPermission[];
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
