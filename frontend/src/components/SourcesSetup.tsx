import { useEffect, useRef, useState, type FC } from "react";
import type { ApiClient } from "@listen/client";
import type { TinyCloudWeb } from "@tinycloud/web-sdk";
import { MAX_TRANSCRIPTION_FILE_BYTES, fileToBase64, formatFileSize } from "../lib/fileEncoding";

type SetupMode = "onboarding" | "sources";
type SetupStep =
  | "cards"
  | "transcript-import"
  | "transcription-upload"
  | "transcription-key"
  | "transcript-success"
  | "fireflies-key"
  | "fireflies-test"
  | "fireflies-webhook"
  | "granola-key"
  | "granola-test"
  | "soundcore-key"
  | "soundcore-test"
  | "google-connect"
  | "google-success";

const FIREFLIES_SECRET_NAME = "FIREFLIES_API_KEY";
const GRANOLA_SECRET_NAME = "GRANOLA_API_KEY";
const SOUNDCORE_SESSION_SECRET_NAME = "SOUNDCORE_SESSION";
const SOUNDCORE_AUTH_TOKEN_SECRET_NAME = "SOUNDCORE_AUTH_TOKEN";
const SOUNDCORE_UID_SECRET_NAME = "SOUNDCORE_UID";
const SOUNDCORE_OPENUDID_SECRET_NAME = "SOUNDCORE_OPENUDID";
const TRANSCRIPTION_SECRET_NAMES = {
  assemblyai: "ASSEMBLYAI_API_KEY",
  deepgram: "DEEPGRAM_API_KEY",
} as const;
type TranscriptionProvider = keyof typeof TRANSCRIPTION_SECRET_NAMES;
const TRANSCRIPTION_PROVIDER_LABELS: Record<TranscriptionProvider, string> = {
  assemblyai: "AssemblyAI",
  deepgram: "Deepgram",
};
const TINYCLOUD_SECRETS_URL = "https://secrets.tinycloud.xyz";
const VERIFY_RETRY_DELAYS_MS = [250, 750, 1500];
const SOUNDCORE_ENV_KEYS = [
  SOUNDCORE_AUTH_TOKEN_SECRET_NAME,
  SOUNDCORE_UID_SECRET_NAME,
  SOUNDCORE_OPENUDID_SECRET_NAME,
] as const;

interface SourcesSetupProps {
  api: ApiClient;
  tcw: TinyCloudWeb;
  mode?: SetupMode;
  hasFirefliesKey?: boolean | null;
  hasGranolaKey?: boolean | null;
  hasSoundcoreKey?: boolean | null;
  hasAssemblyAIKey?: boolean | null;
  hasDeepgramKey?: boolean | null;
  hasBackendDelegation?: boolean | null;
  hasFirefliesBackendAccess?: boolean | null;
  hasGranolaBackendAccess?: boolean | null;
  hasSoundcoreBackendAccess?: boolean | null;
  hasAssemblyAIBackendAccess?: boolean | null;
  hasDeepgramBackendAccess?: boolean | null;
  hasGoogleMeet?: boolean | null;
  initialStep?: Extract<SetupStep, "cards" | "transcript-import" | "soundcore-key">;
  onEnsureBackendAccess: () => Promise<void>;
  onEnsureFirefliesBackendAccess: () => Promise<void>;
  onEnsureGranolaBackendAccess: () => Promise<void>;
  onEnsureSoundcoreBackendAccess?: () => Promise<void>;
  onEnsureSecretBackendAccess?: (secretName: string) => Promise<void>;
  onSoundcoreCredentialsSaved?: () => void;
  onFirefliesComplete: () => void;
  onGranolaComplete: () => void;
  onSoundcoreComplete?: () => void;
  onTranscriptionProviderComplete?: (provider: TranscriptionProvider) => void;
  onTranscriptImportComplete?: (conversationId: string) => void;
  onGoogleMeetComplete?: () => void;
  onDone?: () => void;
  backendUrl?: string;
  googleMeetAvailable?: boolean;
}

interface UserInfo {
  name: string;
  email: string;
}

interface ImportTranscriptResponse {
  conversationId: string;
  title: string;
}

interface TranscribeResponse extends ImportTranscriptResponse {
  provider: TranscriptionProvider;
}

function parseEnvValue(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseSoundcoreEnvBlock(
  block: string,
): Partial<Record<(typeof SOUNDCORE_ENV_KEYS)[number], string>> {
  const values: Partial<Record<(typeof SOUNDCORE_ENV_KEYS)[number], string>> = {};
  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = line.slice(0, equalsIndex).trim();
    const value = parseEnvValue(line.slice(equalsIndex + 1));
    if ((SOUNDCORE_ENV_KEYS as readonly string[]).includes(key)) {
      values[key as (typeof SOUNDCORE_ENV_KEYS)[number]] = value;
    }
  }
  return values;
}

