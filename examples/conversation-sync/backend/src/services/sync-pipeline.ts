import type { DelegatedAccess } from "@tinyboilerplate/server";
import type { FirefliesClient } from "./fireflies-client.js";
import { normalizeFireflies } from "../adapters/fireflies.js";
import { persistConversation } from "./persist-conversation.js";

// ── Types ────────────────────────────────────────────────────────────

export interface SyncSingleResult {
  status: "created" | "skipped" | "error";
  meetingId: string;
  conversationId?: string;
  title?: string;
  startedAt?: string;
  error?: string;
}

// ── syncSingleTranscript ─────────────────────────────────────────────

export async function syncSingleTranscript(
  meetingId: string,
  access: DelegatedAccess,
  firefliesClient: Pick<FirefliesClient, "getTranscript">,
): Promise<SyncSingleResult> {
  try {
    // 1. Check if source_id already exists in SQL
    const dedupResult = await access.sql.query(
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

    // 3. Normalize
    const normalized = normalizeFireflies(fullTranscript);

    // 4. Persist conversation, participants, and transcript
    await persistConversation(access, normalized);

    return {
      status: "created",
      meetingId,
      conversationId: normalized.conversation.id,
      title: normalized.conversation.title ?? undefined,
      startedAt: normalized.conversation.started_at ?? undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: "error", meetingId, error: message };
  }
}
