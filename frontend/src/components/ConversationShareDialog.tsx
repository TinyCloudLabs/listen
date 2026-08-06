import { useEffect, useRef, useState, type FC } from "react";
import type { TinyCloudWeb } from "@tinycloud/web-sdk";
import type { ApiClient } from "@listen/client";

import {
  createListenShareLink,
  hasShareableAudio,
  hasSqlTranscript,
  needsLegacyTranscriptKvGrant,
  type ShareableConversationDetail,
} from "../lib/listenShareLinks";

interface ConversationShareDialogProps {
  api: ApiClient;
  tcw: TinyCloudWeb | null;
  conversationId: string | null;
  onClose: () => void;
  mutationsDisabled?: boolean;
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

export const ConversationShareDialog: FC<ConversationShareDialogProps> = ({
  api,
  tcw,
  conversationId,
  onClose,
  mutationsDisabled = false,
}) => {
  const [detail, setDetail] = useState<ShareableConversationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [includeTranscript, setIncludeTranscript] = useState(true);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [durationDays, setDurationDays] = useState(7);
  const mutationsDisabledRef = useRef(mutationsDisabled);
  mutationsDisabledRef.current = mutationsDisabled;

  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setLink(null);
    api
      .get<ShareableConversationDetail>(`/api/conversations/${encodeURIComponent(conversationId)}`)
      .then((response) => {
        if (cancelled) return;
        setDetail(response);
        setIncludeTranscript(needsLegacyTranscriptKvGrant(response));
        setIncludeAudio(hasShareableAudio(response));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, conversationId]);

  if (!conversationId) return null;

  const audioAvailable = hasShareableAudio(detail);
  const transcriptInSql = hasSqlTranscript(detail);
  const needsTranscriptKv = needsLegacyTranscriptKvGrant(detail);
  const canCreate = Boolean(tcw && detail && !loading && !creating && !mutationsDisabled);

  const createShare = async () => {
    if (!tcw || !detail || mutationsDisabledRef.current) return;
    setCreating(true);
    setError(null);
    try {
      const result = await createListenShareLink(tcw, detail, {
        includeTranscript: includeTranscript && needsTranscriptKv,
        includeAudio: includeAudio && audioAvailable,
        durationDays,
      });
      setLink(result.link);
      await copyText(result.link);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={s.backdrop} role="presentation" onMouseDown={onClose}>
      <section
        style={s.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Share conversation"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div style={s.header}>
          <div>
            <span style={s.eyebrow}>share</span>
            <h2 style={s.title}>{detail?.conversation.title ?? "Conversation"}</h2>
          </div>
          <button type="button" style={s.iconButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {!tcw && (
          <div style={s.error}>
            Reconnect your wallet before creating a share link. Viewing shared links does not
            require sign-in.
          </div>
        )}
        {loading && <div style={s.muted}>Loading share options...</div>}
        {error && <div style={s.error}>{error}</div>}

        <div style={s.options}>
          <label style={s.optionDisabled}>
            <input type="checkbox" checked readOnly />
            <span>
              <strong>Conversation row and participants</strong>
              <small>
                Required for the shared detail page
                {transcriptInSql ? " and includes the transcript." : "."}
              </small>
            </span>
          </label>
          {needsTranscriptKv && (
            <label style={s.option}>
              <input
                type="checkbox"
                checked={includeTranscript}
                onChange={(event) => setIncludeTranscript(event.currentTarget.checked)}
              />
              <span>
                <strong>Legacy transcript blob</strong>
                <small>Include the legacy transcript KV blob.</small>
              </span>
            </label>
          )}
          {audioAvailable && (
            <label style={s.option}>
              <input
                type="checkbox"
                checked={includeAudio}
                onChange={(event) => setIncludeAudio(event.currentTarget.checked)}
              />
              <span>
                <strong>Audio</strong>
                <small>Include recording access.</small>
              </span>
            </label>
          )}
        </div>

        <label style={s.durationRow}>
          <span>Duration</span>
          <input
            type="number"
            min={1}
            max={365}
            value={durationDays}
            onChange={(event) => setDurationDays(Number(event.currentTarget.value) || 7)}
            style={s.durationInput}
          />
          <span>days</span>
        </label>

        {link && (
          <div style={s.linkBox}>
            <span>Link copied</span>
            <code style={s.linkText}>{link}</code>
          </div>
        )}

        <div style={s.footer}>
          <button type="button" style={s.secondaryButton} onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            style={{ ...s.primaryButton, ...(!canCreate ? s.buttonDisabled : {}) }}
            disabled={!canCreate}
            onClick={() => void createShare()}
          >
            {creating ? "Creating..." : "Create link"}
          </button>
        </div>
      </section>
    </div>
  );
};

const FONT = "var(--lst-font)";
const MONO = "var(--lst-mono)";

const s: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    background: "rgba(0, 0, 0, 0.22)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  dialog: {
    width: "min(560px, 100%)",
    background: "var(--lst-bg)",
    border: "var(--lst-border)",
    color: "var(--lst-blue)",
    fontFamily: FONT,
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    padding: "22px 24px",
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
    margin: "5px 0 0",
    fontSize: 20,
    lineHeight: 1.25,
    fontWeight: 600,
  },
  iconButton: {
    width: 30,
    height: 30,
    border: "var(--lst-border)",
    borderRadius: 999,
    background: "transparent",
    color: "var(--lst-blue)",
    cursor: "pointer",
    fontSize: 20,
    lineHeight: 1,
  },
  muted: {
    padding: "16px 24px 0",
    color: "var(--lst-ink-55)",
    fontSize: 13,
  },
  error: {
    margin: "16px 24px 0",
    padding: "10px 12px",
    background: "var(--lst-alert-soft)",
    color: "var(--lst-alert)",
    fontSize: 13,
    lineHeight: 1.4,
  },
  options: {
    display: "grid",
    gap: 10,
    padding: "18px 24px",
  },
  option: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    padding: "12px 0",
    borderBottom: "var(--lst-hair)",
    cursor: "pointer",
  },
  optionDisabled: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    padding: "12px 0",
    borderBottom: "var(--lst-hair)",
    opacity: 0.68,
  },
  durationRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 24px 18px",
    color: "var(--lst-ink-70)",
    fontSize: 13,
  },
  durationInput: {
    width: 76,
    border: "var(--lst-border)",
    background: "transparent",
    color: "var(--lst-blue)",
    padding: "6px 8px",
  },
  linkBox: {
    margin: "0 24px 18px",
    padding: 12,
    background: "var(--lst-ink-08)",
    display: "grid",
    gap: 6,
    fontFamily: MONO,
    fontSize: 11,
  },
  linkText: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    padding: "16px 24px",
    borderTop: "var(--lst-border)",
  },
  secondaryButton: {
    border: "var(--lst-border)",
    background: "transparent",
    color: "var(--lst-blue)",
    padding: "7px 14px",
    cursor: "pointer",
  },
  primaryButton: {
    border: "var(--lst-border)",
    background: "var(--lst-blue)",
    color: "var(--lst-bg)",
    padding: "7px 14px",
    cursor: "pointer",
  },
  buttonDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
};
