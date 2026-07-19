import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import {
  SoundcoreAuthError,
  SoundcoreClient,
  type SoundcoreCredentials,
} from "../services/soundcore-client.js";
import { readSoundcoreCredentialsResult } from "../services/soundcore-secret.js";
import { syncSoundcoreNotes } from "../services/soundcore-sync.js";

interface SoundcoreSyncRoutesConfig {
  authMiddleware: RequestHandler;
  delegationMiddleware: RequestHandler;
  createClient?: (
    credentials: SoundcoreCredentials,
  ) => Pick<SoundcoreClient, "listNotes" | "getNote">;
}

export function createSoundcoreSyncRouter(config: SoundcoreSyncRoutesConfig) {
  const { authMiddleware, delegationMiddleware } = config;
  const makeClient =
    config.createClient ??
    ((credentials: SoundcoreCredentials) => new SoundcoreClient(credentials));
  const router = Router();

  router.use(authMiddleware);
  router.use(delegationMiddleware);

  router.post("/", async (req: Request, res: Response) => {
    const requestId = `soundcore-${Date.now().toString(36)}`;
    console.info(`[soundcore-sync:${requestId}] request received`);
    const credentialsResult = await readSoundcoreCredentialsResult(req.delegatedAccess);
    if (!credentialsResult.ok) {
      const operational = credentialsResult.reason === "operational";
      console.warn(
        `[soundcore-sync:${requestId}] ${operational ? "credential read unavailable" : "missing credentials"}`,
      );
      res.status(operational ? 503 : 404).json({
        error: operational ? "soundcore_credentials_unavailable" : "no_soundcore_credentials",
        secretCode: credentialsResult.error.code,
        missing: credentialsResult.error.missing,
        message:
          credentialsResult.error.message ??
          "No Soundcore credentials configured. Store SOUNDCORE_AUTH_TOKEN, SOUNDCORE_UID, and SOUNDCORE_OPENUDID with TinyCloud Secrets.",
      });
      return;
    }
    const credentials = credentialsResult.data;

    try {
      const includeEmpty = req.body?.includeEmpty === true;
      const result = await syncSoundcoreNotes({
        access: req.delegatedAccess!,
        client: makeClient(credentials),
        includeEmpty,
        onProgress: (progress) => {
          if (progress.phase === "schema") {
            console.info(`[soundcore-sync:${requestId}] ensuring Listen schema`);
          } else if (progress.phase === "known") {
            console.info(
              `[soundcore-sync:${requestId}] loaded ${progress.known} existing Soundcore conversation ids`,
            );
          } else if (progress.phase === "listed") {
            console.info(`[soundcore-sync:${requestId}] listed ${progress.total} Soundcore notes`);
          } else if (progress.phase === "note") {
            console.info(
              `[soundcore-sync:${requestId}] processing ${progress.current}/${progress.total}: ${progress.title} (${progress.noteId})`,
            );
          } else if (progress.phase === "note-failed") {
            console.warn(
              `[soundcore-sync:${requestId}] failed note ${progress.title} (${progress.noteId}): ${progress.error}`,
            );
          } else {
            console.info(
              `[soundcore-sync:${requestId}] complete synced=${progress.result.synced} skipped=${progress.result.skipped} noTranscript=${progress.result.skippedNoTranscript} failed=${progress.result.failed}`,
            );
          }
        },
      });
      res.json(result);
    } catch (err) {
      if (err instanceof SoundcoreAuthError) {
        console.warn(`[soundcore-sync:${requestId}] Soundcore auth rejected stored credentials`);
        res.status(401).json({
          error: "soundcore_auth_error",
          message:
            "Soundcore rejected the stored credentials. Capture fresh headers and try again.",
        });
        return;
      }

      const message = err instanceof Error ? err.message : String(err);
      console.error(`[soundcore-sync:${requestId}] failed: ${message}`);
      res.status(500).json({ error: "soundcore_sync_failed", message });
    }
  });

  return router;
}
