import { describe, expect, it } from "bun:test";
import {
  resolveGoogleMeetDelegation,
  resolveOwnerAddressDelegation,
} from "../google-meet-delegation.js";

const access = { kv: {}, sql: {} } as any;

function activeResolution() {
  return {
    kind: "active" as const,
    stored: {} as any,
    access,
  };
}

describe("Google Meet delegation lookup", () => {
  it.each(["key_not_found", "NOT_FOUND", "Kv_Not_Found"])(
    "treats explicit owner-address %s as no_delegation",
    async (code) => {
      await expect(
        resolveOwnerAddressDelegation({
          readOwnerAddress: async () => ({ ok: false, error: { code } }),
          resolve: async () => activeResolution(),
        }),
      ).resolves.toEqual({ access: null, reason: "no_delegation" });
    },
  );

  it("treats the documented successful literal-null payload as no_delegation", async () => {
    await expect(
      resolveOwnerAddressDelegation({
        readOwnerAddress: async () => ({ ok: true, data: { data: null } }),
        resolve: async () => activeResolution(),
      }),
    ).resolves.toEqual({ access: null, reason: "no_delegation" });
  });

  it.each([
    [{ ok: false, error: { code: "kv_unavailable" } }, "failed read"],
    [{ ok: true }, "undefined success payload"],
    [{ ok: true, data: undefined }, "undefined success data"],
    [{ ok: true, data: null }, "malformed success envelope"],
    [{ ok: true, data: { data: {} } }, "wrong-type success"],
    [{ ok: true, data: { data: "" } }, "empty-string success"],
    [{ ok: false, error: { code: "grant_not_found" } }, "other failed response"],
  ])("classifies an owner-address %s as delegation_unavailable", async (readResult) => {
    await expect(
      resolveOwnerAddressDelegation({
        readOwnerAddress: async () => readResult,
        resolve: async () => activeResolution(),
      }),
    ).resolves.toEqual({ access: null, reason: "delegation_unavailable" });
  });

  it("classifies thrown owner-address reads as delegation_unavailable", async () => {
    await expect(
      resolveOwnerAddressDelegation({
        readOwnerAddress: async () => {
          throw new Error("owner address read failed");
        },
        resolve: async () => activeResolution(),
      }),
    ).resolves.toEqual({ access: null, reason: "delegation_unavailable" });
  });

  it.each([
    ["none", { kind: "none" }],
    ["expired", { kind: "expired", stored: {} as any }],
    ["stale", { kind: "stale", stored: {} as any }],
  ])("preserves resolver %s as no_delegation", async (_label, resolution) => {
    await expect(
      resolveOwnerAddressDelegation({
        readOwnerAddress: async () => ({ ok: true, data: { data: "0xOWNER" } }),
        resolve: async () => resolution as any,
      }),
    ).resolves.toEqual({ access: null, reason: "no_delegation" });
  });

  it("preserves resolver unavailable outcomes, including activation timeout", async () => {
    await expect(
      resolveOwnerAddressDelegation({
        readOwnerAddress: async () => ({ ok: true, data: { data: "0xOWNER" } }),
        resolve: async () => {
          throw Object.assign(new Error("delegation store unavailable"), {
            code: "delegation_store_unavailable",
          });
        },
      }),
    ).resolves.toEqual({ access: null, reason: "delegation_unavailable" });

    await expect(
      resolveOwnerAddressDelegation({
        readOwnerAddress: async () => ({ ok: true, data: { data: "0xOWNER" } }),
        resolve: async () => ({ kind: "failed", stored: {} as any, error: new Error("failed") }),
      }),
    ).resolves.toEqual({ access: null, reason: "delegation_unavailable" });

    await expect(
      resolveOwnerAddressDelegation({
        readOwnerAddress: async () => ({ ok: true, data: { data: "0xOWNER" } }),
        resolve: async () => ({ kind: "timeout", stored: {} as any, error: new Error("timeout") }),
      }),
    ).resolves.toEqual({ access: null, reason: "delegation_unavailable" });
  });

  it("returns ready with the active resolver access", async () => {
    await expect(
      resolveOwnerAddressDelegation({
        readOwnerAddress: async () => ({ ok: true, data: { data: "0xOWNER" } }),
        resolve: async (address) => {
          expect(address).toBe("0xOWNER");
          return activeResolution();
        },
      }),
    ).resolves.toEqual({ access, reason: "ready" });
  });

  it("keeps Google Meet bare-access success compatibility", async () => {
    await expect(
      resolveGoogleMeetDelegation({
        readOwnerAddress: async () => ({ ok: true, data: { data: "0xOWNER" } }),
        resolve: async () => activeResolution(),
      }),
    ).resolves.toBe(access);
  });
});
