import { useState, type FC } from "react";
import type { ApiClient } from "@listen/client";
import { useIsMobile } from "../hooks/useIsMobile";

interface ConnectionsScreenProps {
  api: ApiClient;
  hasFireflies: boolean;
  hasGranola?: boolean;
  hasGoogleMeet: boolean;
  hasFirefliesBackendAccess: boolean;
  hasGranolaBackendAccess?: boolean;
  hasAssemblyAIKey?: boolean | null;
  hasAssemblyAIBackendAccess?: boolean | null;
  hasDeepgramKey?: boolean | null;
  hasDeepgramBackendAccess?: boolean | null;
  googleMeetAvailable: boolean;
  onAddSource: () => void;
  onAddTranscript?: () => void;
  onFinishTranscriptionProviderAccess?: (provider: "assemblyai" | "deepgram") => Promise<void>;
  onRefresh: () => void;
}

type SourceId = "fireflies" | "granola" | "google-meet" | "assemblyai" | "deepgram";

const LOCAL_IMPORTER_INSTRUCTIONS_URL = "https://listen.xyz/importer";
const LOCAL_IMPORTER_REFERENCE_URL = "https://github.com/TinyCloudLabs/listen-importer";
const LOCAL_IMPORTER_AGENT_PROMPT =
  "Go to https://listen.xyz/importer and follow the Listen importer skill. Help me pull local audio or transcripts into Listen with listen-importer, then preprocess/downsample, transcribe if needed, and upload with --publish. Ask me for the source, path or time window, and transcription provider before making changes.";

interface SourceRow {
  id: SourceId;
  name: string;
  connected: boolean;
  ready: boolean;
  available: boolean;
  description: string;
  syncable?: boolean;
  finishSetup?: () => Promise<void>;
}

interface MigrationResult {
  scanned: number;
  migrated: number;
  skipped: number;
  missing: number;
  failed: number;
}

