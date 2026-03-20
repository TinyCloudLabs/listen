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

export type StoreType = "kv" | "sql";

// ── Constants ────────────────────────────────────────────────────────

/** Default TinyCloud actions for item CRUD (KV + SQL) */
export const DEFAULT_DELEGATION_ACTIONS = [
  "tinycloud.kv/get",
  "tinycloud.kv/put",
  "tinycloud.kv/del",
  "tinycloud.kv/list",
  "tinycloud.sql/read",
  "tinycloud.sql/write",
] as const;

/** Default delegation path scope — scoped to items/ for the boilerplate's CRUD routes */
export const DEFAULT_DELEGATION_PATH = "items/";

/** Default delegation expiry: 7 days */
export const DEFAULT_DELEGATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/** DelegatedAccess cache TTL: 50 minutes (under 1-hour sub-session cap) */
export const DELEGATION_CACHE_TTL_MS = 50 * 60 * 1000;
