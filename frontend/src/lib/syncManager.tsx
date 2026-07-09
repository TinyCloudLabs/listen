import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from "react";
import type { ApiClient } from "@listen/client";
import { debugLog, startDebugStep } from "./debug";
import { parseStorageQuotaError, type StorageQuotaErrorDetails } from "./storageQuotaError";

const LAST_SYNC_KEY = "lastSyncTimestamp";
const FIREFLIES_JOB_NOT_FOUND_RETRY_LIMIT = 8;

export interface SyncResult {
  synced: number;
  repaired: number;
  skipped: number;
  skippedExisting?: number;
  skippedNoTranscript?: number;
  failed: number;
  errors: string[];
}

export interface SyncProgress {
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

export type SyncSource = "fireflies" | "granola" | "soundcore" | "google-meet";

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

interface SyncManagerProviderProps {
  api: ApiClient | null;
  backendUrl: string;
  getAccessToken: () => string | null;
  onSyncComplete: () => void;
  hasFireflies?: boolean;
  hasGranola?: boolean;
  hasSoundcore?: boolean;
  hasGoogleMeet?: boolean;
  children: ReactNode;
}

interface SyncManagerContextValue {
  syncing: boolean;
  syncSource: SyncSource | null;
  progress: SyncProgress | null;
  result: SyncResult | null;
  error: string | null;
  storageQuotaError: StorageQuotaErrorDetails | null;
  lastSync: string | null;
  startFirefliesJob: (mode: "incremental" | "full") => Promise<void>;
  startGranolaJob: (mode: "incremental" | "full") => Promise<void>;
  startGoogleMeetJob: (mode: "incremental" | "full") => Promise<void>;
  startSoundcoreSync: () => Promise<void>;
  startSyncSource: (source: SyncSource, mode?: "incremental" | "full") => Promise<void>;
  startSyncAll: (sources?: SyncSource[]) => Promise<void>;
  clearAndResyncFireflies: () => Promise<void>;
  cancelSync: () => void;
  clearError: () => void;
}

const SyncManagerContext = createContext<SyncManagerContextValue | null>(null);

export function formatSyncTimeAgo(isoString: string): string {
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

export function syncSourceLabel(source: SyncSource | null): string {
  if (source === "google-meet") return "Google Meet";
  if (source === "soundcore") return "Soundcore";
  if (source === "granola") return "Granola";
  if (source === "fireflies") return "Fireflies";
  return "sources";
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

export const SyncManagerProvider: FC<SyncManagerProviderProps> = ({
  api,
  backendUrl: _backendUrl,
  getAccessToken: _getAccessToken,
  onSyncComplete,
  hasFireflies: hasFirefliesProp,
  hasGranola: hasGranolaProp,
  hasSoundcore: hasSoundcoreProp,
  hasGoogleMeet: hasGoogleMeetProp,
  children,
}) => {
  const hasFireflies = hasFirefliesProp === true;
  const hasGranola = hasGranolaProp === true;
  const hasSoundcore = hasSoundcoreProp === true;
  const hasGM = hasGoogleMeetProp === true;

  const [syncing, setSyncing] = useState(false);
  const [syncSource, setSyncSource] = useState<SyncSource | null>(null);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const storageQuotaError = useMemo(() => (error ? parseStorageQuotaError(error) : null), [error]);
  const [lastSync, setLastSync] = useState<string | null>(() =>
    localStorage.getItem(LAST_SYNC_KEY),
  );
  const firefliesPollRef = useRef<number | null>(null);
  const granolaPollRef = useRef<number | null>(null);
  const googleMeetPollRef = useRef<number | null>(null);
  const activeFirefliesJobRef = useRef<string | null>(null);
  const activeGranolaJobRef = useRef<string | null>(null);
  const activeGoogleMeetJobRef = useRef<string | null>(null);
  const completedFirefliesJobsRef = useRef<Set<string>>(new Set());
  const completedGranolaJobsRef = useRef<Set<string>>(new Set());
  const completedGoogleMeetJobsRef = useRef<Set<string>>(new Set());

  const markSynced = useCallback(() => {
    const ts = new Date().toISOString();
    localStorage.setItem(LAST_SYNC_KEY, ts);
    setLastSync(ts);
    onSyncComplete();
  }, [onSyncComplete]);

  const activeSourceAfter = useCallback((completedSource?: SyncSource): SyncSource | null => {
    if (completedSource !== "fireflies" && activeFirefliesJobRef.current) return "fireflies";
    if (completedSource !== "granola" && activeGranolaJobRef.current) return "granola";
    if (completedSource !== "google-meet" && activeGoogleMeetJobRef.current) return "google-meet";
    return null;
  }, []);

  const finishJobView = useCallback(
    (source: SyncSource) => {
      const nextSource = activeSourceAfter(source);
      if (nextSource) {
        setSyncing(true);
        setSyncSource(nextSource);
        return;
      }
      setSyncing(false);
      setSyncSource(null);
      setProgress(null);
    },
    [activeSourceAfter],
  );

  const clearFirefliesPoll = useCallback(() => {
    if (firefliesPollRef.current != null) {
      window.clearInterval(firefliesPollRef.current);
      firefliesPollRef.current = null;
    }
  }, []);

  const clearGranolaPoll = useCallback(() => {
    if (granolaPollRef.current != null) {
      window.clearInterval(granolaPollRef.current);
      granolaPollRef.current = null;
    }
  }, []);

  const clearGoogleMeetPoll = useCallback(() => {
    if (googleMeetPollRef.current != null) {
      window.clearInterval(googleMeetPollRef.current);
      googleMeetPollRef.current = null;
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

      if (activeFirefliesJobRef.current === job.id) activeFirefliesJobRef.current = null;
      finishJobView("fireflies");

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
          markSynced();
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
    [finishJobView, markSynced],
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

      if (activeGranolaJobRef.current === job.id) activeGranolaJobRef.current = null;
      finishJobView("granola");

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
          markSynced();
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
    [finishJobView, markSynced],
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

      if (activeGoogleMeetJobRef.current === job.id) activeGoogleMeetJobRef.current = null;
      finishJobView("google-meet");

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
          markSynced();
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
    [finishJobView, markSynced],
  );

  const pollFirefliesJob = useCallback(
    (jobId: string) => {
      if (!api) return;
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
      if (!api) return;
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
      if (!api) return;
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
    if (!api || !hasFireflies) return;

    let canceled = false;
    const step = startDebugStep("sync.fireflies.current-job", {
      path: "/api/sync/fireflies/jobs/current",
    });
    void api
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
        if (isActiveFirefliesJob(job)) pollFirefliesJob(job.id);
        step.complete({ hasJob: true, jobId: job.id, status: job.status });
      })
      .catch((err) => step.fail(err));

    return () => {
      canceled = true;
    };
  }, [api, hasFireflies, applyFirefliesJob, pollFirefliesJob]);

  useEffect(() => {
    if (!api || !hasGranola) return;

    let canceled = false;
    const step = startDebugStep("sync.granola.current-job", {
      path: "/api/sync/granola/jobs/current",
    });
    void api
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
        if (isActiveGranolaJob(job)) pollGranolaJob(job.id);
        step.complete({ hasJob: true, jobId: job.id, status: job.status });
      })
      .catch((err) => step.fail(err));

    return () => {
      canceled = true;
    };
  }, [api, hasGranola, applyGranolaJob, pollGranolaJob]);

  useEffect(() => {
    if (!api || !hasGM) return;

    let canceled = false;
    const step = startDebugStep("sync.google-meet.current-job", {
      path: "/api/sync/google-meet/jobs/current",
    });
    void api
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
        if (isActiveGoogleMeetJob(job)) pollGoogleMeetJob(job.id);
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

  const startFirefliesJob = useCallback(
    async (mode: "incremental" | "full") => {
      if (!api) return;
      const step = startDebugStep("sync.fireflies.start-job", { mode });
      setSyncing(true);
      setSyncSource("fireflies");
      setResult(null);
      setError(null);
      setProgress({ phase: "queued" });

      try {
        const job = await api.post<FirefliesSyncJob>("/api/sync/fireflies/jobs", { mode });
        if (!isFirefliesJob(job)) throw new Error("Fireflies sync did not return a job.");
        applyFirefliesJob(job);
        if (isActiveFirefliesJob(job)) pollFirefliesJob(job.id);
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
      if (!api) return;
      const step = startDebugStep("sync.granola.start-job", { mode });
      setSyncing(true);
      setSyncSource("granola");
      setResult(null);
      setError(null);
      setProgress({ phase: "queued" });

      try {
        const job = await api.post<GranolaSyncJob>("/api/sync/granola/jobs", { mode });
        if (!isGranolaJob(job)) throw new Error("Granola sync did not return a job.");
        applyGranolaJob(job);
        if (isActiveGranolaJob(job)) pollGranolaJob(job.id);
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
      if (!api) return;
      const step = startDebugStep("sync.google-meet.start-job", { mode });
      setSyncing(true);
      setSyncSource("google-meet");
      setResult(null);
      setError(null);
      setProgress({ phase: "queued" });

      try {
        const job = await api.post<GoogleMeetSyncJob>("/api/sync/google-meet/jobs", { mode });
        if (!isGoogleMeetJob(job)) throw new Error("Google Meet sync did not return a job.");
        applyGoogleMeetJob(job);
        if (isActiveGoogleMeetJob(job)) pollGoogleMeetJob(job.id);
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

  const startSoundcoreSync = useCallback(async () => {
    if (!api) return;
    setSyncing(true);
    setSyncSource("soundcore");
    setProgress({ phase: "syncing", current: 0, total: 0 });
    setResult(null);
    setError(null);

    try {
      const data = await api.post<SyncResult>("/api/sync/soundcore", {});
      setResult(data);
      markSynced();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncing(false);
      setSyncSource(null);
      setProgress(null);
    }
  }, [api, markSynced]);

  const startSyncSource = useCallback(
    async (source: SyncSource, mode: "incremental" | "full" = "incremental") => {
      if (source === "fireflies") return startFirefliesJob(mode);
      if (source === "granola") return startGranolaJob(mode);
      if (source === "google-meet") return startGoogleMeetJob(mode);
      return startSoundcoreSync();
    },
    [startFirefliesJob, startGoogleMeetJob, startGranolaJob, startSoundcoreSync],
  );

  const startSyncAll = useCallback(
    async (requestedSources?: SyncSource[]) => {
      if (!api) return;
      const sources: SyncSource[] = requestedSources ?? [
        ...(hasFireflies ? (["fireflies"] as const) : []),
        ...(hasGranola ? (["granola"] as const) : []),
        ...(hasSoundcore ? (["soundcore"] as const) : []),
        ...(hasGM ? (["google-meet"] as const) : []),
      ];
      if (sources.length === 0) return;

      const step = startDebugStep("sync.all.start-jobs", { sources });
      setSyncing(true);
      setSyncSource(null);
      setResult(null);
      setError(null);
      setProgress({ phase: "queued" });

      const starts = await Promise.allSettled(
        sources.map(async (source) => {
          if (source === "fireflies") {
            const job = await api.post<FirefliesSyncJob>("/api/sync/fireflies/jobs", {
              mode: "incremental",
            });
            if (!isFirefliesJob(job)) throw new Error("Fireflies sync did not return a job.");
            applyFirefliesJob(job);
            if (isActiveFirefliesJob(job)) pollFirefliesJob(job.id);
            return { source, jobId: job.id, status: job.status };
          }

          if (source === "granola") {
            const job = await api.post<GranolaSyncJob>("/api/sync/granola/jobs", {
              mode: "incremental",
            });
            if (!isGranolaJob(job)) throw new Error("Granola sync did not return a job.");
            applyGranolaJob(job);
            if (isActiveGranolaJob(job)) pollGranolaJob(job.id);
            return { source, jobId: job.id, status: job.status };
          }

          if (source === "soundcore") {
            const data = await api.post<SyncResult>("/api/sync/soundcore", {});
            setResult(data);
            markSynced();
            return { source, jobId: null, status: "completed" };
          }

          const job = await api.post<GoogleMeetSyncJob>("/api/sync/google-meet/jobs", {
            mode: "incremental",
          });
          if (!isGoogleMeetJob(job)) throw new Error("Google Meet sync did not return a job.");
          applyGoogleMeetJob(job);
          if (isActiveGoogleMeetJob(job)) pollGoogleMeetJob(job.id);
          return { source, jobId: job.id, status: job.status };
        }),
      );

      const started = starts.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      const failed = starts.flatMap((result, index) => {
        if (result.status === "fulfilled") return [];
        const reason =
          result.reason instanceof Error ? result.reason.message : String(result.reason);
        return [`${sources[index]}: ${reason}`];
      });

      if (started.length === 0) {
        const message = failed.join("\n") || "No sync jobs started.";
        step.fail(new Error(message), { failed });
        setError(message);
        setProgress(null);
        setSyncing(false);
        setSyncSource(null);
        return;
      }

      if (failed.length > 0) {
        setError(`Some sync jobs did not start: ${failed.join("; ")}`);
      }

      step.complete({ started, failed });
    },
    [
      api,
      applyFirefliesJob,
      applyGoogleMeetJob,
      applyGranolaJob,
      hasFireflies,
      hasGM,
      hasGranola,
      hasSoundcore,
      markSynced,
      pollFirefliesJob,
      pollGoogleMeetJob,
      pollGranolaJob,
    ],
  );

  const clearAndResyncFireflies = useCallback(async () => {
    if (!api) return;
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
    await startFirefliesJob("full");
  }, [api, startFirefliesJob]);

  const cancelSync = useCallback(() => {
    if (!api) return;
    const cancelRequests: Promise<unknown>[] = [];
    const firefliesJobId = activeFirefliesJobRef.current;
    if (firefliesJobId) {
      const step = startDebugStep("sync.fireflies.cancel", { jobId: firefliesJobId });
      cancelRequests.push(
        api
          .post<FirefliesSyncJob>(`/api/sync/fireflies/jobs/${firefliesJobId}/cancel`)
          .then((job) => {
            if (isFirefliesJob(job)) applyFirefliesJob(job);
            step.complete({ status: isFirefliesJob(job) ? job.status : "invalid-job" });
          })
          .catch((err) => {
            step.fail(err);
            setError(err instanceof Error ? err.message : String(err));
          }),
      );
    }

    const granolaJobId = activeGranolaJobRef.current;
    if (granolaJobId) {
      const step = startDebugStep("sync.granola.cancel", { jobId: granolaJobId });
      cancelRequests.push(
        api
          .post<GranolaSyncJob>(`/api/sync/granola/jobs/${granolaJobId}/cancel`)
          .then((job) => {
            if (isGranolaJob(job)) applyGranolaJob(job);
            step.complete({ status: isGranolaJob(job) ? job.status : "invalid-job" });
          })
          .catch((err) => {
            step.fail(err);
            setError(err instanceof Error ? err.message : String(err));
          }),
      );
    }

    const googleMeetJobId = activeGoogleMeetJobRef.current;
    if (googleMeetJobId) {
      const step = startDebugStep("sync.google-meet.cancel", { jobId: googleMeetJobId });
      cancelRequests.push(
        api
          .post<GoogleMeetSyncJob>(`/api/sync/google-meet/jobs/${googleMeetJobId}/cancel`)
          .then((job) => {
            if (isGoogleMeetJob(job)) applyGoogleMeetJob(job);
            step.complete({ status: isGoogleMeetJob(job) ? job.status : "invalid-job" });
          })
          .catch((err) => {
            step.fail(err);
            setError(err instanceof Error ? err.message : String(err));
          }),
      );
    }

    if (cancelRequests.length > 0) void Promise.allSettled(cancelRequests);
  }, [api, applyFirefliesJob, applyGoogleMeetJob, applyGranolaJob]);

  const value = useMemo<SyncManagerContextValue>(
    () => ({
      syncing,
      syncSource,
      progress,
      result,
      error,
      storageQuotaError,
      lastSync,
      startFirefliesJob,
      startGranolaJob,
      startGoogleMeetJob,
      startSoundcoreSync,
      startSyncSource,
      startSyncAll,
      clearAndResyncFireflies,
      cancelSync,
      clearError: () => setError(null),
    }),
    [
      cancelSync,
      clearAndResyncFireflies,
      error,
      lastSync,
      progress,
      result,
      startFirefliesJob,
      startGoogleMeetJob,
      startGranolaJob,
      startSoundcoreSync,
      startSyncAll,
      startSyncSource,
      storageQuotaError,
      syncSource,
      syncing,
    ],
  );

  return <SyncManagerContext.Provider value={value}>{children}</SyncManagerContext.Provider>;
};

export function useSyncManager(): SyncManagerContextValue {
  const value = useContext(SyncManagerContext);
  if (!value) throw new Error("useSyncManager must be used inside SyncManagerProvider");
  return value;
}
