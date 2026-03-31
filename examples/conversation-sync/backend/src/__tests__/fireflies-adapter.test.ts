import { describe, it, expect } from "bun:test";

import { normalizeFireflies } from "../adapters/fireflies.js";
import type { FullTranscript } from "../services/fireflies-client.js";

// ── Fixtures ────────────────────────────────────────────────────────

function makeFullTranscript(overrides?: Partial<FullTranscript>): FullTranscript {
  return {
    id: "ff-abc-123",
    title: "Team standup",
    date: 1700000000000, // 2023-11-14T22:13:20.000Z
<<<<<<< HEAD
<<<<<<< HEAD
    duration: 30, // 30 minutes (Fireflies API returns minutes)
=======
    duration: 1800, // 30 minutes
>>>>>>> bac670e (TC-1300: Add NormalizedConversation types and Fireflies adapter)
=======
    duration: 30, // 30 minutes (Fireflies API returns minutes)
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
    organizer_email: "roman@tinycloud.xyz",
    transcript_url: "https://app.fireflies.ai/view/ff-abc-123",
    speakers: [
      { id: "s1", name: "Roman" },
      { id: "s2", name: "Sam" },
    ],
    meeting_attendees: [
      { displayName: "Roman", email: "roman@tinycloud.xyz" },
      { displayName: "Sam", email: "sam@tinycloud.xyz" },
    ],
    sentences: [
      {
        index: 0,
        speaker_id: "s1",
        speaker_name: "Roman",
        text: "Good morning everyone.",
        raw_text: "Good morning everyone.",
        start_time: 0,
        end_time: 2.5,
        ai_filters: {
          task: false,
          pricing: false,
          metric: false,
          question: false,
          date_and_time: false,
          sentiment: "neutral",
        },
      },
      {
        index: 1,
        speaker_id: "s2",
        speaker_name: "Sam",
        text: "Morning! Let's get started.",
        raw_text: "Morning! Let's get started.",
        start_time: 3.0,
        end_time: 5.5,
        ai_filters: {
          task: false,
          pricing: false,
          metric: false,
          question: false,
          date_and_time: false,
          sentiment: "positive",
        },
      },
    ],
    summary: {
      keywords: ["standup", "sprint"],
      action_items: ["Review PR #42"],
      overview: "Daily standup covering sprint progress.",
      shorthand_bullet: "- Sprint on track\n- PR review needed",
      meeting_type: "standup",
    },
    audio_url: "https://fireflies.ai/audio/ff-abc-123.mp3",
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe("normalizeFireflies", () => {
  // ── Conversation field mapping ──────────────────────────────────

  it("maps all conversation fields correctly", () => {
    const raw = makeFullTranscript();
    const result = normalizeFireflies(raw);

    expect(result.conversation.title).toBe("Team standup");
    expect(result.conversation.source).toBe("fireflies");
    expect(result.conversation.source_id).toBe("ff-abc-123");
<<<<<<< HEAD
<<<<<<< HEAD
    expect(result.conversation.source_url).toBe("https://app.fireflies.ai/view/ff-abc-123");
    expect(result.conversation.duration_secs).toBe(1800);
    expect(result.conversation.summary).toBe("Daily standup covering sprint progress.");
=======
    expect(result.conversation.source_url).toBe(
      "https://app.fireflies.ai/view/ff-abc-123",
    );
    expect(result.conversation.duration_secs).toBe(1800);
    expect(result.conversation.summary).toBe(
      "Daily standup covering sprint progress.",
    );
>>>>>>> bac670e (TC-1300: Add NormalizedConversation types and Fireflies adapter)
=======
    expect(result.conversation.source_url).toBe("https://app.fireflies.ai/view/ff-abc-123");
    expect(result.conversation.duration_secs).toBe(1800);
    expect(result.conversation.summary).toBe("Daily standup covering sprint progress.");
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
  });

  it("converts started_at from epoch ms to ISO 8601", () => {
    const raw = makeFullTranscript({ date: 1700000000000 });
    const result = normalizeFireflies(raw);

    expect(result.conversation.started_at).toBe("2023-11-14T22:13:20.000Z");
  });

<<<<<<< HEAD
<<<<<<< HEAD
  it("computes ended_at as started_at + duration (minutes → seconds)", () => {
    // date = 1700000000000 (2023-11-14T22:13:20.000Z), duration = 30 min
    // ended_at = 1700000000000 + (30 * 60 * 1000) = 1700001800000
    // 2023-11-14T22:43:20.000Z
    const raw = makeFullTranscript({ date: 1700000000000, duration: 30 });
=======
  it("computes ended_at as started_at + duration", () => {
    // date = 1700000000000 (2023-11-14T22:13:20.000Z), duration = 1800s
    // ended_at = 1700000000000 + (1800 * 1000) = 1700001800000
    // 2023-11-14T22:43:20.000Z
    const raw = makeFullTranscript({ date: 1700000000000, duration: 1800 });
>>>>>>> bac670e (TC-1300: Add NormalizedConversation types and Fireflies adapter)
=======
  it("computes ended_at as started_at + duration (minutes → seconds)", () => {
    // date = 1700000000000 (2023-11-14T22:13:20.000Z), duration = 30 min
    // ended_at = 1700000000000 + (30 * 60 * 1000) = 1700001800000
    // 2023-11-14T22:43:20.000Z
    const raw = makeFullTranscript({ date: 1700000000000, duration: 30 });
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
    const result = normalizeFireflies(raw);

    expect(result.conversation.ended_at).toBe("2023-11-14T22:43:20.000Z");
  });

  it("summary comes from summary.overview", () => {
    const raw = makeFullTranscript();
    raw.summary.overview = "A discussion about quarterly goals.";
    const result = normalizeFireflies(raw);

<<<<<<< HEAD
<<<<<<< HEAD
    expect(result.conversation.summary).toBe("A discussion about quarterly goals.");
=======
    expect(result.conversation.summary).toBe(
      "A discussion about quarterly goals.",
    );
>>>>>>> bac670e (TC-1300: Add NormalizedConversation types and Fireflies adapter)
=======
    expect(result.conversation.summary).toBe("A discussion about quarterly goals.");
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
  });

  it("metadata includes audio_url, organizer_email, keywords, meeting_type", () => {
    const raw = makeFullTranscript();
    const result = normalizeFireflies(raw);

    expect(result.conversation.metadata).toEqual({
      audio_url: "https://fireflies.ai/audio/ff-abc-123.mp3",
      organizer_email: "roman@tinycloud.xyz",
      keywords: ["standup", "sprint"],
      meeting_type: "standup",
    });
  });

  // ── Participants ────────────────────────────────────────────────

  it("maps participants from speakers with deduplicated names", () => {
    const raw = makeFullTranscript({
      speakers: [
        { id: "s1", name: "Roman" },
        { id: "s2", name: "Sam" },
        { id: "s3", name: "Roman" }, // duplicate name
      ],
    });
    const result = normalizeFireflies(raw);

    const names = result.participants.map((p) => p.name);
    expect(names).toEqual(["Roman", "Sam"]);
    expect(result.participants).toHaveLength(2);
  });

  it("matches participant emails from meeting_attendees by name (best-effort)", () => {
    const raw = makeFullTranscript({
      speakers: [
        { id: "s1", name: "Roman" },
        { id: "s2", name: "Sam" },
      ],
      meeting_attendees: [
        { displayName: "Roman", email: "roman@tinycloud.xyz" },
        { displayName: "Sam", email: "sam@tinycloud.xyz" },
      ],
    });
    const result = normalizeFireflies(raw);

    const roman = result.participants.find((p) => p.name === "Roman");
    const sam = result.participants.find((p) => p.name === "Sam");
    expect(roman?.email).toBe("roman@tinycloud.xyz");
    expect(sam?.email).toBe("sam@tinycloud.xyz");
  });

  it("sets participant email to null when no attendee name matches", () => {
    const raw = makeFullTranscript({
      speakers: [
        { id: "s1", name: "Roman" },
        { id: "s2", name: "Unknown Speaker" },
      ],
      meeting_attendees: [
        { displayName: "Roman", email: "roman@tinycloud.xyz" },
        // No match for "Unknown Speaker"
      ],
    });
    const result = normalizeFireflies(raw);

<<<<<<< HEAD
<<<<<<< HEAD
    const unknown = result.participants.find((p) => p.name === "Unknown Speaker");
=======
    const unknown = result.participants.find(
      (p) => p.name === "Unknown Speaker",
    );
>>>>>>> bac670e (TC-1300: Add NormalizedConversation types and Fireflies adapter)
=======
    const unknown = result.participants.find((p) => p.name === "Unknown Speaker");
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
    expect(unknown?.email).toBeNull();
  });

  it("speaker_label comes from speakers[].id", () => {
    const raw = makeFullTranscript({
      speakers: [
        { id: "speaker-alpha", name: "Roman" },
        { id: "speaker-beta", name: "Sam" },
      ],
    });
    const result = normalizeFireflies(raw);

    const roman = result.participants.find((p) => p.name === "Roman");
    const sam = result.participants.find((p) => p.name === "Sam");
    expect(roman?.speaker_label).toBe("speaker-alpha");
    expect(sam?.speaker_label).toBe("speaker-beta");
  });

  // ── Transcript ──────────────────────────────────────────────────

  it("transcript is the raw sentences array", () => {
    const raw = makeFullTranscript();
    const result = normalizeFireflies(raw);

    expect(result.transcript).toBe(raw.sentences);
    expect(result.transcript).toEqual(raw.sentences);
  });

  // ── ID generation ───────────────────────────────────────────────

  it("generates unique IDs for conversation and each participant", () => {
    const raw = makeFullTranscript();
    const result = normalizeFireflies(raw);

    // All IDs should be non-empty strings
    expect(typeof result.conversation.id).toBe("string");
    expect(result.conversation.id.length).toBeGreaterThan(0);

    for (const participant of result.participants) {
      expect(typeof participant.id).toBe("string");
      expect(participant.id.length).toBeGreaterThan(0);
    }

    // All IDs should be unique
<<<<<<< HEAD
<<<<<<< HEAD
    const allIds = [result.conversation.id, ...result.participants.map((p) => p.id)];
=======
    const allIds = [
      result.conversation.id,
      ...result.participants.map((p) => p.id),
    ];
>>>>>>> bac670e (TC-1300: Add NormalizedConversation types and Fireflies adapter)
=======
    const allIds = [result.conversation.id, ...result.participants.map((p) => p.id)];
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  // ── Null/missing optional fields ────────────────────────────────

  it("handles null/missing optional fields gracefully", () => {
    const raw = makeFullTranscript({
      audio_url: "",
      summary: {
        keywords: [],
        action_items: [],
        overview: "",
        shorthand_bullet: "",
        meeting_type: "",
      },
    });
    const result = normalizeFireflies(raw);

    // Should not throw, and should produce valid output
    expect(result.conversation.source).toBe("fireflies");
    expect(result.conversation.source_id).toBe("ff-abc-123");
    expect(result.conversation.metadata).toEqual({
      audio_url: "",
      organizer_email: "roman@tinycloud.xyz",
      keywords: [],
      meeting_type: "",
    });
    expect(result.conversation.summary).toBe("");
  });

  // ── Multiple calls produce different IDs ────────────────────────

  it("generates different IDs across multiple calls", () => {
    const raw = makeFullTranscript();
    const result1 = normalizeFireflies(raw);
    const result2 = normalizeFireflies(raw);

    expect(result1.conversation.id).not.toBe(result2.conversation.id);
  });
});
