import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createBackendDelegationRenewer,
  delegationRenewalErrorCode,
  withDelegationAutoRenewal,
  recordBackendDelegationGrant,
  hasBackendDelegationGrantRecord,
  clearBackendDelegationGrantRecord,
  type BackendDelegationRenewerDeps,
} from "../lib/backendDelegationRenewal";
import type { ApiClient } from "@listen/client";

// ── Helpers ──────────────────────────────────────────────────────────

function createDeps(overrides: Partial<BackendDelegationRenewerDeps> = {}) {
  const deps: BackendDelegationRenewerDeps = {
    checkStatus: vi.fn().mockResolvedValue({ status: "active" }),
    hasPriorGrant: vi.fn().mockReturnValue(false),
    renew: vi.fn().mockResolvedValue(undefined),
    onRenewed: vi.fn(),
    ...overrides,
  };
  return deps;
}

class FakeApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

beforeEach(() => {
  localStorage.clear();
});

// ── Renewer trigger logic ────────────────────────────────────────────

describe("createBackendDelegationRenewer — ensureFreshDelegation", () => {
  it("does not renew when the stored delegation is active", async () => {
    const deps = createDeps({ checkStatus: vi.fn().mockResolvedValue({ status: "active" }) });
    const renewer = createBackendDelegationRenewer(deps);

    expect(await renewer.ensureFreshDelegation()).toBe(false);
    expect(deps.renew).not.toHaveBeenCalled();
  });

  it("renews silently when the stored delegation is expired", async () => {
    const deps = createDeps({ checkStatus: vi.fn().mockResolvedValue({ status: "expired" }) });
    const renewer = createBackendDelegationRenewer(deps);

    expect(await renewer.ensureFreshDelegation()).toBe(true);
    expect(deps.renew).toHaveBeenCalledTimes(1);
    expect(deps.onRenewed).toHaveBeenCalledTimes(1);
  });

  it("renews when status is none but a prior grant is known", async () => {
    const deps = createDeps({
      checkStatus: vi.fn().mockResolvedValue({ status: "none" }),
      hasPriorGrant: vi.fn().mockReturnValue(true),
    });
    const renewer = createBackendDelegationRenewer(deps);

    expect(await renewer.ensureFreshDelegation()).toBe(true);
    expect(deps.renew).toHaveBeenCalledTimes(1);
  });

  it("does not renew when status is none and the user never granted", async () => {
    const deps = createDeps({
      checkStatus: vi.fn().mockResolvedValue({ status: "none" }),
      hasPriorGrant: vi.fn().mockReturnValue(false),
    });
    const renewer = createBackendDelegationRenewer(deps);

    expect(await renewer.ensureFreshDelegation()).toBe(false);
    expect(deps.renew).not.toHaveBeenCalled();
  });

  it("returns false without throwing when the status check fails", async () => {
    const deps = createDeps({
      checkStatus: vi.fn().mockRejectedValue(new Error("network down")),
    });
    const renewer = createBackendDelegationRenewer(deps);

    expect(await renewer.ensureFreshDelegation()).toBe(false);
    expect(deps.renew).not.toHaveBeenCalled();
  });

  it("returns false without throwing when renewal itself fails", async () => {
    const deps = createDeps({
      checkStatus: vi.fn().mockResolvedValue({ status: "expired" }),
      renew: vi.fn().mockRejectedValue(new Error("SessionExpiredError")),
    });
    const renewer = createBackendDelegationRenewer(deps);

    expect(await renewer.ensureFreshDelegation()).toBe(false);
    expect(deps.onRenewed).not.toHaveBeenCalled();
  });

  it("disables itself after a failed renewal attempt (no retry loops)", async () => {
    const deps = createDeps({
      checkStatus: vi.fn().mockResolvedValue({ status: "expired" }),
      renew: vi.fn().mockRejectedValue(new Error("PermissionNotInManifestError")),
    });
    const renewer = createBackendDelegationRenewer(deps);

    expect(await renewer.ensureFreshDelegation()).toBe(false);
    expect(await renewer.ensureFreshDelegation()).toBe(false);
    expect(await renewer.renewForApiError("delegation_expired")).toBe(false);
    expect(deps.renew).toHaveBeenCalledTimes(1);
  });
});

describe("createBackendDelegationRenewer — renewForApiError", () => {
  it("renews on 401 delegation_expired regardless of grant record", async () => {
    const deps = createDeps({ hasPriorGrant: vi.fn().mockReturnValue(false) });
    const renewer = createBackendDelegationRenewer(deps);

    expect(await renewer.renewForApiError("delegation_expired")).toBe(true);
    expect(deps.renew).toHaveBeenCalledTimes(1);
  });

  it("renews on 403 no_delegation only when a prior grant is known", async () => {
    const withGrant = createDeps({ hasPriorGrant: vi.fn().mockReturnValue(true) });
    const withGrantRenewer = createBackendDelegationRenewer(withGrant);
    expect(await withGrantRenewer.renewForApiError("no_delegation")).toBe(true);
    expect(withGrant.renew).toHaveBeenCalledTimes(1);

    const withoutGrant = createDeps({ hasPriorGrant: vi.fn().mockReturnValue(false) });
    const withoutGrantRenewer = createBackendDelegationRenewer(withoutGrant);
    expect(await withoutGrantRenewer.renewForApiError("no_delegation")).toBe(false);
    expect(withoutGrant.renew).not.toHaveBeenCalled();
  });

  it("shares a single in-flight renewal across concurrent triggers", async () => {
    let resolveRenew: () => void = () => {};
    const renew = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRenew = resolve;
        }),
    );
    const deps = createDeps({
      checkStatus: vi.fn().mockResolvedValue({ status: "expired" }),
      renew,
    });
    const renewer = createBackendDelegationRenewer(deps);

    const first = renewer.ensureFreshDelegation();
    const second = renewer.renewForApiError("delegation_expired");
    const third = renewer.renewForApiError("delegation_expired");
    await Promise.resolve();
    resolveRenew();

    expect(await Promise.all([first, second, third])).toEqual([true, true, true]);
    expect(renew).toHaveBeenCalledTimes(1);
    expect(deps.onRenewed).toHaveBeenCalledTimes(1);
  });
});

