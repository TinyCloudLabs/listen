import { describe, it, expect, afterEach, mock } from "bun:test";
import express from "express";
import type { Server } from "http";
import type { Request, Response, NextFunction } from "express";
import { STORAGE_FULL_SAVE_MESSAGE } from "@listen/core";
import { createSchemaRouter } from "../routes/schema.js";

// ── Mock access ──────────────────────────────────────────────────────

function createMockAccess(opts: { failMigrations?: boolean; storageFull?: boolean } = {}) {
  const dbHandle = {
    execute: mock(async () => ({ ok: true })),
    // Read-first probes report the schema missing so seeding runs.
    query: mock(async (sql: string) =>
      sql.includes("LIMIT 0")
        ? { ok: false, error: { message: "no such table: conversation" } }
        : { ok: true, data: { rows: [], columns: [] } },
    ),
    migrations: {
      apply: mock(async () =>
        opts.storageFull
          ? {
              ok: false,
              error: {
                code: "NETWORK_ERROR",
                message:
                  "SQL batch failed: 402 - Storage quota exceeded. Used: 155744 bytes, Limit: 0 bytes",
              },
            }
          : opts.failMigrations
            ? { ok: false, error: { message: "not authorized" } }
            : { ok: true },
      ),
    },
  };
  return {
    sql: { db: mock((_name: string) => dbHandle) },
    kv: {},
    dbHandle,
  } as any;
}

function mockAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.user = { sub: "test-sub" };
  next();
}

function createApp(access: ReturnType<typeof createMockAccess>) {
  const delegationMiddleware = (req: Request, _res: Response, next: NextFunction) => {
    req.delegatedAccess = access;
    next();
  };
  const app = express();
  app.use(express.json());
  app.use(
    "/api/schema",
    createSchemaRouter({ authMiddleware: mockAuthMiddleware, delegationMiddleware }),
  );
  return app;
}

function startServer(app: express.Express): Promise<{ server: Server; port: number }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve({ server, port: (server.address() as any).port }));
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
}

describe("Schema Route — POST /api/schema/ensure", () => {
  let server: Server;

  afterEach(async () => {
    await closeServer(server);
  });

  it("seeds the schema via ensureSchema and returns ok", async () => {
    const access = createMockAccess();
    const app = createApp(access);
    let port: number;
    ({ server, port } = await startServer(app));

    const res = await fetch(`http://localhost:${port}/api/schema/ensure`, { method: "POST" });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });
    // ensureSchema applies the initial CREATE TABLE migration.
    const applied = access.dbHandle.migrations.apply.mock.calls;
    const sql = applied[0][0].migrations[0].sql.join("\n");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS conversation");
  });

  it("returns 400 with the failure message when seeding fails", async () => {
    const access = createMockAccess({ failMigrations: true });
    const app = createApp(access);
    let port: number;
    ({ server, port } = await startServer(app));

    const res = await fetch(`http://localhost:${port}/api/schema/ensure`, { method: "POST" });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.message).toContain("not authorized");
  });

  it("returns the typed storage error when seeding is refused for storage", async () => {
    const access = createMockAccess({ storageFull: true });
    const app = createApp(access);
    let port: number;
    ({ server, port } = await startServer(app));

    const res = await fetch(`http://localhost:${port}/api/schema/ensure`, { method: "POST" });
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body).toEqual({
      error: "storage_quota_exceeded",
      code: "STORAGE_QUOTA_EXCEEDED",
      message: STORAGE_FULL_SAVE_MESSAGE,
    });
  });
});
