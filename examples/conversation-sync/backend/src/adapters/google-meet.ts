import type { FullConference } from "../services/google-meet-client.js";
import type { NormalizeFn } from "./types.js";

// ── Google Meet → NormalizedConversation adapter ────────────────────

function resolveDisplayName(participant: FullConference["participants"][number]): string {
  return (
    participant.signedinUser?.displayName ??
    participant.anonymousUser?.displayName ??
    participant.phoneUser?.displayName ??
    "Unknown"
  );
}

export const normalizeGoogleMeet: NormalizeFn<FullConference> = (raw) => {
  const { conferenceRecord, participants, transcripts, entries } = raw;

  const startedAt = conferenceRecord.startTime;
  const endedAt = conferenceRecord.endTime ?? null;

  let durationSecs: number | null = null;
  if (endedAt) {
    durationSecs = Math.round(
      (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000,
    );
  }

  // Title fallback: "Google Meet — {date}"
  const dateStr = startedAt.slice(0, 10);
  const title = `Google Meet — ${dateStr}`;

  // Source URL: first transcript's docsDestination exportUri
  const sourceUrl = transcripts[0]?.docsDestination?.exportUri ?? null;

  // Transcript state from first transcript (if any)
  const transcriptState = transcripts[0]?.state ?? null;

  // Build participant lookup: resource name → displayName
  const participantNameLookup = new Map<string, string>();
  for (const p of participants) {
    participantNameLookup.set(p.name, resolveDisplayName(p));
  }

  // Map transcript entries
  const transcript = entries.map((entry) => ({
    text: entry.text,
    speaker_name: participantNameLookup.get(entry.participant) ?? "Unknown",
    start_time: entry.startTime,
    end_time: entry.endTime,
    language: entry.languageCode,
  }));

  return {
    conversation: {
      id: crypto.randomUUID(),
      title,
      source: "google-meet",
      source_id: conferenceRecord.name,
      source_url: sourceUrl,
      started_at: startedAt,
      ended_at: endedAt,
      duration_secs: durationSecs,
      summary: null,
      metadata: {
        space: conferenceRecord.space,
        transcriptState,
      },
    },
    participants: participants.map((p) => ({
      id: crypto.randomUUID(),
      name: resolveDisplayName(p),
      email: null,
      speaker_label: p.name.split("/").pop() ?? null,
    })),
    transcript,
  };
};
