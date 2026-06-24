import type { AppConfig } from "./config.ts";
import { remoteKey } from "./config.ts";
import type { SpeechRow, Store } from "./db.ts";
import type { TranscriptSentence } from "./transcript.ts";
import { putKvString, sqlExecute, type TcOptions } from "./tc.ts";

const CONVERSATION_TABLE_SQL = `CREATE TABLE IF NOT EXISTS conversation (
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
)`;

const PARTICIPANT_TABLE_SQL = `CREATE TABLE IF NOT EXISTS participant (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  name            TEXT NOT NULL,
  email           TEXT,
  speaker_label   TEXT
)`;

export interface UploadResult {
  published: number;
  failed: number;
}

export function conversationIdFor(otid: string): string {
  return `otter-${otid}`;
}

export function uploadPending(
  config: AppConfig,
  store: Store,
  limit: number,
  options: TcOptions & { dryRun?: boolean },
): UploadResult {
  const rows = store.pendingUpload(limit);
  const result: UploadResult = { published: 0, failed: 0 };
  if (rows.length === 0) return result;

  const appOptions: TcOptions = { ...options, space: config.listenAppSpace };
  if (!options.dryRun) {
    sqlExecute(config.listenSqlDb, CONVERSATION_TABLE_SQL, [], appOptions);
    sqlExecute(config.listenSqlDb, PARTICIPANT_TABLE_SQL, [], appOptions);
  }

  for (const row of rows) {
    try {
      const conversationId = publishConversation(config, row, appOptions, Boolean(options.dryRun));
      if (!options.dryRun) store.markPublished(row.otid, conversationId);
      result.published += 1;
    } catch (err) {
      result.failed += 1;
      if (!options.dryRun)
        store.markUploadFailed(row.otid, err instanceof Error ? err.message : String(err));
    }
  }
  return result;
}

function publishConversation(
  config: AppConfig,
  row: SpeechRow,
  appOptions: TcOptions,
  dryRun: boolean,
): string {
  const conversationId = conversationIdFor(row.otid);
  const sentences = JSON.parse(row.transcript_json ?? "[]") as TranscriptSentence[];
  const now = new Date().toISOString();
  const startedAt = row.start_epoch ? new Date(row.start_epoch * 1000).toISOString() : null;
  const endedAt =
    startedAt && row.duration_secs
      ? new Date((row.start_epoch! + row.duration_secs) * 1000).toISOString()
      : null;
  const transcriptKvKey = remoteKey(config, `transcript/${conversationId}`);
  const metadata = {
    importer: "otter-importer",
    source: "otter",
    otid: row.otid,
    has_photos: Boolean(row.has_photos),
    segment_count: row.segment_count,
    stamp: row.stamp,
    transcript_kv_key: transcriptKvKey,
  };

  if (dryRun) return conversationId;

  putKvString(transcriptKvKey, `${JSON.stringify(sentences, null, 2)}\n`, appOptions);
  sqlExecute(
    config.listenSqlDb,
    `INSERT OR REPLACE INTO conversation (
      id, title, source, source_id, source_url, started_at, ended_at, duration_secs,
      summary, metadata, transcript_json, transcript_text, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      conversationId,
      row.title?.trim() || "Otter conversation",
      "otter",
      `otter:${row.otid}`,
      `https://otter.ai/u/${row.otid}`,
      startedAt,
      endedAt,
      row.duration_secs,
      null,
      JSON.stringify(metadata),
      JSON.stringify(sentences),
      row.transcript_text ?? "",
      now,
      now,
    ],
    appOptions,
  );
  insertParticipants(config, conversationId, sentences, appOptions);
  return conversationId;
}

function insertParticipants(
  config: AppConfig,
  conversationId: string,
  sentences: TranscriptSentence[],
  appOptions: TcOptions,
): void {
  const names = [...new Set(sentences.map((s) => s.speaker_name).filter(Boolean))];
  sqlExecute(
    config.listenSqlDb,
    `DELETE FROM participant WHERE conversation_id = ?`,
    [conversationId],
    appOptions,
  );
  names.forEach((name, i) => {
    sqlExecute(
      config.listenSqlDb,
      `INSERT OR REPLACE INTO participant (id, conversation_id, name, email, speaker_label)
       VALUES (?, ?, ?, ?, ?)`,
      [`${conversationId}-speaker-${i + 1}`, conversationId, name, null, String(i + 1)],
      appOptions,
    );
  });
}
