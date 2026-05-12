import type { DelegatedAccess } from "@listen/server";
import type { GoogleMeetClient, ConferenceRecord } from "./google-meet-client.js";
import { normalizeGoogleMeet } from "../adapters/google-meet.js";
import { persistConversation } from "./persist-conversation.js";
import { conversationSql } from "../schema.js";

// ── Types ────────────────────────────────────────────────────────────

export interface SyncSingleResult {
  status: "created" | "skipped" | "error";
  conferenceRecordName: string;
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
): Promise<SyncSingleResult> {
  const conferenceRecordName = conferenceRecord.name;

  try {
    const sqlDb = conversationSql(access);

    // 1. Dedup check
    const dedupResult = await sqlDb.query(
      `SELECT source_id FROM conversation WHERE source = 'google-meet' AND source_id = ?`,
      [conferenceRecordName],
    );

    if (dedupResult.ok && dedupResult.data.rows) {
      for (const row of dedupResult.data.rows) {
        const val = Array.isArray(row) ? row[0] : (row as any).source_id;
        if (String(val) === conferenceRecordName) {
          return { status: "skipped", conferenceRecordName };
        }
      }
    }

    // 2. Fetch full conference data
    const fullConference = await client.getFullConference(conferenceRecord);

    // 3. Skip if no transcript entries
    if (fullConference.entries.length === 0) {
      return { status: "skipped", conferenceRecordName };
    }

    // 4. Normalize
    const normalized = normalizeGoogleMeet(fullConference);

    // 5. Persist
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
