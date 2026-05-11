import { useState, useEffect, type FC } from "react";
import type { ApiClient } from "@tinyboilerplate/client";
import { TranscriptPane, type TranscriptSentence } from "./TranscriptPane";
import { NotesPane } from "./NotesPane";

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

/** Render markdown-ish summary text (newlines, bullets, bold) as HTML. */
function renderSummary(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^[-*]\s+/gm, "\u2022 ")
    .replace(/\n/g, "<br />");
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
  const [starred, setStarred] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get<DetailResponse>(`/api/conversations/${conversationId}`)
      .then((res) => setData(res))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [api, conversationId]);

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

  return (
    <section style={s.container}>
      {/* Top action bar */}
      <div style={s.actionBar}>
        <button style={s.backLink} onClick={onBack} type="button">
          <span style={s.chevL}>‹</span> Inbox
        </button>
        <span style={s.breadDot}>/</span>
        <span style={s.breadMeta}>
          {sourceLabel(conversation.source)} · {formatBreadcrumbDate(conversation.started_at)} ·{" "}
          {formatDurationClock(conversation.duration_secs)}
        </span>
        <span style={s.spacer} />
        <button
          style={{
            ...s.actionBtn,
            ...(starred ? s.actionBtnActive : {}),
          }}
          onClick={() => setStarred((v) => !v)}
          type="button"
        >
          ★ {starred ? "Starred" : "Star"}
        </button>
        {conversation.source_url ? (
          <a
            style={{ ...s.actionBtn, textDecoration: "none" }}
            href={conversation.source_url}
            target="_blank"
            rel="noreferrer"
          >
            ⤴ Share
          </a>
        ) : (
          <button style={s.actionBtn} type="button">
            ⤴ Share
          </button>
        )}
        <button style={s.actionBtn} type="button">
          → Export
        </button>
        <button style={s.iconActionBtn} type="button" aria-label="More">
          ⋯
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
            <span style={s.participantNames}>{participants.map((p) => p.name).join(", ")}</span>
          )}
          <span style={s.vRule} />
          <span style={s.chip}>#{conversation.source.replace(/-/g, "")}</span>
          <span style={{ ...s.chip, borderStyle: "dashed" }}>+ tag</span>
          <span style={s.spacer} />
          <button style={s.actionBtn} type="button">
            ✦ Ask this transcript
          </button>
        </div>
      </div>

      {/* 3-pane body */}
      <div style={s.body}>
        {/* Summary pane */}
        <aside style={s.summaryPane}>
          <div style={s.summaryHead}>
            <span style={s.eyebrow}>— summary</span>
            <span style={s.summaryActions}>
              <button style={s.tinyBtn} type="button">
                Copy
              </button>
              <button style={s.tinyBtn} type="button">
                ✦ Re-gen
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
        <TranscriptPane transcript={transcript} durationSecs={conversation.duration_secs} />

        {/* Notes pane */}
        <NotesPane />
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
  actionBtnActive: {
    background: "var(--lst-blue)",
    color: "var(--lst-bg)",
  },
  iconActionBtn: {
    fontFamily: FONT,
    border: "var(--lst-border)",
    borderRadius: 999,
    background: "transparent",
    color: "var(--lst-blue)",
    width: 26,
    height: 26,
    padding: 0,
    cursor: "pointer",
    fontSize: 14,
    lineHeight: 1,
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
