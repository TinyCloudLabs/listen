import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
<<<<<<< HEAD
<<<<<<< HEAD
import { ensureSchema } from "../schema.js";
=======
import { ensureSchema, DATABASE_NAME } from "../schema.js";
>>>>>>> 0638c1c (TC-1304: Add GET /api/conversations and GET /api/conversations/:id read endpoints)
=======
import { ensureSchema } from "../schema.js";
>>>>>>> 3b4de56 (chore: include remaining conversation-sync backend and shared changes)

// ── Types ────────────────────────────────────────────────────────────

interface ConversationsRoutesConfig {
  authMiddleware: RequestHandler;
  delegationMiddleware: RequestHandler;
}

// ── Constants ────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 3b4de56 (chore: include remaining conversation-sync backend and shared changes)
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

<<<<<<< HEAD
=======
>>>>>>> 0638c1c (TC-1304: Add GET /api/conversations and GET /api/conversations/:id read endpoints)
=======
>>>>>>> 3b4de56 (chore: include remaining conversation-sync backend and shared changes)
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

<<<<<<< HEAD
      // Total count
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
      const countResult = await access.sql.query(`SELECT COUNT(*) AS total FROM conversation`);
=======
      // Total count — with optional source filter
      const countSql = source
        ? `SELECT COUNT(*) AS total FROM conversation WHERE source = ?`
        : `SELECT COUNT(*) AS total FROM conversation`;
      const countParams = source ? [source] : [];
      const countResult = await access.sql.query(countSql, countParams);
>>>>>>> c024b29 (TC-1326: Frontend source picker, Google OAuth popup, sync control, source filter)
      let total = 0;
      if (countResult.ok && countResult.data.rows?.[0]) {
        const countRow = rowToObject(
          countResult.data.rows[0] as unknown[],
          countResult.data.columns,
        );
        total = Number(countRow.total) || 0;
      }

      // Paginated list with participant_count subquery
