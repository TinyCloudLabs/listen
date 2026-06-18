import { useState, useEffect, useCallback, useRef, type FC } from "react";
import type { ApiClient } from "@listen/client";
import { debugFetch, debugLog, startDebugStep } from "../lib/debug";

const LAST_SYNC_KEY = "lastSyncTimestamp";
const FIREFLIES_JOB_NOT_FOUND_RETRY_LIMIT = 8;

interface SyncResult {
  synced: number;
  repaired: number;
  skipped: number;
  skippedExisting?: number;
  skippedNoTranscript?: number;
  failed: number;
  errors: string[];
}

interface SyncProgress {
  phase: "queued" | "listing" | "syncing";
  batch?: number;
  totalListed?: number;
  current?: number;
  total?: number;
  checked?: number;
  synced?: number;
  skipped?: number;
  skippedExisting?: number;
  skippedNoTranscript?: number;
  failed?: number;
  lastTitle?: string;
}

type FirefliesSyncJobStatus =
  | "queued"
  | "listing"
  | "syncing"
  | "completed"
  | "failed"
  | "canceled";

interface FirefliesSyncJob {
  id: string;
  source: "fireflies";
  status: FirefliesSyncJobStatus;
  mode: "incremental" | "full";
  message?: string;
  batch?: number;
  totalListed?: number;
  current?: number;
  total?: number;
  synced: number;
  repaired: number;
  skipped: number;
  failed: number;
  errors: string[];
  lastTitle?: string;
}

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
  status: GoogleMeetSyncJobStatus;
  mode: "incremental" | "full";
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
  lastTitle?: string;
}

type GranolaSyncJobStatus = "queued" | "listing" | "syncing" | "completed" | "failed" | "canceled";

interface GranolaSyncJob {
  id: string;
  source: "granola";
  status: GranolaSyncJobStatus;
  mode: "incremental" | "full";
  message?: string;
  batch?: number;
  totalListed?: number;
  current?: number;
  total?: number;
  synced: number;
  skipped: number;
  failed: number;
  errors: string[];
  lastTitle?: string;
}

interface WebhookStatus {
  configured: boolean;
  pendingCount: number;
  webhookUrl: string;
}

interface GoogleMeetWebhookStatus {
  enabled: boolean;
  subscriptionActive: boolean;
  expiresAt: string | null;
  pendingCount: number;
  failedCount: number;
}

interface SyncControlProps {
  api: ApiClient;
  backendUrl: string;
  getAccessToken: () => string | null;
  onSyncComplete: () => void;
  hasFireflies?: boolean;
  hasGranola?: boolean;
  hasGoogleMeet?: boolean;
}

// ── SSE parsing ─────────────────────────────────────────────────────

interface SSEEvent {
  type: string;
  data: string;
}

function parseSSEChunk(buffer: string): { events: SSEEvent[]; remaining: string } {
  const events: SSEEvent[] = [];
  const blocks = buffer.split("\n\n");
  const remaining = blocks.pop() ?? "";

  for (const block of blocks) {
    if (!block.trim()) continue;
    let type = "message";
    let data = "";
    for (const line of block.split("\n")) {
      if (line.startsWith("event: ")) type = line.slice(7);
      else if (line.startsWith("data: ")) data = line.slice(6);
    }
    if (data) events.push({ type, data });
  }

  return { events, remaining };
}

// ── Helpers ─────────────────────────────────────────────────────────

function formatTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 min ago";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours === 1) return "1 hr ago";
  if (hours < 24) return `${hours} hrs ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "\u2026" : str;
}

function daysUntil(isoString: string): number {
  return Math.max(0, Math.ceil((new Date(isoString).getTime() - Date.now()) / 86_400_000));
}

function isFirefliesJob(value: unknown): value is FirefliesSyncJob {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { source?: unknown }).source === "fireflies" &&
    typeof (value as { id?: unknown }).id === "string"
  );
}

function isActiveFirefliesJob(job: FirefliesSyncJob): boolean {
  return job.status === "queued" || job.status === "listing" || job.status === "syncing";
}

function isGoogleMeetJob(value: unknown): value is GoogleMeetSyncJob {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { source?: unknown }).source === "google-meet" &&
    typeof (value as { id?: unknown }).id === "string"
  );
}

function isActiveGoogleMeetJob(job: GoogleMeetSyncJob): boolean {
  return job.status === "queued" || job.status === "listing" || job.status === "syncing";
}

function isGranolaJob(value: unknown): value is GranolaSyncJob {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { source?: unknown }).source === "granola" &&
    typeof (value as { id?: unknown }).id === "string"
  );
}

function isActiveGranolaJob(job: GranolaSyncJob): boolean {
  return job.status === "queued" || job.status === "listing" || job.status === "syncing";
}

function isFirefliesJobNotFoundError(err: unknown): boolean {
  return (
    err instanceof Error &&
    err.message.includes("API error (404)") &&
    err.message.includes("Sync job not found")
  );
}

function progressFromFirefliesJob(job: FirefliesSyncJob): SyncProgress {
  if (job.status === "syncing") {
    return {
      phase: "syncing",
      current: job.current ?? 0,
      total: job.total ?? 0,
      synced: job.synced,
      failed: job.failed,
      lastTitle: job.lastTitle,
    };
  }

  if (job.status === "listing") {
    return {
      phase: "listing",
      batch: job.batch,
      totalListed: job.totalListed,
    };
  }

  return { phase: "queued" };
}

function progressFromGoogleMeetJob(job: GoogleMeetSyncJob): SyncProgress {
  if (job.status === "syncing") {
    return {
      phase: "syncing",
      current: job.current ?? job.checked,
      total: job.total ?? job.totalListed ?? 0,
      checked: job.checked,
      synced: job.synced,
      skipped: job.skipped,
      skippedExisting: job.skippedExisting,
      skippedNoTranscript: job.skippedNoTranscript,
      failed: job.failed,
      lastTitle: job.lastTitle,
    };
  }

  if (job.status === "listing") {
    return {
      phase: "listing",
      totalListed: job.totalListed,
      checked: job.checked,
    };
  }

  return { phase: "queued" };
}

function progressFromGranolaJob(job: GranolaSyncJob): SyncProgress {
  if (job.status === "syncing") {
    return {
      phase: "syncing",
      current: job.current ?? 0,
      total: job.total ?? 0,
      synced: job.synced,
      skipped: job.skipped,
      failed: job.failed,
      lastTitle: job.lastTitle,
    };
  }

  if (job.status === "listing") {
    return {
      phase: "listing",
      batch: job.batch,
      totalListed: job.totalListed,
    };
  }

  return { phase: "queued" };
}

// ── Component ───────────────────────────────────────────────────────

export const SyncControl: FC<SyncControlProps> = ({
  api,
  backendUrl,
  getAccessToken,
  onSyncComplete,
  hasFireflies: hasFirefliesProp,
  hasGranola: hasGranolaProp,
  hasGoogleMeet: hasGoogleMeetProp,
}) => {
  const hasFireflies = hasFirefliesProp !== false;
  const hasGranola = hasGranolaProp === true;
  const hasGM = hasGoogleMeetProp === true;

  const [syncing, setSyncing] = useState(false);
  const [syncSource, setSyncSource] = useState<"fireflies" | "granola" | "google-meet" | null>(
    null,
  );
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(() =>
    localStorage.getItem(LAST_SYNC_KEY),
  );
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
  const [gmWebhookStatus, setGmWebhookStatus] = useState<GoogleMeetWebhookStatus | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const firefliesPollRef = useRef<number | null>(null);
  const granolaPollRef = useRef<number | null>(null);
  const googleMeetPollRef = useRef<number | null>(null);
  const activeFirefliesJobRef = useRef<string | null>(null);
  const activeGranolaJobRef = useRef<string | null>(null);
  const activeGoogleMeetJobRef = useRef<string | null>(null);
  const completedFirefliesJobsRef = useRef<Set<string>>(new Set());
  const completedGranolaJobsRef = useRef<Set<string>>(new Set());
  const completedGoogleMeetJobsRef = useRef<Set<string>>(new Set());

  const clearFirefliesPoll = useCallback(() => {
    if (firefliesPollRef.current != null) {
      window.clearInterval(firefliesPollRef.current);
      firefliesPollRef.current = null;
    }
  }, []);

  const clearGoogleMeetPoll = useCallback(() => {
    if (googleMeetPollRef.current != null) {
      window.clearInterval(googleMeetPollRef.current);
      googleMeetPollRef.current = null;
    }
  }, []);

  const clearGranolaPoll = useCallback(() => {
    if (granolaPollRef.current != null) {
      window.clearInterval(granolaPollRef.current);
      granolaPollRef.current = null;
    }
  }, []);

  const applyFirefliesJob = useCallback(
    (job: FirefliesSyncJob) => {
      debugLog("sync.fireflies.job", "received", {
        jobId: job.id,
        status: job.status,
        mode: job.mode,
        current: job.current ?? null,
        total: job.total ?? null,
        synced: job.synced,
        skipped: job.skipped,
        failed: job.failed,
      });
      if (isActiveFirefliesJob(job)) {
        activeFirefliesJobRef.current = job.id;
        setSyncing(true);
        setSyncSource("fireflies");
        setResult(null);
        setError(null);
        setProgress(progressFromFirefliesJob(job));
        return;
      }

      if (activeFirefliesJobRef.current === job.id) {
        activeFirefliesJobRef.current = null;
      }
      setSyncing(false);
      setSyncSource(null);
      setProgress(null);

      if (job.status === "completed") {
        setResult({
          synced: job.synced,
          repaired: job.repaired,
          skipped: job.skipped,
          failed: job.failed,
          errors: job.errors,
        });

        if (!completedFirefliesJobsRef.current.has(job.id)) {
          completedFirefliesJobsRef.current.add(job.id);
          const ts = new Date().toISOString();
          localStorage.setItem(LAST_SYNC_KEY, ts);
          setLastSync(ts);
          onSyncComplete();
        }
      } else if (job.status === "canceled") {
        setResult({
          synced: job.synced,
          repaired: job.repaired,
          skipped: job.skipped,
          failed: job.failed,
          errors: job.errors,
        });
      } else if (job.status === "failed") {
        setError(job.message ?? "Fireflies sync failed.");
      }
    },
    [onSyncComplete],
  );

  const applyGranolaJob = useCallback(
    (job: GranolaSyncJob) => {
      debugLog("sync.granola.job", "received", {
        jobId: job.id,
        status: job.status,
        mode: job.mode,
        current: job.current ?? null,
        total: job.total ?? null,
        synced: job.synced,
        skipped: job.skipped,
        failed: job.failed,
      });
      if (isActiveGranolaJob(job)) {
        activeGranolaJobRef.current = job.id;
        setSyncing(true);
        setSyncSource("granola");
        setResult(null);
        setError(null);
        setProgress(progressFromGranolaJob(job));
        return;
      }

      if (activeGranolaJobRef.current === job.id) {
        activeGranolaJobRef.current = null;
      }
      setSyncing(false);
      setSyncSource(null);
      setProgress(null);

      if (job.status === "completed") {
        setResult({
          synced: job.synced,
          repaired: 0,
          skipped: job.skipped,
          failed: job.failed,
          errors: job.errors,
        });

        if (!completedGranolaJobsRef.current.has(job.id)) {
          completedGranolaJobsRef.current.add(job.id);
          const ts = new Date().toISOString();
          localStorage.setItem(LAST_SYNC_KEY, ts);
          setLastSync(ts);
          onSyncComplete();
        }
      } else if (job.status === "canceled") {
        setResult({
          synced: job.synced,
          repaired: 0,
          skipped: job.skipped,
          failed: job.failed,
          errors: job.errors,
        });
      } else if (job.status === "failed") {
        setError(job.message ?? "Granola sync failed.");
      }
    },
    [onSyncComplete],
  );

  const applyGoogleMeetJob = useCallback(
    (job: GoogleMeetSyncJob) => {
      debugLog("sync.google-meet.job", "received", {
        jobId: job.id,
        status: job.status,
        mode: job.mode,
        checked: job.checked,
        total: job.total ?? null,
        synced: job.synced,
        skipped: job.skipped,
        skippedExisting: job.skippedExisting,
        skippedNoTranscript: job.skippedNoTranscript,
        failed: job.failed,
      });
      if (isActiveGoogleMeetJob(job)) {
        activeGoogleMeetJobRef.current = job.id;
        setSyncing(true);
        setSyncSource("google-meet");
        setResult(null);
        setError(null);
        setProgress(progressFromGoogleMeetJob(job));
        return;
      }

      if (activeGoogleMeetJobRef.current === job.id) {
        activeGoogleMeetJobRef.current = null;
      }
      setSyncing(false);
      setSyncSource(null);
      setProgress(null);

      if (job.status === "completed") {
        setResult({
          synced: job.synced,
          repaired: 0,
          skipped: job.skipped,
          skippedExisting: job.skippedExisting,
          skippedNoTranscript: job.skippedNoTranscript,
          failed: job.failed,
          errors: job.errors,
        });

        if (!completedGoogleMeetJobsRef.current.has(job.id)) {
          completedGoogleMeetJobsRef.current.add(job.id);
          const ts = new Date().toISOString();
          localStorage.setItem(LAST_SYNC_KEY, ts);
          setLastSync(ts);
          onSyncComplete();
        }
      } else if (job.status === "canceled") {
        setResult({
          synced: job.synced,
          repaired: 0,
          skipped: job.skipped,
          skippedExisting: job.skippedExisting,
          skippedNoTranscript: job.skippedNoTranscript,
          failed: job.failed,
          errors: job.errors,
        });
      } else if (job.status === "failed") {
        setError(job.message ?? "Google Meet sync failed.");
      }
    },
    [onSyncComplete],
  );

  const pollFirefliesJob = useCallback(
    (jobId: string) => {
      debugLog("sync.fireflies.poll-loop", "started", { jobId, intervalMs: 1500 });
      clearFirefliesPoll();
      let inFlight = false;
      let notFoundAttempts = 0;

      const refresh = async () => {
        if (inFlight) return;
        inFlight = true;
        const step = startDebugStep("sync.fireflies.poll", { jobId });
        try {
          const job = await api.get<FirefliesSyncJob>(`/api/sync/fireflies/jobs/${jobId}`);
          if (!isFirefliesJob(job)) {
            step.complete({ validJob: false });
            return;
          }
          notFoundAttempts = 0;
          applyFirefliesJob(job);
          if (!isActiveFirefliesJob(job)) {
            clearFirefliesPoll();
            debugLog("sync.fireflies.poll-loop", "stopped", {
              jobId,
              reason: "terminal-status",
              status: job.status,
            });
          }
          step.complete({
            validJob: true,
            status: job.status,
            current: job.current ?? null,
            total: job.total ?? null,
          });
        } catch (err) {
          if (
            isFirefliesJobNotFoundError(err) &&
            notFoundAttempts < FIREFLIES_JOB_NOT_FOUND_RETRY_LIMIT
          ) {
            notFoundAttempts += 1;
            step.fail(err, {
              retrying: true,
              notFoundAttempts,
              retryLimit: FIREFLIES_JOB_NOT_FOUND_RETRY_LIMIT,
            });
            debugLog("sync.fireflies.poll", "retrying-not-found", {
              jobId,
              notFoundAttempts,
              retryLimit: FIREFLIES_JOB_NOT_FOUND_RETRY_LIMIT,
            });
            return;
          }
          step.fail(err);
          clearFirefliesPoll();
          debugLog("sync.fireflies.poll-loop", "stopped", { jobId, reason: "poll-error" });
          setSyncing(false);
          setSyncSource(null);
          setProgress(null);
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          inFlight = false;
        }
      };

      void refresh();
      firefliesPollRef.current = window.setInterval(refresh, 1500);
    },
    [api, applyFirefliesJob, clearFirefliesPoll],
  );

  const pollGranolaJob = useCallback(
    (jobId: string) => {
      debugLog("sync.granola.poll-loop", "started", { jobId, intervalMs: 1500 });
      clearGranolaPoll();
      let inFlight = false;

      const refresh = async () => {
        if (inFlight) return;
        inFlight = true;
        const step = startDebugStep("sync.granola.poll", { jobId });
        try {
          const job = await api.get<GranolaSyncJob>(`/api/sync/granola/jobs/${jobId}`);
          if (!isGranolaJob(job)) {
            step.complete({ validJob: false });
            return;
          }
          applyGranolaJob(job);
          if (!isActiveGranolaJob(job)) {
            clearGranolaPoll();
            debugLog("sync.granola.poll-loop", "stopped", {
              jobId,
              reason: "terminal-status",
              status: job.status,
            });
          }
          step.complete({
            validJob: true,
            status: job.status,
            current: job.current ?? null,
            total: job.total ?? null,
          });
        } catch (err) {
          step.fail(err);
          clearGranolaPoll();
          debugLog("sync.granola.poll-loop", "stopped", { jobId, reason: "poll-error" });
          setSyncing(false);
          setSyncSource(null);
          setProgress(null);
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          inFlight = false;
        }
      };

      void refresh();
      granolaPollRef.current = window.setInterval(refresh, 1500);
    },
    [api, applyGranolaJob, clearGranolaPoll],
  );

  const pollGoogleMeetJob = useCallback(
    (jobId: string) => {
      debugLog("sync.google-meet.poll-loop", "started", { jobId, intervalMs: 1500 });
      clearGoogleMeetPoll();
      let inFlight = false;

      const refresh = async () => {
        if (inFlight) return;
        inFlight = true;
        const step = startDebugStep("sync.google-meet.poll", { jobId });
        try {
          const job = await api.get<GoogleMeetSyncJob>(`/api/sync/google-meet/jobs/${jobId}`);
          if (!isGoogleMeetJob(job)) {
            step.complete({ validJob: false });
            return;
          }
          applyGoogleMeetJob(job);
          if (!isActiveGoogleMeetJob(job)) {
            clearGoogleMeetPoll();
            debugLog("sync.google-meet.poll-loop", "stopped", {
              jobId,
              reason: "terminal-status",
              status: job.status,
            });
          }
          step.complete({
            validJob: true,
            status: job.status,
            checked: job.checked,
            total: job.total ?? null,
          });
        } catch (err) {
          step.fail(err);
          clearGoogleMeetPoll();
          debugLog("sync.google-meet.poll-loop", "stopped", { jobId, reason: "poll-error" });
          setSyncing(false);
          setSyncSource(null);
          setProgress(null);
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          inFlight = false;
        }
      };

      void refresh();
      googleMeetPollRef.current = window.setInterval(refresh, 1500);
    },
    [api, applyGoogleMeetJob, clearGoogleMeetPoll],
  );

  useEffect(() => {
    api
      .get<WebhookStatus>("/api/config/webhook-status")
      .then((status) => {
        debugLog("sync.webhook-status", "completed", {
          configured: status.configured,
          pendingCount: status.pendingCount,
        });
        setWebhookStatus(status);
      })
      .catch((err) => debugLog("sync.webhook-status", "failed", { error: String(err) }));
  }, [api]);

  useEffect(() => {
    if (!hasGM) return;
    api
      .get<GoogleMeetWebhookStatus>("/api/webhooks/google-meet/status")
      .then((status) => {
        debugLog("sync.google-meet.webhook-status", "completed", {
          enabled: status.enabled,
          subscriptionActive: status.subscriptionActive,
          pendingCount: status.pendingCount,
          failedCount: status.failedCount,
        });
        setGmWebhookStatus(status);
      })
      .catch((err) =>
        debugLog("sync.google-meet.webhook-status", "failed", { error: String(err) }),
      );
  }, [api, hasGM]);

  useEffect(() => {
    if (!hasFireflies) return;

    let canceled = false;
    const step = startDebugStep("sync.fireflies.current-job", {
      path: "/api/sync/fireflies/jobs/current",
    });
    api
      .get<FirefliesSyncJob | null>("/api/sync/fireflies/jobs/current")
      .then((job) => {
        if (canceled) {
          step.complete({ canceled: true });
          return;
        }
        if (!isFirefliesJob(job)) {
          step.complete({ hasJob: false });
          return;
        }
        applyFirefliesJob(job);
        if (isActiveFirefliesJob(job)) {
          pollFirefliesJob(job.id);
        }
        step.complete({ hasJob: true, jobId: job.id, status: job.status });
      })
      .catch((err) => step.fail(err));

    return () => {
      canceled = true;
    };
  }, [api, hasFireflies, applyFirefliesJob, pollFirefliesJob]);

  useEffect(() => {
    if (!hasGranola) return;

    let canceled = false;
    const step = startDebugStep("sync.granola.current-job", {
      path: "/api/sync/granola/jobs/current",
    });
    api
      .get<GranolaSyncJob | null>("/api/sync/granola/jobs/current")
      .then((job) => {
        if (canceled) {
          step.complete({ canceled: true });
          return;
        }
        if (!isGranolaJob(job)) {
          step.complete({ hasJob: false });
          return;
        }
        applyGranolaJob(job);
        if (isActiveGranolaJob(job)) {
          pollGranolaJob(job.id);
        }
        step.complete({ hasJob: true, jobId: job.id, status: job.status });
      })
      .catch((err) => step.fail(err));

    return () => {
      canceled = true;
    };
  }, [api, hasGranola, applyGranolaJob, pollGranolaJob]);

  useEffect(() => {
    if (!hasGM) return;

    let canceled = false;
    const step = startDebugStep("sync.google-meet.current-job", {
      path: "/api/sync/google-meet/jobs/current",
    });
    api
      .get<GoogleMeetSyncJob | null>("/api/sync/google-meet/jobs/current")
      .then((job) => {
        if (canceled) {
          step.complete({ canceled: true });
          return;
        }
        if (!isGoogleMeetJob(job)) {
          step.complete({ hasJob: false });
          return;
        }
        applyGoogleMeetJob(job);
        if (isActiveGoogleMeetJob(job)) {
          pollGoogleMeetJob(job.id);
        }
        step.complete({ hasJob: true, jobId: job.id, status: job.status });
      })
      .catch((err) => step.fail(err));

    return () => {
      canceled = true;
    };
  }, [api, hasGM, applyGoogleMeetJob, pollGoogleMeetJob]);

  useEffect(() => () => clearFirefliesPoll(), [clearFirefliesPoll]);
  useEffect(() => () => clearGranolaPoll(), [clearGranolaPoll]);
  useEffect(() => () => clearGoogleMeetPoll(), [clearGoogleMeetPoll]);

  useEffect(() => {
    if (!lastSync) return;
    const id = setInterval(() => setLastSync(localStorage.getItem(LAST_SYNC_KEY)), 60_000);
    return () => clearInterval(id);
  }, [lastSync]);

  // ── Stream sync handlers ───────────────────────────────────────────

  const startFirefliesJob = useCallback(
    async (mode: "incremental" | "full") => {
      const step = startDebugStep("sync.fireflies.start-job", { mode });
      setSyncing(true);
      setSyncSource("fireflies");
      setResult(null);
      setError(null);
      setProgress({ phase: "queued" });

      try {
        const job = await api.post<FirefliesSyncJob>("/api/sync/fireflies/jobs", { mode });
        if (!isFirefliesJob(job)) {
          throw new Error("Fireflies sync did not return a job.");
        }
        applyFirefliesJob(job);
        if (isActiveFirefliesJob(job)) {
          pollFirefliesJob(job.id);
        }
        step.complete({ jobId: job.id, status: job.status, mode: job.mode });
      } catch (err) {
        step.fail(err);
        setError(err instanceof Error ? err.message : String(err));
        setProgress(null);
        setSyncing(false);
        setSyncSource(null);
      }
    },
    [api, applyFirefliesJob, pollFirefliesJob],
  );

  const startGranolaJob = useCallback(
    async (mode: "incremental" | "full") => {
      const step = startDebugStep("sync.granola.start-job", { mode });
      setSyncing(true);
      setSyncSource("granola");
      setResult(null);
      setError(null);
      setProgress({ phase: "queued" });

      try {
        const job = await api.post<GranolaSyncJob>("/api/sync/granola/jobs", { mode });
        if (!isGranolaJob(job)) {
          throw new Error("Granola sync did not return a job.");
        }
        applyGranolaJob(job);
        if (isActiveGranolaJob(job)) {
          pollGranolaJob(job.id);
        }
        step.complete({ jobId: job.id, status: job.status, mode: job.mode });
      } catch (err) {
        step.fail(err);
        setError(err instanceof Error ? err.message : String(err));
        setProgress(null);
        setSyncing(false);
        setSyncSource(null);
      }
    },
    [api, applyGranolaJob, pollGranolaJob],
  );

  const startGoogleMeetJob = useCallback(
    async (mode: "incremental" | "full") => {
      const step = startDebugStep("sync.google-meet.start-job", { mode });
      setSyncing(true);
      setSyncSource("google-meet");
      setResult(null);
      setError(null);
      setProgress({ phase: "queued" });

      try {
        const job = await api.post<GoogleMeetSyncJob>("/api/sync/google-meet/jobs", { mode });
        if (!isGoogleMeetJob(job)) {
          throw new Error("Google Meet sync did not return a job.");
        }
        applyGoogleMeetJob(job);
        if (isActiveGoogleMeetJob(job)) {
          pollGoogleMeetJob(job.id);
        }
        step.complete({ jobId: job.id, status: job.status, mode: job.mode });
      } catch (err) {
        step.fail(err);
        setError(err instanceof Error ? err.message : String(err));
        setProgress(null);
        setSyncing(false);
        setSyncSource(null);
      }
    },
    [api, applyGoogleMeetJob, pollGoogleMeetJob],
  );

  const startStreamSync = useCallback(
    async (mode: "incremental" | "full", source: "granola" | "google-meet") => {
      const step = startDebugStep(`sync.${source}.stream`, { mode, source });
      setSyncing(true);
      setSyncSource(source);
      setResult(null);
      setError(null);
      setProgress({ phase: "listing" });

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const token = getAccessToken() ?? "";
        const url =
          source === "google-meet"
            ? `${backendUrl}/api/sync/google-meet/stream`
            : `${backendUrl}/api/sync/granola/stream?mode=${mode}`;
        const response = await debugFetch(
          url,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
          {
            client: "sync-stream",
            method: "GET",
            source,
          },
        );

        if (!response.ok || !response.body) {
          throw new Error(`Stream failed: ${response.status} ${response.statusText}`);
        }
        debugLog(`sync.${source}.stream`, "response-opened", { status: response.status });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const { events, remaining } = parseSSEChunk(buffer);
          buffer = remaining;

          for (const event of events) {
            const data = JSON.parse(event.data);

            switch (event.type) {
              case "status":
                setProgress((prev) => ({ ...prev, phase: data.phase, total: data.total }));
                debugLog(`sync.${source}.stream`, "status", {
                  phase: data.phase,
                  total: data.total,
                });
                break;
              case "progress":
                if (data.phase === "listing") {
                  setProgress((prev) => ({
                    ...prev,
                    phase: "listing",
                    batch: data.batch,
                    totalListed: data.totalListed,
                  }));
                  debugLog(`sync.${source}.stream`, "progress", {
                    phase: data.phase,
                    batch: data.batch,
                    totalListed: data.totalListed,
                  });
                } else {
                  setProgress({
                    phase: "syncing",
                    current: data.current,
                    total: data.total,
                    synced: data.synced,
                    failed: data.failed,
                    lastTitle: data.lastTitle,
                  });
                  debugLog(`sync.${source}.stream`, "progress", {
                    phase: data.phase,
                    current: data.current,
                    total: data.total,
                    synced: data.synced,
                    failed: data.failed,
                  });
                }
                break;
              case "complete": {
                setResult({
                  synced: data.synced,
                  repaired: data.repaired ?? 0,
                  skipped: data.skipped,
                  failed: data.failed,
                  errors: data.errors,
                });
                setProgress(null);
                const ts = new Date().toISOString();
                localStorage.setItem(LAST_SYNC_KEY, ts);
                setLastSync(ts);
                onSyncComplete();
                step.complete({
                  synced: data.synced,
                  repaired: data.repaired ?? 0,
                  skipped: data.skipped,
                  failed: data.failed,
                });
                break;
              }
              case "error":
                setError(data.message);
                setProgress(null);
                step.complete({ streamError: data.message });
                break;
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          step.fail(err);
          setError(err instanceof Error ? err.message : String(err));
        } else {
          step.complete({ aborted: true });
        }
        setProgress(null);
      } finally {
        setSyncing(false);
        setSyncSource(null);
        abortRef.current = null;
      }
    },
    [backendUrl, getAccessToken, onSyncComplete],
  );

  const handleFirefliesSync = useCallback(
    () => startFirefliesJob("incremental"),
    [startFirefliesJob],
  );

  const handleGoogleMeetSync = useCallback(
    () => startGoogleMeetJob("incremental"),
    [startGoogleMeetJob],
  );

  const handleGranolaSync = useCallback(() => startGranolaJob("incremental"), [startGranolaJob]);

  const handleClearAndResync = useCallback(async () => {
    setSyncing(true);
    setResult(null);
    setError(null);
    try {
      await api.del("/api/sync/conversations");
    } catch (err) {
      debugLog("sync.fireflies.full-resync", "clear-failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      setError(err instanceof Error ? err.message : String(err));
      setSyncing(false);
      return;
    }
    debugLog("sync.fireflies.full-resync", "clear-completed");
    setSyncing(false);
    startFirefliesJob("full");
  }, [api, startFirefliesJob]);

  const handleCancel = useCallback(() => {
    const firefliesJobId = activeFirefliesJobRef.current;
    if (syncSource === "fireflies" && firefliesJobId) {
      const step = startDebugStep("sync.fireflies.cancel", { jobId: firefliesJobId });
      api
        .post<FirefliesSyncJob>(`/api/sync/fireflies/jobs/${firefliesJobId}/cancel`)
        .then((job) => {
          if (isFirefliesJob(job)) applyFirefliesJob(job);
          step.complete({ status: isFirefliesJob(job) ? job.status : "invalid-job" });
        })
        .catch((err) => {
          step.fail(err);
          setError(err instanceof Error ? err.message : String(err));
        });
      return;
    }

    const granolaJobId = activeGranolaJobRef.current;
    if (syncSource === "granola" && granolaJobId) {
      const step = startDebugStep("sync.granola.cancel", { jobId: granolaJobId });
      api
        .post<GranolaSyncJob>(`/api/sync/granola/jobs/${granolaJobId}/cancel`)
        .then((job) => {
          if (isGranolaJob(job)) applyGranolaJob(job);
          step.complete({ status: isGranolaJob(job) ? job.status : "invalid-job" });
        })
        .catch((err) => {
          step.fail(err);
          setError(err instanceof Error ? err.message : String(err));
        });
      return;
    }

    const googleMeetJobId = activeGoogleMeetJobRef.current;
    if (syncSource === "google-meet" && googleMeetJobId) {
      const step = startDebugStep("sync.google-meet.cancel", { jobId: googleMeetJobId });
      api
        .post<GoogleMeetSyncJob>(`/api/sync/google-meet/jobs/${googleMeetJobId}/cancel`)
        .then((job) => {
          if (isGoogleMeetJob(job)) applyGoogleMeetJob(job);
          step.complete({ status: isGoogleMeetJob(job) ? job.status : "invalid-job" });
        })
        .catch((err) => {
          step.fail(err);
          setError(err instanceof Error ? err.message : String(err));
        });
      return;
    }

    debugLog("sync.stream.cancel", "abort");
    abortRef.current?.abort();
  }, [api, applyFirefliesJob, applyGranolaJob, applyGoogleMeetJob, syncSource]);

  const pct =
    progress?.phase === "syncing" && progress.total
      ? Math.round(((progress.current ?? 0) / progress.total) * 100)
      : 0;

  const listingLabel =
    syncSource === "google-meet"
      ? "Scanning Google Meet"
      : syncSource === "granola"
        ? "Scanning Granola"
        : "Scanning Fireflies";
  const queuedLabel =
    syncSource === "google-meet"
      ? "Queued Google Meet sync"
      : syncSource === "granola"
        ? "Queued Granola sync"
        : syncSource === "fireflies"
          ? "Queued Fireflies sync"
          : "Queued sync";

  // ── Render ────────────────────────────────────────────────────────

  return (
    <section style={s.panel}>
      {/* Header row */}
      <div style={s.headerRow}>
        <div style={s.titleGroup}>
          <h3 style={s.heading}>Sync</h3>
          {lastSync && <span style={s.lastSyncBadge}>{formatTimeAgo(lastSync)}</span>}
          {hasFireflies && webhookStatus?.configured && (
            <span style={s.webhookBadge}>
              <span style={s.webhookDot} />
              Live
            </span>
          )}
          {hasGM && gmWebhookStatus?.enabled && gmWebhookStatus?.subscriptionActive && (
            <span style={s.webhookBadge}>
              <span style={s.webhookDot} />
              Live{gmWebhookStatus.expiresAt ? ` · ${daysUntil(gmWebhookStatus.expiresAt)}d` : ""}
            </span>
          )}
        </div>

        <div style={s.buttonGroup}>
          {!syncing ? (
            <>
              {hasFireflies && (
                <button style={s.btnPrimary} onClick={handleFirefliesSync}>
                  Sync Fireflies
                </button>
              )}
              {hasGranola && (
                <button style={s.btnPrimary} onClick={handleGranolaSync}>
                  Sync Granola
                </button>
              )}
              {hasGM && (
                <button style={s.btnPrimary} onClick={handleGoogleMeetSync}>
                  Sync Google Meet
                </button>
              )}
              {hasFireflies && (
                <button style={s.btnDanger} onClick={handleClearAndResync}>
                  Reset
                </button>
              )}
            </>
          ) : (
            <button style={s.btnCancel} onClick={handleCancel}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Queued/listing phase */}
      {(progress?.phase === "queued" || progress?.phase === "listing") && (
        <div style={s.phaseCard}>
          <div style={s.phaseRow}>
            <span style={s.phaseDot} />
            <span style={s.phaseLabel}>
              {progress.phase === "queued" ? queuedLabel : listingLabel}
            </span>
          </div>
          <p style={s.phaseDetail}>
            {progress.phase === "queued" ? (
              "Waiting to start\u2026"
            ) : progress.totalListed != null || progress.checked != null ? (
              <>
                {progress.batch != null && (
                  <>
                    <span style={s.statLabel}>Batch </span>
                    <span style={s.statNum}>{progress.batch}</span>
                    <span style={s.statDividerInline}>/</span>
                  </>
                )}
                <span style={s.statNum}>{progress.totalListed ?? progress.checked}</span> checked so
                far
              </>
            ) : (
              "Checking transcript history\u2026"
            )}
          </p>
          {(syncSource === "fireflies" ||
            syncSource === "granola" ||
            syncSource === "google-meet") && (
            <p style={s.phaseSubtle}>The backend will keep syncing if this page reloads.</p>
          )}
        </div>
      )}

      {/* Syncing phase */}
      {progress?.phase === "syncing" && progress.total != null && (
        <div style={s.syncCard}>
          {/* Progress bar */}
          <div style={s.barOuter}>
            <div style={{ ...s.barFill, width: `${pct}%` }} />
            {pct < 100 && <div style={{ ...s.barScanline, left: `${pct}%` }} />}
          </div>

          {/* Stats row */}
          <div style={s.statsRow}>
            <div style={s.stat}>
              <span style={s.statNum}>{progress.current ?? 0}</span>
              <span style={s.statDenom}>/{progress.total}</span>
            </div>
            <div style={s.statDivider} />
            <div style={s.stat}>
              <span style={s.statNum}>{progress.synced ?? 0}</span>
              <span style={s.statLabel}>synced</span>
            </div>
            {(progress.skipped ?? 0) > 0 && (
              <>
                <div style={s.statDivider} />
                <div style={s.stat}>
                  <span style={s.statNum}>{progress.skipped}</span>
                  <span style={s.statLabel}>skipped</span>
                </div>
              </>
            )}
            {(progress.failed ?? 0) > 0 && (
              <>
                <div style={s.statDivider} />
                <div style={s.stat}>
                  <span style={s.statNum}>{progress.failed}</span>
                  <span style={s.statLabel}>failed</span>
                </div>
              </>
            )}
          </div>

          {/* Current transcript */}
          {progress.lastTitle && <p style={s.currentTitle}>{truncate(progress.lastTitle, 52)}</p>}
          {syncSource === "google-meet" &&
            ((progress.skippedExisting ?? 0) > 0 || (progress.skippedNoTranscript ?? 0) > 0) && (
              <p style={s.currentTitle}>
                {progress.skippedExisting ?? 0} already in library ·{" "}
                {progress.skippedNoTranscript ?? 0} without transcripts
              </p>
            )}
          {(syncSource === "fireflies" ||
            syncSource === "granola" ||
            syncSource === "google-meet") && (
            <p style={s.currentTitle}>The backend will keep syncing if this page reloads.</p>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={s.resultCard}>
          <div style={s.resultStatsRow}>
            <div style={s.resultStat}>
              <span style={s.resultNum}>{result.synced}</span>
              <span style={s.resultLabel}>synced</span>
            </div>
            {result.skipped > 0 && (
              <div style={s.resultStat}>
                <span style={s.resultNum}>{result.skipped}</span>
                <span style={s.resultLabel}>skipped</span>
              </div>
            )}
            {(result.skippedExisting ?? 0) > 0 && (
              <div style={s.resultStat}>
                <span style={s.resultNum}>{result.skippedExisting}</span>
                <span style={s.resultLabel}>already synced</span>
              </div>
            )}
            {(result.skippedNoTranscript ?? 0) > 0 && (
              <div style={s.resultStat}>
                <span style={s.resultNum}>{result.skippedNoTranscript}</span>
                <span style={s.resultLabel}>no transcript</span>
              </div>
            )}
            {result.repaired > 0 && (
              <div style={s.resultStat}>
                <span style={s.resultNum}>{result.repaired}</span>
                <span style={s.resultLabel}>repaired</span>
              </div>
            )}
            {result.failed > 0 && (
              <div style={s.resultStat}>
                <span style={s.resultNumFailed}>{result.failed}</span>
                <span style={s.resultLabel}>failed</span>
              </div>
            )}
          </div>
          {result.errors.length > 0 && (
            <div style={s.errorList}>
              {result.errors.map((e, i) => (
                <p key={i} style={s.errorItem}>
                  {e}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={s.errorBanner}>
          <span style={s.errorIcon}>!</span>
          {error}
        </div>
      )}

      {/* Webhook pending */}
      {hasFireflies && webhookStatus && webhookStatus.pendingCount > 0 && (
        <div style={s.pendingBanner}>
          <span style={s.statNum}>{webhookStatus.pendingCount}</span>
          <span style={s.pendingText}>transcripts queued from webhook</span>
        </div>
      )}

      {/* Google Meet pending */}
      {hasGM && gmWebhookStatus?.enabled && gmWebhookStatus.pendingCount > 0 && (
        <div style={s.pendingBanner}>
          <span style={s.statNum}>{gmWebhookStatus.pendingCount}</span>
          <span style={s.pendingText}>Google Meet transcripts waiting</span>
        </div>
      )}
    </section>
  );
};

// ── Styles ──────────────────────────────────────────────────────────

const FONT = "var(--lst-font)";
const MONO = "var(--lst-mono)";

const s: Record<string, React.CSSProperties> = {
  panel: {
    fontFamily: FONT,
    background: "var(--lst-bg)",
    border: "var(--lst-border)",
    borderRadius: 0,
    padding: "18px 22px",
  },

  // Header
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 0,
  },
  titleGroup: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  heading: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: 400,
    color: "var(--lst-blue)",
    margin: 0,
    letterSpacing: 0,
  },
  lastSyncBadge: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: 500,
    color: "var(--lst-blue)",
    background: "var(--lst-ink-08)",
    padding: "3px 8px",
    borderRadius: 999,
    letterSpacing: "0.06em",
    textTransform: "lowercase" as const,
  },
  webhookBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: 500,
    color: "var(--lst-ok)",
    background: "var(--lst-ok-soft)",
    padding: "3px 8px",
    borderRadius: 999,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  webhookDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "var(--lst-ok)",
    display: "inline-block",
    animation: "syncPulse 2s ease-in-out infinite",
  },

  // Buttons
  buttonGroup: {
    display: "flex",
    gap: 6,
  },
  btnPrimary: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: 600,
    color: "var(--lst-bg)",
    background: "var(--lst-blue)",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "8px 18px",
    cursor: "pointer",
    letterSpacing: 0,
    transition: "background 0.15s, transform 0.1s",
  },
  btnDanger: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: 500,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "7px 14px",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  btnCancel: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: 500,
    color: "var(--lst-blue)",
    background: "var(--lst-ink-08)",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "7px 14px",
    cursor: "pointer",
  },

  // Listing phase
  phaseCard: {
    marginTop: 16,
    padding: "14px 16px",
    background: "var(--lst-warn-soft)",
    border: "1px solid var(--lst-warn)",
    borderRadius: 0,
    animation: "fadeSlideIn 0.25s ease-out",
  },
  phaseRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "var(--lst-warn)",
    display: "inline-block",
    animation: "syncPulse 1.5s ease-in-out infinite",
  },
  phaseLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: "var(--lst-warn)",
    letterSpacing: 0,
  },
  phaseDetail: {
    fontFamily: FONT,
    fontSize: 13,
    color: "var(--lst-ink-70)",
    margin: "4px 0 0",
  },
  phaseSubtle: {
    fontFamily: FONT,
    fontSize: 12,
    color: "var(--lst-ink-55)",
    margin: "8px 0 0",
  },

  // Syncing phase
  syncCard: {
    marginTop: 16,
    padding: "16px 18px",
    background: "var(--lst-warn-soft)",
    border: "1px solid var(--lst-warn)",
    borderRadius: 0,
    animation: "fadeSlideIn 0.25s ease-out",
  },

  // Progress bar
  barOuter: {
    position: "relative" as const,
    height: 6,
    background: "var(--lst-ink-15)",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 14,
  },
  barFill: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    height: "100%",
    background: "var(--lst-warn)",
    borderRadius: 999,
    transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  barScanline: {
    position: "absolute" as const,
    top: 0,
    width: 2,
    height: "100%",
    background: "var(--lst-warn)",
    opacity: 0.8,
    animation: "syncPulse 1s ease-in-out infinite",
  },

  // Stats
  statsRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 16,
  },
  stat: {
    display: "flex",
    alignItems: "baseline",
    gap: 4,
  },
  statNum: {
    fontFamily: MONO,
    fontSize: 20,
    fontWeight: 500,
    color: "var(--lst-blue)",
    lineHeight: 1,
    letterSpacing: 0,
  },
  statDenom: {
    fontFamily: MONO,
    fontSize: 14,
    fontWeight: 400,
    color: "var(--lst-ink-55)",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.01em",
  },
  statDivider: {
    width: 1,
    height: 16,
    background: "var(--lst-rule-soft)",
  },
  statDividerInline: {
    color: "var(--lst-ink-35)",
    margin: "0 8px",
  },
  currentTitle: {
    fontFamily: FONT,
    fontSize: 12,
    color: "var(--lst-ink-55)",
    margin: "10px 0 0",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },

  // Result
  resultCard: {
    marginTop: 16,
    padding: "16px 18px",
    background: "var(--lst-ok-soft)",
    border: "1px solid var(--lst-ok)",
    borderRadius: 0,
    animation: "fadeSlideIn 0.3s ease-out",
  },
  resultStatsRow: {
    display: "flex",
    gap: 24,
  },
  resultStat: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
  },
  resultNum: {
    fontFamily: MONO,
    fontSize: 24,
    fontWeight: 500,
    color: "var(--lst-ok)",
    lineHeight: 1,
    letterSpacing: 0,
  },
  resultNumFailed: {
    fontFamily: MONO,
    fontSize: 24,
    fontWeight: 500,
    color: "var(--lst-alert)",
    lineHeight: 1,
    letterSpacing: 0,
  },
  resultLabel: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: 500,
    color: "var(--lst-ink-55)",
    textTransform: "lowercase" as const,
    letterSpacing: "0.06em",
  },
  errorList: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: "1px solid var(--lst-alert-soft)",
  },
  errorItem: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-alert)",
    margin: "0 0 4px",
    lineHeight: 1.4,
  },

  // Error banner
  errorBanner: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 16,
    padding: "12px 14px",
    fontSize: 13,
    color: "var(--lst-alert)",
    background: "var(--lst-alert-soft)",
    border: "1px solid var(--lst-alert)",
    borderRadius: 0,
    lineHeight: 1.4,
  },
  errorIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "var(--lst-alert)",
    color: "var(--lst-bg)",
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  },

  // Pending
  pendingBanner: {
    display: "flex",
    alignItems: "baseline",
    gap: 6,
    marginTop: 12,
    padding: "10px 14px",
    background: "var(--lst-ink-08)",
    border: "var(--lst-border)",
    borderRadius: 0,
    fontSize: 13,
    color: "var(--lst-blue)",
  },
  pendingText: {
    fontSize: 13,
    color: "var(--lst-blue)",
  },
};
