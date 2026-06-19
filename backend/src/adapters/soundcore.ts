import type { SoundcoreNote } from "../services/soundcore-client.js";
import type { NormalizeFn } from "./types.js";

function timestampFromNote(note: SoundcoreNote): string | null {
  let seconds = Number(note.app_note_id);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    const updated = Number(note.updated_at);
    if (Number.isFinite(updated) && updated > 0)
      seconds = updated > 1e12 ? updated / 1000 : updated;
  }
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  if (seconds > 1e12) seconds = Math.floor(seconds / 1000);
  return new Date(seconds * 1000).toISOString();
}

function summaryText(note: SoundcoreNote): string | null {
  const parts = [note.summary?.content, note.summary?.one_page_summary]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join("\n\n") : null;
}

export const normalizeSoundcore: NormalizeFn<SoundcoreNote> = (raw) => {
  const startedAt = timestampFromNote(raw);
  const durationSecs = Number.isFinite(raw.audio_duration)
    ? Math.max(0, Math.round(raw.audio_duration / 1000))
    : null;
  const endedAt =
    startedAt && durationSecs != null
      ? new Date(new Date(startedAt).getTime() + durationSecs * 1000).toISOString()
      : null;

  const transcript = raw.transcript.map((segment, index) => ({
    index,
    speaker_name: segment.speaker?.trim() || "Speaker",
    speaker_label: segment.speaker?.trim() || "Speaker",
    text: segment.content?.trim() ?? "",
    start_time: Number.isFinite(segment.start_time) ? segment.start_time / 1000 : null,
    end_time: Number.isFinite(segment.end_time) ? segment.end_time / 1000 : null,
  }));

  const participants = Array.from(new Set(transcript.map((item) => item.speaker_name))).map(
    (speaker) => ({
      id: crypto.randomUUID(),
      name: speaker,
      email: null,
      speaker_label: speaker,
    }),
  );

  return {
    conversation: {
      id: crypto.randomUUID(),
      title: raw.note_title || "Soundcore note",
      source: "soundcore_sync",
      source_id: raw.note_id,
      source_url: null,
      started_at: startedAt,
      ended_at: endedAt,
      duration_secs: durationSecs,
      summary: summaryText(raw),
      metadata: {
        source_app: "Soundcore",
        source_adapter: "listen-backend",
        app_note_id: raw.app_note_id,
        updated_at: raw.updated_at,
        has_transcript: raw.is_trans,
        has_summary: raw.is_summary,
        empty_transcript: transcript.length === 0,
      },
    },
    participants,
    transcript,
  };
};
