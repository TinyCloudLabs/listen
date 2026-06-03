import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { ConversationList } from "../components/ConversationList";
import { conversationPageCacheKey } from "../conversationPageCache";
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

const CONVERSATIONS = [
  {
    id: "01ABC",
    title: "Sprint Planning",
    source: "fireflies",
    source_url: "https://app.fireflies.ai/view/01ABC",
    started_at: "2026-03-20T14:00:00Z",
    duration_secs: 1800,
    summary:
      "Discussed roadmap priorities and assigned tasks for the upcoming sprint cycle with the full team.",
    created_at: "2026-03-20T15:00:00Z",
    participant_count: 4,
  },
  {
    id: "02DEF",
    title: "Design Review",
    source: "fireflies",
    source_url: null,
    started_at: "2026-03-19T10:00:00Z",
    duration_secs: 3600,
    summary: "Reviewed the new dashboard designs and gathered feedback from stakeholders.",
    created_at: "2026-03-19T11:00:00Z",
    participant_count: 2,
  },
  {
    id: "03GHI",
    title: "Quick Standup",
    source: "fireflies",
    source_url: null,
    started_at: "2026-03-18T09:00:00Z",
    duration_secs: 300,
    summary: null,
    created_at: "2026-03-18T09:10:00Z",
    participant_count: 6,
  },
  {
    id: "04JKL",
    title: "Recorder Memo",
    source: "recorder",
    source_url: null,
    started_at: "2026-03-17T10:00:00Z",
    duration_secs: 600,
    summary: "A short recording from the desktop app.",
    created_at: "2026-03-17T10:10:00Z",
    participant_count: 1,
  },
  {
    id: "05MNO",
    title: "Voice Memo",
    source: "voice_memos",
    source_url: null,
    started_at: "2026-03-16T11:00:00Z",
    duration_secs: 120,
    summary: "Personal voice note.",
    created_at: "2026-03-16T11:05:00Z",
    participant_count: 1,
  },
  {
    id: "06PQR",
    title: "VoxTerm Session",
    source: "voxterm",
    source_url: null,
    started_at: "2026-03-15T12:00:00Z",
    duration_secs: 900,
    summary: "Command line session transcription.",
    created_at: "2026-03-15T12:15:00Z",
    participant_count: 1,
  },
];

const PAGE_SIZE = 20;

