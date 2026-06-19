import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SourcesSetup } from "../components/SourcesSetup";
import type { ApiClient } from "@listen/client";
import type { TinyCloudWeb } from "@tinycloud/web-sdk";

function mockApi(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    get: vi.fn().mockResolvedValue({ connected: true }),
    post: vi.fn().mockResolvedValue({
      conversationId: "conv-1",
      title: "Call",
      provider: "deepgram",
    }),
    put: vi.fn(),
    del: vi.fn(),
    ...overrides,
  };
}

function mockTinyCloud(): TinyCloudWeb {
  return {
    secrets: {
      unlock: vi.fn().mockResolvedValue({ ok: true }),
      put: vi.fn().mockResolvedValue({ ok: true }),
    },
  } as unknown as TinyCloudWeb;
}

describe("SourcesSetup", () => {
  afterEach(() => {
    cleanup();
  });

  it("saves a Granola API key and verifies backend status", async () => {
    const api = mockApi();
    const tcw = mockTinyCloud();
    const ensureGranolaBackendAccess = vi.fn().mockResolvedValue(undefined);
    const onGranolaComplete = vi.fn();

    render(
      <SourcesSetup
        api={api}
        tcw={tcw}
        hasBackendDelegation={true}
        onEnsureBackendAccess={vi.fn()}
        onEnsureFirefliesBackendAccess={vi.fn()}
        onEnsureGranolaBackendAccess={ensureGranolaBackendAccess}
        onFirefliesComplete={vi.fn()}
        onGranolaComplete={onGranolaComplete}
      />,
    );

    const granolaCard = screen.getByText("Granola").closest("div")?.parentElement?.parentElement;
    expect(granolaCard).toBeTruthy();
    await userEvent.click(
      within(granolaCard as HTMLElement).getByRole("button", { name: /connect ->/i }),
    );
    await userEvent.type(screen.getByPlaceholderText(/paste your granola api key/i), "grn_test");
    await userEvent.click(screen.getByRole("button", { name: /save key and connect/i }));

    expect(tcw.secrets.put).toHaveBeenCalledWith("GRANOLA_API_KEY", "grn_test");
    expect(ensureGranolaBackendAccess).toHaveBeenCalled();
    expect(api.get).toHaveBeenCalledWith("/api/granola/status");
    expect(await screen.findByText(/granola connected/i)).toBeInTheDocument();
  });

  it("saves Soundcore web session headers as one bundled secret", async () => {
    const api = mockApi();
    const tcw = mockTinyCloud();
    const ensureSoundcoreBackendAccess = vi.fn().mockResolvedValue(undefined);

    render(
      <SourcesSetup
        api={api}
        tcw={tcw}
        hasBackendDelegation={true}
        onEnsureBackendAccess={vi.fn()}
        onEnsureFirefliesBackendAccess={vi.fn()}
        onEnsureGranolaBackendAccess={vi.fn()}
        onEnsureSoundcoreBackendAccess={ensureSoundcoreBackendAccess}
        onFirefliesComplete={vi.fn()}
        onGranolaComplete={vi.fn()}
      />,
    );

    const soundcoreCard = screen.getByText("Soundcore").closest("div")
      ?.parentElement?.parentElement;
    expect(soundcoreCard).toBeTruthy();
    await userEvent.click(
      within(soundcoreCard as HTMLElement).getByRole("button", { name: /connect ->/i }),
    );

    expect(screen.getByText(/does not issue a normal api key/i)).toBeInTheDocument();
    expect(screen.getByText(/anka-api-us\.soundcore\.com/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("X-Auth-Token"), "auth-token");
    await userEvent.type(screen.getByLabelText("Uid"), "uid-value");
    await userEvent.type(screen.getByLabelText("Openudid"), "openudid-value");
    await userEvent.click(screen.getByRole("button", { name: /save credentials/i }));

    expect(tcw.secrets.put).toHaveBeenCalledWith(
      "SOUNDCORE_SESSION",
      JSON.stringify({
        authToken: "auth-token",
        uid: "uid-value",
        openudid: "openudid-value",
      }),
    );
    expect(ensureSoundcoreBackendAccess).not.toHaveBeenCalled();
    expect(api.get).not.toHaveBeenCalledWith("/api/soundcore/status");
    expect(await screen.findByText(/soundcore credentials saved/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /finish setup/i })).toBeInTheDocument();
  });

  it("finishes Soundcore backend access after credentials are saved", async () => {
    const api = mockApi();
    const tcw = mockTinyCloud();
    const ensureSoundcoreBackendAccess = vi.fn().mockResolvedValue(undefined);

    render(
      <SourcesSetup
        api={api}
        tcw={tcw}
        hasBackendDelegation={true}
        onEnsureBackendAccess={vi.fn()}
        onEnsureFirefliesBackendAccess={vi.fn()}
        onEnsureGranolaBackendAccess={vi.fn()}
        onEnsureSoundcoreBackendAccess={ensureSoundcoreBackendAccess}
        onFirefliesComplete={vi.fn()}
        onGranolaComplete={vi.fn()}
      />,
    );

    const soundcoreCard = screen.getByText("Soundcore").closest("div")
      ?.parentElement?.parentElement;
    expect(soundcoreCard).toBeTruthy();
    await userEvent.click(
      within(soundcoreCard as HTMLElement).getByRole("button", { name: /connect ->/i }),
    );

    await userEvent.type(screen.getByLabelText("X-Auth-Token"), "auth-token");
    await userEvent.type(screen.getByLabelText("Uid"), "uid-value");
    await userEvent.type(screen.getByLabelText("Openudid"), "openudid-value");
    await userEvent.click(screen.getByRole("button", { name: /save credentials/i }));
    await userEvent.click(await screen.findByRole("button", { name: /finish setup/i }));

    expect(ensureSoundcoreBackendAccess).toHaveBeenCalled();
    expect(api.get).toHaveBeenCalledWith("/api/soundcore/status");
    expect(await screen.findByText(/soundcore connected/i)).toBeInTheDocument();
  });

  it("fills Soundcore fields from a pasted env block", async () => {
    const api = mockApi();
    const tcw = mockTinyCloud();
    const ensureSoundcoreBackendAccess = vi.fn().mockResolvedValue(undefined);

    render(
      <SourcesSetup
        api={api}
        tcw={tcw}
        hasBackendDelegation={true}
        onEnsureBackendAccess={vi.fn()}
        onEnsureFirefliesBackendAccess={vi.fn()}
        onEnsureGranolaBackendAccess={vi.fn()}
        onEnsureSoundcoreBackendAccess={ensureSoundcoreBackendAccess}
        onFirefliesComplete={vi.fn()}
        onGranolaComplete={vi.fn()}
      />,
    );

    const soundcoreCard = screen.getByText("Soundcore").closest("div")
      ?.parentElement?.parentElement;
    expect(soundcoreCard).toBeTruthy();
    await userEvent.click(
      within(soundcoreCard as HTMLElement).getByRole("button", { name: /connect ->/i }),
    );

    await userEvent.type(
      screen.getByLabelText(/paste soundcore values/i),
      [
        "SOUNDCORE_AUTH_TOKEN=auth-token",
        "SOUNDCORE_UID=uid-value",
        "SOUNDCORE_OPENUDID=openudid-value",
      ].join("\n"),
    );
    await userEvent.click(screen.getByRole("button", { name: /fill fields from pasted block/i }));
    await userEvent.click(screen.getByRole("button", { name: /save credentials/i }));

    expect(tcw.secrets.put).toHaveBeenCalledWith(
      "SOUNDCORE_SESSION",
      JSON.stringify({
        authToken: "auth-token",
        uid: "uid-value",
        openudid: "openudid-value",
      }),
    );
    expect(ensureSoundcoreBackendAccess).not.toHaveBeenCalled();
  });

  it("can start a Soundcore sync after credentials connect", async () => {
    const api = mockApi({
      post: vi.fn().mockResolvedValue({
        synced: 2,
        skipped: 1,
        skippedNoTranscript: 3,
        failed: 0,
        errors: [],
        conversations: [],
      }),
    });
    const tcw = mockTinyCloud();
    const ensureSoundcoreBackendAccess = vi.fn().mockResolvedValue(undefined);

    render(
      <SourcesSetup
        api={api}
        tcw={tcw}
        hasBackendDelegation={true}
        onEnsureBackendAccess={vi.fn()}
        onEnsureFirefliesBackendAccess={vi.fn()}
        onEnsureGranolaBackendAccess={vi.fn()}
        onEnsureSoundcoreBackendAccess={ensureSoundcoreBackendAccess}
        onFirefliesComplete={vi.fn()}
        onGranolaComplete={vi.fn()}
      />,
    );

    const soundcoreCard = screen.getByText("Soundcore").closest("div")
      ?.parentElement?.parentElement;
    expect(soundcoreCard).toBeTruthy();
    await userEvent.click(
      within(soundcoreCard as HTMLElement).getByRole("button", { name: /connect ->/i }),
    );

    await userEvent.type(screen.getByLabelText("X-Auth-Token"), "auth-token");
    await userEvent.type(screen.getByLabelText("Uid"), "uid-value");
    await userEvent.type(screen.getByLabelText("Openudid"), "openudid-value");
    await userEvent.click(screen.getByRole("button", { name: /save credentials/i }));
    await userEvent.click(await screen.findByRole("button", { name: /finish setup/i }));

    await userEvent.click(await screen.findByRole("button", { name: /sync soundcore now/i }));

    expect(api.post).toHaveBeenCalledWith("/api/sync/soundcore", {});
    expect(await screen.findByText(/synced 2 notes/i)).toBeInTheDocument();
  });

  it("saves a transcription provider key through setup before upload", async () => {
    const api = mockApi();
    const tcw = mockTinyCloud();
    const onEnsureSecretBackendAccess = vi.fn().mockResolvedValue(undefined);
    const onTranscriptionProviderComplete = vi.fn();

    render(
      <SourcesSetup
        api={api}
        tcw={tcw}
        hasBackendDelegation={true}
        onEnsureBackendAccess={vi.fn()}
        onEnsureFirefliesBackendAccess={vi.fn()}
        onEnsureGranolaBackendAccess={vi.fn()}
        onEnsureSecretBackendAccess={onEnsureSecretBackendAccess}
        onFirefliesComplete={vi.fn()}
        onGranolaComplete={vi.fn()}
        onTranscriptionProviderComplete={onTranscriptionProviderComplete}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /connect ->/i })[0]!);
    fireEvent.change(screen.getByPlaceholderText(/paste your assemblyai api key/i), {
      target: { value: "assembly-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save key and connect/i }));

    await waitFor(() => {
      expect(tcw.secrets.put).toHaveBeenCalledWith("ASSEMBLYAI_API_KEY", "assembly-key");
    });
    expect(onEnsureSecretBackendAccess).toHaveBeenCalledWith("ASSEMBLYAI_API_KEY");
    expect(onTranscriptionProviderComplete).toHaveBeenCalledWith("assemblyai");
  });

  it("uploads media only with a ready provider and does not collect raw keys", async () => {
    const api = mockApi();
    const tcw = mockTinyCloud();
    const onEnsureSecretBackendAccess = vi.fn().mockResolvedValue(undefined);

    render(
      <SourcesSetup
        api={api}
        tcw={tcw}
        hasBackendDelegation={true}
        hasDeepgramKey={true}
        hasDeepgramBackendAccess={true}
        onEnsureBackendAccess={vi.fn()}
        onEnsureFirefliesBackendAccess={vi.fn()}
        onEnsureGranolaBackendAccess={vi.fn()}
        onEnsureSecretBackendAccess={onEnsureSecretBackendAccess}
        onFirefliesComplete={vi.fn()}
        onGranolaComplete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /upload ->/i }));
    fireEvent.change(screen.getByLabelText(/^provider$/i), { target: { value: "deepgram" } });
    expect(screen.queryByLabelText(/provider api key/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: "Uploaded call" } });
    fireEvent.change(screen.getByLabelText(/media file/i), {
      target: {
        files: [new File(["hello audio"], "call.wav", { type: "audio/wav" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /transcribe with deepgram/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/api/conversations/transcribe",
        expect.objectContaining({
          provider: "deepgram",
          title: "Uploaded call",
          fileName: "call.wav",
          contentType: "audio/wav",
          contentBase64: expect.any(String),
        }),
      );
    });
    expect(tcw.secrets.put).not.toHaveBeenCalled();
    expect(onEnsureSecretBackendAccess).not.toHaveBeenCalled();
  });

  it("defaults transcription upload to Deepgram when only Deepgram is ready", async () => {
    const api = mockApi();
    const tcw = mockTinyCloud();

    render(
      <SourcesSetup
        api={api}
        tcw={tcw}
        hasBackendDelegation={true}
        hasDeepgramKey={true}
        hasDeepgramBackendAccess={true}
        onEnsureBackendAccess={vi.fn()}
        onEnsureFirefliesBackendAccess={vi.fn()}
        onEnsureGranolaBackendAccess={vi.fn()}
        onFirefliesComplete={vi.fn()}
        onGranolaComplete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /upload ->/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/^provider$/i)).toHaveValue("deepgram");
    });

    fireEvent.change(screen.getByLabelText(/media file/i), {
      target: {
        files: [new File(["hello audio"], "call.wav", { type: "audio/wav" })],
      },
    });

    expect(screen.getByRole("button", { name: /transcribe with deepgram/i })).toBeEnabled();
  });
});
