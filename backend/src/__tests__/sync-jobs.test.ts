import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import express from "express";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { Readable, Writable } from "stream";
import { createSyncJobsRouter, type SyncJobResumeRegistry } from "../routes/sync-jobs.js";
import { createSyncRouter } from "../routes/sync.js";
import { createGranolaSyncRouter } from "../routes/granola-sync.js";
import { createGoogleMeetSyncRouter } from "../routes/google-meet-sync.js";

const TEST_ADDRESS = "0xTEST";
const OWNER = TEST_ADDRESS.toLowerCase();
const APP_PREFIX = "xyz.tinycloud.listen";
const FIREFLIES_CURRENT_KEY = `${APP_PREFIX}/sync/fireflies/jobs/${OWNER}/current`;
const GRANOLA_CURRENT_KEY = `${APP_PREFIX}/sync/granola/jobs/${OWNER}/current`;
const GOOGLE_MEET_CURRENT_KEY = `${APP_PREFIX}/sync/google-meet/jobs/${OWNER}/current`;

type MockBackendKV = ReturnType<typeof createMockBackendKV>;

function jobRecordKey(source: "fireflies" | "granola" | "google-meet", jobId: string) {
  return `${APP_PREFIX}/sync/${source}/jobs/${OWNER}/${jobId}`;
}

function currentJobKey(source: "fireflies" | "granola" | "google-meet") {
  if (source === "fireflies") return FIREFLIES_CURRENT_KEY;
  if (source === "granola") return GRANOLA_CURRENT_KEY;
  return GOOGLE_MEET_CURRENT_KEY;
}

