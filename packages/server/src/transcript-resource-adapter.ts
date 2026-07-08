/**
 * Listen transcript resource adapter.
 *
 * Compatibility note: packages/client/src/transcript-binding.ts is the catalog
 * of record for statement names, SQL bytes, and the constrained SQL caveat
 * shape. Keep this server catalog byte-identical to that binding; the
 * cross-package drift test fails on any divergence.
 *
 * listen.getConversation includes transcript_json and transcript_text, which
 * disclose the full transcript body. Downstream scope-confirmation UI must
 * state that transcript text is included.
 */

export const LISTEN_RESOURCE_PREFIX = "xyz.tinycloud.listen";
export const LISTEN_CONTENT_SPACE = "applications";
export const LISTEN_CONVERSATIONS_SQL_PATH = `${LISTEN_RESOURCE_PREFIX}/conversations`;
export const LISTEN_TRANSCRIPT_RESOURCE_TYPE = `${LISTEN_RESOURCE_PREFIX}/transcript/v0`;
export const LISTEN_TRANSCRIPT_PROJECTION_RESOURCE_TYPE = `${LISTEN_RESOURCE_PREFIX}/transcript-projection/v0`;
export const LISTEN_TRANSCRIPT_PROJECTION_PATH_PREFIX = `${LISTEN_RESOURCE_PREFIX}/projections`;

export const LISTEN_TRANSCRIPT_SCHEMA_DRIFT_VERSION = "listen.transcript-resource-adapter.v0";
export const LISTEN_TRANSCRIPT_CATALOG_SOURCE_OF_TRUTH =
  "packages/client/src/transcript-binding.ts";

export const LISTEN_TRANSCRIPT_CONVERSATION_COLUMNS = [
  "id",
  "title",
  "source",
  "source_id",
  "source_url",
  "started_at",
  "ended_at",
  "duration_secs",
  "summary",
  "metadata",
  "transcript_json",
  "transcript_text",
  "created_at",
  "updated_at",
] as const;

export const LISTEN_TRANSCRIPT_PARTICIPANT_COLUMNS = [
  "id",
  "name",
  "email",
  "speaker_label",
] as const;

export const LISTEN_TRANSCRIPT_STATEMENT_NAMES = [
  "listen.getConversation",
  "listen.listParticipants",
] as const;

export type ListenTranscriptStatementName = (typeof LISTEN_TRANSCRIPT_STATEMENT_NAMES)[number];

export interface SqlFixedParam {
  index: number;
  value: unknown;
}

export interface ListenTranscriptSqlStatementTemplate {
  name: ListenTranscriptStatementName;
  sql: string;
  fixedParams: readonly [{ readonly index: 0; readonly value: "{conversationId}" }];
}

export interface ListenTranscriptSqlStatement {
  name: ListenTranscriptStatementName;
  sql: string;
  fixedParams: SqlFixedParam[];
}

export interface SqlConstrainedStatementCaveat {
  mode: "constrained-statements";
  readOnly: true;
  statements: ListenTranscriptSqlStatement[];
}

export interface PolicyCapability {
  service: string;
  space: string;
  path: string;
  actions: string[];
  caveats?: unknown;
  resourceType?: string;
}

export interface ListenTranscriptSqlCapability extends PolicyCapability {
  service: "tinycloud.sql";
  space: string;
  path: typeof LISTEN_CONVERSATIONS_SQL_PATH;
  actions: ["tinycloud.sql/read"];
  caveats: SqlConstrainedStatementCaveat;
}

export interface ListenTranscriptKvCapability extends PolicyCapability {
  service: "tinycloud.kv";
  space: string;
  path: string;
  actions: ["tinycloud.kv/get", "tinycloud.kv/metadata"];
  resourceType:
    | typeof LISTEN_TRANSCRIPT_RESOURCE_TYPE
    | typeof LISTEN_TRANSCRIPT_PROJECTION_RESOURCE_TYPE;
}

