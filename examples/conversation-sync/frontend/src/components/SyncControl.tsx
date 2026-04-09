import { useState, useEffect, useCallback, useRef, type FC } from "react";
import type { ApiClient } from "@tinyboilerplate/client";

const LAST_SYNC_KEY = "lastSyncTimestamp";

interface SyncResult {
  synced: number;
  skipped: number;
  failed: number;
  errors: string[];
}

interface SyncProgress {
  phase: "listing" | "syncing";
  totalListed?: number;
  current?: number;
  total?: number;
  synced?: number;
  failed?: number;
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

// ── Component ───────────────────────────────────────────────────────

export const SyncControl: FC<SyncControlProps> = ({
  api,
  backendUrl,
  getAccessToken,
  onSyncComplete,
  hasFireflies: hasFirefliesProp,
  hasGoogleMeet: hasGoogleMeetProp,
}) => {
  const hasFireflies = hasFirefliesProp !== false;
  const hasGM = hasGoogleMeetProp === true;

  const [syncing, setSyncing] = useState(false);
  const [syncSource, setSyncSource] = useState<"fireflies" | "google-meet" | null>(null);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(() =>
    localStorage.getItem(LAST_SYNC_KEY),
  );
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
  const [gmWebhookStatus, setGmWebhookStatus] = useState<GoogleMeetWebhookStatus | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    api
      .get<WebhookStatus>("/api/config/webhook-status")
      .then((status) => setWebhookStatus(status))
      .catch(() => {});
  }, [api]);

  useEffect(() => {
    if (!hasGM) return;
    api
      .get<GoogleMeetWebhookStatus>("/api/webhooks/google-meet/status")
      .then((status) => setGmWebhookStatus(status))
      .catch(() => {});
  }, [api, hasGM]);

  useEffect(() => {
    if (!lastSync) return;
    const id = setInterval(() => setLastSync(localStorage.getItem(LAST_SYNC_KEY)), 60_000);
    return () => clearInterval(id);
  }, [lastSync]);

  // ── SSE sync handler ──────────────────────────────────────────────

  const startStreamSync = useCallback(
    async (mode: "incremental" | "full", source: "fireflies" | "google-meet" = "fireflies") => {
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
            : `${backendUrl}/api/sync/fireflies/stream?mode=${mode}`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Stream failed: ${response.status} ${response.statusText}`);
        }

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
                break;
              case "progress":
                if (data.phase === "listing") {
                  setProgress((prev) => ({
                    ...prev,
                    phase: "listing",
                    totalListed: data.totalListed,
                  }));
                } else {
                  setProgress({
                    phase: "syncing",
                    current: data.current,
                    total: data.total,
                    synced: data.synced,
                    failed: data.failed,
                    lastTitle: data.lastTitle,
                  });
                }
                break;
              case "complete": {
                setResult({
                  synced: data.synced,
                  skipped: data.skipped,
                  failed: data.failed,
                  errors: data.errors,
                });
                setProgress(null);
                const ts = new Date().toISOString();
                localStorage.setItem(LAST_SYNC_KEY, ts);
                setLastSync(ts);
                onSyncComplete();
                break;
              }
              case "error":
                setError(data.message);
                setProgress(null);
                break;
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(err instanceof Error ? err.message : String(err));
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
    () => startStreamSync("incremental", "fireflies"),
    [startStreamSync],
  );

  const handleGoogleMeetSync = useCallback(
    () => startStreamSync("incremental", "google-meet"),
    [startStreamSync],
  );

  const handleClearAndResync = useCallback(async () => {
    setSyncing(true);
    setResult(null);
    setError(null);
    try {
      await api.del("/api/sync/conversations");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSyncing(false);
      return;
    }
    setSyncing(false);
    startStreamSync("full");
  }, [api, startStreamSync]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const pct =
    progress?.phase === "syncing" && progress.total
      ? Math.round(((progress.current ?? 0) / progress.total) * 100)
      : 0;

  const listingLabel = syncSource === "google-meet" ? "Scanning Google Meet" : "Scanning Fireflies";

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
              {hasGM && (
                <button
                  style={{ ...s.btnPrimary, background: "#059669" }}
                  onClick={handleGoogleMeetSync}
                >
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

      {/* Listing phase */}
      {progress?.phase === "listing" && (
        <div style={s.phaseCard}>
          <div style={s.phaseRow}>
            <span style={s.phaseDot} />
            <span style={s.phaseLabel}>{listingLabel}</span>
          </div>
          <p style={s.phaseDetail}>
            {progress.totalListed != null ? (
              <>
                <span style={s.statNum}>{progress.totalListed}</span> transcripts found
              </>
            ) : (
              "Fetching transcript list\u2026"
            )}
          </p>
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
              <span style={{ ...s.statNum, color: "#10b981" }}>{progress.synced ?? 0}</span>
              <span style={s.statLabel}>synced</span>
            </div>
            {(progress.failed ?? 0) > 0 && (
              <>
                <div style={s.statDivider} />
                <div style={s.stat}>
                  <span style={{ ...s.statNum, color: "#ef4444" }}>{progress.failed}</span>
                  <span style={s.statLabel}>failed</span>
                </div>
              </>
            )}
          </div>

          {/* Current transcript */}
          {progress.lastTitle && <p style={s.currentTitle}>{truncate(progress.lastTitle, 52)}</p>}
        </div>
      )}

      {/* Result */}
      {result && (
        <div
          style={{
            ...s.resultCard,
            borderLeftColor: result.failed > 0 ? "#f59e0b" : "#10b981",
          }}
        >
          <div style={s.resultStatsRow}>
            <div style={s.resultStat}>
              <span style={{ ...s.resultNum, color: "#10b981" }}>{result.synced}</span>
              <span style={s.resultLabel}>synced</span>
            </div>
            {result.skipped > 0 && (
              <div style={s.resultStat}>
                <span style={{ ...s.resultNum, color: "#6b7280" }}>{result.skipped}</span>
                <span style={s.resultLabel}>skipped</span>
              </div>
            )}
            {result.failed > 0 && (
              <div style={s.resultStat}>
                <span style={{ ...s.resultNum, color: "#ef4444" }}>{result.failed}</span>
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

const FONT = "'Outfit', -apple-system, sans-serif";
const MONO = "'IBM Plex Mono', 'SF Mono', monospace";

const s: Record<string, React.CSSProperties> = {
  panel: {
    fontFamily: FONT,
    background: "#fff",
    border: "1px solid #e2e4e9",
    borderRadius: 12,
    padding: "20px 24px",
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
    fontSize: 15,
    fontWeight: 600,
    color: "#1a1a1a",
    margin: 0,
    letterSpacing: "-0.01em",
  },
  lastSyncBadge: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: 500,
    color: "#9ca3af",
    background: "#f3f4f6",
    padding: "2px 8px",
    borderRadius: 4,
    letterSpacing: "0.02em",
  },
  webhookBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: 11,
    fontWeight: 500,
    color: "#059669",
    background: "#ecfdf5",
    padding: "2px 8px",
    borderRadius: 4,
  },
  webhookDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#10b981",
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
    color: "#fff",
    background: "#18181b",
    border: "none",
    borderRadius: 8,
    padding: "8px 18px",
    cursor: "pointer",
    letterSpacing: "-0.01em",
    transition: "background 0.15s, transform 0.1s",
  },
  btnDanger: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: 500,
    color: "#6b7280",
    background: "transparent",
    border: "1px solid #e2e4e9",
    borderRadius: 8,
    padding: "7px 14px",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  btnCancel: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: 500,
    color: "#ef4444",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 8,
    padding: "7px 14px",
    cursor: "pointer",
  },

  // Listing phase
  phaseCard: {
    marginTop: 16,
    padding: "14px 16px",
    background: "#fff",
    border: "1px solid #e2e4e9",
    borderRadius: 10,
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
    background: "#6366f1",
    display: "inline-block",
    animation: "syncPulse 1.5s ease-in-out infinite",
  },
  phaseLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    letterSpacing: "-0.01em",
  },
  phaseDetail: {
    fontFamily: FONT,
    fontSize: 13,
    color: "#6b7280",
    margin: "4px 0 0",
  },

  // Syncing phase
  syncCard: {
    marginTop: 16,
    padding: "16px 18px",
    background: "#fff",
    border: "1px solid #e2e4e9",
    borderRadius: 10,
    animation: "fadeSlideIn 0.25s ease-out",
  },

  // Progress bar
  barOuter: {
    position: "relative" as const,
    height: 6,
    background: "#f3f4f6",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 14,
  },
  barFill: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    height: "100%",
    background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
    borderRadius: 3,
    transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  barScanline: {
    position: "absolute" as const,
    top: 0,
    width: 2,
    height: "100%",
    background: "#c4b5fd",
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
    fontWeight: 600,
    color: "#18181b",
    lineHeight: 1,
    letterSpacing: "-0.03em",
  },
  statDenom: {
    fontFamily: MONO,
    fontSize: 14,
    fontWeight: 400,
    color: "#9ca3af",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: "#9ca3af",
    letterSpacing: "0.01em",
  },
  statDivider: {
    width: 1,
    height: 16,
    background: "#e5e7eb",
  },
  currentTitle: {
    fontFamily: FONT,
    fontSize: 12,
    color: "#9ca3af",
    margin: "10px 0 0",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },

  // Result
  resultCard: {
    marginTop: 16,
    padding: "16px 18px",
    background: "#fff",
    border: "1px solid #e2e4e9",
    borderLeft: "3px solid #10b981",
    borderRadius: 10,
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
    fontWeight: 600,
    lineHeight: 1,
    letterSpacing: "-0.03em",
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: 500,
    color: "#9ca3af",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  },
  errorList: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: "1px solid #f3f4f6",
  },
  errorItem: {
    fontFamily: MONO,
    fontSize: 11,
    color: "#b91c1c",
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
    color: "#991b1b",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 10,
    lineHeight: 1.4,
  },
  errorIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#ef4444",
    color: "#fff",
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
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: 10,
    fontSize: 13,
    color: "#92400e",
  },
  pendingText: {
    fontSize: 13,
    color: "#92400e",
  },
};
