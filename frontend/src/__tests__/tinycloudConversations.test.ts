import { describe, it, expect, vi } from "vitest";
import type { TinyCloudWeb } from "@tinycloud/web-sdk";
import type { ApiClient } from "@listen/client";
import { createTinyCloudConversationApi } from "../lib/tinycloudConversations";

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
  } = {},
): TinyCloudWeb {
  return {
    sql: {
      db: vi.fn((name: string) => {
        expect(name).toBe("xyz.tinycloud.listen/conversations");
        return { query };
      }),
    },
    kv: {
      get: vi.fn(async (key: string) => {
        expect(key).toBe("transcript/01ABC");
        return { ok: true, data: { data: options.transcript ?? null } };
      }),
      createSignedReadUrl: vi.fn(async () => ({
        ok: true,
        data: { url: options.signedAudioUrl, expiresAt: "2026-05-14T20:00:00.000Z" },
      })),
    },
  } as unknown as TinyCloudWeb;
}

describe("createTinyCloudConversationApi", () => {
  it("reads conversation pages directly from TinyCloud SQL", async () => {
    const backendGet = vi.fn();
    const api = mockApi({ get: backendGet });
    const query = vi.fn(async (sql: string, params?: unknown[]) => {
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

    const result = await client.get<{ conversations: Array<{ id: string }>; total: number }>(
      "/api/conversations?limit=20&offset=0",
    );

    expect(result.total).toBe(1);
    expect(result.conversations[0]?.id).toBe("01ABC");
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
              metadata: JSON.stringify({ audio_data_kv_key: "audio/01ABC/recording" }),
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
        transcript: JSON.stringify([{ speaker_name: "Ada", text: "Hello", start_time: 0 }]),
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
    expect(result.conversation.metadata.audio_playback_url).toBe(
      "https://tinycloud.local/audio.mp3",
    );
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
});
