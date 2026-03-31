import { useCallback, useEffect, useRef, useState } from "react";
import type { TinyCloudWeb } from "@tinycloud/web-sdk";
import type { ServerInfo } from "@tinyboilerplate/core";
import {
  openKeySignIn,
  createAndSignIn,
  createApiClient,
  createDelegation,
  sendDelegation,
  checkDelegationStatus,
  revokeDelegation,
  TokenStore,
  type ApiClient,
} from "@tinyboilerplate/client";

import { AuthPanel } from "./components/AuthPanel";
import { SetupWizard } from "./components/SetupWizard";
<<<<<<< HEAD
<<<<<<< HEAD
import { SyncControl } from "./components/SyncControl";
import { ConversationList } from "./components/ConversationList";
<<<<<<< HEAD
<<<<<<< HEAD
import { ConversationDetail } from "./components/ConversationDetail";
=======
>>>>>>> 6a82158 (TC-1305: Build SetupWizard component (5-step guided API key onboarding))
=======
import { SyncControl } from "./components/SyncControl";
>>>>>>> ffd94d9 (TC-1306: Build SyncControl component (sync button, progress, limit selector))
=======
>>>>>>> 9b46023 (TC-1307: Build ConversationList component with pagination and summary preview)
=======
import { ConversationDetail } from "./components/ConversationDetail";
>>>>>>> ab0248b (TC-1308: Build ConversationDetail component with transcript view and speaker labels)

// ── Environment ─────────────────────────────────────────────────────

const OPENKEY_HOST = import.meta.env.VITE_OPENKEY_HOST || "https://openkey.so";
const OPENKEY_CLIENT_ID = import.meta.env.VITE_OPENKEY_CLIENT_ID;
const TINYCLOUD_HOST = import.meta.env.VITE_TINYCLOUD_HOST || "https://node.tinycloud.xyz";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// ── App ─────────────────────────────────────────────────────────────

