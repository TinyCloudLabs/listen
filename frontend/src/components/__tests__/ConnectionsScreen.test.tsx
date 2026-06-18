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
    vi.clearAllMocks();
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

  it("shows the local importer skill prompt from the available section", () => {
    renderConnections();

    expect(screen.getByText("Import local")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /get started/i }));

    expect(screen.getByText("listen-importer skill")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /skill/i })).toHaveAttribute(
      "href",
      "https://listen.xyz/importer",
    );
    expect(screen.getByRole("link", { name: /repo/i })).toHaveAttribute(
      "href",
      "https://github.com/TinyCloudLabs/listen-importer",
    );
    expect(
      screen.getByText(
        /go to https:\/\/listen\.xyz\/importer and follow the Listen importer skill/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/pulling in the importer/i)).toBeInTheDocument();
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

  it("renders one error banner when a sync action fails", async () => {
    api.post.mockRejectedValueOnce(new Error("sync failed"));
    renderConnections({
      hasFireflies: true,
      hasFirefliesBackendAccess: true,
    });

    fireEvent.click(screen.getByRole("button", { name: /sync now/i }));

    await waitFor(() => {
      expect(screen.getAllByText("sync failed")).toHaveLength(1);
    });
  });

  it("runs the transcript migration from maintenance", async () => {
    api.post.mockResolvedValueOnce({
      scanned: 3,
      migrated: 2,
      skipped: 1,
      missing: 0,
      failed: 0,
    });
    const onRefresh = vi.fn();
    renderConnections({ onRefresh });

    fireEvent.click(screen.getByRole("button", { name: /migrate transcripts/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/api/config/migrate-transcripts", {});
    });
    expect(await screen.findByText(/migrated 2 transcripts/i)).toBeInTheDocument();
    expect(onRefresh).toHaveBeenCalled();
  });
});
