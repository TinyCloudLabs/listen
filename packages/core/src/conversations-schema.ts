// ── Conversations SQL schema (shared browser + backend) ─────────────
//
// Single source of truth for the conversations SQL migrations. Both the
// backend `ensureSchema()` and the frontend's direct-read schema seeding
// import these constants so the two code paths stay byte-identical.

/** Migration namespace for the conversations SQL store. */
export const MIGRATION_NAMESPACE = "xyz.tinycloud.listen.conversations";

/**
 * TinyCloud's SQLite authorizer restricts CREATE INDEX, UNIQUE constraints,
 * and REFERENCES. Keep schema simple — PRIMARY KEY only.
 * Dedup is handled at the application level via pre-fetch source_id check.
 */
export const SCHEMA_STATEMENTS = [
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

export const COLUMN_MIGRATION_STATEMENTS = [
  `ALTER TABLE conversation ADD COLUMN transcript_json TEXT`,
  `ALTER TABLE conversation ADD COLUMN transcript_text TEXT`,
];

export const COLUMN_MIGRATION_ALREADY_APPLIED_STATEMENTS = [
  "UPDATE conversation SET id = id WHERE 1 = 0",
];

/**
 * Read-only probes that succeed only when every table and column the
 * migrations above create already exists. `LIMIT 0` keeps them free of row
 * data.
 */
export const SCHEMA_PROBE_STATEMENTS = [
  `SELECT id, title, source, source_id, source_url, started_at, ended_at, duration_secs, summary, metadata, created_at, updated_at, transcript_json, transcript_text
     FROM conversation LIMIT 0`,
  "SELECT id, conversation_id, name, email, speaker_label FROM participant LIMIT 0",
];

/**
 * Read-first schema check: true when the conversations schema is current, so
 * callers can skip migrations entirely. Opening Listen must not write, because
 * a full TinyCloud account refuses writes while reads keep working. Any failed
 * or thrown probe reports false and the caller migrates as before.
 */
export async function conversationSchemaIsCurrent(
  query: (sql: string) => Promise<unknown>,
): Promise<boolean> {
  const results = await Promise.all(
    SCHEMA_PROBE_STATEMENTS.map((sql) => query(sql).catch(() => null)),
  );
  return results.every((result) => (result as { ok?: unknown } | null)?.ok === true);
}
