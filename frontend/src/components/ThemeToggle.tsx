import { type CSSProperties, type FC } from "react";
import { useTheme, type ThemePreference } from "../lib/theme";

// ── ThemeToggle ─────────────────────────────────────────────────────
// Tri-state theme cycler for the AppShell sidebar footer. Defaults to
// "System" (follows the OS); clicking cycles System → Light → Dark and
// persists the choice. The button shows the CURRENT preference: a
// monitor for System, a sun for Light, a moon for Dark.

const FONT = "var(--lst-font)";

function MonitorIcon() {
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
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

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

const LABELS: Record<ThemePreference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

function PreferenceIcon({ preference }: { preference: ThemePreference }) {
  if (preference === "system") return <MonitorIcon />;
  if (preference === "light") return <SunIcon />;
  return <MoonIcon />;
}

export const ThemeToggle: FC = () => {
  const { preference, cyclePreference } = useTheme();
  const label = LABELS[preference];
  const tooltip = `Theme: ${label} — click to switch`;

  return (
    <button
      type="button"
      style={styles.button}
      onClick={cyclePreference}
      aria-label={tooltip}
      title={tooltip}
    >
      <PreferenceIcon preference={preference} />
    </button>
  );
};

const styles: Record<string, CSSProperties> = {
  button: {
    fontFamily: FONT,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    border: "var(--lst-border)",
    background: "transparent",
    color: "var(--lst-blue)",
    borderRadius: 6,
    padding: 0,
    cursor: "pointer",
  },
};
