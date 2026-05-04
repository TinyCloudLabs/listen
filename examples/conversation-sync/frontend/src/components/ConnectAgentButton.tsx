import { useState, type FC } from "react";
import { createManifestDelegation } from "@tinyboilerplate/client";
import type { ServerInfo } from "@tinyboilerplate/core";
import type { ComposedManifestRequest, TinyCloudWeb } from "@tinycloud/web-sdk";

interface ConnectAgentButtonProps {
  tcw: TinyCloudWeb;
  capabilityRequest: ComposedManifestRequest;
  agentInfo?: ServerInfo | null;
  agentEndpoint?: string;
  opencodeUrl?: string;
  onRefresh?: () => void;
  refreshLabel?: string;
}

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "connected" }
  | { kind: "error"; message: string }
  | { kind: "endpoint_unreachable"; serialized: string };

const DEFAULT_AGENT_ENDPOINT = import.meta.env.VITE_AGENT_ENDPOINT || "http://localhost:4097";
// OpenCode encodes the project path as base64url in the URL; linking directly
// to the /workspace session avoids the root project picker (which shows
// container `/` on fresh boots and hides the app's CLAUDE.md + `tc-agent` CLI).
// btoa("/workspace").replace(/=/g, "") === "L3dvcmtzcGFjZQ".
const DEFAULT_OPENCODE_URL = "http://localhost:4096/L3dvcmtzcGFjZQ";

export const ConnectAgentButton: FC<ConnectAgentButtonProps> = ({
  tcw,
  capabilityRequest,
  agentInfo,
  agentEndpoint = DEFAULT_AGENT_ENDPOINT,
  opencodeUrl = DEFAULT_OPENCODE_URL,
  onRefresh,
  refreshLabel = "Refresh",
}) => {
  const [agentDid, setAgentDid] = useState(agentInfo?.did ?? "");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [copied, setCopied] = useState(false);

  async function handleConnect() {
    const trimmed = agentDid.trim();
    if (!/^did:(pkh|key):/.test(trimmed)) {
      setStatus({
        kind: "error",
        message: "Enter a DID starting with did:pkh: or did:key:",
      });
      return;
    }

    setStatus({ kind: "submitting" });

    let serialized: string;
    try {
      const result = await createManifestDelegation(tcw, trimmed, capabilityRequest);
      serialized = result.serialized;
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    try {
      const res = await fetch(`${agentEndpoint}/delegation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialized }),
      });
      if (!res.ok) throw new Error(`Endpoint returned ${res.status}`);
      setStatus({ kind: "connected" });
    } catch {
      setStatus({ kind: "endpoint_unreachable", serialized });
    }
  }

  function handleDisconnect() {
    setAgentDid("");
    setStatus({ kind: "idle" });
    setCopied(false);
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard denied — user can still select + copy manually
    }
  }

  const isSubmitting = status.kind === "submitting";
  const isConnected = status.kind === "connected";

  return (
    <section style={s.card}>
      <div style={s.header}>
        <div>
          <span style={s.sectionLabel}>Agent</span>
          <p style={s.description}>
            {isConnected
              ? "An agent with access to your conversations is connected."
              : "Copy the agent DID from your docker logs and paste it below to give an OpenCode agent read/write access to this space for 7 days."}
          </p>
        </div>
      </div>

      {isConnected ? (
        <div style={s.connectedBlock}>
          <div style={s.statusRow}>
            <span style={s.statusDot} />
            <span style={s.statusText}>Agent connected</span>
          </div>
          <p style={s.connectedCopy}>
            Open the agent at{" "}
            <a href={opencodeUrl} target="_blank" rel="noreferrer" style={s.link}>
              {opencodeUrl}
            </a>
          </p>
          <div style={s.buttonRow}>
            <button onClick={handleDisconnect} style={s.btnGhost}>
              Disconnect
            </button>
            {onRefresh && (
              <button onClick={onRefresh} style={s.btnGhost}>
                {refreshLabel}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={s.form}>
          <input
            type="text"
            placeholder="did:pkh:eip155:1:0x…"
            value={agentDid}
            onChange={(e) => {
              setAgentDid(e.target.value);
              if (status.kind === "error" || status.kind === "endpoint_unreachable") {
                setStatus({ kind: "idle" });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isSubmitting) handleConnect();
            }}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            style={s.input}
          />
          <div style={s.buttonRow}>
            <button
              onClick={handleConnect}
              disabled={isSubmitting || !agentDid.trim()}
              style={{
                ...s.btnPrimary,
                ...(isSubmitting || !agentDid.trim() ? s.btnDisabled : {}),
              }}
            >
              {isSubmitting ? "Connecting…" : "Connect Agent"}
            </button>
            {onRefresh && (
              <button onClick={onRefresh} style={s.btnGhost}>
                {refreshLabel}
              </button>
            )}
          </div>
        </div>
      )}

      {status.kind === "error" && (
        <div style={s.errorCard}>
          <span style={s.errorIcon}>!</span>
          <span>{status.message}</span>
        </div>
      )}

      {status.kind === "endpoint_unreachable" && (
        <div style={s.fallbackCard}>
          <div style={s.fallbackHeader}>
            <span style={s.warnIcon}>!</span>
            <span>
              Couldn't reach the agent container at <code style={s.inline}>{agentEndpoint}</code>.
              Copy this delegation and paste it into the container's{" "}
              <code style={s.inline}>/root/.tc-agent/delegation.txt</code> manually.
            </span>
          </div>
          <textarea
            readOnly
            value={status.serialized}
            onClick={(e) => (e.currentTarget as HTMLTextAreaElement).select()}
            style={s.fallbackValue}
          />
          <div style={s.buttonRow}>
            <button
              onClick={() =>
                status.kind === "endpoint_unreachable" && handleCopy(status.serialized)
              }
              style={s.btnGhost}
            >
              {copied ? "Copied" : "Copy to clipboard"}
            </button>
            <button onClick={handleDisconnect} style={s.btnGhost}>
              Dismiss
            </button>
          </div>
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
    borderLeft: "3px solid #10b981",
    borderRadius: 12,
    padding: "18px 20px",
    animation: "fadeSlideIn 0.3s ease-out",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 14,
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
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  },
  input: {
    fontFamily: MONO,
    fontSize: 13,
    color: "#1f2937",
    background: "#f9fafb",
    border: "1px solid #e2e4e9",
    borderRadius: 8,
    padding: "10px 12px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  buttonRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap" as const,
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
  },
  connectedBlock: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
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
  connectedCopy: {
    fontSize: 13,
    color: "#374151",
    margin: 0,
    lineHeight: 1.5,
  },
  link: {
    fontFamily: MONO,
    fontSize: 12,
    color: "#10b981",
    textDecoration: "none",
    fontWeight: 500,
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
  fallbackCard: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
    marginTop: 14,
    padding: "12px 14px",
    fontSize: 13,
    color: "#92400e",
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: 8,
    lineHeight: 1.5,
  },
  fallbackHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
  },
  warnIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#f59e0b",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  },
  fallbackValue: {
    fontFamily: MONO,
    fontSize: 11,
    color: "#1f2937",
    background: "#fff",
    border: "1px solid #fde68a",
    borderRadius: 6,
    padding: "8px 10px",
    minHeight: 80,
    width: "100%",
    resize: "vertical" as const,
    boxSizing: "border-box" as const,
    wordBreak: "break-all" as const,
  },
  inline: {
    fontFamily: MONO,
    fontSize: 11,
    background: "rgba(0,0,0,0.05)",
    padding: "1px 4px",
    borderRadius: 3,
  },
};
