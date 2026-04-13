import type { DelegatedAccess } from "@tinyboilerplate/server";
import { normalizeSDKMessage, type NormalizedMessage } from "./agent-message-normalizer.js";

// ── Types ────────────────────────────────────────────────────────────

export interface AgentTurnMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AgentTurnInput {
  /**
   * The chat history for this turn, oldest first. The latest user
   * message is the last entry.
   */
  messages: AgentTurnMessage[];
  /** Optional system prompt attached to the agent record. */
  systemPrompt?: string | null;
  /**
   * The DelegatedAccess the agent itself should use when running SQL
   * tools. This is NOT necessarily the same as the user's
   * DelegatedAccess — for the ephemeral-keypair model it is an
   * activated per-session delegation granted to the agent's DID. For
   * the MVP fallback path it is the user's DelegatedAccess.
   */
  agentAccess: DelegatedAccess;
  /** Optional model override — runner chooses the default otherwise. */
  model?: string | null;
  /** SDK session ID to resume (from a prior turn). */
  resumeSessionId?: string | null;
}

export interface AgentTurnToolCall {
  name: string;
  input: unknown;
  output: unknown;
}

export interface AgentTurnResult {
  /** The assistant's final reply text. */
  content: string;
  /**
   * Optional structured record of tool calls the agent made this
   * turn, in execution order. Persisted as JSON on agent_message.
   */
  toolCalls?: AgentTurnToolCall[];
  /** Normalized messages from the SDK stream. */
  normalizedMessages?: NormalizedMessage[];
  /** SDK session ID captured from the stream — store for resume. */
  sessionId?: string;
}

// ── Constants ────────────────────────────────────────────────────────

const DEFAULT_MODEL = "claude-opus-4-6";

const SQL_TOOLS_SYSTEM_NOTE = `You are an agent that lives inside a user's conversation-sync TinyCloud space.
You have two tools for interacting with the user's data:
- sql_query: read-only SELECT queries against the TinyCloud SQL store
- sql_execute: write queries (INSERT/UPDATE/DELETE/CREATE/DROP) against the same store

Tables available include \`conversation\`, \`participant\`, \`agent\`, and \`agent_message\`.
When you answer, be concise. If you need data, run a SQL query first.`;

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Linearize multi-turn history into a single prompt string for the
 * Agent SDK's one-shot query() call. This is intentionally simple for
 * the MVP — sessionRestore / resume would be a better long-term fit.
 */
function buildPrompt(messages: AgentTurnMessage[]): string {
  if (messages.length === 0) return "";

  // If there's only a single user message, pass it through raw so the
  // model doesn't get confused by an empty history preamble.
  if (messages.length === 1 && messages[0].role === "user") {
    return messages[0].content;
  }

  const priorTurns = messages.slice(0, -1);
  const lastMessage = messages[messages.length - 1];

  const history = priorTurns
    .map((m) => {
      const label = m.role === "assistant" ? "Assistant" : m.role === "system" ? "System" : "User";
      return `${label}: ${m.content}`;
    })
    .join("\n\n");

  const latestLabel =
    lastMessage.role === "assistant"
      ? "Assistant"
      : lastMessage.role === "system"
        ? "System"
        : "User";

  return [
    "Here is the prior conversation:",
    history,
    `Most recent ${latestLabel.toLowerCase()} message:`,
    lastMessage.content,
    "",
    "Continue the conversation. Respond as the assistant.",
  ].join("\n\n");
}

function requireAnthropicKey(): string {
  const key = process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY;
  if (!key) {
    throw new Error(
      "ANTHROPIC_API_KEY (or CLAUDE_API_KEY) is required to run agents. " +
        "Set it in your backend environment.",
    );
  }
  return key;
}

// ── Runner ───────────────────────────────────────────────────────────

/**
 * Execute a single agent turn against the Claude Agent SDK.
 *
 * Wires up two in-process MCP tools (`sql_query`, `sql_execute`) that
 * close over the caller-supplied DelegatedAccess, so every SQL call the
 * agent makes is scoped to the agent's own delegation at the TinyCloud
 * layer.
 *
 * Non-streaming: consumes the async iterator to completion and returns
 * the final text result. Errors bubble up — no silent fallback.
 */
