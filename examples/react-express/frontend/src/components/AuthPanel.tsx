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
    <section style={styles.panel}>
      <h2 style={styles.heading}>1. Authentication</h2>

      {!isSignedIn ? (
        <>
          <p style={styles.description}>
            Sign in with OpenKey to connect your wallet and create a TinyCloud
            session.
          </p>
          <button
            onClick={onSignIn}
            disabled={loading}
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {}),
            }}
          >
            {loading ? "Signing in..." : "Sign in with OpenKey"}
          </button>
        </>
      ) : (
        <>
          <div style={styles.infoGrid}>
            <InfoRow label="Status" value="Connected" />
            <InfoRow label="Address" value={truncate(address ?? "", 8, 6)} />
            <InfoRow label="DID" value={truncate(did ?? "", 20, 8)} />
          </div>
          <button onClick={onSignOut} style={styles.buttonSecondary}>
            Sign Out
          </button>
        </>
      )}

      {error && <div style={styles.error}>{error}</div>}
    </section>
  );
};

// ── Helpers ─────────────────────────────────────────────────────────

function truncate(str: string, headLen: number, tailLen: number): string {
  if (str.length <= headLen + tailLen + 3) return str;
  return `${str.slice(0, headLen)}...${str.slice(-tailLen)}`;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.infoLabel}>{label}</span>
      <code style={styles.infoValue}>{value}</code>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  panel: {
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    padding: 20,
    background: "#fafafa",
  },
  heading: {
    fontSize: 16,
    fontWeight: 600,
    margin: "0 0 12px",
  },
  description: {
    fontSize: 14,
    color: "#555",
    margin: "0 0 16px",
  },
  button: {
    display: "inline-block",
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 600,
    color: "#fff",
    background: "#2563eb",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  buttonSecondary: {
    display: "inline-block",
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 500,
    color: "#555",
    background: "#fff",
    border: "1px solid #ccc",
    borderRadius: 6,
    cursor: "pointer",
    marginTop: 12,
  },
  infoGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 4,
  },
  infoRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "#555",
    minWidth: 60,
  },
  infoValue: {
    fontSize: 13,
    color: "#1a1a1a",
    background: "#eee",
    padding: "2px 6px",
    borderRadius: 4,
    wordBreak: "break-all",
  },
  error: {
    marginTop: 12,
    padding: "8px 12px",
    fontSize: 13,
    color: "#b91c1c",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 6,
  },
};
