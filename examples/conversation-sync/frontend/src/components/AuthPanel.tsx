import type { FC } from "react";

interface AuthPanelProps {
  isSignedIn: boolean;
  address: string | null;
  did: string | null;
  loading: boolean;
  error: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

function truncate(str: string, headLen: number, tailLen: number): string {
  if (str.length <= headLen + tailLen + 3) return str;
  return `${str.slice(0, headLen)}\u2026${str.slice(-tailLen)}`;
}

export const AuthPanel: FC<AuthPanelProps> = ({
  isSignedIn,
  address,
  did,
  loading,
  error,
  onSignIn,
  onSignOut,
}) => {
  return (
    <section style={s.card}>
      {!isSignedIn ? (
        <div style={s.signedOutContent}>
          <div>
            <span style={s.sectionLabel}>Connect</span>
            <p style={s.description}>
              Sign in with OpenKey to connect your wallet and start syncing.
            </p>
          </div>
          <button
            onClick={onSignIn}
            disabled={loading}
            style={{ ...s.btnPrimary, ...(loading ? s.btnDisabled : {}) }}
          >
            {loading ? "Connecting\u2026" : "Sign in with OpenKey"}
          </button>
        </div>
      ) : (
        <div style={s.signedInContent}>
          <div style={s.statusRow}>
            <span style={s.statusDot} />
            <span style={s.statusText}>Connected</span>
          </div>
          <div style={s.infoRow}>
            <span style={s.infoLabel}>Address</span>
            <code style={s.infoValue}>{truncate(address ?? "", 8, 6)}</code>
          </div>
          <div style={s.infoRow}>
            <span style={s.infoLabel}>DID</span>
            <code style={s.infoValue}>{truncate(did ?? "", 18, 8)}</code>
          </div>
<<<<<<< HEAD
<<<<<<< HEAD
          <button onClick={onSignOut} style={s.btnGhost}>
            Sign Out
          </button>
=======
          <button onClick={onSignOut} style={s.btnGhost}>Sign Out</button>
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
=======
          <button onClick={onSignOut} style={s.btnGhost}>
            Sign Out
          </button>
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
        </div>
      )}

      {error && (
        <div style={s.errorCard}>
          <span style={s.errorIcon}>!</span>
          <span>{error}</span>
        </div>
      )}
    </section>
  );
};

// ── Styles ──────────────────────────────────────────────────────────

const FONT = "'Outfit', -apple-system, sans-serif";
const MONO = "'IBM Plex Mono', 'SF Mono', monospace";

const s: Record<string, React.CSSProperties> = {
  card: {
    fontFamily: FONT,
    background: "#fff",
    border: "1px solid #e2e4e9",
    borderLeft: "3px solid #6366f1",
    borderRadius: 12,
    padding: "18px 20px",
    animation: "fadeSlideIn 0.3s ease-out",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#9ca3af",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  },
  description: {
    fontSize: 14,
    color: "#6b7280",
    margin: "6px 0 0",
    lineHeight: 1.5,
  },
  signedOutContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  signedInContent: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#10b981",
    display: "inline-block",
    animation: "syncPulse 2.5s ease-in-out infinite",
  },
  statusText: {
    fontSize: 12,
    fontWeight: 600,
    color: "#059669",
    letterSpacing: "0.01em",
  },
  infoRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#9ca3af",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    minWidth: 52,
  },
  infoValue: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: 400,
    color: "#374151",
    background: "#f3f4f6",
    padding: "3px 8px",
    borderRadius: 4,
    wordBreak: "break-all" as const,
  },
  btnPrimary: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: 600,
    color: "#fff",
    background: "#18181b",
    border: "none",
    borderRadius: 8,
    padding: "10px 20px",
    cursor: "pointer",
    letterSpacing: "-0.01em",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  btnGhost: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 500,
    color: "#6b7280",
    background: "transparent",
    border: "1px solid #e2e4e9",
    borderRadius: 8,
    padding: "6px 14px",
    cursor: "pointer",
    alignSelf: "flex-start",
    marginTop: 4,
  },
  errorCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 14,
    padding: "10px 14px",
    fontSize: 13,
    color: "#991b1b",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 8,
    lineHeight: 1.4,
  },
  errorIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#ef4444",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  },
};
