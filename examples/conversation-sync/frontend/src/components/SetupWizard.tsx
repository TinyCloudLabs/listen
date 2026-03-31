import { useState, useEffect, type FC } from "react";
import type { ApiClient } from "@tinyboilerplate/client";

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
type Step = "welcome" | "instructions" | "input" | "test" | "webhook" | "done";

const STEPS: Step[] = ["welcome", "instructions", "input", "test", "webhook", "done"];
<<<<<<< HEAD
=======
type Step = "welcome" | "instructions" | "input" | "test" | "done";
>>>>>>> 6a82158 (TC-1305: Build SetupWizard component (5-step guided API key onboarding))
=======
type Step = "welcome" | "instructions" | "input" | "test" | "webhook" | "done";
>>>>>>> 64c2d6d (TC-1315: Add Setup Wizard Step 3 for webhook configuration)
=======
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
=======
type Step =
  | "picker"
  | "welcome"
  | "instructions"
  | "input"
  | "test"
  | "webhook"
  | "done"
  | "google-connect"
  | "google-success";

const FIREFLIES_STEPS: Step[] = ["welcome", "instructions", "input", "test", "webhook", "done"];
>>>>>>> c024b29 (TC-1326: Frontend source picker, Google OAuth popup, sync control, source filter)

interface SetupWizardProps {
  api: ApiClient;
  onComplete: () => void;
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  backendUrl?: string;
=======
>>>>>>> 6a82158 (TC-1305: Build SetupWizard component (5-step guided API key onboarding))
=======
  backendUrl?: string;
>>>>>>> 64c2d6d (TC-1315: Add Setup Wizard Step 3 for webhook configuration)
=======
  onGoogleMeetComplete?: () => void;
  backendUrl?: string;
  showGoogleMeet?: boolean;
<<<<<<< HEAD
>>>>>>> c024b29 (TC-1326: Frontend source picker, Google OAuth popup, sync control, source filter)
=======
  initialSource?: "fireflies" | "google-meet";
>>>>>>> 5f9bdb2 (fix: setup wizard visibility when one source connected + KV token parsing)
}