<<<<<<< HEAD
      const listResult = await access.sql.query(
=======
      const countResult = await access.sql.execute(
=======
      const countResult = await access.sql.query(
>>>>>>> 3b4de56 (chore: include remaining conversation-sync backend and shared changes)
        `SELECT COUNT(*) AS total FROM conversation`,
      );
=======
      const countResult = await access.sql.query(`SELECT COUNT(*) AS total FROM conversation`);
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
      let total = 0;
      if (countResult.ok && countResult.data.rows?.[0]) {
        const countRow = rowToObject(
          countResult.data.rows[0] as unknown[],
          countResult.data.columns,
        );
        total = Number(countRow.total) || 0;
      }

      // Paginated list with participant_count subquery
<<<<<<< HEAD
      const listResult = await access.sql.execute(
>>>>>>> 0638c1c (TC-1304: Add GET /api/conversations and GET /api/conversations/:id read endpoints)
=======
      const listResult = await access.sql.query(
>>>>>>> 3b4de56 (chore: include remaining conversation-sync backend and shared changes)
        `SELECT c.id, c.title, c.source, c.source_url, c.started_at, c.duration_secs, c.summary, c.created_at,
=======
      const listSql = source
        ? `SELECT c.id, c.title, c.source, c.source_url, c.started_at, c.duration_secs, c.summary, c.created_at,
           (SELECT COUNT(*) FROM participant p WHERE p.conversation_id = c.id) AS participant_count
         FROM conversation c
         WHERE c.source = ?
         ORDER BY c.started_at DESC
         LIMIT ? OFFSET ?`
        : `SELECT c.id, c.title, c.source, c.source_url, c.started_at, c.duration_secs, c.summary, c.created_at,
>>>>>>> c024b29 (TC-1326: Frontend source picker, Google OAuth popup, sync control, source filter)
           (SELECT COUNT(*) FROM participant p WHERE p.conversation_id = c.id) AS participant_count
         FROM conversation c
         ORDER BY c.started_at DESC
         LIMIT ? OFFSET ?`;
      const listParams = source ? [source, limit, offset] : [limit, offset];
      const listResult = await access.sql.query(listSql, listParams);

<<<<<<< HEAD
<<<<<<< HEAD
      const conversations = listResult.ok
        ? rowsToObjects(listResult.data.rows as unknown[][], listResult.data.columns)
        : [];
=======
      const conversations = listResult.ok ? (listResult.rows ?? []) : [];
>>>>>>> 0638c1c (TC-1304: Add GET /api/conversations and GET /api/conversations/:id read endpoints)
=======
      const conversations = listResult.ok
        ? rowsToObjects(listResult.data.rows as unknown[][], listResult.data.columns)
        : [];
>>>>>>> 3b4de56 (chore: include remaining conversation-sync backend and shared changes)

      res.json({ conversations, total });
    } catch (err) {
      console.error("[conversations] list failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "list_failed", message });
    }
  });

  // ── GET /:id — single conversation with participants + transcript ──
  router.get("/:id", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;
    const { id } = req.params;

    try {
      await ensureSchema(access);

      // Fetch conversation
<<<<<<< HEAD
<<<<<<< HEAD
      const convoResult = await access.sql.query(
=======
      const convoResult = await access.sql.execute(
>>>>>>> 0638c1c (TC-1304: Add GET /api/conversations and GET /api/conversations/:id read endpoints)
=======
      const convoResult = await access.sql.query(
>>>>>>> 3b4de56 (chore: include remaining conversation-sync backend and shared changes)
        `SELECT id, title, source, source_id, source_url, started_at, ended_at, duration_secs, summary, metadata, created_at, updated_at
         FROM conversation WHERE id = ?`,
        [id],
      );

<<<<<<< HEAD
<<<<<<< HEAD
      if (!convoResult.ok || !convoResult.data.rows?.length) {
=======
      const row = convoResult.ok && convoResult.rows?.[0]
        ? (convoResult.rows[0] as any)
        : null;

      if (!row) {
>>>>>>> 0638c1c (TC-1304: Add GET /api/conversations and GET /api/conversations/:id read endpoints)
=======
      if (!convoResult.ok || !convoResult.data.rows?.length) {
>>>>>>> 3b4de56 (chore: include remaining conversation-sync backend and shared changes)
        res.status(404).json({ error: "not_found", message: `Conversation ${id} not found` });
        return;
      }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
      const row = rowToObject(convoResult.data.rows[0] as unknown[], convoResult.data.columns);

      // Parse metadata from JSON string
      let metadata: Record<string, unknown> = {};
      try {
        metadata = row.metadata ? JSON.parse(String(row.metadata)) : {};
=======
      // Parse metadata from JSON string
      let metadata: Record<string, unknown> = {};
      try {
        metadata = row.metadata ? JSON.parse(row.metadata) : {};
>>>>>>> 0638c1c (TC-1304: Add GET /api/conversations and GET /api/conversations/:id read endpoints)
=======
      const row = rowToObject(
        convoResult.data.rows[0] as unknown[],
        convoResult.data.columns,
      );
=======
      const row = rowToObject(convoResult.data.rows[0] as unknown[], convoResult.data.columns);
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)

      // Parse metadata from JSON string
      let metadata: Record<string, unknown> = {};
      try {
        metadata = row.metadata ? JSON.parse(String(row.metadata)) : {};
>>>>>>> 3b4de56 (chore: include remaining conversation-sync backend and shared changes)
      } catch {
        metadata = {};
      }

      const conversation = { ...row, metadata };

      // Fetch participants
<<<<<<< HEAD
<<<<<<< HEAD
      const participantsResult = await access.sql.query(
        `SELECT id, name, email, speaker_label FROM participant WHERE conversation_id = ?`,
        [id],
      );
      const participants = participantsResult.ok
        ? rowsToObjects(
            participantsResult.data.rows as unknown[][],
            participantsResult.data.columns,
          )
<<<<<<< HEAD
        : [];

      // Load transcript blob from KV
      const kvKey = `/app.conversations/transcript/${id}`;
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
=======
      const participantsResult = await access.sql.execute(
=======
      const participantsResult = await access.sql.query(
>>>>>>> 3b4de56 (chore: include remaining conversation-sync backend and shared changes)
        `SELECT id, name, email, speaker_label FROM participant WHERE conversation_id = ?`,
        [id],
      );
      const participants = participantsResult.ok
        ? rowsToObjects(participantsResult.data.rows as unknown[][], participantsResult.data.columns)
=======
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
        : [];

      // Load transcript blob from KV
      const kvKey = `/app.conversations/transcript/${id}`;
      console.log(`[conversations] Loading transcript from KV: ${kvKey}`);
      const kvResult = await access.kv.get(kvKey);
      console.log(
        `[conversations] KV result ok=${kvResult.ok}, hasData=${kvResult.ok && kvResult.data?.data != null}, type=${kvResult.ok ? typeof kvResult.data?.data : "n/a"}`,
      );
      let transcript: unknown = null;
<<<<<<< HEAD
      if (transcriptBlob) {
        try {
          transcript = JSON.parse(transcriptBlob);
        } catch {
          transcript = null;
>>>>>>> 0638c1c (TC-1304: Add GET /api/conversations and GET /api/conversations/:id read endpoints)
=======
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
>>>>>>> 3b4de56 (chore: include remaining conversation-sync backend and shared changes)
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
