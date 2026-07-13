import { describe, expect, test } from "bun:test";
import {
  LISTEN_TRANSCRIPT_SQL_STATEMENT_TEMPLATES as CLIENT_STATEMENTS,
  LISTEN_TRANSCRIPT_STATEMENT_NAMES as CLIENT_STATEMENT_NAMES,
  createListenTranscriptCapability as createClientListenTranscriptCapability,
  createListenTranscriptSelectionCapability as createClientListenTranscriptSelectionCapability,
} from "../../../client/dist/transcript-binding.js";
import {
  LISTEN_TRANSCRIPT_SQL_STATEMENT_CATALOG,
  LISTEN_TRANSCRIPT_STATEMENT_NAMES,
  createListenTranscriptCapability,
  createListenTranscriptSelectionCapability,
} from "../transcript-resource-adapter.js";

describe("Listen transcript resource catalog drift", () => {
  test("matches the client transcript binding statement names and SQL bytes", () => {
    expect(LISTEN_TRANSCRIPT_STATEMENT_NAMES).toEqual(CLIENT_STATEMENT_NAMES);
    expect(LISTEN_TRANSCRIPT_SQL_STATEMENT_CATALOG.map(({ name, sql }) => ({ name, sql }))).toEqual(
      CLIENT_STATEMENTS.map(({ name, sql }) => ({ name, sql })),
    );
  });

  test("matches the client transcript binding constrained statement caveat shape", () => {
    const conversationId = "conversation-drift-check";
    const serverCapability = createListenTranscriptCapability(conversationId);
    const clientCapability = createClientListenTranscriptCapability(conversationId);

    expect(serverCapability.caveats).toEqual(clientCapability.caveats);

    expect(
      createListenTranscriptSelectionCapability(["conversation-b", "conversation-a"]).caveats,
    ).toEqual(
      createClientListenTranscriptSelectionCapability(["conversation-b", "conversation-a"]).caveats,
    );
  });
});
