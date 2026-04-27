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

// ── Tests ────────────────────────────────────────────────────────────

import { conversationSql, ensureSchema, DATABASE_NAME } from "../schema.js";

describe("schema", () => {
  describe("DATABASE_NAME", () => {
    it("exports the manifest-prefixed conversations database name", () => {
      expect(DATABASE_NAME).toBe("com.tinycloud.conversation-sync/conversations");
    });
  });

  describe("ensureSchema()", () => {
    let access: ReturnType<typeof createMockAccess>;

    beforeEach(() => {
      access = createMockAccess();
    });

    it("executes CREATE TABLE for conversation table", async () => {
      await ensureSchema(access);

      const calls = access.sql.execute.mock.calls;
      const allSql = calls.map((c: any) => c[0]).join("\n");
      expect(allSql).toContain("CREATE TABLE IF NOT EXISTS conversation");
    });

    it("executes CREATE TABLE for participant table", async () => {
      await ensureSchema(access);

      const calls = access.sql.execute.mock.calls;
      const allSql = calls.map((c: any) => c[0]).join("\n");
      expect(allSql).toContain("CREATE TABLE IF NOT EXISTS participant");
    });

    it("executes exactly 2 CREATE TABLE statements", async () => {
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

      expect(conversationSql(access)).toBe(dbHandle);
      await ensureSchema(access);

      expect(access.sql.db).toHaveBeenCalled();
      expect(dbHandle.execute.mock.calls.length).toBe(2);
      expect(access.sql.execute.mock.calls.length).toBe(0);
    });

    it("no-ops on subsequent calls with the same access", async () => {
      await ensureSchema(access);
      const firstCallCount = access.sql.execute.mock.calls.length;

      await ensureSchema(access);
      expect(access.sql.execute.mock.calls.length).toBe(firstCallCount);
    });

    it("runs schema again for a different access object", async () => {
      await ensureSchema(access);

      const access2 = createMockAccess();
      await ensureSchema(access2);

      expect(access2.sql.execute.mock.calls.length).toBeGreaterThan(0);
    });

    it("throws when sql.execute returns ok: false", async () => {
      access.sql.execute.mockImplementation(async () => ({
        ok: false,
        error: { message: "DB unavailable" },
      }));

      expect(ensureSchema(access)).rejects.toThrow("Failed to initialize conversations schema");
    });
  });
});
