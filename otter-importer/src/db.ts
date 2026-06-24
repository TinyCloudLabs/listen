import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { OtterSpeech } from "./otter.ts";
import { speechStamp, speechStartEpoch } from "./otter.ts";

export interface SpeechRow {
  otid: string;
  title: string | null;
  start_epoch: number | null;
  duration_secs: number | null;
  has_photos: number;
  stamp: string;
  transcript_json: string | null;
  transcript_text: string | null;
  segment_count: number | null;
  conversation_id: string | null;
  status: string;
  error: string | null;
  scanned_at: string | null;
  pulled_at: string | null;
  published_at: string | null;
}

const TABLE_SQL = `CREATE TABLE IF NOT EXISTS otter_speech (
  otid            TEXT PRIMARY KEY,
  title           TEXT,
  start_epoch     INTEGER,
  duration_secs   REAL,
  has_photos      INTEGER NOT NULL DEFAULT 0,
  stamp           TEXT NOT NULL DEFAULT '',
  transcript_json TEXT,
  transcript_text TEXT,
  segment_count   INTEGER,
  conversation_id TEXT,
  status          TEXT NOT NULL,
  error           TEXT,
  scanned_at      TEXT,
  pulled_at       TEXT,
  published_at    TEXT
)`;

export class Store {
  private readonly db: Database;

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.run("PRAGMA journal_mode = WAL");
    this.db.run(TABLE_SQL);
  }

  close(): void {
    this.db.close();
  }

  /** Insert or refresh a scanned speech. Returns whether it is new, changed (needs re-pull), or unchanged. */
  upsertSpeech(sp: OtterSpeech): "created" | "changed" | "unchanged" {
    const existing = this.get(sp.otid);
    const stamp = speechStamp(sp);
    const meta = {
      title: sp.title ?? null,
      start_epoch: speechStartEpoch(sp),
      duration_secs: sp.duration ?? null,
      has_photos: sp.hasPhotos ? 1 : 0,
      stamp,
    };
    if (!existing) {
      this.db
        .query(
          `INSERT INTO otter_speech (otid, title, start_epoch, duration_secs, has_photos, stamp, status, scanned_at)
           VALUES ($otid, $title, $start_epoch, $duration_secs, $has_photos, $stamp, 'scanned', $now)`,
        )
        .run({ $otid: sp.otid, ...prefix(meta), $now: now() });
      return "created";
    }
    if (existing.stamp === stamp && existing.status !== "pull_failed") return "unchanged";
    this.db
      .query(
        `UPDATE otter_speech SET title=$title, start_epoch=$start_epoch, duration_secs=$duration_secs,
           has_photos=$has_photos, stamp=$stamp, status='scanned', error=NULL, scanned_at=$now WHERE otid=$otid`,
      )
      .run({ $otid: sp.otid, ...prefix(meta), $now: now() });
    return "changed";
  }

  savePull(
    otid: string,
    transcriptJson: string,
    transcriptText: string,
    segmentCount: number,
  ): void {
    this.db
      .query(
        `UPDATE otter_speech SET transcript_json=$json, transcript_text=$text, segment_count=$n,
           status='pulled', error=NULL, pulled_at=$now WHERE otid=$otid`,
      )
      .run({
        $otid: otid,
        $json: transcriptJson,
        $text: transcriptText,
        $n: segmentCount,
        $now: now(),
      });
  }

  markPullFailed(otid: string, error: string): void {
    this.db
      .query(`UPDATE otter_speech SET status='pull_failed', error=$e WHERE otid=$otid`)
      .run({ $otid: otid, $e: error });
  }

  markPublished(otid: string, conversationId: string): void {
    this.db
      .query(
        `UPDATE otter_speech SET status='published', conversation_id=$cid, error=NULL, published_at=$now WHERE otid=$otid`,
      )
      .run({ $otid: otid, $cid: conversationId, $now: now() });
  }

  markUploadFailed(otid: string, error: string): void {
    this.db
      .query(`UPDATE otter_speech SET status='upload_failed', error=$e WHERE otid=$otid`)
      .run({ $otid: otid, $e: error });
  }

  pendingPull(limit: number): SpeechRow[] {
    return this.db
      .query(
        `SELECT * FROM otter_speech WHERE status IN ('scanned','pull_failed') ORDER BY start_epoch DESC LIMIT $n`,
      )
      .all({ $n: limit }) as SpeechRow[];
  }

  pendingUpload(limit: number): SpeechRow[] {
    return this.db
      .query(
        `SELECT * FROM otter_speech WHERE status IN ('pulled','upload_failed') ORDER BY start_epoch DESC LIMIT $n`,
      )
      .all({ $n: limit }) as SpeechRow[];
  }

  get(otid: string): SpeechRow | null {
    return (
      (this.db
        .query(`SELECT * FROM otter_speech WHERE otid=$otid`)
        .get({ $otid: otid }) as SpeechRow) ?? null
    );
  }

  list(limit: number): SpeechRow[] {
    return this.db
      .query(`SELECT * FROM otter_speech ORDER BY start_epoch DESC LIMIT $n`)
      .all({ $n: limit }) as SpeechRow[];
  }

  counts(): Record<string, number> {
    const rows = this.db
      .query(`SELECT status, COUNT(*) as n FROM otter_speech GROUP BY status`)
      .all() as {
      status: string;
      n: number;
    }[];
    const out: Record<string, number> = { total: 0 };
    for (const r of rows) {
      out[r.status] = r.n;
      out.total += r.n;
    }
    return out;
  }
}

function prefix(meta: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(meta).map(([k, v]) => [`$${k}`, v]));
}

function now(): string {
  return new Date().toISOString();
}