function toDatetimeLocal(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export const SourcesSetup: FC<SourcesSetupProps> = ({
  api,
  tcw,
  mode = "onboarding",
  hasFirefliesKey = null,
  hasGranolaKey = null,
  hasSoundcoreKey = null,
  hasAssemblyAIKey = null,
  hasDeepgramKey = null,
  hasBackendDelegation = null,
  hasFirefliesBackendAccess = null,
  hasGranolaBackendAccess = null,
  hasSoundcoreBackendAccess = null,
  hasAssemblyAIBackendAccess = null,
  hasDeepgramBackendAccess = null,
  hasGoogleMeet = null,
  initialStep = "cards",
  onEnsureBackendAccess,
  onEnsureFirefliesBackendAccess,
  onEnsureGranolaBackendAccess,
  onEnsureSoundcoreBackendAccess,
  onEnsureSecretBackendAccess,
  onSoundcoreCredentialsSaved,
  onFirefliesComplete,
  onGranolaComplete,
  onSoundcoreComplete,
  onTranscriptionProviderComplete,
  onTranscriptImportComplete,
  onGoogleMeetComplete,
  onDone,
  backendUrl = "",
  googleMeetAvailable = false,
}) => {
  const [step, setStep] = useState<SetupStep>(initialStep);
  const [apiKey, setApiKey] = useState("");
  const [granolaApiKey, setGranolaApiKey] = useState("");
  const [soundcoreAuthToken, setSoundcoreAuthToken] = useState("");
  const [soundcoreUid, setSoundcoreUid] = useState("");
  const [soundcoreOpenudid, setSoundcoreOpenudid] = useState("");
  const [soundcoreEnvBlock, setSoundcoreEnvBlock] = useState("");
  const [soundcoreCredentialsSaved, setSoundcoreCredentialsSaved] = useState(false);
  const [soundcoreAccessVerified, setSoundcoreAccessVerified] = useState(false);
  const [soundcoreSyncing, setSoundcoreSyncing] = useState(false);
  const [soundcoreSyncMessage, setSoundcoreSyncMessage] = useState<string | null>(null);
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
  const googlePopupPollRef = useRef<number | null>(null);
  const [importTitle, setImportTitle] = useState("");
  const [importStartedAt, setImportStartedAt] = useState(() => toDatetimeLocal(new Date()));
  const [importParticipants, setImportParticipants] = useState("");
  const [importSourceUrl, setImportSourceUrl] = useState("");
  const [importSummary, setImportSummary] = useState("");
  const [importTranscript, setImportTranscript] = useState("");
  const [importSaving, setImportSaving] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedConversationId, setImportedConversationId] = useState<string | null>(null);
  const [transcriptionProvider, setTranscriptionProvider] =
    useState<TranscriptionProvider>("assemblyai");
  const [transcriptionKey, setTranscriptionKey] = useState("");
  const [transcriptionFile, setTranscriptionFile] = useState<File | null>(null);
  const [transcriptionTitle, setTranscriptionTitle] = useState("");
  const [transcriptionStartedAt, setTranscriptionStartedAt] = useState(() =>
    toDatetimeLocal(new Date()),
  );
  const [transcriptionSaving, setTranscriptionSaving] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);

  const webhookUrl = `${backendUrl}/api/webhooks/fireflies`;
  const firefliesConnected =
    hasFirefliesKey === true && hasBackendDelegation === true && hasFirefliesBackendAccess === true;
  const firefliesNeedsAccess =
    hasFirefliesKey === true &&
    (hasBackendDelegation !== true || hasFirefliesBackendAccess !== true);
  const granolaConnected =
    hasGranolaKey === true && hasBackendDelegation === true && hasGranolaBackendAccess === true;
  const granolaNeedsAccess =
    hasGranolaKey === true && (hasBackendDelegation !== true || hasGranolaBackendAccess !== true);
  const soundcoreConnected =
    (hasSoundcoreKey === true &&
      hasBackendDelegation === true &&
      hasSoundcoreBackendAccess === true) ||
    soundcoreAccessVerified;
  const soundcoreNeedsAccess =
    hasSoundcoreKey === true &&
    (hasBackendDelegation !== true || hasSoundcoreBackendAccess !== true);
  const transcriptionKeyStatus: Record<TranscriptionProvider, boolean | null> = {
    assemblyai: hasAssemblyAIKey,
    deepgram: hasDeepgramKey,
  };
  const transcriptionBackendAccess: Record<TranscriptionProvider, boolean | null> = {
    assemblyai: hasAssemblyAIBackendAccess,
    deepgram: hasDeepgramBackendAccess,
  };
  const transcriptionProviderReady = (provider: TranscriptionProvider) =>
    transcriptionKeyStatus[provider] === true &&
    hasBackendDelegation === true &&
    transcriptionBackendAccess[provider] === true;
  const transcriptionProviderNeedsAccess = (provider: TranscriptionProvider) =>
    transcriptionKeyStatus[provider] === true &&
    (hasBackendDelegation !== true || transcriptionBackendAccess[provider] !== true);
  const assemblyAIReady = transcriptionProviderReady("assemblyai");
  const deepgramReady = transcriptionProviderReady("deepgram");
  const connectedCount = [
    firefliesConnected,
    granolaConnected,
    soundcoreConnected,
    assemblyAIReady,
    deepgramReady,
    hasGoogleMeet === true,
  ].filter(Boolean).length;

  const clearGooglePopupPoll = () => {
    if (googlePopupPollRef.current !== null) {
      window.clearInterval(googlePopupPollRef.current);
      googlePopupPollRef.current = null;
    }
  };

  useEffect(() => () => clearGooglePopupPoll(), []);

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  useEffect(() => {
    if (transcriptionProviderReady(transcriptionProvider)) return;
    if (assemblyAIReady) setTranscriptionProvider("assemblyai");
    else if (deepgramReady) setTranscriptionProvider("deepgram");
  }, [assemblyAIReady, deepgramReady, transcriptionProvider]);

  useEffect(() => {
    if (step !== "google-connect") return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "google-auth-success") {
        clearGooglePopupPoll();
        setGoogleError(null);
        setStep("google-success");
        setConnecting(false);
        onGoogleMeetComplete?.();
      } else if (event.data?.type === "google-auth-error") {
        clearGooglePopupPoll();
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

  const saveGranolaKey = async () => {
    setSaving(true);
    setTestError(null);
    try {
      const putResult = await tcw.secrets.put(GRANOLA_SECRET_NAME, granolaApiKey.trim());
      if (!putResult.ok) throw new Error(putResult.error.message);

      await onEnsureGranolaBackendAccess();
      await verifyGranolaStatus(api);
      setStep("granola-test");
    } catch (err) {
      setTestError(err instanceof Error ? err.message : String(err));
      setStep("granola-test");
    } finally {
      setSaving(false);
    }
  };

  const finishGranolaAccess = async () => {
    setSaving(true);
    setTestError(null);
    try {
      await onEnsureGranolaBackendAccess();
      await verifyGranolaStatus(api);
      setStep("granola-test");
    } catch (err) {
      setTestError(err instanceof Error ? err.message : String(err));
      setStep("granola-test");
    } finally {
      setSaving(false);
    }
  };

  const saveSoundcoreCredentials = async () => {
    setSaving(true);
    setTestError(null);
    try {
      const putResult = await tcw.secrets.put(
        SOUNDCORE_SESSION_SECRET_NAME,
        JSON.stringify({
          authToken: soundcoreAuthToken.trim(),
          uid: soundcoreUid.trim(),
          openudid: soundcoreOpenudid.trim(),
        }),
      );
      if (!putResult.ok) throw new Error(putResult.error.message);

      setSoundcoreCredentialsSaved(true);
      setSoundcoreAccessVerified(false);
      onSoundcoreCredentialsSaved?.();
      setStep("soundcore-test");
    } catch (err) {
      setTestError(err instanceof Error ? err.message : String(err));
      setStep("soundcore-test");
    } finally {
      setSaving(false);
    }
  };

  const applySoundcoreEnvBlock = () => {
    const parsed = parseSoundcoreEnvBlock(soundcoreEnvBlock);
    if (parsed.SOUNDCORE_AUTH_TOKEN) setSoundcoreAuthToken(parsed.SOUNDCORE_AUTH_TOKEN);
    if (parsed.SOUNDCORE_UID) setSoundcoreUid(parsed.SOUNDCORE_UID);
    if (parsed.SOUNDCORE_OPENUDID) setSoundcoreOpenudid(parsed.SOUNDCORE_OPENUDID);
  };

  const finishSoundcoreAccess = async () => {
    setSaving(true);
    setTestError(null);
    try {
      await (onEnsureSoundcoreBackendAccess ?? onEnsureBackendAccess)();
      await verifySoundcoreStatus(api);
      setSoundcoreCredentialsSaved(true);
      setSoundcoreAccessVerified(true);
      setStep("soundcore-test");
    } catch (err) {
      setTestError(err instanceof Error ? err.message : String(err));
      setStep("soundcore-test");
    } finally {
      setSaving(false);
    }
  };

  const syncSoundcoreNow = async () => {
    setSoundcoreSyncing(true);
    setTestError(null);
    setSoundcoreSyncMessage(null);
    try {
      const result = await api.post<{
        synced: number;
        skipped: number;
        skippedNoTranscript: number;
        failed: number;
      }>("/api/sync/soundcore", {});
      setSoundcoreSyncMessage(
        `Synced ${result.synced} note${result.synced === 1 ? "" : "s"} (${result.skipped} already in Listen, ${result.skippedNoTranscript} without transcripts).`,
      );
    } catch (err) {
      setTestError(err instanceof Error ? err.message : String(err));
    } finally {
      setSoundcoreSyncing(false);
    }
  };

  const saveTranscriptionProviderKey = async () => {
    const secretName = TRANSCRIPTION_SECRET_NAMES[transcriptionProvider];
    setSaving(true);
    setTranscriptionError(null);
    try {
      const putResult = await tcw.secrets.put(secretName, transcriptionKey.trim());
      if (!putResult.ok) throw new Error(putResult.error.message);

      await (onEnsureSecretBackendAccess ?? onEnsureBackendAccess)(secretName);
      onTranscriptionProviderComplete?.(transcriptionProvider);
      setTranscriptionKey("");
      setStep("transcription-upload");
    } catch (err) {
      setTranscriptionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const finishTranscriptionProviderAccess = async (provider: TranscriptionProvider) => {
    setSaving(true);
    setTranscriptionError(null);
    try {
      await (onEnsureSecretBackendAccess ?? onEnsureBackendAccess)(
        TRANSCRIPTION_SECRET_NAMES[provider],
      );
      onTranscriptionProviderComplete?.(provider);
    } catch (err) {
      setTranscriptionError(err instanceof Error ? err.message : String(err));
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
      const popup = window.open(authUrl, "google-auth", "width=500,height=600,popup=yes");
      if (!popup) {
        throw new Error("Popup blocked. Allow popups for this site and try again.");
      }
      googlePopupPollRef.current = window.setInterval(() => {
        if (popup.closed) {
          clearGooglePopupPoll();
          setConnecting(false);
          setGoogleError("The Google sign-in window was closed before finishing. Try again.");
        }
      }, 500);
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : String(err));
      setConnecting(false);
    }
  };

  const handleTranscriptFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    setImportTranscript(text);
    setImportError(null);
    if (importTitle.trim() === "") {
      setImportTitle(file.name.replace(/\.[^.]+$/, ""));
    }
  };

  const submitTranscriptImport = async () => {
    setImportSaving(true);
    setImportError(null);
    try {
      if (hasBackendDelegation !== true) {
        await onEnsureBackendAccess();
      }

      const result = await api.post<ImportTranscriptResponse>("/api/conversations/import", {
        title: importTitle.trim(),
        transcriptText: importTranscript.trim(),
        startedAt: importStartedAt ? new Date(importStartedAt).toISOString() : undefined,
        participants: importParticipants,
        sourceUrl: importSourceUrl.trim(),
        summary: importSummary.trim(),
      });
      setImportedConversationId(result.conversationId);
      setStep("transcript-success");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    } finally {
      setImportSaving(false);
    }
  };

  const submitTranscription = async () => {
    if (!transcriptionFile) return;
    if (transcriptionFile.size > MAX_TRANSCRIPTION_FILE_BYTES) return;
    setTranscriptionSaving(true);
    setTranscriptionError(null);
    try {
      if (!transcriptionProviderReady(transcriptionProvider)) {
        throw new Error(
          `${TRANSCRIPTION_PROVIDER_LABELS[transcriptionProvider]} setup is not complete.`,
        );
      }

      const result = await api.post<TranscribeResponse>("/api/conversations/transcribe", {
        provider: transcriptionProvider,
        title: transcriptionTitle.trim() || transcriptionFile.name.replace(/\.[^.]+$/, ""),
        fileName: transcriptionFile.name,
        contentType: transcriptionFile.type || "application/octet-stream",
        contentBase64: await fileToBase64(transcriptionFile),
        startedAt: transcriptionStartedAt
          ? new Date(transcriptionStartedAt).toISOString()
          : undefined,
      });
      setImportedConversationId(result.conversationId);
      setStep("transcript-success");
    } catch (err) {
      setTranscriptionError(err instanceof Error ? err.message : String(err));
    } finally {
      setTranscriptionSaving(false);
    }
  };

  const detail = (() => {
    if (step === "transcript-import") {
      return (
        <div style={s.detailPanel}>
          <span style={s.fieldLabel}>Transcript import</span>
          <p style={s.detailText}>
            Paste a transcript or upload a text file, then set the fields Listen should use in the
            library.
          </p>
          <div style={s.fieldGrid}>
            <label style={s.fieldStack}>
              <span style={s.fieldLabel}>Title</span>
              <input
                type="text"
                placeholder="Customer call, standup, interview..."
                value={importTitle}
                onChange={(event) => setImportTitle(event.target.value)}
                style={s.input}
              />
            </label>
            <label style={s.fieldStack}>
              <span style={s.fieldLabel}>Recorded at</span>
              <input
                type="datetime-local"
                value={importStartedAt}
                onChange={(event) => setImportStartedAt(event.target.value)}
                style={s.input}
              />
            </label>
          </div>
          <div style={s.fieldGrid}>
            <label style={s.fieldStack}>
              <span style={s.fieldLabel}>Speakers</span>
              <input
                type="text"
                placeholder="Sam, Alex, Priya"
                value={importParticipants}
                onChange={(event) => setImportParticipants(event.target.value)}
                style={s.input}
              />
            </label>
            <label style={s.fieldStack}>
              <span style={s.fieldLabel}>Source URL</span>
              <input
                type="url"
                placeholder="Optional"
                value={importSourceUrl}
                onChange={(event) => setImportSourceUrl(event.target.value)}
                style={s.input}
              />
            </label>
          </div>
          <label style={s.fieldStack}>
            <span style={s.fieldLabel}>Summary</span>
            <textarea
              placeholder="Optional notes or summary"
              value={importSummary}
              onChange={(event) => setImportSummary(event.target.value)}
              style={{ ...s.textarea, minHeight: 72 }}
            />
          </label>
          <label style={s.fieldStack}>
            <span style={s.fieldLabel}>Transcript file</span>
            <input
              type="file"
              accept=".txt,.md,.srt,.vtt,text/plain,text/markdown"
              onChange={(event) => {
                void handleTranscriptFile(event.currentTarget.files?.[0] ?? null);
                event.currentTarget.value = "";
              }}
              style={s.fileInput}
            />
          </label>
          <label style={s.fieldStack}>
            <span style={s.fieldLabel}>Transcript</span>
            <textarea
              placeholder={
                "Speaker: Paste transcript text here\n[00:32] Speaker: Timestamped lines work too"
              }
              value={importTranscript}
              onChange={(event) => setImportTranscript(event.target.value)}
              style={s.textarea}
            />
          </label>
          {importError && (
            <div data-testid="transcript-import-error" style={s.errorCard}>
              {importError}
            </div>
          )}
          <div style={s.btnRow}>
            <button style={s.btnGhost} onClick={() => setStep("cards")}>
              Back
            </button>
            <button
              style={{
                ...s.btnPrimary,
                ...(!importTitle.trim() || !importTranscript.trim() || importSaving
                  ? s.btnDisabled
                  : {}),
              }}
              disabled={!importTitle.trim() || !importTranscript.trim() || importSaving}
              onClick={submitTranscriptImport}
            >
              {importSaving ? "Importing..." : "Import transcript"}
            </button>
          </div>
        </div>
      );
    }

    if (step === "transcript-success") {
      return (
        <div style={s.detailPanel}>
          <div style={s.successCard}>
            <span style={s.checkmark}>✓</span>
            <div>
              <p style={s.successTitle}>Transcript imported</p>
              <p style={s.successSub}>It is now available in your Listen library.</p>
            </div>
          </div>
          <div style={s.btnRow}>
            <button style={s.btnGhost} onClick={() => setStep("cards")}>
              Add another
            </button>
            <button
              style={s.btnPrimary}
              onClick={() => {
                if (importedConversationId) onTranscriptImportComplete?.(importedConversationId);
                else onDone?.();
              }}
            >
              Continue to library
            </button>
          </div>
        </div>
      );
    }

    if (step === "transcription-upload") {
      const providerReady = transcriptionProviderReady(transcriptionProvider);
      const providerNeedsAccess = transcriptionProviderNeedsAccess(transcriptionProvider);
      const providerLabel = TRANSCRIPTION_PROVIDER_LABELS[transcriptionProvider];
      const fileTooLarge = Boolean(
        transcriptionFile && transcriptionFile.size > MAX_TRANSCRIPTION_FILE_BYTES,
      );
      const canTranscribe =
        Boolean(transcriptionFile) && !fileTooLarge && providerReady && !transcriptionSaving;
      return (
        <div style={s.detailPanel}>
          <span style={s.fieldLabel}>Transcription</span>
          <p style={s.detailText}>
            Upload audio or video, choose a connected transcription provider, and Listen will store
            the source file in TinyCloud KV before importing the transcript.
          </p>
          <label style={s.fieldStack}>
            <span style={s.fieldLabel}>Provider</span>
            <select
              value={transcriptionProvider}
              onChange={(event) =>
                setTranscriptionProvider(event.target.value as TranscriptionProvider)
              }
              style={s.input}
            >
              <option value="assemblyai">
                AssemblyAI {transcriptionProviderReady("assemblyai") ? "(ready)" : ""}
              </option>
              <option value="deepgram">
                Deepgram {transcriptionProviderReady("deepgram") ? "(ready)" : ""}
              </option>
            </select>
          </label>
          {!providerReady && (
            <div style={s.errorCard}>
              {providerNeedsAccess
                ? `${providerLabel} key is saved. Backend access still needs setup.`
                : `Connect ${providerLabel} before uploading media for transcription.`}
              <div style={s.btnRow}>
                {providerNeedsAccess ? (
                  <button
                    style={s.btnPrimary}
                    disabled={saving}
                    onClick={() => void finishTranscriptionProviderAccess(transcriptionProvider)}
                  >
                    {saving ? "Connecting..." : "Finish setup"}
                  </button>
                ) : (
                  <button style={s.btnPrimary} onClick={() => setStep("transcription-key")}>
                    Connect {providerLabel}
                  </button>
                )}
              </div>
            </div>
          )}
          <div style={s.fieldGrid}>
            <label style={s.fieldStack}>
              <span style={s.fieldLabel}>Title</span>
              <input
                type="text"
                placeholder="Defaults to file name"
                value={transcriptionTitle}
                onChange={(event) => setTranscriptionTitle(event.target.value)}
                style={s.input}
              />
            </label>
            <label style={s.fieldStack}>
              <span style={s.fieldLabel}>Recorded at</span>
              <input
                type="datetime-local"
                value={transcriptionStartedAt}
                onChange={(event) => setTranscriptionStartedAt(event.target.value)}
                style={s.input}
              />
            </label>
          </div>
          <label style={s.fieldStack}>
            <span style={s.fieldLabel}>Media file</span>
            <input
              type="file"
              accept="audio/*,video/*"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0] ?? null;
                setTranscriptionFile(file);
                setTranscriptionError(null);
                if (file && transcriptionTitle.trim() === "") {
                  setTranscriptionTitle(file.name.replace(/\.[^.]+$/, ""));
                }
              }}
              style={s.fileInput}
            />
          </label>
          {transcriptionFile && (
            <div style={s.successInline}>
              {transcriptionFile.name} · {formatFileSize(transcriptionFile.size)}
            </div>
          )}
          {fileTooLarge && transcriptionFile && (
            <div style={s.errorCard}>
              {transcriptionFile.name} is {formatFileSize(transcriptionFile.size)} — uploads are
              limited to {formatFileSize(MAX_TRANSCRIPTION_FILE_BYTES)}. Compress the recording or
              import larger files with the listen-importer CLI.
            </div>
          )}
          {transcriptionError && <div style={s.errorCard}>{transcriptionError}</div>}
          <div style={s.btnRow}>
            <button style={s.btnGhost} onClick={() => setStep("cards")}>
              Back
            </button>
            <button
              style={{ ...s.btnPrimary, ...(!canTranscribe ? s.btnDisabled : {}) }}
              disabled={!canTranscribe}
              onClick={submitTranscription}
            >
              {transcriptionSaving ? "Transcribing..." : `Transcribe with ${providerLabel}`}
            </button>
          </div>
        </div>
      );
    }

    if (step === "transcription-key") {
      const providerLabel = TRANSCRIPTION_PROVIDER_LABELS[transcriptionProvider];
      return (
        <div style={s.detailPanel}>
          <span style={s.fieldLabel}>{providerLabel} API key</span>
          <p style={s.detailText}>
            Store the key in TinyCloud Secrets and share backend access before using this provider
            for transcription uploads.
          </p>
          <input
            type="password"
            placeholder={`Paste your ${providerLabel} API key`}
            value={transcriptionKey}
            onChange={(event) => {
              setTranscriptionKey(event.target.value);
              setTranscriptionError(null);
            }}
            style={s.input}
          />
          {transcriptionError && <div style={s.errorCard}>{transcriptionError}</div>}
          <div style={s.btnRow}>
            <button style={s.btnGhost} onClick={() => setStep("cards")}>
              Back
            </button>
            <button
              style={{
                ...s.btnPrimary,
                ...(transcriptionKey.trim() === "" || saving ? s.btnDisabled : {}),
              }}
              disabled={transcriptionKey.trim() === "" || saving}
              onClick={saveTranscriptionProviderKey}
            >
              {saving ? "Connecting..." : "Save key and connect"}
            </button>
          </div>
        </div>
      );
    }

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
                  Continue to library
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

    if (step === "granola-key") {
      return (
        <div style={s.detailPanel}>
          <span style={s.fieldLabel}>Granola API key</span>
          <p style={s.detailText}>
            Paste the key from Granola settings. It is stored in TinyCloud Secrets, then shared to
            the Listen backend for sync.
          </p>
          <input
            type="password"
            placeholder="Paste your Granola API key"
            value={granolaApiKey}
            onChange={(event) => setGranolaApiKey(event.target.value)}
            style={s.input}
          />
          <div style={s.btnRow}>
            <button style={s.btnGhost} onClick={() => setStep("cards")}>
              Back
            </button>
            <button
              style={{
                ...s.btnPrimary,
                ...(granolaApiKey.trim() === "" || saving ? s.btnDisabled : {}),
              }}
              disabled={granolaApiKey.trim() === "" || saving}
              onClick={saveGranolaKey}
            >
              {saving ? "Connecting..." : "Save key and connect"}
            </button>
          </div>
        </div>
      );
    }

    if (step === "granola-test") {
      return (
        <div style={s.detailPanel}>
          {testError ? (
            <>
              <div style={s.errorCard}>{testError}</div>
              <div style={s.btnRow}>
                <button style={s.btnGhost} onClick={() => setStep("granola-key")}>
                  Edit key
                </button>
                {hasGranolaKey && (
                  <button style={s.btnPrimary} onClick={finishGranolaAccess} disabled={saving}>
                    {saving ? "Connecting..." : "Try access again"}
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div style={s.successCard}>
                <span style={s.checkmark}>✓</span>
                <div>
                  <p style={s.successTitle}>Granola connected</p>
                  <p style={s.successSub}>Notes with summaries and transcripts can sync.</p>
                </div>
              </div>
              <div style={s.btnRow}>
                <button style={s.btnPrimary} onClick={onGranolaComplete}>
                  Continue to library
                </button>
              </div>
            </>
          )}
        </div>
      );
    }

    if (step === "soundcore-key") {
      const ready =
        soundcoreAuthToken.trim() !== "" &&
        soundcoreUid.trim() !== "" &&
        soundcoreOpenudid.trim() !== "";

      return (
        <div style={s.detailPanel}>
          <span style={s.fieldLabel}>Soundcore web session</span>
          <p style={s.detailText}>
            Soundcore does not issue a normal API key. This advanced connector uses your signed-in
            ai.soundcore.com web session headers and stores them in TinyCloud Secrets.
          </p>
          <ol style={s.helperList}>
            <li>Open ai.soundcore.com in a browser and sign in.</li>
            <li>Open DevTools, then Network, and refresh or open a voice note.</li>
            <li>Choose a request to anka-api-us.soundcore.com.</li>
            <li>Copy request headers X-Auth-Token, Uid, and Openudid below.</li>
          </ol>
          <label style={s.inputLabel} htmlFor="soundcore-env-block">
            Paste Soundcore values
          </label>
          <textarea
            id="soundcore-env-block"
            placeholder="SOUNDCORE_AUTH_TOKEN=...\nSOUNDCORE_UID=...\nSOUNDCORE_OPENUDID=..."
            value={soundcoreEnvBlock}
            onChange={(event) => setSoundcoreEnvBlock(event.target.value)}
            style={{ ...s.textarea, minHeight: 86 }}
          />
          <div style={s.btnRow}>
            <button type="button" style={s.btnGhost} onClick={applySoundcoreEnvBlock}>
              Fill fields from pasted block
            </button>
          </div>
          <label style={s.inputLabel} htmlFor="soundcore-auth-token">
            X-Auth-Token
          </label>
          <input
            id="soundcore-auth-token"
            type="password"
            placeholder="X-Auth-Token"
            value={soundcoreAuthToken}
            onChange={(event) => setSoundcoreAuthToken(event.target.value)}
            style={s.input}
          />
          <label style={s.inputLabel} htmlFor="soundcore-uid">
            Uid
          </label>
          <input
            id="soundcore-uid"
            type="text"
            placeholder="Uid"
            value={soundcoreUid}
            onChange={(event) => setSoundcoreUid(event.target.value)}
            style={s.input}
          />
          <label style={s.inputLabel} htmlFor="soundcore-openudid">
            Openudid
          </label>
          <input
            id="soundcore-openudid"
            type="text"
            placeholder="Openudid"
            value={soundcoreOpenudid}
            onChange={(event) => setSoundcoreOpenudid(event.target.value)}
            style={s.input}
          />
          <div style={s.btnRow}>
            <button style={s.btnGhost} onClick={() => setStep("cards")}>
              Back
            </button>
            <button
              style={{
                ...s.btnPrimary,
                ...(!ready || saving ? s.btnDisabled : {}),
              }}
              disabled={!ready || saving}
              onClick={saveSoundcoreCredentials}
            >
              {saving ? "Saving..." : "Save credentials"}
            </button>
          </div>
        </div>
      );
    }

    if (step === "soundcore-test") {
      return (
        <div style={s.detailPanel}>
          {testError ? (
            <>
              <div style={s.errorCard}>{testError}</div>
              <div style={s.btnRow}>
                <button style={s.btnGhost} onClick={() => setStep("soundcore-key")}>
                  Edit credentials
                </button>
                <button style={s.btnPrimary} onClick={finishSoundcoreAccess} disabled={saving}>
                  {saving ? "Connecting..." : "Try access again"}
                </button>
              </div>
            </>
          ) : soundcoreCredentialsSaved && !soundcoreConnected ? (
            <>
              <div style={s.successCard}>
                <span style={s.checkmark}>✓</span>
                <div>
                  <p style={s.successTitle}>Soundcore credentials saved</p>
                  <p style={s.successSub}>
                    Finish setup to let the Listen backend read them and sync voice notes.
                  </p>
                </div>
              </div>
              <div style={s.btnRow}>
                <button style={s.btnGhost} onClick={() => setStep("soundcore-key")}>
                  Edit credentials
                </button>
                <button style={s.btnPrimary} onClick={finishSoundcoreAccess} disabled={saving}>
                  {saving ? "Connecting..." : "Finish setup"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={s.successCard}>
                <span style={s.checkmark}>✓</span>
                <div>
                  <p style={s.successTitle}>Soundcore connected</p>
                  <p style={s.successSub}>Voice note transcripts can sync into Listen.</p>
                </div>
              </div>
              <div style={s.btnRow}>
                <button
                  style={{
                    ...s.btnGhost,
                    ...(soundcoreSyncing ? s.btnDisabled : {}),
                  }}
                  disabled={soundcoreSyncing}
                  onClick={syncSoundcoreNow}
                >
                  {soundcoreSyncing ? "Syncing..." : "Sync Soundcore now"}
                </button>
                <button style={s.btnPrimary} onClick={onSoundcoreComplete ?? onGranolaComplete}>
                  Continue to library
                </button>
              </div>
              {soundcoreSyncMessage && <div style={s.successCard}>{soundcoreSyncMessage}</div>}
            </>
          )}
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
                <p style={s.successSub}>Google Meet can now sync into your library.</p>
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
          <span style={s.eyebrow}>· {mode === "onboarding" ? "welcome to listen" : "sources"}</span>
          <h3 style={s.title}>
            {mode === "onboarding"
              ? "Connect what you already have."
              : "Add a source or transcript."}
          </h3>
          <p style={s.copy}>
            Listen brings your meetings and conversations into one calm, searchable place. Sync from
            a provider or import a transcript directly. Your credentials stay private in TinyCloud
            Secrets; imports go straight to your library.
          </p>
          <p style={s.secretsNote}>
            Secrets are managed through TinyCloud Secrets at{" "}
            <a href={TINYCLOUD_SECRETS_URL} target="_blank" rel="noreferrer" style={s.secretsLink}>
              secrets@tinycloud.xyz
            </a>
            .
          </p>

          <div style={s.divider} />

          <span style={s.fieldLabel}>What happens next</span>
          <ol style={s.steps}>
            <li>Choose a provider, paste text, or upload a transcript file</li>
            <li>Set title, speakers, date, source link, and summary</li>
            <li>Write the transcript into the same TinyCloud library</li>
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
            <span>library</span>
          </div>
        </div>
      </div>

      <div style={s.rightPane}>
        <div style={s.sourcesHeader}>
          <span style={s.fieldLabel}>· add source or transcript</span>
          <span style={s.fieldLabel}>
            {connectedCount} provider{connectedCount === 1 ? "" : "s"} connected
          </span>
        </div>

        {step === "cards" ? (
          <div style={s.sourceList}>
            <SourceCard
              title="Transcript import"
              meta="file - paste"
              description="Paste text or upload .txt, .md, .srt, or .vtt."
              detail="manual import"
              actionLabel="Import ->"
              onAction={() => setStep("transcript-import")}
            />

            <SourceCard
              title="Transcription"
              meta="audio - video"
              description="Upload media using a connected transcription provider."
              detail="provider transcription"
              actionLabel="Upload ->"
              onAction={() => setStep("transcription-upload")}
            />

            <TranscriptionProviderCard
              provider="assemblyai"
              connected={transcriptionProviderReady("assemblyai")}
              needsAccess={transcriptionProviderNeedsAccess("assemblyai")}
              saving={saving}
              onConnect={() => {
                setTranscriptionProvider("assemblyai");
                setTranscriptionKey("");
                setTranscriptionError(null);
                setStep("transcription-key");
              }}
              onFinishSetup={() => void finishTranscriptionProviderAccess("assemblyai")}
            />

            <TranscriptionProviderCard
              provider="deepgram"
              connected={transcriptionProviderReady("deepgram")}
              needsAccess={transcriptionProviderNeedsAccess("deepgram")}
              saving={saving}
              onConnect={() => {
                setTranscriptionProvider("deepgram");
                setTranscriptionKey("");
                setTranscriptionError(null);
                setStep("transcription-key");
              }}
              onFinishSetup={() => void finishTranscriptionProviderAccess("deepgram")}
            />

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

            <SourceCard
              title="Granola"
              meta="notes api"
              description={
                granolaNeedsAccess
                  ? "API key saved. Backend access is still needed."
                  : "Pull summaries and transcripts from Granola."
              }
              detail="api key"
              connected={granolaConnected}
              actionLabel={
                granolaConnected
                  ? "Connected"
                  : granolaNeedsAccess
                    ? "Finish setup ->"
                    : "Connect ->"
              }
              disabled={saving || granolaConnected}
              onAction={() => {
                if (granolaConnected) return;
                if (granolaNeedsAccess) {
                  void finishGranolaAccess();
                  return;
                }
                setStep("granola-key");
              }}
            />

            <SourceCard
              title="Soundcore"
              meta="advanced web session"
              description={
                soundcoreNeedsAccess
                  ? "Credentials saved. Backend access is still needed."
                  : "Pull voice note transcripts using captured Soundcore web headers."
              }
              detail="not an official API key"
              connected={soundcoreConnected}
              actionLabel={
                soundcoreConnected
                  ? "Connected"
                  : soundcoreNeedsAccess
                    ? "Finish setup ->"
                    : "Connect ->"
              }
              disabled={saving || soundcoreConnected}
              onAction={() => {
                if (soundcoreConnected) return;
                if (soundcoreNeedsAccess) {
                  void finishSoundcoreAccess();
                  return;
                }
                setStep("soundcore-key");
              }}
            />

            <SourceCard
              title="Google Meet"
              meta="caption sync"
              description={
                googleMeetAvailable
                  ? hasBackendDelegation === true
                    ? "Pulls captions and recordings from Google."
                    : "Backend access will be delegated before OAuth."
                  : "Google Meet is not configured on this Listen server."
              }
              detail={googleMeetAvailable ? "google oauth" : "unavailable"}
              connected={hasGoogleMeet === true}
              actionLabel={
                hasGoogleMeet === true
                  ? "Connected"
                  : googleMeetAvailable
                    ? "Connect ->"
                    : "Unavailable"
              }
              disabled={hasGoogleMeet === true || !googleMeetAvailable}
              onAction={() => {
                if (!googleMeetAvailable) return;
                setStep("google-connect");
              }}
            />
          </div>
        ) : (
          detail
        )}

        <div style={s.actionsFooter}>
          {step !== "cards" && (
            <button style={s.btnGhost} onClick={() => setStep("cards")}>
              Back to sources
            </button>
          )}
          <span style={s.footerRule} />
          <button
            style={{
              ...s.btnPrimary,
              ...(connectedCount === 0 ? s.btnDisabled : {}),
            }}
            disabled={connectedCount === 0}
            onClick={onDone}
          >
            Continue to library &rarr;
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
  const cardStyle = {
    ...s.sourceCard,
    ...(!disabled ? s.sourceCardClickable : {}),
    ...(disabled && !connected ? s.sourceCardDisabled : {}),
  };

  return (
    <div
      style={cardStyle}
      onClick={() => {
        if (!disabled) onAction?.();
      }}
    >
      <span style={connected ? s.sourceRadioConnected : s.sourceRadio} />
      <div style={s.sourceBody}>
        <div style={s.sourceTitleRow}>
          <strong style={s.sourceTitle}>{title}</strong>
          <span style={s.sourceMeta}>· {meta}</span>
        </div>
        <p style={s.sourceDesc}>{description}</p>
        <span style={s.sourceDetail}>{detail}</span>
      </div>
      <button
        style={connected ? s.btnConnected : s.btnCard}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          onAction?.();
        }}
      >
        {actionLabel}
      </button>
    </div>
  );
}

function TranscriptionProviderCard({
  provider,
  connected,
  needsAccess,
  saving,
  onConnect,
  onFinishSetup,
}: {
  provider: TranscriptionProvider;
  connected: boolean;
  needsAccess: boolean;
  saving: boolean;
  onConnect: () => void;
  onFinishSetup: () => void;
}) {
  const label = TRANSCRIPTION_PROVIDER_LABELS[provider];
  return (
    <SourceCard
      title={label}
      meta="transcription api"
      description={
        needsAccess
          ? "API key saved. Backend access is still needed."
          : `Use ${label} for uploaded media transcription.`
      }
      detail="api key"
      connected={connected}
      actionLabel={connected ? "Connected" : needsAccess ? "Finish setup ->" : `Connect ->`}
      disabled={saving || connected}
      onAction={() => {
        if (connected) return;
        if (needsAccess) onFinishSetup();
        else onConnect();
      }}
    />
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

async function verifyGranolaStatus(api: ApiClient): Promise<void> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= VERIFY_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      await api.get<{ connected: boolean }>("/api/granola/status");
      return;
    } catch (err) {
      lastError = err;
      if (!isMissingSecretError(err) || attempt === VERIFY_RETRY_DELAYS_MS.length) break;
      await delay(VERIFY_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError;
}

async function verifySoundcoreStatus(api: ApiClient): Promise<void> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= VERIFY_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      await api.get<{ connected: boolean }>("/api/soundcore/status");
      return;
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
    message.includes("no granola api key configured") ||
    message.includes("no soundcore credentials configured") ||
    message.includes("missing soundcore secret") ||
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
    letterSpacing: "0.06em",
    textTransform: "lowercase" as const,
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
    lineHeight: "var(--lst-leading-body)",
    color: "var(--lst-blue)",
    margin: 0,
  },
  secretsNote: {
    fontSize: 12,
    lineHeight: 1.45,
    color: "var(--lst-ink-70)",
    margin: "10px 0 0",
  },
  secretsLink: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-blue)",
    textDecoration: "none",
    fontWeight: 500,
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
    letterSpacing: "0.06em",
    textTransform: "lowercase" as const,
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
  sourceCardClickable: {
    cursor: "pointer",
  },
  sourceCardDisabled: {
    opacity: 0.6,
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
    border: "1px solid var(--lst-ok)",
    display: "inline-block",
    background: "radial-gradient(circle, var(--lst-ok) 0 3px, transparent 4px)",
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
    letterSpacing: "0.06em",
    textTransform: "lowercase" as const,
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
    letterSpacing: "0.06em",
    textTransform: "lowercase" as const,
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
  helperList: {
    margin: "0 0 2px 18px",
    padding: 0,
    color: "var(--lst-ink-70)",
    fontSize: 12,
    lineHeight: 1.55,
  },
  fieldLabel: {
    fontFamily: MONO,
    fontSize: 10,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.06em",
    textTransform: "lowercase" as const,
  },
  inputLabel: {
    fontFamily: MONO,
    fontSize: 10,
    color: "var(--lst-ink-70)",
    letterSpacing: "0.06em",
    textTransform: "none" as const,
    marginTop: 2,
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
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },
  fieldStack: {
    display: "grid",
    gap: 6,
  },
  textarea: {
    fontFamily: FONT,
    width: "100%",
    minWidth: 0,
    minHeight: 150,
    boxSizing: "border-box" as const,
    border: "var(--lst-border)",
    background: "var(--lst-bg)",
    color: "var(--lst-blue)",
    fontSize: 13,
    lineHeight: 1.45,
    padding: "10px 12px",
    resize: "vertical" as const,
  },
  fileInput: {
    fontFamily: FONT,
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box" as const,
    border: "var(--lst-border)",
    background: "var(--lst-bg)",
    color: "var(--lst-blue)",
    fontSize: 12,
    padding: "9px 10px",
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
    color: "var(--lst-ok)",
    background: "var(--lst-ok-soft)",
    border: "1px solid var(--lst-ok)",
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
    border: "1px solid var(--lst-ok)",
    background: "var(--lst-ok-soft)",
    padding: "12px 14px",
  },
  checkmark: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 22,
    height: 22,
    borderRadius: 999,
    background: "var(--lst-ok)",
    color: "var(--lst-bg)",
    fontSize: 13,
    fontWeight: 700,
  },
  successTitle: {
    color: "var(--lst-ok)",
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
    color: "var(--lst-ok)",
  },
  errorCard: {
    fontSize: 12,
    color: "var(--lst-alert)",
    border: "1px solid var(--lst-alert)",
    background: "var(--lst-alert-soft)",
    padding: "10px 12px",
    lineHeight: 1.4,
  },
};
