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

function sourceLabel(source: string): string {
  if (source === "fireflies") return "FF";
  if (source === "google-meet") return "GM";
  return source.toUpperCase();
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
        <p style={s.emptySub}>Sync your first meetings above.</p>
      </div>
    );
  }

  const hasMore = conversations.length < total;
  const groupedConversations = conversations.reduce<Array<{ date: string; items: Conversation[] }>>(
    (groups, conversation) => {
      const date = formatDate(conversation.started_at);
      const last = groups[groups.length - 1];
      if (last?.date === date) {
        last.items.push(conversation);
      } else {
        groups.push({ date, items: [conversation] });
      }
      return groups;
    },
    [],
  );

  return (
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

      <div style={s.list}>
        {groupedConversations.map((group) => (
          <div key={group.date}>
            <div style={s.groupHeader}>
              <span>{group.date}</span>
              <span style={s.groupRule} />
              <span>
                {group.items.length} record{group.items.length === 1 ? "" : "s"}
              </span>
            </div>
            {group.items.map((c) => (
              <div key={c.id} style={s.row} onClick={() => onSelectConversation(c.id)}>
                <span style={s.date}>{formatDate(c.started_at)}</span>
                <span style={s.sourceBadge}>{sourceLabel(c.source)}</span>
                <span style={s.rowBody}>
                  <span style={s.rowTop}>
                    <span style={s.title}>{c.title}</span>
                    <span style={s.meta}>
                      <span>{formatDuration(c.duration_secs)}</span>
                      <span style={s.metaDot}>&middot;</span>
                      <span>
                        {c.participant_count} participant{c.participant_count !== 1 ? "s" : ""}
                      </span>
                    </span>
                  </span>
                  {c.summary && <span style={s.summary}>{cleanSummary(c.summary, 120)}</span>}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

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

const FONT = "var(--lst-font)";
const MONO = "var(--lst-mono)";

const s: Record<string, React.CSSProperties> = {
  card: {
    fontFamily: FONT,
    background: "var(--lst-bg)",
    border: "var(--lst-border)",
    borderRadius: 0,
    overflow: "hidden",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 20px",
    borderBottom: "var(--lst-border)",
  },
  countLabel: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: 500,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  filterRow: {
    display: "flex",
    gap: 4,
  },
  filterChip: {
    fontFamily: FONT,
    fontSize: 11,
    fontWeight: 500,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "4px 10px",
    cursor: "pointer",
  },
  filterChipActive: {
    color: "var(--lst-bg)",
    background: "var(--lst-blue)",
    borderColor: "var(--lst-blue)",
  },
  list: {
    margin: 0,
    padding: 0,
  },
  groupHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "18px 20px 8px",
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  groupRule: {
    height: 1,
    background: "var(--lst-rule-soft)",
    flex: 1,
  },
  row: {
    fontFamily: FONT,
    width: "100%",
    display: "grid",
    gridTemplateColumns: "78px 100px minmax(0, 1fr)",
    gap: 14,
    alignItems: "start",
    padding: "14px 20px",
    color: "var(--lst-blue)",
    background: "transparent",
    border: "none",
    borderBottom: "var(--lst-hair)",
    textAlign: "left" as const,
    cursor: "pointer",
    transition: "background 0.12s",
  },
  rowBody: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 3,
    minWidth: 0,
  },
  rowTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: 500,
    color: "var(--lst-blue)",
    letterSpacing: 0,
    minWidth: 0,
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
    fontWeight: 500,
    color: "var(--lst-ink-70)",
    letterSpacing: "0.08em",
    paddingTop: 2,
  },
  date: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: 400,
    color: "var(--lst-ink-55)",
    flexShrink: 0,
    paddingTop: 2,
  },
  meta: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 12,
    color: "var(--lst-ink-55)",
    whiteSpace: "nowrap" as const,
  },
  metaDot: {
    color: "var(--lst-ink-35)",
  },
  summary: {
    fontSize: 13,
    color: "var(--lst-ink-70)",
    margin: 0,
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
    color: "var(--lst-blue)",
    background: "transparent",
    border: "none",
    borderTop: "var(--lst-border)",
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
    background: "var(--lst-bg)",
    border: "var(--lst-border)",
    borderRadius: 0,
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
    background: "var(--lst-blue)",
    animation: "syncPulse 1s ease-in-out infinite",
  },
  loadingText: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: 500,
    color: "var(--lst-ink-70)",
    margin: 0,
  },
  emptyCard: {
    fontFamily: FONT,
    textAlign: "center" as const,
    padding: "36px 20px",
    background: "var(--lst-bg)",
    border: "var(--lst-border)",
    borderRadius: 0,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 500,
    color: "var(--lst-blue)",
    margin: "0 0 4px",
  },
  emptySub: {
    fontSize: 13,
    color: "var(--lst-ink-55)",
    margin: 0,
  },
  errorCard: {
    fontFamily: FONT,
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    padding: "12px 16px",
    fontSize: 13,
    color: "var(--lst-blue)",
    background: "var(--lst-ink-08)",
    border: "var(--lst-border)",
    borderRadius: 0,
    lineHeight: 1.4,
  },
  errorIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "var(--lst-blue)",
    color: "var(--lst-bg)",
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  },
};
