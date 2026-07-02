import { useState, useEffect, type FC } from "react";
import type { ApiClient } from "@listen/client";
import { TranscriptPane, speakerColor, type TranscriptSentence } from "./TranscriptPane";
import { NotesPane } from "./NotesPane";
import {
  readConversationDetailCache,
  writeConversationDetailCache,
} from "../conversationPageCache";
import { normalizeConversationMetadata, normalizeTranscript } from "../lib/tinycloudConversations";

// ── Types ────────────────────────────────────────────────────────────

interface Participant {
  id: string;
  name: string;
  email: string | null;
  speaker_label: string;
}

interface ConversationData {
  id: string;
  title: string;
  source: string;
  source_id: string | null;
  source_url: string | null;
  started_at: string | null;
  duration_secs: number | null;
  summary: string | null;
  metadata: Record<string, unknown>;
}

interface TranscriptStatus {
  available: boolean;
  missing: boolean;
  repairable: boolean;
  reason?: string;
  message?: string;
}

interface DetailResponse {
  conversation: ConversationData;
  participants: Participant[];
  transcript: TranscriptSentence[] | null;
  transcript_status?: TranscriptStatus;
}

interface ConversationDetailProps {
  api: ApiClient;
  conversationId: string;
  onBack: () => void;
  backLabel?: string;
  onShare?: (id: string) => void;
  cacheMode?: "default" | "disabled";
}

const DETAIL_LOAD_TIMEOUT_MS = 45_000;

// ── Helpers ──────────────────────────────────────────────────────────

function formatDurationClock(secs: number | null): string {
  if (secs == null || Number.isNaN(secs)) return "—";
  const mins = Math.floor(secs / 60);
  const remainder = Math.floor(secs % 60);
  return `${mins}:${String(remainder).padStart(2, "0")}`;
}

function formatDurationLabel(secs: number | null): string {
  if (secs == null || Number.isNaN(secs)) return "—";
  const mins = Math.max(1, Math.round(secs / 60));
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${hrs} hr` : `${hrs} hr ${rem} min`;
}

function formatBreadcrumbDate(isoString: string | null): string {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
}

function sourceLabel(source: string): string {
  switch (source) {
    case "google-meet":
      return "GOOGLE MEET";
    case "fireflies":
      return "FIREFLIES";
    case "manual":
      return "MANUAL";
    case "recorder":
      return "RECORDER";
    case "voice_memos":
      return "VOICE MEMOS";
    case "voxterm":
      return "VOXTERM";
    case "soundcore_sync":
      return "SOUNDCORE";
    case "granola":
      return "GRANOLA";
    case "otter":
      return "OTTER";
    default:
      return source.toUpperCase();
  }
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function sourceLinkLabel(source: string): string {
  switch (source) {
    case "fireflies":
      return "View on Fireflies";
    case "google-meet":
      return "View transcript";
    case "manual":
      return "Open source";
    default:
      return "Open source";
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInlineMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
    );
}

/** Render a safe, focused subset of markdown used by provider summaries. */
function renderSummary(text: string): string {
  const html: string[] = [];
  const paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let codeLines: string[] | null = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    html.push(`<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph.length = 0;
  };

  const closeList = () => {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = null;
  };

  const ensureList = (nextType: "ul" | "ol") => {
    flushParagraph();
    if (listType === nextType) return;
    closeList();
    listType = nextType;
    html.push(`<${nextType}>`);
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (codeLines) {
        html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = null;
      } else {
        flushParagraph();
        closeList();
        codeLines = [];
      }
      continue;
    }

    if (codeLines) {
      codeLines.push(line);
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1]!.length;
      html.push(`<h${level}>${renderInlineMarkdown(heading[2]!)}</h${level}>`);
      continue;
    }

    const unordered = trimmed.match(/^[-*]\s+(.+)$/);
    if (unordered) {
      ensureList("ul");
      html.push(`<li>${renderInlineMarkdown(unordered[1]!)}</li>`);
      continue;
    }

    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      ensureList("ol");
      html.push(`<li>${renderInlineMarkdown(ordered[1]!)}</li>`);
      continue;
    }

    const quote = trimmed.match(/^>\s?(.+)$/);
    if (quote) {
      flushParagraph();
      closeList();
      html.push(`<blockquote>${renderInlineMarkdown(quote[1]!)}</blockquote>`);
      continue;
    }

    closeList();
    paragraph.push(trimmed);
  }

  if (codeLines) html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  flushParagraph();
  closeList();

  return html.join("");
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function transcriptText(transcript: TranscriptSentence[] | null): string {
  if (!transcript?.length) return "No transcript available.";
  return transcript
    .map((line) => {
      const speaker = line.speaker_name || "Speaker";
      return `[${formatDurationClock(line.start_time)}] ${speaker}: ${line.text}`;
    })
    .join("\n");
}

