import { useState, useEffect, useRef, useCallback, type FC } from "react";
import type { TinyCloudWeb } from "@tinycloud/web-sdk";
import type { ApiClient } from "@tinyboilerplate/client";
import { createDelegation } from "@tinyboilerplate/client";

// ── Types ────────────────────────────────────────────────────────────

interface AgentMessage {
  id: string;
  agent_id: string;
  role: string;
  content: string;
  tool_calls: string | null;
  created_at: string;
}

interface AgentSummary {
  id: string;
  title: string;
  last_message_at: string | null;
  archived: number;
}

interface SendMessageResponse {
  agent: AgentSummary | null;
  userMessage: AgentMessage;
  assistantMessage: AgentMessage;
}

interface AgentDetailResponse {
  agent: AgentSummary;
  messages: AgentMessage[];
}

interface SessionResponse {
  agentId: string;
  agentDID: string;
  expiresAt: string;
}

interface DelegationActivationResponse {
  agentId: string;
  agentDID: string;
  expiresAt: string;
  active: boolean;
}

interface AgentChatProps {
  api: ApiClient;
  agentId: string;
  tcw: TinyCloudWeb | null;
  onBack: () => void;
}

// ── Constants ────────────────────────────────────────────────────────

const AGENT_DELEGATION_ACTIONS = ["tinycloud.sql/read", "tinycloud.sql/write"];
const AGENT_DELEGATION_EXPIRY_MS = 3_600_000; // 1 hour

// ── Helpers ──────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatExpiresAt(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function is409Error(err: unknown): boolean {
  return err instanceof Error && err.message.includes("(409)");
}

// ── Component ────────────────────────────────────────────────────────

/**
 * Agent chat view with ephemeral-keypair delegation handshake.
 *
 * On the first message send, this component:
 * 1. POST /api/agents/:id/session → gets `agentDID`
 * 2. tcw.createDelegation({ delegateDID: agentDID, ... }) → serialized
 * 3. POST /api/agents/:id/delegation { serialized } → confirms active
 * 4. POST /api/agents/:id/messages { content } → sends the message
 *
 * If the messages POST returns 409 (session expired / missing), the
 * handshake is re-run once and the message is retried. If the retry
 * also 409s, the error is surfaced — no silent loop.
 *
 * See examples/conversation-sync/AGENT-KEYS.md for the full design.
 */
export const AgentChat: FC<AgentChatProps> = ({ api, agentId, tcw, onBack }) => {
  const [agent, setAgent] = useState<AgentSummary | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Ephemeral session state — scoped to this component instance.
  // Navigating away and back resets it; the next send re-handshakes.
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<AgentDetailResponse>(`/api/agents/${agentId}`);
      setAgent(res.agent);
      setMessages(res.messages ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [api, agentId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sending]);

  /**
   * Run the 3-step delegation handshake:
   * 1. Open session → get agentDID
   * 2. Sign delegation via tcw
   * 3. Activate delegation on backend
   */
  const runHandshake = useCallback(async (): Promise<void> => {
    if (!tcw) {
      throw new Error(
        "Full sign-in required to chat with agents. " +
          "Session restore doesn't include wallet access for delegation signing. " +
          "Please sign out and sign in again.",
      );
    }

    // Step 1: Open session
    const session = await api.post<SessionResponse>(`/api/agents/${agentId}/session`);

    // Step 2: Sign delegation targeting the agent's ephemeral DID
    const serialized = await createDelegation(tcw, session.agentDID, {
      actions: AGENT_DELEGATION_ACTIONS,
      path: "",
      expiryMs: AGENT_DELEGATION_EXPIRY_MS,
    });

    // Step 3: Activate delegation on backend
    const activation = await api.post<DelegationActivationResponse>(
      `/api/agents/${agentId}/delegation`,
      { serialized },
    );

    setSessionActive(true);
    setSessionExpiresAt(activation.expiresAt);
  }, [api, agentId, tcw]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    const optimisticUser: AgentMessage = {
      id: `optimistic-${Date.now()}`,
      agent_id: agentId,
      role: "user",
      content,
      tool_calls: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setInput("");
    setSending(true);
    setError(null);

    try {
      // Ensure the ephemeral session is active before sending.
      if (!sessionActive) {
        await runHandshake();
      }

      // Try sending the message.
      let res: SendMessageResponse;
      try {
        res = await api.post<SendMessageResponse>(`/api/agents/${agentId}/messages`, { content });
      } catch (err) {
        // On 409 (no_agent_session / no_agent_delegation / agent_session_expired),
        // re-run the handshake once and retry. If the retry also fails, throw.
        if (!is409Error(err)) throw err;

        await runHandshake();
        res = await api.post<SendMessageResponse>(`/api/agents/${agentId}/messages`, { content });
      }

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticUser.id),
        res.userMessage,
        res.assistantMessage,
      ]);
      if (res.agent) setAgent(res.agent);
    } catch (err) {
      // On handshake or message failure, mark session as inactive so
      // the next send attempt will re-handshake from scratch.
      setSessionActive(false);
      setSessionExpiresAt(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  const sessionLabel = sessionActive
    ? `Ephemeral agent session — renews at ${sessionExpiresAt ? formatExpiresAt(sessionExpiresAt) : "unknown"}`
    : "Not yet active — starts on first message";

  return (
    <section style={s.card}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>
          &larr; Back
        </button>
        <div style={s.titleCol}>
          <span style={s.title}>{agent?.title ?? "Loading…"}</span>
          <span style={s.sessionNote}>{sessionLabel}</span>
        </div>
      </div>

      {error && (
        <div style={s.errorCard}>
          <span style={s.errorIcon}>!</span>
          {error}
        </div>
      )}

      <div ref={scrollRef} style={s.scroller}>
        {loading ? (
          <p style={s.emptyText}>Loading messages…</p>
        ) : messages.length === 0 ? (
          <p style={s.emptyText}>No messages yet. Say hello.</p>
        ) : (
          <ul style={s.list}>
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <li
                  key={m.id}
                  style={{
                    ...s.msgRow,
                    justifyContent: isUser ? "flex-end" : "flex-start",
                  }}
                >
                  <div style={isUser ? s.bubbleUser : s.bubbleAssistant}>
                    <div style={s.bubbleText}>{m.content}</div>
                    <div style={isUser ? s.bubbleTimeUser : s.bubbleTimeAssistant}>
                      {formatTime(m.created_at)}
                    </div>
                  </div>
                </li>
              );
            })}
            {sending && (
              <li style={{ ...s.msgRow, justifyContent: "flex-start" }}>
                <div style={s.bubbleAssistant}>
                  <div style={s.thinking}>
                    <span style={{ ...s.loadingDot, animationDelay: "0s" }} />
                    <span style={{ ...s.loadingDot, animationDelay: "0.15s" }} />
                    <span style={{ ...s.loadingDot, animationDelay: "0.3s" }} />
                    <span style={s.thinkingText}>Thinking…</span>
                  </div>
                </div>
              </li>
            )}
          </ul>
        )}
      </div>

      <form style={s.inputRow} onSubmit={handleSend}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message…"
          style={s.input}
          disabled={sending}
        />
        <button
          type="submit"
          style={{
            ...s.sendBtn,
            ...(sending || !input.trim() ? s.sendBtnDisabled : {}),
          }}
          disabled={sending || !input.trim()}
        >
          Send
        </button>
      </form>
    </section>
  );
};