function createMockBackendKV() {
  const data = new Map<string, string>();
  const calls: string[] = [];
  const rejectedKeys = new Map<string, Error>();

  return {
    _data: data,
    _calls: calls,
    _rejectOnGet(key: string, err = new Error("KV read failed")) {
      rejectedKeys.set(key, err);
    },
    get: async (key: string) => {
      calls.push(key);
      const rejected = rejectedKeys.get(key);
      if (rejected) {
        rejectedKeys.delete(key);
        throw rejected;
      }
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

function createDeferredBackendKV() {
  const data = new Map<string, string>();
  const calls: string[] = [];
  const pendingCurrentGets: Array<() => void> = [];

  const resultFor = (key: string) => {
    const val = data.get(key);
    if (val === undefined) return { ok: true, data: { data: null } };
    return { ok: true, data: { data: val } };
  };

  return {
    _data: data,
    _calls: calls,
    _resolveCurrentGets() {
      for (const resolve of pendingCurrentGets.splice(0)) resolve();
    },
    get: (key: string) => {
      calls.push(key);
      if (key.endsWith("/current")) {
        return new Promise((resolve) => {
          pendingCurrentGets.push(() => resolve(resultFor(key)));
        });
      }
      return Promise.resolve(resultFor(key));
    },
    put: async (key: string, value: string) => {
      data.set(key, value);
      return { ok: true };
    },
  };
}

function createJob(
  source: "fireflies" | "granola" | "google-meet",
  overrides: Record<string, unknown> = {},
) {
  const now = "2026-07-08T12:00:00.000Z";
  return {
    id: `${source}-job-1`,
    source,
    ownerAddress: OWNER,
    mode: "incremental",
    status: "completed",
    createdAt: now,
    updatedAt: now,
    synced: 1,
    skipped: 0,
    failed: 0,
    errors: [],
    conversations: [],
    ...(source === "fireflies" ? { repaired: 0 } : {}),
    ...(source === "google-meet" ? { checked: 1, skippedExisting: 0, skippedNoTranscript: 0 } : {}),
    ...overrides,
  };
}

function seedCurrentJob(
  backendKV: { _data: Map<string, string> },
  source: "fireflies" | "granola" | "google-meet",
  job: Record<string, unknown>,
) {
  backendKV._data.set(currentJobKey(source), String(job.id));
  backendKV._data.set(jobRecordKey(source, String(job.id)), JSON.stringify(job));
}

function mockAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.user = { address: TEST_ADDRESS };
  next();
}

function mockDelegationMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.delegatedAccess = {
    kv: {
      get: async () => ({ ok: true, data: { data: null } }),
      put: async () => ({ ok: true }),
    },
    sql: {
      query: async () => ({ ok: true, data: { rows: [], columns: [] } }),
      execute: async () => ({ ok: true, data: { changes: 0 } }),
    },
    secrets: {
      get: async () => ({ ok: false, error: { code: "KEY_NOT_FOUND" } }),
    },
  } as any;
  next();
}

function createApp({
  backendKV = createMockBackendKV(),
  omitBackendKV = false,
  resumeRegistry,
  authMiddleware = mockAuthMiddleware,
  delegationMiddleware = mockDelegationMiddleware,
}: {
  backendKV?: MockBackendKV;
  omitBackendKV?: boolean;
  resumeRegistry?: SyncJobResumeRegistry;
  authMiddleware?: RequestHandler;
  delegationMiddleware?: RequestHandler;
} = {}) {
  const app = express();
  app.use(express.json());
  app.use(
    "/api/sync/jobs",
    createSyncJobsRouter({
      authMiddleware,
      delegationMiddleware,
      backendKV: omitBackendKV ? undefined : backendKV,
      resumeRegistry,
    }),
  );
  return app;
}

class MockRequest extends Readable {
  method = "GET";
  url: string;
  headers: Record<string, string> = {};
  socket = {};
  connection = this.socket;

  constructor(url: string) {
    super();
    this.url = url;
  }

  _read() {
    this.push(null);
  }
}

class MockResponse extends Writable {
  statusCode = 200;
  private headers = new Map<string, any>();
  private chunks: Buffer[] = [];

  constructor(private readonly onEnd: (raw: string) => void) {
    super();

    this.setHeader = ((name: string, value: any) => {
      this.headers.set(name.toLowerCase(), value);
      return this;
    }) as any;
    this.getHeader = ((name: string) => this.headers.get(name.toLowerCase())) as any;
    this.getHeaders = (() => Object.fromEntries(this.headers)) as any;
    this.removeHeader = ((name: string) => {
      this.headers.delete(name.toLowerCase());
    }) as any;
    this.writeHead = ((statusCode: number, headers?: Record<string, any>) => {
      this.statusCode = statusCode;
      if (headers) {
        for (const [name, value] of Object.entries(headers)) this.setHeader(name, value);
      }
      return this;
    }) as any;
    this.write = ((chunk: any) => {
      this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      return true;
    }) as any;
    this.end = ((chunk?: any, _encoding?: any, callback?: any) => {
      if (chunk) this.write(chunk);
      (this as any)._ended = true;
      this.onEnd(Buffer.concat(this.chunks).toString("utf8"));
      if (typeof callback === "function") callback();
      return this;
    }) as any;
  }

  _write(chunk: any, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    callback();
  }
}

function requestJson(app: express.Express, path: string) {
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const req = new MockRequest(path);
    const res = new MockResponse((raw) => {
      resolve({
        status: res.statusCode,
        body: raw ? JSON.parse(raw) : undefined,
      });
    });

    app.handle(req as any, res as any, (err: unknown) => {
      if (err) {
        reject(err);
      } else if (!(res as any)._ended) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "not_found" }));
      }
    });
  });
}

async function getSyncJobs(app: express.Express) {
  return requestJson(app, "/api/sync/jobs");
}

async function waitFor(predicate: () => boolean, timeoutMs = 150) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  throw new Error("Timed out waiting for condition");
}

