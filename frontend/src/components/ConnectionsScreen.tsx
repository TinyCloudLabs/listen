import { useState, type FC } from "react";
import type { ApiClient } from "@listen/client";

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
  const [busySource, setBusySource] = useState<SourceId | "all" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const openTranscriptImport = onAddTranscript ?? onAddSource;

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

  const syncSource = async (source: SourceId) => {
    setBusySource(source);
    setError(null);
    setMessage(null);
    try {
      if (source === "fireflies") {
        await api.post("/api/sync/fireflies", { mode: "incremental" });
      } else if (source === "google-meet") {
        await api.post("/api/sync/google-meet");
      }
      setMessage(`${sources.find((item) => item.id === source)?.name ?? "Source"} synced`);
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
            await api.post("/api/sync/fireflies", { mode: "incremental" });
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

  return (
    <section style={s.shell}>
      <header style={s.header}>
        <span style={s.eyebrow}>— settings / sources</span>
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
        <p style={s.lede}>Manage synced sources or import a transcript into your Listen inbox.</p>
      </header>

      {message && <div style={s.notice}>{message}</div>}
      {error && <div style={s.error}>{error}</div>}

      <div style={s.body}>
        <div style={s.sectionLabelRow}>
          <span style={s.sectionLabel}>— connected · {connected.length}</span>
          <span style={s.sectionRule} />
        </div>

        {connected.length === 0 ? (
          <div style={s.empty}>No sources connected yet.</div>
        ) : (
          connected.map((source) => (
            <div key={source.id} style={s.sourceCard}>
              <span style={source.ready ? s.markLive : s.markWarn} />
              <div>
                <div style={s.sourceName}>{source.name}</div>
                <div style={s.sourceMeta}>
                  {source.ready ? "READY" : "NEEDS ACCESS"} · {source.description}
                </div>
              </div>
              <span style={source.ready ? s.chipSolid : s.chipGhost}>
                {source.ready ? "Live" : "Finish setup"}
              </span>
              <div style={s.rowActions}>
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
          <span style={s.sectionLabel}>— available · {available.length + 1}</span>
          <span style={s.sectionRule} />
        </div>

        <div style={s.availableCard}>
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

        {available.length === 0 ? (
          <div style={s.empty}>All provider sources are connected.</div>
        ) : (
          available.map((source) => (
            <div key={source.id} style={s.availableCard}>
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
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginTop: 6,
  },
  title: {
    fontSize: 38,
    lineHeight: 1.05,
    fontWeight: 400,
    margin: 0,
  },
  headerActions: {
    display: "flex",
    gap: 8,
  },
  lede: {
    margin: "10px 0 0",
    color: "var(--lst-ink-70)",
    fontSize: 14,
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
    letterSpacing: "0.08em",
    textTransform: "uppercase",
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
    gridTemplateColumns: "28px minmax(0, 1fr) auto auto",
    gap: 14,
    alignItems: "center",
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
    background: "var(--lst-blue)",
  },
  markWarn: {
    width: 20,
    height: 20,
    borderRadius: 4,
    border: "var(--lst-border)",
    background: "var(--lst-ink-08)",
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
    background: "var(--lst-blue)",
    borderRadius: 999,
    padding: "5px 10px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  chipGhost: {
    fontFamily: MONO,
    fontSize: 10,
    color: "var(--lst-blue)",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "5px 10px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  rowActions: {
    display: "flex",
    gap: 8,
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
    borderBottom: "var(--lst-border)",
    background: "var(--lst-ink-08)",
    color: "var(--lst-blue)",
    fontSize: 13,
  },
  error: {
    padding: "9px 32px",
    borderBottom: "var(--lst-border)",
    background: "var(--lst-ink-08)",
    color: "var(--lst-blue)",
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
