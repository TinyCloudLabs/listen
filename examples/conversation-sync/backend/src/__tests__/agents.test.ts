import { describe, it, expect, afterEach, beforeEach } from "bun:test";
import express from "express";
import type { Server } from "http";
import type { Request, Response, NextFunction } from "express";
import { createAgentsRouter, classifyLane } from "../routes/agents.js";
import type { AgentTurnInput, AgentTurnResult } from "../services/agent-runner.js";

// ── Mock DelegatedAccess ─────────────────────────────────────────────

interface AgentRecord {
  id: string;
  title: string;
  system_prompt: string | null;
  model: string | null;
  archived: number;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

interface MessageRecord {
  id: string;
  agent_id: string;
  role: string;
  content: string;
  tool_calls: string | null;
  created_at: string;
}

function createMockAccess() {
  const agents = new Map<string, AgentRecord>();
  const messages: MessageRecord[] = [];

  const query = async (sql: string, params?: any[]) => {
    // SELECT agent by id
    if (sql.includes("FROM agent WHERE id = ?")) {
      const id = params?.[0];
      const row = agents.get(id);
      if (!row) return { ok: true, data: { rows: [], columns: [] } };
      const columns = Object.keys(row);
      return { ok: true, data: { rows: [columns.map((c) => (row as any)[c])], columns } };
    }
    // SELECT list of agents
    if (sql.includes("FROM agent ORDER BY")) {
      const list = [...agents.values()];
      if (list.length === 0) return { ok: true, data: { rows: [], columns: [] } };
      const columns = Object.keys(list[0]);
      const rows = list.map((a) => columns.map((c) => (a as any)[c]));
      return { ok: true, data: { rows, columns } };
    }
    // SELECT messages
    if (sql.includes("FROM agent_message WHERE agent_id = ?")) {
      const agentId = params?.[0];
      const list = messages.filter((m) => m.agent_id === agentId);
      if (list.length === 0) return { ok: true, data: { rows: [], columns: [] } };
      const columns = Object.keys(list[0]);
      const rows = list.map((m) => columns.map((c) => (m as any)[c]));
      return { ok: true, data: { rows, columns } };
    }
    // Schema verify
    if (sql.includes("SELECT 1 FROM")) {
      return { ok: true, data: { rows: [[1]], columns: ["1"] } };
    }
    return { ok: true, data: { rows: [], columns: [] } };
  };

  const execute = async (sql: string, params?: any[]) => {
    if (sql.trim().startsWith("CREATE")) return { ok: true };

    // INSERT INTO agent
    if (sql.includes("INSERT INTO agent (")) {
      const [id, title, system_prompt, model, created_at, updated_at] = params as any[];
      agents.set(id, {
        id,
        title,
        system_prompt,
        model,
        archived: 0,
        last_message_at: null,
        created_at,
        updated_at,
      });
      return { ok: true };
    }

    // INSERT INTO agent_message
    if (sql.includes("INSERT INTO agent_message")) {
      const [id, agent_id, content, ...rest] = params as any[];
      // User: 4 params (id, agent_id, content, created_at)
      // Assistant: 5 params (id, agent_id, content, tool_calls, created_at)
      const role = sql.includes("'assistant'") ? "assistant" : "user";
      const tool_calls = role === "assistant" ? (rest[0] as string | null) : null;
      const created_at = role === "assistant" ? (rest[1] as string) : (rest[0] as string);
      messages.push({ id, agent_id, role, content, tool_calls, created_at });
      return { ok: true };
    }

    // UPDATE agent
    if (sql.startsWith("UPDATE agent SET")) {
      const id = params?.[params.length - 1];
      const existing = agents.get(id);
      if (!existing) return { ok: true };
      // Extract set clauses in order; matches router code
      const clauses = sql.replace("UPDATE agent SET ", "").replace(" WHERE id = ?", "");
      const fields = clauses.split(", ").map((c) => c.split(" = ")[0]);
      fields.forEach((field, i) => {
        (existing as any)[field] = params?.[i];
      });
      return { ok: true };
    }

    // DELETE
    if (sql.includes("DELETE FROM agent_message")) {
      const agentId = params?.[0];
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].agent_id === agentId) messages.splice(i, 1);
      }
      return { ok: true };
    }
    if (sql.includes("DELETE FROM agent")) {
      const id = params?.[0];
      agents.delete(id);
      return { ok: true };
    }

    return { ok: true };
  };

  return {
    _agents: agents,
    _messages: messages,
    sql: { query, execute },
    kv: {},
  };
}

// ── Test app wiring ──────────────────────────────────────────────────

function createApp(
  access: ReturnType<typeof createMockAccess>,
  runAgentTurn?: (input: AgentTurnInput) => Promise<AgentTurnResult>,
) {
  const authMiddleware = (req: Request, _res: Response, next: NextFunction) => {
    req.user = { address: "0xtest" };
    next();
  };
  const delegationMiddleware = (req: Request, _res: Response, next: NextFunction) => {
    req.delegatedAccess = access as any;
    next();
  };
  const app = express();
  app.use(express.json());
  app.use(
    "/api/agents",
    createAgentsRouter({
      authMiddleware,
      delegationMiddleware,
      node: {} as any,
      runAgentTurn,
    }),
  );
  return app;
}

function startServer(app: express.Express): Promise<{ server: Server; port: number }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const port = (server.address() as any).port;
      resolve({ server, port });
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

// ── Tests ────────────────────────────────────────────────────────────

