import { describe, expect, test } from "bun:test";

import {
  LISTEN_CONTENT_SPACE,
  LISTEN_CONVERSATIONS_SQL_PATH,
  LISTEN_RESOURCE_PREFIX,
  LISTEN_TRANSCRIPT_CONVERSATION_COLUMNS,
  LISTEN_TRANSCRIPT_PARTICIPANT_COLUMNS,
  LISTEN_TRANSCRIPT_RESOURCE_TYPE,
  createListenTranscriptResourceBinding,
  listenTranscriptSqlInvokeRequests,
  reconstructListenTranscriptLandingPage,
  type ListenTranscriptSqlResultMap,
} from "../transcript-binding.js";

describe("Listen transcript SQL binding", () => {
  test("creates a canonical SQL-only transcript resource binding", () => {
    const binding = createListenTranscriptResourceBinding("conv_456");

    expect(binding).toEqual({
      resourceType: LISTEN_TRANSCRIPT_RESOURCE_TYPE,
      resourceId: `${LISTEN_RESOURCE_PREFIX}/transcript/conv_456`,
      conversationId: "conv_456",
      capabilities: [
        {
          service: "tinycloud.sql",
          space: LISTEN_CONTENT_SPACE,
          path: LISTEN_CONVERSATIONS_SQL_PATH,
          actions: ["tinycloud.sql/read"],
          caveats: {
            mode: "constrained-statements",
            readOnly: true,
            statements: [
              {
                name: "listen.getConversation",
                sql: `SELECT ${LISTEN_TRANSCRIPT_CONVERSATION_COLUMNS.join(
                  ", ",
                )} FROM conversation WHERE id = ?`,
                fixedParams: [{ index: 0, value: "conv_456" }],
              },
              {
                name: "listen.listParticipants",
                sql: `SELECT ${LISTEN_TRANSCRIPT_PARTICIPANT_COLUMNS.join(
                  ", ",
                )} FROM participant WHERE conversation_id = ? ORDER BY COALESCE(speaker_label, name), id`,
                fixedParams: [{ index: 0, value: "conv_456" }],
              },
            ],
          },
        },
      ],
    });

    const serialized = JSON.stringify(binding);
    expect(serialized).not.toContain("tinycloud.kv");
    expect(serialized).not.toContain("com.listen.app");
  });

  test("uses named executeStatement requests with fixed SQL params omitted", () => {
    const binding = createListenTranscriptResourceBinding("conv_456");

    expect(listenTranscriptSqlInvokeRequests(binding)).toEqual([
      {
        action: "executeStatement",
        name: "listen.getConversation",
        params: [],
      },
      {
        action: "executeStatement",
        name: "listen.listParticipants",
        params: [],
      },
    ]);
  });

  test("reconstructs the transcript landing page from SQL rowsets only", () => {
    const transcript = [
      {
        speakerName: "Ada",
        text: "Let's keep transcript reads in SQL.",
        startTime: 0,
        endTime: 2.5,
        languageCode: "en",
      },
      {
        speakerName: "Grace",
        speakerLabel: "B",
        text: "Then policy grants only need a constrained statement caveat.",
        startTime: 3,
        endTime: 7,
      },
    ];
    const results: ListenTranscriptSqlResultMap = {
      "listen.getConversation": {
        columns: LISTEN_TRANSCRIPT_CONVERSATION_COLUMNS,
        rows: [
          [
            "conv_456",
            "Policy sync",
            "granola",
            "granola-1",
            "https://example.test/source",
            "2026-06-19T10:00:00.000Z",
            "2026-06-19T10:30:00.000Z",
            1800,
            "Credential-gated transcript access.",
            JSON.stringify({ audio_kv_key: "audio/conv_456/recording" }),
            JSON.stringify(transcript),
            "Ada: Let's keep transcript reads in SQL.",
            "2026-06-19T10:31:00.000Z",
            "2026-06-19T10:32:00.000Z",
          ],
        ],
      },
      "listen.listParticipants": {
        columns: LISTEN_TRANSCRIPT_PARTICIPANT_COLUMNS,
        rows: [
          ["p2", "Grace Hopper", "grace@example.test", "B"],
          ["p1", "Ada Lovelace", "ada@example.test", "A"],
        ],
      },
    };

    const page = reconstructListenTranscriptLandingPage(results);

    expect(page.conversation).toMatchObject({
      id: "conv_456",
      title: "Policy sync",
      source: "granola",
      source_id: "granola-1",
      source_url: "https://example.test/source",
      started_at: "2026-06-19T10:00:00.000Z",
      ended_at: "2026-06-19T10:30:00.000Z",
      duration_secs: 1800,
      summary: "Credential-gated transcript access.",
      metadata: { audio_kv_key: "audio/conv_456/recording" },
      transcript_text: "Ada: Let's keep transcript reads in SQL.",
    });
    expect(page.participants.map((participant) => participant.id)).toEqual(["p1", "p2"]);
    expect(page.transcript).toEqual([
      {
        index: 0,
        speaker_id: "ada",
        speaker_name: "Ada",
        text: "Let's keep transcript reads in SQL.",
        start_time: 0,
        end_time: 2.5,
        language: "en",
      },
      {
        index: 1,
        speaker_id: "B",
        speaker_name: "Grace",
        text: "Then policy grants only need a constrained statement caveat.",
        start_time: 3,
        end_time: 7,
        language: null,
      },
    ]);
  });

  test("returns null transcript when the SQL transcript column is empty", () => {
    const results: ListenTranscriptSqlResultMap = {
      "listen.getConversation": {
        columns: LISTEN_TRANSCRIPT_CONVERSATION_COLUMNS,
        rows: [
          [
            "conv_456",
            "Policy sync",
            "manual",
            null,
            null,
            null,
            null,
            null,
            null,
            "{}",
            null,
            null,
            "2026-06-19T10:31:00.000Z",
            "2026-06-19T10:32:00.000Z",
          ],
        ],
      },
      "listen.listParticipants": {
        columns: LISTEN_TRANSCRIPT_PARTICIPANT_COLUMNS,
        rows: [],
      },
    };

    expect(reconstructListenTranscriptLandingPage(results).transcript).toBeNull();
  });
});
