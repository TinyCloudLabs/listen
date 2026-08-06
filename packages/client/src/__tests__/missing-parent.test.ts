import { describe, expect, test } from "bun:test";
import {
  MissingParentDelegationError,
  isMissingParentDelegationError,
  normalizeMissingParentDelegationError,
} from "../missing-parent.js";

describe("missing parent delegation detection", () => {
  test("matches the observed node failure and wrapped variants", () => {
    expect(
      isMissingParentDelegationError(
        new Error("Failed to activate delegation with host: Cannot find parent delegation"),
      ),
    ).toBe(true);
    expect(
      isMissingParentDelegationError(
        new Error("submission failed", {
          cause: new Error("CANNOT FIND PARENT DELEGATION"),
        }),
      ),
    ).toBe(true);
    expect(
      isMissingParentDelegationError({
        body: JSON.stringify({ error: { code: "missing_parent_delegation" } }),
      }),
    ).toBe(true);
  });

  test("handles cyclic causes without broad false positives", () => {
    const cyclic: { cause?: unknown; message: string } = { message: "401 UNAUTHORIZED" };
    cyclic.cause = cyclic;

    expect(isMissingParentDelegationError(cyclic)).toBe(false);
    expect(isMissingParentDelegationError(new Error("Failed to fetch"))).toBe(false);
    expect(isMissingParentDelegationError(new Error("Cannot find delegation"))).toBe(false);
  });

  test("normalizes only missing-parent failures and preserves the cause", () => {
    const cause = new Error("Cannot find parent delegation");
    const normalized = normalizeMissingParentDelegationError(cause);

    expect(normalized).toBeInstanceOf(MissingParentDelegationError);
    expect((normalized as MissingParentDelegationError).cause).toBe(cause);

    const network = new Error("Failed to fetch");
    expect(normalizeMissingParentDelegationError(network)).toBe(network);
  });
});
