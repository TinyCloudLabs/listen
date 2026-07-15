import type { ApiClient } from "@listen/client";

// ── Grant records ────────────────────────────────────────────────────
//
// The backend deletes expired delegation rows on first touch, so "no
// delegation" is ambiguous: it can mean "never granted" or "granted but the
// expired row was already cleaned up". We persist a small marker whenever a
// grant is known to exist so silent renewal never turns into an implicit
// first-time grant. The `listen:` prefix means sign-out's local-data purge
// removes it.

const GRANT_RECORD_PREFIX = "listen:backend-delegation-grant:v1:";

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function grantRecordKey(address: string, backendDid: string): string {
  return `${GRANT_RECORD_PREFIX}${address.toLowerCase()}:${backendDid}`;
}

export function recordBackendDelegationGrant(address: string, backendDid: string): void {
  try {
    storage()?.setItem(grantRecordKey(address, backendDid), new Date().toISOString());
  } catch {
    // Storage may be unavailable or full; renewal then falls back to the
    // explicit re-grant UI.
  }
  // A fresh grant supersedes any recent sign-out revoke: the user (or a
  // re-sign-in) actively re-established access, so the resurrection guard
  // below must no longer block renewal.
  clearDelegationRevoked();
}

export function hasBackendDelegationGrantRecord(address: string, backendDid: string): boolean {
  try {
    return storage()?.getItem(grantRecordKey(address, backendDid)) !== null;
  } catch {
    return false;
  }
}

export function clearBackendDelegationGrantRecord(address: string, backendDid: string): void {
  try {
    storage()?.removeItem(grantRecordKey(address, backendDid));
  } catch {
    // Ignore storage failures.
  }
}

// ── Sign-out revoke tombstone (same-browser resurrection guard) ──────
//
// Sign-out durably revokes the backend delegation, but the unconditional
// renewal paths below (status "expired"/"stale", or a 401 delegation_expired
// on any in-flight gated request) would silently re-grant it in the same
// browser. We persist a short-lived tombstone at sign-out and gate ALL
// renewals on it, so a signed-out user's delegation stays revoked. This is a
// same-browser guard only; other still-authenticated devices/tabs hold live
// credentials and may legitimately re-establish the delegation (documented in
// knowledge/operations.md). The `listen:` prefix means sign-out's local-data
// purge would remove it, so callers set it AFTER purging.

const REVOKED_AT_KEY = "listen:revoked-at";
const REVOKED_AT_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Mark that the backend delegation was just revoked at sign-out. */
export function recordDelegationRevoked(): void {
  try {
    storage()?.setItem(REVOKED_AT_KEY, String(Date.now()));
  } catch {
    // Storage unavailable; the server-side tombstone still holds, only the
    // same-browser resurrection guard is lost.
  }
}

/** Clear the sign-out revoke tombstone (called when a fresh grant is recorded). */
export function clearDelegationRevoked(): void {
  try {
    storage()?.removeItem(REVOKED_AT_KEY);
  } catch {
    // Ignore storage failures.
  }
}

