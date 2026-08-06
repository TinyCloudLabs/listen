import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MobileDetail } from "../components/mobile/MobileDetail";

const CONVERSATION = {
  id: "01ABC",
  title: "Sprint Planning",
  source: "fireflies",
  source_url: "https://app.fireflies.ai/view/01ABC",
  started_at: "2026-03-20T14:00:00Z",
  startedAt: "2026-03-20T14:00:00Z",
  duration_secs: 1800,
  durationSecs: 1800,
  summary: "Discussed roadmap priorities and assigned tasks.",
};

function renderDetail(summary: string) {
  return render(
    <MobileDetail conversation={{ ...CONVERSATION, summary }} transcript={[]} onBack={vi.fn()} />,
  );
}

describe("MobileDetail", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("escapes HTML in summaries instead of rendering it", () => {
    const htmlWrites: string[] = [];
    const innerHtmlDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");

    vi.spyOn(Element.prototype, "innerHTML", "set").mockImplementation(
      function setInnerHTML(value) {
        htmlWrites.push(String(value));
        innerHtmlDescriptor?.set?.call(this, value);
      },
    );

    const { container } = renderDetail(
      '<img src=x onerror="window.__xss=1"> & "quotes" > brackets',
    );

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText(/quotes/)).toBeInTheDocument();
    expect(screen.getByText(/brackets/)).toBeInTheDocument();
    expect(htmlWrites).toContain(
      "&lt;img src=x onerror=&quot;window.__xss=1&quot;&gt; &amp; &quot;quotes&quot; &gt; brackets",
    );
  });

  it("still renders the supported markdown subset", () => {
    const { container } = renderDetail("**bold** and\n- item");

    expect(container.querySelector("strong")).toHaveTextContent("bold");
    expect(screen.getByText(/item/)).toBeInTheDocument();
  });
});
