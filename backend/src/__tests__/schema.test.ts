import { describe, it, expect, beforeEach, mock } from "bun:test";

// ── Mock DelegatedAccess ─────────────────────────────────────────────

function createMockAccess() {
  return {
    sql: {
      execute: mock(async (_sql: string) => ({ ok: true })),
      query: mock(async () => ({ ok: true, data: { rows: [], columns: [] } })),
    },
    kv: {},
  } as any;
}

function mockSchemaMissing(access: ReturnType<typeof createMockAccess>) {
  let schemaCreated = false;
  access.sql.execute.mockImplementation(async () => {
    schemaCreated = true;
    return { ok: true };
  });
  access.sql.query.mockImplementation(async () =>
    schemaCreated
      ? { ok: true, data: { rows: [], columns: [] } }
      : { ok: false, error: { message: "no such table: conversation" } },
  );
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

    it("skips DDL when the conversation schema is already ready", async () => {
      await ensureSchema(access);

      expect(access.sql.execute.mock.calls.length).toBe(0);
      expect(access.sql.query.mock.calls.length).toBe(2);
    });

    it("executes CREATE TABLE for conversation table", async () => {
      mockSchemaMissing(access);
      await ensureSchema(access);

      const calls = access.sql.execute.mock.calls;
      const allSql = calls.map((c: any) => c[0]).join("\n");
      expect(allSql).toContain("CREATE TABLE IF NOT EXISTS conversation");
      expect(allSql).toContain("transcript_json TEXT");
      expect(allSql).toContain("transcript_text TEXT");
    });

    it("executes CREATE TABLE for participant table", async () => {
      mockSchemaMissing(access);
      await ensureSchema(access);

      const calls = access.sql.execute.mock.calls;
      const allSql = calls.map((c: any) => c[0]).join("\n");
      expect(allSql).toContain("CREATE TABLE IF NOT EXISTS participant");
    });

    it("executes exactly 2 CREATE TABLE statements", async () => {
      mockSchemaMissing(access);
      await ensureSchema(access);

      const calls = access.sql.execute.mock.calls;
      expect(calls.length).toBe(2);
      expect(calls[0][0]).toContain("CREATE TABLE IF NOT EXISTS conversation");
      expect(calls[1][0]).toContain("CREATE TABLE IF NOT EXISTS participant");
    });

    it("uses the named conversations database when a db handle is available", async () => {
      const dbHandle = {
        execute: mock(async (_sql: string) => ({ ok: true })),
        query: mock(async () => ({ ok: true, data: { rows: [], columns: [] } })),
      };
      access.sql.db = mock((name: string) => {
        expect(name).toBe(DATABASE_NAME);
        return dbHandle;
      });
      let schemaCreated = false;
      dbHandle.execute.mockImplementation(async () => {
        schemaCreated = true;
        return { ok: true };
      });
      dbHandle.query.mockImplementation(async () =>
        schemaCreated
          ? { ok: true, data: { rows: [], columns: [] } }
          : { ok: false, error: { message: "no such table: conversation" } },
      );

      expect(conversationSql(access)).toBe(dbHandle);
      await ensureSchema(access);

      expect(access.sql.db).toHaveBeenCalled();
      expect(dbHandle.execute.mock.calls.length).toBe(2);
      expect(access.sql.execute.mock.calls.length).toBe(0);
    });

    it("adds transcript columns when an existing conversation table is missing them", async () => {
      access.sql.query.mockImplementation(async (sql: string) => {
        if (sql.includes("transcript_json")) {
          return { ok: false, error: { message: "no such column: transcript_json" } };
        }
        return { ok: true, data: { rows: [], columns: [] } };
      });

      await ensureSchema(access);

      const allSql = access.sql.execute.mock.calls.map((c: any) => c[0]).join("\n");
      expect(allSql).toContain("ALTER TABLE conversation ADD COLUMN transcript_json TEXT");
      expect(allSql).toContain("ALTER TABLE conversation ADD COLUMN transcript_text TEXT");
    });

    it("no-ops on subsequent calls with the same access", async () => {
      mockSchemaMissing(access);
      await ensureSchema(access);
      const firstCallCount = access.sql.execute.mock.calls.length;

      await ensureSchema(access);
      expect(access.sql.execute.mock.calls.length).toBe(firstCallCount);
    });

    it("runs schema again for a different access object", async () => {
      mockSchemaMissing(access);
      await ensureSchema(access);

      const access2 = createMockAccess();
      mockSchemaMissing(access2);
      await ensureSchema(access2);

      expect(access2.sql.execute.mock.calls.length).toBeGreaterThan(0);
    });

    it("throws when sql.execute returns ok: false", async () => {
      access.sql.query.mockImplementation(async () => ({
        ok: false,
        error: { message: "no such table: conversation" },
      }));
      access.sql.execute.mockImplementation(async () => ({
        ok: false,
        error: { message: "DB unavailable" },
      }));

      expect(ensureSchema(access)).rejects.toThrow("Failed to initialize conversations schema");
    });

    it("does not leak Cloudflare timeout HTML in schema errors", async () => {
      access.sql.query.mockImplementation(async () => ({
        ok: false,
        error: { message: "no such table: conversation" },
      }));
      access.sql.execute.mockImplementation(async () => ({
        ok: false,
        error: {
          message:
            "SQL execute failed: 524 - <!DOCTYPE html><html><head><title>tinycloud.xyz | 524: A timeout occurred</title></head><body>Error code 524</body></html>",
        },
      }));

      await expect(ensureSchema(access)).rejects.toThrow(
        "TinyCloud SQL timed out while preparing the conversations database",
      );

      await expect(ensureSchema(access)).rejects.not.toThrow("<!DOCTYPE html>");
    });
  });
});
