import { useState, useEffect, useRef, useCallback, type FC } from "react";
import type { ApiClient } from "@tinyboilerplate/client";

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

interface MessagesResponse {
  messages: AgentMessage[];
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

interface AgentChatProps {
  api: ApiClient;
  agentId: string;
  onBack: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Component ────────────────────────────────────────────────────────

/**
 * Agent chat view.
 *
 * Delegation model — MVP (see examples/conversation-sync/AGENT-KEYS.md):
 * the backend currently runs agent SQL calls under the user's own
 * DelegatedAccess (the one activated by the normal `delegationMiddleware`).
 * It reads an `X-Agent-Delegation` header if present, but for the MVP we
 * do NOT send one. The per-session ephemeral-keypair flow is designed in
 * AGENT-KEYS.md and is a deferred follow-up — when it lands, this
 * component will gain a `tcw.createDelegation(...)` step on first message
 * and attach the serialized blob as `X-Agent-Delegation` on each POST.
 */
export const AgentChat: FC<AgentChatProps> = ({ api, agentId, onBack }) => {
  const [agent, setAgent] = useState<AgentSummary | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    // Auto-scroll to bottom when new messages arrive.
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sending]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    // Optimistically show the user message; if the request fails we'll
    // leave it in place and surface the error — no silent rollback.
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
      const res = await api.post<SendMessageResponse>(`/api/agents/${agentId}/messages`, {
        content,
      });
      // Replace the optimistic user message with the canonical one + append
      // the assistant reply.
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticUser.id),
        res.userMessage,
        res.assistantMessage,
      ]);
      if (res.agent) setAgent(res.agent);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <section style={s.card}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>
          &larr; Back
        </button>
        <div style={s.titleCol}>
          <span style={s.title}>{agent?.title ?? "Loading…"}</span>
          <span style={s.sessionNote}>Session uses your main TinyCloud delegation</span>
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