// ── Error-code detection ─────────────────────────────────────────────

describe("delegationRenewalErrorCode", () => {
  it("detects delegation_expired and no_delegation error codes", () => {
    expect(delegationRenewalErrorCode(new FakeApiError(401, "delegation_expired", "expired"))).toBe(
      "delegation_expired",
    );
    expect(delegationRenewalErrorCode(new FakeApiError(403, "no_delegation", "none"))).toBe(
      "no_delegation",
    );
  });

  it("ignores other errors", () => {
    expect(delegationRenewalErrorCode(new FakeApiError(403, "delegation_stale", "stale"))).toBe(
      null,
    );
    expect(delegationRenewalErrorCode(new Error("Session expired. Please sign in again."))).toBe(
      null,
    );
    expect(delegationRenewalErrorCode(null)).toBe(null);
  });
});

// ── Reactive API wrapper ─────────────────────────────────────────────

describe("withDelegationAutoRenewal", () => {
  function apiThatFailsOnce(code: string, status: number) {
    let failed = false;
    const get = vi.fn().mockImplementation(async () => {
      if (!failed) {
        failed = true;
        throw new FakeApiError(status, code, `API error (${status})`);
      }
      return { ok: true };
    });
    return {
      client: { get, post: vi.fn(), put: vi.fn(), del: vi.fn() } as unknown as ApiClient,
      get,
    };
  }

  it("renews and retries the original request once on delegation errors", async () => {
    const { client, get } = apiThatFailsOnce("no_delegation", 403);
    const deps = createDeps({ hasPriorGrant: vi.fn().mockReturnValue(true) });
    const renewer = createBackendDelegationRenewer(deps);
    const wrapped = withDelegationAutoRenewal(client, () => renewer);

    expect(await wrapped.get("/api/workspace-state")).toEqual({ ok: true });
    expect(get).toHaveBeenCalledTimes(2);
    expect(deps.renew).toHaveBeenCalledTimes(1);
  });

  it("rethrows the original error when renewal is declined", async () => {
    const { client, get } = apiThatFailsOnce("no_delegation", 403);
    const deps = createDeps({ hasPriorGrant: vi.fn().mockReturnValue(false) });
    const renewer = createBackendDelegationRenewer(deps);
    const wrapped = withDelegationAutoRenewal(client, () => renewer);

    await expect(wrapped.get("/api/workspace-state")).rejects.toThrow("API error (403)");
    expect(get).toHaveBeenCalledTimes(1);
    expect(deps.renew).not.toHaveBeenCalled();
  });

  it("does not retry more than once even if the retry fails the same way", async () => {
    const get = vi
      .fn()
      .mockRejectedValue(new FakeApiError(403, "no_delegation", "API error (403)"));
    const client = { get, post: vi.fn(), put: vi.fn(), del: vi.fn() } as unknown as ApiClient;
    const deps = createDeps({ hasPriorGrant: vi.fn().mockReturnValue(true) });
    const renewer = createBackendDelegationRenewer(deps);
    const wrapped = withDelegationAutoRenewal(client, () => renewer);

    await expect(wrapped.get("/api/anything")).rejects.toThrow("API error (403)");
    expect(get).toHaveBeenCalledTimes(2);
    expect(deps.renew).toHaveBeenCalledTimes(1);
  });

  it("passes through when no renewer is available", async () => {
    const { client, get } = apiThatFailsOnce("no_delegation", 403);
    const wrapped = withDelegationAutoRenewal(client, () => null);

    await expect(wrapped.get("/api/anything")).rejects.toThrow("API error (403)");
    expect(get).toHaveBeenCalledTimes(1);
  });
});

// ── Grant records ────────────────────────────────────────────────────

describe("backend delegation grant records", () => {
  it("records, reads, and clears grants per address + backend DID", () => {
    expect(hasBackendDelegationGrantRecord("0xAbC", "did:key:backend")).toBe(false);

    recordBackendDelegationGrant("0xAbC", "did:key:backend");
    expect(hasBackendDelegationGrantRecord("0xabc", "did:key:backend")).toBe(true);
    expect(hasBackendDelegationGrantRecord("0xabc", "did:key:other")).toBe(false);

    clearBackendDelegationGrantRecord("0xABC", "did:key:backend");
    expect(hasBackendDelegationGrantRecord("0xabc", "did:key:backend")).toBe(false);
  });

  it("uses a listen: prefixed key so sign-out purge removes it", () => {
    recordBackendDelegationGrant("0xabc", "did:key:backend");
    const keys = Object.keys(localStorage).filter((key) =>
      key.includes("backend-delegation-grant"),
    );
    expect(keys).toHaveLength(1);
    expect(keys[0]!.startsWith("listen:")).toBe(true);
  });
});
