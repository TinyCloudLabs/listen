import { useEffect, useState, type FC } from "react";
import type { ApiClient } from "@tinyboilerplate/client";
import type { TinyCloudWeb } from "@tinycloud/web-sdk";

type SetupMode = "onboarding" | "sources";
type SetupStep =
  | "cards"
  | "fireflies-key"
  | "fireflies-test"
  | "fireflies-webhook"
  | "google-connect"
  | "google-success";

const FIREFLIES_SECRET_NAME = "FIREFLIES_API_KEY";
const VERIFY_RETRY_DELAYS_MS = [250, 750, 1500];

interface SourcesSetupProps {
  api: ApiClient;
  tcw: TinyCloudWeb;
  mode?: SetupMode;
  hasFirefliesKey?: boolean | null;
  hasBackendDelegation?: boolean | null;
  hasFirefliesBackendAccess?: boolean | null;
  hasGoogleMeet?: boolean | null;
  onEnsureBackendAccess: () => Promise<void>;
  onEnsureFirefliesBackendAccess: () => Promise<void>;
  onFirefliesComplete: () => void;
  onGoogleMeetComplete?: () => void;
  onDone?: () => void;
  backendUrl?: string;
  showGoogleMeet?: boolean;
}

interface UserInfo {
  name: string;
  email: string;
}

