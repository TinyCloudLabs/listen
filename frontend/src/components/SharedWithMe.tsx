import { useEffect, useMemo, useState, type FC } from "react";
import { ConversationDetail } from "./ConversationDetail";
import {
  createSharedConversationApi,
  listStoredListenShares,
  loadSharedConversationDetail,
  removeStoredListenShare,
  saveListenShareToken,
  type StoredListenShare,
} from "../lib/listenShareLinks";

interface SharedWithMeProps {
  initialShareToken?: string | null;
  standalone?: boolean;
}

interface SharePreview {
  share: StoredListenShare;
  title: string;
  summary: string | null;
  startedAt: string | null;
  source: string;
  error: string | null;
}

function formatDate(value: string | null): string {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function cleanSummary(value: string | null): string {
  if (!value) return "No summary included.";
  return value
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export const SharedWithMe: FC<SharedWithMeProps> = ({ initialShareToken, standalone = false }) => {
  const [shares, setShares] = useState<StoredListenShare[]>(() => listStoredListenShares());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previews, setPreviews] = useState<SharePreview[]>([]);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialShareToken) return;
    try {
      const share = saveListenShareToken(initialShareToken);
      setShares(listStoredListenShares());
      setSelectedId(share.id);
      setAcceptError(null);
      if (window.location.hash.startsWith("#share=")) {
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}`,
        );
      }
    } catch (err) {
      setAcceptError(err instanceof Error ? err.message : String(err));
    }
  }, [initialShareToken]);

  useEffect(() => {
    let cancelled = false;
    if (shares.length === 0) {
      setPreviews([]);
      return;
    }

    Promise.all(
      shares.map(async (share): Promise<SharePreview> => {
        try {
          const detail = await loadSharedConversationDetail(share);
          return {
            share,
            title:
              typeof detail.conversation.title === "string"
                ? detail.conversation.title
                : share.title,
            summary:
              typeof detail.conversation.summary === "string" ? detail.conversation.summary : null,
            startedAt:
              typeof detail.conversation.started_at === "string"
                ? detail.conversation.started_at
                : null,
            source:
              typeof detail.conversation.source === "string"
                ? detail.conversation.source
                : "shared",
            error: null,
          };
        } catch (err) {
          return {
            share,
            title: share.title,
            summary: null,
            startedAt: null,
            source: "shared",
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }),
    ).then((items) => {
      if (!cancelled) setPreviews(items);
    });

    return () => {
      cancelled = true;
    };
  }, [shares]);

  const selectedShare = useMemo(
    () => shares.find((share) => share.id === selectedId) ?? null,
    [selectedId, shares],
  );

  if (selectedShare) {
    return (
      <div style={standalone ? s.standalone : undefined}>
        {standalone && <Header />}
        <ConversationDetail
          api={createSharedConversationApi(selectedShare)}
          conversationId={selectedShare.conversationId}
          onBack={() => setSelectedId(null)}
          backLabel="Shared"
        />
      </div>
    );
  }

  return (
    <section style={standalone ? s.standalone : s.container}>
      {standalone && <Header />}
      <div style={s.panel}>
        <div style={s.panelHead}>
          <div>
            <span style={s.eyebrow}>shared</span>
            <h2 style={s.title}>Shared with me</h2>
          </div>
          <span style={s.count}>
            {shares.length} item{shares.length === 1 ? "" : "s"}
          </span>
        </div>

        {acceptError && <div style={s.error}>{acceptError}</div>}

        {shares.length === 0 ? (
          <div style={s.empty}>
            <p>No shared conversations yet.</p>
            <span>Open a Listen share link to add it here.</span>
          </div>
        ) : (
          <div style={s.list}>
            {previews.map((preview) => (
              <article key={preview.share.id} style={s.row}>
                <button
                  type="button"
                  style={s.rowMain}
                  onClick={() => setSelectedId(preview.share.id)}
                >
                  <span style={s.meta}>
                    {preview.source.toUpperCase()} · {formatDate(preview.startedAt)}
                  </span>
                  <strong style={s.rowTitle}>{preview.title}</strong>
                  <span style={preview.error ? s.rowError : s.summary}>
                    {preview.error ?? cleanSummary(preview.summary)}
                  </span>
                </button>
                <button
                  type="button"
                  style={s.removeButton}
                  onClick={() => {
                    removeStoredListenShare(preview.share.id);
                    setShares(listStoredListenShares());
                  }}
                >
                  Remove
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

function Header() {
  return (
    <header style={s.header}>
      <span style={s.brandMark} />
      <span style={s.brand}>listen</span>
    </header>
  );
}

const FONT = "var(--lst-font)";
const MONO = "var(--lst-mono)";

const s: Record<string, React.CSSProperties> = {
  standalone: {
    minHeight: "100vh",
    background: "var(--lst-bg)",
    color: "var(--lst-blue)",
    fontFamily: FONT,
    padding: 24,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: "0 auto 20px",
    maxWidth: 980,
  },
  brandMark: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "var(--lst-blue)",
  },
  brand: {
    fontFamily: MONO,
    fontSize: 16,
  },
  container: {
    fontFamily: FONT,
    color: "var(--lst-blue)",
  },
  panel: {
    maxWidth: 980,
    margin: "0 auto",
    border: "var(--lst-border)",
    background: "var(--lst-bg)",
  },
  panelHead: {
    padding: "20px 24px",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    borderBottom: "var(--lst-border)",
  },
  eyebrow: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.08em",
    textTransform: "lowercase",
  },
  title: {
    margin: "4px 0 0",
    fontSize: 24,
    lineHeight: 1.2,
  },
  count: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
  },
  error: {
    margin: 24,
    padding: 12,
    background: "var(--lst-alert-soft)",
    color: "var(--lst-alert)",
    fontSize: 13,
  },
  empty: {
    padding: 48,
    textAlign: "center",
    color: "var(--lst-ink-55)",
  },
  list: {
    display: "grid",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 14,
    alignItems: "center",
    padding: "16px 24px",
    borderBottom: "var(--lst-hair)",
  },
  rowMain: {
    display: "grid",
    gap: 4,
    minWidth: 0,
    textAlign: "left",
    border: "none",
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    padding: 0,
  },
  meta: {
    fontFamily: MONO,
    fontSize: 10,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.08em",
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: 600,
  },
  summary: {
    fontSize: 13,
    color: "var(--lst-ink-55)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  rowError: {
    fontSize: 13,
    color: "var(--lst-alert)",
  },
  removeButton: {
    border: "var(--lst-border)",
    background: "transparent",
    color: "var(--lst-blue)",
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 12,
  },
};
