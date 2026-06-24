import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseOtterTxt, transcriptText } from "../src/transcript.ts";

const SYNTHETIC = `Andrew Miller  0:05
Hello everyone, welcome.

Sri  0:12
Thanks, glad to be here.

Andrew Miller  1:20
Let's dig into the paper.
`;

describe("parseOtterTxt", () => {
  test("parses speakers, text, and timestamps", () => {
    const out = parseOtterTxt(SYNTHETIC);
    expect(out).toHaveLength(3);
    expect(out.map((s) => s.speaker_name)).toEqual(["Andrew Miller", "Sri", "Andrew Miller"]);
    expect(out.map((s) => s.start_time)).toEqual([5, 12, 80]);
    // end_time chains to the next segment's start; last is null
    expect(out.map((s) => s.end_time)).toEqual([12, 80, null]);
    expect(out[0]!.speaker_id).toBe("andrew-miller");
    expect(out[0]!.text).toBe("Hello everyone, welcome.");
    expect(out[0]!.language).toBeNull();
  });

  test("indexes are contiguous from zero", () => {
    const out = parseOtterTxt(SYNTHETIC);
    expect(out.map((s) => s.index)).toEqual([0, 1, 2]);
  });

  test("h:mm:ss timestamps convert to seconds", () => {
    const out = parseOtterTxt("Speaker 1  1:02:03\nlong meeting\n");
    expect(out[0]!.start_time).toBe(3723);
    expect(out[0]!.speaker_id).toBe("speaker-1");
  });

  test("multi-line speaker text is joined", () => {
    const out = parseOtterTxt("Sri  0:01\nline one\nline two\n\nAndrew  0:05\nnext\n");
    expect(out[0]!.text).toBe("line one line two");
  });

  test("transcriptText matches Listen's [mm:ss] Speaker: text shape", () => {
    const out = parseOtterTxt(SYNTHETIC);
    expect(transcriptText(out)).toBe(
      "[00:05] Andrew Miller: Hello everyone, welcome.\n" +
        "[00:12] Sri: Thanks, glad to be here.\n" +
        "[01:20] Andrew Miller: Let's dig into the paper.",
    );
  });

  test("parses a full export with named + numbered speakers, trailing spaces, and h:mm:ss", () => {
    const raw = readFileSync(join(import.meta.dir, "fixtures", "sample-export.txt"), "utf8");
    const out = parseOtterTxt(raw);
    expect(out.length).toBeGreaterThan(3);
    // every sentence has a non-empty speaker and text, and a real start time
    for (const s of out) {
      expect(s.speaker_name.length).toBeGreaterThan(0);
      expect(s.text.length).toBeGreaterThan(0);
      expect(typeof s.start_time).toBe("number");
    }
    // monotonic non-decreasing timestamps (incl. the 1:33:10 h:mm:ss line)
    const starts = out.map((s) => s.start_time!);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
    expect(out.map((s) => s.speaker_name)).toContain("Alice Chen");
    expect(out.map((s) => s.speaker_name)).toContain("Speaker 1");
  });
});
