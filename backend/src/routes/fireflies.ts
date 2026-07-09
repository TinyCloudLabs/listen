import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import { FirefliesClient } from "../services/fireflies-client.js";
import { readFirefliesApiKeyResult } from "../services/fireflies-secret.js";
import { bustWorkspaceSecretsCache } from "./workspace-state.js";

// ── Types ────────────────────────────────────────────────────────────

interface FirefliesRoutesConfig {
  authMiddleware: RequestHandler;
  delegationMiddleware: RequestHandler;
  /** Optional factory for testing — defaults to creating a real FirefliesClient */
  createClient?: (apiKey: string) => Pick<FirefliesClient, "getUser">;
}

// ── Fireflies Routes ────────────────────────────────────────────────

export function createFirefliesRouter(config: FirefliesRoutesConfig) {
  const { authMiddleware, delegationMiddleware } = config;
  const makeClient = config.createClient ?? ((key: string) => new FirefliesClient(key));
  const router = Router();

  // All fireflies routes require auth + delegation
  router.use(authMiddleware);
  router.use(delegationMiddleware);

  // ── GET /api/fireflies/user — connection test ───────────────────
  router.get("/user", async (req: Request, res: Response) => {
    const secret = await readFirefliesApiKeyResult(req.delegatedAccess);

    // Frontend hits this connection test right after saving a key; bust the
    // workspace-state readability hint so the next fetch reflects it immediately.
    if (secret.ok && req.user?.address) bustWorkspaceSecretsCache(req.user.address);

    if (!secret.ok) {
      const prefix = secret.error.code ? `${secret.error.code}: ` : "";
      res.status(404).json({
        error: "no_api_key",
        secretCode: secret.error.code,
        message: `${prefix}${
          secret.error.message ??
          "No Fireflies API key configured. Store FIREFLIES_API_KEY with TinyCloud Secrets."
        }`,
      });
      return;
    }

    try {
      const client = makeClient(secret.data);
      const user = await client.getUser();
      res.json(user);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      // Fireflies auth errors (HTTP 401 or GraphQL auth errors)
      if (message.includes("401") || message.toLowerCase().includes("not authenticated")) {
        res.status(401).json({
          error: "fireflies_auth_error",
          message: "Fireflies rejected the API key. Please check your key and try again.",
        });
        return;
      }

      console.error("[fireflies] failed to fetch user:", err);
      res.status(500).json({
        error: "fireflies_error",
        message: "Failed to fetch Fireflies user info",
      });
    }
  });

  return router;
}
