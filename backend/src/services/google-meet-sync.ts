import type { DelegatedAccess } from "@listen/server";
import type { GoogleMeetClient, ConferenceRecord } from "./google-meet-client.js";
import { normalizeGoogleMeet } from "../adapters/google-meet.js";
import { persistConversation, updateConversationFromNormalized } from "./persist-conversation.js";
import { conversationSql } from "../schema.js";

// ── Types ────────────────────────────────────────────────────────────

export interface SyncSingleResult {
  status: "created" | "updated" | "skipped" | "error";
  conferenceRecordName: string;
  reason?: "already_exists" | "no_transcript";
  conversationId?: string;
  title?: string;
  startedAt?: string;
  error?: string;
}

// ── syncSingleConference ─────────────────────────────────────────────

export async function syncSingleConference(
  conferenceRecord: ConferenceRecord,
  access: DelegatedAccess,
  client: Pick<GoogleMeetClient, "getFullConference">,
  options: { refreshExisting?: boolean; existingConversationId?: string } = {},
): Promise<SyncSingleResult> {
  const conferenceRecordName = conferenceRecord.name;

  try {
    const sqlDb = conversationSql(access);

    // 1. Dedup check
    let existingConversationId = options.existingConversationId;
    const dedupResult = await sqlDb.query(
      `SELECT id, source_id FROM conversation WHERE source = 'google-meet' AND source_id = ?`,
      [conferenceRecordName],
    );

    if (dedupResult.ok && dedupResult.data.rows) {
      for (const row of dedupResult.data.rows) {
        const id = Array.isArray(row) ? row[0] : (row as any).id;
        const val = Array.isArray(row) ? row[1] : (row as any).source_id;
        if (String(val) === conferenceRecordName) {
          existingConversationId = id ? String(id) : existingConversationId;
          if (!options.refreshExisting) {
            return { status: "skipped", conferenceRecordName, reason: "already_exists" };
          }
          break;
        }
      }
    }

    // 2. Fetch full conference data
    const fullConference = await client.getFullConference(conferenceRecord);

    // 3. Skip if no transcript entries
    if (fullConference.entries.length === 0) {
      return { status: "skipped", conferenceRecordName, reason: "no_transcript" };
    }

    // 4. Normalize
    const normalized = normalizeGoogleMeet(fullConference);

    // 5. Persist
    if (existingConversationId) {
      await updateConversationFromNormalized(access, existingConversationId, normalized);
      return {
        status: "updated",
        conferenceRecordName,
        conversationId: existingConversationId,
        title: normalized.conversation.title ?? undefined,
        startedAt: normalized.conversation.started_at ?? undefined,
      };
    }

    await persistConversation(access, normalized);

    return {
      status: "created",
      conferenceRecordName,
      conversationId: normalized.conversation.id,
      title: normalized.conversation.title ?? undefined,
      startedAt: normalized.conversation.started_at ?? undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: "error", conferenceRecordName, error: message };
  }
}
