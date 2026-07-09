import type { CSSProperties, FC } from "react";
import { parseStorageQuotaError } from "../lib/storageQuotaError";

interface StorageQuotaErrorCardProps {
  message: string;
  style?: CSSProperties;
}

export const StorageQuotaErrorCard: FC<StorageQuotaErrorCardProps> = ({ message, style }) => {
  const quota = parseStorageQuotaError(message);
  if (!quota) return null;

  return (
    <div style={{ ...q.card, ...style }} role="alert">
      <span style={q.icon}>!</span>
      <div>
        <div style={q.title}>Storage full</div>
        {quota.usageLabel && <div style={q.usage}>{quota.usageLabel} used</div>}
        <p style={q.copy}>
          TinyCloud storage is over its limit, so new writes are paused. Existing transcripts remain
          readable.
        </p>
        <details style={q.details}>
          <summary style={q.summary}>Technical details</summary>
          <div style={q.raw}>{quota.rawMessage}</div>
        </details>
      </div>
    </div>
  );
};

const FONT = "var(--lst-font)";
const MONO = "var(--lst-mono)";

const q: Record<string, CSSProperties> = {
  card: {
    fontFamily: FONT,
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "12px 16px",
    fontSize: 13,
    color: "var(--lst-blue)",
    background: "var(--lst-ink-08)",
    border: "var(--lst-border)",
    borderRadius: 0,
    lineHeight: 1.4,
  },
  icon: {
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
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--lst-blue)",
    marginBottom: 2,
  },
  usage: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-70)",
    marginBottom: 4,
  },
  copy: {
    margin: 0,
    color: "var(--lst-ink-70)",
  },
  details: {
    marginTop: 8,
    color: "var(--lst-ink-55)",
  },
  summary: {
    cursor: "pointer",
    fontSize: 12,
  },
  raw: {
    marginTop: 6,
    fontFamily: MONO,
    fontSize: 11,
    overflowWrap: "anywhere",
  },
};
