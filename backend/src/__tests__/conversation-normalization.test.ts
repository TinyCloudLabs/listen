import { describe, expect, it } from "bun:test";
import {
  isBase64AudioStorage,
  normalizeConversationMetadata,
  normalizeTranscript,
  resolveAudioKey,
} from "../services/conversation-normalization.js";

describe("normalizeConversationMetadata", () => {
  it("backfills audio_data_kv_key from importer audio_kv_key", () => {
    const result = normalizeConversationMetadata({
      audio_kv_key: "importer/media/aa/abc.mp3",
    });
    expect(result.audio_data_kv_key).toBe("importer/media/aa/abc.mp3");
    expect(result.audio_kv_key).toBe("importer/media/aa/abc.mp3");
  });

  it("prefers audio_data_kv_key over audio_kv_key when both are present", () => {
    const result = normalizeConversationMetadata({
      audio_data_kv_key: "canonical",
      audio_kv_key: "legacy",
    });
    expect(result.audio_data_kv_key).toBe("canonical");
    expect(result.audio_kv_key).toBe("canonical");
  });

  it("accepts camelCase aliases", () => {
    const result = normalizeConversationMetadata({
      audioDataKvKey: "camel/case",
    });
    expect(result.audio_data_kv_key).toBe("camel/case");
  });

  it("parses JSON-stringified metadata", () => {
    const result = normalizeConversationMetadata(JSON.stringify({ audio_kv_key: "from/string" }));
    expect(result.audio_data_kv_key).toBe("from/string");
  });

  it("returns an empty object when metadata is malformed", () => {
    expect(normalizeConversationMetadata(null)).toEqual({});
    expect(normalizeConversationMetadata("not-json")).toEqual({});
  });
});

describe("resolveAudioKey", () => {
  it("returns null when no audio key is present", () => {
    expect(resolveAudioKey({})).toBeNull();
  });
  it("prefers audio_data_kv_key", () => {
    expect(resolveAudioKey({ audio_data_kv_key: "x", audio_kv_key: "y" })).toBe("x");
  });
  it("falls back to importer audio_kv_key", () => {
    expect(resolveAudioKey({ audio_kv_key: "y" })).toBe("y");
  });
});

describe("isBase64AudioStorage", () => {
  it("detects base64-string-kv encoding", () => {
    expect(isBase64AudioStorage({ audio_storage_encoding: "base64-string-kv" })).toBe(true);
  });
  it("returns false for other encodings", () => {
    expect(isBase64AudioStorage({ audio_storage_encoding: "raw" })).toBe(false);
    expect(isBase64AudioStorage({})).toBe(false);
  });
});

describe("normalizeTranscript", () => {
  it("handles JSON-stringified arrays from importer", () => {
    const raw = JSON.stringify([
      { speaker_name: "Ada", text: "Hello", start_time: 0, end_time: 1 },
    ]);
    const result = normalizeTranscript(raw);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(1);
    expect(result![0]!.speaker_name).toBe("Ada");
    expect(result![0]!.start_time).toBe(0);
  });

  it("preserves nullable timestamps from partner data", () => {
    const result = normalizeTranscript([
      { speaker_name: "Ada", text: "Hello", start_time: null, end_time: null },
    ]);
    expect(result![0]!.start_time).toBeNull();
    expect(result![0]!.end_time).toBeNull();
  });

  it("drops segments with no text", () => {
    const result = normalizeTranscript([
      { speaker_name: "Ada", text: "" },
      { speaker_name: "Ada", text: "Real text" },
    ]);
    expect(result!.length).toBe(1);
    expect(result![0]!.text).toBe("Real text");
  });

  it("returns null for non-array, non-object input", () => {
    expect(normalizeTranscript(null)).toBeNull();
    expect(normalizeTranscript(42)).toBeNull();
  });

  it("unwraps {transcript: [...]} shape", () => {
    const result = normalizeTranscript({
      transcript: [{ speaker_name: "Ada", text: "Hi" }],
    });
    expect(result!.length).toBe(1);
  });
});
