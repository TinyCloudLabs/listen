import { describe, expect, it } from "bun:test";
import { readSourceApiKeyResult, sourceApiKeyExists } from "../services/source-secret.js";

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
      error: {
        code: "SECRETS_ACCESS_MISSING",
        message: "Delegation does not include TinyCloud Secrets access",
      },
    });
    expect(await sourceApiKeyExists(undefined, "FIREFLIES_API_KEY")).toBe(false);
  });

  it("passes through decrypt denials from the backend secret path", async () => {
    const access = createAccess({
      ok: false,
      error: { code: "PERMISSION_DENIED", message: "decrypt denied" },
    });

    const result = await readSourceApiKeyResult(access, "FIREFLIES_API_KEY");

    expect(result).toEqual({
      ok: false,
      error: { code: "PERMISSION_DENIED", message: "decrypt denied" },
    });
  });
});
