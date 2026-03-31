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
      // the table already exists and the authorizer blocks redundant DDL
      if (msg.includes("not authorized")) {
        // Verify by trying a SELECT — if it works, table exists
        const check = await access.sql.query("SELECT 1 FROM conversation LIMIT 1");
        if (check.ok) {
          console.log("[schema] Tables exist (verified via SELECT), skipping DDL");
          schemaInitialized.set(access, true);
          return;
        }
      }
      throw new Error(`Failed to initialize conversations schema: ${msg}`);
    }
  }

  schemaInitialized.set(access, true);
}
