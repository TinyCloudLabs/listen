import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
});
