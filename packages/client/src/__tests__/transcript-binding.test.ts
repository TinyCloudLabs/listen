import { describe, expect, test } from "bun:test";

import {
  LISTEN_CONTENT_SPACE,
  LISTEN_CONVERSATIONS_SQL_PATH,
  LISTEN_RESOURCE_PREFIX,
  LISTEN_TRANSCRIPT_CONVERSATION_COLUMNS,
  LISTEN_TRANSCRIPT_PARTICIPANT_COLUMNS,
  createListenTranscriptCapability,
  listenTranscriptResourceId,
  listenTranscriptSqlInvokeRequests,
} from "../transcript-binding.js";

describe("Listen transcript SQL binding", () => {
  test("creates the constrained SQL capability for a transcript", () => {
    const capability = createListenTranscriptCapability("conv_456");

    expect(capability).toEqual({
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
    });

    const serialized = JSON.stringify(capability);
    expect(serialized).not.toContain("tinycloud.kv");
    expect(serialized).not.toContain("com.listen.app");
  });

  test("allows callers to override the content space only", () => {
    expect(createListenTranscriptCapability("conv_456", { space: "shared" }).space).toBe("shared");
  });

  test("derives the transcript resource id", () => {
    expect(listenTranscriptResourceId("conv 456")).toBe(
      `${LISTEN_RESOURCE_PREFIX}/transcript/conv%20456`,
    );
    expect(() => listenTranscriptResourceId("")).toThrow("conversationId is required");
  });

  test("uses named executeStatement requests with caller params omitted", () => {
    expect(listenTranscriptSqlInvokeRequests()).toEqual([
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
});
