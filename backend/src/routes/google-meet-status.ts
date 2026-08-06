import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import { GoogleMeetClient } from "../services/google-meet-client.js";
import { readGoogleTokens } from "../services/google-tokens.js";

// ── Types ────────────────────────────────────────────────────────────

interface GoogleMeetStatusRoutesConfig {
  authMiddleware: RequestHandler;
  delegationMiddleware: RequestHandler;
  /** Injectable for testing */
  createClient?: (
    accessToken: string,
    onTokenRefresh?: (newToken: string) => Promise<void>,
    refreshToken?: string,
  ) => Pick<GoogleMeetClient, "listConferenceRecords">;
}

// ── Status Router ───────────────────────────────────────────────────

export function createGoogleMeetStatusRouter(config: GoogleMeetStatusRoutesConfig) {
  const { authMiddleware, delegationMiddleware } = config;
  const makeClient =
    config.createClient ??
    ((accessToken: string, onTokenRefresh?: any, refreshToken?: string) =>
      new GoogleMeetClient(accessToken, onTokenRefresh, refreshToken));
  const router = Router();

  router.use(authMiddleware);
  router.use(delegationMiddleware);

  // ── GET /status — check if connected + API works ──────────────────
  router.get("/status", async (req: Request, res: Response) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
      res.status(501).json({
        error: "not_configured",
        message: "Google Meet integration is not configured",
      });
      return;
    }

    const access = req.delegatedAccess!;

    try {
      const tokens = await readGoogleTokens(access);
      if (!tokens) {
        res.json({ connected: false });
        return;
      }

      const client = makeClient(tokens.access_token, undefined, tokens.refresh_token);

      // Try a lightweight API call to verify tokens work
      try {
        await client.listConferenceRecords(1);
        res.json({ connected: true });
      } catch {
        res.json({ connected: false, reason: "api_call_failed" });
      }
    } catch (err) {
      console.error("[google-meet-status] check failed:", err);
      res.status(503).json({
        error: "google_tokens_unavailable",
        message: err instanceof Error ? err.message : "Failed to read Google tokens",
      });
    }
  });

  return router;
}
