import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import type { DelegatedAccess } from "@listen/server";
import { randomUUID } from "node:crypto";
import { GoogleMeetClient } from "../services/google-meet-client.js";
import type { ConferenceRecord } from "../services/google-meet-client.js";
import { GoogleAuthRevokedError } from "../services/google-auth.js";
import { conversationSql, ensureSchema } from "../schema.js";
import { syncSingleConference } from "../services/google-meet-sync.js";
import { resolveAppPath } from "../manifest.js";
import {
  deleteGoogleTokens,
  LEGACY_GOOGLE_TOKENS_PATH,
  readGoogleTokens,
  writeGoogleTokens,
  type StoredGoogleTokens,
} from "../services/google-tokens.js";
import type { SyncJobResumeRegistry } from "./sync-jobs.js";

// ── Types ────────────────────────────────────────────────────────────

interface GoogleMeetSyncRoutesConfig {
  authMiddleware: RequestHandler;
  delegationMiddleware: RequestHandler;
  backendKV?: BackendKV;
  resumeRegistry?: SyncJobResumeRegistry;
  /** Injectable for testing */
  createClient?: (
    accessToken: string,
    onTokenRefresh?: (newToken: string) => Promise<void>,
    refreshToken?: string,
  ) => Pick<GoogleMeetClient, "listConferenceRecords" | "getFullConference">;
  /** Delay between API calls in ms (default 200). */
  syncDelayMs?: number;
}

interface BackendKV {
  get(key: string): Promise<{
    ok: boolean;
    data?: { data: string | null };
    error?: { code?: string; message?: string };
  }>;
  put(
    key: string,
    value: string,
  ): Promise<{
    ok: boolean;
    error?: { code?: string; message?: string };
  }>;
}

// ── Constants ────────────────────────────────────────────────────────

const DEFAULT_SYNC_DELAY_MS = 200;
const GOOGLE_MEET_JOB_PREFIX = resolveAppPath("sync/google-meet/jobs");

type GoogleMeetSyncJobStatus =
  | "queued"
  | "listing"
  | "syncing"
  | "completed"
  | "failed"
  | "canceled";

interface GoogleMeetSyncJob {
  id: string;
  source: "google-meet";
  ownerAddress: string;
  mode: "incremental" | "full";
  status: GoogleMeetSyncJobStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  message?: string;
  checked: number;
  totalListed?: number;
  current?: number;
  total?: number;
  synced: number;
  skipped: number;
  skippedExisting: number;
  skippedNoTranscript: number;
  failed: number;
  errors: string[];
  conversations: Array<{ id: string; title: string; started_at: string }>;
  lastTitle?: string;
}

interface RunningGoogleMeetJob {
  cancelRequested: boolean;
}

type PersistGoogleMeetJob = (job: GoogleMeetSyncJob) => Promise<void>;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeOwnerAddress(req: Request): string {
  const user = req.user as { address?: string; sub?: string } | undefined;
  const owner = user?.address ?? user?.sub;
  if (!owner) throw new Error("Authenticated request is missing user identity");
  return owner.toLowerCase();
}

function currentJobKey(ownerAddress: string): string {
  return `${GOOGLE_MEET_JOB_PREFIX}/${ownerAddress}/current`;
}

function jobRecordKey(ownerAddress: string, jobId: string): string {
  return `${GOOGLE_MEET_JOB_PREFIX}/${ownerAddress}/${jobId}`;
}

function googleMeetJobCacheKey(ownerAddress: string, jobId: string): string {
  return `${ownerAddress}/${jobId}`;
}

function cloneGoogleMeetJob(job: GoogleMeetSyncJob): GoogleMeetSyncJob {
  return {
    ...job,
    errors: [...job.errors],
    conversations: [...job.conversations],
  };
}

function isActiveJob(job: GoogleMeetSyncJob | null): job is GoogleMeetSyncJob {
  return job?.status === "queued" || job?.status === "listing" || job?.status === "syncing";
}

function createQueuedJob(ownerAddress: string, mode: "incremental" | "full"): GoogleMeetSyncJob {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    source: "google-meet",
    ownerAddress,
    mode,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    checked: 0,
    synced: 0,
    skipped: 0,
    skippedExisting: 0,
    skippedNoTranscript: 0,
    failed: 0,
    errors: [],
    conversations: [],
  };
}

