import type { TinyCloudWeb } from "@tinycloud/web-sdk";
import type { ApiClient } from "@listen/client";
import {
  MIGRATION_NAMESPACE,
  SCHEMA_STATEMENTS,
  COLUMN_MIGRATION_STATEMENTS,
  COLUMN_MIGRATION_ALREADY_APPLIED_STATEMENTS,
} from "@listen/core";
import { normalizeAppRelativeKvKey, resolveAppKvPath, resolveAppSqlPath } from "./appManifest";

export const DATABASE_NAME = resolveAppSqlPath("conversations");
const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;
const BASE64_AUDIO_STORAGE_ENCODING = "base64-string-kv";

export interface NormalizedTranscriptSentence {
  index: number;
  speaker_id: string;
  speaker_name: string;
  text: string;
  start_time: number | null;
  end_time: number | null;
  language: string | null;
}

export interface TinyCloudSql {
  query(sql: string, params?: unknown[]): Promise<unknown>;
}

type SchemaMigrationResult = { ok: boolean; error?: { message?: string } };

/**
 * The subset of the web-sdk SQL database handle used to seed the schema.
 * `sql.db(name)` returns a handle exposing `migrations.apply`; the fallback
 * mirrors the backend for handles (e.g. test doubles) that only expose
 * `execute`.
 */
interface SchemaSeedSql {
  query(sql: string, params?: unknown[]): Promise<unknown>;
  execute?(sql: string, params?: unknown[]): Promise<SchemaMigrationResult>;
  migrations?: {
    apply(options: {
      namespace: string;
      migrations: Array<{ id: string; sql: string[] }>;
    }): Promise<SchemaMigrationResult>;
  };
}

export interface TinyCloudKv {
  get(key: string): Promise<unknown>;
  createSignedReadUrl?: (key: string) => Promise<unknown>;
}

export interface TinyCloudConversationAccess {
  sql: TinyCloudSql;
  kv: TinyCloudKv;
}

interface ConversationListPath {
  limit: number;
  offset: number;
  source?: string;
}

interface ConversationDetailPath {
  id: string;
}

interface ConversationsResponse {
  conversations: Record<string, unknown>[];
  total: number;
  source_counts: SourceCount[];
}

export interface DetailResponse {
  conversation: Record<string, unknown>;
  participants: Record<string, unknown>[];
  transcript: unknown;
}

interface SourceCount {
  source: string;
  total: number;
}

function resultErrorMessage(result: unknown, fallback: string): string {
  const error = (result as { error?: { message?: unknown } } | null)?.error;
  return typeof error?.message === "string" ? error.message : fallback;
}

function unwrapResult(result: unknown): unknown {
  if (result && typeof result === "object" && "ok" in result) {
    if ((result as { ok?: boolean }).ok === false) {
      throw new Error(resultErrorMessage(result, "TinyCloud request failed"));
    }
    return (result as { data?: unknown }).data;
  }

  return result;
}

function rowToObject(row: unknown, columns: string[]): Record<string, unknown> {
  if (Array.isArray(row)) {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  }

  if (row && typeof row === "object") {
    return row as Record<string, unknown>;
  }

  return {};
}

function rowsToObjects(result: unknown): Record<string, unknown>[] {
  const data = unwrapResult(result) as { rows?: unknown[]; columns?: unknown[] } | undefined;
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const columns = Array.isArray(data?.columns)
    ? data.columns.filter((column): column is string => typeof column === "string")
    : [];

  return rows.map((row) => rowToObject(row, columns));
}

function normalizeSourceCounts(rows: Record<string, unknown>[]): SourceCount[] {
  return rows
    .map((row) => ({
      source: typeof row.source === "string" ? row.source : "",
      total: Number(row.total) || 0,
    }))
    .filter((row) => row.source.length > 0 && row.total > 0);
}

function kvData(result: unknown): unknown {
  const data = unwrapResult(result);
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data?: unknown }).data ?? null;
  }
  return data ?? null;
}

