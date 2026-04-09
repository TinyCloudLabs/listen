import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import { randomUUID } from "crypto";
import {
  buildAuthUrl as defaultBuildAuthUrl,
  exchangeCode as defaultExchangeCode,
} from "../services/google-auth.js";
import type { GoogleTokenResponse } from "../services/google-auth.js";
import type { SubscriptionMetadata } from "../services/pubsub-manager.js";

// ── Types ────────────────────────────────────────────────────────────

interface BackendKV {
  get: (key: string) => Promise<any>;
  put: (key: string, value: string) => Promise<any>;
}

interface GoogleAuthRoutesConfig {
  authMiddleware: RequestHandler;
  delegationMiddleware: RequestHandler;
  resolveDelegation: (address: string) => Promise<any>;
  /** Injectable for testing */
  buildAuthUrl?: (redirectUri: string, state: string) => string;
  exchangeCode?: (code: string, redirectUri: string) => Promise<GoogleTokenResponse>;
  fetchGoogleUserInfo?: (accessToken: string) => Promise<{ sub: string }>;
  /** Backend KV for storing subscription metadata (webhook config) */
  backendKV?: BackendKV;
  /** Whether Google Meet webhooks are enabled */
  isWebhooksEnabled?: () => boolean;
  /** Create a Workspace Events subscription */
  createMeetSubscription?: (projectId: string, googleUserId: string, accessToken: string) => Promise<SubscriptionMetadata>;
  /** GCP project ID for Pub/Sub topic path */
  pubSubProjectId?: string;
}

interface StateEntry {
  address: string;
  createdAt: number;
}

// ── Constants ────────────────────────────────────────────────────────

const GOOGLE_TOKENS_PATH = "/app.conversations/config/google-tokens";
const SUBSCRIPTION_KV_PATH = "/app.webhooks/config/google-meet-subscription";
const USER_ADDRESS_KV_PATH = "/app.webhooks/config/google-meet-user-address";
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

async function defaultFetchGoogleUserInfo(accessToken: string): Promise<{ sub: string }> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Google userinfo request failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<{ sub: string }>;
}

// ── State Store ──────────────────────────────────────────────────────

const pendingStates = new Map<string, StateEntry>();

function cleanExpiredStates() {
  const now = Date.now();
  for (const [key, entry] of pendingStates) {
    if (now - entry.createdAt > STATE_TTL_MS) {
      pendingStates.delete(key);
    }
  }
}

// ── 501 guard ────────────────────────────────────────────────────────

function requireGoogleConfig(_req: Request, res: Response): boolean {
  if (!process.env.GOOGLE_CLIENT_ID) {
    res.status(501).json({
      error: "not_configured",
      message: "Google Meet integration is not configured",
    });
    return false;
  }
  return true;
}

// ── Auth Router ──────────────────────────────────────────────────────