function exportText(
  conversation: ConversationData,
  transcript: TranscriptSentence[] | null,
): string {
  return [
    conversation.title,
    `${sourceLabel(conversation.source)} · ${formatBreadcrumbDate(conversation.started_at)} · ${formatDurationLabel(conversation.duration_secs)}`,
    "",
    "Summary",
    conversation.summary || "No summary yet.",
    "",
    "Transcript",
    transcriptText(transcript),
  ].join("\n");
}

function audioPlaybackUrl(conversation: ConversationData): string | null {
  const value = conversation.metadata.audio_playback_url;
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizeDetailResponse(response: DetailResponse): DetailResponse {
  return {
    ...response,
    conversation: {
      ...response.conversation,
      metadata: normalizeConversationMetadata(response.conversation.metadata),
    },
    transcript: normalizeTranscript(response.transcript),
    transcript_status: response.transcript_status,
  };
}

async function withDetailTimeout<T>(promise: Promise<T>, conversationId: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(
      () =>
        reject(
          new Error(
            `Timed out loading conversation ${conversationId} after ${DETAIL_LOAD_TIMEOUT_MS / 1000}s`,
          ),
        ),
      DETAIL_LOAD_TIMEOUT_MS,
    );
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Component ────────────────────────────────────────────────────────

export const ConversationDetail: FC<ConversationDetailProps> = ({
  api,
  conversationId,
  onBack,
  backLabel = "Inbox",
  onShare,
  cacheMode = "default",
}) => {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [repairingTranscript, setRepairingTranscript] = useState(false);
  const [summaryView, setSummaryView] = useState<"formatted" | "markdown">("formatted");

  useEffect(() => {
    const useCache = cacheMode !== "disabled";
    const cached = useCache ? readConversationDetailCache<DetailResponse>(conversationId) : null;
    let cancelled = false;
    const path = `/api/conversations/${conversationId}`;
    const started = Date.now();

    setError(null);
    setNotice(null);
    setRepairingTranscript(false);
    setSummaryView("formatted");
    if (cached) {
      setData(normalizeDetailResponse(cached.data));
      setLoading(false);
    } else {
      setData(null);
      setLoading(true);
    }

    console.info("[conversation-detail] loading", {
      conversationId,
      path,
      cached: Boolean(cached),
    });

    withDetailTimeout(api.get<DetailResponse>(path), conversationId)
      .then((res) => {
        if (cancelled) return;
        const normalized = normalizeDetailResponse(res);
        setData(normalized);
        if (useCache) {
          writeConversationDetailCache(conversationId, normalized);
        }
        console.info("[conversation-detail] loaded", {
          conversationId,
          ms: Date.now() - started,
          transcriptCount: normalized.transcript?.length ?? 0,
          transcriptStatus: normalized.transcript_status?.reason ?? "available",
        });
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        console.error("[conversation-detail] failed", {
          conversationId,
          path,
          ms: Date.now() - started,
          error: message,
        });
        if (cached) {
          setNotice("Could not refresh cached conversation");
        } else {
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, cacheMode, conversationId]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 1800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (loading) {
    return (
      <div style={s.loadingCard}>
        <div style={s.loadingDots}>
          <span style={{ ...s.loadingDot, animationDelay: "0s" }} />
          <span style={{ ...s.loadingDot, animationDelay: "0.15s" }} />
          <span style={{ ...s.loadingDot, animationDelay: "0.3s" }} />
        </div>
        <p style={s.loadingText}>Loading conversation</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <button style={s.backBtn} onClick={onBack}>
          &larr; Back
        </button>
        <div style={s.errorCard}>{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const { conversation, participants, transcript } = data;
  const audioUrl = audioPlaybackUrl(conversation);
  const transcriptStatus = data.transcript_status;

  const copySummary = async () => {
    if (!conversation.summary) return;
    await copyText(`${conversation.title}\n${conversation.summary}`);
    setNotice("Summary copied");
  };

  const exportConversation = () => {
    downloadText(
      `${conversation.title.replace(/[^\w.-]+/g, "-").toLowerCase() || "conversation"}.txt`,
      exportText(conversation, transcript),
    );
    setNotice("Transcript exported");
  };

  const repairTranscript = async () => {
    setRepairingTranscript(true);
    setNotice(null);
    try {
      const repaired = await api.post<Pick<DetailResponse, "transcript" | "transcript_status">>(
        `/api/conversations/${conversation.id}/transcript/repair`,
      );
      const next: DetailResponse = normalizeDetailResponse({
        ...data,
        transcript: repaired.transcript,
        transcript_status: repaired.transcript_status,
      });
      setData(next);
      writeConversationDetailCache(conversation.id, next);
      setNotice("Transcript recovered");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setRepairingTranscript(false);
    }
  };

  return (
    <section style={s.container}>
      {/* Top action bar */}
      <div style={s.actionBar}>
        <button style={s.backLink} onClick={onBack} type="button" aria-label="Back to inbox">
          <span style={s.chevL}>‹</span> {backLabel}
        </button>
        <span style={s.breadDot}>/</span>
        <span style={s.breadMeta}>
          <span>{sourceLabel(conversation.source)}</span>
          <span>·</span>
          <span>{formatBreadcrumbDate(conversation.started_at)}</span>
          <span>·</span>
          <span>{formatDurationLabel(conversation.duration_secs)}</span>
        </span>
        <span style={s.spacer} />
        {conversation.source_url && (
          <a
            style={{ ...s.actionBtn, textDecoration: "none" }}
            href={conversation.source_url}
            target="_blank"
            rel="noreferrer"
          >
            {sourceLinkLabel(conversation.source)}
          </a>
        )}
        <button style={s.actionBtn} type="button" onClick={exportConversation}>
          Export
        </button>
        {onShare && (
          <button style={s.actionBtn} type="button" onClick={() => onShare(conversation.id)}>
            Share
          </button>
        )}
      </div>

      {/* Title block */}
      <div style={s.titleBlock}>
        <h1 style={s.title}>{conversation.title}</h1>
        <div style={s.titleMetaRow}>
          {participants.length > 0 && (
            <div style={s.avatarStack}>
              {participants.slice(0, 5).map((p, i) => {
                const color = speakerColor(p.name);
                return (
                  <div
                    key={p.id}
                    style={{
                      ...s.avatar,
                      marginLeft: i === 0 ? 0 : -7,
                      zIndex: participants.length - i,
                      border: `1px solid ${color.ink}`,
                      background: `linear-gradient(${color.soft}, ${color.soft}), var(--lst-bg)`,
                      color: color.ink,
                    }}
                    title={p.name}
                  >
                    {initialsFor(p.name)}
                  </div>
                );
              })}
            </div>
          )}
          {participants.length > 0 && (
            <span style={s.participantCount}>
              {participants.length} participant{participants.length === 1 ? "" : "s"}
            </span>
          )}
          {participants.length > 0 && (
            <span style={s.participantNames}>{participants.map((p) => p.name).join(", ")}</span>
          )}
          <span style={s.vRule} />
          <span style={s.chip}>#{conversation.source.replace(/-/g, "")}</span>
        </div>
        {audioUrl && (
          <div style={s.audioRow}>
            <audio style={s.audioPlayer} controls src={audioUrl} preload="metadata">
              <a href={audioUrl}>Play recording</a>
            </audio>
          </div>
        )}
      </div>

      {notice && <div style={s.notice}>{notice}</div>}

      {/* 3-pane body */}
      <div style={s.body}>
        {/* Summary pane */}
        <aside style={s.summaryPane}>
          <div style={s.summaryHead}>
            <span style={s.eyebrow}>· summary</span>
            <span style={s.summaryActions}>
              {conversation.summary && (
                <span style={s.viewToggle} aria-label="Summary view">
                  <button
                    style={{
                      ...s.viewToggleBtn,
                      ...(summaryView === "formatted" ? s.viewToggleBtnActive : {}),
                    }}
                    type="button"
                    onClick={() => setSummaryView("formatted")}
                    aria-pressed={summaryView === "formatted"}
                  >
                    Rendered
                  </button>
                  <button
                    style={{
                      ...s.viewToggleBtn,
                      ...(summaryView === "markdown" ? s.viewToggleBtnActive : {}),
                    }}
                    type="button"
                    onClick={() => setSummaryView("markdown")}
                    aria-pressed={summaryView === "markdown"}
                  >
                    Markdown
                  </button>
                </span>
              )}
              <button
                style={{ ...s.tinyBtn, ...(!conversation.summary ? s.tinyBtnDisabled : {}) }}
                type="button"
                disabled={!conversation.summary}
                onClick={copySummary}
              >
                Copy
              </button>
            </span>
          </div>

          {conversation.summary && summaryView === "formatted" ? (
            <div
              style={s.summaryBody}
              dangerouslySetInnerHTML={{ __html: renderSummary(conversation.summary) }}
            />
          ) : conversation.summary ? (
            <pre style={s.summaryMarkdown}>{conversation.summary}</pre>
          ) : (
            <p style={s.summaryEmpty}>No summary yet.</p>
          )}
        </aside>

        {/* Transcript pane */}
        <div style={s.transcriptColumn}>
          {transcriptStatus && !transcriptStatus.available && (
            <div style={s.recoveryCard}>
              <div>
                <div style={s.recoveryTitle}>
                  {transcriptStatus.missing
                    ? "Transcript content is missing"
                    : "Transcript unavailable"}
                </div>
                <div style={s.recoveryCopy}>
                  {transcriptStatus.missing
                    ? "The conversation metadata loaded, but the transcript blob is not in TinyCloud KV."
                    : (transcriptStatus.message ?? "Listen could not read the transcript blob.")}
                </div>
              </div>
              {transcriptStatus.repairable && (
                <button
                  style={{ ...s.actionBtn, ...(repairingTranscript ? s.actionBtnDisabled : {}) }}
                  type="button"
                  disabled={repairingTranscript}
                  onClick={() => void repairTranscript()}
                >
                  {repairingTranscript ? "Recovering..." : "Recover from Fireflies"}
                </button>
              )}
            </div>
          )}
          <TranscriptPane transcript={transcript} />
        </div>

        {/* Notes pane */}
        <NotesPane conversationId={conversation.id} />
      </div>
    </section>
  );
};

// ── Styles ──────────────────────────────────────────────────────────

const FONT = "var(--lst-font)";
const MONO = "var(--lst-mono)";

const s: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: FONT,
    display: "flex",
    flexDirection: "column" as const,
    border: "var(--lst-border)",
    background: "var(--lst-bg)",
    animation: "fadeSlideIn 0.3s ease-out",
    minHeight: 720,
  },

  // top action bar
  actionBar: {
    padding: "14px 32px",
    borderBottom: "var(--lst-border)",
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  backLink: {
    fontFamily: FONT,
    border: "none",
    background: "transparent",
    color: "var(--lst-blue)",
    fontSize: 13,
    fontWeight: 500,
    padding: "4px 0",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  },
  chevL: { fontSize: 18, lineHeight: 1 },
  breadDot: { color: "var(--lst-ink-35)", fontSize: 13 },
  breadMeta: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.06em",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  spacer: { flex: 1 },
  actionBtn: {
    fontFamily: FONT,
    border: "var(--lst-border)",
    borderRadius: 999,
    background: "transparent",
    color: "var(--lst-blue)",
    padding: "6px 14px",
    fontSize: 12.5,
    fontWeight: 500,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap" as const,
  },
  actionBtnDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },

  // title block
  titleBlock: {
    padding: "24px 32px 16px",
    borderBottom: "var(--lst-border)",
  },
  title: {
    fontFamily: "var(--lst-font-display)",
    fontSize: "var(--lst-type-display)",
    fontWeight: 400,
    color: "var(--lst-blue)",
    margin: "0 0 8px",
    letterSpacing: "-0.015em",
    lineHeight: "var(--lst-leading-tight)",
  },
  titleMetaRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap" as const,
  },
  avatarStack: {
    display: "flex",
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 9.5,
    fontFamily: MONO,
    letterSpacing: "0.04em",
  },
  participantNames: {
    fontFamily: FONT,
    fontSize: 13,
    color: "var(--lst-ink-70)",
  },
  participantCount: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.06em",
    textTransform: "lowercase",
  },
  vRule: {
    width: 1,
    height: 14,
    background: "var(--lst-rule-soft)",
  },
  chip: {
    fontFamily: FONT,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "var(--lst-border)",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 500,
    color: "var(--lst-blue)",
  },
  audioRow: {
    marginTop: 14,
  },
  audioPlayer: {
    display: "block",
    width: "min(520px, 100%)",
    height: 36,
  },
  notice: {
    padding: "8px 32px",
    borderBottom: "var(--lst-border)",
    background: "var(--lst-ink-08)",
    color: "var(--lst-blue)",
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: "0.06em",
    textTransform: "lowercase",
  },

  // body
  body: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "340px minmax(0, 1fr) 320px",
    overflow: "hidden",
    minHeight: 0,
  },
  transcriptColumn: {
    display: "flex",
    flexDirection: "column" as const,
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
  },
  recoveryCard: {
    borderBottom: "var(--lst-border)",
    background: "var(--lst-ink-08)",
    padding: "14px 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  recoveryTitle: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: 600,
    color: "var(--lst-blue)",
    marginBottom: 3,
  },
  recoveryCopy: {
    fontFamily: FONT,
    fontSize: 12,
    color: "var(--lst-ink-55)",
    lineHeight: 1.4,
  },

  // summary pane
  summaryPane: {
    borderRight: "var(--lst-hair)",
    overflow: "auto",
    padding: "20px 22px",
    minWidth: 0,
    background: "var(--lst-ink-08)",
  },
  summaryHead: {
    display: "flex",
    alignItems: "center",
    marginBottom: 14,
  },
  summaryActions: {
    marginLeft: "auto",
    display: "flex",
    gap: 6,
    alignItems: "center",
  },
  viewToggle: {
    display: "inline-flex",
    border: "var(--lst-border)",
    borderRadius: 999,
    overflow: "hidden",
  },
  viewToggleBtn: {
    fontFamily: FONT,
    fontSize: 10.5,
    fontWeight: 500,
    color: "var(--lst-ink-55)",
    background: "transparent",
    border: "none",
    borderRight: "var(--lst-hair)",
    padding: "3px 8px",
    cursor: "pointer",
  },
  viewToggleBtnActive: {
    color: "var(--lst-blue)",
    background: "var(--lst-bg)",
  },
  eyebrow: {
    fontFamily: "var(--lst-font-eyebrow)",
    fontSize: "var(--lst-type-eyebrow)",
    color: "var(--lst-ink-55)",
    letterSpacing: "0.06em",
    textTransform: "lowercase" as const,
  },
  tinyBtn: {
    fontFamily: FONT,
    fontSize: 11,
    fontWeight: 500,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "3px 10px",
    cursor: "pointer",
  },
  tinyBtnDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
  summaryBody: {
    fontFamily: FONT,
    fontSize: "var(--lst-type-body)",
    color: "var(--lst-blue)",
    lineHeight: "var(--lst-leading-body)",
    margin: 0,
  },
  summaryMarkdown: {
    fontFamily: MONO,
    fontSize: 11.5,
    color: "var(--lst-blue)",
    lineHeight: 1.55,
    whiteSpace: "pre-wrap" as const,
    overflowWrap: "anywhere" as const,
    margin: 0,
    border: "var(--lst-border)",
    borderRadius: 4,
    background: "var(--lst-bg)",
    padding: 12,
  },
  summaryEmpty: {
    fontFamily: FONT,
    fontSize: 13,
    color: "var(--lst-ink-55)",
    fontStyle: "italic" as const,
  },

  // loading / error
  loadingCard: {
    fontFamily: FONT,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 14,
    padding: "40px 20px",
    background: "var(--lst-bg)",
    border: "var(--lst-border)",
    borderRadius: 0,
    animation: "fadeSlideIn 0.3s ease-out",
  },
  loadingDots: {
    display: "flex",
    gap: 6,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "var(--lst-blue)",
    animation: "syncPulse 1s ease-in-out infinite",
  },
  loadingText: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: 500,
    color: "var(--lst-ink-70)",
    margin: 0,
  },
  backBtn: {
    fontFamily: FONT,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "6px 14px",
    fontSize: 13,
    fontWeight: 500,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "var(--lst-border)",
    borderRadius: 999,
    cursor: "pointer",
    marginBottom: 16,
  },
  errorCard: {
    fontFamily: FONT,
    fontSize: 13,
    color: "var(--lst-blue)",
    background: "var(--lst-ink-08)",
    padding: "10px 14px",
    border: "var(--lst-border)",
    borderRadius: 0,
  },
};
