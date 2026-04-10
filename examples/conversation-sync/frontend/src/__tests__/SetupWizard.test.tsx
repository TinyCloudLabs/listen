import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { SetupWizard } from "../components/SetupWizard";
import type { ApiClient } from "@tinyboilerplate/client";

function mockApi(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
    ...overrides,
  };
}

describe("SetupWizard", () => {
  let api: ApiClient;
  let onComplete: ReturnType<typeof vi.fn>;

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    api = mockApi();
    onComplete = vi.fn();
  });

  // ── Source Picker ─────────────────────────────────────────────────

  it("shows source picker with Fireflies option", () => {
    render(<SetupWizard api={api} onComplete={onComplete} />);
    expect(screen.getByText(/connect a source/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /connect fireflies/i })).toBeInTheDocument();
  });

  it("shows Google Meet option when showGoogleMeet is true", () => {
    render(<SetupWizard api={api} onComplete={onComplete} showGoogleMeet={true} />);
    expect(screen.getByRole("button", { name: /connect google/i })).toBeInTheDocument();
  });

  it("hides Google Meet option when showGoogleMeet is false", () => {
    render(<SetupWizard api={api} onComplete={onComplete} showGoogleMeet={false} />);
    expect(screen.queryByRole("button", { name: /connect google/i })).not.toBeInTheDocument();
  });

  it("clicking Connect Fireflies goes to Fireflies welcome step", () => {
    render(<SetupWizard api={api} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("button", { name: /connect fireflies/i }));
    expect(screen.getByText(/connect fireflies/i)).toBeInTheDocument(); // welcome step title
    expect(screen.getByRole("button", { name: /get started/i })).toBeInTheDocument();
  });

  it("clicking Connect Google goes to Google connect step", () => {
    render(<SetupWizard api={api} onComplete={onComplete} showGoogleMeet={true} />);
    fireEvent.click(screen.getByRole("button", { name: /connect google/i }));
    expect(screen.getByText(/connect google account/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /connect with google/i })).toBeInTheDocument();
  });

  it("Google connect step opens popup on button click", async () => {
    const getMock = vi.fn().mockResolvedValue({ authUrl: "https://accounts.google.com/auth" });
    api = mockApi({ get: getMock });
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);

    render(<SetupWizard api={api} onComplete={onComplete} showGoogleMeet={true} />);
    fireEvent.click(screen.getByRole("button", { name: /connect google/i }));
    fireEvent.click(screen.getByRole("button", { name: /connect with google/i }));

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith("/api/auth/google");
      expect(openSpy).toHaveBeenCalled();
    });
    openSpy.mockRestore();
  });

  it("shows success after Google auth postMessage", async () => {
    const getMock = vi.fn().mockResolvedValue({ authUrl: "https://accounts.google.com/auth" });
    const googleComplete = vi.fn();
    api = mockApi({ get: getMock });
    vi.spyOn(window, "open").mockReturnValue(null);

    render(
      <SetupWizard
        api={api}
        onComplete={onComplete}
        onGoogleMeetComplete={googleComplete}
        showGoogleMeet={true}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /connect google/i }));
    fireEvent.click(screen.getByRole("button", { name: /connect with google/i }));

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith("/api/auth/google");
    });

    // Simulate postMessage from popup
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "google-auth-success" },
      }),
    );

    await waitFor(() => {
      expect(screen.getByText(/google account connected/i)).toBeInTheDocument();
    });

    vi.spyOn(window, "open").mockRestore();
  });

  it("Google success step shows real-time sync message", async () => {
    const getMock = vi.fn().mockResolvedValue({ authUrl: "https://accounts.google.com/auth" });
    api = mockApi({ get: getMock });
    vi.spyOn(window, "open").mockReturnValue(null);

    render(
      <SetupWizard
        api={api}
        onComplete={onComplete}
        onGoogleMeetComplete={vi.fn()}
        showGoogleMeet={true}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /connect google/i }));
    fireEvent.click(screen.getByRole("button", { name: /connect with google/i }));

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith("/api/auth/google");
    });

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "google-auth-success" },
      }),
    );

    await waitFor(() => {
      expect(screen.getByText(/real-time sync is active/i)).toBeInTheDocument();
    });

    vi.spyOn(window, "open").mockRestore();
  });

  it("calls onGoogleMeetComplete when clicking Start Syncing on Google success", async () => {
    const googleComplete = vi.fn();
    const getMock = vi.fn().mockResolvedValue({ authUrl: "https://accounts.google.com/auth" });
    api = mockApi({ get: getMock });
    vi.spyOn(window, "open").mockReturnValue(null);

    render(
      <SetupWizard
        api={api}
        onComplete={onComplete}
        onGoogleMeetComplete={googleComplete}
        showGoogleMeet={true}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /connect google/i }));
    fireEvent.click(screen.getByRole("button", { name: /connect with google/i }));

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith("/api/auth/google");
    });

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "google-auth-success" },
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /start syncing/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /start syncing/i }));
    expect(googleComplete).toHaveBeenCalledOnce();

    vi.spyOn(window, "open").mockRestore();
  });

  // ── Fireflies Flow (updated to go through picker first) ─────────

  // Step 1: Welcome (now reached via picker)
  it("renders source picker initially", () => {
    render(<SetupWizard api={api} onComplete={onComplete} />);
    expect(screen.getByText(/connect a source/i)).toBeInTheDocument();
  });

  // Step 2: Instructions
  it("advances to instructions step on Get Started click", () => {
    render(<SetupWizard api={api} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("button", { name: /connect fireflies/i }));
    fireEvent.click(screen.getByRole("button", { name: /get started/i }));
    expect(screen.getByText(/app\.fireflies\.ai/i)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "https://app.fireflies.ai/settings/developer-settings",
    );
  });

  // Step 3: Input
  it("advances to input step and shows API key field", () => {
    render(<SetupWizard api={api} onComplete={onComplete} />);
    // Picker -> Welcome -> Instructions -> Input
    fireEvent.click(screen.getByRole("button", { name: /connect fireflies/i }));
    fireEvent.click(screen.getByRole("button", { name: /get started/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByPlaceholderText(/paste your fireflies api key/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save & verify/i })).toBeInTheDocument();
  });

  it("disables Save & Verify button when API key input is empty", () => {
    render(<SetupWizard api={api} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("button", { name: /connect fireflies/i }));
    fireEvent.click(screen.getByRole("button", { name: /get started/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByRole("button", { name: /save & verify/i })).toBeDisabled();
  });

  it("calls PUT /api/config/fireflies-key on Save & Verify and advances to test step", async () => {
    const putMock = vi.fn().mockResolvedValue({ ok: true });
    const getMock = vi.fn().mockResolvedValue({ name: "Roman", email: "roman@example.com" });
    api = mockApi({ put: putMock, get: getMock });

    render(<SetupWizard api={api} onComplete={onComplete} />);
    // Navigate to input step
    fireEvent.click(screen.getByRole("button", { name: /connect fireflies/i }));
    fireEvent.click(screen.getByRole("button", { name: /get started/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    // Type key and save
    fireEvent.change(screen.getByPlaceholderText(/paste your fireflies api key/i), {
      target: { value: "test-api-key-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save & verify/i }));

    await waitFor(() => {
      expect(putMock).toHaveBeenCalledWith("/api/config/fireflies-key", {
        apiKey: "test-api-key-123",
      });
    });
  });

  // Step 4: Test connection
  it("shows connected user info on successful connection test", async () => {
    const putMock = vi.fn().mockResolvedValue({ ok: true });
    const getMock = vi.fn().mockResolvedValue({ name: "Roman", email: "roman@example.com" });
    api = mockApi({ put: putMock, get: getMock });

    render(<SetupWizard api={api} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("button", { name: /connect fireflies/i }));
    fireEvent.click(screen.getByRole("button", { name: /get started/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.change(screen.getByPlaceholderText(/paste your fireflies api key/i), {
      target: { value: "test-api-key-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save & verify/i }));

    await waitFor(() => {
      expect(screen.getByText(/connected as roman/i)).toBeInTheDocument();
      expect(screen.getByText(/roman@example\.com/i)).toBeInTheDocument();
    });

    expect(getMock).toHaveBeenCalledWith("/api/fireflies/user");
  });

  it("shows error and re-enter option on failed connection test", async () => {
    const putMock = vi.fn().mockResolvedValue({ ok: true });
    const getMock = vi.fn().mockRejectedValue(new Error("Invalid API key"));
    api = mockApi({ put: putMock, get: getMock });

    render(<SetupWizard api={api} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("button", { name: /connect fireflies/i }));
    fireEvent.click(screen.getByRole("button", { name: /get started/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.change(screen.getByPlaceholderText(/paste your fireflies api key/i), {
      target: { value: "bad-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save & verify/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid api key/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("goes back to input step on Try Again after failed test", async () => {
    const putMock = vi.fn().mockResolvedValue({ ok: true });
    const getMock = vi.fn().mockRejectedValue(new Error("Invalid API key"));
    api = mockApi({ put: putMock, get: getMock });

    render(<SetupWizard api={api} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("button", { name: /connect fireflies/i }));
    fireEvent.click(screen.getByRole("button", { name: /get started/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.change(screen.getByPlaceholderText(/paste your fireflies api key/i), {
      target: { value: "bad-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save & verify/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    // Should be back on input step
    expect(screen.getByPlaceholderText(/paste your fireflies api key/i)).toBeInTheDocument();
  });

  // Step 5: Webhook configuration
  // Helper: navigate to webhook step (through successful connection test)
  async function navigateToWebhook() {
    const putMock = vi.fn().mockResolvedValue({ ok: true });
    const getMock = vi.fn().mockResolvedValue({ name: "Roman", email: "roman@example.com" });
    api = mockApi({ put: putMock, get: getMock });

    render(<SetupWizard api={api} onComplete={onComplete} backendUrl="http://localhost:3001" />);
    fireEvent.click(screen.getByRole("button", { name: /connect fireflies/i }));
    fireEvent.click(screen.getByRole("button", { name: /get started/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.change(screen.getByPlaceholderText(/paste your fireflies api key/i), {
      target: { value: "test-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save & verify/i }));

    await waitFor(() => {
      expect(screen.getByText(/connected as roman/i)).toBeInTheDocument();
    });

    // Continue -> webhook step
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    return { putMock, getMock };
  }

  it("advances to webhook step after successful connection test", async () => {
    await navigateToWebhook();
    expect(screen.getByText(/webhook setup/i)).toBeInTheDocument();
  });

  it("displays webhook URL with backend URL", async () => {
    await navigateToWebhook();
    expect(screen.getByText("http://localhost:3001/api/webhooks/fireflies")).toBeInTheDocument();
  });

  it("has a copy button that copies to clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    await navigateToWebhook();
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    expect(writeText).toHaveBeenCalledWith("http://localhost:3001/api/webhooks/fireflies");
  });

  it("shows webhook secret input field", async () => {
    await navigateToWebhook();
    expect(screen.getByPlaceholderText(/16-32 characters/i)).toBeInTheDocument();
  });

  it("generates a random secret on button click", async () => {
    await navigateToWebhook();
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    const input = screen.getByPlaceholderText(/16-32 characters/i) as HTMLInputElement;
    expect(input.value.length).toBeGreaterThanOrEqual(16);
  });

  it("saves webhook secret via PUT /api/config/webhook-secret", async () => {
    const { putMock } = await navigateToWebhook();
    putMock.mockClear();
    putMock.mockResolvedValue({ ok: true });

    fireEvent.change(screen.getByPlaceholderText(/16-32 characters/i), {
      target: { value: "my-secret-value-1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save secret/i }));

    await waitFor(() => {
      expect(putMock).toHaveBeenCalledWith("/api/config/webhook-secret", {
        secret: "my-secret-value-1234",
      });
    });
  });

  it("shows success message after saving secret", async () => {
    const { putMock } = await navigateToWebhook();
    putMock.mockClear();
    putMock.mockResolvedValue({ ok: true });

    fireEvent.change(screen.getByPlaceholderText(/16-32 characters/i), {
      target: { value: "my-secret-value-1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save secret/i }));

    await waitFor(() => {
      expect(screen.getByText(/secret saved/i)).toBeInTheDocument();
    });
  });

  it("shows error message on failed secret save", async () => {
    const { putMock } = await navigateToWebhook();
    putMock.mockClear();
    putMock.mockRejectedValue(new Error("Store failed"));

    fireEvent.change(screen.getByPlaceholderText(/16-32 characters/i), {
      target: { value: "my-secret-value-1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save secret/i }));

    await waitFor(() => {
      expect(screen.getByText(/store failed/i)).toBeInTheDocument();
    });
  });

  it("skip button advances to done step", async () => {
    await navigateToWebhook();
    fireEvent.click(screen.getByRole("button", { name: /skip/i }));

    expect(screen.getByText(/all set/i)).toBeInTheDocument();
  });

  it("shows Fireflies Dashboard instructions in ordered list", async () => {
    await navigateToWebhook();
    expect(screen.getByText(/fireflies dashboard/i)).toBeInTheDocument();
    // Instructions are in an <ol>
    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
  });

  // Step 6: Done (navigates through webhook via Skip)
  it("shows done step with Start Syncing button after skipping webhook", async () => {
    await navigateToWebhook();
    fireEvent.click(screen.getByRole("button", { name: /skip/i }));

    expect(screen.getByText(/all set/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start syncing/i })).toBeInTheDocument();
  });

  it("calls onComplete when Start Syncing is clicked", async () => {
    await navigateToWebhook();
    fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    fireEvent.click(screen.getByRole("button", { name: /start syncing/i }));

    expect(onComplete).toHaveBeenCalledOnce();
  });

  // Back navigation
  it("supports Back button on instructions step", () => {
    render(<SetupWizard api={api} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("button", { name: /connect fireflies/i }));
    fireEvent.click(screen.getByRole("button", { name: /get started/i }));
    expect(screen.getByText(/app\.fireflies\.ai/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByText(/connect fireflies/i)).toBeInTheDocument();
  });
});
