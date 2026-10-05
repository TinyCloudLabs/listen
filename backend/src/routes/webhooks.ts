import { Router, raw as expressRaw } from "express";
import type { Request, Response, RequestHandler } from "express";
import type { DelegatedAccess } from "@listen/server";
import { isStorageFullError, storageErrorCode } from "@listen/core";
import { verifyFirefliesSignature } from "../services/webhook-verify.js";
import { syncSingleTranscript, type SyncSingleResult } from "../services/sync-pipeline.js";
import { FirefliesClient } from "../services/fireflies-client.js";
import { resolveAppPath } from "../manifest.js";
import { conversationSql, ensureSchema } from "../schema.js";
import { readFirefliesApiKeyResult } from "../services/fireflies-secret.js";
import { sendStorageError, throwIfStorageRejected } from "../storage-errors.js";

// ── Types ────────────────────────────────────────────────────────────

interface BackendKV {
  get(key: string): Promise<{ ok: boolean; data: { data: string | null } }>;
  put(key: string, value: string): Promise<{ ok: boolean }>;
}

interface WebhookRoutesConfig {
  backendKV: BackendKV;
  tryGetDelegatedAccess: () => Promise<
    | DelegatedAccess
    | null
    | {
        access: DelegatedAccess | null;
        reason: "ready" | "no_delegation" | "delegation_unavailable";
      }
  >;
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

type FirefliesDelegationResult = {
  access: DelegatedAccess | null;
  reason: "ready" | "no_delegation" | "delegation_unavailable";
};

function isDelegationResult(value: unknown): value is FirefliesDelegationResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "access" in value &&
    (value as { reason?: unknown }).reason !== undefined
  );
}

// ── Constants ────────────────────────────────────────────────────────

