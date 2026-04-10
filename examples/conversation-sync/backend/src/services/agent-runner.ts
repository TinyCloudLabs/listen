import type { DelegatedAccess } from "@tinyboilerplate/server";

// ── Types ────────────────────────────────────────────────────────────

export interface AgentTurnMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AgentTurnInput {
  /**
   * The chat history prior to this turn, oldest first.
   * The latest user message is the last entry.
   */
  messages: AgentTurnMessage[];
  /** Optional system prompt attached to the agent record. */
  systemPrompt?: string | null;
  /**
   * The DelegatedAccess the agent itself should use when running
   * SQL tools. This is NOT necessarily the same as the user's
   * DelegatedAccess — for the ephemeral-keypair model it is an
   * activated per-session delegation granted to the agent's DID.
   * For the MVP fallback path it is the user's DelegatedAccess.
   */
  agentAccess: DelegatedAccess;
  /** Optional model override — runner chooses the default otherwise. */
  model?: string | null;
}

export interface AgentTurnResult {
  /** The assistant's final reply text. */
  content: string;
  /**
   * Optional structured record of tool calls the agent made this
   * turn, in execution order. Persisted as JSON on agent_message.
   */
  toolCalls?: Array<{
    name: string;
    input: unknown;
    output: unknown;
  }>;
}

// ── Runner ───────────────────────────────────────────────────────────

/**
 * Execute a single agent turn against the Claude Agent SDK.
 *
 * IMPORTANT: The real SDK wiring lives in task #5. Until then this
 * throws loudly so the caller notices (per the project rule: no
 * silent fallbacks).
 */
export async function runAgentTurn(_input: AgentTurnInput): Promise<AgentTurnResult> {
  throw new Error(
    "runAgentTurn: Claude Agent SDK wiring not implemented yet (task #5). " +
      "This is a deliberate hard failure — do not add a fallback.",
  );
}
