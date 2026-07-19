import { describe, expect, it } from "bun:test";
import { createOtterRouter } from "../routes/otter.js";

async function invokeUserRoute(secretResult: unknown) {
  const router = createOtterRouter({
    authMiddleware: (req, _res, next) => {
      (req as any).delegatedAccess = {
        secrets: { get: async () => secretResult },
      };
      next();
    },
    delegationMiddleware: (_req, _res, next) => next(),
    createClient: () => ({
      user: async () => ({ userid: "user-1", email: "user@example.com" }),
    }),
  });

  return new Promise<{ status: number; body: unknown }>((resolve, reject) => {
    let status = 200;
    const response = {
      status(code: number) {
        status = code;
        return response;
      },
      json(body: unknown) {
        resolve({ status, body });
      },
    };
    router.handle(
      { method: "GET", url: "/user", originalUrl: "/user" } as any,
      response as any,
      reject,
    );
  });
}

async function invokeDeleteRoute(
  deleteResult: unknown,
  options: { absentAccess?: boolean; absentDelete?: boolean; throws?: boolean } = {},
) {
  let deleteCalls = 0;
  const router = createOtterRouter({
    authMiddleware: (req, _res, next) => {
      (req as any).delegatedAccess = options.absentAccess
        ? {}
        : {
            secrets: {
              ...(options.absentDelete
                ? {}
                : {
                    delete: async () => {
                      deleteCalls += 1;
                      if (options.throws) throw new Error("delete transport failed");
                      return deleteResult;
                    },
                  }),
            },
          };
      next();
    },
    delegationMiddleware: (_req, _res, next) => next(),
  });

  const response = await new Promise<{ status: number; body: unknown }>((resolve, reject) => {
    let status = 200;
    const res = {
      status(code: number) {
        status = code;
        return res;
      },
      json(body: unknown) {
        resolve({ status, body });
      },
    };
    router.handle(
      { method: "DELETE", url: "/cookie", originalUrl: "/cookie" } as any,
      res as any,
      reject,
    );
  });

  return { ...response, deleteCalls };
}

describe("Otter routes", () => {
  it("keeps an explicit missing cookie as 404 no_cookie", async () => {
    const response = await invokeUserRoute({
      ok: false,
      error: { code: "key_not_found", message: "missing" },
    });
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ error: "no_cookie" });
  });

  it.each([
    [{ ok: false, error: { code: "grant_not_found" } }, "grant failure"],
    [{ ok: true, data: {} }, "malformed successful envelope"],
  ])("returns coded 503 for %s", async (secretResult) => {
    const response = await invokeUserRoute(secretResult);
    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ error: "otter_secret_unavailable" });
  });

  it("returns 503 promptly when deleting the Otter cookie fails", async () => {
    const response = await Promise.race([
      invokeDeleteRoute({ ok: false, error: { code: "timeout" } }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("DELETE /cookie did not respond promptly")), 100),
      ),
    ]);

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ error: "otter_secret_unavailable" });
    expect(response.deleteCalls).toBe(1);
  });

  it.each([
    [{ absentAccess: true }, "absent Secrets access"],
    [{ absentDelete: true }, "absent delete capability"],
    [{ throws: true }, "thrown delete"],
    [{}, "malformed delete response"],
  ])("returns coded 503 for %s", async (options) => {
    const response = await invokeDeleteRoute({}, options);
    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ error: "otter_secret_unavailable" });
  });

  it.each(["key_not_found", "not_found", "kv_not_found", "KEY_NOT_FOUND"])(
    "keeps explicit %s deletion idempotent",
    async (code) => {
      const response = await invokeDeleteRoute({ ok: false, error: { code } });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ connected: false });
    },
  );

  it("preserves successful Otter cookie deletion", async () => {
    const response = await invokeDeleteRoute({ ok: true });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ connected: false });
    expect(response.deleteCalls).toBe(1);
  });
});
