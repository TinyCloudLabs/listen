import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import express from "express";
import type { Server } from "http";
import type { Request, Response, NextFunction } from "express";
import { createHmac } from "crypto";
import { createWebhookRouter } from "../routes/webhooks.js";
import { syncSingleTranscript } from "../services/sync-pipeline.js";
import type { FullTranscript } from "../services/fireflies-client.js";

// ── Constants ───────────────────────────────────────────────────────

const SECRET = "integration-test-webhook-secret";
const SECRET_KV_KEY = "xyz.tinycloud.listen/webhooks/config/fireflies-secret";
const PENDING_KV_KEY = "xyz.tinycloud.listen/webhooks/pending/fireflies";
const FIREFLIES_KEY_PATH = "config/fireflies-key";

// ── Test Helpers ────────────────────────────────────────────────────

/**
 * Generate a signed webhook payload with valid HMAC x-hub-signature.
 */
export function createSignedWebhookPayload(
  body: Record<string, unknown>,
  secret: string,
): { bodyString: string; signature: string } {
  const bodyString = JSON.stringify(body);
  const hmac = createHmac("sha256", secret).update(bodyString).digest("hex");
  return { bodyString, signature: `sha256=${hmac}` };
}

/**
 * Build a realistic Fireflies transcript fixture for a given meetingId.
 */
export function mockFirefliesTranscript(
  meetingId: string,
  overrides: Partial<FullTranscript> = {},
): FullTranscript {
  return {
    id: meetingId,
    title: overrides.title ?? `Meeting ${meetingId}`,
    date: overrides.date ?? 1711000000000,
    duration: overrides.duration ?? 30,
    organizer_email: overrides.organizer_email ?? "organizer@example.com",
    transcript_url: overrides.transcript_url ?? `https://app.fireflies.ai/view/${meetingId}`,
    speakers: overrides.speakers ?? [
      { id: "spk-1", name: "Alice" },
      { id: "spk-2", name: "Bob" },
    ],
    meeting_attendees: overrides.meeting_attendees ?? [
      { displayName: "Alice", email: "alice@example.com" },
      { displayName: "Bob", email: "bob@example.com" },
    ],
    sentences: overrides.sentences ?? [
      {
        index: 0,
        speaker_id: "spk-1",
        speaker_name: "Alice",
        text: "Let's discuss the roadmap",
        raw_text: "Let's discuss the roadmap",
        start_time: 0,
        end_time: 3,
        ai_filters: {
          task: false,
          pricing: false,
          metric: false,
          question: false,
          date_and_time: false,
          sentiment: "neutral",
        },
      },
      {
        index: 1,
        speaker_id: "spk-2",
        speaker_name: "Bob",
        text: "Sounds good, let me pull up the doc",
        raw_text: "Sounds good, let me pull up the doc",
        start_time: 3,
        end_time: 6,
        ai_filters: {
          task: false,
          pricing: false,
          metric: false,
          question: false,
          date_and_time: false,
          sentiment: "positive",
        },
      },
    ],
    summary: overrides.summary ?? {
      keywords: ["roadmap", "planning"],
      action_items: ["Review Q2 goals"],
      overview: "Team sync on roadmap priorities",
      shorthand_bullet: "- Roadmap review",
      meeting_type: "team_meeting",
    },
    audio_url: overrides.audio_url ?? `https://audio.example.com/${meetingId}.mp3`,
  };
}

// ── Mock Infrastructure ─────────────────────────────────────────────

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

