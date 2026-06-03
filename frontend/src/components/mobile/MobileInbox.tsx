import type { CSSProperties, FC } from "react";

export interface MobileInboxItem {
  id: string;
  title: string;
  source: string;
  startedAt: string | null; // ISO
  durationSecs: number | null;
  preview: string | null;
}

interface MobileInboxProps {
  items: MobileInboxItem[];
  total: number;
  sourceFilter: string;
  sources: string[]; // available filter sources, including the active one
  onSelectSource: (src: string) => void;
  onSelectConversation: (id: string) => void;
  onSearch?: () => void;
  onAdd?: () => void;
  loading?: boolean;
  error?: string | null;
}

function formatDuration(secs: number | null): string {
  if (secs == null || Number.isNaN(secs)) return "—";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function dayBucket(iso: string | null): string {
  if (!iso) return "unknown";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  const now = new Date();
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 86_400_000;
  if (day === today) return "today";
  if (day === today - dayMs) return "yesterday";
  if (day > today - 7 * dayMs) return "earlier this week";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toLowerCase();
}

function srcLabel(s: string): string {
  if (s === "google-meet") return "MEET";
  if (s === "recorder") return "RECORDER";
  if (s === "voice_memos") return "VOICE MEMOS";
  if (s === "voxterm") return "VOXTERM";
  return s.toUpperCase();
}

function cleanPreview(text: string, max: number): string {
  const t = text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return t.length > max ? t.slice(0, max - 1) + "\u2026" : t;
}

export const MobileInbox: FC<MobileInboxProps> = ({
  items,
  total,
  sourceFilter,
  sources,
  onSelectSource,
  onSelectConversation,
  onSearch,
  onAdd,
  loading = false,
  error = null,
}) => {
  const groups = items.reduce<Array<{ bucket: string; items: MobileInboxItem[] }>>((acc, it) => {
    const b = dayBucket(it.startedAt);
    const last = acc[acc.length - 1];
    if (last && last.bucket === b) last.items.push(it);
    else acc.push({ bucket: b, items: [it] });
    return acc;
  }, []);

  return (
    <div style={s.root}>
      <header style={s.top}>
        <div style={s.topRow}>
          <span style={s.mark} aria-hidden />
          <span style={s.spacer} />
          <button type="button" style={s.iconBtn} aria-label="Search" onClick={onSearch}>
            <span style={s.iconGlyph}>{"\u2315"}</span>
          </button>
          <button
            type="button"
            style={{ ...s.iconBtn, ...s.iconBtnSolid }}
            aria-label="Add"
            onClick={onAdd}
          >
            <span style={s.iconGlyph}>+</span>
          </button>
        </div>
        <h1 style={s.title}>Inbox</h1>
        <div style={s.chipRow}>
          <button
            type="button"
            style={{
              ...s.chip,
              ...(sourceFilter === "all" ? s.chipSolid : {}),
            }}
            onClick={() => onSelectSource("all")}
          >
            All {total > 0 ? `\u00B7 ${total}` : ""}
          </button>
          {sources
            .filter((src) => src !== "all")
            .map((src) => (
              <button
                key={src}
                type="button"
                style={{
                  ...s.chip,
                  ...(sourceFilter === src ? s.chipSolid : {}),
                }}
                onClick={() => onSelectSource(src)}
              >
                {srcLabel(src)}
              </button>
            ))}
        </div>
      </header>

      <div style={s.scroll}>
        {error && <div style={s.errorCard}>{error}</div>}
        {loading && items.length === 0 && <div style={s.empty}>{"Loading\u2026"}</div>}
        {!loading && !error && items.length === 0 && (
          <div style={s.empty}>No conversations yet.</div>
        )}
        {groups.map((g) => (
          <div key={g.bucket}>
            <div style={s.groupHeader}>
              <span style={s.groupHeaderText}>{`\u2014 ${g.bucket}`}</span>
            </div>
            {g.items.map((it) => (
              <button
                key={it.id}
                type="button"
                style={s.row}
                onClick={() => onSelectConversation(it.id)}
              >
                <div style={s.rowMeta}>
                  <span style={s.metaMono}>
                    {`${srcLabel(it.source)} \u00B7 ${formatTime(it.startedAt)}`}
                  </span>
                  <span style={s.metaMono}>{formatDuration(it.durationSecs)}</span>
                </div>
                <div style={s.rowTitle}>{it.title}</div>
                {it.preview && <div style={s.rowPreview}>{cleanPreview(it.preview, 110)}</div>}
              </button>
            ))}
          </div>
        ))}
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
  top: {
    padding: "10px 18px 12px",
    borderBottom: "var(--lst-border)",
    flexShrink: 0,
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  mark: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    border: "var(--lst-border)",
    display: "inline-block",
    position: "relative",
    background: "transparent",
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
  },
  iconBtnSolid: {
    background: "var(--lst-blue)",
    color: "var(--lst-bg)",
  },
  iconGlyph: {
    fontSize: 14,
    lineHeight: 1,
  },
  title: {
    fontSize: 36,
    fontWeight: 400,
    letterSpacing: 0,
    margin: "0 0 10px",
    color: "var(--lst-blue)",
  },
  chipRow: {
    display: "flex",
    gap: 6,
    overflowX: "auto",
    flexWrap: "nowrap",
  },
  chip: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 500,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "4px 10px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  chipSolid: {
    background: "var(--lst-blue)",
    color: "var(--lst-bg)",
  },
  scroll: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
  },
  groupHeader: {
    padding: "14px 18px 6px",
  },
  groupHeaderText: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: "0.06em",
    color: "var(--lst-ink-55)",
    textTransform: "lowercase",
  },
  row: {
    width: "100%",
    textAlign: "left",
    display: "block",
    padding: "14px 18px",
    borderBottom: "var(--lst-border)",
    background: "transparent",
    color: "var(--lst-blue)",
    border: "none",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "var(--lst-blue)",
    cursor: "pointer",
    fontFamily: FONT,
  },
  rowMeta: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  metaMono: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.04em",
  },
  rowTitle: {
    fontSize: 17,
    fontWeight: 400,
    marginBottom: 4,
    color: "var(--lst-blue)",
  },
  rowPreview: {
    fontSize: 12.5,
    color: "var(--lst-ink-70)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  empty: {
    padding: "32px 18px",
    fontSize: 13,
    color: "var(--lst-ink-55)",
    textAlign: "center",
  },
  errorCard: {
    margin: "14px 18px",
    padding: "10px 12px",
    fontSize: 13,
    color: "var(--lst-blue)",
    background: "var(--lst-ink-08)",
    border: "var(--lst-border)",
  },
};
