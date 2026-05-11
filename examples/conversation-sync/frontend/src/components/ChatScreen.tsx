import { useState, type FC } from "react";

// Global Chat screen, per l-app-screens.jsx line 177 (LChat).
// UI-only: presentational + minimal local state for the active thread and composer
// input. No backend wiring — props supply data the parent owns.

export interface ChatThread {
  id: string;
  title: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: string; // e.g. "LISTEN · SEARCHED 6 TRANSCRIPTS · 1.2s"
  citations?: ChatCitationInline[];
  footnote?: string;
}

export interface ChatCitationInline {
  label: string;
  href?: string;
  at?: string; // "(Apr 18 · 14:32)"
}

export interface ChatCitedSource {
  id: string;
  title: string;
  source: string; // human label, e.g. "FIREFLIES"
  date: string;
  citedAt: string;
}

export interface ChatScopeOption {
  id: string;
  label: string;
  checked?: boolean;
}

export interface ChatScreenProps {
  threads: ChatThread[];
  activeThreadId: string | null;
  onSelectThread?: (id: string) => void;
  onNewChat?: () => void;
  threadTitle: string;
  scopeLabel?: string; // e.g. "Scope: Acme · 6 transcripts"
  messages: ChatMessage[];
  citedSources: ChatCitedSource[];
  scopeOptions: ChatScopeOption[];
  suggestions?: string[];
  composerPlaceholder?: string;
  onSend?: (text: string) => void;
}