interface UserInfo {
  name: string;
  email: string;
}

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
export const SetupWizard: FC<SetupWizardProps> = ({ api, onComplete, backendUrl = "" }) => {
=======
export const SetupWizard: FC<SetupWizardProps> = ({ api, onComplete }) => {
>>>>>>> 6a82158 (TC-1305: Build SetupWizard component (5-step guided API key onboarding))
=======
export const SetupWizard: FC<SetupWizardProps> = ({ api, onComplete, backendUrl = "" }) => {
>>>>>>> 64c2d6d (TC-1315: Add Setup Wizard Step 3 for webhook configuration)
  const [step, setStep] = useState<Step>("welcome");
=======
export const SetupWizard: FC<SetupWizardProps> = ({
  api,
  onComplete,
  onGoogleMeetComplete,
  backendUrl = "",
  showGoogleMeet,
  initialSource,
}) => {
<<<<<<< HEAD
  const [step, setStep] = useState<Step>("picker");
>>>>>>> c024b29 (TC-1326: Frontend source picker, Google OAuth popup, sync control, source filter)
=======
  const [step, setStep] = useState<Step>(
    initialSource === "google-meet" ? "google-connect" : initialSource === "fireflies" ? "welcome" : "picker",
  );
>>>>>>> 5f9bdb2 (fix: setup wizard visibility when one source connected + KV token parsing)
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
  // Webhook state
>>>>>>> 64c2d6d (TC-1315: Add Setup Wizard Step 3 for webhook configuration)
=======
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  // Google OAuth state
  const [connecting, setConnecting] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const webhookUrl = `${backendUrl}/api/webhooks/fireflies`;
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
  const stepIndex = STEPS.indexOf(step);
=======
  const stepIndex = FIREFLIES_STEPS.indexOf(step);
  const isFirefliesFlow = stepIndex >= 0;

  // Listen for postMessage from Google OAuth popup
  useEffect(() => {
    if (step !== "google-connect") return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "google-auth-success") {
        setStep("google-success");
        setConnecting(false);
      } else if (event.data?.type === "google-auth-error") {
        setGoogleError(event.data.message || "Authentication failed");
        setConnecting(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [step]);
>>>>>>> c024b29 (TC-1326: Frontend source picker, Google OAuth popup, sync control, source filter)

=======
>>>>>>> 6a82158 (TC-1305: Build SetupWizard component (5-step guided API key onboarding))
=======

>>>>>>> 64c2d6d (TC-1315: Add Setup Wizard Step 3 for webhook configuration)
  const handleSave = async () => {
    setSaving(true);
    setTestError(null);
    try {
      await api.put("/api/config/fireflies-key", { apiKey });
      const user = await api.get<UserInfo>("/api/fireflies/user");
      setUserInfo(user);
      setStep("test");
    } catch (err) {
      setTestError(err instanceof Error ? err.message : String(err));
      setStep("test");
    } finally {
      setSaving(false);
    }
  };

  const handleGoogleConnect = async () => {
    setConnecting(true);
    setGoogleError(null);
    try {
      const { authUrl } = await api.get<{ authUrl: string }>("/api/auth/google");
      window.open(authUrl, "google-auth", "width=500,height=600,popup=yes");
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : String(err));
      setConnecting(false);
    }
  };

  return (
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
    <section style={s.card}>
      {/* Step dots — only for Fireflies flow */}
      {isFirefliesFlow && (
        <div style={s.stepDots}>
          {FIREFLIES_STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                ...s.dot,
                ...(i <= stepIndex ? s.dotActive : {}),
                ...(i === stepIndex ? s.dotCurrent : {}),
              }}
            />
          ))}
        </div>
      )}

      {/* ── Source Picker ─────────────────────────────────────────── */}

      {step === "picker" && (
        <div style={s.stepContent}>
          <h3 style={s.stepTitle}>Connect a Source</h3>
          <p style={s.stepDesc}>Choose a transcript source to get started.</p>
          <div style={s.pickerRow}>
            <div style={s.pickerCard}>
              <h4 style={s.pickerCardTitle}>Fireflies</h4>
              <p style={s.pickerCardDesc}>Sync meeting transcripts from Fireflies.ai</p>
              <button style={s.btnPrimary} onClick={() => setStep("welcome")}>
                Connect Fireflies
              </button>
            </div>
            {showGoogleMeet && (
              <div style={s.pickerCard}>
                <h4 style={s.pickerCardTitle}>Google Meet</h4>
                <p style={s.pickerCardDesc}>Sync transcripts from Google Meet recordings</p>
                <button
                  style={{ ...s.btnPrimary, background: "#059669" }}
                  onClick={() => setStep("google-connect")}
                >
                  Connect Google
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Google Connect ───────────────────────────────────────── */}

      {step === "google-connect" && (
        <div style={s.stepContent}>
          <h3 style={s.stepTitle}>Connect Google Account</h3>
          <p style={s.stepDesc}>Sign in with Google to access your meeting transcripts.</p>
          <button
            style={{
              ...s.btnPrimary,
              background: "#059669",
              ...(connecting ? s.btnDisabled : {}),
            }}
<<<<<<< HEAD
          />
        ))}
      </div>
<<<<<<< HEAD
=======
            disabled={connecting}
            onClick={handleGoogleConnect}
          >
            {connecting ? "Connecting\u2026" : "Connect with Google"}
          </button>
          {googleError && <div style={s.errorCard}>{googleError}</div>}
          <button style={s.btnGhost} onClick={() => setStep("picker")}>
            Back
          </button>
        </div>
      )}

      {/* ── Google Success ───────────────────────────────────────── */}

      {step === "google-success" && (
        <div style={s.stepContent}>
          <div style={s.successCard}>
            <span style={s.checkmark}>&#10003;</span>
            <div>
              <p style={s.successTitle}>Google account connected</p>
              <p style={s.successSub}>Real-time sync is active — new transcripts will appear automatically.</p>
            </div>
          </div>
          <button style={s.btnPrimary} onClick={() => onGoogleMeetComplete?.()}>
            Start Syncing
          </button>
        </div>
      )}

      {/* ── Fireflies: Welcome ───────────────────────────────────── */}
>>>>>>> c024b29 (TC-1326: Frontend source picker, Google OAuth popup, sync control, source filter)

      {step === "welcome" && (
        <div style={s.stepContent}>
          <h3 style={s.stepTitle}>Connect Fireflies</h3>
          <p style={s.stepDesc}>
            Link your Fireflies.ai account to sync meeting transcripts into your TinyCloud space.
          </p>
          <button style={s.btnPrimary} onClick={() => setStep("instructions")}>
            Get Started
          </button>
        </div>
      )}

      {/* ── Fireflies: Instructions ──────────────────────────────── */}

      {step === "instructions" && (
        <div style={s.stepContent}>
          <h3 style={s.stepTitle}>Get Your API Key</h3>
          <p style={s.stepDesc}>
=======
    <section style={styles.panel}>
      <h2 style={styles.heading}>Setup</h2>
=======
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)

      {step === "welcome" && (
        <div style={s.stepContent}>
          <h3 style={s.stepTitle}>Connect Fireflies</h3>
          <p style={s.stepDesc}>
            Link your Fireflies.ai account to sync meeting transcripts into your TinyCloud space.
          </p>
          <button style={s.btnPrimary} onClick={() => setStep("instructions")}>
            Get Started
          </button>
        </div>
      )}

      {step === "instructions" && (
<<<<<<< HEAD
        <>
          <p style={styles.description}>
>>>>>>> 6a82158 (TC-1305: Build SetupWizard component (5-step guided API key onboarding))
            Go to{" "}
            <a
              href="https://app.fireflies.ai/integrations"
              target="_blank"
              rel="noreferrer"
<<<<<<< HEAD
              style={s.link}
            >
              app.fireflies.ai
            </a>{" "}
            &rarr; Integrations &rarr; Fireflies API &rarr; copy your API key.
          </p>
          <div style={s.btnRow}>
            <button style={s.btnGhost} onClick={() => setStep("welcome")}>
              Back
            </button>
            <button style={s.btnPrimary} onClick={() => setStep("input")}>
              Next
            </button>
          </div>
        </div>
      )}

      {/* ── Fireflies: Input ─────────────────────────────────────── */}

      {step === "input" && (
        <div style={s.stepContent}>
          <h3 style={s.stepTitle}>Paste API Key</h3>
          <input
            type="text"
            placeholder="Paste your Fireflies API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={s.input}
          />
          <div style={s.btnRow}>
            <button style={s.btnGhost} onClick={() => setStep("instructions")}>
              Back
            </button>
            <button
              style={{ ...s.btnPrimary, ...(apiKey.trim() === "" || saving ? s.btnDisabled : {}) }}
              disabled={apiKey.trim() === "" || saving}
              onClick={handleSave}
            >
              {saving ? "Verifying\u2026" : "Save & Verify"}
            </button>
          </div>
        </div>
      )}

      {/* ── Fireflies: Test ──────────────────────────────────────── */}

      {step === "test" && (
        <div style={s.stepContent}>
          {userInfo ? (
            <>
              <div style={s.successCard}>
                <span style={s.checkmark}>&#10003;</span>
                <div>
                  <p style={s.successTitle}>Connected as {userInfo.name}</p>
                  <p style={s.successSub}>{userInfo.email}</p>
                </div>
              </div>
              <button style={s.btnPrimary} onClick={() => setStep("webhook")}>
=======
              aria-label="Fireflies Integrations"
              style={styles.link}
            >
=======
        <div style={s.stepContent}>
          <h3 style={s.stepTitle}>Get Your API Key</h3>
          <p style={s.stepDesc}>
            Go to{" "}
<<<<<<< HEAD
            <a href="https://app.fireflies.ai/integrations" target="_blank" rel="noreferrer" style={s.link}>
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
=======
            <a
              href="https://app.fireflies.ai/integrations"
              target="_blank"
              rel="noreferrer"
              style={s.link}
            >
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
              app.fireflies.ai
            </a>{" "}
            &rarr; Integrations &rarr; Fireflies API &rarr; copy your API key.
          </p>
          <div style={s.btnRow}>
            <button style={s.btnGhost} onClick={() => setStep("welcome")}>
              Back
            </button>
            <button style={s.btnPrimary} onClick={() => setStep("input")}>
              Next
            </button>
          </div>
        </div>
      )}

      {step === "input" && (
        <div style={s.stepContent}>
          <h3 style={s.stepTitle}>Paste API Key</h3>
          <input
            type="text"
            placeholder="Paste your Fireflies API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={s.input}
          />
          <div style={s.btnRow}>
            <button style={s.btnGhost} onClick={() => setStep("instructions")}>
              Back
            </button>
            <button
              style={{ ...s.btnPrimary, ...(apiKey.trim() === "" || saving ? s.btnDisabled : {}) }}
              disabled={apiKey.trim() === "" || saving}
              onClick={handleSave}
            >
              {saving ? "Verifying\u2026" : "Save & Verify"}
            </button>
          </div>
        </div>
      )}

      {step === "test" && (
        <div style={s.stepContent}>
          {userInfo ? (
            <>
<<<<<<< HEAD
              <p style={styles.success}>
                Connected as {userInfo.name} ({userInfo.email})
              </p>
              <button
                style={styles.button}
                onClick={() => setStep("webhook")}
              >
>>>>>>> 6a82158 (TC-1305: Build SetupWizard component (5-step guided API key onboarding))
                Continue
              </button>
            </>
          ) : (
            <>
<<<<<<< HEAD
              <div style={s.errorCard}>{testError}</div>
              <button
                style={s.btnGhost}
=======
              <div style={styles.error}>{testError}</div>
              <button
                style={styles.buttonSecondary}
>>>>>>> 6a82158 (TC-1305: Build SetupWizard component (5-step guided API key onboarding))
                onClick={() => {
                  setTestError(null);
                  setStep("input");
                }}
              >
=======
              <div style={s.successCard}>
                <span style={s.checkmark}>&#10003;</span>
                <div>
                  <p style={s.successTitle}>Connected as {userInfo.name}</p>
                  <p style={s.successSub}>{userInfo.email}</p>
                </div>
              </div>
              <button style={s.btnPrimary} onClick={() => setStep("webhook")}>
                Continue
              </button>
            </>
          ) : (
            <>
              <div style={s.errorCard}>{testError}</div>
<<<<<<< HEAD
              <button style={s.btnGhost} onClick={() => { setTestError(null); setStep("input"); }}>
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
=======
              <button
                style={s.btnGhost}
                onClick={() => {
                  setTestError(null);
                  setStep("input");
                }}
              >
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
                Try Again
              </button>
            </>
          )}
<<<<<<< HEAD
<<<<<<< HEAD
        </div>
      )}

      {/* ── Fireflies: Webhook ───────────────────────────────────── */}

      {step === "webhook" && (
        <div style={s.stepContent}>
          <h3 style={s.stepTitle}>Webhook Setup</h3>
          <p style={s.stepDescSmall}>Optional — get notified when new transcripts are ready.</p>

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
              {urlCopied ? "Copied!" : "Copy"}
            </button>
          </div>

          {backendUrl.includes("localhost") && (
            <p style={s.hint}>Use ngrok or a similar tunnel for local development.</p>
          )}

          <span style={s.fieldLabel}>Webhook Secret</span>
          <div style={s.btnRow}>
            <input
              type="text"
              placeholder="16-32 characters"
              value={webhookSecret}
              onChange={(e) => {
                setWebhookSecret(e.target.value);
                setWebhookError(null);
                setWebhookSaved(false);
              }}
<<<<<<< HEAD
              style={{ ...s.input, flex: 1, marginBottom: 0 }}
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

          {webhookSaved && <div style={s.successInline}>Secret saved</div>}
          {webhookError && <div style={s.errorCard}>{webhookError}</div>}

          <div style={s.instructionsBox}>
            <span style={s.fieldLabel}>Fireflies Dashboard</span>
            <ol style={s.instructionsList}>
              <li>Settings &rarr; Webhooks</li>
              <li>Paste the webhook URL</li>
              <li>Set the same secret</li>
              <li>Select "Transcription completed"</li>
              <li>Save</li>
            </ol>
          </div>

          <div style={s.btnRow}>
            <button style={s.btnGhost} onClick={() => setStep("done")}>
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
              {webhookSaving ? "Saving\u2026" : "Save Secret"}
            </button>
            {webhookSaved && (
              <button style={s.btnPrimary} onClick={() => setStep("done")}>
                Continue
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Fireflies: Done ──────────────────────────────────────── */}

      {step === "done" && (
        <div style={s.stepContent}>
          <div style={s.successCard}>
            <span style={s.checkmark}>&#10003;</span>
            <div>
              <p style={s.successTitle}>All set</p>
              <p style={s.successSub}>Your first sync is ready.</p>
            </div>
          </div>
          <button style={s.btnPrimary} onClick={onComplete}>
            Start Syncing
          </button>
        </div>
=======
        </>
=======
        </div>
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
      )}

      {step === "webhook" && (
        <div style={s.stepContent}>
          <h3 style={s.stepTitle}>Webhook Setup</h3>
          <p style={s.stepDescSmall}>Optional — get notified when new transcripts are ready.</p>

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
              {urlCopied ? "Copied!" : "Copy"}
            </button>
          </div>

          {backendUrl.includes("localhost") && (
            <p style={s.hint}>Use ngrok or a similar tunnel for local development.</p>
          )}

          <span style={s.fieldLabel}>Webhook Secret</span>
          <div style={s.btnRow}>
            <input
              type="text"
              placeholder="16-32 characters"
              value={webhookSecret}
              onChange={(e) => { setWebhookSecret(e.target.value); setWebhookError(null); setWebhookSaved(false); }}
=======
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
              style={{ ...s.input, flex: 1, marginBottom: 0 }}
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

          {webhookSaved && <div style={s.successInline}>Secret saved</div>}
          {webhookError && <div style={s.errorCard}>{webhookError}</div>}

          <div style={s.instructionsBox}>
            <span style={s.fieldLabel}>Fireflies Dashboard</span>
            <ol style={s.instructionsList}>
              <li>Settings &rarr; Webhooks</li>
              <li>Paste the webhook URL</li>
              <li>Set the same secret</li>
              <li>Select "Transcription completed"</li>
              <li>Save</li>
            </ol>
          </div>

          <div style={s.btnRow}>
            <button style={s.btnGhost} onClick={() => setStep("done")}>
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
              {webhookSaving ? "Saving\u2026" : "Save Secret"}
            </button>
            {webhookSaved && (
              <button style={s.btnPrimary} onClick={() => setStep("done")}>
                Continue
              </button>
            )}
          </div>
        </div>
      )}

      {step === "done" && (
<<<<<<< HEAD
        <>
          <p style={styles.success}>
            You're all set! Your first sync is ready.
          </p>
          <button style={styles.button} onClick={onComplete}>
            Sync Now
          </button>
        </>
>>>>>>> 6a82158 (TC-1305: Build SetupWizard component (5-step guided API key onboarding))
=======
        <div style={s.stepContent}>
          <div style={s.successCard}>
            <span style={s.checkmark}>&#10003;</span>
            <div>
              <p style={s.successTitle}>All set</p>
              <p style={s.successSub}>Your first sync is ready.</p>
            </div>
          </div>
          <button style={s.btnPrimary} onClick={onComplete}>
            Start Syncing
          </button>
        </div>
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
      )}
    </section>
  );
};

// ── Styles ──────────────────────────────────────────────────────────

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
const FONT = "'Outfit', -apple-system, sans-serif";
const MONO = "'IBM Plex Mono', 'SF Mono', monospace";

const s: Record<string, React.CSSProperties> = {
  card: {
    fontFamily: FONT,
<<<<<<< HEAD
    background: "#fff",
    border: "1px solid #e2e4e9",
    borderRadius: 12,
    padding: "20px 22px",
    animation: "fadeSlideIn 0.3s ease-out",
  },
  stepDots: {
    display: "flex",
    gap: 6,
    marginBottom: 18,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#e5e7eb",
    transition: "background 0.2s, transform 0.2s",
  },
  dotActive: {
    background: "#6366f1",
  },
  dotCurrent: {
    transform: "scale(1.25)",
  },
  stepContent: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#18181b",
    margin: 0,
    letterSpacing: "-0.01em",
  },
  stepDesc: {
    fontSize: 14,
    color: "#6b7280",
    margin: 0,
    lineHeight: 1.5,
  },
  stepDescSmall: {
    fontSize: 13,
    color: "#9ca3af",
    margin: 0,
  },
  link: {
    color: "#6366f1",
    fontWeight: 500,
    textDecoration: "none",
  },
  input: {
    fontFamily: FONT,
=======
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
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 500,
    color: "#555",
=======
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
    background: "#fff",
    border: "1px solid #e2e4e9",
    borderRadius: 12,
    padding: "20px 22px",
    animation: "fadeSlideIn 0.3s ease-out",
  },
  stepDots: {
    display: "flex",
    gap: 6,
    marginBottom: 18,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#e5e7eb",
    transition: "background 0.2s, transform 0.2s",
  },
  dotActive: {
    background: "#6366f1",
  },
  dotCurrent: {
    transform: "scale(1.25)",
  },
  stepContent: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#18181b",
    margin: 0,
    letterSpacing: "-0.01em",
  },
  stepDesc: {
    fontSize: 14,
    color: "#6b7280",
    margin: 0,
    lineHeight: 1.5,
  },
  stepDescSmall: {
    fontSize: 13,
    color: "#9ca3af",
    margin: 0,
  },
  link: {
    color: "#6366f1",
    fontWeight: 500,
    textDecoration: "none",
  },
  input: {
<<<<<<< HEAD
>>>>>>> 6a82158 (TC-1305: Build SetupWizard component (5-step guided API key onboarding))
=======
    fontFamily: FONT,
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
    display: "block",
    width: "100%",
    padding: "10px 12px",
    fontSize: 14,
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
    color: "#18181b",
    border: "1px solid #e2e4e9",
    borderRadius: 8,
    background: "#fff",
    boxSizing: "border-box" as const,
<<<<<<< HEAD
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#9ca3af",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  urlRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  urlCode: {
    fontFamily: MONO,
    fontSize: 12,
    color: "#e2e8f0",
    background: "#1e1e2e",
    padding: "8px 12px",
    borderRadius: 6,
    wordBreak: "break-all" as const,
    flex: 1,
    lineHeight: 1.5,
  },
  hint: {
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
    margin: 0,
  },
  instructionsBox: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
    padding: "12px 14px",
    border: "1px solid #e2e4e9",
    borderRadius: 8,
  },
  instructionsList: {
    fontFamily: FONT,
    fontSize: 13,
    color: "#6b7280",
    margin: 0,
    paddingLeft: 18,
    lineHeight: 1.8,
  },
  successCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    background: "#fff",
    border: "1px solid #e2e4e9",
    borderLeft: "3px solid #10b981",
    borderRadius: 10,
  },
  checkmark: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "#ecfdf5",
    color: "#10b981",
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#18181b",
    margin: 0,
  },
  successSub: {
    fontSize: 13,
    color: "#6b7280",
    margin: "2px 0 0",
  },
  successInline: {
    fontSize: 12,
    fontWeight: 500,
    color: "#059669",
    padding: "4px 0",
  },
  errorCard: {
    fontSize: 13,
    color: "#991b1b",
    background: "#fef2f2",
    padding: "10px 14px",
    border: "1px solid #fecaca",
    borderRadius: 8,
    lineHeight: 1.4,
  },
  btnRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  btnPrimary: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: 600,
    color: "#fff",
    background: "#18181b",
    border: "none",
    borderRadius: 8,
    padding: "9px 18px",
    cursor: "pointer",
    letterSpacing: "-0.01em",
  },
  btnGhost: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: 500,
    color: "#6b7280",
    background: "transparent",
    border: "1px solid #e2e4e9",
    borderRadius: 8,
    padding: "8px 16px",
    cursor: "pointer",
  },
  btnSmall: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 500,
    color: "#6b7280",
    background: "#f3f4f6",
    border: "1px solid #e2e4e9",
    borderRadius: 6,
    padding: "6px 12px",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
  },
  btnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
