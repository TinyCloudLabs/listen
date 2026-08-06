import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createBackendDelegationRenewer,
  delegationRenewalErrorCode,
  withDelegationAutoRenewal,
  type BackendDelegationRenewerDeps,
} from "../lib/backendDelegationRenewal";
import type { ApiClient } from "@listen/client";

// ── Helpers ──────────────────────────────────────────────────────────

function createDeps(overrides: Partial<BackendDelegationRenewerDeps> = {}) {
  const deps: BackendDelegationRenewerDeps = {
    checkStatus: vi.fn().mockResolvedValue({ status: "active" }),
    validateParent: vi.fn().mockResolvedValue(undefined),
    renew: vi.fn().mockResolvedValue(undefined),
    onRenewed: vi.fn(),
    onRenewalFailed: vi.fn(),
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

afterEach(() => {
  vi.useRealTimers();
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

  it("renews silently when the stored delegation is stale", async () => {
    const deps = createDeps({
      checkStatus: vi.fn().mockResolvedValue({ status: "stale" }),
    });
    const renewer = createBackendDelegationRenewer(deps);

    expect(await renewer.ensureFreshDelegation()).toBe(true);
    expect(deps.renew).toHaveBeenCalledTimes(1);
    expect(deps.onRenewed).toHaveBeenCalledTimes(1);
  });

  it("does not report a pending activation as renewed", async () => {
    const onRenewalFailed = vi.fn();
    const deps = createDeps({
      checkStatus: vi.fn().mockResolvedValue({ status: "expired" }),
      renew: vi.fn().mockResolvedValue({ activation: "pending" }),
      onRenewalFailed,
    });
    const renewer = createBackendDelegationRenewer(deps);

    expect(await renewer.ensureFreshDelegation()).toBe(false);
    expect(deps.onRenewed).not.toHaveBeenCalled();
    expect(onRenewalFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "delegation_activation_pending" }),
      }),
    );
  });

  it("does not renew when status is none", async () => {
    const deps = createDeps({ checkStatus: vi.fn().mockResolvedValue({ status: "none" }) });
    const renewer = createBackendDelegationRenewer(deps);

    expect(await renewer.ensureFreshDelegation()).toBe(false);
    expect(deps.renew).not.toHaveBeenCalled();
  });

  it("returns false without throwing when the status check fails", async () => {
    const onRenewalFailed = vi.fn();
    const deps = createDeps({
      checkStatus: vi.fn().mockRejectedValue(new Error("network down")),
      onRenewalFailed,
    });
    const renewer = createBackendDelegationRenewer(deps);

    expect(await renewer.ensureFreshDelegation()).toBe(false);
    expect(deps.renew).not.toHaveBeenCalled();
    expect(onRenewalFailed).toHaveBeenCalledWith(
      expect.objectContaining({ permanent: false, error: expect.any(Error) }),
    );
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

describe("createBackendDelegationRenewer — validateRestoredSession", () => {
  it("validates an active delegation without sending it again", async () => {
    const deps = createDeps({
      checkStatus: vi.fn().mockResolvedValue({ status: "active" }),
    });
    const renewer = createBackendDelegationRenewer(deps);

    expect(await renewer.validateRestoredSession()).toBe(true);
    expect(deps.validateParent).toHaveBeenCalledTimes(1);
    expect(deps.renew).not.toHaveBeenCalled();
  });

  it("replaces an active backend grant after manual parent recovery", async () => {
    const deps = createDeps({
      checkStatus: vi.fn().mockResolvedValue({ status: "active" }),
    });
    const renewer = createBackendDelegationRenewer(deps);

    expect(await renewer.validateRestoredSession({ replaceBackendGrant: true })).toBe(true);
    expect(deps.validateParent).toHaveBeenCalledTimes(1);
    expect(deps.renew).toHaveBeenCalledTimes(1);
  });

  it("requires backend acceptance when manual recovery replaces the grant", async () => {
    const deps = createDeps({
      checkStatus: vi.fn().mockRejectedValue(new Error("status unavailable")),
      renew: vi.fn().mockRejectedValue(new TypeError("network down")),
    });
    const renewer = createBackendDelegationRenewer(deps);

    expect(await renewer.validateRestoredSession({ replaceBackendGrant: true })).toBe(false);
    expect(deps.validateParent).toHaveBeenCalledTimes(1);
    expect(deps.checkStatus).not.toHaveBeenCalled();
    expect(deps.renew).toHaveBeenCalledTimes(1);
  });

  it("latches a missing parent and does not retry automatically", async () => {
    const failure = Object.assign(new Error("dead parent"), {
      code: "missing_parent_delegation",
    });
    const deps = createDeps({
      validateParent: vi.fn().mockRejectedValue(failure),
    });
    const renewer = createBackendDelegationRenewer(deps);

    expect(await renewer.validateRestoredSession()).toBe(false);
    expect(await renewer.validateRestoredSession()).toBe(false);
    expect(deps.validateParent).toHaveBeenCalledTimes(1);
    expect(deps.renew).not.toHaveBeenCalled();
    expect(deps.onRenewalFailed).toHaveBeenCalledWith({ permanent: true, error: failure });
  });

  it("validates the parent without creating a first backend grant when the backend has none", async () => {
    const deps = createDeps({
      checkStatus: vi.fn().mockResolvedValue({ status: "none" }),
    });
    const renewer = createBackendDelegationRenewer(deps);

    expect(await renewer.validateRestoredSession()).toBe(true);
    expect(deps.validateParent).toHaveBeenCalledTimes(1);
    expect(deps.renew).not.toHaveBeenCalled();
  });

  it("accepts a node-validated parent when backend status is temporarily unavailable", async () => {
    const deps = createDeps({
      checkStatus: vi.fn().mockRejectedValue(new Error("network down")),
    });
    const renewer = createBackendDelegationRenewer(deps);

    expect(await renewer.validateRestoredSession()).toBe(true);
    expect(deps.validateParent).toHaveBeenCalledTimes(1);
    expect(deps.renew).not.toHaveBeenCalled();
  });

  it("records a transient status rejection without converting later expiry into consent", async () => {
    const statusError = Object.assign(new Error("status temporarily unavailable"), {
      code: "gateway_timeout",
    });
    const onRenewalFailed = vi.fn();
    const deps = createDeps({
      checkStatus: vi.fn().mockRejectedValue(statusError),
      onRenewalFailed,
    });
    const renewer = createBackendDelegationRenewer(deps);

    expect(await renewer.validateRestoredSession()).toBe(true);
    expect(onRenewalFailed).toHaveBeenCalledWith({ permanent: false, error: statusError });
    expect(await renewer.renewForApiError("delegation_expired")).toBe(false);
    expect(await renewer.renewForApiError("delegation_stale")).toBe(false);
    expect(deps.renew).not.toHaveBeenCalled();
  });
});

describe("createBackendDelegationRenewer — renewForApiError", () => {
  it("renews on 401 delegation_expired", async () => {
    const deps = createDeps();
    const renewer = createBackendDelegationRenewer(deps);

    expect(await renewer.renewForApiError("delegation_expired")).toBe(true);
    expect(deps.renew).toHaveBeenCalledTimes(1);
  });

  it("renews on 403 delegation_stale", async () => {
    const deps = createDeps();
    const renewer = createBackendDelegationRenewer(deps);

    expect(await renewer.renewForApiError("delegation_stale")).toBe(true);
    expect(deps.renew).toHaveBeenCalledTimes(1);
  });

  it("does not renew on 403 no_delegation", async () => {
    const deps = createDeps();
    const renewer = createBackendDelegationRenewer(deps);
    expect(await renewer.renewForApiError("no_delegation")).toBe(false);
    expect(deps.renew).not.toHaveBeenCalled();
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

describe("renewal failure latch", () => {
  it("transient network failure does not latch; renewal retries after the cooldown", async () => {
    vi.useFakeTimers();
    const renew = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValue(undefined);
    const onRenewalFailed = vi.fn();
    const deps = createDeps({ renew, onRenewalFailed });
    const renewer = createBackendDelegationRenewer(deps);

    expect(await renewer.renewForApiError("delegation_expired")).toBe(false);
    vi.advanceTimersByTime(30_001);
    expect(await renewer.renewForApiError("delegation_expired")).toBe(true);

    expect(renew).toHaveBeenCalledTimes(2);
    expect(onRenewalFailed).toHaveBeenCalledTimes(1);
    expect(onRenewalFailed).toHaveBeenCalledWith(
      expect.objectContaining({ permanent: false, error: expect.any(TypeError) }),
    );
  });

  it("transient failure within the cooldown does not re-attempt renew", async () => {
    vi.useFakeTimers();
    const renew = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValue(undefined);
    const onRenewalFailed = vi.fn();
    const deps = createDeps({ renew, onRenewalFailed });
    const renewer = createBackendDelegationRenewer(deps);

    expect(await renewer.renewForApiError("delegation_expired")).toBe(false);
    expect(await renewer.renewForApiError("delegation_expired")).toBe(false);

    expect(renew).toHaveBeenCalledTimes(1);
    expect(onRenewalFailed).toHaveBeenCalledTimes(1);
    expect(onRenewalFailed).toHaveBeenCalledWith(
      expect.objectContaining({ permanent: false, error: expect.any(TypeError) }),
    );
  });

  it("permanent failure latches and reports onRenewalFailed({permanent:true})", async () => {
    const renew = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error("session expired"), { name: "SessionExpiredError" }),
      );
    const onRenewalFailed = vi.fn();
    const deps = createDeps({ renew, onRenewalFailed });
    const renewer = createBackendDelegationRenewer(deps);

    expect(await renewer.renewForApiError("delegation_expired")).toBe(false);
    expect(onRenewalFailed).toHaveBeenCalledTimes(1);
    expect(onRenewalFailed).toHaveBeenCalledWith(
      expect.objectContaining({ permanent: true, error: expect.any(Error) }),
    );

    expect(await renewer.renewForApiError("delegation_expired")).toBe(false);
    expect(renew).toHaveBeenCalledTimes(1);
  });

  it("a backend 4xx rejection is permanent", async () => {
    const renew = vi
      .fn()
      .mockRejectedValue(new FakeApiError(400, "delegation_policy_mismatch", "bad"));
    const onRenewalFailed = vi.fn();
    const deps = createDeps({ renew, onRenewalFailed });
    const renewer = createBackendDelegationRenewer(deps);

    expect(await renewer.renewForApiError("delegation_expired")).toBe(false);
    expect(await renewer.renewForApiError("delegation_expired")).toBe(false);

    expect(renew).toHaveBeenCalledTimes(1);
    expect(onRenewalFailed).toHaveBeenCalledTimes(1);
    expect(onRenewalFailed).toHaveBeenCalledWith(
      expect.objectContaining({ permanent: true, error: expect.any(FakeApiError) }),
    );
  });

  it("a backend 429 rate limit is transient, not permanent", async () => {
    vi.useFakeTimers();
    const renew = vi
      .fn()
      .mockRejectedValueOnce(new FakeApiError(429, "rate_limited", "slow down"))
      .mockResolvedValue(undefined);
    const onRenewalFailed = vi.fn();
    const deps = createDeps({ renew, onRenewalFailed });
    const renewer = createBackendDelegationRenewer(deps);

    expect(await renewer.renewForApiError("delegation_expired")).toBe(false);
    expect(onRenewalFailed).toHaveBeenCalledTimes(1);
    expect(onRenewalFailed).toHaveBeenCalledWith(
      expect.objectContaining({ permanent: false, error: expect.any(FakeApiError) }),
    );

    vi.advanceTimersByTime(30_001);
    expect(await renewer.renewForApiError("delegation_expired")).toBe(true);
    expect(renew).toHaveBeenCalledTimes(2);
  });

  it("reset() clears the permanent latch so a later trigger renews again", async () => {
    const renew = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error("session expired"), { name: "SessionExpiredError" }),
      )
      .mockResolvedValue(undefined);
    const deps = createDeps({ renew });
    const renewer = createBackendDelegationRenewer(deps);

    expect(await renewer.renewForApiError("delegation_expired")).toBe(false);
    renewer.reset();
    expect(await renewer.renewForApiError("delegation_expired")).toBe(true);

    expect(renew).toHaveBeenCalledTimes(2);
  });
});

// ── Error-code detection ─────────────────────────────────────────────

describe("delegationRenewalErrorCode", () => {
  it("detects delegation_expired, no_delegation, and delegation_stale error codes", () => {
    expect(delegationRenewalErrorCode(new FakeApiError(401, "delegation_expired", "expired"))).toBe(
      "delegation_expired",
    );
    expect(delegationRenewalErrorCode(new FakeApiError(403, "no_delegation", "none"))).toBe(
      "no_delegation",
    );
    expect(delegationRenewalErrorCode(new FakeApiError(403, "delegation_stale", "stale"))).toBe(
      "delegation_stale",
    );
  });

  it("ignores other errors", () => {
    expect(delegationRenewalErrorCode(new FakeApiError(403, "insufficient_scope", "nope"))).toBe(
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

  it("does not renew or retry the original request for no_delegation", async () => {
    const { client, get } = apiThatFailsOnce("no_delegation", 403);
    const deps = createDeps();
    const renewer = createBackendDelegationRenewer(deps);
    const wrapped = withDelegationAutoRenewal(client, () => renewer);

    await expect(wrapped.get("/api/workspace-state")).rejects.toThrow("API error (403)");
    expect(get).toHaveBeenCalledTimes(1);
    expect(deps.renew).not.toHaveBeenCalled();
  });

  it("renews and retries on 403 delegation_stale without a grant record", async () => {
    const { client, get } = apiThatFailsOnce("delegation_stale", 403);
    const deps = createDeps();
    const renewer = createBackendDelegationRenewer(deps);
    const wrapped = withDelegationAutoRenewal(client, () => renewer);

    expect(await wrapped.get("/api/workspace-state")).toEqual({ ok: true });
    expect(get).toHaveBeenCalledTimes(2);
    expect(deps.renew).toHaveBeenCalledTimes(1);
  });

  it("rethrows the original error when renewal is declined", async () => {
    const { client, get } = apiThatFailsOnce("no_delegation", 403);
    const deps = createDeps();
    const renewer = createBackendDelegationRenewer(deps);
    const wrapped = withDelegationAutoRenewal(client, () => renewer);

    await expect(wrapped.get("/api/workspace-state")).rejects.toThrow("API error (403)");
    expect(get).toHaveBeenCalledTimes(1);
    expect(deps.renew).not.toHaveBeenCalled();
  });

  it("does not retry no_delegation even if the request fails repeatedly", async () => {
    const get = vi
      .fn()
      .mockRejectedValue(new FakeApiError(403, "no_delegation", "API error (403)"));
    const client = { get, post: vi.fn(), put: vi.fn(), del: vi.fn() } as unknown as ApiClient;
    const deps = createDeps();
    const renewer = createBackendDelegationRenewer(deps);
    const wrapped = withDelegationAutoRenewal(client, () => renewer);

    await expect(wrapped.get("/api/anything")).rejects.toThrow("API error (403)");
    expect(get).toHaveBeenCalledTimes(1);
    expect(deps.renew).not.toHaveBeenCalled();
  });

  it("passes through when no renewer is available", async () => {
    const { client, get } = apiThatFailsOnce("no_delegation", 403);
    const wrapped = withDelegationAutoRenewal(client, () => null);

    await expect(wrapped.get("/api/anything")).rejects.toThrow("API error (403)");
    expect(get).toHaveBeenCalledTimes(1);
  });
});
