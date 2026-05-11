import type { FC } from "react";

interface InboxBulkBarProps {
  selectedCount: number;
  onClear: () => void;
}

const ACTIONS = ["Star", "Move to folder", "Tag", "Re-generate summaries", "Export", "Delete"];

export const InboxBulkBar: FC<InboxBulkBarProps> = ({ selectedCount, onClear }) => (
  <div style={s.wrap} role="region" aria-label="Bulk actions">
    <input type="checkbox" checked readOnly style={s.checkbox} />
    <span style={s.count}>{selectedCount} SELECTED</span>
    <span style={s.divider} />
    {ACTIONS.map((label) => (
      <button key={label} type="button" style={s.btn}>
        {label}
      </button>
    ))}
    <span style={s.spacer} />
    <button type="button" style={s.iconBtn} onClick={onClear} aria-label="Clear selection">
      ×
    </button>
  </div>
);

const FONT = "var(--lst-font)";
const MONO = "var(--lst-mono)";

const s: Record<string, React.CSSProperties> = {
  wrap: {
    padding: "10px 32px",
    borderBottom: "var(--lst-border)",
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "var(--lst-ink-08)",
  },
  checkbox: { accentColor: "var(--lst-blue)" },
  count: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-blue)",
    letterSpacing: "0.08em",
  },
  divider: {
    width: 1,
    height: 14,
    background: "var(--lst-rule-soft)",
    margin: "0 4px",
  },
  btn: {
    fontFamily: FONT,
    fontSize: 12.5,
    fontWeight: 500,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "6px 14px",
    cursor: "pointer",
  },
  spacer: { marginLeft: "auto" },
  iconBtn: {
    width: 26,
    height: 26,
    padding: 0,
    borderRadius: 999,
    border: "var(--lst-border)",
    background: "transparent",
    color: "var(--lst-blue)",
    cursor: "pointer",
    fontSize: 14,
    lineHeight: 1,
  },
};
