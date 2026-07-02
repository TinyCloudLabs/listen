// Plain-text transcript parsing shared by the backend import route and the
// browser (live parse preview). Accepts VTT cue blocks, "[hh:mm:ss] Speaker:
// text", "Speaker: text", and bare lines; falls back to a single-speaker
// sentence when nothing is recognizable.

export interface ParsedTranscriptSentence {
  index: number;
  speaker_id: string;
  speaker_name: string;
  text: string;
  start_time: number;
  end_time: number;
}

export interface ParsedTranscript {
  transcript: ParsedTranscriptSentence[];
  speakers: string[];
}

export function parseTimestamp(value: string): number | null {
  const parts = value.split(":").map((part) => Number(part.replace(",", ".")));
  if (parts.some((part) => Number.isNaN(part))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

export function estimateDuration(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(4, Math.ceil(words / 2.5));
}

export function parseTranscriptText(
  transcriptText: string,
  participantNames: string[],
): ParsedTranscript {
  const transcript: ParsedTranscriptSentence[] = [];
  let pendingStart: number | null = null;

  for (const rawLine of transcriptText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line === "WEBVTT" || /^\d+$/.test(line)) continue;

    const rangeMatch = line.match(
      /^(\d{1,2}:\d{2}(?::\d{2})?(?:[,.]\d+)?)\s+-->\s+(\d{1,2}:\d{2}(?::\d{2})?(?:[,.]\d+)?)/,
    );
    if (rangeMatch) {
      pendingStart = parseTimestamp(rangeMatch[1]);
      continue;
    }

    const voiceMatch = line.match(/^<v\s+([^>]+)>(.+)$/i);
    const timedSpeakerMatch = line.match(
      /^\[?(\d{1,2}:\d{2}(?::\d{2})?(?:[,.]\d+)?)\]?\s+([^:]{1,80}):\s+(.+)$/,
    );
    const speakerMatch = line.match(/^([^:]{1,80}):\s+(.+)$/);

    let speakerName = participantNames[0] ?? "Speaker";
    let text = line;
    let startTime = pendingStart ?? transcript.length * 15;

    if (voiceMatch) {
      speakerName = voiceMatch[1].trim();
      text = voiceMatch[2].trim();
    } else if (timedSpeakerMatch) {
      startTime = parseTimestamp(timedSpeakerMatch[1]) ?? startTime;
      speakerName = timedSpeakerMatch[2].trim();
      text = timedSpeakerMatch[3].trim();
    } else if (speakerMatch) {
      speakerName = speakerMatch[1].trim();
      text = speakerMatch[2].trim();
    }

    pendingStart = null;
    if (!text) continue;

    transcript.push({
      index: transcript.length,
      speaker_id: speakerName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "speaker",
      speaker_name: speakerName,
      text,
      start_time: startTime,
      end_time: startTime + estimateDuration(text),
    });
  }

  if (transcript.length === 0) {
    const text = transcriptText.trim();
    transcript.push({
      index: 0,
      speaker_id: "speaker",
      speaker_name: participantNames[0] ?? "Speaker",
      text,
      start_time: 0,
      end_time: estimateDuration(text),
    });
  }

  const speakers = Array.from(
    new Set([...participantNames, ...transcript.map((line) => line.speaker_name)]),
  );
  return { transcript, speakers };
}

export interface TranscriptParsePreview {
  speakers: string[];
  lineCount: number;
  durationSecs: number;
  hasTimestamps: boolean;
}

// Lightweight summary of how a paste will import — for showing the user
// before they submit, not for persistence.
export function previewTranscriptParse(
  transcriptText: string,
  participantNames: string[] = [],
): TranscriptParsePreview {
  const { transcript, speakers } = parseTranscriptText(transcriptText, participantNames);
  return {
    speakers,
    lineCount: transcript.length,
    durationSecs: Math.max(...transcript.map((line) => line.end_time)),
    hasTimestamps: transcript.some((line, i) => line.start_time !== i * 15),
  };
}
