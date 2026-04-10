import { Router, raw as expressRaw } from "express";
import type { Request, Response, RequestHandler } from "express";
import type { DelegatedAccess } from "@tinyboilerplate/server";
import { verifyFirefliesSignature } from "../services/webhook-verify.js";
import { syncSingleTranscript, type SyncSingleResult } from "../services/sync-pipeline.js";
import { FirefliesClient } from "../services/fireflies-client.js";
import { ensureSchema } from "../schema.js";

// ── Types ────────────────────────────────────────────────────────────

interface BackendKV {
  get(key: string): Promise<{ ok: boolean; data: { data: string | null } }>;
  put(key: string, value: string): Promise<{ ok: boolean }>;
}

interface WebhookRoutesConfig {
  backendKV: BackendKV;
  tryGetDelegatedAccess: () => Promise<DelegatedAccess | null>;
  /** Auth middleware for pending endpoints (not needed for POST webhook) */
  authMiddleware?: RequestHandler;
  /** Delegation middleware for pending endpoints */
  delegationMiddleware?: RequestHandler;
  /** Override for testing */
  syncFn?: (
    meetingId: string,
    access: DelegatedAccess,
    client: Pick<FirefliesClient, "getTranscript">,
  ) => Promise<SyncSingleResult>;
  /** Override for testing */
  createClient?: (apiKey: string) => Pick<FirefliesClient, "getTranscript">;
}

// ── Constants ────────────────────────────────────────────────────────

const SECRET_KV_KEY = "/app.webhooks/config/fireflies-secret";
const PENDING_KV_KEY = "/app.webhooks/pending/fireflies";
const FIREFLIES_KEY_PATH = "/app.conversations/config/fireflies-key";

// ── Webhook Routes ──────────────────────────────────────────────────