async function writeBackendKv(backendKV: BackendKV, key: string, value: string): Promise<void> {
  const result = await backendKV.put(key, value);
  if (result.ok) return;

  const message = result.error?.message ?? result.error?.code ?? "backend KV write failed";
  throw new Error(`Failed to write Google Meet sync job state (${key}): ${message}`);
}

async function writeJob(backendKV: BackendKV, job: GoogleMeetSyncJob): Promise<void> {
  await writeBackendKv(backendKV, jobRecordKey(job.ownerAddress, job.id), JSON.stringify(job));
  await writeBackendKv(backendKV, currentJobKey(job.ownerAddress), job.id);
}

async function readJob(backendKV: BackendKV, ownerAddress: string, jobId: string) {
  const key = jobRecordKey(ownerAddress, jobId);
  const result = await backendKV.get(key);
  if (!result.ok) {
    const message = result.error?.message ?? result.error?.code ?? "backend KV read failed";
    throw new Error(`Failed to read Google Meet sync job state (${key}): ${message}`);
  }
  if (!result.data?.data) return null;

  try {
    const parsed = JSON.parse(result.data.data) as GoogleMeetSyncJob;
    return parsed.id === jobId && parsed.ownerAddress === ownerAddress ? parsed : null;
  } catch {
    return null;
  }
}

async function readCurrentJob(backendKV: BackendKV, ownerAddress: string) {
  const current = await backendKV.get(currentJobKey(ownerAddress));
  const jobId = current.ok && current.data?.data ? current.data.data : null;
  return jobId ? readJob(backendKV, ownerAddress, jobId) : null;
}

export { readCurrentJob as readCurrentGoogleMeetJobKV };

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

function createClientWithTokenRefresh(
  tokens: StoredGoogleTokens,
  access: any,
  makeClient: NonNullable<GoogleMeetSyncRoutesConfig["createClient"]>,
) {
  const onTokenRefresh = async (newToken: string) => {
    const updated = { ...tokens, access_token: newToken };
    await writeGoogleTokens(access, updated);
  };
  return makeClient(tokens.access_token, onTokenRefresh, tokens.refresh_token);
}

async function loadKnownGoogleMeetSourceIds(
  sqlDb: Pick<ReturnType<typeof conversationSql>, "query">,
) {
  const knownIds = new Set<string>();
  const existingResult = await sqlDb.query(
    "SELECT source_id FROM conversation WHERE source = 'google-meet'",
  );
  if (existingResult.ok && existingResult.data.rows) {
    for (const row of existingResult.data.rows) {
      const val = Array.isArray(row) ? row[0] : (row as any).source_id;
      if (val) knownIds.add(String(val));
    }
  }
  return knownIds;
}

