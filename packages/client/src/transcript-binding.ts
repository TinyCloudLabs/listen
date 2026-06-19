export const LISTEN_RESOURCE_PREFIX = "xyz.tinycloud.listen";
export const LISTEN_CONTENT_SPACE = "applications";
export const LISTEN_CONVERSATIONS_SQL_PATH = `${LISTEN_RESOURCE_PREFIX}/conversations`;
export const LISTEN_TRANSCRIPT_RESOURCE_TYPE = `${LISTEN_RESOURCE_PREFIX}/transcript/v0`;

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
}

export interface ListenTranscriptSqlStatement extends ListenTranscriptSqlStatementTemplate {
  fixedParams: SqlFixedParam[];
}

export interface SqlConstrainedStatementCaveat {
  mode: "constrained-statements";
  readOnly: true;
  statements: ListenTranscriptSqlStatement[];
}

export interface ListenTranscriptSqlCapability {
  service: "tinycloud.sql";
  space: string;
  path: typeof LISTEN_CONVERSATIONS_SQL_PATH;
  actions: ["tinycloud.sql/read"];
  caveats: SqlConstrainedStatementCaveat;
}

export interface ListenTranscriptResourceBinding {
  resourceType: typeof LISTEN_TRANSCRIPT_RESOURCE_TYPE;
  resourceId: string;
  conversationId: string;
  capabilities: [ListenTranscriptSqlCapability];
}

export interface ListenTranscriptSqlInvokeRequest {
  action: "executeStatement";
  name: ListenTranscriptStatementName;
  params: [];
}

export interface SqlRowSet {
  columns: readonly string[];
  rows: readonly unknown[];
}

export type ListenTranscriptSqlResultMap = {
  [K in ListenTranscriptStatementName]: SqlRowSet;
};

