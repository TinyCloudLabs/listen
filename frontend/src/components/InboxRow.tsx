import { useState, type FC, type MouseEvent } from "react";

export interface InboxRowConversation {
  id: string;
  title: string;
  source: string;
  started_at: string | null;
  duration_secs: number | null;
  summary: string | null;
  participant_count: number;
}

interface InboxRowProps {
  conversation: InboxRowConversation;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onContextMenu: (event: MouseEvent, id: string) => void;
  onMenu: (event: MouseEvent, id: string) => void;
}

const SOURCE_LABEL: Record<string, string> = {
  fireflies: "FIREFLIES",
  "google-meet": "MEET",
  granola: "GRANOLA",
  otter: "OTTER",
  audio: "AUDIO",
  manual: "MANUAL",
  recorder: "RECORDER",
  voice_memos: "VOICE MEMOS",
  voxterm: "VOXTERM",
  soundcore_sync: "SOUNDCORE",
};

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDuration(secs: number | null): string {
  if (secs == null || Number.isNaN(secs)) return "—";
  if (secs >= 3600) return `${Math.round(secs / 3600)} hr`;
  return `${Math.round(secs / 60)} min`;
}

function cleanSummary(str: string, max: number): string {
  const clean = str
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return clean.length > max ? clean.slice(0, max - 1) + "\u2026" : clean;
}

export const InboxRow: FC<InboxRowProps> = ({
  conversation,
  selected,
  onToggleSelect,
  onOpen,
  onContextMenu,
  onMenu,
}) => {
  const c = conversation;
  const sourceLabel = SOURCE_LABEL[c.source] ?? c.source.toUpperCase();
  const avatarCount = Math.min(c.participant_count, 3);
  const extra = c.participant_count - avatarCount;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        ...s.row,
        ...(hovered && !selected ? s.rowHover : {}),
        ...(selected ? s.rowSelected : {}),
      }}
      onClick={() => onOpen(c.id)}
      onContextMenu={(e) => onContextMenu(e, c.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggleSelect(c.id)}
        onClick={(e) => e.stopPropagation()}
        style={s.checkbox}
        aria-label={`Select ${c.title}`}
      />
      <span style={s.time}>{formatTime(c.started_at)}</span>
      <span style={s.source}>{sourceLabel}</span>
      <div style={s.body}>
        <div style={s.titleRow}>
          <span style={s.title}>{c.title}</span>
        </div>
        {c.summary && <div style={s.preview}>{cleanSummary(c.summary, 120)}</div>}
      </div>
      <div style={s.people}>
        {Array.from({ length: avatarCount }).map((_, i) => (
          <div key={i} style={{ ...s.avatar, marginLeft: i === 0 ? 0 : -6, zIndex: 3 - i }} />
        ))}
        {extra > 0 && <span style={s.peopleExtra}>+{extra}</span>}
      </div>
      <span style={s.duration}>{formatDuration(c.duration_secs)}</span>
      <span style={s.sumCell} aria-label={c.summary ? "Has summary" : "No summary"}>
        <span style={{ ...s.sumDot, ...(c.summary ? s.sumDotOk : s.sumDotMuted) }} />
      </span>
      <button
        type="button"
        style={s.kebab}
        aria-label="Row menu"
        onClick={(e) => {
          e.stopPropagation();
          onMenu(e, c.id);
        }}
      >
        ⋮
      </button>
    </div>
  );
};

export const InboxRowGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "32px 60px 110px minmax(0, 1fr) 120px 80px 70px 50px",
  gap: 14,
  alignItems: "center",
};

const FONT = "var(--lst-font)";
const MONO = "var(--lst-mono)";

const s: Record<string, React.CSSProperties> = {
  row: {
    ...InboxRowGrid,
    padding: "14px 32px",
    borderBottom: "1px solid var(--lst-rule-soft)",
    cursor: "pointer",
    background: "transparent",
    fontFamily: FONT,
    transition: "background 120ms ease, box-shadow 120ms ease",
  },
  rowHover: {
    background: "var(--lst-ink-08)",
  },
  rowSelected: {
    background: "var(--lst-ink-15)",
    boxShadow: "inset 2px 0 0 var(--lst-blue)",
  },
  checkbox: {
    accentColor: "var(--lst-blue)",
  },
  time: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-70)",
  },
  source: {
    fontFamily: MONO,
    fontSize: 10,
    color: "var(--lst-ink-70)",
    letterSpacing: "0.08em",
  },
  body: { minWidth: 0 },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: 500,
    color: "var(--lst-blue)",
  },
  preview: {
    fontSize: 12.5,
    color: "var(--lst-ink-55)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  people: {
    display: "flex",
    alignItems: "center",
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    border: "var(--lst-border)",
    background: "var(--lst-bg)",
  },
  peopleExtra: {
    fontFamily: MONO,
    fontSize: 10,
    color: "var(--lst-ink-55)",
    marginLeft: 4,
  },
  duration: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-70)",
    textAlign: "right",
  },
  sumCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  sumDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
  },
  sumDotOk: {
    background: "var(--lst-ok)",
    boxShadow: "0 0 0 3px var(--lst-ok-soft)",
  },
  sumDotMuted: {
    background: "transparent",
    border: "1px solid var(--lst-ink-35)",
  },
  kebab: {
    width: 26,
    height: 26,
    padding: 0,
    border: "none",
    background: "transparent",
    color: "var(--lst-blue)",
    cursor: "pointer",
    fontSize: 16,
    lineHeight: 1,
  },
};
