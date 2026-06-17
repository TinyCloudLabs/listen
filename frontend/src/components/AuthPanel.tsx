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
            <span style={s.sectionLabel}>· connect</span>
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
          <button onClick={onSignOut} style={s.btnGhost}>
            Sign Out
          </button>
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

const FONT = "var(--lst-font)";
const MONO = "var(--lst-mono)";

const s: Record<string, React.CSSProperties> = {
  card: {
    fontFamily: FONT,
    background: "transparent",
    borderBottom: "var(--lst-border)",
    padding: "16px 20px",
    animation: "fadeSlideIn 0.3s ease-out",
  },
  sectionLabel: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: 500,
    color: "var(--lst-ink-55)",
    textTransform: "lowercase" as const,
    letterSpacing: "0.06em",
  },
  description: {
    fontSize: 13,
    color: "var(--lst-ink-70)",
    margin: "7px 0 0",
    lineHeight: 1.5,
  },
  signedOutContent: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "stretch",
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
    background: "var(--lst-blue)",
    display: "inline-block",
    animation: "syncPulse 2.5s ease-in-out infinite",
  },
  statusText: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: 500,
    color: "var(--lst-blue)",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  infoRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  infoLabel: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: 500,
    color: "var(--lst-ink-55)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    minWidth: 52,
  },
  infoValue: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: 400,
    color: "var(--lst-blue)",
    background: "var(--lst-ink-08)",
    padding: "3px 0",
    wordBreak: "break-all" as const,
  },
  btnPrimary: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: 600,
    color: "var(--lst-bg)",
    background: "var(--lst-blue)",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "10px 20px",
    cursor: "pointer",
    letterSpacing: 0,
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
    color: "var(--lst-blue)",
    background: "transparent",
    border: "var(--lst-border)",
    borderRadius: 999,
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
    color: "var(--lst-blue)",
    background: "var(--lst-ink-08)",
    border: "var(--lst-border)",
    borderRadius: 0,
    lineHeight: 1.4,
  },
  errorIcon: {
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
};
