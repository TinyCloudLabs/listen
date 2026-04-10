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

// ── Types ────────────────────────────────────────────────────────────

interface AgentsRoutesConfig {
  authMiddleware: RequestHandler;
  delegationMiddleware: RequestHandler;
  node: TinyCloudNode;
  /** Optional runner override — defaults to the real Claude Agent SDK runner (task #5). */
  runAgentTurn?: (input: AgentTurnInput) => Promise<AgentTurnResult>;
}

interface AgentRow {
  id: string;
  title: string;
  system_prompt: string | null;
  model: string | null;
  archived: number;
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
    `SELECT id, title, system_prompt, model, archived, last_message_at, created_at, updated_at
     FROM agent WHERE id = ?`,
    [id],
  );
  if (!result.ok || !result.data.rows?.length) return null;
  return rowToAgent(result.data.rows[0] as unknown[], result.data.columns);
}

async function loadMessages(access: DelegatedAccess, agentId: string): Promise<AgentMessageRow[]> {
  const result = await access.sql.query(
    `SELECT id, agent_id, role, content, tool_calls, created_at
     FROM agent_message WHERE agent_id = ? ORDER BY created_at ASC`,
    [agentId],
  );
  if (!result.ok) return [];
  return (result.data.rows as unknown[][]).map((r) => rowToMessage(r, result.data.columns));
}

/**
 * Resolve the DelegatedAccess the agent itself should use when running
 * SQL tools. If the request carries an X-Agent-Delegation header (a
 * serialized PortableDelegation granted to the agent's ephemeral DID),
 * activate it. Otherwise fall back to the user's own DelegatedAccess —
 * the MVP path documented in AGENT-KEYS.md.
 */
async function resolveAgentAccess(
  req: Request,
  node: TinyCloudNode,
  userAccess: DelegatedAccess,
): Promise<DelegatedAccess> {
  const header = req.headers["x-agent-delegation"];
  if (!header) return userAccess;
  const serialized = Array.isArray(header) ? header[0] : header;
  if (!serialized) return userAccess;

  // Dynamic import: keeps the router module importable in unit tests
  // that don't have @tinycloud/node-sdk's runtime deps (siwe, etc.)
  // resolvable from their cwd. Only hit when the header is present.
  const { deserializeDelegation } = await import("@tinycloud/node-sdk");
  const delegation = deserializeDelegation(serialized);
  const access = await node.useDelegation(delegation);
  console.log(
    `[agents] activated agent delegation: spaceId=${access.spaceId} path=${JSON.stringify(access.path)}`,
  );
  return access;
}

// ── Agents Routes ────────────────────────────────────────────────────

export function createAgentsRouter(config: AgentsRoutesConfig) {
  const { authMiddleware, delegationMiddleware, node } = config;
  const runAgentTurn = config.runAgentTurn ?? defaultRunAgentTurn;
  const router = Router();

  router.use(authMiddleware);
  router.use(delegationMiddleware);

  // ── GET / — list agents with lane classification ──
  router.get("/", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;
    try {
      await ensureSchema(access);
      const result = await access.sql.query(
        `SELECT id, title, system_prompt, model, archived, last_message_at, created_at, updated_at
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
        `INSERT INTO agent (id, title, system_prompt, model, archived, last_message_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, NULL, ?, ?)`,
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
      res.status(204).send();
    } catch (err) {
      console.error("[agents] delete failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "delete_failed", message });
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
  router.post("/:id/messages", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;
    const { id } = req.params;
    const { content } = req.body ?? {};

    if (typeof content !== "string" || content.trim().length === 0) {
      res.status(400).json({ error: "invalid_body", message: "content is required" });
      return;
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
        `INSERT INTO agent_message (id, agent_id, role, content, tool_calls, created_at)
         VALUES (?, ?, 'user', ?, NULL, ?)`,
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

      // Resolve the agent's runtime DelegatedAccess (ephemeral
      // delegation if the frontend sent one, otherwise user's own).
      const agentAccess = await resolveAgentAccess(req, node, access);

      // Run the turn. Errors bubble up — no silent fallback.
      const turn: AgentTurnResult = await runAgentTurn({
        messages: turnMessages,
        systemPrompt: agent.system_prompt,
        agentAccess,
        model: agent.model,
      });

      // Persist the assistant reply + update last_message_at.
      const assistantNow = new Date().toISOString();
      const assistantId = crypto.randomUUID();
      const insertAssistant = await access.sql.execute(
        `INSERT INTO agent_message (id, agent_id, role, content, tool_calls, created_at)
         VALUES (?, ?, 'assistant', ?, ?, ?)`,
        [
          assistantId,
          id,
          turn.content,
          turn.toolCalls ? JSON.stringify(turn.toolCalls) : null,
          assistantNow,
        ],
      );
      if (!insertAssistant.ok) {
        throw new Error(`insert assistant message failed: ${insertAssistant.error.message}`);
      }

      const updateAgent = await access.sql.execute(
        `UPDATE agent SET last_message_at = ?, updated_at = ? WHERE id = ?`,
        [assistantNow, assistantNow, id],
      );
      if (!updateAgent.ok) {
        throw new Error(`update agent last_message_at failed: ${updateAgent.error.message}`);
      }

      const updatedAgent = await loadAgent(access, id);
      res.json({
        agent: updatedAgent ? { ...updatedAgent, lane: classifyLane(updatedAgent) } : null,
        userMessage: {
          id: userMsgId,
          agent_id: id,
          role: "user",
          content,
          tool_calls: null,
          created_at: now,
        },
        assistantMessage: {
          id: assistantId,
          agent_id: id,
          role: "assistant",
          content: turn.content,
          tool_calls: turn.toolCalls ? JSON.stringify(turn.toolCalls) : null,
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
