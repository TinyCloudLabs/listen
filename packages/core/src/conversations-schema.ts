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
