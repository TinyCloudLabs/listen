import { describe, expect, it } from "bun:test";
import { checkAnySecretSetExists } from "../routes/config.js";

const SOUNDCORE_SECRET_SETS = [
  ["SOUNDCORE_SESSION"],
  ["SOUNDCORE_AUTH_TOKEN", "SOUNDCORE_UID", "SOUNDCORE_OPENUDID"],
] as const;

function secretsFrom(values: Record<string, string>) {
  return {
    get: async (name: string) => {
      const value = values[name];
      if (!value) return { ok: false, error: { code: "KEY_NOT_FOUND" } };
      return { ok: true, data: value };
    },
  };
}

describe("Soundcore config secret checks", () => {
  it("accepts the bundled Soundcore session secret", async () => {
    await expect(
      checkAnySecretSetExists(
        secretsFrom({ SOUNDCORE_SESSION: "session-json" }),
        SOUNDCORE_SECRET_SETS,
        "soundcore",
      ),
    ).resolves.toEqual({ ok: true, exists: true, missing: [] });
  });

  it("accepts the legacy Soundcore header secret set", async () => {
    await expect(
      checkAnySecretSetExists(
        secretsFrom({
          SOUNDCORE_AUTH_TOKEN: "auth-token",
          SOUNDCORE_UID: "uid-value",
          SOUNDCORE_OPENUDID: "openudid-value",
        }),
        SOUNDCORE_SECRET_SETS,
        "soundcore",
      ),
    ).resolves.toEqual({ ok: true, exists: true, missing: [] });
  });

  it("reports missing when neither Soundcore credential set is complete", async () => {
    await expect(
      checkAnySecretSetExists(
        secretsFrom({ SOUNDCORE_AUTH_TOKEN: "auth-token" }),
        SOUNDCORE_SECRET_SETS,
        "soundcore",
      ),
    ).resolves.toEqual({
      ok: true,
      exists: false,
      missing: ["SOUNDCORE_SESSION"],
    });
  });

  it("returns unexpected secret read errors", async () => {
    await expect(
      checkAnySecretSetExists(
        {
          get: async () => ({
            ok: false,
            error: { code: "DECRYPT_DENIED", message: "decrypt denied" },
          }),
        },
        SOUNDCORE_SECRET_SETS,
        "soundcore",
      ),
    ).resolves.toEqual({ ok: false, message: "decrypt denied" });
  });

  it("treats malformed successful payloads as unavailable", async () => {
    await expect(
      checkAnySecretSetExists(
        {
          get: async () => ({ ok: true, data: "" }),
        },
        SOUNDCORE_SECRET_SETS,
        "soundcore",
      ),
    ).resolves.toEqual({
      ok: false,
      message: "SOUNDCORE_SESSION returned an invalid successful secret response",
    });
  });
});
