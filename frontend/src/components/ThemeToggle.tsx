import { type CSSProperties, type FC } from "react";
import { useTheme } from "../lib/theme";

// ── ThemeToggle ─────────────────────────────────────────────────────
// Light/dark toggle for the AppShell sidebar footer. Follows the system
// preference by default; clicking flips light↔dark and persists it. The
// icon shows the theme you'd switch TO (moon while light, sun while dark).

const FONT = "var(--lst-font)";

function SunIcon() {
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
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
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
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export const ThemeToggle: FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const nextLabel = isDark ? "Light" : "Dark";

  return (
    <button
      type="button"
      style={styles.button}
      onClick={toggleTheme}
      aria-label={`Switch to ${nextLabel.toLowerCase()} theme`}
      title={`Switch to ${nextLabel.toLowerCase()} theme`}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
      <span style={styles.label}>{nextLabel}</span>
    </button>
  );
};

const styles: Record<string, CSSProperties> = {
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
  },
};