function createMockSQL() {
  const calls: Array<{ method: string; sql: string; params?: any[] }> = [];
  const insertedRows: Array<{ table: string; values: any[] }> = [];

  return {
    _calls: calls,
    _insertedRows: insertedRows,
    query: async (sql: string, params?: any[]) => {
      calls.push({ method: "query", sql, params });

      // Dedup SELECT: return matching rows from previously inserted data
      if (sql.includes("SELECT source_id FROM conversation")) {
        const meetingId = params?.[0];
        const match = insertedRows.find(
          (r) => r.table === "conversation" && r.values[3] === meetingId,
        );
        return {
          ok: true,
          data: {
            rows: match ? [[match.values[3]]] : [],
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

      if (sql.trim().startsWith("CREATE")) {
        return { ok: true };
      }

      if (sql.includes("INSERT INTO conversation")) {
        insertedRows.push({ table: "conversation", values: params ?? [] });
        return { ok: true, data: { changes: 1 } };
      }

      if (sql.includes("INSERT INTO participant")) {
        insertedRows.push({ table: "participant", values: params ?? [] });
        return { ok: true, data: { changes: 1 } };
      }

      return { ok: true, data: { changes: 0 } };
    },
  };
}

function createMockAccess(apiKey?: string) {
  const kv = createMockKV();
  const sql = createMockSQL();
  if (apiKey) kv._data.set(FIREFLIES_KEY_PATH, apiKey);

  return {
    kv,
    sql,
    secrets: {
      get: async () => {
        const val = kv._data.get(FIREFLIES_KEY_PATH);
        if (val === undefined) return { ok: false, error: { code: "KEY_NOT_FOUND" } };
        return { ok: true, data: val };
      },
    },
  };
}

function mockAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.user = { sub: "test-sub" };
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

// ── Integration Tests ───────────────────────────────────────────────

describe("Webhook Integration Tests", () => {
  let server: Server;
  let port: number;
  let backendKV: ReturnType<typeof createMockKV>;
  let mockAccess: ReturnType<typeof createMockAccess>;
  let transcriptStore: Map<string, FullTranscript>;
  let delegationActive: boolean;

  function createApp() {
    const app = express();

    const delegationMiddleware = (req: Request, _res: Response, next: NextFunction) => {
      req.delegatedAccess = mockAccess as any;
      next();
    };

    app.use(
      "/api/webhooks",
      createWebhookRouter({
        backendKV,
        tryGetDelegatedAccess: async () => (delegationActive ? (mockAccess as any) : null),
        authMiddleware: mockAuthMiddleware,
        delegationMiddleware,
        syncFn: syncSingleTranscript,
        createClient: () => ({
          getTranscript: async (id: string) => {
            const t = transcriptStore.get(id);
            if (!t) throw new Error(`Transcript ${id} not found`);
            return t;
          },
        }),
      }),
    );

    return app;
  }

  function postWebhook(body: Record<string, unknown>) {
    const { bodyString, signature } = createSignedWebhookPayload(body, SECRET);
    return fetch(`http://localhost:${port}/api/webhooks/fireflies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hub-signature": signature,
      },
      body: bodyString,
    });
  }

  function getPending() {
    return fetch(`http://localhost:${port}/api/webhooks/fireflies/pending`);
  }

  beforeEach(async () => {
    backendKV = createMockKV();
    backendKV._data.set(SECRET_KV_KEY, SECRET);

    mockAccess = createMockAccess("test-fireflies-api-key");
    transcriptStore = new Map();
    delegationActive = true;

    const app = createApp();
    ({ server, port } = await startServer(app));
  });

  afterEach(async () => {
    await closeServer(server);
  });

  // ── 1. Signed webhook → transcript stored ───────────────────────

  describe("signed webhook → transcript stored in TinyCloud", () => {
    it("processes a signed webhook and stores conversation in SQL + transcript in KV", async () => {
      const transcript = mockFirefliesTranscript("meeting-100");
      transcriptStore.set("meeting-100", transcript);

      const res = await postWebhook({
        meetingId: "meeting-100",
        eventType: "Transcription completed",
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe("processed");
      expect(json.meetingId).toBe("meeting-100");
      expect(json.conversationId).toBeDefined();
      expect(json.title).toBe("Meeting meeting-100");

      // Verify conversation was inserted into SQL
      const conversationInserts = mockAccess.sql._insertedRows.filter(
        (r) => r.table === "conversation",
      );
      expect(conversationInserts).toHaveLength(1);
      expect(conversationInserts[0].values[3]).toBe("meeting-100"); // source_id

      // Verify participants were inserted in one multi-row statement.
      const participantInserts = mockAccess.sql._insertedRows.filter(
        (r) => r.table === "participant",
      );
      expect(participantInserts).toHaveLength(1);
      expect(participantInserts[0].values).toHaveLength(10); // Alice and Bob

      // Verify transcript blob was stored in KV
      const convId = json.conversationId;
      const kvKey = `xyz.tinycloud.listen/transcript/${convId}`;
      const storedBlob = mockAccess.kv._data.get(kvKey);
      expect(storedBlob).toBeDefined();
      const parsed = JSON.parse(storedBlob!);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].text).toBe("Let's discuss the roadmap");
    });
  });

  // ── 2. Missing delegation → pending queue ─────────────────────

  describe("missing delegation → meetingId queued as pending", () => {
    it("queues meetingId when no delegation is available", async () => {
      delegationActive = false;

      const res = await postWebhook({
        meetingId: "meeting-200",
        eventType: "Transcription completed",
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe("pending");
      expect(json.reason).toBe("no_delegation");

      // Verify meetingId was queued
      const pendingRaw = backendKV._data.get(PENDING_KV_KEY);
      expect(pendingRaw).toBeDefined();
      const pending = JSON.parse(pendingRaw!);
      expect(pending).toHaveLength(1);
      expect(pending[0].meetingId).toBe("meeting-200");

      // Verify no SQL inserts happened
      expect(mockAccess.sql._insertedRows).toHaveLength(0);
    });
  });

  // ── 3. Process pending → stored + queue cleared ───────────────

  describe("process pending → transcripts stored + queue cleared", () => {
    it("processes queued items via GET /pending and clears queue", async () => {
      // Pre-populate pending queue
      const pendingItems = [
        { meetingId: "pend-1", receivedAt: "2026-01-01T00:00:00Z" },
        { meetingId: "pend-2", receivedAt: "2026-01-01T00:01:00Z" },
      ];
      backendKV._data.set(PENDING_KV_KEY, JSON.stringify(pendingItems));

      // Set up transcripts for both
      transcriptStore.set("pend-1", mockFirefliesTranscript("pend-1"));
      transcriptStore.set("pend-2", mockFirefliesTranscript("pend-2"));

      const res = await getPending();
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.processed).toHaveLength(2);
      expect(json.processed[0].meetingId).toBe("pend-1");
      expect(json.processed[1].meetingId).toBe("pend-2");
      expect(json.skipped).toHaveLength(0);
      expect(json.errors).toHaveLength(0);

      // Verify queue is empty
      const remaining = JSON.parse(backendKV._data.get(PENDING_KV_KEY)!);
      expect(remaining).toHaveLength(0);

      // Verify conversations were stored in SQL
      const conversationInserts = mockAccess.sql._insertedRows.filter(
        (r) => r.table === "conversation",
      );
      expect(conversationInserts).toHaveLength(2);
    });
  });

  // ── 4. Duplicate webhooks → only one conversation ─────────────

  describe("duplicate webhooks → only one conversation created", () => {
    it("deduplicates when the same meetingId is sent twice via webhook", async () => {
      const transcript = mockFirefliesTranscript("dup-meeting");
      transcriptStore.set("dup-meeting", transcript);

      // First webhook
      const res1 = await postWebhook({
        meetingId: "dup-meeting",
        eventType: "Transcription completed",
      });
      expect(res1.status).toBe(200);
      const json1 = await res1.json();
      expect(json1.status).toBe("processed");

      // Second webhook (same meetingId)
      const res2 = await postWebhook({
        meetingId: "dup-meeting",
        eventType: "Transcription completed",
      });
      expect(res2.status).toBe(200);
      const json2 = await res2.json();
      expect(json2.status).toBe("processed");
      // Second call should be skipped by dedup
      expect(json2.conversationId).toBeUndefined();

      // Verify only one conversation was inserted
      const conversationInserts = mockAccess.sql._insertedRows.filter(
        (r) => r.table === "conversation",
      );
      expect(conversationInserts).toHaveLength(1);
    });
  });

  // ── 5. Manual sync then webhook → no duplicate ────────────────

  describe("manual sync then webhook → no duplicate", () => {
    it("skips webhook processing when meetingId was already imported via manual sync", async () => {
      const transcript = mockFirefliesTranscript("already-synced");
      transcriptStore.set("already-synced", transcript);

      // Simulate a manual sync having already imported this meeting.
      // Insert the conversation row directly into mock SQL.
      // The source_id is at index 3 in the INSERT params (matches sync-pipeline.ts).
      mockAccess.sql._insertedRows.push({
        table: "conversation",
        values: [
          "existing-conv-id", // id
          "Already Synced Meeting", // title
          "fireflies", // source
          "already-synced", // source_id
          "https://app.fireflies.ai/view/already-synced", // source_url
          "2026-01-01T00:00:00Z", // started_at
          "2026-01-01T00:30:00Z", // ended_at
          1800, // duration_secs
          "Overview text", // summary
          "{}", // metadata
          "2026-01-01T00:00:00Z", // created_at
          "2026-01-01T00:00:00Z", // updated_at
        ],
      });

      // Now webhook arrives for the same meeting
      const res = await postWebhook({
        meetingId: "already-synced",
        eventType: "Transcription completed",
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      // syncSingleTranscript returns "skipped" for dedup, but the webhook
      // route treats any non-error as "processed"
      expect(json.status).toBe("processed");

      // Verify no additional conversation was inserted (still just the 1 pre-existing)
      const conversationInserts = mockAccess.sql._insertedRows.filter(
        (r) => r.table === "conversation",
      );
      expect(conversationInserts).toHaveLength(1);
    });
  });
});
