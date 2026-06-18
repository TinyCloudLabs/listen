import { describe, it, expect, beforeEach, mock, afterEach } from "bun:test";

// ── Mock fetch ──────────────────────────────────────────────────────

const mockFetch = mock<typeof globalThis.fetch>(() => Promise.resolve(new Response("{}")));

const originalFetch = globalThis.fetch;

// ── Import after mock setup ─────────────────────────────────────────

import { GoogleMeetClient } from "../services/google-meet-client.js";
import type {
  ConferenceRecord,
  Participant,
  Transcript,
  TranscriptEntry,
} from "../services/google-meet-client.js";

// ── Helpers ─────────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function textResponse(data: string, status = 200): Response {
  return new Response(data, {
    status,
    headers: { "Content-Type": "text/plain" },
  });
}

function lastFetchCall() {
  const calls = mockFetch.mock.calls;
  return calls[calls.length - 1];
}

function nthFetchCall(n: number) {
  return mockFetch.mock.calls[n];
}

// ── Fixtures ────────────────────────────────────────────────────────

const CONFERENCE: ConferenceRecord = {
  name: "conferenceRecords/abc123",
  startTime: "2026-03-30T14:00:00Z",
  endTime: "2026-03-30T15:00:00Z",
  expireTime: "2026-04-29T15:00:00Z",
  space: "spaces/jQCFfuBOdN5z",
};

const PARTICIPANT: Participant = {
  name: "conferenceRecords/abc123/participants/xyz",
  earliestStartTime: "2026-03-30T14:00:12Z",
  latestEndTime: "2026-03-30T14:58:30Z",
  signedinUser: { user: "users/12345", displayName: "Alice Smith" },
};

const TRANSCRIPT: Transcript = {
  name: "conferenceRecords/abc123/transcripts/def456",
  state: "FILE_GENERATED",
  startTime: "2026-03-30T14:00:00Z",
  endTime: "2026-03-30T15:00:00Z",
  docsDestination: {
    document: "1kuceFZohVoCh6FulBHxwy6I15Ogpc4hP",
    exportUri: "https://docs.google.com/document/d/1kuceFZohVoCh6FulBHxwy6I15Ogpc4hP/view",
  },
};

const ENTRY: TranscriptEntry = {
  name: "conferenceRecords/abc123/transcripts/def456/entries/ghi789",
  participant: "conferenceRecords/abc123/participants/xyz",
  text: "I think we should proceed with option B.",
  languageCode: "en-US",
  startTime: "2026-03-30T14:05:23Z",
  endTime: "2026-03-30T14:05:28Z",
};

// ── Tests ───────────────────────────────────────────────────────────