export function createWebhookRouter(config: WebhookRoutesConfig) {
  const { backendKV, tryGetDelegatedAccess } = config;
  const doSync = config.syncFn ?? syncSingleTranscript;
  const makeClient = config.createClient ?? ((key: string) => new FirefliesClient(key));

  const router = Router();

  // POST /fireflies — public endpoint, HMAC-verified
  router.post(
    "/fireflies",
    expressRaw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      // Log incoming request with redacted headers
      const redactedHeaders: Record<string, string> = {};
      for (const [key, val] of Object.entries(req.headers)) {
        if (key === "x-hub-signature" && typeof val === "string") {
          redactedHeaders[key] = val.substring(0, 15) + "...";
        } else if (typeof val === "string") {
          redactedHeaders[key] = val;
        }
      }
      console.log(`[webhook] POST /fireflies — headers: ${JSON.stringify(redactedHeaders)}`);

      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body ?? "");

      // 1. Read webhook secret from backend KV
      const secretResult = await backendKV.get(SECRET_KV_KEY);
      const secret = secretResult.ok && secretResult.data.data ? secretResult.data.data : null;

      if (!secret) {
        console.log("[webhook] no webhook secret configured — rejecting");
        res.status(401).json({
          error: "no_webhook_secret",
          message: "Webhook secret not configured",
        });
        return;
      }

      // 2. Verify HMAC signature
      const signatureHeader = req.headers["x-hub-signature"] as string | undefined;
      if (!signatureHeader || !verifyFirefliesSignature(rawBody, signatureHeader, secret)) {
        console.log(
          `[webhook] signature verification failed — header x-hub-signature: ${signatureHeader ? signatureHeader.substring(0, 15) + "..." : "missing"}`,
        );
        res.status(401).json({
          error: "invalid_signature",
          message: "Invalid or missing HMAC signature",
        });
        return;
      }

      // 3. Parse JSON body
      // Fireflies sends two payload formats:
      //   Legacy: { meetingId, eventType: "Transcription completed" }
      //   Current: { meeting_id, event: "meeting.transcribed", timestamp }
      let raw: Record<string, unknown>;
      try {
        raw = JSON.parse(rawBody.toString());
      } catch {
        console.log("[webhook] failed to parse request body as JSON");
        res.status(400).json({
          error: "invalid_json",
          message: "Request body is not valid JSON",
        });
        return;
      }

      // Normalise both payload formats
      const eventType = (raw.eventType as string) ?? (raw.event as string) ?? undefined;
      const meetingId = (raw.meetingId as string) ?? (raw.meeting_id as string) ?? undefined;

      console.log(
        `[webhook] signature valid, event=${eventType}, meetingId=${meetingId ?? "none"}`,
      );

      // 4. Ignore events we don't handle (return 200 to prevent retries)
      // Accepted events:
      //   V1: "Transcription completed"
      //   V2: "meeting.transcribed", "meeting.summarized"
      const isSyncEvent =
        eventType === "Transcription completed" ||
        eventType === "meeting.transcribed" ||
        eventType === "meeting.summarized";

      if (!isSyncEvent) {
        console.log(`[webhook] ignoring event — event=${eventType}`);
        res.json({ status: "ignored", eventType });
        return;
      }

      // 5. Validate meetingId
      if (!meetingId) {
        console.log("[webhook] missing meetingId in transcription event");
        res.status(400).json({
          error: "missing_meeting_id",
          message: "meetingId is required for transcription events",
        });
        return;
      }

      // 6. Check delegation
      try {
        const access = await tryGetDelegatedAccess();

        if (!access) {
          console.log(`[webhook] delegation expired — queuing meetingId=${meetingId}`);
          await storePending(backendKV, meetingId);
          res.json({ status: "pending", reason: "delegation_expired" });
          return;
        }

        // 7. Read Fireflies API key from user's KV
        const apiKeyResult = await access.kv.get(FIREFLIES_KEY_PATH);
        const apiKey =
          apiKeyResult.ok && apiKeyResult.data.data ? String(apiKeyResult.data.data) : null;

        if (!apiKey) {
          console.log(`[webhook] no Fireflies API key found — queuing meetingId=${meetingId}`);
          await storePending(backendKV, meetingId);
          res.json({ status: "pending", reason: "no_api_key" });
          return;
        }

        // 8. Sync or update transcript
        await ensureSchema(access);
        const client = makeClient(apiKey);

        const isSummaryEvent = eventType === "meeting.summarized";

        if (isSummaryEvent) {
          // Summary event — update existing conversation with summary data
          const updated = await updateSummary(meetingId, access, client);
          if (updated === "not_found") {
            // Conversation not synced yet — fall through to full sync
            const result = await doSync(meetingId, access, client);
            if (result.status === "error") {
              console.log(`[webhook] sync error for meetingId=${meetingId}: ${result.error}`);
              res.status(500).json({ status: "error", error: result.error });
              return;
            }
            console.log(
              `[webhook] summary event triggered full sync meetingId=${result.meetingId} → conversationId=${result.conversationId}`,
            );
            res.json({
              status: "processed",
              meetingId: result.meetingId,
              conversationId: result.conversationId,
              title: result.title,
            });
          } else if (updated === "updated") {
            console.log(`[webhook] summary updated for meetingId=${meetingId}`);
            res.json({ status: "processed", meetingId, summary_updated: true });
          } else {
            console.log(`[webhook] summary still unavailable for meetingId=${meetingId}`);
            res.json({ status: "processed", meetingId, summary_updated: false });
          }
        } else {
          // Transcription event — create new conversation
          const result = await doSync(meetingId, access, client);
          if (result.status === "error") {
            console.log(`[webhook] sync error for meetingId=${meetingId}: ${result.error}`);
            res.status(500).json({ status: "error", error: result.error });
            return;
          }
          console.log(
            `[webhook] processed meetingId=${result.meetingId} → conversationId=${result.conversationId}`,
          );
          res.json({
            status: "processed",
            meetingId: result.meetingId,
            conversationId: result.conversationId,
            title: result.title,
          });
        }
      } catch (err) {
        console.error(`[webhook] error processing meetingId=${meetingId}:`, err);
        const message = err instanceof Error ? err.message : String(err);
        res.status(500).json({ status: "error", error: message });
      }
    },
  );

  // ── Pending queue endpoints (require auth + delegation) ──────────

  if (config.authMiddleware && config.delegationMiddleware) {
    const auth = config.authMiddleware;
    const delegation = config.delegationMiddleware;

    // GET /fireflies/pending — process all pending items
    router.get("/fireflies/pending", auth, delegation, async (req: Request, res: Response) => {
      const access = req.delegatedAccess!;

      // 1. Read pending queue
      const pending = await readPendingQueue(backendKV);
      if (pending.length === 0) {
        res.json({ processed: [], skipped: [], errors: [] });
        return;
      }

      // 2. Get Fireflies API key from user's KV
      const apiKeyResult = await access.kv.get(FIREFLIES_KEY_PATH);
      const apiKey =
        apiKeyResult.ok && apiKeyResult.data.data ? String(apiKeyResult.data.data) : null;

      if (!apiKey) {
        res.status(400).json({
          error: "no_api_key",
          message: "Fireflies API key not configured",
        });
        return;
      }

      // 3. Process each pending item
      await ensureSchema(access);
      const client = makeClient(apiKey);

      const processed: SyncSingleResult[] = [];
      const skipped: SyncSingleResult[] = [];
      const errors: SyncSingleResult[] = [];
      const remaining: PendingItem[] = [];

      for (const item of pending) {
        const result = await doSync(item.meetingId, access, client);
        if (result.status === "created") {
          processed.push(result);
        } else if (result.status === "skipped") {
          skipped.push(result);
        } else {
          errors.push(result);
          remaining.push(item);
        }
      }

      // 4. Update queue — only failed items remain
      await backendKV.put(PENDING_KV_KEY, JSON.stringify(remaining));

      res.json({ processed, skipped, errors });
    });

    // DELETE /fireflies/pending — clear all pending items
    router.delete("/fireflies/pending", auth, delegation, async (_req: Request, res: Response) => {
      const pending = await readPendingQueue(backendKV);
      await backendKV.put(PENDING_KV_KEY, JSON.stringify([]));
      res.json({ cleared: pending.length });
    });
  }

  return router;
}

