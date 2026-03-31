import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import express from "express";
import type { Server } from "http";
import { createHmac } from "crypto";
import { createWebhookRouter } from "../routes/webhooks.js";

// ── Constants ───────────────────────────────────────────────────────

const SECRET = "test-webhook-secret";
const SECRET_KV_KEY = "/app.webhooks/config/fireflies-secret";
const PENDING_KV_KEY = "/app.webhooks/pending/fireflies";
const FIREFLIES_KEY_PATH = "/app.conversations/config/fireflies-key";

// ── Helpers ─────────────────────────────────────────────────────────

function sign(body: string, secret: string): string {
  const hmac = createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${hmac}`;
}

function createMockBackendKV() {
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

function createMockAccess(apiKey?: string) {
  const kvData = new Map<string, string>();
  if (apiKey) kvData.set(FIREFLIES_KEY_PATH, apiKey);

  return {
    _kvData: kvData,
    kv: {
      get: async (key: string) => {
        const val = kvData.get(key);
        if (val === undefined) return { ok: true, data: { data: null } };
        return { ok: true, data: { data: val } };
      },
      put: async (key: string, value: string) => {
        kvData.set(key, value);
        return { ok: true };
      },
    },
    sql: {
      query: async () => ({ ok: true, data: { rows: [], columns: [] } }),
      execute: async () => ({ ok: true, data: { changes: 1 } }),
    },
  };
}

function validPayload(meetingId = "meeting-123") {
  return JSON.stringify({
    meetingId,
    eventType: "Transcription completed",
  });
}

/** Current Fireflies payload format */
function validPayloadV2(meetingId = "meeting-123") {
  return JSON.stringify({
    meeting_id: meetingId,
    event: "meeting.transcribed",
    timestamp: Date.now(),
  });
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

describe("POST /api/webhooks/fireflies", () => {
  let server: Server;
  let port: number;
  let backendKV: ReturnType<typeof createMockBackendKV>;
  let mockAccess: ReturnType<typeof createMockAccess>;
  let delegatedAccessFn: () => Promise<any>;
  let syncFn: ReturnType<typeof mock>;

  beforeEach(async () => {
    backendKV = createMockBackendKV();
    backendKV._data.set(SECRET_KV_KEY, SECRET);

    mockAccess = createMockAccess("test-fireflies-key");
    delegatedAccessFn = async () => mockAccess;

    syncFn = mock(async (meetingId: string) => ({
      status: "created" as const,
      meetingId,
      conversationId: "conv-1",
      title: "Test Meeting",
      startedAt: "2026-01-01T00:00:00Z",
    }));

    const app = express();
    app.use(
      "/api/webhooks",
      createWebhookRouter({
        backendKV,
        tryGetDelegatedAccess: () => delegatedAccessFn(),
        syncFn,
      }),
    );
    ({ server, port } = await startServer(app));
  });

  afterEach(async () => {
    await closeServer(server);
  });

  function post(body: string, headers?: Record<string, string>) {
    return fetch(`http://localhost:${port}/api/webhooks/fireflies`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body,
    });
  }

  // ── Signature verification ─────────────────────────────────────────

  it("returns 401 when x-hub-signature header is missing", async () => {
    const body = validPayload();
    const res = await post(body);

    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("invalid_signature");
  });

  it("returns 401 when webhook secret is not configured", async () => {
    backendKV._data.delete(SECRET_KV_KEY);
    const body = validPayload();
    const res = await post(body, { "x-hub-signature": sign(body, SECRET) });

    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("no_webhook_secret");
  });

  it("returns 401 when signature is invalid", async () => {
    const body = validPayload();
    const badSig = "sha256=0000000000000000000000000000000000000000000000000000000000000000";
    const res = await post(body, { "x-hub-signature": badSig });

    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("invalid_signature");
  });

  // ── Event type filtering ───────────────────────────────────────────

  it("returns 200 with status 'ignored' for non-transcription events", async () => {
    const body = JSON.stringify({ meetingId: "m1", eventType: "Meeting started" });
    const res = await post(body, { "x-hub-signature": sign(body, SECRET) });

    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("ignored");
  });

  // ── Validation ─────────────────────────────────────────────────────

  it("returns 400 when meetingId is missing", async () => {
    const body = JSON.stringify({ eventType: "Transcription completed" });
    const res = await post(body, { "x-hub-signature": sign(body, SECRET) });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("missing_meeting_id");
  });

  // ── Active delegation path ─────────────────────────────────────────

  it("returns 200 with status 'processed' when delegation active", async () => {
    const body = validPayload();
    const res = await post(body, { "x-hub-signature": sign(body, SECRET) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("processed");
  });

  it("returns 200 with status 'processed' for current Fireflies payload format", async () => {
    const body = validPayloadV2("v2-meeting");
    const res = await post(body, { "x-hub-signature": sign(body, SECRET) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("processed");
    expect(syncFn).toHaveBeenCalledTimes(1);
    expect(syncFn.mock.calls[0][0]).toBe("v2-meeting");
  });

  it("calls syncFn with correct meetingId", async () => {
    const body = validPayload("my-meeting");
    await post(body, { "x-hub-signature": sign(body, SECRET) });

    expect(syncFn).toHaveBeenCalledTimes(1);
    expect(syncFn.mock.calls[0][0]).toBe("my-meeting");
  });

  it("passes DelegatedAccess to syncFn", async () => {
    const body = validPayload();
    await post(body, { "x-hub-signature": sign(body, SECRET) });

    expect(syncFn.mock.calls[0][1]).toBe(mockAccess);
  });

  // ── Expired delegation path ────────────────────────────────────────

  it("returns 200 with status 'pending' when delegation expired", async () => {
    delegatedAccessFn = async () => null;

    const body = validPayload();
    const res = await post(body, { "x-hub-signature": sign(body, SECRET) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("pending");
    expect(json.reason).toBe("delegation_expired");
  });

  it("stores meetingId in pending queue when delegation expired", async () => {
    delegatedAccessFn = async () => null;

    const body = validPayload("meeting-xyz");
    await post(body, { "x-hub-signature": sign(body, SECRET) });

    const pendingRaw = backendKV._data.get(PENDING_KV_KEY);
    expect(pendingRaw).toBeDefined();
    const pending = JSON.parse(pendingRaw!);
    expect(pending).toHaveLength(1);
    expect(pending[0].meetingId).toBe("meeting-xyz");
    expect(pending[0].receivedAt).toBeDefined();
  });

  it("appends to existing pending queue", async () => {
    delegatedAccessFn = async () => null;
    backendKV._data.set(
      PENDING_KV_KEY,
      JSON.stringify([{ meetingId: "existing-1", receivedAt: "2026-01-01T00:00:00Z" }]),
    );

    const body = validPayload("new-meeting");
    await post(body, { "x-hub-signature": sign(body, SECRET) });

    const pending = JSON.parse(backendKV._data.get(PENDING_KV_KEY)!);
    expect(pending).toHaveLength(2);
    expect(pending[0].meetingId).toBe("existing-1");
    expect(pending[1].meetingId).toBe("new-meeting");
  });

  it("does not call syncFn when delegation expired", async () => {
    delegatedAccessFn = async () => null;

    const body = validPayload();
    await post(body, { "x-hub-signature": sign(body, SECRET) });

    expect(syncFn).not.toHaveBeenCalled();
  });

  // ── Error handling ─────────────────────────────────────────────────

  it("returns 500 when syncFn returns error", async () => {
    syncFn = mock(async () => ({
      status: "error" as const,
      meetingId: "m1",
      error: "Fireflies API timeout",
    }));

    // Recreate app with updated syncFn
    await closeServer(server);
    const app = express();
    app.use(
      "/api/webhooks",
      createWebhookRouter({
        backendKV,
        tryGetDelegatedAccess: () => delegatedAccessFn(),
        syncFn,
      }),
    );
    ({ server, port } = await startServer(app));

    const body = validPayload();
    const res = await post(body, { "x-hub-signature": sign(body, SECRET) });

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("Fireflies API timeout");
  });

  it("queues as pending when API key not configured", async () => {
    mockAccess._kvData.delete(FIREFLIES_KEY_PATH);

    const body = validPayload("no-key-meeting");
    const res = await post(body, { "x-hub-signature": sign(body, SECRET) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("pending");
    expect(json.reason).toBe("no_api_key");

    // Also verify it was queued
    const pending = JSON.parse(backendKV._data.get(PENDING_KV_KEY)!);
    expect(pending[0].meetingId).toBe("no-key-meeting");
  });
});