// ── Styles ──────────────────────────────────────────────────────────

const FONT = "'Outfit', -apple-system, sans-serif";
const MONO = "'IBM Plex Mono', 'SF Mono', monospace";

const s: Record<string, React.CSSProperties> = {
  card: {
    fontFamily: FONT,
    background: "#fff",
    border: "1px solid #e2e4e9",
    borderRadius: 12,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    height: 560,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 20px",
    borderBottom: "1px solid #f3f4f6",
    flexShrink: 0,
  },
  backBtn: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 500,
    color: "#6b7280",
    background: "transparent",
    border: "1px solid #e2e4e9",
    borderRadius: 6,
    padding: "4px 10px",
    cursor: "pointer",
  },
  titleCol: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: 600,
    color: "#18181b",
    letterSpacing: "-0.01em",
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
    whiteSpace: "nowrap" as const,
  },
  sessionNote: {
    fontFamily: MONO,
    fontSize: 10,
    color: "#9ca3af",
    letterSpacing: "0.02em",
  },
  scroller: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "16px 20px",
    background: "#fafafa",
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  },
  msgRow: {
    display: "flex",
    width: "100%",
  },
  bubbleUser: {
    maxWidth: "75%",
    padding: "8px 12px",
    background: "#6366f1",
    color: "#fff",
    borderRadius: "12px 12px 2px 12px",
    fontSize: 13,
    lineHeight: 1.45,
  },
  bubbleAssistant: {
    maxWidth: "75%",
    padding: "8px 12px",
    background: "#fff",
    color: "#18181b",
    border: "1px solid #e2e4e9",
    borderRadius: "12px 12px 12px 2px",
    fontSize: 13,
    lineHeight: 1.45,
  },
  bubbleText: {
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const,
  },
  bubbleTimeUser: {
    fontFamily: MONO,
    fontSize: 9,
    color: "rgba(255,255,255,0.7)",
    marginTop: 3,
    textAlign: "right" as const,
  },
  bubbleTimeAssistant: {
    fontFamily: MONO,
    fontSize: 9,
    color: "#9ca3af",
    marginTop: 3,
  },
  thinking: {
    display: "flex",
    alignItems: "center",
    gap: 5,
  },
  thinkingText: {
    fontSize: 12,
    color: "#6b7280",
    marginLeft: 4,
  },
  loadingDot: {
    display: "inline-block",
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#6366f1",
    animation: "syncPulse 1s ease-in-out infinite",
  },
  emptyText: {
    fontFamily: FONT,
    fontSize: 13,
    color: "#9ca3af",
    textAlign: "center" as const,
    margin: "24px 0",
    fontStyle: "italic" as const,
  },
  inputRow: {
    display: "flex",
    gap: 8,
    padding: "12px 20px",
    borderTop: "1px solid #f3f4f6",
    background: "#fff",
    flexShrink: 0,
  },
  input: {
    fontFamily: FONT,
    flex: 1,
    fontSize: 13,
    padding: "8px 12px",
    border: "1px solid #e2e4e9",
    borderRadius: 8,
    outline: "none",
    color: "#18181b",
    background: "#fff",
  },
  sendBtn: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: 600,
    color: "#fff",
    background: "#6366f1",
    border: "none",
    borderRadius: 8,
    padding: "8px 18px",
    cursor: "pointer",
  },
  sendBtnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  errorCard: {
    fontFamily: FONT,
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    margin: "8px 20px 0",
    padding: "10px 14px",
    fontSize: 12,
    color: "#991b1b",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 8,
    lineHeight: 1.4,
  },
  errorIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: "#ef4444",
    color: "#fff",
    fontSize: 10,
    fontWeight: 700,
    flexShrink: 0,
  },
};
