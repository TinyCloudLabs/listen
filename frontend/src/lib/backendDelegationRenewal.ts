import { isMissingParentDelegationError, type ApiClient } from "@listen/client";

// ── Grant records ────────────────────────────────────────────────────
//
// The backend deletes expired delegation rows on first touch, so "no
// delegation" is ambiguous: it can mean "never granted" or "granted but the
// expired row was already cleaned up". We persist a small marker whenever a
// grant is known to exist so silent renewal never turns into an implicit
// first-time grant. The `listen:` prefix means sign-out's local-data purge
// removes it.

const GRANT_RECORD_PREFIX = "listen:backend-delegation-grant:v1:";
const RENEWAL_RETRY_COOLDOWN_MS = 30_000;

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

// ── Renewal trigger logic ────────────────────────────────────────────

export type DelegationRenewalErrorCode =
  | "delegation_expired"
  | "delegation_stale"
  | "no_delegation";

export interface BackendDelegationRenewerDeps {
  /** GET /api/delegations/status — returns { status: "active" | "expired" | "stale" | "none" }. */
  checkStatus: () => Promise<{ status: string }>;
  /** Materialize a child delegation locally to prove the restored parent still exists on the node. */
  validateParent: () => Promise<void>;
  /** Whether the frontend has evidence a backend grant previously existed. */
  hasPriorGrant: () => boolean;
  /**
   * Create and send a fresh delegation. Must throw on failure (including
   * when the session cannot derive the delegation silently).
   */
  renew: () => Promise<void>;
  /** Called exactly once after a successful renewal. */
  onRenewed?: () => void;
  /** Called when a renewal attempt fails, including whether the failure latched renewal off. */
  onRenewalFailed?: (info: { permanent: boolean; error: unknown }) => void;
  /** Optional debug hook. */
  log?: (event: string, detail?: Record<string, unknown>) => void;
}

export interface BackendDelegationRenewer {
  /**
   * Proactive check on sign-in / session restore. Renews when the stored
   * delegation is expired or stale (policy hash rotated), or missing with
   * evidence of a prior grant. Never throws; returns whether a renewal
   * happened.
   */
  ensureFreshDelegation(): Promise<boolean>;
  /**
   * Validate a restored browser session against the real delegation path.
   * Always materializes a child locally, even when the backend has no grant or
   * its status endpoint is unavailable, so a node-lost parent is found before
   * the restored TinyCloud instance is committed to application state.
   */
  validateRestoredSession(options?: { replaceBackendGrant?: boolean }): Promise<boolean>;
  /**
   * Reactive renewal after a gated API call failed. `delegation_expired`
   * and `delegation_stale` always renew (the row existed until this
   * request); `no_delegation` renews only with prior-grant evidence. Never
   * throws; returns whether a renewal happened (callers should retry the
   * original request once).
   */
  renewForApiError(code: DelegationRenewalErrorCode): Promise<boolean>;
  /** Clear the permanent latch and transient cooldown (call after a successful manual re-grant). */
  reset(): void;
}

function isPermanentRenewalFailure(err: unknown): boolean {
  if (isMissingParentDelegationError(err)) return true;
  if (typeof err !== "object" || err === null) return false;
  const name = (err as { name?: unknown }).name;
  const message = err instanceof Error ? err.message : "";
  if (name === "SessionExpiredError" || name === "PermissionNotInManifestError") return true;
  if (/SessionExpiredError|PermissionNotInManifestError/.test(message)) return true;
  if (message.includes("Missing backend session token")) return true;
  const status = (err as { status?: unknown }).status;
  // Backend rejected the delegation itself (4xx) — but 429 is a rate limit, retry-able.
  return typeof status === "number" && status >= 400 && status < 500 && status !== 429;
}

export function createBackendDelegationRenewer(
  deps: BackendDelegationRenewerDeps,
): BackendDelegationRenewer {
  let inFlight: Promise<boolean> | null = null;
  let disabled = false;
  let lastTransientFailureAt: number | null = null;

  const log = deps.log ?? (() => {});

  const recordFailure = (err: unknown): void => {
    if (isPermanentRenewalFailure(err)) {
      disabled = true;
      log("renewal-failed", {
        permanent: true,
        error: err instanceof Error ? err.message : String(err),
      });
      deps.onRenewalFailed?.({ permanent: true, error: err });
    } else {
      lastTransientFailureAt = Date.now();
      log("renewal-failed", {
        permanent: false,
        error: err instanceof Error ? err.message : String(err),
      });
      deps.onRenewalFailed?.({ permanent: false, error: err });
    }
  };

  const renewOnce = (): Promise<boolean> => {
    if (disabled) return Promise.resolve(false);
    if (
      lastTransientFailureAt !== null &&
      Date.now() - lastTransientFailureAt < RENEWAL_RETRY_COOLDOWN_MS
    ) {
      return Promise.resolve(false);
    }
    if (!inFlight) {
      inFlight = deps
        .renew()
        .then(() => {
          lastTransientFailureAt = null;
          log("renewed");
          deps.onRenewed?.();
          return true;
        })
        .catch((err) => {
          recordFailure(err);
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

      if (status === "expired" || status === "stale") return renewOnce();
      if (status === "none" && deps.hasPriorGrant()) return renewOnce();
      log("no-renewal-needed", { status });
      return false;
    },

    async validateRestoredSession(options): Promise<boolean> {
      if (disabled) return false;
      try {
        await deps.validateParent();
      } catch (err) {
        recordFailure(err);
        return false;
      }

      // Manual missing-parent recovery creates a new root, so the backend's
      // previously active child is necessarily stale. Replace it regardless
      // of the status endpoint or local grant marker, and report success only
      // after the backend accepts the new chain.
      if (options?.replaceBackendGrant) return renewOnce();

      let status: string;
      try {
        ({ status } = await deps.checkStatus());
      } catch (err) {
        log("status-check-failed", {
          error: err instanceof Error ? err.message : String(err),
        });
        return true;
      }

      if (status === "active") {
        log("restored-parent-valid");
        return true;
      }
      if (status === "expired" || status === "stale") {
        const renewed = await renewOnce();
        return renewed || !disabled;
      }
      if (status === "none" && deps.hasPriorGrant()) {
        const renewed = await renewOnce();
        return renewed || !disabled;
      }
      log("no-restored-grant", { status });
      return true;
    },

    async renewForApiError(code: DelegationRenewalErrorCode): Promise<boolean> {
      if (code === "delegation_expired" || code === "delegation_stale") return renewOnce();
      if (code === "no_delegation" && deps.hasPriorGrant()) return renewOnce();
      return false;
    },

    reset(): void {
      disabled = false;
      lastTransientFailureAt = null;
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
  return code === "delegation_expired" || code === "delegation_stale" || code === "no_delegation"
    ? code
    : null;
}

/**
 * Wrap an ApiClient so requests failing with `401 delegation_expired`,
 * `403 delegation_stale`, or `403 no_delegation` trigger a silent delegation
 * renewal and a single retry of the original request. When renewal is
 * unavailable or declined, the original error propagates unchanged.
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