export function App() {
  const [address, setAddress] = useState<string | null>(null);
  const [did, setDid] = useState<string | null>(null);
  const [tcw, setTcw] = useState<TinyCloudWeb | null>(null);
  const [api, setApi] = useState<ApiClient | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [hasGoogleMeet, setHasGoogleMeet] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [pendingBanner, setPendingBanner] = useState<string | null>(null);
<<<<<<< HEAD
<<<<<<< HEAD
=======
  const [hasKey, setHasKey] = useState<boolean | null>(null); // null = loading
<<<<<<< HEAD
>>>>>>> 6a82158 (TC-1305: Build SetupWizard component (5-step guided API key onboarding))
=======
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
>>>>>>> 9b46023 (TC-1307: Build ConversationList component with pagination and summary preview)
=======
>>>>>>> fa5f0e1 (TC-1316: Frontend auto-process pending on load + webhook status in SyncControl)
=======
  const [gmLapsedBanner, setGmLapsedBanner] = useState(false);
>>>>>>> 5839a4f (TC-1336: Frontend — webhook status, lapsed banner, pending processing)

  const tokenStoreRef = useRef(new TokenStore());
  const restoreAttemptedRef = useRef(false);

  // ── Session Restore ─────────────────────────────────────────────

  useEffect(() => {
    if (restoreAttemptedRef.current) return;
    restoreAttemptedRef.current = true;

    const tokenStore = tokenStoreRef.current;
    if (!tokenStore.hasTokens() || tokenStore.isExpired()) return;

    const storedAddress = tokenStore.getAddress();
    if (!storedAddress) return;

    (async () => {
      setAuthLoading(true);
      try {
        console.log("[restore] Attempting session restore for", storedAddress);
        const apiClient = createApiClient(BACKEND_URL, {
          tokenStore,
          refreshConfig: { openKeyHost: OPENKEY_HOST, clientId: OPENKEY_CLIENT_ID },
        });
        const token = tokenStore.getAccessToken();
        if (!token) throw new Error("No access token after restore");
        const status = await checkDelegationStatus(BACKEND_URL, token);
        if (status.status !== "active") throw new Error("Delegation expired or missing");
        console.log("[restore] Session fully restored!");
        const did = `did:pkh:eip155:1:${storedAddress}`;
        setAddress(storedAddress);
        setDid(did);
        setApi(apiClient);
      } catch (err) {
        console.warn("[restore] Session restore failed:", err);
        tokenStore.clear();
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

<<<<<<< HEAD
<<<<<<< HEAD
=======
  // ── Check Fireflies Key ────────────────────────────────────────────

>>>>>>> 6a82158 (TC-1305: Build SetupWizard component (5-step guided API key onboarding))
=======
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
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

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
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
=======
  // ── Auto-process pending webhook items ─────────────────────────────

  useEffect(() => {
    if (!api || hasKey !== true) return;

>>>>>>> fa5f0e1 (TC-1316: Frontend auto-process pending on load + webhook status in SyncControl)
    api
      .get<{ processed: unknown[]; skipped: unknown[]; errors: unknown[] }>(
        "/api/webhooks/fireflies/pending",
      )
=======
  useEffect(() => {
    if (!api || hasKey !== true) return;
<<<<<<< HEAD
    api.get<{ processed: unknown[]; skipped: unknown[]; errors: unknown[] }>("/api/webhooks/fireflies/pending")
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
=======
    api
      .get<{ processed: unknown[]; skipped: unknown[]; errors: unknown[] }>(
        "/api/webhooks/fireflies/pending",
      )
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
      .then((result) => {
        const count = result.processed?.length ?? 0;
        if (count > 0) {
          setPendingBanner(
            `Processed ${count} new transcript${count === 1 ? "" : "s"} from webhooks`,
          );
          setRefreshKey((k) => k + 1);
        }
      })
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
      .catch((err) => console.error("[pending]", err));
  }, [api, hasKey]);

  useEffect(() => {
    if (!api || hasKey !== true) return;
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
    api
      .post<{ updated: number; still_missing: number }>("/api/sync/backfill-summaries")
      .then((result) => {
        if (result.updated > 0) setRefreshKey((k) => k + 1);
      })
      .catch((err) => console.error("[backfill]", err));
  }, [api, hasKey]);

<<<<<<< HEAD
=======
>>>>>>> 6a82158 (TC-1305: Build SetupWizard component (5-step guided API key onboarding))
=======
      .catch((err) => {
        console.error("[pending] Failed to process pending webhooks:", err);
      });
=======
    api.post<{ updated: number; still_missing: number }>("/api/sync/backfill-summaries")
      .then((result) => { if (result.updated > 0) setRefreshKey((k) => k + 1); })
      .catch((err) => console.error("[backfill]", err));
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
  }, [api, hasKey]);

>>>>>>> fa5f0e1 (TC-1316: Frontend auto-process pending on load + webhook status in SyncControl)
=======
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

>>>>>>> 5839a4f (TC-1336: Frontend — webhook status, lapsed banner, pending processing)
  // ── Sign In ───────────────────────────────────────────────────────

  const handleSignIn = useCallback(async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
      const {
        address: addr,
        web3Provider,
        tokens,
      } = await openKeySignIn({
<<<<<<< HEAD
=======
      const { address: addr, web3Provider, tokens } = await openKeySignIn({
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
=======
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
        host: OPENKEY_HOST,
        clientId: OPENKEY_CLIENT_ID,
        redirectUri: window.location.origin,
      });
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
      tokenStoreRef.current.setTokens(
        tokens.accessToken,
        tokens.refreshToken ?? "",
        tokens.expiresIn,
        addr,
      );
<<<<<<< HEAD
=======
      tokenStoreRef.current.setTokens(tokens.accessToken, tokens.refreshToken ?? "", tokens.expiresIn, addr);
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
=======
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
      const tcwInstance = await createAndSignIn(web3Provider, {
        tinycloudHosts: [TINYCLOUD_HOST],
        autoCreateSpace: true,
      });
      const apiClient = createApiClient(BACKEND_URL, {
        tokenStore: tokenStoreRef.current,
        refreshConfig: { openKeyHost: OPENKEY_HOST, clientId: OPENKEY_CLIENT_ID },
      });
      const infoRes = await fetch(`${BACKEND_URL}/api/server-info`);
      if (!infoRes.ok) throw new Error(`Server info: ${infoRes.statusText}`);
      const info: ServerInfo = await infoRes.json();
      const token = tokenStoreRef.current.getAccessToken();
      if (!token) throw new Error("No access token after sign-in");
      const serialized = await createDelegation(tcwInstance, info.did);
      await sendDelegation(BACKEND_URL, serialized, token);
      setAddress(addr);
      setDid(tcwInstance.did ?? null);
      setTcw(tcwInstance);
      setApi(apiClient);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : String(err));
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    const token = tokenStoreRef.current.getAccessToken();
    if (token) revokeDelegation(BACKEND_URL, token).catch(() => {});
    await tcw?.signOut?.();
    tokenStoreRef.current.clear();
    setAddress(null);
    setDid(null);
    setTcw(null);
    setApi(null);
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

<<<<<<< HEAD
<<<<<<< HEAD
        {isSignedIn && hasKey === false && (
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 64c2d6d (TC-1315: Add Setup Wizard Step 3 for webhook configuration)
          <SetupWizard api={api} onComplete={() => setHasKey(true)} backendUrl={BACKEND_URL} />
=======
        {isSignedIn && hasKey === false && hasGoogleMeet === false && (
          <SetupWizard
            api={api}
            onComplete={() => setHasKey(true)}
            onGoogleMeetComplete={() => setHasGoogleMeet(true)}
            backendUrl={BACKEND_URL}
            showGoogleMeet={!!GOOGLE_CLIENT_ID}
          />
>>>>>>> c024b29 (TC-1326: Frontend source picker, Google OAuth popup, sync control, source filter)
        )}
=======
        {isSignedIn &&
          (hasKey === false || (hasGoogleMeet === false && !!GOOGLE_CLIENT_ID)) &&
          !(hasKey === true && hasGoogleMeet === true) && (
            <SetupWizard
              api={api}
              onComplete={() => setHasKey(true)}
              onGoogleMeetComplete={() => setHasGoogleMeet(true)}
              backendUrl={BACKEND_URL}
              showGoogleMeet={!!GOOGLE_CLIENT_ID}
              initialSource={hasKey === true ? "google-meet" : hasGoogleMeet === true ? "fireflies" : undefined}
            />
          )}
>>>>>>> 5f9bdb2 (fix: setup wizard visibility when one source connected + KV token parsing)

        {isSignedIn && (hasKey === true || hasGoogleMeet === true) && selectedConversationId && (
          <ConversationDetail
            api={api}
            conversationId={selectedConversationId}
            onBack={() => setSelectedConversationId(null)}
          />
        )}

        {pendingBanner && (
<<<<<<< HEAD
<<<<<<< HEAD
          <div style={s.pendingBanner}>
            <span>{pendingBanner}</span>
            <button style={s.bannerDismiss} onClick={() => setPendingBanner(null)}>
=======
          <div style={styles.pendingBanner}>
            {pendingBanner}
            <button
              style={styles.bannerDismiss}
              onClick={() => setPendingBanner(null)}
            >
>>>>>>> fa5f0e1 (TC-1316: Frontend auto-process pending on load + webhook status in SyncControl)
              &times;
            </button>
=======
          <div style={s.pendingBanner}>
            <span>{pendingBanner}</span>
<<<<<<< HEAD
            <button style={s.bannerDismiss} onClick={() => setPendingBanner(null)}>&times;</button>
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
=======
            <button style={s.bannerDismiss} onClick={() => setPendingBanner(null)}>
              &times;
            </button>
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
          </div>
        )}

        {gmLapsedBanner && (
          <div style={s.lapsedBanner}>
            <span>Real-time sync was inactive. Some meetings may not have been captured.</span>
            <div style={s.lapsedActions}>
              <button
                style={s.lapsedSyncBtn}
                onClick={() => {
                  api?.post("/api/sync/google-meet").then(() => {
                    setRefreshKey((k) => k + 1);
                    setGmLapsedBanner(false);
                  }).catch(() => {});
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
              getAccessToken={() => tokenStoreRef.current.getAccessToken()}
              onSyncComplete={() => setRefreshKey((k) => k + 1)}
              hasFireflies={hasKey === true}
              hasGoogleMeet={hasGoogleMeet === true}
            />
            <ConversationList
              api={api}
              onSelectConversation={setSelectedConversationId}
              refreshKey={refreshKey}
            />
<<<<<<< HEAD
<<<<<<< HEAD
            <button
              style={s.disconnectLink}
              onClick={async () => {
                await api.del("/api/config/fireflies-key");
                setHasKey(false);
              }}
            >
              Disconnect Fireflies
            </button>
=======
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
>>>>>>> c024b29 (TC-1326: Frontend source picker, Google OAuth popup, sync control, source filter)
          </>
=======
          <SetupWizard api={api} onComplete={() => setHasKey(true)} />
        )}

<<<<<<< HEAD
        {isSignedIn && hasKey === true && (
<<<<<<< HEAD
          <section style={styles.mainView}>
            <p style={{ color: "#555", fontSize: 14 }}>
              {/* SyncControl, ConversationList, ConversationDetail go here */}
              Fireflies connected. Ready to sync.
            </p>
          </section>
>>>>>>> 6a82158 (TC-1305: Build SetupWizard component (5-step guided API key onboarding))
=======
=======
        {isSignedIn && hasKey === true && selectedConversationId && (
          <ConversationDetail
            api={api}
            conversationId={selectedConversationId}
            onBack={() => setSelectedConversationId(null)}
          />
        )}

        {isSignedIn && hasKey === true && !selectedConversationId && (
>>>>>>> ab0248b (TC-1308: Build ConversationDetail component with transcript view and speaker labels)
          <>
            <SyncControl api={api} onSyncComplete={() => setRefreshKey((k) => k + 1)} />
=======
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
            <button
              style={s.disconnectLink}
              onClick={async () => {
                await api.del("/api/config/fireflies-key");
                setHasKey(false);
              }}
            >
              Disconnect Fireflies
            </button>
          </>
>>>>>>> ffd94d9 (TC-1306: Build SyncControl component (sync button, progress, limit selector))
        )}
      </main>

      <footer style={s.footer}>
        Powered by{" "}
<<<<<<< HEAD
<<<<<<< HEAD
        <a href="https://tinycloud.xyz" target="_blank" rel="noreferrer" style={s.footerLink}>
          TinyCloud
        </a>
        {" & "}
        <a href="https://openkey.so" target="_blank" rel="noreferrer" style={s.footerLink}>
          OpenKey
        </a>
=======
        <a href="https://tinycloud.xyz" target="_blank" rel="noreferrer" style={s.footerLink}>TinyCloud</a>
        {" & "}
        <a href="https://openkey.so" target="_blank" rel="noreferrer" style={s.footerLink}>OpenKey</a>
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
=======
        <a href="https://tinycloud.xyz" target="_blank" rel="noreferrer" style={s.footerLink}>
          TinyCloud
        </a>
        {" & "}
        <a href="https://openkey.so" target="_blank" rel="noreferrer" style={s.footerLink}>
          OpenKey
        </a>
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
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
<<<<<<< HEAD
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
  mainView: {
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    padding: 20,
    background: "#fafafa",
=======
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
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