export async function runAgentTurn(input: AgentTurnInput): Promise<AgentTurnResult> {
  const apiKey = requireAnthropicKey();
  // The Agent SDK subprocess reads ANTHROPIC_API_KEY from process.env.
  process.env.ANTHROPIC_API_KEY = apiKey;

  // Unset nested-session markers so the SDK can launch Claude Code
  // subprocesses. Without this, the SDK thinks it's already nested and
  // refuses to spawn. See fundraise dae5671.
  delete process.env.CLAUDECODE;
  delete process.env.CLAUDE_CODE_ENTRYPOINT;

  // Dynamic imports — the SDK ships a CLI subprocess and pulls in a
  // wide dep tree. Loading it lazily keeps the non-agent code paths
  // (and unit tests that don't exercise this function) cheap.
  const { query, tool, createSdkMcpServer } = await import("@anthropic-ai/claude-agent-sdk");
  const { z } = await import("zod");

  const toolCalls: AgentTurnToolCall[] = [];

  const sqlQueryTool = tool(
    "sql_query",
    "Run a read-only SELECT query against the user's TinyCloud SQL store. Returns rows + columns.",
    { sql: z.string().describe("A SELECT SQL statement. No DDL or DML.") },
    async ({ sql }) => {
      const trimmed = sql.trim().toLowerCase();
      if (!trimmed.startsWith("select") && !trimmed.startsWith("with")) {
        return {
          content: [
            {
              type: "text",
              text: "Error: sql_query only accepts SELECT/WITH statements. Use sql_execute for writes.",
            },
          ],
          isError: true,
        };
      }
      const result = await input.agentAccess.sql.query(sql);
      if (!result.ok) {
        const message = result.error?.message ?? "unknown SQL error";
        toolCalls.push({ name: "sql_query", input: { sql }, output: { error: message } });
        return {
          content: [{ type: "text", text: `SQL error: ${message}` }],
          isError: true,
        };
      }
      const payload = {
        columns: result.data.columns,
        rows: result.data.rows,
        rowCount: result.data.rows?.length ?? 0,
      };
      toolCalls.push({ name: "sql_query", input: { sql }, output: payload });
      return {
        content: [{ type: "text", text: JSON.stringify(payload) }],
      };
    },
  );

  const sqlExecuteTool = tool(
    "sql_execute",
    "Run a write statement (INSERT/UPDATE/DELETE/CREATE/DROP) against the user's TinyCloud SQL store.",
    { sql: z.string().describe("A write SQL statement.") },
    async ({ sql }) => {
      const result = await input.agentAccess.sql.execute(sql);
      if (!result.ok) {
        const message = result.error?.message ?? "unknown SQL error";
        toolCalls.push({ name: "sql_execute", input: { sql }, output: { error: message } });
        return {
          content: [{ type: "text", text: `SQL error: ${message}` }],
          isError: true,
        };
      }
      toolCalls.push({ name: "sql_execute", input: { sql }, output: result.data });
      return {
        content: [{ type: "text", text: `ok: ${JSON.stringify(result.data)}` }],
      };
    },
  );

  const mcpServer = createSdkMcpServer({
    name: "tinycloud",
    tools: [sqlQueryTool, sqlExecuteTool],
  });

  const systemPromptPieces = [SQL_TOOLS_SYSTEM_NOTE];
  if (input.systemPrompt && input.systemPrompt.trim().length > 0) {
    systemPromptPieces.push(input.systemPrompt.trim());
  }

  const prompt = input.resumeSessionId
    ? buildPrompt(input.messages.slice(-1))
    : buildPrompt(input.messages);

  const response = query({
    prompt,
    options: {
      model: input.model ?? DEFAULT_MODEL,
      mcpServers: { tinycloud: mcpServer },
      allowedTools: ["mcp__tinycloud__sql_query", "mcp__tinycloud__sql_execute"],
      systemPrompt: systemPromptPieces.join("\n\n"),
      permissionMode: "bypassPermissions",
      settingSources: [],
      ...(input.resumeSessionId ? { resume: input.resumeSessionId } : {}),
    },
  });

  let resultText = "";
  let capturedSessionId: string | undefined;
  const normalizedMessages: NormalizedMessage[] = [];

  for await (const message of response) {
    const m = message as Record<string, unknown>;

    // Capture session ID from the first message that has one.
    if (!capturedSessionId && typeof m.session_id === "string" && m.session_id) {
      capturedSessionId = m.session_id;
    }

    if (m.type === "result" && typeof m.result === "string") {
      resultText = m.result;
    }

    // Normalize and collect for storage.
    const normalized = normalizeSDKMessage(message);
    if (normalized) {
      normalizedMessages.push(normalized);
    }
  }

  if (!resultText) {
    throw new Error("Agent SDK returned no result text for this turn.");
  }

  return {
    content: resultText,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    normalizedMessages: normalizedMessages.length > 0 ? normalizedMessages : undefined,
    sessionId: capturedSessionId,
  };
}
