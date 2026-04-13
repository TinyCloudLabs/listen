/**
 * Normalize raw Claude Agent SDK messages into a canonical format for
 * storage and frontend rendering. Ported from the fundraise repo's
 * agent-provider.ts normalization layer.
 */

// ── Canonical message type ──────────────────────────────────────────

export type NormalizedMessageType = "text" | "tool_use" | "tool_result" | "error" | "status";

export interface NormalizedMessage {
  type: NormalizedMessageType;
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

// ── Normalizer ──────────────────────────────────────────────────────

/**
 * Accept a raw SDK message object and return a canonical
 * NormalizedMessage, or null if the message should be suppressed
 * (e.g. pure heartbeat / progress without useful content).
 */
export function normalizeSDKMessage(msg: unknown): NormalizedMessage | null {
  if (!msg || typeof msg !== "object") return null;
  const m = msg as Record<string, unknown>;
  const ts = new Date().toISOString();

  switch (m.type) {
    case "assistant": {
      const message = m.message as Record<string, unknown> | undefined;
      const content = (message?.content ?? []) as Array<Record<string, unknown>>;

      const textBlocks = content.filter((b) => b.type === "text");
      const toolBlocks = content.filter((b) => b.type === "tool_use");

      // Text content takes priority
      if (textBlocks.length > 0) {
        const text = textBlocks.map((b) => String(b.text ?? "")).join("\n");
        return { type: "text", content: text, timestamp: ts };
      }

      // Tool use
      if (toolBlocks.length > 0) {
        const tools = toolBlocks.map((b) => ({
          name: String(b.name ?? "unknown"),
          input: b.input,
        }));
        return {
          type: "tool_use",
          content: tools.map((t) => t.name).join(", "),
          timestamp: ts,
          metadata: { tools },
        };
      }

      return null;
    }

    case "tool_result": {
      const output = m.content ?? m.output ?? m.result ?? "";
      const text = typeof output === "string" ? output : JSON.stringify(output);
      return {
        type: "tool_result",
        content: text,
        timestamp: ts,
        metadata: {
          toolName: m.tool_name ?? m.name ?? undefined,
          toolUseId: m.tool_use_id ?? undefined,
        },
      };
    }

    case "result": {
      const subtype = m.subtype as string | undefined;
      if (subtype === "success") {
        return {
          type: "text",
          content: String(m.result ?? ""),
          timestamp: ts,
          metadata: {
            costUsd: m.total_cost_usd,
            turns: m.num_turns,
            durationMs: m.duration_ms,
          },
        };
      }
      // Error result
      return {
        type: "error",
        content: `Agent error: ${subtype ?? "unknown"}`,
        timestamp: ts,
        metadata: { errors: m.errors },
      };
    }

    case "system": {
      const subtype = m.subtype as string | undefined;
      if (subtype === "init") {
        return {
          type: "status",
          content: `Session initialized (model: ${m.model ?? "unknown"})`,
          timestamp: ts,
          metadata: { model: m.model, tools: m.tools },
        };
      }
      return {
        type: "status",
        content: `system:${subtype ?? "unknown"}`,
        timestamp: ts,
      };
    }

    case "tool_progress": {
      return {
        type: "status",
        content: `Tool running: ${m.tool_name ?? "unknown"} (${m.elapsed_time_seconds ?? 0}s)`,
        timestamp: ts,
        metadata: {
          toolName: m.tool_name,
          elapsed: m.elapsed_time_seconds,
        },
      };
    }

    case "tool_use_summary": {
      return {
        type: "status",
        content: String(m.summary ?? ""),
        timestamp: ts,
      };
    }

    default:
      // Suppress unknown / heartbeat message types
      return null;
  }
}
