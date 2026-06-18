import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import { FIREFLIES_SECRET_NAME, GRANOLA_SECRET_NAME, resolveAppPath } from "../manifest.js";
import { conversationSql, ensureSchema } from "../schema.js";
import { updateConversationTranscriptFields } from "../services/persist-conversation.js";
import { TRANSCRIPTION_SECRET_NAMES } from "../services/transcription.js";

// ── Types ────────────────────────────────────────────────────────────

interface BackendKV {
  get(key: string): Promise<KVResult<string | null>>;
  put(key: string, value: string): Promise<KVWriteResult>;
}

interface KVError {
  code?: string;
  message?: string;
}

interface KVResult<T = unknown> {
  ok: boolean;
  data?: { data?: T | null };
  error?: KVError;
}

interface KVWriteResult {
  ok: boolean;
  error?: KVError;
}

interface SubscriptionMetadata {
  subscriptionName: string;
  googleUserId: string;
  expiresAt: string;
  createdAt: string;
}

interface ConfigRoutesConfig {
  authMiddleware: RequestHandler;
  delegationMiddleware: RequestHandler;
  backendKV?: BackendKV;
  frontendUrl?: string;
  /** Delete Workspace Events subscription on Google disconnect */
  deleteSubscription?: (metadata: SubscriptionMetadata, accessToken: string) => Promise<void>;
}

// ── Constants ────────────────────────────────────────────────────────

const GOOGLE_TOKENS_PATH = "config/google-tokens";
const WEBHOOK_SECRET_PATH = resolveAppPath("webhooks/config/fireflies-secret");
const WEBHOOK_USER_ADDRESS_PATH = resolveAppPath("webhooks/config/user-address");
const WEBHOOK_PENDING_PATH = resolveAppPath("webhooks/pending/fireflies");
const GMEET_SUBSCRIPTION_KV_PATH = resolveAppPath("webhooks/config/google-meet-subscription");
const GMEET_PENDING_KV_PATH = resolveAppPath("webhooks/pending/google-meet");
const GMEET_FAILED_KV_PATH = resolveAppPath("webhooks/failed/google-meet");
const GMEET_USER_SUB_KV_PATH = resolveAppPath("webhooks/config/google-meet-user-sub");

function kvData(result: KVResult): unknown | null {
  return result.ok ? (result.data?.data ?? null) : null;
}

function kvError(result: unknown): KVError | undefined {
  if (!result || typeof result !== "object" || !("error" in result)) return undefined;
  return (result as { error?: KVError }).error;
}

function kvErrorMessage(result: unknown, fallback: string): string {
  const error = kvError(result);
  return error?.message ?? error?.code ?? fallback;
}

function isKvNotFound(result: KVResult): boolean {
  return !result.ok && result.error?.code === "KV_NOT_FOUND";
}

function rowValue(
  row: unknown,
  columns: unknown[] | undefined,
  columnName: string,
  fallbackIndex: number,
): unknown {
  if (Array.isArray(row)) {
    const index = columns?.indexOf(columnName) ?? -1;
    return row[index >= 0 ? index : fallbackIndex];
  }
  return (row as Record<string, unknown> | null)?.[columnName];
}

function transcriptValueMissing(value: unknown): boolean {
  if (value == null || value === "") return true;
  if (typeof value !== "string") return false;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.length === 0;
  } catch {
    return false;
  }
}

function createSecretExistsHandler(secretName: string, label: string) {
  return async (req: Request, res: Response) => {
    try {
      const result = await req.delegatedAccess?.secrets?.get(secretName);
      if (!result) {
        res.status(500).json({
          error: "check_failed",
          message: "Delegation does not include TinyCloud Secrets access",
        });
        return;
      }
      if (!result.ok) {
        const code = result.error?.code?.toLowerCase();
        if (code === "key_not_found" || code === "not_found" || code === "grant_not_found") {
          res.json({ exists: false });
          return;
        }
        res.status(500).json({
          error: "check_failed",
          message: result.error?.message ?? "Failed to check API key existence in TinyCloud",
        });
        return;
      }
      res.json({ exists: true });
    } catch (err) {
      console.error(`[config] failed to check ${label} key:`, err);
      res.status(500).json({
        error: "check_failed",
        message: "Failed to check API key existence",
      });
    }
  };
}