export const ConnectionsScreen: FC<ConnectionsScreenProps> = ({
  api,
  hasFireflies,
  hasGranola = false,
  hasGoogleMeet,
  hasFirefliesBackendAccess,
  hasGranolaBackendAccess = false,
  hasAssemblyAIKey = null,
  hasAssemblyAIBackendAccess = null,
  hasDeepgramKey = null,
  hasDeepgramBackendAccess = null,
  googleMeetAvailable,
  onAddSource,
  onAddTranscript,
  onFinishTranscriptionProviderAccess,
  onRefresh,
}) => {
  const [busySource, setBusySource] = useState<SourceId | "all" | "migration" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLocalImporter, setShowLocalImporter] = useState(false);
  const [localImporterCopied, setLocalImporterCopied] = useState(false);
  const openTranscriptImport = onAddTranscript ?? onAddSource;
  const isMobile = useIsMobile();

  // On narrow widths the source cards stack vertically so the description
  // keeps a comfortable width and the badge/action buttons wrap instead of
  // clipping. On desktop they stay as a single aligned row (CSS grid).
  const sourceCardStyle = isMobile ? { ...s.sourceCard, ...s.cardStacked } : s.sourceCard;
  const availableCardStyle = isMobile ? { ...s.availableCard, ...s.cardStacked } : s.availableCard;
  const rowActionsStyle = isMobile ? { ...s.rowActions, ...s.rowActionsStacked } : s.rowActions;

  const sources: SourceRow[] = [
    {
      id: "fireflies",
      name: "Fireflies",
      connected: hasFireflies,
      ready: hasFireflies && hasFirefliesBackendAccess,
      available: true,
      description: "Syncs Fireflies transcripts and summaries into Listen.",
      syncable: true,
    },
    {
      id: "granola",
      name: "Granola",
      connected: hasGranola,
      ready: hasGranola && hasGranolaBackendAccess,
      available: true,
      description: "Syncs Granola notes, transcripts, and summaries into Listen.",
    },
    {
      id: "google-meet",
      name: "Google Meet",
      connected: hasGoogleMeet,
      ready: hasGoogleMeet && googleMeetAvailable,
      available: googleMeetAvailable,
      description: googleMeetAvailable
        ? "Imports Google Meet transcripts through the connected Google account."
        : "Google Meet is not configured on this Listen server.",
      syncable: true,
    },
    {
      id: "assemblyai",
      name: "AssemblyAI",
      connected: hasAssemblyAIKey === true,
      ready: hasAssemblyAIKey === true && hasAssemblyAIBackendAccess === true,
      available: true,
      description: "Transcribes uploaded audio and video with AssemblyAI.",
      finishSetup: onFinishTranscriptionProviderAccess
        ? () => onFinishTranscriptionProviderAccess("assemblyai")
        : undefined,
    },
    {
      id: "deepgram",
      name: "Deepgram",
      connected: hasDeepgramKey === true,
      ready: hasDeepgramKey === true && hasDeepgramBackendAccess === true,
      available: true,
      description: "Transcribes uploaded audio and video with Deepgram.",
      finishSetup: onFinishTranscriptionProviderAccess
        ? () => onFinishTranscriptionProviderAccess("deepgram")
        : undefined,
    },
  ];

  const connected = sources.filter((source) => source.connected);
  const available = sources.filter((source) => !source.connected);
  const syncableConnected = connected.filter((source) => source.ready && source.syncable);
  const availableCount = available.length + 2;

  const copyLocalImporterCommand = async () => {
    await navigator.clipboard?.writeText(LOCAL_IMPORTER_AGENT_PROMPT);
    setLocalImporterCopied(true);
    window.setTimeout(() => setLocalImporterCopied(false), 1600);
  };

  const syncSource = async (source: SourceId) => {
    setBusySource(source);
    setError(null);
    setMessage(null);
    try {
      if (source === "fireflies") {
        await api.post("/api/sync/fireflies/jobs", { mode: "incremental" });
      } else if (source === "google-meet") {
        await api.post("/api/sync/google-meet");
      }
      setMessage(
        source === "fireflies"
          ? "Fireflies sync started"
          : `${sources.find((item) => item.id === source)?.name ?? "Source"} synced`,
      );
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusySource(null);
    }
  };

  const syncAll = async () => {
    setBusySource("all");
    setError(null);
    setMessage(null);
    try {
      for (const source of connected) {
        if (source.ready && source.syncable) {
          if (source.id === "fireflies") {
            await api.post("/api/sync/fireflies/jobs", { mode: "incremental" });
          } else if (source.id === "google-meet") {
            await api.post("/api/sync/google-meet");
          }
        }
      }
      setMessage("Connected sources synced");
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusySource(null);
    }
  };

  const migrateTranscripts = async () => {
    setBusySource("migration");
    setError(null);
    setMessage(null);
    try {
      const result = await api.post<MigrationResult>("/api/config/migrate-transcripts", {});
      setMessage(
        `Migrated ${result.migrated} transcript${result.migrated === 1 ? "" : "s"} (${result.skipped} current, ${result.missing} missing legacy KV).`,
      );
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusySource(null);
    }
  };

  return (
    <section style={s.shell}>
      <header style={s.header}>
        <span style={s.eyebrow}>· settings / sources</span>
        <div style={s.headerRow}>
          <h2 style={s.title}>Connections</h2>
          <div style={s.headerActions}>
            <button
              type="button"
              style={{ ...s.btnGhost, ...(syncableConnected.length === 0 ? s.btnDisabled : {}) }}
              onClick={syncAll}
              disabled={syncableConnected.length === 0 || busySource !== null}
            >
              {busySource === "all" ? "Syncing" : "Sync connected"}
            </button>
            <button type="button" style={s.btnPrimary} onClick={onAddSource}>
              Add source or transcript
            </button>
          </div>
        </div>
        <p style={s.lede}>
          Bring your meetings and conversations together. Connect a source to sync automatically, or
          import a single transcript whenever you like.
        </p>
      </header>

      {message && <div style={s.notice}>{message}</div>}
      {error && <div style={s.error}>{error}</div>}

      <div style={s.body}>
        <div style={s.sectionLabelRow}>
          <span style={s.sectionLabel}>· connected · {connected.length}</span>
          <span style={s.sectionRule} />
        </div>

        {connected.length === 0 ? (
          <div style={s.empty}>
            Nothing connected yet. Add a source below and your conversations will start arriving
            here.
          </div>
        ) : (
          connected.map((source) => (
            <div key={source.id} style={sourceCardStyle}>
              <span style={source.ready ? s.markLive : s.markWarn} />
              <div style={s.sourceContent}>
                <div style={s.sourceHead}>
                  <div style={s.sourceName}>{source.name}</div>
                  <span style={source.ready ? s.chipSolid : s.chipGhost}>
                    {source.ready ? "Live" : "Finish setup"}
                  </span>
                </div>
                <div style={s.sourceEyebrow}>{source.ready ? "ready" : "needs access"}</div>
                <p style={s.availableDesc}>{source.description}</p>
              </div>
              <div style={rowActionsStyle}>
                {source.ready && source.syncable ? (
                  <button
                    type="button"
                    style={s.btnGhostSm}
                    onClick={() => void syncSource(source.id)}
                    disabled={busySource !== null}
                  >
                    {busySource === source.id ? "Syncing" : "Sync now"}
                  </button>
                ) : !source.ready && source.finishSetup ? (
                  <button
                    type="button"
                    style={s.btnGhostSm}
                    onClick={() => {
                      setBusySource(source.id);
                      setError(null);
                      setMessage(null);
                      source
                        .finishSetup?.()
                        .then(() => {
                          setMessage(`${source.name} setup finished`);
                          onRefresh();
                        })
                        .catch((err) => setError(err instanceof Error ? err.message : String(err)))
                        .finally(() => setBusySource(null));
                    }}
                    disabled={busySource !== null}
                  >
                    {busySource === source.id ? "Connecting" : "Finish setup"}
                  </button>
                ) : !source.ready ? (
                  <button type="button" style={s.btnGhostSm} onClick={onAddSource}>
                    Finish setup
                  </button>
                ) : null}
                <button type="button" style={s.btnGhostSm} onClick={onAddSource}>
                  Settings
                </button>
              </div>
            </div>
          ))
        )}

        <div style={{ ...s.sectionLabelRow, marginTop: 28 }}>
          <span style={s.sectionLabel}>· maintenance</span>
          <span style={s.sectionRule} />
        </div>

        <div style={isMobile ? { ...s.maintenancePanel, ...s.cardStacked } : s.maintenancePanel}>
          <span style={s.markIdle} />
          <div>
            <div style={s.sourceName}>Transcript SQL fields</div>
            <p style={s.availableDesc}>
              Backfill existing conversations from legacy KV transcript blobs into the conversation
              SQL record.
            </p>
          </div>
          <button
            type="button"
            style={s.btnGhostSm}
            onClick={() => void migrateTranscripts()}
            disabled={busySource !== null}
          >
            {busySource === "migration" ? "Migrating" : "Migrate transcripts"}
          </button>
        </div>

        <div style={{ ...s.sectionLabelRow, marginTop: 28 }}>
          <span style={s.sectionLabel}>· available · {availableCount}</span>
          <span style={s.sectionRule} />
        </div>

        <div style={availableCardStyle}>
          <span style={s.markIdle} />
          <div>
            <div style={s.sourceName}>Transcript import</div>
            <p style={s.availableDesc}>
              Paste text or upload a transcript file with editable fields.
            </p>
          </div>
          <button type="button" style={s.btnGhostSm} onClick={openTranscriptImport}>
            Import
          </button>
        </div>

        <div style={availableCardStyle}>
          <span style={s.markIdle} />
          <div>
            <div style={s.sourceName}>Import local</div>
            <p style={s.availableDesc}>
              Send an agent to the Listen importer skill for recorder disks, Apple Voice Memos,
              VoxTerm transcripts, preprocessing, transcription, and publishing.
            </p>
          </div>
          <button
            type="button"
            style={s.btnGhostSm}
            onClick={() => setShowLocalImporter((open) => !open)}
          >
            Get started
          </button>
        </div>

        {showLocalImporter && (
          <div style={s.importerPanel}>
            <div style={s.importerHeader}>
              <div>
                <div style={s.sourceName}>listen-importer skill</div>
                <p style={s.availableDesc}>
                  Copy this prompt into an LLM or coding agent. It points the agent at the canonical
                  importer skill and asks it to pull local audio or transcripts into Listen.
                </p>
              </div>
              <div style={s.importerLinks}>
                <a
                  href={LOCAL_IMPORTER_INSTRUCTIONS_URL}
                  target="_blank"
                  rel="noreferrer"
                  style={s.referenceLink}
                >
                  Skill
                </a>
                <a
                  href={LOCAL_IMPORTER_REFERENCE_URL}
                  target="_blank"
                  rel="noreferrer"
                  style={s.referenceLink}
                >
                  Repo
                </a>
              </div>
            </div>

            <div style={s.commandHeader}>
              <span style={s.sourceMeta}>agent prompt</span>
              <button
                type="button"
                style={s.btnGhostSm}
                onClick={() => void copyLocalImporterCommand()}
              >
                {localImporterCopied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre style={s.commandBlock}>
              <code>{LOCAL_IMPORTER_AGENT_PROMPT}</code>
            </pre>

            <div style={s.importerGrid}>
              <div>
                <div style={s.sourceMeta}>skill url</div>
                <p style={s.availableDesc}>
                  The instructions are published at <code>listen.xyz/importer</code> for agents to
                  fetch directly.
                </p>
              </div>
              <div>
                <div style={s.sourceMeta}>covers</div>
                <p style={s.availableDesc}>
                  Pulling in the importer, local source scans, downsampling, transcription, and
                  publishing to Listen.
                </p>
              </div>
            </div>
          </div>
        )}

        {available.length === 0 ? (
          <div style={s.empty}>All provider sources are connected.</div>
        ) : (
          available.map((source) => (
            <div key={source.id} style={availableCardStyle}>
              <span style={s.markIdle} />
              <div>
                <div style={s.sourceName}>{source.name}</div>
                <p style={s.availableDesc}>{source.description}</p>
              </div>
              <button
                type="button"
                style={{
                  ...s.btnGhostSm,
                  ...(!source.available ? s.btnDisabled : {}),
                }}
                onClick={onAddSource}
                disabled={!source.available}
              >
                {source.available ? "Connect" : "Unavailable"}
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

const FONT = "var(--lst-font)";
const MONO = "var(--lst-mono)";

const s: Record<string, React.CSSProperties> = {
  shell: {
    fontFamily: FONT,
    border: "var(--lst-border)",
    background: "var(--lst-bg)",
    color: "var(--lst-blue)",
    minHeight: 680,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "22px 32px 16px",
    borderBottom: "var(--lst-border)",
  },
  eyebrow: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.06em",
    textTransform: "lowercase",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 6,
  },
  title: {
    fontFamily: "var(--lst-font-display)",
    fontSize: "var(--lst-type-display)",
    letterSpacing: "var(--lst-tracking-display)",
    lineHeight: "var(--lst-leading-tight)",
    fontWeight: 400,
    margin: 0,
  },
  headerActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  lede: {
    margin: "10px 0 0",
    maxWidth: 560,
    color: "var(--lst-ink-70)",
    fontSize: "var(--lst-type-body)",
    lineHeight: "var(--lst-leading-body)",
  },
  body: {
    flex: 1,
    overflow: "auto",
    padding: "24px 32px 40px",
  },
  sectionLabelRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.06em",
    textTransform: "lowercase",
  },
  sectionRule: {
    flex: 1,
    height: 1,
    background: "var(--lst-rule-soft)",
  },
  sourceCard: {
    border: "var(--lst-border)",
    padding: "15px 18px",
    display: "grid",
    gridTemplateColumns: "28px minmax(0, 1fr) auto",
    gap: 14,
    alignItems: "start",
    marginBottom: 8,
  },
  availableCard: {
    border: "var(--lst-border)",
    padding: "15px 18px",
    display: "grid",
    gridTemplateColumns: "28px minmax(0, 1fr) auto",
    gap: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  maintenancePanel: {
    border: "var(--lst-border)",
    padding: "15px 18px",
    display: "grid",
    gridTemplateColumns: "28px minmax(0, 1fr) auto",
    gap: 14,
    alignItems: "center",
    marginBottom: 8,
    background: "var(--lst-ink-08)",
  },
  // Narrow-width override: drop the grid and stack the mark, content, and
  // actions so the description spans full width instead of being crushed.
  cardStacked: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: 10,
  },
  sourceContent: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  sourceHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  sourceEyebrow: {
    fontFamily: MONO,
    fontSize: 10,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.06em",
    textTransform: "lowercase",
  },
  importerPanel: {
    border: "var(--lst-border)",
    padding: "16px 18px",
    marginBottom: 8,
    background: "var(--lst-ink-08)",
  },
  importerHeader: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 14,
    alignItems: "start",
    marginBottom: 14,
  },
  importerLinks: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  importerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    margin: "14px 0",
  },
  commandHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  commandBlock: {
    margin: 0,
    padding: "14px 16px",
    border: "var(--lst-hair)",
    borderLeft: "2px solid var(--lst-ink-35)",
    background: "var(--lst-bg)",
    color: "var(--lst-ink-70)",
    fontFamily: FONT,
    fontSize: 13,
    lineHeight: "var(--lst-leading-body)",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  referenceLink: {
    fontFamily: FONT,
    border: "var(--lst-border)",
    background: "transparent",
    color: "var(--lst-blue)",
    borderRadius: 999,
    padding: "6px 12px",
    fontSize: 12.5,
    fontWeight: 500,
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  sourceName: {
    fontSize: 15,
    fontWeight: 500,
    marginBottom: 3,
  },
  sourceMeta: {
    fontFamily: MONO,
    fontSize: 10,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.06em",
    textTransform: "lowercase",
  },
  availableDesc: {
    margin: 0,
    color: "var(--lst-ink-70)",
    fontSize: 13,
  },
  markLive: {
    width: 20,
    height: 20,
    borderRadius: 4,
    background: "var(--lst-ok)",
  },
  markWarn: {
    width: 20,
    height: 20,
    borderRadius: 4,
    border: "1px solid var(--lst-warn)",
    background: "var(--lst-warn-soft)",
  },
  markIdle: {
    width: 20,
    height: 20,
    borderRadius: 4,
    border: "var(--lst-border)",
    background: "transparent",
  },
  chipSolid: {
    fontFamily: MONO,
    fontSize: 10,
    color: "var(--lst-bg)",
    background: "var(--lst-ok)",
    borderRadius: 999,
    padding: "5px 10px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  chipGhost: {
    fontFamily: MONO,
    fontSize: 10,
    color: "var(--lst-warn)",
    border: "1px solid var(--lst-warn)",
    borderRadius: 999,
    padding: "5px 10px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  rowActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  // Stacked cards give the buttons their own full-width row that wraps.
  rowActionsStacked: {
    marginTop: 2,
  },
  btnPrimary: {
    fontFamily: FONT,
    border: "var(--lst-border)",
    background: "var(--lst-blue)",
    color: "var(--lst-bg)",
    borderRadius: 999,
    padding: "8px 14px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
  },
  btnGhost: {
    fontFamily: FONT,
    border: "var(--lst-border)",
    background: "transparent",
    color: "var(--lst-blue)",
    borderRadius: 999,
    padding: "8px 14px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
  },
  btnGhostSm: {
    fontFamily: FONT,
    border: "var(--lst-border)",
    background: "transparent",
    color: "var(--lst-blue)",
    borderRadius: 999,
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: 12.5,
    fontWeight: 500,
  },
  btnDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
  notice: {
    padding: "9px 32px",
    borderBottom: "1px solid var(--lst-ok)",
    background: "var(--lst-ok-soft)",
    color: "var(--lst-ok)",
    fontSize: 13,
  },
  error: {
    padding: "9px 32px",
    borderBottom: "1px solid var(--lst-alert)",
    background: "var(--lst-alert-soft)",
    color: "var(--lst-alert)",
    fontSize: 13,
  },
  empty: {
    border: "var(--lst-border)",
    padding: 18,
    color: "var(--lst-ink-55)",
    fontSize: 13,
    marginBottom: 8,
  },
};
