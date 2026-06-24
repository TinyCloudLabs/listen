import { describe, it, expect } from "bun:test";
import { parseOtterTxt } from "../services/otter-transcript.js";

const SYNTHETIC = `Alice Chen  0:05
Hello everyone, welcome.

Speaker 1  0:12
thanks for having me

Alice Chen  1:33:10
Last item, then we wrap.
`;

describe("parseOtterTxt", () => {
  it("parses speakers, text, chained timestamps", () => {
    const out = parseOtterTxt(SYNTHETIC);
    expect(out.map((s) => s.speaker_name)).toEqual(["Alice Chen", "Speaker 1", "Alice Chen"]);
    expect(out.map((s) => s.start_time)).toEqual([5, 12, 5590]); // 1:33:10 -> 5590s
    expect(out.map((s) => s.end_time)).toEqual([12, 5590, null]);
    expect(out[0]!.speaker_id).toBe("alice-chen");
    expect(out[1]!.speaker_id).toBe("speaker-1");
    expect(out.map((s) => s.index)).toEqual([0, 1, 2]);
  });

  it("joins multi-line speaker text", () => {
    const out = parseOtterTxt("Bo  0:01\nline one\nline two\n\nAlice  0:05\nnext\n");
    expect(out[0]!.text).toBe("line one line two");
  });

  it("ignores content before the first speaker header", () => {
    expect(parseOtterTxt("preamble with no header\n")).toEqual([]);
  });
});
