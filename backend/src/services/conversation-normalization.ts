export interface NormalizedTranscriptSentence {
  index: number;
  speaker_id: string;
  speaker_name: string;
  text: string;
  start_time: number | null;
  end_time: number | null;
  language: string | null;
}

export const BASE64_AUDIO_STORAGE_ENCODING = "base64-string-kv";
const LISTEN_APP_KV_PREFIX = "xyz.tinycloud.listen/";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readStringField(value: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}

function readNumberField(value: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
    if (typeof candidate === "string" && candidate.trim() !== "") {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function slugify(value: string, fallbackIndex: number): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-") || `speaker-${fallbackIndex + 1}`;
}

function parseJsonObject(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseJsonValue(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeAppRelativeKvKey(key: string): string {
  return key.startsWith(LISTEN_APP_KV_PREFIX) ? key.slice(LISTEN_APP_KV_PREFIX.length) : key;
}

function transcriptCandidates(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return transcriptCandidates(parseJsonValue(value));
  if (!isRecord(value)) return null;

  for (const key of ["transcript", "sentences", "segments", "items"]) {
    const candidate = value[key];
    if (Array.isArray(candidate)) return candidate;
  }

  if (Array.isArray(value.data)) return value.data;
  if (typeof value.text === "string") return [value];
  return null;
}

function normalizeTranscriptEntry(
  entry: unknown,
  fallbackIndex: number,
): NormalizedTranscriptSentence | null {
  if (!isRecord(entry)) return null;

  const text = readStringField(entry, ["text", "raw_text", "rawText"]);
  if (!text) return null;

  const speakerName =
    readStringField(entry, ["speaker_name", "speakerName", "speaker", "name"]) ?? "Speaker";
  const speakerId =
    readStringField(entry, ["speaker_id", "speakerId", "speaker_label", "speakerLabel"]) ??
    slugify(speakerName, fallbackIndex);

  return {
    index: readNumberField(entry, ["index"]) ?? fallbackIndex,
    speaker_id: speakerId,
    speaker_name: speakerName,
    text,
    start_time: readNumberField(entry, ["start_time", "startTime", "start"]),
    end_time: readNumberField(entry, ["end_time", "endTime", "end"]),
    language: readStringField(entry, ["language", "languageCode"]),
  };
}

export function normalizeConversationMetadata(value: unknown): Record<string, unknown> {
  const metadata = isRecord(value)
    ? { ...value }
    : typeof value === "string"
      ? (parseJsonObject(value) ?? {})
      : {};

  const audioDataKey = readStringField(metadata, [
    "audio_data_kv_key",
    "audioDataKvKey",
    "audio_kv_key",
    "audioKvKey",
  ]);
  const audioMetadataKey = readStringField(metadata, [
    "audio_metadata_kv_key",
    "audioMetadataKvKey",
  ]);
  const audioPlaybackUrl = readStringField(metadata, ["audio_playback_url", "audioPlaybackUrl"]);
  const audioStorageEncoding = readStringField(metadata, [
    "audio_storage_encoding",
    "audioStorageEncoding",
  ]);

  const normalized = { ...metadata };
  if (audioDataKey) {
    const resolvedAudioKey = normalizeAppRelativeKvKey(audioDataKey);
    normalized.audio_data_kv_key = resolvedAudioKey;
    normalized.audio_kv_key = resolvedAudioKey;
  }
  if (audioMetadataKey) {
    normalized.audio_metadata_kv_key = normalizeAppRelativeKvKey(audioMetadataKey);
  }
  if (audioPlaybackUrl) {
    normalized.audio_playback_url = audioPlaybackUrl;
  }
  if (audioStorageEncoding) {
    normalized.audio_storage_encoding = audioStorageEncoding;
  }

  return normalized;
}

export function resolveAudioKey(metadata: Record<string, unknown>): string | null {
  const audioKey = readStringField(metadata, [
    "audio_data_kv_key",
    "audioDataKvKey",
    "audio_kv_key",
    "audioKvKey",
  ]);
  return audioKey ? normalizeAppRelativeKvKey(audioKey) : null;
}

export function isBase64AudioStorage(metadata: Record<string, unknown>): boolean {
  const encoding = readStringField(metadata, ["audio_storage_encoding", "audioStorageEncoding"]);
  return encoding === BASE64_AUDIO_STORAGE_ENCODING;
}

export function normalizeTranscript(value: unknown): NormalizedTranscriptSentence[] | null {
  const candidates = transcriptCandidates(value);
  if (candidates == null) return null;

  const transcript: NormalizedTranscriptSentence[] = [];
  for (const candidate of candidates) {
    const sentence = normalizeTranscriptEntry(candidate, transcript.length);
    if (sentence) transcript.push(sentence);
  }

  return transcript;
}
