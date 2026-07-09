import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { ThemeToggle } from "../ThemeToggle";

// A matchMedia mock whose `matches` can be flipped to fire "change"
// events, so we can exercise live OS-preference updates.
function installMatchMedia(initialDark: boolean) {
  let dark = initialDark;
  const listeners = new Set<() => void>();

  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return dark;
    },
    media: query,
    onchange: null,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));

  return {
    setDark(next: boolean) {
      dark = next;
      act(() => listeners.forEach((cb) => cb()));
    },
  };
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    installMatchMedia(false);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    vi.unstubAllGlobals();
  });

  it("defaults to System and resolves to light when the OS prefers light", () => {
    render(<ThemeToggle />);
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem("listen:theme")).toBeNull();
    const button = screen.getByRole("button", { name: /theme: system — click to switch/i });
    expect(button).toHaveAttribute("title", "Theme: System — click to switch");
    expect(screen.queryByText("System")).not.toBeInTheDocument();
  });

  it("defaults to System and resolves to dark when the OS prefers dark", () => {
    installMatchMedia(true);
    render(<ThemeToggle />);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(
      screen.getByRole("button", { name: /theme: system — click to switch/i }),
    ).toBeInTheDocument();
  });

  it("follows live OS changes while the preference is System", () => {
    const media = installMatchMedia(false);
    render(<ThemeToggle />);
    expect(document.documentElement.dataset.theme).toBeUndefined();

    media.setDark(true);
    expect(document.documentElement.dataset.theme).toBe("dark");

    media.setDark(false);
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("cycles System → Light → Dark → System and persists each choice", () => {
    render(<ThemeToggle />);

    // System (default)
    expect(
      screen.getByRole("button", { name: /theme: system — click to switch/i }),
    ).toBeInTheDocument();

    // → Light
    fireEvent.click(screen.getByRole("button", { name: /theme: system — click to switch/i }));
    expect(
      screen.getByRole("button", { name: /theme: light — click to switch/i }),
    ).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem("listen:theme")).toBe("light");

    // → Dark
    fireEvent.click(screen.getByRole("button", { name: /theme: light — click to switch/i }));
    expect(
      screen.getByRole("button", { name: /theme: dark — click to switch/i }),
    ).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("listen:theme")).toBe("dark");

    // → System
    fireEvent.click(screen.getByRole("button", { name: /theme: dark — click to switch/i }));
    expect(
      screen.getByRole("button", { name: /theme: system — click to switch/i }),
    ).toBeInTheDocument();
    expect(localStorage.getItem("listen:theme")).toBe("system");
  });

  it("does not follow OS changes once pinned to Light", () => {
    const media = installMatchMedia(false);
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button", { name: /theme: system — click to switch/i }));
    expect(
      screen.getByRole("button", { name: /theme: light — click to switch/i }),
    ).toBeInTheDocument();

    media.setDark(true);
    // Still light — pinned preference ignores the OS.
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("restores a persisted Dark preference on mount", () => {
    localStorage.setItem("listen:theme", "dark");

    render(<ThemeToggle />);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(
      screen.getByRole("button", { name: /theme: dark — click to switch/i }),
    ).toBeInTheDocument();
  });

  it("restores a persisted System preference on mount", () => {
    localStorage.setItem("listen:theme", "system");
    installMatchMedia(true);

    render(<ThemeToggle />);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(
      screen.getByRole("button", { name: /theme: system — click to switch/i }),
    ).toBeInTheDocument();
  });
});
