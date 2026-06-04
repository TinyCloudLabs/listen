import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import { MobileExperience } from "../components/mobile/MobileExperience";
import { conversationDetailCacheKey, conversationPageCacheKey } from "../conversationPageCache";
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

const MOBILE_CONVERSATIONS_PATH = "/api/conversations?limit=100&offset=0";

const CONVERSATION = {
  id: "01ABC",
  title: "Sprint Planning",
  source: "fireflies",
  source_url: "https://app.fireflies.ai/view/01ABC",
  started_at: "2026-03-20T14:00:00Z",
  duration_secs: 1800,
  summary: "Discussed roadmap priorities and assigned tasks.",
};

const DETAIL_RESPONSE = {
  conversation: CONVERSATION,
  transcript: [
    {
      speaker_name: "Alice",
      text: "The roadmap decisions are ready for review.",
      start_time: 0,
    },
  ],
};

function renderMobile(api: ApiClient, selectedConversationId: string | null = null) {
  return render(
    <MobileExperience
      api={api}
      activeRoute="inbox"
      selectedConversationId={selectedConversationId}
      refreshKey={0}
      hasFireflies
      hasGoogleMeet={false}
      hasFirefliesBackendAccess
      googleMeetAvailable={false}
      chatEnabled
      onRouteChange={vi.fn()}
      onSelectConversation={vi.fn()}
      onAddSource={vi.fn()}
      onRefresh={vi.fn()}
    />,
  );
}

describe("MobileExperience", () => {
  let api: ApiClient;

  beforeEach(() => {
    api = mockApi();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("renders cached inbox data immediately and refreshes it from the server", async () => {
    localStorage.setItem(
      conversationPageCacheKey(MOBILE_CONVERSATIONS_PATH),
      JSON.stringify({
        conversations: [{ ...CONVERSATION, title: "Cached Mobile Planning" }],
        total: 1,
        cachedAt: "2026-03-20T15:00:00Z",
      }),
    );

    let resolveGet!: (value: { conversations: (typeof CONVERSATION)[]; total: number }) => void;
    const getMock = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveGet = resolve;
      }),
    );
    api = mockApi({ get: getMock });

    renderMobile(api);

    expect(await screen.findByText("Cached Mobile Planning")).toBeInTheDocument();

    resolveGet({
      conversations: [{ ...CONVERSATION, title: "Fresh Mobile Planning" }],
      total: 1,
    });

    await waitFor(() => {
      expect(screen.getByText("Fresh Mobile Planning")).toBeInTheDocument();
    });

    const cached = JSON.parse(
      localStorage.getItem(conversationPageCacheKey(MOBILE_CONVERSATIONS_PATH))!,
    );
    expect(cached.conversations[0].title).toBe("Fresh Mobile Planning");
  });

  it("renders cached mobile detail immediately while detail refreshes", async () => {
    localStorage.setItem(
      conversationDetailCacheKey("01ABC"),
      JSON.stringify({
        data: {
          ...DETAIL_RESPONSE,
          conversation: { ...CONVERSATION, title: "Cached Mobile Detail" },
        },
        cachedAt: "2026-03-20T15:00:00Z",
      }),
    );
    const getMock = vi.fn().mockReturnValue(new Promise(() => {}));
    api = mockApi({ get: getMock });

    renderMobile(api, "01ABC");

    expect(await screen.findByText("Cached Mobile Detail")).toBeInTheDocument();
    expect(screen.getByText(/roadmap priorities/i)).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith("/api/conversations/01ABC");
  });

  it("toggles an active source chip back to all locally", async () => {
    const conversations = [
      CONVERSATION,
      { ...CONVERSATION, id: "02GRN", title: "Granola Review", source: "granola" },
      { ...CONVERSATION, id: "03VM", title: "Voice Memo", source: "voice_memos" },
      { ...CONVERSATION, id: "04VX", title: "VoxTerm Session", source: "voxterm" },
    ];
    const getMock = vi.fn().mockResolvedValue({ conversations, total: conversations.length });
    api = mockApi({ get: getMock });

    renderMobile(api);

    await waitFor(() => {
      expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
      expect(screen.getByText("Granola Review")).toBeInTheDocument();
      expect(screen.getByText("Voice Memo")).toBeInTheDocument();
      expect(screen.getByText("VoxTerm Session")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "VOICE MEMOS" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "VOXTERM" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "FIREFLIES" }));

    expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
    expect(screen.queryByText("Granola Review")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "FIREFLIES" }));

    expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
    expect(screen.getByText("Granola Review")).toBeInTheDocument();
    expect(screen.getByText("Voice Memo")).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledTimes(1);
    expect(getMock).toHaveBeenCalledWith(MOBILE_CONVERSATIONS_PATH);
  });

  it("renders mobile detail with nullable timestamps and partner source labels", async () => {
    const detail = {
      conversation: {
        ...CONVERSATION,
        source: "voxterm",
        started_at: null,
        duration_secs: null,
        metadata: {},
      },
      transcript: [
        {
          speakerName: "Ada",
          text: "Let's review the transcript.",
          startTime: null,
          endTime: null,
          languageCode: "en",
        },
      ],
    };
    const getMock = vi.fn().mockResolvedValue(detail);
    api = mockApi({ get: getMock });

    renderMobile(api, "01ABC");

    await waitFor(() => {
      expect(screen.getByText(/VOXTERM/)).toBeInTheDocument();
      expect(screen.getByText(/—/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Transcript\s+1/i }));

    expect(screen.getByText(/let's review the transcript/i)).toBeInTheDocument();
  });
});
