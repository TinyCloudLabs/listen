import type { TinyCloudWeb } from "@tinycloud/web-sdk";
import type { ApiClient } from "@listen/client";

const DATABASE_NAME = "xyz.tinycloud.listen/conversations";
const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;
const BASE64_AUDIO_STORAGE_ENCODING = "base64-string-kv";

interface TinyCloudSql {
  query(sql: string, params?: unknown[]): Promise<unknown>;
}

interface TinyCloudKv {
  get(key: string): Promise<unknown>;
  createSignedReadUrl?: (key: string) => Promise<unknown>;
}

interface TinyCloudConversationAccess {
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
}

interface DetailResponse {
  conversation: Record<string, unknown>;
  participants: Record<string, unknown>[];
  transcript: unknown;
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

function parseMetadata(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  if (typeof value !== "string" || value.length === 0) return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function parseTranscript(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function audioFallbackUrl(id: string): string {
  return `/api/conversations/${encodeURIComponent(id)}/audio`;
}

async function resolveAudioPlaybackMetadata(
  kv: TinyCloudKv,
  id: string,
  metadata: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const audioKey =
    typeof metadata.audio_data_kv_key === "string" ? metadata.audio_data_kv_key : null;
  if (!audioKey) return metadata;

  const fallback = {
    ...metadata,
    audio_playback_url: audioFallbackUrl(id),
    audio_playback_url_source: "backend-kv-fallback",
  };

  if (metadata.audio_storage_encoding === BASE64_AUDIO_STORAGE_ENCODING) {
    return fallback;
  }

  if (typeof kv.createSignedReadUrl !== "function") {
    return fallback;
  }

  try {
    const signedResult = await kv.createSignedReadUrl(audioKey);
    const signedData = unwrapResult(signedResult) as { url?: unknown; expiresAt?: unknown };
    if (typeof signedData?.url === "string") {
      return {
        ...metadata,
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

  const listSql = source
    ? `SELECT c.id, c.title, c.source, c.source_url, c.started_at, c.duration_secs, c.summary, c.created_at,
           (SELECT COUNT(*) FROM participant p WHERE p.conversation_id = c.id) AS participant_count
         FROM conversation c
         WHERE c.source = ?
         ORDER BY c.started_at DESC
         LIMIT ? OFFSET ?`
    : `SELECT c.id, c.title, c.source, c.source_url, c.started_at, c.duration_secs, c.summary, c.created_at,
           (SELECT COUNT(*) FROM participant p WHERE p.conversation_id = c.id) AS participant_count
         FROM conversation c
         ORDER BY c.started_at DESC
         LIMIT ? OFFSET ?`;
  const listParams = source ? [source, limit, offset] : [limit, offset];
  const conversations = rowsToObjects(await access.sql.query(listSql, listParams));

  return { conversations, total };
}

async function getConversationDetail(
  access: TinyCloudConversationAccess,
  { id }: ConversationDetailPath,
): Promise<DetailResponse> {
  const conversationRows = rowsToObjects(
    await access.sql.query(
      `SELECT id, title, source, source_id, source_url, started_at, ended_at, duration_secs, summary, metadata, created_at, updated_at
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
    parseMetadata(rawConversation.metadata),
  );
  const conversation = { ...rawConversation, metadata };

  const participants = rowsToObjects(
    await access.sql.query(
      "SELECT id, name, email, speaker_label FROM participant WHERE conversation_id = ?",
      [id],
    ),
  );

  const transcriptRaw = kvData(await access.kv.get(`transcript/${id}`));
  const transcript = transcriptRaw == null ? null : parseTranscript(transcriptRaw);

  return { conversation, participants, transcript };
}

async function getFromTinyCloud(tcw: TinyCloudWeb | null, path: string): Promise<unknown> {
  const listPath = parseListPath(path);
  const detailPath = listPath ? null : parseDetailPath(path);
  if (!listPath && !detailPath) throw new Error("No TinyCloud conversation handler for path");

  const access = tinycloudAccess(tcw);
  if (!access) throw new Error("TinyCloud conversation access is not available");

  return listPath
    ? listConversations(access, listPath)
    : getConversationDetail(access, detailPath!);
}

export function createTinyCloudConversationApi(
  api: ApiClient,
  tcw: TinyCloudWeb | null,
): ApiClient {
  return {
    async get<T>(path: string): Promise<T> {
      if (parseListPath(path) || parseDetailPath(path)) {
        if (tcw) return (await getFromTinyCloud(tcw, path)) as T;
        return api.get<T>(path);
      }

      return api.get<T>(path);
    },
    post<T>(path: string, body?: unknown): Promise<T> {
      return api.post<T>(path, body);
    },
    put<T>(path: string, body?: unknown): Promise<T> {
      return api.put<T>(path, body);
    },
    del<T>(path: string): Promise<T> {
      return api.del<T>(path);
    },
  };
}
