import { useState, useEffect, type FC } from "react";
import type { ApiClient } from "@listen/client";
import { debugLog } from "../lib/debug";
import { formatSyncTimeAgo, useSyncManager } from "../lib/syncManager";

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
  hasSoundcore?: boolean;
  hasGoogleMeet?: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "\u2026" : str;
}

function daysUntil(isoString: string): number {
  return Math.max(0, Math.ceil((new Date(isoString).getTime() - Date.now()) / 86_400_000));
}

// ── Component ───────────────────────────────────────────────────────

export const SyncControl: FC<SyncControlProps> = ({
  api,
  backendUrl: _backendUrl,
  getAccessToken: _getAccessToken,
  onSyncComplete: _onSyncComplete,
  hasFireflies: hasFirefliesProp,
  hasGranola: hasGranolaProp,
  hasSoundcore: hasSoundcoreProp,
  hasGoogleMeet: hasGoogleMeetProp,
}) => {
  const hasFireflies = hasFirefliesProp !== false;
  const hasGranola = hasGranolaProp === true;
  const hasSoundcore = hasSoundcoreProp === true;
  const hasGM = hasGoogleMeetProp === true;

  const {
    syncing,
    syncSource,
    progress,
    result,
    error,
    lastSync,
    startFirefliesJob,
    startGranolaJob,
    startGoogleMeetJob,
    startSoundcoreSync,
    startSyncAll,
    clearAndResyncFireflies,
    cancelSync,
  } = useSyncManager();
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
  const [gmWebhookStatus, setGmWebhookStatus] = useState<GoogleMeetWebhookStatus | null>(null);

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

  const handleFirefliesSync = () => void startFirefliesJob("incremental");
  const handleGoogleMeetSync = () => void startGoogleMeetJob("incremental");
  const handleGranolaSync = () => void startGranolaJob("incremental");
  const handleSyncAll = () => void startSyncAll();
  const handleSoundcoreSync = () => void startSoundcoreSync();
  const handleClearAndResync = () => void clearAndResyncFireflies();
  const handleCancel = () => cancelSync();

  const pct =
    progress?.phase === "syncing" && progress.total
      ? Math.round(((progress.current ?? 0) / progress.total) * 100)
      : 0;

  const listingLabel =
    syncSource === "google-meet"
      ? "Scanning Google Meet"
      : syncSource === "soundcore"
        ? "Scanning Soundcore"
        : syncSource === "granola"
          ? "Scanning Granola"
          : "Scanning Fireflies";
  const queuedLabel =
    syncSource === "google-meet"
      ? "Queued Google Meet sync"
      : syncSource === "soundcore"
        ? "Queued Soundcore sync"
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
          {lastSync && <span style={s.lastSyncBadge}>{formatSyncTimeAgo(lastSync)}</span>}
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
              {(hasFireflies || hasGranola || hasSoundcore || hasGM) && (
                <button style={s.btnPrimary} onClick={handleSyncAll}>
                  Sync all
                </button>
              )}
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
              {hasSoundcore && (
                <button style={s.btnPrimary} onClick={handleSoundcoreSync}>
                  Sync Soundcore
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
          {(syncSource === "fireflies" || syncSource === "google-meet") && (
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
                {progress.skippedNoTranscript ?? 0} transcript unavailable
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
                <span style={s.resultLabel}>unavailable</span>
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