const SECRET_KV_KEY = resolveAppPath("webhooks/config/fireflies-secret");
const PENDING_KV_KEY = resolveAppPath("webhooks/pending/fireflies");

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

      // Queued items remember what the event asked for, so draining the queue
      // re-runs a summary update rather than a transcript sync that skips it.
      const pendingKind: PendingKind =
        eventType === "meeting.summarized" ? "summary" : "transcript";

      // 6. Check delegation
      try {
        const resolved = await tryGetDelegatedAccess();
        const delegation: FirefliesDelegationResult = isDelegationResult(resolved)
          ? resolved
          : { access: resolved, reason: "no_delegation" };

        if (!delegation.access) {
          console.log(
            `[webhook] delegation unavailable (${delegation.reason}) — queuing meetingId=${meetingId}`,
          );
          await storePending(backendKV, meetingId, pendingKind);
          res.json({ status: "pending", reason: delegation.reason });
          return;
        }

        // 7. Read Fireflies API key from user's TinyCloud Secrets
        const secret = await readFirefliesApiKeyResult(delegation.access);
        if (!secret.ok && secret.reason === "unavailable") {
          res.status(503).json({
            status: "error",
            error: "fireflies_secret_unavailable",
            secretCode: secret.error.code,
            message: secret.error.message ?? "Fireflies API key is temporarily unavailable.",
          });
          return;
        }

        if (!secret.ok) {
          console.log(`[webhook] no Fireflies API key found — queuing meetingId=${meetingId}`);
          await storePending(backendKV, meetingId, pendingKind);
          res.json({ status: "pending", reason: "no_api_key" });
          return;
        }
        const apiKey = secret.data;

        // 8. Sync or update transcript
        await ensureSchema(delegation.access);
        const client = makeClient(apiKey);

        if (pendingKind === "summary") {
          // Summary event — update existing conversation with summary data
          const updated = await updateSummary(meetingId, delegation.access, client);
          if (updated === "not_found") {
            // Conversation not synced yet — fall through to full sync
            const result = await doSync(meetingId, delegation.access, client);
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
          const result = await doSync(meetingId, delegation.access, client);
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
        const storageCode = storageErrorCode(err);
        if (storageCode) {
          // Not this meeting's fault: keep it queued until storage frees up.
          console.log(`[webhook] storage full — queuing meetingId=${meetingId}`);
          await storePending(backendKV, meetingId, pendingKind);
          res.json({ status: "pending", reason: storageCode.toLowerCase() });
          return;
        }
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

      // 2. Get Fireflies API key from user's TinyCloud Secrets
      const secret = await readFirefliesApiKeyResult(req.delegatedAccess);
      if (!secret.ok && secret.reason === "unavailable") {
        res.status(503).json({
          error: "fireflies_secret_unavailable",
          secretCode: secret.error.code,
          message: secret.error.message ?? "Fireflies API key is temporarily unavailable.",
        });
        return;
      }

      if (!secret.ok) {
        res.status(400).json({
          error: "no_api_key",
          message: "Fireflies API key not configured",
        });
        return;
      }
      const apiKey = secret.data;

      // 3. Process each pending item
      try {
        await ensureSchema(access);
      } catch (err) {
        if (sendStorageError(res, err)) return;
        throw err;
      }
      const client = makeClient(apiKey);

      // Summary items re-run the summary update the webhook could not apply; a
      // conversation that is not synced yet gets a full sync, as the webhook does.
      const processItem = async (item: PendingItem): Promise<PendingResult> => {
        if (item.kind !== "summary") return doSync(item.meetingId, access, client);
        try {
          const updated = await updateSummary(item.meetingId, access, client);
          if (updated === "not_found") return await doSync(item.meetingId, access, client);
          return {
            status: updated === "updated" ? "updated" : "skipped",
            meetingId: item.meetingId,
          };
        } catch (err) {
          if (isStorageFullError(err)) throw err;
          const message = err instanceof Error ? err.message : String(err);
          return { status: "error", meetingId: item.meetingId, error: message };
        }
      };

      const processed: PendingResult[] = [];
      const skipped: PendingResult[] = [];
      const errors: PendingResult[] = [];
      const remaining: PendingItem[] = [];
      let storageError: unknown = null;

      for (const [index, item] of pending.entries()) {
        let result: PendingResult;
        try {
          result = await processItem(item);
        } catch (err) {
          if (!isStorageFullError(err)) throw err;
          // Storage full refuses every later write too: stop, and keep this item and
          // every unprocessed one queued so they sync once storage frees up.
          storageError = err;
          remaining.push(...pending.slice(index));
          break;
        }
        if (result.status === "created" || result.status === "updated") {
          processed.push(result);
        } else if (result.status === "skipped") {
          skipped.push(result);
        } else {
          errors.push(result);
          remaining.push(item);
        }
      }

      // 4. Update queue — only failed and unprocessed items remain
      await backendKV.put(PENDING_KV_KEY, JSON.stringify(remaining));

      if (storageError && sendStorageError(res, storageError)) return;
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

type PendingKind = "transcript" | "summary";

interface PendingItem {
  meetingId: string;
  receivedAt: string;
  /** Absent on items queued before intent was recorded; those are transcript syncs. */
  kind?: PendingKind;
}

type PendingResult = SyncSingleResult | { status: "updated"; meetingId: string };

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
  const sqlDb = conversationSql(access);

  // Find existing conversation by source_id
  const result = await sqlDb.query(
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
  const updated = await sqlDb.execute(
    `UPDATE conversation SET summary = ?, metadata = ?, updated_at = ? WHERE id = ?`,
    [overview, JSON.stringify(metadata), now, convId],
  );
  throwIfStorageRejected(updated);

  return "updated";
}

async function storePending(backendKV: BackendKV, meetingId: string, kind: PendingKind) {
  const pending = await readPendingQueue(backendKV);
  pending.push({ meetingId, receivedAt: new Date().toISOString(), kind });
  await backendKV.put(PENDING_KV_KEY, JSON.stringify(pending));
}
