import { describe, it, expect } from "bun:test";
import {
  OTTER_COOKIE_SECRET_NAME,
  deleteOtterCookie,
  otterCookieExists,
  readOtterCookie,
  readOtterCookieResult,
  writeOtterCookie,
} from "../services/otter-secret.js";

function fakeAccess() {
  const store = new Map<string, string>();
  return {
    store,
    secrets: {
      async get(name: string) {
        return store.has(name)
          ? { ok: true, data: store.get(name) }
          : { ok: false, error: { code: "KEY_NOT_FOUND" } };
      },
      async put(name: string, value: string) {
        store.set(name, value);
        return { ok: true };
      },
      async delete(name: string) {
        store.delete(name);
        return { ok: true };
      },
    },
  } as any;
}

describe("otter-secret", () => {
  it("round-trips the sealed cookie", async () => {
    const access = fakeAccess();
    expect(await otterCookieExists(access)).toBe(false);
    await writeOtterCookie(access, { sessionid: "sid", csrftoken: "csrf" });
    expect(JSON.parse(access.store.get(OTTER_COOKIE_SECRET_NAME))).toEqual({
      sessionid: "sid",
      csrftoken: "csrf",
    });
    expect(await readOtterCookie(access)).toEqual({ sessionid: "sid", csrftoken: "csrf" });
    expect(await otterCookieExists(access)).toBe(true);
    await deleteOtterCookie(access);
    expect(await otterCookieExists(access)).toBe(false);
  });

  it("rejects a malformed stored cookie", async () => {
    const access = fakeAccess();
    access.store.set(OTTER_COOKIE_SECRET_NAME, JSON.stringify({ sessionid: "only" }));
    await expect(readOtterCookieResult(access)).resolves.toMatchObject({
      ok: false,
      reason: "unavailable",
    });
  });

  it.each([
    ["", "empty"],
    [undefined, "undefined"],
    [null, "null"],
    [[], "array"],
    [{ sessionid: "sid", csrftoken: "csrf" }, "object"],
    ["not-json", "malformed serialized cookie"],
    [
      { ok: "true", data: JSON.stringify({ sessionid: "sid", csrftoken: "csrf" }) },
      "malformed envelope",
    ],
  ])("classifies %s successful secret data as unavailable", async (data) => {
    const access = {
      secrets: { get: async () => ({ ok: true, data }) },
    } as any;

    const result = await readOtterCookieResult(access);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unavailable");
  });

  it.each([
    [undefined, "missing Secrets capability"],
    [{ ok: false, error: { code: "grant_not_found" } }, "grant failure"],
    [{ ok: false, error: { code: "timeout" } }, "timeout"],
  ])("classifies %s as unavailable", async (result) => {
    const access =
      result === undefined ? ({} as any) : ({ secrets: { get: async () => result } } as any);
    const classified = await readOtterCookieResult(access);
    expect(classified).toMatchObject({ ok: false, reason: "unavailable" });
  });

  it("classifies only explicit not-found errors as missing", async () => {
    const access = {
      secrets: { get: async () => ({ ok: false, error: { code: "KEY_NOT_FOUND" } }) },
    } as any;
    await expect(readOtterCookieResult(access)).resolves.toMatchObject({
      ok: false,
      reason: "missing",
    });
  });

  it("throws if the delegation lacks Secrets write access", async () => {
    const access = { secrets: { async get() {} } } as any;
    await expect(writeOtterCookie(access, { sessionid: "a", csrftoken: "b" })).rejects.toThrow(
      /Secrets write access/,
    );
  });
});