export interface ListenTranscriptResourceAdapterOptions {
  conversationIds: readonly string[];
  space?: string;
  transcriptKvBodyConversationIds?: readonly string[];
  projectionObjectPathsByConversationId?: Readonly<Record<string, readonly string[]>>;
  prefixKvPath?: string;
  allowPrefixCapability?: boolean;
}

export const LISTEN_TRANSCRIPT_SQL_STATEMENT_CATALOG = [
  {
    name: "listen.getConversation",
    sql: `SELECT ${LISTEN_TRANSCRIPT_CONVERSATION_COLUMNS.join(
      ", ",
    )} FROM conversation WHERE id = ?`,
    fixedParams: [{ index: 0, value: "{conversationId}" }],
  },
  {
    name: "listen.listParticipants",
    sql: `SELECT ${LISTEN_TRANSCRIPT_PARTICIPANT_COLUMNS.join(
      ", ",
    )} FROM participant WHERE conversation_id = ? ORDER BY COALESCE(speaker_label, name), id`,
    fixedParams: [{ index: 0, value: "{conversationId}" }],
  },
] as const satisfies readonly ListenTranscriptSqlStatementTemplate[];

export function getListenTranscriptSqlStatementTemplate(
  name: string,
): ListenTranscriptSqlStatementTemplate {
  const statement = LISTEN_TRANSCRIPT_SQL_STATEMENT_CATALOG.find(
    (candidate) => candidate.name === name,
  );

  if (!statement) {
    throw new Error(`Unknown Listen transcript SQL statement: ${name}`);
  }

  return statement;
}

export function listenTranscriptResourceId(conversationId: string): string {
  assertNonEmptyId(conversationId, "conversationId");
  return `${LISTEN_RESOURCE_PREFIX}/transcript/${encodeURIComponent(conversationId)}`;
}

export function createListenTranscriptCapability(
  conversationId: string,
  options: { space?: string } = {},
): ListenTranscriptSqlCapability {
  assertNonEmptyId(conversationId, "conversationId");

  return {
    service: "tinycloud.sql",
    space: options.space ?? LISTEN_CONTENT_SPACE,
    path: LISTEN_CONVERSATIONS_SQL_PATH,
    actions: ["tinycloud.sql/read"],
    caveats: {
      mode: "constrained-statements",
      readOnly: true,
      statements: LISTEN_TRANSCRIPT_SQL_STATEMENT_CATALOG.map((statement) => ({
        name: statement.name,
        sql: statement.sql,
        fixedParams: [{ index: 0, value: conversationId }],
      })),
    },
  };
}

export function createListenTranscriptResourceCapabilities(
  options: ListenTranscriptResourceAdapterOptions,
): PolicyCapability[] {
  const conversationIds = normalizeConversationIds(options.conversationIds);
  const space = options.space ?? LISTEN_CONTENT_SPACE;
  const selectedIdSet = new Set(conversationIds);
  const requestedKvBodyIds = normalizeOptionalConversationIds(
    options.transcriptKvBodyConversationIds ?? [],
    "transcriptKvBodyConversationIds",
  );

  assertSubsetOfSelection(requestedKvBodyIds, selectedIdSet, "transcriptKvBodyConversationIds");

  if (options.prefixKvPath && !options.allowPrefixCapability) {
    throw new Error("Prefix KV capability requires allowPrefixCapability: true");
  }

  if (options.prefixKvPath) {
    throw new Error("Prefix KV capabilities are not supported by this exact-resource adapter");
  }

  const capabilities: PolicyCapability[] = [];

  for (const conversationId of conversationIds) {
    capabilities.push(createListenTranscriptCapability(conversationId, { space }));

    if (requestedKvBodyIds.includes(conversationId)) {
      capabilities.push(createTranscriptKvBodyCapability(conversationId, space));
    }

    for (const projectionPath of projectionPathsForConversation(
      conversationId,
      options.projectionObjectPathsByConversationId,
      selectedIdSet,
    )) {
      capabilities.push(
        createTranscriptProjectionCapability(conversationId, projectionPath, space),
      );
    }
  }

  return capabilities;
}

