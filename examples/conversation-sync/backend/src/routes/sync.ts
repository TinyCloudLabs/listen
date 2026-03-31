import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import { FirefliesClient } from "../services/fireflies-client.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
import type { PaginationOptions } from "../services/fireflies-client.js";
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
=======
>>>>>>> 554d6dd (fix: resolve all ESLint errors for CI)
import { ensureSchema } from "../schema.js";
import { syncSingleTranscript } from "../services/sync-pipeline.js";
=======
import { normalizeFireflies } from "../adapters/fireflies.js";
import { ensureSchema } from "../schema.js";
>>>>>>> 8a34956 (TC-1303: Implement POST /api/sync/fireflies with pre-fetch dedup)
=======
import { ensureSchema } from "../schema.js";
import { syncSingleTranscript } from "../services/sync-pipeline.js";
>>>>>>> 100e01d (TC-1311: Extract syncSingleTranscript() from sync.ts for reuse)

// ── Types ────────────────────────────────────────────────────────────

interface SyncRoutesConfig {
  authMiddleware: RequestHandler;
  delegationMiddleware: RequestHandler;
  /** Optional factory for testing — defaults to creating a real FirefliesClient */
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  createClient?: (
    apiKey: string,
  ) => Pick<FirefliesClient, "listTranscripts" | "listAllTranscripts" | "getTranscript">;
  /** Delay between API calls in ms (default 800). Set to 0 for tests. */
  syncDelayMs?: number;
=======
  createClient?: (apiKey: string) => Pick<FirefliesClient, "listTranscripts" | "getTranscript">;
>>>>>>> 8a34956 (TC-1303: Implement POST /api/sync/fireflies with pre-fetch dedup)
=======
  createClient?: (apiKey: string) => Pick<FirefliesClient, "listTranscripts" | "listAllTranscripts" | "getTranscript">;
=======
  createClient?: (
    apiKey: string,
  ) => Pick<FirefliesClient, "listTranscripts" | "listAllTranscripts" | "getTranscript">;
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
  /** Delay between API calls in ms (default 800). Set to 0 for tests. */
  syncDelayMs?: number;
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
}

// ── Constants ────────────────────────────────────────────────────────

const FIREFLIES_KEY_PATH = "/app.conversations/config/fireflies-key";
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
const SYNC_DELAY_MS = 800;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
<<<<<<< HEAD
=======
>>>>>>> 8a34956 (TC-1303: Implement POST /api/sync/fireflies with pre-fetch dedup)
=======
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)

// ── Sync Routes ──────────────────────────────────────────────────────

