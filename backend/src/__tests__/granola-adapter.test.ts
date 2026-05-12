import { describe, expect, it } from "bun:test";
import { normalizeGranola } from "../adapters/granola.js";
import type { GranolaNote } from "../services/granola-client.js";

describe("normalizeGranola", () => {
  it("maps summary, transcript, attendees, and timing into a normalized conversation", () => {
    const note: GranolaNote = {
      id: "not_1d3tmYTlCICgjy",
      object: "note",
      title: "Roadmap Review",
      owner: { name: "Sam", email: "sam@example.com" },
      created_at: "2026-01-27T15:30:00Z",
      updated_at: "2026-01-27T16:45:00Z",
      web_url: "https://notes.granola.ai/d/note",
      calendar_event: {
        event_title: "Roadmap Review",
        organiser: "sam@example.com",
        scheduled_start_time: "2026-01-27T15:30:00Z",
        scheduled_end_time: "2026-01-27T16:30:00Z",
      },
      attendees: [{ name: "Sam", email: "sam@example.com" }],
      folder_membership: [],
      summary_text: "Plain summary",
      summary_markdown: "## Summary\n\nPlain summary",
      transcript: [
        {
          speaker: { source: "microphone", diarization_label: "Speaker A" },
          text: "We discussed the roadmap.",
          start_time: "2026-01-27T15:31:00Z",
          end_time: "2026-01-27T15:32:00Z",
        },
        {
          speaker: { source: "speaker" },
          text: "Next step is validation.",
        },
      ],
    };

    const normalized = normalizeGranola(note);

    expect(normalized.conversation.source).toBe("granola");
    expect(normalized.conversation.source_id).toBe("not_1d3tmYTlCICgjy");
    expect(normalized.conversation.source_url).toBe("https://notes.granola.ai/d/note");
    expect(normalized.conversation.started_at).toBe("2026-01-27T15:30:00Z");
    expect(normalized.conversation.ended_at).toBe("2026-01-27T16:30:00Z");
    expect(normalized.conversation.duration_secs).toBe(3600);
    expect(normalized.conversation.summary).toBe("## Summary\n\nPlain summary");
    expect(normalized.participants.map((p) => p.name)).toEqual(["Sam", "Speaker A", "speaker"]);
    expect(normalized.transcript).toEqual([
      {
        index: 0,
        speaker_name: "Speaker A",
        speaker_source: "microphone",
        speaker_label: "Speaker A",
        text: "We discussed the roadmap.",
        start_time: "2026-01-27T15:31:00Z",
        end_time: "2026-01-27T15:32:00Z",
      },
      {
        index: 1,
        speaker_name: "speaker",
        speaker_source: "speaker",
        speaker_label: null,
        text: "Next step is validation.",
        start_time: null,
        end_time: null,
      },
    ]);
  });
});
