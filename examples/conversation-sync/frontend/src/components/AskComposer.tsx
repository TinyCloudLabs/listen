import { useState, type FC } from "react";

// ── Mini Ask composer ────────────────────────────────────────────────
// Per l-app-screens.jsx line 163. Non-functional UI for now —
// wiring to an agent is out of scope for this rebuild.

interface AskComposerProps {
  placeholder?: string;
}

export const AskComposer: FC<AskComposerProps> = ({ placeholder = "Ask this transcript…" }) => {
  const [value, setValue] = useState("");

  return (
    <div style={s.pill}>
      <span style={s.sparkle} aria-hidden="true">
        ✦
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        style={s.input}
        // submit is intentionally unwired — agent connection is out of scope
        onKeyDown={(e) => {
          if (e.key === "Enter") setValue("");
        }}
      />
      <button style={s.sendBtn} aria-label="Send" onClick={() => setValue("")}>
        <span style={s.sendGlyph}>→</span>
      </button>
    </div>
  );
};

const FONT = "var(--lst-font)";

const s: Record<string, React.CSSProperties> = {
  pill: {
    fontFamily: FONT,
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "6px 6px 6px 14px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "var(--lst-bg)",
  },
  sparkle: {
    fontSize: 12,
    color: "var(--lst-blue)",
    opacity: 0.8,
  },
  input: {
    flex: 1,
    border: "none",
    background: "transparent",
    color: "var(--lst-blue)",
    fontFamily: FONT,
    fontSize: 12.5,
    outline: "none",
    padding: "4px 0",
    minWidth: 0,
  },
  sendBtn: {
    width: 26,
    height: 26,
    borderRadius: 999,
    border: "var(--lst-border)",
    background: "var(--lst-blue)",
    color: "var(--lst-bg)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  },
  sendGlyph: {
    fontSize: 12,
    lineHeight: 1,
  },
};