// ── Helpers ──────────────────────────────────────────────────────────

interface PendingItem {
  meetingId: string;
  receivedAt: string;
}

async function readPendingQueue(backendKV: BackendKV): Promise<PendingItem[]> {
  const result = await backendKV.get(PENDING_KV_KEY);
  if (!result.ok || !result.data.data) return [];
  try {
    const parsed = JSON.parse(result.data.data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function updateSummary(
  meetingId: string,
  access: DelegatedAccess,
  client: Pick<FirefliesClient, "getTranscript">,
): Promise<"updated" | "not_found" | "no_summary"> {
  // Find existing conversation by source_id
  const result = await access.sql.query(
    `SELECT id, metadata FROM conversation WHERE source = 'fireflies' AND source_id = ?`,
    [meetingId],
  );

  if (!result.ok || !result.data.rows?.length) return "not_found";

  const row = result.data.rows[0];
  const convId = String(Array.isArray(row) ? row[0] : (row as any).id);
  const rawMeta = Array.isArray(row) ? row[1] : (row as any).metadata;

  // Re-fetch transcript from Fireflies
  const transcript = await client.getTranscript(meetingId);
  const overview = transcript.summary?.overview;
  if (!overview) return "no_summary";

  // Merge summary data into metadata
  let metadata: Record<string, unknown> = {};
  if (rawMeta) {
    try {
      metadata = JSON.parse(String(rawMeta));
    } catch {
      /* ignore malformed JSON */
    }
  }
  metadata.keywords = transcript.summary?.keywords ?? [];
  metadata.meeting_type = transcript.summary?.meeting_type ?? null;

  const now = new Date().toISOString();
  await access.sql.execute(
    `UPDATE conversation SET summary = ?, metadata = ?, updated_at = ? WHERE id = ?`,
    [overview, JSON.stringify(metadata), now, convId],
  );

  return "updated";
}

async function storePending(backendKV: BackendKV, meetingId: string) {
  const existingResult = await backendKV.get(PENDING_KV_KEY);
  let pending: Array<{ meetingId: string; receivedAt: string }> = [];

  if (existingResult.ok && existingResult.data.data) {
    try {
      pending = JSON.parse(existingResult.data.data);
      if (!Array.isArray(pending)) pending = [];
    } catch {
      pending = [];
    }
  }

  pending.push({ meetingId, receivedAt: new Date().toISOString() });
  await backendKV.put(PENDING_KV_KEY, JSON.stringify(pending));
}
