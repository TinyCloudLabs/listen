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

  it("does not present consent actions while delegation activation is unavailable", () => {
    render(
      <SourcesSetup
        api={mockApi()}
        tcw={mockTinyCloud()}
        hasFirefliesKey={true}
        hasGranolaKey={true}
        hasSoundcoreKey={true}
        hasBackendDelegation={false}
        backendDelegationState="unavailable"
        onEnsureBackendAccess={vi.fn()}
        onEnsureFirefliesBackendAccess={vi.fn()}
        onEnsureGranolaBackendAccess={vi.fn()}
        onFirefliesComplete={vi.fn()}
        onGranolaComplete={vi.fn()}
      />,
    );

    expect(screen.queryAllByRole("button", { name: /finish setup|finish access/i })).toHaveLength(
      0,
    );
  });

  it.each(["AssemblyAI", "Deepgram", "Fireflies", "Granola", "Soundcore"])(
    "rechecks instead of opening the key-absent %s setup flow while unavailable",
    async (title) => {
      const recheck = vi.fn().mockResolvedValue(undefined);
      const ensureBackend = vi.fn().mockResolvedValue(undefined);
      const ensureFireflies = vi.fn().mockResolvedValue(undefined);
      const ensureGranola = vi.fn().mockResolvedValue(undefined);
      const ensureSecret = vi.fn().mockResolvedValue(undefined);
      const api = mockApi();
      const tcw = mockTinyCloud();

      render(
        <SourcesSetup
          api={api}
          tcw={tcw}
          hasBackendDelegation={false}
          backendDelegationState="unavailable"
          onEnsureBackendAccess={ensureBackend}
          onEnsureFirefliesBackendAccess={ensureFireflies}
          onEnsureGranolaBackendAccess={ensureGranola}
          onEnsureSecretBackendAccess={ensureSecret}
          onRecheckBackendState={recheck}
          onFirefliesComplete={vi.fn()}
          onGranolaComplete={vi.fn()}
        />,
      );

      const card = screen.getByText(title).closest("div")?.parentElement?.parentElement;
      await userEvent.click(
        within(card as HTMLElement).getByRole("button", { name: /try again/i }),
      );

      expect(recheck).toHaveBeenCalledTimes(1);
      expect(ensureBackend).not.toHaveBeenCalled();
      expect(ensureFireflies).not.toHaveBeenCalled();
      expect(ensureGranola).not.toHaveBeenCalled();
      expect(ensureSecret).not.toHaveBeenCalled();
      expect(tcw.secrets.put).not.toHaveBeenCalled();
      expect(api.get).not.toHaveBeenCalled();
      expect(api.post).not.toHaveBeenCalled();
    },
  );

  it("rechecks instead of opening Google Meet while unavailable", async () => {
    const recheck = vi.fn().mockResolvedValue(undefined);
    const ensureBackend = vi.fn().mockResolvedValue(undefined);
    const api = mockApi();

    render(
      <SourcesSetup
        api={api}
        tcw={mockTinyCloud()}
        googleMeetAvailable
        hasBackendDelegation={false}
        backendDelegationState="unavailable"
        onEnsureBackendAccess={ensureBackend}
        onEnsureFirefliesBackendAccess={vi.fn()}
        onEnsureGranolaBackendAccess={vi.fn()}
        onRecheckBackendState={recheck}
        onFirefliesComplete={vi.fn()}
        onGranolaComplete={vi.fn()}
      />,
    );

    const card = screen.getByText("Google Meet").closest("div")?.parentElement?.parentElement;
    await userEvent.click(within(card as HTMLElement).getByRole("button", { name: /try again/i }));

    expect(recheck).toHaveBeenCalledTimes(1);
    expect(ensureBackend).not.toHaveBeenCalled();
    expect(api.get).not.toHaveBeenCalled();
    expect(screen.queryByText(/connect google/i)).not.toBeInTheDocument();
  });

  it("clears the closed Google popup poll before one unavailable recheck", async () => {
    vi.useFakeTimers();
    try {
      const recheck = vi.fn().mockResolvedValue(undefined);
      const popup = { closed: false };
      const open = vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
      const props = {
        api: mockApi({
          get: vi.fn().mockResolvedValue({ authUrl: "https://accounts.google.com" }),
        }),
        tcw: mockTinyCloud(),
        googleMeetAvailable: true,
        hasBackendDelegation: true,
        backendDelegationState: "ready" as const,
        onEnsureBackendAccess: vi.fn().mockResolvedValue(undefined),
        onEnsureFirefliesBackendAccess: vi.fn(),
        onEnsureGranolaBackendAccess: vi.fn(),
        onRecheckBackendState: recheck,
        onFirefliesComplete: vi.fn(),
        onGranolaComplete: vi.fn(),
      };
      const { rerender } = render(<SourcesSetup {...props} />);
      const googleCard = screen.getByText("Google Meet").closest("div")
        ?.parentElement?.parentElement;

      fireEvent.click(
        within(googleCard as HTMLElement).getByRole("button", { name: /connect ->/i }),
      );
      fireEvent.click(screen.getByRole("button", { name: /connect google/i }));
      await vi.waitFor(() => expect(open).toHaveBeenCalled());

      rerender(<SourcesSetup {...props} backendDelegationState="unavailable" />);
      popup.closed = true;
      vi.advanceTimersByTime(500);
      await Promise.resolve();

      expect(recheck).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(2_000);
      expect(recheck).toHaveBeenCalledTimes(1);
      open.mockRestore();
    } finally {
      vi.useRealTimers();
    }
  });

  it("holds the OAuth mutation lease across Back and releases it only after popup close", async () => {
    vi.useFakeTimers();
    try {
      const popup = { closed: false };
      const open = vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
      const get = vi.fn().mockResolvedValue({ authUrl: "https://accounts.google.com" });
      const props = {
        api: mockApi({ get }),
        tcw: mockTinyCloud(),
        googleMeetAvailable: true,
        hasBackendDelegation: true,
        backendDelegationState: "ready" as const,
        onEnsureBackendAccess: vi.fn().mockResolvedValue(undefined),
        onEnsureFirefliesBackendAccess: vi.fn(),
        onEnsureGranolaBackendAccess: vi.fn(),
        onFirefliesComplete: vi.fn(),
        onGranolaComplete: vi.fn(),
      };
      render(<SourcesSetup {...props} />);

      const googleCard = screen.getByText("Google Meet").closest("div")
        ?.parentElement?.parentElement;
      fireEvent.click(
        within(googleCard as HTMLElement).getByRole("button", { name: /connect ->/i }),
      );
      fireEvent.click(screen.getByRole("button", { name: /connect google/i }));
      await vi.waitFor(() => expect(open).toHaveBeenCalledTimes(1));

      fireEvent.click(screen.getByRole("button", { name: /^Back$/i }));
      const cards = screen.getByText("Google Meet").closest("div")?.parentElement?.parentElement;
      fireEvent.click(within(cards as HTMLElement).getByRole("button", { name: /connect ->/i }));
      expect(get).toHaveBeenCalledTimes(1);
      expect(open).toHaveBeenCalledTimes(1);

      popup.closed = true;
      vi.advanceTimersByTime(500);
      await Promise.resolve();
      await vi.waitFor(() => expect(screen.getByText("Google Meet")).toBeInTheDocument());

      fireEvent.click(
        within(
          screen.getByText("Google Meet").closest("div")?.parentElement
            ?.parentElement as HTMLElement,
        ).getByRole("button", { name: /connect ->/i }),
      );
      fireEvent.click(screen.getByRole("button", { name: /connect google/i }));
      await vi.waitFor(() => expect(open).toHaveBeenCalledTimes(2));
      expect(get).toHaveBeenCalledTimes(2);
      open.mockRestore();
    } finally {
      vi.useRealTimers();
    }
  });

  it("allows Continue to leave an already-open success step after becoming unavailable", async () => {
    const api = mockApi();
    const tcw = mockTinyCloud();
    const recheck = vi.fn().mockResolvedValue(undefined);
    const ensureGranola = vi.fn().mockResolvedValue(undefined);
    const onGranolaComplete = vi.fn();
    const props = {
      api,
      tcw,
      hasBackendDelegation: true,
      backendDelegationState: "ready" as const,
      onEnsureBackendAccess: vi.fn().mockResolvedValue(undefined),
      onEnsureFirefliesBackendAccess: vi.fn().mockResolvedValue(undefined),
      onEnsureGranolaBackendAccess: ensureGranola,
      onRecheckBackendState: recheck,
      onFirefliesComplete: vi.fn(),
      onGranolaComplete,
    };
    const { rerender } = render(<SourcesSetup {...props} />);

    const granolaCard = screen.getByText("Granola").closest("div")?.parentElement?.parentElement;
    await userEvent.click(
      within(granolaCard as HTMLElement).getByRole("button", { name: /connect ->/i }),
    );
    await userEvent.type(screen.getByPlaceholderText(/paste your granola api key/i), "grn_test");
    await userEvent.click(screen.getByRole("button", { name: /save key and connect/i }));
    await screen.findByText(/granola connected/i);

    rerender(<SourcesSetup {...props} backendDelegationState="unavailable" />);
    await userEvent.click(screen.getByRole("button", { name: /^continue to library$/i }));

    expect(recheck).not.toHaveBeenCalled();
    expect(onGranolaComplete).toHaveBeenCalledTimes(1);
  });

  it("rechecks instead of accepting an already-open Google success message after becoming unavailable", async () => {
    const recheck = vi.fn().mockResolvedValue(undefined);
    const onGoogleMeetComplete = vi.fn();
    const popup = { closed: false };
    const open = vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    const props = {
      api: mockApi({ get: vi.fn().mockResolvedValue({ authUrl: "https://accounts.google.com" }) }),
      tcw: mockTinyCloud(),
      googleMeetAvailable: true,
      hasBackendDelegation: true,
      backendDelegationState: "ready" as const,
      onEnsureBackendAccess: vi.fn().mockResolvedValue(undefined),
      onEnsureFirefliesBackendAccess: vi.fn(),
      onEnsureGranolaBackendAccess: vi.fn(),
      onRecheckBackendState: recheck,
      onGoogleMeetComplete,
      onFirefliesComplete: vi.fn(),
      onGranolaComplete: vi.fn(),
    };
    const { rerender } = render(<SourcesSetup {...props} />);

    const googleCard = screen.getByText("Google Meet").closest("div")?.parentElement?.parentElement;
    await userEvent.click(
      within(googleCard as HTMLElement).getByRole("button", { name: /connect ->/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: /connect google/i }));
    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    rerender(<SourcesSetup {...props} backendDelegationState="unavailable" />);
    window.dispatchEvent(new MessageEvent("message", { data: { type: "google-auth-success" } }));

    await waitFor(() => expect(recheck).toHaveBeenCalledTimes(1));
    expect(onGoogleMeetComplete).not.toHaveBeenCalled();
    expect(screen.queryByText(/google account connected/i)).not.toBeInTheDocument();
    open.mockRestore();
  });

  it("rechecks unavailable source access without creating a grant", async () => {
    const recheck = vi.fn().mockResolvedValue(undefined);
    const ensureFireflies = vi.fn().mockResolvedValue(undefined);
    render(
      <SourcesSetup
        api={mockApi()}
        tcw={mockTinyCloud()}
        hasFirefliesKey={true}
        hasBackendDelegation={false}
        backendDelegationState="unavailable"
        onEnsureBackendAccess={vi.fn()}
        onEnsureFirefliesBackendAccess={ensureFireflies}
        onEnsureGranolaBackendAccess={vi.fn()}
        onRecheckBackendState={recheck}
        onFirefliesComplete={vi.fn()}
        onGranolaComplete={vi.fn()}
      />,
    );

    const firefliesCard = screen.getByText("Fireflies").closest("div")
      ?.parentElement?.parentElement;
    await userEvent.click(
      within(firefliesCard as HTMLElement).getByRole("button", { name: /try again/i }),
    );

    expect(recheck).toHaveBeenCalledTimes(1);
    expect(ensureFireflies).not.toHaveBeenCalled();
  });

  it("rechecks from an open source error flow without retrying a grant", async () => {
    const recheck = vi.fn().mockResolvedValue(undefined);
    const ensureFireflies = vi.fn().mockRejectedValue(new Error("activation unavailable"));
    const props = {
      api: mockApi(),
      tcw: mockTinyCloud(),
      hasFirefliesKey: true,
      hasBackendDelegation: true,
      backendDelegationState: "ready" as const,
      hasFirefliesBackendAccess: false,
      onEnsureBackendAccess: vi.fn().mockResolvedValue(undefined),
      onEnsureFirefliesBackendAccess: ensureFireflies,
      onEnsureGranolaBackendAccess: vi.fn().mockResolvedValue(undefined),
      onRecheckBackendState: recheck,
      onFirefliesComplete: vi.fn(),
      onGranolaComplete: vi.fn(),
    };
    const { rerender } = render(<SourcesSetup {...props} />);

    await userEvent.click(screen.getByRole("button", { name: /finish setup/i }));
    expect(await screen.findByText("activation unavailable")).toBeInTheDocument();
    expect(ensureFireflies).toHaveBeenCalledTimes(1);

    rerender(
      <SourcesSetup {...props} hasBackendDelegation={false} backendDelegationState="unavailable" />,
    );
    await userEvent.click(screen.getByRole("button", { name: /try access again/i }));

    expect(recheck).toHaveBeenCalledTimes(1);
    expect(ensureFireflies).toHaveBeenCalledTimes(1);
  });

  it("rechecks unavailable transcription access without opening key or grant flows", async () => {
    const recheck = vi.fn().mockResolvedValue(undefined);
    const ensureBackend = vi.fn().mockResolvedValue(undefined);
    const ensureSecret = vi.fn().mockResolvedValue(undefined);
    const props = {
      api: mockApi(),
      tcw: mockTinyCloud(),
      hasAssemblyAIKey: true,
      hasBackendDelegation: true,
      backendDelegationState: "ready" as const,
      onEnsureBackendAccess: ensureBackend,
      onEnsureFirefliesBackendAccess: vi.fn(),
      onEnsureGranolaBackendAccess: vi.fn(),
      onEnsureSecretBackendAccess: ensureSecret,
      onRecheckBackendState: recheck,
      onFirefliesComplete: vi.fn(),
      onGranolaComplete: vi.fn(),
    };
    const { rerender } = render(<SourcesSetup {...props} />);

    await userEvent.click(screen.getByRole("button", { name: /upload ->/i }));
    rerender(<SourcesSetup {...props} backendDelegationState="unavailable" />);
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(recheck).toHaveBeenCalledTimes(1);
    expect(ensureBackend).not.toHaveBeenCalled();
    expect(ensureSecret).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText(/paste your assemblyai api key/i)).not.toBeInTheDocument();
  });

  it("rechecks before an already-open owner-secret save when state becomes unavailable", async () => {
    const api = mockApi();
    const tcw = mockTinyCloud();
    const recheck = vi.fn().mockResolvedValue(undefined);
    const props = {
      api,
      tcw,
      hasBackendDelegation: true,
      backendDelegationState: "ready" as const,
      onEnsureBackendAccess: vi.fn().mockResolvedValue(undefined),
      onEnsureFirefliesBackendAccess: vi.fn().mockResolvedValue(undefined),
      onEnsureGranolaBackendAccess: vi.fn().mockResolvedValue(undefined),
      onRecheckBackendState: recheck,
      onFirefliesComplete: vi.fn(),
      onGranolaComplete: vi.fn(),
    };
    const { rerender } = render(<SourcesSetup {...props} />);

    const firefliesCard = screen.getByText("Fireflies").closest("div")
      ?.parentElement?.parentElement;
    await userEvent.click(
      within(firefliesCard as HTMLElement).getByRole("button", { name: /connect ->/i }),
    );
    await userEvent.type(screen.getByPlaceholderText(/paste your fireflies api key/i), "ff-key");

    rerender(<SourcesSetup {...props} backendDelegationState="unavailable" />);
    await userEvent.click(screen.getByRole("button", { name: /save key and connect/i }));

    expect(recheck).toHaveBeenCalledTimes(1);
    expect(tcw.secrets.put).not.toHaveBeenCalled();
    expect(props.onEnsureFirefliesBackendAccess).not.toHaveBeenCalled();
  });

  it("rechecks before an already-open Soundcore credential save when unavailable", async () => {
    const api = mockApi();
    const tcw = mockTinyCloud();
    const recheck = vi.fn().mockResolvedValue(undefined);
    const props = {
      api,
      tcw,
      hasBackendDelegation: true,
      backendDelegationState: "ready" as const,
      onEnsureBackendAccess: vi.fn().mockResolvedValue(undefined),
      onEnsureFirefliesBackendAccess: vi.fn().mockResolvedValue(undefined),
      onEnsureGranolaBackendAccess: vi.fn().mockResolvedValue(undefined),
      onEnsureSoundcoreBackendAccess: vi.fn().mockResolvedValue(undefined),
      onRecheckBackendState: recheck,
      onFirefliesComplete: vi.fn(),
      onGranolaComplete: vi.fn(),
    };
    const { rerender } = render(<SourcesSetup {...props} />);

    const soundcoreCard = screen.getByText("Soundcore").closest("div")
      ?.parentElement?.parentElement;
    await userEvent.click(
      within(soundcoreCard as HTMLElement).getByRole("button", { name: /connect ->/i }),
    );
    await userEvent.type(screen.getByLabelText("X-Auth-Token"), "auth-token");
    await userEvent.type(screen.getByLabelText("Uid"), "uid-value");
    await userEvent.type(screen.getByLabelText("Openudid"), "openudid-value");

    rerender(<SourcesSetup {...props} backendDelegationState="unavailable" />);
    await userEvent.click(screen.getByRole("button", { name: /save credentials/i }));

    expect(recheck).toHaveBeenCalledTimes(1);
    expect(tcw.secrets.put).not.toHaveBeenCalled();
    expect(props.onEnsureSoundcoreBackendAccess).not.toHaveBeenCalled();
  });

  it("rechecks instead of syncing Soundcore when a connected flow becomes unavailable", async () => {
    const api = mockApi();
    const tcw = mockTinyCloud();
    const recheck = vi.fn().mockResolvedValue(undefined);
    const props = {
      api,
      tcw,
      hasBackendDelegation: true,
      backendDelegationState: "ready" as const,
      onEnsureBackendAccess: vi.fn().mockResolvedValue(undefined),
      onEnsureFirefliesBackendAccess: vi.fn().mockResolvedValue(undefined),
      onEnsureGranolaBackendAccess: vi.fn().mockResolvedValue(undefined),
      onEnsureSoundcoreBackendAccess: vi.fn().mockResolvedValue(undefined),
      onRecheckBackendState: recheck,
      onFirefliesComplete: vi.fn(),
      onGranolaComplete: vi.fn(),
    };
    const { rerender } = render(<SourcesSetup {...props} />);

    const soundcoreCard = screen.getByText("Soundcore").closest("div")
      ?.parentElement?.parentElement;
    await userEvent.click(
      within(soundcoreCard as HTMLElement).getByRole("button", { name: /connect ->/i }),
    );
    await userEvent.type(screen.getByLabelText("X-Auth-Token"), "auth-token");
    await userEvent.type(screen.getByLabelText("Uid"), "uid-value");
    await userEvent.type(screen.getByLabelText("Openudid"), "openudid-value");
    await userEvent.click(screen.getByRole("button", { name: /save credentials/i }));
    await userEvent.click(await screen.findByRole("button", { name: /finish setup/i }));
    vi.mocked(api.post).mockClear();

    rerender(<SourcesSetup {...props} backendDelegationState="unavailable" />);
    await userEvent.click(await screen.findByRole("button", { name: /sync soundcore now/i }));

    expect(recheck).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
  });

  it("rechecks instead of saving a webhook when an open flow becomes unavailable", async () => {
    const api = mockApi({
      get: vi.fn().mockResolvedValue({ name: "Test User", email: "test@example.com" }),
    });
    const tcw = mockTinyCloud();
    const recheck = vi.fn().mockResolvedValue(undefined);
    const props = {
      api,
      tcw,
      hasBackendDelegation: true,
      backendDelegationState: "ready" as const,
      onEnsureBackendAccess: vi.fn().mockResolvedValue(undefined),
      onEnsureFirefliesBackendAccess: vi.fn().mockResolvedValue(undefined),
      onEnsureGranolaBackendAccess: vi.fn().mockResolvedValue(undefined),
      onRecheckBackendState: recheck,
      onFirefliesComplete: vi.fn(),
      onGranolaComplete: vi.fn(),
    };
    const { rerender } = render(<SourcesSetup {...props} />);

    const firefliesCard = screen.getByText("Fireflies").closest("div")
      ?.parentElement?.parentElement;
    await userEvent.click(
      within(firefliesCard as HTMLElement).getByRole("button", { name: /connect ->/i }),
    );
    await userEvent.type(screen.getByPlaceholderText(/paste your fireflies api key/i), "ff-key");
    await userEvent.click(screen.getByRole("button", { name: /save key and connect/i }));
    await userEvent.click(await screen.findByRole("button", { name: /configure webhook/i }));
    await userEvent.type(screen.getByPlaceholderText(/16-32 characters/i), "test-webhook-secret");
    vi.mocked(api.put).mockClear();

    rerender(<SourcesSetup {...props} backendDelegationState="unavailable" />);
    await userEvent.click(screen.getByRole("button", { name: /save secret/i }));

    expect(recheck).toHaveBeenCalledTimes(1);
    expect(api.put).not.toHaveBeenCalled();
  });

  it("rechecks instead of uploading media when an open flow becomes unavailable", async () => {
    const api = mockApi();
    const recheck = vi.fn().mockResolvedValue(undefined);
    const props = {
      api,
      tcw: mockTinyCloud(),
      hasDeepgramKey: true,
      hasDeepgramBackendAccess: true,
      hasBackendDelegation: true,
      backendDelegationState: "ready" as const,
      onEnsureBackendAccess: vi.fn().mockResolvedValue(undefined),
      onEnsureFirefliesBackendAccess: vi.fn().mockResolvedValue(undefined),
      onEnsureGranolaBackendAccess: vi.fn().mockResolvedValue(undefined),
      onRecheckBackendState: recheck,
      onFirefliesComplete: vi.fn(),
      onGranolaComplete: vi.fn(),
    };
    const { rerender } = render(<SourcesSetup {...props} />);

    await userEvent.click(screen.getByRole("button", { name: /upload ->/i }));
    fireEvent.change(screen.getByLabelText(/media file/i), {
      target: { files: [new File(["audio"], "call.wav", { type: "audio/wav" })] },
    });
    vi.mocked(api.post).mockClear();

    rerender(<SourcesSetup {...props} backendDelegationState="unavailable" />);
    await userEvent.click(screen.getByRole("button", { name: /transcribe with deepgram/i }));

    expect(recheck).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
  });

  it("shows explicit source consent when the base delegation is ready", () => {
    render(
      <SourcesSetup
        api={mockApi()}
        tcw={mockTinyCloud()}
        hasFirefliesKey={true}
        hasBackendDelegation={true}
        backendDelegationState="ready"
        hasFirefliesBackendAccess={false}
        onEnsureBackendAccess={vi.fn()}
        onEnsureFirefliesBackendAccess={vi.fn()}
        onEnsureGranolaBackendAccess={vi.fn()}
        onFirefliesComplete={vi.fn()}
        onGranolaComplete={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /finish setup/i })).toBeInTheDocument();
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

  it("finishes an import that started before access revalidation became pending", async () => {
    let resolveEnsure: (() => void) | undefined;
    let resolveImport: ((result: { conversationId: string; title: string }) => void) | undefined;
    const onEnsureBackendAccess = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveEnsure = resolve;
        }),
    );
    const onRecheckBackendState = vi.fn().mockResolvedValue(undefined);
    const api = mockApi({
      post: vi.fn(
        () =>
          new Promise((resolve) => {
            resolveImport = resolve as (result: { conversationId: string; title: string }) => void;
          }),
      ),
    });
    const props = {
      api,
      tcw: mockTinyCloud(),
      initialStep: "transcript-import" as const,
      hasBackendDelegation: false,
      backendDelegationState: "needs_consent" as const,
      backendAccessPending: false,
      onEnsureBackendAccess,
      onEnsureFirefliesBackendAccess: vi.fn(),
      onEnsureGranolaBackendAccess: vi.fn(),
      onRecheckBackendState,
      onFirefliesComplete: vi.fn(),
      onGranolaComplete: vi.fn(),
    };
    const { rerender } = render(<SourcesSetup {...props} />);

    fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: "Imported" } });
    fireEvent.change(screen.getByLabelText(/^transcript$/i), {
      target: { value: "Speaker: hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^import transcript$/i }));
    await waitFor(() => expect(onEnsureBackendAccess).toHaveBeenCalledTimes(1));

    rerender(<SourcesSetup {...props} backendAccessPending />);
    resolveEnsure?.();
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/api/conversations/import",
        expect.objectContaining({ transcriptText: "Speaker: hello" }),
      ),
    );

    resolveImport?.({ conversationId: "conv-import", title: "Imported" });
    expect(await screen.findByText("Transcript imported")).toBeInTheDocument();
    expect(onRecheckBackendState).not.toHaveBeenCalled();
  });

  it("blocks a second source mutation after Back while transcript import is pending", async () => {
    let resolveImport: ((result: { conversationId: string; title: string }) => void) | undefined;
    const api = mockApi({
      post: vi.fn(
        () =>
          new Promise((resolve) => {
            resolveImport = resolve as (result: { conversationId: string; title: string }) => void;
          }),
      ),
    });
    const tcw = mockTinyCloud();
    const ensureFireflies = vi.fn().mockResolvedValue(undefined);
    const open = vi.spyOn(window, "open").mockReturnValue(null);

    render(
      <SourcesSetup
        api={api}
        tcw={tcw}
        initialStep="transcript-import"
        hasBackendDelegation={true}
        onEnsureBackendAccess={vi.fn()}
        onEnsureFirefliesBackendAccess={ensureFireflies}
        onEnsureGranolaBackendAccess={vi.fn()}
        onFirefliesComplete={vi.fn()}
        onGranolaComplete={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: "Imported" } });
    fireEvent.change(screen.getByLabelText(/^transcript$/i), {
      target: { value: "Speaker: hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^import transcript$/i }));
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /^back$/i }));
    const firefliesCard = screen.getByText("Fireflies").closest("div")
      ?.parentElement?.parentElement;
    fireEvent.click(
      within(firefliesCard as HTMLElement).getByRole("button", { name: /connect ->/i }),
    );

    expect(screen.queryByPlaceholderText(/paste your fireflies api key/i)).not.toBeInTheDocument();
    expect(tcw.secrets.put).not.toHaveBeenCalled();
    expect(ensureFireflies).not.toHaveBeenCalled();
    expect(api.get).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();

    resolveImport?.({ conversationId: "conv-import", title: "Imported" });
    expect(await screen.findByText("Transcript imported")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /add another/i }));
    const unlockedFirefliesCard = screen.getByText("Fireflies").closest("div")
      ?.parentElement?.parentElement;
    fireEvent.click(
      within(unlockedFirefliesCard as HTMLElement).getByRole("button", { name: /connect ->/i }),
    );
    fireEvent.change(screen.getByPlaceholderText(/paste your fireflies api key/i), {
      target: { value: "fireflies-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save key and connect/i }));

    await waitFor(() => {
      expect(tcw.secrets.put).toHaveBeenCalledWith("FIREFLIES_API_KEY", "fireflies-key");
      expect(ensureFireflies).toHaveBeenCalledTimes(1);
    });
    open.mockRestore();
  });

  it("releases the shared mutation lock after a failed transcript import", async () => {
    const api = mockApi({ post: vi.fn().mockRejectedValue(new Error("import failed")) });
    const tcw = mockTinyCloud();
    const ensureFireflies = vi.fn().mockResolvedValue(undefined);

    render(
      <SourcesSetup
        api={api}
        tcw={tcw}
        initialStep="transcript-import"
        hasBackendDelegation={true}
        onEnsureBackendAccess={vi.fn()}
        onEnsureFirefliesBackendAccess={ensureFireflies}
        onEnsureGranolaBackendAccess={vi.fn()}
        onFirefliesComplete={vi.fn()}
        onGranolaComplete={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: "Imported" } });
    fireEvent.change(screen.getByLabelText(/^transcript$/i), {
      target: { value: "Speaker: hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^import transcript$/i }));
    expect(await screen.findByTestId("transcript-import-error")).toHaveTextContent("import failed");

    fireEvent.click(screen.getByRole("button", { name: /^back$/i }));
    const firefliesCard = screen.getByText("Fireflies").closest("div")
      ?.parentElement?.parentElement;
    fireEvent.click(
      within(firefliesCard as HTMLElement).getByRole("button", { name: /connect ->/i }),
    );
    fireEvent.change(screen.getByPlaceholderText(/paste your fireflies api key/i), {
      target: { value: "fireflies-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save key and connect/i }));

    await waitFor(() => {
      expect(tcw.secrets.put).toHaveBeenCalledWith("FIREFLIES_API_KEY", "fireflies-key");
      expect(ensureFireflies).toHaveBeenCalledTimes(1);
    });
  });

  it("releases the shared mutation lock after a synchronous transcript import throw", async () => {
    const api = mockApi({
      post: vi.fn(() => {
        throw new Error("import threw");
      }),
    });
    const tcw = mockTinyCloud();
    const ensureFireflies = vi.fn().mockResolvedValue(undefined);

    render(
      <SourcesSetup
        api={api}
        tcw={tcw}
        initialStep="transcript-import"
        hasBackendDelegation={true}
        onEnsureBackendAccess={vi.fn()}
        onEnsureFirefliesBackendAccess={ensureFireflies}
        onEnsureGranolaBackendAccess={vi.fn()}
        onFirefliesComplete={vi.fn()}
        onGranolaComplete={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: "Imported" } });
    fireEvent.change(screen.getByLabelText(/^transcript$/i), {
      target: { value: "Speaker: hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^import transcript$/i }));
    expect(await screen.findByTestId("transcript-import-error")).toHaveTextContent("import threw");

    fireEvent.click(screen.getByRole("button", { name: /^back$/i }));
    const firefliesCard = screen.getByText("Fireflies").closest("div")
      ?.parentElement?.parentElement;
    fireEvent.click(
      within(firefliesCard as HTMLElement).getByRole("button", { name: /connect ->/i }),
    );
    fireEvent.change(screen.getByPlaceholderText(/paste your fireflies api key/i), {
      target: { value: "fireflies-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save key and connect/i }));

    await waitFor(() => {
      expect(tcw.secrets.put).toHaveBeenCalledWith("FIREFLIES_API_KEY", "fireflies-key");
      expect(ensureFireflies).toHaveBeenCalledTimes(1);
    });
  });

  it("does not reset the active setup step when its initial step prop changes", async () => {
    const props = {
      api: mockApi(),
      tcw: mockTinyCloud(),
      initialStep: "transcript-import" as const,
      onEnsureBackendAccess: vi.fn(),
      onEnsureFirefliesBackendAccess: vi.fn(),
      onEnsureGranolaBackendAccess: vi.fn(),
      onFirefliesComplete: vi.fn(),
      onGranolaComplete: vi.fn(),
    };
    const { rerender } = render(<SourcesSetup {...props} />);

    expect(screen.getByLabelText(/^title$/i)).toBeInTheDocument();
    rerender(<SourcesSetup {...props} initialStep="cards" />);

    expect(screen.getByLabelText(/^title$/i)).toBeInTheDocument();
  });
});
