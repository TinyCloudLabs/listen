import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { ConversationDetail } from "../components/ConversationDetail";
import { conversationDetailCacheKey } from "../conversationPageCache";
import type { ApiClient } from "@listen/client";

function mockApi(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
    ...overrides,
  };
}

const DETAIL_RESPONSE = {
  conversation: {
    id: "01ABC",
    title: "Sprint Planning",
    source: "fireflies",
    source_id: "ff-123",
    source_url: "https://app.fireflies.ai/view/01ABC",
    started_at: "2026-03-20T14:00:00Z",
    ended_at: "2026-03-20T14:30:00Z",
    duration_secs: 1800,
    summary: "Discussed roadmap priorities and assigned tasks for the upcoming sprint.",
    metadata: {
      audio_url: "https://audio.example.com/abc.mp3",
      audio_playback_url: "/api/conversations/01ABC/audio",
    },
    created_at: "2026-03-20T15:00:00Z",
    updated_at: "2026-03-20T15:00:00Z",
  },
  participants: [
    { id: "p1", name: "Alice", email: "alice@example.com", speaker_label: "Speaker 1" },
    { id: "p2", name: "Bob", email: "bob@example.com", speaker_label: "Speaker 2" },
  ],
  transcript: [
    {
      index: 0,
      speaker_id: "1",
      speaker_name: "Alice",
      text: "Let's start the sprint planning.",
      raw_text: "Let's start the sprint planning.",
      start_time: 0,
      end_time: 5,
      ai_filters: {},
    },
    {
      index: 1,
      speaker_id: "1",
      speaker_name: "Alice",
      text: "We have a lot to cover today.",
      raw_text: "We have a lot to cover today.",
      start_time: 5,
      end_time: 10,
      ai_filters: {},
    },
    {
      index: 2,
      speaker_id: "2",
      speaker_name: "Bob",
      text: "Sounds good. I prepared the backlog.",
      raw_text: "Sounds good. I prepared the backlog.",
      start_time: 10,
      end_time: 15,
      ai_filters: {},
    },
    {
      index: 3,
      speaker_id: "1",
      speaker_name: "Alice",
      text: "Great, let's review it.",
      raw_text: "Great, let's review it.",
      start_time: 65,
      end_time: 70,
      ai_filters: {},
    },
  ],
};

