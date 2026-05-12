import { useCallback, useEffect, useRef, useState } from "react";
import type { ComposedManifestRequest, TinyCloudWeb } from "@tinycloud/web-sdk";
import type { ServerInfo } from "@listen/core";
import {
  connectWallet,
  requestNonce,
  verifySession,
  createAndSignIn,
  createApiClient,
  createManifestDelegation,
  sendDelegation,
  checkDelegationStatus,
  revokeDelegation,
  SessionStore,
  composeManifestWithDelegatees,
  loadAppManifest,
  resolveManifestPermissionPath,
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
import { AppShell, type ShellRoute, type ShellSourceConfig } from "./components/AppShell";
import { MobileExperience } from "./components/mobile";
import { useIsMobile } from "./hooks/useIsMobile";

// ── Environment ─────────────────────────────────────────────────────

const OPENKEY_HOST = import.meta.env.VITE_OPENKEY_HOST || "https://openkey.so";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
const AGENT_ENDPOINT = import.meta.env.VITE_AGENT_ENDPOINT || "http://localhost:4097";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const ENABLE_AGENT = import.meta.env.VITE_ENABLE_AGENT === "true";
const ENABLE_TINYCLOUD_HOOKS = import.meta.env.VITE_ENABLE_TINYCLOUD_HOOKS === "true";
const FIREFLIES_SECRET_NAME = "FIREFLIES_API_KEY";
const FIREFLIES_SECRET_VAULT_KEY = `secrets/${FIREFLIES_SECRET_NAME}`;
const GRANOLA_SECRET_NAME = "GRANOLA_API_KEY";
const GRANOLA_SECRET_VAULT_KEY = `secrets/${GRANOLA_SECRET_NAME}`;

async function fetchAgentInfo(endpoint: string): Promise<ServerInfo | null> {
  try {
    const res = await fetch(`${endpoint}/info`);
    if (!res.ok) return null;
    return (await res.json()) as ServerInfo;
  } catch {
    return null;
  }
}

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
              <span className="landing-mono landing-version">v0.4 - May 2026</span>
              <h1>
                Capture thoughts.
                <br />
                Operate on data.
              </h1>
              <p className="landing-hero-lede">
                One inbox for every synced transcript from Fireflies and Google Meet. Search across
                all of it and open the source transcript.
              </p>
              <div className="landing-hero-meta">
                <span>
                  <span className="landing-dot" />2 sources connected
                </span>
                <span>-</span>
                <span>transcripts indexed in TinyCloud</span>
              </div>
              <div className="landing-hero-actions">
                <a className="landing-btn" href="#preview">
                  Watch demo
                </a>
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
                <span className="landing-eyebrow">01 - sources</span>
                <h2>Bring everything in.</h2>
              </div>
              <span className="landing-mono landing-muted">2 connected - always syncing</span>
            </div>
            <div className="landing-sources-row">
              {[
                ["Fireflies", "meet bot - webhook"],
                ["Google Meet", "captions sync"],
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
                  "One inbox",
                  "Fireflies and Google Meet transcripts land in a single chronological feed. Filter by source, person, or date.",
                ],
                [
                  "02",
                  "Real summaries",
                  "Per-transcript summaries you can read like documents. Copy, export, and sync the records you need.",
                ],
                [
                  "03",
                  "Search in chat",
                  "Ask across your transcript library in a chat-like flow. Every result traces back to the source.",
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
                <span className="landing-eyebrow">02 - your transcripts</span>
                <h2>The room, after the room.</h2>
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
              "I stopped taking meeting notes. Listen reads them all back to me on Monday morning,
              and tells me what I owe people."
            </p>
            <span className="landing-mono landing-muted">- Priya R - Head of Product</span>
          </section>

          <footer className="landing-footer">
            <div className="landing-footer-grid">
              <div>
                <LandingLogo />
                <p>
                  A transcript workspace that aggregates spoken words and turns them into
                  searchable, structured information.
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
              <span className="landing-mono landing-muted">© 2026 listen, inc.</span>
              <span className="landing-mono landing-muted">made in monochrome</span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

async function checkSecretExists(
  tcw: TinyCloudWeb,
  secretName: string,
  label: string,
): Promise<boolean> {
  const unlockResult = await tcw.secrets.unlock();
  if (!unlockResult.ok) {
    throw new Error(unlockResult.error.message);
  }

  const result = await tcw.secrets.get(secretName);
  if (result.ok) return Boolean(result.data);

  const code = result.error?.code?.toLowerCase();
  if (code === "key_not_found" || code === "not_found") return false;

  throw new Error(result.error?.message ?? `Failed to check ${label} API key`);
}

async function checkSecretExistsFromBackend(
  api: ApiClient,
  source: "fireflies" | "granola",
): Promise<boolean> {
  const result = await api.get<{ exists: boolean }>(`/api/config/${source}-key/exists`);
  return result.exists;
}

type WorkspaceStatusMode = "checking" | "fireflies-access" | "granola-access" | "wallet";

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
    },
    "fireflies-access": {
      eyebrow: "fireflies",
      title: "Finish Fireflies access.",
      copy: "The Fireflies key is stored in TinyCloud Secrets. Delegate access to the Listen backend so sync can run.",
      action: "Finish access",
    },
    "granola-access": {
      eyebrow: "granola",
      title: "Finish Granola access.",
      copy: "The Granola key is stored in TinyCloud Secrets. Delegate access to the Listen backend so sync can run.",
      action: "Finish access",
    },
    wallet: {
      eyebrow: "sources",
      title: "Reconnect wallet to connect sources.",
      copy: "This session was restored without a TinyCloud wallet instance. Reconnect to read or write Secrets and add providers.",
      action: "Reconnect wallet",
    },
  }[mode];

  return (
    <section style={s.statusPanel}>
      <span style={s.eyebrow}>- {content.eyebrow}</span>
      <h3 style={s.statusTitle}>{content.title}</h3>
      <p style={s.statusText}>{content.copy}</p>
      <div style={s.statusList}>
        <span>backend delegation</span>
        <span>secrets access</span>
        <span>existing transcripts</span>
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

// ── App ─────────────────────────────────────────────────────────────

export function App() {
  const [address, setAddress] = useState<string | null>(null);
  const [did, setDid] = useState<string | null>(null);
  const [tcw, setTcw] = useState<TinyCloudWeb | null>(null);
  const [api, setApi] = useState<ApiClient | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [hasGranolaKey, setHasGranolaKey] = useState<boolean | null>(null);
  const [hasBackendDelegation, setHasBackendDelegation] = useState<boolean | null>(null);
  const [hasFirefliesBackendAccess, setHasFirefliesBackendAccess] = useState<boolean | null>(null);
  const [hasGranolaBackendAccess, setHasGranolaBackendAccess] = useState<boolean | null>(null);
  const [hasGoogleMeet, setHasGoogleMeet] = useState<boolean | null>(null);
  const [hasExistingConversations, setHasExistingConversations] = useState<boolean | null>(null);
  const [workspaceActionLoading, setWorkspaceActionLoading] = useState(false);
  const [workspaceActionError, setWorkspaceActionError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<ShellRoute>("inbox");
  const [sourcesInitialStep, setSourcesInitialStep] = useState<"cards" | "transcript-import">(
    "cards",
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [pendingBanner, setPendingBanner] = useState<string | null>(null);
  const [gmLapsedBanner, setGmLapsedBanner] = useState(false);
  const [liveWritePathPrefix, setLiveWritePathPrefix] = useState<string | null>(null);
  const [liveWriteHost, setLiveWriteHost] = useState<string | null>(null);
  const [agentInfo, setAgentInfo] = useState<ServerInfo | null>(null);
  const [backendDid, setBackendDid] = useState<string | null>(null);
  const [capabilityRequest, setCapabilityRequest] = useState<ComposedManifestRequest | null>(null);

  const sessionStoreRef = useRef(new SessionStore());
  const isMobile = useIsMobile();

  const renewBackendDelegation = useCallback(async () => {
    if (!tcw || !backendDid || !capabilityRequest) {
      throw new Error("Reconnect your wallet to finish source setup.");
    }

    const token = sessionStoreRef.current.getToken();
    if (!token) {
      throw new Error("Session expired. Sign in again to finish source setup.");
    }

    const { serialized } = await createManifestDelegation(tcw, backendDid, capabilityRequest);
    await sendDelegation(BACKEND_URL, serialized, token);
    setHasBackendDelegation(true);
  }, [backendDid, capabilityRequest, tcw]);

  useEffect(() => {
    if (!api) {
      setHasBackendDelegation(null);
      return;
    }

    const token = sessionStoreRef.current.getToken();
    if (!token) {
      setHasBackendDelegation(false);
      return;
    }

    setHasBackendDelegation(null);
    let cancelled = false;
    checkDelegationStatus(BACKEND_URL, token)
      .then(async (status) => {
        if (cancelled) return;
        if (status.status === "active") {
          setHasBackendDelegation(true);
          return;
        }
        await renewBackendDelegation();
      })
      .catch(() => {
        if (!cancelled) setHasBackendDelegation(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, renewBackendDelegation]);

  useEffect(() => {
    if (hasBackendDelegation === null) {
      setHasKey(null);
      return;
    }

    if (tcw) {
      checkSecretExists(tcw, FIREFLIES_SECRET_NAME, "Fireflies")
        .then((exists) => setHasKey(exists))
        .catch(() => setHasKey(false));
      return;
    }

    if (api && hasBackendDelegation === true) {
      checkSecretExistsFromBackend(api, "fireflies")
        .then((exists) => setHasKey(exists))
        .catch(() => setHasKey(false));
      return;
    }

    setHasKey(false);
  }, [api, tcw, hasBackendDelegation]);

  useEffect(() => {
    if (hasBackendDelegation === null) {
      setHasGranolaKey(null);
      return;
    }

    if (tcw) {
      checkSecretExists(tcw, GRANOLA_SECRET_NAME, "Granola")
        .then((exists) => setHasGranolaKey(exists))
        .catch(() => setHasGranolaKey(false));
      return;
    }

    if (api && hasBackendDelegation === true) {
      checkSecretExistsFromBackend(api, "granola")
        .then((exists) => setHasGranolaKey(exists))
        .catch(() => setHasGranolaKey(false));
      return;
    }

    setHasGranolaKey(false);
  }, [api, tcw, hasBackendDelegation]);

  useEffect(() => {
    if (!api || hasKey !== true) {
      setHasFirefliesBackendAccess(null);
      return;
    }

    if (hasBackendDelegation === false) {
      setHasFirefliesBackendAccess(false);
      return;
    }

    if (hasBackendDelegation !== true) {
      setHasFirefliesBackendAccess(null);
      return;
    }

    setHasFirefliesBackendAccess(null);
    checkSecretExistsFromBackend(api, "fireflies")
      .then((exists) => setHasFirefliesBackendAccess(exists))
      .catch(() => setHasFirefliesBackendAccess(false));
  }, [api, hasBackendDelegation, hasKey]);

  useEffect(() => {
    if (!api || hasGranolaKey !== true) {
      setHasGranolaBackendAccess(null);
      return;
    }

    if (hasBackendDelegation === false) {
      setHasGranolaBackendAccess(false);
      return;
    }

    if (hasBackendDelegation !== true) {
      setHasGranolaBackendAccess(null);
      return;
    }

    setHasGranolaBackendAccess(null);
    checkSecretExistsFromBackend(api, "granola")
      .then((exists) => setHasGranolaBackendAccess(exists))
      .catch(() => setHasGranolaBackendAccess(false));
  }, [api, hasBackendDelegation, hasGranolaKey]);

  useEffect(() => {
    if (!api || hasBackendDelegation !== true) {
      setHasGoogleMeet(null);
      return;
    }
    api
      .get<{ connected: boolean }>("/api/config/google-meet/connected")
      .then((res) => setHasGoogleMeet(res.connected))
      .catch(() => setHasGoogleMeet(false));
  }, [api, hasBackendDelegation]);

  useEffect(() => {
    if (!api || hasBackendDelegation !== true) {
      setHasExistingConversations(null);
      return;
    }

    api
      .get<{ total: number }>("/api/conversations?limit=1&offset=0")
      .then((res) => setHasExistingConversations(res.total > 0))
      .catch(() => setHasExistingConversations(false));
  }, [api, hasBackendDelegation, refreshKey]);

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

  const handleSignIn = useCallback(async () => {
    setAuthLoading(true);
    setAuthError(null);
    setWorkspaceActionError(null);
    try {
      const { address: addr, web3Provider } = await connectWallet({ host: OPENKEY_HOST });
      const [nonce, info, agent] = await Promise.all([
        requestNonce(BACKEND_URL, addr),
        (async (): Promise<ServerInfo> => {
          const res = await fetch(`${BACKEND_URL}/api/server-info`);
          if (!res.ok) throw new Error(`Server info: ${res.statusText}`);
          return res.json();
        })(),
        ENABLE_AGENT ? fetchAgentInfo(AGENT_ENDPOINT) : Promise.resolve(null),
      ]);
      const appManifest = await loadAppManifest(`${BACKEND_URL}/api/manifest`);
      const conversationEventPathPrefix = ENABLE_TINYCLOUD_HOOKS
        ? resolveManifestPermissionPath(appManifest, "tinycloud.sql", "conversations/conversation")
        : null;
      const delegatees: ServerInfo[] = agent ? [info, agent] : [info];
      const composedRequest = composeManifestWithDelegatees(appManifest, delegatees);

      const { tcw: tcwInstance, session } = await createAndSignIn(web3Provider, {
        nonce,
        autoCreateSpace: true,
        manifest: appManifest,
        capabilityRequest: composedRequest,
      });
      const { token, expiresIn } = await verifySession(
        BACKEND_URL,
        session.siwe,
        session.signature,
      );
      sessionStoreRef.current.setSession(token, expiresIn, addr);
      const apiClient = createApiClient(BACKEND_URL, {
        sessionStore: sessionStoreRef.current,
      });

      const delegationStatus = await checkDelegationStatus(BACKEND_URL, token).catch(() => ({
        status: "none",
        expiresAt: null,
      }));
      let backendDelegationActive = delegationStatus.status === "active";
      if (!backendDelegationActive) {
        const { serialized } = await createManifestDelegation(
          tcwInstance,
          info.did,
          composedRequest,
        );
        await sendDelegation(BACKEND_URL, serialized, token);
        backendDelegationActive = true;
      }
      setAddress(addr);
      setDid(tcwInstance.did ?? null);
      setTcw(tcwInstance);
      setApi(apiClient);
      setAgentInfo(agent);
      setBackendDid(info.did);
      setCapabilityRequest(composedRequest);
      setHasBackendDelegation(backendDelegationActive);
      setLiveWritePathPrefix(conversationEventPathPrefix);
      setLiveWriteHost(tcwInstance.hosts[0] ?? null);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : String(err));
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    const token = sessionStoreRef.current.getToken();
    if (token) revokeDelegation(BACKEND_URL, token).catch(() => {});
    await tcw?.signOut?.();
    sessionStoreRef.current.clear();
    setAddress(null);
    setDid(null);
    setTcw(null);
    setApi(null);
    setAgentInfo(null);
    setBackendDid(null);
    setCapabilityRequest(null);
    setLiveWritePathPrefix(null);
    setLiveWriteHost(null);
    setAuthError(null);
    setHasKey(null);
    setHasGranolaKey(null);
    setHasBackendDelegation(null);
    setHasFirefliesBackendAccess(null);
    setHasGranolaBackendAccess(null);
    setHasGoogleMeet(null);
    setHasExistingConversations(null);
    setWorkspaceActionError(null);
    setWorkspaceActionLoading(false);
    setActivePage("inbox");
    setGmLapsedBanner(false);
  }, [tcw]);

  const ensureBackendAccess = useCallback(async () => {
    await renewBackendDelegation();
  }, [renewBackendDelegation]);

  const ensureSourceBackendAccess = useCallback(
    async (source: "fireflies" | "granola") => {
      if (!tcw || !backendDid || !api) {
        throw new Error(`Reconnect your wallet to finish ${source} setup.`);
      }

      if (source === "fireflies") setHasFirefliesBackendAccess(null);
      else setHasGranolaBackendAccess(null);
      await ensureBackendAccess();

      const unlockResult = await tcw.secrets.unlock();
      if (!unlockResult.ok) {
        throw new Error(unlockResult.error.message);
      }

      const vaultKey =
        source === "fireflies" ? FIREFLIES_SECRET_VAULT_KEY : GRANOLA_SECRET_VAULT_KEY;
      const shareResult = await tcw.secrets.vault.reencrypt(vaultKey, backendDid);
      if (!shareResult.ok) {
        throw new Error(shareResult.error.message);
      }

      const backendCanRead = await checkSecretExistsFromBackend(api, source);
      if (!backendCanRead) {
        if (source === "fireflies") setHasFirefliesBackendAccess(false);
        else setHasGranolaBackendAccess(false);
        const secretName = source === "fireflies" ? FIREFLIES_SECRET_NAME : GRANOLA_SECRET_NAME;
        throw new Error(`Backend still cannot read ${secretName}. Re-save the key or try again.`);
      }

      setHasBackendDelegation(true);
      if (source === "fireflies") setHasFirefliesBackendAccess(true);
      else setHasGranolaBackendAccess(true);
    },
    [api, backendDid, ensureBackendAccess, tcw],
  );

  const ensureFirefliesBackendAccess = useCallback(
    () => ensureSourceBackendAccess("fireflies"),
    [ensureSourceBackendAccess],
  );

  const ensureGranolaBackendAccess = useCallback(
    () => ensureSourceBackendAccess("granola"),
    [ensureSourceBackendAccess],
  );

  const handleFinishFirefliesAccess = useCallback(async () => {
    setWorkspaceActionLoading(true);
    setWorkspaceActionError(null);
    try {
      await ensureFirefliesBackendAccess();
      setHasBackendDelegation(true);
      setHasFirefliesBackendAccess(true);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setWorkspaceActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setWorkspaceActionLoading(false);
    }
  }, [ensureFirefliesBackendAccess]);

  // ── Render ────────────────────────────────────────────────────────

  const isSignedIn = address !== null && api !== null;
  const firefliesConnected =
    hasKey === true && hasBackendDelegation === true && hasFirefliesBackendAccess === true;
  const granolaConnected =
    hasGranolaKey === true && hasBackendDelegation === true && hasGranolaBackendAccess === true;
  const connectedSourceCount = [
    firefliesConnected,
    granolaConnected,
    hasGoogleMeet === true,
  ].filter(Boolean).length;
  const hasUsableInbox = connectedSourceCount > 0 || hasExistingConversations === true;
  const backendStatusReady = hasBackendDelegation !== null;
  const firefliesKeyReady = hasKey !== null;
  const granolaKeyReady = hasGranolaKey !== null;
  const firefliesBackendAccessReady =
    hasKey === true && hasBackendDelegation === true ? hasFirefliesBackendAccess !== null : true;
  const granolaBackendAccessReady =
    hasGranolaKey === true && hasBackendDelegation === true
      ? hasGranolaBackendAccess !== null
      : true;
  const backendBackedChecksReady =
    hasBackendDelegation === true
      ? hasGoogleMeet !== null &&
        hasExistingConversations !== null &&
        firefliesBackendAccessReady &&
        granolaBackendAccessReady
      : true;
  const workspaceChecksReady =
    isSignedIn &&
    backendStatusReady &&
    firefliesKeyReady &&
    granolaKeyReady &&
    backendBackedChecksReady;
  const setupAvailable = tcw !== null && backendDid !== null;
  const needsFirefliesAccess =
    workspaceChecksReady &&
    hasKey === true &&
    (hasBackendDelegation === false || hasFirefliesBackendAccess === false);
  const needsGranolaAccess =
    workspaceChecksReady &&
    hasGranolaKey === true &&
    (hasBackendDelegation === false || hasGranolaBackendAccess === false);
  const showWorkspaceLoading = isSignedIn && !workspaceChecksReady;
  const showOnboarding =
    isSignedIn &&
    workspaceChecksReady &&
    !hasUsableInbox &&
    !needsFirefliesAccess &&
    !needsGranolaAccess &&
    setupAvailable;
  const showWalletSetupState =
    isSignedIn &&
    workspaceChecksReady &&
    !hasUsableInbox &&
    !needsFirefliesAccess &&
    !needsGranolaAccess &&
    !setupAvailable;
  const showSourcesSetup =
    isSignedIn && hasUsableInbox && activePage === "sources" && setupAvailable;
  const showSourcesWalletState =
    isSignedIn && hasUsableInbox && activePage === "sources" && !setupAvailable;

  if (!isSignedIn) {
    return <LandingPage loading={authLoading} error={authError} onSignIn={handleSignIn} />;
  }

  const pageEyebrow = !isSignedIn
    ? "welcome"
    : selectedConversationId
      ? "library / transcript"
      : showWorkspaceLoading
        ? "workspace / checking"
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
                  : activePage === "chat"
                    ? "library / chat"
                    : hasUsableInbox
                      ? `inbox · ${connectedSourceCount} source${connectedSourceCount === 1 ? "" : "s"}`
                      : "onboarding / sources";
  const pageTitle = !isSignedIn
    ? "Capture thoughts. Operate on data."
    : selectedConversationId
      ? "Transcript detail"
      : showWorkspaceLoading
        ? "Checking workspace."
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
                  : activePage === "chat"
                    ? "Ask your transcripts."
                    : hasUsableInbox
                      ? "Everything you've said."
                      : "Connect what you already have.";

  const sourceItems: ShellSourceConfig[] = [
    { key: "fireflies", name: "Fireflies", count: null },
    { key: "granola", name: "Granola", count: null },
  ];
  if (GOOGLE_CLIENT_ID) {
    sourceItems.push({ key: "gmeet", name: "Google Meet", count: null });
  }

  const userInitials = address ? `${address.slice(2, 3)}${address.slice(-1)}`.toUpperCase() : "??";
  const userName = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Signed in";
  const userPlan = did
    ? `CONNECTED · ${connectedSourceCount} source${connectedSourceCount === 1 ? "" : "s"}`
    : `RESTORED · ${connectedSourceCount} source${connectedSourceCount === 1 ? "" : "s"}`;

  const handleTranscriptImportComplete = (conversationId: string) => {
    setHasExistingConversations(true);
    setRefreshKey((k) => k + 1);
    setSelectedConversationId(conversationId);
    setActivePage("inbox");
  };

  const openSourcesSetup = (initialStep: "cards" | "transcript-import" = "cards") => {
    setSourcesInitialStep(initialStep);
    setSelectedConversationId(null);
    setActivePage("sources");
  };

  const handleRouteChange = (route: ShellRoute) => {
    setSelectedConversationId(null);
    if (route === "sources") setSourcesInitialStep("cards");
    setActivePage(route);
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
      {hasGoogleMeet && <span style={s.badge}>Google Meet</span>}
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
      {ENABLE_AGENT && tcw && capabilityRequest && (
        <ConnectAgentButton
          tcw={tcw}
          capabilityRequest={capabilityRequest}
          agentInfo={agentInfo}
          agentEndpoint={AGENT_ENDPOINT}
          onRefresh={() => setRefreshKey((k) => k + 1)}
          refreshLabel="Refresh conversations"
        />
      )}
      {(hasKey || hasGranolaKey || hasGoogleMeet) && (
        <div style={s.userMenuSourceSection}>
          <span style={s.userMenuLabel}>Sources</span>
          {hasKey && tcw && (
            <button
              type="button"
              style={s.userMenuAction}
              onClick={async () => {
                const unlockResult = await tcw.secrets.unlock();
                if (!unlockResult.ok) throw new Error(unlockResult.error.message);
                const result = await tcw.secrets.delete(FIREFLIES_SECRET_NAME);
                if (!result.ok) throw new Error(result.error.message);
                setHasKey(false);
                setHasFirefliesBackendAccess(null);
              }}
            >
              Disconnect Fireflies
            </button>
          )}
          {hasGranolaKey && tcw && (
            <button
              type="button"
              style={s.userMenuAction}
              onClick={async () => {
                const unlockResult = await tcw.secrets.unlock();
                if (!unlockResult.ok) throw new Error(unlockResult.error.message);
                const result = await tcw.secrets.delete(GRANOLA_SECRET_NAME);
                if (!result.ok) throw new Error(result.error.message);
                setHasGranolaKey(false);
                setHasGranolaBackendAccess(null);
              }}
            >
              Disconnect Granola
            </button>
          )}
          {hasGoogleMeet && (
            <button
              type="button"
              style={s.userMenuAction}
              onClick={async () => {
                if (!api) return;
                await api.del("/api/config/google-meet");
                setHasGoogleMeet(false);
              }}
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
    hasUsableInbox &&
    !showWorkspaceLoading &&
    !needsFirefliesAccess &&
    !needsGranolaAccess &&
    !showOnboarding &&
    !showWalletSetupState &&
    !showSourcesSetup &&
    !showSourcesWalletState
  ) {
    return (
      <MobileExperience
        api={api}
        activeRoute={activePage}
        selectedConversationId={selectedConversationId}
        refreshKey={refreshKey}
        hasFireflies={firefliesConnected}
        hasGoogleMeet={hasGoogleMeet === true}
        hasFirefliesBackendAccess={hasFirefliesBackendAccess === true}
        showGoogleMeet={!!GOOGLE_CLIENT_ID}
        onRouteChange={setActivePage}
        onSelectConversation={setSelectedConversationId}
        onAddSource={() => openSourcesSetup()}
        onRefresh={() => setRefreshKey((k) => k + 1)}
      />
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
    >
      {showWorkspaceLoading && <WorkspaceStatusPanel mode="checking" />}

      {needsFirefliesAccess && (
        <WorkspaceStatusPanel
          mode="fireflies-access"
          loading={workspaceActionLoading}
          error={workspaceActionError}
          onAction={handleFinishFirefliesAccess}
        />
      )}

      {needsGranolaAccess && (
        <WorkspaceStatusPanel
          mode="granola-access"
          loading={workspaceActionLoading}
          error={workspaceActionError}
          onAction={async () => {
            setWorkspaceActionLoading(true);
            setWorkspaceActionError(null);
            try {
              await ensureGranolaBackendAccess();
              setHasBackendDelegation(true);
              setHasGranolaBackendAccess(true);
              setRefreshKey((k) => k + 1);
            } catch (err) {
              setWorkspaceActionError(err instanceof Error ? err.message : String(err));
            } finally {
              setWorkspaceActionLoading(false);
            }
          }}
        />
      )}

      {(showWalletSetupState || showSourcesWalletState) && (
        <WorkspaceStatusPanel
          mode="wallet"
          loading={authLoading}
          error={authError}
          onAction={handleSignIn}
        />
      )}

      {showOnboarding && tcw && (
        <SourcesSetup
          api={api}
          tcw={tcw}
          mode="onboarding"
          hasFirefliesKey={hasKey}
          hasGranolaKey={hasGranolaKey}
          hasBackendDelegation={hasBackendDelegation}
          hasFirefliesBackendAccess={hasFirefliesBackendAccess}
          hasGranolaBackendAccess={hasGranolaBackendAccess}
          hasGoogleMeet={hasGoogleMeet}
          initialStep="cards"
          onEnsureBackendAccess={ensureBackendAccess}
          onEnsureFirefliesBackendAccess={ensureFirefliesBackendAccess}
          onEnsureGranolaBackendAccess={ensureGranolaBackendAccess}
          onFirefliesComplete={() => {
            setHasKey(true);
            setHasBackendDelegation(true);
            setHasFirefliesBackendAccess(true);
            setRefreshKey((k) => k + 1);
            setActivePage("inbox");
          }}
          onGranolaComplete={() => {
            setHasGranolaKey(true);
            setHasBackendDelegation(true);
            setHasGranolaBackendAccess(true);
            setRefreshKey((k) => k + 1);
            setActivePage("inbox");
          }}
          onTranscriptImportComplete={handleTranscriptImportComplete}
          onDone={() => setActivePage("inbox")}
          onGoogleMeetComplete={() => {
            setHasGoogleMeet(true);
            setHasBackendDelegation(true);
            setRefreshKey((k) => k + 1);
            setActivePage("inbox");
          }}
          backendUrl={BACKEND_URL}
          showGoogleMeet={!!GOOGLE_CLIENT_ID}
        />
      )}

      {showSourcesSetup && tcw && (
        <SourcesSetup
          api={api}
          tcw={tcw}
          mode="sources"
          hasFirefliesKey={hasKey}
          hasGranolaKey={hasGranolaKey}
          hasBackendDelegation={hasBackendDelegation}
          hasFirefliesBackendAccess={hasFirefliesBackendAccess}
          hasGranolaBackendAccess={hasGranolaBackendAccess}
          hasGoogleMeet={hasGoogleMeet}
          initialStep={sourcesInitialStep}
          onEnsureBackendAccess={ensureBackendAccess}
          onEnsureFirefliesBackendAccess={ensureFirefliesBackendAccess}
          onEnsureGranolaBackendAccess={ensureGranolaBackendAccess}
          onFirefliesComplete={() => {
            setHasKey(true);
            setHasBackendDelegation(true);
            setHasFirefliesBackendAccess(true);
            setRefreshKey((k) => k + 1);
            setActivePage("inbox");
          }}
          onGranolaComplete={() => {
            setHasGranolaKey(true);
            setHasBackendDelegation(true);
            setHasGranolaBackendAccess(true);
            setRefreshKey((k) => k + 1);
            setActivePage("inbox");
          }}
          onTranscriptImportComplete={handleTranscriptImportComplete}
          onDone={() => setActivePage("inbox")}
          onGoogleMeetComplete={() => {
            setHasGoogleMeet(true);
            setHasBackendDelegation(true);
            setRefreshKey((k) => k + 1);
            setActivePage("inbox");
          }}
          backendUrl={BACKEND_URL}
          showGoogleMeet={!!GOOGLE_CLIENT_ID}
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

      {gmLapsedBanner && (
        <div style={s.lapsedBanner}>
          <span>Real-time sync was inactive. Some meetings may not have been captured.</span>
          <div style={s.lapsedActions}>
            <button
              style={s.lapsedSyncBtn}
              onClick={() => {
                api
                  ?.post("/api/sync/google-meet")
                  .then(() => {
                    setRefreshKey((k) => k + 1);
                    setGmLapsedBanner(false);
                  })
                  .catch(() => {});
              }}
            >
              Sync Now
            </button>
            <button style={s.bannerDismiss} onClick={() => setGmLapsedBanner(false)}>
              &times;
            </button>
          </div>
        </div>
      )}

      {hasUsableInbox && activePage === "inbox" && selectedConversationId && (
        <ConversationDetail
          api={api}
          conversationId={selectedConversationId}
          onBack={() => setSelectedConversationId(null)}
        />
      )}

      {hasUsableInbox && activePage === "inbox" && !selectedConversationId && (
        <>
          <SyncControl
            api={api}
            backendUrl={BACKEND_URL}
            getAccessToken={() => sessionStoreRef.current.getToken()}
            onSyncComplete={() => setRefreshKey((k) => k + 1)}
            hasFireflies={firefliesConnected}
            hasGranola={granolaConnected}
            hasGoogleMeet={hasGoogleMeet === true}
          />
          {ENABLE_TINYCLOUD_HOOKS && liveWriteHost && (
            <LiveWriteEvents
              tcw={tcw}
              hooksHost={liveWriteHost}
              pathPrefix={liveWritePathPrefix}
              onWrite={() => setRefreshKey((k) => k + 1)}
            />
          )}
          <ConversationList
            api={api}
            onSelectConversation={setSelectedConversationId}
            refreshKey={refreshKey}
          />
        </>
      )}

      {hasUsableInbox && activePage === "chat" && api && (
        <ChatScreen
          api={api}
          refreshKey={refreshKey}
          onOpenConversation={(id) => {
            setSelectedConversationId(id);
            setActivePage("inbox");
          }}
        />
      )}

      {hasUsableInbox && activePage === "connections" && api && (
        <ConnectionsScreen
          api={api}
          hasFireflies={firefliesConnected}
          hasGoogleMeet={hasGoogleMeet === true}
          hasFirefliesBackendAccess={hasFirefliesBackendAccess === true}
          showGoogleMeet={!!GOOGLE_CLIENT_ID}
          onAddSource={() => openSourcesSetup()}
          onAddTranscript={() => openSourcesSetup("transcript-import")}
          onRefresh={() => setRefreshKey((k) => k + 1)}
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
