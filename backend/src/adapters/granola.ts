import type { GranolaNote } from "../services/granola-client.js";
import type { NormalizeFn } from "./types.js";

type GranolaTranscriptItem = NonNullable<GranolaNote["transcript"]>[number];

function speakerLabel(item: GranolaTranscriptItem): string {
  return item.speaker?.diarization_label ?? item.speaker?.source ?? "Unknown";
}

export const normalizeGranola: NormalizeFn<GranolaNote> = (raw) => {
  const startedAt = raw.calendar_event?.scheduled_start_time ?? raw.created_at ?? null;
  const endedAt = raw.calendar_event?.scheduled_end_time ?? null;
  const durationSecs =
    startedAt && endedAt
      ? Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000)
      : null;
  const title = raw.title ?? raw.calendar_event?.event_title ?? "Granola note";
  const transcript = (raw.transcript ?? []).map((item, index) => ({
    index,
    speaker_name: speakerLabel(item),
    speaker_source: item.speaker?.source ?? null,
    speaker_label: item.speaker?.diarization_label ?? null,
    text: item.text,
    start_time: item.start_time ?? null,
    end_time: item.end_time ?? null,
  }));

  const participantByKey = new Map<string, { name: string; email: string | null }>();
  for (const attendee of raw.attendees ?? []) {
    const name = attendee.name ?? attendee.email ?? "Unknown";
    const key = attendee.email ?? name;
    participantByKey.set(key, { name, email: attendee.email ?? null });
  }
  for (const item of transcript) {
    if (!participantByKey.has(item.speaker_name)) {
      participantByKey.set(item.speaker_name, {
        name: item.speaker_name,
        email: null,
      });
    }
  }

  return {
    conversation: {
      id: crypto.randomUUID(),
      title,
      source: "granola",
      source_id: raw.id,
      source_url: raw.web_url ?? null,
      started_at: startedAt,
      ended_at: endedAt,
      duration_secs: durationSecs,
      summary: raw.summary_markdown ?? raw.summary_text ?? null,
      metadata: {
        owner: raw.owner ?? null,
        calendar_event: raw.calendar_event ?? null,
        folders: raw.folder_membership ?? [],
        summary_text: raw.summary_text ?? null,
        updated_at: raw.updated_at,
      },
    },
    participants: [...participantByKey.values()].map((participant) => ({
      id: crypto.randomUUID(),
      name: participant.name,
      email: participant.email,
      speaker_label: participant.name,
    })),
    transcript,
  };
};
