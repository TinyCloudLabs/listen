import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from "react";
import type { ComposedManifestRequest, TinyCloudWeb } from "@tinycloud/web-sdk";
import type { ServerInfo, ServerInfoPermission, WorkspaceStateResponse } from "@listen/core";
import {
  connectWallet,
  requestNonce,
  verifySession,
  createAndSignIn,
  restoreTinyCloudWeb,
  createApiClient,
  createManifestDelegation,
  createPermissionDelegation,
  sendDelegation,
  revokeDelegation,
  checkDelegationStatus,
  SessionStore,
  loadPersistedSession,
  clearPersistedSession,
  isMissingParentDelegationError,
  composeManifestWithDelegatees,
  resolveManifestPermissions,
  type ApiClient,
} from "@listen/client";

import { AuthPanel } from "./components/AuthPanel";
import { SourcesSetup } from "./components/SourcesSetup";
import { SyncControl } from "./components/SyncControl";
import { ConversationList } from "./components/ConversationList";
import { ConversationDetail } from "./components/ConversationDetail";
import { ChatScreen } from "./components/ChatScreen";
import { ConnectionsScreen } from "./components/ConnectionsScreen";
import { LiveWriteEvents } from "./components/LiveWriteEvents";
import { ConnectAgentButton } from "./components/ConnectAgentButton";
import { ConversationShareDialog } from "./components/ConversationShareDialog";
import { ListenOwnerShareDialog } from "./components/ListenOwnerShareDialog";
import { ListenOwnerPublishedShares } from "./components/ListenOwnerPublishedShares";
import { GlobalSyncIndicator } from "./components/GlobalSyncIndicator";
import { AddTranscriptHub } from "./components/AddTranscriptHub";
import { SharedWithMe } from "./components/SharedWithMe";
import { AppShell, type ShellRoute, type ShellSourceConfig } from "./components/AppShell";
import { MobileExperience } from "./components/mobile";
import { useIsMobile } from "./hooks/useIsMobile";
import { APP_MANIFEST } from "./lib/appManifest";
import { debugFetch, debugLog, startDebugStep } from "./lib/debug";
import { purgeListenLocalData } from "./lib/localData";
import { createTinyCloudConversationApi } from "./lib/tinycloudConversations";
import { readShareTokenFromLocation } from "./lib/listenShareLinks";
import {
  clearBackendWorkspaceCache,
  readBackendWorkspaceCache,
  workspaceStateFromCache,
  writeBackendWorkspaceCache,
} from "./lib/backendWorkspaceCache";
import {
  createBackendDelegationRenewer,
  withDelegationAutoRenewal,
  type BackendDelegationRenewer,
} from "./lib/backendDelegationRenewal";
import {
  classifyDelegationFailure,
  classifyDelegationState,
  sourceNeedsConsent,
  type DelegationLifecycleState,
} from "./lib/delegationState";

// ── Environment ─────────────────────────────────────────────────────

const OPENKEY_HOST = import.meta.env.VITE_OPENKEY_HOST || "https://openkey.so";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
const TINYCLOUD_HOST = import.meta.env.VITE_TINYCLOUD_HOST;
const TINYCLOUD_HOSTS = TINYCLOUD_HOST ? [TINYCLOUD_HOST] : undefined;
const AGENT_ENDPOINT = import.meta.env.VITE_AGENT_ENDPOINT || "http://localhost:4097";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const HAS_FRONTEND_GOOGLE_CLIENT_ID = Boolean(GOOGLE_CLIENT_ID);
const ENABLE_AGENT = import.meta.env.VITE_ENABLE_AGENT === "true";
const ENABLE_TINYCLOUD_HOOKS = import.meta.env.VITE_ENABLE_TINYCLOUD_HOOKS === "true";
const CLIENT_CAPABILITY_VERSION = "soundcore-secrets-v2";
const CLIENT_CAPABILITY_VERSION_KEY = "listen:capability-version";
const STORAGE_SESSION_RECONNECT_MESSAGE =
  "TinyCloud storage was updated. Sign in once to reconnect your workspace.";
const CONVERSATION_HOOK_PATH_PREFIX = "conversations/conversation";
const FIREFLIES_SECRET_NAME = "FIREFLIES_API_KEY";
const GRANOLA_SECRET_NAME = "GRANOLA_API_KEY";
const SOUNDCORE_SESSION_SECRET_NAME = "SOUNDCORE_SESSION";
const SOUNDCORE_AUTH_TOKEN_SECRET_NAME = "SOUNDCORE_AUTH_TOKEN";
const SOUNDCORE_UID_SECRET_NAME = "SOUNDCORE_UID";
const SOUNDCORE_OPENUDID_SECRET_NAME = "SOUNDCORE_OPENUDID";
const SOUNDCORE_SECRET_NAMES = [
  SOUNDCORE_AUTH_TOKEN_SECRET_NAME,
  SOUNDCORE_UID_SECRET_NAME,
  SOUNDCORE_OPENUDID_SECRET_NAME,
] as const;
const SOUNDCORE_DELEGATED_SECRET_NAMES = [SOUNDCORE_SESSION_SECRET_NAME] as const;
const ASSEMBLYAI_SECRET_NAME = "ASSEMBLYAI_API_KEY";
const DEEPGRAM_SECRET_NAME = "DEEPGRAM_API_KEY";
type ProviderSecretSource = "fireflies" | "granola" | "soundcore" | "assemblyai" | "deepgram";
type TranscriptionProvider = "assemblyai" | "deepgram";
type TranscriptionProviderStatus = Record<TranscriptionProvider, boolean | null>;
type BackendAccessRenewalOutcome = "transient" | "session_authority";

interface OwnerSecretCheck {
  exists: boolean | null;
  error?: string;
}

const EMPTY_TRANSCRIPTION_STATUS: TranscriptionProviderStatus = {
  assemblyai: null,
  deepgram: null,
};

interface AppBootstrapContext {
  info: ServerInfo | null;
  agent: ServerInfo | null;
  composedRequest: ComposedManifestRequest;
  conversationEventPathPrefix: string | null;
}

function ensureClientCapabilityVersion(): void {
  if (typeof window === "undefined") return;

  try {
    if (window.localStorage.getItem(CLIENT_CAPABILITY_VERSION_KEY) === CLIENT_CAPABILITY_VERSION) {
      return;
    }

    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith("tinycloud:session:") || key === "listen:session") {
        window.localStorage.removeItem(key);
      }
    }
    window.localStorage.setItem(CLIENT_CAPABILITY_VERSION_KEY, CLIENT_CAPABILITY_VERSION);
  } catch {
    // Storage can be unavailable in private browsing or tests.
  }
}

ensureClientCapabilityVersion();

function ownerDidFromAddress(address: string, chainId = 1): string {
  return `did:pkh:eip155:${chainId}:${address}`;
}

function defaultEncryptionNetworkId(ownerDid: string): string {
  return `urn:tinycloud:encryption:${ownerDid}:default`;
}

function isChatEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_CHAT === "true";
}

async function fetchAgentInfo(endpoint: string): Promise<ServerInfo | null> {
  const step = startDebugStep("bootstrap.agent-info", { endpoint });
  try {
    const res = await debugFetch(`${endpoint}/info`, undefined, {
      client: "bootstrap",
      method: "GET",
      path: "/info",
    });
    if (!res.ok) {
      step.complete({ ok: false, status: res.status });
      return null;
    }
    const info = (await res.json()) as ServerInfo;
    step.complete({ ok: true, status: res.status, did: info.did });
    return info;
  } catch (err) {
    step.fail(err);
    return null;
  }
}

async function fetchBackendInfo(): Promise<ServerInfo | null> {
  const step = startDebugStep("bootstrap.backend-info", { endpoint: BACKEND_URL });
  try {
    const res = await debugFetch(`${BACKEND_URL}/api/server-info`, undefined, {
      client: "bootstrap",
      method: "GET",
      path: "/api/server-info",
    });
    if (!res.ok) {
      step.complete({ ok: false, status: res.status });
      return null;
    }
    const info = (await res.json()) as ServerInfo;
    step.complete({
      ok: true,
      status: res.status,
      did: info.did,
      googleMeetAvailable: info.features?.googleMeet?.available ?? null,
    });
    return info;
  } catch (err) {
    step.fail(err);
    return null;
  }
}

async function loadAppBootstrapContext(ownerDid?: string): Promise<AppBootstrapContext> {
  const step = startDebugStep("bootstrap.context", {
    ownerDid,
    agentEnabled: ENABLE_AGENT,
    tinycloudHooksEnabled: ENABLE_TINYCLOUD_HOOKS,
  });
  const [info, agent] = await Promise.all([
    fetchBackendInfo(),
    ENABLE_AGENT ? fetchAgentInfo(AGENT_ENDPOINT) : Promise.resolve(null),
  ]);
  const appManifest = APP_MANIFEST;
  const conversationEventPathPrefix = ENABLE_TINYCLOUD_HOOKS ? CONVERSATION_HOOK_PATH_PREFIX : null;
  const delegatees: ServerInfo[] = [info, agent].filter(
    (delegatee): delegatee is ServerInfo => delegatee !== null,
  );
  const composedRequest = composeManifestWithDelegatees(appManifest, delegatees, {
    ownerDid,
    ...(info ? { decryptDelegateDid: info.did } : {}),
  });

  const context = {
    info,
    agent,
    composedRequest,
    conversationEventPathPrefix,
  };
  step.complete({
    hasBackendInfo: info !== null,
    hasAgentInfo: agent !== null,
    delegateeCount: delegatees.length,
    conversationEventPathPrefix,
  });
  return context;
}

function localConversationEventPathPrefix(): string | null {
  if (!ENABLE_TINYCLOUD_HOOKS) return null;
  return CONVERSATION_HOOK_PATH_PREFIX;
}

const BACKEND_ACCESS_INVALIDATION_CODES = new Set([
  "no_delegation",
  "delegation_expired",
  "delegation_stale",
  "delegation_unavailable",
  "delegation_activation_failed",
  "gateway_timeout",
  "backend_unavailable",
  "backend_access_unavailable",
  "node_unavailable",
  "store_unavailable",
  "delegation_store_unavailable",
  "delegation_store_invalid_response",
  "workspace_state_failed",
  "secret_read_failed",
  "fireflies_secret_unavailable",
  "granola_secret_unavailable",
  "soundcore_secret_unavailable",
  "transcription_secret_unavailable",
  "secrets_access_missing",
  "invalid_secret_response",
]);

const SESSION_EXPIRY_CODES = new Set([
  "session_expired",
  "missing_token",
  "invalid_token",
  "unauthenticated",
  "unauthorized",
]);

function isBackendAccessInvalidationError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const value = err as { code?: unknown; status?: unknown; name?: unknown; message?: unknown };
  const code = typeof value.code === "string" ? value.code : "";
  const normalizedCode = code.toLowerCase();
  // Optional integrations use 501 when intentionally disabled. That is a
  // feature-state response, not evidence that backend access became unavailable.
  if (normalizedCode === "not_configured") return false;
  if (
    BACKEND_ACCESS_INVALIDATION_CODES.has(normalizedCode) ||
    /(?:unavailable|timeout|timed_out|transport|network|store|kv|node|secret)/.test(normalizedCode)
  ) {
    return true;
  }

  // Server failures are operational, while ordinary 4xx validation, auth, and
  // business responses are not evidence that the delegation is unavailable.
  if (typeof value.status === "number" && (value.status >= 500 || value.status === 408)) {
    return true;
  }
  const name = typeof value.name === "string" ? value.name : "";
  const message = typeof value.message === "string" ? value.message : "";
  return (
    name === "TypeError" ||
    name === "AbortError" ||
    /Failed to fetch|NetworkError|fetch failed|ECONN|ETIMEDOUT|timed out|network (?:unavailable|down|failed|error)/i.test(
      message,
    )
  );
}

function isSessionExpiryError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" && SESSION_EXPIRY_CODES.has(code);
}

function withBackendWorkspaceCacheInvalidation(
  api: ApiClient,
  onInvalidAccess: (err: unknown) => void,
): ApiClient {
  const wrap = async <Result,>(operation: () => Promise<Result>): Promise<Result> => {
    try {
      return await operation();
    } catch (err) {
      if (isBackendAccessInvalidationError(err)) onInvalidAccess(err);
      throw err;
    }
  };

  return {
    get<T>(path: string): Promise<T> {
      return wrap(() => api.get<T>(path));
    },
    post<T>(path: string, body?: unknown): Promise<T> {
      return wrap(() => (body === undefined ? api.post<T>(path) : api.post<T>(path, body)));
    },
    put<T>(path: string, body?: unknown): Promise<T> {
      return wrap(() => (body === undefined ? api.put<T>(path) : api.put<T>(path, body)));
    },
    del<T>(path: string): Promise<T> {
      return wrap(() => api.del<T>(path));
    },
  };
}

function withSessionExpiryDetection(api: ApiClient, onSessionExpired: () => void): ApiClient {
  const wrap = async <Result,>(operation: () => Promise<Result>): Promise<Result> => {
    try {
      return await operation();
    } catch (err) {
      if (isSessionExpiryError(err)) onSessionExpired();
      throw err;
    }
  };

  return {
    get<T>(path: string): Promise<T> {
      return wrap(() => api.get<T>(path));
    },
    post<T>(path: string, body?: unknown): Promise<T> {
      return wrap(() => (body === undefined ? api.post<T>(path) : api.post<T>(path, body)));
    },
    put<T>(path: string, body?: unknown): Promise<T> {
      return wrap(() => (body === undefined ? api.put<T>(path) : api.put<T>(path, body)));
    },
    del<T>(path: string): Promise<T> {
      return wrap(() => api.del<T>(path));
    },
  };
}

function workspaceBackendStatus(readable: boolean | null) {
  return readable;
}

function aggregateSoundcoreReadability(
  secrets: WorkspaceStateResponse["backendReadableSecrets"],
): boolean | null {
  const soundcoreSecrets = [
    secrets.soundcoreSession,
    secrets.soundcoreAuthToken,
    secrets.soundcoreUid,
    secrets.soundcoreOpenudid,
  ];
  if (soundcoreSecrets.some((secret) => secret.error !== undefined)) return null;

  const legacyReadable =
    secrets.soundcoreAuthToken.readable === true &&
    secrets.soundcoreUid.readable === true &&
    secrets.soundcoreOpenudid.readable === true
      ? true
      : secrets.soundcoreAuthToken.readable === false ||
          secrets.soundcoreUid.readable === false ||
          secrets.soundcoreOpenudid.readable === false
        ? false
        : null;
  if (secrets.soundcoreSession.readable === true || legacyReadable === true) return true;
  if (secrets.soundcoreSession.readable === false && legacyReadable === false) return false;
  return null;
}

