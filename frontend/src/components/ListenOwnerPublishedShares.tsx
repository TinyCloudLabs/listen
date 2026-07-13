import { useEffect, useState, type FC } from "react";
import type { TinyCloudWeb } from "@tinycloud/web-sdk";

import {
  getPublishedListenOwnerShareProjection,
  listPublishedListenOwnerShares,
  REVOKE_COPY,
  revokeListenOwnerShare,
  type PublishedListenOwnerShare,
  type PublishedListenOwnerShareProjection,
} from "../lib/listenOwnerShares";

interface ListenOwnerPublishedSharesProps {
  tcw: TinyCloudWeb | null;
  refreshKey?: number;
}

export const ListenOwnerPublishedShares: FC<ListenOwnerPublishedSharesProps> = ({
  tcw,
  refreshKey = 0,
}) => {
  const [projection, setProjection] = useState<PublishedListenOwnerShareProjection>(() => ({
    ...getPublishedListenOwnerShareProjection(),
    shares: listPublishedListenOwnerShares(),
  }));
  const [revokingShareId, setRevokingShareId] = useState<string | null>(null);
  const [errorShareId, setErrorShareId] = useState<string | null>(null);
  const [revokedShareId, setRevokedShareId] = useState<string | null>(null);

  const refresh = () =>
    setProjection({
      ...getPublishedListenOwnerShareProjection(),
      shares: listPublishedListenOwnerShares(),
    });

  useEffect(() => {
    refresh();
  }, [refreshKey]);

  const revoke = async (share: PublishedListenOwnerShare) => {
    if (!tcw) return;
    setRevokingShareId(share.shareId);
    setErrorShareId(null);
    try {
      await revokeListenOwnerShare(tcw, share);
      setRevokedShareId(share.shareId);
      refresh();
    } catch {
      setErrorShareId(share.shareId);
    } finally {
      setRevokingShareId(null);
    }
  };

  if (projection.quarantined) {
    return (
      <section style={s.wrap} aria-label="Published credentialed shares">
        <div style={s.error}>
          Published share history is quarantined because a stored record failed validation. Revoke
          is disabled until the malformed local projection is cleared.
        </div>
      </section>
    );
  }

  const activeShares = projection.shares.filter((share) => share.status === "active");
  const revokedShares = projection.shares.filter((share) => share.status === "revoked");
  if (activeShares.length === 0 && revokedShares.length === 0) return null;

  return (
    <section style={s.wrap} aria-label="Published credentialed shares">
      <div style={s.header}>
        <div>
          <span style={s.eyebrow}>owner shares</span>
          <h2 style={s.title}>Published credentialed shares</h2>
        </div>
        <span style={s.count}>{activeShares.length} active</span>
      </div>
      <div style={s.list}>
        {projection.shares.map((share) => {
          const failed = errorShareId === share.shareId;
          const revoked = revokedShareId === share.shareId || share.status === "revoked";
          return (
            <article key={share.shareId} style={s.row}>
              <div style={s.rowMain}>
                <strong>
                  {share.disclosure.conversations.map((item) => item.title).join(", ")}
                </strong>
                <span>
                  {share.conversationIds.length} transcript
                  {share.conversationIds.length === 1 ? "" : "s"} - {share.status}
                </span>
                {failed && (
                  <span style={s.errorText}>Revoke failed. This share is still active.</span>
                )}
                {revoked && <span style={s.successText}>{REVOKE_COPY}</span>}
              </div>
              {share.status === "active" && (
                <button
                  type="button"
                  style={s.dangerButton}
                  disabled={!tcw || revokingShareId === share.shareId}
                  onClick={() => void revoke(share)}
                >
                  {revokingShareId === share.shareId ? "Revoking..." : "Revoke access"}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};

const FONT = "var(--lst-font)";
const MONO = "var(--lst-mono)";

const s: Record<string, React.CSSProperties> = {
  wrap: {
    borderTop: "var(--lst-border)",
    borderBottom: "var(--lst-border)",
    background: "var(--lst-bg)",
    color: "var(--lst-blue)",
    fontFamily: FONT,
    marginBottom: 12,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "14px 18px",
    borderBottom: "var(--lst-hair)",
  },
  eyebrow: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.08em",
    textTransform: "lowercase",
  },
  title: {
    margin: "3px 0 0",
    fontSize: 15,
    lineHeight: 1.25,
  },
  count: {
    fontFamily: MONO,
    fontSize: 12,
    color: "var(--lst-ink-55)",
    alignSelf: "center",
  },
  list: {
    display: "grid",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 18px",
    borderTop: "var(--lst-hair)",
  },
  rowMain: {
    display: "grid",
    gap: 4,
    fontSize: 13,
    lineHeight: 1.35,
  },
  warning: {
    color: "var(--lst-alert)",
  },
  error: {
    margin: 18,
    padding: "10px 12px",
    background: "var(--lst-alert-soft)",
    color: "var(--lst-alert)",
    fontSize: 13,
    lineHeight: 1.4,
  },
  errorText: {
    color: "var(--lst-alert)",
  },
  successText: {
    color: "var(--lst-ok)",
  },
  secondaryButton: {
    alignSelf: "start",
    border: "var(--lst-border)",
    background: "transparent",
    color: "var(--lst-blue)",
    padding: "7px 12px",
    cursor: "pointer",
  },
  dangerButton: {
    alignSelf: "start",
    border: "var(--lst-border)",
    background: "var(--lst-alert)",
    color: "var(--lst-bg)",
    padding: "7px 12px",
    cursor: "pointer",
  },
};
