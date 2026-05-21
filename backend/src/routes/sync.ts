import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import type { DelegatedAccess } from "@listen/server";
import {
  FirefliesClient,
  FirefliesRateLimitError,
  type FullTranscript,
} from "../services/fireflies-client.js";
import { conversationSql, ensureSchema } from "../schema.js";
import { persistFullTranscript } from "../services/sync-pipeline.js";
import { persistTranscriptBlob } from "../services/persist-conversation.js";
import { readFirefliesApiKey } from "../services/fireflies-secret.js";

// ── Types ────────────────────────────────────────────────────────────

type FirefliesSyncClient = Pick<FirefliesClient, "listAllTranscripts" | "getTranscript"> &
  Partial<Pick<FirefliesClient, "downloadAudio">>;

interface SyncRoutesConfig {
  authMiddleware: RequestHandler;
  delegationMiddleware: RequestHandler;
  /** Optional factory for testing — defaults to creating a real FirefliesClient */
  createClient?: (apiKey: string) => FirefliesSyncClient;
  /** Delay between API calls in ms (default 800). Set to 0 for tests. */
  syncDelayMs?: number;
}

interface ExistingFirefliesConversation {
  id: string;
}

type FirefliesSyncWorkItem =
  | { type: "create"; summary: FullTranscript }
  | { type: "repair"; summary: FullTranscript; conversationId: string };

interface FirefliesSyncProgress {
  current: number;
  total: number;
  synced: number;
  repaired: number;
  failed: number;
  lastTitle?: string;
}

interface FirefliesSyncResult {
  synced: number;
  repaired: number;
  skipped: number;
  failed: number;
  errors: string[];
  conversations: Array<{ id: string; title: string; started_at: string }>;
}

// ── Constants ────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const SYNC_DELAY_MS = 800;

// ── Helpers ─────────────────────────────────────────────────────────

function rowValue(row: unknown, columns: unknown[] | undefined, name: string, index: number) {
  if (Array.isArray(row)) {
    const columnIndex = columns?.indexOf(name);
    return row[columnIndex != null && columnIndex >= 0 ? columnIndex : index];
  }

  if (row && typeof row === "object") {
    return (row as Record<string, unknown>)[name];
  }

  return undefined;
}

async function loadExistingFirefliesConversations(
  sqlDb: Pick<ReturnType<typeof conversationSql>, "query">,
): Promise<Map<string, ExistingFirefliesConversation>> {
  const result = await sqlDb.query(
    "SELECT id, source_id FROM conversation WHERE source = 'fireflies'",
  );

  const existing = new Map<string, ExistingFirefliesConversation>();
  if (!result.ok || !result.data.rows) return existing;

  const columns = result.data.columns as unknown[] | undefined;
  for (const row of result.data.rows as unknown[]) {
    const id = rowValue(row, columns, "id", 0);
    const sourceId = rowValue(row, columns, "source_id", 1);
    if (id && sourceId) {
      existing.set(String(sourceId), { id: String(id) });
    }
  }

  return existing;
}

function transcriptBlobIsMissingOrEmpty(raw: unknown): boolean {
  if (raw == null || raw === "") return true;

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length === 0;
    } catch {
      return true;
    }
  }

  return Array.isArray(raw) && raw.length === 0;
}

async function transcriptBlobNeedsRepair(
  access: DelegatedAccess,
  conversationId: string,
): Promise<boolean> {
  try {
    const result = await access.kv.get(`transcript/${conversationId}`);
    if (!result.ok) return true;
    return transcriptBlobIsMissingOrEmpty(result.data?.data);
  } catch {
    return true;
  }
}

async function prepareFirefliesSyncWork(
  access: DelegatedAccess,
  summaries: FullTranscript[],
  existingBySourceId: Map<string, ExistingFirefliesConversation>,
): Promise<{ items: FirefliesSyncWorkItem[]; skipped: number }> {
  const items: FirefliesSyncWorkItem[] = [];
  let skipped = 0;

  for (const summary of summaries) {
    const existing = existingBySourceId.get(summary.id);
    if (!existing) {
      items.push({ type: "create", summary });
      continue;
    }

    if (await transcriptBlobNeedsRepair(access, existing.id)) {
      items.push({ type: "repair", summary, conversationId: existing.id });
    } else {
      skipped++;
    }
  }

  return { items, skipped };
}