export const ChatScreen: FC<ChatScreenProps> = ({
  threads,
  activeThreadId,
  onSelectThread,
  onNewChat,
  threadTitle,
  scopeLabel,
  messages,
  citedSources,
  scopeOptions,
  suggestions = [],
  composerPlaceholder = "Ask anything across your transcripts…",
  onSend,
}) => {
  const [draft, setDraft] = useState("");

  const submit = () => {
    const text = draft.trim();
    if (text === "") return;
    onSend?.(text);
    setDraft("");
  };

  return (
    <div style={s.shell}>
      {/* History rail */}
      <aside style={s.historyRail}>
        <div style={s.historyHeader}>
          <span style={s.eyebrow}>— chat</span>
          <button style={s.btnPrimaryBlock} onClick={onNewChat}>
            + New chat
          </button>
        </div>
        <div style={s.historyLabel}>
          <span style={s.monoMuted}>RECENT</span>
        </div>
        {threads.map((thread) => {
          const active = thread.id === activeThreadId;
          return (
            <button
              key={thread.id}
              style={active ? s.historyItemActive : s.historyItem}
              onClick={() => onSelectThread?.(thread.id)}
            >
              <div style={s.historyItemTitle}>{thread.title}</div>
              <div style={s.historyItemTime}>{thread.timestamp}</div>
            </button>
          );
        })}
      </aside>

      {/* Thread */}
      <section style={s.thread}>
        <div style={s.threadHeader}>
          <h2 style={s.threadTitle}>{threadTitle}</h2>
          <span style={s.flex1} />
          {scopeLabel && <button style={s.btnGhost}>{scopeLabel} ▾</button>}
          <button style={s.btnIcon}>⋯</button>
        </div>

        <div style={s.threadBody}>
          {messages.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} style={s.userMessageRow}>
                <div style={s.userBubble}>{msg.content}</div>
              </div>
            ) : (
              <div key={msg.id} style={s.assistantRow}>
                {msg.meta && (
                  <div style={s.assistantMetaRow}>
                    <span style={s.mark} />
                    <span style={s.monoMuted}>{msg.meta}</span>
                  </div>
                )}
                <div style={s.assistantBubble}>
                  <p style={s.assistantParagraph}>{msg.content}</p>
                  {msg.citations && msg.citations.length > 0 && (
                    <ol style={s.citationList}>
                      {msg.citations.map((c, i) => (
                        <li key={i}>
                          <a style={s.citationLink} href={c.href}>
                            {c.label}
                          </a>
                          {c.at && <span style={s.citationAt}> {c.at}</span>}
                        </li>
                      ))}
                    </ol>
                  )}
                  {msg.footnote && <p style={s.assistantFootnote}>{msg.footnote}</p>}
                </div>
                <div style={s.assistantActions}>
                  <button style={s.btnGhost}>Copy</button>
                  <button style={s.btnGhost}>Save as note</button>
                  <button style={s.btnGhost}>Refine →</button>
                  <button style={s.btnGhost}>Share thread</button>
                </div>
              </div>
            ),
          )}
        </div>

        {/* Composer */}
        <div style={s.composerWrap}>
          <div style={s.composer}>
            <input
              style={s.composerInput}
              placeholder={composerPlaceholder}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <button style={s.composerScope}>All</button>
            <button style={s.btnIcon}>🎤</button>
            <button style={s.btnIconSolid} onClick={submit}>
              ↑
            </button>
          </div>
          {suggestions.length > 0 && (
            <div style={s.suggestions}>
              <span style={s.monoMuted}>TRY</span>
              {suggestions.map((sug) => (
                <span key={sug} style={s.chip}>
                  {sug}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Cited sources rail */}
      <aside style={s.citedRail}>
        <div style={s.citedHeader}>
          <span style={s.eyebrow}>— sources cited · {citedSources.length}</span>
        </div>
        {citedSources.map((src) => (
          <div key={src.id} style={s.citedCard}>
            <div style={s.citedCardTop}>
              <span style={s.dot} />
              <span style={s.monoMuted}>{src.source}</span>
              <span style={s.flex1} />
              <span style={s.monoMuted}>{src.date}</span>
            </div>
            <div style={s.citedCardTitle}>{src.title}</div>
            <div style={s.citedCardFooter}>
              <span style={s.monoMuted}>cited at {src.citedAt}</span>
              <span style={s.flex1} />
              <button style={s.btnGhostSmall}>Open ›</button>
            </div>
          </div>
        ))}

        <div style={s.railDivider} />

        <span style={s.eyebrow}>— scope</span>
        <div style={s.scopeList}>
          {scopeOptions.map((opt) => (
            <label key={opt.id} style={s.scopeRow}>
              <input type="checkbox" defaultChecked={opt.checked} />
              {opt.label}
            </label>
          ))}
        </div>
      </aside>
    </div>
  );
};

const FONT = "var(--lst-font)";
const MONO = "var(--lst-mono)";

const s: Record<string, React.CSSProperties> = {
  shell: {
    fontFamily: FONT,
    height: "100%",
    display: "grid",
    gridTemplateColumns: "240px 1fr 300px",
    background: "var(--lst-bg)",
    color: "var(--lst-blue)",
    overflow: "hidden",
  },
  historyRail: {
    borderRight: "var(--lst-border)",
    overflow: "auto",
    display: "flex",
    flexDirection: "column",
  },
  historyHeader: {
    padding: "18px 18px 12px",
    borderBottom: "var(--lst-border)",
  },
  historyLabel: {
    padding: "10px 12px",
  },
  historyItem: {
    textAlign: "left" as const,
    padding: "11px 14px",
    borderBottom: "var(--lst-hair)",
    borderLeft: "2px solid transparent",
    background: "transparent",
    cursor: "pointer",
    color: "var(--lst-blue)",
    fontFamily: FONT,
    width: "100%",
  },
  historyItemActive: {
    textAlign: "left" as const,
    padding: "11px 14px",
    borderBottom: "var(--lst-hair)",
    borderLeft: "2px solid var(--lst-blue)",
    background: "var(--lst-ink-08)",
    cursor: "pointer",
    color: "var(--lst-blue)",
    fontFamily: FONT,
    width: "100%",
  },
  historyItemTitle: {
    fontSize: 13,
    marginBottom: 2,
    lineHeight: 1.3,
  },
  historyItemTime: {
    fontFamily: MONO,
    opacity: 0.55,
    fontSize: 10,
  },
  thread: {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  threadHeader: {
    padding: "14px 32px",
    borderBottom: "var(--lst-border)",
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  threadTitle: {
    fontSize: 18,
    fontWeight: 400,
    margin: 0,
    color: "var(--lst-blue)",
  },
  threadBody: {
    flex: 1,
    overflow: "auto",
    padding: "24px 32px",
    display: "flex",
    flexDirection: "column",
    gap: 22,
  },
  userMessageRow: {
    alignSelf: "flex-end",
    maxWidth: "70%",
  },
  userBubble: {
    background: "var(--lst-blue)",
    color: "var(--lst-bg)",
    padding: "12px 16px",
    borderRadius: 18,
    fontSize: 14,
    lineHeight: 1.45,
  },
  assistantRow: {
    alignSelf: "flex-start",
    maxWidth: "88%",
  },
  assistantMetaRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  mark: {
    width: 22,
    height: 22,
    borderRadius: 4,
    background: "var(--lst-blue)",
    display: "inline-block",
  },
  assistantBubble: {
    border: "var(--lst-border)",
    borderRadius: 8,
    padding: 18,
  },
  assistantParagraph: {
    fontSize: 14.5,
    lineHeight: 1.6,
    margin: "0 0 14px",
  },
  citationList: {
    paddingLeft: 20,
    fontSize: 14,
    lineHeight: 1.75,
    margin: "0 0 14px",
  },
  citationLink: {
    color: "var(--lst-blue)",
    borderBottom: "1px solid var(--lst-blue)",
    textDecoration: "none",
  },
  citationAt: {
    fontFamily: MONO,
    opacity: 0.55,
    fontSize: 11,
    marginLeft: 4,
  },
  assistantFootnote: {
    fontSize: 13.5,
    lineHeight: 1.55,
    opacity: 0.75,
    fontStyle: "italic" as const,
    margin: 0,
  },
  assistantActions: {
    display: "flex",
    gap: 8,
    marginTop: 10,
  },
  composerWrap: {
    padding: "14px 32px 22px",
    borderTop: "var(--lst-border)",
  },
  composer: {
    border: "var(--lst-border)",
    borderRadius: 18,
    padding: "8px 10px",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  composerInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    fontFamily: FONT,
    fontSize: 14,
    color: "var(--lst-blue)",
    padding: "6px 8px",
  },
  composerScope: {
    fontFamily: FONT,
    fontSize: 12,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "4px 10px",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  suggestions: {
    display: "flex",
    gap: 6,
    marginTop: 10,
    flexWrap: "wrap" as const,
    alignItems: "center",
  },
  chip: {
    fontFamily: FONT,
    fontSize: 12,
    color: "var(--lst-blue)",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "4px 10px",
    background: "transparent",
  },
  citedRail: {
    borderLeft: "var(--lst-border)",
    overflow: "auto",
    padding: "18px",
  },
  citedHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: 14,
  },
  citedCard: {
    border: "var(--lst-border)",
    padding: 12,
    borderRadius: 4,
    marginBottom: 10,
  },
  citedCardTop: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  citedCardTitle: {
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 6,
  },
  citedCardFooter: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  railDivider: {
    height: 1,
    background: "var(--lst-rule-soft)",
    margin: "18px 0",
  },
  scopeList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    fontSize: 13,
    marginTop: 8,
  },
  scopeRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    background: "var(--lst-blue)",
    display: "inline-block",
  },
  flex1: {
    flex: 1,
  },
  eyebrow: {
    fontFamily: MONO,
    fontSize: 10,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    display: "block",
    marginBottom: 8,
  },
  monoMuted: {
    fontFamily: MONO,
    fontSize: 10,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.06em",
  },
  btnPrimaryBlock: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 600,
    color: "var(--lst-bg)",
    background: "var(--lst-blue)",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "8px 12px",
    cursor: "pointer",
    width: "100%",
  },
  btnGhost: {
    fontFamily: FONT,
    fontSize: 12,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "6px 12px",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  btnGhostSmall: {
    fontFamily: FONT,
    fontSize: 11,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "2px 8px",
    cursor: "pointer",
  },
  btnIcon: {
    fontFamily: FONT,
    fontSize: 12,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "6px 10px",
    cursor: "pointer",
    minWidth: 30,
  },
  btnIconSolid: {
    fontFamily: FONT,
    fontSize: 12,
    color: "var(--lst-bg)",
    background: "var(--lst-blue)",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "6px 10px",
    cursor: "pointer",
    minWidth: 30,
  },
};