describe("GET /api/sync/jobs", () => {
  const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
  });

  afterEach(() => {
    if (originalGoogleClientId === undefined) {
      delete process.env.GOOGLE_CLIENT_ID;
    } else {
      process.env.GOOGLE_CLIENT_ID = originalGoogleClientId;
    }
  });

  it("returns all three current jobs from backend KV", async () => {
    const backendKV = createMockBackendKV();
    const fireflies = createJob("fireflies", { id: "ff-job" });
    const granola = createJob("granola", { id: "gr-job" });
    const googleMeet = createJob("google-meet", { id: "gm-job" });
    seedCurrentJob(backendKV, "fireflies", fireflies);
    seedCurrentJob(backendKV, "granola", granola);
    seedCurrentJob(backendKV, "google-meet", googleMeet);

    const { status, body } = await getSyncJobs(createApp({ backendKV }));

    expect(status).toBe(200);
    expect(body).toEqual({
      fireflies,
      granola,
      "google-meet": googleMeet,
    });
  });

  it("returns nulls when current jobs are absent", async () => {
    const { status, body } = await getSyncJobs(createApp());

    expect(status).toBe(200);
    expect(body).toEqual({
      fireflies: null,
      granola: null,
      "google-meet": null,
    });
  });

  it("returns google-meet as null without reading Google Meet KV when Google is unconfigured", async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    const backendKV = createMockBackendKV();

    const { status, body } = await getSyncJobs(createApp({ backendKV }));

    expect(status).toBe(200);
    expect(body["google-meet"]).toBeNull();
    expect(backendKV._calls.some((key) => key.includes("/sync/google-meet/jobs/"))).toBe(false);
  });

  it("keeps other sources intact when one source read throws", async () => {
    const backendKV = createMockBackendKV();
    const fireflies = createJob("fireflies", { id: "ff-job" });
    const googleMeet = createJob("google-meet", { id: "gm-job" });
    seedCurrentJob(backendKV, "fireflies", fireflies);
    seedCurrentJob(backendKV, "google-meet", googleMeet);
    backendKV._rejectOnGet(GRANOLA_CURRENT_KEY, new Error("granola pointer read failed"));

    const { status, body } = await getSyncJobs(createApp({ backendKV }));

    expect(status).toBe(200);
    expect(body.fireflies).toEqual(fireflies);
    expect(body.granola).toBeNull();
    expect(body["google-meet"]).toEqual(googleMeet);
  });

  it("returns 503 when backend KV is not configured", async () => {
    const { status, body } = await getSyncJobs(createApp({ omitBackendKV: true }));

    expect(status).toBe(503);
    expect(body).toEqual({
      error: "sync_jobs_unavailable",
      message: "Background sync jobs are not configured.",
    });
  });

  it("returns 401 when auth middleware rejects", async () => {
    const authMiddleware: RequestHandler = (_req, res) => {
      res.status(401).json({ error: "unauthorized" });
    };

    const { status, body } = await getSyncJobs(createApp({ authMiddleware }));

    expect(status).toBe(401);
    expect(body).toEqual({ error: "unauthorized" });
  });

  it("returns 403 when delegation middleware rejects", async () => {
    const delegationMiddleware: RequestHandler = (_req, res) => {
      res.status(403).json({ error: "forbidden" });
    };

    const { status, body } = await getSyncJobs(createApp({ delegationMiddleware }));

    expect(status).toBe(403);
    expect(body).toEqual({ error: "forbidden" });
  });

  it("issues the three current pointer reads in parallel", async () => {
    const backendKV = createDeferredBackendKV();
    seedCurrentJob(backendKV, "fireflies", createJob("fireflies", { id: "ff-job" }));
    seedCurrentJob(backendKV, "granola", createJob("granola", { id: "gr-job" }));
    seedCurrentJob(backendKV, "google-meet", createJob("google-meet", { id: "gm-job" }));

    const responsePromise = getSyncJobs(createApp({ backendKV: backendKV as any }));

    try {
      await waitFor(() => {
        const currentReads = backendKV._calls.filter((key) => key.endsWith("/current"));
        return (
          currentReads.includes(FIREFLIES_CURRENT_KEY) &&
          currentReads.includes(GRANOLA_CURRENT_KEY) &&
          currentReads.includes(GOOGLE_MEET_CURRENT_KEY)
        );
      });

      expect(backendKV._calls.filter((key) => key.endsWith("/current")).sort()).toEqual(
        [FIREFLIES_CURRENT_KEY, GRANOLA_CURRENT_KEY, GOOGLE_MEET_CURRENT_KEY].sort(),
      );

      backendKV._resolveCurrentGets();
      const res = await responsePromise;
      expect(res.status).toBe(200);
    } finally {
      backendKV._resolveCurrentGets();
      await responsePromise.catch(() => undefined);
    }
  });

  it("reports the job returned by a resume registry resumer", async () => {
    const backendKV = createMockBackendKV();
    const activeJob = createJob("fireflies", { id: "ff-job", status: "syncing" });
    const failedJob = {
      ...activeJob,
      status: "failed",
      message: "No Fireflies API key configured.",
      completedAt: "2026-07-08T12:01:00.000Z",
    };
    seedCurrentJob(backendKV, "fireflies", activeJob);
    const fireflies = mock(async (_req: Request, job: any) => ({ ...job, ...failedJob }));

    const { status, body } = await getSyncJobs(
      createApp({ backendKV, resumeRegistry: { fireflies } }),
    );

    expect(status).toBe(200);
    expect(body.fireflies).toEqual(failedJob);
    expect(fireflies).toHaveBeenCalledTimes(1);
    expect(fireflies.mock.calls[0][1]).toEqual(activeJob);
  });

  it("keeps the read job when a resumer throws", async () => {
    const backendKV = createMockBackendKV();
    const activeJob = createJob("fireflies", { id: "ff-job", status: "syncing" });
    seedCurrentJob(backendKV, "fireflies", activeJob);
    const fireflies = mock(async () => {
      throw new Error("resume failed");
    });

    const { status, body } = await getSyncJobs(
      createApp({ backendKV, resumeRegistry: { fireflies } }),
    );

    expect(status).toBe(200);
    expect(body.fireflies).toEqual(activeJob);
    expect(fireflies).toHaveBeenCalledTimes(1);
  });

  it("passes terminal jobs through the resume registry contract", async () => {
    const backendKV = createMockBackendKV();
    const completedJob = createJob("fireflies", { id: "ff-job", status: "completed" });
    seedCurrentJob(backendKV, "fireflies", completedJob);
    const fireflies = mock(async (_req: Request, job: any) => job);

    const { status, body } = await getSyncJobs(
      createApp({ backendKV, resumeRegistry: { fireflies } }),
    );

    expect(status).toBe(200);
    expect(body.fireflies).toEqual(completedJob);
    expect(fireflies).toHaveBeenCalledTimes(1);
    expect(fireflies.mock.calls[0][1]).toEqual(completedJob);
  });
});

describe("sync job resume registry population", () => {
  it("registers fireflies, granola, and google-meet resumers from the source routers", () => {
    process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
    const backendKV = createMockBackendKV();
    const resumeRegistry: SyncJobResumeRegistry = {};

    createSyncRouter({
      authMiddleware: mockAuthMiddleware,
      delegationMiddleware: mockDelegationMiddleware,
      backendKV,
      createClient: () => ({}) as any,
      syncDelayMs: 0,
      resumeRegistry,
    });
    createGranolaSyncRouter({
      authMiddleware: mockAuthMiddleware,
      delegationMiddleware: mockDelegationMiddleware,
      backendKV,
      createClient: () => ({}) as any,
      resumeRegistry,
    });
    createGoogleMeetSyncRouter({
      authMiddleware: mockAuthMiddleware,
      delegationMiddleware: mockDelegationMiddleware,
      backendKV,
      createClient: () => ({}) as any,
      syncDelayMs: 0,
      resumeRegistry,
    });

    expect(typeof resumeRegistry.fireflies).toBe("function");
    expect(typeof resumeRegistry.granola).toBe("function");
    expect(typeof resumeRegistry["google-meet"]).toBe("function");
  });
});
