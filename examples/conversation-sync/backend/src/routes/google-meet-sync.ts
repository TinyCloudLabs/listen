import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import { GoogleMeetClient } from "../services/google-meet-client.js";
import type { ConferenceRecord } from "../services/google-meet-client.js";
import { GoogleAuthRevokedError } from "../services/google-auth.js";
import { ensureSchema } from "../schema.js";
import { syncSingleConference } from "../services/google-meet-sync.js";

// ── Types ────────────────────────────────────────────────────────────

interface GoogleMeetSyncRoutesConfig {
  authMiddleware: RequestHandler;
  delegationMiddleware: RequestHandler;
  /** Injectable for testing */
  createClient?: (
    accessToken: string,
    onTokenRefresh?: (newToken: string) => Promise<void>,
    refreshToken?: string,
  ) => Pick<GoogleMeetClient, "listConferenceRecords" | "getFullConference">;
  /** Delay between API calls in ms (default 200). */
  syncDelayMs?: number;
}

// ── Constants ────────────────────────────────────────────────────────

const GOOGLE_TOKENS_PATH = "/app.conversations/config/google-tokens";
const DEFAULT_SYNC_DELAY_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

// ── Token helpers ────────────────────────────────────────────────────

interface StoredTokens {
  access_token: string;
  refresh_token?: string;
}

