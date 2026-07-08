import { describe, expect, test } from "bun:test";
import {
  LISTEN_CONVERSATIONS_SQL_PATH,
  LISTEN_CONTENT_SPACE,
  LISTEN_TRANSCRIPT_RESOURCE_TYPE,
  LISTEN_TRANSCRIPT_SQL_STATEMENT_CATALOG,
  createListenTranscriptCapability,
  createListenTranscriptResourceCapabilities,
  getListenTranscriptSqlStatementTemplate,
  listenTranscriptResourceId,
} from "../transcript-resource-adapter.js";

describe("Listen transcript resource adapter", () => {
  test("emits one constrained SQL capability per selected conversation ID in deterministic order", () => {
    const capabilities = createListenTranscriptResourceCapabilities({
      conversationIds: ["conversation-b", "conversation-a", "conversation-b"],
    });

    expect(capabilities).toEqual([
      createListenTranscriptCapability("conversation-a"),
      createListenTranscriptCapability("conversation-b"),
    ]);

    for (const capability of capabilities) {
      expect(capability.service).toBe("tinycloud.sql");
      expect(capability.space).toBe(LISTEN_CONTENT_SPACE);
      expect(capability.path).toBe(LISTEN_CONVERSATIONS_SQL_PATH);
      expect(capability.actions).toEqual(["tinycloud.sql/read"]);
    }
  });

  test("binds both constrained SQL statements to the selected conversation ID", () => {
    const capability = createListenTranscriptCapability("conversation-123");

    expect(capability.caveats).toEqual({
      mode: "constrained-statements",
      readOnly: true,
      statements: LISTEN_TRANSCRIPT_SQL_STATEMENT_CATALOG.map((statement) => ({
        name: statement.name,
        sql: statement.sql,
        fixedParams: [{ index: 0, value: "conversation-123" }],
      })),
    });
  });

  test("rejects empty selection", () => {
    expect(() => createListenTranscriptResourceCapabilities({ conversationIds: [] })).toThrow(
      "At least one conversation ID is required",
    );
  });

  test("rejects unknown statement name at catalog lookup", () => {
    expect(() => getListenTranscriptSqlStatementTemplate("listen.nope")).toThrow(
      "Unknown Listen transcript SQL statement: listen.nope",
    );
  });

  test("rejects prefix expansion without explicit opt-in", () => {
    expect(() =>
      createListenTranscriptResourceCapabilities({
        conversationIds: ["conversation-1"],
        prefixKvPath: "xyz.tinycloud.listen/transcript/",
      }),
    ).toThrow("Prefix KV capability requires allowPrefixCapability: true");
  });

  test("rejects prefix expansion even with opt-in because this adapter emits exact resources only", () => {
    expect(() =>
      createListenTranscriptResourceCapabilities({
        conversationIds: ["conversation-1"],
        prefixKvPath: "xyz.tinycloud.listen/transcript/",
        allowPrefixCapability: true,
      }),
    ).toThrow("Prefix KV capabilities are not supported by this exact-resource adapter");
  });

  test("emits KV body capabilities only for explicitly requested selected IDs", () => {
    const capabilities = createListenTranscriptResourceCapabilities({
      conversationIds: ["conversation-b", "conversation-a"],
      transcriptKvBodyConversationIds: ["conversation-b"],
    });

    expect(capabilities).toEqual([
      createListenTranscriptCapability("conversation-a"),
      createListenTranscriptCapability("conversation-b"),
      {
        service: "tinycloud.kv",
        space: LISTEN_CONTENT_SPACE,
        path: listenTranscriptResourceId("conversation-b"),
        actions: ["tinycloud.kv/get", "tinycloud.kv/metadata"],
        resourceType: LISTEN_TRANSCRIPT_RESOURCE_TYPE,
      },
    ]);
  });

  test("rejects KV body capabilities for unselected IDs", () => {
    expect(() =>
      createListenTranscriptResourceCapabilities({
        conversationIds: ["conversation-a"],
        transcriptKvBodyConversationIds: ["conversation-b"],
      }),
    ).toThrow("transcriptKvBodyConversationIds includes unselected ID: conversation-b");
  });

  test("emits optional projection object capabilities as exact paths", () => {
    const capabilities = createListenTranscriptResourceCapabilities({
      conversationIds: ["conversation-a"],
      projectionObjectPathsByConversationId: {
        "conversation-a": [
          "xyz.tinycloud.listen/projections/conversation-a/summary",
          "xyz.tinycloud.listen/projections/conversation-a/highlights",
        ],
      },
    });

    expect(capabilities).toEqual([
      createListenTranscriptCapability("conversation-a"),
      {
        service: "tinycloud.kv",
        space: LISTEN_CONTENT_SPACE,
        path: "xyz.tinycloud.listen/projections/conversation-a/highlights",
        actions: ["tinycloud.kv/get", "tinycloud.kv/metadata"],
        resourceType: "xyz.tinycloud.listen/transcript-projection/v0",
      },
      {
        service: "tinycloud.kv",
        space: LISTEN_CONTENT_SPACE,
        path: "xyz.tinycloud.listen/projections/conversation-a/summary",
        actions: ["tinycloud.kv/get", "tinycloud.kv/metadata"],
        resourceType: "xyz.tinycloud.listen/transcript-projection/v0",
      },
    ]);
  });
});
