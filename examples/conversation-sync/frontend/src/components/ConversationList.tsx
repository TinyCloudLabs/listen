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
<<<<<<< HEAD
<<<<<<< HEAD
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
<<<<<<< HEAD
    .trim();
  return clean.length > max ? clean.slice(0, max - 1) + "\u2026" : clean;
=======
  if (secs >= 3600) {
    const hours = Math.round(secs / 3600);
    return `${hours} hr`;
  }
  const minutes = Math.round(secs / 60);
  return `${minutes} min`;
=======
  if (secs >= 3600) return `${Math.round(secs / 3600)} hr`;
  return `${Math.round(secs / 60)} min`;
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

<<<<<<< HEAD
function truncateSummary(summary: string, maxLen = 100): string {
  if (summary.length <= maxLen) return summary;
  return summary.slice(0, maxLen) + "\u2026";
>>>>>>> 9b46023 (TC-1307: Build ConversationList component with pagination and summary preview)
=======
/** Strip markdown artifacts and collapse to a clean plain-text snippet. */
function cleanSummary(str: string, max: number): string {
  const clean = str
    .replace(/\*\*(.+?)\*\*/g, "$1")   // bold
    .replace(/^[-*]\s+/gm, "")          // bullet prefixes
    .replace(/\n+/g, " ")               // newlines → spaces
    .replace(/\s{2,}/g, " ")            // collapse whitespace
=======
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
    .trim();
  return clean.length > max ? clean.slice(0, max - 1) + "\u2026" : clean;
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
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
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const fetchConversations = useCallback(
    async (offset: number, append: boolean) => {
      try {
        const sourceParam = sourceFilter !== "all" ? `&source=${sourceFilter}` : "";
        const data = await api.get<ConversationsResponse>(
          `/api/conversations?limit=${PAGE_SIZE}&offset=${offset}${sourceParam}`,
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
    [api, sourceFilter],
  );

<<<<<<< HEAD
<<<<<<< HEAD
=======
  // Initial fetch + refresh on refreshKey change
>>>>>>> 9b46023 (TC-1307: Build ConversationList component with pagination and summary preview)
=======
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
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
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
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
<<<<<<< HEAD
  }

  if (error) {
    return (
      <div style={s.errorCard}>
        <span style={s.errorIcon}>!</span>
        {error}
      </div>
    );
=======
    return <p style={styles.info}>Loading conversations...</p>;
  }

  if (error) {
    return <div style={styles.error}>{error}</div>;
>>>>>>> 9b46023 (TC-1307: Build ConversationList component with pagination and summary preview)
=======
  }

  if (error) {
    return (
      <div style={s.errorCard}>
        <span style={s.errorIcon}>!</span>
        {error}
      </div>
    );
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
  }

  if (conversations.length === 0) {
    return (
<<<<<<< HEAD
<<<<<<< HEAD
      <div style={s.emptyCard}>
        <p style={s.emptyTitle}>No conversations yet</p>
<<<<<<< HEAD
        <p style={s.emptySub}>Sync your first meetings from Fireflies above.</p>
=======
      <div style={styles.empty}>
        <p style={styles.emptyTitle}>No conversations yet.</p>
        <p style={styles.emptySubtitle}>
          Click Sync to import from Fireflies.
        </p>
>>>>>>> 9b46023 (TC-1307: Build ConversationList component with pagination and summary preview)
=======
      <div style={s.emptyCard}>
        <p style={s.emptyTitle}>No conversations yet</p>
        <p style={s.emptySub}>Sync your first meetings from Fireflies above.</p>
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
=======
        <p style={s.emptySub}>Sync your first meetings above.</p>
>>>>>>> c024b29 (TC-1326: Frontend source picker, Google OAuth popup, sync control, source filter)
      </div>
    );
  }

  const hasMore = conversations.length < total;

  return (
<<<<<<< HEAD
<<<<<<< HEAD
    <section style={s.card}>
      <div style={s.headerRow}>
        <span style={s.countLabel}>
          {total} conversation{total !== 1 ? "s" : ""}
        </span>
        <div style={s.filterRow}>
          {(["all", "fireflies", "google-meet"] as const).map((src) => (
            <button
              key={src}
              style={{
                ...s.filterChip,
                ...(sourceFilter === src ? s.filterChipActive : {}),
              }}
              onClick={() => setSourceFilter(src)}
            >
              {src === "all" ? "All" : src === "fireflies" ? "Fireflies" : "Google Meet"}
            </button>
          ))}
        </div>
      </div>

      <ul style={s.list}>
        {conversations.map((c) => (
          <li key={c.id} style={s.row} onClick={() => onSelectConversation(c.id)}>
            <div style={s.rowTop}>
              <span style={s.title}>{c.title}</span>
              <div style={s.rowRight}>
                <span
                  style={{
                    ...s.sourceBadge,
                    ...(c.source === "google-meet" ? s.sourceBadgeGreen : {}),
                  }}
                >
                  {c.source === "fireflies"
                    ? "FF"
                    : c.source === "google-meet"
                      ? "GM"
                      : c.source}
                </span>
                <span style={s.date}>{formatDate(c.started_at)}</span>
              </div>
            </div>
            <div style={s.meta}>
              <span>{formatDuration(c.duration_secs)}</span>
              <span style={s.metaDot}>&middot;</span>
              <span>
                {c.participant_count} participant{c.participant_count !== 1 ? "s" : ""}
              </span>
            </div>
            {c.summary && <p style={s.summary}>{cleanSummary(c.summary, 120)}</p>}
=======
    <section>
      <ul style={styles.list}>
=======
    <section style={s.card}>
      <div style={s.headerRow}>
        <span style={s.countLabel}>
          {total} conversation{total !== 1 ? "s" : ""}
        </span>
      </div>

      <ul style={s.list}>
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
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
<<<<<<< HEAD
            {c.summary && (
              <p style={s.summary}>{cleanSummary(c.summary, 120)}</p>
            )}
>>>>>>> 9b46023 (TC-1307: Build ConversationList component with pagination and summary preview)
=======
            {c.summary && <p style={s.summary}>{cleanSummary(c.summary, 120)}</p>}
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
          </li>
        ))}
      </ul>

      {hasMore && (
        <button
<<<<<<< HEAD
<<<<<<< HEAD
          style={{ ...s.loadMore, ...(loadingMore ? s.loadMoreDisabled : {}) }}
          disabled={loadingMore}
          onClick={handleLoadMore}
        >
          {loadingMore ? "Loading\u2026" : "Load More"}
=======
          style={{
            ...styles.loadMore,
            ...(loadingMore ? styles.loadMoreDisabled : {}),
          }}
          disabled={loadingMore}
          onClick={handleLoadMore}
        >
          {loadingMore ? "Loading..." : "Load More"}
>>>>>>> 9b46023 (TC-1307: Build ConversationList component with pagination and summary preview)
=======
          style={{ ...s.loadMore, ...(loadingMore ? s.loadMoreDisabled : {}) }}
          disabled={loadingMore}
          onClick={handleLoadMore}
        >
          {loadingMore ? "Loading\u2026" : "Load More"}
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
        </button>
      )}
    </section>
  );
};

// ── Styles ──────────────────────────────────────────────────────────

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
const FONT = "'Outfit', -apple-system, sans-serif";
const MONO = "'IBM Plex Mono', 'SF Mono', monospace";

const s: Record<string, React.CSSProperties> = {
  card: {
    fontFamily: FONT,
    background: "#fff",
    border: "1px solid #e2e4e9",
    borderRadius: 12,
    overflow: "hidden",
<<<<<<< HEAD
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 20px 0",
  },
  countLabel: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: 500,
    color: "#9ca3af",
    letterSpacing: "0.03em",
    textTransform: "uppercase" as const,
=======
const styles: Record<string, React.CSSProperties> = {
  info: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    padding: 20,
=======
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
  },
  headerRow: {
    padding: "14px 20px 0",
  },
<<<<<<< HEAD
  empty: {
    textAlign: "center",
    padding: "32px 16px",
    color: "#666",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 600,
    margin: "0 0 4px",
  },
  emptySubtitle: {
    fontSize: 14,
    margin: 0,
>>>>>>> 9b46023 (TC-1307: Build ConversationList component with pagination and summary preview)
=======
  countLabel: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: 500,
    color: "#9ca3af",
    letterSpacing: "0.03em",
    textTransform: "uppercase" as const,
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
  },
  filterRow: {
    display: "flex",
    gap: 4,
  },
  filterChip: {
    fontFamily: FONT,
    fontSize: 11,
    fontWeight: 500,
    color: "#6b7280",
    background: "transparent",
    border: "1px solid #e2e4e9",
    borderRadius: 12,
    padding: "3px 10px",
    cursor: "pointer",
  },
  filterChipActive: {
    color: "#6366f1",
    background: "#eef2ff",
    borderColor: "#c7d2fe",
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  row: {
<<<<<<< HEAD
<<<<<<< HEAD
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
  rowRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  sourceBadge: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: 600,
    color: "#6366f1",
    background: "#eef2ff",
    padding: "1px 6px",
    borderRadius: 4,
    letterSpacing: "0.02em",
  },
  sourceBadgeGreen: {
    color: "#059669",
    background: "#ecfdf5",
  },
  date: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: 400,
    color: "#9ca3af",
    flexShrink: 0,
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
=======
    padding: "12px 16px",
    borderBottom: "1px solid #e5e7eb",
=======
    padding: "14px 20px",
    borderBottom: "1px solid #f3f4f6",
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
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
>>>>>>> 9b46023 (TC-1307: Build ConversationList component with pagination and summary preview)
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
