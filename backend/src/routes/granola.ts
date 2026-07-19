import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import { GranolaApiError, GranolaClient } from "../services/granola-client.js";
import { readGranolaApiKeyResult } from "../services/granola-secret.js";

interface GranolaRoutesConfig {
  authMiddleware: RequestHandler;
  delegationMiddleware: RequestHandler;
  createClient?: (apiKey: string) => Pick<GranolaClient, "listNotes">;
}

export function createGranolaRouter(config: GranolaRoutesConfig) {
  const { authMiddleware, delegationMiddleware } = config;
  const makeClient = config.createClient ?? ((key: string) => new GranolaClient(key));
  const router = Router();

  router.use(authMiddleware);
  router.use(delegationMiddleware);

  router.get("/status", async (req: Request, res: Response) => {
    const secret = await readGranolaApiKeyResult(req.delegatedAccess);

    if (!secret.ok) {
      const prefix = secret.error.code ? `${secret.error.code}: ` : "";
      res.status(secret.reason === "missing" ? 404 : 503).json({
        error: secret.reason === "missing" ? "no_api_key" : "granola_secret_unavailable",
        secretCode: secret.error.code,
        message: `${prefix}${
          secret.error.message ??
          "No Granola API key configured. Store GRANOLA_API_KEY with TinyCloud Secrets."
        }`,
      });
      return;
    }

    try {
      const page = await makeClient(secret.data).listNotes({ pageSize: 1 });
      res.json({ connected: true, sampleCount: page.notes.length });
    } catch (err) {
      if (err instanceof GranolaApiError && err.status === 401) {
        res.status(401).json({
          error: "granola_auth_error",
          message: "Granola rejected the API key. Please check your key and try again.",
        });
        return;
      }

      console.error("[granola] failed to check status:", err);
      res.status(500).json({
        error: "granola_error",
        message: "Failed to check Granola connection",
      });
    }
  });

  return router;
}
