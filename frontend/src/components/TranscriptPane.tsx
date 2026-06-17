import { useMemo, useState, type FC } from "react";
import type { NormalizedTranscriptSentence } from "../lib/tinycloudConversations";

// ── Transcript pane ──────────────────────────────────────────────────
// Per l-app-screens.jsx line 51: find-in-transcript + speaker filter
// tools, then the transcript blocks. Audio controls stay hidden until
// the backend exposes playable audio URLs.

export type TranscriptSentence = NormalizedTranscriptSentence;

// ── Speaker identity colors ──────────────────────────────────────────
// Six calm palette slots (tokens in styles.css, theme-aware). A speaker
// name hashes to a stable slot so the same participant keeps one color
// across the whole transcript and the detail avatar stack — coloring
// identity, never the utterance prose.

const SPEAKER_SLOTS = 6;

export interface SpeakerColor {
  ink: string;
  soft: string;
}

export function speakerColor(name: string): SpeakerColor {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const slot = (Math.abs(hash) % SPEAKER_SLOTS) + 1;
  return { ink: `var(--lst-spk-${slot})`, soft: `var(--lst-spk-${slot}-soft)` };
}

interface TranscriptBlock {
  speakerName: string;
  startTime: number | null;
  text: string;
}

interface TranscriptPaneProps {
  transcript: TranscriptSentence[] | null;
}

