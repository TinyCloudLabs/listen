import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiClient } from "@listen/client";
import { ApiRequestError } from "@listen/client";

// Ambient, app-wide sync status. Sync jobs run server-side and persist in KV,
// but their progress was previously visible only while the Connections page
// was mounted. This indicator polls a single consolidated endpoint
// (GET /api/sync/jobs) from anywhere in the app: a quiet pill while a job
// runs, a completion notice when one finishes in view.

type SyncJobStatus = "queued" | "listing" | "syncing" | "completed" | "failed" | "canceled";

interface SyncJobLite {
  id: string;
  status: SyncJobStatus;
  current?: number;
  total?: number;
  synced: number;
  skipped?: number;
  failed: number;
  message?: string;
}

interface SyncSourceConfig {
  key: string;
  label: string;
}

// key -> label mapping only; the paths collapsed into one endpoint. Per-source
// "only poll connected sources" gating would need a props/App.tsx change (out of
// scope for this batch) — the single request already covers all sources cheaply.
const SOURCES: SyncSourceConfig[] = [
  { key: "fireflies", label: "Fireflies" },
  { key: "granola", label: "Granola" },
  { key: "google-meet", label: "Google Meet" },
];

const ACTIVE_POLL_MS = 5000;
const IDLE_POLL_MS = 60000;
const MAX_BACKOFF_MS = 300000;
const NOTICE_DISMISS_MS = 10000;

function isActiveStatus(status: SyncJobStatus): boolean {
  return status === "queued" || status === "listing" || status === "syncing";
}

interface ActiveJobView {
  sourceKey: string;
  label: string;
  status: SyncJobStatus;
  current: number;
  total: number;
}

interface CompletionNotice {
  sourceKey: string;
  label: string;
  status: "completed" | "failed" | "canceled";
  synced: number;
  skipped: number;
  failed: number;
  message?: string;
}

interface GlobalSyncIndicatorProps {
  api: ApiClient;
  onViewResults?: (sourceKey: string) => void;
}

