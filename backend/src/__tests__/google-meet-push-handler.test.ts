import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import express from "express";
import type { Server } from "http";
import { createGoogleMeetPushRouter } from "../routes/google-meet-webhooks.js";
import { GoogleAuthRevokedError } from "../services/google-auth.js";
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
  };
}

// ── Mock Delegated Access ────────────────────────────────────────────

function createMockAccess(opts?: { existingSourceIds?: string[] }) {
  const kvStore = createMockKV();

  return {
    _kvStore: kvStore,
    sql: {
      query: async (_sql: string, params?: any[]) => {
        const sourceId = params?.[0];
        if (opts?.existingSourceIds?.includes(sourceId)) {
          return { ok: true, data: { rows: [{ source_id: sourceId }] } };
        }
        return { ok: true, data: { rows: [] } };
      },
      execute: async (_sql: string, _params?: any[]) => {
        return { ok: true };
      },
    },
    kv: kvStore,
  };
}

// ── Constants ────────────────────────────────────────────────────────

const EXPECTED_AUDIENCE = "https://example.com/api/webhooks/google-meet";
const EXPECTED_EMAIL = "sa@project.iam.gserviceaccount.com";
const GOOGLE_TOKENS_PATH = "config/google-tokens";
const PENDING_KV_KEY = "xyz.tinycloud.listen/webhooks/pending/google-meet";
const FAILED_KV_KEY = "xyz.tinycloud.listen/webhooks/failed/google-meet";
const TEST_CONFERENCE_NAME = "conferenceRecords/def456";
const TEST_TRANSCRIPT_NAME = "conferenceRecords/def456/transcripts/ghi789";

// ── Test Data ────────────────────────────────────────────────────────

const MOCK_CONFERENCE_RECORD: ConferenceRecord = {
  name: TEST_CONFERENCE_NAME,
  startTime: "2026-03-31T10:00:00Z",
  endTime: "2026-03-31T11:00:00Z",
  expireTime: "2026-04-30T10:00:00Z",
  space: "spaces/test-space",
};

const MOCK_FULL_CONFERENCE: FullConference = {
  conferenceRecord: MOCK_CONFERENCE_RECORD,
  participants: [
    {
      name: `${TEST_CONFERENCE_NAME}/participants/p1`,
      earliestStartTime: "2026-03-31T10:00:00Z",
      signedinUser: { user: "users/u1", displayName: "Alice" },
    },
  ],
  transcripts: [
    {
      name: TEST_TRANSCRIPT_NAME,
      state: "FILE_GENERATED",
      startTime: "2026-03-31T10:00:00Z",
      endTime: "2026-03-31T11:00:00Z",
    },
  ],
  entries: [
    {
      name: `${TEST_TRANSCRIPT_NAME}/entries/e1`,
      participant: `${TEST_CONFERENCE_NAME}/participants/p1`,
      text: "Hello world",
      languageCode: "en-US",
      startTime: "2026-03-31T10:00:30Z",
      endTime: "2026-03-31T10:00:35Z",
    },
  ],
};

const MOCK_TOKENS = {
  access_token: "ya29.test",
  refresh_token: "1//test-refresh",
  expires_in: 3599,
  scope: "https://www.googleapis.com/auth/meetings.space.readonly",
  token_type: "Bearer",
  googleUserId: "google-user-123",
};

// ── Helpers ──────────────────────────────────────────────────────────

function buildPubSubMessage(opts?: { ceType?: string; ceSubject?: string; data?: object }) {
  const attributes: Record<string, string> = {
    "ce-type": opts?.ceType ?? "google.workspace.meet.transcript.v2.fileGenerated",
    "ce-subject": opts?.ceSubject ?? `//meet.googleapis.com/${TEST_TRANSCRIPT_NAME}`,
    "ce-id": "event-001",
    "ce-time": "2026-03-31T12:00:00Z",
  };

  const dataPayload = opts?.data ?? {
    transcript: { name: TEST_TRANSCRIPT_NAME },
  };

  return {
    message: {
      attributes,
      data: Buffer.from(JSON.stringify(dataPayload)).toString("base64"),
      messageId: "msg-001",
    },
    subscription: "projects/test-project/subscriptions/listen-push",
  };
}

