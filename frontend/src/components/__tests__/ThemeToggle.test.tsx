import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { ThemeToggle } from "../ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it("defaults to herdr-light and applies it on mount", () => {
    render(<ThemeToggle />);
    expect(document.documentElement.dataset.theme).toBe("herdr-light");
    expect(screen.getByRole("button", { name: /choose theme/i })).toBeInTheDocument();
  });

  it("opens the palette menu and selecting a palette applies and persists it", () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button", { name: /choose theme/i }));

    const menu = screen.getByRole("menu", { name: /theme/i });
    const nord = within(menu).getByRole("menuitemradio", { name: /nord/i });
    fireEvent.click(nord);

    expect(document.documentElement.dataset.theme).toBe("nord");
    expect(localStorage.getItem("listen:theme")).toBe("nord");
    // Menu closes after selection.
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("reads a persisted palette on mount and marks it selected", () => {
    localStorage.setItem("listen:theme", "tokyo-night");

    render(<ThemeToggle />);
    expect(document.documentElement.dataset.theme).toBe("tokyo-night");

    fireEvent.click(screen.getByRole("button", { name: /choose theme/i }));
    const selected = screen.getByRole("menuitemradio", { name: /tokyo night/i });
    expect(selected).toHaveAttribute("aria-checked", "true");
  });
});