function parseListPath(path: string): ConversationListPath | null {
  const url = new URL(path, "https://listen.local");
  if (url.pathname !== "/api/conversations") return null;

  const limit = Math.max(1, Number(url.searchParams.get("limit")) || DEFAULT_LIMIT);
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || DEFAULT_OFFSET);
  const source = url.searchParams.get("source") ?? undefined;
  return { limit, offset, source };
}

function parseDetailPath(path: string): ConversationDetailPath | null {
  const url = new URL(path, "https://listen.local");
  const match = url.pathname.match(/^\/api\/conversations\/([^/]+)$/);
  if (!match?.[1]) return null;

  const id = decodeURIComponent(match[1]);
  if (id === "import" || id === "transcribe") return null;
  return { id };
}

function conversationSql(tcw: TinyCloudWeb): TinyCloudSql {
  const sql = (
    tcw as TinyCloudWeb & { sql?: TinyCloudSql & { db?: (name: string) => TinyCloudSql } }
  ).sql;
  if (!sql) throw new Error("TinyCloud SQL is not available");

  return typeof sql.db === "function" ? sql.db(DATABASE_NAME) : sql;
}

function conversationKv(tcw: TinyCloudWeb): TinyCloudKv {
  const kv = (tcw as TinyCloudWeb & { kv?: TinyCloudKv }).kv;
  if (!kv) throw new Error("TinyCloud KV is not available");
  return kv;
}

/**
 * Resolve the SQL database handle used to seed the conversations schema.
 * The web-sdk's `sql.db(name)` handle exposes `migrations.apply`; the
 * fallback replays statements via `execute()` for handles that lack it
 * (mirroring the backend's `withMigrationFallback`).
 */
function seedSql(tcw: TinyCloudWeb): SchemaSeedSql {
  const sql = (
    tcw as TinyCloudWeb & { sql?: SchemaSeedSql & { db?: (name: string) => SchemaSeedSql } }
  ).sql;
  if (!sql) throw new Error("TinyCloud SQL is not available");

  const scoped = typeof sql.db === "function" ? sql.db(DATABASE_NAME) : sql;
  return withMigrationFallback(scoped);
}

function withMigrationFallback(sqlDb: SchemaSeedSql): SchemaSeedSql {
  if (sqlDb.migrations?.apply) return sqlDb;
  const execute = sqlDb.execute?.bind(sqlDb);

  return {
    query: sqlDb.query.bind(sqlDb),
    migrations: {
      apply: async (options) => {
        if (!execute) {
          return {
            ok: false,
            error: { message: "SQL execute is unavailable on this access handle" },
          };
        }
        for (const migration of options.migrations) {
          for (const sql of migration.sql) {
            const result = await execute(sql);
            if (!result.ok) return result;
          }
        }
        return { ok: true };
      },
    },
  };
}

function seedErrorMessage(result: unknown): string {
  const message = (result as { error?: { message?: unknown } } | null)?.error?.message;
  return typeof message === "string" && message.length > 0 ? message : "unknown error";
}

function thrownSeedErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Track schema initialization per TinyCloudWeb instance. Holds the in-flight
 * promise so concurrent first reads (App.tsx fires the exists-probe and the
 * ConversationList query concurrently) await a single seeding pass.
 */
const schemaSeeded = new WeakMap<object, Promise<void>>();

/**
 * Ensure the conversations schema exists before the first direct-TinyCloud
 * read. Hybrid seeding: the backend is the primary seeder (it owns the
 * canonical `ensureSchema` path), and the browser session seeds directly as a
 * fallback when the backend is unavailable or its call fails. Runs at most once
 * per TinyCloudWeb instance; a failed pass is not memoized so a later read can
 * retry.
 */
