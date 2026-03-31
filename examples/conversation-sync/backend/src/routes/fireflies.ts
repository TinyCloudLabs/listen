import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import { FirefliesClient } from "../services/fireflies-client.js";

// ── Types ────────────────────────────────────────────────────────────

interface FirefliesRoutesConfig {
  authMiddleware: RequestHandler;
  delegationMiddleware: RequestHandler;
  /** Optional factory for testing — defaults to creating a real FirefliesClient */
  createClient?: (apiKey: string) => Pick<FirefliesClient, "getUser">;
}

// ── Constants ────────────────────────────────────────────────────────

const FIREFLIES_KEY_PATH = "/app.conversations/config/fireflies-key";

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
<<<<<<< HEAD
<<<<<<< HEAD
    const keyResult = await req.delegatedAccess!.kv.get(FIREFLIES_KEY_PATH);
    const apiKey = keyResult.ok && keyResult.data.data != null ? String(keyResult.data.data) : null;
=======
    const apiKey = await req.delegatedAccess!.kv.get(FIREFLIES_KEY_PATH);
>>>>>>> 7021a2e (TC-1302: Add GET /api/fireflies/user proxy endpoint (connection test))
=======
    const keyResult = await req.delegatedAccess!.kv.get(FIREFLIES_KEY_PATH);
    const apiKey = keyResult.ok && keyResult.data.data != null ? String(keyResult.data.data) : null;
>>>>>>> 3b4de56 (chore: include remaining conversation-sync backend and shared changes)

    if (!apiKey) {
      res.status(404).json({
        error: "no_api_key",
<<<<<<< HEAD
<<<<<<< HEAD
        message:
          "No Fireflies API key configured. Store one first via PUT /api/config/fireflies-key.",
=======
        message: "No Fireflies API key configured. Store one first via PUT /api/config/fireflies-key.",
>>>>>>> 7021a2e (TC-1302: Add GET /api/fireflies/user proxy endpoint (connection test))
=======
        message:
          "No Fireflies API key configured. Store one first via PUT /api/config/fireflies-key.",
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
      });
      return;
    }

    try {
      const client = makeClient(apiKey);
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