function createMockClient(overrides?: {
  getConferenceRecord?: (name: string) => Promise<ConferenceRecord>;
  getFullConference?: (cr: ConferenceRecord) => Promise<FullConference>;
}) {
  return {
    getConferenceRecord: overrides?.getConferenceRecord ?? (async () => MOCK_CONFERENCE_RECORD),
    getFullConference: overrides?.getFullConference ?? (async () => MOCK_FULL_CONFERENCE),
  };
}

function createApp(opts?: {
  backendKV?: ReturnType<typeof createMockKV>;
  access?: ReturnType<typeof createMockAccess> | null;
  verifyToken?: (header: string, aud: string, email: string) => boolean;
  createClient?: (accessToken: string, onTokenRefresh?: any, refreshToken?: string) => any;
  tokens?: object | null;
}) {
  const backendKV = opts?.backendKV ?? createMockKV();
  const access = opts?.access === undefined ? createMockAccess() : opts.access;
  const tokens = opts?.tokens === undefined ? MOCK_TOKENS : opts.tokens;

  // Pre-store Google tokens in user KV if access provided
  if (access && tokens) {
    access.kv.put(GOOGLE_TOKENS_PATH, JSON.stringify(tokens));
  }

  const app = express();
  app.use(express.json());
  app.use(
    "/api/webhooks/google-meet",
    createGoogleMeetPushRouter({
      backendKV,
      tryGetDelegatedAccess: async () => access as any,
      expectedAudience: EXPECTED_AUDIENCE,
      expectedEmail: EXPECTED_EMAIL,
      verifyToken: opts?.verifyToken ?? (() => true),
      createClient: opts?.createClient ?? (() => createMockClient()),
    }),
  );

  return { app, backendKV, access };
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

async function postWebhook(port: number, body: object, authHeader?: string) {
  return fetch(`http://localhost:${port}/api/webhooks/google-meet`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify(body),
  });
}

// ── Tests ────────────────────────────────────────────────────────────

