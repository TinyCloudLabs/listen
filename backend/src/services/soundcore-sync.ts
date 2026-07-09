import type { DelegatedAccess } from "@listen/server";
import { normalizeSoundcore } from "../adapters/soundcore.js";
import { conversationSql, ensureSchema } from "../schema.js";
import type { SoundcoreClient, SoundcoreNoteSummary } from "./soundcore-client.js";
import { persistConversation, updateConversationFromNormalized } from "./persist-conversation.js";

const SOUNDCORE_NOTE_TIMEOUT_MS = Number.parseInt(
  process.env.SOUNDCORE_NOTE_TIMEOUT_MS ?? "45000",
  10,
);

export interface SoundcoreSyncResult {
  synced: number;
  skipped: number;
  skippedNoTranscript: number;
  failed: number;
  errors: string[];
  conversations: Array<{ id: string; title: string; started_at: string | null }>;
}

export type SoundcoreSyncProgress =
  | { phase: "schema" }
  | { phase: "known"; known: number }
  | { phase: "listed"; total: number }
  | { phase: "note"; current: number; total: number; noteId: string; title: string }
  | { phase: "note-failed"; noteId: string; title: string; error: string }
  | { phase: "complete"; result: SoundcoreSyncResult };

interface KnownSoundcoreConversation {
  id: string;
  updatedAt: string | null;
}

async function withNoteTimeout<T>(
  promise: Promise<T>,
  noteId: string,
  timeoutMs: number,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Soundcore note ${noteId} timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function loadKnownSoundcoreSourceIds(
  sqlDb: Pick<ReturnType<typeof conversationSql>, "query">,
) {
  const result = await sqlDb.query(
    "SELECT id, source_id, updated_at FROM conversation WHERE source = 'soundcore_sync'",
  );
  const known = new Map<string, KnownSoundcoreConversation>();
  if (result.ok && result.data.rows) {
    for (const row of result.data.rows) {
      const id = Array.isArray(row) ? row[0] : (row as Record<string, unknown>).id;
      const sourceId = Array.isArray(row) ? row[1] : (row as Record<string, unknown>).source_id;
      const updatedAt = Array.isArray(row) ? row[2] : (row as Record<string, unknown>).updated_at;
      if (id && sourceId) {
        known.set(String(sourceId), {
          id: String(id),
          updatedAt: updatedAt == null ? null : String(updatedAt),
        });
      }
    }
  }
  return known;
}

function timestampMs(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    const ms = value > 1e12 ? value : value * 1000;
    return Number.isFinite(ms) ? ms : null;
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric > 1e12 ? numeric : numeric * 1000;

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function localUpdatedAtMs(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function shouldSyncSoundcoreSummary(
  summary: SoundcoreNoteSummary,
  known: KnownSoundcoreConversation,
): boolean {
  const remote = timestampMs(summary.updated_at);
  const local = localUpdatedAtMs(known.updatedAt);
  return remote != null && (local == null || remote > local);
}

export async function syncSoundcoreNotes({
  access,
  client,
  includeEmpty = false,
  mode = "incremental",
  onProgress,
  noteTimeoutMs = SOUNDCORE_NOTE_TIMEOUT_MS,
}: {
  access: DelegatedAccess;
  client: Pick<SoundcoreClient, "listNotes" | "getNote">;
  includeEmpty?: boolean;
  mode?: "incremental" | "full";
  onProgress?: (progress: SoundcoreSyncProgress) => void;
  noteTimeoutMs?: number;
}): Promise<SoundcoreSyncResult> {
  onProgress?.({ phase: "schema" });
  await ensureSchema(access);
  const sqlDb = conversationSql(access);
  const knownIds = await loadKnownSoundcoreSourceIds(sqlDb);
  onProgress?.({ phase: "known", known: knownIds.size });
  const notes = await client.listNotes();
  onProgress?.({ phase: "listed", total: notes.length });

  let synced = 0;
  let skipped = 0;
  let skippedNoTranscript = 0;
  let failed = 0;
  const errors: string[] = [];
  const conversations: SoundcoreSyncResult["conversations"] = [];

  for (const [index, summary] of notes.entries()) {
    onProgress?.({
      phase: "note",
      current: index + 1,
      total: notes.length,
      noteId: summary.note_id,
      title: summary.note_title,
    });
    const existing = knownIds.get(summary.note_id);
    if (existing && mode !== "full" && !shouldSyncSoundcoreSummary(summary, existing)) {
      skipped += 1;
      continue;
    }
    if (!includeEmpty && !summary.is_trans) {
      skippedNoTranscript += 1;
      continue;
    }

    try {
      const note = await withNoteTimeout(
        client.getNote(summary as SoundcoreNoteSummary),
        summary.note_id,
        noteTimeoutMs,
      );
      if (!includeEmpty && note.transcript.length === 0) {
        skippedNoTranscript += 1;
        continue;
      }

      const normalized = normalizeSoundcore(note);
      await withNoteTimeout(
        existing
          ? updateConversationFromNormalized(access, existing.id, normalized)
          : persistConversation(access, normalized),
        summary.note_id,
        noteTimeoutMs,
      );
      synced += 1;
      conversations.push({
        id: existing?.id ?? normalized.conversation.id,
        title: normalized.conversation.title ?? note.note_title,
        started_at: normalized.conversation.started_at,
      });
    } catch (err) {
      failed += 1;
      const error = err instanceof Error ? err.message : String(err);
      errors.push(`${summary.note_id}: ${error}`);
      onProgress?.({
        phase: "note-failed",
        noteId: summary.note_id,
        title: summary.note_title,
        error,
      });
    }
  }

  const result = { synced, skipped, skippedNoTranscript, failed, errors, conversations };
  onProgress?.({ phase: "complete", result });
  return result;
}