export const SourcesSetup: FC<SourcesSetupProps> = ({
  api,
  tcw,
  mode = "onboarding",
  hasFirefliesKey = null,
  hasBackendDelegation = null,
  hasFirefliesBackendAccess = null,
  hasGoogleMeet = null,
  onEnsureBackendAccess,
  onEnsureFirefliesBackendAccess,
  onFirefliesComplete,
  onGoogleMeetComplete,
  onDone,
  backendUrl = "",
  showGoogleMeet,
}) => {
  const [step, setStep] = useState<SetupStep>("cards");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const webhookUrl = `${backendUrl}/api/webhooks/fireflies`;
  const firefliesConnected =
    hasFirefliesKey === true && hasBackendDelegation === true && hasFirefliesBackendAccess === true;
  const firefliesNeedsAccess =
    hasFirefliesKey === true &&
    (hasBackendDelegation !== true || hasFirefliesBackendAccess !== true);
  const connectedCount = [firefliesConnected, hasGoogleMeet === true].filter(Boolean).length;
  const totalSources = showGoogleMeet ? 5 : 4;

  useEffect(() => {
    if (step !== "google-connect") return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "google-auth-success") {
        setStep("google-success");
        setConnecting(false);
        onGoogleMeetComplete?.();
      } else if (event.data?.type === "google-auth-error") {
        setGoogleError(event.data.message || "Authentication failed");
        setConnecting(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onGoogleMeetComplete, step]);

  const saveFirefliesKey = async () => {
    setSaving(true);
    setTestError(null);
    try {
      const unlockResult = await tcw.secrets.unlock();
      if (!unlockResult.ok) throw new Error(unlockResult.error.message);

      const putResult = await tcw.secrets.put(FIREFLIES_SECRET_NAME, apiKey.trim());
      if (!putResult.ok) throw new Error(putResult.error.message);

      await onEnsureFirefliesBackendAccess();
      const user = await verifyFirefliesUser(api);
      setUserInfo(user);
      setStep("fireflies-test");
    } catch (err) {
      setTestError(err instanceof Error ? err.message : String(err));
      setStep("fireflies-test");
    } finally {
      setSaving(false);
    }
  };

  const finishFirefliesAccess = async () => {
    setSaving(true);
    setTestError(null);
    try {
      await onEnsureFirefliesBackendAccess();
      const user = await verifyFirefliesUser(api);
      setUserInfo(user);
      setStep("fireflies-test");
    } catch (err) {
      setTestError(err instanceof Error ? err.message : String(err));
      setStep("fireflies-test");
    } finally {
      setSaving(false);
    }
  };

  const handleGoogleConnect = async () => {
    setConnecting(true);
    setGoogleError(null);
    try {
      if (hasBackendDelegation !== true) {
        await onEnsureBackendAccess();
      }
      const { authUrl } = await api.get<{ authUrl: string }>("/api/auth/google");
      window.open(authUrl, "google-auth", "width=500,height=600,popup=yes");
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : String(err));
      setConnecting(false);
    }
  };

  const detail = (() => {
    if (step === "fireflies-key") {
      return (
        <div style={s.detailPanel}>
          <span style={s.fieldLabel}>Fireflies API key</span>
          <p style={s.detailText}>
            Paste the key from Fireflies developer settings. It is stored in TinyCloud Secrets, then
            shared to the Listen backend for sync.
          </p>
          <input
            type="password"
            placeholder="Paste your Fireflies API key"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            style={s.input}
          />
          <div style={s.btnRow}>
            <button style={s.btnGhost} onClick={() => setStep("cards")}>
              Back
            </button>
            <button
              style={{ ...s.btnPrimary, ...(apiKey.trim() === "" || saving ? s.btnDisabled : {}) }}
              disabled={apiKey.trim() === "" || saving}
              onClick={saveFirefliesKey}
            >
              {saving ? "Connecting..." : "Save key and connect"}
            </button>
          </div>
        </div>
      );
    }

    if (step === "fireflies-test") {
      return (
        <div style={s.detailPanel}>
          {userInfo ? (
            <>
              <div style={s.successCard}>
                <span style={s.checkmark}>✓</span>
                <div>
                  <p style={s.successTitle}>Connected as {userInfo.name}</p>
                  <p style={s.successSub}>{userInfo.email}</p>
                </div>
              </div>
              <div style={s.btnRow}>
                <button style={s.btnGhost} onClick={() => setStep("fireflies-webhook")}>
                  Configure webhook
                </button>
                <button style={s.btnPrimary} onClick={onFirefliesComplete}>
                  Continue to inbox
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={s.errorCard}>{testError}</div>
              <div style={s.btnRow}>
                <button style={s.btnGhost} onClick={() => setStep("fireflies-key")}>
                  Edit key
                </button>
                {hasFirefliesKey && (
                  <button style={s.btnPrimary} onClick={finishFirefliesAccess} disabled={saving}>
                    {saving ? "Connecting..." : "Try access again"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      );
    }

    if (step === "fireflies-webhook") {
      return (
        <div style={s.detailPanel}>
          <span style={s.fieldLabel}>Webhook URL</span>
          <div style={s.urlRow}>
            <code style={s.urlCode}>{webhookUrl}</code>
            <button
              style={s.btnSmall}
              onClick={() => {
                navigator.clipboard.writeText(webhookUrl);
                setUrlCopied(true);
                setTimeout(() => setUrlCopied(false), 2000);
              }}
            >
              {urlCopied ? "Copied" : "Copy"}
            </button>
          </div>
          <span style={s.fieldLabel}>Webhook secret</span>
          <div style={s.btnRow}>
            <input
              type="text"
              placeholder="16-32 characters"
              value={webhookSecret}
              onChange={(event) => {
                setWebhookSecret(event.target.value);
                setWebhookError(null);
                setWebhookSaved(false);
              }}
              style={{ ...s.input, margin: 0 }}
            />
            <button
              style={s.btnGhost}
              onClick={() => {
                const arr = new Uint8Array(24);
                crypto.getRandomValues(arr);
                setWebhookSecret(
                  Array.from(arr, (b) => b.toString(36).padStart(2, "0"))
                    .join("")
                    .slice(0, 32),
                );
                setWebhookError(null);
                setWebhookSaved(false);
              }}
            >
              Generate
            </button>
          </div>
          {webhookError && <div style={s.errorCard}>{webhookError}</div>}
          {webhookSaved && <div style={s.successInline}>Webhook secret saved</div>}
          <div style={s.btnRow}>
            <button style={s.btnGhost} onClick={onFirefliesComplete}>
              Skip
            </button>
            <button
              style={{
                ...s.btnPrimary,
                ...(webhookSecret.length < 16 || webhookSaving ? s.btnDisabled : {}),
              }}
              disabled={webhookSecret.length < 16 || webhookSaving}
              onClick={async () => {
                setWebhookSaving(true);
                setWebhookError(null);
                try {
                  await api.put("/api/config/webhook-secret", { secret: webhookSecret });
                  setWebhookSaved(true);
                } catch (err) {
                  setWebhookError(err instanceof Error ? err.message : String(err));
                } finally {
                  setWebhookSaving(false);
                }
              }}
            >
              {webhookSaving ? "Saving..." : "Save secret"}
            </button>
            {webhookSaved && (
              <button style={s.btnPrimary} onClick={onFirefliesComplete}>
                Continue
              </button>
            )}
          </div>
        </div>
      );
    }

    if (step === "google-connect" || step === "google-success") {
      return (
        <div style={s.detailPanel}>
          <span style={s.fieldLabel}>Google Meet</span>
          <p style={s.detailText}>
            Connect Google to sync transcripts from Meet recordings and captions.
          </p>
          {googleError && <div style={s.errorCard}>{googleError}</div>}
          {step === "google-success" && !googleError && (
            <div style={s.successCard}>
              <span style={s.checkmark}>✓</span>
              <div>
                <p style={s.successTitle}>Google account connected</p>
                <p style={s.successSub}>Google Meet can now sync into your inbox.</p>
              </div>
            </div>
          )}
          <div style={s.btnRow}>
            <button style={s.btnGhost} onClick={() => setStep("cards")}>
              Back
            </button>
            <button style={s.btnPrimary} disabled={connecting} onClick={handleGoogleConnect}>
              {connecting ? "Connecting..." : "Connect Google"}
            </button>
          </div>
        </div>
      );
    }

    return null;
  })();

  return (
    <section style={s.shell}>
      <div style={s.leftPane}>
        <div style={s.leftContent}>
          <span style={s.eyebrow}>- {mode === "onboarding" ? "welcome to listen" : "sources"}</span>
          <h3 style={s.title}>
            {mode === "onboarding" ? "Connect what you already have." : "Add another source."}
          </h3>
          <p style={s.copy}>
            Listen pulls transcripts in from the tools you already use. We store source credentials
            in TinyCloud Secrets and only delegate the backend after a provider is ready.
          </p>

          <div style={s.divider} />

          <span style={s.fieldLabel}>What happens next</span>
          <ol style={s.steps}>
            <li>Check backend access and source credentials separately</li>
            <li>Store provider tokens in TinyCloud Secrets</li>
            <li>Delegate sync access only after the source is connected</li>
          </ol>

          <div style={s.footerSteps}>
            <span style={s.progressDots}>
              <span style={s.progressDotActive} />
              <span style={connectedCount > 0 ? s.progressDotActive : s.progressDot} />
            </span>
            <span>1 account</span>
            <span>-</span>
            <span>{connectedCount || "0"} sources</span>
            <span>-</span>
            <span>inbox</span>
          </div>
        </div>
      </div>

      <div style={s.rightPane}>
        <div style={s.sourcesHeader}>
          <span style={s.fieldLabel}>- pick at least one</span>
          <span style={s.fieldLabel}>
            {connectedCount} of {totalSources} connected
          </span>
        </div>

        <div style={s.sourceList}>
          <SourceCard
            title="Fireflies"
            meta="meeting bot - webhook"
            description={
              firefliesNeedsAccess
                ? "API key saved. Backend access is still needed."
                : "Pull from your Fireflies workspace."
            }
            detail="workspace oauth"
            connected={firefliesConnected}
            actionLabel={
              firefliesConnected
                ? "Connected"
                : firefliesNeedsAccess
                  ? "Finish setup ->"
                  : "Connect ->"
            }
            disabled={saving || firefliesConnected}
            onAction={() => {
              if (firefliesConnected) return;
              if (firefliesNeedsAccess) {
                void finishFirefliesAccess();
                return;
              }
              setStep("fireflies-key");
            }}
          />

          {showGoogleMeet && (
            <SourceCard
              title="Google Meet"
              meta="caption sync"
              description={
                hasBackendDelegation === true
                  ? "Pulls captions and recordings from Google."
                  : "Backend access will be delegated before OAuth."
              }
              detail="google oauth"
              connected={hasGoogleMeet === true}
              actionLabel={hasGoogleMeet === true ? "Connected" : "Connect ->"}
              disabled={hasGoogleMeet === true}
              onAction={() => setStep("google-connect")}
            />
          )}

          <SourceCard
            title="Granola"
            meta="desktop - realtime"
            description="Push every meeting Granola records."
            detail="coming soon"
            actionLabel="Soon"
            disabled
          />
          <SourceCard
            title="Otter.ai"
            meta="api - backfill"
            description="Every Otter recording, summarized."
            detail="coming soon"
            actionLabel="Soon"
            disabled
          />
          <SourceCard
            title="Audio import"
            meta="whisper - diarized"
            description="Drag .m4a/.mp3/.wav into the inbox."
            detail="no setup"
            actionLabel="Drop a file ->"
            disabled
          />
        </div>

        {detail}

        <div style={s.actionsFooter}>
          <button style={s.btnGhost} onClick={() => setStep("cards")}>
            Back
          </button>
          <span style={s.footerRule} />
          <button style={s.btnGhost} disabled>
            Explore with sample data
          </button>
          <button
            style={{
              ...s.btnPrimary,
              ...(connectedCount === 0 ? s.btnDisabled : {}),
            }}
            disabled={connectedCount === 0}
            onClick={onDone}
          >
            Continue to inbox &rarr;
          </button>
        </div>
      </div>
    </section>
  );
};

function SourceCard({
  title,
  meta,
  description,
  detail,
  connected,
  disabled,
  actionLabel,
  onAction,
}: {
  title: string;
  meta: string;
  description: string;
  detail: string;
  connected?: boolean;
  disabled?: boolean;
  actionLabel: string;
  onAction?: () => void;
}) {
  return (
    <div style={s.sourceCard}>
      <span style={connected ? s.sourceRadioConnected : s.sourceRadio} />
      <div style={s.sourceBody}>
        <div style={s.sourceTitleRow}>
          <strong style={s.sourceTitle}>{title}</strong>
          <span style={s.sourceMeta}>- {meta}</span>
        </div>
        <p style={s.sourceDesc}>{description}</p>
        <span style={s.sourceDetail}>{detail}</span>
      </div>
      <button style={connected ? s.btnConnected : s.btnCard} disabled={disabled} onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}

async function verifyFirefliesUser(api: ApiClient): Promise<UserInfo> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= VERIFY_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await api.get<UserInfo>("/api/fireflies/user");
    } catch (err) {
      lastError = err;
      if (!isMissingSecretError(err) || attempt === VERIFY_RETRY_DELAYS_MS.length) break;
      await delay(VERIFY_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError;
}

function isMissingSecretError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const message = err.message.toLowerCase();
  return (
    message.includes("no fireflies api key configured") ||
    message.includes("grant_not_found") ||
    message.includes("key_not_found") ||
    message.includes("storage_error")
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const FONT = "var(--lst-font)";
const MONO = "var(--lst-mono)";

const s: Record<string, React.CSSProperties> = {
  shell: {
    fontFamily: FONT,
    display: "grid",
    gridTemplateColumns: "1fr 1.1fr",
    minHeight: 560,
    background: "var(--lst-bg)",
    border: "var(--lst-border)",
    animation: "fadeSlideIn 0.3s ease-out",
  },
  leftPane: {
    borderRight: "var(--lst-border)",
    display: "flex",
    alignItems: "center",
    padding: "48px",
  },
  leftContent: {
    maxWidth: 460,
  },
  eyebrow: {
    fontFamily: MONO,
    fontSize: 10,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  title: {
    fontSize: 42,
    lineHeight: 0.95,
    fontWeight: 400,
    color: "var(--lst-blue)",
    margin: "16px 0 20px",
    letterSpacing: 0,
  },
  copy: {
    fontSize: 15,
    lineHeight: 1.55,
    color: "var(--lst-blue)",
    margin: 0,
  },
  divider: {
    height: 1,
    background: "var(--lst-blue)",
    opacity: 0.8,
    margin: "26px 0 16px",
  },
  steps: {
    fontSize: 13,
    lineHeight: 1.9,
    color: "var(--lst-blue)",
    margin: "10px 0 0",
    paddingLeft: 18,
  },
  footerSteps: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 42,
    fontFamily: MONO,
    fontSize: 10,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  progressDots: {
    display: "inline-flex",
    gap: 5,
  },
  progressDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    background: "var(--lst-ink-20)",
    display: "inline-block",
  },
  progressDotActive: {
    width: 18,
    height: 7,
    borderRadius: 999,
    background: "var(--lst-blue)",
    display: "inline-block",
  },
  rightPane: {
    padding: "34px 38px",
  },
  sourcesHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sourceList: {
    display: "grid",
    gap: 8,
  },
  sourceCard: {
    display: "grid",
    gridTemplateColumns: "28px 1fr auto",
    alignItems: "center",
    gap: 12,
    minHeight: 74,
    border: "var(--lst-border)",
    background: "transparent",
    padding: "12px 14px",
  },
  sourceRadio: {
    width: 19,
    height: 19,
    borderRadius: 999,
    border: "1px solid var(--lst-blue)",
    display: "inline-block",
    position: "relative",
  },
  sourceRadioConnected: {
    width: 19,
    height: 19,
    borderRadius: 999,
    border: "1px solid var(--lst-blue)",
    display: "inline-block",
    background: "radial-gradient(circle, var(--lst-blue) 0 3px, transparent 4px)",
  },
  sourceBody: {
    minWidth: 0,
  },
  sourceTitleRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
    flexWrap: "wrap" as const,
  },
  sourceTitle: {
    color: "var(--lst-blue)",
    fontSize: 14,
    fontWeight: 600,
  },
  sourceMeta: {
    fontFamily: MONO,
    fontSize: 9,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  sourceDesc: {
    color: "var(--lst-ink-70)",
    fontSize: 12,
    margin: "4px 0",
    lineHeight: 1.4,
  },
  sourceDetail: {
    fontFamily: MONO,
    fontSize: 9,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  detailPanel: {
    marginTop: 12,
    border: "var(--lst-border)",
    padding: "16px",
    background: "var(--lst-ink-08)",
    display: "grid",
    gap: 10,
  },
  detailText: {
    fontSize: 13,
    lineHeight: 1.5,
    color: "var(--lst-ink-70)",
    margin: 0,
  },
  fieldLabel: {
    fontFamily: MONO,
    fontSize: 10,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  input: {
    fontFamily: FONT,
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box" as const,
    border: "var(--lst-border)",
    background: "var(--lst-bg)",
    color: "var(--lst-blue)",
    fontSize: 14,
    padding: "10px 12px",
  },
  urlRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  urlCode: {
    fontFamily: MONO,
    flex: 1,
    minWidth: 0,
    border: "var(--lst-border)",
    background: "var(--lst-bg)",
    color: "var(--lst-blue)",
    padding: "9px 10px",
    fontSize: 11,
    wordBreak: "break-all" as const,
  },
  actionsFooter: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
  },
  footerRule: {
    height: 1,
    flex: 1,
    background: "var(--lst-ink-20)",
  },
  btnRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap" as const,
  },
  btnPrimary: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 600,
    color: "var(--lst-bg)",
    background: "var(--lst-blue)",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "8px 15px",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  btnGhost: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 500,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "7px 14px",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  btnSmall: {
    fontFamily: FONT,
    fontSize: 12,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "7px 12px",
    cursor: "pointer",
  },
  btnCard: {
    fontFamily: FONT,
    fontSize: 12,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "7px 13px",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  btnConnected: {
    fontFamily: FONT,
    fontSize: 12,
    color: "var(--lst-bg)",
    background: "var(--lst-blue)",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "7px 13px",
    whiteSpace: "nowrap" as const,
  },
  btnDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
  successCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    border: "var(--lst-border)",
    background: "var(--lst-bg)",
    padding: "12px 14px",
  },
  checkmark: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 22,
    height: 22,
    borderRadius: 999,
    background: "var(--lst-blue)",
    color: "var(--lst-bg)",
    fontSize: 13,
    fontWeight: 700,
  },
  successTitle: {
    color: "var(--lst-blue)",
    fontSize: 13,
    fontWeight: 600,
    margin: 0,
  },
  successSub: {
    color: "var(--lst-ink-70)",
    fontSize: 12,
    margin: "2px 0 0",
  },
  successInline: {
    fontSize: 12,
    color: "var(--lst-blue)",
  },
  errorCard: {
    fontSize: 12,
    color: "var(--lst-blue)",
    border: "var(--lst-border)",
    background: "var(--lst-bg)",
    padding: "10px 12px",
    lineHeight: 1.4,
  },
};