// ── Config Routes ────────────────────────────────────────────────────

export function createConfigRouter(config: ConfigRoutesConfig) {
  const { authMiddleware, delegationMiddleware, backendKV, deleteSubscription } = config;
  const router = Router();

  // All config routes require auth
  router.use(authMiddleware);

  // ── GET /api/config/fireflies-key/exists — check backend secret access ─
  router.get(
    "/fireflies-key/exists",
    delegationMiddleware,
    createSecretExistsHandler(FIREFLIES_SECRET_NAME, "fireflies"),
  );

  // ── GET /api/config/granola-key/exists — check backend secret access ─
  router.get(
    "/granola-key/exists",
    delegationMiddleware,
    createSecretExistsHandler(GRANOLA_SECRET_NAME, "granola"),
  );

  router.get(
    "/assemblyai-key/exists",
    delegationMiddleware,
    createSecretExistsHandler(TRANSCRIPTION_SECRET_NAMES.assemblyai, "assemblyai"),
  );

  router.get(
    "/deepgram-key/exists",
    delegationMiddleware,
    createSecretExistsHandler(TRANSCRIPTION_SECRET_NAMES.deepgram, "deepgram"),
  );

  // ── Google Meet connection routes (auth + delegation) ──────────────

  // ── GET /api/config/google-meet/connected — check token existence ─
  router.get(
    "/google-meet/connected",
    delegationMiddleware,
    async (req: Request, res: Response) => {
      try {
        const result = await req.delegatedAccess!.kv.get(GOOGLE_TOKENS_PATH);
        if (!result.ok && !isKvNotFound(result)) {
          const message = kvErrorMessage(result, "TinyCloud rejected the Google token lookup");
          res.status(500).json({ error: "check_failed", message });
          return;
        }
        res.json({ connected: kvData(result) != null });
      } catch (err) {
        console.error("[config] failed to check google-meet connection:", err);
        res.status(500).json({ error: "check_failed", message: "Failed to check connection" });
      }
    },
  );

  // ── DELETE /api/config/google-meet — disconnect (delete tokens + cleanup) ─
  router.delete("/google-meet", delegationMiddleware, async (req: Request, res: Response) => {
    try {
      const access = req.delegatedAccess!;

      // 1. Read tokens (needed for Workspace Events API delete call)
      const tokensResult = await access.kv.get(GOOGLE_TOKENS_PATH);
      const tokensRaw = kvData(tokensResult);

      // 2. Read subscription metadata from backend KV
      let metadata: SubscriptionMetadata | null = null;
      if (backendKV) {
        const metaResult = await backendKV.get(GMEET_SUBSCRIPTION_KV_PATH);
        const metaRaw = kvData(metaResult);
        if (metaRaw) {
          try {
            metadata = JSON.parse(String(metaRaw));
          } catch {}
        }
      }

      // 3. Delete Workspace Events subscription if we have both tokens and metadata
      if (metadata && tokensRaw && deleteSubscription) {
        try {
          const tokens = JSON.parse(tokensRaw as string);
          await deleteSubscription(metadata, tokens.access_token);
        } catch (err) {
          console.warn("[config] failed to delete Workspace Events subscription:", err);
          // Continue with cleanup even if API call fails
        }
      }

      // 4. Delete user tokens
      const deleteResult = await access.kv.delete(GOOGLE_TOKENS_PATH);
      if (!deleteResult.ok) {
        const message = kvErrorMessage(deleteResult, "TinyCloud rejected the Google token delete");
        res.status(500).json({ error: "disconnect_failed", message });
        return;
      }

      // 5. Clear webhook KV entries
      if (backendKV) {
        await backendKV.put(GMEET_PENDING_KV_PATH, JSON.stringify([]));
        await backendKV.put(GMEET_FAILED_KV_PATH, JSON.stringify([]));
        await backendKV.put(GMEET_SUBSCRIPTION_KV_PATH, "");
        await backendKV.put(GMEET_USER_SUB_KV_PATH, "");
      }

      res.json({ ok: true });
    } catch (err) {
      console.error("[config] failed to disconnect google-meet:", err);
      res.status(500).json({ error: "disconnect_failed", message: "Failed to disconnect" });
    }
  });

  router.post("/migrate-transcripts", delegationMiddleware, async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;

    try {
      await ensureSchema(access);
      const sqlDb = conversationSql(access);
      const result = await sqlDb.query(
        "SELECT id, transcript_json FROM conversation ORDER BY created_at ASC",
      );

      if (!result.ok) {
        res.status(500).json({
          error: "migration_failed",
          message: kvErrorMessage(result, "Failed to read conversation rows"),
        });
        return;
      }

      const rows = result.data.rows ?? [];
      const columns = result.data.columns as unknown[] | undefined;
      let migrated = 0;
      let skipped = 0;
      let missing = 0;
      let failed = 0;

      for (const row of rows as unknown[]) {
        const id = rowValue(row, columns, "id", 0);
        const transcriptJson = rowValue(row, columns, "transcript_json", 1);
        if (!id) {
          failed++;
          continue;
        }

        if (!transcriptValueMissing(transcriptJson)) {
          skipped++;
          continue;
        }

        const kvResult = await access.kv.get(resolveAppPath(`transcript/${String(id)}`));
        const rawTranscript = kvData(kvResult);
        if (!kvResult.ok || rawTranscript == null) {
          missing++;
          continue;
        }

        try {
          await updateConversationTranscriptFields(access, String(id), rawTranscript);
          migrated++;
        } catch (err) {
          failed++;
          console.error(`[config] failed to migrate transcript ${String(id)}:`, err);
        }
      }

      res.json({
        ok: failed === 0,
        scanned: rows.length,
        migrated,
        skipped,
        missing,
        failed,
      });
    } catch (err) {
      console.error("[config] transcript migration failed:", err);
      res.status(500).json({
        error: "migration_failed",
        message: err instanceof Error ? err.message : "Failed to migrate transcripts",
      });
    }
  });

  // ── Webhook config routes (auth only, uses backend KV) ───────────

  if (backendKV) {
    // ── PUT /api/config/webhook-secret — store webhook secret ─────
    router.put("/webhook-secret", async (req: Request, res: Response) => {
      const { secret } = req.body;

      if (!secret || typeof secret !== "string") {
        res.status(400).json({
          error: "invalid_body",
          message: "Request body must include a non-empty 'secret' string field",
        });
        return;
      }

      try {
        await backendKV.put(WEBHOOK_SECRET_PATH, secret);
        // Store user address so webhook handler can look up their delegation
        if (req.user?.address) {
          await backendKV.put(WEBHOOK_USER_ADDRESS_PATH, req.user.address);
        }
        res.json({ ok: true });
      } catch (err) {
        console.error("[config] failed to store webhook secret:", err);
        res.status(500).json({
          error: "store_failed",
          message: "Failed to store webhook secret",
        });
      }
    });

    // ── GET /api/config/webhook-status — webhook configuration status
    router.get("/webhook-status", async (req: Request, res: Response) => {
      try {
        // Check if secret is configured
        const secretResult = await backendKV.get(WEBHOOK_SECRET_PATH);
        const configured = kvData(secretResult) != null;

        // Count pending webhooks
        let pendingCount = 0;
        const pendingResult = await backendKV.get(WEBHOOK_PENDING_PATH);
        const pendingRaw = kvData(pendingResult);
        if (pendingRaw != null) {
          try {
            const pending = JSON.parse(String(pendingRaw));
            pendingCount = Array.isArray(pending) ? pending.length : 0;
          } catch {
            // Invalid JSON — treat as 0 pending
          }
        }

        // Derive webhook URL — always use the backend's own host (not frontendUrl)
        const webhookUrl = `${req.protocol}://${req.get("host")}/api/webhooks/fireflies`;

        res.json({ configured, pendingCount, webhookUrl });
      } catch (err) {
        console.error("[config] failed to get webhook status:", err);
        res.status(500).json({
          error: "status_failed",
          message: "Failed to get webhook status",
        });
      }
    });
  }

  return router;
}
