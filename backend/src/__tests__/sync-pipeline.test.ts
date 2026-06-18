import { describe, it, expect, beforeEach, mock } from "bun:test";
import { syncSingleTranscript } from "../services/sync-pipeline.js";
import type { FullTranscript } from "../services/fireflies-client.js";

// ── Mock KV Store ────────────────────────────────────────────────────

function createMockKV() {
  const data = new Map<string, string>();
  return {
    _data: data,
    get: async (key: string) => {
      const val = data.get(key);
      if (val === undefined) return { ok: true, data: { data: null } };
      return { ok: true, data: { data: val } };
    },
    put: async (key: string, value: string) => {
      data.set(key, value);
      return { ok: true };
    },
    delete: async (key: string) => {
      data.delete(key);
      return { ok: true };
    },
  };
}

// ── Mock SQL ─────────────────────────────────────────────────────────

function createMockSQL() {
  const calls: Array<{ method: string; sql: string; params?: any[] }> = [];
  let dedupRows: string[] = [];
  let shouldFailExecute = false;

  return {
    _calls: calls,
    _setDedupSourceIds(ids: string[]) {
      dedupRows = ids;
    },
    _setExecuteFail(fail: boolean) {
      shouldFailExecute = fail;
    },
    query: async (sql: string, params?: any[]) => {
      calls.push({ method: "query", sql, params });

      if (sql.includes("SELECT source_id FROM conversation")) {
        return {
          ok: true,
          data: {
            rows: dedupRows.map((id) => [id]),
            columns: ["source_id"],
          },
        };
      }

      if (sql.includes("SELECT 1 FROM conversation")) {
        return { ok: true, data: { rows: [[1]], columns: ["1"] } };
      }

      return { ok: true, data: { rows: [], columns: [] } };
    },
    execute: async (sql: string, params?: any[]) => {
      calls.push({ method: "execute", sql, params });

      if (shouldFailExecute && sql.trim().startsWith("INSERT")) {
        throw new Error("SQL insert failed: database is locked");
      }

      if (sql.trim().startsWith("CREATE")) {
        return { ok: true };
      }

      if (sql.trim().startsWith("INSERT")) {
        return { ok: true, data: { changes: 1 } };
      }

      return { ok: true, data: { changes: 0 } };
    },
  };
}

// ── Mock Full Transcript ─────────────────────────────────────────────

