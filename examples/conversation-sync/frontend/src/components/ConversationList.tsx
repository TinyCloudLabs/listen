import { useState, useEffect, useCallback, type FC } from "react";
import type { ApiClient } from "@tinyboilerplate/client";

interface Conversation {
  id: string;
  title: string;
  source: string;
  source_url: string | null;
  started_at: string;
  duration_secs: number;
  summary: string | null;
  created_at: string;
  participant_count: number;
}

interface ConversationsResponse {
  conversations: Conversation[];
  total: number;
}

interface ConversationListProps {
  api: ApiClient;
  onSelectConversation: (id: string) => void;
  refreshKey?: number;
}

const PAGE_SIZE = 20;

function formatDuration(secs: number): string {
  if (secs >= 3600) return `${Math.round(secs / 3600)} hr`;
  return `${Math.round(secs / 60)} min`;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Strip markdown artifacts and collapse to a clean plain-text snippet. */
function cleanSummary(str: string, max: number): string {
  const clean = str
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/^[-*]\s+/gm, "") // bullet prefixes
    .replace(/\n+/g, " ") // newlines → spaces
    .replace(/\s{2,}/g, " ") // collapse whitespace
    .trim();
  return clean.length > max ? clean.slice(0, max - 1) + "\u2026" : clean;
}

export const ConversationList: FC<ConversationListProps> = ({
  api,
  onSelectConversation,
  refreshKey,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(
    async (offset: number, append: boolean) => {
      try {
        const data = await api.get<ConversationsResponse>(
          `/api/conversations?limit=${PAGE_SIZE}&offset=${offset}`,
        );
        if (append) {
          setConversations((prev) => [...prev, ...data.conversations]);
        } else {
          setConversations(data.conversations);
        }
        setTotal(data.total);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [api],
  );

  useEffect(() => {
    setLoading(true);
    setConversations([]);
    fetchConversations(0, false).finally(() => setLoading(false));
  }, [fetchConversations, refreshKey]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await fetchConversations(conversations.length, true);
    setLoadingMore(false);
  };

  if (loading) {
    return (
      <div style={s.loadingCard}>
        <div style={s.loadingDots}>
          <span style={{ ...s.loadingDot, animationDelay: "0s" }} />
          <span style={{ ...s.loadingDot, animationDelay: "0.15s" }} />
          <span style={{ ...s.loadingDot, animationDelay: "0.3s" }} />
        </div>
        <p style={s.loadingText}>Loading conversations</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={s.errorCard}>
        <span style={s.errorIcon}>!</span>
        {error}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div style={s.emptyCard}>
        <p style={s.emptyTitle}>No conversations yet</p>
        <p style={s.emptySub}>Sync your first meetings from Fireflies above.</p>
      </div>
    );
  }

  const hasMore = conversations.length < total;

  return (
    <section style={s.card}>
      <div style={s.headerRow}>
        <span style={s.countLabel}>
          {total} conversation{total !== 1 ? "s" : ""}
        </span>
      </div>

      <ul style={s.list}>
        {conversations.map((c) => (
          <li key={c.id} style={s.row} onClick={() => onSelectConversation(c.id)}>
            <div style={s.rowTop}>
              <span style={s.title}>{c.title}</span>
              <span style={s.date}>{formatDate(c.started_at)}</span>
            </div>
            <div style={s.meta}>
              <span>{formatDuration(c.duration_secs)}</span>
              <span style={s.metaDot}>&middot;</span>
              <span>
                {c.participant_count} participant{c.participant_count !== 1 ? "s" : ""}
              </span>
            </div>
            {c.summary && <p style={s.summary}>{cleanSummary(c.summary, 120)}</p>}
          </li>
        ))}
      </ul>

      {hasMore && (
        <button
          style={{ ...s.loadMore, ...(loadingMore ? s.loadMoreDisabled : {}) }}
          disabled={loadingMore}
          onClick={handleLoadMore}
        >
          {loadingMore ? "Loading\u2026" : "Load More"}
        </button>
      )}
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
  },
  headerRow: {
    padding: "14px 20px 0",
  },
  countLabel: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: 500,
    color: "#9ca3af",
    letterSpacing: "0.03em",
    textTransform: "uppercase" as const,
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  row: {
    padding: "14px 20px",
    borderBottom: "1px solid #f3f4f6",
    cursor: "pointer",
    transition: "background 0.12s",
  },
  rowTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: "#18181b",
    letterSpacing: "-0.01em",
  },
  date: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: 400,
    color: "#9ca3af",
    flexShrink: 0,
    marginLeft: 12,
  },
  meta: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 12,
    color: "#6b7280",
  },
  metaDot: {
    color: "#d1d5db",
  },
  summary: {
    fontSize: 13,
    color: "#6b7280",
    margin: "5px 0 0",
    lineHeight: 1.45,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
  },
  loadMore: {
    fontFamily: FONT,
    display: "block",
    width: "100%",
    padding: "12px 0",
    fontSize: 13,
    fontWeight: 500,
    color: "#6b7280",
    background: "transparent",
    border: "none",
    borderTop: "1px solid #f3f4f6",
    cursor: "pointer",
  },
  loadMoreDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  loadingCard: {
    fontFamily: FONT,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 14,
    padding: "40px 20px",
    background: "#fff",
    border: "1px solid #e2e4e9",
    borderRadius: 12,
    animation: "fadeSlideIn 0.3s ease-out",
  },
  loadingDots: {
    display: "flex",
    gap: 6,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#6366f1",
    animation: "syncPulse 1s ease-in-out infinite",
  },
  loadingText: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: 500,
    color: "#6b7280",
    margin: 0,
  },
  emptyCard: {
    fontFamily: FONT,
    textAlign: "center" as const,
    padding: "36px 20px",
    background: "#fff",
    border: "1px solid #e2e4e9",
    borderRadius: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "#374151",
    margin: "0 0 4px",
  },
  emptySub: {
    fontSize: 13,
    color: "#9ca3af",
    margin: 0,
  },
  errorCard: {
    fontFamily: FONT,
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    padding: "12px 16px",
    fontSize: 13,
    color: "#991b1b",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 12,
    lineHeight: 1.4,
  },
  errorIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#ef4444",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  },
};
