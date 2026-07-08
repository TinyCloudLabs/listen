import { describe, it, expect, vi } from "vitest";
import type { TinyCloudWeb } from "@tinycloud/web-sdk";
import type { ApiClient } from "@listen/client";
import { createTinyCloudConversationApi, ensureSchema } from "../lib/tinycloudConversations";

function mockApi(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
    ...overrides,
  };
}

function toArrayRows(objects: Record<string, unknown>[]): { rows: unknown[][]; columns: string[] } {
  if (objects.length === 0) return { rows: [], columns: [] };
  const columns = Object.keys(objects[0]!);
  return {
    columns,
    rows: objects.map((obj) => columns.map((column) => obj[column])),
  };
}

function mockTinyCloud(
  query: ReturnType<typeof vi.fn>,
  options: {
    transcript?: unknown;
    signedAudioUrl?: string;
    apply?: ReturnType<typeof vi.fn>;
  } = {},
): TinyCloudWeb {
  const apply = options.apply ?? vi.fn(async () => ({ ok: true }));
  return {
    sql: {
      db: vi.fn((name: string) => {
        expect(name).toBe("xyz.tinycloud.listen/conversations");
        return { query, migrations: { apply } };
      }),
    },
    kv: {
      get: vi.fn(async (key: string) => {
        expect(key).toBe("xyz.tinycloud.listen/transcript/01ABC");
        return { ok: true, data: { data: options.transcript ?? null } };
      }),
      createSignedReadUrl: vi.fn(async (key: string) => {
        expect(key).toBe("xyz.tinycloud.listen/audio/01ABC/recording");
        return {
          ok: true,
          data: { url: options.signedAudioUrl, expiresAt: "2026-05-14T20:00:00.000Z" },
        };
      }),
    },
  } as unknown as TinyCloudWeb;
}

