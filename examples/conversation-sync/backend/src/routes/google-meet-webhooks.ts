import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import type { DelegatedAccess } from "@tinyboilerplate/server";
import { verifyPubSubToken } from "../services/pubsub-verify.js";
import { GoogleMeetClient } from "../services/google-meet-client.js";
import type { ConferenceRecord, FullConference } from "../services/google-meet-client.js";
import { normalizeGoogleMeet } from "../adapters/google-meet.js";
import { persistConversation } from "../services/persist-conversation.js";
import { ensureSchema } from "../schema.js";
import { GoogleAuthRevokedError } from "../services/google-auth.js";
import type { SyncSingleResult } from "../services/google-meet-sync.js";
import { checkAndRenewSubscription as defaultCheckAndRenew } from "../services/pubsub-manager.js";
import type { SubscriptionMetadata, RenewalResult } from "../services/pubsub-manager.js";

// ── Types ────────────────────────────────────────────────────────────

interface BackendKV {
  get(key: string): Promise<{ ok: boolean; data: { data: string | null } }>;
  put(key: string, value: string): Promise<{ ok: boolean }>;
}

interface MeetClient {
  getConferenceRecord(name: string): Promise<ConferenceRecord>;
  getFullConference(conferenceRecord: ConferenceRecord): Promise<FullConference>;
}

export interface GoogleMeetPushConfig {
  backendKV: BackendKV;
  tryGetDelegatedAccess: () => Promise<DelegatedAccess | null>;
  expectedAudience: string;
  expectedEmail: string;
  /** Auth middleware for pending endpoints */
  authMiddleware?: RequestHandler;
  /** Delegation middleware for pending endpoints */
  delegationMiddleware?: RequestHandler;
  /** Override for testing */
  verifyToken?: (authHeader: string, aud: string, email: string) => boolean;
  /** Override for testing */
  createClient?: (
    accessToken: string,
    onTokenRefresh?: (newToken: string) => Promise<void>,
    refreshToken?: string,
  ) => MeetClient;
  /** Override for testing — processes a conference by name */
  syncConference?: (
    conferenceRecordName: string,
    access: DelegatedAccess,
    client: MeetClient,
  ) => Promise<SyncSingleResult>;
  /** Override for testing — check and renew subscription */
  checkAndRenew?: (metadata: SubscriptionMetadata, accessToken: string) => Promise<RenewalResult>;
}

// ── Constants ────────────────────────────────────────────────────────

const GOOGLE_TOKENS_PATH = "/app.conversations/config/google-tokens";
const PENDING_KV_KEY = "/app.webhooks/pending/google-meet";
const FAILED_KV_KEY = "/app.webhooks/failed/google-meet";
const SUBSCRIPTION_KV_KEY = "/app.webhooks/config/google-meet-subscription";
const TRANSCRIPT_EVENT_TYPE = "google.workspace.meet.transcript.v2.fileGenerated";

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Extract conference record name from ce-subject or transcript resource path.
 * Input:  "//meet.googleapis.com/conferenceRecords/abc/transcripts/xyz"
 * Output: "conferenceRecords/abc"
 */
function extractConferenceRecordName(resourcePath: string): string | null {
  const match = resourcePath.match(/conferenceRecords\/[^/]+/);
  return match ? match[0] : null;
}

interface PendingItem {
  conferenceRecordName: string;
  transcriptName?: string;
  receivedAt: string;
}

async function storePending(
  backendKV: BackendKV,
  conferenceRecordName: string,
  transcriptName?: string,
) {
  const existingResult = await backendKV.get(PENDING_KV_KEY);
  let pending: PendingItem[] = [];

  if (existingResult.ok && existingResult.data.data) {
    try {
      pending = JSON.parse(existingResult.data.data);
      if (!Array.isArray(pending)) pending = [];
    } catch {
      pending = [];
    }
  }

  pending.push({ conferenceRecordName, transcriptName, receivedAt: new Date().toISOString() });
  await backendKV.put(PENDING_KV_KEY, JSON.stringify(pending));
}

interface FailedItem {
  conferenceRecordName: string;
  error: string;
  failedAt: string;
}

async function storeFailed(backendKV: BackendKV, conferenceRecordName: string, error: string) {
  const existingResult = await backendKV.get(FAILED_KV_KEY);
  let failed: FailedItem[] = [];

  if (existingResult.ok && existingResult.data.data) {
    try {
      failed = JSON.parse(existingResult.data.data);
      if (!Array.isArray(failed)) failed = [];
    } catch {
      failed = [];
    }
  }

  failed.push({ conferenceRecordName, error, failedAt: new Date().toISOString() });
  await backendKV.put(FAILED_KV_KEY, JSON.stringify(failed));
}