function createTranscriptKvBodyCapability(
  conversationId: string,
  space: string,
): ListenTranscriptKvCapability {
  return {
    service: "tinycloud.kv",
    space,
    path: listenTranscriptResourceId(conversationId),
    actions: ["tinycloud.kv/get", "tinycloud.kv/metadata"],
    resourceType: LISTEN_TRANSCRIPT_RESOURCE_TYPE,
  };
}

function createTranscriptProjectionCapability(
  conversationId: string,
  path: string,
  space: string,
): ListenTranscriptKvCapability {
  assertProjectionPathForConversation(
    path,
    conversationId,
    "projectionObjectPathsByConversationId",
  );

  return {
    service: "tinycloud.kv",
    space,
    path,
    actions: ["tinycloud.kv/get", "tinycloud.kv/metadata"],
    resourceType: LISTEN_TRANSCRIPT_PROJECTION_RESOURCE_TYPE,
  };
}

function projectionPathsForConversation(
  conversationId: string,
  projectionPathsByConversationId: Readonly<Record<string, readonly string[]>> | undefined,
  selectedIdSet: ReadonlySet<string>,
): string[] {
  if (!projectionPathsByConversationId) {
    return [];
  }

  for (const requestedId of Object.keys(projectionPathsByConversationId)) {
    if (!selectedIdSet.has(requestedId)) {
      throw new Error(
        `projectionObjectPathsByConversationId includes unselected ID: ${requestedId}`,
      );
    }
  }

  const paths = projectionPathsByConversationId[conversationId] ?? [];
  const uniqueSortedPaths = [...new Set(paths)];

  for (const path of uniqueSortedPaths) {
    assertProjectionPathForConversation(
      path,
      conversationId,
      "projectionObjectPathsByConversationId",
    );
  }

  return uniqueSortedPaths.sort(compareUtf8);
}

function normalizeConversationIds(conversationIds: readonly string[]): string[] {
  const normalized = normalizeOptionalConversationIds(conversationIds, "conversationIds");

  if (normalized.length === 0) {
    throw new Error("At least one conversation ID is required");
  }

  return normalized;
}

function normalizeOptionalConversationIds(
  conversationIds: readonly string[],
  fieldName: string,
): string[] {
  const normalized = [...new Set(conversationIds)];

  for (const conversationId of normalized) {
    assertNonEmptyId(conversationId, fieldName);
  }

  return normalized.sort(compareUtf8);
}

function assertSubsetOfSelection(
  requestedIds: readonly string[],
  selectedIdSet: ReadonlySet<string>,
  fieldName: string,
): void {
  for (const requestedId of requestedIds) {
    if (!selectedIdSet.has(requestedId)) {
      throw new Error(`${fieldName} includes unselected ID: ${requestedId}`);
    }
  }
}

function assertNonEmptyId(value: string, fieldName: string): void {
  if (value.length === 0) {
    throw new Error(`${fieldName} is required`);
  }
}

function assertExactPath(path: string, fieldName: string): void {
  assertNonEmptyId(path, fieldName);

  if (path.endsWith("/") || path.includes("*")) {
    throw new Error(`${fieldName} must contain exact resource paths only`);
  }
}

function assertProjectionPathForConversation(
  path: string,
  conversationId: string,
  fieldName: string,
): void {
  assertExactPath(path, fieldName);

  const conversationProjectionPrefix = `${LISTEN_TRANSCRIPT_PROJECTION_PATH_PREFIX}/${encodeURIComponent(
    conversationId,
  )}/`;

  if (!path.startsWith(conversationProjectionPrefix)) {
    throw new Error(
      `${fieldName} for ${conversationId} must be under ${conversationProjectionPrefix}`,
    );
  }
}

function compareUtf8(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
