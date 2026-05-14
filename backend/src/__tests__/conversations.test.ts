import { describe, it, expect, afterEach } from "bun:test";
import express from "express";
import type { Server } from "http";
import type { Request, Response, NextFunction } from "express";
import { Buffer } from "node:buffer";
import { createConversationsRouter } from "../routes/conversations.js";

// ── Mock KV Store (matches real SDK: returns Result objects) ─────────

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
    list: async (_opts?: any) => ({ ok: true, data: { keys: [...data.keys()] } }),
  };
}

// ── Mock SQL (matches real SDK: query returns {ok, data: {rows, columns}}) ──

interface MockSQLConfig {
  conversationRows?: Record<string, unknown>[];
  totalCount?: number;
  participantRows?: Record<string, unknown>[];
  detailRow?: Record<string, unknown>;
}

function toArrayRows(objects: Record<string, unknown>[]): { rows: unknown[][]; columns: string[] } {
  if (objects.length === 0) return { rows: [], columns: [] };
  const columns = Object.keys(objects[0]);
  const rows = objects.map((obj) => columns.map((col) => obj[col]));
  return { rows, columns };
}

function createMockSQL(config: MockSQLConfig = {}) {
  const calls: Array<{ method: string; sql: string; params?: any[] }> = [];

  const query = async (sql: string, params?: any[]) => {
    calls.push({ method: "query", sql, params });

    // List conversations (has participant_count subquery) — check before COUNT
    if (sql.includes("participant_count") && sql.includes("ORDER BY")) {
      return { ok: true, data: toArrayRows(config.conversationRows ?? []) };
    }

    // COUNT query for total
    if (sql.includes("COUNT(*)") && sql.includes("AS total")) {
      return { ok: true, data: toArrayRows([{ total: config.totalCount ?? 0 }]) };
    }

    // Single conversation by id
    if (sql.includes("SELECT metadata FROM conversation") && sql.includes("id = ?")) {
      return {
        ok: true,
        data: toArrayRows(
          config.detailRow ? [{ metadata: config.detailRow.metadata ?? "{}" }] : [],
        ),
      };
    }

    // Single conversation by id
    if (sql.includes("FROM conversation") && sql.includes("WHERE") && sql.includes("id = ?")) {
      return { ok: true, data: toArrayRows(config.detailRow ? [config.detailRow] : []) };
    }

    // Participants by conversation_id
    if (sql.includes("FROM participant") && sql.includes("conversation_id = ?")) {
      return { ok: true, data: toArrayRows(config.participantRows ?? []) };
    }

    // Schema verify SELECT
    if (sql.includes("SELECT 1 FROM conversation")) {
      return { ok: true, data: { rows: [[1]], columns: ["1"] } };
    }

    return { ok: true, data: { rows: [], columns: [] } };
  };

  const execute = async (sql: string, params?: any[]) => {
    calls.push({ method: "execute", sql, params });

    // Schema CREATE statements
    if (sql.trim().startsWith("CREATE")) {
      return { ok: true };
    }

    // DELETE
    if (sql.trim().startsWith("DELETE")) {
      return { ok: true, data: { changes: 0 } };
    }

    return { ok: true, data: { changes: 0 } };
  };

  return { _calls: calls, _config: config, query, execute };
}

// ── Test Helpers ─────────────────────────────────────────────────────

const TEST_SUB = "test-sub";

function mockAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.user = { sub: TEST_SUB };
  next();
}

