import type { FC } from "react";

export type SourceFilter = "all" | "fireflies" | "granola" | "google-meet" | "manual";

interface InboxFiltersProps {
  total: number;
  sourceFilter: SourceFilter;
  onSourceFilterChange: (next: SourceFilter) => void;
  showingCount: number;
}

const SOURCE_CHIPS: Array<{ key: SourceFilter; label: string }> = [
  { key: "all", label: "All sources" },
  { key: "fireflies", label: "Fireflies" },
  { key: "granola", label: "Granola" },
  { key: "google-meet", label: "Meet" },
  { key: "manual", label: "Manual" },
];

export const InboxFilters: FC<InboxFiltersProps> = ({
  total,
  sourceFilter,
  onSourceFilterChange,
  showingCount,
}) => (
  <div style={s.wrap}>
    {SOURCE_CHIPS.map((chip) => {
      const isActive = chip.key === sourceFilter;
      return (
        <button
          key={chip.key}
          type="button"
          style={{ ...s.chip, ...(isActive ? s.chipActive : {}) }}
          onClick={() => onSourceFilterChange(chip.key)}
        >
          {chip.label}
        </button>
      );
    })}
    <span style={s.spacer} />
    <span style={s.showing}>
      showing {showingCount} of {total}
    </span>
  </div>
);

const FONT = "var(--lst-font)";
const MONO = "var(--lst-mono)";

const s: Record<string, React.CSSProperties> = {
  wrap: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    flexWrap: "wrap",
    padding: "12px 32px",
    borderBottom: "var(--lst-border)",
  },
  chip: {
    fontFamily: FONT,
    fontSize: 11.5,
    fontWeight: 500,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "4px 10px",
    cursor: "pointer",
  },
  chipActive: {
    color: "var(--lst-bg)",
    background: "var(--lst-blue)",
    borderColor: "var(--lst-blue)",
  },
  spacer: { marginLeft: "auto" },
  showing: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
  },
};
