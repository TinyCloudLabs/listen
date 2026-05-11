import { useState, type CSSProperties, type FC, type FormEvent } from "react";

export interface MobileChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  citationTimestamp?: number; // seconds
  citationQuote?: string;
}

interface MobileChatProps {
  scopeLabel: string; // e.g. "Scoped · 1 transcript · 47m" or "All transcripts"
  messages: MobileChatMessage[];
  suggestions?: string[];
  onBack?: () => void;
  onSend: (text: string) => void;
  onSelectSuggestion?: (text: string) => void;
  conversationTitle?: string; // shown in header subtitle when scoped
}

function formatTimestamp(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export const MobileChat: FC<MobileChatProps> = ({
  scopeLabel,
  messages,
  suggestions = [],
  onBack,
  onSend,
  onSelectSuggestion,
  conversationTitle,
}) => {
  const [draft, setDraft] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  };

  return (
    <div style={s.root}>
      <header style={s.topBar}>
        {onBack ? (
          <button type="button" style={s.backBtn} onClick={onBack}>
            {"\u2039 Back"}
          </button>
        ) : (
          <span style={{ width: 60 }} />
        )}
        <div style={s.headerCenter}>
          <div style={s.headerTitle}>
            {conversationTitle ? "Ask this transcript" : "Chat"}
          </div>
          {conversationTitle && (
            <div style={s.headerSubtitle}>{conversationTitle.toUpperCase()}</div>
          )}
        </div>
        <button type="button" style={s.iconBtn} aria-label="More">
          {"\u22EF"}
        </button>
      </header>

      <div style={s.scopeRow}>
        <span style={s.scopeChip}>{scopeLabel}</span>
      </div>

      <div style={s.scroll}>
        {messages.length === 0 && (
          <div style={s.empty}>Ask anything across your transcripts.</div>
        )}
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} style={{ ...s.bubbleWrap, alignSelf: "flex-end" }}>
              <div style={{ ...s.bubble, ...s.bubbleUser }}>{m.text}</div>
            </div>
          ) : (
            <div key={m.id} style={{ ...s.bubbleWrap, alignSelf: "flex-start" }}>
              <div style={{ ...s.bubble, ...s.bubbleAssistant }}>
                {m.text}
                {m.citationQuote && (
                  <div style={s.citation}>
                    {`\u201C${m.citationQuote}\u201D `}
                    {typeof m.citationTimestamp === "number" && (
                      <span style={s.citationTs}>{formatTimestamp(m.citationTimestamp)}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ),
        )}

        {suggestions.length > 0 && (
          <div style={s.suggestBlock}>
            <div style={s.suggestLabel}>{"\u2014 suggested"}</div>
            <div style={s.suggestList}>
              {suggestions.map((text) => (
                <button
                  key={text}
                  type="button"
                  style={s.suggestItem}
                  onClick={() => onSelectSuggestion?.(text)}
                >
                  <span style={s.suggestGlyph}>{"\u2727"}</span>
                  <span>{text}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <form style={s.composer} onSubmit={handleSubmit}>
        <div style={s.composerInner}>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={conversationTitle ? "Ask about this conversation\u2026" : "Ask anything\u2026"}
            style={s.input}
          />
          <button
            type="submit"
            style={{ ...s.iconBtn, ...s.iconBtnSolid }}
            aria-label="Send"
            disabled={!draft.trim()}
          >
            {"\u2192"}
          </button>
        </div>
      </form>
    </div>
  );
};

// ── Styles ──────────────────────────────────────────────────────────

const FONT = "var(--lst-font)";
const MONO = "var(--lst-mono)";

const s: Record<string, CSSProperties> = {
  root: {
    fontFamily: FONT,
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
    background: "var(--lst-bg)",
    color: "var(--lst-blue)",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "6px 8px 10px",
    borderBottom: "var(--lst-border)",
    flexShrink: 0,
  },
  backBtn: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: 500,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "none",
    padding: "6px 10px",
    cursor: "pointer",
    minWidth: 60,
    textAlign: "left",
  },
  headerCenter: {
    flex: 1,
    textAlign: "center",
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: 500,
    color: "var(--lst-blue)",
  },
  headerSubtitle: {
    fontFamily: MONO,
    fontSize: 10,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.06em",
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    border: "var(--lst-border)",
    background: "transparent",
    color: "var(--lst-blue)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontFamily: FONT,
    fontSize: 14,
  },
  iconBtnSolid: {
    background: "var(--lst-blue)",
    color: "var(--lst-bg)",
    borderColor: "var(--lst-blue)",
  },
  scopeRow: {
    padding: "12px 16px 4px",
    flexShrink: 0,
  },
  scopeChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "var(--lst-blue)",
    color: "var(--lst-bg)",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 500,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: "10px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  empty: {
    fontSize: 13,
    color: "var(--lst-ink-55)",
    textAlign: "center",
    padding: "32px 14px",
  },
  bubbleWrap: {
    maxWidth: "88%",
    display: "flex",
  },
  bubble: {
    fontSize: 13.5,
    lineHeight: 1.5,
    padding: "10px 14px",
    borderRadius: 18,
  },
  bubbleUser: {
    background: "var(--lst-blue)",
    color: "var(--lst-bg)",
  },
  bubbleAssistant: {
    background: "transparent",
    color: "var(--lst-blue)",
    border: "var(--lst-border)",
  },
  citation: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: "var(--lst-hair)",
    fontSize: 12.5,
    fontStyle: "italic",
    color: "var(--lst-ink-70)",
  },
  citationTs: {
    fontFamily: MONO,
    fontStyle: "normal",
    fontSize: 11,
    color: "var(--lst-ink-55)",
    marginLeft: 4,
  },
  suggestBlock: {
    marginTop: 4,
  },
  suggestLabel: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
    marginBottom: 6,
  },
  suggestList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  suggestItem: {
    fontFamily: FONT,
    fontSize: 13,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "9px 12px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    textAlign: "left",
  },
  suggestGlyph: {
    fontSize: 12,
  },
  composer: {
    flexShrink: 0,
    padding: "10px 12px calc(env(safe-area-inset-bottom, 0px) + 12px)",
    borderTop: "var(--lst-border)",
    background: "var(--lst-bg)",
  },
  composerInner: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "4px 4px 4px 14px",
  },
  input: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    color: "var(--lst-blue)",
    fontFamily: FONT,
    fontSize: 13.5,
    padding: "6px 0",
  },
};
