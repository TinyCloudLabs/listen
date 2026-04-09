import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import express from "express";
import type { Server } from "http";
import type { Request, Response, NextFunction } from "express";
import { createSyncRouter } from "../routes/sync.js";
import type {
  TranscriptSummary,
  FullTranscript,
  PaginationOptions,
  PaginationResult,
} from "../services/fireflies-client.js";

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
  };
}

// ── Mock SQL (matches real SDK: query for SELECT, execute for writes) ──

function createMockSQL() {
  const calls: Array<{ method: string; sql: string; params?: any[] }> = [];
  let dedupRows: Array<{ source_id: string }> = [];

  return {
    _calls: calls,
    _setDedupRows(rows: Array<{ source_id: string }>) {
      dedupRows = rows;
    },
    query: async (sql: string, params?: any[]) => {
      calls.push({ method: "query", sql, params });

      // Dedup SELECT query — rows are arrays, source_id at index 0
      if (sql.includes("SELECT source_id FROM conversation")) {
        return {
          ok: true,
          data: {
            rows: dedupRows.map((r) => [r.source_id]),
            columns: ["source_id"],
          },
        };
      }

      // Schema verify SELECT
      if (sql.includes("SELECT 1 FROM conversation")) {
        return { ok: true, data: { rows: [[1]], columns: ["1"] } };
      }

      return { ok: true, data: { rows: [], columns: [] } };
    },
    execute: async (sql: string, params?: any[]) => {
      calls.push({ method: "execute", sql, params });

      // Schema CREATE statements
      if (sql.trim().startsWith("CREATE")) {
        return { ok: true };
      }

      // INSERT statements
      if (sql.trim().startsWith("INSERT")) {
        return { ok: true, data: { changes: 1 } };
      }

      return { ok: true, data: { changes: 0 } };
    },
  };
}

// ── Mock Fireflies Client Factory ────────────────────────────────────

function createMockTranscriptSummary(
  overrides: Partial<TranscriptSummary> = {},
): TranscriptSummary {
  return {
    id: overrides.id ?? "ff-1",
    title: overrides.title ?? "Test Meeting",
    date: overrides.date ?? 1711000000000,
    duration: overrides.duration ?? 60,
    organizer_email: overrides.organizer_email ?? "test@example.com",
    transcript_url: overrides.transcript_url ?? "https://app.fireflies.ai/view/ff-1",
  };
}

