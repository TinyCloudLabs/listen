import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import express from "express";
import type { Server } from "http";
import type { Request, Response, NextFunction } from "express";
import { createGranolaSyncRouter } from "../routes/granola-sync.js";
import type { GranolaNote, GranolaNoteSummary } from "../services/granola-client.js";

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
  let dedupRows: Array<{ id: string; source_id: string }> = [];

  return {
    _calls: calls,
    _setDedupRows(rows: Array<{ source_id: string }>) {
      dedupRows = rows.map((row) => ({
        id: "id" in row ? String((row as any).id) : `conv-${row.source_id}`,
        source_id: row.source_id,
      }));
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
      return { ok: true, data: { changes: sql.trim().startsWith("INSERT") ? 1 : 0 } };
    },
  };
}

function createMockNote(overrides: Partial<GranolaNote> = {}): GranolaNote {
  return {
    id: overrides.id ?? "not_1d3tmYTlCICgjy",
    object: "note",
    title: overrides.title ?? "Granola Meeting",
    owner: { name: "Sam", email: "sam@example.com" },
    created_at: "2026-01-27T15:30:00Z",
    updated_at: "2026-01-27T16:45:00Z",
    web_url: "https://notes.granola.ai/d/note",
    calendar_event: {
      event_title: "Granola Meeting",
      organiser: "sam@example.com",
      scheduled_start_time: "2026-01-27T15:30:00Z",
      scheduled_end_time: "2026-01-27T16:30:00Z",
    },
    attendees: [{ name: "Sam", email: "sam@example.com" }],
    folder_membership: [],
    summary_text: "Plain summary",
    summary_markdown: "## Summary\n\nPlain summary",
    transcript: [
      {
        speaker: { source: "microphone", diarization_label: "Speaker A" },
        text: "Hello from Granola",
      },
    ],
    ...overrides,
  };
}

function createMockClientFactory() {
  let notes: GranolaNoteSummary[] = [];
  const fullNotes = new Map<string, GranolaNote>();
  let lastApiKey: string | null = null;
  let getNoteDelayMs = 0;

  return {
    setNotes(next: GranolaNote[]) {
      notes = next.map(({ id, title, owner, created_at, updated_at }) => ({
        id,
        title,
        owner,
        created_at,
        updated_at,
      }));
      fullNotes.clear();
      for (const note of next) fullNotes.set(note.id, note);
    },
    setGetNoteDelay(ms: number) {
      getNoteDelayMs = ms;
    },
    getLastApiKey() {
      return lastApiKey;
    },
    factory(apiKey: string) {
      lastApiKey = apiKey;
      return {
        listAllNotes: async (options?: {
          onProgress?: (info: { page: number; totalSoFar: number }) => void;
        }) => {
          options?.onProgress?.({ page: 1, totalSoFar: notes.length });
          return { notes, pageCount: 1, earlyExit: false };
        },
        getNote: async (id: string) => {
          if (getNoteDelayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, getNoteDelayMs));
          }
          const note = fullNotes.get(id);
          if (!note) throw new Error(`missing note ${id}`);
          return note;
        },
      };
    },
  };
}

const TEST_ADDRESS = "0xTEST";
const KV_KEY = "config/granola-key";

function mockAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.user = { address: TEST_ADDRESS };
  next();
}

function createApp(
  mockKV: ReturnType<typeof createMockKV>,
  mockSQL: ReturnType<typeof createMockSQL>,
  clientFactory: ReturnType<typeof createMockClientFactory>,
) {
  const mockDelegationMiddleware = (req: Request, _res: Response, next: NextFunction) => {
    req.delegatedAccess = {
      kv: mockKV,
      sql: mockSQL,
      secrets: {
        get: async () => {
          const val = mockKV._data.get(KV_KEY);
          if (val === undefined) return { ok: false, error: { code: "KEY_NOT_FOUND" } };
          return { ok: true, data: val };
        },
      },
    } as any;
    next();
  };

  const app = express();
  app.use(express.json());
  app.use(
    "/api/sync/granola",
    createGranolaSyncRouter({
      authMiddleware: mockAuthMiddleware,
      delegationMiddleware: mockDelegationMiddleware,
      backendKV: mockKV,
      createClient: clientFactory.factory,
    }),
  );
  return app;
}

function startServer(app: express.Express): Promise<{ server: Server; port: number }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve({ server, port: (server.address() as any).port }));
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

function parseSSEText(text: string): Array<{ type: string; data: any }> {
  const events: Array<{ type: string; data: any }> = [];
  for (const block of text.split("\n\n")) {
    if (!block.trim()) continue;
    let type = "message";
    let data = "";
    for (const line of block.split("\n")) {
      if (line.startsWith("event: ")) type = line.slice(7);
      else if (line.startsWith("data: ")) data = line.slice(6);
    }
    if (data) events.push({ type, data: JSON.parse(data) });
  }
  return events;
}

