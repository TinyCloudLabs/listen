import { type FC } from "react";

// Connections / Sources settings screen, per l-app-screens.jsx line 409 (LConnections).
// Richer source/import management view: connected sources with sync status,
// available sources to add, an audio drop zone, and in-progress imports.
// Presentational — receives data via props.

export type ConnectionStatus = "live" | "warning";

export interface ConnectedSource {
  id: string;
  name: string;
  count: string; // e.g. "24 transcripts"
  syncedLabel: string; // e.g. "synced 5m ago"
  status: ConnectionStatus;
  backfillPercent: number; // 0..100
  error?: string;
  onSyncNow?: () => void;
  onSettings?: () => void;
  onReconnect?: () => void;
}

export interface AvailableSource {
  id: string;
  name: string;
  description: string;
  method: string; // e.g. "OAuth", "No setup"
  actionLabel: string;
  onAction?: () => void;
}

export type ImportStatus = "transcribing" | "queued" | "done" | "error";

export interface AudioImport {
  id: string;
  filename: string;
  size: string;
  status: ImportStatus;
  percent: number; // 0..100
  onCancel?: () => void;
}

export interface ConnectionsScreenProps {
  connected: ConnectedSource[];
  available: AvailableSource[];
  imports: AudioImport[];
  onSyncAll?: () => void;
  onAddSource?: () => void;
  onDropAudio?: (files: FileList) => void;
}