function applyWorkspaceReadiness(
  state: WorkspaceStateResponse,
  {
    hasTinyCloud,
    setHasBackendDelegation,
    setBackendDelegationState,
    setHasFirefliesBackendAccess,
    setHasGranolaBackendAccess,
    setHasSoundcoreBackendAccess,
    setHasTranscriptionBackendAccess,
    setHasGoogleMeet,
    setHasKey,
    setHasGranolaKey,
    setHasSoundcoreKey,
    setHasTranscriptionKeys,
    setHasExistingConversations,
    backendAccessRenewalOutcome,
    ownerSecretDiscoveryPending,
    ownerSecretDiscoveryFailed,
  }: {
    hasTinyCloud: boolean;
    setHasBackendDelegation: (value: boolean) => void;
    setBackendDelegationState: (value: DelegationLifecycleState) => void;
    setHasFirefliesBackendAccess: (value: boolean | null) => void;
    setHasGranolaBackendAccess: (value: boolean | null) => void;
    setHasSoundcoreBackendAccess: (value: boolean | null) => void;
    setHasTranscriptionBackendAccess: (value: TranscriptionProviderStatus) => void;
    setHasGoogleMeet: (value: boolean | null) => void;
    setHasKey: (value: SetStateAction<boolean | null>) => void;
    setHasGranolaKey: (value: SetStateAction<boolean | null>) => void;
    setHasSoundcoreKey: (value: SetStateAction<boolean | null>) => void;
    setHasTranscriptionKeys: (value: SetStateAction<TranscriptionProviderStatus>) => void;
    setHasExistingConversations: (value: boolean) => void;
    backendAccessRenewalOutcome?: BackendAccessRenewalOutcome | null;
    ownerSecretDiscoveryPending?: boolean;
    ownerSecretDiscoveryFailed?: boolean;
  },
): void {
  const classifiedDelegationState = classifyDelegationState(state.delegation);
  const delegationActive = classifiedDelegationState === "ready";
  const resolvedDelegationState =
    ownerSecretDiscoveryFailed ||
    (backendAccessRenewalOutcome === "transient" &&
      (state.delegation.status === "expired" || state.delegation.status === "stale"))
      ? "unavailable"
      : classifiedDelegationState;
  const backendSecretReadable = state.backendReadableSecrets;
  const soundcoreBackendReadable = aggregateSoundcoreReadability(backendSecretReadable);
  const operationalSecretFailure =
    delegationActive &&
    [
      backendSecretReadable.fireflies,
      backendSecretReadable.granola,
      backendSecretReadable.assemblyai,
      backendSecretReadable.deepgram,
    ].some((secret) => secret.readable === null && secret.error !== undefined);
  const operationalSoundcoreFailure =
    delegationActive &&
    [
      backendSecretReadable.soundcoreSession,
      backendSecretReadable.soundcoreAuthToken,
      backendSecretReadable.soundcoreUid,
      backendSecretReadable.soundcoreOpenudid,
    ].some((secret) => secret.error !== undefined);
  const googleMeetUnavailable = delegationActive && state.googleMeet.connected === null;
  const conversationExistenceUnknown = delegationActive && state.conversations.hasAny === null;
  setBackendDelegationState(
    ownerSecretDiscoveryPending ||
      operationalSecretFailure ||
      operationalSoundcoreFailure ||
      googleMeetUnavailable ||
      conversationExistenceUnknown
      ? "unavailable"
      : resolvedDelegationState,
  );
  setHasBackendDelegation(delegationActive && !ownerSecretDiscoveryPending);

  setHasFirefliesBackendAccess(workspaceBackendStatus(backendSecretReadable.fireflies.readable));
  setHasGranolaBackendAccess(workspaceBackendStatus(backendSecretReadable.granola.readable));
  setHasSoundcoreBackendAccess(workspaceBackendStatus(soundcoreBackendReadable));
  setHasTranscriptionBackendAccess({
    assemblyai: workspaceBackendStatus(backendSecretReadable.assemblyai.readable),
    deepgram: workspaceBackendStatus(backendSecretReadable.deepgram.readable),
  });
  setHasGoogleMeet(state.googleMeet.connected);

  if (!hasTinyCloud) {
    setHasKey(backendSecretReadable.fireflies.readable === true);
    setHasGranolaKey(backendSecretReadable.granola.readable === true);
    setHasSoundcoreKey(soundcoreBackendReadable === true);
    setHasTranscriptionKeys({
      assemblyai: backendSecretReadable.assemblyai.readable === true,
      deepgram: backendSecretReadable.deepgram.readable === true,
    });
  } else {
    if (backendSecretReadable.fireflies.readable === true) setHasKey(true);
    if (backendSecretReadable.granola.readable === true) setHasGranolaKey(true);
    if (soundcoreBackendReadable) setHasSoundcoreKey(true);
    if (
      backendSecretReadable.assemblyai.readable === true ||
      backendSecretReadable.deepgram.readable === true
    ) {
      setHasTranscriptionKeys((previous) => ({
        assemblyai: backendSecretReadable.assemblyai.readable === true || previous.assemblyai,
        deepgram: backendSecretReadable.deepgram.readable === true || previous.deepgram,
      }));
    }
  }

  if (state.conversations.hasAny !== null) setHasExistingConversations(state.conversations.hasAny);
}

// Display headlines render in JetBrains Mono (--lst-font-display)
// with weight 400, tight tracking, and tight leading. Eyebrows/kickers are
// lowercase mono with a small leading status dot.
const landingDisplayHeadline: React.CSSProperties = {
  fontFamily: "var(--lst-font-display)",
  fontWeight: 400,
  letterSpacing: "-0.04em",
  lineHeight: 1.05,
};

const landingKicker: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  textTransform: "none",
};

