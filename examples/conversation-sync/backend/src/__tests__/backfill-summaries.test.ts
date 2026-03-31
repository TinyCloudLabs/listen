import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import express from "express";
import type { Server } from "http";
import type { Request, Response, NextFunction } from "express";
import { createSyncRouter } from "../routes/sync.js";
import type { FullTranscript } from "../services/fireflies-client.js";

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

// ── Mock SQL with backfill support ──────────────────────────────────

function createMockSQL() {
  const calls: Array<{ method: string; sql: string; params?: any[] }> = [];
  /** Rows returned for the "missing summaries" SELECT */
  let missingRows: Array<{ id: string; source_id: string }> = [];
  /** Metadata stored per conversation id */
<<<<<<< HEAD
<<<<<<< HEAD
  const metadataByConvId = new Map<string, string>();
=======
  let metadataByConvId = new Map<string, string>();
>>>>>>> 3b4de56 (chore: include remaining conversation-sync backend and shared changes)
=======
  const metadataByConvId = new Map<string, string>();
>>>>>>> 554d6dd (fix: resolve all ESLint errors for CI)

  return {
    _calls: calls,
    _setMissingRows(rows: Array<{ id: string; source_id: string }>) {
      missingRows = rows;
    },
    _setMetadata(convId: string, metadata: string) {
      metadataByConvId.set(convId, metadata);
    },
    query: async (sql: string, params?: any[]) => {
      calls.push({ method: "query", sql, params });

      // Missing-summaries SELECT
      if (sql.includes("summary IS NULL")) {
        return {
          ok: true,
          data: {
            rows: missingRows.map((r) => [r.id, r.source_id]),
            columns: ["id", "source_id"],
          },
        };
      }

      // Metadata SELECT for a specific conversation
      if (sql.includes("SELECT metadata FROM conversation")) {
        const convId = params?.[0];
        const meta = convId ? metadataByConvId.get(String(convId)) : null;
        return {
          ok: true,
          data: {
            rows: meta ? [[meta]] : [],
            columns: ["metadata"],
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

      if (sql.trim().startsWith("CREATE")) {
        return { ok: true };
      }

      if (sql.trim().startsWith("UPDATE") || sql.trim().startsWith("INSERT")) {
        return { ok: true, data: { changes: 1 } };
      }

      return { ok: true, data: { changes: 0 } };
    },
  };
}

// ── Mock Fireflies Client Factory ────────────────────────────────────

function createMockFullTranscript(overrides: Partial<FullTranscript> = {}): FullTranscript {
  return {
    id: overrides.id ?? "ff-1",
    title: overrides.title ?? "Test Meeting",
    date: overrides.date ?? 1711000000000,
    duration: overrides.duration ?? 3600,
    organizer_email: overrides.organizer_email ?? "test@example.com",
    transcript_url: overrides.transcript_url ?? "https://app.fireflies.ai/view/ff-1",
    speakers: overrides.speakers ?? [{ id: "s1", name: "Alice" }],
<<<<<<< HEAD
<<<<<<< HEAD
    meeting_attendees: overrides.meeting_attendees ?? [
      { displayName: "Alice", email: "alice@example.com" },
    ],
=======
    meeting_attendees: overrides.meeting_attendees ?? [{ displayName: "Alice", email: "alice@example.com" }],
>>>>>>> 3b4de56 (chore: include remaining conversation-sync backend and shared changes)
=======
    meeting_attendees: overrides.meeting_attendees ?? [
      { displayName: "Alice", email: "alice@example.com" },
    ],
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
    sentences: overrides.sentences ?? [],
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
<<<<<<< HEAD
<<<<<<< HEAD
  const getResults = new Map<string, FullTranscript | Error>();
=======
  let getResults = new Map<string, FullTranscript | Error>();
>>>>>>> 3b4de56 (chore: include remaining conversation-sync backend and shared changes)
=======
  const getResults = new Map<string, FullTranscript | Error>();
>>>>>>> 554d6dd (fix: resolve all ESLint errors for CI)

  return {
    setGetResult(id: string, result: FullTranscript | Error) {
      getResults.set(id, result);
    },
<<<<<<< HEAD
<<<<<<< HEAD
    factory(_apiKey: string) {
=======
    factory(apiKey: string) {
>>>>>>> 3b4de56 (chore: include remaining conversation-sync backend and shared changes)
=======
    factory(_apiKey: string) {
>>>>>>> 554d6dd (fix: resolve all ESLint errors for CI)
      return {
        listTranscripts: async () => [],
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

// ── Tests ────────────────────────────────────────────────────────────

describe("Backfill Summaries — POST /api/sync/backfill-summaries", () => {
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

  // ── No conversations ─────────────────────────────────────────────

  it("returns { updated: 0, still_missing: 0 } when no conversations exist", async () => {
    mockKV._data.set(KV_KEY, "test-api-key");
    mockSQL._setMissingRows([]);

    const res = await fetch(`http://localhost:${port}/api/sync/backfill-summaries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.updated).toBe(0);
    expect(body.still_missing).toBe(0);
  });

  // ── Updates summary when now available ────────────────────────────

  it("updates summary for conversations that now have one available", async () => {
    mockKV._data.set(KV_KEY, "test-api-key");

    // Two conversations with missing summaries
    mockSQL._setMissingRows([
      { id: "conv-1", source_id: "ff-1" },
      { id: "conv-2", source_id: "ff-2" },
    ]);
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
    mockSQL._setMetadata(
      "conv-1",
      JSON.stringify({ audio_url: "https://audio.example.com/ff-1.mp3" }),
    );
    mockSQL._setMetadata(
      "conv-2",
      JSON.stringify({ audio_url: "https://audio.example.com/ff-2.mp3" }),
    );
<<<<<<< HEAD

    // Both now have summaries on Fireflies
    clientFactory.setGetResult(
      "ff-1",
      createMockFullTranscript({
        id: "ff-1",
        summary: {
          keywords: ["roadmap"],
          action_items: [],
          overview: "Discussed Q3 roadmap",
          shorthand_bullet: "- Roadmap",
          meeting_type: "planning",
        },
      }),
    );
    clientFactory.setGetResult(
      "ff-2",
      createMockFullTranscript({
        id: "ff-2",
        summary: {
          keywords: ["standup"],
          action_items: [],
          overview: "Daily standup sync",
          shorthand_bullet: "- Standup",
          meeting_type: "standup",
        },
      }),
    );
=======
    mockSQL._setMetadata("conv-1", JSON.stringify({ audio_url: "https://audio.example.com/ff-1.mp3" }));
    mockSQL._setMetadata("conv-2", JSON.stringify({ audio_url: "https://audio.example.com/ff-2.mp3" }));

    // Both now have summaries on Fireflies
    clientFactory.setGetResult("ff-1", createMockFullTranscript({
      id: "ff-1",
      summary: {
        keywords: ["roadmap"],
        action_items: [],
        overview: "Discussed Q3 roadmap",
        shorthand_bullet: "- Roadmap",
        meeting_type: "planning",
      },
    }));
    clientFactory.setGetResult("ff-2", createMockFullTranscript({
      id: "ff-2",
      summary: {
        keywords: ["standup"],
        action_items: [],
        overview: "Daily standup sync",
        shorthand_bullet: "- Standup",
        meeting_type: "standup",
      },
    }));
>>>>>>> 3b4de56 (chore: include remaining conversation-sync backend and shared changes)
=======

    // Both now have summaries on Fireflies
    clientFactory.setGetResult(
      "ff-1",
      createMockFullTranscript({
        id: "ff-1",
        summary: {
          keywords: ["roadmap"],
          action_items: [],
          overview: "Discussed Q3 roadmap",
          shorthand_bullet: "- Roadmap",
          meeting_type: "planning",
        },
      }),
    );
    clientFactory.setGetResult(
      "ff-2",
      createMockFullTranscript({
        id: "ff-2",
        summary: {
          keywords: ["standup"],
          action_items: [],
          overview: "Daily standup sync",
          shorthand_bullet: "- Standup",
          meeting_type: "standup",
        },
      }),
    );
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)

    const res = await fetch(`http://localhost:${port}/api/sync/backfill-summaries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.updated).toBe(2);
    expect(body.still_missing).toBe(0);

    // Verify UPDATE calls were made
<<<<<<< HEAD
<<<<<<< HEAD
    const updateCalls = mockSQL._calls.filter((c) =>
      c.sql.includes("UPDATE conversation SET summary"),
=======
    const updateCalls = mockSQL._calls.filter(
      (c) => c.sql.includes("UPDATE conversation SET summary"),
>>>>>>> 3b4de56 (chore: include remaining conversation-sync backend and shared changes)
=======
    const updateCalls = mockSQL._calls.filter((c) =>
      c.sql.includes("UPDATE conversation SET summary"),
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
    );
    expect(updateCalls).toHaveLength(2);

    // Check the first UPDATE has the correct summary and merged metadata
    const firstUpdate = updateCalls[0];
    expect(firstUpdate.params?.[0]).toBe("Discussed Q3 roadmap");
    const meta = JSON.parse(firstUpdate.params?.[1] as string);
    expect(meta.keywords).toEqual(["roadmap"]);
    expect(meta.meeting_type).toBe("planning");
    expect(meta.audio_url).toBe("https://audio.example.com/ff-1.mp3");
  });

  // ── Skips conversations that already have summaries ───────────────

  it("skips conversations that already have summaries (not in results)", async () => {
    mockKV._data.set(KV_KEY, "test-api-key");

    // Only conversations with NULL summary are returned by the query,
    // so ones with summaries never appear in missingRows
    mockSQL._setMissingRows([{ id: "conv-1", source_id: "ff-1" }]);
    mockSQL._setMetadata("conv-1", JSON.stringify({}));

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
    clientFactory.setGetResult(
      "ff-1",
      createMockFullTranscript({
        id: "ff-1",
        summary: {
          keywords: ["retro"],
          action_items: [],
          overview: "Sprint retrospective",
          shorthand_bullet: "- Retro",
          meeting_type: "retro",
        },
      }),
    );
<<<<<<< HEAD
=======
    clientFactory.setGetResult("ff-1", createMockFullTranscript({
      id: "ff-1",
      summary: {
        keywords: ["retro"],
        action_items: [],
        overview: "Sprint retrospective",
        shorthand_bullet: "- Retro",
        meeting_type: "retro",
      },
    }));
>>>>>>> 3b4de56 (chore: include remaining conversation-sync backend and shared changes)
=======
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)

    const res = await fetch(`http://localhost:${port}/api/sync/backfill-summaries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    // Only conv-1 was missing; it got updated. Conversations with summaries
    // are never queried — the SQL WHERE clause filters them out.
    expect(body.updated).toBe(1);
    expect(body.still_missing).toBe(0);
  });

  // ── Reports still_missing when Fireflies still has no summary ─────

  it("reports still_missing for conversations where Fireflies still has no summary", async () => {
    mockKV._data.set(KV_KEY, "test-api-key");

    mockSQL._setMissingRows([
      { id: "conv-1", source_id: "ff-1" },
      { id: "conv-2", source_id: "ff-2" },
    ]);

    // ff-1 now has a summary, ff-2 still does not
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
    clientFactory.setGetResult(
      "ff-1",
      createMockFullTranscript({
        id: "ff-1",
        summary: {
          keywords: ["demo"],
          action_items: [],
          overview: "Product demo meeting",
          shorthand_bullet: "- Demo",
          meeting_type: "demo",
        },
      }),
    );
    clientFactory.setGetResult(
      "ff-2",
      createMockFullTranscript({
        id: "ff-2",
        summary: {
          keywords: [],
          action_items: [],
          overview: "", // empty overview = still no summary
          shorthand_bullet: "",
          meeting_type: "",
        },
      }),
    );
<<<<<<< HEAD
=======
    clientFactory.setGetResult("ff-1", createMockFullTranscript({
      id: "ff-1",
      summary: {
        keywords: ["demo"],
        action_items: [],
        overview: "Product demo meeting",
        shorthand_bullet: "- Demo",
        meeting_type: "demo",
      },
    }));
    clientFactory.setGetResult("ff-2", createMockFullTranscript({
      id: "ff-2",
      summary: {
        keywords: [],
        action_items: [],
        overview: "", // empty overview = still no summary
        shorthand_bullet: "",
        meeting_type: "",
      },
    }));
>>>>>>> 3b4de56 (chore: include remaining conversation-sync backend and shared changes)
=======
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)

    mockSQL._setMetadata("conv-1", JSON.stringify({}));

    const res = await fetch(`http://localhost:${port}/api/sync/backfill-summaries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.updated).toBe(1);
    expect(body.still_missing).toBe(1);
  });

  // ── Counts API errors as still_missing ────────────────────────────

  it("counts Fireflies API errors as still_missing", async () => {
    mockKV._data.set(KV_KEY, "test-api-key");

    mockSQL._setMissingRows([{ id: "conv-1", source_id: "ff-1" }]);

    clientFactory.setGetResult("ff-1", new Error("Fireflies API timeout"));

    const res = await fetch(`http://localhost:${port}/api/sync/backfill-summaries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.updated).toBe(0);
    expect(body.still_missing).toBe(1);
  });

  // ── Missing API key ──────────────────────────────────────────────

  it("returns 404 when no Fireflies API key is configured", async () => {
    // No key set in KV

    const res = await fetch(`http://localhost:${port}/api/sync/backfill-summaries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("no_api_key");
  });
});
