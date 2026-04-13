import type { DelegatedAccess } from "@tinyboilerplate/server";

/** Database name for the conversations SQL store. */
export const DATABASE_NAME = "conversations";

/**
 * SQL statements to initialize the conversations schema.
 * Each statement is executed separately since TinyCloud SQL
 * handles one statement per execute() call.
 */
/**
 * TinyCloud's SQLite authorizer restricts CREATE INDEX, UNIQUE constraints,
 * and REFERENCES. Keep schema simple — PRIMARY KEY only (like react-express items table).
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
  `CREATE TABLE IF NOT EXISTS agent (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    system_prompt   TEXT,
    model           TEXT,
    archived        INTEGER NOT NULL DEFAULT 0,
    session_id      TEXT,
    last_message_at TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS agent_message (
    id              TEXT PRIMARY KEY,
    agent_id        TEXT NOT NULL,
    role            TEXT NOT NULL,
    content         TEXT NOT NULL,
    tool_calls      TEXT,
    type            TEXT,
    metadata        TEXT,
    input_tokens    INTEGER,
    output_tokens   INTEGER,
    duration_ms     INTEGER,
    created_at      TEXT NOT NULL
  )`,
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

  for (const sql of SCHEMA_STATEMENTS) {
    const result = await access.sql.execute(sql);
    if (!result.ok) {
      const msg = (result as any).error?.message ?? "unknown error";
      // If table already exists, that's fine — skip
      if (msg.includes("already exists")) {
        console.log(`[schema] Table already exists, skipping: ${msg}`);
        continue;
      }
      // "not authorized" on CREATE TABLE IF NOT EXISTS likely means
      // the table already exists and the authorizer blocks redundant DDL.
      // Verify by extracting the target table name and running a SELECT.
      if (msg.includes("not authorized")) {
        const match = sql.match(/CREATE TABLE IF NOT EXISTS\s+(\w+)/i);
        const tableName = match?.[1];
        if (tableName) {
          const check = await access.sql.query(`SELECT 1 FROM ${tableName} LIMIT 1`);
          if (check.ok) {
            console.log(`[schema] Table ${tableName} exists (verified via SELECT), skipping DDL`);
            continue;
          }
        }
      }
      throw new Error(`Failed to initialize conversations schema: ${msg}`);
    }
  }

  schemaInitialized.set(access, true);
}
