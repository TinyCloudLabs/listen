import { describe, expect, test } from "bun:test";
import { fingerprint } from "../lib/delegation.js";

describe("fingerprint", () => {
  test("produces hex sha256", () => {
    const fp = fingerprint("hello");
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
  });

  test("deterministic", () => {
    expect(fingerprint("hello")).toBe(fingerprint("hello"));
  });

  test("different inputs → different outputs", () => {
    expect(fingerprint("a")).not.toBe(fingerprint("b"));
  });
});