async function waitForGranolaJob(baseUrl: string, jobId: string, predicate: (job: any) => boolean) {
  for (let i = 0; i < 50; i++) {
    const res = await fetch(`${baseUrl}/api/sync/granola/jobs/${jobId}`);
    expect(res.status).toBe(200);
    const job = await res.json();
    if (predicate(job)) return job;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for Granola sync job");
}

describe("Granola sync routes", () => {
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

  it("emits an error when no Granola API key is configured", async () => {
    const res = await fetch(`http://localhost:${port}/api/sync/granola/stream`);
    expect(res.status).toBe(200);

    const events = parseSSEText(await res.text());
    expect(events).toContainEqual({
      type: "error",
      data: { message: "No Granola API key configured." },
    });
  });

  it("imports Granola summary and transcript into conversation persistence", async () => {
    mockKV._data.set(KV_KEY, "granola-api-key");
    mockSQL._setDedupRows([]);
    clientFactory.setNotes([createMockNote()]);

    const res = await fetch(`http://localhost:${port}/api/sync/granola/stream`);
    expect(res.status).toBe(200);

    const events = parseSSEText(await res.text());
    const complete = events.find((event) => event.type === "complete")?.data;
    expect(complete).toMatchObject({ synced: 1, skipped: 0, failed: 0 });
    expect(clientFactory.getLastApiKey()).toBe("granola-api-key");

    const conversationInsert = mockSQL._calls.find(
      (call) => call.method === "execute" && call.sql.includes("INSERT INTO conversation"),
    );
    expect(conversationInsert?.params?.[2]).toBe("granola");
    expect(conversationInsert?.params?.[3]).toBe("not_1d3tmYTlCICgjy");
    expect(conversationInsert?.params?.[8]).toBe("## Summary\n\nPlain summary");

    const conversationId = complete.conversations[0].id;
    const storedTranscript = mockKV._data.get(`xyz.tinycloud.listen/transcript/${conversationId}`);
    expect(JSON.parse(storedTranscript!)[0]).toMatchObject({
      speaker_name: "Speaker A",
      text: "Hello from Granola",
    });
  });

  it("full mode refreshes known Granola notes without inserting duplicates", async () => {
    mockKV._data.set(KV_KEY, "granola-api-key");
    mockSQL._setDedupRows([{ id: "existing-granola-conv", source_id: "not_1d3tmYTlCICgjy" }]);
    clientFactory.setNotes([
      createMockNote({
        title: "Updated Granola Meeting",
        summary_markdown: "## Updated summary",
      }),
    ]);

    const res = await fetch(`http://localhost:${port}/api/sync/granola/stream?mode=full`);
    expect(res.status).toBe(200);

    const events = parseSSEText(await res.text());
    const complete = events.find((event) => event.type === "complete")?.data;
    expect(complete).toMatchObject({ synced: 1, skipped: 0, failed: 0 });
    expect(complete.conversations[0].id).toBe("existing-granola-conv");

    const conversationInserts = mockSQL._calls.filter(
      (call) => call.method === "execute" && call.sql.includes("INSERT INTO conversation"),
    );
    const conversationUpdates = mockSQL._calls.filter(
      (call) =>
        call.method === "execute" && call.sql.trim().startsWith("UPDATE conversation SET title"),
    );
    expect(conversationInserts).toHaveLength(0);
    expect(conversationUpdates).toHaveLength(1);
    expect(conversationUpdates[0].params?.at(-1)).toBe("existing-granola-conv");
  });

  it("returns the active job instead of starting a duplicate", async () => {
    mockKV._data.set(KV_KEY, "granola-api-key");
    mockSQL._setDedupRows([]);
    clientFactory.setNotes([
      createMockNote({ id: "note-1", title: "First note" }),
      createMockNote({ id: "note-2", title: "Second note" }),
    ]);
    clientFactory.setGetNoteDelay(50);

    const first = await fetch(`http://localhost:${port}/api/sync/granola/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "incremental" }),
    });
    const firstJob = await first.json();

    const second = await fetch(`http://localhost:${port}/api/sync/granola/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "incremental" }),
    });
    const secondJob = await second.json();

    expect(first.status).toBe(202);
    expect(second.status).toBe(202);
    expect(secondJob.id).toBe(firstJob.id);

    const current = await fetch(`http://localhost:${port}/api/sync/granola/jobs/current`);
    const currentJob = await current.json();
    expect(currentJob.id).toBe(firstJob.id);
  });

  it("tracks Granola job progress through completion", async () => {
    mockKV._data.set(KV_KEY, "granola-api-key");
    mockSQL._setDedupRows([{ source_id: "note-existing" }]);
    clientFactory.setNotes([
      createMockNote({ id: "note-existing", title: "Existing note" }),
      createMockNote({ id: "note-new", title: "New note" }),
    ]);

    const start = await fetch(`http://localhost:${port}/api/sync/granola/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "incremental" }),
    });
    expect(start.status).toBe(202);
    const started = await start.json();

    const completed = await waitForGranolaJob(
      `http://localhost:${port}`,
      started.id,
      (job) => job.status === "completed",
    );

    expect(completed.totalListed).toBe(2);
    expect(completed.total).toBe(1);
    expect(completed.current).toBe(1);
    expect(completed.synced).toBe(1);
    expect(completed.skipped).toBe(1);
    expect(completed.failed).toBe(0);
  });
});
