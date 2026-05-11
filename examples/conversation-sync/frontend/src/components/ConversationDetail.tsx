import { useState, useEffect, type FC } from "react";
import type { ApiClient } from "@tinyboilerplate/client";

// ── Types ────────────────────────────────────────────────────────────

interface Sentence {
  index: number;
  speaker_id: string;
  speaker_name: string;
  text: string;
  start_time: number;
  end_time: number;
}

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
  transcript: Sentence[] | null;
}

interface ConversationDetailProps {
  api: ApiClient;
  conversationId: string;
  onBack: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatDuration(secs: number): string {
  if (secs >= 3600) return `${Math.round(secs / 3600)} hr`;
  return `${Math.round(secs / 60)} min`;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

interface TranscriptBlock {
  speakerName: string;
  startTime: number;
  text: string;
}

function groupSentences(sentences: Sentence[]): TranscriptBlock[] {
  const blocks: TranscriptBlock[] = [];
  for (const s of sentences) {
    const last = blocks[blocks.length - 1];
    if (last && last.speakerName === (s.speaker_name || "")) {
      last.text += " " + s.text;
    } else {
      blocks.push({ speakerName: s.speaker_name || "", startTime: s.start_time, text: s.text });
    }
  }
  return blocks;
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

const SPEAKER_COLORS = [
  "var(--lst-blue)",
  "var(--lst-blue)",
  "var(--lst-blue)",
  "var(--lst-blue)",
  "var(--lst-blue)",
  "var(--lst-blue)",
  "var(--lst-blue)",
  "var(--lst-blue)",
];

function getSpeakerColor(name: string, map: Map<string, number>): string {
  if (!name) return "var(--lst-blue)";
  if (!map.has(name)) map.set(name, map.size);
  return SPEAKER_COLORS[map.get(name)! % SPEAKER_COLORS.length];
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
  const blocks = transcript ? groupSentences(transcript) : [];
  const speakerMap = new Map<string, number>();

  return (
    <section style={s.container}>
      <button style={s.backBtn} onClick={onBack}>
        &larr; Back to conversations
      </button>

      {/* Header */}
      <div style={s.header}>
        <h2 style={s.title}>{conversation.title}</h2>
        <div style={s.metaRow}>
          <span style={s.metaMono}>{formatDate(conversation.started_at)}</span>
          <span style={s.metaDot}>&middot;</span>
          <span style={s.metaMono}>{formatDuration(conversation.duration_secs)}</span>
          {participants.length > 0 && (
            <>
              <span style={s.metaDot}>&middot;</span>
              <span style={s.metaText}>
                {participants.length} participant{participants.length !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>

        {participants.length > 0 && (
          <div style={s.chipRow}>
            {participants.map((p) => {
              const color = getSpeakerColor(p.name, speakerMap);
              return (
                <span key={p.id} style={s.chip}>
                  <span style={{ ...s.chipDot, backgroundColor: color }} />
                  {p.name}
                  {p.email && <span style={s.chipEmail}> ({p.email})</span>}
                </span>
              );
            })}
          </div>
        )}

        {conversation.source_url && (
          <a href={conversation.source_url} target="_blank" rel="noreferrer" style={s.externalLink}>
            {conversation.source === "google-meet"
              ? "View transcript"
              : conversation.source === "fireflies"
                ? "View on Fireflies"
                : "View source"}{" "}
            &rarr;
          </a>
        )}
      </div>

      <div style={conversation.summary ? s.detailGrid : s.detailGridSingle}>
        {/* Summary */}
        {conversation.summary && (
          <aside style={s.summaryCard}>
            <h3 style={s.sectionLabel}>Summary</h3>
            <div
              style={s.summaryText}
              dangerouslySetInnerHTML={{ __html: renderSummary(conversation.summary) }}
            />
          </aside>
        )}

        {/* Transcript */}
        <div style={s.transcriptSection}>
          <h3 style={s.sectionLabel}>Transcript</h3>
          {blocks.length === 0 ? (
            <p style={s.noTranscript}>No transcript available.</p>
          ) : (
            <div style={s.blockList}>
              {blocks.map((block, i) => {
                const color = getSpeakerColor(block.speakerName, speakerMap);
                return (
                  <div
                    key={i}
                    data-testid="transcript-block"
                    style={{ ...s.block, borderLeftColor: color }}
                  >
                    <div style={s.blockHeader}>
                      {block.speakerName && (
                        <span style={{ ...s.speakerName, color }}>{block.speakerName}</span>
                      )}
                      <span style={s.timestamp}>{formatTimestamp(block.startTime)}</span>
                    </div>
                    <p style={s.blockText}>{block.text}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
    animation: "fadeSlideIn 0.3s ease-out",
  },
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
  header: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: "var(--lst-border)",
  },
  title: {
    fontSize: 38,
    fontWeight: 400,
    margin: "0 0 8px",
    color: "var(--lst-blue)",
    letterSpacing: 0,
    lineHeight: 1.06,
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "var(--lst-ink-70)",
    marginBottom: 10,
  },
  metaMono: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  metaText: {},
  metaDot: { color: "var(--lst-ink-35)" },
  chipRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    fontFamily: FONT,
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: 12,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "var(--lst-border)",
    padding: "4px 10px",
    borderRadius: 999,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    display: "inline-block",
  },
  chipEmail: {
    color: "var(--lst-ink-55)",
    fontSize: 11,
  },
  externalLink: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: 500,
    color: "var(--lst-blue)",
    textDecoration: "underline",
    textUnderlineOffset: 3,
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(260px, 340px) minmax(0, 1fr)",
    gap: 0,
    border: "var(--lst-border)",
    background: "var(--lst-bg)",
  },
  detailGridSingle: {
    display: "grid",
    gridTemplateColumns: "1fr",
    border: "var(--lst-border)",
    background: "var(--lst-bg)",
  },
  summaryCard: {
    padding: "20px 22px",
    background: "var(--lst-ink-08)",
    borderRight: "var(--lst-border)",
    minWidth: 0,
  },
  sectionLabel: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: 500,
    color: "var(--lst-ink-55)",
    margin: "0 0 12px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
  },
  summaryText: {
    fontSize: 14,
    color: "var(--lst-blue)",
    lineHeight: 1.6,
    margin: 0,
  },
  transcriptSection: {
    padding: "20px 22px",
    minWidth: 0,
  },
  noTranscript: {
    fontSize: 13,
    color: "var(--lst-ink-55)",
    fontStyle: "italic",
  },
  blockList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
  },
  block: {
    display: "grid",
    gridTemplateColumns: "74px 1fr",
    gap: 18,
    padding: "12px 0",
    borderLeft: "none",
    borderBottom: "var(--lst-hair)",
    background: "transparent",
    borderRadius: 0,
  },
  blockHeader: {
    display: "contents",
  },
  speakerName: {
    gridColumn: 2,
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  timestamp: {
    gridColumn: 1,
    gridRow: "1 / span 2",
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
    paddingTop: 3,
  },
  blockText: {
    fontFamily: FONT,
    gridColumn: 2,
    fontSize: 15,
    color: "var(--lst-blue)",
    lineHeight: 1.55,
    margin: 0,
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
