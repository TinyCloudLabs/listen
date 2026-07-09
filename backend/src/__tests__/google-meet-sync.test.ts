import { describe, it, expect, beforeEach, mock } from "bun:test";
import type {
  FullConference,
  ConferenceRecord,
  Transcript,
} from "../services/google-meet-client.js";

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
  let dedupRows: Array<{ id: string; source_id: string }> = [];
  let shouldFailExecute = false;

  return {
    _calls: calls,
    _setDedupSourceIds(ids: string[]) {
      dedupRows = ids.map((id) => ({ id: `conv-${id.split("/").pop()}`, source_id: id }));
    },
    _setDedupRows(rows: Array<{ id: string; source_id: string }>) {
      dedupRows = rows;
    },
    _setExecuteFail(fail: boolean) {
      shouldFailExecute = fail;
    },
    query: async (sql: string, params?: any[]) => {
      calls.push({ method: "query", sql, params });

      if (sql.includes("FROM conversation") && sql.includes("source_id")) {
        return {
          ok: true,
          data: {
            rows: dedupRows.map((row) =>
              sql.includes("SELECT id") ? [row.id, row.source_id] : [row.source_id],
            ),
            columns: sql.includes("SELECT id") ? ["id", "source_id"] : ["source_id"],
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

// ── Mock FullConference Factory ──────────────────────────────────────

function createMockConferenceRecord(overrides: Partial<ConferenceRecord> = {}): ConferenceRecord {
  return {
    name: overrides.name ?? "conferenceRecords/abc-123",
    startTime: overrides.startTime ?? "2024-03-20T14:00:00Z",
    endTime: overrides.endTime ?? "2024-03-20T15:00:00Z",
    expireTime: overrides.expireTime ?? "2024-04-19T15:00:00Z",
    space: overrides.space ?? "spaces/abc-123",
  };
}

function createMockFullConference(overrides: Partial<FullConference> = {}): FullConference {
  return {
    conferenceRecord: overrides.conferenceRecord ?? createMockConferenceRecord(),
    participants: overrides.participants ?? [
      {
        name: "conferenceRecords/abc-123/participants/p1",
        earliestStartTime: "2024-03-20T14:00:00Z",
        signedinUser: { user: "users/1", displayName: "Alice" },
      },
      {
        name: "conferenceRecords/abc-123/participants/p2",
        earliestStartTime: "2024-03-20T14:01:00Z",
        signedinUser: { user: "users/2", displayName: "Bob" },
      },
    ],
    transcripts: overrides.transcripts ?? [
      {
        name: "conferenceRecords/abc-123/transcripts/t1",
        state: "ENDED" as const,
        startTime: "2024-03-20T14:00:00Z",
        endTime: "2024-03-20T15:00:00Z",
      },
    ],
    entries: overrides.entries ?? [
      {
        name: "conferenceRecords/abc-123/transcripts/t1/entries/e1",
        participant: "conferenceRecords/abc-123/participants/p1",
        text: "Hello everyone",
        languageCode: "en",
        startTime: "2024-03-20T14:00:10Z",
        endTime: "2024-03-20T14:00:15Z",
      },
    ],
  };
}

// ── Tests: syncSingleConference ─────────────────────────────────────

describe("syncSingleConference", () => {
  let mockKV: ReturnType<typeof createMockKV>;
  let mockSQL: ReturnType<typeof createMockSQL>;
  let mockAccess: { kv: ReturnType<typeof createMockKV>; sql: ReturnType<typeof createMockSQL> };
  let mockGetFullConference: ReturnType<typeof mock>;
  let mockClient: { getFullConference: ReturnType<typeof mock> };

  // Dynamic import to support module-level mocking if needed
  let syncSingleConference: typeof import("../services/google-meet-sync.js").syncSingleConference;

  beforeEach(async () => {
    mockKV = createMockKV();
    mockSQL = createMockSQL();
    mockAccess = { kv: mockKV, sql: mockSQL } as any;

    const conferenceRecord = createMockConferenceRecord();
    mockGetFullConference = mock(async (_record: ConferenceRecord) =>
      createMockFullConference({ conferenceRecord: _record }),
    );
    mockClient = { getFullConference: mockGetFullConference };

    const mod = await import("../services/google-meet-sync.js");
    syncSingleConference = mod.syncSingleConference;
  });

  // ── Test 1: returns 'created' for new conference ──────────────────

  it("returns 'created' for new conference with transcript", async () => {
    mockSQL._setDedupSourceIds([]);

    const record = createMockConferenceRecord();
    const result = await syncSingleConference(record, mockAccess as any, mockClient);

    expect(result.status).toBe("created");
    expect(result.conferenceRecordName).toBe("conferenceRecords/abc-123");
    expect(result.conversationId).toBeDefined();
    expect(result.conversationId!.length).toBeGreaterThan(0);
  });

  // ── Test 2: returns 'skipped' when source_id already exists ───────

  it("returns 'skipped' when source_id already exists", async () => {
    mockSQL._setDedupSourceIds(["conferenceRecords/abc-123"]);

    const record = createMockConferenceRecord();
    const result = await syncSingleConference(record, mockAccess as any, mockClient);

    expect(result.status).toBe("skipped");
    expect(result.conferenceRecordName).toBe("conferenceRecords/abc-123");
    expect(mockGetFullConference).not.toHaveBeenCalled();
  });

  it("refreshes an existing conference without inserting a duplicate", async () => {
    mockSQL._setDedupRows([{ id: "existing-conv", source_id: "conferenceRecords/abc-123" }]);

    const record = createMockConferenceRecord();
    const result = await syncSingleConference(record, mockAccess as any, mockClient, {
      refreshExisting: true,
    });

    expect(result.status).toBe("updated");
    expect(result.conversationId).toBe("existing-conv");
    expect(mockGetFullConference).toHaveBeenCalled();

    const conversationInserts = mockSQL._calls.filter(
      (c) => c.method === "execute" && c.sql.includes("INSERT INTO conversation"),
    );
    const conversationUpdates = mockSQL._calls.filter(
      (c) => c.method === "execute" && c.sql.trim().startsWith("UPDATE conversation SET title"),
    );
    expect(conversationInserts).toHaveLength(0);
    expect(conversationUpdates).toHaveLength(1);
    expect(conversationUpdates[0].params?.at(-1)).toBe("existing-conv");
  });

  // ── Test 3: returns 'skipped' when no transcript entries ──────────

  it("returns 'skipped' when conference has no transcript entries", async () => {
    mockSQL._setDedupSourceIds([]);
    mockClient.getFullConference = mock(async (record: ConferenceRecord) =>
      createMockFullConference({
        conferenceRecord: record,
        entries: [],
        transcripts: [
          {
            name: "conferenceRecords/abc-123/transcripts/t1",
            state: "ENDED" as const,
            startTime: "2024-03-20T14:00:00Z",
            endTime: "2024-03-20T15:00:00Z",
          },
        ],
      }),
    );

    const record = createMockConferenceRecord();
    const result = await syncSingleConference(record, mockAccess as any, mockClient);

    expect(result.status).toBe("skipped");
  });

  // ── Test 4: returns 'error' when getFullConference fails ──────────

  it("returns 'error' when getFullConference fails", async () => {
    mockSQL._setDedupSourceIds([]);
    mockClient.getFullConference = mock(async () => {
      throw new Error("Google Meet API timeout");
    });

    const record = createMockConferenceRecord();
    const result = await syncSingleConference(record, mockAccess as any, mockClient);

    expect(result.status).toBe("error");
    expect(result.conferenceRecordName).toBe("conferenceRecords/abc-123");
    expect(result.error).toContain("Google Meet API timeout");
  });

  // ── Test 5: inserts conversation row into SQL ─────────────────────

  it("inserts conversation row into SQL", async () => {
    mockSQL._setDedupSourceIds([]);

    const record = createMockConferenceRecord();
    await syncSingleConference(record, mockAccess as any, mockClient);

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

  // ── Test 6: writes transcript blob to KV ──────────────────────────

  it("writes transcript blob to KV", async () => {
    mockSQL._setDedupSourceIds([]);

    const record = createMockConferenceRecord();
    const result = await syncSingleConference(record, mockAccess as any, mockClient);

    expect(result.status).toBe("created");
    const kvKey = `xyz.tinycloud.listen/transcript/${result.conversationId}`;
    const storedBlob = mockKV._data.get(kvKey);
    expect(storedBlob).toBeDefined();

    const parsed = JSON.parse(storedBlob!);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].text).toBe("Hello everyone");
  });

  // ── Test 7: returns 'error' when SQL insert fails ─────────────────

  it("returns 'error' when SQL insert fails", async () => {
    mockSQL._setDedupSourceIds([]);
    mockSQL._setExecuteFail(true);

    const record = createMockConferenceRecord();
    const result = await syncSingleConference(record, mockAccess as any, mockClient);

    expect(result.status).toBe("error");
    expect(result.error).toContain("SQL insert failed");
  });
});
