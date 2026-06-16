import { type CSSProperties, type FC, useEffect, useRef, useState } from "react";
import { useTheme } from "../lib/theme";

// ── ThemeToggle ─────────────────────────────────────────────────────
// Palette menu for the AppShell sidebar footer. The trigger shows the
// active palette and a swatch; clicking opens a small list of all
// herdr-derived palettes. Selecting one applies + persists it.

const FONT = "var(--lst-font)";

function PaletteIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="8.5" cy="9.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="9.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="15" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="15" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export const ThemeToggle: FC = () => {
  const { theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const activeLabel = themes.find((t) => t.id === theme)?.label ?? theme;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div style={styles.root} ref={rootRef}>
      <button
        type="button"
        style={styles.button}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Choose theme"
        title="Choose theme"
      >
        <PaletteIcon />
        <span style={styles.label}>{activeLabel}</span>
      </button>

      {open && (
        <div style={styles.menu} role="menu" aria-label="Theme">
          {themes.map((t) => {
            const selected = t.id === theme;
            return (
              <button
                key={t.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                style={{
                  ...styles.menuItem,
                  ...(selected ? styles.menuItemActive : null),
                }}
                onClick={() => {
                  setTheme(t.id);
                  setOpen(false);
                }}
              >
                <span style={styles.menuItemLabel}>{t.label}</span>
                {selected && (
                  <span style={styles.check} aria-hidden>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  root: {
    position: "relative",
    width: "100%",
  },
  button: {
    fontFamily: FONT,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    border: "var(--lst-border)",
    background: "transparent",
    color: "var(--lst-blue)",
    borderRadius: 999,
    padding: "6px 12px",
    fontSize: 12.5,
    fontWeight: 500,
    cursor: "pointer",
  },
  label: {
    fontFamily: FONT,
    textTransform: "capitalize",
  },
  menu: {
    position: "absolute",
    bottom: "calc(100% + 8px)",
    left: 0,
    right: 0,
    zIndex: 30,
    display: "flex",
    flexDirection: "column",
    padding: 4,
    border: "var(--lst-border)",
    borderRadius: 10,
    background: "var(--lst-bg-2)",
    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.18)",
  },
  menuItem: {
    fontFamily: FONT,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    width: "100%",
    border: 0,
    borderRadius: 6,
    background: "transparent",
    color: "var(--lst-ink-70)",
    padding: "7px 10px",
    fontSize: 12.5,
    fontWeight: 500,
    textAlign: "left",
    cursor: "pointer",
  },
  menuItemActive: {
    background: "var(--lst-accent-soft)",
    color: "var(--lst-accent)",
  },
  menuItemLabel: {
    textTransform: "capitalize",
  },
  check: {
    color: "var(--lst-accent)",
    fontSize: 12,
  },
};
