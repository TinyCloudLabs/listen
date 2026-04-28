import { describe, it, expect, beforeEach, mock, afterEach } from "bun:test";

// ── Mock fetch ──────────────────────────────────────────────────────

const mockFetch = mock<typeof globalThis.fetch>(() => Promise.resolve(new Response("{}")));

const originalFetch = globalThis.fetch;

// ── Import after mock setup ─────────────────────────────────────────

import { FirefliesClient } from "../services/fireflies-client.js";

// ── Helpers ─────────────────────────────────────────────────────────

const TEST_API_KEY = "test-api-key-abc123";
const FIREFLIES_URL = "https://api.fireflies.ai/graphql";

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function lastFetchCall() {
  const calls = mockFetch.mock.calls;
  return calls[calls.length - 1];
}

function lastRequestBody(): { query: string; variables?: Record<string, unknown> } {
  const [, init] = lastFetchCall();
  return JSON.parse((init as RequestInit).body as string);
}

// ── Tests ───────────────────────────────────────────────────────────

describe("FirefliesClient", () => {
  let client: FirefliesClient;

  beforeEach(() => {
    mockFetch.mockReset();
    globalThis.fetch = mockFetch as any;
    client = new FirefliesClient(TEST_API_KEY);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // ── Common request behavior ─────────────────────────────────────

  describe("request format", () => {
    it("sends POST requests to the Fireflies GraphQL endpoint", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ data: { user: { name: "A", email: "a@b.com", is_admin: false } } }),
      );

      await client.getUser();

      const [url, init] = lastFetchCall();
      expect(url).toBe(FIREFLIES_URL);
      expect((init as RequestInit).method).toBe("POST");
    });

    it("includes correct headers with bearer token", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ data: { user: { name: "A", email: "a@b.com", is_admin: false } } }),
      );

      await client.getUser();

      const [, init] = lastFetchCall();
      const headers = (init as RequestInit).headers as Record<string, string>;
      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["Authorization"]).toBe(`Bearer ${TEST_API_KEY}`);
    });
  });

  // ── getUser() ───────────────────────────────────────────────────

  describe("getUser()", () => {
    const mockUserData = {
      name: "Roman Volosovskyi",
      email: "roman@tinycloud.xyz",
      is_admin: true,
    };

    it("sends the correct GraphQL query", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: { user: mockUserData } }));

      await client.getUser();

      const body = lastRequestBody();
      expect(body.query).toContain("query GetUser");
      expect(body.query).toContain("user {");
      expect(body.query).toContain("name");
      expect(body.query).toContain("email");
      expect(body.query).toContain("is_admin");
    });

    it("returns parsed user data", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: { user: mockUserData } }));

      const result = await client.getUser();

      expect(result).toEqual(mockUserData);
    });
  });

  // ── listTranscripts() ──────────────────────────────────────────

  describe("listTranscripts()", () => {
    const mockTranscripts = [
      {
        id: "t1",
        title: "Team standup",
        date: 1700000000000,
        duration: 1800,
        organizer_email: "roman@tinycloud.xyz",
        transcript_url: "https://app.fireflies.ai/view/t1",
      },
      {
        id: "t2",
        title: "Design review",
        date: 1700100000000,
        duration: 3600,
        organizer_email: "sam@tinycloud.xyz",
        transcript_url: "https://app.fireflies.ai/view/t2",
      },
    ];

    it("sends the correct GraphQL query with variables", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: { transcripts: mockTranscripts } }));

      await client.listTranscripts(10, 5);

      const body = lastRequestBody();
      expect(body.query).toContain("query ListTranscripts($limit: Int, $skip: Int)");
      expect(body.query).toContain("transcripts(limit: $limit, skip: $skip)");
      expect(body.query).toContain("id");
      expect(body.query).toContain("title");
      expect(body.query).toContain("date");
      expect(body.query).toContain("duration");
      expect(body.query).toContain("organizer_email");
      expect(body.query).toContain("transcript_url");
      expect(body.variables).toEqual({ limit: 10, skip: 5 });
    });

    it("returns parsed transcript array", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: { transcripts: mockTranscripts } }));

      const result = await client.listTranscripts(10, 5);

      expect(result).toEqual(mockTranscripts);
      expect(result).toHaveLength(2);
    });

    it("works with default (no arguments)", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: { transcripts: mockTranscripts } }));

      await client.listTranscripts();

      const body = lastRequestBody();
      expect(body.variables).toEqual({ limit: undefined, skip: undefined });
    });
  });

  // ── getTranscript() ────────────────────────────────────────────

  describe("getTranscript()", () => {
    const mockFullTranscript = {
      id: "t1",
      title: "Team standup",
      date: 1700000000000,
      duration: 1800,
      organizer_email: "roman@tinycloud.xyz",
      transcript_url: "https://app.fireflies.ai/view/t1",
      speakers: [
        { id: "s1", name: "Roman" },
        { id: "s2", name: "Sam" },
      ],
      meeting_attendees: [
        { displayName: "Roman V", email: "roman@tinycloud.xyz" },
        { displayName: "Sam L", email: "sam@tinycloud.xyz" },
      ],
      sentences: [
        {
          index: 0,
          speaker_id: "s1",
          speaker_name: "Roman",
          text: "Good morning everyone.",
          raw_text: "Good morning everyone.",
          start_time: 0,
          end_time: 2.5,
          ai_filters: {
            task: false,
            pricing: false,
            metric: false,
            question: false,
            date_and_time: false,
            sentiment: "neutral",
          },
        },
      ],
      summary: {
        keywords: ["standup", "sprint"],
        action_items: ["Review PR #42"],
        overview: "Daily standup covering sprint progress.",
        shorthand_bullet: "- Sprint on track\n- PR review needed",
        meeting_type: "standup",
      },
      audio_url: "https://fireflies.ai/audio/t1.mp3",
    };

    it("sends the correct GraphQL query with id variable", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: { transcript: mockFullTranscript } }));

      await client.getTranscript("t1");

      const body = lastRequestBody();
      expect(body.query).toContain("query GetTranscript($id: String!)");
      expect(body.query).toContain("transcript(id: $id)");
      expect(body.query).toContain("speakers {");
      expect(body.query).toContain("meeting_attendees {");
      expect(body.query).toContain("sentences {");
      expect(body.query).toContain("ai_filters {");
      expect(body.query).toContain("summary {");
      expect(body.query).toContain("audio_url");
      expect(body.variables).toEqual({ id: "t1" });
    });

    it("returns the full parsed transcript", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: { transcript: mockFullTranscript } }));

      const result = await client.getTranscript("t1");

      expect(result).toEqual(mockFullTranscript);
      expect(result.speakers).toHaveLength(2);
      expect(result.sentences).toHaveLength(1);
      expect(result.summary.keywords).toContain("standup");
    });
  });

  // ── listAllTranscripts() ──────────────────────────────────────

  describe("listAllTranscripts()", () => {
    function makeTranscript(id: string) {
      return {
        id,
        title: `Meeting ${id}`,
        date: 1700000000000,
        duration: 1800,
        organizer_email: "test@example.com",
        transcript_url: `https://app.fireflies.ai/view/${id}`,
      };
    }

    it("paginates through multiple batches", async () => {
      // Batch 1: full batch of 2
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ data: { transcripts: [makeTranscript("t1"), makeTranscript("t2")] } }),
      );
      // Batch 2: partial batch (last page)
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ data: { transcripts: [makeTranscript("t3")] } }),
      );

      const result = await client.listAllTranscripts({ batchSize: 2, delayMs: 0 });

      expect(result.transcripts).toHaveLength(3);
      expect(result.batchCount).toBe(2);
      expect(result.earlyExit).toBe(false);
      expect(result.transcripts.map((t) => t.id)).toEqual(["t1", "t2", "t3"]);
    });

    it("stops on empty first batch", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: { transcripts: [] } }));

      const result = await client.listAllTranscripts({ batchSize: 25, delayMs: 0 });

      expect(result.transcripts).toHaveLength(0);
      expect(result.batchCount).toBe(1);
      expect(result.earlyExit).toBe(false);
    });

    it("incremental mode stops when hitting known IDs", async () => {
      // Batch 1: all new
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ data: { transcripts: [makeTranscript("t3"), makeTranscript("t4")] } }),
      );
      // Batch 2: t2 is known — should stop here, only add t5
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ data: { transcripts: [makeTranscript("t5"), makeTranscript("t2")] } }),
      );

      const result = await client.listAllTranscripts({
        batchSize: 2,
        mode: "incremental",
        knownIds: new Set(["t1", "t2"]),
        delayMs: 0,
      });

      expect(result.earlyExit).toBe(true);
      expect(result.batchCount).toBe(2);
      // t3, t4 from batch 1, t5 from batch 2 (t2 excluded)
      expect(result.transcripts.map((t) => t.id)).toEqual(["t3", "t4", "t5"]);
    });

    it("full mode ignores known IDs and fetches everything", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ data: { transcripts: [makeTranscript("t1"), makeTranscript("t2")] } }),
      );
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ data: { transcripts: [makeTranscript("t3")] } }),
      );

      const result = await client.listAllTranscripts({
        batchSize: 2,
        mode: "full",
        knownIds: new Set(["t1"]),
        delayMs: 0,
      });

      expect(result.earlyExit).toBe(false);
      expect(result.transcripts).toHaveLength(3);
    });

    it("calls onProgress after each batch", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ data: { transcripts: [makeTranscript("t1"), makeTranscript("t2")] } }),
      );
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ data: { transcripts: [makeTranscript("t3")] } }),
      );

      const progressCalls: Array<{ batch: number; totalSoFar: number }> = [];
      await client.listAllTranscripts({
        batchSize: 2,
        delayMs: 0,
        onProgress: (info) => progressCalls.push(info),
      });

      expect(progressCalls).toEqual([
        { batch: 1, totalSoFar: 2 },
        { batch: 2, totalSoFar: 3 },
      ]);
    });

    it("clamps batchSize to range 1–50", async () => {
      // batchSize 0 should become 1
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: { transcripts: [] } }));
      await client.listAllTranscripts({ batchSize: 0, delayMs: 0 });

      const body1 = lastRequestBody();
      expect(body1.variables?.limit).toBe(1);

      // batchSize 100 should become 50
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: { transcripts: [] } }));
      await client.listAllTranscripts({ batchSize: 100, delayMs: 0 });

      const body2 = lastRequestBody();
      expect(body2.variables?.limit).toBe(50);
    });
  });

  // ── Error handling ─────────────────────────────────────────────

  describe("error handling", () => {
    it("throws on HTTP error with status code", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, 401));

      expect(client.getUser()).rejects.toThrow("401");
    });

    it("throws on GraphQL errors with the first error message", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          data: null,
          errors: [{ message: "Validation failed" }, { message: "Another error" }],
        }),
      );

      expect(client.getUser()).rejects.toThrow("Validation failed");
    });

    it("lets network errors propagate naturally", async () => {
      mockFetch.mockRejectedValueOnce(new TypeError("fetch failed"));

      expect(client.getUser()).rejects.toThrow("fetch failed");
    });

    it("retries on HTTP 429 and succeeds", async () => {
      // First call: 429
      mockFetch.mockResolvedValueOnce(
        new Response("Rate limited", { status: 429, headers: { "Retry-After": "1" } }),
      );
      // Second call: success
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ data: { user: { name: "A", email: "a@b.com", is_admin: false } } }),
      );

      const result = await client.getUser();
      expect(result.name).toBe("A");
      expect(mockFetch.mock.calls.length).toBe(2);
    });

    it("retries on GraphQL too_many_requests error and succeeds", async () => {
      // First call: rate limit error
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          data: null,
          errors: [
            { message: "Rate limit. retry after 2026-01-01T00:00:01Z", code: "too_many_requests" },
          ],
        }),
      );
      // Second call: success
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ data: { user: { name: "A", email: "a@b.com", is_admin: false } } }),
      );

      const result = await client.getUser();
      expect(result.name).toBe("A");
      expect(mockFetch.mock.calls.length).toBe(2);
    });

    it("throws after max retries on persistent rate limits", async () => {
      // All 3 attempts return 429
      for (let i = 0; i < 3; i++) {
        mockFetch.mockResolvedValueOnce(
          new Response("Rate limited", { status: 429, headers: { "Retry-After": "1" } }),
        );
      }

      await expect(client.getUser()).rejects.toThrow("Fireflies rate limit reached");
      expect(mockFetch.mock.calls.length).toBe(3);
    });

    it("keeps rate-limit context when Fireflies later returns a generic GraphQL error", async () => {
      for (let i = 0; i < 2; i++) {
        mockFetch.mockResolvedValueOnce(
          jsonResponse({
            data: null,
            errors: [
              {
                message: "Rate limit. retry after 2026-01-01T00:00:01Z",
                code: "too_many_requests",
              },
            ],
          }),
        );
      }
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          data: null,
          errors: [{ message: "Something unexpected happened. Please try again" }],
        }),
      );

      await expect(client.getUser()).rejects.toThrow("Fireflies rate limit reached");
      expect(mockFetch.mock.calls.length).toBe(3);
    });
  });
});