describe("classifyLane", () => {
  const NOW = new Date("2026-04-10T12:00:00Z").getTime();

  it("returns active when archived=0 and last_message_at is null", () => {
    const agent = {
      id: "a",
      title: "t",
      system_prompt: null,
      model: null,
      archived: 0,
      last_message_at: null,
      created_at: "2026-04-10T00:00:00Z",
      updated_at: "2026-04-10T00:00:00Z",
    };
    expect(classifyLane(agent, NOW)).toBe("active");
  });

  it("returns active when last_message_at is less than 24h ago", () => {
    const agent = {
      id: "a",
      title: "t",
      system_prompt: null,
      model: null,
      archived: 0,
      last_message_at: new Date(NOW - 60 * 60 * 1000).toISOString(),
      created_at: "",
      updated_at: "",
    };
    expect(classifyLane(agent, NOW)).toBe("active");
  });

  it("returns stale when last_message_at is between 24h and 7d ago", () => {
    const agent = {
      id: "a",
      title: "t",
      system_prompt: null,
      model: null,
      archived: 0,
      last_message_at: new Date(NOW - 3 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: "",
      updated_at: "",
    };
    expect(classifyLane(agent, NOW)).toBe("stale");
  });

  it("returns archive when last_message_at is more than 7d ago", () => {
    const agent = {
      id: "a",
      title: "t",
      system_prompt: null,
      model: null,
      archived: 0,
      last_message_at: new Date(NOW - 10 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: "",
      updated_at: "",
    };
    expect(classifyLane(agent, NOW)).toBe("archive");
  });

  it("returns archive when archived=1 regardless of timestamp", () => {
    const agent = {
      id: "a",
      title: "t",
      system_prompt: null,
      model: null,
      archived: 1,
      last_message_at: new Date(NOW).toISOString(),
      created_at: "",
      updated_at: "",
    };
    expect(classifyLane(agent, NOW)).toBe("archive");
  });
});

describe("Agents Routes — CRUD", () => {
  let access: ReturnType<typeof createMockAccess>;
  let server: Server;
  let port: number;

  beforeEach(async () => {
    access = createMockAccess();
    const app = createApp(access);
    const started = await startServer(app);
    server = started.server;
    port = started.port;
  });

  afterEach(async () => {
    await closeServer(server);
  });

  it("POST / creates a new agent and returns lane=active", async () => {
    const res = await fetch(`http://localhost:${port}/api/agents`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "My Agent" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.agent.title).toBe("My Agent");
    expect(body.agent.lane).toBe("active");
    expect(body.agent.archived).toBe(0);
  });

  it("POST / 400s on missing title", async () => {
    const res = await fetch(`http://localhost:${port}/api/agents`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("GET / lists agents with lane field", async () => {
    await fetch(`http://localhost:${port}/api/agents`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "A1" }),
    });
    await fetch(`http://localhost:${port}/api/agents`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "A2" }),
    });
    const res = await fetch(`http://localhost:${port}/api/agents`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.agents.length).toBe(2);
    expect(body.agents[0].lane).toBeDefined();
  });

  it("GET /:id returns agent + empty messages", async () => {
    const create = await fetch(`http://localhost:${port}/api/agents`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "A" }),
    });
    const { agent } = (await create.json()) as any;
    const res = await fetch(`http://localhost:${port}/api/agents/${agent.id}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.agent.id).toBe(agent.id);
    expect(body.messages).toEqual([]);
  });

  it("GET /:id 404s on unknown agent", async () => {
    const res = await fetch(`http://localhost:${port}/api/agents/does-not-exist`);
    expect(res.status).toBe(404);
  });

  it("PATCH /:id can archive an agent", async () => {
    const create = await fetch(`http://localhost:${port}/api/agents`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "A" }),
    });
    const { agent } = (await create.json()) as any;
    const res = await fetch(`http://localhost:${port}/api/agents/${agent.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.agent.archived).toBe(1);
    expect(body.agent.lane).toBe("archive");
  });

  it("DELETE /:id removes agent and messages", async () => {
    const create = await fetch(`http://localhost:${port}/api/agents`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "A" }),
    });
    const { agent } = (await create.json()) as any;
    const res = await fetch(`http://localhost:${port}/api/agents/${agent.id}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(204);
    expect(access._agents.size).toBe(0);
  });
});

describe("Agents Routes — POST /:id/messages", () => {
  let access: ReturnType<typeof createMockAccess>;
  let server: Server;
  let port: number;

  beforeEach(async () => {
    access = createMockAccess();
    const stubRunner = async (_input: AgentTurnInput): Promise<AgentTurnResult> => ({
      content: "hi from mock",
      toolCalls: [],
    });
    const app = createApp(access, stubRunner);
    const started = await startServer(app);
    server = started.server;
    port = started.port;
  });

  afterEach(async () => {
    await closeServer(server);
  });

  it("persists user + assistant messages and updates last_message_at", async () => {
    const create = await fetch(`http://localhost:${port}/api/agents`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Chat" }),
    });
    const { agent } = (await create.json()) as any;

    const res = await fetch(`http://localhost:${port}/api/agents/${agent.id}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "hello" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.userMessage.content).toBe("hello");
    expect(body.assistantMessage.content).toBe("hi from mock");
    expect(body.agent.last_message_at).not.toBeNull();

    const listRes = await fetch(`http://localhost:${port}/api/agents/${agent.id}/messages`);
    const listBody = (await listRes.json()) as any;
    expect(listBody.messages.length).toBe(2);
    expect(listBody.messages[0].role).toBe("user");
    expect(listBody.messages[1].role).toBe("assistant");
  });

  it("400s on missing content", async () => {
    const create = await fetch(`http://localhost:${port}/api/agents`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Chat" }),
    });
    const { agent } = (await create.json()) as any;

    const res = await fetch(`http://localhost:${port}/api/agents/${agent.id}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});