export interface ListenTranscriptConversation {
  id: string;
  title: string | null;
  source: string;
  source_id: string | null;
  source_url: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_secs: number | null;
  summary: string | null;
  metadata: Record<string, unknown>;
  transcript_json: string | null;
  transcript_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListenTranscriptParticipant {
  id: string;
  name: string;
  email: string | null;
  speaker_label: string | null;
}

export interface ListenTranscriptSentence {
  index: number;
  speaker_id: string;
  speaker_name: string;
  text: string;
  start_time: number | null;
  end_time: number | null;
  language: string | null;
}

export interface ListenTranscriptLandingPage {
  conversation: ListenTranscriptConversation;
  participants: ListenTranscriptParticipant[];
  transcript: ListenTranscriptSentence[] | null;
}

export const LISTEN_TRANSCRIPT_SQL_STATEMENT_TEMPLATES: readonly ListenTranscriptSqlStatementTemplate[] =
  [
    {
      name: "listen.getConversation",
      sql: `SELECT ${LISTEN_TRANSCRIPT_CONVERSATION_COLUMNS.join(
        ", ",
      )} FROM conversation WHERE id = ?`,
    },
    {
      name: "listen.listParticipants",
      sql: `SELECT ${LISTEN_TRANSCRIPT_PARTICIPANT_COLUMNS.join(
        ", ",
      )} FROM participant WHERE conversation_id = ? ORDER BY COALESCE(speaker_label, name), id`,
    },
  ];

export function listenTranscriptResourceId(conversationId: string): string {
  if (conversationId.length === 0) {
    throw new Error("conversationId is required");
  }
  return `${LISTEN_RESOURCE_PREFIX}/transcript/${encodeURIComponent(conversationId)}`;
}

export function createListenTranscriptResourceBinding(
  conversationId: string,
  options: { space?: string } = {},
): ListenTranscriptResourceBinding {
  const space = options.space ?? LISTEN_CONTENT_SPACE;
  const fixedConversationParam = (): SqlFixedParam[] => [{ index: 0, value: conversationId }];

  return {
    resourceType: LISTEN_TRANSCRIPT_RESOURCE_TYPE,
    resourceId: listenTranscriptResourceId(conversationId),
    conversationId,
    capabilities: [
      {
        service: "tinycloud.sql",
        space,
        path: LISTEN_CONVERSATIONS_SQL_PATH,
        actions: ["tinycloud.sql/read"],
        caveats: {
          mode: "constrained-statements",
          readOnly: true,
          statements: LISTEN_TRANSCRIPT_SQL_STATEMENT_TEMPLATES.map((statement) => ({
            ...statement,
            fixedParams: fixedConversationParam(),
          })),
        },
      },
    ],
  };
}

export function listenTranscriptSqlInvokeRequests(
  binding: ListenTranscriptResourceBinding,
): ListenTranscriptSqlInvokeRequest[] {
  return binding.capabilities[0].caveats.statements.map((statement) => ({
    action: "executeStatement",
    name: statement.name,
    params: [],
  }));
}

export function reconstructListenTranscriptLandingPage(
  results: ListenTranscriptSqlResultMap,
): ListenTranscriptLandingPage {
  const conversations = rowsToObjects(results["listen.getConversation"]);
  const conversationRow = conversations[0];
  if (!conversationRow) {
    throw new Error("listen.getConversation returned no conversation row");
  }

  const participants = rowsToObjects(results["listen.listParticipants"])
    .map(toParticipant)
    .sort(compareParticipants);
  const conversation = toConversation(conversationRow);
  const transcript =
    conversation.transcript_json === null
      ? null
      : normalizeTranscript(conversation.transcript_json);

  return {
    conversation,
    participants,
    transcript,
  };
}

function rowsToObjects(rowSet: SqlRowSet): Record<string, unknown>[] {
  return rowSet.rows.map((row) => rowToObject(row, rowSet.columns));
}

function rowToObject(row: unknown, columns: readonly string[]): Record<string, unknown> {
  if (Array.isArray(row)) {
    const object: Record<string, unknown> = {};
    columns.forEach((column, index) => {
      object[column] = row[index];
    });
    return object;
  }

  if (isRecord(row)) return { ...row };
  return {};
}

function toConversation(row: Record<string, unknown>): ListenTranscriptConversation {
  return {
    id: stringField(row, "id") ?? "",
    title: stringField(row, "title"),
    source: stringField(row, "source") ?? "",
    source_id: stringField(row, "source_id"),
    source_url: stringField(row, "source_url"),
    started_at: stringField(row, "started_at"),
    ended_at: stringField(row, "ended_at"),
    duration_secs: numberField(row, "duration_secs"),
    summary: stringField(row, "summary"),
    metadata: parseJsonObject(row.metadata) ?? {},
    transcript_json: stringField(row, "transcript_json"),
    transcript_text: stringField(row, "transcript_text"),
    created_at: stringField(row, "created_at") ?? "",
    updated_at: stringField(row, "updated_at") ?? "",
  };
}

function toParticipant(row: Record<string, unknown>): ListenTranscriptParticipant {
  return {
    id: stringField(row, "id") ?? "",
    name: stringField(row, "name") ?? "",
    email: stringField(row, "email"),
    speaker_label: stringField(row, "speaker_label"),
  };
}

function compareParticipants(
  left: ListenTranscriptParticipant,
  right: ListenTranscriptParticipant,
): number {
  return (
    (left.speaker_label ?? left.name).localeCompare(right.speaker_label ?? right.name) ||
    left.id.localeCompare(right.id)
  );
}

function normalizeTranscript(value: unknown): ListenTranscriptSentence[] | null {
  const candidates = transcriptCandidates(value);
  if (candidates === null) return null;

  const transcript: ListenTranscriptSentence[] = [];
  for (const candidate of candidates) {
    const sentence = normalizeTranscriptEntry(candidate, transcript.length);
    if (sentence) transcript.push(sentence);
  }
  return transcript;
}

function transcriptCandidates(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return transcriptCandidates(parseJsonValue(value));
  if (!isRecord(value)) return null;

  for (const key of ["transcript", "sentences", "segments", "items"]) {
    const candidate = value[key];
    if (Array.isArray(candidate)) return candidate;
  }

  if (Array.isArray(value.data)) return value.data;
  if (typeof value.text === "string") return [value];
  return null;
}

function normalizeTranscriptEntry(
  entry: unknown,
  fallbackIndex: number,
): ListenTranscriptSentence | null {
  if (!isRecord(entry)) return null;

  const text = readStringField(entry, ["text", "raw_text", "rawText"]);
  if (!text) return null;

  const speakerName =
    readStringField(entry, ["speaker_name", "speakerName", "speaker", "name"]) ?? "Speaker";
  const speakerId =
    readStringField(entry, ["speaker_id", "speakerId", "speaker_label", "speakerLabel"]) ??
    slugify(speakerName, fallbackIndex);

  return {
    index: readNumberField(entry, ["index"]) ?? fallbackIndex,
    speaker_id: speakerId,
    speaker_name: speakerName,
    text,
    start_time: readNumberField(entry, ["start_time", "startTime", "start"]),
    end_time: readNumberField(entry, ["end_time", "endTime", "end"]),
    language: readStringField(entry, ["language", "languageCode"]),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringField(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberField(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function readStringField(value: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}

function readNumberField(value: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
    if (typeof candidate === "string" && candidate.trim() !== "") {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (isRecord(value)) return value;
  if (typeof value !== "string") return null;

  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseJsonValue(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function slugify(value: string, fallbackIndex: number): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-") || `speaker-${fallbackIndex + 1}`;
}