export const ConnectionsScreen: FC<ConnectionsScreenProps> = ({
  connected,
  available,
  imports,
  onSyncAll,
  onAddSource,
  onDropAudio,
}) => {
  return (
    <main style={s.shell}>
      <header style={s.header}>
        <span style={s.eyebrow}>— settings / sources</span>
        <div style={s.headerRow}>
          <h1 style={s.title}>Connections</h1>
          <div style={s.headerActions}>
            <button style={s.btnGhost} onClick={onSyncAll}>
              Sync now
            </button>
            <button style={s.btnPrimary} onClick={onAddSource}>
              + Add source
            </button>
          </div>
        </div>
        <p style={s.lede}>
          Listen pulls transcripts from every tool you connect. Disconnect any time — your
          transcripts stay. New transcripts appear in the inbox within 30 seconds of being recorded.
        </p>
      </header>

      <div style={s.body}>
        {/* Connected */}
        <div style={s.sectionLabelRow}>
          <span style={s.sectionLabel}>— CONNECTED · {connected.length}</span>
          <span style={s.sectionRule} />
        </div>

        {connected.map((src) => (
          <div key={src.id} style={s.connectedCard}>
            <div style={s.connectedGrid}>
              <span style={s.mark} />
              <div>
                <div style={s.sourceName}>{src.name}</div>
                <span style={s.sourceMeta}>
                  {src.count.toUpperCase()} · {src.syncedLabel.toUpperCase()}
                </span>
              </div>
              <div style={s.backfillCell}>
                <span style={s.sectionLabel}>BACKFILL</span>
                <div style={s.backfillTrack}>
                  <div
                    style={{
                      ...s.backfillFill,
                      width: `${Math.min(100, Math.max(0, src.backfillPercent))}%`,
                    }}
                  />
                </div>
              </div>
              <span style={src.status === "live" ? s.chipSolid : s.chipGhost}>
                <span
                  style={{
                    ...s.dot,
                    background: src.status === "live" ? "var(--lst-bg)" : "var(--lst-blue)",
                  }}
                />
                {src.status === "live" ? "Live" : "Needs attention"}
              </span>
              <div style={s.connectedActions}>
                <button style={s.btnGhostSm} onClick={src.onSyncNow}>
                  Sync now
                </button>
                <button style={s.btnGhostSm} onClick={src.onSettings}>
                  Settings
                </button>
                <button style={s.btnIcon}>⋯</button>
              </div>
            </div>
            {src.error && (
              <div style={s.errorBanner}>
                ⚠ {src.error}{" "}
                <button style={s.errorLink} onClick={src.onReconnect}>
                  Reconnect →
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Available */}
        <div style={{ ...s.sectionLabelRow, marginTop: 32 }}>
          <span style={s.sectionLabel}>— AVAILABLE · {available.length}</span>
          <span style={s.sectionRule} />
        </div>

        {available.map((src) => (
          <div key={src.id} style={s.availableCard}>
            <span style={s.mark} />
            <div>
              <div style={s.availableTitleRow}>
                <span style={s.sourceName}>{src.name}</span>
                <span style={s.sourceMeta}>· {src.method}</span>
              </div>
              <p style={s.availableDesc}>{src.description}</p>
            </div>
            <button style={s.btnGhostSm} onClick={src.onAction}>
              {src.actionLabel}
            </button>
          </div>
        ))}

        {/* Drop zone */}
        <div style={s.dropSection}>
          <span style={s.sectionLabel}>— DROP AUDIO HERE</span>
          <div
            style={s.dropZone}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer?.files) onDropAudio?.(e.dataTransfer.files);
            }}
          >
            <div style={s.dropIcon}>🎤</div>
            <h3 style={s.dropTitle}>Drop .m4a, .mp3, .wav files here</h3>
            <p style={s.dropSub}>
              Or click to browse · multiple files at once is fine · transcribed in 2–6 minutes
            </p>
            <div style={s.dropFeatures}>
              <span style={s.dropFeature}>✓ auto-transcribe</span>
              <span style={s.dropFeature}>✓ speaker diarization</span>
              <span style={s.dropFeature}>
                ✓ lands in <span style={s.monoInline}>/Imports</span>
              </span>
              <span style={s.dropFeature}>✓ summary auto-generated</span>
            </div>
          </div>

          {imports.length > 0 && (
            <div style={s.importsSection}>
              <span style={s.sectionLabel}>— IN PROGRESS · {imports.length}</span>
              {imports.map((imp) => (
                <div key={imp.id} style={s.importRow}>
                  <span style={s.importIcon}>📄</span>
                  <div>
                    <div style={s.importName}>{imp.filename}</div>
                    <span style={s.sourceMeta}>
                      {imp.size} · {imp.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={s.importTrack}>
                    <div
                      style={{
                        ...s.importFill,
                        width: `${Math.min(100, Math.max(0, imp.percent))}%`,
                      }}
                    />
                  </div>
                  <span style={s.importPct}>{imp.percent}%</span>
                  <button style={s.btnIconBare} onClick={imp.onCancel}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

const FONT = "var(--lst-font)";
const MONO = "var(--lst-mono)";

const s: Record<string, React.CSSProperties> = {
  shell: {
    fontFamily: FONT,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "var(--lst-bg)",
    color: "var(--lst-blue)",
  },
  header: {
    padding: "20px 32px 16px",
    borderBottom: "var(--lst-border)",
  },
  eyebrow: {
    fontFamily: MONO,
    fontSize: 10,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  headerRow: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 4,
  },
  title: {
    fontSize: 38,
    fontWeight: 400,
    margin: 0,
    color: "var(--lst-blue)",
  },
  headerActions: {
    display: "flex",
    gap: 8,
  },
  lede: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 12,
    maxWidth: 600,
  },
  body: {
    flex: 1,
    overflow: "auto",
    padding: "24px 32px 48px",
  },
  sectionLabelRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 12,
    marginBottom: 14,
  },
  sectionLabel: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  sectionRule: {
    flex: 1,
    height: 1,
    background: "var(--lst-rule-soft)",
  },
  connectedCard: {
    border: "var(--lst-border)",
    padding: "16px 20px",
    marginBottom: 8,
  },
  connectedGrid: {
    display: "grid",
    gridTemplateColumns: "32px 1fr 140px 120px auto",
    gap: 14,
    alignItems: "center",
  },
  mark: {
    width: 26,
    height: 26,
    borderRadius: 4,
    background: "var(--lst-blue)",
    display: "inline-block",
  },
  sourceName: {
    fontSize: 15,
    fontWeight: 500,
    marginBottom: 2,
    color: "var(--lst-blue)",
  },
  sourceMeta: {
    fontFamily: MONO,
    fontSize: 10,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.06em",
  },
  backfillCell: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 4,
  },
  backfillTrack: {
    width: 100,
    height: 4,
    border: "var(--lst-border)",
    position: "relative" as const,
  },
  backfillFill: {
    position: "absolute" as const,
    inset: 0,
    background: "var(--lst-blue)",
  },
  chipSolid: {
    fontFamily: FONT,
    fontSize: 11,
    color: "var(--lst-bg)",
    background: "var(--lst-blue)",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "4px 10px",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap" as const,
  },
  chipGhost: {
    fontFamily: FONT,
    fontSize: 11,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "4px 10px",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap" as const,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    display: "inline-block",
  },
  connectedActions: {
    display: "flex",
    gap: 6,
  },
  errorBanner: {
    marginTop: 12,
    padding: "8px 12px",
    border: "1px dashed var(--lst-blue)",
    fontSize: 12.5,
    opacity: 0.85,
  },
  errorLink: {
    background: "transparent",
    border: "none",
    borderBottom: "1px solid var(--lst-blue)",
    color: "var(--lst-blue)",
    fontFamily: FONT,
    fontSize: 12.5,
    cursor: "pointer",
    padding: 0,
    marginLeft: 6,
  },
  availableCard: {
    border: "var(--lst-border)",
    padding: "16px 20px",
    marginBottom: 8,
    display: "grid",
    gridTemplateColumns: "32px 1fr auto",
    gap: 14,
    alignItems: "center",
    opacity: 0.85,
  },
  availableTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 2,
  },
  availableDesc: {
    fontSize: 13,
    opacity: 0.7,
    margin: 0,
  },
  dropSection: {
    marginTop: 28,
  },
  dropZone: {
    marginTop: 10,
    border: "2px dashed var(--lst-blue)",
    padding: "40px 20px",
    textAlign: "center" as const,
    position: "relative" as const,
  },
  dropIcon: {
    fontSize: 36,
  },
  dropTitle: {
    fontSize: 22,
    marginTop: 12,
    fontWeight: 400,
    color: "var(--lst-blue)",
    margin: "12px 0 0",
  },
  dropSub: {
    fontSize: 13,
    opacity: 0.65,
    marginTop: 6,
  },
  dropFeatures: {
    display: "flex",
    gap: 18,
    justifyContent: "center",
    marginTop: 18,
    fontSize: 12,
    flexWrap: "wrap" as const,
  },
  dropFeature: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  monoInline: {
    fontFamily: MONO,
  },
  importsSection: {
    marginTop: 14,
  },
  importRow: {
    marginTop: 10,
    border: "var(--lst-border)",
    padding: "12px 16px",
    display: "grid",
    gridTemplateColumns: "20px 1fr 100px 60px 32px",
    gap: 14,
    alignItems: "center",
  },
  importIcon: {
    fontSize: 16,
  },
  importName: {
    fontSize: 13,
    marginBottom: 2,
    color: "var(--lst-blue)",
  },
  importTrack: {
    width: 100,
    height: 4,
    background: "var(--lst-ink-15)",
    position: "relative" as const,
  },
  importFill: {
    position: "absolute" as const,
    inset: 0,
    background: "var(--lst-blue)",
  },
  importPct: {
    fontFamily: MONO,
    fontSize: 11,
    opacity: 0.7,
  },
  btnPrimary: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 600,
    color: "var(--lst-bg)",
    background: "var(--lst-blue)",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "7px 13px",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  btnGhost: {
    fontFamily: FONT,
    fontSize: 12,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "7px 13px",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  btnGhostSm: {
    fontFamily: FONT,
    fontSize: 11,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "5px 10px",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  btnIcon: {
    fontFamily: FONT,
    fontSize: 12,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "5px 9px",
    cursor: "pointer",
    minWidth: 28,
  },
  btnIconBare: {
    fontFamily: FONT,
    fontSize: 12,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 4,
  },
};
