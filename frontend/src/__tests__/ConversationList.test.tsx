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
  {
    id: "07STU",
    title: "Soundcore Planning",
    source: "soundcore_sync",
    source_url: null,
    started_at: "2026-03-14T12:00:00Z",
    duration_secs: 1380,
    summary: "Soundcore transcript from the voice recorder cloud sync.",
    created_at: "2026-03-14T12:25:00Z",
    participant_count: 2,
  },
];

const PAGE_SIZE = 20;
const IMPORTED_SOURCE_COUNTS = [
  { source: "fireflies", total: 3 },
  { source: "recorder", total: 1 },
  { source: "voice_memos", total: 1 },
  { source: "voxterm", total: 1 },
  { source: "soundcore_sync", total: 1 },
];

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
      expect(screen.getByText("Soundcore Planning")).toBeInTheDocument();
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
      expect(
        screen.getByText(/connect a source or add a transcript to get started/i),
      ).toBeInTheDocument();
    });
  });

  it("formats duration correctly", async () => {
    api = mockApi({
      get: vi.fn().mockResolvedValue({
        conversations: CONVERSATIONS,
        total: CONVERSATIONS.length,
        source_counts: IMPORTED_SOURCE_COUNTS,
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
      expect(screen.getByText("23 min")).toBeInTheDocument(); // 1380s
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

  it("offers to load more when there are more conversations", async () => {
    api = mockApi({
      get: vi.fn().mockResolvedValue({
        conversations: CONVERSATIONS,
        total: 50, // more than the 3 loaded
      }),
    });

    render(<ConversationList api={api} onSelectConversation={onSelectConversation} />);

    await waitFor(() => {
      expect(screen.getByText(`Showing ${CONVERSATIONS.length} of 50`)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /load 20 more/i })).toBeEnabled();
  });

  it("hides load more when all conversations fit on one page", async () => {
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

    expect(screen.queryByRole("button", { name: /load .* more/i })).not.toBeInTheDocument();
  });

  it("appends the next fixed-size page when Load more is clicked", async () => {
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
    });

    fireEvent.click(screen.getByRole("button", { name: /load 1 more/i }));

    await waitFor(() => {
      expect(screen.getByText("Recorder Memo")).toBeInTheDocument();
    });

    expect(getMock).toHaveBeenCalledWith("/api/conversations?limit=20&offset=20");

    // The first page stays on screen — rows append instead of replacing.
    expect(screen.getByText("Dummy Conversation 1")).toBeInTheDocument();
    expect(screen.getByText("Recorder Memo")).toBeInTheDocument();
    expect(screen.getByText(`Showing ${PAGE_SIZE + 1} of ${PAGE_SIZE + 1}`)).toBeInTheDocument();
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

  it("retries loading after an error", async () => {
    const getMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        conversations: [CONVERSATIONS[0]],
        total: 1,
      });
    api = mockApi({ get: getMock });

    render(<ConversationList api={api} onSelectConversation={onSelectConversation} />);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
    });
    expect(getMock).toHaveBeenCalledTimes(2);
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
      expect(screen.getByRole("button", { name: /^recorder$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^voice memos$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^voxterm$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^soundcore$/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /^meet$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^granola$/i })).not.toBeInTheDocument();
  });

  it("hides imported source filters when that source has no loaded conversations", async () => {
    api = mockApi({
      get: vi.fn().mockResolvedValue({
        conversations: CONVERSATIONS.slice(0, 3),
        total: 3,
        source_counts: [{ source: "fireflies", total: 3 }],
      }),
    });
    render(<ConversationList api={api} onSelectConversation={onSelectConversation} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /all sources/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^fireflies$/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: /^recorder$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^voice memos$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^voxterm$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^soundcore$/i })).not.toBeInTheDocument();
  });

  it("filters by source with a filtered conversations request", async () => {
    const allConversations = CONVERSATIONS;
    const recorderConversations = [CONVERSATIONS[3]];
    const getMock = vi
      .fn()
      .mockResolvedValueOnce({
        conversations: allConversations,
        total: allConversations.length,
        source_counts: IMPORTED_SOURCE_COUNTS,
      })
      .mockResolvedValueOnce({
        conversations: recorderConversations,
        total: recorderConversations.length,
        source_counts: IMPORTED_SOURCE_COUNTS,
      })
      .mockResolvedValueOnce({
        conversations: allConversations,
        total: allConversations.length,
        source_counts: IMPORTED_SOURCE_COUNTS,
      });
    api = mockApi({ get: getMock });

    render(<ConversationList api={api} onSelectConversation={onSelectConversation} />);

    await waitFor(() => {
      expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
      expect(screen.getByText("Recorder Memo")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^recorder$/i }));

    await waitFor(() => {
      expect(screen.getByText("Recorder Memo")).toBeInTheDocument();
      expect(screen.getByText("showing 1 of 1")).toBeInTheDocument();
    });
    expect(screen.queryByText("Sprint Planning")).not.toBeInTheDocument();
    expect(screen.queryByText("Voice Memo")).not.toBeInTheDocument();
    expect(getMock).toHaveBeenCalledTimes(2);
    expect(getMock).toHaveBeenCalledWith("/api/conversations?limit=20&offset=0");
    expect(getMock).toHaveBeenCalledWith("/api/conversations?limit=20&offset=0&source=recorder");

    fireEvent.click(screen.getByRole("button", { name: /all sources/i }));

    await waitFor(() => {
      expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
      expect(screen.getByText("Recorder Memo")).toBeInTheDocument();
      expect(screen.getByText("Voice Memo")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(getMock).toHaveBeenCalledTimes(3);
    });
  });

  it("shows source badge on conversation rows", async () => {
    const mixedConversations = [
      CONVERSATIONS[0], // fireflies
      { ...CONVERSATIONS[3], source: "recorder" }, // recorder
      { ...CONVERSATIONS[4], source: "voice_memos" }, // voice_memos
      { ...CONVERSATIONS[5], source: "voxterm" }, // voxterm
      { ...CONVERSATIONS[6], source: "soundcore_sync" }, // soundcore_sync
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
      expect(screen.getByText("SOUNDCORE")).toBeInTheDocument();
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

  it("disables credentialed bulk sharing without blocking read selection", async () => {
    const onShareSelectedConversations = vi.fn();
    api = mockApi({
      get: vi.fn().mockResolvedValue({ conversations: CONVERSATIONS, total: CONVERSATIONS.length }),
    });
    render(
      <ConversationList
        api={api}
        onSelectConversation={onSelectConversation}
        onShareSelectedConversations={onShareSelectedConversations}
        mutationsDisabled
      />,
    );

    await screen.findByText("Sprint Planning");
    fireEvent.click(screen.getByLabelText(/select sprint planning/i));
    const shareButton = await screen.findByRole("button", { name: /credentialed share/i });
    expect(shareButton).toBeDisabled();
    fireEvent.click(shareButton);
    expect(onShareSelectedConversations).not.toHaveBeenCalled();
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

  it("blocks per-conversation sharing while keeping the context menu readable", async () => {
    const onShareConversation = vi.fn();
    api = mockApi({
      get: vi.fn().mockResolvedValue({ conversations: CONVERSATIONS, total: CONVERSATIONS.length }),
    });
    render(
      <ConversationList
        api={api}
        onSelectConversation={onSelectConversation}
        onShareConversation={onShareConversation}
        mutationsDisabled
      />,
    );

    await screen.findByText("Sprint Planning");
    fireEvent.contextMenu(screen.getByText("Sprint Planning"));
    const share = screen.getByRole("menuitem", { name: /share/i });
    expect(share).toBeDisabled();
    fireEvent.click(share);
    expect(onShareConversation).not.toHaveBeenCalled();
  });
});
