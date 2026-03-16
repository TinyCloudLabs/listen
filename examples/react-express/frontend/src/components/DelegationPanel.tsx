import { type FC, useCallback, useEffect, useState } from "react";
import type { TinyCloudWeb } from "@tinycloud/web-sdk";
import type { TokenStore } from "@tinyboilerplate/client";
import type { DelegationResponse, ServerInfo } from "@tinyboilerplate/core";
import {
  createDelegation,
  sendDelegation,
  checkDelegationStatus,
  revokeDelegation,
} from "@tinyboilerplate/client";

interface DelegationPanelProps {
  isSignedIn: boolean;
  tcw: TinyCloudWeb | null;
  tokenStore: TokenStore;
  backendUrl: string;
  userAddress: string | null;
  onStatusChange: (active: boolean) => void;
}

export const DelegationPanel: FC<DelegationPanelProps> = ({
  isSignedIn,
  tcw,
  tokenStore,
  backendUrl,
  userAddress,
  onStatusChange,
}) => {
  const [backendDID, setBackendDID] = useState<string | null>(null);
  const [delegation, setDelegation] = useState<DelegationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch backend DID on mount / sign-in ──────────────────────────

  useEffect(() => {
    if (!isSignedIn) {
      setBackendDID(null);
      setDelegation(null);
      return;
    }

    let cancelled = false;

    async function fetchServerInfo() {
      try {
        const res = await fetch(`${backendUrl}/api/server-info`);
        if (!res.ok) throw new Error(`Server info: ${res.statusText}`);
        const info: ServerInfo = await res.json();
        if (!cancelled) setBackendDID(info.did);
      } catch (err) {
        if (!cancelled) {
          setError(
            `Failed to reach backend: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }

    fetchServerInfo();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, backendUrl]);

  // ── Poll delegation status ────────────────────────────────────────

  useEffect(() => {
    if (!isSignedIn) return;

    const token = tokenStore.getAccessToken();
    if (!token) return;

    let cancelled = false;

    async function poll() {
      try {
        const status = await checkDelegationStatus(backendUrl, token!);
        if (!cancelled) {
          setDelegation(status);
          onStatusChange(status.status === "active");
        }
      } catch {
        // Silently ignore status check failures — may not have delegated yet
        if (!cancelled) {
          setDelegation(null);
          onStatusChange(false);
        }
      }
    }

    poll();
    const interval = setInterval(poll, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isSignedIn, tokenStore, backendUrl, onStatusChange]);

  // ── Grant delegation ──────────────────────────────────────────────

  const handleGrant = useCallback(async () => {
    if (!tcw || !backendDID) return;

    setLoading(true);
    setError(null);

    try {
      const token = tokenStore.getAccessToken();
      if (!token) throw new Error("No access token. Sign in first.");

      // Create delegation from user to backend
      const serialized = await createDelegation(tcw, backendDID);

      // Send it to the backend
      const result = await sendDelegation(backendUrl, serialized, token, userAddress ?? undefined);

      setDelegation(result);
      onStatusChange(result.status === "active");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [tcw, backendDID, tokenStore, backendUrl, onStatusChange]);

  // ── Revoke delegation ─────────────────────────────────────────────

  const handleRevoke = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = tokenStore.getAccessToken();
      if (!token) throw new Error("No access token.");

      await revokeDelegation(backendUrl, token);
      setDelegation(null);
      onStatusChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [tokenStore, backendUrl, onStatusChange]);

  // ── Render ────────────────────────────────────────────────────────

  const isActive = delegation?.status === "active";
  const isExpired = delegation?.status === "expired";

  return (
    <section
      style={{
        ...styles.panel,
        ...(isSignedIn ? {} : styles.panelDisabled),
      }}
    >
      <h2 style={styles.heading}>2. Delegation</h2>

      {!isSignedIn ? (
        <p style={styles.description}>Sign in first to manage delegations.</p>
      ) : (
        <>
          <p style={styles.description}>
            Grant the backend access to read and write items in your TinyCloud
            space.
          </p>

          {/* Status badge */}
          <div style={styles.statusRow}>
            <span style={styles.statusLabel}>Status:</span>
            <span
              style={{
                ...styles.badge,
                ...(isActive
                  ? styles.badgeActive
                  : isExpired
                    ? styles.badgeExpired
                    : styles.badgeNone),
              }}
            >
              {delegation?.status ?? "none"}
            </span>
            {delegation?.expiresAt && (
              <span style={styles.expiry}>
                Expires: {new Date(delegation.expiresAt).toLocaleString()}
              </span>
            )}
          </div>

          {isExpired && (
            <div style={styles.warning}>
              Your delegation has expired. Grant access again to continue.
            </div>
          )}

          {/* Backend DID */}
          {backendDID && (
            <div style={styles.didRow}>
              <span style={styles.statusLabel}>Backend DID:</span>
              <code style={styles.didValue}>
                {backendDID.length > 40
                  ? `${backendDID.slice(0, 20)}...${backendDID.slice(-12)}`
                  : backendDID}
              </code>
            </div>
          )}

          {/* Actions */}
          <div style={styles.actions}>
            {!isActive && (
              <button
                onClick={handleGrant}
                disabled={loading || !backendDID}
                style={{
                  ...styles.button,
                  ...(loading || !backendDID ? styles.buttonDisabled : {}),
                }}
              >
                {loading ? "Granting..." : "Grant Backend Access"}
              </button>
            )}
            {isActive && (
              <button
                onClick={handleRevoke}
                disabled={loading}
                style={{
                  ...styles.buttonDanger,
                  ...(loading ? styles.buttonDisabled : {}),
                }}
              >
                {loading ? "Revoking..." : "Revoke Access"}
              </button>
            )}
          </div>
        </>
      )}

      {error && <div style={styles.error}>{error}</div>}
    </section>
  );
};

// ── Styles ──────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  panel: {
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    padding: 20,
    background: "#fafafa",
  },
  panelDisabled: {
    opacity: 0.5,
    pointerEvents: "none",
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
  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "#555",
  },
  badge: {
    display: "inline-block",
    padding: "2px 10px",
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  badgeActive: {
    color: "#166534",
    background: "#dcfce7",
  },
  badgeExpired: {
    color: "#9a3412",
    background: "#fff7ed",
  },
  badgeNone: {
    color: "#555",
    background: "#f0f0f0",
  },
  expiry: {
    fontSize: 12,
    color: "#888",
  },
  warning: {
    padding: "8px 12px",
    fontSize: 13,
    color: "#9a3412",
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: 6,
    marginBottom: 12,
  },
  didRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  didValue: {
    fontSize: 12,
    color: "#1a1a1a",
    background: "#eee",
    padding: "2px 6px",
    borderRadius: 4,
    wordBreak: "break-all",
  },
  actions: {
    display: "flex",
    gap: 8,
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
  buttonDanger: {
    display: "inline-block",
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 600,
    color: "#fff",
    background: "#dc2626",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
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
