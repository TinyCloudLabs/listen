import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import type { NormalizedConversation } from "../adapters/types.js";
import { conversationSql, ensureSchema } from "../schema.js";
import { persistConversation } from "../services/persist-conversation.js";

// ── Types ────────────────────────────────────────────────────────────

interface ConversationsRoutesConfig {
  authMiddleware: RequestHandler;
  delegationMiddleware: RequestHandler;
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

// ── Conversations Routes ─────────────────────────────────────────────

export function createConversationsRouter(config: ConversationsRoutesConfig) {
  const { authMiddleware, delegationMiddleware } = config;
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

      res.json({ conversations, total });
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

      // Parse metadata from JSON string
      let metadata: Record<string, unknown> = {};
      try {
        metadata = row.metadata ? JSON.parse(String(row.metadata)) : {};
      } catch {
        metadata = {};
      }

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
        if (typeof raw === "string") {
          try {
            transcript = JSON.parse(raw);
          } catch {
            transcript = null;
          }
        } else {
          transcript = raw;
        }
      }

      res.json({ conversation, participants, transcript });
    } catch (err) {
      console.error("[conversations] detail failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "detail_failed", message });
    }
  });

  return router;
}