export function ensureSchema(api: ApiClient | null, tcw: TinyCloudWeb): Promise<void> {
  const existing = schemaSeeded.get(tcw);
  if (existing) return existing;

  const pending = seedSchemaViaBackendThenFallback(api, tcw).catch((error) => {
    // Allow a later read to retry rather than pinning a permanent failure.
    schemaSeeded.delete(tcw);
    throw error;
  });
  schemaSeeded.set(tcw, pending);
  return pending;
}

/**
 * Try the backend seeder first, then fall back to seeding via the browser
 * session. Only throws if BOTH fail, surfacing both failures.
 */
async function seedSchemaViaBackendThenFallback(
  api: ApiClient | null,
  tcw: TinyCloudWeb,
): Promise<void> {
  let backendError: string | null = null;
  if (api) {
    try {
      await api.post("/api/schema/ensure");
      return;
    } catch (error) {
      backendError = thrownSeedErrorMessage(error);
    }
  } else {
    backendError = "backend unavailable (no api client)";
  }

  try {
    await seedSchema(tcw);
  } catch (fallbackError) {
    throw new Error(
      `Failed to seed conversations schema. Backend seeder: ${backendError}. ` +
        `Browser fallback: ${thrownSeedErrorMessage(fallbackError)}`,
    );
  }
}

