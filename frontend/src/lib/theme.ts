import { useCallback, useEffect, useState } from "react";

// ── Theme runtime ───────────────────────────────────────────────────
// Listen has two visual themes — light (the default :root tokens) and
// dark (tokyo-night, data-theme="dark"). The user picks a *preference*:
// "system" follows prefers-color-scheme, while "light"/"dark" pin a
// theme regardless of the OS. The literal preference is stored in
// localStorage; an absent value means "system". The resolved theme is
// applied via document.documentElement.dataset.theme.

export type Theme = "light" | "dark";
export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "listen:theme";

// Click order for the toggle.
const CYCLE: ThemePreference[] = ["system", "light", "dark"];

function isPreference(value: string | null | undefined): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function prefersDark(): boolean {
  return !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

export function resolveInitialPreference(): ThemePreference {
  const saved = localStorage.getItem(STORAGE_KEY);
  return isPreference(saved) ? saved : "system";
}

export function resolveTheme(preference: ThemePreference): Theme {
  if (preference === "system") return prefersDark() ? "dark" : "light";
  return preference;
}

export function applyTheme(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.dataset.theme = "dark";
  } else {
    delete document.documentElement.dataset.theme;
  }
}

export function nextPreference(preference: ThemePreference): ThemePreference {
  const i = CYCLE.indexOf(preference);
  return CYCLE[(i + 1) % CYCLE.length];
}

export function useTheme(): {
  preference: ThemePreference;
  theme: Theme;
  cyclePreference: () => void;
} {
  const [preference, setPreference] = useState<ThemePreference>(resolveInitialPreference);

  // Apply the resolved theme whenever the preference changes, and — while
  // following the system — keep applying as the OS preference changes.
  useEffect(() => {
    applyTheme(resolveTheme(preference));

    if (preference !== "system" || !window.matchMedia) return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(resolveTheme("system"));
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  const cyclePreference = useCallback(() => {
    setPreference((prev) => {
      const next = nextPreference(prev);
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { preference, theme: resolveTheme(preference), cyclePreference };
}