function formatTimestamp(seconds: number | null): string {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function groupSentences(sentences: TranscriptSentence[]): TranscriptBlock[] {
  const blocks: TranscriptBlock[] = [];
  for (const sentence of sentences) {
    const last = blocks[blocks.length - 1];
    if (last && last.speakerName === (sentence.speaker_name || "")) {
      last.text += " " + sentence.text;
    } else {
      blocks.push({
        speakerName: sentence.speaker_name || "",
        startTime: sentence.start_time ?? null,
        text: sentence.text,
      });
    }
  }
  return blocks;
}

/** Wrap query matches in <mark>; assumes input is plain text (no HTML). */
function highlightText(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const parts: React.ReactNode[] = [];
  const lower = text.toLowerCase();
  const qLower = q.toLowerCase();
  let cursor = 0;
  while (cursor < text.length) {
    const idx = lower.indexOf(qLower, cursor);
    if (idx < 0) {
      parts.push(text.slice(cursor));
      break;
    }
    if (idx > cursor) parts.push(text.slice(cursor, idx));
    parts.push(
      <mark key={`m-${idx}`} style={markStyle}>
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    cursor = idx + q.length;
  }
  return <>{parts}</>;
}

const markStyle: React.CSSProperties = {
  background: "var(--lst-ink-15)",
  color: "var(--lst-blue)",
  padding: "0 2px",
  borderRadius: 2,
};

export const TranscriptPane: FC<TranscriptPaneProps> = ({ transcript }) => {
  const [query, setQuery] = useState("");
  const [speakerFilter, setSpeakerFilter] = useState<string>("__all__");
  const [showSpeakerMenu, setShowSpeakerMenu] = useState(false);

  const blocks = useMemo(() => (transcript ? groupSentences(transcript) : []), [transcript]);

  const speakers = useMemo(() => {
    const set = new Set<string>();
    for (const block of blocks) if (block.speakerName) set.add(block.speakerName);
    return Array.from(set);
  }, [blocks]);

  const visibleBlocks = useMemo(() => {
    return blocks.filter((block) => {
      if (speakerFilter !== "__all__" && block.speakerName !== speakerFilter) {
        return false;
      }
      if (query.trim() && !block.text.toLowerCase().includes(query.trim().toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [blocks, query, speakerFilter]);

  return (
    <section style={s.pane}>
      {/* Find / filter */}
      <div style={s.toolsBar}>
        <span style={s.eyebrow}>· transcript</span>
        <span style={s.spacer} />
        <div style={s.searchPill}>
          <span style={s.searchIcon} aria-hidden="true">
            ⌕
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find in transcript"
            style={s.searchInput}
          />
        </div>
        <div style={s.speakerWrap}>
          <button style={s.speakerBtn} onClick={() => setShowSpeakerMenu((v) => !v)} type="button">
            {speakerFilter === "__all__" ? "All speakers" : speakerFilter}{" "}
            <span style={s.chev}>▾</span>
          </button>
          {showSpeakerMenu && (
            <div style={s.speakerMenu}>
              <button
                style={s.speakerOption}
                onClick={() => {
                  setSpeakerFilter("__all__");
                  setShowSpeakerMenu(false);
                }}
              >
                All speakers
              </button>
              {speakers.map((name) => (
                <button
                  key={name}
                  style={s.speakerOption}
                  onClick={() => {
                    setSpeakerFilter(name);
                    setShowSpeakerMenu(false);
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={s.body}>
        {blocks.length === 0 ? (
          <p style={s.empty}>No transcript available.</p>
        ) : visibleBlocks.length === 0 ? (
          <p style={s.empty}>No matches.</p>
        ) : (
          visibleBlocks.map((block, i) => (
            <div key={i} data-testid="transcript-block" style={s.block}>
              <span style={s.ts}>{formatTimestamp(block.startTime)}</span>
              <div>
                {block.speakerName && (
                  <div style={s.spk}>
                    <span
                      style={{ ...s.spkDot, background: speakerColor(block.speakerName).ink }}
                      aria-hidden="true"
                    />
                    <span style={{ color: speakerColor(block.speakerName).ink }}>
                      {block.speakerName.toUpperCase()}
                    </span>
                  </div>
                )}
                <div style={s.utt}>{highlightText(block.text, query)}</div>
              </div>
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
  pane: {
    fontFamily: FONT,
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
    minWidth: 0,
    background: "var(--lst-bg)",
  },
  toolsBar: {
    padding: "10px 32px",
    borderBottom: "var(--lst-border)",
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  eyebrow: {
    fontFamily: "var(--lst-font-eyebrow)",
    fontSize: "var(--lst-type-eyebrow)",
    color: "var(--lst-ink-55)",
    letterSpacing: "0.06em",
    textTransform: "lowercase" as const,
  },
  spacer: { flex: 1 },
  searchPill: {
    display: "flex",
    alignItems: "center",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "3px 12px",
    gap: 6,
    background: "transparent",
  },
  searchIcon: {
    fontSize: 11,
    color: "var(--lst-ink-55)",
    transform: "rotate(-45deg) translateY(1px)",
    display: "inline-block",
  },
  searchInput: {
    border: "none",
    background: "transparent",
    color: "var(--lst-blue)",
    fontFamily: FONT,
    fontSize: 12,
    width: 160,
    outline: "none",
    padding: "2px 0",
  },
  speakerWrap: {
    position: "relative" as const,
  },
  speakerBtn: {
    fontFamily: FONT,
    fontSize: 12.5,
    fontWeight: 500,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "6px 14px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  chev: {
    fontSize: 9,
  },
  speakerMenu: {
    position: "absolute" as const,
    top: "calc(100% + 4px)",
    right: 0,
    minWidth: 160,
    background: "var(--lst-bg)",
    border: "var(--lst-border)",
    borderRadius: 4,
    display: "flex",
    flexDirection: "column" as const,
    zIndex: 10,
    boxShadow: "0 4px 12px var(--lst-ink-08)",
  },
  speakerOption: {
    fontFamily: FONT,
    fontSize: 13,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "none",
    borderBottom: "var(--lst-hair)",
    padding: "8px 14px",
    textAlign: "left" as const,
    cursor: "pointer",
  },
  body: {
    flex: 1,
    overflow: "auto",
    padding: "20px 32px 32px",
  },
  empty: {
    fontFamily: FONT,
    fontSize: 13,
    color: "var(--lst-ink-55)",
    fontStyle: "italic" as const,
  },
  block: {
    display: "grid",
    gridTemplateColumns: "70px 1fr",
    gap: 18,
    marginBottom: 16,
  },
  ts: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
    paddingTop: 3,
    letterSpacing: "0.04em",
  },
  spk: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontFamily: "var(--lst-font-eyebrow)",
    fontSize: "var(--lst-type-eyebrow)",
    letterSpacing: "var(--lst-tracking-eyebrow)",
    marginBottom: 4,
  },
  spkDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    flexShrink: 0,
  },
  utt: {
    fontFamily: FONT,
    fontSize: 15,
    color: "var(--lst-blue)",
    lineHeight: "var(--lst-leading-body)",
  },
};
