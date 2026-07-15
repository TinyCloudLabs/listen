import { describe, it, expect, beforeEach, mock } from "bun:test";

// ── Mock DelegatedAccess ─────────────────────────────────────────────

function createMockAccess(spaceId?: string) {
  const dbHandle = {
    execute: mock(async (_sql: string) => ({ ok: true })),
    query: mock(async () => ({ ok: true, data: { rows: [], columns: [] } })),
    migrations: {
      apply: mock(async () => ({ ok: true })),
    },
  };
  return {
    sql: {
      execute: mock(async (_sql: string) => ({ ok: true })),
      query: mock(async () => ({ ok: true, data: { rows: [], columns: [] } })),
      db: mock((_name: string) => dbHandle),
    },
    kv: {},
    ...(spaceId ? { spaceId } : {}),
    dbHandle,
  } as any;
}

// ── Tests ────────────────────────────────────────────────────────────

import { conversationSql, ensureSchema, DATABASE_NAME } from "../schema.js";

describe("schema", () => {
  describe("DATABASE_NAME", () => {
    it("exports the manifest-prefixed conversations database name", () => {
      expect(DATABASE_NAME).toBe("xyz.tinycloud.listen/conversations");
    });
  });

  describe("ensureSchema()", () => {
    let access: ReturnType<typeof createMockAccess>;

    beforeEach(() => {
      access = createMockAccess();
    });

    it("applies an initial migration for the conversation table", async () => {
      await ensureSchema(access);

      const migrations = access.dbHandle.migrations.apply.mock.calls;
      const allSql = migrations[0][0].migrations[0].sql.join("\n");
      expect(allSql).toContain("CREATE TABLE IF NOT EXISTS conversation");
    });

    it("applies an initial migration for the participant table", async () => {
      await ensureSchema(access);

      const migrations = access.dbHandle.migrations.apply.mock.calls;
      const allSql = migrations[0][0].migrations[0].sql.join("\n");
      expect(allSql).toContain("CREATE TABLE IF NOT EXISTS participant");
    });

    it("records the transcript column migration when those columns already exist", async () => {
      await ensureSchema(access);

      const calls = access.dbHandle.migrations.apply.mock.calls;
      expect(calls.length).toBe(2);
      expect(calls[0][0]).toMatchObject({
        namespace: "xyz.tinycloud.listen.conversations",
        migrations: [{ id: "001_initial" }],
      });
      expect(calls[0][0].migrations[0].sql.length).toBe(2);
      expect(calls[1][0]).toMatchObject({
        namespace: "xyz.tinycloud.listen.conversations",
        migrations: [{ id: "002_transcript_columns" }],
      });
      expect(calls[1][0].migrations[0].sql).toEqual([
        "UPDATE conversation SET id = id WHERE 1 = 0",
      ]);
    });

    it("uses the named conversations database when a db handle is available", async () => {
      const dbHandle = {
        execute: mock(async (_sql: string) => ({ ok: true })),
        query: mock(async () => ({ ok: true, data: { rows: [], columns: [] } })),
        migrations: {
          apply: mock(async () => ({ ok: true })),
        },
      };
      access.sql.db = mock((name: string) => {
        expect(name).toBe(DATABASE_NAME);
        return dbHandle;
      });

      expect(conversationSql(access)).toBe(dbHandle);
      await ensureSchema(access);

      expect(access.sql.db).toHaveBeenCalled();
      expect(dbHandle.migrations.apply.mock.calls.length).toBe(2);
      expect(access.sql.execute.mock.calls.length).toBe(0);
    });

    it("adds transcript columns when an existing conversation table is missing them", async () => {
      access.dbHandle.query.mockImplementation(async (sql: string) => {
        if (sql.includes("transcript_json")) {
          return { ok: false, error: { message: "no such column: transcript_json" } };
        }
        return { ok: true, data: { rows: [], columns: [] } };
      });

      await ensureSchema(access);

      const migrations = access.dbHandle.migrations.apply.mock.calls;
      const allSql = migrations[1][0].migrations[0].sql.join("\n");
      expect(migrations[1][0].migrations[0].id).toBe("002_transcript_columns");
      expect(allSql).toContain("ALTER TABLE conversation ADD COLUMN transcript_json TEXT");
      expect(allSql).toContain("ALTER TABLE conversation ADD COLUMN transcript_text TEXT");
    });

    it("no-ops on subsequent calls with the same access", async () => {
      await ensureSchema(access);
      const firstCallCount = access.dbHandle.migrations.apply.mock.calls.length;

      await ensureSchema(access);
      expect(access.dbHandle.migrations.apply.mock.calls.length).toBe(firstCallCount);
    });

    it("runs schema again for a different access object without a spaceId", async () => {
      await ensureSchema(access);

      const access2 = createMockAccess();
      await ensureSchema(access2);

      expect(access2.dbHandle.migrations.apply.mock.calls.length).toBeGreaterThan(0);
    });

    it("no-ops for a different access object with the same spaceId", async () => {
      const spaceId = `space-shared-${Date.now()}`;
      const accessA = createMockAccess(spaceId);
      await ensureSchema(accessA);
      expect(accessA.dbHandle.migrations.apply.mock.calls.length).toBeGreaterThan(0);

      const accessB = createMockAccess(spaceId);
      await ensureSchema(accessB);
      // Same space already initialized on accessA — accessB must not re-run.
      expect(accessB.dbHandle.migrations.apply.mock.calls.length).toBe(0);
    });

    it("runs schema again for a different spaceId", async () => {
      const accessA = createMockAccess(`space-a-${Date.now()}`);
      await ensureSchema(accessA);

      const accessB = createMockAccess(`space-b-${Date.now()}`);
      await ensureSchema(accessB);

      expect(accessB.dbHandle.migrations.apply.mock.calls.length).toBeGreaterThan(0);
    });

    it("throws when migrations.apply returns ok: false", async () => {
      access.dbHandle.migrations.apply.mockImplementation(async () => ({
        ok: false,
        error: { message: "DB unavailable" },
      }));

      expect(ensureSchema(access)).rejects.toThrow("Failed to initialize conversations schema");
    });

    it("does not leak TinyCloud timeout HTML from initial migration errors", async () => {
      access.dbHandle.migrations.apply.mockImplementation(async () => ({
        ok: false,
        error: {
          message:
            "SQL batch failed: 524 - <!DOCTYPE html><html><head><title>tinycloud.xyz | 524: A timeout occurred</title></head><body>Error code 524</body></html>",
        },
      }));

      await expect(ensureSchema(access)).rejects.toThrow(
        "TinyCloud SQL timed out while preparing the conversations database",
      );
      await expect(ensureSchema(access)).rejects.not.toThrow("<!DOCTYPE html>");
    });

    it("does not leak TinyCloud timeout HTML from transcript migration errors", async () => {
      access.dbHandle.migrations.apply.mockImplementation(
        async (options: { migrations: Array<{ id: string }> }) => {
          if (options.migrations[0].id === "001_initial") return { ok: true };
          return {
            ok: false,
            error: {
              message:
                "SQL batch failed: 524 - <html><head><title>A timeout occurred</title></head><body>Error code 524</body></html>",
            },
          };
        },
      );

      await expect(ensureSchema(access)).rejects.toThrow(
        "TinyCloud SQL timed out while preparing the conversations database",
      );
      await expect(ensureSchema(access)).rejects.not.toThrow("<html>");
    });

    it("normalizes thrown TinyCloud timeout HTML from migrations", async () => {
      access.dbHandle.migrations.apply.mockImplementation(async () => {
        throw new Error(
          "SQL batch failed: 524 - <!doctype html><html><body>A timeout occurred</body></html>",
        );
      });

      await expect(ensureSchema(access)).rejects.toThrow(
        "TinyCloud SQL timed out while preparing the conversations database",
      );
      await expect(ensureSchema(access)).rejects.not.toThrow("<!doctype html>");
    });
  });
});
