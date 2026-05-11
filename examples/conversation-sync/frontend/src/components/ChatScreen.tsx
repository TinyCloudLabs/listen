import { useEffect, useMemo, useState, type FC } from "react";
import type { ApiClient } from "@tinyboilerplate/client";

interface ConversationSummary {
  id: string;
  title: string;
  source: string;
  started_at: string;
  summary: string | null;
}

interface ConversationsResponse {
  conversations: ConversationSummary[];
  total: number;
}

interface TranscriptSentence {
  speaker_name: string;
  text: string;
  start_time: number;
}

interface DetailResponse {
  conversation: ConversationSummary;
  transcript: TranscriptSentence[] | null;
}

interface Citation {
  id: string;
  title: string;
  source: string;
  date: string;
  snippet: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

interface ChatScreenProps {
  api: ApiClient;
  refreshKey?: number;
  onOpenConversation: (id: string) => void;
}

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "for",
  "from",
  "how",
  "the",
  "this",
  "that",
  "was",
  "were",
  "what",
  "when",
  "where",
  "with",
]);

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

function sourceLabel(source: string): string {
  switch (source) {
    case "fireflies":
      return "FIREFLIES";
    case "google-meet":
      return "GOOGLE MEET";
    default:
      return source.toUpperCase();
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function cleanText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreText(text: string, tokens: string[]): number {
  const lower = text.toLowerCase();
  return tokens.reduce((score, token) => score + (lower.includes(token) ? 1 : 0), 0);
}

function snippetFor(text: string, tokens: string[], max = 180): string {
  const clean = cleanText(text);
  const lower = clean.toLowerCase();
  const firstHit = tokens
    .map((token) => lower.indexOf(token))
    .filter((idx) => idx >= 0)
    .sort((a, b) => a - b)[0];
  const start = firstHit == null ? 0 : Math.max(0, firstHit - 48);
  const snippet = clean.slice(start, start + max);
  return `${start > 0 ? "... " : ""}${snippet}${start + max < clean.length ? " ..." : ""}`;
}

export const ChatScreen: FC<ChatScreenProps> = ({ api, refreshKey, onOpenConversation }) => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "assistant",
      content:
        "Ask about your synced transcripts. I will search titles, summaries, and transcript text, then cite the matching conversations.",
    },
  ]);

  useEffect(() => {
    setLoading(true);
    api
      .get<ConversationsResponse>("/api/conversations?limit=100&offset=0")
      .then((res) => {
        setConversations(res.conversations);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [api, refreshKey]);

  const suggestions = useMemo(() => {
    const sources = Array.from(new Set(conversations.map((c) => sourceLabel(c.source)))).slice(
      0,
      2,
    );
    return [
      "What did we discuss recently?",
      sources[0] ? `Find ${sources[0].toLowerCase()} follow-ups` : "Find follow-ups",
      "Which conversations mention roadmap?",
    ];
  }, [conversations]);

  const runSearch = async (query: string) => {
    const tokens = tokenize(query);
    if (tokens.length === 0) return;

    setSearching(true);
    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: query,
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const ranked = conversations
        .map((conversation) => {
          const haystack = `${conversation.title} ${conversation.source} ${conversation.summary ?? ""}`;
          return { conversation, score: scoreText(haystack, tokens) };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

      const details = await Promise.all(
        ranked.map(({ conversation }) =>
          api
            .get<DetailResponse>(`/api/conversations/${conversation.id}`)
            .catch(() => ({ conversation, transcript: null })),
        ),
      );

      const citations = details
        .map((detail) => {
          const transcriptText =
            detail.transcript?.map((line) => `${line.speaker_name}: ${line.text}`).join(" ") ?? "";
          const searchBody = `${detail.conversation.title} ${detail.conversation.summary ?? ""} ${transcriptText}`;
          const score = scoreText(searchBody, tokens);
          if (score === 0) return null;
          return {
            id: detail.conversation.id,
            title: detail.conversation.title,
            source: sourceLabel(detail.conversation.source),
            date: formatDate(detail.conversation.started_at),
            snippet: snippetFor(
              detail.conversation.summary || transcriptText || detail.conversation.title,
              tokens,
            ),
          } satisfies Citation;
        })
        .filter((item): item is Citation => item !== null)
        .slice(0, 5);

      const assistantMessage: ChatMessage =
        citations.length === 0
          ? {
              id: `a-${Date.now()}`,
              role: "assistant",
              content:
                "I did not find a matching transcript. Try a source name, meeting title, participant name, or exact phrase.",
            }
          : {
              id: `a-${Date.now()}`,
              role: "assistant",
              content: `I found ${citations.length} matching transcript${
                citations.length === 1 ? "" : "s"
              }. The strongest matches are cited below.`,
              citations,
            };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: err instanceof Error ? err.message : String(err),
        },
      ]);
    } finally {
      setSearching(false);
    }
  };

  const submit = () => {
    const query = draft.trim();
    if (!query || searching) return;
    setDraft("");
    void runSearch(query);
  };

  return (
    <section style={s.shell}>
      <div style={s.header}>
        <span style={s.eyebrow}>— transcript search</span>
        <h2 style={s.title}>Chat</h2>
        <p style={s.lede}>
          Searches {conversations.length} synced transcript{conversations.length === 1 ? "" : "s"}.
        </p>
      </div>

      {error && <div style={s.error}>{error}</div>}

      <div style={s.body}>
        {messages.map((message) => (
          <div
            key={message.id}
            style={message.role === "user" ? s.userMessage : s.assistantMessage}
          >
            <p style={s.messageText}>{message.content}</p>
            {message.citations && (
              <div style={s.citations}>
                {message.citations.map((citation) => (
                  <button
                    key={citation.id}
                    type="button"
                    style={s.citation}
                    onClick={() => onOpenConversation(citation.id)}
                  >
                    <span style={s.citationMeta}>
                      {citation.source} · {citation.date}
                    </span>
                    <span style={s.citationTitle}>{citation.title}</span>
                    <span style={s.citationSnippet}>{citation.snippet}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={s.composerWrap}>
        <div style={s.suggestions}>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              style={s.suggestion}
              onClick={() => {
                setDraft("");
                void runSearch(suggestion);
              }}
              disabled={loading || searching}
            >
              {suggestion}
            </button>
          ))}
        </div>
        <div style={s.composer}>
          <input
            style={s.input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={loading ? "Loading transcripts..." : "Search across transcripts"}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            disabled={loading || searching}
          />
          <button
            type="button"
            style={{ ...s.send, ...(!draft.trim() || loading || searching ? s.sendDisabled : {}) }}
            onClick={submit}
            disabled={!draft.trim() || loading || searching}
          >
            {searching ? "Searching" : "Search"}
          </button>
        </div>
      </div>
    </section>
  );
};

const FONT = "var(--lst-font)";
const MONO = "var(--lst-mono)";

const s: Record<string, React.CSSProperties> = {
  shell: {
    fontFamily: FONT,
    border: "var(--lst-border)",
    background: "var(--lst-bg)",
    minHeight: 680,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "22px 32px 16px",
    borderBottom: "var(--lst-border)",
  },
  eyebrow: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: {
    margin: "6px 0 4px",
    fontSize: 38,
    lineHeight: 1.05,
    fontWeight: 400,
    color: "var(--lst-blue)",
  },
  lede: {
    margin: 0,
    color: "var(--lst-ink-70)",
    fontSize: 14,
  },
  error: {
    padding: "10px 32px",
    borderBottom: "var(--lst-border)",
    background: "var(--lst-ink-08)",
    color: "var(--lst-blue)",
    fontSize: 13,
  },
  body: {
    flex: 1,
    overflow: "auto",
    padding: "28px 32px",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  userMessage: {
    alignSelf: "flex-end",
    maxWidth: "68%",
    border: "var(--lst-border)",
    background: "var(--lst-blue)",
    color: "var(--lst-bg)",
    padding: "10px 14px",
    borderRadius: 6,
  },
  assistantMessage: {
    alignSelf: "flex-start",
    maxWidth: "78%",
    border: "var(--lst-border)",
    background: "var(--lst-ink-08)",
    color: "var(--lst-blue)",
    padding: 14,
    borderRadius: 6,
  },
  messageText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.55,
  },
  citations: {
    display: "grid",
    gap: 8,
    marginTop: 12,
  },
  citation: {
    fontFamily: FONT,
    textAlign: "left",
    border: "var(--lst-border)",
    background: "var(--lst-bg)",
    color: "var(--lst-blue)",
    padding: 12,
    borderRadius: 4,
    cursor: "pointer",
    display: "grid",
    gap: 4,
  },
  citationMeta: {
    fontFamily: MONO,
    fontSize: 10,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.08em",
  },
  citationTitle: {
    fontSize: 14,
    fontWeight: 500,
  },
  citationSnippet: {
    fontSize: 12.5,
    color: "var(--lst-ink-70)",
    lineHeight: 1.45,
  },
  composerWrap: {
    borderTop: "var(--lst-border)",
    padding: 16,
    display: "grid",
    gap: 10,
  },
  suggestions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestion: {
    fontFamily: FONT,
    border: "var(--lst-border)",
    background: "transparent",
    color: "var(--lst-blue)",
    borderRadius: 999,
    padding: "5px 11px",
    cursor: "pointer",
    fontSize: 12,
  },
  composer: {
    display: "flex",
    gap: 8,
  },
  input: {
    flex: 1,
    border: "var(--lst-border)",
    background: "transparent",
    color: "var(--lst-blue)",
    borderRadius: 999,
    padding: "10px 14px",
    fontFamily: FONT,
    fontSize: 14,
    outline: "none",
  },
  send: {
    fontFamily: FONT,
    border: "var(--lst-border)",
    background: "var(--lst-blue)",
    color: "var(--lst-bg)",
    borderRadius: 999,
    padding: "10px 16px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
  },
  sendDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
};
