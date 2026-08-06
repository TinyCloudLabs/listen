import { isMissingParentDelegationError, type ApiClient } from "@listen/client";
import { classifyDelegationFailure } from "./delegationState";

const RENEWAL_RETRY_COOLDOWN_MS = 30_000;

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
  /**
   * Create and send a fresh delegation. Must throw on failure (including
   * when the session cannot derive the delegation silently).
   */
  renew: () => Promise<{ activation?: string } | void>;
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
   * delegation is expired or stale (policy hash rotated). Never throws; returns whether a renewal
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
   * and `delegation_stale` always renew. `no_delegation` never renews because
   * absence is not owner consent. Never
   * throws; returns whether a renewal happened (callers should retry the
   * original request once).
   */
  renewForApiError(code: DelegationRenewalErrorCode): Promise<boolean>;
  /** Clear the permanent latch and transient cooldown (call after a successful manual re-grant). */
  reset(): void;
}

function isPermanentRenewalFailure(err: unknown): boolean {
  if (isMissingParentDelegationError(err)) return true;
  return classifyDelegationFailure(err) === "needs_consent";
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
        .then((response) => {
          if (response !== undefined && response.activation !== "active") {
            throw Object.assign(
              new Error("Backend accepted the delegation but activation is pending"),
              {
                code: "delegation_activation_pending",
              },
            );
          }
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
        recordFailure(err);
        log("status-check-failed", {
          error: err instanceof Error ? err.message : String(err),
        });
        return false;
      }

      if (status === "expired" || status === "stale") return renewOnce();
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
        // A status rejection is an operationally unknown result, not proof
        // that the owner must consent again. Keep the restored session usable
        // for read-only rechecks while latching the transient outcome.
        recordFailure(err);
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
      log("no-restored-grant", { status });
      return true;
    },

    async renewForApiError(code: DelegationRenewalErrorCode): Promise<boolean> {
      if (code === "delegation_expired" || code === "delegation_stale") return renewOnce();
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
