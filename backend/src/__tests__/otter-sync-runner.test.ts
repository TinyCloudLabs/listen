import { describe, expect, it } from "bun:test";
import { runOtterSync } from "../services/otter-sync-runner.js";
import type { OtterSpeech } from "../services/otter-client.js";

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
  let rows: Array<{ id: string; source_id: string; updated_at: string | null }> = [];

  return {
    _calls: calls,
    _setRows(nextRows: Array<{ id: string; source_id: string; updated_at: string | null }>) {
      rows = nextRows;
    },
    query: async (sql: string, params?: any[]) => {
      calls.push({ method: "query", sql, params });
      if (sql.includes("FROM conversation") && sql.includes("source_id")) {
        return {
          ok: true,
          data: {
            rows: rows.map((row) => [row.id, row.source_id, row.updated_at]),
            columns: ["id", "source_id", "updated_at"],
          },
        };
      }
      if (sql.includes("SELECT transcript_json")) {
        return { ok: true, data: { rows: [], columns: [] } };
      }
      return { ok: true, data: { rows: [], columns: [] } };
    },
    execute: async (sql: string, params?: any[]) => {
      calls.push({ method: "execute", sql, params });
      return { ok: true, data: { changes: sql.trim().startsWith("INSERT") ? 1 : 0 } };
    },
  };
}

const TXT = `Alice  0:05
Updated Otter transcript.
`;

describe("runOtterSync", () => {
  it("refreshes a known speech when transcript_updated_at is newer than local updated_at", async () => {
    const kv = createMockKV();
    const sql = createMockSQL();
    sql._setRows([
      {
        id: "existing-otter-conv",
        source_id: "otter:otter-1",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);
    const speech: OtterSpeech = {
      otid: "otter-1",
      title: "Updated Otter Meeting",
      start_time: 1_704_000_000,
      duration: 60,
      transcript_updated_at: "2026-01-02T00:00:00.000Z",
    };
    const exported: string[] = [];

    const result = await runOtterSync(
      { kv, sql } as any,
      {
        listAllSpeeches: async () => [speech],
        exportTxt: async (otid: string) => {
          exported.push(otid);
          return TXT;
        },
      },
      { mode: "incremental" },
    );

    expect(result).toMatchObject({ synced: 1, skipped: 0, failed: 0 });
    expect(result.conversations[0]?.id).toBe("existing-otter-conv");
    expect(exported).toEqual(["otter-1"]);

    const conversationInserts = sql._calls.filter(
      (call) => call.method === "execute" && call.sql.includes("INSERT INTO conversation"),
    );
    const conversationUpdates = sql._calls.filter(
      (call) =>
        call.method === "execute" && call.sql.trim().startsWith("UPDATE conversation SET title"),
    );
    expect(conversationInserts).toHaveLength(0);
    expect(conversationUpdates).toHaveLength(1);
    expect(conversationUpdates[0].params?.at(-1)).toBe("existing-otter-conv");
  });
});
