import { useCallback, useEffect, useState } from "react";

// ── Theme runtime ───────────────────────────────────────────────────
// Listen ships a multi-palette switcher modeled on herdr. Each palette
// only overrides the --lst-* token values (see styles.css); components
// inherit. The chosen palette is stored in localStorage and applied via
// document.documentElement.dataset.theme. Default is herdr-light, with
// herdr-dark as the prefers-color-scheme: dark fallback.

export type Theme =
  | "herdr-light"
  | "herdr-dark"
  | "tokyo-night"
  | "catppuccin"
  | "nord"
  | "gruvbox"
  | "classic";

export interface ThemeOption {
  id: Theme;
  label: string;
}

// Order shown in the switcher menu.
export const THEMES: ThemeOption[] = [
  { id: "herdr-light", label: "herdr light" },
  { id: "herdr-dark", label: "herdr dark" },
  { id: "tokyo-night", label: "tokyo night" },
  { id: "catppuccin", label: "catppuccin" },
  { id: "nord", label: "nord" },
  { id: "gruvbox", label: "gruvbox" },
  { id: "classic", label: "classic" },
];

export const DEFAULT_THEME: Theme = "herdr-light";

const STORAGE_KEY = "listen:theme";
const THEME_IDS = new Set<string>(THEMES.map((t) => t.id));

function isTheme(value: string | null | undefined): value is Theme {
  return value != null && THEME_IDS.has(value);
}

function systemTheme(): Theme {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "herdr-dark" : DEFAULT_THEME;
}

export function resolveInitialTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (isTheme(saved)) return saved;
  return systemTheme();
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function useTheme(): {
  theme: Theme;
  setTheme: (next: Theme) => void;
  cycleTheme: () => void;
  themes: ThemeOption[];
} {
  const [theme, setThemeState] = useState<Theme>(() => {
    const current = document.documentElement.dataset.theme;
    return isTheme(current) ? current : resolveInitialTheme();
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState((prev) => {
      if (prev === next) return prev;
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeState((prev) => {
      const idx = THEMES.findIndex((t) => t.id === prev);
      const next = THEMES[(idx + 1) % THEMES.length].id;
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { theme, setTheme, cycleTheme, themes: THEMES };
}
