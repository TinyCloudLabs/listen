import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import type { DelegatedAccess } from "@listen/server";
import { randomUUID } from "node:crypto";
import { conversationSql, ensureSchema } from "../schema.js";
import { GranolaApiError, GranolaClient } from "../services/granola-client.js";
import type { GranolaNoteSummary } from "../services/granola-client.js";
import { readGranolaApiKey } from "../services/granola-secret.js";
import { persistGranolaNote } from "../services/granola-sync.js";
import { resolveAppPath } from "../manifest.js";

interface GranolaSyncRoutesConfig {
  authMiddleware: RequestHandler;
  delegationMiddleware: RequestHandler;
  backendKV?: BackendKV;
  createClient?: (apiKey: string) => Pick<GranolaClient, "listAllNotes" | "getNote">;
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

type GranolaSyncJobStatus = "queued" | "listing" | "syncing" | "completed" | "failed" | "canceled";

interface GranolaSyncJob {
  id: string;
  source: "granola";
  ownerAddress: string;
  mode: "incremental" | "full";
  status: GranolaSyncJobStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  message?: string;
  batch?: number;
  totalListed?: number;
  current?: number;
  total?: number;
  synced: number;
  skipped: number;
  failed: number;
  errors: string[];
  conversations: Array<{ id: string; title: string; started_at: string | null }>;
  lastTitle?: string;
}

interface RunningGranolaJob {
  cancelRequested: boolean;
}

type PersistGranolaJob = (job: GranolaSyncJob) => Promise<void>;

const GRANOLA_JOB_PREFIX = resolveAppPath("sync/granola/jobs");

function normalizeOwnerAddress(req: Request): string {
  const user = req.user as { address?: string; sub?: string } | undefined;
  const owner = user?.address ?? user?.sub;
  if (!owner) throw new Error("Authenticated request is missing user identity");
  return owner.toLowerCase();
}

function currentJobKey(ownerAddress: string): string {
  return `${GRANOLA_JOB_PREFIX}/${ownerAddress}/current`;
}

function jobRecordKey(ownerAddress: string, jobId: string): string {
  return `${GRANOLA_JOB_PREFIX}/${ownerAddress}/${jobId}`;
}

function granolaJobCacheKey(ownerAddress: string, jobId: string): string {
  return `${ownerAddress}/${jobId}`;
}

function cloneGranolaJob(job: GranolaSyncJob): GranolaSyncJob {
  return {
    ...job,
    errors: [...job.errors],
    conversations: [...job.conversations],
  };
}

function isActiveJob(job: GranolaSyncJob | null): job is GranolaSyncJob {
  return job?.status === "queued" || job?.status === "listing" || job?.status === "syncing";
}

function createQueuedJob(ownerAddress: string, mode: "incremental" | "full"): GranolaSyncJob {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    source: "granola",
    ownerAddress,
    mode,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    synced: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    conversations: [],
  };
}

async function writeBackendKv(backendKV: BackendKV, key: string, value: string): Promise<void> {
  const result = await backendKV.put(key, value);
  if (result.ok) return;

  const message = result.error?.message ?? result.error?.code ?? "backend KV write failed";
  throw new Error(`Failed to write Granola sync job state (${key}): ${message}`);
}

async function writeJob(backendKV: BackendKV, job: GranolaSyncJob): Promise<void> {
  await writeBackendKv(backendKV, jobRecordKey(job.ownerAddress, job.id), JSON.stringify(job));
  await writeBackendKv(backendKV, currentJobKey(job.ownerAddress), job.id);
}

