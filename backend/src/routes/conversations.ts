import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import { Buffer } from "node:buffer";
import type { NormalizedConversation } from "../adapters/types.js";
import { conversationSql, ensureSchema } from "../schema.js";
import { persistConversation } from "../services/persist-conversation.js";
import {
  isBase64AudioStorage,
  normalizeConversationMetadata,
  normalizeTranscript,
  resolveAudioKey,
} from "../services/conversation-normalization.js";
import {
  TRANSCRIPTION_SECRET_NAMES,
  createTranscriptionProvider,
  parseTranscriptionProvider,
  type TranscriptionProvider,
  type TranscriptionProviderName,
  type TranscriptionResult,
} from "../services/transcription.js";

// ── Types ────────────────────────────────────────────────────────────

interface ConversationsRoutesConfig {
  authMiddleware: RequestHandler;
  delegationMiddleware: RequestHandler;
  transcriptionProviders?: Partial<Record<TranscriptionProviderName, TranscriptionProvider>>;
}

// ── Constants ────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;

interface ManualTranscriptImportBody {
  title?: unknown;
  transcriptText?: unknown;
  startedAt?: unknown;
  durationSecs?: unknown;
  summary?: unknown;
  sourceUrl?: unknown;
  participants?: unknown;
}

interface TranscribeBody {
  provider?: unknown;
  title?: unknown;
  fileName?: unknown;
  contentType?: unknown;
  contentBase64?: unknown;
  startedAt?: unknown;
}

interface SourceCount {
  source: string;
  total: number;
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * TinyCloud SQL returns rows as arrays, not objects.
 * Map each row array to a keyed object using the columns list.
 */
function rowToObject(row: unknown[], columns: string[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  columns.forEach((col, i) => {
    obj[col] = row[i];
  });
  return obj;
}

function rowsToObjects(rows: unknown[][], columns: string[]): Record<string, unknown>[] {
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

function cleanRequiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function cleanOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned === "" ? null : cleaned;
}

function parseParticipants(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,;\n]/) : [];

  return Array.from(
    new Set(
      raw
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter((entry) => entry.length > 0),
    ),
  );
}

function audioFallbackUrl(id: string): string {
  return `/api/conversations/${encodeURIComponent(id)}/audio`;
}

