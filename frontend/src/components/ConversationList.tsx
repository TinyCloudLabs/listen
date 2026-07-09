import { useState, useEffect, useCallback, useMemo, useRef, type FC, type MouseEvent } from "react";
import type { ApiClient } from "@listen/client";
import {
  readConversationPageCache,
  writeConversationPageCache,
  type ConversationCacheScope,
} from "../conversationPageCache";
import { InboxFilters, SOURCE_CHIPS, type SourceFilter } from "./InboxFilters";
import { InboxBulkBar } from "./InboxBulkBar";
import { InboxRow, InboxRowGrid } from "./InboxRow";

interface Conversation {
  id: string;
  title: string;
  source: string;
  source_url: string | null;
  started_at: string | null;
  duration_secs: number | null;
  summary: string | null;
  created_at: string;
  participant_count: number;
}

interface ConversationsResponse {
  conversations: Conversation[];
  total: number;
  source_counts?: SourceCount[];
}

interface SourceCount {
  source: string;
  total: number;
}

interface ConversationListProps {
  api: ApiClient;
  onSelectConversation: (id: string) => void;
  onShareConversation?: (id: string) => void;
  onShareSelectedConversations?: (ids: string[]) => void;
  refreshKey?: number;
  focusSearchKey?: number;
  cacheScope?: ConversationCacheScope;
}

const PAGE_SIZE = 20;

function conversationPagePath(
  page: number,
  sourceFilter: SourceFilter = "all",
  searchQuery = "",
): string {
  const offset = (page - 1) * PAGE_SIZE;
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: String(offset),
  });
  if (sourceFilter !== "all") params.set("source", sourceFilter);
  if (searchQuery) params.set("q", searchQuery);
  return `/api/conversations?${params.toString()}`;
}

