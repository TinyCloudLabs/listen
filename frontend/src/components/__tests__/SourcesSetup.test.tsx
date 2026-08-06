import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SourcesSetup } from "../SourcesSetup";

const api = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
};

const tcw = {
  secrets: {
    unlock: vi.fn(),
    put: vi.fn(),
  },
};

function renderSources(overrides: Partial<Parameters<typeof SourcesSetup>[0]> = {}) {
  return render(
    <SourcesSetup
      api={api}
      tcw={tcw as any}
      hasFirefliesKey={false}
      hasBackendDelegation={true}
      hasFirefliesBackendAccess={false}
      hasGoogleMeet={false}
      googleMeetAvailable={false}
      onEnsureBackendAccess={vi.fn()}
      onEnsureFirefliesBackendAccess={vi.fn()}
      onEnsureGranolaBackendAccess={vi.fn()}
      onFirefliesComplete={vi.fn()}
      onGranolaComplete={vi.fn()}
      {...overrides}
    />,
  );
}

describe("SourcesSetup", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("links TinyCloud Secrets for managed provider secrets", () => {
    renderSources();

    expect(screen.getByText(/Secrets are managed through TinyCloud Secrets/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "secrets@tinycloud.xyz" })).toHaveAttribute(
      "href",
      "https://secrets.tinycloud.xyz",
    );
  });

  it("keeps Google Meet visible with a disabled unavailable action", () => {
    renderSources();

    expect(screen.getByText("Google Meet")).toBeInTheDocument();
    expect(screen.getByText(/not configured on this Listen server/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /unavailable/i })).toBeDisabled();
  });

  it("allows Google Meet connection when available", () => {
    renderSources({ googleMeetAvailable: true });

    expect(screen.getByText("Google Meet")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Connect ->$/ }).at(-1)).not.toBeDisabled();
  });

  it("re-enables Connect Google when the popup is closed without completing", async () => {
    vi.useFakeTimers();
    const popup = { closed: false, close: vi.fn() };
    const open = vi.fn(() => popup);
    vi.stubGlobal("open", open);
    api.get.mockResolvedValue({ authUrl: "https://accounts.google.com/o/oauth2" });

    renderSources({
      googleMeetAvailable: true,
      onEnsureBackendAccess: vi.fn().mockResolvedValue(undefined),
    });

    fireEvent.click(screen.getAllByRole("button", { name: /^Connect ->$/ }).at(-1)!);
    fireEvent.click(screen.getByRole("button", { name: "Connect Google" }));

    await vi.waitFor(() => expect(open).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Connecting..." })).toBeDisabled();

    popup.closed = true;
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(screen.getByRole("button", { name: "Connect Google" })).not.toBeDisabled();
  });

  it("shows an error when the popup is blocked", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "open",
      vi.fn(() => null),
    );
    api.get.mockResolvedValue({ authUrl: "https://accounts.google.com/o/oauth2" });

    renderSources({
      googleMeetAvailable: true,
      onEnsureBackendAccess: vi.fn().mockResolvedValue(undefined),
    });

    fireEvent.click(screen.getAllByRole("button", { name: /^Connect ->$/ }).at(-1)!);
    fireEvent.click(screen.getByRole("button", { name: "Connect Google" }));

    await vi.waitFor(() => {
      expect(screen.getByText(/popup blocked/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Connect Google" })).not.toBeDisabled();
    expect(screen.queryByRole("button", { name: "Connecting..." })).not.toBeInTheDocument();
  });
});