export function GlobalSyncIndicator({ api, onViewResults }: GlobalSyncIndicatorProps) {
  const [activeJobs, setActiveJobs] = useState<ActiveJobView[]>([]);
  const [notice, setNotice] = useState<CompletionNotice | null>(null);

  // Last observed status per source job so completion notices fire only for
  // transitions we watched, never for jobs that finished before mount.
  const seenJobsRef = useRef<Map<string, SyncJobStatus>>(new Map());
  const timerRef = useRef<number | null>(null);
  const stoppedRef = useRef(false);
  // Current error backoff delay; null when the last poll succeeded.
  const errorDelayRef = useRef<number | null>(null);
  // Poll-chain epoch. Bumped whenever a new chain starts (mount, visibilitychange);
  // a poll whose fetch straddles a bump is a stale chain and must not write state
  // or reschedule — otherwise a visibility flap during an in-flight request leaks
  // a second, parallel poll chain.
  const epochRef = useRef(0);

  const poll = useCallback(async () => {
    // Paused while the tab is hidden; the visibilitychange handler resumes us.
    if (document.hidden) return;

    const epoch = epochRef.current;
    const nextActive: ActiveJobView[] = [];
    let hadError = false;

    try {
      const jobs = await api.get<Record<string, SyncJobLite | null>>("/api/sync/jobs");
      if (stoppedRef.current || epoch !== epochRef.current) return;

      for (const source of SOURCES) {
        const job = jobs?.[source.key] ?? null;
        if (!job || typeof job.id !== "string") continue;

        const jobKey = `${source.key}:${job.id}`;
        const lastStatus = seenJobsRef.current.get(jobKey);

        if (isActiveStatus(job.status)) {
          seenJobsRef.current.set(jobKey, job.status);
          nextActive.push({
            sourceKey: source.key,
            label: source.label,
            status: job.status,
            current: job.current ?? 0,
            total: job.total ?? 0,
          });
          continue;
        }

        // Terminal. Notify only if we saw this job active earlier.
        if (lastStatus !== undefined && isActiveStatus(lastStatus)) {
          setNotice({
            sourceKey: source.key,
            label: source.label,
            status: job.status as CompletionNotice["status"],
            synced: job.synced ?? 0,
            skipped: job.skipped ?? 0,
            failed: job.failed ?? 0,
            message: job.message,
          });
        }
        seenJobsRef.current.set(jobKey, job.status);
      }

      errorDelayRef.current = null; // reset backoff on success
    } catch (err) {
      if (stoppedRef.current || epoch !== epochRef.current) return;
      hadError = true;
      // 429s can't surface Retry-After through ApiClient (see backend
      // rate-limit-handler / Step 2b), so jump straight to the ceiling.
      // TODO: honor Retry-After once ApiClient exposes response headers.
      if (err instanceof ApiRequestError && err.status === 429) {
        errorDelayRef.current = MAX_BACKOFF_MS;
      } else {
        const prev = errorDelayRef.current;
        errorDelayRef.current = prev ? Math.min(prev * 2, MAX_BACKOFF_MS) : IDLE_POLL_MS;
      }
    }

    if (!stoppedRef.current && !document.hidden && epoch === epochRef.current) {
      if (!hadError) setActiveJobs(nextActive);
      const delay = hadError
        ? (errorDelayRef.current ?? IDLE_POLL_MS)
        : nextActive.length > 0
          ? ACTIVE_POLL_MS
          : IDLE_POLL_MS;
      // Clear before overwrite so a pending timer can never be orphaned into a
      // parallel chain.
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => void poll(), delay);
    }
  }, [api]);

  useEffect(() => {
    stoppedRef.current = false;

    const clearTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const onVisibility = () => {
      // Invalidate any in-flight poll from the previous chain, then start (or
      // pause) a single fresh chain. Resume with an immediate poll when the tab
      // becomes visible; stay paused (no reschedule) while hidden.
      epochRef.current += 1;
      clearTimer();
      if (!document.hidden) void poll();
    };

    document.addEventListener("visibilitychange", onVisibility);
    epochRef.current += 1;
    if (!document.hidden) void poll();

    return () => {
      stoppedRef.current = true;
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimer();
    };
  }, [poll]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (activeJobs.length === 0 && !notice) return null;

  return (
    <div style={g.stack} aria-live="polite">
      {activeJobs.map((job) => {
        const determinate = job.status === "syncing" && job.total > 0;
        return (
          <div key={job.sourceKey} style={g.card}>
            <div style={g.row}>
              <span style={g.pulseDot} aria-hidden="true" />
              <span style={g.title}>
                Syncing {job.label}
                {determinate
                  ? ` · ${job.current}/${job.total}`
                  : job.status === "listing"
                    ? " · listing…"
                    : "…"}
              </span>
            </div>
            <div style={g.track}>
              <div
                style={{
                  ...g.fill,
                  width: determinate
                    ? `${Math.min(100, Math.round((job.current / job.total) * 100))}%`
                    : "100%",
                  opacity: determinate ? 1 : 0.35,
                }}
              />
            </div>
          </div>
        );
      })}

      {notice && (
        <div style={g.card}>
          <div style={g.row}>
            <span
              style={notice.status === "completed" && notice.failed === 0 ? g.okDot : g.warnDot}
              aria-hidden="true"
            />
            <span style={g.title}>
              {notice.label} sync {notice.status === "completed" ? "complete" : notice.status}
            </span>
            <button
              type="button"
              style={g.close}
              aria-label="Dismiss"
              onClick={() => setNotice(null)}
            >
              ×
            </button>
          </div>
          <div style={g.detail}>
            {notice.synced} synced · {notice.skipped} skipped · {notice.failed} failed
          </div>
          {onViewResults && notice.status === "completed" && notice.synced > 0 && (
            <button
              type="button"
              style={g.viewBtn}
              onClick={() => {
                onViewResults(notice.sourceKey);
                setNotice(null);
              }}
            >
              View in library →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const MONO = "var(--lst-mono)";

const g: Record<string, React.CSSProperties> = {
  stack: {
    position: "fixed",
    right: 18,
    bottom: 18,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    zIndex: 60,
    width: 264,
  },
  card: {
    border: "var(--lst-border)",
    background: "var(--lst-bg)",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.18)",
    padding: "10px 12px",
    animation: "fadeSlideIn 0.25s ease-out",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
    color: "var(--lst-blue)",
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "var(--lst-warn)",
    animation: "syncPulse 1.4s ease-in-out infinite",
    flexShrink: 0,
  },
  okDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "var(--lst-ok)",
    flexShrink: 0,
  },
  warnDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "var(--lst-alert)",
    flexShrink: 0,
  },
  track: {
    height: 4,
    border: "var(--lst-hair)",
    marginTop: 8,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    background: "var(--lst-blue)",
    transition: "width 0.4s ease",
  },
  detail: {
    fontFamily: MONO,
    fontSize: 10,
    color: "var(--lst-ink-55)",
    marginTop: 6,
    letterSpacing: "0.04em",
  },
  close: {
    border: "none",
    background: "transparent",
    color: "var(--lst-ink-55)",
    fontSize: 14,
    lineHeight: 1,
    cursor: "pointer",
    padding: "0 2px",
    flexShrink: 0,
  },
  viewBtn: {
    marginTop: 8,
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    color: "var(--lst-bg)",
    background: "var(--lst-blue)",
    border: "none",
    padding: "5px 10px",
    cursor: "pointer",
  },
};
