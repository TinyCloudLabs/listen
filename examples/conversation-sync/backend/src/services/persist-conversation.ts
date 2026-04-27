import type { DelegatedAccess } from "@tinyboilerplate/server";
import type { NormalizedConversation } from "../adapters/types.js";
import { conversationSql } from "../schema.js";

/**
 * Persist a normalized conversation to SQL + KV.
 * Inserts conversation row, participant rows, and writes transcript blob.
 */
export async function persistConversation(
  access: DelegatedAccess,
  normalized: NormalizedConversation,
): Promise<void> {
  const sqlDb = conversationSql(access);

  // 1. INSERT conversation row
  const now = new Date().toISOString();
  const metadataJson = JSON.stringify(normalized.conversation.metadata);

  await sqlDb.execute(
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

  // 2. INSERT participant rows
  for (const participant of normalized.participants) {
    await sqlDb.execute(
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

  // 3. Write transcript blob to KV
  const kvKey = `transcript/${normalized.conversation.id}`;
  const transcriptJson = JSON.stringify(normalized.transcript);
  await access.kv.put(kvKey, transcriptJson);
}