describe("ConversationDetail", () => {
  let api: ApiClient;
  let onBack: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    api = mockApi();
    onBack = vi.fn();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("fetches conversation detail on mount", async () => {
    const getMock = vi.fn().mockResolvedValue(DETAIL_RESPONSE);
    api = mockApi({ get: getMock });

    render(<ConversationDetail api={api} conversationId="01ABC" onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
    });

    expect(getMock).toHaveBeenCalledWith("/api/conversations/01ABC");
  });

  it("shows loading state while fetching", async () => {
    let resolveGet!: (v: any) => void;
    const getMock = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveGet = resolve;
      }),
    );
    api = mockApi({ get: getMock });

    render(<ConversationDetail api={api} conversationId="01ABC" onBack={onBack} />);

    expect(screen.getByText("Loading conversation")).toBeInTheDocument();

    resolveGet(DETAIL_RESPONSE);
    await waitFor(() => {
      expect(screen.queryByText("Loading conversation")).not.toBeInTheDocument();
    });
  });

  it("renders cached detail immediately and refreshes it from the server", async () => {
    localStorage.setItem(
      conversationDetailCacheKey("01ABC"),
      JSON.stringify({
        data: {
          ...DETAIL_RESPONSE,
          conversation: { ...DETAIL_RESPONSE.conversation, title: "Cached Planning" },
        },
        cachedAt: "2026-03-20T15:00:00Z",
      }),
    );

    let resolveGet!: (value: typeof DETAIL_RESPONSE) => void;
    const getMock = vi.fn().mockReturnValue(
      new Promise<typeof DETAIL_RESPONSE>((resolve) => {
        resolveGet = resolve;
      }),
    );
    api = mockApi({ get: getMock });

    render(<ConversationDetail api={api} conversationId="01ABC" onBack={onBack} />);

    expect(await screen.findByText("Cached Planning")).toBeInTheDocument();
    expect(screen.queryByText("Loading conversation")).not.toBeInTheDocument();

    resolveGet({
      ...DETAIL_RESPONSE,
      conversation: { ...DETAIL_RESPONSE.conversation, title: "Fresh Planning" },
    });

    await waitFor(() => {
      expect(screen.getByText("Fresh Planning")).toBeInTheDocument();
    });

    const cached = JSON.parse(localStorage.getItem(conversationDetailCacheKey("01ABC"))!);
    expect(cached.data.conversation.title).toBe("Fresh Planning");
  });

  it("can bypass cached detail for shared views", async () => {
    localStorage.setItem(
      conversationDetailCacheKey("01ABC"),
      JSON.stringify({
        data: {
          ...DETAIL_RESPONSE,
          conversation: {
            ...DETAIL_RESPONSE.conversation,
            title: "Cached Planning",
            metadata: {
              audio_playback_url: "/api/conversations/01ABC/audio",
            },
          },
        },
        cachedAt: "2026-03-20T15:00:00Z",
      }),
    );

    let resolveGet!: (value: typeof DETAIL_RESPONSE) => void;
    api = mockApi({
      get: vi.fn().mockReturnValue(
        new Promise<typeof DETAIL_RESPONSE>((resolve) => {
          resolveGet = resolve;
        }),
      ),
    });

    render(
      <ConversationDetail api={api} conversationId="01ABC" onBack={onBack} cacheMode="disabled" />,
    );

    expect(screen.getByText("Loading conversation")).toBeInTheDocument();
    expect(screen.queryByText("Cached Planning")).not.toBeInTheDocument();
    expect(document.querySelector("audio")).toBeNull();

    resolveGet({
      ...DETAIL_RESPONSE,
      conversation: {
        ...DETAIL_RESPONSE.conversation,
        metadata: {},
      },
    });

    await waitFor(() => {
      expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
    });
    expect(document.querySelector("audio")).toBeNull();
    const cached = JSON.parse(localStorage.getItem(conversationDetailCacheKey("01ABC"))!);
    expect(cached.data.conversation.title).toBe("Cached Planning");
  });

  it("renders conversation header with title, date, and duration", async () => {
    api = mockApi({ get: vi.fn().mockResolvedValue(DETAIL_RESPONSE) });

    render(<ConversationDetail api={api} conversationId="01ABC" onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
      expect(screen.getByText("30 min")).toBeInTheDocument();
    });
  });

  it("renders participant names as chips", async () => {
    api = mockApi({ get: vi.fn().mockResolvedValue(DETAIL_RESPONSE) });

    render(<ConversationDetail api={api} conversationId="01ABC" onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText("2 participants")).toBeInTheDocument();
    });
  });

  it("keeps read content mounted while disabling title, repair, and share writes", async () => {
    const put = vi.fn();
    const post = vi.fn();
    const onShare = vi.fn();
    api = mockApi({
      get: vi.fn().mockResolvedValue({
        ...DETAIL_RESPONSE,
        transcript_status: {
          available: false,
          missing: true,
          repairable: true,
          message: "Transcript content is missing.",
        },
      }),
      put,
      post,
    });

    render(
      <ConversationDetail
        api={api}
        conversationId="01ABC"
        onBack={onBack}
        onShare={onShare}
        mutationsDisabled
      />,
    );

    expect(await screen.findByText("Sprint Planning")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /rename conversation/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Share$/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /recover from fireflies/i })).toBeDisabled();
    expect(put).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
    expect(onShare).not.toHaveBeenCalled();
  });

  it("renders summary section with HTML", async () => {
    api = mockApi({ get: vi.fn().mockResolvedValue(DETAIL_RESPONSE) });

    render(<ConversationDetail api={api} conversationId="01ABC" onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText(/discussed roadmap priorities/i)).toBeInTheDocument();
    });
  });

  it("toggles summary between rendered markdown and raw markdown", async () => {
    api = mockApi({
      get: vi.fn().mockResolvedValue({
        ...DETAIL_RESPONSE,
        conversation: {
          ...DETAIL_RESPONSE.conversation,
          summary: "## Decisions\n\n- **Ship Soundcore**\n- `Debug logs`",
        },
      }),
    });

    render(<ConversationDetail api={api} conversationId="01ABC" onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Decisions" })).toBeInTheDocument();
    });
    expect(screen.getByText("Ship Soundcore").tagName.toLowerCase()).toBe("strong");
    expect(screen.getByText("Debug logs").tagName.toLowerCase()).toBe("code");

    fireEvent.click(screen.getByRole("button", { name: "Markdown" }));

    expect(screen.getByText(/## Decisions/)).toBeInTheDocument();
    expect(screen.getByText(/- \*\*Ship Soundcore\*\*/)).toBeInTheDocument();
  });

  it("renders transcript with speaker names and text", async () => {
    api = mockApi({ get: vi.fn().mockResolvedValue(DETAIL_RESPONSE) });

    render(<ConversationDetail api={api} conversationId="01ABC" onBack={onBack} />);

    await waitFor(() => {
      expect(
        screen.getByText("Let's start the sprint planning. We have a lot to cover today."),
      ).toBeInTheDocument();
      expect(screen.getByText("Sounds good. I prepared the backlog.")).toBeInTheDocument();
      expect(screen.getByText("Great, let's review it.")).toBeInTheDocument();
    });
  });

  it("groups consecutive sentences from same speaker into one block", async () => {
    api = mockApi({ get: vi.fn().mockResolvedValue(DETAIL_RESPONSE) });

    const { container } = render(
      <ConversationDetail api={api} conversationId="01ABC" onBack={onBack} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
    });

    // 4 sentences but only 3 blocks (first two Alice sentences grouped)
    const blocks = container.querySelectorAll("[data-testid='transcript-block']");
    expect(blocks.length).toBe(3);
  });

  it("formats timestamps as m:ss", async () => {
    api = mockApi({ get: vi.fn().mockResolvedValue(DETAIL_RESPONSE) });

    render(<ConversationDetail api={api} conversationId="01ABC" onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText("0:00")).toBeInTheDocument(); // start_time 0
      expect(screen.getByText("0:10")).toBeInTheDocument(); // start_time 10
      expect(screen.getByText("1:05")).toBeInTheDocument(); // start_time 65
    });
  });

  it("renders recorder conversations with nullable timestamps safely", async () => {
    const nullTimingResponse = {
      ...DETAIL_RESPONSE,
      conversation: {
        ...DETAIL_RESPONSE.conversation,
        source: "recorder",
        started_at: null,
        ended_at: null,
        duration_secs: null,
      },
      transcript: [
        {
          speakerName: "Ada",
          text: "Let's start the sprint planning.",
          startTime: null,
          endTime: null,
          languageCode: "en",
        },
      ],
    };
    api = mockApi({ get: vi.fn().mockResolvedValue(nullTimingResponse) });

    render(<ConversationDetail api={api} conversationId="01ABC" onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText("RECORDER")).toBeInTheDocument();
      expect(screen.getAllByText("—").length).toBeGreaterThan(0);
      expect(screen.getByText(/let's start the sprint planning/i)).toBeInTheDocument();
    });
  });

  it("renders Soundcore conversations with the polished source label", async () => {
    api = mockApi({
      get: vi.fn().mockResolvedValue({
        ...DETAIL_RESPONSE,
        conversation: {
          ...DETAIL_RESPONSE.conversation,
          source: "soundcore_sync",
          title: "Soundcore Planning",
        },
      }),
    });

    render(<ConversationDetail api={api} conversationId="01ABC" onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText("SOUNDCORE")).toBeInTheDocument();
    });
  });

  it("shows 'View on Fireflies' link when source_url is present", async () => {
    api = mockApi({ get: vi.fn().mockResolvedValue(DETAIL_RESPONSE) });

    render(<ConversationDetail api={api} conversationId="01ABC" onBack={onBack} />);

    await waitFor(() => {
      const link = screen.getByText(/view on fireflies/i);
      expect(link).toBeInTheDocument();
      expect(link.closest("a")).toHaveAttribute("href", "https://app.fireflies.ai/view/01ABC");
    });
  });

  it("renders audio playback when stored audio is available", async () => {
    api = mockApi({ get: vi.fn().mockResolvedValue(DETAIL_RESPONSE) });

    const { container } = render(
      <ConversationDetail api={api} conversationId="01ABC" onBack={onBack} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
    });

    const audio = container.querySelector("audio");
    expect(audio).toBeInTheDocument();
    expect(audio).toHaveAttribute("src", "/api/conversations/01ABC/audio");
  });

  it("hides audio playback when stored audio is unavailable", async () => {
    const noAudioResponse = {
      ...DETAIL_RESPONSE,
      conversation: { ...DETAIL_RESPONSE.conversation, metadata: {} },
    };
    api = mockApi({ get: vi.fn().mockResolvedValue(noAudioResponse) });

    const { container } = render(
      <ConversationDetail api={api} conversationId="01ABC" onBack={onBack} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
    });

    expect(container.querySelector("audio")).not.toBeInTheDocument();
  });

  it("hides 'View on Fireflies' link when source_url is null", async () => {
    const noUrlResponse = {
      ...DETAIL_RESPONSE,
      conversation: { ...DETAIL_RESPONSE.conversation, source_url: null },
    };
    api = mockApi({ get: vi.fn().mockResolvedValue(noUrlResponse) });

    render(<ConversationDetail api={api} conversationId="01ABC" onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
    });

    expect(screen.queryByText(/view on fireflies/i)).not.toBeInTheDocument();
  });

  it("calls onBack when back button is clicked", async () => {
    api = mockApi({ get: vi.fn().mockResolvedValue(DETAIL_RESPONSE) });

    render(<ConversationDetail api={api} conversationId="01ABC" onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it("handles null transcript gracefully", async () => {
    const noTranscript = { ...DETAIL_RESPONSE, transcript: null };
    api = mockApi({ get: vi.fn().mockResolvedValue(noTranscript) });

    render(<ConversationDetail api={api} conversationId="01ABC" onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
    });

    expect(screen.getByText(/no transcript available/i)).toBeInTheDocument();
  });

  it("shows Fireflies recovery when the transcript blob is missing", async () => {
    const missingTranscript = {
      ...DETAIL_RESPONSE,
      transcript: null,
      transcript_status: {
        available: false,
        missing: true,
        repairable: true,
        reason: "missing_kv_blob",
      },
    };
    api = mockApi({ get: vi.fn().mockResolvedValue(missingTranscript) });

    render(<ConversationDetail api={api} conversationId="01ABC" onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
    });
    expect(screen.getByText(/transcript content is missing/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /recover from fireflies/i })).toBeInTheDocument();
  });

  it("recovers a missing Fireflies transcript and updates the transcript pane", async () => {
    const missingTranscript = {
      ...DETAIL_RESPONSE,
      transcript: null,
      transcript_status: {
        available: false,
        missing: true,
        repairable: true,
        reason: "missing_kv_blob",
      },
    };
    const postMock = vi.fn().mockResolvedValue({
      transcript: [
        {
          index: 0,
          speaker_id: "1",
          speaker_name: "Alice",
          text: "Recovered transcript content.",
          raw_text: "Recovered transcript content.",
          start_time: 0,
          end_time: 5,
          ai_filters: {},
        },
      ],
      transcript_status: {
        available: true,
        missing: false,
        repairable: true,
      },
    });
    api = mockApi({
      get: vi.fn().mockResolvedValue(missingTranscript),
      post: postMock,
    });

    render(<ConversationDetail api={api} conversationId="01ABC" onBack={onBack} />);

    const recover = await screen.findByRole("button", { name: /recover from fireflies/i });
    fireEvent.click(recover);

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith("/api/conversations/01ABC/transcript/repair");
      expect(screen.getByText("Recovered transcript content.")).toBeInTheDocument();
    });
    expect(screen.queryByText(/transcript content is missing/i)).not.toBeInTheDocument();
  });

  it("shows error state on fetch failure", async () => {
    api = mockApi({
      get: vi.fn().mockRejectedValue(new Error("Network error")),
    });

    render(<ConversationDetail api={api} conversationId="01ABC" onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it("retries loading after an error", async () => {
    const getMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(DETAIL_RESPONSE);
    api = mockApi({ get: getMock });

    render(<ConversationDetail api={api} conversationId="01ABC" onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
    });
    expect(getMock).toHaveBeenCalledTimes(2);
  });

  // ── New dynamic source link test ─────────────────────────────────

  it("shows 'View transcript' for Google Meet source", async () => {
    const gmResponse = {
      ...DETAIL_RESPONSE,
      conversation: {
        ...DETAIL_RESPONSE.conversation,
        source: "google-meet",
        source_url: "https://docs.google.com/document/d/123",
      },
    };
    api = mockApi({ get: vi.fn().mockResolvedValue(gmResponse) });

    render(<ConversationDetail api={api} conversationId="01ABC" onBack={onBack} />);

    await waitFor(() => {
      const link = screen.getByText(/view transcript/i);
      expect(link).toBeInTheDocument();
      expect(link.closest("a")).toHaveAttribute("href", "https://docs.google.com/document/d/123");
    });
  });
});
