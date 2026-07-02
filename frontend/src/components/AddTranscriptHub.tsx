import { useEffect, useMemo, useState, type FC } from "react";
import type { ApiClient } from "@listen/client";
import { previewTranscriptParse } from "@listen/core";
import { MAX_TRANSCRIPTION_FILE_BYTES, fileToBase64, formatFileSize } from "../lib/fileEncoding";

// One door for every way a transcript gets into Listen: paste text, upload a
// recording, connect a sync source, or use the CLI importer. Reachable from
// the shell "Add" CTA anywhere in the app — adding a transcript is no longer
// a trip through Settings.

type HubTab = "paste" | "upload" | "connect" | "cli";

interface ImportResponse {
  conversationId: string;
  title: string;
}

interface AddTranscriptHubProps {
  api: ApiClient;
  transcriptionReady: { assemblyai: boolean; deepgram: boolean };
  sourcesConnected: {
    fireflies: boolean;
    granola: boolean;
    soundcore: boolean;
    googleMeet: boolean;
  };
  onClose: () => void;
  onImported: (conversationId: string) => void;
  onOpenSources: () => void;
}

const TABS: Array<{ key: HubTab; label: string }> = [
  { key: "paste", label: "Paste text" },
  { key: "upload", label: "Upload audio" },
  { key: "connect", label: "Connect a source" },
  { key: "cli", label: "CLI & recorder" },
];

const CLI_COMMANDS = `npm install --global @tinycloud/listen-cli
listen init && listen auth
listen scan /Volumes/MIC\\ MINI
listen transcribe --source recorder
listen upload --publish`;