async function syncGoogleMeetConferences({
  access,
  client,
  conferences,
  knownIds,
  delayMs,
  shouldContinue,
  onProgress,
}: {
  access: DelegatedAccess;
  client: Pick<GoogleMeetClient, "getFullConference">;
  conferences: ConferenceRecord[];
  knownIds: Set<string>;
  delayMs: number;
  shouldContinue?: () => boolean;
  onProgress?: (patch: Partial<GoogleMeetSyncJob>) => void | Promise<void>;
}) {
  let checked = 0;
  let synced = 0;
  let skippedExisting = 0;
  let skippedNoTranscript = 0;
  let failed = 0;
  const errors: string[] = [];
  const conversations: Array<{ id: string; title: string; started_at: string }> = [];

  for (let i = 0; i < conferences.length; i++) {
    if (shouldContinue && !shouldContinue()) break;

    const conference = conferences[i]!;
    checked = i + 1;

    if (knownIds.has(conference.name)) {
      skippedExisting++;
    } else {
      const result = await syncSingleConference(conference, access, client);

      if (result.status === "created") {
        synced++;
        conversations.push({
          id: result.conversationId!,
          title: result.title ?? "",
          started_at: result.startedAt ?? "",
        });
      } else if (result.status === "skipped") {
        if (result.reason === "already_exists") skippedExisting++;
        else skippedNoTranscript++;
      } else if (result.status === "error") {
        failed++;
        errors.push(`${conference.name}: ${result.error}`);
      }
    }

    await onProgress?.({
      status: "syncing",
      checked,
      current: checked,
      total: conferences.length,
      synced,
      skipped: skippedExisting + skippedNoTranscript,
      skippedExisting,
      skippedNoTranscript,
      failed,
      errors,
      conversations,
      lastTitle: conference.name,
    });

    if (i < conferences.length - 1 && (!shouldContinue || shouldContinue()) && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  return {
    checked,
    synced,
    skipped: skippedExisting + skippedNoTranscript,
    skippedExisting,
    skippedNoTranscript,
    failed,
    errors,
    conversations,
  };
}

function runGoogleMeetJob({
  runningJobs,
  job,
  access,
  client,
  delayMs,
  persistJob,
}: {
  runningJobs: Map<string, RunningGoogleMeetJob>;
  job: GoogleMeetSyncJob;
  access: DelegatedAccess;
  client: Pick<GoogleMeetClient, "listConferenceRecords" | "getFullConference">;
  delayMs: number;
  persistJob: PersistGoogleMeetJob;
}): void {
  if (runningJobs.has(job.ownerAddress)) return;

  const runtime: RunningGoogleMeetJob = { cancelRequested: false };
  runningJobs.set(job.ownerAddress, runtime);

  const updateJob = async (patch: Partial<GoogleMeetSyncJob>) => {
    Object.assign(job, patch, { updatedAt: new Date().toISOString() });
    await persistJob(job);
  };

  void (async () => {
    try {
      await updateJob({
        status: "listing",
        startedAt: job.startedAt ?? new Date().toISOString(),
        message: "Fetching conference list...",
      });

      await ensureSchema(access);
      const sqlDb = conversationSql(access);
      const conferences = await client.listConferenceRecords();
      const knownIds = await loadKnownGoogleMeetSourceIds(sqlDb);

      if (runtime.cancelRequested) {
        await updateJob({
          status: "canceled",
          completedAt: new Date().toISOString(),
          totalListed: conferences.length,
          checked: 0,
          message: "Sync canceled.",
        });
        return;
      }

      await updateJob({
        status: "syncing",
        totalListed: conferences.length,
        total: conferences.length,
        current: 0,
        checked: 0,
        message: `Checking ${conferences.length} Google Meet conferences...`,
      });

      const result = await syncGoogleMeetConferences({
        access,
        client,
        conferences,
        knownIds,
        delayMs,
        shouldContinue: () => !runtime.cancelRequested,
        onProgress: updateJob,
      });

      if (runtime.cancelRequested) {
        await updateJob({
          status: "canceled",
          completedAt: new Date().toISOString(),
          ...result,
          message: "Sync canceled.",
        });
        return;
      }

      await updateJob({
        status: "completed",
        completedAt: new Date().toISOString(),
        current: conferences.length,
        total: conferences.length,
        totalListed: conferences.length,
        ...result,
        message: "Sync complete.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (err instanceof GoogleAuthRevokedError) {
        await deleteGoogleTokens(access);
      }
      await updateJob({
        status: "failed",
        completedAt: new Date().toISOString(),
        message:
          err instanceof GoogleAuthRevokedError
            ? "Google authorization has been revoked. Please reconnect."
            : message,
        errors: [...job.errors, message],
      });
    } finally {
      runningJobs.delete(job.ownerAddress);
    }
  })();
}

// ── Sync Router ─────────────────────────────────────────────────────

export function createGoogleMeetSyncRouter(config: GoogleMeetSyncRoutesConfig) {
  const { authMiddleware, delegationMiddleware } = config;
  const backendKV = config.backendKV;
  const makeClient =
    config.createClient ??
    ((accessToken: string, onTokenRefresh?: any, refreshToken?: string) =>
      new GoogleMeetClient(accessToken, onTokenRefresh, refreshToken));
  const delayMs = config.syncDelayMs ?? DEFAULT_SYNC_DELAY_MS;
  const runningGoogleMeetJobs = new Map<string, RunningGoogleMeetJob>();
  const cachedGoogleMeetJobs = new Map<string, GoogleMeetSyncJob>();
  const latestGoogleMeetJobByOwner = new Map<string, string>();
  const router = Router();

  const cacheGoogleMeetJob = (job: GoogleMeetSyncJob) => {
    cachedGoogleMeetJobs.set(
      googleMeetJobCacheKey(job.ownerAddress, job.id),
      cloneGoogleMeetJob(job),
    );
    latestGoogleMeetJobByOwner.set(job.ownerAddress, job.id);
  };

  const cachedGoogleMeetJob = (ownerAddress: string, jobId: string) =>
    cachedGoogleMeetJobs.get(googleMeetJobCacheKey(ownerAddress, jobId)) ?? null;

  const persistGoogleMeetJob: PersistGoogleMeetJob = async (job) => {
    cacheGoogleMeetJob(job);
    await writeJob(backendKV!, job);
    cacheGoogleMeetJob(job);
  };

  const readGoogleMeetJob = async (ownerAddress: string, jobId: string) => {
    try {
      const job = await readJob(backendKV!, ownerAddress, jobId);
      if (job) cacheGoogleMeetJob(job);
      return job ?? cachedGoogleMeetJob(ownerAddress, jobId);
    } catch (err) {
      const cached = cachedGoogleMeetJob(ownerAddress, jobId);
      if (!cached) throw err;
      console.warn(
        `[sync] failed to read Google Meet job ${jobId} from backend KV; serving cached state`,
        err,
      );
      return cached;
    }
  };

  const readCurrentGoogleMeetJob = async (ownerAddress: string) => {
    try {
      const job = await readCurrentJob(backendKV!, ownerAddress);
      if (job) cacheGoogleMeetJob(job);
      const cachedJobId = latestGoogleMeetJobByOwner.get(ownerAddress);
      return job ?? (cachedJobId ? cachedGoogleMeetJob(ownerAddress, cachedJobId) : null);
    } catch (err) {
      const cachedJobId = latestGoogleMeetJobByOwner.get(ownerAddress);
      const cached = cachedJobId ? cachedGoogleMeetJob(ownerAddress, cachedJobId) : null;
      if (!cached) throw err;
      console.warn(
        "[sync] failed to read current Google Meet job from backend KV; serving cached state",
        err,
      );
      return cached;
    }
  };

  const resumeGoogleMeetJobOnPoll = async (
    req: Request,
    job: GoogleMeetSyncJob | null,
  ): Promise<GoogleMeetSyncJob | null> => {
    const ownerAddress = normalizeOwnerAddress(req);
    if (isActiveJob(job) && !runningGoogleMeetJobs.has(ownerAddress)) {
      const tokens = await readGoogleTokens(req.delegatedAccess!);
      if (tokens) {
        runGoogleMeetJob({
          runningJobs: runningGoogleMeetJobs,
          job,
          access: req.delegatedAccess!,
          client: createClientWithTokenRefresh(tokens, req.delegatedAccess!, makeClient),
          delayMs,
          persistJob: persistGoogleMeetJob,
        });
      } else {
        const failedJob = {
          ...job,
          status: "failed" as const,
          updatedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          message: "No Google tokens configured. Connect your Google account first.",
          errors: [
            ...job.errors,
            "No Google tokens configured. Connect your Google account first.",
          ],
        };
        await persistGoogleMeetJob(failedJob);
        return failedJob;
      }
    }

    return job;
  };

  if (config.resumeRegistry) {
    config.resumeRegistry["google-meet"] = async (req, job) =>
      resumeGoogleMeetJobOnPoll(req, job as GoogleMeetSyncJob);
  }

  // All routes require auth + delegation
  router.use(authMiddleware);
  router.use(delegationMiddleware);

  // ── POST /jobs — start or resume backend-owned Google Meet sync ──
  router.post("/jobs", async (req: Request, res: Response) => {
    if (!requireGoogleConfig(req, res)) return;
    if (!backendKV) {
      res.status(503).json({
        error: "sync_jobs_unavailable",
        message: "Google Meet background sync jobs are not configured.",
      });
      return;
    }

    try {
      const ownerAddress = normalizeOwnerAddress(req);
      const mode = req.body?.mode === "full" ? "full" : "incremental";
      const current = await readCurrentGoogleMeetJob(ownerAddress);

      if (isActiveJob(current)) {
        if (!runningGoogleMeetJobs.has(ownerAddress)) {
          const tokens = await readGoogleTokens(req.delegatedAccess!);
          if (!tokens) {
            const failedJob = {
              ...current,
              status: "failed" as const,
              updatedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              message: "No Google tokens configured. Connect your Google account first.",
              errors: [
                ...current.errors,
                "No Google tokens configured. Connect your Google account first.",
              ],
            };
            await persistGoogleMeetJob(failedJob);
            res.status(404).json(failedJob);
            return;
          }

          runGoogleMeetJob({
            runningJobs: runningGoogleMeetJobs,
            job: current,
            access: req.delegatedAccess!,
            client: createClientWithTokenRefresh(tokens, req.delegatedAccess!, makeClient),
            delayMs,
            persistJob: persistGoogleMeetJob,
          });
        }

        res.status(202).json(current);
        return;
      }

      const tokens = await readGoogleTokens(req.delegatedAccess!);
      if (!tokens) {
        res.status(404).json({
          error: "no_tokens",
          message: "No Google tokens configured. Connect your Google account first.",
        });
        return;
      }

      const job = createQueuedJob(ownerAddress, mode);
      await persistGoogleMeetJob(job);
      runGoogleMeetJob({
        runningJobs: runningGoogleMeetJobs,
        job,
        access: req.delegatedAccess!,
        client: createClientWithTokenRefresh(tokens, req.delegatedAccess!, makeClient),
        delayMs,
        persistJob: persistGoogleMeetJob,
      });

      res.status(202).json(job);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "sync_job_failed", message });
    }
  });

  // ── GET /jobs/current — read latest backend-owned Google Meet sync ──
  router.get("/jobs/current", async (req: Request, res: Response) => {
    if (!requireGoogleConfig(req, res)) return;
    if (!backendKV) {
      res.status(503).json({
        error: "sync_jobs_unavailable",
        message: "Google Meet background sync jobs are not configured.",
      });
      return;
    }

    try {
      const ownerAddress = normalizeOwnerAddress(req);
      const job = await resumeGoogleMeetJobOnPoll(
        req,
        await readCurrentGoogleMeetJob(ownerAddress),
      );

      res.json(job);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "sync_job_read_failed", message });
    }
  });

  // ── GET /jobs/:id — read a backend-owned Google Meet sync ──
  router.get("/jobs/:id", async (req: Request, res: Response) => {
    if (!backendKV) {
      res.status(503).json({
        error: "sync_jobs_unavailable",
        message: "Google Meet background sync jobs are not configured.",
      });
      return;
    }

    try {
      const ownerAddress = normalizeOwnerAddress(req);
      const job = await readGoogleMeetJob(ownerAddress, req.params.id);
      if (!job) {
        res.status(404).json({ error: "sync_job_not_found", message: "Sync job not found." });
        return;
      }

      res.json(job);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "sync_job_read_failed", message });
    }
  });

  // ── POST /jobs/:id/cancel — request Google Meet sync cancellation ──
  router.post("/jobs/:id/cancel", async (req: Request, res: Response) => {
    if (!backendKV) {
      res.status(503).json({
        error: "sync_jobs_unavailable",
        message: "Google Meet background sync jobs are not configured.",
      });
      return;
    }

    try {
      const ownerAddress = normalizeOwnerAddress(req);
      const job = await readGoogleMeetJob(ownerAddress, req.params.id);
      if (!job) {
        res.status(404).json({ error: "sync_job_not_found", message: "Sync job not found." });
        return;
      }

      const running = runningGoogleMeetJobs.get(ownerAddress);
      if (running && isActiveJob(job)) {
        running.cancelRequested = true;
        const updated = {
          ...job,
          updatedAt: new Date().toISOString(),
          message: "Cancel requested.",
        };
        await persistGoogleMeetJob(updated);
        res.json(updated);
        return;
      }

      if (isActiveJob(job)) {
        const updated = {
          ...job,
          status: "canceled" as const,
          updatedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          message: "Sync canceled.",
        };
        await persistGoogleMeetJob(updated);
        res.json(updated);
        return;
      }

      res.json(job);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "sync_job_read_failed", message });
    }
  });

  // ── POST / — batch sync last 30 days with pre-fetch dedup ────────
  router.post("/", async (req: Request, res: Response) => {
    if (!requireGoogleConfig(req, res)) return;

    const access = req.delegatedAccess!;

    // 1. Read tokens from encrypted Listen secret.
    const tokens = await readGoogleTokens(access);
    if (!tokens) {
      res.status(404).json({
        error: "no_tokens",
        message: "No Google tokens configured. Connect your Google account first.",
      });
      return;
    }

    try {
      await ensureSchema(access);
      const sqlDb = conversationSql(access);

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
      const dedupResult = await sqlDb.query(dedupQuery, sourceIds);

      const existingIds = new Set<string>();
      if (dedupResult.ok && dedupResult.data.rows) {
        for (const row of dedupResult.data.rows) {
          const val = Array.isArray(row) ? row[0] : (row as any).source_id;
          if (val) existingIds.add(String(val));
        }
      }

      const result = await syncGoogleMeetConferences({
        access,
        client,
        conferences,
        knownIds: existingIds,
        delayMs,
      });

      res.json(result);
    } catch (err) {
      if (err instanceof GoogleAuthRevokedError) {
        await deleteGoogleTokens(access);
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
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();

    let aborted = false;
    req.on("close", () => {
      aborted = true;
    });

    const sendComment = (comment: string) => {
      if (aborted) return;
      try {
        res.write(`: ${comment}\n\n`);
      } catch {
        aborted = true;
      }
    };

    const sendEvent = (type: string, data: unknown) => {
      if (aborted) return;
      try {
        res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
      } catch {
        aborted = true;
      }
    };

    sendComment("open");
    const keepAlive = setInterval(() => sendComment("keep-alive"), 10_000);
    const closeStream = () => {
      clearInterval(keepAlive);
      if (!aborted && !res.writableEnded) res.end();
    };

    try {
      // 1. Read tokens
      const tokens = await readGoogleTokens(access);
      if (!tokens) {
        console.log("[google-meet-sync] no tokens found in secret or", LEGACY_GOOGLE_TOKENS_PATH);
        sendEvent("error", { message: "No Google tokens configured. Connect your account first." });
        closeStream();
        return;
      }
      console.log("[google-meet-sync] tokens loaded, has refresh_token:", !!tokens.refresh_token);

      await ensureSchema(access);
      const sqlDb = conversationSql(access);
      const client = createClientWithTokenRefresh(tokens, access, makeClient);

      sendEvent("status", { phase: "listing", message: "Fetching conference list..." });

      // 2. List conferences
      if (aborted) {
        closeStream();
        return;
      }
      const conferences = await client.listConferenceRecords();

      sendEvent("progress", {
        phase: "listing",
        totalListed: conferences.length,
        checked: conferences.length,
      });

      // 3. Collect existing source_ids for dedup
      const knownIds = await loadKnownGoogleMeetSourceIds(sqlDb);
      sendEvent("status", {
        phase: "syncing",
        message: `Checking ${conferences.length} Google Meet conferences`,
        total: conferences.length,
        checked: 0,
      });

      // 4. Sync each with progress
      const result = await syncGoogleMeetConferences({
        access,
        client,
        conferences,
        knownIds,
        delayMs,
        shouldContinue: () => !aborted,
        onProgress: (progress) => {
          sendEvent("progress", {
            ...progress,
            phase: "syncing",
          });
        },
      });

      // 5. Done
      sendEvent("complete", result);
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

    closeStream();
  });

  // ── DELETE /conversations — purge all google-meet data ────────────
  router.delete("/conversations", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;
    try {
      await ensureSchema(access);
      const sqlDb = conversationSql(access);
      // Delete participants for google-meet conversations, then conversations
      await sqlDb.execute(
        `DELETE FROM participant WHERE conversation_id IN (SELECT id FROM conversation WHERE source = 'google-meet')`,
      );
      await sqlDb.execute(`DELETE FROM conversation WHERE source = 'google-meet'`);
      res.json({ ok: true, message: "All Google Meet conversations cleared." });
    } catch (err) {
      console.error("[sync] google-meet purge failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "purge_failed", message });
    }
  });

  return router;
}
