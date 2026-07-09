import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import express from "express";
import type { Server } from "http";
import type { Request, Response, NextFunction } from "express";
import type { ConferenceRecord, FullConference } from "../services/google-meet-client.js";

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

  return {
    _calls: calls,
    _setDedupSourceIds(ids: string[]) {
      dedupRows = ids.map((id) => ({ id: `conv-${id.split("/").pop()}`, source_id: id }));
    },
    _setDedupRows(rows: Array<{ id: string; source_id: string }>) {
      dedupRows = rows;
    },
    query: async (sql: string, params?: any[]) => {
      calls.push({ method: "query", sql, params });

      if (sql.includes("FROM conversation") && sql.includes("source_id")) {
        // Batch dedup: filter to only matching source_ids from the params
        if (sql.includes("IN (")) {
          const matching = dedupRows.filter((row) => params?.includes(row.source_id));
          return {
            ok: true,
            data: {
              rows: matching.map((row) =>
                sql.includes("SELECT id") ? [row.id, row.source_id] : [row.source_id],
              ),
              columns: sql.includes("SELECT id") ? ["id", "source_id"] : ["source_id"],
            },
          };
        }
        // "Get all" query (no params) — return all dedup rows
        if (!params || params.length === 0) {
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
        // Single dedup
        const matching = dedupRows.filter((row) => row.source_id === params?.[0]);
        return {
          ok: true,
          data: {
            rows: matching.map((row) =>
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

      if (sql.trim().startsWith("CREATE")) return { ok: true };
      if (sql.trim().startsWith("INSERT")) return { ok: true, data: { changes: 1 } };
      if (sql.trim().startsWith("DELETE")) return { ok: true, data: { changes: 5 } };

      return { ok: true, data: { changes: 0 } };
    },
  };
}

// ── Mock Conference Factory ──────────────────────────────────────────

function createMockConferenceRecord(overrides: Partial<ConferenceRecord> = {}): ConferenceRecord {
  return {
    name: overrides.name ?? "conferenceRecords/abc-123",
    startTime: overrides.startTime ?? "2024-03-20T14:00:00Z",
    endTime: overrides.endTime ?? "2024-03-20T15:00:00Z",
    expireTime: overrides.expireTime ?? "2024-04-19T15:00:00Z",
    space: overrides.space ?? "spaces/abc-123",
  };
}

function createMockFullConference(conferenceRecord: ConferenceRecord): FullConference {
  return {
    conferenceRecord,
    participants: [
      {
        name: `${conferenceRecord.name}/participants/p1`,
        earliestStartTime: conferenceRecord.startTime,
        signedinUser: { user: "users/1", displayName: "Alice" },
      },
    ],
    transcripts: [
      {
        name: `${conferenceRecord.name}/transcripts/t1`,
        state: "ENDED" as const,
        startTime: conferenceRecord.startTime,
        endTime: conferenceRecord.endTime,
      },
    ],
    entries: [
      {
        name: `${conferenceRecord.name}/transcripts/t1/entries/e1`,
        participant: `${conferenceRecord.name}/participants/p1`,
        text: "Hello from the meeting",
        languageCode: "en",
        startTime: conferenceRecord.startTime,
        endTime: conferenceRecord.endTime ?? conferenceRecord.startTime,
      },
    ],
  };
}

function createMockFullConferenceWithoutEntries(
  conferenceRecord: ConferenceRecord,
): FullConference {
  return {
    ...createMockFullConference(conferenceRecord),
    entries: [],
  };
}

// ── Mock Google Meet Client Factory ──────────────────────────────────

function createMockGoogleMeetClientFactory() {
  let conferences: ConferenceRecord[] = [];
  const fullConferenceOverrides = new Map<string, FullConference | Error>();
  let lastTokens: { accessToken: string; refreshToken?: string } | null = null;
  let fullConferenceDelayMs = 0;
  const listSinceDaysCalls: Array<number | undefined> = [];

  return {
    setConferences(records: ConferenceRecord[]) {
      conferences = records;
    },
    setFullConferenceDelay(ms: number) {
      fullConferenceDelayMs = ms;
    },
    setFullConference(name: string, result: FullConference | Error) {
      fullConferenceOverrides.set(name, result);
    },
    getLastTokens() {
      return lastTokens;
    },
    getListSinceDaysCalls() {
      return listSinceDaysCalls;
    },
    factory(accessToken: string, _onTokenRefresh?: any, refreshToken?: string) {
      lastTokens = { accessToken, refreshToken };
      return {
        listConferenceRecords: async (sinceDays?: number) => {
          listSinceDaysCalls.push(sinceDays);
          return conferences;
        },
        getFullConference: async (record: ConferenceRecord) => {
          if (fullConferenceDelayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, fullConferenceDelayMs));
          }
          const override = fullConferenceOverrides.get(record.name);
          if (override instanceof Error) throw override;
          if (override) return override;
          return createMockFullConference(record);
        },
      };
    },
  };
}

// ── Test Helpers ─────────────────────────────────────────────────────

const GOOGLE_TOKENS_PATH = "config/google-tokens";
const TEST_TOKENS = JSON.stringify({
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  expires_in: 3600,
  scope: "meetings.space.readonly",
  token_type: "Bearer",
});

function mockAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.user = { sub: "test-sub", address: "0xTest" };
  next();
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

async function waitForGoogleMeetJob(
  baseUrl: string,
  jobId: string,
  predicate: (job: any) => boolean,
) {
  for (let i = 0; i < 50; i++) {
    const res = await fetch(`${baseUrl}/api/sync/google-meet/jobs/${jobId}`);
    expect(res.status).toBe(200);
    const job = await res.json();
    if (predicate(job)) return job;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for Google Meet sync job");
}

// ── App Setup ────────────────────────────────────────────────────────

async function createTestApp(
  mockKV: ReturnType<typeof createMockKV>,
  mockSQL: ReturnType<typeof createMockSQL>,
  clientFactory: ReturnType<typeof createMockGoogleMeetClientFactory>,
) {
  const { createGoogleMeetSyncRouter } = await import("../routes/google-meet-sync.js");
  const { createGoogleMeetStatusRouter } = await import("../routes/google-meet-status.js");

  const mockDelegationMiddleware = (req: Request, _res: Response, next: NextFunction) => {
    req.delegatedAccess = { kv: mockKV, sql: mockSQL } as any;
    next();
  };

  const app = express();
  app.use(express.json());
  app.use(
    "/api/sync/google-meet",
    createGoogleMeetSyncRouter({
      authMiddleware: mockAuthMiddleware,
      delegationMiddleware: mockDelegationMiddleware,
      backendKV: mockKV,
      createClient: clientFactory.factory,
      syncDelayMs: 0,
    }),
  );
  app.use(
    "/api/google-meet",
    createGoogleMeetStatusRouter({
      authMiddleware: mockAuthMiddleware,
      delegationMiddleware: mockDelegationMiddleware,
      createClient: clientFactory.factory,
    }),
  );
  return app;
}

// ── Tests: POST /api/sync/google-meet ────────────────────────────────

describe("Google Meet Sync Routes — POST /api/sync/google-meet", () => {
  let mockKV: ReturnType<typeof createMockKV>;
  let mockSQL: ReturnType<typeof createMockSQL>;
  let clientFactory: ReturnType<typeof createMockGoogleMeetClientFactory>;
  let server: Server;
  let port: number;

  beforeEach(async () => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    mockKV = createMockKV();
    mockSQL = createMockSQL();
    clientFactory = createMockGoogleMeetClientFactory();
    const app = await createTestApp(mockKV, mockSQL, clientFactory);
    ({ server, port } = await startServer(app));
  });

  afterEach(async () => {
    await closeServer(server);
    delete process.env.GOOGLE_CLIENT_ID;
  });

  it("syncs conferences when tokens exist", async () => {
    mockKV._data.set(GOOGLE_TOKENS_PATH, TEST_TOKENS);
    mockSQL._setDedupSourceIds([]);

    const records = [
      createMockConferenceRecord({ name: "conferenceRecords/c1" }),
      createMockConferenceRecord({ name: "conferenceRecords/c2" }),
    ];
    clientFactory.setConferences(records);

    const res = await fetch(`http://localhost:${port}/api/sync/google-meet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.synced).toBe(2);
    expect(body.skipped).toBe(0);
    expect(body.failed).toBe(0);
    expect(body.conversations).toHaveLength(2);
  });

  it("skips already-synced conferences (pre-fetch dedup)", async () => {
    mockKV._data.set(GOOGLE_TOKENS_PATH, TEST_TOKENS);
    mockSQL._setDedupSourceIds(["conferenceRecords/c1"]);

    const records = [
      createMockConferenceRecord({ name: "conferenceRecords/c1" }),
      createMockConferenceRecord({ name: "conferenceRecords/c2" }),
    ];
    clientFactory.setConferences(records);

    const res = await fetch(`http://localhost:${port}/api/sync/google-meet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.synced).toBe(1);
    expect(body.skipped).toBe(1);
    expect(clientFactory.getListSinceDaysCalls()).toEqual([30]);
  });

  it("full mode uses a 365-day window and refreshes existing conferences", async () => {
    mockKV._data.set(GOOGLE_TOKENS_PATH, TEST_TOKENS);
    mockSQL._setDedupRows([{ id: "existing-google-meet-conv", source_id: "conferenceRecords/c1" }]);

    const records = [createMockConferenceRecord({ name: "conferenceRecords/c1" })];
    clientFactory.setConferences(records);

    const res = await fetch(`http://localhost:${port}/api/sync/google-meet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "full" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.synced).toBe(1);
    expect(body.skipped).toBe(0);
    expect(clientFactory.getListSinceDaysCalls()).toEqual([365]);

    const conversationInserts = mockSQL._calls.filter(
      (call) => call.method === "execute" && call.sql.includes("INSERT INTO conversation"),
    );
    const conversationUpdates = mockSQL._calls.filter(
      (call) =>
        call.method === "execute" && call.sql.trim().startsWith("UPDATE conversation SET title"),
    );
    expect(conversationInserts).toHaveLength(0);
    expect(conversationUpdates).toHaveLength(1);
    expect(conversationUpdates[0].params?.at(-1)).toBe("existing-google-meet-conv");
  });

  it("includes a warning when Google Meet conference listing hits the cap", async () => {
    mockKV._data.set(GOOGLE_TOKENS_PATH, TEST_TOKENS);
    mockSQL._setDedupSourceIds([]);

    const records = [
      createMockConferenceRecord({ name: "conferenceRecords/capped" }),
    ] as Array<ConferenceRecord> & { truncated?: boolean; cap?: number };
    records.truncated = true;
    records.cap = 500;
    clientFactory.setConferences(records);

    const res = await fetch(`http://localhost:${port}/api/sync/google-meet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "full" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.errors).toContain(
      "Google Meet conference listing reached the 500 conference cap; older conferences may not have been scanned.",
    );
  });

  it("returns 404 when no tokens configured", async () => {
    // No tokens in KV
    const res = await fetch(`http://localhost:${port}/api/sync/google-meet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("no_tokens");
  });

  it("returns 501 when GOOGLE_CLIENT_ID not set", async () => {
    delete process.env.GOOGLE_CLIENT_ID;

    const res = await fetch(`http://localhost:${port}/api/sync/google-meet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(501);
    const body = await res.json();
    expect(body.error).toBe("not_configured");
  });

  it("handles partial failures gracefully", async () => {
    mockKV._data.set(GOOGLE_TOKENS_PATH, TEST_TOKENS);
    mockSQL._setDedupSourceIds([]);

    const records = [
      createMockConferenceRecord({ name: "conferenceRecords/c1" }),
      createMockConferenceRecord({ name: "conferenceRecords/c2" }),
      createMockConferenceRecord({ name: "conferenceRecords/c3" }),
    ];
    clientFactory.setConferences(records);
    clientFactory.setFullConference("conferenceRecords/c2", new Error("API error"));

    const res = await fetch(`http://localhost:${port}/api/sync/google-meet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.synced).toBe(2);
    expect(body.failed).toBe(1);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0]).toContain("conferenceRecords/c2");
  });

  it("handles empty conference list", async () => {
    mockKV._data.set(GOOGLE_TOKENS_PATH, TEST_TOKENS);
    clientFactory.setConferences([]);

    const res = await fetch(`http://localhost:${port}/api/sync/google-meet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.synced).toBe(0);
    expect(body.skipped).toBe(0);
  });
});

// ── Tests: GET /api/sync/google-meet/stream ──────────────────────────

describe("Google Meet Sync Routes — GET /api/sync/google-meet/stream", () => {
  let mockKV: ReturnType<typeof createMockKV>;
  let mockSQL: ReturnType<typeof createMockSQL>;
  let clientFactory: ReturnType<typeof createMockGoogleMeetClientFactory>;
  let server: Server;
  let port: number;

  beforeEach(async () => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    mockKV = createMockKV();
    mockSQL = createMockSQL();
    clientFactory = createMockGoogleMeetClientFactory();
    const app = await createTestApp(mockKV, mockSQL, clientFactory);
    ({ server, port } = await startServer(app));
  });

  afterEach(async () => {
    await closeServer(server);
    delete process.env.GOOGLE_CLIENT_ID;
  });

  it("returns text/event-stream content type", async () => {
    mockKV._data.set(GOOGLE_TOKENS_PATH, TEST_TOKENS);
    clientFactory.setConferences([]);

    const res = await fetch(`http://localhost:${port}/api/sync/google-meet/stream`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    expect(res.headers.get("cache-control")).toBe("no-cache, no-transform");
    expect(res.headers.get("x-accel-buffering")).toBe("no");
    expect(await res.text()).toContain(": open");
  });

  it("syncs conferences and sends progress + complete events", async () => {
    mockKV._data.set(GOOGLE_TOKENS_PATH, TEST_TOKENS);
    mockSQL._setDedupSourceIds([]);

    const records = [
      createMockConferenceRecord({ name: "conferenceRecords/c1" }),
      createMockConferenceRecord({ name: "conferenceRecords/c2" }),
    ];
    clientFactory.setConferences(records);

    const res = await fetch(`http://localhost:${port}/api/sync/google-meet/stream`);
    const text = await res.text();
    const events = parseSSEText(text);

    // Should have progress events
    const progressEvents = events.filter(
      (e) => e.type === "progress" && e.data.phase === "syncing",
    );
    expect(progressEvents.length).toBeGreaterThanOrEqual(2);

    // Should have complete event
    const complete = events.find((e) => e.type === "complete");
    expect(complete).toBeDefined();
    expect(complete!.data.synced).toBe(2);
    expect(complete!.data.failed).toBe(0);
    expect(complete!.data.conversations).toHaveLength(2);
  });

  it("sends error event when no tokens configured", async () => {
    const res = await fetch(`http://localhost:${port}/api/sync/google-meet/stream`);
    const text = await res.text();
    const events = parseSSEText(text);

    const errorEvent = events.find((e) => e.type === "error");
    expect(errorEvent).toBeDefined();
    expect(errorEvent!.data.message).toContain("token");
  });

  it("skips already-synced conferences", async () => {
    mockKV._data.set(GOOGLE_TOKENS_PATH, TEST_TOKENS);
    mockSQL._setDedupSourceIds(["conferenceRecords/c1"]);

    const records = [
      createMockConferenceRecord({ name: "conferenceRecords/c1" }),
      createMockConferenceRecord({ name: "conferenceRecords/c2" }),
    ];
    clientFactory.setConferences(records);

    const res = await fetch(`http://localhost:${port}/api/sync/google-meet/stream`);
    const text = await res.text();
    const events = parseSSEText(text);

    const complete = events.find((e) => e.type === "complete");
    expect(complete).toBeDefined();
    expect(complete!.data.synced).toBe(1);
    expect(complete!.data.skipped).toBe(1);
  });
});

// ── Tests: Google Meet background jobs ───────────────────────────────

describe("Google Meet Sync Routes — /api/sync/google-meet/jobs", () => {
  let mockKV: ReturnType<typeof createMockKV>;
  let mockSQL: ReturnType<typeof createMockSQL>;
  let clientFactory: ReturnType<typeof createMockGoogleMeetClientFactory>;
  let server: Server;
  let port: number;

  beforeEach(async () => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    mockKV = createMockKV();
    mockSQL = createMockSQL();
    clientFactory = createMockGoogleMeetClientFactory();
    const app = await createTestApp(mockKV, mockSQL, clientFactory);
    ({ server, port } = await startServer(app));
  });

  afterEach(async () => {
    await closeServer(server);
    delete process.env.GOOGLE_CLIENT_ID;
  });

  it("returns the active job instead of starting a duplicate", async () => {
    mockKV._data.set(GOOGLE_TOKENS_PATH, TEST_TOKENS);
    mockSQL._setDedupSourceIds([]);

    clientFactory.setConferences([
      createMockConferenceRecord({ name: "conferenceRecords/c1" }),
      createMockConferenceRecord({ name: "conferenceRecords/c2" }),
    ]);
    clientFactory.setFullConferenceDelay(50);

    const first = await fetch(`http://localhost:${port}/api/sync/google-meet/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "incremental" }),
    });
    const firstJob = await first.json();

    const second = await fetch(`http://localhost:${port}/api/sync/google-meet/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "incremental" }),
    });
    const secondJob = await second.json();

    expect(first.status).toBe(202);
    expect(second.status).toBe(202);
    expect(secondJob.id).toBe(firstJob.id);

    const current = await fetch(`http://localhost:${port}/api/sync/google-meet/jobs/current`);
    const currentJob = await current.json();
    expect(currentJob.id).toBe(firstJob.id);
  });

  it("tracks checked conferences and skipped reasons", async () => {
    mockKV._data.set(GOOGLE_TOKENS_PATH, TEST_TOKENS);
    mockSQL._setDedupSourceIds(["conferenceRecords/existing"]);

    const existing = createMockConferenceRecord({ name: "conferenceRecords/existing" });
    const noTranscript = createMockConferenceRecord({ name: "conferenceRecords/no-transcript" });
    const created = createMockConferenceRecord({ name: "conferenceRecords/created" });
    clientFactory.setConferences([existing, noTranscript, created]);
    clientFactory.setFullConference(
      noTranscript.name,
      createMockFullConferenceWithoutEntries(noTranscript),
    );

    const start = await fetch(`http://localhost:${port}/api/sync/google-meet/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "incremental" }),
    });
    expect(start.status).toBe(202);
    const started = await start.json();

    const completed = await waitForGoogleMeetJob(
      `http://localhost:${port}`,
      started.id,
      (job) => job.status === "completed",
    );

    expect(completed.checked).toBe(3);
    expect(completed.total).toBe(3);
    expect(completed.synced).toBe(1);
    expect(completed.skipped).toBe(2);
    expect(completed.skippedExisting).toBe(1);
    expect(completed.skippedNoTranscript).toBe(1);
    expect(completed.failed).toBe(0);
  });
});

// ── Tests: DELETE /api/sync/google-meet/conversations ────────────────

describe("Google Meet Sync Routes — DELETE /api/sync/google-meet/conversations", () => {
  let mockKV: ReturnType<typeof createMockKV>;
  let mockSQL: ReturnType<typeof createMockSQL>;
  let clientFactory: ReturnType<typeof createMockGoogleMeetClientFactory>;
  let server: Server;
  let port: number;

  beforeEach(async () => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    mockKV = createMockKV();
    mockSQL = createMockSQL();
    clientFactory = createMockGoogleMeetClientFactory();
    const app = await createTestApp(mockKV, mockSQL, clientFactory);
    ({ server, port } = await startServer(app));
  });

  afterEach(async () => {
    await closeServer(server);
    delete process.env.GOOGLE_CLIENT_ID;
  });

  it("deletes google-meet conversations and participants", async () => {
    const res = await fetch(`http://localhost:${port}/api/sync/google-meet/conversations`, {
      method: "DELETE",
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    // Verify DELETE SQL calls targeted google-meet source
    const deleteCalls = mockSQL._calls.filter(
      (c) => c.method === "execute" && c.sql.includes("DELETE"),
    );
    expect(deleteCalls.length).toBeGreaterThanOrEqual(1);
    expect(deleteCalls.some((c) => c.sql.includes("google-meet"))).toBe(true);
  });
});

// ── Tests: GET /api/google-meet/status ───────────────────────────────

describe("Google Meet Status — GET /api/google-meet/status", () => {
  let mockKV: ReturnType<typeof createMockKV>;
  let mockSQL: ReturnType<typeof createMockSQL>;
  let clientFactory: ReturnType<typeof createMockGoogleMeetClientFactory>;
  let server: Server;
  let port: number;

  beforeEach(async () => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    mockKV = createMockKV();
    mockSQL = createMockSQL();
    clientFactory = createMockGoogleMeetClientFactory();
    const app = await createTestApp(mockKV, mockSQL, clientFactory);
    ({ server, port } = await startServer(app));
  });

  afterEach(async () => {
    await closeServer(server);
    delete process.env.GOOGLE_CLIENT_ID;
  });

  it("returns connected=true when tokens exist and API responds", async () => {
    mockKV._data.set(GOOGLE_TOKENS_PATH, TEST_TOKENS);

    const res = await fetch(`http://localhost:${port}/api/google-meet/status`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.connected).toBe(true);
  });

  it("returns connected=false when no tokens", async () => {
    const res = await fetch(`http://localhost:${port}/api/google-meet/status`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.connected).toBe(false);
  });

  it("returns 501 when GOOGLE_CLIENT_ID not set", async () => {
    delete process.env.GOOGLE_CLIENT_ID;

    const res = await fetch(`http://localhost:${port}/api/google-meet/status`);
    expect(res.status).toBe(501);
  });
});
