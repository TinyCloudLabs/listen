import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import { ensureSchema } from "../schema.js";

interface SchemaRoutesConfig {
  authMiddleware: RequestHandler;
  delegationMiddleware: RequestHandler;
}

/**
 * Thin trigger for the existing `ensureSchema` seeding path, so the frontend
 * can ask the backend to seed the conversations schema before its first direct
 * read (backend-primary; the frontend falls back to seeding via its own session
 * if this is unavailable or fails).
 *
 * NOTE: the backend delegation currently only requests `tinycloud.sql/read` and
 * `tinycloud.sql/write` (see `backendDelegationPermissions`), so this endpoint is
 * expected to fail with a 401 (`requiredAction: tinycloud.sql/schema`) for an
 * unseeded DB until the backend delegation gains the `schema` ability. The
 * frontend fallback covers that case today. Tracked as a follow-up.
 */
export function createSchemaRouter(config: SchemaRoutesConfig) {
  const { authMiddleware, delegationMiddleware } = config;
  const router = Router();

  router.use(authMiddleware);
  router.use(delegationMiddleware);

  router.post("/ensure", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;
    try {
      await ensureSchema(access);
      res.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ ok: false, error: { message } });
    }
  });

  return router;
}
