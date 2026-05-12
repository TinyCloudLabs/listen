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

    await userEvent.click(screen.getAllByRole("button", { name: /connect ->/i })[1]!);
    await userEvent.type(screen.getByPlaceholderText(/paste your granola api key/i), "grn_test");
    await userEvent.click(screen.getByRole("button", { name: /save key and connect/i }));

    expect(tcw.secrets.put).toHaveBeenCalledWith("GRANOLA_API_KEY", "grn_test");
    expect(ensureGranolaBackendAccess).toHaveBeenCalled();
    expect(api.get).toHaveBeenCalledWith("/api/granola/status");
    expect(await screen.findByText(/granola connected/i)).toBeInTheDocument();
  });

  it("saves the selected provider key, uploads media, and posts a transcribe request", async () => {
    const api = mockApi();
    const tcw = mockTinyCloud();
    const onEnsureSecretBackendAccess = vi.fn().mockResolvedValue(undefined);

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
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /transcribe ->/i }));
    fireEvent.change(screen.getByLabelText(/^provider$/i), { target: { value: "deepgram" } });
    fireEvent.change(screen.getByLabelText(/provider api key/i), {
      target: { value: "deepgram-key" },
    });
    fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: "Uploaded call" } });
    fireEvent.change(screen.getByLabelText(/media file/i), {
      target: {
        files: [new File(["hello audio"], "call.wav", { type: "audio/wav" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /upload and transcribe/i }));

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
    expect(tcw.secrets.put).toHaveBeenCalledWith("DEEPGRAM_API_KEY", "deepgram-key");
    expect(onEnsureSecretBackendAccess).toHaveBeenCalledWith("DEEPGRAM_API_KEY");
  });
});