describe("ConversationList", () => {
  let api: ApiClient;
  let onSelectConversation: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    api = mockApi();
    onSelectConversation = vi.fn();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("fetches and renders conversations on mount", async () => {
    const getMock = vi.fn().mockResolvedValue({
      conversations: CONVERSATIONS,
      total: CONVERSATIONS.length,
    });
    api = mockApi({ get: getMock });

    render(<ConversationList api={api} onSelectConversation={onSelectConversation} />);

    await waitFor(() => {
      expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
      expect(screen.getByText("Design Review")).toBeInTheDocument();
      expect(screen.getByText("Quick Standup")).toBeInTheDocument();
      expect(screen.getByText("Recorder Memo")).toBeInTheDocument();
      expect(screen.getByText("Voice Memo")).toBeInTheDocument();
      expect(screen.getByText("VoxTerm Session")).toBeInTheDocument();
    });

    expect(getMock).toHaveBeenCalledWith("/api/conversations?limit=20&offset=0");
  });

  it("shows loading state while fetching", async () => {
    let resolveGet!: (v: any) => void;
    const getMock = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveGet = resolve;
      }),
    );
    api = mockApi({ get: getMock });

    render(<ConversationList api={api} onSelectConversation={onSelectConversation} />);

    expect(screen.getByText("Loading conversations")).toBeInTheDocument();

    resolveGet({ conversations: [], total: 0 });
    await waitFor(() => {
      expect(screen.queryByText("Loading conversations")).not.toBeInTheDocument();
    });
  });

  it("shows empty state when no conversations exist", async () => {
    api = mockApi({
      get: vi.fn().mockResolvedValue({ conversations: [], total: 0 }),
    });

    render(<ConversationList api={api} onSelectConversation={onSelectConversation} />);

    await waitFor(() => {
      expect(screen.getByText(/no conversations yet/i)).toBeInTheDocument();
      expect(screen.getByText(/sync your first meetings above/i)).toBeInTheDocument();
    });
  });

  it("formats duration correctly", async () => {
    api = mockApi({
      get: vi.fn().mockResolvedValue({
        conversations: CONVERSATIONS,
        total: CONVERSATIONS.length,
      }),
    });

    render(<ConversationList api={api} onSelectConversation={onSelectConversation} />);

    await waitFor(() => {
      expect(screen.getByText("30 min")).toBeInTheDocument(); // 1800s
      expect(screen.getByText("1 hr")).toBeInTheDocument(); // 3600s
      expect(screen.getByText("5 min")).toBeInTheDocument(); // 300s
      expect(screen.getByText("10 min")).toBeInTheDocument(); // 600s
      expect(screen.getByText("2 min")).toBeInTheDocument(); // 120s
      expect(screen.getByText("15 min")).toBeInTheDocument(); // 900s
    });
  });

  it("renders people avatars sized to participant count", async () => {
    api = mockApi({
      get: vi.fn().mockResolvedValue({
        conversations: CONVERSATIONS,
        total: CONVERSATIONS.length,
      }),
    });

    render(<ConversationList api={api} onSelectConversation={onSelectConversation} />);

    await waitFor(() => {
      expect(screen.getByText("+1")).toBeInTheDocument(); // For Sprint Planning (4 participants)
      expect(screen.queryByText("+0")).not.toBeInTheDocument(); // For single participant memos
    });
  });

  it("truncates and cleans summary text", async () => {
    const longSummary = "A".repeat(150);
    api = mockApi({
      get: vi.fn().mockResolvedValue({
        conversations: [{ ...CONVERSATIONS[0], summary: longSummary }],
        total: 1,
      }),
    });

    render(<ConversationList api={api} onSelectConversation={onSelectConversation} />);

    await waitFor(() => {
      // cleanSummary uses max=120, so truncated text + ellipsis
      const summaryEl = screen.getByText(/A+\u2026$/);
      expect(summaryEl.textContent!.length).toBeLessThanOrEqual(120);
    });
  });

  it("shows no summary text when summary is null", async () => {
    api = mockApi({
      get: vi.fn().mockResolvedValue({
        conversations: [CONVERSATIONS[2]], // Quick Standup has null summary
        total: 1,
      }),
    });

    render(<ConversationList api={api} onSelectConversation={onSelectConversation} />);

    await waitFor(() => {
      expect(screen.getByText("Quick Standup")).toBeInTheDocument();
    });
    // No summary text rendered
    expect(screen.queryByText(/no summary/i)).not.toBeInTheDocument();
  });

  it("calls onSelectConversation when clicking a row", async () => {
    api = mockApi({
      get: vi.fn().mockResolvedValue({
        conversations: CONVERSATIONS,
        total: CONVERSATIONS.length,
      }),
    });

    render(<ConversationList api={api} onSelectConversation={onSelectConversation} />);

    await waitFor(() => {
      expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Sprint Planning"));

    expect(onSelectConversation).toHaveBeenCalledWith("01ABC");
  });

  it("shows page navigation when there are more conversations", async () => {
    api = mockApi({
      get: vi.fn().mockResolvedValue({
        conversations: CONVERSATIONS,
        total: 50, // more than the 3 loaded
      }),
    });

    render(<ConversationList api={api} onSelectConversation={onSelectConversation} />);

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).toBeEnabled();
  });

  it("disables next page when all conversations fit on one page", async () => {
    api = mockApi({
      get: vi.fn().mockResolvedValue({
        conversations: CONVERSATIONS,
        total: CONVERSATIONS.length,
      }),
    });

    render(<ConversationList api={api} onSelectConversation={onSelectConversation} />);

    await waitFor(() => {
      expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
    });

    expect(screen.getByText(`Page 1 of 1`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("loads the next fixed-size page when Next is clicked", async () => {
    const firstPageConversations = Array(PAGE_SIZE)
      .fill(null)
      .map((_, i) => ({
        ...CONVERSATIONS[i % CONVERSATIONS.length],
        id: `dummy-conv-${i}`,
        title: `Dummy Conversation ${i + 1}`,
      }));

    const getMock = vi
      .fn()
      .mockResolvedValueOnce({
        conversations: firstPageConversations, // First page with PAGE_SIZE items
        total: PAGE_SIZE + 1, // Total indicates two pages
      })
      .mockResolvedValueOnce({
        conversations: [CONVERSATIONS[3]], // Second page with Recorder Memo
        total: PAGE_SIZE + 1,
      });
    api = mockApi({ get: getMock });

    render(<ConversationList api={api} onSelectConversation={onSelectConversation} />);

    await waitFor(() => {
      expect(screen.getByText("Dummy Conversation 1")).toBeInTheDocument();
      expect(screen.getByText(`Page 1 of 2`)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText("Recorder Memo")).toBeInTheDocument();
    });

    expect(getMock).toHaveBeenCalledWith("/api/conversations?limit=20&offset=20");

    expect(screen.getByText(`Page 2 of 2`)).toBeInTheDocument();
    expect(screen.getByText("Recorder Memo")).toBeInTheDocument();
  });

  it("renders cached page data immediately and refreshes it from the server", async () => {
    const path = "/api/conversations?limit=20&offset=0";
    localStorage.setItem(
      conversationPageCacheKey(path),
      JSON.stringify({
        conversations: [{ ...CONVERSATIONS[0], title: "Cached Planning" }],
        total: 1,
        cachedAt: "2026-03-20T15:00:00Z",
      }),
    );

    let resolveGet!: (value: { conversations: typeof CONVERSATIONS; total: number }) => void;
    const getMock = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveGet = resolve;
      }),
    );
    api = mockApi({ get: getMock });

    render(<ConversationList api={api} onSelectConversation={onSelectConversation} />);

    expect(await screen.findByText("Cached Planning")).toBeInTheDocument();
    expect(screen.queryByText("Loading conversations")).not.toBeInTheDocument();

    resolveGet({
      conversations: [{ ...CONVERSATIONS[0], title: "Fresh Planning" }],
      total: 1,
    });

    await waitFor(() => {
      expect(screen.getByText("Fresh Planning")).toBeInTheDocument();
    });

    const cached = JSON.parse(localStorage.getItem(conversationPageCacheKey(path))!);
    expect(cached.conversations[0].title).toBe("Fresh Planning");
  });

  it("shows error state on fetch failure", async () => {
    api = mockApi({
      get: vi.fn().mockRejectedValue(new Error("Network error")),
    });

    render(<ConversationList api={api} onSelectConversation={onSelectConversation} />);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it("shows conversation count header", async () => {
    api = mockApi({
      get: vi.fn().mockResolvedValue({
        conversations: CONVERSATIONS,
        total: CONVERSATIONS.length,
      }),
    });

    render(<ConversationList api={api} onSelectConversation={onSelectConversation} />);

    await waitFor(() => {
      expect(screen.getByText(`${CONVERSATIONS.length} conversations`)).toBeInTheDocument();
    });
  });

  it("refreshes when refreshKey changes", async () => {
    const getMock = vi
      .fn()
      .mockResolvedValueOnce({
        conversations: CONVERSATIONS.slice(0, 3),
        total: 3,
      })
      .mockResolvedValueOnce({
        conversations: [{ ...CONVERSATIONS[0], title: "Updated Sprint Planning" }],
        total: 1,
      });
    api = mockApi({ get: getMock });

    const { rerender } = render(
      <ConversationList api={api} onSelectConversation={onSelectConversation} refreshKey={0} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
    });

    rerender(
      <ConversationList api={api} onSelectConversation={onSelectConversation} refreshKey={1} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Updated Sprint Planning")).toBeInTheDocument();
    });

    expect(getMock).toHaveBeenCalledTimes(2);
  });

  // ── New source filter + badge tests ──────────────────────────────

  it("shows source filter chips", async () => {
    api = mockApi({
      get: vi.fn().mockResolvedValue({ conversations: CONVERSATIONS, total: CONVERSATIONS.length }),
    });
    render(<ConversationList api={api} onSelectConversation={onSelectConversation} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /all sources/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^fireflies$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^meet$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^recorder$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^voice memos$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^voxterm$/i })).toBeInTheDocument();
    });
  });

  it("filters by source locally without refetching or showing the loading state", async () => {
    const allConversations = CONVERSATIONS;
    const getMock = vi
      .fn()
      .mockResolvedValue({ conversations: allConversations, total: allConversations.length });
    api = mockApi({ get: getMock });

    render(<ConversationList api={api} onSelectConversation={onSelectConversation} />);

    await waitFor(() => {
      expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
      expect(screen.getByText("Recorder Memo")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^recorder$/i }));

    expect(screen.getByText("Recorder Memo")).toBeInTheDocument();
    expect(screen.queryByText("Sprint Planning")).not.toBeInTheDocument();
    expect(screen.queryByText("Voice Memo")).not.toBeInTheDocument();
    expect(screen.queryByText("Loading conversations")).not.toBeInTheDocument();
    expect(screen.getByText(`showing 1 of ${allConversations.length}`)).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledTimes(1);
    expect(getMock).toHaveBeenCalledWith("/api/conversations?limit=20&offset=0");

    fireEvent.click(screen.getByRole("button", { name: /all sources/i }));

    expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
    expect(screen.getByText("Recorder Memo")).toBeInTheDocument();
    expect(screen.getByText("Voice Memo")).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it("shows source badge on conversation rows", async () => {
    const mixedConversations = [
      CONVERSATIONS[0], // fireflies
      { ...CONVERSATIONS[3], source: "recorder" }, // recorder
      { ...CONVERSATIONS[4], source: "voice_memos" }, // voice_memos
      { ...CONVERSATIONS[5], source: "voxterm" }, // voxterm
    ];
    api = mockApi({
      get: vi
        .fn()
        .mockResolvedValue({ conversations: mixedConversations, total: mixedConversations.length }),
    });

    render(<ConversationList api={api} onSelectConversation={onSelectConversation} />);

    await waitFor(() => {
      expect(screen.getByText("FIREFLIES")).toBeInTheDocument();
      expect(screen.getByText("RECORDER")).toBeInTheDocument();
      expect(screen.getByText("VOICE MEMOS")).toBeInTheDocument();
      expect(screen.getByText("VOXTERM")).toBeInTheDocument();
    });
  });

  it("shows bulk action bar when a row is selected", async () => {
    api = mockApi({
      get: vi.fn().mockResolvedValue({ conversations: CONVERSATIONS, total: CONVERSATIONS.length }),
    });
    render(<ConversationList api={api} onSelectConversation={onSelectConversation} />);

    await waitFor(() => {
      expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
    });

    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/select sprint planning/i));

    await waitFor(() => {
      expect(screen.getByText(/1 selected/i)).toBeInTheDocument();
    });
    expect(onSelectConversation).not.toHaveBeenCalled();
  });

  it("opens a right-click context menu on row", async () => {
    api = mockApi({
      get: vi.fn().mockResolvedValue({ conversations: CONVERSATIONS, total: CONVERSATIONS.length }),
    });
    render(<ConversationList api={api} onSelectConversation={onSelectConversation} />);

    await waitFor(() => {
      expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
    });

    fireEvent.contextMenu(screen.getByText("Sprint Planning"));

    expect(screen.getByText(/open transcript/i)).toBeInTheDocument();
    expect(screen.getByText(/copy summary/i)).toBeInTheDocument();
  });
});