async function processFirefliesSyncWork({
  access,
  client,
  items,
  skipped,
  onProgress,
  shouldContinue,
}: {
  access: DelegatedAccess;
  client: FirefliesSyncClient;
  items: FirefliesSyncWorkItem[];
  skipped: number;
  onProgress?: (progress: FirefliesSyncProgress) => void;
  shouldContinue?: () => boolean;
}): Promise<FirefliesSyncResult> {
  let synced = 0;
  let repaired = 0;
  let failed = 0;
  const errors: string[] = [];
  const conversations: Array<{ id: string; title: string; started_at: string }> = [];

  for (let i = 0; i < items.length; i++) {
    if (shouldContinue && !shouldContinue()) break;

    const item = items[i]!;
    const { summary } = item;

    try {
      const transcript = await client.getTranscript(summary.id);

      if (item.type === "repair") {
        await persistTranscriptBlob(access, item.conversationId, transcript.sentences ?? []);
        repaired++;
      } else {
        const result = await persistFullTranscript(transcript, access, {
          downloadAudio: client.downloadAudio?.bind(client),
        });

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
        } else {
          skipped++;
        }
      }
    } catch (err) {
      if (err instanceof FirefliesRateLimitError) throw err;
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${summary.id}: ${message}`);
    }

    onProgress?.({
      current: i + 1,
      total: items.length,
      synced,
      repaired,
      failed,
      lastTitle: summary.title,
    });
  }

  return { synced, repaired, skipped, failed, errors, conversations };
}

// ── Sync Routes ──────────────────────────────────────────────────────

export function createSyncRouter(config: SyncRoutesConfig) {
  const { authMiddleware, delegationMiddleware } = config;
  const makeClient = config.createClient ?? ((key: string) => new FirefliesClient(key));
  const delayMs = config.syncDelayMs ?? SYNC_DELAY_MS;
  const router = Router();

  // All sync routes require auth + delegation
  router.use(authMiddleware);
  router.use(delegationMiddleware);

  // ── POST /api/sync/fireflies — paginated sync with pre-fetch dedup ──
  router.post("/fireflies", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;

    // 1. Read Fireflies API key from TinyCloud Secrets
    const apiKey = await readFirefliesApiKey(req);
    if (!apiKey) {
      res.status(404).json({
        error: "no_api_key",
        message: "No Fireflies API key configured. Store FIREFLIES_API_KEY with TinyCloud Secrets.",
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

      // 4. List every Fireflies page. The limit controls page size, not total sync size.
      const mode = req.body?.mode === "full" ? "full" : "incremental";
      const paginationResult = await client.listAllTranscripts({
        batchSize: limit,
        mode,
        delayMs,
      });
      const summaries = paginationResult.transcripts;
      console.log(
        `[sync] Fireflies returned ${summaries.length} transcripts across ${paginationResult.batchCount} batch(es):`,
        summaries.map((s) => ({ id: s.id, title: s.title })),
      );

      if (summaries.length === 0) {
        res.json({
          synced: 0,
          repaired: 0,
          skipped: 0,
          failed: 0,
          errors: [],
          conversations: [],
        });
        return;
      }

      // 5. Dedup by source_id, but repair existing rows missing transcript KV.
      const existingBySourceId = await loadExistingFirefliesConversations(sqlDb);
      const work = await prepareFirefliesSyncWork(access, summaries, existingBySourceId);
      const result = await processFirefliesSyncWork({
        access,
        client,
        items: work.items,
        skipped: work.skipped,
      });

      res.json(result);
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
      const apiKey = await readFirefliesApiKey(req);
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

      // 3. Collect existing source_ids for dedup and transcript repair.
      const existingBySourceId = await loadExistingFirefliesConversations(sqlDb);
      const knownIds = new Set(existingBySourceId.keys());

      sendEvent("status", { phase: "listing", message: "Fetching transcript list..." });

      // 4. Paginate through all transcripts
      if (aborted) {
        res.end();
        return;
      }

      const paginationResult = await client.listAllTranscripts({
        batchSize: 25,
        mode,
        knownIds,
        delayMs,
        onProgress: (info) => {
          sendEvent("progress", {
            phase: "listing",
            batch: info.batch,
            totalListed: info.totalSoFar,
          });
        },
      });

      // 5. Filter to new work and existing rows that need transcript repair.
      const work = await prepareFirefliesSyncWork(
        access,
        paginationResult.transcripts,
        existingBySourceId,
      );
      const createCount = work.items.filter((item) => item.type === "create").length;
      const repairCount = work.items.length - createCount;

      sendEvent("status", {
        phase: "syncing",
        message:
          repairCount > 0
            ? `Found ${createCount} new transcripts and ${repairCount} transcript repairs`
            : `Found ${createCount} new transcripts to sync`,
        total: work.items.length,
        skipped: work.skipped,
        repaired: repairCount,
      });

      // 6. Sync each new or repairable transcript with progress.
      const result = await processFirefliesSyncWork({
        access,
        client,
        items: work.items,
        skipped: work.skipped,
        shouldContinue: () => !aborted,
        onProgress: (progress) => {
          if (aborted) return;
          sendEvent("progress", {
            phase: "syncing",
            ...progress,
          });
        },
      });

      // 7. Done
      sendEvent("complete", result);
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

    // 1. Read Fireflies API key from TinyCloud Secrets
    const apiKey = await readFirefliesApiKey(req);
    if (!apiKey) {
      res.status(404).json({
        error: "no_api_key",
        message: "No Fireflies API key configured. Store FIREFLIES_API_KEY with TinyCloud Secrets.",
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