describe("Google Meet Push Handler", () => {
  let server: Server;
  let port: number;

  afterEach(async () => {
    if (server) await closeServer(server);
  });

  // ── OIDC Verification ──────────────────────────────────────────────

  it("returns 401 on invalid OIDC token", async () => {
    const { app } = createApp({
      verifyToken: () => false,
    });
    ({ server, port } = await startServer(app));

    const res = await postWebhook(port, buildPubSubMessage());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("invalid_oidc_token");
  });

  it("returns 401 when Authorization header is missing", async () => {
    const { app } = createApp({
      verifyToken: (header: string) => {
        // Real verifyPubSubToken returns false if no Bearer prefix
        return header.startsWith("Bearer ");
      },
    });
    ({ server, port } = await startServer(app));

    // No auth header
    const res = await fetch(`http://localhost:${port}/api/webhooks/google-meet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPubSubMessage()),
    });
    expect(res.status).toBe(401);
  });

  // ── Event Filtering ────────────────────────────────────────────────

  it("returns 200 with ignored status for unknown ce-type", async () => {
    const { app } = createApp();
    ({ server, port } = await startServer(app));

    const msg = buildPubSubMessage({ ceType: "google.workspace.meet.recording.v2.fileGenerated" });
    const res = await postWebhook(port, msg, "Bearer fake-token");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ignored");
  });

  // ── Malformed Messages ─────────────────────────────────────────────

  it("returns 200 on malformed message (no message field)", async () => {
    const { app } = createApp();
    ({ server, port } = await startServer(app));

    const res = await postWebhook(port, { invalid: true }, "Bearer fake-token");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("error");
    expect(body.error).toContain("malformed");
  });

  it("returns 200 on missing ce-subject (cannot extract conference name)", async () => {
    const { app } = createApp();
    ({ server, port } = await startServer(app));

    const msg = buildPubSubMessage({ ceSubject: "//some-random-path", data: { unrelated: true } });
    const res = await postWebhook(port, msg, "Bearer fake-token");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("error");
  });

  // ── Dedup ──────────────────────────────────────────────────────────

  it("skips already-synced conferences (dedup)", async () => {
    const access = createMockAccess({ existingSourceIds: [TEST_CONFERENCE_NAME] });
    access.kv.put(GOOGLE_TOKENS_PATH, JSON.stringify(MOCK_TOKENS));

    const { app } = createApp({ access, tokens: null });
    ({ server, port } = await startServer(app));

    const res = await postWebhook(port, buildPubSubMessage(), "Bearer fake-token");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("skipped");
    expect(body.conferenceRecordName).toBe(TEST_CONFERENCE_NAME);
  });

  // ── Successful Processing ──────────────────────────────────────────

  it("processes valid transcript event end-to-end", async () => {
    let clientCreated = false;
    const { app } = createApp({
      createClient: () => {
        clientCreated = true;
        return createMockClient();
      },
    });
    ({ server, port } = await startServer(app));

    const res = await postWebhook(port, buildPubSubMessage(), "Bearer fake-token");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("processed");
    expect(body.conferenceRecordName).toBe(TEST_CONFERENCE_NAME);
    expect(body.conversationId).toBeDefined();
    expect(clientCreated).toBe(true);
  });

  it("passes correct tokens to client creation", async () => {
    let capturedToken: string | undefined;
    let capturedRefresh: string | undefined;

    const { app } = createApp({
      createClient: (accessToken, _onRefresh, refreshToken) => {
        capturedToken = accessToken;
        capturedRefresh = refreshToken;
        return createMockClient();
      },
    });
    ({ server, port } = await startServer(app));

    await postWebhook(port, buildPubSubMessage(), "Bearer fake-token");
    expect(capturedToken).toBe("ya29.test");
    expect(capturedRefresh).toBe("1//test-refresh");
  });

  // ── No Delegation ──────────────────────────────────────────────────

  it("queues to pending when delegation unavailable", async () => {
    const backendKV = createMockKV();
    const { app } = createApp({ access: null, backendKV });
    ({ server, port } = await startServer(app));

    const res = await postWebhook(port, buildPubSubMessage(), "Bearer fake-token");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("pending");
    expect(body.reason).toBe("no_delegation");

    // Verify event stored in pending queue
    const pending = JSON.parse(backendKV._data.get(PENDING_KV_KEY)!);
    expect(pending).toHaveLength(1);
    expect(pending[0].conferenceRecordName).toBe(TEST_CONFERENCE_NAME);
  });

  // ── No Google Tokens ───────────────────────────────────────────────

  it("queues to pending when Google tokens not found", async () => {
    const backendKV = createMockKV();
    const access = createMockAccess();
    // Don't store tokens
    const { app } = createApp({ access, backendKV, tokens: null });
    ({ server, port } = await startServer(app));

    const res = await postWebhook(port, buildPubSubMessage(), "Bearer fake-token");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("pending");
    expect(body.reason).toBe("no_google_tokens");

    const pending = JSON.parse(backendKV._data.get(PENDING_KV_KEY)!);
    expect(pending).toHaveLength(1);
  });

  // ── Auth Revoked ───────────────────────────────────────────────────

  it("queues to pending on GoogleAuthRevokedError", async () => {
    const backendKV = createMockKV();
    const { app } = createApp({
      backendKV,
      createClient: () =>
        createMockClient({
          getConferenceRecord: async () => {
            throw new GoogleAuthRevokedError("Token revoked");
          },
        }),
    });
    ({ server, port } = await startServer(app));

    const res = await postWebhook(port, buildPubSubMessage(), "Bearer fake-token");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("pending");
    expect(body.reason).toBe("auth_revoked");

    const pending = JSON.parse(backendKV._data.get(PENDING_KV_KEY)!);
    expect(pending).toHaveLength(1);
    expect(pending[0].conferenceRecordName).toBe(TEST_CONFERENCE_NAME);
  });

  // ── Processing Error ───────────────────────────────────────────────

  it("stores failed event on processing error", async () => {
    const backendKV = createMockKV();
    const { app } = createApp({
      backendKV,
      createClient: () =>
        createMockClient({
          getFullConference: async () => {
            throw new Error("Meet API rate limited");
          },
        }),
    });
    ({ server, port } = await startServer(app));

    const res = await postWebhook(port, buildPubSubMessage(), "Bearer fake-token");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("error");
    expect(body.error).toContain("Meet API rate limited");

    // Failed event stored in KV
    const failed = JSON.parse(backendKV._data.get(FAILED_KV_KEY)!);
    expect(failed).toHaveLength(1);
    expect(failed[0].conferenceRecordName).toBe(TEST_CONFERENCE_NAME);
    expect(failed[0].error).toContain("Meet API rate limited");
  });
});
