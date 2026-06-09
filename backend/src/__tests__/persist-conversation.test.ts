import { describe, it, expect, beforeEach } from "bun:test";
import { persistConversation } from "../services/persist-conversation.js";
import type { NormalizedConversation } from "../adapters/types.js";

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
  let shouldFailExecute = false;

  return {
    _calls: calls,
    _setExecuteFail(fail: boolean) {
      shouldFailExecute = fail;
    },
    query: async (sql: string, params?: any[]) => {
      calls.push({ method: "query", sql, params });
      return { ok: true, data: { rows: [], columns: [] } };
    },
    execute: async (sql: string, params?: any[]) => {
      calls.push({ method: "execute", sql, params });

      if (shouldFailExecute && sql.trim().startsWith("INSERT")) {
        throw new Error("SQL insert failed: database is locked");
      }

      return { ok: true, data: { changes: 1 } };
    },
  };
}

// ── Fixtures ─────────────────────────────────────────────────────────

function createNormalized(overrides: Partial<NormalizedConversation> = {}): NormalizedConversation {
  return {
    conversation: {
      id: "conv-123",
      title: "Test Meeting",
      source: "fireflies",
      source_id: "ff-1",
      source_url: "https://app.fireflies.ai/view/ff-1",
      started_at: "2024-03-21T00:00:00.000Z",
      ended_at: "2024-03-21T01:00:00.000Z",
      duration_secs: 3600,
      summary: "A test meeting",
      metadata: { keywords: ["planning"] },
      ...overrides.conversation,
    },
    participants: overrides.participants ?? [
      { id: "p1", name: "Alice", email: "alice@example.com", speaker_label: "Speaker 1" },
      { id: "p2", name: "Bob", email: "bob@example.com", speaker_label: "Speaker 2" },
    ],
    transcript: overrides.transcript ?? [
      { text: "Hello everyone", speaker_name: "Alice", start_time: 0, end_time: 2 },
    ],
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe("persistConversation", () => {
  let mockKV: ReturnType<typeof createMockKV>;
  let mockSQL: ReturnType<typeof createMockSQL>;
  let mockAccess: { kv: ReturnType<typeof createMockKV>; sql: ReturnType<typeof createMockSQL> };

  beforeEach(() => {
    mockKV = createMockKV();
    mockSQL = createMockSQL();
    mockAccess = { kv: mockKV, sql: mockSQL } as any;
  });

  // ── Test 1: inserts conversation row with correct SQL and params ──

  it("inserts conversation row with 12 params", async () => {
    const normalized = createNormalized();

    await persistConversation(mockAccess as any, normalized);

    const inserts = mockSQL._calls.filter(
      (c) => c.method === "execute" && c.sql.includes("INSERT INTO conversation"),
    );
    expect(inserts).toHaveLength(1);
    expect(inserts[0].params).toBeDefined();
    expect(inserts[0].params!.length).toBe(12);

    const params = inserts[0].params!;
    expect(params[0]).toBe("conv-123"); // id
    expect(params[1]).toBe("Test Meeting"); // title
    expect(params[2]).toBe("fireflies"); // source
    expect(params[3]).toBe("ff-1"); // source_id
  });

  // ── Test 2: inserts participant rows ──────────────────────────────

  it("inserts participant rows with one multi-row statement", async () => {
    const normalized = createNormalized();

    await persistConversation(mockAccess as any, normalized);

    const inserts = mockSQL._calls.filter(
      (c) => c.method === "execute" && c.sql.includes("INSERT INTO participant"),
    );
    expect(inserts).toHaveLength(1);
    expect(inserts[0].sql).toContain("VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)");
    expect(inserts[0].params!.length).toBe(10);
    expect(inserts[0].params![0]).toBe("p1");
    expect(inserts[0].params![1]).toBe("conv-123"); // conversation_id
    expect(inserts[0].params![2]).toBe("Alice");
    expect(inserts[0].params![7]).toBe("Bob");
  });

  // ── Test 3: writes transcript blob to KV ──────────────────────────

  it("writes transcript blob to KV", async () => {
    const normalized = createNormalized();

    await persistConversation(mockAccess as any, normalized);

    const kvKey = `xyz.tinycloud.listen/transcript/conv-123`;
    const stored = mockKV._data.get(kvKey);
    expect(stored).toBeDefined();

    const parsed = JSON.parse(stored!);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].text).toBe("Hello everyone");
  });

  // ── Test 4: handles zero participants ─────────────────────────────

  it("handles zero participants", async () => {
    const normalized = createNormalized({ participants: [] });

    await persistConversation(mockAccess as any, normalized);

    const participantInserts = mockSQL._calls.filter(
      (c) => c.method === "execute" && c.sql.includes("INSERT INTO participant"),
    );
    expect(participantInserts).toHaveLength(0);
  });

  // ── Test 5: propagates SQL errors ─────────────────────────────────

  it("propagates SQL errors", async () => {
    mockSQL._setExecuteFail(true);
    const normalized = createNormalized();

    expect(persistConversation(mockAccess as any, normalized)).rejects.toThrow("SQL insert failed");
  });

  // ── Test 6: serializes metadata as JSON ───────────────────────────

  it("serializes metadata as JSON string", async () => {
    const normalized = createNormalized();
    normalized.conversation.metadata = { key: "value", nested: { a: 1 } };

    await persistConversation(mockAccess as any, normalized);

    const inserts = mockSQL._calls.filter(
      (c) => c.method === "execute" && c.sql.includes("INSERT INTO conversation"),
    );
    const metadataParam = inserts[0].params![9]; // metadata is the 10th param
    expect(metadataParam).toBe(JSON.stringify({ key: "value", nested: { a: 1 } }));
  });

  it("normalizes transcript blobs and audio metadata aliases before writing", async () => {
    const normalized = createNormalized({
      conversation: {
        metadata: {
          audio_kv_key: "audio/conv-123/recording",
          source: "voice_memos",
        },
      },
      transcript: [
        {
          speakerName: "Ada",
          text: "Hello world",
          startTime: null,
          endTime: 1.25,
          languageCode: "en",
        },
      ] as any,
    });

    await persistConversation(mockAccess as any, normalized);

    const inserts = mockSQL._calls.filter(
      (c) => c.method === "execute" && c.sql.includes("INSERT INTO conversation"),
    );
    const metadataParam = JSON.parse(inserts[0].params![9] as string);
    expect(metadataParam.audio_kv_key).toBe("audio/conv-123/recording");
    expect(metadataParam.audio_data_kv_key).toBe("audio/conv-123/recording");

    const storedTranscript = JSON.parse(
      mockKV._data.get("xyz.tinycloud.listen/transcript/conv-123")!,
    );
    expect(storedTranscript).toEqual([
      {
        index: 0,
        speaker_id: "ada",
        speaker_name: "Ada",
        text: "Hello world",
        start_time: null,
        end_time: 1.25,
        language: "en",
      },
    ]);
  });
});