async function readTokens(access: any): Promise<StoredTokens | null> {
  const result = await access.kv.get(GOOGLE_TOKENS_PATH);
  if (!result.ok || result.data.data == null) return null;
  try {
    const raw = result.data.data;
    // KV may return data as string, object, or Uint8Array
    if (typeof raw === "object" && raw !== null && !(raw instanceof Uint8Array)) {
      return raw as StoredTokens;
    }
    const str = raw instanceof Uint8Array ? new TextDecoder().decode(raw) : String(raw);
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function createClientWithTokenRefresh(
  tokens: StoredTokens,
  access: any,
  makeClient: NonNullable<GoogleMeetSyncRoutesConfig["createClient"]>,
) {
  const onTokenRefresh = async (newToken: string) => {
    const updated = { ...tokens, access_token: newToken };
    await access.kv.put(GOOGLE_TOKENS_PATH, JSON.stringify(updated));
  };
  return makeClient(tokens.access_token, onTokenRefresh, tokens.refresh_token);
}

// ── Sync Router ─────────────────────────────────────────────────────

export function createGoogleMeetSyncRouter(config: GoogleMeetSyncRoutesConfig) {
  const { authMiddleware, delegationMiddleware } = config;
  const makeClient =
    config.createClient ??
    ((accessToken: string, onTokenRefresh?: any, refreshToken?: string) =>
      new GoogleMeetClient(accessToken, onTokenRefresh, refreshToken));
  const delayMs = config.syncDelayMs ?? DEFAULT_SYNC_DELAY_MS;
  const router = Router();

  // All routes require auth + delegation
  router.use(authMiddleware);
  router.use(delegationMiddleware);

  // ── POST / — batch sync last 30 days with pre-fetch dedup ────────
  router.post("/", async (req: Request, res: Response) => {
    if (!requireGoogleConfig(req, res)) return;

    const access = req.delegatedAccess!;

    // 1. Read tokens from KV
    const tokens = await readTokens(access);
    if (!tokens) {
      res.status(404).json({
        error: "no_tokens",
        message: "No Google tokens configured. Connect your Google account first.",
      });
      return;
    }

    try {
      await ensureSchema(access);

      const client = createClientWithTokenRefresh(tokens, access, makeClient);

      // 2. List conferences from last 30 days
      const conferences = await client.listConferenceRecords();

      if (conferences.length === 0) {
        res.json({ synced: 0, skipped: 0, failed: 0, errors: [], conversations: [] });
        return;
      }

      // 3. Pre-fetch dedup: batch query existing source_ids
      const sourceIds = conferences.map((c) => c.name);
      const placeholders = sourceIds.map(() => "?").join(", ");
      const dedupQuery = `SELECT source_id FROM conversation WHERE source = 'google-meet' AND source_id IN (${placeholders})`;
      const dedupResult = await access.sql.query(dedupQuery, sourceIds);

      const existingIds = new Set<string>();
      if (dedupResult.ok && dedupResult.data.rows) {
        for (const row of dedupResult.data.rows) {
          const val = Array.isArray(row) ? row[0] : (row as any).source_id;
          if (val) existingIds.add(String(val));
        }
      }

      // 4. Filter to new conferences
      const newConferences = conferences.filter((c) => !existingIds.has(c.name));
      const skipped = conferences.length - newConferences.length;

      // 5. Sync each new conference
      let synced = 0;
      let failed = 0;
      const errors: string[] = [];
      const conversations: Array<{ id: string; title: string; started_at: string }> = [];

      for (const conference of newConferences) {
        const result = await syncSingleConference(conference, access, client);
        if (result.status === "created") {
          synced++;
          conversations.push({
            id: result.conversationId!,
            title: result.title ?? "",
            started_at: result.startedAt ?? "",
          });
        } else if (result.status === "error") {
          failed++;
          errors.push(`${conference.name}: ${result.error}`);
        }

        if (delayMs > 0) await sleep(delayMs);
      }

      res.json({ synced, skipped, failed, errors, conversations });
    } catch (err) {
      if (err instanceof GoogleAuthRevokedError) {
        await access.kv.delete(GOOGLE_TOKENS_PATH);
        res.status(401).json({
          error: "google_auth_revoked",
          message: "Google authorization has been revoked. Please reconnect.",
        });
        return;
      }
      console.error("[sync] google-meet sync failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "sync_failed", message: `Sync failed: ${message}` });
    }
  });

  // ── GET /stream — SSE sync with progress events ───────────────────
  router.get("/stream", async (req: Request, res: Response) => {
    if (!requireGoogleConfig(req, res)) return;

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
      // 1. Read tokens
      const rawResult = await access.kv.get(GOOGLE_TOKENS_PATH);
      console.log("[google-meet-sync] raw KV get result:", JSON.stringify({ ok: rawResult.ok, hasData: rawResult.data?.data != null, type: typeof rawResult.data?.data, preview: JSON.stringify(rawResult.data?.data)?.slice(0, 200) }));
      const tokens = await readTokens(access);
      if (!tokens) {
        console.log("[google-meet-sync] no tokens found at", GOOGLE_TOKENS_PATH);
        sendEvent("error", { message: "No Google tokens configured. Connect your account first." });
        res.end();
        return;
      }
      console.log("[google-meet-sync] tokens loaded, has refresh_token:", !!tokens.refresh_token);

      await ensureSchema(access);
      const client = createClientWithTokenRefresh(tokens, access, makeClient);

      sendEvent("status", { phase: "listing", message: "Fetching conference list..." });

      // 2. List conferences
      if (aborted) { res.end(); return; }
      const conferences = await client.listConferenceRecords();

      // 3. Collect existing source_ids for dedup
      const knownIds = new Set<string>();
      const existingResult = await access.sql.query(
        "SELECT source_id FROM conversation WHERE source = 'google-meet'",
      );
      if (existingResult.ok && existingResult.data.rows) {
        for (const row of existingResult.data.rows) {
          const val = Array.isArray(row) ? row[0] : (row as any).source_id;
          if (val) knownIds.add(String(val));
        }
      }

      // 4. Filter to new conferences
      const newConferences = conferences.filter((c) => !knownIds.has(c.name));
      const skipped = conferences.length - newConferences.length;

      sendEvent("status", {
        phase: "syncing",
        message: `Found ${newConferences.length} new conferences to sync`,
        total: newConferences.length,
        skipped,
      });

      // 5. Sync each with progress
      let synced = 0;
      let failed = 0;
      const errors: string[] = [];
      const conversations: Array<{ id: string; title: string; started_at: string }> = [];

      for (let i = 0; i < newConferences.length; i++) {
        if (aborted) break;

        const conference = newConferences[i];
        const result = await syncSingleConference(conference, access, client);

        if (result.status === "created") {
          synced++;
          conversations.push({
            id: result.conversationId!,
            title: result.title ?? "",
            started_at: result.startedAt ?? "",
          });
        } else if (result.status === "error") {
          failed++;
          errors.push(`${conference.name}: ${result.error}`);
        }

        sendEvent("progress", {
          phase: "syncing",
          current: i + 1,
          total: newConferences.length,
          synced,
          failed,
        });

        if (i < newConferences.length - 1 && !aborted && delayMs > 0) {
          await sleep(delayMs);
        }
      }

      // 6. Done
      sendEvent("complete", { synced, skipped, failed, errors, conversations });
    } catch (err) {
      if (err instanceof GoogleAuthRevokedError) {
        sendEvent("error", {
          code: "google_auth_revoked",
          message: "Google authorization has been revoked. Please reconnect.",
        });
      } else {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[sync] SSE google-meet sync failed:", err);
        sendEvent("error", { message: `Sync failed: ${message}` });
      }
    }

    res.end();
  });

  // ── DELETE /conversations — purge all google-meet data ────────────
  router.delete("/conversations", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;
    try {
      await ensureSchema(access);
      // Delete participants for google-meet conversations, then conversations
      await access.sql.execute(
        `DELETE FROM participant WHERE conversation_id IN (SELECT id FROM conversation WHERE source = 'google-meet')`,
      );
      await access.sql.execute(`DELETE FROM conversation WHERE source = 'google-meet'`);
      res.json({ ok: true, message: "All Google Meet conversations cleared." });
    } catch (err) {
      console.error("[sync] google-meet purge failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "purge_failed", message });
    }
  });

  return router;
}
