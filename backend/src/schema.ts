import type { DelegatedAccess } from "@listen/server";
import { resolveAppPath } from "./manifest.js";

/** Database name for the conversations SQL store. */
export const DATABASE_NAME = resolveAppPath("conversations", "tinycloud.sql");

type ConversationSql = Pick<DelegatedAccess["sql"], "query" | "execute">;

/**
 * Conversation data lives in its own TinyCloud SQL database. The SDK's
 * `access.sql.query/execute` shortcuts target the SDK default database
 * named "default", so backend routes must go through this helper.
 */
export function conversationSql(access: DelegatedAccess): ConversationSql {
  const sql = access.sql as DelegatedAccess["sql"] & {
    db?: (name: string) => ConversationSql;
  };

  return typeof sql.db === "function" ? sql.db(DATABASE_NAME) : sql;
}

/**
 * SQL statements to initialize the conversations schema.
 * Each statement is executed separately since TinyCloud SQL
 * handles one statement per execute() call.
 */
/**
 * TinyCloud's SQLite authorizer restricts CREATE INDEX, UNIQUE constraints,
 * and REFERENCES. Keep schema simple — PRIMARY KEY only.
 * Dedup is handled at the application level via pre-fetch source_id check.
 */
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS conversation (
    id              TEXT PRIMARY KEY,
    title           TEXT,
    source          TEXT NOT NULL,
    source_id       TEXT,
    source_url      TEXT,
    started_at      TEXT,
    ended_at        TEXT,
    duration_secs   REAL,
    summary         TEXT,
    metadata        TEXT,
    transcript_json TEXT,
    transcript_text TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS participant (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    name            TEXT NOT NULL,
    email           TEXT,
    speaker_label   TEXT
  )`,
];

const COLUMN_MIGRATION_STATEMENTS = [
  `ALTER TABLE conversation ADD COLUMN transcript_json TEXT`,
  `ALTER TABLE conversation ADD COLUMN transcript_text TEXT`,
];

/**
 * Track schema initialization per DelegatedAccess instance.
 * WeakMap ensures cleanup when the access object is GC'd.
 */
const schemaInitialized = new WeakMap<object, boolean>();

/**
 * Ensure the conversations schema exists. Runs CREATE TABLE/INDEX
 * statements at most once per DelegatedAccess instance.
 */
export async function ensureSchema(access: DelegatedAccess): Promise<void> {
  if (schemaInitialized.has(access)) return;

  const sqlDb = conversationSql(access);

  for (const sql of SCHEMA_STATEMENTS) {
    const result = await sqlDb.execute(sql);
    if (!result.ok) {
      const msg = (result as any).error?.message ?? "unknown error";
      // If table already exists, that's fine — skip
      if (msg.includes("already exists")) {
        console.log(`[schema] Table already exists, skipping: ${msg}`);
        continue;
      }
      // "not authorized" on CREATE TABLE IF NOT EXISTS likely means
      // the table already exists and the authorizer blocks redundant DDL.
      if (msg.includes("not authorized")) {
        const check = await sqlDb.query("SELECT 1 FROM conversation LIMIT 1");
        if (check.ok) {
          console.log("[schema] Tables exist (verified via SELECT), skipping DDL");
          continue;
        }
      }
      throw new Error(`Failed to initialize conversations schema: ${msg}`);
    }
  }

  const columnCheck = await sqlDb.query(
    "SELECT transcript_json, transcript_text FROM conversation LIMIT 1",
  );
  if (!columnCheck.ok) {
    for (const sql of COLUMN_MIGRATION_STATEMENTS) {
      const result = await sqlDb.execute(sql);
      if (!result.ok) {
        const msg = (result as any).error?.message ?? "unknown error";
        if (msg.includes("duplicate column") || msg.includes("already exists")) {
          continue;
        }
        throw new Error(`Failed to update conversations schema: ${msg}`);
      }
    }
  }

  schemaInitialized.set(access, true);
}