function nowForDatetimeLocal(): string {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function formatPreviewDuration(secs: number): string {
  if (secs >= 3600) return `${(secs / 3600).toFixed(1)} hr`;
  if (secs >= 60) return `${Math.round(secs / 60)} min`;
  return `${Math.round(secs)} sec`;
}

export const AddTranscriptHub: FC<AddTranscriptHubProps> = ({
  api,
  transcriptionReady,
  sourcesConnected,
  onClose,
  onImported,
  onOpenSources,
}) => {
  const [tab, setTab] = useState<HubTab>("paste");

  // Paste tab
  const [pasteText, setPasteText] = useState("");
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteStartedAt, setPasteStartedAt] = useState(nowForDatetimeLocal);
  const [pasteSaving, setPasteSaving] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Upload tab
  const providerOptions = (["assemblyai", "deepgram"] as const).filter(
    (provider) => transcriptionReady[provider],
  );
  const [provider, setProvider] = useState<"assemblyai" | "deepgram">(
    providerOptions[0] ?? "assemblyai",
  );
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSaving, setUploadSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const preview = useMemo(() => {
    const trimmed = pasteText.trim();
    if (!trimmed) return null;
    try {
      return previewTranscriptParse(trimmed);
    } catch {
      return null;
    }
  }, [pasteText]);

  const suggestedTitle = useMemo(() => {
    const trimmed = pasteText.trim();
    if (!trimmed) return "";
    const firstLine = trimmed.split(/\r?\n/, 1)[0] ?? "";
    const withoutMarkup = firstLine
      .replace(/^\[?\d{1,2}:\d{2}(?::\d{2})?(?:[,.]\d+)?\]?\s*/, "")
      .replace(/^[^:]{1,80}:\s*/, "")
      .trim();
    return withoutMarkup.slice(0, 60) || "Imported transcript";
  }, [pasteText]);

  const submitPaste = async () => {
    const transcriptText = pasteText.trim();
    if (!transcriptText || pasteSaving) return;
    setPasteSaving(true);
    setPasteError(null);
    try {
      const result = await api.post<ImportResponse>("/api/conversations/import", {
        title: pasteTitle.trim() || suggestedTitle,
        transcriptText,
        startedAt: pasteStartedAt ? new Date(pasteStartedAt).toISOString() : undefined,
      });
      onImported(result.conversationId);
    } catch (err) {
      setPasteError(err instanceof Error ? err.message : String(err));
    } finally {
      setPasteSaving(false);
    }
  };

  const uploadTooLarge = Boolean(uploadFile && uploadFile.size > MAX_TRANSCRIPTION_FILE_BYTES);

  const submitUpload = async () => {
    if (!uploadFile || uploadTooLarge || uploadSaving || providerOptions.length === 0) return;
    setUploadSaving(true);
    setUploadError(null);
    try {
      const result = await api.post<ImportResponse>("/api/conversations/transcribe", {
        provider,
        title: uploadFile.name.replace(/\.[^.]+$/, ""),
        fileName: uploadFile.name,
        contentType: uploadFile.type || "application/octet-stream",
        contentBase64: await fileToBase64(uploadFile),
      });
      onImported(result.conversationId);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploadSaving(false);
    }
  };

  const copyCommands = async () => {
    try {
      await navigator.clipboard.writeText(CLI_COMMANDS.replace(/\\\\/g, "\\"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable — leave the text selectable.
    }
  };

  const connectRows: Array<{ label: string; connected: boolean }> = [
    { label: "Fireflies", connected: sourcesConnected.fireflies },
    { label: "Granola", connected: sourcesConnected.granola },
    { label: "Google Meet", connected: sourcesConnected.googleMeet },
    { label: "Soundcore", connected: sourcesConnected.soundcore },
  ];

  return (
    <div style={h.backdrop} role="presentation" onMouseDown={onClose}>
      <div
        style={h.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Add transcripts"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div style={h.header}>
          <div>
            <span style={h.eyebrow}>add to your library</span>
            <h2 style={h.title}>Add transcripts</h2>
          </div>
          <button type="button" style={h.iconButton} aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <div style={h.tabRow} role="tablist">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              style={{ ...h.tab, ...(tab === item.key ? h.tabActive : {}) }}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div style={h.body}>
          {tab === "paste" && (
            <div style={h.stack}>
              <label style={h.fieldLabel} htmlFor="add-hub-paste">
                Transcript text
              </label>
              <textarea
                id="add-hub-paste"
                style={h.textarea}
                placeholder={"[00:12] Hunter: Okay, let's start…\nDana: The beta build is behind…"}
                value={pasteText}
                onChange={(event) => setPasteText(event.target.value)}
                autoFocus
              />
              {preview && (
                <div style={h.previewCard} aria-live="polite">
                  <span style={h.previewLabel}>parse preview</span>
                  <span style={h.previewText}>
                    {preview.speakers.length} speaker{preview.speakers.length === 1 ? "" : "s"} (
                    {preview.speakers.slice(0, 4).join(", ")}
                    {preview.speakers.length > 4 ? "…" : ""}) · {preview.lineCount} line
                    {preview.lineCount === 1 ? "" : "s"} ·{" "}
                    {formatPreviewDuration(preview.durationSecs)}
                    {preview.hasTimestamps ? " · timestamps found" : " · no timestamps"}
                  </span>
                </div>
              )}
              <div style={h.fieldGrid}>
                <label style={h.fieldStack}>
                  <span style={h.fieldLabel}>Title</span>
                  <input
                    type="text"
                    style={h.input}
                    placeholder={suggestedTitle || "Untitled conversation"}
                    value={pasteTitle}
                    onChange={(event) => setPasteTitle(event.target.value)}
                  />
                </label>
                <label style={h.fieldStack}>
                  <span style={h.fieldLabel}>Recorded at</span>
                  <input
                    type="datetime-local"
                    style={h.input}
                    value={pasteStartedAt}
                    onChange={(event) => setPasteStartedAt(event.target.value)}
                  />
                </label>
              </div>
              {pasteError && <div style={h.errorCard}>{pasteError}</div>}
              <div style={h.actions}>
                <button
                  type="button"
                  style={{ ...h.primary, ...(!pasteText.trim() || pasteSaving ? h.disabled : {}) }}
                  disabled={!pasteText.trim() || pasteSaving}
                  onClick={() => void submitPaste()}
                >
                  {pasteSaving ? "Importing…" : "Import"}
                </button>
              </div>
            </div>
          )}

          {tab === "upload" && (
            <div style={h.stack}>
              {providerOptions.length === 0 ? (
                <div style={h.emptyState}>
                  <p style={h.mutedText}>
                    Transcribing a recording needs an AssemblyAI or Deepgram key with backend
                    access.
                  </p>
                  <button type="button" style={h.primary} onClick={onOpenSources}>
                    Set up a provider
                  </button>
                </div>
              ) : (
                <>
                  <div style={h.fieldGrid}>
                    <label style={h.fieldStack}>
                      <span style={h.fieldLabel}>Provider</span>
                      <select
                        style={h.input}
                        value={provider}
                        onChange={(event) =>
                          setProvider(event.target.value as "assemblyai" | "deepgram")
                        }
                      >
                        {providerOptions.map((option) => (
                          <option key={option} value={option}>
                            {option === "assemblyai" ? "AssemblyAI" : "Deepgram"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label style={h.fieldStack}>
                      <span style={h.fieldLabel}>
                        Media file · up to {formatFileSize(MAX_TRANSCRIPTION_FILE_BYTES)}
                      </span>
                      <input
                        type="file"
                        accept="audio/*,video/*"
                        style={h.input}
                        onChange={(event) => {
                          setUploadFile(event.currentTarget.files?.[0] ?? null);
                          setUploadError(null);
                        }}
                      />
                    </label>
                  </div>
                  {uploadFile && !uploadTooLarge && (
                    <div style={h.previewCard}>
                      <span style={h.previewText}>
                        {uploadFile.name} · {formatFileSize(uploadFile.size)}
                      </span>
                    </div>
                  )}
                  {uploadTooLarge && uploadFile && (
                    <div style={h.errorCard}>
                      {uploadFile.name} is {formatFileSize(uploadFile.size)} — uploads are limited
                      to {formatFileSize(MAX_TRANSCRIPTION_FILE_BYTES)}. Compress the recording or
                      use the CLI &amp; recorder tab for larger files.
                    </div>
                  )}
                  {uploadError && <div style={h.errorCard}>{uploadError}</div>}
                  <div style={h.actions}>
                    <button
                      type="button"
                      style={{
                        ...h.primary,
                        ...(!uploadFile || uploadTooLarge || uploadSaving ? h.disabled : {}),
                      }}
                      disabled={!uploadFile || uploadTooLarge || uploadSaving}
                      onClick={() => void submitUpload()}
                    >
                      {uploadSaving ? "Transcribing…" : "Transcribe"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "connect" && (
            <div style={h.stack}>
              {connectRows.map((row) => (
                <div key={row.label} style={h.connectRow}>
                  <span
                    style={{
                      ...h.connectDot,
                      background: row.connected ? "var(--lst-ok)" : "var(--lst-ink-08)",
                    }}
                    aria-hidden="true"
                  />
                  <span style={h.connectLabel}>{row.label}</span>
                  <span style={h.connectState}>
                    {row.connected ? "connected" : "not connected"}
                  </span>
                </div>
              ))}
              <div style={h.actions}>
                <button type="button" style={h.primary} onClick={onOpenSources}>
                  Open source setup
                </button>
              </div>
            </div>
          )}

          {tab === "cli" && (
            <div style={h.stack}>
              <p style={h.mutedText}>
                Hardware recorders, Voice Memos, and VoxTerm import through the listen-importer CLI.
                Published conversations appear in your library like any other source.
              </p>
              <pre style={h.codeBlock}>{CLI_COMMANDS}</pre>
              <div style={h.actions}>
                <button type="button" style={h.primary} onClick={() => void copyCommands()}>
                  {copied ? "Copied" : "Copy commands"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FONT = "var(--lst-font)";
const MONO = "var(--lst-mono)";

const h: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    background: "rgba(0, 0, 0, 0.22)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  dialog: {
    width: "min(620px, 100%)",
    maxHeight: "min(640px, 92vh)",
    overflowY: "auto",
    background: "var(--lst-bg)",
    border: "var(--lst-border)",
    color: "var(--lst-blue)",
    fontFamily: FONT,
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    padding: "22px 24px 16px",
  },
  eyebrow: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.08em",
    textTransform: "lowercase" as const,
  },
  title: {
    margin: "5px 0 0",
    fontSize: 20,
    lineHeight: 1.25,
    fontWeight: 600,
  },
  iconButton: {
    width: 30,
    height: 30,
    border: "var(--lst-border)",
    borderRadius: 999,
    background: "transparent",
    color: "var(--lst-blue)",
    cursor: "pointer",
    fontSize: 20,
    lineHeight: 1,
  },
  tabRow: {
    display: "flex",
    gap: 0,
    borderBottom: "var(--lst-border)",
    padding: "0 24px",
  },
  tab: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: "0.05em",
    textTransform: "lowercase" as const,
    color: "var(--lst-ink-55)",
    background: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    padding: "10px 12px",
    cursor: "pointer",
  },
  tabActive: {
    color: "var(--lst-blue)",
    borderBottom: "2px solid var(--lst-blue)",
  },
  body: {
    padding: "18px 24px 24px",
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  fieldStack: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
  fieldLabel: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: "0.07em",
    textTransform: "lowercase" as const,
    color: "var(--lst-ink-55)",
  },
  textarea: {
    minHeight: 130,
    resize: "vertical" as const,
    border: "var(--lst-border)",
    background: "transparent",
    color: "var(--lst-blue)",
    fontFamily: MONO,
    fontSize: 12,
    padding: "10px 12px",
  },
  input: {
    border: "var(--lst-border)",
    background: "transparent",
    color: "var(--lst-blue)",
    fontFamily: FONT,
    fontSize: 13,
    padding: "8px 10px",
  },
  previewCard: {
    border: "1px solid var(--lst-ok)",
    padding: "8px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  previewLabel: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "var(--lst-ok)",
  },
  previewText: {
    fontSize: 12.5,
    color: "var(--lst-blue)",
  },
  errorCard: {
    padding: "10px 12px",
    background: "var(--lst-alert-soft)",
    color: "var(--lst-alert)",
    fontSize: 12.5,
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
  },
  primary: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: "0.06em",
    textTransform: "lowercase" as const,
    color: "var(--lst-bg)",
    background: "var(--lst-blue)",
    border: "var(--lst-border)",
    padding: "8px 16px",
    cursor: "pointer",
  },
  disabled: {
    opacity: 0.45,
    cursor: "default",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    alignItems: "flex-start",
  },
  mutedText: {
    margin: 0,
    color: "var(--lst-ink-55)",
    fontSize: 13,
    lineHeight: 1.5,
  },
  codeBlock: {
    margin: 0,
    border: "var(--lst-border)",
    padding: "12px 14px",
    fontFamily: MONO,
    fontSize: 12,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap" as const,
    color: "var(--lst-blue)",
  },
  connectRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderBottom: "var(--lst-hair)",
    padding: "8px 2px",
  },
  connectDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
  connectLabel: {
    fontFamily: MONO,
    fontSize: 12,
    flex: 1,
  },
  connectState: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: "0.05em",
    textTransform: "lowercase" as const,
    color: "var(--lst-ink-55)",
  },
};
