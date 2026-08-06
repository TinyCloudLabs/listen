import { describe, expect, it } from "bun:test";
import {
  GoogleTokenReadError,
  googleTokensExist,
  readGoogleTokens,
  readGoogleTokensResult,
} from "../services/google-tokens.js";

const tokens = { access_token: "access", refresh_token: "refresh", token_type: "Bearer" };

function access(overrides: Record<string, unknown> = {}) {
  return {
    secrets: {
      get: async () => ({ ok: false, error: { code: "key_not_found" } }),
      ...((overrides.secrets as Record<string, unknown> | undefined) ?? {}),
    },
    kv: {
      get: async () => ({ ok: false, error: { code: "kv_not_found" } }),
      ...((overrides.kv as Record<string, unknown> | undefined) ?? {}),
    },
  } as never;
}

describe("Google token reads", () => {
  it("keeps missing tokens distinct from an operational read failure", async () => {
    await expect(readGoogleTokensResult(access())).resolves.toEqual({
      ok: false,
      reason: "missing",
    });

    const failure = await readGoogleTokensResult(
      access({
        secrets: {
          get: async () => ({
            ok: false,
            error: { code: "node_unavailable", message: "Secrets unavailable" },
          }),
        },
      }),
    );
    expect(failure.ok).toBe(false);
    if (!failure.ok) {
      expect(failure.reason).toBe("operational");
      expect(failure.error).toBeInstanceOf(GoogleTokenReadError);
      expect(failure.error.code).toBe("node_unavailable");
    }
  });

  it("uses legacy tokens only after the primary secret is conclusively missing", async () => {
    const result = await readGoogleTokensResult(
      access({
        kv: { get: async () => ({ ok: true, data: { data: JSON.stringify(tokens) } }) },
      }),
    );
    expect(result).toEqual({ ok: true, data: tokens });
    await expect(
      googleTokensExist(
        access({ kv: { get: async () => ({ ok: true, data: { data: JSON.stringify(tokens) } }) } }),
      ),
    ).resolves.toBe(true);
  });

  it("does not report an operational read as disconnected", async () => {
    await expect(
      readGoogleTokens(
        access({
          kv: {
            get: async () => ({
              ok: false,
              error: { code: "kv_unavailable", message: "KV unavailable" },
            }),
          },
        }),
      ),
    ).rejects.toMatchObject({ code: "kv_unavailable" });
  });

  it.each(["", undefined, null, [], {}, true, 1, "not-json"])(
    "treats %s successful token data as operationally unavailable",
    async (data) => {
      const result = await readGoogleTokensResult(
        access({ secrets: { get: async () => ({ ok: true, data }) } }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("operational");
    },
  );
});
