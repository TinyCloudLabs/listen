import { useCallback, useEffect, useRef, useState } from "react";
import type { TinyCloudWeb } from "@tinycloud/web-sdk";
import type { ServerInfo } from "@tinyboilerplate/core";
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
  composeManifestWithBackend,
  loadAppManifest,
  resolveManifestPermissionPath,
  type ApiClient,
} from "@tinyboilerplate/client";

import { AuthPanel } from "./components/AuthPanel";
import { SetupWizard } from "./components/SetupWizard";
import { SyncControl } from "./components/SyncControl";
import { ConversationList } from "./components/ConversationList";
import { ConversationDetail } from "./components/ConversationDetail";
import { LiveWriteEvents } from "./components/LiveWriteEvents";

// ── Environment ─────────────────────────────────────────────────────

const OPENKEY_HOST = import.meta.env.VITE_OPENKEY_HOST || "https://openkey.so";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const ENABLE_TINYCLOUD_HOOKS = import.meta.env.VITE_ENABLE_TINYCLOUD_HOOKS === "true";

// ── App ─────────────────────────────────────────────────────────────

export function App() {
  const [address, setAddress] = useState<string | null>(null);
  const [did, setDid] = useState<string | null>(null);
  const [tcw, setTcw] = useState<TinyCloudWeb | null>(null);
  const [api, setApi] = useState<ApiClient | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [hasGoogleMeet, setHasGoogleMeet] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [pendingBanner, setPendingBanner] = useState<string | null>(null);
  const [gmLapsedBanner, setGmLapsedBanner] = useState(false);
  const [liveWritePathPrefix, setLiveWritePathPrefix] = useState<string | null>(null);

  const sessionStoreRef = useRef(new SessionStore());
  const restoreAttemptedRef = useRef(false);

  // ── Session Restore ─────────────────────────────────────────────

  useEffect(() => {
    if (restoreAttemptedRef.current) return;
    restoreAttemptedRef.current = true;

    const sessionStore = sessionStoreRef.current;
    if (!sessionStore.hasSession() || sessionStore.isExpired()) return;

    const storedAddress = sessionStore.getAddress();
    if (!storedAddress) return;

    (async () => {
      setAuthLoading(true);
      try {
        console.log("[restore] Attempting session restore for", storedAddress);
        const apiClient = createApiClient(BACKEND_URL, { sessionStore });
        const token = sessionStore.getToken();
        if (!token) throw new Error("No session token after restore");
        const status = await checkDelegationStatus(BACKEND_URL, token);
        if (status.status !== "active") throw new Error("Delegation expired or missing");
        console.log("[restore] Session fully restored!");
        const did = `did:pkh:eip155:1:${storedAddress}`;
        setAddress(storedAddress);
        setDid(did);
        setApi(apiClient);
      } catch (err) {
        console.warn("[restore] Session restore failed:", err);
        sessionStore.clear();
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!api) {
      setHasKey(null);
      return;
    }
    api
      .get<{ exists: boolean }>("/api/config/fireflies-key/exists")
      .then((res) => setHasKey(res.exists))
      .catch(() => setHasKey(false));
  }, [api]);

  useEffect(() => {
    if (!api) {
      setHasGoogleMeet(null);
      return;
    }
    api
      .get<{ connected: boolean }>("/api/config/google-meet/connected")
      .then((res) => setHasGoogleMeet(res.connected))
      .catch(() => setHasGoogleMeet(false));
  }, [api]);

  useEffect(() => {
    if (!api || hasKey !== true) return;
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
  }, [api, hasKey]);

  useEffect(() => {
    if (!api || hasKey !== true) return;
    api
      .post<{ updated: number; still_missing: number }>("/api/sync/backfill-summaries")
      .then((result) => {
        if (result.updated > 0) setRefreshKey((k) => k + 1);
      })
      .catch((err) => console.error("[backfill]", err));
  }, [api, hasKey]);

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
    try {
      const { address: addr, web3Provider } = await connectWallet({ host: OPENKEY_HOST });
      const [nonce, info] = await Promise.all([
        requestNonce(BACKEND_URL, addr),
        (async (): Promise<ServerInfo> => {
          const res = await fetch(`${BACKEND_URL}/api/server-info`);
          if (!res.ok) throw new Error(`Server info: ${res.statusText}`);
          return res.json();
        })(),
      ]);
      const appManifest = await loadAppManifest(`${BACKEND_URL}/api/manifest`);
      const conversationEventPathPrefix = ENABLE_TINYCLOUD_HOOKS
        ? resolveManifestPermissionPath(appManifest, "tinycloud.sql", "conversations/conversation")
        : null;
      const capabilityRequest = composeManifestWithBackend(appManifest, info);

      const { tcw: tcwInstance, session } = await createAndSignIn(web3Provider, {
        nonce,
        autoCreateSpace: true,
        capabilityRequest,
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

      const { serialized } = await createManifestDelegation(
        tcwInstance,
        info.did,
        capabilityRequest,
      );
      await sendDelegation(BACKEND_URL, serialized, token);
      setAddress(addr);
      setDid(tcwInstance.did ?? null);
      setTcw(tcwInstance);
      setApi(apiClient);
      setLiveWritePathPrefix(conversationEventPathPrefix);
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
    setLiveWritePathPrefix(null);
    setAuthError(null);
    setHasKey(null);
    setHasGoogleMeet(null);
    setGmLapsedBanner(false);
  }, [tcw]);

  // ── Render ────────────────────────────────────────────────────────

  const isSignedIn = address !== null && api !== null;

  return (
    <div style={s.shell}>
      <header style={s.header}>
        <h1 style={s.logo}>Conversation Sync</h1>
        {hasKey && <span style={s.badge}>Fireflies</span>}
        {hasGoogleMeet && (
          <span style={{ ...s.badge, color: "#059669", background: "#ecfdf5" }}>Google Meet</span>
        )}
      </header>

      <main style={s.main}>
        <AuthPanel
          isSignedIn={isSignedIn}
          address={address}
          did={did}
          loading={authLoading}
          error={authError}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
        />

        {isSignedIn &&
          (hasKey === false || (hasGoogleMeet === false && !!GOOGLE_CLIENT_ID)) &&
          !(hasKey === true && hasGoogleMeet === true) && (
            <SetupWizard
              api={api}
              onComplete={() => setHasKey(true)}
              onGoogleMeetComplete={() => setHasGoogleMeet(true)}
              backendUrl={BACKEND_URL}
              showGoogleMeet={!!GOOGLE_CLIENT_ID}
              initialSource={
                hasKey === true ? "google-meet" : hasGoogleMeet === true ? "fireflies" : undefined
              }
            />
          )}

        {isSignedIn && (hasKey === true || hasGoogleMeet === true) && selectedConversationId && (
          <ConversationDetail
            api={api}
            conversationId={selectedConversationId}
            onBack={() => setSelectedConversationId(null)}
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

        {isSignedIn && (hasKey === true || hasGoogleMeet === true) && !selectedConversationId && (
          <>
            <SyncControl
              api={api}
              backendUrl={BACKEND_URL}
              getAccessToken={() => sessionStoreRef.current.getToken()}
              onSyncComplete={() => setRefreshKey((k) => k + 1)}
              hasFireflies={hasKey === true}
              hasGoogleMeet={hasGoogleMeet === true}
            />
            {ENABLE_TINYCLOUD_HOOKS && (
              <LiveWriteEvents
                tcw={tcw}
                hooksHost={tcw?.hosts[0] ?? ""}
                pathPrefix={liveWritePathPrefix}
                onWrite={() => setRefreshKey((k) => k + 1)}
              />
            )}
            <ConversationList
              api={api}
              onSelectConversation={setSelectedConversationId}
              refreshKey={refreshKey}
            />
            {hasKey && (
              <button
                style={s.disconnectLink}
                onClick={async () => {
                  await api.del("/api/config/fireflies-key");
                  setHasKey(false);
                }}
              >
                Disconnect Fireflies
              </button>
            )}
            {hasGoogleMeet && (
              <button
                style={s.disconnectLink}
                onClick={async () => {
                  await api.del("/api/config/google-meet");
                  setHasGoogleMeet(false);
                }}
              >
                Disconnect Google Meet
              </button>
            )}
          </>
        )}
      </main>

      <footer style={s.footer}>
        Powered by{" "}
        <a href="https://tinycloud.xyz" target="_blank" rel="noreferrer" style={s.footerLink}>
          TinyCloud
        </a>
        {" & "}
        <a href="https://openkey.so" target="_blank" rel="noreferrer" style={s.footerLink}>
          OpenKey
        </a>
      </footer>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const FONT = "'Outfit', -apple-system, sans-serif";
const MONO = "'IBM Plex Mono', 'SF Mono', monospace";

const s: Record<string, React.CSSProperties> = {
  shell: {
    maxWidth: 680,
    margin: "0 auto",
    padding: "32px 20px 48px",
    fontFamily: FONT,
    color: "#18181b",
    lineHeight: 1.5,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 28,
  },
  logo: {
    fontFamily: FONT,
    fontSize: 20,
    fontWeight: 700,
    margin: 0,
    letterSpacing: "-0.02em",
    color: "#18181b",
  },
  badge: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: 500,
    color: "#6366f1",
    background: "#eef2ff",
    padding: "2px 8px",
    borderRadius: 4,
    letterSpacing: "0.03em",
  },
  main: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  pendingBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    background: "#fff",
    border: "1px solid #e2e4e9",
    borderLeft: "3px solid #10b981",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 500,
    color: "#065f46",
    animation: "fadeSlideIn 0.3s ease-out",
  },
  bannerDismiss: {
    fontFamily: FONT,
    background: "none",
    border: "none",
    fontSize: 18,
    color: "#9ca3af",
    cursor: "pointer",
    padding: "0 4px",
    lineHeight: 1,
  },
  lapsedBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderLeft: "3px solid #f59e0b",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 500,
    color: "#92400e",
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
    color: "#fff",
    background: "#f59e0b",
    border: "none",
    borderRadius: 6,
    padding: "6px 12px",
    cursor: "pointer",
  },
  disconnectLink: {
    fontFamily: FONT,
    background: "none",
    border: "none",
    fontSize: 12,
    color: "#9ca3af",
    cursor: "pointer",
    padding: 0,
    textAlign: "center" as const,
  },
  footer: {
    fontFamily: FONT,
    textAlign: "center",
    marginTop: 48,
    fontSize: 11,
    fontWeight: 500,
    color: "#9ca3af",
    letterSpacing: "0.03em",
    textTransform: "uppercase" as const,
  },
  footerLink: {
    color: "#6b7280",
    textDecoration: "none",
  },
};
