import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
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

    await userEvent.click(screen.getAllByRole("button", { name: /connect ->/i }).at(-1)!);
    await userEvent.type(screen.getByPlaceholderText(/paste your granola api key/i), "grn_test");
    await userEvent.click(screen.getByRole("button", { name: /save key and connect/i }));

    expect(tcw.secrets.put).toHaveBeenCalledWith("GRANOLA_API_KEY", "grn_test");
    expect(ensureGranolaBackendAccess).toHaveBeenCalled();
    expect(api.get).toHaveBeenCalledWith("/api/granola/status");
    expect(await screen.findByText(/granola connected/i)).toBeInTheDocument();
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
