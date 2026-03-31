import { describe, it, expect } from "bun:test";

import { normalizeGoogleMeet } from "../adapters/google-meet.js";
import type { FullConference, Participant, TranscriptEntry } from "../services/google-meet-client.js";

// ── Fixtures ────────────────────────────────────────────────────────

function makeParticipant(overrides?: Partial<Participant>): Participant {
  return {
    name: "conferenceRecords/abc123/participants/p1",
    earliestStartTime: "2024-01-15T10:00:00Z",
    latestEndTime: "2024-01-15T11:00:00Z",
    signedinUser: { user: "users/123", displayName: "Roman" },
    ...overrides,
  };
}

function makeEntry(overrides?: Partial<TranscriptEntry>): TranscriptEntry {
  return {
    name: "conferenceRecords/abc123/transcripts/t1/entries/e1",
    participant: "conferenceRecords/abc123/participants/p1",
    text: "Hello everyone.",
    languageCode: "en-US",
    startTime: "2024-01-15T10:01:00Z",
    endTime: "2024-01-15T10:01:05Z",
    ...overrides,
  };
}

function makeFullConference(overrides?: Partial<FullConference>): FullConference {
  return {
    conferenceRecord: {
      name: "conferenceRecords/abc123",
      startTime: "2024-01-15T10:00:00Z",
      endTime: "2024-01-15T11:00:00Z",
      expireTime: "2024-02-14T10:00:00Z",
      space: "spaces/meeting-xyz",
    },
    participants: [
      makeParticipant(),
      makeParticipant({
        name: "conferenceRecords/abc123/participants/p2",
        signedinUser: { user: "users/456", displayName: "Sam" },
      }),
    ],
    transcripts: [
      {
        name: "conferenceRecords/abc123/transcripts/t1",
        state: "FILE_GENERATED",
        startTime: "2024-01-15T10:00:00Z",
        endTime: "2024-01-15T11:00:00Z",
        docsDestination: {
          document: "documents/doc123",
          exportUri: "https://docs.google.com/document/d/doc123",
        },
      },
    ],
    entries: [
      makeEntry(),
      makeEntry({
        name: "conferenceRecords/abc123/transcripts/t1/entries/e2",
        participant: "conferenceRecords/abc123/participants/p2",
        text: "Hey, let's get started.",
        startTime: "2024-01-15T10:01:06Z",
        endTime: "2024-01-15T10:01:10Z",
      }),
    ],
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe("normalizeGoogleMeet", () => {
  // ── Conversation field mapping ──────────────────────────────────

  it("maps all conversation fields correctly", () => {
    const raw = makeFullConference();
    const result = normalizeGoogleMeet(raw);

    expect(result.conversation.source).toBe("google-meet");
    expect(result.conversation.source_id).toBe("conferenceRecords/abc123");
    expect(result.conversation.source_url).toBe("https://docs.google.com/document/d/doc123");
    expect(result.conversation.started_at).toBe("2024-01-15T10:00:00Z");
    expect(result.conversation.ended_at).toBe("2024-01-15T11:00:00Z");
    expect(result.conversation.summary).toBeNull();
  });

  it("computes duration_secs from endTime - startTime", () => {
    const raw = makeFullConference();
    const result = normalizeGoogleMeet(raw);

    // 1 hour = 3600 seconds
    expect(result.conversation.duration_secs).toBe(3600);
  });

  it("sets duration_secs to null when endTime is missing", () => {
    const raw = makeFullConference();
    raw.conferenceRecord.endTime = undefined;
    const result = normalizeGoogleMeet(raw);

    expect(result.conversation.duration_secs).toBeNull();
    expect(result.conversation.ended_at).toBeNull();
  });

  it("sets title to 'Google Meet — {date}' fallback", () => {
    const raw = makeFullConference();
    const result = normalizeGoogleMeet(raw);

    expect(result.conversation.title).toBe("Google Meet — 2024-01-15");
  });

  it("metadata includes space and transcriptState", () => {
    const raw = makeFullConference();
    const result = normalizeGoogleMeet(raw);

    expect(result.conversation.metadata).toEqual({
      space: "spaces/meeting-xyz",
      transcriptState: "FILE_GENERATED",
    });
  });

  it("sets source_url to null when no docsDestination", () => {
    const raw = makeFullConference();
    raw.transcripts = [
      {
        name: "conferenceRecords/abc123/transcripts/t1",
        state: "ENDED",
        startTime: "2024-01-15T10:00:00Z",
      },
    ];
    const result = normalizeGoogleMeet(raw);

    expect(result.conversation.source_url).toBeNull();
  });

  it("sets source_url to null when transcripts array is empty", () => {
    const raw = makeFullConference();
    raw.transcripts = [];
    const result = normalizeGoogleMeet(raw);

    expect(result.conversation.source_url).toBeNull();
  });

  // ── Participant type resolution ───────────────────────────────

  it("resolves displayName from signedinUser", () => {
    const raw = makeFullConference({
      participants: [
        makeParticipant({
          signedinUser: { user: "users/123", displayName: "Roman Signed-In" },
        }),
      ],
    });
    const result = normalizeGoogleMeet(raw);

    expect(result.participants[0].name).toBe("Roman Signed-In");
  });

  it("resolves displayName from anonymousUser when no signedinUser", () => {
    const raw = makeFullConference({
      participants: [
        makeParticipant({
          signedinUser: undefined,
          anonymousUser: { displayName: "Guest User" },
        }),
      ],
    });
    const result = normalizeGoogleMeet(raw);

    expect(result.participants[0].name).toBe("Guest User");
  });

  it("resolves displayName from phoneUser when no signedinUser or anonymousUser", () => {
    const raw = makeFullConference({
      participants: [
        makeParticipant({
          signedinUser: undefined,
          anonymousUser: undefined,
          phoneUser: { displayName: "+1-555-0100" },
        }),
      ],
    });
    const result = normalizeGoogleMeet(raw);

    expect(result.participants[0].name).toBe("+1-555-0100");
  });

  it("falls back to 'Unknown' when no user type is present", () => {
    const raw = makeFullConference({
      participants: [
        makeParticipant({
          signedinUser: undefined,
          anonymousUser: undefined,
          phoneUser: undefined,
        }),
      ],
    });
    const result = normalizeGoogleMeet(raw);

    expect(result.participants[0].name).toBe("Unknown");
  });

  it("sets email to null for all participants (not available from Meet API)", () => {
    const raw = makeFullConference();
    const result = normalizeGoogleMeet(raw);

    for (const p of result.participants) {
      expect(p.email).toBeNull();
    }
  });

  it("sets speaker_label to participant resource name suffix", () => {
    const raw = makeFullConference({
      participants: [
        makeParticipant({ name: "conferenceRecords/abc123/participants/p1" }),
        makeParticipant({ name: "conferenceRecords/abc123/participants/p2" }),
      ],
    });
    const result = normalizeGoogleMeet(raw);

    expect(result.participants[0].speaker_label).toBe("p1");
    expect(result.participants[1].speaker_label).toBe("p2");
  });

  // ── Transcript blob ───────────────────────────────────────────

  it("maps transcript entries with resolved speaker names", () => {
    const raw = makeFullConference();
    const result = normalizeGoogleMeet(raw);

    const entries = result.transcript as Array<{
      text: string;
      speaker_name: string;
      start_time: string;
      end_time: string;
      language: string;
    }>;

    expect(entries).toHaveLength(2);

    expect(entries[0].text).toBe("Hello everyone.");
    expect(entries[0].speaker_name).toBe("Roman");
    expect(entries[0].start_time).toBe("2024-01-15T10:01:00Z");
    expect(entries[0].end_time).toBe("2024-01-15T10:01:05Z");
    expect(entries[0].language).toBe("en-US");

    expect(entries[1].text).toBe("Hey, let's get started.");
    expect(entries[1].speaker_name).toBe("Sam");
  });

  it("uses 'Unknown' for speaker name when participant not found in lookup", () => {
    const raw = makeFullConference({
      entries: [
        makeEntry({
          participant: "conferenceRecords/abc123/participants/missing",
        }),
      ],
    });
    const result = normalizeGoogleMeet(raw);

    const entries = result.transcript as Array<{ speaker_name: string }>;
    expect(entries[0].speaker_name).toBe("Unknown");
  });

  it("returns empty transcript array when entries is empty", () => {
    const raw = makeFullConference({ entries: [] });
    const result = normalizeGoogleMeet(raw);

    expect(result.transcript).toEqual([]);
  });

  // ── ID generation ─────────────────────────────────────────────

  it("generates unique IDs for conversation and each participant", () => {
    const raw = makeFullConference();
    const result = normalizeGoogleMeet(raw);

    expect(typeof result.conversation.id).toBe("string");
    expect(result.conversation.id.length).toBeGreaterThan(0);

    for (const participant of result.participants) {
      expect(typeof participant.id).toBe("string");
      expect(participant.id.length).toBeGreaterThan(0);
    }

    const allIds = [result.conversation.id, ...result.participants.map((p) => p.id)];
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  it("generates different IDs across multiple calls", () => {
    const raw = makeFullConference();
    const result1 = normalizeGoogleMeet(raw);
    const result2 = normalizeGoogleMeet(raw);

    expect(result1.conversation.id).not.toBe(result2.conversation.id);
  });
});