function LandingIcon({ name, size = 14 }: { name: "plus" | "minus"; size?: number }) {
  if (name === "minus") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function LandingLogo({ size = 26 }: { size?: number }) {
  return (
    <span className="landing-logo">
      <span className="landing-mark" style={{ width: size, height: size }} />
      <span>listen</span>
    </span>
  );
}

function LandingHeroGraphic() {
  return (
    <div className="landing-hero-graphic" aria-hidden="true">
      <div className="landing-energy">
        <div className="landing-energy-dots">
          <span className="landing-dot-md" />
          <span className="landing-dot-md" />
        </div>
      </div>
      <span className="landing-g-elem landing-dot-lg" style={{ top: "8%", left: "10%" }} />
      <span className="landing-g-elem landing-dot-md" style={{ top: "22%", left: "26%" }} />
      <span className="landing-g-elem landing-symbol" style={{ top: "12%", left: "4%" }}>
        +
      </span>
      <span className="landing-g-elem landing-symbol" style={{ top: "32%", left: "16%" }}>
        +
      </span>
      <span className="landing-g-elem landing-dot-lg" style={{ bottom: "10%", right: "12%" }} />
      <span className="landing-g-elem landing-dot-md" style={{ bottom: "32%", right: "6%" }} />
      <span className="landing-g-elem landing-symbol" style={{ bottom: "22%", right: "22%" }}>
        -
      </span>
      <span className="landing-g-elem landing-dot-md" style={{ bottom: "14%", left: "22%" }} />
      <span className="landing-g-elem landing-symbol" style={{ bottom: "6%", left: "40%" }}>
        +
      </span>
      <span className="landing-g-elem landing-dot-md" style={{ top: "12%", right: "32%" }} />
      <span className="landing-g-elem landing-symbol" style={{ top: "4%", right: "16%" }}>
        -
      </span>
    </div>
  );
}

const previewRows = [
  {
    date: "MAY 04",
    time: "15:42",
    title: "Q3 Roadmap Review",
    preview: "Aligned on retention as the Q3 bet...",
    duration: "47:12",
  },
  {
    date: "MAY 04",
    time: "11:20",
    title: "Acme - Discovery 2",
    preview: "Brian commits to pilot in May, security own...",
    duration: "52:08",
  },
  {
    date: "MAY 03",
    time: "16:00",
    title: "Design crit - Listen v2",
    preview: "Volume vs density - keep the visual DNA quiet...",
    duration: "38:55",
  },
  {
    date: "MAY 03",
    time: "09:15",
    title: "Personal log - ideas",
    preview: "Need to write down the bit about monochrome...",
    duration: "04:22",
  },
  {
    date: "MAY 02",
    time: "14:30",
    title: "Hiring loop - Maya",
    preview: "Strong signal on systems thinking...",
    duration: "45:00",
  },
];

function LandingAppPreview() {
  return (
    <div className="landing-app-preview">
      <aside className="landing-preview-sidebar">
        <div className="landing-preview-head">
          <span className="landing-mono">14 records</span>
          <span className="landing-plus">+</span>
        </div>
        <input
          className="landing-search"
          placeholder="Search transcripts..."
          aria-label="Search transcripts"
        />
        <div className="landing-preview-list">
          {previewRows.map((row, index) => (
            <div key={row.title} className={`landing-preview-row${index === 0 ? " active" : ""}`}>
              <div className="landing-row-meta landing-mono">
                <span>{row.date}</span>
                <span>{row.time}</span>
              </div>
              <div className="landing-row-title">
                {index === 0 && <span className="landing-dot" />}
                {row.title}
              </div>
              <div className="landing-row-preview">{row.preview}</div>
            </div>
          ))}
        </div>
      </aside>

      <section className="landing-preview-detail">
        <div className="landing-detail-head">
          <h2>Q3 Roadmap Review</h2>
          <div className="landing-detail-meta">
            <span className="landing-mono">ID: a7f9-2b</span>
            <span>-</span>
            <span className="landing-mono">DUR: 47:12</span>
            <span>-</span>
            <span className="landing-mono">GRANOLA - MAY 04</span>
          </div>
          <div className="landing-player">
            <button className="landing-btn landing-btn-solid landing-btn-icon" aria-label="Play">
              <span className="landing-play-symbol">▶</span>
            </button>
            <span className="landing-mono">15:42</span>
            <div className="landing-timeline">
              <div className="landing-timeline-progress" />
              <div className="landing-timeline-handle" />
            </div>
            <span className="landing-mono">47:12</span>
            <button className="landing-btn landing-btn-icon" aria-label="Add marker">
              <LandingIcon name="plus" size={13} />
            </button>
          </div>
        </div>
        <div className="landing-transcript">
          {[
            [
              "15:30",
              "Marcus",
              "So, regarding the adaptation process. The reference images exist on a spectrum - expressive versus functional.",
            ],
            [
              "15:42",
              "Jamie",
              "Exactly. The visual DNA - colors, type family, geometry - stays the same. The volume and density adapt based on the gap.",
              true,
            ],
            [
              "16:05",
              "Marcus",
              "Right, it needs to recede while the user is trying to read their own transcripts. The layout emerges from the data itself.",
            ],
            ["16:22", "Sarah", "Opacity on the blue gives hierarchy without breaking the rule."],
          ].map(([time, speaker, text, highlighted]) => (
            <div key={`${time}-${speaker}`} className="landing-block">
              <div className="landing-ts">{time}</div>
              <div>
                <div className="landing-speaker">{speaker}</div>
                <div className={`landing-utterance${highlighted ? " highlighted" : ""}`}>
                  {text}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function LandingPage({
  loading,
  error,
  onSignIn,
}: {
  loading: boolean;
  error: string | null;
  onSignIn: () => void;
}) {
  const signInLabel = loading ? "Connecting..." : "Open app";

  return (
    <div className="landing-page landing-noise">
      <header className="landing-header">
        <div className="landing-container landing-header-inner">
          <LandingLogo />
          <nav className="landing-nav" aria-label="Main navigation">
            <a href="#features">Features</a>
            <a href="#sources">Sources</a>
            <span className="landing-divider" />
            <button className="landing-btn landing-btn-solid" onClick={onSignIn} disabled={loading}>
              {signInLabel}
            </button>
          </nav>
        </div>
      </header>

      <main className="landing-main">
        <div className="landing-container">
          <section className="landing-hero">
            <div>
              <span className="landing-version" style={landingKicker}>
                <span className="landing-dot" />
                v0.4 - may 2026
              </span>
              <h1 style={landingDisplayHeadline}>
                Capture thoughts.
                <br />
                Transform them into insights.
              </h1>
              <p className="landing-hero-lede">
                One library for transcripts, audio, and meeting notes from Fireflies, Google Meet,
                Granola imports, and the files you already have.
              </p>
              <div className="landing-hero-meta">
                <span>
                  <span className="landing-dot" />
                  connect many sources
                </span>
                <span>-</span>
                <span>transcripts and audio indexed in TinyCloud</span>
              </div>
              <div className="landing-hero-actions">
                <button className="landing-btn" onClick={onSignIn} disabled={loading}>
                  {signInLabel}
                </button>
              </div>
              {error && (
                <div className="landing-error" role="alert">
                  <strong>Connection failed.</strong>
                  <span>{error}</span>
                </div>
              )}
            </div>
            <LandingHeroGraphic />
          </section>

          <section id="sources" className="landing-sources-section">
            <div className="landing-section-head">
              <div>
                <span className="landing-eyebrow" style={landingKicker}>
                  <span className="landing-dot" />
                  01 - sources
                </span>
                <h2 style={landingDisplayHeadline}>Bring everything in.</h2>
              </div>
              <span className="landing-mono landing-muted">many sources - synced or imported</span>
            </div>
            <div className="landing-sources-row">
              {[
                ["Fireflies", "meeting transcripts"],
                ["Google Meet", "captions sync"],
                ["Granola", "existing notes import"],
                ["Files", "transcripts + audio"],
              ].map(([name, meta]) => (
                <div key={name} className="landing-source-cell">
                  <span className="landing-dot" />
                  <span className="landing-source-name">{name}</span>
                  <span className="landing-source-meta">{meta}</span>
                </div>
              ))}
            </div>
          </section>

          <section id="features" className="landing-feature-section">
            <div className="landing-grid-3">
              {[
                [
                  "01",
                  "One library",
                  "Fireflies, Google Meet, Granola imports, transcripts, and audio files land in a single chronological feed.",
                ],
                [
                  "02",
                  "Bring the archive",
                  "Import the conversations you already captured, then keep new source updates flowing into the same workspace.",
                ],
                [
                  "03",
                  "Search in chat",
                  "Ask across your transcript and audio library in a chat-like flow. Every result traces back to the source.",
                ],
              ].map(([num, title, description]) => (
                <div key={num} className="landing-feature">
                  <div className="landing-feature-num landing-mono">- {num}</div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="preview" className="landing-preview-section">
            <div className="landing-section-head">
              <div>
                <span className="landing-eyebrow" style={landingKicker}>
                  <span className="landing-dot" />
                  02 - your transcripts
                </span>
                <h2 style={landingDisplayHeadline}>The room, after the room.</h2>
              </div>
              <div className="landing-preview-actions">
                <span className="landing-mono landing-muted">Sort: Date</span>
                <button className="landing-btn landing-btn-icon" aria-label="Collapse preview">
                  <LandingIcon name="minus" size={14} />
                </button>
              </div>
            </div>
            <LandingAppPreview />
          </section>

          <section className="landing-quote-section">
            <p>
              "I recorded everything across meetings, notes, and files, but I had no idea where it
              lived. Listen helps me bring the whole archive together."
            </p>
            <span className="landing-mono landing-muted">- Priya R - Head of Product</span>
          </section>

          <footer className="landing-footer">
            <div className="landing-footer-grid">
              <div>
                <LandingLogo />
                <p>
                  A transcript workspace that brings meeting tools, imported notes, transcripts, and
                  audio into searchable, structured information.
                </p>
              </div>
              <div>
                <h3>Product</h3>
                <a href="#features">Features</a>
                <a href="#sources">Sources</a>
                <a href="#preview">Preview</a>
                <a href="/readme.html">Documentation</a>
              </div>
              <div>
                <h3>Company</h3>
                <a href="mailto:hello@listen.app">Contact</a>
              </div>
            </div>
            <div className="landing-footer-bottom">
              <span className="landing-mono landing-muted">© 2026 TinyCloud, Inc.</span>
              <a
                className="landing-mono landing-muted"
                href="https://tinycloud.xyz/interoperable-apps"
              >
                Interoperable apps
              </a>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

async function checkSecretExistsFromBackend(
  api: ApiClient,
  source: ProviderSecretSource,
): Promise<boolean> {
  const path = `/api/config/${source}-key/exists`;
  const step = startDebugStep("secret.backend-exists", { source, path });
  try {
    const result = await api.get<{ exists: boolean }>(path);
    step.complete({ exists: result.exists });
    return result.exists;
  } catch (err) {
    step.fail(err);
    throw err;
  }
}

async function checkOwnerSecretExists(
  tcw: TinyCloudWeb,
  secretName: string,
): Promise<OwnerSecretCheck> {
  try {
    const result = await tcw.secrets.get(secretName);
    if (result.ok === true) {
      return typeof result.data === "string" && result.data.trim() !== ""
        ? { exists: true }
        : {
            exists: null,
            error: "INVALID_SECRET_RESPONSE",
          };
    }
    const code = result.error?.code?.toLowerCase();
    if (code && ["key_not_found", "not_found", "kv_not_found"].includes(code)) {
      return { exists: false };
    }
    return {
      exists: null,
      error: code ?? result.error?.message ?? "owner_secret_check_failed",
    };
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : undefined;
    return {
      exists: null,
      error: code ?? (error instanceof Error ? error.message : String(error)),
    };
  }
}

function soundcoreOwnerSecretExists(
  session: boolean | null,
  legacy: readonly (boolean | null)[],
): boolean | null {
  if (session === true || legacy.every((value) => value === true)) return true;
  if (session === null || legacy.some((value) => value === null)) return null;
  return false;
}

function providerForTranscriptionSecret(secretName: string): TranscriptionProvider | null {
  if (secretName === ASSEMBLYAI_SECRET_NAME) return "assemblyai";
  if (secretName === DEEPGRAM_SECRET_NAME) return "deepgram";
  return null;
}

function backendSecretReadPermissions(secretNames: readonly string[]): ServerInfoPermission[] {
  return secretNames.map((secretName) => ({
    service: "tinycloud.kv",
    space: "secrets",
    path: `vault/secrets/${secretName}`,
    actions: ["get"],
    skipPrefix: true,
    description: `Read the encrypted ${secretName} payload for backend workflows.`,
  }));
}

function backendSecretDecryptPermissions(ownerDid?: string | null): ServerInfoPermission[] {
  if (!ownerDid) return [];

  return [
    {
      service: "tinycloud.encryption",
      space: "encryption",
      path: defaultEncryptionNetworkId(ownerDid),
      actions: ["decrypt"],
      skipPrefix: true,
      description: "Decrypt Listen secrets through the user's default encryption network.",
    },
  ];
}

function sourceSecretNames(source: "fireflies" | "granola" | "soundcore"): readonly string[] {
  if (source === "fireflies") return [FIREFLIES_SECRET_NAME];
  if (source === "granola") return [GRANOLA_SECRET_NAME];
  return SOUNDCORE_DELEGATED_SECRET_NAMES;
}

type WorkspaceStatusMode =
  | "checking"
  | "fireflies-access"
  | "granola-access"
  | "soundcore-access"
  | "wallet"
  | "backend-offline"
  | "delegation-unavailable";

function WorkspaceStatusPanel({
  mode,
  loading = false,
  error,
  onAction,
}: {
  mode: WorkspaceStatusMode;
  loading?: boolean;
  error?: string | null;
  onAction?: () => void;
}) {
  const content = {
    checking: {
      eyebrow: "workspace",
      title: "Checking workspace state.",
      copy: "Listen is checking backend access, source credentials, and whether transcripts already exist.",
      action: null,
      items: ["backend delegation", "secrets access", "existing transcripts"],
    },
    "fireflies-access": {
      eyebrow: "fireflies",
      title: "Finish Fireflies access.",
      copy: "The Fireflies key is stored in TinyCloud Secrets. Delegate access to the Listen backend so sync can run.",
      action: "Finish access",
      items: ["backend delegation", "secrets access", "existing transcripts"],
    },
    "granola-access": {
      eyebrow: "granola",
      title: "Finish Granola access.",
      copy: "The Granola key is stored in TinyCloud Secrets. Delegate access to the Listen backend so sync can run.",
      action: "Finish access",
      items: ["backend delegation", "secrets access", "existing transcripts"],
    },
    "soundcore-access": {
      eyebrow: "soundcore",
      title: "Finish Soundcore access.",
      copy: "The Soundcore credentials are stored in TinyCloud Secrets. Delegate access to the Listen backend so sync can run.",
      action: "Finish access",
      items: ["backend delegation", "secrets access", "existing transcripts"],
    },
    wallet: {
      eyebrow: "sources",
      title: "Reconnect wallet to connect sources.",
      copy: "This session was restored without a TinyCloud wallet instance. Reconnect to read or write Secrets and add providers.",
      action: "Reconnect wallet",
      items: ["wallet session", "secrets access", "source setup"],
    },
    "backend-offline": {
      eyebrow: "backend offline",
      title: "Backend offline.",
      copy: "TinyCloud conversations remain available directly from your space. Sync, source setup, Google Meet, and backend imports are unavailable until the Listen backend is reachable.",
      action: "Reconnect backend",
      items: ["TinyCloud direct reads", "sync unavailable", "source setup unavailable"],
    },
    "delegation-unavailable": {
      eyebrow: "workspace unavailable",
      title: "Backend access is temporarily unavailable.",
      copy: "Listen could not activate the stored delegation. This is an operational problem, not a consent request. Try again when the backend or TinyCloud node is reachable.",
      action: "Try again",
      items: ["stored grant preserved", "activation unavailable", "no wallet prompt"],
    },
  }[mode];

  return (
    <section style={s.statusPanel}>
      <span style={s.eyebrow}>- {content.eyebrow}</span>
      <h3 style={s.statusTitle}>{content.title}</h3>
      <p style={s.statusText}>{content.copy}</p>
      <div style={s.statusList}>
        {content.items.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      {error && <div style={s.statusError}>{error}</div>}
      {content.action && onAction && (
        <div style={s.statusActionRow}>
          <button
            style={loading ? { ...s.statusButton, ...s.statusButtonDisabled } : s.statusButton}
            disabled={loading}
            onClick={onAction}
          >
            {loading ? "Working..." : content.action}
          </button>
        </div>
      )}
    </section>
  );
}

function ChatUnderDevelopmentPanel() {
  return (
    <section style={s.statusPanel}>
      <span style={s.eyebrow}>- chat beta</span>
      <h3 style={s.statusTitle}>Chat is under development.</h3>
      <p style={s.statusText}>
        Transcript chat is currently in beta and is not available in this workspace yet.
      </p>
      <div style={s.statusList}>
        <span>disabled by default</span>
        <span>enable with VITE_ENABLE_CHAT=true</span>
      </div>
    </section>
  );
}

// ── App ─────────────────────────────────────────────────────────────

export function App() {
  const [address, setAddress] = useState<string | null>(null);
  const [did, setDid] = useState<string | null>(null);
  const [tcw, setTcw] = useState<TinyCloudWeb | null>(null);
  const [hasWalletSigner, setHasWalletSigner] = useState(false);
  const [api, setApi] = useState<ApiClient | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [hasGranolaKey, setHasGranolaKey] = useState<boolean | null>(null);
  const [hasSoundcoreKey, setHasSoundcoreKey] = useState<boolean | null>(null);
  const [hasTranscriptionKeys, setHasTranscriptionKeys] = useState<TranscriptionProviderStatus>(
    EMPTY_TRANSCRIPTION_STATUS,
  );
  const [hasBackendDelegation, setHasBackendDelegation] = useState<boolean | null>(null);
  const [backendDelegationState, setBackendDelegationState] =
    useState<DelegationLifecycleState | null>(null);
  const [hasFirefliesBackendAccess, setHasFirefliesBackendAccess] = useState<boolean | null>(null);
  const [hasGranolaBackendAccess, setHasGranolaBackendAccess] = useState<boolean | null>(null);
  const [hasSoundcoreBackendAccess, setHasSoundcoreBackendAccess] = useState<boolean | null>(null);
  const [hasTranscriptionBackendAccess, setHasTranscriptionBackendAccess] =
    useState<TranscriptionProviderStatus>(EMPTY_TRANSCRIPTION_STATUS);
  const [hasGoogleMeet, setHasGoogleMeet] = useState<boolean | null>(null);
  const [hasExistingConversations, setHasExistingConversations] = useState<boolean | null>(null);
  const [ownerSecretDiscoveryPending, setOwnerSecretDiscoveryPending] = useState(false);
  const [ownerSecretDiscoveryFailed, setOwnerSecretDiscoveryFailed] = useState(false);
  const [workspaceStatePending, setWorkspaceStatePending] = useState(false);
  const [hasWorkspaceStateSnapshot, setHasWorkspaceStateSnapshot] = useState(false);
  const [workspaceActionLoading, setWorkspaceActionLoading] = useState(false);
  const [workspaceActionError, setWorkspaceActionError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<ShellRoute>("inbox");
  const [sourcesSetupMode, setSourcesSetupMode] = useState<"onboarding" | "sources" | null>(null);
  const [sourcesInitialStep, setSourcesInitialStep] = useState<
    "cards" | "transcript-import" | "soundcore-key"
  >("cards");
  const [refreshKey, setRefreshKey] = useState(0);
  const [workspaceRefreshKey, setWorkspaceRefreshKey] = useState(0);
  const [ownerSecretRefreshKey, setOwnerSecretRefreshKey] = useState(0);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [shareConversationId, setShareConversationId] = useState<string | null>(null);
  const [ownerShareConversationIds, setOwnerShareConversationIds] = useState<string[]>([]);
  const [ownerShareRefreshKey, setOwnerShareRefreshKey] = useState(0);
  const [showAddHub, setShowAddHub] = useState(false);
  const [searchFocusKey, setSearchFocusKey] = useState(0);
  const [pendingBanner, setPendingBanner] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [backendAccessExpired, setBackendAccessExpired] = useState(false);
  const [storageSessionInvalid, setStorageSessionInvalid] = useState(false);
  const [gmLapsedBanner, setGmLapsedBanner] = useState(false);
  const [gmLapsedError, setGmLapsedError] = useState<string | null>(null);
  const [liveWritePathPrefix, setLiveWritePathPrefix] = useState<string | null>(null);
  const [liveWriteHost, setLiveWriteHost] = useState<string | null>(null);
  const [liveWriteSpaceId, setLiveWriteSpaceId] = useState<string | null>(null);
  const [agentInfo, setAgentInfo] = useState<ServerInfo | null>(null);
  const [backendDid, setBackendDid] = useState<string | null>(null);
  const [capabilityRequest, setCapabilityRequest] = useState<ComposedManifestRequest | null>(null);
  const [serverGoogleMeetAvailable, setServerGoogleMeetAvailable] = useState<boolean | null>(null);

  const sessionStoreRef = useRef(new SessionStore());
  const backendRenewerRef = useRef<BackendDelegationRenewer | null>(null);
  const backendAccessRenewalOutcomeRef = useRef<BackendAccessRenewalOutcome | null>(null);
  const ownerSecretDiscoveryPendingRef = useRef(false);
  const ownerSecretDiscoveryFailedRef = useRef(false);
  const authInFlightRef = useRef(false);
  const isMobile = useIsMobile();
  const chatEnabled = isChatEnabled();
  const [shareToken, setShareToken] = useState(() => readShareTokenFromLocation());
  const conversationApi = useMemo(
    () => (api || tcw ? createTinyCloudConversationApi(api, tcw) : null),
    [api, tcw],
  );
  const conversationCacheScope = address?.toLowerCase() ?? did ?? null;

  const createBackendApiClient = useCallback((addr: string, bDid: string): ApiClient => {
    const baseClient = createApiClient(BACKEND_URL, {
      sessionStore: sessionStoreRef.current,
    });

    const invalidatingClient = withBackendWorkspaceCacheInvalidation(baseClient, (err) => {
      clearBackendWorkspaceCache(addr, bDid);
      debugLog("workspace-state.cache", "cleared", {
        reason: err instanceof Error ? err.message : String(err),
      });
      setHasBackendDelegation(false);
      setBackendDelegationState("unavailable");
      setHasFirefliesBackendAccess(null);
      setHasGranolaBackendAccess(null);
      setHasSoundcoreBackendAccess(null);
      setHasTranscriptionBackendAccess(EMPTY_TRANSCRIPTION_STATUS);
      setHasGoogleMeet(null);
    });

    const sessionAwareClient = withSessionExpiryDetection(invalidatingClient, () =>
      setSessionExpired(true),
    );

    // Reactive renewal: 401 delegation_expired / 403 no_delegation trigger a
    // silent re-delegation and a single retry of the failed request.
    // The cache-invalidation wrapper is nested inside auto-renewal, so delegation_expired invalidates before the renewal retry; SWR keeps state visible and onRenewed revalidates.
    return withDelegationAutoRenewal(sessionAwareClient, () => backendRenewerRef.current);
  }, []);

  const markStorageSessionInvalid = useCallback(
    (addr: string, tcwInstance: TinyCloudWeb, bDid?: string) => {
      clearPersistedSession(addr);
      void tcwInstance.signOut?.().catch(() => undefined);
      if (bDid) clearBackendWorkspaceCache(addr, bDid);
      backendRenewerRef.current = null;
      backendAccessRenewalOutcomeRef.current = null;
      setStorageSessionInvalid(true);
      setSessionExpired(false);
      setBackendAccessExpired(false);
      setBackendDelegationState("unavailable");
      setTcw(null);
      setHasWalletSigner(false);
      setHasBackendDelegation(false);
      setLiveWriteHost(null);
      setLiveWriteSpaceId(null);
    },
    [],
  );

  /**
   * Install the silent backend-delegation renewer for the current session.
   *
   * Captures the freshly created TinyCloud instance / backend DID / composed
   * capability request as locals (React state is not committed yet when this
   * runs inside sign-in/restore). Renewal creates a real newly signed UCAN
   * via the SDK's session-key path — `delegateTo` throws instead of prompting
   * when the session cannot derive the delegation, so this can never surface
   * a wallet prompt.
   */
  const installBackendDelegationRenewer = useCallback(
    (
      addr: string,
      tcwInstance: TinyCloudWeb,
      bDid: string,
      composedRequest: ComposedManifestRequest,
      options?: { onMissingParent?: () => void },
    ): BackendDelegationRenewer => {
      let validatedDelegation: string | null = null;
      const renewer = createBackendDelegationRenewer({
        checkStatus: () => {
          const token = sessionStoreRef.current.getToken();
          if (!token) return Promise.reject(new Error("Missing backend session token"));
          return checkDelegationStatus(BACKEND_URL, token);
        },
        validateParent: async () => {
          const { serialized } = await createManifestDelegation(tcwInstance, bDid, composedRequest);
          validatedDelegation = serialized;
        },
        renew: async () => {
          const token = sessionStoreRef.current.getToken();
          if (!token) throw new Error("Missing backend session token");
          const serialized =
            validatedDelegation ??
            (await createManifestDelegation(tcwInstance, bDid, composedRequest)).serialized;
          validatedDelegation = null;
          return sendDelegation(BACKEND_URL, serialized, token);
        },
        onRenewed: () => {
          backendAccessRenewalOutcomeRef.current = null;
          clearBackendWorkspaceCache(addr, bDid);
          setBackendDelegationState("ready");
          setHasBackendDelegation(true);
          setBackendAccessExpired(false);
          setRefreshKey((k) => k + 1);
          setWorkspaceRefreshKey((k) => k + 1);
        },
        onRenewalFailed: ({ permanent, error }) => {
          if (isMissingParentDelegationError(error)) {
            options?.onMissingParent?.();
            markStorageSessionInvalid(addr, tcwInstance, bDid);
            return;
          }
          const state = permanent ? classifyDelegationFailure(error) : "unavailable";
          backendAccessRenewalOutcomeRef.current =
            state === "needs_consent" ? "session_authority" : "transient";
          setBackendDelegationState(state);
          setHasBackendDelegation(false);
          setBackendAccessExpired(state === "needs_consent");
          setWorkspaceRefreshKey((key) => key + 1);
        },
        log: (event, detail) => debugLog("delegation.auto-renew", event, detail),
      });
      backendRenewerRef.current = renewer;
      return renewer;
    },
    [markStorageSessionInvalid],
  );

  useEffect(() => {
    const acceptShareFromLocation = () => {
      const token = readShareTokenFromLocation();
      if (!token) return;
      setShareToken(token);
      setActivePage("shared");
    };

    acceptShareFromLocation();
    window.addEventListener("hashchange", acceptShareFromLocation);
    return () => window.removeEventListener("hashchange", acceptShareFromLocation);
  }, []);

  const applyDirectTinyCloudSession = useCallback((addr: string, tcwInstance: TinyCloudWeb) => {
    clearBackendWorkspaceCache(addr);
    backendRenewerRef.current = null;
    backendAccessRenewalOutcomeRef.current = null;
    sessionStoreRef.current.clear();
    setAddress(addr);
    setDid(tcwInstance.did ?? null);
    setTcw(tcwInstance);
    setHasWalletSigner(true);
    setApi(null);
    setBackendDelegationState(null);
    setSessionExpired(false);
    setBackendAccessExpired(false);
    setStorageSessionInvalid(false);
    setAgentInfo(null);
    setBackendDid(null);
    setCapabilityRequest(null);
    setServerGoogleMeetAvailable(false);
    setLiveWritePathPrefix(localConversationEventPathPrefix());
    setLiveWriteHost(tcwInstance.hosts[0] ?? null);
    setLiveWriteSpaceId(tcwInstance.spaceId ?? null);
    setHasKey(false);
    setHasGranolaKey(false);
    setHasSoundcoreKey(false);
    setHasTranscriptionKeys({ assemblyai: false, deepgram: false });
    setHasBackendDelegation(false);
    setHasFirefliesBackendAccess(null);
    setHasGranolaBackendAccess(null);
    setHasSoundcoreBackendAccess(null);
    setHasTranscriptionBackendAccess(EMPTY_TRANSCRIPTION_STATUS);
    setHasGoogleMeet(null);
    setWorkspaceActionError(null);
    setSelectedConversationId(null);
    setShareConversationId(null);
  }, []);

  const signInDirectTinyCloud = useCallback(
    async (addr: string, web3Provider: Parameters<typeof createAndSignIn>[0]) => {
      const step = startDebugStep("auth.direct-tinycloud", { hasAddress: Boolean(addr) });
      try {
        const { tcw: tcwInstance } = await createAndSignIn(web3Provider, {
          autoCreateSpace: true,
          tinycloudHosts: TINYCLOUD_HOSTS,
          manifest: APP_MANIFEST,
        });
        applyDirectTinyCloudSession(addr, tcwInstance);
        step.complete({ did: tcwInstance.did ?? null, spaceId: tcwInstance.spaceId ?? null });
      } catch (err) {
        step.fail(err);
        throw err;
      }
    },
    [applyDirectTinyCloudSession],
  );

  const restoreStoredSession = useCallback(
    async (storedAddress?: string): Promise<boolean> => {
      const step = startDebugStep("auth.restore-session", {
        storedAddressProvided: Boolean(storedAddress),
      });
      const sessionAddress = sessionStoreRef.current.getAddress();
      const addr = storedAddress ?? sessionAddress;
      if (
        !addr ||
        !sessionAddress ||
        sessionAddress.toLowerCase() !== addr.toLowerCase() ||
        !sessionStoreRef.current.hasSession() ||
        sessionStoreRef.current.isExpired()
      ) {
        step.complete({
          restored: false,
          reason: "missing-or-expired-session",
          hasAddress: Boolean(addr),
          hasSessionAddress: Boolean(sessionAddress),
          hasSession: sessionStoreRef.current.hasSession(),
          expired: sessionStoreRef.current.isExpired(),
        });
        return false;
      }

      const persistedSession = loadPersistedSession(addr);
      const ownerDid = persistedSession?.did ?? ownerDidFromAddress(addr);
      let bootstrap: AppBootstrapContext;
      try {
        bootstrap = await loadAppBootstrapContext(ownerDid);
      } catch (err) {
        step.fail(err, { restored: false, reason: "bootstrap-failed" });
        return false;
      }
      const { info, agent, composedRequest, conversationEventPathPrefix } = bootstrap;
      if (!info) {
        step.complete({ restored: false, reason: "backend-info-unavailable" });
        return false;
      }
      const restoredTinyCloud = persistedSession
        ? await restoreTinyCloudWeb(addr, {
            autoCreateSpace: true,
            tinycloudHosts: TINYCLOUD_HOSTS,
            capabilityRequest: composedRequest,
          }).catch(() => null)
        : null;

      const apiClient = createBackendApiClient(addr, info.did);

      // Ensure the backend still holds a non-expired delegation before the
      // workspace-state fetch runs, so its delegation.status reflects the
      // renewed grant. Requires a restored TinyCloud session; without one the
      // existing re-grant UI handles it.
      backendRenewerRef.current = null;
      let restoredSessionValidated = false;
      let missingParent = false;
      if (restoredTinyCloud) {
        const renewer = installBackendDelegationRenewer(
          addr,
          restoredTinyCloud.tcw,
          info.did,
          composedRequest,
          { onMissingParent: () => (missingParent = true) },
        );
        restoredSessionValidated = await renewer.validateRestoredSession();
      }
      if (restoredTinyCloud && !restoredSessionValidated && !missingParent) {
        step.complete({ restored: false, reason: "parent-validation-failed" });
        return false;
      }

      setAddress(addr);
      setDid(
        missingParent
          ? (persistedSession?.did ?? null)
          : (restoredTinyCloud?.tcw.did ?? persistedSession?.did ?? null),
      );
      setTcw(missingParent ? null : (restoredTinyCloud?.tcw ?? null));
      setHasWalletSigner(false);
      setApi(apiClient);
      setSessionExpired(false);
      setBackendAccessExpired(false);
      if (!missingParent) setStorageSessionInvalid(false);
      if (backendAccessRenewalOutcomeRef.current === "session_authority") {
        setBackendAccessExpired(true);
      }
      setAgentInfo(agent);
      setBackendDid(info.did);
      setCapabilityRequest(composedRequest);
      setServerGoogleMeetAvailable(info.features?.googleMeet?.available ?? null);
      setLiveWritePathPrefix(conversationEventPathPrefix);
      setLiveWriteHost(missingParent ? null : (restoredTinyCloud?.tcw.hosts[0] ?? null));
      setLiveWriteSpaceId(
        missingParent
          ? null
          : (restoredTinyCloud?.tcw.spaceId ?? persistedSession?.spaceId ?? null),
      );
      setSelectedConversationId(null);
      setShareConversationId(null);
      step.complete({
        restored: true,
        hasPersistedTinyCloud: Boolean(persistedSession),
        restoredTinyCloud: restoredTinyCloud !== null,
        missingParent,
        backendDid: info.did,
        agentDid: agent?.did ?? null,
        restoredSessionValidated,
      });
      return true;
    },
    [createBackendApiClient, installBackendDelegationRenewer],
  );

  const renewBackendDelegation = useCallback(async () => {
    const step = startDebugStep("delegation.renew", {
      hasTinyCloud: Boolean(tcw),
      hasBackendDid: Boolean(backendDid),
      hasCapabilityRequest: Boolean(capabilityRequest),
    });
    if (!tcw || !backendDid || !capabilityRequest) {
      step.complete({ ok: false, reason: "missing-context" });
      throw new Error("Reconnect your wallet to finish source setup.");
    }

    const token = sessionStoreRef.current.getToken();
    if (!token) {
      step.complete({ ok: false, reason: "missing-token" });
      throw new Error("Session expired. Sign in again to finish source setup.");
    }

    try {
      const { serialized } = await createManifestDelegation(tcw, backendDid, capabilityRequest);
      const response = await sendDelegation(BACKEND_URL, serialized, token);
      if (response.activation !== "active") {
        setHasBackendDelegation(false);
        setBackendDelegationState("unavailable");
        setWorkspaceRefreshKey((key) => key + 1);
        throw Object.assign(
          new Error("Backend accepted the delegation, but activation is still unavailable."),
          { code: "delegation_activation_failed" },
        );
      }
      backendAccessRenewalOutcomeRef.current = null;
      setHasBackendDelegation(true);
      setBackendDelegationState("ready");
      backendRenewerRef.current?.reset();
      setBackendAccessExpired(false);
      setWorkspaceRefreshKey((key) => key + 1);
      step.complete({ ok: true, backendDid });
    } catch (err) {
      step.fail(err);
      if (address && isMissingParentDelegationError(err)) {
        markStorageSessionInvalid(address, tcw, backendDid);
      }
      throw err;
    }
  }, [address, backendDid, capabilityRequest, markStorageSessionInvalid, tcw]);

  const renewBackendDelegationWithSecrets = useCallback(
    async (secretNames: readonly string[]) => {
      const step = startDebugStep("delegation.renew-with-secrets", {
        hasTinyCloud: Boolean(tcw),
        hasBackendDid: Boolean(backendDid),
        hasCapabilityRequest: Boolean(capabilityRequest),
        secretCount: secretNames.length,
      });
      if (!tcw || !backendDid || !capabilityRequest) {
        step.complete({ ok: false, reason: "missing-context" });
        throw new Error("Reconnect your wallet to finish source setup.");
      }

      const token = sessionStoreRef.current.getToken();
      if (!token) {
        step.complete({ ok: false, reason: "missing-token" });
        throw new Error("Session expired. Sign in again to finish source setup.");
      }

      const target = capabilityRequest.delegationTargets.find((entry) => entry.did === backendDid);
      if (!target) {
        step.complete({ ok: false, reason: "missing-target" });
        throw new Error(`No manifest delegation target found for DID ${backendDid}`);
      }

      try {
        const secretPermissions = resolveManifestPermissions(APP_MANIFEST, [
          ...backendSecretReadPermissions(secretNames),
          ...backendSecretDecryptPermissions(tcw.did ?? did),
        ]);
        const { serialized } = await createPermissionDelegation(tcw, backendDid, [
          ...target.permissions,
          ...secretPermissions,
        ]);
        const response = await sendDelegation(BACKEND_URL, serialized, token);
        if (response.activation !== "active") {
          setHasBackendDelegation(false);
          setBackendDelegationState("unavailable");
          setWorkspaceRefreshKey((key) => key + 1);
          throw Object.assign(
            new Error("Backend accepted the delegation, but activation is still unavailable."),
            { code: "delegation_activation_failed" },
          );
        }
        backendAccessRenewalOutcomeRef.current = null;
        setHasBackendDelegation(true);
        setBackendDelegationState("ready");
        backendRenewerRef.current?.reset();
        setBackendAccessExpired(false);
        setWorkspaceRefreshKey((key) => key + 1);
        step.complete({ ok: true, backendDid, secretCount: secretNames.length });
      } catch (err) {
        step.fail(err);
        if (address && isMissingParentDelegationError(err)) {
          markStorageSessionInvalid(address, tcw, backendDid);
        }
        throw err;
      }
    },
    [address, backendDid, capabilityRequest, did, markStorageSessionInvalid, tcw],
  );

  useEffect(() => {
    if (!tcw) {
      ownerSecretDiscoveryPendingRef.current = false;
      setOwnerSecretDiscoveryPending(false);
      return;
    }

    let cancelled = false;
    // Keep the barrier synchronous: workspace-state can resolve before React
    // commits the pending state update from this effect.
    ownerSecretDiscoveryPendingRef.current = true;
    setOwnerSecretDiscoveryPending(true);
    ownerSecretDiscoveryFailedRef.current = false;
    setOwnerSecretDiscoveryFailed(false);
    setWorkspaceActionError(null);
    setHasKey(null);
    setHasGranolaKey(null);
    setHasSoundcoreKey(null);
    setHasTranscriptionKeys(EMPTY_TRANSCRIPTION_STATUS);

    Promise.all([
      checkOwnerSecretExists(tcw, FIREFLIES_SECRET_NAME),
      checkOwnerSecretExists(tcw, GRANOLA_SECRET_NAME),
      checkOwnerSecretExists(tcw, SOUNDCORE_SESSION_SECRET_NAME),
      ...SOUNDCORE_SECRET_NAMES.map((secretName) => checkOwnerSecretExists(tcw, secretName)),
      checkOwnerSecretExists(tcw, ASSEMBLYAI_SECRET_NAME),
      checkOwnerSecretExists(tcw, DEEPGRAM_SECRET_NAME),
    ]).then(
      ([fireflies, granola, soundcoreSession, ...remaining]) => {
        if (cancelled) return;
        ownerSecretDiscoveryPendingRef.current = false;
        setOwnerSecretDiscoveryPending(false);
        const [soundcoreAuthToken, soundcoreUid, soundcoreOpenudid, assemblyai, deepgram] =
          remaining;
        const checks = [
          fireflies,
          granola,
          soundcoreSession,
          soundcoreAuthToken,
          soundcoreUid,
          soundcoreOpenudid,
          assemblyai,
          deepgram,
        ];
        const discoveryFailure = checks.find((check) => check.error !== undefined);
        ownerSecretDiscoveryFailedRef.current = discoveryFailure !== undefined;
        setOwnerSecretDiscoveryFailed(discoveryFailure !== undefined);
        if (discoveryFailure) {
          setBackendDelegationState("unavailable");
          setWorkspaceActionError(discoveryFailure.error ?? "owner_secret_check_failed");
        }
        if (!discoveryFailure && api) setWorkspaceRefreshKey((key) => key + 1);
        setHasKey(fireflies.exists);
        setHasGranolaKey(granola.exists);
        setHasSoundcoreKey(
          soundcoreOwnerSecretExists(soundcoreSession.exists, [
            soundcoreAuthToken.exists,
            soundcoreUid.exists,
            soundcoreOpenudid.exists,
          ]),
        );
        setHasTranscriptionKeys({ assemblyai: assemblyai.exists, deepgram: deepgram.exists });
      },
      (_error) => {
        if (cancelled) return;
        ownerSecretDiscoveryPendingRef.current = false;
        setOwnerSecretDiscoveryPending(false);
        ownerSecretDiscoveryFailedRef.current = true;
        setOwnerSecretDiscoveryFailed(true);
        setBackendDelegationState("unavailable");
        setWorkspaceActionError(_error instanceof Error ? _error.message : String(_error));
        setHasKey(null);
        setHasGranolaKey(null);
        setHasSoundcoreKey(null);
        setHasTranscriptionKeys(EMPTY_TRANSCRIPTION_STATUS);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [api, ownerSecretRefreshKey, tcw]);

  useEffect(() => {
    if (!api) {
      setWorkspaceStatePending(false);
      setHasWorkspaceStateSnapshot(false);
      setHasBackendDelegation(tcw ? false : null);
      setBackendDelegationState(tcw ? "unavailable" : null);
      setHasFirefliesBackendAccess(null);
      setHasGranolaBackendAccess(null);
      setHasSoundcoreBackendAccess(null);
      setHasTranscriptionBackendAccess(EMPTY_TRANSCRIPTION_STATUS);
      setHasGoogleMeet(null);
      if (tcw) {
        setHasKey(false);
        setHasGranolaKey(false);
        setHasSoundcoreKey(false);
        setHasTranscriptionKeys({ assemblyai: false, deepgram: false });
      }
      return;
    }

    setWorkspaceStatePending(true);
    if (address && backendDid && workspaceRefreshKey === 0) {
      const cached = readBackendWorkspaceCache(address, backendDid);
      if (cached) {
        const cachedState = workspaceStateFromCache(cached);
        setHasWorkspaceStateSnapshot(true);
        applyWorkspaceReadiness(cachedState, {
          hasTinyCloud: tcw !== null,
          setHasBackendDelegation,
          setBackendDelegationState,
          setHasFirefliesBackendAccess,
          setHasGranolaBackendAccess,
          setHasSoundcoreBackendAccess,
          setHasTranscriptionBackendAccess,
          setHasGoogleMeet,
          setHasKey,
          setHasGranolaKey,
          setHasSoundcoreKey,
          setHasTranscriptionKeys,
          setHasExistingConversations,
          backendAccessRenewalOutcome: backendAccessRenewalOutcomeRef.current,
          ownerSecretDiscoveryPending: ownerSecretDiscoveryPendingRef.current,
          ownerSecretDiscoveryFailed: ownerSecretDiscoveryFailedRef.current,
        });
        debugLog("workspace-state.cache", "hit", {
          backendDid,
          expiresAt: cached.expiresAt,
          firefliesReadable: cached.backendReadableSecrets.fireflies.readable,
          granolaReadable: cached.backendReadableSecrets.granola.readable,
          soundcoreSessionReadable: cached.backendReadableSecrets.soundcoreSession.readable,
          googleMeetConnected: cached.googleMeet.connected,
        });
      } else {
        debugLog("workspace-state.cache", "miss", { backendDid });
      }
    }

    let cancelled = false;
    const step = startDebugStep("workspace-state.backend", { path: "/api/workspace-state" });
    api
      .get<WorkspaceStateResponse>("/api/workspace-state")
      .then((state) => {
        if (cancelled) {
          step.complete({ cancelled: true });
          return;
        }
        if (
          address &&
          tcw &&
          state.delegation.activation === "failed" &&
          isMissingParentDelegationError(state.delegation.error)
        ) {
          step.fail(state.delegation.error);
          markStorageSessionInvalid(address, tcw, backendDid ?? undefined);
          return;
        }

        applyWorkspaceReadiness(state, {
          hasTinyCloud: tcw !== null,
          setHasBackendDelegation,
          setBackendDelegationState,
          setHasFirefliesBackendAccess,
          setHasGranolaBackendAccess,
          setHasSoundcoreBackendAccess,
          setHasTranscriptionBackendAccess,
          setHasGoogleMeet,
          setHasKey,
          setHasGranolaKey,
          setHasSoundcoreKey,
          setHasTranscriptionKeys,
          setHasExistingConversations,
          backendAccessRenewalOutcome: backendAccessRenewalOutcomeRef.current,
          ownerSecretDiscoveryPending: ownerSecretDiscoveryPendingRef.current,
          ownerSecretDiscoveryFailed: ownerSecretDiscoveryFailedRef.current,
        });
        setHasWorkspaceStateSnapshot(true);
        setWorkspaceStatePending(false);
        if (
          address &&
          backendDid &&
          state.delegation.status === "active" &&
          state.delegation.activation === "active"
        ) {
          writeBackendWorkspaceCache(address, backendDid, state);
          debugLog("workspace-state.cache", "stored", {
            backendDid,
            expiresAt: state.delegation.expiresAt,
          });
        } else if (address && backendDid) {
          clearBackendWorkspaceCache(address, backendDid);
          debugLog("workspace-state.cache", "cleared", {
            backendDid,
            reason: state.delegation.status,
          });
        }
        step.complete({
          delegationStatus: state.delegation.status,
          firefliesReadable: state.backendReadableSecrets.fireflies.readable,
          granolaReadable: state.backendReadableSecrets.granola.readable,
          soundcoreSessionReadable: state.backendReadableSecrets.soundcoreSession.readable,
          soundcoreAuthTokenReadable: state.backendReadableSecrets.soundcoreAuthToken.readable,
          soundcoreUidReadable: state.backendReadableSecrets.soundcoreUid.readable,
          soundcoreOpenudidReadable: state.backendReadableSecrets.soundcoreOpenudid.readable,
          assemblyaiReadable: state.backendReadableSecrets.assemblyai.readable,
          deepgramReadable: state.backendReadableSecrets.deepgram.readable,
          googleMeetConnected: state.googleMeet.connected,
          hasConversations: state.conversations.hasAny,
        });
      })
      .catch((err) => {
        if (cancelled) {
          step.complete({ cancelled: true });
          return;
        }
        step.fail(err);
        if (address && tcw && isMissingParentDelegationError(err)) {
          setWorkspaceStatePending(false);
          markStorageSessionInvalid(address, tcw, backendDid ?? undefined);
          return;
        }
        setWorkspaceStatePending(false);
        setHasBackendDelegation(false);
        setBackendDelegationState("unavailable");
        setHasFirefliesBackendAccess(null);
        setHasGranolaBackendAccess(null);
        setHasSoundcoreBackendAccess(null);
        setHasTranscriptionBackendAccess(EMPTY_TRANSCRIPTION_STATUS);
        setHasGoogleMeet(null);
      });

    return () => {
      cancelled = true;
    };
  }, [address, api, backendDid, markStorageSessionInvalid, workspaceRefreshKey, tcw]);

  useEffect(() => {
    if (
      !conversationApi ||
      (!tcw && hasBackendDelegation !== true && backendDelegationState !== "unavailable")
    ) {
      setHasExistingConversations(null);
      return;
    }
    if (!tcw && hasBackendDelegation !== true) return;

    const step = startDebugStep("conversations.exists", {
      path: "/api/conversations?limit=1&offset=0",
      directTinyCloud: tcw !== null,
      backendDelegation: hasBackendDelegation,
    });
    conversationApi
      .get<{ total: number }>("/api/conversations?limit=1&offset=0")
      .then((res) => {
        step.complete({ total: res.total, hasAny: res.total > 0 });
        setHasExistingConversations(res.total > 0);
      })
      .catch((err) => {
        step.fail(err);
        // A failed existence probe is operationally unknown. Keep the last
        // proven value for stale rendering, but make the workspace unavailable
        // so no new mutations can begin.
        setBackendDelegationState("unavailable");
      });
  }, [backendDelegationState, conversationApi, hasBackendDelegation, refreshKey, tcw]);

  useEffect(() => {
    if (!api || hasFirefliesBackendAccess !== true) return;
    api
      .get<{ processed: unknown[]; skipped: unknown[]; errors: unknown[] }>(
        "/api/webhooks/fireflies/pending",
      )
      .then((result) => {
        const count = result.processed?.length ?? 0;
        if (count > 0) {
          setPendingBanner(
            `Processed ${count} new transcript${count === 1 ? "" : "s"} from webhooks`,
          );
          setRefreshKey((k) => k + 1);
        }
      })
      .catch((err) => console.error("[pending]", err));
  }, [api, hasFirefliesBackendAccess]);

  useEffect(() => {
    if (!api || hasFirefliesBackendAccess !== true) return;
    api
      .post<{ updated: number; still_missing: number }>("/api/sync/backfill-summaries")
      .then((result) => {
        if (result.updated > 0) setRefreshKey((k) => k + 1);
      })
      .catch((err) => console.error("[backfill]", err));
  }, [api, hasFirefliesBackendAccess]);

  useEffect(() => {
    if (!api || hasGoogleMeet !== true) return;
    api
      .get<{ status: string }>("/api/webhooks/google-meet/check")
      .then((res) => {
        if (res.status === "lapsed") setGmLapsedBanner(true);
      })
      .catch(() => {});
  }, [api, hasGoogleMeet]);

  useEffect(() => {
    if (!api || hasGoogleMeet !== true) return;
    api
      .get<{ processed: unknown[]; skipped: unknown[]; errors: unknown[] }>(
        "/api/webhooks/google-meet/pending",
      )
      .then((result) => {
        const count = result.processed?.length ?? 0;
        if (count > 0) {
          setPendingBanner(
            `Processed ${count} Google Meet transcript${count === 1 ? "" : "s"} from webhooks`,
          );
          setRefreshKey((k) => k + 1);
        }
      })
      .catch((err) => console.error("[gm-pending]", err));
  }, [api, hasGoogleMeet]);

  // ── Sign In ───────────────────────────────────────────────────────

  const handleSignIn = useCallback(
    async (options?: { forceWallet?: boolean; recoverMissingParent?: boolean }) => {
      if (authInFlightRef.current) return;
      authInFlightRef.current = true;
      const step = startDebugStep("auth.sign-in", {
        forceWallet: options?.forceWallet === true,
        recoverMissingParent: options?.recoverMissingParent === true,
      });
      setAuthLoading(true);
      setAuthError(null);
      setWorkspaceActionError(null);
      backendAccessRenewalOutcomeRef.current = null;
      try {
        if (options?.forceWallet) {
          const staleAddress = address ?? sessionStoreRef.current.getAddress();
          sessionStoreRef.current.clear();
          if (staleAddress) clearPersistedSession(staleAddress);
        }

        if (!options?.forceWallet) {
          debugLog("auth.sign-in", "restore-before-wallet");
          const restored = await restoreStoredSession();
          if (restored) {
            step.complete({ mode: "restored-before-wallet" });
            return;
          }
        }

        debugLog("auth.sign-in", "wallet-connect-started", { host: OPENKEY_HOST });
        const { address: addr, web3Provider } = await connectWallet({ host: OPENKEY_HOST });
        debugLog("auth.sign-in", "wallet-connect-completed", { hasAddress: Boolean(addr) });
        if (!options?.forceWallet) {
          debugLog("auth.sign-in", "restore-after-wallet");
          const restored = await restoreStoredSession(addr);
          if (restored) {
            step.complete({ mode: "restored-after-wallet" });
            return;
          }
        }

        clearPersistedSession(addr);
        const network = await web3Provider.getNetwork?.().catch(() => null);
        const ownerDid = ownerDidFromAddress(addr, network?.chainId ?? 1);
        const bootstrap = await loadAppBootstrapContext(ownerDid).catch((err) => {
          if (options?.forceWallet) {
            throw new Error(
              `Backend bootstrap failed: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
          return null;
        });
        if (!bootstrap) {
          await signInDirectTinyCloud(addr, web3Provider);
          step.complete({ mode: "direct-tinycloud", reason: "bootstrap-unavailable" });
          return;
        }

        if (!bootstrap.info) {
          if (options?.forceWallet) {
            throw new Error(
              "Backend is reachable, but /api/server-info did not return backend info.",
            );
          }
          await signInDirectTinyCloud(addr, web3Provider);
          step.complete({ mode: "direct-tinycloud", reason: "backend-info-unavailable" });
          return;
        }

        debugLog("auth.sign-in", "nonce-request-started", { backendUrl: BACKEND_URL });
        const nonce = await requestNonce(BACKEND_URL, addr).catch((err) => {
          if (options?.forceWallet) {
            throw new Error(
              `Backend nonce request failed: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
          return null;
        });
        if (!nonce) {
          await signInDirectTinyCloud(addr, web3Provider);
          step.complete({ mode: "direct-tinycloud", reason: "nonce-unavailable" });
          return;
        }
        debugLog("auth.sign-in", "nonce-request-completed");

        const { info, agent, composedRequest, conversationEventPathPrefix } = bootstrap;
        debugLog("auth.sign-in", "tinycloud-sign-in-started", { backendDid: info.did });
        const { tcw: tcwInstance, session } = await createAndSignIn(web3Provider, {
          nonce,
          autoCreateSpace: true,
          tinycloudHosts: TINYCLOUD_HOSTS,
          capabilityRequest: composedRequest,
        });
        debugLog("auth.sign-in", "tinycloud-sign-in-completed", {
          did: tcwInstance.did ?? null,
          spaceId: tcwInstance.spaceId ?? null,
        });
        debugLog("auth.sign-in", "backend-session-verify-started");
        const verified = await verifySession(BACKEND_URL, session.siwe, session.signature).catch(
          (err) => {
            if (options?.forceWallet) {
              throw new Error(
                `Backend SIWE verification failed: ${err instanceof Error ? err.message : String(err)}`,
              );
            }
            return null;
          },
        );
        if (!verified) {
          try {
            await tcwInstance.signOut?.();
          } catch {
            // Continue into direct TinyCloud mode when backend verification is unavailable.
          }
          await signInDirectTinyCloud(addr, web3Provider);
          step.complete({ mode: "direct-tinycloud", reason: "backend-verification-failed" });
          return;
        }
        debugLog("auth.sign-in", "backend-session-verify-completed", {
          expiresIn: verified.expiresIn,
        });

        sessionStoreRef.current.setSession(verified.token, verified.expiresIn, addr);
        const apiClient = createBackendApiClient(addr, info.did);

        // Normal sign-in renews only a known expired/stale grant. Manual
        // missing-parent recovery always replaces the old backend child with
        // the new chain before committing application state.
        const renewer = installBackendDelegationRenewer(
          addr,
          tcwInstance,
          info.did,
          composedRequest,
        );
        const delegationReady = options?.recoverMissingParent
          ? await renewer.validateRestoredSession({ replaceBackendGrant: true })
          : await renewer.ensureFreshDelegation();
        if (options?.recoverMissingParent && !delegationReady) {
          throw new Error(STORAGE_SESSION_RECONNECT_MESSAGE);
        }

        setAddress(addr);
        setDid(tcwInstance.did ?? null);
        setTcw(tcwInstance);
        setHasWalletSigner(true);
        setApi(apiClient);
        setSessionExpired(false);
        setBackendAccessExpired(false);
        setStorageSessionInvalid(false);
        if (backendAccessRenewalOutcomeRef.current === "session_authority") {
          setBackendAccessExpired(true);
        }
        setAgentInfo(agent);
        setBackendDid(info.did);
        setCapabilityRequest(composedRequest);
        setServerGoogleMeetAvailable(info.features?.googleMeet?.available ?? null);
        setLiveWritePathPrefix(conversationEventPathPrefix);
        setLiveWriteHost(tcwInstance.hosts[0] ?? null);
        setLiveWriteSpaceId(tcwInstance.spaceId ?? null);
        setSelectedConversationId(null);
        setShareConversationId(null);
        step.complete({
          mode: "backend",
          backendDid: info.did,
          agentDid: agent?.did ?? null,
          did: tcwInstance.did ?? null,
          spaceId: tcwInstance.spaceId ?? null,
          delegationReady,
        });
      } catch (err) {
        step.fail(err);
        setAuthError(
          isMissingParentDelegationError(err)
            ? STORAGE_SESSION_RECONNECT_MESSAGE
            : err instanceof Error
              ? err.message
              : String(err),
        );
      } finally {
        authInFlightRef.current = false;
        setAuthLoading(false);
      }
    },
    [
      createBackendApiClient,
      installBackendDelegationRenewer,
      restoreStoredSession,
      signInDirectTinyCloud,
      address,
    ],
  );

  const handleSignOut = useCallback(async () => {
    const token = sessionStoreRef.current.getToken();
    if (token) revokeDelegation(BACKEND_URL, token).catch(() => {});
    await tcw?.signOut?.();
    if (address) clearBackendWorkspaceCache(address, backendDid ?? undefined);
    if (address) clearPersistedSession(address);
    purgeListenLocalData();
    backendRenewerRef.current = null;
    backendAccessRenewalOutcomeRef.current = null;
    sessionStoreRef.current.clear();
    setAddress(null);
    setDid(null);
    setTcw(null);
    setHasWalletSigner(false);
    setApi(null);
    setBackendDelegationState(null);
    setSessionExpired(false);
    setBackendAccessExpired(false);
    setStorageSessionInvalid(false);
    setAgentInfo(null);
    setBackendDid(null);
    setCapabilityRequest(null);
    setServerGoogleMeetAvailable(null);
    setLiveWritePathPrefix(null);
    setLiveWriteHost(null);
    setLiveWriteSpaceId(null);
    setAuthError(null);
    setHasKey(null);
    setHasGranolaKey(null);
    setHasSoundcoreKey(null);
    setHasTranscriptionKeys(EMPTY_TRANSCRIPTION_STATUS);
    setHasBackendDelegation(null);
    setHasFirefliesBackendAccess(null);
    setHasGranolaBackendAccess(null);
    setHasSoundcoreBackendAccess(null);
    setHasTranscriptionBackendAccess(EMPTY_TRANSCRIPTION_STATUS);
    setHasGoogleMeet(null);
    setHasExistingConversations(null);
    setWorkspaceActionError(null);
    setWorkspaceActionLoading(false);
    setSourcesSetupMode(null);
    setActivePage("inbox");
    setSelectedConversationId(null);
    setShareConversationId(null);
    setGmLapsedBanner(false);
  }, [address, backendDid, tcw]);

  const recheckBackendState = useCallback(async (): Promise<void> => {
    setOwnerSecretRefreshKey((key) => key + 1);
    setWorkspaceRefreshKey((key) => key + 1);
  }, []);

  const retryBackendAvailability = useCallback(async (): Promise<void> => {
    if (!address) return;
    setWorkspaceActionLoading(true);
    setAuthError(null);
    setWorkspaceActionError(null);
    try {
      const bootstrap = await loadAppBootstrapContext(ownerDidFromAddress(address));
      if (!bootstrap.info) {
        setBackendDelegationState("unavailable");
        setWorkspaceActionError("Backend reconnect failed: Listen backend is still unreachable.");
        return;
      }

      const { info, agent, composedRequest, conversationEventPathPrefix } = bootstrap;
      setAgentInfo(agent);
      setBackendDid(info.did);
      setCapabilityRequest(composedRequest);
      setServerGoogleMeetAvailable(info.features?.googleMeet?.available ?? null);
      setLiveWritePathPrefix(conversationEventPathPrefix);
      setLiveWriteHost(tcw?.hosts[0] ?? null);
      setLiveWriteSpaceId(tcw?.spaceId ?? null);

      const token = sessionStoreRef.current.getToken();
      if (token) {
        setApi(createBackendApiClient(address, info.did));
        setWorkspaceRefreshKey((key) => key + 1);
      } else {
        // The probe proved reachability, but not authorization. Keep the
        // current TinyCloud session and expose the separate consent action.
        setBackendDelegationState("needs_consent");
        setHasBackendDelegation(false);
      }
    } catch (error) {
      setBackendDelegationState("unavailable");
      setWorkspaceActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setWorkspaceActionLoading(false);
    }
  }, [address, createBackendApiClient, tcw]);

  const ensureBackendAccess = useCallback(async () => {
    if (backendDelegationState === "unavailable") {
      await recheckBackendState();
      return;
    }
    await renewBackendDelegation();
  }, [backendDelegationState, recheckBackendState, renewBackendDelegation]);

  const backendDelegationSecretNames = useCallback(
    (requestedSecretNames: readonly string[] = []) => {
      const names = new Set<string>(requestedSecretNames);
      if (hasKey === true) names.add(FIREFLIES_SECRET_NAME);
      if (hasGranolaKey === true) names.add(GRANOLA_SECRET_NAME);
      if (hasSoundcoreKey === true) {
        for (const name of SOUNDCORE_DELEGATED_SECRET_NAMES) names.add(name);
      }
      if (hasTranscriptionKeys.assemblyai === true) names.add(ASSEMBLYAI_SECRET_NAME);
      if (hasTranscriptionKeys.deepgram === true) names.add(DEEPGRAM_SECRET_NAME);
      return [...names];
    },
    [hasGranolaKey, hasKey, hasSoundcoreKey, hasTranscriptionKeys],
  );

  const ensureSourceBackendAccess = useCallback(
    async (source: "fireflies" | "granola" | "soundcore") => {
      if (backendDelegationState === "unavailable") {
        setWorkspaceRefreshKey((key) => key + 1);
        return;
      }
      if (!tcw || !backendDid || !api) {
        throw new Error(`Reconnect your wallet to finish ${source} setup.`);
      }

      if (source === "fireflies") setHasFirefliesBackendAccess(null);
      else if (source === "granola") setHasGranolaBackendAccess(null);
      else setHasSoundcoreBackendAccess(null);
      await renewBackendDelegationWithSecrets(
        backendDelegationSecretNames(sourceSecretNames(source)),
      );

      const backendCanRead = await checkSecretExistsFromBackend(api, source);
      if (!backendCanRead) {
        if (source === "fireflies") setHasFirefliesBackendAccess(false);
        else if (source === "granola") setHasGranolaBackendAccess(false);
        else setHasSoundcoreBackendAccess(false);
        const secretName =
          source === "fireflies"
            ? FIREFLIES_SECRET_NAME
            : source === "granola"
              ? GRANOLA_SECRET_NAME
              : "Soundcore credentials";
        throw new Error(`Backend still cannot read ${secretName}. Re-save the key or try again.`);
      }

      setHasBackendDelegation(true);
      if (source === "fireflies") {
        setHasKey(true);
        setHasFirefliesBackendAccess(true);
      } else if (source === "granola") {
        setHasGranolaKey(true);
        setHasGranolaBackendAccess(true);
      } else {
        setHasSoundcoreKey(true);
        setHasSoundcoreBackendAccess(true);
      }
    },
    [
      api,
      backendDelegationSecretNames,
      backendDelegationState,
      backendDid,
      renewBackendDelegationWithSecrets,
      tcw,
    ],
  );

  const ensureFirefliesBackendAccess = useCallback(
    () => ensureSourceBackendAccess("fireflies"),
    [ensureSourceBackendAccess],
  );

  const ensureGranolaBackendAccess = useCallback(
    () => ensureSourceBackendAccess("granola"),
    [ensureSourceBackendAccess],
  );

  const ensureSoundcoreBackendAccess = useCallback(
    () => ensureSourceBackendAccess("soundcore"),
    [ensureSourceBackendAccess],
  );

  const ensureSecretBackendAccess = useCallback(
    async (secretName: string) => {
      if (backendDelegationState === "unavailable") {
        setWorkspaceRefreshKey((key) => key + 1);
        return;
      }
      if (!tcw || !backendDid) {
        throw new Error("Reconnect your wallet to finish source setup.");
      }

      const transcriptionProvider = providerForTranscriptionSecret(secretName);
      if (transcriptionProvider) {
        setHasTranscriptionBackendAccess((state) => ({
          ...state,
          [transcriptionProvider]: null,
        }));
      }

      await renewBackendDelegationWithSecrets(backendDelegationSecretNames([secretName]));

      if (transcriptionProvider && api) {
        const backendCanRead = await checkSecretExistsFromBackend(api, transcriptionProvider);
        if (!backendCanRead) {
          setHasTranscriptionBackendAccess((state) => ({
            ...state,
            [transcriptionProvider]: false,
          }));
          throw new Error(`Backend still cannot read ${secretName}. Re-save the key or try again.`);
        }
        setHasTranscriptionKeys((state) => ({ ...state, [transcriptionProvider]: true }));
        setHasTranscriptionBackendAccess((state) => ({
          ...state,
          [transcriptionProvider]: true,
        }));
      }

      setHasBackendDelegation(true);
    },
    [
      api,
      backendDelegationSecretNames,
      backendDelegationState,
      backendDid,
      renewBackendDelegationWithSecrets,
      tcw,
    ],
  );

  const handleFinishMissingSourceAccess = useCallback(async () => {
    if (backendDelegationState === "unavailable") {
      setWorkspaceActionError(null);
      setWorkspaceRefreshKey((key) => key + 1);
      return;
    }
    if (!api) {
      setWorkspaceActionError("Backend is offline. Try again when the backend is reachable.");
      return;
    }

    const sources: Array<"fireflies" | "granola" | "soundcore"> = [];
    if (
      hasKey === true &&
      (hasBackendDelegation === false || hasFirefliesBackendAccess === false)
    ) {
      sources.push("fireflies");
    }
    if (
      hasGranolaKey === true &&
      (hasBackendDelegation === false || hasGranolaBackendAccess === false)
    ) {
      sources.push("granola");
    }
    if (
      hasSoundcoreKey === true &&
      (hasBackendDelegation === false || hasSoundcoreBackendAccess === false)
    ) {
      sources.push("soundcore");
    }

    if (sources.length === 0) return;

    setWorkspaceActionLoading(true);
    setWorkspaceActionError(null);
    try {
      for (const source of sources) {
        if (source === "fireflies") setHasFirefliesBackendAccess(null);
        else if (source === "granola") setHasGranolaBackendAccess(null);
        else setHasSoundcoreBackendAccess(null);
      }

      await renewBackendDelegationWithSecrets(
        backendDelegationSecretNames(sources.flatMap((source) => sourceSecretNames(source))),
      );

      const failed: string[] = [];
      for (const source of sources) {
        const backendCanRead = await checkSecretExistsFromBackend(api, source);
        if (source === "fireflies") {
          if (backendCanRead) setHasKey(true);
          setHasFirefliesBackendAccess(backendCanRead);
        } else if (source === "granola") {
          if (backendCanRead) setHasGranolaKey(true);
          setHasGranolaBackendAccess(backendCanRead);
        } else {
          if (backendCanRead) setHasSoundcoreKey(true);
          setHasSoundcoreBackendAccess(backendCanRead);
        }
        if (!backendCanRead) failed.push(source === "soundcore" ? "Soundcore" : source);
      }

      if (failed.length > 0) {
        throw new Error(
          `Backend still cannot read ${failed.join(", ")} credentials. Re-save the key and try again.`,
        );
      }

      setHasBackendDelegation(true);
      setRefreshKey((k) => k + 1);
      setWorkspaceRefreshKey((k) => k + 1);
    } catch (err) {
      setWorkspaceActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setWorkspaceActionLoading(false);
    }
  }, [
    api,
    backendDelegationSecretNames,
    hasBackendDelegation,
    hasFirefliesBackendAccess,
    hasGranolaBackendAccess,
    hasGranolaKey,
    hasKey,
    hasSoundcoreBackendAccess,
    hasSoundcoreKey,
    backendDelegationState,
    renewBackendDelegationWithSecrets,
  ]);

  // ── Render ────────────────────────────────────────────────────────

  const isSignedIn = address !== null && (api !== null || tcw !== null);
  const backendUnavailable =
    isSignedIn && api === null && backendDelegationState !== "needs_consent";
  const backendConsentRequired =
    isSignedIn && api === null && backendDelegationState === "needs_consent";
  const firefliesConnected =
    hasKey === true && hasBackendDelegation === true && hasFirefliesBackendAccess === true;
  const granolaConnected =
    hasGranolaKey === true && hasBackendDelegation === true && hasGranolaBackendAccess === true;
  const soundcoreConnected =
    hasSoundcoreKey === true && hasBackendDelegation === true && hasSoundcoreBackendAccess === true;
  const assemblyAIConnected =
    hasTranscriptionKeys.assemblyai === true &&
    hasBackendDelegation === true &&
    hasTranscriptionBackendAccess.assemblyai === true;
  const deepgramConnected =
    hasTranscriptionKeys.deepgram === true &&
    hasBackendDelegation === true &&
    hasTranscriptionBackendAccess.deepgram === true;
  const connectedSourceCount = [
    firefliesConnected,
    granolaConnected,
    soundcoreConnected,
    assemblyAIConnected,
    deepgramConnected,
    hasGoogleMeet === true,
  ].filter(Boolean).length;
  const googleMeetAvailable =
    !backendUnavailable &&
    backendDelegationState !== "unavailable" &&
    hasGoogleMeet !== null &&
    (HAS_FRONTEND_GOOGLE_CLIENT_ID || serverGoogleMeetAvailable === true);
  const hasUsableInbox = connectedSourceCount > 0 || hasExistingConversations === true;
  const directExistingConversationsReady = tcw !== null && hasExistingConversations === true;
  const backendStatusReady = backendUnavailable || hasBackendDelegation !== null;
  const delegationUnavailable = backendDelegationState === "unavailable";
  const firefliesKeyReady = hasKey !== null;
  const granolaKeyReady = hasGranolaKey !== null;
  const soundcoreKeyReady = hasSoundcoreKey !== null;
  const transcriptionKeysReady = Object.values(hasTranscriptionKeys).every(
    (value) => value !== null,
  );
  const firefliesBackendAccessReady =
    hasKey === true && hasBackendDelegation === true ? hasFirefliesBackendAccess !== null : true;
  const granolaBackendAccessReady =
    hasGranolaKey === true && hasBackendDelegation === true
      ? hasGranolaBackendAccess !== null
      : true;
  const soundcoreBackendAccessReady =
    hasSoundcoreKey === true && hasBackendDelegation === true
      ? hasSoundcoreBackendAccess !== null
      : true;
  const transcriptionBackendAccessReady = (["assemblyai", "deepgram"] as const).every((provider) =>
    hasTranscriptionKeys[provider] === true && hasBackendDelegation === true
      ? hasTranscriptionBackendAccess[provider] !== null
      : true,
  );
  const backendBackedChecksReady =
    delegationUnavailable || hasBackendDelegation !== true
      ? true
      : hasBackendDelegation === true
        ? hasGoogleMeet !== null &&
          firefliesBackendAccessReady &&
          granolaBackendAccessReady &&
          soundcoreBackendAccessReady &&
          transcriptionBackendAccessReady
        : true;
  const conversationChecksReady =
    delegationUnavailable || (!tcw && hasBackendDelegation !== true)
      ? true
      : hasExistingConversations !== null;
  const workspaceChecksReady =
    isSignedIn &&
    !ownerSecretDiscoveryPending &&
    !workspaceStatePending &&
    conversationChecksReady &&
    (directExistingConversationsReady ||
      (backendStatusReady &&
        firefliesKeyReady &&
        granolaKeyReady &&
        soundcoreKeyReady &&
        transcriptionKeysReady &&
        backendBackedChecksReady));
  const setupAvailable = tcw !== null && hasWalletSigner && backendDid !== null && api !== null;
  const needsFirefliesAccess =
    !backendUnavailable &&
    !sessionExpired &&
    !backendAccessExpired &&
    !storageSessionInvalid &&
    workspaceChecksReady &&
    hasKey === true &&
    sourceNeedsConsent({
      delegationState: backendDelegationState,
      hasBackendDelegation,
      sourceAccess: hasFirefliesBackendAccess,
    });
  const needsGranolaAccess =
    !backendUnavailable &&
    !sessionExpired &&
    !backendAccessExpired &&
    !storageSessionInvalid &&
    workspaceChecksReady &&
    hasGranolaKey === true &&
    sourceNeedsConsent({
      delegationState: backendDelegationState,
      hasBackendDelegation,
      sourceAccess: hasGranolaBackendAccess,
    });
  const needsSoundcoreAccess =
    !backendUnavailable &&
    !sessionExpired &&
    !backendAccessExpired &&
    !storageSessionInvalid &&
    workspaceChecksReady &&
    hasSoundcoreKey === true &&
    sourceNeedsConsent({
      delegationState: backendDelegationState,
      hasBackendDelegation,
      sourceAccess: hasSoundcoreBackendAccess,
    });
  const showSharedPage = activePage === "shared";
  const showWorkspaceLoading =
    isSignedIn && !showSharedPage && !workspaceChecksReady && !hasWorkspaceStateSnapshot;
  const workspaceMutationUnavailable =
    backendUnavailable ||
    delegationUnavailable ||
    workspaceStatePending ||
    ownerSecretDiscoveryPending;
  const sourcesSetupAccessPending = workspaceStatePending || ownerSecretDiscoveryPending;
  const showOnboarding =
    isSignedIn &&
    setupAvailable &&
    !showSharedPage &&
    (sourcesSetupMode === "onboarding" ||
      (workspaceChecksReady &&
        !hasUsableInbox &&
        !needsFirefliesAccess &&
        !needsGranolaAccess &&
        !needsSoundcoreAccess &&
        !delegationUnavailable));
  const showWalletSetupState =
    isSignedIn &&
    !showSharedPage &&
    !backendUnavailable &&
    !delegationUnavailable &&
    !storageSessionInvalid &&
    workspaceChecksReady &&
    !hasUsableInbox &&
    !needsFirefliesAccess &&
    !needsGranolaAccess &&
    !setupAvailable;
  const showSourcesSetup =
    isSignedIn &&
    !showSharedPage &&
    activePage === "sources" &&
    setupAvailable &&
    (sourcesSetupMode === "sources" ||
      (hasUsableInbox &&
        (workspaceChecksReady || sourcesSetupAccessPending || delegationUnavailable)));
  const showSourcesWalletState =
    isSignedIn &&
    !showSharedPage &&
    !backendUnavailable &&
    !delegationUnavailable &&
    !storageSessionInvalid &&
    hasUsableInbox &&
    activePage === "sources" &&
    !setupAvailable;
  const showBackendOfflineState =
    backendUnavailable &&
    !showSharedPage &&
    workspaceChecksReady &&
    (!hasUsableInbox || activePage === "sources" || activePage === "connections");
  const showOptimisticInbox =
    isSignedIn &&
    activePage === "inbox" &&
    !selectedConversationId &&
    conversationApi !== null &&
    showWorkspaceLoading;
  const showInbox =
    activePage === "inbox" &&
    !selectedConversationId &&
    conversationApi !== null &&
    (hasUsableInbox || showOptimisticInbox);

  useEffect(() => {
    if (showOnboarding && sourcesSetupMode === null) {
      setSourcesSetupMode("onboarding");
    }
  }, [showOnboarding, sourcesSetupMode]);

  if (!isSignedIn) {
    if (shareToken) {
      return <SharedWithMe initialShareToken={shareToken} standalone />;
    }
    return <LandingPage loading={authLoading} error={authError} onSignIn={handleSignIn} />;
  }

  const activeConversationApi = conversationApi ?? api!;

  const pageEyebrow = !isSignedIn
    ? "welcome"
    : selectedConversationId
      ? "library / transcript"
      : showWorkspaceLoading && !showOptimisticInbox
        ? "workspace / checking"
        : showBackendOfflineState
          ? "workspace / backend offline"
          : needsFirefliesAccess
            ? "sources / access"
            : needsGranolaAccess
              ? "sources / access"
              : showWalletSetupState || showSourcesWalletState
                ? "sources / reconnect"
                : activePage === "sources"
                  ? "sources / manage"
                  : activePage === "connections"
                    ? "settings / sources"
                    : activePage === "shared"
                      ? "library / shared"
                      : activePage === "chat"
                        ? "library / chat"
                        : hasUsableInbox || showOptimisticInbox
                          ? `library · ${connectedSourceCount} source${connectedSourceCount === 1 ? "" : "s"}`
                          : "onboarding / sources";
  const pageTitle = !isSignedIn
    ? "Capture thoughts. Transform them into insights."
    : selectedConversationId
      ? "Transcript detail"
      : showWorkspaceLoading && !showOptimisticInbox
        ? "Checking workspace."
        : showBackendOfflineState
          ? "Backend offline."
          : needsFirefliesAccess
            ? "Finish Fireflies access."
            : needsGranolaAccess
              ? "Finish Granola access."
              : showWalletSetupState || showSourcesWalletState
                ? "Reconnect wallet."
                : activePage === "sources"
                  ? "Add sources."
                  : activePage === "connections"
                    ? "Connections."
                    : activePage === "shared"
                      ? "Shared with me."
                      : activePage === "chat"
                        ? "Ask your transcripts."
                        : hasUsableInbox || showOptimisticInbox
                          ? "Everything you've said."
                          : "Connect what you already have.";

  // Nav source dots reflect real connection health only. There's no
  // per-source syncing or error flag at this level, so we set "connected"
  // for sources that are actually connected and leave the rest undefined
  // (neutral blue) rather than fabricate a state.
  const sourceItems: ShellSourceConfig[] = [
    {
      key: "fireflies",
      name: "Fireflies",
      count: null,
      status: firefliesConnected ? "connected" : undefined,
    },
    {
      key: "granola",
      name: "Granola",
      count: null,
      status: granolaConnected ? "connected" : undefined,
    },
    {
      key: "soundcore",
      name: "Soundcore",
      count: null,
      status: soundcoreConnected ? "connected" : undefined,
    },
    {
      key: "gmeet",
      name: "Google Meet",
      count: null,
      status: hasGoogleMeet === true ? "connected" : undefined,
    },
  ];

  const userInitials = address ? `${address.slice(2, 3)}${address.slice(-1)}`.toUpperCase() : "??";
  const userName = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Signed in";
  const userPlan = backendUnavailable
    ? "TINYCLOUD DIRECT"
    : did
      ? `CONNECTED · ${connectedSourceCount} source${connectedSourceCount === 1 ? "" : "s"}`
      : `RESTORED · ${connectedSourceCount} source${connectedSourceCount === 1 ? "" : "s"}`;

  const handleTranscriptImportComplete = (conversationId: string) => {
    setSourcesSetupMode(null);
    setHasExistingConversations(true);
    setRefreshKey((k) => k + 1);
    setSelectedConversationId(conversationId);
    setActivePage("inbox");
  };

  const openSourcesSetup = (
    initialStep: "cards" | "transcript-import" | "soundcore-key" = "cards",
  ) => {
    setSourcesSetupMode("sources");
    setSourcesInitialStep(initialStep);
    setSelectedConversationId(null);
    setActivePage("sources");
  };

  const handleRouteChange = (route: ShellRoute) => {
    setSelectedConversationId(null);
    if (route === "sources") {
      setSourcesSetupMode("sources");
      setSourcesInitialStep("cards");
    } else {
      setSourcesSetupMode(null);
    }
    setActivePage(route);
  };

  const handleDisconnectFireflies = async () => {
    if (!tcw || delegationUnavailable) return;
    const confirmed = window.confirm(
      "Disconnect Fireflies? Listen will stop syncing Fireflies transcripts until you reconnect.",
    );
    if (!confirmed) return;

    const result = await tcw.secrets.delete(FIREFLIES_SECRET_NAME);
    if (!result.ok) throw new Error(result.error.message);
    setHasKey(false);
    setHasFirefliesBackendAccess(null);
  };

  const handleDisconnectGoogleMeet = async () => {
    if (!api || delegationUnavailable) return;
    const confirmed = window.confirm(
      "Disconnect Google Meet? Listen will stop syncing Google Meet transcripts until you reconnect.",
    );
    if (!confirmed) return;

    await api.del("/api/config/google-meet");
    setHasGoogleMeet(false);
  };

  const topbarActions = (
    <>
      {firefliesConnected && <span style={s.badge}>Fireflies</span>}
      {hasKey === true &&
        (hasBackendDelegation === false || hasFirefliesBackendAccess === false) && (
          <span style={s.badge}>Fireflies key saved</span>
        )}
      {granolaConnected && <span style={s.badge}>Granola</span>}
      {hasGranolaKey === true &&
        (hasBackendDelegation === false || hasGranolaBackendAccess === false) && (
          <span style={s.badge}>Granola key saved</span>
        )}
      {soundcoreConnected && <span style={s.badge}>Soundcore</span>}
      {hasSoundcoreKey === true &&
        (hasBackendDelegation === false || hasSoundcoreBackendAccess === false) && (
          <span style={s.badge}>Soundcore credentials saved</span>
        )}
      {assemblyAIConnected && <span style={s.badge}>AssemblyAI</span>}
      {hasTranscriptionKeys.assemblyai === true &&
        (hasBackendDelegation === false || hasTranscriptionBackendAccess.assemblyai === false) && (
          <span style={s.badge}>AssemblyAI key saved</span>
        )}
      {deepgramConnected && <span style={s.badge}>Deepgram</span>}
      {hasTranscriptionKeys.deepgram === true &&
        (hasBackendDelegation === false || hasTranscriptionBackendAccess.deepgram === false) && (
          <span style={s.badge}>Deepgram key saved</span>
        )}
      {hasGoogleMeet && <span style={s.badge}>Google Meet</span>}
      {backendUnavailable && <span style={s.badge}>Backend offline</span>}
      <span style={s.badgeSolid}>{did ? "Connected" : "Restored"}</span>
    </>
  );

  const userMenu = (
    <div style={s.userMenuStack}>
      <AuthPanel
        isSignedIn={isSignedIn}
        address={address}
        did={did}
        loading={authLoading}
        error={authError}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />
      {ENABLE_AGENT && !workspaceMutationUnavailable && tcw && capabilityRequest && (
        <ConnectAgentButton
          tcw={tcw}
          capabilityRequest={capabilityRequest}
          agentInfo={agentInfo}
          agentEndpoint={AGENT_ENDPOINT}
          onRefresh={() => setRefreshKey((k) => k + 1)}
          refreshLabel="Refresh conversations"
        />
      )}
      {(hasKey || hasGranolaKey || hasSoundcoreKey || hasGoogleMeet) && (
        <div style={s.userMenuSourceSection}>
          <span style={s.userMenuLabel}>Sources</span>
          {!workspaceMutationUnavailable && hasKey && tcw && (
            <button
              type="button"
              style={s.userMenuAction}
              onClick={() => void handleDisconnectFireflies()}
            >
              Disconnect Fireflies
            </button>
          )}
          {!workspaceMutationUnavailable && hasGranolaKey && tcw && (
            <button
              type="button"
              style={s.userMenuAction}
              onClick={async () => {
                const result = await tcw.secrets.delete(GRANOLA_SECRET_NAME);
                if (!result.ok) throw new Error(result.error.message);
                setHasGranolaKey(false);
                setHasGranolaBackendAccess(null);
              }}
            >
              Disconnect Granola
            </button>
          )}
          {!workspaceMutationUnavailable && hasSoundcoreKey && tcw && (
            <button
              type="button"
              style={s.userMenuAction}
              onClick={async () => {
                for (const secretName of SOUNDCORE_DELEGATED_SECRET_NAMES) {
                  const result = await tcw.secrets.delete(secretName);
                  if (!result.ok) throw new Error(result.error.message);
                }
                setHasSoundcoreKey(false);
                setHasSoundcoreBackendAccess(null);
              }}
            >
              Disconnect Soundcore
            </button>
          )}
          {!workspaceMutationUnavailable && hasGoogleMeet && (
            <button
              type="button"
              style={s.userMenuAction}
              onClick={() => void handleDisconnectGoogleMeet()}
            >
              Disconnect Google Meet
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (
    isMobile &&
    (hasUsableInbox || showOptimisticInbox) &&
    activePage !== "shared" &&
    (!showWorkspaceLoading || showOptimisticInbox) &&
    !needsFirefliesAccess &&
    !needsGranolaAccess &&
    !needsSoundcoreAccess &&
    !showOnboarding &&
    !showWalletSetupState &&
    !showSourcesSetup &&
    !showSourcesWalletState &&
    !workspaceMutationUnavailable &&
    !showBackendOfflineState &&
    !storageSessionInvalid
  ) {
    return (
      <>
        <MobileExperience
          api={activeConversationApi}
          activeRoute={activePage}
          selectedConversationId={selectedConversationId}
          refreshKey={refreshKey}
          cacheScope={conversationCacheScope}
          hasFireflies={firefliesConnected}
          hasGranola={granolaConnected}
          hasSoundcore={soundcoreConnected}
          hasGoogleMeet={hasGoogleMeet === true}
          hasFirefliesBackendAccess={hasFirefliesBackendAccess === true}
          hasGranolaBackendAccess={hasGranolaBackendAccess === true}
          hasSoundcoreBackendAccess={hasSoundcoreBackendAccess === true}
          hasAssemblyAIKey={hasTranscriptionKeys.assemblyai}
          hasAssemblyAIBackendAccess={hasTranscriptionBackendAccess.assemblyai}
          hasDeepgramKey={hasTranscriptionKeys.deepgram}
          hasDeepgramBackendAccess={hasTranscriptionBackendAccess.deepgram}
          googleMeetAvailable={googleMeetAvailable}
          chatEnabled={chatEnabled}
          onRouteChange={setActivePage}
          onSelectConversation={setSelectedConversationId}
          onAddSource={() => openSourcesSetup()}
          onRefresh={() => setRefreshKey((k) => k + 1)}
        />
        {api && hasBackendDelegation === true && (
          <GlobalSyncIndicator
            api={api}
            onViewResults={() => {
              setActivePage("inbox");
              setSelectedConversationId(null);
              setRefreshKey((k) => k + 1);
            }}
          />
        )}
      </>
    );
  }

  return (
    <AppShell
      activeRoute={activePage}
      onRouteChange={handleRouteChange}
      pageEyebrow={pageEyebrow}
      pageTitle={pageTitle}
      topbarActions={topbarActions}
      user={{ initials: userInitials, name: userName, plan: userPlan }}
      userMenu={userMenu}
      sources={sourceItems}
      folders={[]}
      onAddClick={api && !workspaceMutationUnavailable ? () => setShowAddHub(true) : undefined}
      onSearchClick={() => {
        setActivePage("inbox");
        setSelectedConversationId(null);
        setSearchFocusKey((k) => k + 1);
      }}
    >
      {storageSessionInvalid && (
        <div style={s.pendingBanner} data-testid="storage-session-recovery">
          <span>{STORAGE_SESSION_RECONNECT_MESSAGE}</span>
          <button
            type="button"
            data-testid="storage-session-reconnect"
            style={authLoading ? { ...s.statusButton, ...s.statusButtonDisabled } : s.statusButton}
            disabled={authLoading}
            onClick={() => void handleSignIn({ forceWallet: true, recoverMissingParent: true })}
          >
            Reconnect
          </button>
        </div>
      )}

      {!storageSessionInvalid && sessionExpired && (
        <div style={s.pendingBanner}>
          <span>Session expired — sign in to reconnect your workspace.</span>
          <button
            type="button"
            style={authLoading ? { ...s.statusButton, ...s.statusButtonDisabled } : s.statusButton}
            disabled={authLoading}
            onClick={() => void handleSignIn({ forceWallet: true })}
          >
            Sign in
          </button>
        </div>
      )}

      {!storageSessionInvalid && !sessionExpired && backendAccessExpired && (
        <div style={s.pendingBanner}>
          <span>Backend access expired — reconnect to restore workspace access.</span>
          <button
            type="button"
            style={authLoading ? { ...s.statusButton, ...s.statusButtonDisabled } : s.statusButton}
            disabled={authLoading}
            onClick={() => void handleSignIn({ forceWallet: true })}
          >
            Reconnect
          </button>
        </div>
      )}

      {showWorkspaceLoading && !showOptimisticInbox && <WorkspaceStatusPanel mode="checking" />}

      {showBackendOfflineState && (
        <WorkspaceStatusPanel
          mode="backend-offline"
          loading={workspaceActionLoading}
          error={workspaceActionError}
          onAction={() => void retryBackendAvailability()}
        />
      )}

      {delegationUnavailable && !backendUnavailable && (
        <WorkspaceStatusPanel
          mode="delegation-unavailable"
          loading={workspaceActionLoading}
          error={workspaceActionError}
          onAction={() => void recheckBackendState()}
        />
      )}

      {needsFirefliesAccess && (
        <WorkspaceStatusPanel
          mode="fireflies-access"
          loading={workspaceActionLoading}
          error={workspaceActionError}
          onAction={handleFinishMissingSourceAccess}
        />
      )}

      {needsGranolaAccess && (
        <WorkspaceStatusPanel
          mode="granola-access"
          loading={workspaceActionLoading}
          error={workspaceActionError}
          onAction={handleFinishMissingSourceAccess}
        />
      )}

      {needsSoundcoreAccess && (
        <WorkspaceStatusPanel
          mode="soundcore-access"
          loading={workspaceActionLoading}
          error={workspaceActionError}
          onAction={handleFinishMissingSourceAccess}
        />
      )}

      {(showWalletSetupState ||
        showSourcesWalletState ||
        (backendConsentRequired && !showSharedPage)) && (
        <WorkspaceStatusPanel
          mode="wallet"
          loading={authLoading}
          error={authError}
          onAction={() => void handleSignIn({ forceWallet: true })}
        />
      )}

      {showOnboarding && tcw && (
        <SourcesSetup
          api={api!}
          tcw={tcw}
          mode="onboarding"
          hasFirefliesKey={hasKey}
          hasGranolaKey={hasGranolaKey}
          hasSoundcoreKey={hasSoundcoreKey}
          hasAssemblyAIKey={hasTranscriptionKeys.assemblyai}
          hasDeepgramKey={hasTranscriptionKeys.deepgram}
          hasBackendDelegation={hasBackendDelegation}
          backendDelegationState={backendDelegationState}
          backendAccessPending={sourcesSetupAccessPending}
          hasFirefliesBackendAccess={hasFirefliesBackendAccess}
          hasGranolaBackendAccess={hasGranolaBackendAccess}
          hasSoundcoreBackendAccess={hasSoundcoreBackendAccess}
          hasAssemblyAIBackendAccess={hasTranscriptionBackendAccess.assemblyai}
          hasDeepgramBackendAccess={hasTranscriptionBackendAccess.deepgram}
          hasGoogleMeet={hasGoogleMeet}
          initialStep="cards"
          onEnsureBackendAccess={ensureBackendAccess}
          onEnsureFirefliesBackendAccess={ensureFirefliesBackendAccess}
          onEnsureGranolaBackendAccess={ensureGranolaBackendAccess}
          onEnsureSoundcoreBackendAccess={ensureSoundcoreBackendAccess}
          onEnsureSecretBackendAccess={ensureSecretBackendAccess}
          onRecheckBackendState={recheckBackendState}
          onSoundcoreCredentialsSaved={() => {
            setHasSoundcoreKey(true);
            setHasSoundcoreBackendAccess(false);
          }}
          onFirefliesComplete={() => {
            setSourcesSetupMode(null);
            setHasKey(true);
            setHasBackendDelegation(true);
            setHasFirefliesBackendAccess(true);
            setRefreshKey((k) => k + 1);
            setWorkspaceRefreshKey((k) => k + 1);
            setActivePage("inbox");
          }}
          onGranolaComplete={() => {
            setSourcesSetupMode(null);
            setHasGranolaKey(true);
            setHasBackendDelegation(true);
            setHasGranolaBackendAccess(true);
            setRefreshKey((k) => k + 1);
            setWorkspaceRefreshKey((k) => k + 1);
            setActivePage("inbox");
          }}
          onSoundcoreComplete={() => {
            setSourcesSetupMode(null);
            setHasSoundcoreKey(true);
            setHasBackendDelegation(true);
            setHasSoundcoreBackendAccess(true);
            setRefreshKey((k) => k + 1);
            setWorkspaceRefreshKey((k) => k + 1);
            setActivePage("inbox");
          }}
          onTranscriptionProviderComplete={(provider) => {
            setHasTranscriptionKeys((state) => ({ ...state, [provider]: true }));
            setHasBackendDelegation(true);
            setHasTranscriptionBackendAccess((state) => ({ ...state, [provider]: true }));
            setRefreshKey((k) => k + 1);
            setWorkspaceRefreshKey((k) => k + 1);
          }}
          onTranscriptImportComplete={handleTranscriptImportComplete}
          onDone={() => {
            setSourcesSetupMode(null);
            setActivePage("inbox");
          }}
          onGoogleMeetComplete={() => {
            setSourcesSetupMode(null);
            setHasGoogleMeet(true);
            setHasBackendDelegation(true);
            setRefreshKey((k) => k + 1);
            setWorkspaceRefreshKey((k) => k + 1);
            setActivePage("inbox");
          }}
          backendUrl={BACKEND_URL}
          googleMeetAvailable={googleMeetAvailable}
        />
      )}

      {showSourcesSetup && tcw && (
        <SourcesSetup
          api={api!}
          tcw={tcw}
          mode="sources"
          hasFirefliesKey={hasKey}
          hasGranolaKey={hasGranolaKey}
          hasSoundcoreKey={hasSoundcoreKey}
          hasAssemblyAIKey={hasTranscriptionKeys.assemblyai}
          hasDeepgramKey={hasTranscriptionKeys.deepgram}
          hasBackendDelegation={hasBackendDelegation}
          backendDelegationState={backendDelegationState}
          backendAccessPending={sourcesSetupAccessPending}
          hasFirefliesBackendAccess={hasFirefliesBackendAccess}
          hasGranolaBackendAccess={hasGranolaBackendAccess}
          hasSoundcoreBackendAccess={hasSoundcoreBackendAccess}
          hasAssemblyAIBackendAccess={hasTranscriptionBackendAccess.assemblyai}
          hasDeepgramBackendAccess={hasTranscriptionBackendAccess.deepgram}
          hasGoogleMeet={hasGoogleMeet}
          initialStep={sourcesInitialStep}
          onEnsureBackendAccess={ensureBackendAccess}
          onEnsureFirefliesBackendAccess={ensureFirefliesBackendAccess}
          onEnsureGranolaBackendAccess={ensureGranolaBackendAccess}
          onEnsureSoundcoreBackendAccess={ensureSoundcoreBackendAccess}
          onEnsureSecretBackendAccess={ensureSecretBackendAccess}
          onRecheckBackendState={recheckBackendState}
          onSoundcoreCredentialsSaved={() => {
            setHasSoundcoreKey(true);
            setHasSoundcoreBackendAccess(false);
          }}
          onFirefliesComplete={() => {
            setSourcesSetupMode(null);
            setHasKey(true);
            setHasBackendDelegation(true);
            setHasFirefliesBackendAccess(true);
            setRefreshKey((k) => k + 1);
            setWorkspaceRefreshKey((k) => k + 1);
            setActivePage("inbox");
          }}
          onGranolaComplete={() => {
            setSourcesSetupMode(null);
            setHasGranolaKey(true);
            setHasBackendDelegation(true);
            setHasGranolaBackendAccess(true);
            setRefreshKey((k) => k + 1);
            setWorkspaceRefreshKey((k) => k + 1);
            setActivePage("inbox");
          }}
          onSoundcoreComplete={() => {
            setSourcesSetupMode(null);
            setHasSoundcoreKey(true);
            setHasBackendDelegation(true);
            setHasSoundcoreBackendAccess(true);
            setRefreshKey((k) => k + 1);
            setWorkspaceRefreshKey((k) => k + 1);
            setActivePage("inbox");
          }}
          onTranscriptionProviderComplete={(provider) => {
            setHasTranscriptionKeys((state) => ({ ...state, [provider]: true }));
            setHasBackendDelegation(true);
            setHasTranscriptionBackendAccess((state) => ({ ...state, [provider]: true }));
            setRefreshKey((k) => k + 1);
            setWorkspaceRefreshKey((k) => k + 1);
          }}
          onTranscriptImportComplete={handleTranscriptImportComplete}
          onDone={() => {
            setSourcesSetupMode(null);
            setActivePage("inbox");
          }}
          onGoogleMeetComplete={() => {
            setSourcesSetupMode(null);
            setHasGoogleMeet(true);
            setHasBackendDelegation(true);
            setRefreshKey((k) => k + 1);
            setWorkspaceRefreshKey((k) => k + 1);
            setActivePage("inbox");
          }}
          backendUrl={BACKEND_URL}
          googleMeetAvailable={googleMeetAvailable}
        />
      )}

      {pendingBanner && (
        <div style={s.pendingBanner}>
          <span>{pendingBanner}</span>
          <button style={s.bannerDismiss} onClick={() => setPendingBanner(null)}>
            &times;
          </button>
        </div>
      )}

      {gmLapsedBanner && !workspaceMutationUnavailable && (
        <div style={s.lapsedBanner}>
          <span>Real-time sync was inactive. Some meetings may not have been captured.</span>
          <div style={s.lapsedActions}>
            <button
              style={s.lapsedSyncBtn}
              onClick={() => {
                if (delegationUnavailable) {
                  void recheckBackendState();
                  return;
                }
                setGmLapsedError(null);
                api
                  ?.post("/api/sync/google-meet")
                  .then(() => {
                    setGmLapsedError(null);
                    setRefreshKey((k) => k + 1);
                    setGmLapsedBanner(false);
                  })
                  .catch((err) =>
                    setGmLapsedError(err instanceof Error ? err.message : String(err)),
                  );
              }}
            >
              Sync Now
            </button>
            <button
              style={s.bannerDismiss}
              onClick={() => {
                setGmLapsedBanner(false);
                setGmLapsedError(null);
              }}
            >
              &times;
            </button>
          </div>
          {gmLapsedError && <span style={{ color: "#c00" }}>{gmLapsedError}</span>}
        </div>
      )}

      {hasUsableInbox && activePage === "inbox" && selectedConversationId && (
        <ConversationDetail
          api={activeConversationApi}
          conversationId={selectedConversationId}
          onBack={() => setSelectedConversationId(null)}
          onShare={setShareConversationId}
          cacheScope={conversationCacheScope}
          onUpdated={() => setRefreshKey((k) => k + 1)}
          mutationsDisabled={workspaceMutationUnavailable}
        />
      )}

      {showInbox && (
        <>
          {showWorkspaceLoading && (
            <div style={s.pendingBanner}>
              <span>
                Checking workspace access. Cached conversations are available while Listen refreshes
                source state.
              </span>
            </div>
          )}
          {backendUnavailable && (
            <div style={s.pendingBanner}>
              <span>
                {workspaceActionError || authError
                  ? (workspaceActionError ?? `Backend reconnect failed: ${authError}`)
                  : "Backend offline. Sync and source setup are unavailable; the library reads directly from TinyCloud."}
              </span>
              <button
                type="button"
                style={
                  workspaceActionLoading
                    ? { ...s.statusButton, ...s.statusButtonDisabled }
                    : s.statusButton
                }
                disabled={workspaceActionLoading}
                onClick={() => void retryBackendAvailability()}
              >
                {workspaceActionLoading ? "Checking..." : "Reconnect backend"}
              </button>
            </div>
          )}
          {api && hasUsableInbox && !workspaceMutationUnavailable && (
            <SyncControl
              api={api}
              backendUrl={BACKEND_URL}
              getAccessToken={() => sessionStoreRef.current.getToken()}
              onSyncComplete={() => setRefreshKey((k) => k + 1)}
              hasFireflies={firefliesConnected}
              hasGranola={granolaConnected}
              hasSoundcore={soundcoreConnected}
              hasGoogleMeet={hasGoogleMeet === true}
            />
          )}
          {ENABLE_TINYCLOUD_HOOKS && !workspaceMutationUnavailable && liveWriteHost && (
            <LiveWriteEvents
              tcw={tcw}
              spaceId={liveWriteSpaceId}
              pathPrefix={liveWritePathPrefix}
              onWrite={() => setRefreshKey((k) => k + 1)}
              onError={(error) => {
                if (address && tcw && isMissingParentDelegationError(error)) {
                  markStorageSessionInvalid(address, tcw, backendDid ?? undefined);
                }
              }}
            />
          )}
          <ListenOwnerPublishedShares
            tcw={tcw}
            refreshKey={ownerShareRefreshKey}
            mutationsDisabled={workspaceMutationUnavailable}
          />
          <ConversationList
            focusSearchKey={searchFocusKey}
            api={activeConversationApi}
            onSelectConversation={setSelectedConversationId}
            onShareConversation={setShareConversationId}
            onShareSelectedConversations={setOwnerShareConversationIds}
            refreshKey={refreshKey}
            cacheScope={conversationCacheScope}
            mutationsDisabled={workspaceMutationUnavailable}
          />
        </>
      )}

      {activePage === "shared" && <SharedWithMe initialShareToken={shareToken} />}

      {hasUsableInbox &&
        activePage === "chat" &&
        conversationApi &&
        (chatEnabled ? (
          <ChatScreen
            api={activeConversationApi}
            refreshKey={refreshKey}
            cacheScope={conversationCacheScope}
            onOpenConversation={(id) => {
              setSelectedConversationId(id);
              setActivePage("inbox");
            }}
          />
        ) : (
          <ChatUnderDevelopmentPanel />
        ))}

      {hasUsableInbox && activePage === "connections" && api && (
        <ConnectionsScreen
          api={api}
          hasFireflies={firefliesConnected}
          hasGranola={granolaConnected}
          hasSoundcore={soundcoreConnected}
          hasSoundcoreCredentials={hasSoundcoreKey === true}
          hasGoogleMeet={hasGoogleMeet === true}
          hasFirefliesBackendAccess={hasFirefliesBackendAccess === true}
          hasGranolaBackendAccess={hasGranolaBackendAccess === true}
          hasSoundcoreBackendAccess={hasSoundcoreBackendAccess === true}
          hasAssemblyAIKey={hasTranscriptionKeys.assemblyai}
          hasAssemblyAIBackendAccess={hasTranscriptionBackendAccess.assemblyai}
          hasDeepgramKey={hasTranscriptionKeys.deepgram}
          hasDeepgramBackendAccess={hasTranscriptionBackendAccess.deepgram}
          googleMeetAvailable={googleMeetAvailable}
          onAddSource={() => openSourcesSetup()}
          onConnectSoundcore={() => openSourcesSetup("soundcore-key")}
          onFinishSoundcoreAccess={
            delegationUnavailable
              ? undefined
              : async () => {
                  await handleFinishMissingSourceAccess();
                }
          }
          onAddTranscript={() => openSourcesSetup("transcript-import")}
          onFinishTranscriptionProviderAccess={
            delegationUnavailable
              ? undefined
              : (provider) =>
                  ensureSecretBackendAccess(
                    provider === "assemblyai" ? ASSEMBLYAI_SECRET_NAME : DEEPGRAM_SECRET_NAME,
                  )
          }
          actionsDisabled={workspaceMutationUnavailable}
          onRefresh={() => {
            setRefreshKey((k) => k + 1);
            setWorkspaceRefreshKey((k) => k + 1);
          }}
        />
      )}

      {shareConversationId && (
        <ConversationShareDialog
          api={activeConversationApi}
          tcw={tcw}
          conversationId={shareConversationId}
          onClose={() => setShareConversationId(null)}
          mutationsDisabled={workspaceMutationUnavailable}
        />
      )}

      {ownerShareConversationIds.length > 0 && (
        <ListenOwnerShareDialog
          api={activeConversationApi}
          tcw={tcw}
          conversationIds={ownerShareConversationIds}
          onPublished={() => setOwnerShareRefreshKey((key) => key + 1)}
          onClose={() => setOwnerShareConversationIds([])}
          mutationsDisabled={workspaceMutationUnavailable}
        />
      )}

      {showAddHub && api && !workspaceMutationUnavailable && (
        <AddTranscriptHub
          api={api}
          transcriptionReady={{
            assemblyai:
              hasTranscriptionKeys.assemblyai === true &&
              hasTranscriptionBackendAccess.assemblyai === true,
            deepgram:
              hasTranscriptionKeys.deepgram === true &&
              hasTranscriptionBackendAccess.deepgram === true,
          }}
          sourcesConnected={{
            fireflies: firefliesConnected,
            granola: granolaConnected,
            soundcore: soundcoreConnected,
            googleMeet: hasGoogleMeet === true,
          }}
          onClose={() => setShowAddHub(false)}
          onImported={(conversationId) => {
            setShowAddHub(false);
            setActivePage("inbox");
            setSelectedConversationId(conversationId);
            setRefreshKey((k) => k + 1);
          }}
          onOpenSources={() => {
            setShowAddHub(false);
            openSourcesSetup();
          }}
        />
      )}

      {api && hasBackendDelegation === true && !workspaceMutationUnavailable && (
        <GlobalSyncIndicator
          api={api}
          onViewResults={() => {
            setActivePage("inbox");
            setSelectedConversationId(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </AppShell>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const FONT = "var(--lst-font)";
const MONO = "var(--lst-mono)";

const s: Record<string, React.CSSProperties> = {
  eyebrow: {
    display: "block",
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    marginBottom: 7,
  },
  badge: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: 500,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "var(--lst-border)",
    padding: "4px 10px",
    borderRadius: 999,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    whiteSpace: "nowrap" as const,
  },
  badgeSolid: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: 500,
    color: "var(--lst-bg)",
    background: "var(--lst-blue)",
    border: "var(--lst-border)",
    padding: "4px 10px",
    borderRadius: 999,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    whiteSpace: "nowrap" as const,
  },
  statusPanel: {
    padding: "42px 48px",
    border: "var(--lst-border)",
    background: "var(--lst-bg)",
    animation: "fadeSlideIn 0.3s ease-out",
  },
  statusTitle: {
    fontFamily: FONT,
    fontSize: 36,
    fontWeight: 400,
    lineHeight: 1.05,
    letterSpacing: 0,
    color: "var(--lst-blue)",
    margin: "0 0 16px",
  },
  statusText: {
    maxWidth: 620,
    fontSize: 15,
    lineHeight: 1.55,
    color: "var(--lst-blue)",
    margin: "0 0 24px",
  },
  statusList: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 8,
    fontFamily: MONO,
    fontSize: 10,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  statusActionRow: {
    display: "flex",
    gap: 10,
    marginTop: 28,
  },
  statusButton: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: 600,
    color: "var(--lst-bg)",
    background: "var(--lst-blue)",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "9px 18px",
    cursor: "pointer",
  },
  statusButtonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  statusError: {
    marginTop: 18,
    padding: "10px 14px",
    border: "var(--lst-border)",
    background: "var(--lst-ink-08)",
    color: "var(--lst-blue)",
    fontSize: 13,
    lineHeight: 1.4,
  },
  userMenuStack: {
    display: "flex",
    flexDirection: "column" as const,
  },
  userMenuSourceSection: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
    padding: "14px 20px",
  },
  userMenuLabel: {
    fontFamily: MONO,
    fontSize: 10,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  userMenuAction: {
    fontFamily: FONT,
    display: "inline-flex",
    justifyContent: "flex-start",
    color: "var(--lst-blue)",
    background: "transparent",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "7px 12px",
    fontSize: 12,
    cursor: "pointer",
  },
  pendingBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    background: "var(--lst-ink-08)",
    border: "var(--lst-border)",
    borderRadius: 0,
    fontSize: 13,
    fontWeight: 500,
    color: "var(--lst-blue)",
    animation: "fadeSlideIn 0.3s ease-out",
  },
  bannerDismiss: {
    fontFamily: FONT,
    background: "none",
    border: "none",
    fontSize: 18,
    color: "var(--lst-blue)",
    cursor: "pointer",
    padding: "0 4px",
    lineHeight: 1,
  },
  lapsedBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    background: "var(--lst-bg-2)",
    border: "var(--lst-border)",
    borderRadius: 0,
    fontSize: 13,
    fontWeight: 500,
    color: "var(--lst-blue)",
    animation: "fadeSlideIn 0.3s ease-out",
  },
  lapsedActions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  lapsedSyncBtn: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 600,
    color: "var(--lst-bg)",
    background: "var(--lst-blue)",
    border: "var(--lst-border)",
    borderRadius: 999,
    padding: "6px 12px",
    cursor: "pointer",
  },
};
