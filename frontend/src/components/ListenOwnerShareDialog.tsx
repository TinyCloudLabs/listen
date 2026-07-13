import { useEffect, useState, type FC } from "react";
import type { TinyCloudWeb } from "@tinycloud/web-sdk";
import type { ApiClient } from "@listen/client";

import {
  type ListenOwnerShareDraft,
  type PublishedListenOwnerShare,
} from "../lib/listenOwnerShares";
import type { ShareableConversationDetail } from "../lib/listenShareLinks";

function ownerShareModule() {
  return import("../lib/listenOwnerShares");
}

interface ListenOwnerShareDialogProps {
  api: ApiClient;
  tcw: TinyCloudWeb | null;
  conversationIds: readonly string[];
  onPublished?: () => void;
  onClose: () => void;
}

type PublishState = "idle" | "publishing" | "published" | "failed";
type RevokeState = "idle" | "revoking" | "revoked" | "failed";

function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
  return Promise.resolve();
}

export const ListenOwnerShareDialog: FC<ListenOwnerShareDialogProps> = ({
  api,
  tcw,
  conversationIds,
  onPublished,
  onClose,
}) => {
  const [details, setDetails] = useState<ShareableConversationDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishState, setPublishState] = useState<PublishState>("idle");
  const [revokeState, setRevokeState] = useState<RevokeState>("idle");
  const [published, setPublished] = useState<PublishedListenOwnerShare | null>(null);
  const [draft, setDraft] = useState<ListenOwnerShareDraft | null>(null);
  const [emailDomain, setEmailDomain] = useState("");
  const [revokeCopy, setRevokeCopy] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPublishState("idle");
    setRevokeState("idle");
    setPublished(null);
    setDraft(null);
    ownerShareModule()
      .then((module) => module.loadOwnerShareDetails(api, conversationIds))
      .then((loaded) => {
        if (cancelled) return;
        setDetails(loaded);
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
  }, [api, conversationIds]);

  useEffect(() => {
    let cancelled = false;
    if (details.length === 0 || emailDomain.trim().length === 0) {
      setDraft(null);
      return;
    }
    setError(null);
    ownerShareModule()
      .then((module) => {
        const nextDraft = module.composeListenOwnerShareDraft(details, {
          conversationIds,
          emailDomain,
        });
        if (!cancelled) {
          setRevokeCopy(module.REVOKE_COPY);
          setDraft(nextDraft);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setDraft(null);
          setError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [details, conversationIds, emailDomain]);

  const canPublish = Boolean(tcw && draft && !loading && publishState !== "publishing");

  const publish = async () => {
    if (!tcw || !draft) return;
    setPublishState("publishing");
    setError(null);
    try {
      const { publishListenOwnerShare } = await ownerShareModule();
      const next = await publishListenOwnerShare(tcw, draft);
      setPublished(next);
      setPublishState("published");
      onPublished?.();
    } catch (err) {
      setPublishState("failed");
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const revoke = async () => {
    if (!tcw || !published) return;
    setRevokeState("revoking");
    setError(null);
    try {
      const { revokeListenOwnerShare } = await ownerShareModule();
      const next = await revokeListenOwnerShare(tcw, published);
      setPublished(next);
      setRevokeState("revoked");
    } catch (err) {
      setRevokeState("failed");
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div style={s.backdrop} role="presentation" onMouseDown={onClose}>
      <section
        style={s.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Credentialed transcript share"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div style={s.header}>
          <div>
            <span style={s.eyebrow}>credentialed share</span>
            <h2 style={s.title}>Share selected transcripts</h2>
          </div>
          <button type="button" style={s.iconButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {!tcw && (
          <div style={s.error}>
            Reconnect your wallet before publishing a credentialed transcript share.
          </div>
        )}
        {loading && <div style={s.muted}>Loading selected transcripts...</div>}
        {error && <div style={s.error}>{error}</div>}

        {!loading && details.length > 0 && (
          <section style={s.domainSection}>
            <h3 style={s.sectionTitle}>Who can request access</h3>
            <label style={s.domainLabel}>
              Verified email domain
              <input
                type="text"
                value={emailDomain}
                onChange={(event) => setEmailDomain(event.target.value)}
                placeholder="acme.com"
                aria-label="Verified email domain"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                style={s.domainInput}
              />
            </label>
            <span style={s.historyNote}>
              Anyone with a valid OpenCredentials email credential for this domain can request this
              share.
            </span>
          </section>
        )}

        {draft && (
          <div style={s.body}>
            <section style={s.section}>
              <h3 style={s.sectionTitle}>Selected transcripts</h3>
              <div style={s.selectedList}>
                {draft.disclosure.conversations.map((conversation) => (
                  <div key={conversation.conversationId} style={s.selectedItem}>
                    <strong>{conversation.title}</strong>
                    <span>{conversation.participants.length || 0} participants</span>
                  </div>
                ))}
              </div>
            </section>

            <section style={s.section}>
              <h3 style={s.sectionTitle}>Disclosure summary</h3>
              <div style={s.disclosureList}>
                {draft.disclosure.conversations.map((conversation) => {
                  return (
                    <div key={conversation.conversationId} style={s.disclosureItem}>
                      <strong>{conversation.title}</strong>
                      <span>
                        Participants:{" "}
                        {conversation.participants.length > 0
                          ? conversation.participants.join(", ")
                          : "none listed"}
                      </span>
                      <span>Transcript fields: {conversation.transcriptFields.join(", ")}</span>
                      {conversation.transcriptFields.includes("transcript_text") && (
                        <span>Transcript body text is included.</span>
                      )}
                      <span>Participant fields: {conversation.participantFields.join(", ")}</span>
                      <span>Audio is not included.</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section style={s.section}>
              <h3 style={s.sectionTitle}>Credential rule</h3>
              <div style={s.ruleBox}>
                <strong>OpenCredentials email credential</strong>
                <span>Email domain: @{draft.credentialRule.emailDomains.join(", @")}</span>
                <span>Verifier: {draft.credentialRule.credentialClass}</span>
                <span>Accepted issuer: {draft.credentialRule.acceptedIssuers.join(", ")}</span>
              </div>
            </section>

            {published && (
              <section style={s.section}>
                <h3 style={s.sectionTitle}>Published share</h3>
                <div style={s.ruleBox}>
                  <span>Status: {published.status}</span>
                  <span>Policy: {published.policyId}</span>
                  <button
                    type="button"
                    style={s.secondaryButton}
                    onClick={() => void copyText(JSON.stringify(published.bootstrap, null, 2))}
                  >
                    Copy bootstrap
                  </button>
                </div>
              </section>
            )}

            {publishState === "published" &&
              published?.status === "active" &&
              revokeState === "idle" && (
                <div style={s.success}>Published after all owner-space records were written.</div>
              )}
            {publishState === "failed" && (
              <div style={s.error}>Share was not published. No live share is shown.</div>
            )}
            {revokeState === "revoked" && <div style={s.success}>{revokeCopy}</div>}
            {revokeState === "failed" && (
              <div style={s.error}>
                Revoke failed. This share is still active.
                <button type="button" style={s.inlineRetry} onClick={() => void revoke()}>
                  Retry revoke
                </button>
              </div>
            )}
          </div>
        )}

        <div style={s.footer}>
          <button type="button" style={s.secondaryButton} onClick={onClose}>
            Close
          </button>
          {published?.status === "active" ? (
            <button
              type="button"
              style={s.dangerButton}
              onClick={() => void revoke()}
              disabled={revokeState === "revoking"}
            >
              {revokeState === "revoking" ? "Revoking..." : "Revoke access"}
            </button>
          ) : (
            <button
              type="button"
              style={{ ...s.primaryButton, ...(!canPublish ? s.buttonDisabled : {}) }}
              disabled={!canPublish}
              onClick={() => void publish()}
            >
              {publishState === "publishing" ? "Publishing..." : "Publish share"}
            </button>
          )}
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
    zIndex: 60,
    background: "rgba(0, 0, 0, 0.22)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  dialog: {
    width: "min(720px, 100%)",
    maxHeight: "min(760px, calc(100vh - 40px))",
    overflow: "auto",
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
  body: {
    display: "grid",
    gap: 18,
    padding: "18px 24px",
  },
  muted: {
    padding: "16px 24px 0",
    color: "var(--lst-ink-55)",
    fontSize: 13,
  },
  section: {
    display: "grid",
    gap: 10,
  },
  domainSection: {
    display: "grid",
    gap: 10,
    margin: "18px 24px 0",
  },
  domainLabel: {
    display: "grid",
    gap: 6,
    fontSize: 13,
  },
  domainInput: {
    width: "100%",
    boxSizing: "border-box",
    border: "var(--lst-border)",
    background: "var(--lst-bg)",
    color: "var(--lst-ink)",
    fontFamily: MONO,
    fontSize: 16,
    padding: "9px 10px",
  },
  sectionTitle: {
    margin: 0,
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-70)",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  selectedList: {
    display: "grid",
    gap: 8,
  },
  selectedItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    borderBottom: "var(--lst-hair)",
    paddingBottom: 8,
    fontSize: 13,
  },
  disclosureList: {
    display: "grid",
    gap: 12,
  },
  disclosureItem: {
    display: "grid",
    gap: 6,
    padding: 12,
    border: "var(--lst-border)",
    fontSize: 13,
    lineHeight: 1.4,
  },
  audioToggle: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    marginTop: 4,
  },
  ruleBox: {
    display: "grid",
    gap: 6,
    padding: 12,
    border: "var(--lst-border)",
    fontSize: 13,
  },
  historyNote: {
    color: "var(--lst-ink-55)",
    fontSize: 12,
  },
  error: {
    margin: "0 24px",
    padding: "10px 12px",
    background: "var(--lst-alert-soft)",
    color: "var(--lst-alert)",
    fontSize: 13,
    lineHeight: 1.4,
  },
  success: {
    padding: "10px 12px",
    background: "var(--lst-ok-soft)",
    color: "var(--lst-ok)",
    fontSize: 13,
    lineHeight: 1.4,
  },
  revokeBox: {
    display: "grid",
    gap: 10,
    padding: 12,
    background: "var(--lst-alert-soft)",
    color: "var(--lst-alert)",
    fontSize: 13,
  },
  inlineRetry: {
    marginLeft: 10,
    border: "var(--lst-border)",
    background: "transparent",
    color: "var(--lst-alert)",
    padding: "4px 8px",
    cursor: "pointer",
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
  dangerButton: {
    border: "var(--lst-border)",
    background: "var(--lst-alert)",
    color: "var(--lst-bg)",
    padding: "7px 14px",
    cursor: "pointer",
  },
  buttonDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
};
