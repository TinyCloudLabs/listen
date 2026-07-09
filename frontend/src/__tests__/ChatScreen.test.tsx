import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { ChatScreen } from "../components/ChatScreen";
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

const CHAT_CONVERSATIONS_PATH = "/api/conversations?limit=100&offset=0";

const CONVERSATION = {
  id: "01ABC",
  title: "Sprint Planning",
  source: "fireflies",
  started_at: "2026-03-20T14:00:00Z",
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

describe("ChatScreen", () => {
  let api: ApiClient;
  let onOpenConversation: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    api = mockApi();
    onOpenConversation = vi.fn();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("renders cached conversations immediately and refreshes them from the server", async () => {
    localStorage.setItem(
      conversationPageCacheKey(CHAT_CONVERSATIONS_PATH),
      JSON.stringify({
        conversations: [{ ...CONVERSATION, title: "Cached Planning" }],
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

    render(<ChatScreen api={api} refreshKey={0} onOpenConversation={onOpenConversation} />);

    expect(await screen.findByText("Searches 1 synced transcript.")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Loading transcripts...")).not.toBeInTheDocument();

    resolveGet({
      conversations: [{ ...CONVERSATION, title: "Fresh Planning" }],
      total: 1,
    });

    await waitFor(() => {
      const cached = JSON.parse(
        localStorage.getItem(conversationPageCacheKey(CHAT_CONVERSATIONS_PATH))!,
      );
      expect(cached.conversations[0].title).toBe("Fresh Planning");
    });
  });

  it("uses cached detail data for chat results while detail refreshes", async () => {
    localStorage.setItem(
      conversationPageCacheKey(CHAT_CONVERSATIONS_PATH),
      JSON.stringify({
        conversations: [CONVERSATION],
        total: 1,
        cachedAt: "2026-03-20T15:00:00Z",
      }),
    );
    localStorage.setItem(
      conversationDetailCacheKey("01ABC"),
      JSON.stringify({
        data: {
          ...DETAIL_RESPONSE,
          conversation: { ...CONVERSATION, title: "Cached Planning" },
        },
        cachedAt: "2026-03-20T15:00:00Z",
      }),
    );

    const getMock = vi.fn().mockReturnValue(new Promise(() => {}));
    api = mockApi({ get: getMock });

    render(<ChatScreen api={api} refreshKey={0} onOpenConversation={onOpenConversation} />);

    await screen.findByText("Searches 1 synced transcript.");
    fireEvent.change(screen.getByPlaceholderText("Search across transcripts"), {
      target: { value: "roadmap" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => {
      expect(screen.getByText(/I found 1 matching transcript/i)).toBeInTheDocument();
    });
    expect(screen.getByText("Cached Planning")).toBeInTheDocument();
    expect(screen.getByText(/roadmap priorities/i)).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith("/api/conversations/01ABC");
  });

  it("clears chat results when the signed-in cache scope changes", async () => {
    localStorage.setItem(
      conversationPageCacheKey(CHAT_CONVERSATIONS_PATH, "0xAlice"),
      JSON.stringify({
        conversations: [CONVERSATION],
        total: 1,
        cachedAt: "2026-03-20T15:00:00Z",
      }),
    );
    localStorage.setItem(
      conversationDetailCacheKey("01ABC", "0xAlice"),
      JSON.stringify({
        data: {
          ...DETAIL_RESPONSE,
          conversation: { ...CONVERSATION, title: "Cached Planning" },
        },
        cachedAt: "2026-03-20T15:00:00Z",
      }),
    );

    api = mockApi({ get: vi.fn().mockReturnValue(new Promise(() => {})) });
    const { rerender } = render(
      <ChatScreen
        api={api}
        refreshKey={0}
        cacheScope="0xAlice"
        onOpenConversation={onOpenConversation}
      />,
    );

    await screen.findByText("Searches 1 synced transcript.");
    fireEvent.change(screen.getByPlaceholderText("Search across transcripts"), {
      target: { value: "roadmap" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));

    expect(await screen.findByText("Cached Planning")).toBeInTheDocument();

    rerender(
      <ChatScreen
        api={api}
        refreshKey={0}
        cacheScope="0xBob"
        onOpenConversation={onOpenConversation}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText("Cached Planning")).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Ask about your synced transcripts/i)).toBeInTheDocument();
  });
});
