import type { FC } from "react";

export type SourceFilter =
  | "all"
  | "fireflies"
  | "granola"
  | "google-meet"
  | "otter"
  | "manual"
  | "recorder"
  | "voice_memos"
  | "voxterm"
  | "soundcore_sync";

interface InboxFiltersProps {
  total: number;
  sourceFilter: SourceFilter;
  sourceOptions?: SourceFilter[];
  onSourceFilterChange: (next: SourceFilter) => void;
  showingCount: number;
}

export const SOURCE_CHIPS: Array<{ key: SourceFilter; label: string }> = [
  { key: "all", label: "All sources" },
  { key: "fireflies", label: "Fireflies" },
  { key: "granola", label: "Granola" },
  { key: "google-meet", label: "Meet" },
  { key: "otter", label: "Otter" },
  { key: "manual", label: "Manual" },
  { key: "recorder", label: "Recorder" },
  { key: "voice_memos", label: "Voice Memos" },
  { key: "voxterm", label: "VoxTerm" },
  { key: "soundcore_sync", label: "Soundcore" },
];

// Calm per-source accent hues so sources are distinguishable at a glance.
// Muted, editorial — never neon. Reused for both light and dark via opacity.
const SOURCE_ACCENT: Record<string, string> = {
  fireflies: "#c2603a",
  granola: "#7a8a2f",
  "google-meet": "#3a72c2",
  otter: "#4a6b8a",
  manual: "#7d6aa6",
  recorder: "#3a9aa0",
  voice_memos: "#b0853a",
  voxterm: "#5b7a52",
  soundcore_sync: "#8f5b4f",
};

export const InboxFilters: FC<InboxFiltersProps> = ({
  total,
  sourceFilter,
  sourceOptions,
  onSourceFilterChange,
  showingCount,
}) => {
  const visibleSourceOptions = sourceOptions ? new Set(sourceOptions) : null;
  const chips = SOURCE_CHIPS.filter(
    (chip) => chip.key === "all" || !visibleSourceOptions || visibleSourceOptions.has(chip.key),
  );

  return (
    <div style={s.wrap}>
      {chips.map((chip) => {
        const isActive = chip.key === sourceFilter;
        const accent = SOURCE_ACCENT[chip.key];
        const chipStyle: React.CSSProperties = {
          ...s.chip,
          ...(accent ? { paddingLeft: 8 } : {}),
          ...(isActive ? s.chipActive : {}),
          ...(accent && isActive
            ? { border: `1px solid ${accent}`, background: `${accent}1f`, color: "var(--lst-blue)" }
            : {}),
        };
        return (
          <button
            key={chip.key}
            type="button"
            style={chipStyle}
            onClick={() => onSourceFilterChange(chip.key)}
          >
            {accent && (
              <span
                aria-hidden
                style={{ ...s.accentDot, background: accent, opacity: isActive ? 1 : 0.7 }}
              />
            )}
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
};

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
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
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
  accentDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    flexShrink: 0,
  },
  spacer: { marginLeft: "auto" },
  showing: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
  },
};
