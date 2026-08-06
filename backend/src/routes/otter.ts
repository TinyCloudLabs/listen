import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import { OtterApiError, OtterClient } from "../services/otter-client.js";
import type { OtterCookie } from "../services/otter-secret.js";
import {
  deleteOtterCookie,
  readOtterCookieResult,
  writeOtterCookie,
} from "../services/otter-secret.js";

interface OtterRoutesConfig {
  authMiddleware: RequestHandler;
  delegationMiddleware: RequestHandler;
  /** Test seam — defaults to a real OtterClient. */
  createClient?: (cookie: OtterCookie) => Pick<OtterClient, "user">;
}

function parseCookieBody(body: unknown): OtterCookie | null {
  if (typeof body !== "object" || body === null) return null;
  const { sessionid, csrftoken } = body as Record<string, unknown>;
  if (typeof sessionid === "string" && typeof csrftoken === "string" && sessionid && csrftoken) {
    return { sessionid, csrftoken };
  }
  return null;
}

export function createOtterRouter(config: OtterRoutesConfig) {
  const { authMiddleware, delegationMiddleware } = config;
  const makeClient = config.createClient ?? ((cookie: OtterCookie) => new OtterClient(cookie));
  const router = Router();

  router.use(authMiddleware);
  router.use(delegationMiddleware);

  // GET /api/otter/user — connection test using the sealed cookie.
  router.get("/user", async (req: Request, res: Response) => {
    const cookieResult = await readOtterCookieResult(req.delegatedAccess);
    if (!cookieResult.ok && cookieResult.reason === "missing") {
      res.status(404).json({
        error: "no_cookie",
        message: "No Otter cookie configured. Store one via PUT /api/otter/cookie.",
      });
      return;
    }
    if (!cookieResult.ok) {
      res.status(503).json({
        error: "otter_secret_unavailable",
        secretCode: cookieResult.error.code,
        message: cookieResult.error.message ?? "Otter cookie is temporarily unavailable.",
      });
      return;
    }
    await respondWithAccount(res, makeClient(cookieResult.data));
  });

  // PUT /api/otter/cookie — validate the cookie against Otter, then seal it.
  router.put("/cookie", async (req: Request, res: Response) => {
    const cookie = parseCookieBody(req.body);
    if (!cookie) {
      res.status(400).json({
        error: "invalid_cookie",
        message: "Body must be { sessionid, csrftoken }.",
      });
      return;
    }
    try {
      const user = await makeClient(cookie).user();
      await writeOtterCookie(req.delegatedAccess, cookie);
      res.json({ connected: true, userid: user.userid, email: user.email });
    } catch (err) {
      handleOtterError(res, err, "store");
    }
  });

  // DELETE /api/otter/cookie — disconnect.
  router.delete("/cookie", async (req: Request, res: Response) => {
    try {
      await deleteOtterCookie(req.delegatedAccess);
      res.json({ connected: false });
    } catch (error) {
      res.status(503).json({
        error: "otter_secret_unavailable",
        secretCode:
          typeof (error as { code?: unknown })?.code === "string"
            ? (error as { code: string }).code
            : "secret_delete_failed",
        message: "Otter cookie is temporarily unavailable.",
      });
    }
  });

  return router;
}

async function respondWithAccount(res: Response, client: Pick<OtterClient, "user">): Promise<void> {
  try {
    const user = await client.user();
    res.json({ connected: true, userid: user.userid, email: user.email });
  } catch (err) {
    handleOtterError(res, err, "fetch");
  }
}

function handleOtterError(res: Response, err: unknown, verb: string): void {
  if (err instanceof OtterApiError && (err.status === 401 || err.status === 403)) {
    res.status(401).json({
      error: "otter_auth_error",
      message: "Otter rejected the cookie. Re-capture sessionid + csrftoken and try again.",
    });
    return;
  }
  // Never echo err here verbatim — an Otter request error could carry request
  // context; logs are public. Emit a generic message.
  console.error(`[otter] failed to ${verb} account`);
  res.status(500).json({ error: "otter_error", message: `Failed to ${verb} Otter account info` });
}
