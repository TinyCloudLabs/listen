import type { FC, MouseEvent } from "react";

export interface InboxRowConversation {
  id: string;
  title: string;
  source: string;
  started_at: string;
  duration_secs: number;
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
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDuration(secs: number): string {
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

  return (
    <div
      style={{ ...s.row, ...(selected ? s.rowSelected : {}) }}
      onClick={() => onOpen(c.id)}
      onContextMenu={(e) => onContextMenu(e, c.id)}
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
      <span style={s.sum} aria-label={c.summary ? "Has summary" : "No summary"}>
        {c.summary ? "✓" : "—"}
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
  },
  rowSelected: {
    background: "var(--lst-ink-08)",
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
  sum: {
    textAlign: "center",
    color: "var(--lst-ink-70)",
    fontSize: 13,
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
