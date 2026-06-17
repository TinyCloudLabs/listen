import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "../ThemeToggle";

function mockPrefersDark(dark: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: dark,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    mockPrefersDark(false);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    vi.unstubAllGlobals();
  });

  it("defaults to light (no data-theme) when the system prefers light", () => {
    render(<ThemeToggle />);
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(screen.getByRole("button", { name: /switch to dark theme/i })).toBeInTheDocument();
  });

  it("follows the system preference for dark", () => {
    mockPrefersDark(true);
    render(<ThemeToggle />);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByRole("button", { name: /switch to light theme/i })).toBeInTheDocument();
  });

  it("toggles light↔dark and persists the choice", () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button", { name: /switch to dark theme/i }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("listen:theme")).toBe("dark");

    fireEvent.click(screen.getByRole("button", { name: /switch to light theme/i }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem("listen:theme")).toBe("light");
  });

  it("reads a persisted theme on mount", () => {
    localStorage.setItem("listen:theme", "dark");

    render(<ThemeToggle />);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByRole("button", { name: /switch to light theme/i })).toBeInTheDocument();
  });
});
