import { useState, type CSSProperties, type FC } from "react";

export interface MobileDetailSentence {
  speakerName: string;
  startTime: number; // seconds
  text: string;
}

export interface MobileDetailData {
  id: string;
  title: string;
  source: string;
  startedAt: string; // ISO
  durationSecs: number;
  summary: string | null;
}

interface MobileDetailProps {
  conversation: MobileDetailData;
  transcript: MobileDetailSentence[];
  onBack: () => void;
}

type DetailTab = "summary" | "transcript";

function srcLabel(s: string): string {
  if (s === "google-meet") return "MEET";
  if (s === "manual") return "MANUAL";
  return s.toUpperCase();
}

function formatTimestamp(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDateMono(iso: string): string {
  const d = new Date(iso);
  return d
    .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    .toUpperCase()
    .replace(",", "");
}

function renderSummary(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^[-*]\s+/gm, "\u2022 ")
    .replace(/\n/g, "<br />");
}

export const MobileDetail: FC<MobileDetailProps> = ({ conversation, transcript, onBack }) => {
  const [tab, setTab] = useState<DetailTab>("summary");

  return (
    <div style={s.root}>
      <header style={s.topBar}>
        <button type="button" style={s.backBtn} onClick={onBack}>
          {"\u2039 Inbox"}
        </button>
        <span style={s.spacer} />
      </header>

      <div style={s.scroll}>
        <div style={s.titleBlock}>
          <span style={s.metaMono}>
            {`${srcLabel(conversation.source)} \u2014 ${formatDateMono(conversation.startedAt)} \u2014 ${formatTimestamp(conversation.durationSecs)}`}
          </span>
          <h1 style={s.title}>{conversation.title}</h1>
        </div>

        <div style={s.tabs}>
          {(
            [
              ["summary", "Summary"],
              ["transcript", `Transcript${transcript.length ? `  ${transcript.length}` : ""}`],
            ] as Array<[DetailTab, string]>
          ).map(([key, label]) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                style={{ ...s.tab, ...(active ? s.tabActive : {}) }}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            );
          })}
        </div>

        {tab === "summary" && (
          <div style={s.section}>
            {conversation.summary ? (
              <div
                style={s.summaryBody}
                dangerouslySetInnerHTML={{ __html: renderSummary(conversation.summary) }}
              />
            ) : (
              <p style={s.muted}>No summary yet.</p>
            )}
          </div>
        )}

        {tab === "transcript" && (
          <div style={s.section}>
            {transcript.length === 0 ? (
              <p style={s.muted}>No transcript available.</p>
            ) : (
              transcript.map((b, i) => (
                <div key={i} style={s.block}>
                  <div style={s.blockHeader}>
                    <span style={s.metaMonoSmall}>{formatTimestamp(b.startTime)}</span>
                    <span style={s.speaker}>{(b.speakerName || "Speaker").toUpperCase()}</span>
                  </div>
                  <div style={s.utterance}>{b.text}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Styles ──────────────────────────────────────────────────────────

const FONT = "var(--lst-font)";
const MONO = "var(--lst-mono)";

const s: Record<string, CSSProperties> = {
  root: {
    fontFamily: FONT,
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
    background: "var(--lst-bg)",
    color: "var(--lst-blue)",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "6px 8px 10px",
    borderBottom: "var(--lst-border)",
    flexShrink: 0,
  },
  backBtn: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: 500,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "none",
    padding: "6px 10px",
    cursor: "pointer",
  },
  spacer: { flex: 1 },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    border: "var(--lst-border)",
    background: "transparent",
    color: "var(--lst-blue)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontFamily: FONT,
    fontSize: 14,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
  },
  titleBlock: {
    padding: "14px 18px 16px",
  },
  metaMono: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.06em",
  },
  title: {
    fontSize: 28,
    fontWeight: 400,
    letterSpacing: 0,
    lineHeight: 1.1,
    margin: "6px 0 0",
    color: "var(--lst-blue)",
  },
  tabs: {
    display: "flex",
    gap: 18,
    padding: "0 18px",
    borderBottom: "var(--lst-border)",
    flexShrink: 0,
  },
  tab: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: 500,
    color: "var(--lst-blue)",
    opacity: 0.55,
    background: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    padding: "10px 0",
    marginBottom: -1,
    cursor: "pointer",
  },
  tabActive: {
    opacity: 1,
    borderBottomColor: "var(--lst-blue)",
  },
  section: {
    padding: "18px 22px 32px",
  },
  summaryBody: {
    fontSize: 14,
    lineHeight: 1.55,
    color: "var(--lst-blue)",
  },
  block: {
    marginBottom: 18,
  },
  blockHeader: {
    display: "flex",
    gap: 10,
    alignItems: "baseline",
    marginBottom: 4,
  },
  metaMonoSmall: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
  },
  speaker: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: "0.08em",
    color: "var(--lst-ink-55)",
  },
  utterance: {
    fontSize: 15,
    lineHeight: 1.55,
    color: "var(--lst-blue)",
  },
  muted: {
    fontSize: 13,
    color: "var(--lst-ink-55)",
    margin: 0,
  },
};