function formatGroupDate(isoString: string | null): string {
  if (!isoString) return "Unknown date";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export const ConversationList: FC<ConversationListProps> = ({
  api,
  onSelectConversation,
  onShareConversation,
  onShareSelectedConversations,
  refreshKey,
  focusSearchKey,
  cacheScope,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [sourceCounts, setSourceCounts] = useState<SourceCount[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const requestRef = useRef(0);
  const refreshKeyRef = useRef(refreshKey);
  const searchQueryRef = useRef(searchQuery);

  const fetchConversations = useCallback(
    async (page: number, source: SourceFilter, query: string) => {
      const path = conversationPagePath(page, source, query);
      const append = page > 1;
      // Searches bypass the page cache — cache slots are for the browse path.
      const cached =
        append || query ? null : readConversationPageCache<Conversation>(path, cacheScope);
      const requestId = requestRef.current + 1;
      requestRef.current = requestId;

      setContextMenu(null);
      setError(null);

      if (append) {
        // Loading a further page keeps the current rows (and selection) in place.
        setLoadingMore(true);
      } else if (cached) {
        setSelected(new Set());
        setConversations(cached.conversations);
        setTotal(cached.total);
        setSourceCounts(cached.source_counts ?? null);
        setLoading(false);
        setRefreshing(true);
      } else {
        setSelected(new Set());
        setConversations([]);
        setTotal(0);
        setLoading(true);
        setRefreshing(false);
      }

      try {
        const data = await api.get<ConversationsResponse>(path);
        if (requestRef.current !== requestId) return;
        if (append) {
          setConversations((prev) => [
            ...prev.slice(0, (page - 1) * PAGE_SIZE),
            ...data.conversations,
          ]);
        } else {
          setConversations(data.conversations);
        }
        setTotal(data.total);
        setSourceCounts(data.source_counts ?? null);
        if (!query) writeConversationPageCache(path, data, cacheScope);
        setError(null);
      } catch (err) {
        if (requestRef.current !== requestId) return;
        if (append) {
          setNotice("Could not load more conversations");
        } else if (cached) {
          setNotice("Could not refresh cached page");
        } else {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (requestRef.current === requestId) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [api, cacheScope],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!focusSearchKey) return;
    searchInputRef.current?.focus();
  }, [focusSearchKey]);

  useEffect(() => {
    if (refreshKeyRef.current !== refreshKey || searchQueryRef.current !== searchQuery) {
      refreshKeyRef.current = refreshKey;
      searchQueryRef.current = searchQuery;
      if (currentPage !== 1) {
        setCurrentPage(1);
        return;
      }
    }
    void fetchConversations(currentPage, sourceFilter, searchQuery);
  }, [currentPage, fetchConversations, refreshKey, searchQuery, sourceFilter]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!notice) return;
    const dismissMs = notice.startsWith("Could not") ? 5000 : 1800;
    const timer = window.setTimeout(() => setNotice(null), dismissMs);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const availableSourceFilters = useMemo(() => {
    if (sourceCounts) {
      const availableSources = new Set(
        sourceCounts.filter((count) => count.total > 0).map((count) => count.source),
      );
      return SOURCE_CHIPS.filter(
        (chip) => chip.key !== "all" && availableSources.has(chip.key),
      ).map((chip) => chip.key);
    }

    const loadedSources = new Set(conversations.map((conversation) => conversation.source));
    return SOURCE_CHIPS.filter((chip) => chip.key !== "all" && loadedSources.has(chip.key)).map(
      (chip) => chip.key,
    );
  }, [conversations, sourceCounts]);

  useEffect(() => {
    if (loading) return;
    if (sourceFilter === "all" || availableSourceFilters.includes(sourceFilter)) return;
    setSourceFilter("all");
    setSelected(new Set());
    setContextMenu(null);
  }, [availableSourceFilters, loading, sourceFilter]);

  const handleSourceFilterChange = (next: SourceFilter) => {
    setSourceFilter((current) => (current === next || next === "all" ? "all" : next));
    setCurrentPage(1);
    setSelected(new Set());
    setContextMenu(null);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const openContextMenu = (event: MouseEvent, id: string) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, id });
  };

  const visibleConversations = conversations.filter(
    (conversation) => sourceFilter === "all" || conversation.source === sourceFilter,
  );
  const selectedConversations = visibleConversations.filter((conversation) =>
    selected.has(conversation.id),
  );
  const selectedSummaries = selectedConversations.filter((conversation) => conversation.summary);

  const copySelectedSummaries = async () => {
    const text = selectedSummaries
      .map((conversation) => `${conversation.title}\n${conversation.summary}`)
      .join("\n\n");
    await copyText(text);
    setNotice(
      `Copied ${selectedSummaries.length} summar${selectedSummaries.length === 1 ? "y" : "ies"}`,
    );
  };

  const copySummary = async (conversation: Conversation) => {
    if (!conversation.summary) return;
    await copyText(`${conversation.title}\n${conversation.summary}`);
    setNotice("Summary copied");
    setContextMenu(null);
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
        <button
          type="button"
          style={s.noticeRetry}
          onClick={() => void fetchConversations(currentPage, sourceFilter, searchQuery)}
        >
          Retry
        </button>
      </div>
    );
  }

  if (conversations.length === 0 && !searchQuery) {
    return (
      <div style={s.emptyCard}>
        <p style={s.emptyTitle}>No conversations yet</p>
        <p style={s.emptySub}>Connect a source or add a transcript to get started.</p>
      </div>
    );
  }

  const remaining = Math.max(0, total - conversations.length);
  const canLoadMore = remaining > 0;
  const groupedConversations = visibleConversations.reduce<
    Array<{ date: string; items: Conversation[] }>
  >((groups, conversation) => {
    const date = formatGroupDate(conversation.started_at);
    const last = groups[groups.length - 1];
    if (last?.date === date) {
      last.items.push(conversation);
    } else {
      groups.push({ date, items: [conversation] });
    }
    return groups;
  }, []);

  return (
    <section style={s.card} ref={containerRef}>
      <div style={s.headerRow}>
        <span style={s.countLabel}>
          {total} conversation{total !== 1 ? "s" : ""}
        </span>
        <input
          ref={searchInputRef}
          type="search"
          style={s.searchInput}
          placeholder="Search titles, summaries, transcripts…"
          aria-label="Search conversations"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <span style={s.pageStatus}>
          Showing {conversations.length} of {total}
          {refreshing ? " · refreshing" : ""}
        </span>
      </div>

      <InboxFilters
        total={total}
        sourceFilter={sourceFilter}
        sourceOptions={availableSourceFilters}
        onSourceFilterChange={handleSourceFilterChange}
        showingCount={visibleConversations.length}
      />

      {selected.size > 0 && (
        <InboxBulkBar
          selectedCount={selected.size}
          hasSummaries={selectedSummaries.length > 0}
          onCopySummaries={copySelectedSummaries}
          onCredentialedShare={
            onShareSelectedConversations
              ? () =>
                  onShareSelectedConversations(
                    selectedConversations.map((conversation) => conversation.id),
                  )
              : undefined
          }
          onClear={clearSelection}
        />
      )}

      {notice && (
        <div style={s.notice}>
          {notice}
          {notice.startsWith("Could not") && (
            <button
              type="button"
              style={s.noticeRetry}
              onClick={() => {
                setNotice(null);
                if (currentPage !== 1) {
                  setCurrentPage(1);
                } else {
                  void fetchConversations(1, sourceFilter, searchQuery);
                }
              }}
            >
              Refresh now
            </button>
          )}
        </div>
      )}

      <div style={s.columnHeader}>
        <span />
        <span style={s.colLabel}>TIME</span>
        <span style={s.colLabel}>SOURCE</span>
        <span style={s.colLabel}>TITLE / PREVIEW</span>
        <span style={s.colLabel}>PEOPLE</span>
        <span style={{ ...s.colLabel, textAlign: "right" }}>DUR</span>
        <span style={{ ...s.colLabel, textAlign: "center" }}>SUM</span>
        <span />
      </div>

      <div style={s.list}>
        {groupedConversations.length === 0 ? (
          <div style={s.filteredEmpty}>No conversations match this source.</div>
        ) : (
          groupedConversations.map((group) => (
            <div key={group.date}>
              <div style={s.groupHeader}>
                <span style={s.groupDate}>{group.date.toUpperCase()}</span>
                <span style={s.groupRule} />
                <span style={s.groupCount}>
                  {group.items.length} record{group.items.length === 1 ? "" : "s"}
                </span>
              </div>
              {group.items.map((c) => (
                <InboxRow
                  key={c.id}
                  conversation={c}
                  selected={selected.has(c.id)}
                  onToggleSelect={toggleSelect}
                  onOpen={onSelectConversation}
                  onContextMenu={openContextMenu}
                  onMenu={openContextMenu}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {searchQuery && visibleConversations.length === 0 && !loading && (
        <div style={s.emptyCard}>
          <p style={s.emptyTitle}>No matches</p>
          <p style={s.emptySub}>Nothing found for “{searchQuery}”.</p>
        </div>
      )}

      <nav style={s.pagination} aria-label="Load more conversations">
        {canLoadMore ? (
          <button
            type="button"
            style={{ ...s.pageButton, ...(loadingMore || refreshing ? s.pageButtonDisabled : {}) }}
            disabled={loadingMore || refreshing}
            onClick={() => setCurrentPage((page) => page + 1)}
          >
            {loadingMore ? "Loading…" : `Load ${Math.min(PAGE_SIZE, remaining)} more ↓`}
          </button>
        ) : (
          total > PAGE_SIZE && <span style={s.pageLabel}>All {total} loaded</span>
        )}
      </nav>

      {contextMenu && (
        <div
          style={{ ...s.contextMenu, top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
          role="menu"
        >
          {(() => {
            const conversation = conversations.find((item) => item.id === contextMenu.id);
            if (!conversation) return null;
            return (
              <>
                <button
                  type="button"
                  style={s.contextItem}
                  role="menuitem"
                  onClick={() => {
                    setContextMenu(null);
                    onSelectConversation(conversation.id);
                  }}
                >
                  <span style={{ flex: 1 }}>Open transcript</span>
                  <span style={s.contextShortcut}>↵</span>
                </button>
                <button
                  type="button"
                  style={{
                    ...s.contextItem,
                    ...(!conversation.summary ? s.contextItemDisabled : {}),
                  }}
                  role="menuitem"
                  disabled={!conversation.summary}
                  onClick={() => copySummary(conversation)}
                >
                  <span style={{ flex: 1 }}>Copy summary</span>
                  <span style={s.contextShortcut}>⌘⇧C</span>
                </button>
                {onShareConversation && (
                  <button
                    type="button"
                    style={s.contextItem}
                    role="menuitem"
                    onClick={() => {
                      setContextMenu(null);
                      onShareConversation(conversation.id);
                    }}
                  >
                    <span style={{ flex: 1 }}>Share</span>
                    <span style={s.contextShortcut}>link</span>
                  </button>
                )}
              </>
            );
          })()}
        </div>
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
    position: "relative",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 32px",
    borderBottom: "var(--lst-border)",
  },
  countLabel: {
    fontFamily: "var(--lst-font-eyebrow)",
    fontSize: "var(--lst-type-eyebrow)",
    fontWeight: 500,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.06em",
    textTransform: "lowercase" as const,
  },
  pageStatus: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
  },
  columnHeader: {
    ...InboxRowGrid,
    padding: "10px 32px",
    borderBottom: "var(--lst-border)",
    position: "sticky",
    top: 0,
    background: "var(--lst-bg)",
    zIndex: 2,
  },
  colLabel: {
    fontFamily: "var(--lst-font-eyebrow)",
    fontSize: 10,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.06em",
    textTransform: "lowercase" as const,
  },
  list: { margin: 0, padding: 0 },
  filteredEmpty: {
    padding: "32px",
    fontFamily: FONT,
    fontSize: 13,
    color: "var(--lst-ink-55)",
    textAlign: "center",
  },
  groupHeader: {
    display: "flex",
    alignItems: "baseline",
    gap: 14,
    padding: "22px 32px 8px",
  },
  groupDate: {
    fontFamily: "var(--lst-font-eyebrow)",
    fontSize: "var(--lst-type-eyebrow)",
    fontWeight: 600,
    color: "var(--lst-ink-70)",
    letterSpacing: "var(--lst-tracking-eyebrow)",
  },
  groupRule: {
    alignSelf: "center",
    height: 1,
    background: "var(--lst-rule-soft)",
    flex: 1,
  },
  groupCount: {
    fontFamily: "var(--lst-font-eyebrow)",
    fontSize: 10,
    color: "var(--lst-ink-35)",
    letterSpacing: "var(--lst-tracking-eyebrow)",
  },
  pagination: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: "12px 32px",
    borderTop: "var(--lst-border)",
  },
  pageButton: {
    fontFamily: FONT,
    padding: "6px 12px",
    fontSize: 13,
    fontWeight: 500,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "var(--lst-border)",
    borderRadius: 999,
    cursor: "pointer",
  },
  pageButtonDisabled: { opacity: 0.45, cursor: "not-allowed" },
  pageLabel: {
    minWidth: 100,
    textAlign: "center",
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
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
  loadingDots: { display: "flex", gap: 6 },
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
  emptySub: { fontSize: 13, color: "var(--lst-ink-55)", margin: 0 },
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
  contextMenu: {
    position: "fixed",
    zIndex: 50,
    background: "var(--lst-bg)",
    border: "var(--lst-border)",
    borderRadius: 14,
    minWidth: 240,
    boxShadow: "0 8px 0 var(--lst-ink-08)",
    padding: "6px 0",
    fontFamily: FONT,
  },
  contextItem: {
    width: "100%",
    padding: "8px 14px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: 13,
    fontFamily: FONT,
    cursor: "pointer",
    color: "var(--lst-blue)",
    border: "none",
    background: "transparent",
    textAlign: "left",
  },
  contextItemDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
  contextShortcut: {
    fontFamily: MONO,
    color: "var(--lst-ink-55)",
    fontSize: 10,
  },
  notice: {
    padding: "8px 32px",
    borderBottom: "var(--lst-border)",
    background: "var(--lst-ink-08)",
    color: "var(--lst-blue)",
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: "0.06em",
    textTransform: "lowercase",
  },
  searchInput: {
    flex: 1,
    margin: "0 18px",
    maxWidth: 360,
    border: "var(--lst-hair)",
    background: "transparent",
    color: "var(--lst-blue)",
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: "0.03em",
    padding: "6px 10px",
  },
  noticeRetry: {
    marginLeft: 10,
    border: "var(--lst-border)",
    background: "transparent",
    color: "var(--lst-blue)",
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: "0.06em",
    textTransform: "lowercase",
    padding: "2px 8px",
    cursor: "pointer",
  },
};