async function resolveAudioPlaybackMetadata(
  access: NonNullable<Request["delegatedAccess"]>,
  id: string,
  metadata: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const normalized = normalizeConversationMetadata(metadata);
  const audioKey = resolveAudioKey(normalized);
  if (!audioKey) return normalized;

  if (
    typeof normalized.audio_playback_url === "string" &&
    normalized.audio_playback_url.length > 0
  ) {
    return normalized;
  }

  const fallback = {
    ...normalized,
    audio_playback_url: audioFallbackUrl(id),
    audio_playback_url_source: "backend-kv-fallback",
  };

  if (isBase64AudioStorage(normalized)) {
    return fallback;
  }

  const createSignedReadUrl = access.kv.createSignedReadUrl;
  if (typeof createSignedReadUrl !== "function") {
    return fallback;
  }

  try {
    const signedResult = await createSignedReadUrl.call(access.kv, audioKey);
    if (signedResult.ok && signedResult.data?.url) {
      return {
        ...normalized,
        audio_playback_url: signedResult.data.url,
        audio_signed_url_expires_at: signedResult.data.expiresAt,
        audio_playback_url_source: "tinycloud-signed-kv",
      };
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function parseTimestamp(value: string): number | null {
  const parts = value.split(":").map((part) => Number(part.replace(",", ".")));
  if (parts.some((part) => Number.isNaN(part))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function estimateDuration(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(4, Math.ceil(words / 2.5));
}

function parseTranscriptText(
  transcriptText: string,
  participantNames: string[],
): {
  transcript: Array<{
    index: number;
    speaker_id: string;
    speaker_name: string;
    text: string;
    start_time: number;
    end_time: number;
  }>;
  speakers: string[];
} {
  const transcript: Array<{
    index: number;
    speaker_id: string;
    speaker_name: string;
    text: string;
    start_time: number;
    end_time: number;
  }> = [];
  let pendingStart: number | null = null;

  for (const rawLine of transcriptText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line === "WEBVTT" || /^\d+$/.test(line)) continue;

    const rangeMatch = line.match(
      /^(\d{1,2}:\d{2}(?::\d{2})?(?:[,.]\d+)?)\s+-->\s+(\d{1,2}:\d{2}(?::\d{2})?(?:[,.]\d+)?)/,
    );
    if (rangeMatch) {
      pendingStart = parseTimestamp(rangeMatch[1]);
      continue;
    }

    const voiceMatch = line.match(/^<v\s+([^>]+)>(.+)$/i);
    const timedSpeakerMatch = line.match(
      /^\[?(\d{1,2}:\d{2}(?::\d{2})?(?:[,.]\d+)?)\]?\s+([^:]{1,80}):\s+(.+)$/,
    );
    const speakerMatch = line.match(/^([^:]{1,80}):\s+(.+)$/);

    let speakerName = participantNames[0] ?? "Speaker";
    let text = line;
    let startTime = pendingStart ?? transcript.length * 15;

    if (voiceMatch) {
      speakerName = voiceMatch[1].trim();
      text = voiceMatch[2].trim();
    } else if (timedSpeakerMatch) {
      startTime = parseTimestamp(timedSpeakerMatch[1]) ?? startTime;
      speakerName = timedSpeakerMatch[2].trim();
      text = timedSpeakerMatch[3].trim();
    } else if (speakerMatch) {
      speakerName = speakerMatch[1].trim();
      text = speakerMatch[2].trim();
    }

    pendingStart = null;
    if (!text) continue;

    transcript.push({
      index: transcript.length,
      speaker_id: speakerName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "speaker",
      speaker_name: speakerName,
      text,
      start_time: startTime,
      end_time: startTime + estimateDuration(text),
    });
  }

  if (transcript.length === 0) {
    const text = transcriptText.trim();
    transcript.push({
      index: 0,
      speaker_id: "speaker",
      speaker_name: participantNames[0] ?? "Speaker",
      text,
      start_time: 0,
      end_time: estimateDuration(text),
    });
  }

  const speakers = Array.from(
    new Set([...participantNames, ...transcript.map((line) => line.speaker_name)]),
  );
  return { transcript, speakers };
}

function normalizeManualTranscript(body: ManualTranscriptImportBody): NormalizedConversation {
  const title = cleanRequiredString(body.title, "title");
  const transcriptText = cleanRequiredString(body.transcriptText, "transcriptText");
  const participantNames = parseParticipants(body.participants);
  const { transcript, speakers } = parseTranscriptText(transcriptText, participantNames);
  const startedAtRaw = cleanOptionalString(body.startedAt);
  const startedAt = startedAtRaw ? new Date(startedAtRaw) : new Date();
  if (Number.isNaN(startedAt.getTime())) {
    throw new Error("startedAt must be a valid date");
  }

  const explicitDuration = Number(body.durationSecs);
  const durationSecs =
    Number.isFinite(explicitDuration) && explicitDuration > 0
      ? explicitDuration
      : Math.max(...transcript.map((line) => line.end_time));
  const id = crypto.randomUUID();

  return {
    conversation: {
      id,
      title,
      source: "manual",
      source_id: `manual:${id}`,
      source_url: cleanOptionalString(body.sourceUrl),
      started_at: startedAt.toISOString(),
      ended_at: new Date(startedAt.getTime() + durationSecs * 1000).toISOString(),
      duration_secs: durationSecs,
      summary: cleanOptionalString(body.summary),
      metadata: {
        import_type: "transcript",
        imported_at: new Date().toISOString(),
        line_count: transcript.length,
      },
    },
    participants: speakers.map((name) => ({
      id: crypto.randomUUID(),
      name,
      email: null,
      speaker_label: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || null,
    })),
    transcript,
  };
}

function normalizeTranscription(
  body: TranscribeBody,
  provider: TranscriptionProviderName,
  mediaKey: string,
  result: TranscriptionResult,
): NormalizedConversation {
  const title = cleanOptionalString(body.title) ?? cleanRequiredString(body.fileName, "fileName");
  const startedAtRaw = cleanOptionalString(body.startedAt);
  const startedAt = startedAtRaw ? new Date(startedAtRaw) : new Date();
  if (Number.isNaN(startedAt.getTime())) {
    throw new Error("startedAt must be a valid date");
  }

  const transcript =
    result.utterances.length > 0
      ? result.utterances.map((line, index) => ({
          index,
          speaker_id: line.speaker.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "speaker",
          speaker_name: line.speaker,
          text: line.text,
          start_time: line.start,
          end_time: line.end,
        }))
      : [
          {
            index: 0,
            speaker_id: "speaker",
            speaker_name: "Speaker",
            text: result.text,
            start_time: 0,
            end_time: result.durationSecs ?? estimateDuration(result.text),
          },
        ];
  const durationSecs =
    result.durationSecs ?? Math.max(...transcript.map((line) => line.end_time), 0);
  const id = crypto.randomUUID();
  const speakers = Array.from(new Set(transcript.map((line) => line.speaker_name)));

  return {
    conversation: {
      id,
      title,
      source: `transcription:${provider}`,
      source_id: `${provider}:${result.sourceId}`,
      source_url: null,
      started_at: startedAt.toISOString(),
      ended_at: new Date(startedAt.getTime() + durationSecs * 1000).toISOString(),
      duration_secs: durationSecs,
      summary: null,
      metadata: {
        import_type: "transcription",
        provider,
        file_name: cleanRequiredString(body.fileName, "fileName"),
        content_type: cleanOptionalString(body.contentType),
        media_key: mediaKey,
        transcribed_at: new Date().toISOString(),
      },
    },
    participants: speakers.map((name) => ({
      id: crypto.randomUUID(),
      name,
      email: null,
      speaker_label: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || null,
    })),
    transcript,
  };
}

// ── Conversations Routes ─────────────────────────────────────────────

export function createConversationsRouter(config: ConversationsRoutesConfig) {
  const { authMiddleware, delegationMiddleware, transcriptionProviders = {} } = config;
  const router = Router();

  router.use(authMiddleware);
  router.use(delegationMiddleware);

  // ── GET / — list conversations, newest first ──
  router.get("/", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;

    const limit = Math.max(1, parseInt(req.query.limit as string, 10) || DEFAULT_LIMIT);
    const offset = Math.max(0, parseInt(req.query.offset as string, 10) || DEFAULT_OFFSET);
    const source = req.query.source as string | undefined;

    try {
      await ensureSchema(access);
      const sqlDb = conversationSql(access);

      // Total count — with optional source filter
      const countSql = source
        ? `SELECT COUNT(*) AS total FROM conversation WHERE source = ?`
        : `SELECT COUNT(*) AS total FROM conversation`;
      const countParams = source ? [source] : [];
      const countResult = await sqlDb.query(countSql, countParams);
      let total = 0;
      if (countResult.ok && countResult.data.rows?.[0]) {
        const countRow = rowToObject(
          countResult.data.rows[0] as unknown[],
          countResult.data.columns,
        );
        total = Number(countRow.total) || 0;
      }

      const sourceCountsResult = await sqlDb.query(
        `SELECT source, COUNT(*) AS total
         FROM conversation
         GROUP BY source`,
      );
      const sourceCounts =
        sourceCountsResult.ok && sourceCountsResult.data.rows
          ? normalizeSourceCounts(
              rowsToObjects(
                sourceCountsResult.data.rows as unknown[][],
                sourceCountsResult.data.columns,
              ),
            )
          : [];

      // Paginated list with participant_count subquery
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
      const listResult = await sqlDb.query(listSql, listParams);

      const conversations = listResult.ok
        ? rowsToObjects(listResult.data.rows as unknown[][], listResult.data.columns)
        : [];

      res.json({ conversations, total, source_counts: sourceCounts });
    } catch (err) {
      console.error("[conversations] list failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "list_failed", message });
    }
  });

  // ── POST /import — manually import a pasted/uploaded transcript ──
  router.post("/import", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;

    try {
      await ensureSchema(access);
      const normalized = normalizeManualTranscript(req.body ?? {});
      await persistConversation(access, normalized);
      res.status(201).json({
        conversationId: normalized.conversation.id,
        title: normalized.conversation.title,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message.includes("is required") || message.includes("valid date") ? 400 : 500;
      if (status >= 500) console.error("[conversations] import failed:", err);
      res.status(status).json({ error: "import_failed", message });
    }
  });

  // ── POST /transcribe — upload audio/video, transcribe, then import ──
  router.post("/transcribe", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;

    try {
      await ensureSchema(access);
      const body = (req.body ?? {}) as TranscribeBody;
      const providerName = parseTranscriptionProvider(body.provider);
      const fileName = cleanRequiredString(body.fileName, "fileName");
      const contentType = cleanOptionalString(body.contentType) ?? "application/octet-stream";
      const contentBase64 = cleanRequiredString(body.contentBase64, "contentBase64");
      const apiKeyResult = await access.secrets?.get(TRANSCRIPTION_SECRET_NAMES[providerName]);

      if (!apiKeyResult) {
        res.status(500).json({
          error: "missing_secret_access",
          message: "Delegation does not include TinyCloud Secrets access",
        });
        return;
      }
      if (!apiKeyResult.ok || typeof apiKeyResult.data !== "string" || apiKeyResult.data === "") {
        res.status(400).json({
          error: "missing_provider_key",
          message: `${TRANSCRIPTION_SECRET_NAMES[providerName]} is not available to the backend`,
        });
        return;
      }

      const audio = Uint8Array.from(Buffer.from(contentBase64, "base64"));
      if (audio.byteLength === 0) throw new Error("contentBase64 must contain uploaded content");

      const uploadId = crypto.randomUUID();
      const mediaKey = `source-media/${uploadId}/${fileName}`;
      await access.kv.put(
        mediaKey,
        JSON.stringify({
          fileName,
          contentType,
          contentBase64,
          uploadedAt: new Date().toISOString(),
        }),
      );

      const provider =
        transcriptionProviders[providerName] ?? createTranscriptionProvider(providerName);
      const result = await provider.transcribe({ audio, contentType, fileName }, apiKeyResult.data);
      const normalized = normalizeTranscription(body, providerName, mediaKey, result);
      await persistConversation(access, normalized);

      res.status(201).json({
        conversationId: normalized.conversation.id,
        title: normalized.conversation.title,
        provider: providerName,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status =
        message.includes("must be") ||
        message.includes("is required") ||
        message.includes("contentBase64")
          ? 400
          : 500;
      if (status >= 500) console.error("[conversations] transcribe failed:", err);
      res.status(status).json({ error: "transcribe_failed", message });
    }
  });

  // ── GET /:id — single conversation with participants + transcript ──
  router.get("/:id", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;
    const { id } = req.params;

    try {
      await ensureSchema(access);
      const sqlDb = conversationSql(access);

      // Fetch conversation
      const convoResult = await sqlDb.query(
        `SELECT id, title, source, source_id, source_url, started_at, ended_at, duration_secs, summary, metadata, created_at, updated_at
         FROM conversation WHERE id = ?`,
        [id],
      );

      if (!convoResult.ok || !convoResult.data.rows?.length) {
        res.status(404).json({ error: "not_found", message: `Conversation ${id} not found` });
        return;
      }

      const row = rowToObject(convoResult.data.rows[0] as unknown[], convoResult.data.columns);

      const metadata = await resolveAudioPlaybackMetadata(
        access,
        id,
        normalizeConversationMetadata(row.metadata),
      );

      const conversation = { ...row, metadata };

      // Fetch participants
      const participantsResult = await sqlDb.query(
        `SELECT id, name, email, speaker_label FROM participant WHERE conversation_id = ?`,
        [id],
      );
      const participants = participantsResult.ok
        ? rowsToObjects(
            participantsResult.data.rows as unknown[][],
            participantsResult.data.columns,
          )
        : [];

      // Load transcript blob from KV
      const kvKey = `transcript/${id}`;
      console.log(`[conversations] Loading transcript from KV: ${kvKey}`);
      const kvResult = await access.kv.get(kvKey);
      console.log(
        `[conversations] KV result ok=${kvResult.ok}, hasData=${kvResult.ok && kvResult.data?.data != null}, type=${kvResult.ok ? typeof kvResult.data?.data : "n/a"}`,
      );
      let transcript: unknown = null;
      if (kvResult.ok && kvResult.data.data) {
        const raw = kvResult.data.data;
        // KV may return already-parsed object or a JSON string
        transcript = normalizeTranscript(raw);
      }

      res.json({ conversation, participants, transcript });
    } catch (err) {
      console.error("[conversations] detail failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "detail_failed", message });
    }
  });

  // ── GET /:id/audio — stream stored Fireflies audio from KV ──
  router.get("/:id/audio", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;
    const { id } = req.params;

    try {
      await ensureSchema(access);
      const sqlDb = conversationSql(access);
      const convoResult = await sqlDb.query(`SELECT metadata FROM conversation WHERE id = ?`, [id]);

      if (!convoResult.ok || !convoResult.data.rows?.length) {
        res.status(404).json({ error: "not_found", message: `Conversation ${id} not found` });
        return;
      }

      const rawMetadata = Array.isArray(convoResult.data.rows[0])
        ? convoResult.data.rows[0][0]
        : (convoResult.data.rows[0] as any).metadata;

      const metadata = normalizeConversationMetadata(rawMetadata);
      const audioKey = resolveAudioKey(metadata);
      if (!audioKey) {
        res.status(404).json({ error: "audio_not_found", message: "No audio is available" });
        return;
      }

      if (!isBase64AudioStorage(metadata) && typeof access.kv.createSignedReadUrl === "function") {
        try {
          const signedResult = await access.kv.createSignedReadUrl.call(access.kv, audioKey);
          const signedData = signedResult as { ok?: boolean; data?: { url?: unknown } } | null;
          if (signedData?.ok && typeof signedData.data?.url === "string") {
            res.redirect(302, signedData.data.url);
            return;
          }
        } catch {
          // Fall back to direct KV read below.
        }
      }

      const kvResult = await access.kv.get(audioKey);
      if (!kvResult.ok || !kvResult.data.data) {
        res.status(404).json({ error: "audio_not_found", message: "Stored audio is missing" });
        return;
      }

      const contentType =
        typeof metadata.audio_content_type === "string"
          ? metadata.audio_content_type
          : "audio/mpeg";

      let buffer: Buffer | null = null;
      const rawAudio = kvResult.data.data;
      if (isBase64AudioStorage(metadata)) {
        if (typeof rawAudio !== "string") {
          res.status(404).json({ error: "audio_not_found", message: "Stored audio is invalid" });
          return;
        }
        buffer = Buffer.from(rawAudio, "base64");
      } else if (typeof rawAudio === "string") {
        buffer = Buffer.from(rawAudio);
      } else if (Buffer.isBuffer(rawAudio)) {
        buffer = rawAudio;
      } else if (rawAudio instanceof ArrayBuffer) {
        buffer = Buffer.from(rawAudio);
      } else if (ArrayBuffer.isView(rawAudio)) {
        buffer = Buffer.from(rawAudio.buffer, rawAudio.byteOffset, rawAudio.byteLength);
      }

      if (!buffer) {
        res.status(404).json({ error: "audio_not_found", message: "Stored audio is invalid" });
        return;
      }

      const contentLength =
        typeof metadata.audio_size_bytes === "number" &&
        Number.isFinite(metadata.audio_size_bytes) &&
        metadata.audio_size_bytes >= 0
          ? metadata.audio_size_bytes
          : buffer.byteLength;
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", String(contentLength));
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.send(buffer);
    } catch (err) {
      console.error("[conversations] audio failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "audio_failed", message });
    }
  });

  return router;
}
