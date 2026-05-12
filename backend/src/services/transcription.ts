export type TranscriptionProviderName = "assemblyai" | "deepgram";

export interface TranscriptionInput {
  audio: Uint8Array;
  contentType: string;
  fileName: string;
}

export interface TranscribedUtterance {
  speaker: string;
  text: string;
  start: number;
  end: number;
}

export interface TranscriptionResult {
  sourceId: string;
  text: string;
  durationSecs: number | null;
  utterances: TranscribedUtterance[];
  raw: unknown;
}

export interface TranscriptionProvider {
  transcribe(input: TranscriptionInput, apiKey: string): Promise<TranscriptionResult>;
}

const ASSEMBLYAI_BASE_URL = "https://api.assemblyai.com";
const DEEPGRAM_BASE_URL = "https://api.deepgram.com/v1";
const POLL_DELAY_MS = 2_000;
const POLL_TIMEOUT_MS = 5 * 60_000;

export const TRANSCRIPTION_SECRET_NAMES: Record<TranscriptionProviderName, string> = {
  assemblyai: "ASSEMBLYAI_API_KEY",
  deepgram: "DEEPGRAM_API_KEY",
};

export function parseTranscriptionProvider(value: unknown): TranscriptionProviderName {
  if (value === "assemblyai" || value === "deepgram") return value;
  throw new Error("provider must be assemblyai or deepgram");
}

export function createTranscriptionProvider(
  provider: TranscriptionProviderName,
): TranscriptionProvider {
  return provider === "assemblyai" ? new AssemblyAIProvider() : new DeepgramProvider();
}

class AssemblyAIProvider implements TranscriptionProvider {
  async transcribe(input: TranscriptionInput, apiKey: string): Promise<TranscriptionResult> {
    const uploadRes = await fetch(`${ASSEMBLYAI_BASE_URL}/v2/upload`, {
      method: "POST",
      headers: { authorization: apiKey, "content-type": input.contentType },
      body: Buffer.from(input.audio),
    });
    if (!uploadRes.ok) throw new Error(`AssemblyAI upload failed: ${uploadRes.status}`);
    const upload = (await uploadRes.json()) as { upload_url?: string };
    if (!upload.upload_url) throw new Error("AssemblyAI upload did not return an upload_url");

    const transcriptRes = await fetch(`${ASSEMBLYAI_BASE_URL}/v2/transcript`, {
      method: "POST",
      headers: { authorization: apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        audio_url: upload.upload_url,
        speaker_labels: true,
      }),
    });
    if (!transcriptRes.ok) throw new Error(`AssemblyAI transcript failed: ${transcriptRes.status}`);
    const created = (await transcriptRes.json()) as { id?: string };
    if (!created.id) throw new Error("AssemblyAI transcript did not return an id");

    const started = Date.now();
    while (Date.now() - started < POLL_TIMEOUT_MS) {
      const pollRes = await fetch(`${ASSEMBLYAI_BASE_URL}/v2/transcript/${created.id}`, {
        headers: { authorization: apiKey },
      });
      if (!pollRes.ok) throw new Error(`AssemblyAI poll failed: ${pollRes.status}`);
      const raw = (await pollRes.json()) as {
        id: string;
        status?: string;
        text?: string;
        audio_duration?: number;
        utterances?: Array<{ speaker?: string; text?: string; start?: number; end?: number }>;
        error?: string;
      };

      if (raw.status === "completed") {
        const utterances =
          raw.utterances?.map((line) => ({
            speaker: line.speaker ? `Speaker ${line.speaker}` : "Speaker",
            text: line.text ?? "",
            start: millisToSeconds(line.start),
            end: millisToSeconds(line.end),
          })) ?? [];
        return {
          sourceId: raw.id,
          text: raw.text ?? "",
          durationSecs: raw.audio_duration ?? null,
          utterances: utterances.filter((line) => line.text.trim() !== ""),
          raw,
        };
      }

      if (raw.status === "error") {
        throw new Error(raw.error ?? "AssemblyAI transcription failed");
      }

      await delay(POLL_DELAY_MS);
    }

    throw new Error("AssemblyAI transcription timed out");
  }
}

class DeepgramProvider implements TranscriptionProvider {
  async transcribe(input: TranscriptionInput, apiKey: string): Promise<TranscriptionResult> {
    const res = await fetch(`${DEEPGRAM_BASE_URL}/listen?smart_format=true&diarize=true`, {
      method: "POST",
      headers: { authorization: `Token ${apiKey}`, "content-type": input.contentType },
      body: Buffer.from(input.audio),
    });
    if (!res.ok) throw new Error(`Deepgram transcription failed: ${res.status}`);

    const raw = (await res.json()) as {
      metadata?: { request_id?: string; duration?: number };
      results?: {
        channels?: Array<{
          alternatives?: Array<{
            transcript?: string;
            words?: Array<{
              word?: string;
              punctuated_word?: string;
              start?: number;
              end?: number;
              speaker?: number;
            }>;
          }>;
        }>;
      };
    };

    const alternative = raw.results?.channels?.[0]?.alternatives?.[0];
    const utterances = wordsToUtterances(alternative?.words ?? []);
    return {
      sourceId: raw.metadata?.request_id ?? crypto.randomUUID(),
      text: alternative?.transcript ?? utterances.map((line) => line.text).join(" "),
      durationSecs: raw.metadata?.duration ?? null,
      utterances,
      raw,
    };
  }
}

function wordsToUtterances(
  words: Array<{
    word?: string;
    punctuated_word?: string;
    start?: number;
    end?: number;
    speaker?: number;
  }>,
): TranscribedUtterance[] {
  const utterances: TranscribedUtterance[] = [];

  for (const word of words) {
    const speaker = `Speaker ${word.speaker ?? 0}`;
    const text = word.punctuated_word ?? word.word ?? "";
    if (!text) continue;
    const current = utterances[utterances.length - 1];
    if (current && current.speaker === speaker) {
      current.text = `${current.text} ${text}`.trim();
      current.end = word.end ?? current.end;
      continue;
    }
    utterances.push({
      speaker,
      text,
      start: word.start ?? 0,
      end: word.end ?? word.start ?? 0,
    });
  }

  return utterances;
}

function millisToSeconds(value: number | undefined): number {
  return typeof value === "number" ? value / 1000 : 0;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