async function readJob(backendKV: BackendKV, ownerAddress: string, jobId: string) {
  const key = jobRecordKey(ownerAddress, jobId);
  const result = await backendKV.get(key);
  if (!result.ok) {
    const message = result.error?.message ?? result.error?.code ?? "backend KV read failed";
    throw new Error(`Failed to read Granola sync job state (${key}): ${message}`);
  }
  if (!result.data?.data) return null;

  try {
    const parsed = JSON.parse(result.data.data) as GranolaSyncJob;
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

async function loadKnownGranolaSourceIds(sqlDb: Pick<ReturnType<typeof conversationSql>, "query">) {
  const knownIds = new Set<string>();
  const existingResult = await sqlDb.query(
    "SELECT source_id FROM conversation WHERE source = 'granola'",
  );
  if (existingResult.ok && existingResult.data.rows) {
    for (const row of existingResult.data.rows) {
      const val = Array.isArray(row) ? row[0] : (row as any).source_id;
      if (val) knownIds.add(String(val));
    }
  }
  return knownIds;
}

async function syncGranolaNotes({
  access,
  client,
  notes,
  skipped,
  shouldContinue,
  onProgress,
}: {
  access: DelegatedAccess;
  client: Pick<GranolaClient, "getNote">;
  notes: GranolaNoteSummary[];
  skipped: number;
  shouldContinue?: () => boolean;
  onProgress?: (patch: Partial<GranolaSyncJob>) => void | Promise<void>;
}) {
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];
  const conversations: Array<{ id: string; title: string; started_at: string | null }> = [];

  for (let i = 0; i < notes.length; i++) {
    if (shouldContinue && !shouldContinue()) break;

    const summary = notes[i]!;
    try {
      const note = await client.getNote(summary.id);
      const result = await persistGranolaNote(note, access);
      if (result.status === "created") {
        synced++;
        conversations.push({
          id: result.conversationId!,
          title: result.title ?? note.title ?? "",
          started_at: result.startedAt ?? null,
        });
      } else {
        failed++;
        errors.push(`${summary.id}: ${result.error}`);
      }
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${summary.id}: ${message}`);
    }

    await onProgress?.({
      status: "syncing",
      current: i + 1,
      total: notes.length,
      synced,
      skipped,
      failed,
      errors,
      conversations,
      lastTitle: summary.title ?? summary.id,
    });
  }

  return { synced, skipped, failed, errors, conversations };
}

function runGranolaJob({
  runningJobs,
  job,
  access,
  client,
  persistJob,
}: {
  runningJobs: Map<string, RunningGranolaJob>;
  job: GranolaSyncJob;
  access: DelegatedAccess;
  client: Pick<GranolaClient, "listAllNotes" | "getNote">;
  persistJob: PersistGranolaJob;
}): void {
  if (runningJobs.has(job.ownerAddress)) return;

  const runtime: RunningGranolaJob = { cancelRequested: false };
  runningJobs.set(job.ownerAddress, runtime);

  const updateJob = async (patch: Partial<GranolaSyncJob>) => {
    Object.assign(job, patch, { updatedAt: new Date().toISOString() });
    await persistJob(job);
  };

  void (async () => {
    try {
      await updateJob({
        status: "listing",
        startedAt: job.startedAt ?? new Date().toISOString(),
        message: "Fetching Granola notes...",
      });

      await ensureSchema(access);
      const sqlDb = conversationSql(access);
      const knownIds =
        job.mode === "incremental" ? await loadKnownGranolaSourceIds(sqlDb) : new Set<string>();

      const listed = await client.listAllNotes({
        pageSize: 30,
        mode: job.mode,
        knownIds: job.mode === "incremental" ? knownIds : undefined,
        onProgress: async (info) => {
          await updateJob({
            status: "listing",
            batch: info.page,
            totalListed: info.totalSoFar,
            message: "Fetching Granola notes...",
          });
        },
      });

      if (runtime.cancelRequested || listed.earlyExit) {
        if (runtime.cancelRequested) {
          await updateJob({
            status: "canceled",
            completedAt: new Date().toISOString(),
            message: "Sync canceled.",
          });
          return;
        }
      }

      const newNotes = listed.notes.filter((note) => !knownIds.has(note.id));
      const skipped = listed.notes.length - newNotes.length;

      await updateJob({
        status: "syncing",
        current: 0,
        total: newNotes.length,
        skipped,
        message: `Found ${newNotes.length} new Granola notes to sync`,
      });

      const result = await syncGranolaNotes({
        access,
        client,
        notes: newNotes,
        skipped,
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
        current: newNotes.length,
        total: newNotes.length,
        ...result,
        message: "Sync complete.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await updateJob({
        status: "failed",
        completedAt: new Date().toISOString(),
        message,
        errors: [...job.errors, message],
      });
    } finally {
      runningJobs.delete(job.ownerAddress);
    }
  })();
}

export function createGranolaSyncRouter(config: GranolaSyncRoutesConfig) {
  const { authMiddleware, delegationMiddleware } = config;
  const backendKV = config.backendKV;
  const makeClient = config.createClient ?? ((key: string) => new GranolaClient(key));
  const runningGranolaJobs = new Map<string, RunningGranolaJob>();
  const cachedGranolaJobs = new Map<string, GranolaSyncJob>();
  const latestGranolaJobByOwner = new Map<string, string>();
  const router = Router();

  const cacheGranolaJob = (job: GranolaSyncJob) => {
    cachedGranolaJobs.set(granolaJobCacheKey(job.ownerAddress, job.id), cloneGranolaJob(job));
    latestGranolaJobByOwner.set(job.ownerAddress, job.id);
  };

  const cachedGranolaJob = (ownerAddress: string, jobId: string) =>
    cachedGranolaJobs.get(granolaJobCacheKey(ownerAddress, jobId)) ?? null;

  const persistGranolaJob: PersistGranolaJob = async (job) => {
    cacheGranolaJob(job);
    await writeJob(backendKV!, job);
    cacheGranolaJob(job);
  };

  const readGranolaJob = async (ownerAddress: string, jobId: string) => {
    try {
      const job = await readJob(backendKV!, ownerAddress, jobId);
      if (job) cacheGranolaJob(job);
      return job ?? cachedGranolaJob(ownerAddress, jobId);
    } catch (err) {
      const cached = cachedGranolaJob(ownerAddress, jobId);
      if (!cached) throw err;
      console.warn(
        `[sync] failed to read Granola job ${jobId} from backend KV; serving cached state`,
        err,
      );
      return cached;
    }
  };

  const readCurrentGranolaJob = async (ownerAddress: string) => {
    try {
      const job = await readCurrentJob(backendKV!, ownerAddress);
      if (job) cacheGranolaJob(job);
      const cachedJobId = latestGranolaJobByOwner.get(ownerAddress);
      return job ?? (cachedJobId ? cachedGranolaJob(ownerAddress, cachedJobId) : null);
    } catch (err) {
      const cachedJobId = latestGranolaJobByOwner.get(ownerAddress);
      const cached = cachedJobId ? cachedGranolaJob(ownerAddress, cachedJobId) : null;
      if (!cached) throw err;
      console.warn(
        "[sync] failed to read current Granola job from backend KV; serving cached state",
        err,
      );
      return cached;
    }
  };

  router.use(authMiddleware);
  router.use(delegationMiddleware);

  router.post("/jobs", async (req: Request, res: Response) => {
    if (!backendKV) {
      res.status(503).json({
        error: "sync_jobs_unavailable",
        message: "Granola background sync jobs are not configured.",
      });
      return;
    }

    try {
      const ownerAddress = normalizeOwnerAddress(req);
      const mode = req.body?.mode === "full" ? "full" : "incremental";
      const current = await readCurrentGranolaJob(ownerAddress);

      if (isActiveJob(current)) {
        if (!runningGranolaJobs.has(ownerAddress)) {
          const apiKey = await readGranolaApiKey(req);
          if (!apiKey) {
            const failedJob = {
              ...current,
              status: "failed" as const,
              updatedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              message: "No Granola API key configured.",
              errors: [...current.errors, "No Granola API key configured."],
            };
            await persistGranolaJob(failedJob);
            res.status(404).json(failedJob);
            return;
          }

          runGranolaJob({
            runningJobs: runningGranolaJobs,
            job: current,
            access: req.delegatedAccess!,
            client: makeClient(apiKey),
            persistJob: persistGranolaJob,
          });
        }

        res.status(202).json(current);
        return;
      }

      const apiKey = await readGranolaApiKey(req);
      if (!apiKey) {
        res.status(404).json({
          error: "no_api_key",
          message: "No Granola API key configured.",
        });
        return;
      }

      const job = createQueuedJob(ownerAddress, mode);
      await persistGranolaJob(job);
      runGranolaJob({
        runningJobs: runningGranolaJobs,
        job,
        access: req.delegatedAccess!,
        client: makeClient(apiKey),
        persistJob: persistGranolaJob,
      });

      res.status(202).json(job);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "sync_job_failed", message });
    }
  });

  router.get("/jobs/current", async (req: Request, res: Response) => {
    if (!backendKV) {
      res.status(503).json({
        error: "sync_jobs_unavailable",
        message: "Granola background sync jobs are not configured.",
      });
      return;
    }

    try {
      const ownerAddress = normalizeOwnerAddress(req);
      const job = await readCurrentGranolaJob(ownerAddress);
      if (isActiveJob(job) && !runningGranolaJobs.has(ownerAddress)) {
        const apiKey = await readGranolaApiKey(req);
        if (apiKey) {
          runGranolaJob({
            runningJobs: runningGranolaJobs,
            job,
            access: req.delegatedAccess!,
            client: makeClient(apiKey),
            persistJob: persistGranolaJob,
          });
        } else {
          const failedJob = {
            ...job,
            status: "failed" as const,
            updatedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            message: "No Granola API key configured.",
            errors: [...job.errors, "No Granola API key configured."],
          };
          await persistGranolaJob(failedJob);
          res.json(failedJob);
          return;
        }
      }

      res.json(job);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "sync_job_read_failed", message });
    }
  });

  router.get("/jobs/:id", async (req: Request, res: Response) => {
    if (!backendKV) {
      res.status(503).json({
        error: "sync_jobs_unavailable",
        message: "Granola background sync jobs are not configured.",
      });
      return;
    }

    try {
      const ownerAddress = normalizeOwnerAddress(req);
      const job = await readGranolaJob(ownerAddress, req.params.id);
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

  router.post("/jobs/:id/cancel", async (req: Request, res: Response) => {
    if (!backendKV) {
      res.status(503).json({
        error: "sync_jobs_unavailable",
        message: "Granola background sync jobs are not configured.",
      });
      return;
    }

    try {
      const ownerAddress = normalizeOwnerAddress(req);
      const job = await readGranolaJob(ownerAddress, req.params.id);
      if (!job) {
        res.status(404).json({ error: "sync_job_not_found", message: "Sync job not found." });
        return;
      }

      const running = runningGranolaJobs.get(ownerAddress);
      if (running && isActiveJob(job)) {
        running.cancelRequested = true;
        const updated = {
          ...job,
          updatedAt: new Date().toISOString(),
          message: "Cancel requested.",
        };
        await persistGranolaJob(updated);
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
        await persistGranolaJob(updated);
        res.json(updated);
        return;
      }

      res.json(job);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "sync_job_read_failed", message });
    }
  });

  router.get("/stream", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;

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
      const apiKey = await readGranolaApiKey(req);
      if (!apiKey) {
        sendEvent("error", { message: "No Granola API key configured." });
        res.end();
        return;
      }

      await ensureSchema(access);
      const sqlDb = conversationSql(access);
      const client = makeClient(apiKey);
      const mode = req.query.mode === "full" ? "full" : "incremental";
      const knownIds = new Set<string>();

      if (mode === "incremental") {
        const existingResult = await sqlDb.query(
          "SELECT source_id FROM conversation WHERE source = 'granola'",
        );
        if (existingResult.ok && existingResult.data.rows) {
          for (const row of existingResult.data.rows) {
            const val = Array.isArray(row) ? row[0] : (row as any).source_id;
            if (val) knownIds.add(String(val));
          }
        }
      }

      sendEvent("status", { phase: "listing", message: "Fetching Granola notes..." });
      const listed = await client.listAllNotes({
        pageSize: 30,
        mode,
        knownIds: mode === "incremental" ? knownIds : undefined,
        onProgress: (info) => {
          sendEvent("progress", {
            phase: "listing",
            batch: info.page,
            totalListed: info.totalSoFar,
          });
        },
      });

      const newNotes = listed.notes.filter((note) => !knownIds.has(note.id));
      const skipped = listed.notes.length - newNotes.length;

      sendEvent("status", {
        phase: "syncing",
        message: `Found ${newNotes.length} new Granola notes to sync`,
        total: newNotes.length,
        skipped,
      });

      let synced = 0;
      let failed = 0;
      const errors: string[] = [];
      const conversations: Array<{ id: string; title: string; started_at: string | null }> = [];

      for (let i = 0; i < newNotes.length; i++) {
        if (aborted) break;

        const summary = newNotes[i];
        try {
          const note = await client.getNote(summary.id);
          const result = await persistGranolaNote(note, access);
          if (result.status === "created") {
            synced++;
            conversations.push({
              id: result.conversationId!,
              title: result.title ?? note.title ?? "",
              started_at: result.startedAt ?? null,
            });
          } else {
            failed++;
            errors.push(`${summary.id}: ${result.error}`);
          }
        } catch (err) {
          failed++;
          const message = err instanceof Error ? err.message : String(err);
          errors.push(`${summary.id}: ${message}`);
        }

        sendEvent("progress", {
          phase: "syncing",
          current: i + 1,
          total: newNotes.length,
          synced,
          failed,
          lastTitle: summary.title ?? summary.id,
        });
      }

      sendEvent("complete", { synced, skipped, failed, errors, conversations });
    } catch (err) {
      console.error("[sync] Granola sync failed:", err);
      if (err instanceof GranolaApiError && err.status === 429) {
        sendEvent("error", { code: "granola_rate_limited", message: err.message });
        res.end();
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      sendEvent("error", { message: `Sync failed: ${message}` });
    }

    res.end();
  });

  return router;
}
