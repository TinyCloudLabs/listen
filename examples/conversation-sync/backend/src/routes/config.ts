import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";

// ── Types ────────────────────────────────────────────────────────────

interface BackendKV {
  get(key: string): Promise<{ ok: boolean; data: { data: string | null } }>;
  put(key: string, value: string): Promise<{ ok: boolean }>;
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

const FIREFLIES_KEY_PATH = "/app.conversations/config/fireflies-key";
const GOOGLE_TOKENS_PATH = "/app.conversations/config/google-tokens";
const WEBHOOK_SECRET_PATH = "/app.webhooks/config/fireflies-secret";
const WEBHOOK_USER_ADDRESS_PATH = "/app.webhooks/config/user-address";
const WEBHOOK_PENDING_PATH = "/app.webhooks/pending/fireflies";
const GMEET_SUBSCRIPTION_KV_PATH = "/app.webhooks/config/google-meet-subscription";
const GMEET_PENDING_KV_PATH = "/app.webhooks/pending/google-meet";
const GMEET_FAILED_KV_PATH = "/app.webhooks/failed/google-meet";
const GMEET_USER_SUB_KV_PATH = "/app.webhooks/config/google-meet-user-sub";

// ── Config Routes ────────────────────────────────────────────────────

export function createConfigRouter(config: ConfigRoutesConfig) {
  const { authMiddleware, delegationMiddleware, backendKV, deleteSubscription } = config;
  const router = Router();

  // All config routes require auth
  router.use(authMiddleware);

  // ── Fireflies API key routes (auth + delegation) ──────────────────

  // ── PUT /api/config/fireflies-key — store API key ───────────────
  router.put("/fireflies-key", delegationMiddleware, async (req: Request, res: Response) => {
    const { apiKey } = req.body;

    if (!apiKey || typeof apiKey !== "string") {
      res.status(400).json({
        error: "invalid_body",
        message: "Request body must include a non-empty 'apiKey' string field",
      });
      return;
    }

    try {
      await req.delegatedAccess!.kv.put(FIREFLIES_KEY_PATH, apiKey);
      res.json({ ok: true });
    } catch (err) {
      console.error("[config] failed to store fireflies key:", err);
      res.status(500).json({
        error: "store_failed",
        message: "Failed to store API key",
      });
    }
  });

  // ── DELETE /api/config/fireflies-key — remove API key ───────────
  router.delete("/fireflies-key", delegationMiddleware, async (req: Request, res: Response) => {
    try {
      await req.delegatedAccess!.kv.delete(FIREFLIES_KEY_PATH);
      res.json({ ok: true });
    } catch (err) {
      console.error("[config] failed to delete fireflies key:", err);
      res.status(500).json({
        error: "delete_failed",
        message: "Failed to delete API key",
      });
    }
  });

  // ── GET /api/config/fireflies-key/exists — check existence ──────
  router.get("/fireflies-key/exists", delegationMiddleware, async (req: Request, res: Response) => {
    try {
      const result = await req.delegatedAccess!.kv.get(FIREFLIES_KEY_PATH);
      res.json({ exists: result.ok && result.data.data != null });
    } catch (err) {
      console.error("[config] failed to check fireflies key:", err);
      res.status(500).json({
        error: "check_failed",
        message: "Failed to check API key existence",
      });
    }
  });

  // ── Google Meet connection routes (auth + delegation) ──────────────

  // ── GET /api/config/google-meet/connected — check token existence ─
  router.get(
    "/google-meet/connected",
    delegationMiddleware,
    async (req: Request, res: Response) => {
      try {
        const result = await req.delegatedAccess!.kv.get(GOOGLE_TOKENS_PATH);
        res.json({ connected: result.ok && result.data.data != null });
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
      const tokensRaw = tokensResult.ok && tokensResult.data.data ? tokensResult.data.data : null;

      // 2. Read subscription metadata from backend KV
      let metadata: SubscriptionMetadata | null = null;
      if (backendKV) {
        const metaResult = await backendKV.get(GMEET_SUBSCRIPTION_KV_PATH);
        if (metaResult.ok && metaResult.data.data) {
          try {
            metadata = JSON.parse(metaResult.data.data);
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
      await access.kv.delete(GOOGLE_TOKENS_PATH);

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
        const configured = secretResult.ok && secretResult.data.data != null;

        // Count pending webhooks
        let pendingCount = 0;
        const pendingResult = await backendKV.get(WEBHOOK_PENDING_PATH);
        if (pendingResult.ok && pendingResult.data.data != null) {
          try {
            const pending = JSON.parse(pendingResult.data.data);
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