describe("GoogleMeetClient", () => {
  let client: GoogleMeetClient;

  beforeEach(() => {
    mockFetch.mockReset();
    globalThis.fetch = mockFetch as any;
    client = new GoogleMeetClient("ya29.test-access-token");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // ── listConferenceRecords() ───────────────────────────────────────

  describe("listConferenceRecords()", () => {
    it("sends GET to conferenceRecords endpoint with start_time filter", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ conferenceRecords: [CONFERENCE] }));

      await client.listConferenceRecords(30);

      const [url, init] = lastFetchCall();
      expect(url).toContain("https://meet.googleapis.com/v2/conferenceRecords");
      expect(url).toContain("filter=");
      expect(url).toContain("start_time");
      expect((init as RequestInit).method).toBeUndefined(); // GET by default
    });

    it("includes Authorization header with bearer token", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ conferenceRecords: [] }));

      await client.listConferenceRecords();

      const [, init] = lastFetchCall();
      const headers = (init as RequestInit).headers as Record<string, string>;
      expect(headers["Authorization"]).toBe("Bearer ya29.test-access-token");
    });

    it("returns conference records from response", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ conferenceRecords: [CONFERENCE] }));

      const records = await client.listConferenceRecords();

      expect(records).toHaveLength(1);
      expect(records[0].name).toBe("conferenceRecords/abc123");
    });

    it("returns empty array when no conferences exist", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}));

      const records = await client.listConferenceRecords();

      expect(records).toEqual([]);
    });

    it("paginates through multiple pages", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ conferenceRecords: [CONFERENCE], nextPageToken: "page2" }),
      );
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          conferenceRecords: [{ ...CONFERENCE, name: "conferenceRecords/def456" }],
        }),
      );

      const records = await client.listConferenceRecords();

      expect(records).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      // Second call should include pageToken
      const [secondUrl] = nthFetchCall(1);
      expect(secondUrl).toContain("pageToken=page2");
    });

    it("enforces safety cap of 500 conferences", async () => {
      // Return 100 per page with nextPageToken, simulating more than 500
      const page = (token?: string) => ({
        conferenceRecords: Array.from({ length: 100 }, (_, i) => ({
          ...CONFERENCE,
          name: `conferenceRecords/${token ?? "p1"}_${i}`,
        })),
        nextPageToken: token ? undefined : "page2", // only 2 pages for this test
      });

      // Build 6 pages (600 total) but cap should stop at 500
      for (let i = 0; i < 6; i++) {
        const isLast = i === 5;
        mockFetch.mockResolvedValueOnce(
          jsonResponse({
            conferenceRecords: Array.from({ length: 100 }, (_, j) => ({
              ...CONFERENCE,
              name: `conferenceRecords/p${i}_${j}`,
            })),
            ...(!isLast && { nextPageToken: `page${i + 2}` }),
          }),
        );
      }

      const records = await client.listConferenceRecords();

      expect(records.length).toBeLessThanOrEqual(500);
    });

    it("uses pageSize=100", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ conferenceRecords: [] }));

      await client.listConferenceRecords();

      const [url] = lastFetchCall();
      expect(url).toContain("pageSize=100");
    });
  });

  // ── listParticipants() ────────────────────────────────────────────

  describe("listParticipants()", () => {
    it("sends GET to participants endpoint", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ participants: [PARTICIPANT] }));

      await client.listParticipants("conferenceRecords/abc123");

      const [url] = lastFetchCall();
      expect(url).toContain("https://meet.googleapis.com/v2/conferenceRecords/abc123/participants");
    });

    it("returns participants from response", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ participants: [PARTICIPANT] }));

      const participants = await client.listParticipants("conferenceRecords/abc123");

      expect(participants).toHaveLength(1);
      expect(participants[0].signedinUser?.displayName).toBe("Alice Smith");
    });

    it("uses pageSize=250", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ participants: [] }));

      await client.listParticipants("conferenceRecords/abc123");

      const [url] = lastFetchCall();
      expect(url).toContain("pageSize=250");
    });
  });

  // ── listTranscripts() ─────────────────────────────────────────────

  describe("listTranscripts()", () => {
    it("sends GET to transcripts endpoint", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ transcripts: [TRANSCRIPT] }));

      await client.listTranscripts("conferenceRecords/abc123");

      const [url] = lastFetchCall();
      expect(url).toContain("https://meet.googleapis.com/v2/conferenceRecords/abc123/transcripts");
    });

    it("returns transcripts from response", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ transcripts: [TRANSCRIPT] }));

      const transcripts = await client.listTranscripts("conferenceRecords/abc123");

      expect(transcripts).toHaveLength(1);
      expect(transcripts[0].state).toBe("FILE_GENERATED");
    });

    it("returns empty array when no transcripts", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}));

      const transcripts = await client.listTranscripts("conferenceRecords/abc123");

      expect(transcripts).toEqual([]);
    });
  });

  // ── listTranscriptEntries() ───────────────────────────────────────

  describe("listTranscriptEntries()", () => {
    it("sends GET to transcript entries endpoint", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ transcriptEntries: [ENTRY] }));

      await client.listTranscriptEntries("conferenceRecords/abc123/transcripts/def456");

      const [url] = lastFetchCall();
      expect(url).toContain(
        "https://meet.googleapis.com/v2/conferenceRecords/abc123/transcripts/def456/entries",
      );
    });

    it("paginates through entries", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ transcriptEntries: [ENTRY], nextPageToken: "ep2" }),
      );
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          transcriptEntries: [
            { ...ENTRY, name: "conferenceRecords/abc123/transcripts/def456/entries/entry2" },
          ],
        }),
      );

      const entries = await client.listTranscriptEntries(
        "conferenceRecords/abc123/transcripts/def456",
      );

      expect(entries).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("uses pageSize=100", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ transcriptEntries: [] }));

      await client.listTranscriptEntries("conferenceRecords/abc123/transcripts/def456");

      const [url] = lastFetchCall();
      expect(url).toContain("pageSize=100");
    });

    it("enforces safety cap of 1000 entries", async () => {
      // 11 pages of 100 = 1100 entries, but cap should stop at 1000
      for (let i = 0; i < 11; i++) {
        const isLast = i === 10;
        mockFetch.mockResolvedValueOnce(
          jsonResponse({
            transcriptEntries: Array.from({ length: 100 }, (_, j) => ({
              ...ENTRY,
              name: `entries/p${i}_${j}`,
            })),
            ...(!isLast && { nextPageToken: `page${i + 2}` }),
          }),
        );
      }

      const entries = await client.listTranscriptEntries(
        "conferenceRecords/abc123/transcripts/def456",
      );

      expect(entries.length).toBeLessThanOrEqual(1000);
    });
  });

  // ── getFullConference() ───────────────────────────────────────────

  describe("getFullConference()", () => {
    it("fetches participants, transcripts, and entries", async () => {
      // participants
      mockFetch.mockResolvedValueOnce(jsonResponse({ participants: [PARTICIPANT] }));
      // transcripts
      mockFetch.mockResolvedValueOnce(jsonResponse({ transcripts: [TRANSCRIPT] }));
      // entries for the transcript
      mockFetch.mockResolvedValueOnce(jsonResponse({ transcriptEntries: [ENTRY] }));

      const full = await client.getFullConference(CONFERENCE);

      expect(full.conferenceRecord).toEqual(CONFERENCE);
      expect(full.participants).toHaveLength(1);
      expect(full.transcripts).toHaveLength(1);
      expect(full.entries).toHaveLength(1);
    });

    it("handles conference with no transcripts (no entry fetches)", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ participants: [PARTICIPANT] }));
      mockFetch.mockResolvedValueOnce(jsonResponse({})); // no transcripts

      const full = await client.getFullConference(CONFERENCE);

      expect(full.transcripts).toEqual([]);
      expect(full.entries).toEqual([]);
      expect(mockFetch).toHaveBeenCalledTimes(2); // no entry fetches
    });

    it("aggregates entries from multiple transcripts", async () => {
      const transcript2: Transcript = {
        ...TRANSCRIPT,
        name: "conferenceRecords/abc123/transcripts/second",
      };

      mockFetch.mockResolvedValueOnce(jsonResponse({ participants: [PARTICIPANT] }));
      mockFetch.mockResolvedValueOnce(jsonResponse({ transcripts: [TRANSCRIPT, transcript2] }));
      // entries for transcript 1
      mockFetch.mockResolvedValueOnce(jsonResponse({ transcriptEntries: [ENTRY] }));
      // entries for transcript 2
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          transcriptEntries: [
            { ...ENTRY, name: "entries/from-t2", text: "From second transcript" },
          ],
        }),
      );

      const full = await client.getFullConference(CONFERENCE);

      expect(full.entries).toHaveLength(2);
    });

    it("falls back to exporting the transcript Google Doc when entries are empty", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ participants: [PARTICIPANT] }));
      mockFetch.mockResolvedValueOnce(jsonResponse({ transcripts: [TRANSCRIPT] }));
      mockFetch.mockResolvedValueOnce(jsonResponse({ transcriptEntries: [] }));
      mockFetch.mockResolvedValueOnce(textResponse("Alice Smith\nHello from the exported doc."));

      const full = await client.getFullConference(CONFERENCE);

      expect(full.entries).toHaveLength(2);
      expect(full.entries[0]).toMatchObject({
        name: "conferenceRecords/abc123/transcripts/def456/entries/drive-doc-1",
        text: "Alice Smith",
        languageCode: "und",
      });
      expect(full.entries[1].text).toBe("Hello from the exported doc.");

      const [url] = nthFetchCall(3);
      expect(url).toContain("https://www.googleapis.com/drive/v3/files/");
      expect(url).toContain("1kuceFZohVoCh6FulBHxwy6I15Ogpc4hP");
      expect(url).toContain("mimeType=text%2Fplain");
    });
  });

  // ── Token refresh on 401 ─────────────────────────────────────────

  describe("token refresh on 401", () => {
    it("retries request after refreshing token", async () => {
      const onRefresh = mock(() => Promise.resolve());
      client = new GoogleMeetClient("ya29.expired-token", onRefresh);

      // First call returns 401
      mockFetch.mockResolvedValueOnce(jsonResponse({ error: { code: 401 } }, 401));
      // Refresh token call succeeds
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ access_token: "ya29.new-token", expires_in: 3599 }),
      );
      // Retry succeeds
      mockFetch.mockResolvedValueOnce(jsonResponse({ conferenceRecords: [CONFERENCE] }));

      // Need env vars for refresh
      process.env.GOOGLE_CLIENT_ID = "test-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-secret";

      const records = await client.listConferenceRecords();

      expect(records).toHaveLength(1);
      expect(onRefresh).toHaveBeenCalledTimes(1);
      expect(onRefresh).toHaveBeenCalledWith("ya29.new-token");

      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
    });

    it("does not retry more than once on repeated 401", async () => {
      const onRefresh = mock(() => Promise.resolve());
      client = new GoogleMeetClient("ya29.bad-token", onRefresh);

      mockFetch.mockResolvedValueOnce(jsonResponse({ error: { code: 401 } }, 401));
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ access_token: "ya29.still-bad", expires_in: 3599 }),
      );
      mockFetch.mockResolvedValueOnce(jsonResponse({ error: { code: 401 } }, 401));

      process.env.GOOGLE_CLIENT_ID = "test-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-secret";

      await expect(client.listConferenceRecords()).rejects.toThrow();

      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
    });

    it("requires refreshToken to be set for 401 retry", async () => {
      client = new GoogleMeetClient("ya29.expired-token"); // no onRefresh

      mockFetch.mockResolvedValueOnce(jsonResponse({ error: { code: 401 } }, 401));

      await expect(client.listConferenceRecords()).rejects.toThrow();
    });
  });

  // ── Rate limiting (429) ───────────────────────────────────────────

  describe("rate limiting (429)", () => {
    it("retries on 429 with backoff", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ error: "rate_limited" }, 429));
      mockFetch.mockResolvedValueOnce(jsonResponse({ conferenceRecords: [CONFERENCE] }));

      const records = await client.listConferenceRecords();

      expect(records).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("gives up after max retries on 429", async () => {
      for (let i = 0; i < 4; i++) {
        mockFetch.mockResolvedValueOnce(jsonResponse({ error: "rate_limited" }, 429));
      }

      await expect(client.listConferenceRecords()).rejects.toThrow();
    });
  });

  // ── Error handling ────────────────────────────────────────────────

  describe("error handling", () => {
    it("throws on non-retryable HTTP errors", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ error: "forbidden" }, 403));

      await expect(client.listConferenceRecords()).rejects.toThrow();
    });

    it("throws on 500 server errors", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ error: "internal" }, 500));

      await expect(client.listConferenceRecords()).rejects.toThrow();
    });
  });
});