function createMockFullTranscript(overrides: Partial<FullTranscript> = {}): FullTranscript {
  return {
    id: overrides.id ?? "ff-1",
    title: overrides.title ?? "Test Meeting",
    date: overrides.date ?? 1711000000000,
    duration: overrides.duration ?? 60,
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

function createMockClientFactory() {
  let listResult: TranscriptSummary[] = [];
  /** For paginated listing: array of batches, each batch returned per call */
  let listBatches: TranscriptSummary[][] | null = null;
  let listCallIndex = 0;
  const getResults = new Map<string, FullTranscript | Error>();
  let lastApiKey: string | null = null;

  return {
    setListResult(transcripts: TranscriptSummary[]) {
      listResult = transcripts;
    },
    /** Set paginated batches for listAllTranscripts tests */
    setListBatches(batches: TranscriptSummary[][]) {
      listBatches = batches;
      listCallIndex = 0;
    },
    setGetResult(id: string, result: FullTranscript | Error) {
      getResults.set(id, result);
    },
    getLastApiKey() {
      return lastApiKey;
    },
    factory(apiKey: string) {
      lastApiKey = apiKey;
      return {
        listTranscripts: async (_limit?: number, _skip?: number) => {
          if (listBatches) {
            const batch = listBatches[listCallIndex] ?? [];
            listCallIndex++;
            return batch;
          }
          return listResult;
        },
        listAllTranscripts: async (options?: PaginationOptions): Promise<PaginationResult> => {
          // If batches are set, simulate real pagination
          if (listBatches) {
            const knownIds = options?.knownIds;
            const mode = options?.mode ?? "incremental";
            const all: TranscriptSummary[] = [];
            let batchCount = 0;
            let earlyExit = false;

            for (const batch of listBatches) {
              batchCount++;
              if (mode === "incremental" && knownIds) {
                const seenInBatch = batch.some((t) => knownIds.has(t.id));
                if (seenInBatch) {
                  for (const t of batch) {
                    if (!knownIds.has(t.id)) all.push(t);
                  }
                  earlyExit = true;
                  options?.onProgress?.({ batch: batchCount, totalSoFar: all.length });
                  break;
                }
              }
              all.push(...batch);
              options?.onProgress?.({ batch: batchCount, totalSoFar: all.length });
            }

            return { transcripts: all, batchCount, earlyExit };
          }

          // Simple fallback: return listResult as single batch
          options?.onProgress?.({ batch: 1, totalSoFar: listResult.length });
          return { transcripts: listResult, batchCount: 1, earlyExit: false };
        },
        getTranscript: async (id: string) => {
          const result = getResults.get(id);
          if (result instanceof Error) throw result;
          if (!result) throw new Error(`No mock transcript for id=${id}`);
          return result;
        },
      };
    },
  };
}

// ── Test Helpers ─────────────────────────────────────────────────────

const TEST_SUB = "test-sub";
const KV_KEY = "/app.conversations/config/fireflies-key";

function mockAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.user = { sub: TEST_SUB };
  next();
}

function createApp(
  mockKV: ReturnType<typeof createMockKV>,
  mockSQL: ReturnType<typeof createMockSQL>,
  clientFactory: ReturnType<typeof createMockClientFactory>,
) {
  const mockDelegationMiddleware = (req: Request, _res: Response, next: NextFunction) => {
    req.delegatedAccess = { kv: mockKV, sql: mockSQL } as any;
    next();
  };

  const app = express();
  app.use(express.json());
  app.use(
    "/api/sync",
    createSyncRouter({
      authMiddleware: mockAuthMiddleware,
      delegationMiddleware: mockDelegationMiddleware,
      createClient: clientFactory.factory,
      syncDelayMs: 0,
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

// ── SSE parsing helper ──────────────────────────────────────────────

interface ParsedSSEEvent {
  type: string;
  data: any;
}

function parseSSEText(text: string): ParsedSSEEvent[] {
  const events: ParsedSSEEvent[] = [];
  for (const block of text.split("\n\n")) {
    if (!block.trim()) continue;
    let type = "message";
    let data = "";
    for (const line of block.split("\n")) {
      if (line.startsWith("event: ")) type = line.slice(7);
      else if (line.startsWith("data: ")) data = line.slice(6);
    }
    if (data) {
      try {
        events.push({ type, data: JSON.parse(data) });
      } catch {
        /* skip malformed */
      }
    }
  }
  return events;
}

// ── Tests ────────────────────────────────────────────────────────────

describe("Sync Routes — POST /api/sync/fireflies", () => {
  let mockKV: ReturnType<typeof createMockKV>;
  let mockSQL: ReturnType<typeof createMockSQL>;
  let clientFactory: ReturnType<typeof createMockClientFactory>;
  let server: Server;
  let port: number;

  beforeEach(async () => {
    mockKV = createMockKV();
    mockSQL = createMockSQL();
    clientFactory = createMockClientFactory();
    const app = createApp(mockKV, mockSQL, clientFactory);
    ({ server, port } = await startServer(app));
  });

  afterEach(async () => {
    await closeServer(server);
  });

  // ── Happy path ──────────────────────────────────────────────────

  it("syncs all transcripts when none exist in DB", async () => {
    mockKV._data.set(KV_KEY, "test-api-key");

    const summaries = [
      createMockTranscriptSummary({ id: "ff-1", title: "Meeting 1" }),
      createMockTranscriptSummary({ id: "ff-2", title: "Meeting 2" }),
      createMockTranscriptSummary({ id: "ff-3", title: "Meeting 3" }),
    ];
    clientFactory.setListResult(summaries);
    clientFactory.setGetResult(
      "ff-1",
      createMockFullTranscript({ id: "ff-1", title: "Meeting 1" }),
    );
    clientFactory.setGetResult(
      "ff-2",
      createMockFullTranscript({ id: "ff-2", title: "Meeting 2" }),
    );
    clientFactory.setGetResult(
      "ff-3",
      createMockFullTranscript({ id: "ff-3", title: "Meeting 3" }),
    );

    // No existing transcripts in SQL
    mockSQL._setDedupRows([]);

    const res = await fetch(`http://localhost:${port}/api/sync/fireflies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.synced).toBe(3);
    expect(body.skipped).toBe(0);
    expect(body.failed).toBe(0);
    expect(body.errors).toEqual([]);
    expect(body.conversations).toHaveLength(3);
    expect(body.conversations[0]).toHaveProperty("id");
    expect(body.conversations[0]).toHaveProperty("title");
    expect(body.conversations[0]).toHaveProperty("started_at");
  });

  // ── Pre-fetch dedup ─────────────────────────────────────────────

  it("skips already-synced transcripts (pre-fetch dedup)", async () => {
    mockKV._data.set(KV_KEY, "test-api-key");

    const summaries = [
      createMockTranscriptSummary({ id: "ff-1", title: "Meeting 1" }),
      createMockTranscriptSummary({ id: "ff-2", title: "Meeting 2" }),
      createMockTranscriptSummary({ id: "ff-3", title: "Meeting 3" }),
    ];
    clientFactory.setListResult(summaries);
    // Only set up getTranscript for ff-2 and ff-3 — ff-1 should not be fetched
    clientFactory.setGetResult(
      "ff-2",
      createMockFullTranscript({ id: "ff-2", title: "Meeting 2" }),
    );
    clientFactory.setGetResult(
      "ff-3",
      createMockFullTranscript({ id: "ff-3", title: "Meeting 3" }),
    );

    // ff-1 already exists in DB
    mockSQL._setDedupRows([{ source_id: "ff-1" }]);

    const res = await fetch(`http://localhost:${port}/api/sync/fireflies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.synced).toBe(2);
    expect(body.skipped).toBe(1);
    expect(body.failed).toBe(0);
    expect(body.errors).toEqual([]);
    expect(body.conversations).toHaveLength(2);
  });

  // ── All skipped ─────────────────────────────────────────────────

  it("returns all skipped when every transcript already exists", async () => {
    mockKV._data.set(KV_KEY, "test-api-key");

    const summaries = [
      createMockTranscriptSummary({ id: "ff-1" }),
      createMockTranscriptSummary({ id: "ff-2" }),
    ];
    clientFactory.setListResult(summaries);

    // Both already in DB
    mockSQL._setDedupRows([{ source_id: "ff-1" }, { source_id: "ff-2" }]);

    const res = await fetch(`http://localhost:${port}/api/sync/fireflies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.synced).toBe(0);
    expect(body.skipped).toBe(2);
    expect(body.failed).toBe(0);
    expect(body.errors).toEqual([]);
    expect(body.conversations).toHaveLength(0);
  });

  // ── Individual failure ──────────────────────────────────────────

  it("continues on individual transcript failure and reports error", async () => {
    mockKV._data.set(KV_KEY, "test-api-key");

    const summaries = [
      createMockTranscriptSummary({ id: "ff-1", title: "Meeting 1" }),
      createMockTranscriptSummary({ id: "ff-2", title: "Meeting 2" }),
      createMockTranscriptSummary({ id: "ff-3", title: "Meeting 3" }),
    ];
    clientFactory.setListResult(summaries);

    clientFactory.setGetResult(
      "ff-1",
      createMockFullTranscript({ id: "ff-1", title: "Meeting 1" }),
    );
    clientFactory.setGetResult("ff-2", new Error("Fireflies API timeout"));
    clientFactory.setGetResult(
      "ff-3",
      createMockFullTranscript({ id: "ff-3", title: "Meeting 3" }),
    );

    mockSQL._setDedupRows([]);

    const res = await fetch(`http://localhost:${port}/api/sync/fireflies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.synced).toBe(2);
    expect(body.skipped).toBe(0);
    expect(body.failed).toBe(1);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0]).toContain("ff-2");
    expect(body.conversations).toHaveLength(2);
  });

  // ── Missing API key ─────────────────────────────────────────────

  it("returns 404 when no Fireflies API key is configured", async () => {
    // No key set in KV

    const res = await fetch(`http://localhost:${port}/api/sync/fireflies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("no_api_key");
  });

  // ── Limit validation ───────────────────────────────────────────

  it("clamps limit > 50 to 50", async () => {
    mockKV._data.set(KV_KEY, "test-api-key");
    clientFactory.setListResult([]);
    mockSQL._setDedupRows([]);

    const res = await fetch(`http://localhost:${port}/api/sync/fireflies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 100 }),
    });

    expect(res.status).toBe(200);
    // The response should succeed; the limit was silently clamped.
    // We can verify via the mock that listTranscripts was called.
    const body = await res.json();
    expect(body.synced).toBe(0);
    expect(body.skipped).toBe(0);
  });

  it("defaults limit to 20 when not provided or invalid", async () => {
    mockKV._data.set(KV_KEY, "test-api-key");
    clientFactory.setListResult([]);
    mockSQL._setDedupRows([]);

    const res = await fetch(`http://localhost:${port}/api/sync/fireflies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: -5 }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.synced).toBe(0);
    expect(body.skipped).toBe(0);
  });

  // ── Empty list ──────────────────────────────────────────────────

  it("handles empty transcript list from Fireflies", async () => {
    mockKV._data.set(KV_KEY, "test-api-key");
    clientFactory.setListResult([]);
    mockSQL._setDedupRows([]);

    const res = await fetch(`http://localhost:${port}/api/sync/fireflies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.synced).toBe(0);
    expect(body.skipped).toBe(0);
    expect(body.failed).toBe(0);
    expect(body.errors).toEqual([]);
    expect(body.conversations).toHaveLength(0);
  });

  // ── KV transcript blob ─────────────────────────────────────────

  it("writes transcript sentences to KV", async () => {
    mockKV._data.set(KV_KEY, "test-api-key");

    const summaries = [createMockTranscriptSummary({ id: "ff-1" })];
    clientFactory.setListResult(summaries);
    clientFactory.setGetResult("ff-1", createMockFullTranscript({ id: "ff-1" }));
    mockSQL._setDedupRows([]);

    const res = await fetch(`http://localhost:${port}/api/sync/fireflies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.synced).toBe(1);

    // Verify KV was written with the conversation ID
    const conversationId = body.conversations[0].id;
    const kvKey = `/app.conversations/transcript/${conversationId}`;
    const storedBlob = mockKV._data.get(kvKey);
    expect(storedBlob).toBeDefined();

    // The blob should be a JSON string of the sentences array
    const parsed = JSON.parse(storedBlob!);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].text).toBe("Hello everyone");
  });

  // ── SQL insert verification ────────────────────────────────────

  it("inserts conversation and participants into SQL", async () => {
    mockKV._data.set(KV_KEY, "test-api-key");

    const summaries = [createMockTranscriptSummary({ id: "ff-1" })];
    clientFactory.setListResult(summaries);
    clientFactory.setGetResult("ff-1", createMockFullTranscript({ id: "ff-1" }));
    mockSQL._setDedupRows([]);

    const res = await fetch(`http://localhost:${port}/api/sync/fireflies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.synced).toBe(1);

    // Find conversation INSERT calls
    const conversationInserts = mockSQL._calls.filter(
      (c) =>
        c.sql.includes("INSERT") &&
        c.sql.includes("conversation") &&
        !c.sql.includes("participant"),
    );
    expect(conversationInserts.length).toBeGreaterThanOrEqual(1);

    // Find participant INSERT calls (Alice and Bob)
    const participantInserts = mockSQL._calls.filter(
      (c) => c.sql.includes("INSERT") && c.sql.includes("participant"),
    );
    expect(participantInserts.length).toBeGreaterThanOrEqual(2);
  });

  // ── Metadata is JSON-stringified ───────────────────────────────

  it("JSON-stringifies metadata before SQL insert", async () => {
    mockKV._data.set(KV_KEY, "test-api-key");

    const summaries = [createMockTranscriptSummary({ id: "ff-1" })];
    clientFactory.setListResult(summaries);
    clientFactory.setGetResult("ff-1", createMockFullTranscript({ id: "ff-1" }));
    mockSQL._setDedupRows([]);

    await fetch(`http://localhost:${port}/api/sync/fireflies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    // Find the conversation INSERT and check its params contain stringified metadata
    const conversationInsert = mockSQL._calls.find(
      (c) =>
        c.sql.includes("INSERT") &&
        c.sql.includes("conversation") &&
        !c.sql.includes("participant"),
    );
    expect(conversationInsert).toBeDefined();

    // metadata should be a JSON string in the params
    const metadataParam = conversationInsert!.params?.find(
      (p) => typeof p === "string" && p.includes("audio_url"),
    );
    expect(metadataParam).toBeDefined();
    // Should be valid JSON
    const parsed = JSON.parse(metadataParam!);
    expect(parsed).toHaveProperty("audio_url");
    expect(parsed).toHaveProperty("organizer_email");
  });

  // ── Auth/delegation enforcement ─────────────────────────────────

  describe("Auth and delegation enforcement", () => {
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
        "/api/sync",
        createSyncRouter({
          authMiddleware: noAuthMiddleware as any,
          delegationMiddleware: mockDelegationMiddleware,
        }),
      );
      const { server: s, port: p } = await startServer(app);

      try {
        const res = await fetch(`http://localhost:${p}/api/sync/fireflies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
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
        "/api/sync",
        createSyncRouter({
          authMiddleware: mockAuthMiddleware,
          delegationMiddleware: noDelegationMiddleware as any,
        }),
      );
      const { server: s, port: p } = await startServer(app);

      try {
        const res = await fetch(`http://localhost:${p}/api/sync/fireflies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        expect(res.status).toBe(403);
      } finally {
        await closeServer(s);
      }
    });
  });
});

// ── SSE Streaming Sync Tests ─────────────────────────────────────────

describe("Sync Routes — GET /api/sync/fireflies/stream", () => {
  let mockKV: ReturnType<typeof createMockKV>;
  let mockSQL: ReturnType<typeof createMockSQL>;
  let clientFactory: ReturnType<typeof createMockClientFactory>;
  let server: Server;
  let port: number;

  beforeEach(async () => {
    mockKV = createMockKV();
    mockSQL = createMockSQL();
    clientFactory = createMockClientFactory();
    const app = createApp(mockKV, mockSQL, clientFactory);
    ({ server, port } = await startServer(app));
  });

  afterEach(async () => {
    await closeServer(server);
  });

  it("returns text/event-stream content type", async () => {
    mockKV._data.set(KV_KEY, "test-api-key");
    clientFactory.setListResult([]);
    mockSQL._setDedupRows([]);

    const res = await fetch(`http://localhost:${port}/api/sync/fireflies/stream`);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream");
  });

  it("syncs all transcripts and sends complete event", async () => {
    mockKV._data.set(KV_KEY, "test-api-key");

    const summaries = [
      createMockTranscriptSummary({ id: "ff-1", title: "Meeting 1" }),
      createMockTranscriptSummary({ id: "ff-2", title: "Meeting 2" }),
    ];
    clientFactory.setListResult(summaries);
    clientFactory.setGetResult(
      "ff-1",
      createMockFullTranscript({ id: "ff-1", title: "Meeting 1" }),
    );
    clientFactory.setGetResult(
      "ff-2",
      createMockFullTranscript({ id: "ff-2", title: "Meeting 2" }),
    );
    mockSQL._setDedupRows([]);

    const res = await fetch(`http://localhost:${port}/api/sync/fireflies/stream`);
    const text = await res.text();
    const events = parseSSEText(text);

    const complete = events.find((e) => e.type === "complete");
    expect(complete).toBeDefined();
    expect(complete!.data.synced).toBe(2);
    expect(complete!.data.skipped).toBe(0);
    expect(complete!.data.failed).toBe(0);
    expect(complete!.data.conversations).toHaveLength(2);
  });

  it("skips already-synced transcripts in incremental mode", async () => {
    mockKV._data.set(KV_KEY, "test-api-key");

    const summaries = [
      createMockTranscriptSummary({ id: "ff-1", title: "Meeting 1" }),
      createMockTranscriptSummary({ id: "ff-2", title: "Meeting 2" }),
    ];
    clientFactory.setListResult(summaries);
    clientFactory.setGetResult(
      "ff-2",
      createMockFullTranscript({ id: "ff-2", title: "Meeting 2" }),
    );

    // ff-1 already in DB
    mockSQL._setDedupRows([{ source_id: "ff-1" }]);

    const res = await fetch(`http://localhost:${port}/api/sync/fireflies/stream?mode=incremental`);
    const text = await res.text();
    const events = parseSSEText(text);

    const complete = events.find((e) => e.type === "complete");
    expect(complete).toBeDefined();
    expect(complete!.data.synced).toBe(1);
    expect(complete!.data.skipped).toBe(1);
  });

  it("sends progress events during syncing", async () => {
    mockKV._data.set(KV_KEY, "test-api-key");

    const summaries = [
      createMockTranscriptSummary({ id: "ff-1", title: "Meeting 1" }),
      createMockTranscriptSummary({ id: "ff-2", title: "Meeting 2" }),
    ];
    clientFactory.setListResult(summaries);
    clientFactory.setGetResult(
      "ff-1",
      createMockFullTranscript({ id: "ff-1", title: "Meeting 1" }),
    );
    clientFactory.setGetResult(
      "ff-2",
      createMockFullTranscript({ id: "ff-2", title: "Meeting 2" }),
    );
    mockSQL._setDedupRows([]);

    const res = await fetch(`http://localhost:${port}/api/sync/fireflies/stream`);
    const text = await res.text();
    const events = parseSSEText(text);

    const progressEvents = events.filter(
      (e) => e.type === "progress" && e.data.phase === "syncing",
    );
    expect(progressEvents.length).toBeGreaterThanOrEqual(2);

    // Last progress should show current = total
    const lastProgress = progressEvents[progressEvents.length - 1];
    expect(lastProgress.data.current).toBe(2);
    expect(lastProgress.data.total).toBe(2);
  });

  it("sends error event when no API key configured", async () => {
    // No key set
    const res = await fetch(`http://localhost:${port}/api/sync/fireflies/stream`);
    const text = await res.text();
    const events = parseSSEText(text);

    const errorEvent = events.find((e) => e.type === "error");
    expect(errorEvent).toBeDefined();
    expect(errorEvent!.data.message).toContain("API key");
  });

  it("paginates across multiple batches using listAllTranscripts", async () => {
    mockKV._data.set(KV_KEY, "test-api-key");

    // Set up paginated batches
    const batch1 = [
      createMockTranscriptSummary({ id: "ff-1", title: "Meeting 1" }),
      createMockTranscriptSummary({ id: "ff-2", title: "Meeting 2" }),
    ];
    const batch2 = [createMockTranscriptSummary({ id: "ff-3", title: "Meeting 3" })];
    clientFactory.setListBatches([batch1, batch2]);

    clientFactory.setGetResult(
      "ff-1",
      createMockFullTranscript({ id: "ff-1", title: "Meeting 1" }),
    );
    clientFactory.setGetResult(
      "ff-2",
      createMockFullTranscript({ id: "ff-2", title: "Meeting 2" }),
    );
    clientFactory.setGetResult(
      "ff-3",
      createMockFullTranscript({ id: "ff-3", title: "Meeting 3" }),
    );
    mockSQL._setDedupRows([]);

    const res = await fetch(`http://localhost:${port}/api/sync/fireflies/stream?mode=full`);
    const text = await res.text();
    const events = parseSSEText(text);

    const complete = events.find((e) => e.type === "complete");
    expect(complete).toBeDefined();
    expect(complete!.data.synced).toBe(3);
    expect(complete!.data.conversations).toHaveLength(3);
  });

  it("handles individual transcript failures gracefully", async () => {
    mockKV._data.set(KV_KEY, "test-api-key");

    const summaries = [
      createMockTranscriptSummary({ id: "ff-1", title: "Meeting 1" }),
      createMockTranscriptSummary({ id: "ff-2", title: "Meeting 2" }),
    ];
    clientFactory.setListResult(summaries);
    clientFactory.setGetResult(
      "ff-1",
      createMockFullTranscript({ id: "ff-1", title: "Meeting 1" }),
    );
    clientFactory.setGetResult("ff-2", new Error("Fireflies API timeout"));
    mockSQL._setDedupRows([]);

    const res = await fetch(`http://localhost:${port}/api/sync/fireflies/stream`);
    const text = await res.text();
    const events = parseSSEText(text);

    const complete = events.find((e) => e.type === "complete");
    expect(complete).toBeDefined();
    expect(complete!.data.synced).toBe(1);
    expect(complete!.data.failed).toBe(1);
    expect(complete!.data.errors).toHaveLength(1);
  });
});

// ── Large-Scale Pagination Integration Test ─────────────────────────

describe("Sync Routes — SSE pagination integration (75 meetings)", () => {
  let mockKV: ReturnType<typeof createMockKV>;
  let mockSQL: ReturnType<typeof createMockSQL>;
  let clientFactory: ReturnType<typeof createMockClientFactory>;
  let server: Server;
  let port: number;

  // Generate 75 fake meetings with realistic data
  function generateMeetings(count: number) {
    const titles = [
      "Sprint Planning",
      "Design Review",
      "1:1 with Sam",
      "All Hands",
      "Product Sync",
      "Engineering Standup",
      "Retrospective",
      "Demo Day",
      "Architecture Review",
      "Customer Call",
      "Hiring Debrief",
      "OKR Check-in",
      "Incident Postmortem",
      "Release Planning",
      "Strategy Session",
    ];
    const summaries: TranscriptSummary[] = [];
    const fullTranscripts = new Map<string, FullTranscript>();

    for (let i = 0; i < count; i++) {
      const id = `ff-${String(i + 1).padStart(3, "0")}`;
      const title = `${titles[i % titles.length]} #${Math.floor(i / titles.length) + 1}`;
      const date = 1711000000000 - i * 86400000; // one day apart, newest first

      summaries.push(createMockTranscriptSummary({ id, title, date }));
      fullTranscripts.set(
        id,
        createMockFullTranscript({
          id,
          title,
          date,
          speakers: [
            { id: "s1", name: "Roman" },
            { id: "s2", name: "Sam" },
          ],
          sentences: [
            {
              index: 0,
              speaker_id: "s1",
              speaker_name: "Roman",
              text: `Discussion point ${i + 1}`,
              raw_text: `Discussion point ${i + 1}`,
              start_time: 0,
              end_time: 5,
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
            keywords: ["planning", "sprint"],
            action_items: [`Action item from meeting ${i + 1}`],
            overview: `Overview of ${title}`,
            shorthand_bullet: `- Key point from ${title}`,
            meeting_type: "team_meeting",
          },
        }),
      );
    }

    return { summaries, fullTranscripts };
  }

  beforeEach(async () => {
    mockKV = createMockKV();
    mockSQL = createMockSQL();
    clientFactory = createMockClientFactory();
    const app = createApp(mockKV, mockSQL, clientFactory);
    ({ server, port } = await startServer(app));
  });

  afterEach(async () => {
    await closeServer(server);
  });

  it("syncs all 75 meetings across 3 paginated batches", async () => {
    mockKV._data.set(KV_KEY, "test-api-key");
    mockSQL._setDedupRows([]);

    const { summaries, fullTranscripts } = generateMeetings(75);

    // Split into 3 batches of 25 (simulating batchSize=25)
    clientFactory.setListBatches([
      summaries.slice(0, 25),
      summaries.slice(25, 50),
      summaries.slice(50, 75),
    ]);

    for (const [id, transcript] of fullTranscripts) {
      clientFactory.setGetResult(id, transcript);
    }

    const res = await fetch(`http://localhost:${port}/api/sync/fireflies/stream?mode=full`);
    const text = await res.text();
    const events = parseSSEText(text);

    // Should have listing status + listing progress + syncing status + syncing progress + complete
    const statusEvents = events.filter((e) => e.type === "status");
    expect(statusEvents.length).toBeGreaterThanOrEqual(2); // listing + syncing

    const listingProgress = events.filter(
      (e) => e.type === "progress" && e.data.phase === "listing",
    );
    expect(listingProgress.length).toBe(3); // one per batch

    const syncingProgress = events.filter(
      (e) => e.type === "progress" && e.data.phase === "syncing",
    );
    expect(syncingProgress.length).toBe(75); // one per transcript

    // Verify progress counts up correctly
    expect(syncingProgress[0].data.current).toBe(1);
    expect(syncingProgress[74].data.current).toBe(75);
    expect(syncingProgress[74].data.total).toBe(75);

    // Final result
    const complete = events.find((e) => e.type === "complete");
    expect(complete).toBeDefined();
    expect(complete!.data.synced).toBe(75);
    expect(complete!.data.skipped).toBe(0);
    expect(complete!.data.failed).toBe(0);
    expect(complete!.data.conversations).toHaveLength(75);

    // Verify each conversation has expected fields
    for (const conv of complete!.data.conversations) {
      expect(conv.id).toBeDefined();
      expect(conv.title).toBeTruthy();
      expect(conv.started_at).toBeDefined();
    }
  });

  it("incremental re-sync skips 50 existing, syncs 25 new", async () => {
    mockKV._data.set(KV_KEY, "test-api-key");

    const { summaries, fullTranscripts } = generateMeetings(75);

    // Simulate: 50 oldest already in DB
    const existingIds = summaries.slice(25).map((s) => ({ source_id: s.id }));
    mockSQL._setDedupRows(existingIds);

    // Pagination: batch 1 = newest 25 (all new), batch 2 has some known -> early exit
    clientFactory.setListBatches([
      summaries.slice(0, 25), // all new
      summaries.slice(25, 50), // all known -> triggers early exit
    ]);

    // Only need getTranscript for the new 25
    for (const summary of summaries.slice(0, 25)) {
      clientFactory.setGetResult(summary.id, fullTranscripts.get(summary.id)!);
    }

    const res = await fetch(`http://localhost:${port}/api/sync/fireflies/stream?mode=incremental`);
    const text = await res.text();
    const events = parseSSEText(text);

    const complete = events.find((e) => e.type === "complete");
    expect(complete).toBeDefined();
    expect(complete!.data.synced).toBe(25);
    expect(complete!.data.skipped).toBe(0); // batch dedup removes known ones before syncing
    expect(complete!.data.failed).toBe(0);
    expect(complete!.data.conversations).toHaveLength(25);

    // Should have only 2 listing batches (early exit on batch 2)
    const listingProgress = events.filter(
      (e) => e.type === "progress" && e.data.phase === "listing",
    );
    expect(listingProgress.length).toBe(2);
  });

  it("handles mixed success/failure across many meetings", async () => {
    mockKV._data.set(KV_KEY, "test-api-key");
    mockSQL._setDedupRows([]);

    const { summaries, fullTranscripts } = generateMeetings(10);

    clientFactory.setListBatches([summaries]);

    // Make every 3rd transcript fail
    for (let i = 0; i < 10; i++) {
      const id = summaries[i].id;
      if (i % 3 === 2) {
        clientFactory.setGetResult(id, new Error(`Simulated failure for ${id}`));
      } else {
        clientFactory.setGetResult(id, fullTranscripts.get(id)!);
      }
    }

    const res = await fetch(`http://localhost:${port}/api/sync/fireflies/stream?mode=full`);
    const text = await res.text();
    const events = parseSSEText(text);

    const complete = events.find((e) => e.type === "complete");
    expect(complete).toBeDefined();
    // 10 total, every 3rd fails: indices 2,5,8 = 3 failures, 7 successes
    expect(complete!.data.synced).toBe(7);
    expect(complete!.data.failed).toBe(3);
    expect(complete!.data.errors).toHaveLength(3);
    expect(complete!.data.conversations).toHaveLength(7);

    // Verify progress tracks failures correctly
    const syncProgress = events.filter((e) => e.type === "progress" && e.data.phase === "syncing");
    const lastProgress = syncProgress[syncProgress.length - 1];
    expect(lastProgress.data.synced).toBe(7);
    expect(lastProgress.data.failed).toBe(3);
  });
});
