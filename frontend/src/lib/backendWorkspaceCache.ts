import type { WorkspaceStateResponse } from "@listen/core";

const CACHE_VERSION = 2;
const CACHE_PREFIX = "listen:backend-workspace-state:v2:";
const EXPIRY_BUFFER_MS = 30_000;

export interface CachedBackendWorkspaceState {
  version: typeof CACHE_VERSION;
  address: string;
  backendDid: string;
  cachedAt: string;
  expiresAt: string;
  activation: "active";
  backendReadableSecrets: WorkspaceStateResponse["backendReadableSecrets"];
  googleMeet: WorkspaceStateResponse["googleMeet"];
  conversations: WorkspaceStateResponse["conversations"];
}

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function normalizedAddress(address: string): string {
  return address.toLowerCase();
}

export function backendWorkspaceCacheKey(address: string, backendDid: string): string {
  return `${CACHE_PREFIX}${normalizedAddress(address)}:${backendDid}`;
}

function isFresh(expiresAt: string): boolean {
  const expiry = new Date(expiresAt).getTime();
  return Number.isFinite(expiry) && expiry > Date.now() + EXPIRY_BUFFER_MS;
}

export function readBackendWorkspaceCache(
  address: string,
  backendDid: string,
): CachedBackendWorkspaceState | null {
  const localStorage = storage();
  if (!localStorage) return null;

  const key = backendWorkspaceCacheKey(address, backendDid);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedBackendWorkspaceState>;
    if (
      parsed.version !== CACHE_VERSION ||
      parsed.address?.toLowerCase() !== normalizedAddress(address) ||
      parsed.backendDid !== backendDid ||
      typeof parsed.expiresAt !== "string" ||
      !isFresh(parsed.expiresAt) ||
      parsed.activation !== "active" ||
      !parsed.backendReadableSecrets ||
      !parsed.googleMeet ||
      !parsed.conversations
    ) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed as CachedBackendWorkspaceState;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function writeBackendWorkspaceCache(
  address: string,
  backendDid: string,
  state: WorkspaceStateResponse,
): void {
  const expiresAt = state.delegation.expiresAt;
  if (
    state.delegation.status !== "active" ||
    state.delegation.activation !== "active" ||
    !expiresAt ||
    !isFresh(expiresAt)
  ) {
    return;
  }

  const localStorage = storage();
  if (!localStorage) return;

  const previous = readBackendWorkspaceCache(address, backendDid);

  const cached: CachedBackendWorkspaceState = {
    version: CACHE_VERSION,
    address: normalizedAddress(address),
    backendDid,
    cachedAt: new Date().toISOString(),
    expiresAt,
    activation: "active",
    backendReadableSecrets: state.backendReadableSecrets,
    googleMeet: state.googleMeet,
    // SQL availability is independent from delegation readiness. Never let a
    // transient unknown overwrite the last proven conversation-existence value.
    conversations:
      state.conversations.hasAny === null && previous
        ? previous.conversations
        : state.conversations,
  };

  try {
    localStorage.setItem(backendWorkspaceCacheKey(address, backendDid), JSON.stringify(cached));
  } catch {
    // Storage may be unavailable or full; the app can still use live backend checks.
  }
}

export function clearBackendWorkspaceCache(address?: string, backendDid?: string): void {
  const localStorage = storage();
  if (!localStorage) return;

  if (address && backendDid) {
    localStorage.removeItem(backendWorkspaceCacheKey(address, backendDid));
    return;
  }

  const normalized = address ? normalizedAddress(address) : null;
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key?.startsWith(CACHE_PREFIX)) continue;
    if (normalized && !key.startsWith(`${CACHE_PREFIX}${normalized}:`)) continue;
    localStorage.removeItem(key);
  }
}

export function workspaceStateFromCache(
  cached: CachedBackendWorkspaceState,
): WorkspaceStateResponse {
  return {
    delegation: {
      status: "active",
      stored: true,
      validPolicy: true,
      expiresAt: cached.expiresAt,
      activation: cached.activation,
    },
    backendReadableSecrets: cached.backendReadableSecrets,
    googleMeet: cached.googleMeet,
    conversations: cached.conversations,
  };
}
