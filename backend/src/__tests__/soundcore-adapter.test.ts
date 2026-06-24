import { describe, expect, test } from "bun:test";
import { normalizeSoundcore } from "../adapters/soundcore.js";
import type { SoundcoreNote } from "../services/soundcore-client.js";

function note(overrides: Partial<SoundcoreNote> = {}): SoundcoreNote {
  return {
    note_id: "soundcore-note-1",
    note_title: "Soundcore Product Review",
    audio_duration: 300_000,
    updated_at: 0,
    app_note_id: 1_768_501_800,
    is_trans: true,
    is_summary: true,
    summary: {
      content: "## Summary\n\nReviewed the Soundcore integration.",
      one_page_summary: "One page summary",
    },
    transcript: [
      {
        start_time: 1_000,
        end_time: 4_000,
        speaker: "Hunter",
        content: "Let's wire this directly into Listen.",
      },
    ],
    ...overrides,
  };
}

describe("Soundcore adapter", () => {
  test("normalizes Soundcore notes into the Listen conversation contract", () => {
    const normalized = normalizeSoundcore(note());

    expect(normalized.conversation.source).toBe("soundcore_sync");
    expect(normalized.conversation.source_id).toBe("soundcore-note-1");
    expect(normalized.conversation.duration_secs).toBe(300);
    expect(normalized.conversation.summary).toContain("Reviewed the Soundcore integration.");
    expect(normalized.conversation.metadata).toMatchObject({
      source_app: "Soundcore",
      source_adapter: "listen-backend",
      has_transcript: true,
      empty_transcript: false,
    });
    expect(normalized.transcript).toEqual([
      {
        index: 0,
        speaker_name: "Hunter",
        speaker_label: "Hunter",
        text: "Let's wire this directly into Listen.",
        start_time: 1,
        end_time: 4,
      },
    ]);
    expect(normalized.participants[0]).toMatchObject({
      name: "Hunter",
      speaker_label: "Hunter",
    });
  });

  test("marks empty transcript notes explicitly", () => {
    const normalized = normalizeSoundcore(note({ is_trans: false, transcript: [] }));

    expect(normalized.transcript).toEqual([]);
    expect(normalized.participants).toEqual([]);
    expect(normalized.conversation.metadata.empty_transcript).toBe(true);
  });
});
