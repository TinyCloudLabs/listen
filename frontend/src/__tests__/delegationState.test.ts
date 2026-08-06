import { describe, expect, it } from "vitest";
import { classifyDelegationFailure, classifyDelegationState } from "../lib/delegationState";

describe("delegation lifecycle classification", () => {
  it("treats an active delegation as ready", () => {
    expect(classifyDelegationState({ status: "active", activation: "active" })).toBe("ready");
  });

  it.each(["none", "expired", "stale"])("treats %s as needing consent", (status) => {
    expect(classifyDelegationState({ status, activation: "unknown" })).toBe("needs_consent");
  });

  it.each(["pending", "failed", "unknown"])(
    "treats active/%s activation as unavailable",
    (activation) => {
      expect(classifyDelegationState({ status: "active", activation })).toBe("unavailable");
    },
  );

  it.each([
    Object.assign(new Error("session expired"), { name: "SessionExpiredError" }),
    Object.assign(new Error("missing permission"), { name: "PermissionNotInManifestError" }),
    { status: 400, code: "delegation_expired_at_grant" },
  ])("classifies explicit owner-authority failures as needs_consent", (error) => {
    expect(classifyDelegationFailure(error)).toBe("needs_consent");
  });

  it.each([
    { status: 400, code: "unknown_client_error" },
    { status: 429, code: "rate_limited" },
    { status: 504, code: "gateway_timeout" },
    Object.assign(new Error("cannot find parent delegation"), {
      code: "missing_parent_delegation",
    }),
  ])("classifies operational failures as unavailable", (error) => {
    expect(classifyDelegationFailure(error)).toBe("unavailable");
  });
});
