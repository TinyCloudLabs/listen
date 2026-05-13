import { useState, useEffect, type FC } from "react";
import type { ApiClient } from "@listen/client";
import { TranscriptPane, type TranscriptSentence } from "./TranscriptPane";
import { NotesPane } from "./NotesPane";
import {
  readConversationDetailCache,
  writeConversationDetailCache,
} from "../conversationPageCache";

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
  source_url: string | null;
  started_at: string;
  duration_secs: number;
  summary: string | null;
  metadata: Record<string, unknown>;
}

interface DetailResponse {
  conversation: ConversationData;
  participants: Participant[];
  transcript: TranscriptSentence[] | null;
}

interface ConversationDetailProps {
  api: ApiClient;
  conversationId: string;
  onBack: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatDurationClock(secs: number): string {
  const mins = Math.floor(secs / 60);
  const remainder = Math.floor(secs % 60);
  return `${mins}:${String(remainder).padStart(2, "0")}`;
}

function formatDurationLabel(secs: number): string {
  const mins = Math.max(1, Math.round(secs / 60));
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${hrs} hr` : `${hrs} hr ${rem} min`;
}

function formatBreadcrumbDate(isoString: string): string {
  return new Date(isoString)
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}

function sourceLabel(source: string): string {
  switch (source) {
    case "google-meet":
      return "GOOGLE MEET";
    case "fireflies":
      return "FIREFLIES";
    case "manual":
      return "MANUAL";
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

/** Render markdown-ish summary text (newlines, bullets, bold) as HTML. */
function renderSummary(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^[-*]\s+/gm, "\u2022 ")
    .replace(/\n/g, "<br />");
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
}) => {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const cached = readConversationDetailCache<DetailResponse>(conversationId);
    let cancelled = false;

    setError(null);
    setNotice(null);
    if (cached) {
      setData(cached.data);
      setLoading(false);
    } else {
      setData(null);
      setLoading(true);
    }

    api
      .get<DetailResponse>(`/api/conversations/${conversationId}`)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        writeConversationDetailCache(conversationId, res);
      })
      .catch((err) => {
        if (cancelled) return;
        if (cached) {
          setNotice("Could not refresh cached conversation");
        } else {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, conversationId]);

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

  return (
    <section style={s.container}>
      {/* Top action bar */}
      <div style={s.actionBar}>
        <button style={s.backLink} onClick={onBack} type="button" aria-label="Back to inbox">
          <span style={s.chevL}>‹</span> Inbox
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
      </div>

      {/* Title block */}
      <div style={s.titleBlock}>
        <h1 style={s.title}>{conversation.title}</h1>
        <div style={s.titleMetaRow}>
          {participants.length > 0 && (
            <div style={s.avatarStack}>
              {participants.slice(0, 5).map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    ...s.avatar,
                    marginLeft: i === 0 ? 0 : -7,
                    zIndex: participants.length - i,
                  }}
                  title={p.name}
                >
                  {initialsFor(p.name)}
                </div>
              ))}
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
      </div>

      {notice && <div style={s.notice}>{notice}</div>}

      {/* 3-pane body */}
      <div style={s.body}>
        {/* Summary pane */}
        <aside style={s.summaryPane}>
          <div style={s.summaryHead}>
            <span style={s.eyebrow}>— summary</span>
            <span style={s.summaryActions}>
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

          {conversation.summary ? (
            <div
              style={s.summaryBody}
              dangerouslySetInnerHTML={{ __html: renderSummary(conversation.summary) }}
            />
          ) : (
            <p style={s.summaryEmpty}>No summary yet.</p>
          )}
        </aside>

        {/* Transcript pane */}
        <TranscriptPane transcript={transcript} />

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

  // title block
  titleBlock: {
    padding: "24px 32px 16px",
    borderBottom: "var(--lst-border)",
  },
  title: {
    fontFamily: FONT,
    fontSize: 38,
    fontWeight: 400,
    color: "var(--lst-blue)",
    margin: "0 0 8px",
    letterSpacing: "-0.015em",
    lineHeight: 1.06,
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
    border: "var(--lst-border)",
    background: "var(--lst-bg)",
    color: "var(--lst-blue)",
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
    textTransform: "uppercase",
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
  notice: {
    padding: "8px 32px",
    borderBottom: "var(--lst-border)",
    background: "var(--lst-ink-08)",
    color: "var(--lst-blue)",
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },

  // body
  body: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "340px minmax(0, 1fr) 320px",
    overflow: "hidden",
    minHeight: 0,
  },

  // summary pane
  summaryPane: {
    borderRight: "var(--lst-border)",
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
  },
  eyebrow: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
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
    fontSize: 14,
    color: "var(--lst-blue)",
    lineHeight: 1.6,
    margin: 0,
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
