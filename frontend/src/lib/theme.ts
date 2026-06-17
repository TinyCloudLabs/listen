import { useCallback, useEffect, useState } from "react";

// ── Theme runtime ───────────────────────────────────────────────────
// Listen has a binary light/dark theme. Each theme only overrides the
// --lst-* token values (see styles.css); components inherit. Light is
// the default (:root, no data-theme); dark sets data-theme="dark". The
// choice is stored in localStorage and applied via
// document.documentElement.dataset.theme. With no saved choice the theme
// follows prefers-color-scheme.

export type Theme = "light" | "dark";

const STORAGE_KEY = "listen:theme";

function isTheme(value: string | null | undefined): value is Theme {
  return value === "light" || value === "dark";
}

function systemTheme(): Theme {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveInitialTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (isTheme(saved)) return saved;
  return systemTheme();
}

export function applyTheme(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.dataset.theme = "dark";
  } else {
    delete document.documentElement.dataset.theme;
  }
}

export function useTheme(): {
  theme: Theme;
  setTheme: (next: Theme) => void;
  toggleTheme: () => void;
} {
  const [theme, setThemeState] = useState<Theme>(() => {
    const current = document.documentElement.dataset.theme;
    return current === "dark" ? "dark" : resolveInitialTheme();
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

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { theme, setTheme, toggleTheme };
}