/** Whether a sign-out revoke happened within the TTL window. */
export function wasRecentlyRevoked(): boolean {
  try {
    const raw = storage()?.getItem(REVOKED_AT_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    if (Date.now() - at > REVOKED_AT_TTL_MS) {
      storage()?.removeItem(REVOKED_AT_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// ── Renewal trigger logic ────────────────────────────────────────────

export type DelegationRenewalErrorCode = "delegation_expired" | "no_delegation";

export interface BackendDelegationRenewerDeps {
  /** GET /api/delegations/status — returns { status: "active" | "expired" | "none" }. */
  checkStatus: () => Promise<{ status: string }>;
  /** Whether the frontend has evidence a backend grant previously existed. */
  hasPriorGrant: () => boolean;
  /**
   * Create and send a fresh delegation. Must throw on failure (including
   * when the session cannot derive the delegation silently).
   */
  renew: () => Promise<void>;
  /** Called exactly once after a successful renewal. */
  onRenewed?: () => void;
  /** Optional debug hook. */
  log?: (event: string, detail?: Record<string, unknown>) => void;
}

export interface BackendDelegationRenewer {
  /**
   * Proactive check on sign-in / session restore. Renews when the stored
   * delegation is expired, or missing with evidence of a prior grant.
   * Never throws; returns whether a renewal happened.
   */
  ensureFreshDelegation(): Promise<boolean>;
  /**
   * Reactive renewal after a gated API call failed. `delegation_expired`
   * always renews (the row existed until this request); `no_delegation`
   * renews only with prior-grant evidence. Never throws; returns whether a
   * renewal happened (callers should retry the original request once).
   */
  renewForApiError(code: DelegationRenewalErrorCode): Promise<boolean>;
}

export function createBackendDelegationRenewer(
  deps: BackendDelegationRenewerDeps,
): BackendDelegationRenewer {
  let inFlight: Promise<boolean> | null = null;
  let disabled = false;

  const log = deps.log ?? (() => {});

  const renewOnce = (): Promise<boolean> => {
    if (disabled) return Promise.resolve(false);
    // Same-browser sign-out revoke guard: never resurrect a just-revoked
    // delegation, even on the unconditional expired/stale/401 paths.
    if (wasRecentlyRevoked()) {
      log("skip-revoked");
      return Promise.resolve(false);
    }
    if (!inFlight) {
      inFlight = deps
        .renew()
        .then(() => {
          log("renewed");
          deps.onRenewed?.();
          return true;
        })
        .catch((err) => {
          // Silent path only: a failed renewal (expired TinyCloud session,
          // permissions outside the signed manifest, backend rejection)
          // degrades to the existing re-grant UI. Latch off so API errors
          // don't hammer the delegation endpoint.
          disabled = true;
          log("renewal-failed", {
            error: err instanceof Error ? err.message : String(err),
          });
          return false;
        })
        .finally(() => {
          inFlight = null;
        });
    }
    return inFlight;
  };

  return {
    async ensureFreshDelegation(): Promise<boolean> {
      if (disabled) return false;
      let status: string;
      try {
        ({ status } = await deps.checkStatus());
      } catch (err) {
        log("status-check-failed", {
          error: err instanceof Error ? err.message : String(err),
        });
        return false;
      }

      if (status === "expired") return renewOnce();
      if (status === "none" && deps.hasPriorGrant()) return renewOnce();
      log("no-renewal-needed", { status });
      return false;
    },

    async renewForApiError(code: DelegationRenewalErrorCode): Promise<boolean> {
      if (code === "delegation_expired") return renewOnce();
      if (code === "no_delegation" && deps.hasPriorGrant()) return renewOnce();
      return false;
    },
  };
}

// ── Reactive API-client wrapper ──────────────────────────────────────

/**
 * Extract the delegation-renewal trigger code from an API client error.
 * Matches errors carrying a `code` property (ApiRequestError from
 * @listen/client) by shape so it survives bundling/mocking.
 */
export function delegationRenewalErrorCode(err: unknown): DelegationRenewalErrorCode | null {
  if (typeof err !== "object" || err === null) return null;
  const code = (err as { code?: unknown }).code;
  return code === "delegation_expired" || code === "no_delegation" ? code : null;
}

/**
 * Wrap an ApiClient so requests failing with `401 delegation_expired` or
 * `403 no_delegation` trigger a silent delegation renewal and a single retry
 * of the original request. When renewal is unavailable or declined, the
 * original error propagates unchanged.
 */
export function withDelegationAutoRenewal(
  api: ApiClient,
  getRenewer: () => BackendDelegationRenewer | null,
): ApiClient {
  const wrap = async <Result>(operation: () => Promise<Result>): Promise<Result> => {
    try {
      return await operation();
    } catch (err) {
      const code = delegationRenewalErrorCode(err);
      const renewer = code ? getRenewer() : null;
      if (code && renewer && (await renewer.renewForApiError(code))) {
        return operation();
      }
      throw err;
    }
  };

  return {
    get<T>(path: string): Promise<T> {
      return wrap(() => api.get<T>(path));
    },
    post<T>(path: string, body?: unknown): Promise<T> {
      return wrap(() => (body === undefined ? api.post<T>(path) : api.post<T>(path, body)));
    },
    put<T>(path: string, body?: unknown): Promise<T> {
      return wrap(() => (body === undefined ? api.put<T>(path) : api.put<T>(path, body)));
    },
    del<T>(path: string): Promise<T> {
      return wrap(() => api.del<T>(path));
    },
  };
}
