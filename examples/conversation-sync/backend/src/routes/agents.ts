import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import type { TinyCloudNode } from "@tinycloud/node-sdk";
import type { DelegatedAccess } from "@tinyboilerplate/server";
import { ensureSchema } from "../schema.js";
import {
  runAgentTurn as defaultRunAgentTurn,
  type AgentTurnInput,
  type AgentTurnMessage,
  type AgentTurnResult,
} from "../services/agent-runner.js";
import { AgentSessionStore, AgentSessionError } from "../services/agent-sessions.js";

// ── Types ────────────────────────────────────────────────────────────

interface AgentsRoutesConfig {
  authMiddleware: RequestHandler;
  delegationMiddleware: RequestHandler;
  /** Main backend node — retained for symmetry with other routers, unused here. */
  node: TinyCloudNode;
  /** Optional runner override — defaults to the real Claude Agent SDK runner (task #5). */
  runAgentTurn?: (input: AgentTurnInput) => Promise<AgentTurnResult>;
  /**
   * Optional session store override. Tests inject a store backed by a
   * stub node factory so they don't need the real TinyCloudNode WASM
   * runtime. Production uses a fresh in-memory store.
   */
  sessionStore?: AgentSessionStore;
}

interface AgentRow {
  id: string;
  title: string;
  system_prompt: string | null;
  model: string | null;
  archived: number;
  session_id: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AgentMessageRow {
  id: string;
  agent_id: string;
  role: string;
  content: string;
  tool_calls: string | null;
  type: string | null;
  metadata: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  duration_ms: number | null;
  created_at: string;
}

// ── Constants ────────────────────────────────────────────────────────

const ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h
const STALE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7d

// ── Helpers ──────────────────────────────────────────────────────────

function rowToObject(row: unknown[], columns: string[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  columns.forEach((col, i) => {
    obj[col] = row[i];
  });
  return obj;
}

function rowToAgent(row: unknown[], columns: string[]): AgentRow {
  const obj = rowToObject(row, columns);
  return {
    id: String(obj.id),
    title: String(obj.title),
    system_prompt: (obj.system_prompt as string | null) ?? null,
    model: (obj.model as string | null) ?? null,
    archived: Number(obj.archived) || 0,
    session_id: (obj.session_id as string | null) ?? null,
    last_message_at: (obj.last_message_at as string | null) ?? null,
    created_at: String(obj.created_at),
    updated_at: String(obj.updated_at),
  };
}

function rowToMessage(row: unknown[], columns: string[]): AgentMessageRow {
  const obj = rowToObject(row, columns);
  return {
    id: String(obj.id),
    agent_id: String(obj.agent_id),
    role: String(obj.role),
    content: String(obj.content),
    tool_calls: (obj.tool_calls as string | null) ?? null,
    type: (obj.type as string | null) ?? null,
    metadata: (obj.metadata as string | null) ?? null,
    input_tokens: obj.input_tokens != null ? Number(obj.input_tokens) : null,
    output_tokens: obj.output_tokens != null ? Number(obj.output_tokens) : null,
    duration_ms: obj.duration_ms != null ? Number(obj.duration_ms) : null,
    created_at: String(obj.created_at),
  };
}

function classifyLane(agent: AgentRow, now = Date.now()): "active" | "stale" | "archive" {
  if (agent.archived === 1) return "archive";
  if (!agent.last_message_at) return "active";
  const last = new Date(agent.last_message_at).getTime();
  if (Number.isNaN(last)) return "active";
  const age = now - last;
  if (age < ACTIVE_WINDOW_MS) return "active";
  if (age < STALE_WINDOW_MS) return "stale";
  return "archive";
}

async function loadAgent(access: DelegatedAccess, id: string): Promise<AgentRow | null> {
  const result = await access.sql.query(
    `SELECT id, title, system_prompt, model, archived, session_id, last_message_at, created_at, updated_at
     FROM agent WHERE id = ?`,
    [id],
  );
  if (!result.ok || !result.data.rows?.length) return null;
  return rowToAgent(result.data.rows[0] as unknown[], result.data.columns);
}

async function loadMessages(access: DelegatedAccess, agentId: string): Promise<AgentMessageRow[]> {
  const result = await access.sql.query(
    `SELECT id, agent_id, role, content, tool_calls, type, metadata, input_tokens, output_tokens, duration_ms, created_at
     FROM agent_message WHERE agent_id = ? ORDER BY created_at ASC`,
    [agentId],
  );
  if (!result.ok) return [];
  return (result.data.rows as unknown[][]).map((r) => rowToMessage(r, result.data.columns));
}

// ── Agents Routes ────────────────────────────────────────────────────

export function createAgentsRouter(config: AgentsRoutesConfig) {
  const { authMiddleware, delegationMiddleware } = config;
  const runAgentTurn = config.runAgentTurn ?? defaultRunAgentTurn;
  const sessionStore = config.sessionStore ?? new AgentSessionStore();
  sessionStore.startSweeper();
  const router = Router();

  router.use(authMiddleware);
  router.use(delegationMiddleware);

  // ── GET / — list agents with lane classification ──
  router.get("/", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;
    try {
      await ensureSchema(access);
      const result = await access.sql.query(
        `SELECT id, title, system_prompt, model, archived, session_id, last_message_at, created_at, updated_at
         FROM agent ORDER BY COALESCE(last_message_at, created_at) DESC`,
      );
      if (!result.ok) {
        throw new Error(`list agents failed: ${result.error.message}`);
      }
      const agents = (result.data.rows as unknown[][]).map((r) => {
        const agent = rowToAgent(r, result.data.columns);
        return { ...agent, lane: classifyLane(agent) };
      });
      res.json({ agents });
    } catch (err) {
      console.error("[agents] list failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "list_failed", message });
    }
  });

  // ── POST / — create a new agent (= start a new chat) ──
  router.post("/", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;
    const { title, systemPrompt, model } = req.body ?? {};
    if (typeof title !== "string" || title.trim().length === 0) {
      res.status(400).json({ error: "invalid_body", message: "title is required" });
      return;
    }
    try {
      await ensureSchema(access);
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const insert = await access.sql.execute(
        `INSERT INTO agent (id, title, system_prompt, model, archived, session_id, last_message_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, NULL, NULL, ?, ?)`,
        [
          id,
          title.trim(),
          typeof systemPrompt === "string" ? systemPrompt : null,
          typeof model === "string" ? model : null,
          now,
          now,
        ],
      );
      if (!insert.ok) {
        throw new Error(`insert agent failed: ${insert.error.message}`);
      }
      const agent = await loadAgent(access, id);
      if (!agent) throw new Error("agent disappeared after insert");
      res.status(201).json({ agent: { ...agent, lane: classifyLane(agent) } });
    } catch (err) {
      console.error("[agents] create failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "create_failed", message });
    }
  });

  // ── GET /:id — single agent + all messages ──
  router.get("/:id", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;
    const { id } = req.params;
    try {
      await ensureSchema(access);
      const agent = await loadAgent(access, id);
      if (!agent) {
        res.status(404).json({ error: "not_found", message: `Agent ${id} not found` });
        return;
      }
      const messages = await loadMessages(access, id);
      res.json({
        agent: { ...agent, lane: classifyLane(agent) },
        messages,
      });
    } catch (err) {
      console.error("[agents] get failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "get_failed", message });
    }
  });

  // ── PATCH /:id — update title / archived ──
  router.patch("/:id", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;
    const { id } = req.params;
    const { title, archived, systemPrompt, model } = req.body ?? {};

    try {
      await ensureSchema(access);
      const existing = await loadAgent(access, id);
      if (!existing) {
        res.status(404).json({ error: "not_found", message: `Agent ${id} not found` });
        return;
      }

      const setClauses: string[] = [];
      const params: (string | number | null)[] = [];
      if (typeof title === "string") {
        setClauses.push("title = ?");
        params.push(title.trim());
      }
      if (typeof archived === "boolean") {
        setClauses.push("archived = ?");
        params.push(archived ? 1 : 0);
      }
      if (typeof systemPrompt === "string") {
        setClauses.push("system_prompt = ?");
        params.push(systemPrompt);
      }
      if (typeof model === "string") {
        setClauses.push("model = ?");
        params.push(model);
      }
      if (setClauses.length === 0) {
        res.status(400).json({ error: "invalid_body", message: "no updatable fields provided" });
        return;
      }

      const now = new Date().toISOString();
      setClauses.push("updated_at = ?");
      params.push(now);
      params.push(id);

      const update = await access.sql.execute(
        `UPDATE agent SET ${setClauses.join(", ")} WHERE id = ?`,
        params,
      );
      if (!update.ok) {
        throw new Error(`update agent failed: ${update.error.message}`);
      }

      const agent = await loadAgent(access, id);
      if (!agent) throw new Error("agent disappeared after update");
      res.json({ agent: { ...agent, lane: classifyLane(agent) } });
    } catch (err) {
      console.error("[agents] patch failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "update_failed", message });
    }
  });

  // ── DELETE /:id — delete agent + all messages ──
  router.delete("/:id", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;
    const { id } = req.params;
    const address = req.user!.address;
    try {
      await ensureSchema(access);
      const existing = await loadAgent(access, id);
      if (!existing) {
        res.status(404).json({ error: "not_found", message: `Agent ${id} not found` });
        return;
      }
      const delMsgs = await access.sql.execute(`DELETE FROM agent_message WHERE agent_id = ?`, [
        id,
      ]);
      if (!delMsgs.ok) {
        throw new Error(`delete messages failed: ${delMsgs.error.message}`);
      }
      const delAgent = await access.sql.execute(`DELETE FROM agent WHERE id = ?`, [id]);
      if (!delAgent.ok) {
        throw new Error(`delete agent failed: ${delAgent.error.message}`);
      }
      // Drop any ephemeral session tied to this agent.
      sessionStore.evict(address, id);
      res.status(204).send();
    } catch (err) {
      console.error("[agents] delete failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "delete_failed", message });
    }
  });

  // ── POST /:id/session — open a fresh ephemeral agent session ──
  //
  // Creates a new session-only TinyCloudNode in memory, keyed by
  // (userAddress, agentId). Returns the node's session-key DID so the
  // frontend can call tcw.createDelegation({ delegateDID }) against it.
  // Calling this again replaces any prior session for the same pair.
  router.post("/:id/session", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;
    const { id } = req.params;
    const address = req.user!.address;
    try {
      await ensureSchema(access);
      const agent = await loadAgent(access, id);
      if (!agent) {
        res.status(404).json({ error: "not_found", message: `Agent ${id} not found` });
        return;
      }
      const entry = await sessionStore.openSession(address, id);
      res.json({
        agentId: id,
        agentDID: entry.nodeHandle.did,
        expiresAt: new Date(entry.expiresAt).toISOString(),
      });
    } catch (err) {
      console.error("[agents] open session failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "session_failed", message });
    }
  });

  // ── POST /:id/delegation — activate a signed delegation on the session ──
  //
  // The frontend builds a PortableDelegation (via tcw.createDelegation)
  // targeting the agentDID returned by POST /:id/session, then POSTs
  // the serialized blob here. We feed it into the session's
  // TinyCloudNode.useDelegation(), which produces the DelegatedAccess
  // the agent runner will use for SQL tools. No fallback: if there is
  // no active session, we 409 so the caller re-runs the handshake.
  router.post("/:id/delegation", async (req: Request, res: Response) => {
    const { id } = req.params;
    const address = req.user!.address;
    const { serialized } = req.body ?? {};
    if (typeof serialized !== "string" || serialized.length === 0) {
      res.status(400).json({ error: "invalid_body", message: "serialized delegation is required" });
      return;
    }
    try {
      const entry = await sessionStore.activateDelegation(address, id, serialized);
      console.log(
        `[agents] activated agent delegation: agentId=${id} agentDID=${entry.nodeHandle.did} expiresAt=${new Date(entry.expiresAt).toISOString()}`,
      );
      res.json({
        agentId: id,
        agentDID: entry.nodeHandle.did,
        expiresAt: new Date(entry.expiresAt).toISOString(),
        active: true,
      });
    } catch (err) {
      if (err instanceof AgentSessionError) {
        res.status(409).json({ error: err.code, message: err.message });
        return;
      }
      console.error("[agents] activate delegation failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "delegation_activation_failed", message });
    }
  });

  // ── GET /:id/messages — list messages (primarily for polling) ──
  router.get("/:id/messages", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;
    const { id } = req.params;
    try {
      await ensureSchema(access);
      const agent = await loadAgent(access, id);
      if (!agent) {
        res.status(404).json({ error: "not_found", message: `Agent ${id} not found` });
        return;
      }
      const messages = await loadMessages(access, id);
      res.json({ messages });
    } catch (err) {
      console.error("[agents] list messages failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "messages_failed", message });
    }
  });

  // ── POST /:id/messages — send a message, get assistant reply ──
  //
  // Hard rule: requires an active agent session + activated delegation
  // for (userAddress, agentId) BEFORE it will run a turn. If either is
  // missing the route 409s so the frontend can re-run the handshake.
  // There is no silent fallback to the user's own delegation.
  router.post("/:id/messages", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;
    const { id } = req.params;
    const address = req.user!.address;
    const { content } = req.body ?? {};

    if (typeof content !== "string" || content.trim().length === 0) {
      res.status(400).json({ error: "invalid_body", message: "content is required" });
      return;
    }

    // Require the agent-scoped DelegatedAccess upfront. This throws
    // AgentSessionError if there is no session or no active delegation;
    // we translate that to 409 so nothing is written to the user's
    // space until the ephemeral identity is ready.
    let agentAccess: DelegatedAccess;
    try {
      agentAccess = sessionStore.requireAccess(address, id);
    } catch (err) {
      if (err instanceof AgentSessionError) {
        res.status(409).json({ error: err.code, message: err.message });
        return;
      }
      throw err;
    }

    try {
      await ensureSchema(access);

      const agent = await loadAgent(access, id);
      if (!agent) {
        res.status(404).json({ error: "not_found", message: `Agent ${id} not found` });
        return;
      }

      // Append the user message (in the user's own space).
      const now = new Date().toISOString();
      const userMsgId = crypto.randomUUID();
      const insertUser = await access.sql.execute(
        `INSERT INTO agent_message (id, agent_id, role, content, tool_calls, type, metadata, input_tokens, output_tokens, duration_ms, created_at)
         VALUES (?, ?, 'user', ?, NULL, 'text', NULL, NULL, NULL, NULL, ?)`,
        [userMsgId, id, content, now],
      );
      if (!insertUser.ok) {
        throw new Error(`insert user message failed: ${insertUser.error.message}`);
      }

      // Load prior history + the message we just inserted.
      const history = await loadMessages(access, id);
      const turnMessages: AgentTurnMessage[] = history.map((m) => ({
        role: m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user",
        content: m.content,
      }));

      // Run the turn using the agent's own DelegatedAccess (scoped to
      // the ephemeral did:key for this session). If the agent has a
      // stored SDK session ID, pass it as resume so the SDK picks up
      // where it left off instead of re-sending all history.
      const turn: AgentTurnResult = await runAgentTurn({
        messages: turnMessages,
        systemPrompt: agent.system_prompt,
        agentAccess,
        model: agent.model,
        resumeSessionId: agent.session_id,
      });

      // Persist the assistant reply + update bookkeeping. Fire-and-forget:
      // the response body is assembled from in-memory data so we don't need
      // to block on DB writes. Errors are logged, not thrown.
      const assistantNow = new Date().toISOString();
      const assistantId = crypto.randomUUID();

      access.sql
        .execute(
          `INSERT INTO agent_message (id, agent_id, role, content, tool_calls, type, metadata, input_tokens, output_tokens, duration_ms, created_at)
         VALUES (?, ?, 'assistant', ?, ?, 'text', ?, ?, ?, ?, ?)`,
          [
            assistantId,
            id,
            turn.content,
            turn.toolCalls ? JSON.stringify(turn.toolCalls) : null,
            turn.normalizedMessages ? JSON.stringify(turn.normalizedMessages) : null,
            turn.usage?.inputTokens ?? null,
            turn.usage?.outputTokens ?? null,
            turn.usage?.durationMs ?? null,
            assistantNow,
          ],
        )
        .catch((err: unknown) =>
          console.error(`[agents] fire-and-forget: insert assistant message failed:`, err),
        );

      // Store the SDK session ID if captured (or update if changed).
      if (turn.sessionId && turn.sessionId !== agent.session_id) {
        access.sql
          .execute(`UPDATE agent SET session_id = ? WHERE id = ?`, [turn.sessionId, id])
          .catch((err: unknown) =>
            console.error(`[agents] fire-and-forget: update session_id failed:`, err),
          );
      }

      access.sql
        .execute(`UPDATE agent SET last_message_at = ?, updated_at = ? WHERE id = ?`, [
          assistantNow,
          assistantNow,
          id,
        ])
        .catch((err: unknown) =>
          console.error(`[agents] fire-and-forget: update last_message_at failed:`, err),
        );

      // Build response from in-memory data — don't re-query since DB
      // writes are fire-and-forget and may not have landed yet.
      const updatedAgent = { ...agent, last_message_at: assistantNow, updated_at: assistantNow };
      res.json({
        agent: { ...updatedAgent, lane: classifyLane(updatedAgent) },
        userMessage: {
          id: userMsgId,
          agent_id: id,
          role: "user",
          content,
          tool_calls: null,
          type: "text",
          metadata: null,
          input_tokens: null,
          output_tokens: null,
          duration_ms: null,
          created_at: now,
        },
        assistantMessage: {
          id: assistantId,
          agent_id: id,
          role: "assistant",
          content: turn.content,
          tool_calls: turn.toolCalls ? JSON.stringify(turn.toolCalls) : null,
          type: "text",
          metadata: turn.normalizedMessages ? JSON.stringify(turn.normalizedMessages) : null,
          input_tokens: turn.usage?.inputTokens ?? null,
          output_tokens: turn.usage?.outputTokens ?? null,
          duration_ms: turn.usage?.durationMs ?? null,
          created_at: assistantNow,
        },
      });
    } catch (err) {
      console.error("[agents] post message failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "message_failed", message });
    }
  });

  return router;
}

// Exported for tests.
export { classifyLane };
