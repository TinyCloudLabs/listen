import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import { conversationSql, ensureSchema } from "../schema.js";
import { GranolaApiError, GranolaClient } from "../services/granola-client.js";
import { readGranolaApiKey } from "../services/granola-secret.js";
import { persistGranolaNote } from "../services/granola-sync.js";

interface GranolaSyncRoutesConfig {
  authMiddleware: RequestHandler;
  delegationMiddleware: RequestHandler;
  createClient?: (apiKey: string) => Pick<GranolaClient, "listAllNotes" | "getNote">;
}

export function createGranolaSyncRouter(config: GranolaSyncRoutesConfig) {
  const { authMiddleware, delegationMiddleware } = config;
  const makeClient = config.createClient ?? ((key: string) => new GranolaClient(key));
  const router = Router();

  router.use(authMiddleware);
  router.use(delegationMiddleware);

  router.get("/stream", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.flushHeaders();

    let aborted = false;
    req.on("close", () => {
      aborted = true;
    });

    const sendEvent = (type: string, data: unknown) => {
      if (aborted) return;
      res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const apiKey = await readGranolaApiKey(req);
      if (!apiKey) {
        sendEvent("error", { message: "No Granola API key configured." });
        res.end();
        return;
      }

      await ensureSchema(access);
      const sqlDb = conversationSql(access);
      const client = makeClient(apiKey);
      const mode = req.query.mode === "full" ? "full" : "incremental";
      const knownIds = new Set<string>();

      if (mode === "incremental") {
        const existingResult = await sqlDb.query(
          "SELECT source_id FROM conversation WHERE source = 'granola'",
        );
        if (existingResult.ok && existingResult.data.rows) {
          for (const row of existingResult.data.rows) {
            const val = Array.isArray(row) ? row[0] : (row as any).source_id;
            if (val) knownIds.add(String(val));
          }
        }
      }

      sendEvent("status", { phase: "listing", message: "Fetching Granola notes..." });
      const listed = await client.listAllNotes({
        pageSize: 30,
        mode,
        knownIds: mode === "incremental" ? knownIds : undefined,
        onProgress: (info) => {
          sendEvent("progress", {
            phase: "listing",
            batch: info.page,
            totalListed: info.totalSoFar,
          });
        },
      });

      const newNotes = listed.notes.filter((note) => !knownIds.has(note.id));
      const skipped = listed.notes.length - newNotes.length;

      sendEvent("status", {
        phase: "syncing",
        message: `Found ${newNotes.length} new Granola notes to sync`,
        total: newNotes.length,
        skipped,
      });

      let synced = 0;
      let failed = 0;
      const errors: string[] = [];
      const conversations: Array<{ id: string; title: string; started_at: string | null }> = [];

      for (let i = 0; i < newNotes.length; i++) {
        if (aborted) break;

        const summary = newNotes[i];
        try {
          const note = await client.getNote(summary.id);
          const result = await persistGranolaNote(note, access);
          if (result.status === "created") {
            synced++;
            conversations.push({
              id: result.conversationId!,
              title: result.title ?? note.title ?? "",
              started_at: result.startedAt ?? null,
            });
          } else {
            failed++;
            errors.push(`${summary.id}: ${result.error}`);
          }
        } catch (err) {
          failed++;
          const message = err instanceof Error ? err.message : String(err);
          errors.push(`${summary.id}: ${message}`);
        }

        sendEvent("progress", {
          phase: "syncing",
          current: i + 1,
          total: newNotes.length,
          synced,
          failed,
          lastTitle: summary.title ?? summary.id,
        });
      }

      sendEvent("complete", { synced, skipped, failed, errors, conversations });
    } catch (err) {
      console.error("[sync] Granola sync failed:", err);
      if (err instanceof GranolaApiError && err.status === 429) {
        sendEvent("error", { code: "granola_rate_limited", message: err.message });
        res.end();
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      sendEvent("error", { message: `Sync failed: ${message}` });
    }

    res.end();
  });

  return router;
}