export function createGoogleAuthRouter(config: GoogleAuthRoutesConfig) {
  const {
    authMiddleware,
    resolveDelegation,
    buildAuthUrl = defaultBuildAuthUrl,
    exchangeCode = defaultExchangeCode,
    fetchGoogleUserInfo = defaultFetchGoogleUserInfo,
    backendKV,
    isWebhooksEnabled,
    createMeetSubscription,
    pubSubProjectId,
  } = config;
  const router = Router();

  // ── GET / — initiate OAuth (generates consent URL) ───────────────
  router.get("/", authMiddleware, (req: Request, res: Response) => {
    if (!requireGoogleConfig(req, res)) return;

    cleanExpiredStates();

    const state = randomUUID();
    pendingStates.set(state, { address: req.user!.address, createdAt: Date.now() });

    const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/google/callback`;
    const authUrl = buildAuthUrl(redirectUri, state);

    res.json({ authUrl });
  });

  // ── GET /callback — receive Google redirect (public) ─────────────
  router.get("/callback", async (req: Request, res: Response) => {
    console.log("[google-auth] callback hit, query:", { code: !!req.query.code, state: !!req.query.state });
    if (!requireGoogleConfig(req, res)) return;

    const { code, state } = req.query;

    if (!code || !state || typeof code !== "string" || typeof state !== "string") {
      console.log("[google-auth] missing code or state");
      res.status(400).json({ error: "invalid_request", message: "Missing code or state" });
      return;
    }

    // Validate and consume state
    cleanExpiredStates();
    const stateEntry = pendingStates.get(state);
    if (!stateEntry) {
      console.log("[google-auth] invalid or expired state, pending states:", pendingStates.size);
      res.status(400).json({ error: "invalid_state", message: "Invalid or expired state" });
      return;
    }
    pendingStates.delete(state); // consume — single use
    console.log("[google-auth] state valid for address:", stateEntry.address);

    const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/google/callback`;
    console.log("[google-auth] redirect URI for exchange:", redirectUri);

    try {
      // Exchange code for tokens
      console.log("[google-auth] exchanging code for tokens...");
      const tokens = await exchangeCode(code, redirectUri);
      console.log("[google-auth] got tokens, has refresh_token:", !!tokens.refresh_token);

      // Fetch Google user ID from userinfo endpoint
      let googleUserId: string | undefined;
      try {
        const userInfo = await fetchGoogleUserInfo(tokens.access_token);
        googleUserId = userInfo.sub;
        console.log("[google-auth] got Google user ID:", googleUserId);
      } catch (err) {
        console.warn("[google-auth] failed to fetch userinfo, continuing without googleUserId:", err);
      }

      // Resolve user's delegated access to store tokens in their KV
      console.log("[google-auth] resolving delegation for address:", stateEntry.address);
      const access = await resolveDelegation(stateEntry.address);
      if (!access) {
        console.log("[google-auth] delegation not found for address:", stateEntry.address);
        res.status(200).send(errorHtml("Delegation not found. Please sign in again."));
        return;
      }

      // Store tokens (with googleUserId if available) in user's KV
      const tokenData = googleUserId ? { ...tokens, googleUserId } : tokens;
      console.log("[google-auth] storing tokens in KV...");
      const putResult = await access.kv.put(GOOGLE_TOKENS_PATH, JSON.stringify(tokenData));
      console.log("[google-auth] KV put result:", JSON.stringify(putResult));

      // Create Workspace Events subscription if webhooks are enabled
      if (googleUserId && isWebhooksEnabled?.() && createMeetSubscription && backendKV && pubSubProjectId) {
        try {
          console.log("[google-auth] creating Workspace Events subscription...");
          const metadata = await createMeetSubscription(pubSubProjectId, googleUserId, tokens.access_token);
          await backendKV.put(SUBSCRIPTION_KV_PATH, JSON.stringify(metadata));
          await backendKV.put(USER_ADDRESS_KV_PATH, stateEntry.address);
          console.log("[google-auth] subscription created:", metadata.subscriptionName);
        } catch (err) {
          console.warn("[google-auth] failed to create subscription, manual sync still available:", err);
        }
      }

      console.log("[google-auth] SUCCESS — tokens stored");
      res.status(200).send(successHtml());
    } catch (err) {
      console.error("[google-auth] callback error:", err);
      res.status(200).send(errorHtml("Failed to connect Google account."));
    }
  });

  return router;
}

// ── HTML Responses ──────────────────────────────────────────────────

function successHtml(): string {
  return `<!DOCTYPE html>
<html><head><title>Connected</title></head>
<body>
<script>
  window.opener.postMessage({ type: 'google-auth-success' }, '*');
  window.close();
</script>
<p>Google account connected. You can close this window.</p>
</body></html>`;
}

function errorHtml(message: string): string {
  return `<!DOCTYPE html>
<html><head><title>Error</title></head>
<body>
<script>
  window.opener.postMessage({ type: 'google-auth-error', message: ${JSON.stringify(message)} }, '*');
  window.close();
</script>
<p>${message}</p>
</body></html>`;
}