export function createSyncRouter(config: SyncRoutesConfig) {
  const { authMiddleware, delegationMiddleware } = config;
  const makeClient = config.createClient ?? ((key: string) => new FirefliesClient(key));
<<<<<<< HEAD
<<<<<<< HEAD
  const delayMs = config.syncDelayMs ?? SYNC_DELAY_MS;
=======
>>>>>>> 8a34956 (TC-1303: Implement POST /api/sync/fireflies with pre-fetch dedup)
=======
  const delayMs = config.syncDelayMs ?? SYNC_DELAY_MS;
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
  const router = Router();

  // All sync routes require auth + delegation
  router.use(authMiddleware);
  router.use(delegationMiddleware);

  // ── POST /api/sync/fireflies — full sync with pre-fetch dedup ──
  router.post("/fireflies", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;

    // 1. Read Fireflies API key from KV
<<<<<<< HEAD
<<<<<<< HEAD
    const keyResult = await access.kv.get(FIREFLIES_KEY_PATH);
    const apiKey = keyResult.ok && keyResult.data.data != null ? String(keyResult.data.data) : null;
    if (!apiKey) {
      res.status(404).json({
        error: "no_api_key",
        message:
          "No Fireflies API key configured. Store one first via PUT /api/config/fireflies-key.",
<<<<<<< HEAD
=======
    const apiKey = await access.kv.get(FIREFLIES_KEY_PATH);
=======
    const keyResult = await access.kv.get(FIREFLIES_KEY_PATH);
    const apiKey = keyResult.ok && keyResult.data.data != null ? String(keyResult.data.data) : null;
>>>>>>> 100e01d (TC-1311: Extract syncSingleTranscript() from sync.ts for reuse)
    if (!apiKey) {
      res.status(404).json({
        error: "no_api_key",
        message: "No Fireflies API key configured. Store one first via PUT /api/config/fireflies-key.",
>>>>>>> 8a34956 (TC-1303: Implement POST /api/sync/fireflies with pre-fetch dedup)
=======
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
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

      const client = makeClient(apiKey);

      // 4. List transcripts (lightweight)
      const summaries = await client.listTranscripts(limit);
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
      console.log(
        `[sync] Fireflies returned ${summaries.length} transcripts:`,
        summaries.map((s) => ({ id: s.id, title: s.title })),
      );
<<<<<<< HEAD
=======
>>>>>>> 8a34956 (TC-1303: Implement POST /api/sync/fireflies with pre-fetch dedup)
=======
      console.log(`[sync] Fireflies returned ${summaries.length} transcripts:`, summaries.map(s => ({ id: s.id, title: s.title })));
>>>>>>> 100e01d (TC-1311: Extract syncSingleTranscript() from sync.ts for reuse)
=======
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)

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
<<<<<<< HEAD
<<<<<<< HEAD
      const dedupResult = await access.sql.query(dedupQuery, sourceIds);

      const existingIds = new Set<string>();
      if (dedupResult.ok && dedupResult.data.rows) {
        // TinyCloud SQL rows are arrays — source_id is the only selected column (index 0)
        for (const row of dedupResult.data.rows) {
          const val = Array.isArray(row) ? row[0] : (row as any).source_id;
          if (val) existingIds.add(String(val));
=======
      const dedupResult = await access.sql.execute(dedupQuery, sourceIds);

      const existingIds = new Set<string>();
      if (dedupResult.ok && dedupResult.rows) {
        for (const row of dedupResult.rows) {
          existingIds.add((row as any).source_id);
>>>>>>> 8a34956 (TC-1303: Implement POST /api/sync/fireflies with pre-fetch dedup)
=======
      const dedupResult = await access.sql.query(dedupQuery, sourceIds);

      const existingIds = new Set<string>();
      if (dedupResult.ok && dedupResult.data.rows) {
        // TinyCloud SQL rows are arrays — source_id is the only selected column (index 0)
        for (const row of dedupResult.data.rows) {
          const val = Array.isArray(row) ? row[0] : (row as any).source_id;
          if (val) existingIds.add(String(val));
>>>>>>> 100e01d (TC-1311: Extract syncSingleTranscript() from sync.ts for reuse)
        }
      }

      // 6. Filter to only new source_ids
      const newSummaries = summaries.filter((s) => !existingIds.has(s.id));
      const skipped = summaries.length - newSummaries.length;

      // 7. Fetch details, normalize, and insert each new transcript
      let synced = 0;
      let failed = 0;
      const errors: string[] = [];
      const conversations: Array<{ id: string; title: string; started_at: string }> = [];

      for (const summary of newSummaries) {
<<<<<<< HEAD
<<<<<<< HEAD
        const result = await syncSingleTranscript(summary.id, access, client);
        if (result.status === "created") {
          synced++;
          conversations.push({
            id: result.conversationId!,
            title: result.title ?? summary.title ?? "",
            started_at: result.startedAt ?? "",
          });
        } else if (result.status === "error") {
          failed++;
          errors.push(`${summary.id}: ${result.error}`);
        }
        // 'skipped' shouldn't happen here due to batch dedup, but handle gracefully
=======
        try {
          // Fetch full transcript
          const fullTranscript = await client.getTranscript(summary.id);

          // Normalize
          const normalized = normalizeFireflies(fullTranscript);

          // INSERT conversation
          const now = new Date().toISOString();
          const metadataJson = JSON.stringify(normalized.conversation.metadata);

          await access.sql.execute(
            `INSERT OR IGNORE INTO conversation (id, title, source, source_id, source_url, started_at, ended_at, duration_secs, summary, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              normalized.conversation.id,
              normalized.conversation.title,
              normalized.conversation.source,
              normalized.conversation.source_id,
              normalized.conversation.source_url,
              normalized.conversation.started_at,
              normalized.conversation.ended_at,
              normalized.conversation.duration_secs,
              normalized.conversation.summary,
              metadataJson,
              now,
              now,
            ],
          );

          // INSERT participants
          for (const participant of normalized.participants) {
            await access.sql.execute(
              `INSERT OR IGNORE INTO participant (id, conversation_id, name, email, speaker_label) VALUES (?, ?, ?, ?, ?)`,
              [
                participant.id,
                normalized.conversation.id,
                participant.name,
                participant.email,
                participant.speaker_label,
              ],
            );
          }

          // Write transcript sentences blob to KV
          const kvKey = `/app.conversations/transcript/${normalized.conversation.id}`;
          await access.kv.put(kvKey, JSON.stringify(normalized.transcript));

=======
        const result = await syncSingleTranscript(summary.id, access, client);
        if (result.status === "created") {
>>>>>>> 100e01d (TC-1311: Extract syncSingleTranscript() from sync.ts for reuse)
          synced++;
          conversations.push({
            id: result.conversationId!,
            title: result.title ?? summary.title ?? "",
            started_at: result.startedAt ?? "",
          });
        } else if (result.status === "error") {
          failed++;
          errors.push(`${summary.id}: ${result.error}`);
        }
<<<<<<< HEAD
>>>>>>> 8a34956 (TC-1303: Implement POST /api/sync/fireflies with pre-fetch dedup)
=======
        // 'skipped' shouldn't happen here due to batch dedup, but handle gracefully
>>>>>>> 100e01d (TC-1311: Extract syncSingleTranscript() from sync.ts for reuse)
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
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({
        error: "sync_failed",
        message: `Sync failed: ${message}`,
      });
    }
  });

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
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
<<<<<<< HEAD
<<<<<<< HEAD
    req.on("close", () => {
      aborted = true;
    });
=======
    req.on("close", () => { aborted = true; });
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
=======
    req.on("close", () => {
      aborted = true;
    });
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)

    const sendEvent = (type: string, data: unknown) => {
      if (aborted) return;
      res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // 1. Read Fireflies API key
      const keyResult = await access.kv.get(FIREFLIES_KEY_PATH);
<<<<<<< HEAD
<<<<<<< HEAD
      const apiKey =
        keyResult.ok && keyResult.data.data != null ? String(keyResult.data.data) : null;
=======
      const apiKey = keyResult.ok && keyResult.data.data != null ? String(keyResult.data.data) : null;
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
=======
      const apiKey =
        keyResult.ok && keyResult.data.data != null ? String(keyResult.data.data) : null;
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
      if (!apiKey) {
        sendEvent("error", { message: "No Fireflies API key configured." });
        res.end();
        return;
      }

      await ensureSchema(access);
      const client = makeClient(apiKey);

      // 2. Parse mode
      const mode = req.query.mode === "full" ? "full" : "incremental";

      // 3. Collect existing source_ids for incremental dedup
      const knownIds = new Set<string>();
      if (mode === "incremental") {
        const existingResult = await access.sql.query(
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
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
      if (aborted) {
        res.end();
        return;
      }
<<<<<<< HEAD
=======
      if (aborted) { res.end(); return; }
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
=======
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)

      const paginationResult = await client.listAllTranscripts({
        batchSize: 25,
        mode,
        knownIds: mode === "incremental" ? knownIds : undefined,
        delayMs,
        onProgress: (info) => {
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
          sendEvent("progress", {
            phase: "listing",
            batch: info.batch,
            totalListed: info.totalSoFar,
          });
<<<<<<< HEAD
=======
          sendEvent("progress", { phase: "listing", batch: info.batch, totalListed: info.totalSoFar });
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
=======
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
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

        const summary = newSummaries[i];
        const result = await syncSingleTranscript(summary.id, access, client);

        if (result.status === "created") {
          synced++;
          conversations.push({
            id: result.conversationId!,
            title: result.title ?? summary.title ?? "",
            started_at: result.startedAt ?? "",
          });
        } else if (result.status === "error") {
          failed++;
          errors.push(`${summary.id}: ${result.error}`);
        }

        sendEvent("progress", {
          phase: "syncing",
          current: i + 1,
          total: newSummaries.length,
          synced,
          failed,
          lastTitle: summary.title,
        });

        // Rate limit protection between full-transcript fetches
        if (i < newSummaries.length - 1 && !aborted) {
          await sleep(delayMs);
        }
      }

      // 7. Done
      sendEvent("complete", { synced, skipped, failed, errors, conversations });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[sync] SSE fireflies sync failed:", err);
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
<<<<<<< HEAD
<<<<<<< HEAD
        message:
          "No Fireflies API key configured. Store one first via PUT /api/config/fireflies-key.",
=======
        message: "No Fireflies API key configured. Store one first via PUT /api/config/fireflies-key.",
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
=======
        message:
          "No Fireflies API key configured. Store one first via PUT /api/config/fireflies-key.",
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
      });
      return;
    }

    try {
      await ensureSchema(access);

      const client = makeClient(apiKey);

      // 2. Query for Fireflies conversations with NULL summary
      const missingResult = await access.sql.query(
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
            const metaResult = await access.sql.query(
              `SELECT metadata FROM conversation WHERE id = ?`,
              [row.id],
            );
            let metadata: Record<string, unknown> = {};
            if (metaResult.ok && metaResult.data.rows?.length) {
              const raw = Array.isArray(metaResult.data.rows[0])
                ? metaResult.data.rows[0][0]
                : (metaResult.data.rows[0] as any).metadata;
              if (raw) {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
                try {
                  metadata = JSON.parse(String(raw));
                } catch {
                  /* ignore malformed JSON */
                }
<<<<<<< HEAD
=======
                try { metadata = JSON.parse(String(raw)); } catch {}
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
=======
                try { metadata = JSON.parse(String(raw)); } catch { /* ignore malformed JSON */ }
>>>>>>> 554d6dd (fix: resolve all ESLint errors for CI)
=======
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
              }
            }
            metadata.keywords = keywords;
            metadata.meeting_type = meetingType;

            await access.sql.execute(
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

<<<<<<< HEAD
=======
>>>>>>> 100e01d (TC-1311: Extract syncSingleTranscript() from sync.ts for reuse)
=======
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
  // ── DELETE /api/sync/conversations — clear all data for re-sync ──
  router.delete("/conversations", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;
    try {
      await ensureSchema(access);
      await access.sql.execute(`DELETE FROM participant`);
      await access.sql.execute(`DELETE FROM conversation`);
      res.json({ ok: true, message: "All conversations cleared. Re-sync to repopulate." });
    } catch (err) {
      console.error("[sync] clear failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "clear_failed", message });
    }
  });

<<<<<<< HEAD
=======
>>>>>>> 8a34956 (TC-1303: Implement POST /api/sync/fireflies with pre-fetch dedup)
=======
>>>>>>> 100e01d (TC-1311: Extract syncSingleTranscript() from sync.ts for reuse)
  return router;
}