function createApp(
  mockKV: ReturnType<typeof createMockKV>,
  mockSQL: ReturnType<typeof createMockSQL>,
  opts: {
    secrets?: Map<string, string>;
    transcriptionProviders?: Parameters<
      typeof createConversationsRouter
    >[0]["transcriptionProviders"];
  } = {},
) {
  const mockDelegationMiddleware = (req: Request, _res: Response, next: NextFunction) => {
    req.delegatedAccess = {
      kv: mockKV,
      sql: mockSQL,
      secrets: {
        get: async (name: string) => {
          const value = opts.secrets?.get(name);
          if (!value) return { ok: false, error: { code: "key_not_found" } };
          return { ok: true, data: value };
        },
      },
    } as any;
    next();
  };

  const app = express();
  app.use(express.json());
  app.use(
    "/api/conversations",
    createConversationsRouter({
      authMiddleware: mockAuthMiddleware,
      delegationMiddleware: mockDelegationMiddleware,
      transcriptionProviders: opts.transcriptionProviders,
    }),
  );
  return app;
}

function startServer(app: express.Express): Promise<{ server: Server; port: number }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const port = (server.address() as any).port;
      resolve({ server, port });
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

// ── Tests — GET /api/conversations ──────────────────────────────────

describe("Conversations Routes — GET /api/conversations", () => {
  let mockKV: ReturnType<typeof createMockKV>;
  let mockSQL: ReturnType<typeof createMockSQL>;
  let server: Server;
  let port: number;

  afterEach(async () => {
    await closeServer(server);
  });

  it("returns paginated conversations newest first", async () => {
    mockKV = createMockKV();
    mockSQL = createMockSQL({
      conversationRows: [
        {
          id: "conv-1",
          title: "Sprint Planning",
          source: "fireflies",
          source_url: "https://app.fireflies.ai/view/1",
          started_at: "2026-03-20T10:00:00Z",
          duration_secs: 1800,
          summary: "Team discussed sprint goals",
          participant_count: 3,
          created_at: "2026-03-20T12:00:00Z",
        },
        {
          id: "conv-2",
          title: "Design Review",
          source: "fireflies",
          source_url: "https://app.fireflies.ai/view/2",
          started_at: "2026-03-19T14:00:00Z",
          duration_secs: 2700,
          summary: "Reviewed new designs",
          participant_count: 5,
          created_at: "2026-03-19T15:00:00Z",
        },
      ],
      totalCount: 2,
    });
    const app = createApp(mockKV, mockSQL);
    ({ server, port } = await startServer(app));

    const res = await fetch(`http://localhost:${port}/api/conversations`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.conversations).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.conversations[0].id).toBe("conv-1");
    expect(body.conversations[0].participant_count).toBe(3);
    expect(body.conversations[0].title).toBe("Sprint Planning");
  });

  it("uses default limit=20 and offset=0", async () => {
    mockKV = createMockKV();
    mockSQL = createMockSQL({ conversationRows: [], totalCount: 0 });
    const app = createApp(mockKV, mockSQL);
    ({ server, port } = await startServer(app));

    await fetch(`http://localhost:${port}/api/conversations`);

    const listCall = mockSQL._calls.find(
      (c) => c.sql.includes("ORDER BY") && c.sql.includes("LIMIT"),
    );
    expect(listCall).toBeDefined();
    const params = listCall!.params!;
    expect(params[params.length - 2]).toBe(20);
    expect(params[params.length - 1]).toBe(0);
  });

  it("accepts custom limit and offset query params", async () => {
    mockKV = createMockKV();
    mockSQL = createMockSQL({ conversationRows: [], totalCount: 50 });
    const app = createApp(mockKV, mockSQL);
    ({ server, port } = await startServer(app));

    const res = await fetch(`http://localhost:${port}/api/conversations?limit=10&offset=30`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.total).toBe(50);

    const listCall = mockSQL._calls.find(
      (c) => c.sql.includes("ORDER BY") && c.sql.includes("LIMIT"),
    );
    const params = listCall!.params!;
    expect(params[params.length - 2]).toBe(10);
    expect(params[params.length - 1]).toBe(30);
  });

  it("returns empty list when no conversations exist", async () => {
    mockKV = createMockKV();
    mockSQL = createMockSQL({ conversationRows: [], totalCount: 0 });
    const app = createApp(mockKV, mockSQL);
    ({ server, port } = await startServer(app));

    const res = await fetch(`http://localhost:${port}/api/conversations`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.conversations).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("calls ensureSchema before querying", async () => {
    mockKV = createMockKV();
    mockSQL = createMockSQL({ conversationRows: [], totalCount: 0 });
    const app = createApp(mockKV, mockSQL);
    ({ server, port } = await startServer(app));

    await fetch(`http://localhost:${port}/api/conversations`);

    // First SQL calls should be CREATE TABLE statements (via execute)
    const firstCall = mockSQL._calls[0];
    expect(firstCall.sql.trim().startsWith("CREATE")).toBe(true);
    expect(firstCall.method).toBe("execute");
  });
});

// ── Tests — GET /api/conversations/:id ──────────────────────────────

describe("Conversations Routes — GET /api/conversations/:id", () => {
  let mockKV: ReturnType<typeof createMockKV>;
  let mockSQL: ReturnType<typeof createMockSQL>;
  let server: Server;
  let port: number;

  afterEach(async () => {
    await closeServer(server);
  });

  it("returns conversation with participants and transcript", async () => {
    mockKV = createMockKV();
    const transcript = [{ speaker_name: "Alice", text: "Hello", start_time: 0.5, end_time: 2.1 }];
    mockKV._data.set("transcript/conv-1", JSON.stringify(transcript));

    mockSQL = createMockSQL({
      detailRow: {
        id: "conv-1",
        title: "Sprint Planning",
        source: "fireflies",
        source_id: "ff-123",
        source_url: "https://app.fireflies.ai/view/ff-123",
        started_at: "2026-03-20T10:00:00Z",
        ended_at: "2026-03-20T10:30:00Z",
        duration_secs: 1800,
        summary: "Team discussed sprint goals",
        metadata: JSON.stringify({
          audio_url: "https://audio.example.com/ff-123.mp3",
          organizer_email: "roman@example.com",
        }),
        created_at: "2026-03-20T12:00:00Z",
        updated_at: "2026-03-20T12:00:00Z",
      },
      participantRows: [
        { id: "p-1", name: "Alice", email: "alice@example.com", speaker_label: "0" },
        { id: "p-2", name: "Bob", email: "bob@example.com", speaker_label: "1" },
      ],
    });
    const app = createApp(mockKV, mockSQL);
    ({ server, port } = await startServer(app));

    const res = await fetch(`http://localhost:${port}/api/conversations/conv-1`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.conversation.id).toBe("conv-1");
    expect(body.conversation.title).toBe("Sprint Planning");
    expect(body.conversation.source_id).toBe("ff-123");
    expect(body.conversation.metadata).toEqual({
      audio_url: "https://audio.example.com/ff-123.mp3",
      organizer_email: "roman@example.com",
    });
    expect(body.participants).toHaveLength(2);
    expect(body.participants[0].name).toBe("Alice");
    expect(body.transcript).toHaveLength(1);
    expect(body.transcript[0].text).toBe("Hello");
  });

  it("returns 404 when conversation not found", async () => {
    mockKV = createMockKV();
    mockSQL = createMockSQL({ detailRow: undefined, participantRows: [] });
    const app = createApp(mockKV, mockSQL);
    ({ server, port } = await startServer(app));

    const res = await fetch(`http://localhost:${port}/api/conversations/nonexistent`);
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error).toBe("not_found");
  });

  it("returns null transcript when KV blob is missing", async () => {
    mockKV = createMockKV();

    mockSQL = createMockSQL({
      detailRow: {
        id: "conv-1",
        title: "Sprint Planning",
        source: "fireflies",
        source_id: "ff-123",
        source_url: null,
        started_at: "2026-03-20T10:00:00Z",
        ended_at: null,
        duration_secs: null,
        summary: null,
        metadata: "{}",
        created_at: "2026-03-20T12:00:00Z",
        updated_at: "2026-03-20T12:00:00Z",
      },
      participantRows: [],
    });
    const app = createApp(mockKV, mockSQL);
    ({ server, port } = await startServer(app));

    const res = await fetch(`http://localhost:${port}/api/conversations/conv-1`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.conversation.id).toBe("conv-1");
    expect(body.participants).toEqual([]);
    expect(body.transcript).toBeNull();
  });

  it("adds audio playback URL when stored Fireflies audio exists", async () => {
    mockKV = createMockKV();
    mockSQL = createMockSQL({
      detailRow: {
        id: "conv-1",
        title: "Sprint Planning",
        source: "fireflies",
        source_id: "ff-123",
        source_url: null,
        started_at: "2026-03-20T10:00:00Z",
        ended_at: null,
        duration_secs: null,
        summary: null,
        metadata: JSON.stringify({ audio_data_kv_key: "audio/conv-1/recording.base64" }),
        created_at: "2026-03-20T12:00:00Z",
        updated_at: "2026-03-20T12:00:00Z",
      },
      participantRows: [],
    });
    const app = createApp(mockKV, mockSQL);
    ({ server, port } = await startServer(app));

    const res = await fetch(`http://localhost:${port}/api/conversations/conv-1`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.conversation.metadata.audio_playback_url).toBe("/api/conversations/conv-1/audio");
    expect(body.conversation.metadata.audio_playback_url_source).toBe("backend-kv-fallback");
  });

  it("uses a signed KV read URL for browser audio playback when supported", async () => {
    mockKV = createMockKV();
    const signedUrlCalls: string[] = [];
    (mockKV as any).createSignedReadUrl = async (key: string) => {
      signedUrlCalls.push(key);
      return {
        ok: true,
        data: {
          url: "https://node.example.com/signed/audio",
          relativeUrl: "/signed/kv/ticket-1",
          ticketId: "ticket-1",
          expiresAt: "2026-05-13T13:45:00.000Z",
        },
      };
    };
    mockSQL = createMockSQL({
      detailRow: {
        id: "conv-1",
        title: "Sprint Planning",
        source: "fireflies",
        source_id: "ff-123",
        source_url: null,
        started_at: "2026-03-20T10:00:00Z",
        ended_at: null,
        duration_secs: null,
        summary: null,
        metadata: JSON.stringify({
          audio_data_kv_key: "audio/conv-1/recording",
          audio_metadata_kv_key: "audio/conv-1/recording.json",
          audio_content_type: "audio/webm",
          audio_size_bytes: 8,
        }),
        created_at: "2026-03-20T12:00:00Z",
        updated_at: "2026-03-20T12:00:00Z",
      },
      participantRows: [],
    });
    const app = createApp(mockKV, mockSQL);
    ({ server, port } = await startServer(app));

    const res = await fetch(`http://localhost:${port}/api/conversations/conv-1`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(signedUrlCalls).toEqual(["audio/conv-1/recording"]);
    expect(body.conversation.metadata.audio_playback_url).toBe(
      "https://node.example.com/signed/audio",
    );
    expect(body.conversation.metadata.audio_signed_url_expires_at).toBe("2026-05-13T13:45:00.000Z");
    expect(body.conversation.metadata.audio_playback_url_source).toBe("tinycloud-signed-kv");
    expect(body.conversation.metadata.audio_content_type).toBe("audio/webm");
    expect(body.conversation.metadata.audio_size_bytes).toBe(8);
  });

  it("falls back to backend audio playback when signed KV URL creation fails", async () => {
    mockKV = createMockKV();
    (mockKV as any).createSignedReadUrl = async () => ({
      ok: false,
      error: { code: "signed_url_unavailable" },
    });
    mockSQL = createMockSQL({
      detailRow: {
        id: "conv-1",
        title: "Sprint Planning",
        source: "fireflies",
        source_id: "ff-123",
        source_url: null,
        started_at: "2026-03-20T10:00:00Z",
        ended_at: null,
        duration_secs: null,
        summary: null,
        metadata: JSON.stringify({
          audio_data_kv_key: "audio/conv-1/recording",
          audio_metadata_kv_key: "audio/conv-1/recording.json",
        }),
        created_at: "2026-03-20T12:00:00Z",
        updated_at: "2026-03-20T12:00:00Z",
      },
      participantRows: [],
    });
    const app = createApp(mockKV, mockSQL);
    ({ server, port } = await startServer(app));

    const res = await fetch(`http://localhost:${port}/api/conversations/conv-1`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.conversation.metadata.audio_playback_url).toBe("/api/conversations/conv-1/audio");
    expect(body.conversation.metadata.audio_playback_url_source).toBe("backend-kv-fallback");
    expect(body.conversation.metadata.audio_signed_url_expires_at).toBeUndefined();
  });

  it("keeps base64 string-KV audio on the backend fallback even when signed URLs exist", async () => {
    mockKV = createMockKV();
    const signedUrlCalls: string[] = [];
    (mockKV as any).createSignedReadUrl = async (key: string) => {
      signedUrlCalls.push(key);
      return {
        ok: true,
        data: {
          url: "https://node.example.com/signed/audio",
          relativeUrl: "/signed/kv/ticket-1",
          ticketId: "ticket-1",
          expiresAt: "2026-05-13T13:45:00.000Z",
        },
      };
    };
    mockSQL = createMockSQL({
      detailRow: {
        id: "conv-1",
        title: "Sprint Planning",
        source: "fireflies",
        source_id: "ff-123",
        source_url: null,
        started_at: "2026-03-20T10:00:00Z",
        ended_at: null,
        duration_secs: null,
        summary: null,
        metadata: JSON.stringify({
          audio_data_kv_key: "audio/conv-1/recording.base64",
          audio_storage_encoding: "base64-string-kv",
        }),
        created_at: "2026-03-20T12:00:00Z",
        updated_at: "2026-03-20T12:00:00Z",
      },
      participantRows: [],
    });
    const app = createApp(mockKV, mockSQL);
    ({ server, port } = await startServer(app));

    const res = await fetch(`http://localhost:${port}/api/conversations/conv-1`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(signedUrlCalls).toEqual([]);
    expect(body.conversation.metadata.audio_playback_url).toBe("/api/conversations/conv-1/audio");
    expect(body.conversation.metadata.audio_playback_url_source).toBe("backend-kv-fallback");
  });

  it("serves stored Fireflies audio from KV", async () => {
    mockKV = createMockKV();
    mockKV._data.set("audio/conv-1/recording.base64", Buffer.from("fake mp3").toString("base64"));

    mockSQL = createMockSQL({
      detailRow: {
        id: "conv-1",
        title: "Sprint Planning",
        source: "fireflies",
        source_id: "ff-123",
        source_url: null,
        started_at: "2026-03-20T10:00:00Z",
        ended_at: null,
        duration_secs: null,
        summary: null,
        metadata: JSON.stringify({
          audio_data_kv_key: "audio/conv-1/recording.base64",
          audio_metadata_kv_key: "audio/conv-1/recording.json",
          audio_content_type: "audio/mpeg",
          audio_size_bytes: 8,
        }),
        created_at: "2026-03-20T12:00:00Z",
        updated_at: "2026-03-20T12:00:00Z",
      },
      participantRows: [],
    });
    const app = createApp(mockKV, mockSQL);
    ({ server, port } = await startServer(app));

    const res = await fetch(`http://localhost:${port}/api/conversations/conv-1/audio`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("audio/mpeg");
    expect(await res.text()).toBe("fake mp3");
  });

  it("passes the correct id to SQL and KV queries", async () => {
    mockKV = createMockKV();
    mockSQL = createMockSQL({
      detailRow: {
        id: "conv-abc",
        title: "Test",
        source: "fireflies",
        source_id: "ff-abc",
        source_url: null,
        started_at: null,
        ended_at: null,
        duration_secs: null,
        summary: null,
        metadata: "{}",
        created_at: "2026-03-20T12:00:00Z",
        updated_at: "2026-03-20T12:00:00Z",
      },
      participantRows: [],
    });
    const app = createApp(mockKV, mockSQL);
    ({ server, port } = await startServer(app));

    await fetch(`http://localhost:${port}/api/conversations/conv-abc`);

    const selectCall = mockSQL._calls.find(
      (c) => c.sql.includes("FROM conversation") && c.sql.includes("id = ?"),
    );
    expect(selectCall).toBeDefined();
    expect(selectCall!.params).toContain("conv-abc");

    const participantCall = mockSQL._calls.find(
      (c) => c.sql.includes("FROM participant") && c.sql.includes("conversation_id = ?"),
    );
    expect(participantCall).toBeDefined();
    expect(participantCall!.params).toContain("conv-abc");
  });
});

// ── Tests — POST /api/conversations/import ─────────────────────────

describe("Conversations Routes — POST /api/conversations/import", () => {
  let mockKV: ReturnType<typeof createMockKV>;
  let mockSQL: ReturnType<typeof createMockSQL>;
  let server: Server;
  let port: number;

  afterEach(async () => {
    await closeServer(server);
  });

  it("imports a pasted transcript into SQL and KV", async () => {
    mockKV = createMockKV();
    mockSQL = createMockSQL();
    const app = createApp(mockKV, mockSQL);
    ({ server, port } = await startServer(app));

    const res = await fetch(`http://localhost:${port}/api/conversations/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Manual customer call",
        transcriptText: "[00:00] Sam: Hello\n[00:05] Alex: Hi there",
        startedAt: "2026-05-11T15:00:00.000Z",
        participants: "Sam, Alex",
        summary: "Quick customer call.",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(typeof body.conversationId).toBe("string");

    const conversationInsert = mockSQL._calls.find(
      (call) => call.method === "execute" && call.sql.includes("INSERT INTO conversation"),
    );
    expect(conversationInsert).toBeDefined();
    expect(conversationInsert!.params).toContain("Manual customer call");
    expect(conversationInsert!.params).toContain("manual");
    expect(conversationInsert!.params).toContain("Quick customer call.");

    const participantInserts = mockSQL._calls.filter(
      (call) => call.method === "execute" && call.sql.includes("INSERT INTO participant"),
    );
    expect(participantInserts).toHaveLength(2);

    const transcriptKey = `transcript/${body.conversationId}`;
    expect(mockKV._data.has(transcriptKey)).toBe(true);
    const transcript = JSON.parse(mockKV._data.get(transcriptKey)!);
    expect(transcript).toHaveLength(2);
    expect(transcript[0].speaker_name).toBe("Sam");
    expect(transcript[1].text).toBe("Hi there");
  });

  it("returns 400 when title or transcript text is missing", async () => {
    mockKV = createMockKV();
    mockSQL = createMockSQL();
    const app = createApp(mockKV, mockSQL);
    ({ server, port } = await startServer(app));

    const res = await fetch(`http://localhost:${port}/api/conversations/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "No transcript" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("import_failed");
  });
});

// ── Tests — POST /api/conversations/transcribe ─────────────────────

describe("Conversations Routes — POST /api/conversations/transcribe", () => {
  let mockKV: ReturnType<typeof createMockKV>;
  let mockSQL: ReturnType<typeof createMockSQL>;
  let server: Server;
  let port: number;

  afterEach(async () => {
    await closeServer(server);
  });

  it("stores uploaded media and imports a provider transcript", async () => {
    mockKV = createMockKV();
    mockSQL = createMockSQL();
    const secrets = new Map([["ASSEMBLYAI_API_KEY", "assembly-key"]]);
    const providerCalls: Array<{ fileName: string; apiKey: string; text: string }> = [];
    const app = createApp(mockKV, mockSQL, {
      secrets,
      transcriptionProviders: {
        assemblyai: {
          transcribe: async (input, apiKey) => {
            providerCalls.push({
              fileName: input.fileName,
              apiKey,
              text: new TextDecoder().decode(input.audio),
            });
            return {
              sourceId: "aa-1",
              text: "Hello from audio",
              durationSecs: 5,
              utterances: [{ speaker: "Speaker A", text: "Hello from audio", start: 0, end: 5 }],
              raw: { id: "aa-1" },
            };
          },
        },
      },
    });
    ({ server, port } = await startServer(app));

    const res = await fetch(`http://localhost:${port}/api/conversations/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "assemblyai",
        title: "Uploaded customer call",
        fileName: "call.txt",
        contentType: "text/plain",
        contentBase64: Buffer.from("audio bytes").toString("base64"),
        startedAt: "2026-05-11T15:00:00.000Z",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.provider).toBe("assemblyai");
    expect(providerCalls).toEqual([
      { fileName: "call.txt", apiKey: "assembly-key", text: "audio bytes" },
    ]);
    expect([...mockKV._data.keys()].some((key) => key.startsWith("source-media/"))).toBe(true);

    const conversationInsert = mockSQL._calls.find(
      (call) => call.method === "execute" && call.sql.includes("INSERT INTO conversation"),
    );
    expect(conversationInsert!.params).toContain("Uploaded customer call");
    expect(conversationInsert!.params).toContain("transcription:assemblyai");

    const transcript = JSON.parse(mockKV._data.get(`transcript/${body.conversationId}`)!);
    expect(transcript[0].speaker_name).toBe("Speaker A");
    expect(transcript[0].text).toBe("Hello from audio");
  });

  it("returns 400 for unsupported providers", async () => {
    mockKV = createMockKV();
    mockSQL = createMockSQL();
    const app = createApp(mockKV, mockSQL);
    ({ server, port } = await startServer(app));

    const res = await fetch(`http://localhost:${port}/api/conversations/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "other",
        fileName: "call.wav",
        contentBase64: "YXVkaW8=",
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("transcribe_failed");
  });

  it("returns 400 when the selected provider key is missing", async () => {
    mockKV = createMockKV();
    mockSQL = createMockSQL();
    const app = createApp(mockKV, mockSQL);
    ({ server, port } = await startServer(app));

    const res = await fetch(`http://localhost:${port}/api/conversations/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "deepgram",
        fileName: "call.wav",
        contentBase64: "YXVkaW8=",
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("missing_provider_key");
    expect(body.message).toContain("DEEPGRAM_API_KEY");
  });
});

// ── Auth enforcement ────────────────────────────────────────────────

describe("Conversations Routes — Auth enforcement", () => {
  it("returns 401 when auth middleware rejects", async () => {
    const noAuthMiddleware = (_req: Request, res: Response, _next: NextFunction) => {
      res.status(401).json({ error: "unauthenticated" });
    };
    const mockDelegationMiddleware = (_req: Request, _res: Response, next: NextFunction) => {
      next();
    };

    const app = express();
    app.use(express.json());
    app.use(
      "/api/conversations",
      createConversationsRouter({
        authMiddleware: noAuthMiddleware as any,
        delegationMiddleware: mockDelegationMiddleware,
      }),
    );
    const { server: s, port: p } = await startServer(app);

    try {
      const res = await fetch(`http://localhost:${p}/api/conversations`);
      expect(res.status).toBe(401);
    } finally {
      await closeServer(s);
    }
  });

  it("returns 403 when delegation middleware rejects", async () => {
    const noDelegationMiddleware = (_req: Request, res: Response, _next: NextFunction) => {
      res.status(403).json({ error: "no_delegation" });
    };

    const app = express();
    app.use(express.json());
    app.use(
      "/api/conversations",
      createConversationsRouter({
        authMiddleware: mockAuthMiddleware,
        delegationMiddleware: noDelegationMiddleware as any,
      }),
    );
    const { server: s, port: p } = await startServer(app);

    try {
      const res = await fetch(`http://localhost:${p}/api/conversations`);
      expect(res.status).toBe(403);
    } finally {
      await closeServer(s);
    }
  });
});
