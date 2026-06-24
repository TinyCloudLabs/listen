export interface OtterTranscriptSentence {
  index: number;
  speaker_id: string;
  speaker_name: string;
  text: string;
  start_time: number | null;
  end_time: number | null;
  language: string | null;
}

// "Andrew Miller  0:33", "Speaker 1  1:15:02" — name, 2+ spaces, then m:ss or h:mm:ss.
const HEADER = /^(.+?)\s{2,}(\d{1,2}:\d{2}(?::\d{2})?)\s*$/;

/** Parse an Otter bulk_export diarized .txt into normalized sentences. */
export function parseOtterTxt(txt: string): OtterTranscriptSentence[] {
  const segments: { name: string; start: number; lines: string[] }[] = [];
  for (const rawLine of txt.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const header = HEADER.exec(line);
    if (header) {
      segments.push({ name: header[1]!.trim(), start: toSeconds(header[2]!), lines: [] });
    } else if (line.trim() && segments.length > 0) {
      segments[segments.length - 1]!.lines.push(line.trim());
    }
  }

  const sentences: OtterTranscriptSentence[] = [];
  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i]!;
    const text = seg.lines.join(" ").trim();
    if (!text) continue;
    sentences.push({
      index: sentences.length,
      speaker_id: slugify(seg.name, sentences.length),
      speaker_name: seg.name || "Speaker",
      text,
      start_time: seg.start,
      end_time: segments[i + 1]?.start ?? null,
      language: null,
    });
  }
  return sentences;
}

function toSeconds(ts: string): number {
  return ts
    .split(":")
    .map(Number)
    .reduce((acc, n) => acc * 60 + n, 0);
}

function slugify(name: string, index: number): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `speaker-${index + 1}`
  );
}
