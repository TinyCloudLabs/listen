import type { NormalizedConversation } from "./types.js";
import type { OtterSpeech } from "../services/otter-client.js";
import { speechStartEpoch, speechStamp } from "../services/otter-client.js";
import { parseOtterTxt } from "../services/otter-transcript.js";

export function otterConversationId(otid: string): string {
  return `otter-${otid}`;
}

/** Normalize an Otter speech + its diarized export into a Listen conversation. */
export function normalizeOtter(speech: OtterSpeech, transcriptTxt: string): NormalizedConversation {
  const sentences = parseOtterTxt(transcriptTxt);
  const startEpoch = speechStartEpoch(speech);
  const startedAt = startEpoch != null ? new Date(startEpoch * 1000).toISOString() : null;
  const endedAt =
    startEpoch != null && speech.duration
      ? new Date((startEpoch + speech.duration) * 1000).toISOString()
      : null;

  const names = [...new Set(sentences.map((s) => s.speaker_name).filter(Boolean))];

  return {
    conversation: {
      id: otterConversationId(speech.otid),
      title: speech.title?.trim() || "Otter conversation",
      source: "otter",
      source_id: `otter:${speech.otid}`,
      source_url: `https://otter.ai/u/${speech.otid}`,
      started_at: startedAt,
      ended_at: endedAt,
      duration_secs: speech.duration ?? null,
      summary: null,
      metadata: {
        otid: speech.otid,
        has_photos: Boolean(speech.hasPhotos),
        segment_count: sentences.length,
        stamp: speechStamp(speech),
      },
    },
    participants: names.map((name, i) => ({
      id: `${otterConversationId(speech.otid)}-speaker-${i + 1}`,
      name,
      email: null,
      speaker_label: String(i + 1),
    })),
    transcript: sentences,
  };
}