// ── Exported Helpers ─────────────────────────────────────────────────

export async function readPendingQueue(backendKV: BackendKV): Promise<PendingItem[]> {
  const result = await backendKV.get(PENDING_KV_KEY);
  if (!result.ok || !result.data.data) return [];
  try {
    const parsed = JSON.parse(result.data.data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ── Default sync implementation ─────────────────────────────────────

async function defaultSyncConference(
  conferenceRecordName: string,
  access: DelegatedAccess,
  client: MeetClient,
): Promise<SyncSingleResult> {
  // Inline implementation that mirrors syncSingleConference but takes a name string
  try {
    // 1. Dedup
    const dedupResult = await access.sql.query(
      `SELECT source_id FROM conversation WHERE source = 'google-meet' AND source_id = ?`,
      [conferenceRecordName],
    );
    if (dedupResult.ok && dedupResult.data.rows) {
      for (const row of dedupResult.data.rows) {
        const val = Array.isArray(row) ? row[0] : (row as any).source_id;
        if (String(val) === conferenceRecordName) {
          return { status: "skipped", conferenceRecordName };
        }
      }
    }

    // 2. Fetch conference record + full conference
    const conferenceRecord = await client.getConferenceRecord(conferenceRecordName);
    const fullConference = await client.getFullConference(conferenceRecord);

    if (fullConference.entries.length === 0) {
      return { status: "skipped", conferenceRecordName };
    }

    // 3. Normalize + persist
    const normalized = normalizeGoogleMeet(fullConference);
    await persistConversation(access, normalized);

    return {
      status: "created",
      conferenceRecordName,
      conversationId: normalized.conversation.id,
      title: normalized.conversation.title ?? undefined,
      startedAt: normalized.conversation.started_at ?? undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: "error", conferenceRecordName, error: message };
  }
}

// ── Route ────────────────────────────────────────────────────────────

export function createGoogleMeetPushRouter(config: GoogleMeetPushConfig) {
  const {
    backendKV,
    tryGetDelegatedAccess,
    expectedAudience,
    expectedEmail,
    verifyToken = verifyPubSubToken,
    createClient = (accessToken, onTokenRefresh, refreshToken) =>
      new GoogleMeetClient(accessToken, onTokenRefresh, refreshToken),
    syncConference = defaultSyncConference,
    checkAndRenew = defaultCheckAndRenew,
  } = config;

  const router = Router();

  // POST / — Pub/Sub push endpoint (public, OIDC-verified)
  router.post("/", async (req: Request, res: Response) => {
    // 1. Verify OIDC token
    const authHeader = req.headers.authorization ?? "";
    if (!verifyToken(authHeader, expectedAudience, expectedEmail)) {
      res
        .status(401)
        .json({ error: "invalid_oidc_token", message: "Invalid or missing OIDC token" });
      return;
    }

    // 2. Parse Pub/Sub message envelope
    const message = req.body?.message;
    if (!message || !message.attributes) {
      res.json({ status: "error", error: "malformed_message" });
      return;
    }

    const ceType = message.attributes["ce-type"] as string | undefined;
    const ceSubject = message.attributes["ce-subject"] as string | undefined;

    // 3. Filter non-transcript events
    if (ceType !== TRANSCRIPT_EVENT_TYPE) {
      console.log(`[google-meet-webhook] ignoring event — ce-type=${ceType}`);
      res.json({ status: "ignored", ceType });
      return;
    }

    // 4. Extract conference record name
    let conferenceRecordName: string | null = null;

    if (ceSubject) {
      conferenceRecordName = extractConferenceRecordName(ceSubject);
    }

    // Fallback: try decoded data
    if (!conferenceRecordName && message.data) {
      try {
        const decoded = JSON.parse(Buffer.from(message.data, "base64").toString("utf-8"));
        const transcriptName = decoded?.transcript?.name;
        if (typeof transcriptName === "string") {
          conferenceRecordName = extractConferenceRecordName(transcriptName);
        }
      } catch {
        // ignore decode errors
      }
    }

    if (!conferenceRecordName) {
      console.log("[google-meet-webhook] cannot extract conferenceRecordName from message");
      res.json({ status: "error", error: "cannot_extract_conference_name" });
      return;
    }

    console.log(`[google-meet-webhook] processing conferenceRecordName=${conferenceRecordName}`);

    // 5. Get delegation access
    const access = await tryGetDelegatedAccess();
    if (!access) {
      console.log("[google-meet-webhook] no delegation — queuing to pending");
      await storePending(backendKV, conferenceRecordName);
      res.json({ status: "pending", reason: "no_delegation" });
      return;
    }

    // 6. Read Google tokens from user KV
    const tokensResult = await access.kv.get(GOOGLE_TOKENS_PATH);
    const tokensRaw = tokensResult.ok && tokensResult.data.data ? tokensResult.data.data : null;

    if (!tokensRaw) {
      console.log("[google-meet-webhook] no Google tokens — queuing to pending");
      await storePending(backendKV, conferenceRecordName);
      res.json({ status: "pending", reason: "no_google_tokens" });
      return;
    }

    let tokens: { access_token: string; refresh_token?: string };
    try {
      tokens = JSON.parse(tokensRaw as string);
    } catch {
      console.log("[google-meet-webhook] invalid token JSON — queuing to pending");
      await storePending(backendKV, conferenceRecordName);
      res.json({ status: "pending", reason: "no_google_tokens" });
      return;
    }

    // 7. Dedup check
    const dedupResult = await access.sql.query(
      `SELECT source_id FROM conversation WHERE source = 'google-meet' AND source_id = ?`,
      [conferenceRecordName],
    );

    if (dedupResult.ok && dedupResult.data.rows) {
      for (const row of dedupResult.data.rows) {
        const val = Array.isArray(row) ? row[0] : (row as any).source_id;
        if (String(val) === conferenceRecordName) {
          console.log(
            `[google-meet-webhook] already synced — conferenceRecordName=${conferenceRecordName}`,
          );
          res.json({ status: "skipped", conferenceRecordName });
          return;
        }
      }
    }

    // 8. Create client with token refresh callback
    const onTokenRefresh = async (newToken: string) => {
      const updated = { ...tokens, access_token: newToken };
      await access.kv.put(GOOGLE_TOKENS_PATH, JSON.stringify(updated));
    };

    const client = createClient(tokens.access_token, onTokenRefresh, tokens.refresh_token);

    // 9. Fetch, normalize, persist
    try {
      await ensureSchema(access);

      const conferenceRecord = await client.getConferenceRecord(conferenceRecordName);
      const fullConference = await client.getFullConference(conferenceRecord);
      const normalized = normalizeGoogleMeet(fullConference);

      await persistConversation(access, normalized);

      console.log(
        `[google-meet-webhook] processed conferenceRecordName=${conferenceRecordName} → conversationId=${normalized.conversation.id}`,
      );
      res.json({
        status: "processed",
        conferenceRecordName,
        conversationId: normalized.conversation.id,
        title: normalized.conversation.title,
      });
    } catch (err) {
      if (err instanceof GoogleAuthRevokedError) {
        console.log(
          `[google-meet-webhook] auth revoked — queuing conferenceRecordName=${conferenceRecordName}`,
        );
        await storePending(backendKV, conferenceRecordName);
        res.json({ status: "pending", reason: "auth_revoked" });
        return;
      }

      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(
        `[google-meet-webhook] error processing conferenceRecordName=${conferenceRecordName}:`,
        err,
      );
      await storeFailed(backendKV, conferenceRecordName, errorMessage);
      res.json({ status: "error", conferenceRecordName, error: errorMessage });
    }
  });

  // ── Pending queue endpoints (require auth + delegation) ──────────

  if (config.authMiddleware && config.delegationMiddleware) {
    const auth = config.authMiddleware;
    const delegation = config.delegationMiddleware;

    // GET /pending — process all pending items
    router.get("/pending", auth, delegation, async (req: Request, res: Response) => {
      const access = req.delegatedAccess!;

      // 1. Read pending queue
      const pending = await readPendingQueue(backendKV);
      if (pending.length === 0) {
        res.json({ processed: [], skipped: [], errors: [] });
        return;
      }

      // 2. Read Google tokens from user KV
      const tokensResult = await access.kv.get(GOOGLE_TOKENS_PATH);
      const tokensRaw = tokensResult.ok && tokensResult.data.data ? tokensResult.data.data : null;

      if (!tokensRaw) {
        res
          .status(400)
          .json({ error: "no_google_tokens", message: "Google tokens not configured" });
        return;
      }

      let tokens: { access_token: string; refresh_token?: string };
      try {
        tokens = JSON.parse(tokensRaw as string);
      } catch {
        res.status(400).json({ error: "no_google_tokens", message: "Invalid Google token data" });
        return;
      }

      // 3. Create client
      await ensureSchema(access);
      const onTokenRefresh = async (newToken: string) => {
        const updated = { ...tokens, access_token: newToken };
        await access.kv.put(GOOGLE_TOKENS_PATH, JSON.stringify(updated));
      };
      const client = createClient(tokens.access_token, onTokenRefresh, tokens.refresh_token);

      // 4. Process each pending item
      const processed: SyncSingleResult[] = [];
      const skipped: SyncSingleResult[] = [];
      const errors: SyncSingleResult[] = [];
      const remaining: PendingItem[] = [];

      for (const item of pending) {
        const result = await syncConference(item.conferenceRecordName, access, client);
        if (result.status === "created") {
          processed.push(result);
        } else if (result.status === "skipped") {
          skipped.push(result);
        } else {
          errors.push(result);
          remaining.push(item);
          await storeFailed(backendKV, item.conferenceRecordName, result.error ?? "unknown error");
        }
      }

      // 5. Update queue — only failed items remain
      await backendKV.put(PENDING_KV_KEY, JSON.stringify(remaining));

      res.json({ processed, skipped, errors });
    });

    // DELETE /pending — clear all pending items
    router.delete("/pending", auth, delegation, async (_req: Request, res: Response) => {
      const pending = await readPendingQueue(backendKV);
      await backendKV.put(PENDING_KV_KEY, JSON.stringify([]));
      res.json({ cleared: pending.length });
    });

    // GET /check — check subscription health, renew if needed
    router.get("/check", auth, delegation, async (req: Request, res: Response) => {
      // 1. Read subscription metadata from backend KV
      const metaResult = await backendKV.get(SUBSCRIPTION_KV_KEY);
      if (!metaResult.ok || !metaResult.data.data) {
        res.json({ status: "not_configured" });
        return;
      }

      let metadata: SubscriptionMetadata;
      try {
        metadata = JSON.parse(metaResult.data.data);
      } catch {
        res.json({ status: "not_configured" });
        return;
      }

      // 2. Read Google tokens from user KV
      const access = req.delegatedAccess!;
      const tokensResult = await access.kv.get(GOOGLE_TOKENS_PATH);
      const tokensRaw = tokensResult.ok && tokensResult.data.data ? tokensResult.data.data : null;

      if (!tokensRaw) {
        res
          .status(400)
          .json({ error: "no_google_tokens", message: "Google tokens not configured" });
        return;
      }

      let tokens: { access_token: string };
      try {
        tokens = JSON.parse(tokensRaw as string);
      } catch {
        res.status(400).json({ error: "no_google_tokens", message: "Invalid Google token data" });
        return;
      }

      // 3. Check and renew
      const result = await checkAndRenew(metadata, tokens.access_token);

      if (result.status === "active") {
        res.json({ status: "active", expiresAt: metadata.expiresAt });
      } else if (result.status === "renewed" && result.metadata) {
        // Update metadata in backend KV
        await backendKV.put(SUBSCRIPTION_KV_KEY, JSON.stringify(result.metadata));
        res.json({ status: "renewed", expiresAt: result.metadata.expiresAt });
      } else {
        // lapsed
        res.json({
          status: "lapsed",
          message:
            "Subscription expired. Please reconnect Google Meet to resume automatic syncing.",
        });
      }
    });
  }

  // ── Auth-only endpoints ───────────────────────────────────────────

  if (config.authMiddleware) {
    const auth = config.authMiddleware;

    // GET /status — webhook configuration status (auth only, no delegation)
    router.get("/status", auth, async (_req: Request, res: Response) => {
      // 1. Read subscription metadata
      const metaResult = await backendKV.get(SUBSCRIPTION_KV_KEY);
      let subscriptionActive = false;
      let expiresAt: string | null = null;

      if (metaResult.ok && metaResult.data.data) {
        try {
          const metadata: SubscriptionMetadata = JSON.parse(metaResult.data.data);
          expiresAt = metadata.expiresAt;
          subscriptionActive = new Date(metadata.expiresAt).getTime() > Date.now();
        } catch {
          // Invalid metadata — treat as not configured
        }
      }

      // 2. Count pending
      let pendingCount = 0;
      const pendingResult = await backendKV.get(PENDING_KV_KEY);
      if (pendingResult.ok && pendingResult.data.data) {
        try {
          const pending = JSON.parse(pendingResult.data.data);
          pendingCount = Array.isArray(pending) ? pending.length : 0;
        } catch {}
      }

      // 3. Count failed
      let failedCount = 0;
      const failedResult = await backendKV.get(FAILED_KV_KEY);
      if (failedResult.ok && failedResult.data.data) {
        try {
          const failed = JSON.parse(failedResult.data.data);
          failedCount = Array.isArray(failed) ? failed.length : 0;
        } catch {}
      }

      res.json({ enabled: true, subscriptionActive, expiresAt, pendingCount, failedCount });
    });
  }

  return router;
}
