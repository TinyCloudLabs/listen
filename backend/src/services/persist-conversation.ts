import type { DelegatedAccess } from "@listen/server";
import type { NormalizedConversation } from "../adapters/types.js";
import { resolveAppPath } from "../manifest.js";
import { conversationSql } from "../schema.js";
import {
  type NormalizedTranscriptSentence,
  normalizeConversationMetadata,
  normalizeTranscript,
} from "./conversation-normalization.js";

export async function persistTranscriptBlob(
  access: DelegatedAccess,
  conversationId: string,
  transcript: unknown,
): Promise<void> {
  const kvKey = resolveAppPath(`transcript/${conversationId}`);
  const transcriptJson = transcriptJsonForStorage(transcript);
  await access.kv.put(kvKey, transcriptJson);
}

export function transcriptJsonForStorage(transcript: unknown): string {
  return JSON.stringify(normalizedTranscriptForStorage(transcript));
}

function normalizedTranscriptForStorage(transcript: unknown): NormalizedTranscriptSentence[] {
  return normalizeTranscript(transcript) ?? [];
}

function formatTranscriptTimestamp(value: number | null): string | null {
  if (value == null || !Number.isFinite(value)) return null;

  const totalSeconds = Math.max(0, Math.floor(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function transcriptTextForStorage(transcript: unknown): string {
  return normalizedTranscriptForStorage(transcript)
    .map((line) => {
      const timestamp = formatTranscriptTimestamp(line.start_time);
      const prefix = timestamp ? `[${timestamp}] ` : "";
      return `${prefix}${line.speaker_name}: ${line.text}`;
    })
    .join("\n");
}

export function transcriptFieldsForStorage(transcript: unknown): {
  transcriptJson: string;
  transcriptText: string;
} {
  const normalized = normalizedTranscriptForStorage(transcript);
  return {
    transcriptJson: JSON.stringify(normalized),
    transcriptText: normalized
      .map((line) => {
        const timestamp = formatTranscriptTimestamp(line.start_time);
        const prefix = timestamp ? `[${timestamp}] ` : "";
        return `${prefix}${line.speaker_name}: ${line.text}`;
      })
      .join("\n"),
  };
}

export async function updateConversationTranscriptFields(
  access: DelegatedAccess,
  conversationId: string,
  transcript: unknown,
): Promise<void> {
  const sqlDb = conversationSql(access);
  const { transcriptJson, transcriptText } = transcriptFieldsForStorage(transcript);

  await sqlDb.execute(
    `UPDATE conversation SET transcript_json = ?, transcript_text = ?, updated_at = ? WHERE id = ?`,
    [transcriptJson, transcriptText, new Date().toISOString(), conversationId],
  );
}

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
  const metadataJson = JSON.stringify(
    normalizeConversationMetadata(normalized.conversation.metadata),
  );
  const { transcriptJson, transcriptText } = transcriptFieldsForStorage(normalized.transcript);

  await sqlDb.execute(
    `INSERT INTO conversation (id, title, source, source_id, source_url, started_at, ended_at, duration_secs, summary, metadata, transcript_json, transcript_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      transcriptJson,
      transcriptText,
      now,
      now,
    ],
  );

  // 2. INSERT participant rows
  if (normalized.participants.length > 0) {
    const placeholders = normalized.participants.map(() => "(?, ?, ?, ?, ?)").join(", ");
    const params = normalized.participants.flatMap((participant) => [
      participant.id,
      normalized.conversation.id,
      participant.name,
      participant.email,
      participant.speaker_label,
    ]);

    await sqlDb.execute(
      `INSERT INTO participant (id, conversation_id, name, email, speaker_label) VALUES ${placeholders}`,
      params,
    );
  }

  // 3. Write transcript to SQL, with KV retained as a compatibility mirror
  await persistTranscriptBlob(access, normalized.conversation.id, normalized.transcript);
}
