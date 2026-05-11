import { useState, type FC } from "react";
import { AskComposer } from "./AskComposer";

// ── Notes pane ───────────────────────────────────────────────────────
// Stub UI per l-app-screens.jsx line 139. Notes are local-only and not
// persisted — wiring to backend storage is out of scope for this rebuild.

interface Note {
  id: string;
  kind: "LINKED" | "FREE NOTE" | "FOLLOW-UP";
  timestamp?: string;
  body: string;
  emphasized?: boolean;
}

const SEED_NOTES: Note[] = [];

export const NotesPane: FC = () => {
  const [notes, setNotes] = useState<Note[]>(SEED_NOTES);
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState("");

  const commitDraft = () => {
    const text = draft.trim();
    if (!text) {
      setDrafting(false);
      setDraft("");
      return;
    }
    setNotes((n) => [...n, { id: `n${Date.now()}`, kind: "FREE NOTE", body: text }]);
    setDraft("");
    setDrafting(false);
  };

  return (
    <aside style={s.pane}>
      <div style={s.head}>
        <span style={s.eyebrow}>— notes · {notes.length}</span>
        <button style={s.iconBtn} onClick={() => setDrafting(true)} aria-label="Add note">
          +
        </button>
      </div>

      <div style={s.list}>
        {notes.map((note) => (
          <div key={note.id} style={{ ...s.note, ...(note.emphasized ? s.noteEmph : {}) }}>
            <span style={s.noteMeta}>
              {note.timestamp ? `${note.timestamp} · ${note.kind}` : note.kind}
            </span>
            <p style={s.noteBody}>{note.body}</p>
          </div>
        ))}

        {drafting ? (
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                commitDraft();
              }
              if (e.key === "Escape") {
                setDraft("");
                setDrafting(false);
              }
            }}
            placeholder="Type a note. ⌘↵ to save."
            style={s.draft}
          />
        ) : (
          <button style={s.addPlaceholder} onClick={() => setDrafting(true)} type="button">
            + add a note
          </button>
        )}
      </div>

      <div style={s.composerWrap}>
        <AskComposer placeholder="Ask this transcript…" />
      </div>
    </aside>
  );
};

const FONT = "var(--lst-font)";
const MONO = "var(--lst-mono)";

const s: Record<string, React.CSSProperties> = {
  pane: {
    fontFamily: FONT,
    borderLeft: "var(--lst-border)",
    display: "flex",
    flexDirection: "column" as const,
    minWidth: 0,
    background: "var(--lst-bg)",
  },
  head: {
    padding: "14px 20px",
    borderBottom: "var(--lst-border)",
    display: "flex",
    alignItems: "center",
  },
  eyebrow: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  iconBtn: {
    marginLeft: "auto",
    width: 26,
    height: 26,
    borderRadius: 999,
    border: "var(--lst-border)",
    background: "transparent",
    color: "var(--lst-blue)",
    cursor: "pointer",
    fontFamily: FONT,
    fontSize: 14,
    lineHeight: 1,
    padding: 0,
  },
  list: {
    flex: 1,
    overflow: "auto",
    padding: 18,
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
  },
  note: {
    border: "var(--lst-border)",
    padding: 12,
    borderRadius: 4,
    background: "transparent",
  },
  noteEmph: {
    background: "var(--lst-ink-08)",
  },
  noteMeta: {
    fontFamily: MONO,
    fontSize: 10,
    color: "var(--lst-ink-55)",
    marginBottom: 6,
    display: "block",
    letterSpacing: "0.04em",
  },
  noteBody: {
    fontFamily: FONT,
    fontSize: 13,
    color: "var(--lst-blue)",
    lineHeight: 1.55,
    margin: 0,
  },
  addPlaceholder: {
    border: "1px dashed var(--lst-rule-soft)",
    background: "transparent",
    color: "var(--lst-ink-55)",
    padding: 14,
    borderRadius: 4,
    fontSize: 13,
    textAlign: "center" as const,
    cursor: "pointer",
    fontFamily: FONT,
  },
  draft: {
    border: "var(--lst-border)",
    background: "var(--lst-bg)",
    color: "var(--lst-blue)",
    padding: 12,
    borderRadius: 4,
    fontSize: 13,
    lineHeight: 1.55,
    fontFamily: FONT,
    minHeight: 84,
    resize: "vertical" as const,
    outline: "none",
  },
  composerWrap: {
    padding: 14,
    borderTop: "var(--lst-border)",
  },
};
