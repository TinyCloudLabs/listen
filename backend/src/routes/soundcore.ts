import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import {
  SoundcoreAuthError,
  SoundcoreClient,
  type SoundcoreCredentials,
} from "../services/soundcore-client.js";
import { readSoundcoreCredentialsResult } from "../services/soundcore-secret.js";

interface SoundcoreRoutesConfig {
  authMiddleware: RequestHandler;
  delegationMiddleware: RequestHandler;
  createClient?: (credentials: SoundcoreCredentials) => Pick<SoundcoreClient, "listNotes">;
}

export function createSoundcoreRouter(config: SoundcoreRoutesConfig) {
  const { authMiddleware, delegationMiddleware } = config;
  const makeClient =
    config.createClient ??
    ((credentials: SoundcoreCredentials) => new SoundcoreClient(credentials));
  const router = Router();

  router.use(authMiddleware);
  router.use(delegationMiddleware);

  router.get("/status", async (req: Request, res: Response) => {
    const credentials = await readSoundcoreCredentialsResult(req.delegatedAccess);
    if (!credentials.ok) {
      res.status(credentials.reason === "operational" ? 503 : 404).json({
        error:
          credentials.reason === "operational"
            ? "soundcore_credentials_unavailable"
            : "no_soundcore_credentials",
        secretCode: credentials.error.code,
        missing: credentials.error.missing,
        message: credentials.error.message,
      });
      return;
    }

    try {
      const notes = await makeClient(credentials.data).listNotes({ pageSize: 1 });
      res.json({ connected: true, sampleCount: notes.length });
    } catch (err) {
      if (err instanceof SoundcoreAuthError) {
        res.status(401).json({
          error: "soundcore_auth_error",
          message:
            "Soundcore rejected the stored credentials. Capture fresh headers and try again.",
        });
        return;
      }

      console.error("[soundcore] failed to check status:", err);
      res.status(500).json({
        error: "soundcore_error",
        message: "Failed to check Soundcore connection",
      });
    }
  });

  return router;
}
