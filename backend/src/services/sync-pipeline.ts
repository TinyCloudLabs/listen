import type { DelegatedAccess } from "@listen/server";
import type { FirefliesClient, FullTranscript } from "./fireflies-client.js";
import { normalizeFireflies } from "../adapters/fireflies.js";
import { persistConversation } from "./persist-conversation.js";
import { conversationSql } from "../schema.js";

// ── Types ────────────────────────────────────────────────────────────

export interface SyncSingleResult {
  status: "created" | "skipped" | "error";
  meetingId: string;
  conversationId?: string;
  title?: string;
  startedAt?: string;
  error?: string;
}

// ── persistFullTranscript ─────────────────────────────────────────────

/**
 * Normalize and persist a transcript that already has full content.
 * Used by the batch sync path where the list query returns full data —
 * no extra API call needed.
 */
export async function persistFullTranscript(
  transcript: FullTranscript,
  access: DelegatedAccess,
): Promise<SyncSingleResult> {
  try {
    const normalized = normalizeFireflies(transcript);
    await persistConversation(access, normalized);
    return {
      status: "created",
      meetingId: transcript.id,
      conversationId: normalized.conversation.id,
      title: normalized.conversation.title ?? undefined,
      startedAt: normalized.conversation.started_at ?? undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: "error", meetingId: transcript.id, error: message };
  }
}

// ── syncSingleTranscript ─────────────────────────────────────────────

/**
 * Sync a single transcript by fetching it via getTranscript(id).
 * Used by the webhook path which only has a meeting ID.
 * Callers that already have the full transcript should use persistFullTranscript.
 */
export async function syncSingleTranscript(
  meetingId: string,
  access: DelegatedAccess,
  firefliesClient: Pick<FirefliesClient, "getTranscript">,
): Promise<SyncSingleResult> {
  try {
    const sqlDb = conversationSql(access);

    // 1. Check if source_id already exists in SQL
    const dedupResult = await sqlDb.query(
      `SELECT source_id FROM conversation WHERE source = 'fireflies' AND source_id = ?`,
      [meetingId],
    );

    if (dedupResult.ok && dedupResult.data.rows) {
      for (const row of dedupResult.data.rows) {
        const val = Array.isArray(row) ? row[0] : (row as any).source_id;
        if (String(val) === meetingId) {
          return { status: "skipped", meetingId };
        }
      }
    }

    // 2. Fetch full transcript
    const fullTranscript = await firefliesClient.getTranscript(meetingId);

    // 3. Normalize + persist
    return persistFullTranscript(fullTranscript, access);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: "error", meetingId, error: message };
  }
}
