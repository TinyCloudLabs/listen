import { describe, expect, it } from "bun:test";
import { syncSoundcoreNotes } from "../services/soundcore-sync.js";
import { readSoundcoreCredentialsResult } from "../services/soundcore-secret.js";
import type { SoundcoreNote, SoundcoreNoteSummary } from "../services/soundcore-client.js";

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
  };
}

function createMockSQL() {
  const calls: Array<{ method: string; sql: string; params?: any[] }> = [];
  return {
    _calls: calls,
    query: async (sql: string, params?: any[]) => {
      calls.push({ method: "query", sql, params });
      if (sql.includes("SELECT source_id FROM conversation")) {
        return { ok: true, data: { rows: [], columns: ["source_id"] } };
      }
      if (sql.includes("SELECT 1 FROM conversation")) {
        return { ok: true, data: { rows: [[1]], columns: ["1"] } };
      }
      return { ok: true, data: { rows: [], columns: [] } };
    },
    execute: async (sql: string, params?: any[]) => {
      calls.push({ method: "execute", sql, params });
      return { ok: true, data: { changes: sql.trim().startsWith("INSERT") ? 1 : 0 } };
    },
  };
}

function createNote(overrides: Partial<SoundcoreNote> = {}): SoundcoreNote {
  return {
    note_id: "sc-1",
    note_title: "Soundcore Meeting",
    audio_duration: 120_000,
    updated_at: 0,
    app_note_id: 1_768_501_800,
    is_trans: true,
    is_summary: true,
    summary: { content: "Soundcore summary" },
    transcript: [
      {
        start_time: 0,
        end_time: 2_000,
        speaker: "Speaker 1",
        content: "Soundcore transcript text",
      },
    ],
    ...overrides,
  };
}

describe("Soundcore sync", () => {
  it("imports transcript notes into conversation persistence", async () => {
    const kv = createMockKV();
    const sql = createMockSQL();
    const note = createNote();

    const result = await syncSoundcoreNotes({
      access: { kv, sql } as any,
      client: {
        listNotes: async (): Promise<SoundcoreNoteSummary[]> => [note],
        getNote: async () => note,
      },
    });

    expect(result).toMatchObject({ synced: 1, skipped: 0, skippedNoTranscript: 0, failed: 0 });

    const conversationInsert = sql._calls.find(
      (call) => call.method === "execute" && call.sql.includes("INSERT INTO conversation"),
    );
    expect(conversationInsert?.params?.[2]).toBe("soundcore_sync");
    expect(conversationInsert?.params?.[3]).toBe("sc-1");

    const conversationId = result.conversations[0]!.id;
    const storedTranscript = kv._data.get(`xyz.tinycloud.listen/transcript/${conversationId}`);
    expect(JSON.parse(storedTranscript!)[0]).toMatchObject({
      speaker_name: "Speaker 1",
      text: "Soundcore transcript text",
    });
  });

  it("skips notes without transcripts by default", async () => {
    const note = createNote({ note_id: "empty", is_trans: false, transcript: [] });

    const result = await syncSoundcoreNotes({
      access: { kv: createMockKV(), sql: createMockSQL() } as any,
      client: {
        listNotes: async (): Promise<SoundcoreNoteSummary[]> => [note],
        getNote: async () => note,
      },
    });

    expect(result).toMatchObject({ synced: 0, skippedNoTranscript: 1, failed: 0 });
  });

  it("continues syncing when one note times out", async () => {
    const slowNote = createNote({ note_id: "slow", note_title: "Slow note" });
    const goodNote = createNote({ note_id: "good", note_title: "Good note" });

    const result = await syncSoundcoreNotes({
      access: { kv: createMockKV(), sql: createMockSQL() } as any,
      noteTimeoutMs: 1,
      client: {
        listNotes: async (): Promise<SoundcoreNoteSummary[]> => [slowNote, goodNote],
        getNote: async (summary: SoundcoreNoteSummary) => {
          if (summary.note_id === "slow") {
            return new Promise<SoundcoreNote>(() => {});
          }
          return goodNote;
        },
      },
    });

    expect(result).toMatchObject({ synced: 1, failed: 1 });
    expect(result.errors[0]).toContain("slow");
    expect(result.conversations[0]?.title).toBe("Good note");
  });

  it("aggregates required Soundcore secrets", async () => {
    const result = await readSoundcoreCredentialsResult({
      secrets: {
        get: async (name: string) =>
          name === "SOUNDCORE_SESSION"
            ? { ok: false, error: { code: "key_not_found" } }
            : { ok: true, data: `${name}-value` },
      },
    } as any);

    expect(result).toEqual({
      ok: true,
      data: {
        authToken: "SOUNDCORE_AUTH_TOKEN-value",
        uid: "SOUNDCORE_UID-value",
        openudid: "SOUNDCORE_OPENUDID-value",
      },
    });
  });

  it("reads Soundcore credentials from the bundled session secret", async () => {
    const result = await readSoundcoreCredentialsResult({
      secrets: {
        get: async (name: string) =>
          name === "SOUNDCORE_SESSION"
            ? {
                ok: true,
                data: JSON.stringify({
                  authToken: "auth-token",
                  uid: "uid-value",
                  openudid: "openudid-value",
                }),
              }
            : { ok: false, error: { code: "key_not_found" } },
      },
    } as any);

    expect(result).toEqual({
      ok: true,
      data: {
        authToken: "auth-token",
        uid: "uid-value",
        openudid: "openudid-value",
      },
    });
  });
});
