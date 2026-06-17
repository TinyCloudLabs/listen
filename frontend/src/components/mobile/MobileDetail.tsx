import { useEffect, useState, type CSSProperties, type FC } from "react";

export interface MobileDetailSentence {
  speakerName: string;
  startTime: number | null; // seconds
  text: string;
}

export interface MobileDetailData {
  id: string;
  title: string;
  source: string;
  startedAt: string | null; // ISO
  durationSecs: number | null;
  summary: string | null;
}

interface MobileDetailProps {
  conversation: MobileDetailData;
  transcript: MobileDetailSentence[];
  onBack: () => void;
}

type DetailTab = "summary" | "transcript" | "notes";

// Notes persist per conversation in browser storage under the same key the
// desktop NotesPane uses, so mobile and desktop notes stay in sync.
interface Note {
  id: string;
  kind: "LINKED" | "FREE NOTE" | "FOLLOW-UP";
  timestamp?: string;
  body: string;
  emphasized?: boolean;
}

function notesStorageKey(conversationId: string): string {
  return `listen:conversation-notes:${conversationId}`;
}

function loadNotes(conversationId: string): Note[] {
  try {
    const raw = window.localStorage.getItem(notesStorageKey(conversationId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function srcLabel(s: string): string {
  if (s === "google-meet") return "MEET";
  if (s === "manual") return "MANUAL";
  if (s === "recorder") return "RECORDER";
  if (s === "voice_memos") return "VOICE MEMOS";
  if (s === "voxterm") return "VOXTERM";
  return s.toUpperCase();
}

function formatTimestamp(secs: number | null): string {
  if (secs == null || Number.isNaN(secs)) return "—";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDateMono(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    .toUpperCase()
    .replace(",", "");
}

function renderSummary(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^[-*]\s+/gm, "• ")
    .replace(/\n/g, "<br />");
}

// ── Notes pane ───────────────────────────────────────────────────────
// Lean mobile note capture. Reads/writes the same localStorage key as the
// desktop NotesPane so notes captured on either surface stay in sync.
const NotesPane: FC<{ conversationId: string }> = ({ conversationId }) => {
  const [notes, setNotes] = useState<Note[]>(() => loadNotes(conversationId));
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setNotes(loadNotes(conversationId));
    setDrafting(false);
    setDraft("");
  }, [conversationId]);

  useEffect(() => {
    window.localStorage.setItem(notesStorageKey(conversationId), JSON.stringify(notes));
  }, [conversationId, notes]);

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
    <div style={s.notesList}>
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
          placeholder={"Type a note. ⌘↵ to save."}
          style={s.draft}
        />
      ) : (
        <button style={s.addNote} onClick={() => setDrafting(true)} type="button">
          {"+ add a note"}
        </button>
      )}
    </div>
  );
};

export const MobileDetail: FC<MobileDetailProps> = ({ conversation, transcript, onBack }) => {
  const [tab, setTab] = useState<DetailTab>("summary");

  // Accessible names preserve the existing matchers (e.g. /Transcript\s+1/i):
  // a trailing count is appended to Transcript when sentences are present.
  const tabs: Array<[DetailTab, string]> = [
    ["summary", "Summary"],
    ["transcript", `Transcript${transcript.length ? `  ${transcript.length}` : ""}`],
    ["notes", "Notes"],
  ];

  return (
    <div style={s.root}>
      <header style={s.topBar}>
        <button type="button" style={s.backBtn} onClick={onBack}>
          {"‹ Inbox"}
        </button>
        <span style={s.spacer} />
      </header>

      <div style={s.scroll}>
        <div style={s.titleBlock}>
          <span style={s.metaMono}>
            {`${srcLabel(conversation.source)} — ${formatDateMono(conversation.startedAt)} — ${formatTimestamp(conversation.durationSecs)}`}
          </span>
          <h1 style={s.title}>{conversation.title}</h1>
        </div>

        <div style={s.segmentWrap}>
          <div style={s.segment}>
            {tabs.map(([key, label]) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  style={{ ...s.segmentBtn, ...(active ? s.segmentBtnActive : {}) }}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {tab === "summary" && (
          <div style={s.section}>
            {conversation.summary ? (
              <div
                style={s.summaryBody}
                dangerouslySetInnerHTML={{ __html: renderSummary(conversation.summary) }}
              />
            ) : (
              <p style={s.muted}>No summary yet.</p>
            )}
          </div>
        )}

        {tab === "transcript" && (
          <div style={s.section}>
            {transcript.length === 0 ? (
              <p style={s.muted}>No transcript available.</p>
            ) : (
              transcript.map((b, i) => (
                <div key={i} style={s.block}>
                  <div style={s.blockHeader}>
                    <span style={s.metaMonoSmall}>{formatTimestamp(b.startTime)}</span>
                    <span style={s.speaker}>{(b.speakerName || "Speaker").toUpperCase()}</span>
                  </div>
                  <div style={s.utterance}>{b.text}</div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "notes" && (
          <div style={s.section}>
            <NotesPane conversationId={conversation.id} />
          </div>
        )}
      </div>
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
  },
  spacer: { flex: 1 },
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
  scroll: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
  },
  titleBlock: {
    padding: "14px 18px 16px",
  },
  metaMono: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.06em",
  },
  title: {
    fontSize: 28,
    fontWeight: 400,
    letterSpacing: 0,
    lineHeight: 1.1,
    margin: "6px 0 0",
    color: "var(--lst-blue)",
  },
  // Segmented control: a hairline track holding three equal segments. The
  // active segment fills with brand cobalt; inactive segments read as muted
  // ink. Both states stay legible in light and dark via the themed tokens.
  segmentWrap: {
    padding: "4px 18px 16px",
    flexShrink: 0,
  },
  segment: {
    display: "flex",
    gap: 2,
    padding: 2,
    border: "var(--lst-border)",
    borderRadius: 999,
    background: "var(--lst-ink-08)",
  },
  segmentBtn: {
    flex: 1,
    fontFamily: FONT,
    fontSize: 12.5,
    fontWeight: 500,
    color: "var(--lst-ink-70)",
    background: "transparent",
    border: "none",
    borderRadius: 999,
    padding: "7px 8px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "background 0.15s ease, color 0.15s ease",
  },
  segmentBtnActive: {
    color: "var(--lst-bg)",
    background: "var(--lst-blue)",
  },
  section: {
    padding: "18px 22px 32px",
  },
  summaryBody: {
    fontSize: 14,
    lineHeight: 1.55,
    color: "var(--lst-blue)",
  },
  block: {
    marginBottom: 18,
  },
  blockHeader: {
    display: "flex",
    gap: 10,
    alignItems: "baseline",
    marginBottom: 4,
  },
  metaMonoSmall: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
  },
  speaker: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: "0.08em",
    color: "var(--lst-ink-55)",
  },
  utterance: {
    fontSize: 15,
    lineHeight: 1.55,
    color: "var(--lst-blue)",
  },
  muted: {
    fontSize: 13,
    color: "var(--lst-ink-55)",
    margin: 0,
  },
  notesList: {
    display: "flex",
    flexDirection: "column",
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
  addNote: {
    border: "1px dashed var(--lst-rule-soft)",
    background: "transparent",
    color: "var(--lst-ink-55)",
    padding: 14,
    borderRadius: 4,
    fontSize: 13,
    textAlign: "center",
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
    resize: "vertical",
    outline: "none",
  },
};