async function seedSchema(tcw: TinyCloudWeb): Promise<void> {
  const sqlDb = seedSql(tcw);
  const created = await sqlDb
    .migrations!.apply({
      namespace: MIGRATION_NAMESPACE,
      migrations: [{ id: "001_initial", sql: SCHEMA_STATEMENTS }],
    })
    .catch((error) => ({ ok: false as const, error: { message: thrownSeedErrorMessage(error) } }));
  if (!created.ok) {
    throw new Error(`Failed to initialize conversations schema: ${seedErrorMessage(created)}`);
  }

  const columnCheck = (await sqlDb.query(
    "SELECT transcript_json, transcript_text FROM conversation LIMIT 1",
  )) as { ok?: boolean } | null;
  const updated = await sqlDb
    .migrations!.apply({
      namespace: MIGRATION_NAMESPACE,
      migrations: [
        {
          id: "002_transcript_columns",
          sql: columnCheck?.ok
            ? COLUMN_MIGRATION_ALREADY_APPLIED_STATEMENTS
            : COLUMN_MIGRATION_STATEMENTS,
        },
      ],
    })
    .catch((error) => ({ ok: false as const, error: { message: thrownSeedErrorMessage(error) } }));
  if (!updated.ok) {
    throw new Error(`Failed to update conversations schema: ${seedErrorMessage(updated)}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readStringField(value: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}

function readNumberField(value: Record<string, unknown>, keys: string[]): number | null {
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

function slugify(value: string, fallbackIndex: number): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-") || `speaker-${fallbackIndex + 1}`;
}

function parseJsonObject(value: string): Record<string, unknown> | null {
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
): NormalizedTranscriptSentence | null {
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

export function normalizeConversationMetadata(value: unknown): Record<string, unknown> {
  const metadata = isRecord(value)
    ? { ...value }
    : typeof value === "string"
      ? (parseJsonObject(value) ?? {})
      : {};

  const audioDataKey = readStringField(metadata, [
    "audio_data_kv_key",
    "audioDataKvKey",
    "audio_kv_key",
    "audioKvKey",
  ]);
  const audioMetadataKey = readStringField(metadata, [
    "audio_metadata_kv_key",
    "audioMetadataKvKey",
  ]);
  const audioPlaybackUrl = readStringField(metadata, [
    "audio_playback_url",
    "audioPlaybackUrl",
    "audio_url",
    "audioUrl",
  ]);
  const audioStorageEncoding = readStringField(metadata, [
    "audio_storage_encoding",
    "audioStorageEncoding",
  ]);

  const normalized = { ...metadata };
  if (audioDataKey) {
    const resolvedAudioKey = normalizeAppRelativeKvKey(audioDataKey);
    normalized.audio_data_kv_key = resolvedAudioKey;
    normalized.audio_kv_key = resolvedAudioKey;
  }
  if (audioMetadataKey) {
    normalized.audio_metadata_kv_key = normalizeAppRelativeKvKey(audioMetadataKey);
  }
  if (audioPlaybackUrl) {
    normalized.audio_playback_url = audioPlaybackUrl;
  }
  if (audioStorageEncoding) {
    normalized.audio_storage_encoding = audioStorageEncoding;
  }

  return normalized;
}

function normalizeConversationRow(row: Record<string, unknown>): Record<string, unknown> {
  const startedAt = readStringField(row, ["started_at", "startedAt"]);
  const endedAt = readStringField(row, ["ended_at", "endedAt"]);
  const durationSecsRaw = readNumberField(row, ["duration_secs", "durationSecs"]);
  const durationSecs =
    durationSecsRaw ??
    (startedAt && endedAt
      ? Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 1000))
      : null);

  return {
    ...row,
    started_at: startedAt,
    ended_at: endedAt,
    duration_secs: durationSecs,
  };
}

export function normalizeTranscript(value: unknown): NormalizedTranscriptSentence[] | null {
  const candidates = transcriptCandidates(value);
  if (candidates == null) return null;

  const transcript: NormalizedTranscriptSentence[] = [];
  for (const candidate of candidates) {
    const sentence = normalizeTranscriptEntry(candidate, transcript.length);
    if (sentence) transcript.push(sentence);
  }

  return transcript;
}

function audioFallbackUrl(id: string): string {
  return `/api/conversations/${encodeURIComponent(id)}/audio`;
}

async function resolveAudioPlaybackMetadata(
  kv: TinyCloudKv,
  id: string,
  metadata: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const normalized = normalizeConversationMetadata(metadata);
  if (
    typeof normalized.audio_playback_url === "string" &&
    normalized.audio_playback_url.length > 0
  ) {
    return normalized;
  }

  const audioKey =
    typeof normalized.audio_data_kv_key === "string" ? normalized.audio_data_kv_key : null;
  if (!audioKey) return normalized;

  const fallback = {
    ...normalized,
    audio_playback_url: audioFallbackUrl(id),
    audio_playback_url_source: "backend-kv-fallback",
  };

  if (normalized.audio_storage_encoding === BASE64_AUDIO_STORAGE_ENCODING) {
    return fallback;
  }

  if (typeof kv.createSignedReadUrl !== "function") {
    return fallback;
  }

  try {
    const signedResult = await kv.createSignedReadUrl(resolveAppKvPath(audioKey));
    const signedData = unwrapResult(signedResult) as { url?: unknown; expiresAt?: unknown };
    if (typeof signedData?.url === "string") {
      return {
        ...normalized,
        audio_playback_url: signedData.url,
        audio_signed_url_expires_at: signedData.expiresAt,
        audio_playback_url_source: "tinycloud-signed-kv",
      };
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function tinycloudAccess(tcw: TinyCloudWeb | null): TinyCloudConversationAccess | null {
  if (!tcw) return null;
  return {
    sql: conversationSql(tcw),
    kv: conversationKv(tcw),
  };
}

async function listConversations(
  access: TinyCloudConversationAccess,
  { limit, offset, source }: ConversationListPath,
): Promise<ConversationsResponse> {
  const countSql = source
    ? "SELECT COUNT(*) AS total FROM conversation WHERE source = ?"
    : "SELECT COUNT(*) AS total FROM conversation";
  const countParams = source ? [source] : [];
  const countRows = rowsToObjects(await access.sql.query(countSql, countParams));
  const total = Number(countRows[0]?.total) || 0;
  const source_counts = normalizeSourceCounts(
    rowsToObjects(
      await access.sql.query(
        `SELECT source, COUNT(*) AS total
         FROM conversation
         GROUP BY source`,
      ),
    ),
  );

  const listSql = source
    ? `SELECT c.id, c.title, c.source, c.source_url, c.started_at, c.duration_secs, c.summary, c.created_at,
           (SELECT COUNT(*) FROM participant p WHERE p.conversation_id = c.id) AS participant_count
         FROM conversation c
         WHERE c.source = ?
         ORDER BY COALESCE(c.started_at, c.created_at) DESC
         LIMIT ? OFFSET ?`
    : `SELECT c.id, c.title, c.source, c.source_url, c.started_at, c.duration_secs, c.summary, c.created_at,
           (SELECT COUNT(*) FROM participant p WHERE p.conversation_id = c.id) AS participant_count
         FROM conversation c
         ORDER BY COALESCE(c.started_at, c.created_at) DESC
         LIMIT ? OFFSET ?`;
  const listParams = source ? [source, limit, offset] : [limit, offset];
  const conversations = rowsToObjects(await access.sql.query(listSql, listParams)).map(
    normalizeConversationRow,
  );

  return { conversations, total, source_counts };
}

async function getConversationDetail(
  access: TinyCloudConversationAccess,
  { id }: ConversationDetailPath,
): Promise<DetailResponse> {
  const conversationRows = rowsToObjects(
    await access.sql.query(
      `SELECT id, title, source, source_id, source_url, started_at, ended_at, duration_secs, summary, metadata, transcript_json, transcript_text, created_at, updated_at
         FROM conversation WHERE id = ?`,
      [id],
    ),
  );

  if (conversationRows.length === 0) {
    throw new Error(`Conversation ${id} not found`);
  }

  const rawConversation = conversationRows[0]!;
  const metadata = await resolveAudioPlaybackMetadata(
    access.kv,
    id,
    normalizeConversationMetadata(rawConversation.metadata),
  );
  const conversation = normalizeConversationRow({ ...rawConversation, metadata });

  const participants = rowsToObjects(
    await access.sql.query(
      "SELECT id, name, email, speaker_label FROM participant WHERE conversation_id = ?",
      [id],
    ),
  );

  const transcriptRaw =
    rawConversation.transcript_json ??
    kvData(await access.kv.get(resolveAppKvPath(`transcript/${id}`)));
  const transcript = transcriptRaw == null ? null : normalizeTranscript(transcriptRaw);

  return { conversation, participants, transcript };
}

export async function getConversationDetailFromAccess(
  access: TinyCloudConversationAccess,
  id: string,
): Promise<DetailResponse> {
  return getConversationDetail(access, { id });
}

async function getFromTinyCloud(
  api: ApiClient | null,
  tcw: TinyCloudWeb | null,
  path: string,
): Promise<unknown> {
  const listPath = parseListPath(path);
  const detailPath = listPath ? null : parseDetailPath(path);
  if (!listPath && !detailPath) throw new Error("No TinyCloud conversation handler for path");

  const access = tinycloudAccess(tcw);
  if (!access) throw new Error("TinyCloud conversation access is not available");

  await ensureSchema(api, tcw!);

  return listPath
    ? listConversations(access, listPath)
    : getConversationDetail(access, detailPath!);
}

export function createTinyCloudConversationApi(
  api: ApiClient | null,
  tcw: TinyCloudWeb | null,
): ApiClient {
  const requireApi = (): ApiClient => {
    if (!api) throw new Error("Listen backend is offline. This action is unavailable.");
    return api;
  };

  return {
    async get<T>(path: string): Promise<T> {
      if (parseListPath(path) || parseDetailPath(path)) {
        if (tcw) return (await getFromTinyCloud(api, tcw, path)) as T;
        return requireApi().get<T>(path);
      }

      return requireApi().get<T>(path);
    },
    post<T>(path: string, body?: unknown): Promise<T> {
      return requireApi().post<T>(path, body);
    },
    put<T>(path: string, body?: unknown): Promise<T> {
      return requireApi().put<T>(path, body);
    },
    del<T>(path: string): Promise<T> {
      return requireApi().del<T>(path);
    },
  };
}
