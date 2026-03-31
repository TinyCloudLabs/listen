import type { DelegatedAccess } from "@tinyboilerplate/server";
import type { FirefliesClient } from "./fireflies-client.js";
import { normalizeFireflies } from "../adapters/fireflies.js";

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

    // 4. INSERT conversation row
    const now = new Date().toISOString();
    const metadataJson = JSON.stringify(normalized.conversation.metadata);

    await access.sql.execute(
      `INSERT INTO conversation (id, title, source, source_id, source_url, started_at, ended_at, duration_secs, summary, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        normalized.conversation.id,
        normalized.conversation.title,
        normalized.conversation.source,
        normalized.conversation.source_id,
        normalized.conversation.source_url,
        normalized.conversation.started_at,
        normalized.conversation.ended_at,
        normalized.conversation.duration_secs,
        normalized.conversation.summary,
        metadataJson,
        now,
        now,
      ],
    );

    // 5. INSERT participant rows
    for (const participant of normalized.participants) {
      await access.sql.execute(
        `INSERT INTO participant (id, conversation_id, name, email, speaker_label) VALUES (?, ?, ?, ?, ?)`,
        [
          participant.id,
          normalized.conversation.id,
          participant.name,
          participant.email,
          participant.speaker_label,
        ],
      );
    }

    // 6. Write transcript blob to KV
    const kvKey = `/app.conversations/transcript/${normalized.conversation.id}`;
    const transcriptJson = JSON.stringify(normalized.transcript);
    await access.kv.put(kvKey, transcriptJson);

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
