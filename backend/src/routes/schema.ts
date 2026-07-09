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
 * The backend delegation requests `tinycloud.sql/schema` on the conversations
 * path (see `backendDelegationPermissions`), so `ensureSchema` can create and
 * migrate the schema here for fresh accounts. The browser fallback remains for
 * when the backend is offline or the delegation is stale.
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
