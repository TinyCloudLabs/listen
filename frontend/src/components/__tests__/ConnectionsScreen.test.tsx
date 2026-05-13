import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
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

  it("shows transcription providers as available connections", () => {
    renderConnections();

    expect(screen.getByText("AssemblyAI")).toBeInTheDocument();
    expect(screen.getByText("Deepgram")).toBeInTheDocument();
    expect(
      screen.getByText(/transcribes uploaded audio and video with assemblyai/i),
    ).toBeInTheDocument();
  });

  it("runs finish setup when a transcription key exists without backend access", async () => {
    const onFinish = vi.fn().mockResolvedValue(undefined);
    renderConnections({
      hasAssemblyAIKey: true,
      hasAssemblyAIBackendAccess: false,
      onFinishTranscriptionProviderAccess: onFinish,
    });

    fireEvent.click(screen.getAllByRole("button", { name: /finish setup/i })[0]!);

    await waitFor(() => {
      expect(onFinish).toHaveBeenCalledWith("assemblyai");
    });
  });
});