describe("createTinyCloudConversationApi", () => {
  it("reads conversation pages directly from TinyCloud SQL", async () => {
    const backendGet = vi.fn();
    const api = mockApi({ get: backendGet });
    const query = vi.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes("GROUP BY source")) {
        return { ok: true, data: toArrayRows([{ source: "fireflies", total: 1 }]) };
      }
      if (sql.includes("COUNT(*) AS total")) {
        return { ok: true, data: toArrayRows([{ total: 1 }]) };
      }
      if (sql.includes("participant_count")) {
        expect(params).toEqual([20, 0]);
        return {
          ok: true,
          data: toArrayRows([
            {
              id: "01ABC",
              title: "Planning",
              source: "fireflies",
              source_url: null,
              started_at: "2026-05-14T14:00:00Z",
              duration_secs: 1200,
              summary: "Roadmap",
              created_at: "2026-05-14T14:30:00Z",
              participant_count: 2,
            },
          ]),
        };
      }
      return { ok: true, data: toArrayRows([]) };
    });
    const client = createTinyCloudConversationApi(api, mockTinyCloud(query));

    const result = await client.get<{
      conversations: Array<{ id: string }>;
      total: number;
      source_counts: Array<{ source: string; total: number }>;
    }>("/api/conversations?limit=20&offset=0");

    expect(result.total).toBe(1);
    expect(result.conversations[0]?.id).toBe("01ABC");
    expect(result.source_counts).toEqual([{ source: "fireflies", total: 1 }]);
    expect(backendGet).not.toHaveBeenCalled();
  });

  it("reads conversation detail from TinyCloud SQL and KV", async () => {
    const backendGet = vi.fn();
    const api = mockApi({ get: backendGet });
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("FROM conversation") && sql.includes("WHERE id = ?")) {
        return {
          ok: true,
          data: toArrayRows([
            {
              id: "01ABC",
              title: "Planning",
              source: "fireflies",
              source_id: "ff-1",
              source_url: null,
              started_at: "2026-05-14T14:00:00Z",
              ended_at: "2026-05-14T14:20:00Z",
              duration_secs: 1200,
              summary: "Roadmap",
              metadata: JSON.stringify({
                audio_kv_key: "audio/01ABC/recording",
                audio_metadata_kv_key: "audio/01ABC/recording.json",
                audio_content_type: "audio/webm",
              }),
              created_at: "2026-05-14T14:30:00Z",
              updated_at: "2026-05-14T14:30:00Z",
            },
          ]),
        };
      }
      if (sql.includes("FROM participant")) {
        return {
          ok: true,
          data: toArrayRows([{ id: "p1", name: "Ada", email: null, speaker_label: "Ada" }]),
        };
      }
      return { ok: true, data: toArrayRows([]) };
    });
    const client = createTinyCloudConversationApi(
      api,
      mockTinyCloud(query, {
        transcript: JSON.stringify([
          {
            speakerName: "Ada",
            text: "Hello",
            startTime: 0,
            endTime: 1.5,
            languageCode: "en",
          },
        ]),
        signedAudioUrl: "https://tinycloud.local/audio.mp3",
      }),
    );

    const result = await client.get<{
      conversation: { metadata: Record<string, unknown> };
      participants: Array<{ name: string }>;
      transcript: Array<{ text: string }>;
    }>("/api/conversations/01ABC");

    expect(result.participants[0]?.name).toBe("Ada");
    expect(result.transcript[0]?.text).toBe("Hello");
    expect(result.transcript[0]?.speaker_id).toBe("ada");
    expect(result.transcript[0]?.start_time).toBe(0);
    expect(result.conversation.metadata.audio_playback_url).toBe(
      "https://tinycloud.local/audio.mp3",
    );
    expect(result.conversation.metadata.audio_data_kv_key).toBe("audio/01ABC/recording");
    expect(result.conversation.metadata.audio_kv_key).toBe("audio/01ABC/recording");
    expect(backendGet).not.toHaveBeenCalled();
  });

  it("prefers SQL transcript rows over KV when reading detail directly", async () => {
    const backendGet = vi.fn();
    const api = mockApi({ get: backendGet });
    const kvGet = vi.fn(async () => ({
      ok: true,
      data: { data: JSON.stringify([{ speakerName: "KV", text: "Old" }]) },
    }));
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("FROM conversation") && sql.includes("WHERE id = ?")) {
        return {
          ok: true,
          data: toArrayRows([
            {
              id: "01ABC",
              title: "Planning",
              source: "fireflies",
              source_id: "ff-1",
              source_url: null,
              started_at: "2026-05-14T14:00:00Z",
              ended_at: "2026-05-14T14:20:00Z",
              duration_secs: 1200,
              summary: "Roadmap",
              metadata: "{}",
              transcript_json: JSON.stringify([{ speakerName: "SQL", text: "Current" }]),
              transcript_text: "SQL: Current",
              created_at: "2026-05-14T14:30:00Z",
              updated_at: "2026-05-14T14:30:00Z",
            },
          ]),
        };
      }
      if (sql.includes("FROM participant")) {
        return { ok: true, data: toArrayRows([]) };
      }
      return { ok: true, data: toArrayRows([]) };
    });
    const client = createTinyCloudConversationApi(api, {
      sql: {
        db: vi.fn(() => ({ query, migrations: { apply: vi.fn(async () => ({ ok: true })) } })),
      },
      kv: {
        get: kvGet,
      },
    } as unknown as TinyCloudWeb);

    const result = await client.get<{
      transcript: Array<{ speaker_name: string; text: string }>;
    }>("/api/conversations/01ABC");

    expect(result.transcript[0]?.speaker_name).toBe("SQL");
    expect(result.transcript[0]?.text).toBe("Current");
    expect(kvGet).not.toHaveBeenCalled();
    expect(backendGet).not.toHaveBeenCalled();
  });

  it("surfaces direct TinyCloud read failures instead of falling back to the backend", async () => {
    const backendGet = vi.fn().mockResolvedValue({ conversations: [], total: 0 });
    const api = mockApi({ get: backendGet });
    const query = vi.fn(async () => ({
      ok: false,
      error: { message: "SQL unavailable" },
    }));
    const client = createTinyCloudConversationApi(api, mockTinyCloud(query));

    await expect(client.get("/api/conversations?limit=20&offset=0")).rejects.toThrow(
      "SQL unavailable",
    );

    expect(backendGet).not.toHaveBeenCalled();
  });

  it("uses the backend for conversation reads only when no TinyCloud client is available", async () => {
    const backendGet = vi.fn().mockResolvedValue({ conversations: [], total: 0 });
    const api = mockApi({ get: backendGet });
    const client = createTinyCloudConversationApi(api, null);

    const result = await client.get("/api/conversations?limit=20&offset=0");

    expect(result).toEqual({ conversations: [], total: 0 });
    expect(backendGet).toHaveBeenCalledWith("/api/conversations?limit=20&offset=0");
  });

  it("delegates non-conversation calls to the backend client", async () => {
    const backendGet = vi.fn().mockResolvedValue({ connected: true });
    const api = mockApi({ get: backendGet });
    const client = createTinyCloudConversationApi(api, null);

    await expect(client.get("/api/config/google-meet/connected")).resolves.toEqual({
      connected: true,
    });
    expect(backendGet).toHaveBeenCalledWith("/api/config/google-meet/connected");
  });

  it("applies migrations before running the first direct list query", async () => {
    const calls: string[] = [];
    const apply = vi.fn(async () => {
      calls.push("migrate");
      return { ok: true };
    });
    const query = vi.fn(async (sql: string) => {
      // The only query allowed before the list runs is the 002 column probe.
      calls.push(sql.includes("transcript_json, transcript_text") ? "probe" : "list");
      return { ok: true, data: toArrayRows([]) };
    });
    const client = createTinyCloudConversationApi(mockApi(), mockTinyCloud(query, { apply }));

    await client.get("/api/conversations?limit=20&offset=0");

    // Seeding (001 initial, 002 probe, 002 columns) fully precedes list queries.
    expect(calls.filter((c) => c === "migrate").length).toBe(2);
    const firstListIdx = calls.indexOf("list");
    expect(firstListIdx).toBeGreaterThan(-1);
    expect(calls.lastIndexOf("migrate")).toBeLessThan(firstListIdx);
    expect(calls.lastIndexOf("probe")).toBeLessThan(firstListIdx);
  });

  it("seeds the schema once across concurrent first reads", async () => {
    const apply = vi.fn(async () => ({ ok: true }));
    const query = vi.fn(async () => ({ ok: true, data: toArrayRows([]) }));
    const tcw = mockTinyCloud(query, { apply });
    const client = createTinyCloudConversationApi(mockApi(), tcw);

    // Mirror App.tsx firing the exists-probe and ConversationList concurrently.
    await Promise.all([
      client.get("/api/conversations?limit=1&offset=0"),
      client.get("/api/conversations?limit=20&offset=0"),
    ]);

    // 001_initial + 002 columns applied exactly once total, not per read.
    expect(apply).toHaveBeenCalledTimes(2);
  });

  it("re-runs the idempotent migrations for a fresh TinyCloud instance", async () => {
    const apply = vi.fn(async () => ({ ok: true }));
    const query = vi.fn(async () => ({ ok: true, data: toArrayRows([]) }));

    // A cached (already-seeded) instance memoizes and does not re-apply.
    const seeded = mockTinyCloud(query, { apply });
    await ensureSchema(seeded);
    await ensureSchema(seeded);
    expect(apply).toHaveBeenCalledTimes(2);

    // A different instance seeds independently (migrations.apply is idempotent).
    apply.mockClear();
    const fresh = mockTinyCloud(query, { apply });
    await ensureSchema(fresh);
    expect(apply).toHaveBeenCalledTimes(2);
  });

  it("surfaces schema seeding failures instead of the missing-table read error", async () => {
    const apply = vi.fn(async () => ({ ok: false, error: { message: "not authorized" } }));
    const query = vi.fn(async () => ({ ok: true, data: toArrayRows([]) }));
    const client = createTinyCloudConversationApi(mockApi(), mockTinyCloud(query, { apply }));

    await expect(client.get("/api/conversations?limit=20&offset=0")).rejects.toThrow(
      "Failed to initialize conversations schema: not authorized",
    );
    expect(query).not.toHaveBeenCalled();
  });
});