=======
    border: "1px solid #ccc",
    borderRadius: 6,
    marginBottom: 12,
    boxSizing: "border-box",
  },
  link: {
    color: "#2563eb",
    textDecoration: "underline",
  },
  success: {
    fontSize: 14,
    color: "#166534",
    background: "#f0fdf4",
    padding: "10px 14px",
    borderRadius: 6,
    border: "1px solid #bbf7d0",
    marginBottom: 12,
  },
  error: {
    fontSize: 13,
    color: "#b91c1c",
    background: "#fef2f2",
    padding: "8px 12px",
    border: "1px solid #fecaca",
    borderRadius: 6,
    marginBottom: 12,
>>>>>>> 6a82158 (TC-1305: Build SetupWizard component (5-step guided API key onboarding))
  },
  label: {
    fontSize: 13,
=======
  },
  fieldLabel: {
    fontSize: 11,
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
    fontWeight: 600,
    color: "#9ca3af",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  urlRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  urlCode: {
    fontFamily: MONO,
    fontSize: 12,
    color: "#e2e8f0",
    background: "#1e1e2e",
    padding: "8px 12px",
    borderRadius: 6,
    wordBreak: "break-all" as const,
    flex: 1,
    lineHeight: 1.5,
  },
  hint: {
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
    margin: 0,
  },
  instructionsBox: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
    padding: "12px 14px",
    border: "1px solid #e2e4e9",
    borderRadius: 8,
  },
  instructionsList: {
    fontFamily: FONT,
    fontSize: 13,
    color: "#6b7280",
    margin: 0,
    paddingLeft: 18,
    lineHeight: 1.8,
  },
  successCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    background: "#fff",
    border: "1px solid #e2e4e9",
    borderLeft: "3px solid #10b981",
    borderRadius: 10,
  },
  checkmark: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "#ecfdf5",
    color: "#10b981",
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#18181b",
    margin: 0,
  },
  successSub: {
    fontSize: 13,
    color: "#6b7280",
    margin: "2px 0 0",
  },
  successInline: {
    fontSize: 12,
    fontWeight: 500,
    color: "#059669",
    padding: "4px 0",
  },
  errorCard: {
    fontSize: 13,
    color: "#991b1b",
    background: "#fef2f2",
    padding: "10px 14px",
    border: "1px solid #fecaca",
    borderRadius: 8,
    lineHeight: 1.4,
  },
  btnRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  btnPrimary: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: 600,
    color: "#fff",
    background: "#18181b",
    border: "none",
    borderRadius: 8,
    padding: "9px 18px",
    cursor: "pointer",
    letterSpacing: "-0.01em",
  },
  btnGhost: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: 500,
    color: "#6b7280",
    background: "transparent",
    border: "1px solid #e2e4e9",
    borderRadius: 8,
    padding: "8px 16px",
    cursor: "pointer",
  },
  btnSmall: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 500,
    color: "#6b7280",
    background: "#f3f4f6",
    border: "1px solid #e2e4e9",
    borderRadius: 6,
    padding: "6px 12px",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
  },
  btnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
  pickerRow: {
    display: "flex",
    gap: 12,
  },
  pickerCard: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
    padding: "16px",
    border: "1px solid #e2e4e9",
    borderRadius: 10,
  },
  pickerCardTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "#18181b",
    margin: 0,
  },
  pickerCardDesc: {
    fontSize: 13,
    color: "#6b7280",
    margin: 0,
    lineHeight: 1.4,
    flex: 1,
  },
};
