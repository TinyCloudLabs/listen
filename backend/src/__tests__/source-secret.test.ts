import { describe, expect, it } from "bun:test";
import { readSourceApiKeyResult } from "../services/source-secret.js";

function createAccess(result: unknown) {
  return {
    secrets: {
      get: async () => result,
    },
  } as any;
}

describe("source secret access", () => {
  it("returns the decrypted secret string when access succeeds", async () => {
    const access = createAccess({ ok: true, data: "secret-value" });

    const result = await readSourceApiKeyResult(access, "FIREFLIES_API_KEY");

    expect(result).toEqual({ ok: true, data: "secret-value" });
  });

  it("reports missing secret access when the delegation has no secrets surface", async () => {
    const result = await readSourceApiKeyResult(undefined, "FIREFLIES_API_KEY");

    expect(result).toEqual({
      ok: false,
      reason: "unavailable",
      error: {
        code: "SECRETS_ACCESS_MISSING",
        message: "Delegation does not include TinyCloud Secrets access",
      },
    });
  });

  it("passes through decrypt denials from the backend secret path", async () => {
    const access = createAccess({
      ok: false,
      error: { code: "PERMISSION_DENIED", message: "decrypt denied" },
    });

    const result = await readSourceApiKeyResult(access, "FIREFLIES_API_KEY");

    expect(result).toEqual({
      ok: false,
      reason: "unavailable",
      error: { code: "PERMISSION_DENIED", message: "decrypt denied" },
    });
  });

  it.each(["KEY_NOT_FOUND", "not_found", "kv_not_found"])(
    "classifies %s as confirmed absence",
    async (code) => {
      const result = await readSourceApiKeyResult(
        createAccess({ ok: false, error: { code } }),
        "FIREFLIES_API_KEY",
      );

      expect(result).toMatchObject({ ok: false, reason: "missing", error: { code } });
    },
  );

  it.each([
    ["empty", ""],
    ["undefined", undefined],
    ["null", null],
    ["object", { value: "secret-value" }],
    ["number", 123],
  ])("classifies a successful %s payload as unavailable", async (_label, data) => {
    const result = await readSourceApiKeyResult(
      createAccess({ ok: true, data }),
      "FIREFLIES_API_KEY",
    );

    expect(result).toEqual({
      ok: false,
      reason: "unavailable",
      error: {
        code: "INVALID_SECRET_RESPONSE",
        message: "FIREFLIES_API_KEY returned an invalid successful secret response",
      },
    });
  });

  it.each(["grant_not_found", "access_denied", "node_unavailable", "store_timeout", "unknown"])(
    "preserves %s result failures as operational unavailability",
    async (code) => {
      const result = await readSourceApiKeyResult(
        createAccess({ ok: false, error: { code, message: `${code} failure` } }),
        "FIREFLIES_API_KEY",
      );

      expect(result).toEqual({
        ok: false,
        reason: "unavailable",
        error: { code, message: `${code} failure` },
      });
    },
  );

  it.each([
    ["thrown read", Object.assign(new Error("node unavailable"), { code: "node_unavailable" })],
    ["grant loss", Object.assign(new Error("grant missing"), { code: "grant_not_found" })],
  ])("preserves %s as operational unavailability", async (_label, error) => {
    const access = {
      secrets: {
        get: async () => {
          throw error;
        },
      },
    } as any;

    const result = await readSourceApiKeyResult(access, "FIREFLIES_API_KEY");

    expect(result).toMatchObject({ ok: false, reason: "unavailable", error: { code: error.code } });
  });
});
