import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import { FirefliesClient, FirefliesRateLimitError } from "../services/fireflies-client.js";
import { conversationSql, ensureSchema } from "../schema.js";
import { persistFullTranscript } from "../services/sync-pipeline.js";

// ── Types ────────────────────────────────────────────────────────────

interface SyncRoutesConfig {
  authMiddleware: RequestHandler;
  delegationMiddleware: RequestHandler;
  /** Optional factory for testing — defaults to creating a real FirefliesClient */
  createClient?: (
    apiKey: string,
  ) => Pick<FirefliesClient, "listTranscripts" | "listAllTranscripts" | "getTranscript">;
  /** Delay between API calls in ms (default 800). Set to 0 for tests. */
  syncDelayMs?: number;
}

// ── Constants ────────────────────────────────────────────────────────

const FIREFLIES_KEY_PATH = "config/fireflies-key";
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const SYNC_DELAY_MS = 800;

// ── Sync Routes ──────────────────────────────────────────────────────

export function createSyncRouter(config: SyncRoutesConfig) {
  const { authMiddleware, delegationMiddleware } = config;
  const makeClient = config.createClient ?? ((key: string) => new FirefliesClient(key));
  const delayMs = config.syncDelayMs ?? SYNC_DELAY_MS;
  const router = Router();

  // All sync routes require auth + delegation
  router.use(authMiddleware);
  router.use(delegationMiddleware);

  // ── POST /api/sync/fireflies — full sync with pre-fetch dedup ──
  router.post("/fireflies", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;

    // 1. Read Fireflies API key from KV
    const keyResult = await access.kv.get(FIREFLIES_KEY_PATH);
    const apiKey = keyResult.ok && keyResult.data.data != null ? String(keyResult.data.data) : null;
    if (!apiKey) {
      res.status(404).json({
        error: "no_api_key",
        message:
          "No Fireflies API key configured. Store one first via PUT /api/config/fireflies-key.",
      });
      return;
    }

    // 2. Validate and clamp limit
    let limit = DEFAULT_LIMIT;
    if (req.body && typeof req.body.limit === "number") {
      limit = req.body.limit;
    }
    if (limit < 1) limit = DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    try {
      // 3. Ensure schema exists
      await ensureSchema(access);
      const sqlDb = conversationSql(access);

      const client = makeClient(apiKey);

      // 4. List transcripts (lightweight)
      const summaries = await client.listTranscripts(limit);
      console.log(
        `[sync] Fireflies returned ${summaries.length} transcripts:`,
        summaries.map((s) => ({ id: s.id, title: s.title })),
      );

      if (summaries.length === 0) {
        res.json({
          synced: 0,
          skipped: 0,
          failed: 0,
          errors: [],
          conversations: [],
        });
        return;
      }

      // 5. Collect source_ids and query SQL for existing ones
      const sourceIds = summaries.map((s) => s.id);
      const placeholders = sourceIds.map(() => "?").join(", ");
      const dedupQuery = `SELECT source_id FROM conversation WHERE source = 'fireflies' AND source_id IN (${placeholders})`;
      const dedupResult = await sqlDb.query(dedupQuery, sourceIds);

      const existingIds = new Set<string>();
      if (dedupResult.ok && dedupResult.data.rows) {
        // TinyCloud SQL rows are arrays — source_id is the only selected column (index 0)
        for (const row of dedupResult.data.rows) {
          const val = Array.isArray(row) ? row[0] : (row as any).source_id;
          if (val) existingIds.add(String(val));
        }
      }

      // 6. Filter to only new source_ids
      const newSummaries = summaries.filter((s) => !existingIds.has(s.id));
      const skipped = summaries.length - newSummaries.length;

      // 7. Persist each new transcript — no extra API call, content was in list query
      let synced = 0;
      let failed = 0;
      const errors: string[] = [];
      const conversations: Array<{ id: string; title: string; started_at: string }> = [];

      for (const transcript of newSummaries) {
        const result = await persistFullTranscript(transcript, access);
        if (result.status === "created") {
          synced++;
          conversations.push({
            id: result.conversationId!,
            title: result.title ?? transcript.title ?? "",
            started_at: result.startedAt ?? "",
          });
        } else if (result.status === "error") {
          failed++;
          errors.push(`${transcript.id}: ${result.error}`);
        }
      }

      res.json({
        synced,
        skipped,
        failed,
        errors,
        conversations,
      });
    } catch (err) {
      console.error("[sync] fireflies sync failed:", err);
      if (err instanceof FirefliesRateLimitError) {
        res.status(429).json({
          error: "fireflies_rate_limited",
          message: err.message,
          retryAfterMs: err.retryAfterMs,
        });
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({
        error: "sync_failed",
        message: `Sync failed: ${message}`,
      });
    }
  });

  // ── GET /api/sync/fireflies/stream — SSE paginated sync with progress ──
  router.get("/fireflies/stream", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;

    // SSE headers
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
      // 1. Read Fireflies API key
      const keyResult = await access.kv.get(FIREFLIES_KEY_PATH);
      const apiKey =
        keyResult.ok && keyResult.data.data != null ? String(keyResult.data.data) : null;
      if (!apiKey) {
        sendEvent("error", { message: "No Fireflies API key configured." });
        res.end();
        return;
      }

      await ensureSchema(access);
      const sqlDb = conversationSql(access);
      const client = makeClient(apiKey);

      // 2. Parse mode
      const mode = req.query.mode === "full" ? "full" : "incremental";

      // 3. Collect existing source_ids for incremental dedup
      const knownIds = new Set<string>();
      if (mode === "incremental") {
        const existingResult = await sqlDb.query(
          "SELECT source_id FROM conversation WHERE source = 'fireflies'",
        );
        if (existingResult.ok && existingResult.data.rows) {
          for (const row of existingResult.data.rows) {
            const val = Array.isArray(row) ? row[0] : (row as any).source_id;
            if (val) knownIds.add(String(val));
          }
        }
      }

      sendEvent("status", { phase: "listing", message: "Fetching transcript list..." });

      // 4. Paginate through all transcripts
      if (aborted) {
        res.end();
        return;
      }

      const paginationResult = await client.listAllTranscripts({
        batchSize: 25,
        mode,
        knownIds: mode === "incremental" ? knownIds : undefined,
        delayMs,
        onProgress: (info) => {
          sendEvent("progress", {
            phase: "listing",
            batch: info.batch,
            totalListed: info.totalSoFar,
          });
        },
      });

      // 5. Filter to new ones via dedup
      const newSummaries = paginationResult.transcripts.filter((s) => !knownIds.has(s.id));
      const skipped = paginationResult.transcripts.length - newSummaries.length;

      sendEvent("status", {
        phase: "syncing",
        message: `Found ${newSummaries.length} new transcripts to sync`,
        total: newSummaries.length,
        skipped,
      });

      // 6. Sync each new transcript with progress
      let synced = 0;
      let failed = 0;
      const errors: string[] = [];
      const conversations: Array<{ id: string; title: string; started_at: string }> = [];

      for (let i = 0; i < newSummaries.length; i++) {
        if (aborted) break;

        const transcript = newSummaries[i];
        const result = await persistFullTranscript(transcript, access);

        if (result.status === "created") {
          synced++;
          conversations.push({
            id: result.conversationId!,
            title: result.title ?? transcript.title ?? "",
            started_at: result.startedAt ?? "",
          });
        } else if (result.status === "error") {
          failed++;
          errors.push(`${transcript.id}: ${result.error}`);
        }

        sendEvent("progress", {
          phase: "syncing",
          current: i + 1,
          total: newSummaries.length,
          synced,
          failed,
          lastTitle: transcript.title,
        });
      }

      // 7. Done
      sendEvent("complete", { synced, skipped, failed, errors, conversations });
    } catch (err) {
      console.error("[sync] SSE fireflies sync failed:", err);
      if (err instanceof FirefliesRateLimitError) {
        sendEvent("error", {
          code: "fireflies_rate_limited",
          message: err.message,
          retryAfterMs: err.retryAfterMs,
        });
        res.end();
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      sendEvent("error", { message: `Sync failed: ${message}` });
    }

    res.end();
  });

  // ── POST /api/sync/backfill-summaries — re-fetch summaries for conversations missing them ──
  router.post("/backfill-summaries", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;

    // 1. Read Fireflies API key from KV
    const keyResult = await access.kv.get(FIREFLIES_KEY_PATH);
    const apiKey = keyResult.ok && keyResult.data.data != null ? String(keyResult.data.data) : null;
    if (!apiKey) {
      res.status(404).json({
        error: "no_api_key",
        message:
          "No Fireflies API key configured. Store one first via PUT /api/config/fireflies-key.",
      });
      return;
    }

    try {
      await ensureSchema(access);
      const sqlDb = conversationSql(access);

      const client = makeClient(apiKey);

      // 2. Query for Fireflies conversations with NULL summary
      const missingResult = await sqlDb.query(
        `SELECT id, source_id FROM conversation WHERE source = 'fireflies' AND summary IS NULL`,
      );

      const rows: Array<{ id: string; source_id: string }> = [];
      if (missingResult.ok && missingResult.data.rows) {
        for (const row of missingResult.data.rows) {
          const id = Array.isArray(row) ? row[0] : (row as any).id;
          const sourceId = Array.isArray(row) ? row[1] : (row as any).source_id;
          if (id && sourceId) rows.push({ id: String(id), source_id: String(sourceId) });
        }
      }

      if (rows.length === 0) {
        res.json({ updated: 0, still_missing: 0 });
        return;
      }

      // 3. Re-fetch each transcript and update if summary is now available
      let updated = 0;
      let stillMissing = 0;

      for (const row of rows) {
        try {
          const transcript = await client.getTranscript(row.source_id);
          const overview = transcript.summary?.overview;

          if (overview) {
            const keywords = transcript.summary?.keywords ?? [];
            const meetingType = transcript.summary?.meeting_type ?? null;
            const now = new Date().toISOString();

            // Update summary and merge keywords/meeting_type into existing metadata
            const metaResult = await sqlDb.query(`SELECT metadata FROM conversation WHERE id = ?`, [
              row.id,
            ]);
            let metadata: Record<string, unknown> = {};
            if (metaResult.ok && metaResult.data.rows?.length) {
              const raw = Array.isArray(metaResult.data.rows[0])
                ? metaResult.data.rows[0][0]
                : (metaResult.data.rows[0] as any).metadata;
              if (raw) {
                try {
                  metadata = JSON.parse(String(raw));
                } catch {
                  /* ignore malformed JSON */
                }
              }
            }
            metadata.keywords = keywords;
            metadata.meeting_type = meetingType;

            await sqlDb.execute(
              `UPDATE conversation SET summary = ?, metadata = ?, updated_at = ? WHERE id = ?`,
              [overview, JSON.stringify(metadata), now, row.id],
            );
            updated++;
          } else {
            stillMissing++;
          }
        } catch (err) {
          // If re-fetch fails, count as still missing
          console.error(`[backfill] Failed to re-fetch ${row.source_id}:`, err);
          stillMissing++;
        }
      }

      res.json({ updated, still_missing: stillMissing });
    } catch (err) {
      console.error("[backfill] summary backfill failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({
        error: "backfill_failed",
        message: `Backfill failed: ${message}`,
      });
    }
  });

  // ── DELETE /api/sync/conversations — clear all data for re-sync ──
  router.delete("/conversations", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;
    try {
      await ensureSchema(access);
      const sqlDb = conversationSql(access);
      await sqlDb.execute(`DELETE FROM participant`);
      await sqlDb.execute(`DELETE FROM conversation`);
      res.json({ ok: true, message: "All conversations cleared. Re-sync to repopulate." });
    } catch (err) {
      console.error("[sync] clear failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "clear_failed", message });
    }
  });

  return router;
}
