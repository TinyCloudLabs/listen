import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ConnectionsScreen } from "../ConnectionsScreen";

const api = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
};

function renderConnections(overrides: Partial<Parameters<typeof ConnectionsScreen>[0]> = {}) {
  return render(
    <ConnectionsScreen
      api={api}
      hasFireflies={false}
      hasGoogleMeet={false}
      hasFirefliesBackendAccess={false}
      googleMeetAvailable={false}
      onAddSource={vi.fn()}
      onRefresh={vi.fn()}
      {...overrides}
    />,
  );
}

describe("ConnectionsScreen", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows Google Meet as unavailable instead of hiding it", () => {
    renderConnections();

    expect(screen.getByText("Google Meet")).toBeInTheDocument();
    expect(screen.getByText(/not configured on this Listen server/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /unavailable/i })).toBeDisabled();
  });

  it("enables Google Meet connection when available", () => {
    const onAddSource = vi.fn();
    renderConnections({ googleMeetAvailable: true, onAddSource });

    expect(screen.getByText("Google Meet")).toBeInTheDocument();
    const connectButtons = screen.getAllByRole("button", { name: /^Connect$/ });
    expect(connectButtons.at(-1)).not.toBeDisabled();
  });
});