function createMockFullTranscript(overrides: Partial<FullTranscript> = {}): FullTranscript {
  return {
    id: overrides.id ?? "ff-1",
    title: overrides.title ?? "Test Meeting",
    date: overrides.date ?? 1711000000000,
    duration: overrides.duration ?? 3600,
    organizer_email: overrides.organizer_email ?? "test@example.com",
    transcript_url: overrides.transcript_url ?? "https://app.fireflies.ai/view/ff-1",
    speakers: overrides.speakers ?? [
      { id: "s1", name: "Alice" },
      { id: "s2", name: "Bob" },
    ],
    meeting_attendees: overrides.meeting_attendees ?? [
      { displayName: "Alice", email: "alice@example.com" },
      { displayName: "Bob", email: "bob@example.com" },
    ],
    sentences: overrides.sentences ?? [
      {
        index: 0,
        speaker_id: "s1",
        speaker_name: "Alice",
        text: "Hello everyone",
        raw_text: "Hello everyone",
        start_time: 0,
        end_time: 2,
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
    summary: overrides.summary ?? {
      keywords: ["planning"],
      action_items: ["Follow up"],
      overview: "A test meeting overview",
      shorthand_bullet: "- Test bullet",
      meeting_type: "team_meeting",
    },
    audio_url: overrides.audio_url ?? "https://audio.example.com/ff-1.mp3",
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe("syncSingleTranscript", () => {
  let mockKV: ReturnType<typeof createMockKV>;
  let mockSQL: ReturnType<typeof createMockSQL>;
  let mockAccess: { kv: ReturnType<typeof createMockKV>; sql: ReturnType<typeof createMockSQL> };
  let mockGetTranscript: ReturnType<typeof mock>;
  let mockClient: { getTranscript: ReturnType<typeof mock> };

  beforeEach(() => {
    mockKV = createMockKV();
    mockSQL = createMockSQL();
    mockAccess = { kv: mockKV, sql: mockSQL } as any;
    mockGetTranscript = mock(async (id: string) => createMockFullTranscript({ id }));
    mockClient = { getTranscript: mockGetTranscript };
  });

  // ── Test 1: returns 'created' for new transcript ─────────────────

  it("returns 'created' for new transcript", async () => {
    mockSQL._setDedupSourceIds([]);

    const result = await syncSingleTranscript("ff-1", mockAccess as any, mockClient);

    expect(result.status).toBe("created");
    expect(result.meetingId).toBe("ff-1");
    expect(result.conversationId).toBeDefined();
    expect(result.conversationId!.length).toBeGreaterThan(0);
    expect(result.title).toBeDefined();
    expect(result.startedAt).toBeDefined();
  });

  // ── Test 2: returns 'skipped' when source_id already exists ──────

  it("returns 'skipped' when source_id already exists", async () => {
    mockSQL._setDedupSourceIds(["ff-1"]);

    const result = await syncSingleTranscript("ff-1", mockAccess as any, mockClient);

    expect(result.status).toBe("skipped");
    expect(result.meetingId).toBe("ff-1");
    expect(mockGetTranscript).not.toHaveBeenCalled();
  });

  // ── Test 3: returns 'error' when getTranscript fails ─────────────

  it("returns 'error' when getTranscript fails", async () => {
    mockSQL._setDedupSourceIds([]);
    mockClient.getTranscript = mock(async () => {
      throw new Error("Fireflies API timeout");
    });

    const result = await syncSingleTranscript("ff-1", mockAccess as any, mockClient);

    expect(result.status).toBe("error");
    expect(result.meetingId).toBe("ff-1");
    expect(result.error).toContain("Fireflies API timeout");
  });

  // ── Test 4: inserts conversation row into SQL ────────────────────

  it("inserts conversation row into SQL", async () => {
    mockSQL._setDedupSourceIds([]);

    await syncSingleTranscript("ff-1", mockAccess as any, mockClient);

    const conversationInserts = mockSQL._calls.filter(
      (c) => c.method === "execute" && c.sql.includes("INSERT INTO conversation"),
    );
    expect(conversationInserts).toHaveLength(1);
    expect(conversationInserts[0].params).toBeDefined();
    expect(conversationInserts[0].sql).toContain("transcript_json");
    expect(conversationInserts[0].sql).toContain("transcript_text");
    expect(conversationInserts[0].params!.length).toBe(14);
    expect(JSON.parse(conversationInserts[0].params![10])).toHaveLength(1);
    expect(conversationInserts[0].params![11]).toContain("Alice: Hello everyone");
  });

  // ── Test 5: inserts participant rows into SQL ────────────────────

  it("inserts participant rows into SQL", async () => {
    mockSQL._setDedupSourceIds([]);

    await syncSingleTranscript("ff-1", mockAccess as any, mockClient);

    const participantInserts = mockSQL._calls.filter(
      (c) => c.method === "execute" && c.sql.includes("INSERT INTO participant"),
    );
    // Default mock transcript has Alice and Bob.
    expect(participantInserts).toHaveLength(1);
    expect(participantInserts[0].params).toBeDefined();
    expect(participantInserts[0].params!.length).toBe(10);
  });

  // ── Test 6: writes transcript blob to KV ─────────────────────────

  it("writes transcript blob to KV", async () => {
    mockSQL._setDedupSourceIds([]);

    const result = await syncSingleTranscript("ff-1", mockAccess as any, mockClient);

    expect(result.status).toBe("created");
    const kvKey = `xyz.tinycloud.listen/transcript/${result.conversationId}`;
    const storedBlob = mockKV._data.get(kvKey);
    expect(storedBlob).toBeDefined();

    const parsed = JSON.parse(storedBlob!);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].text).toBe("Hello everyone");
  });

  // ── Test 7: returns 'error' when SQL insert fails ────────────────

  it("returns 'error' when SQL insert fails", async () => {
    mockSQL._setDedupSourceIds([]);
    mockSQL._setExecuteFail(true);

    const result = await syncSingleTranscript("ff-1", mockAccess as any, mockClient);

    expect(result.status).toBe("error");
    expect(result.meetingId).toBe("ff-1");
    expect(result.error).toContain("SQL insert failed");
  });
});
