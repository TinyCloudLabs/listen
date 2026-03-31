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
import { SyncControl } from "./components/SyncControl";
import { ConversationList } from "./components/ConversationList";
import { ConversationDetail } from "./components/ConversationDetail";

// ── Environment ─────────────────────────────────────────────────────

const OPENKEY_HOST = import.meta.env.VITE_OPENKEY_HOST || "https://openkey.so";
const OPENKEY_CLIENT_ID = import.meta.env.VITE_OPENKEY_CLIENT_ID;
const TINYCLOUD_HOST = import.meta.env.VITE_TINYCLOUD_HOST || "https://node.tinycloud.xyz";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

// ── App ─────────────────────────────────────────────────────────────

export function App() {
  const [address, setAddress] = useState<string | null>(null);
  const [did, setDid] = useState<string | null>(null);
  const [tcw, setTcw] = useState<TinyCloudWeb | null>(null);
  const [api, setApi] = useState<ApiClient | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [pendingBanner, setPendingBanner] = useState<string | null>(null);

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

  // ── Sign In ───────────────────────────────────────────────────────

  const handleSignIn = useCallback(async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const {
        address: addr,
        web3Provider,
        tokens,
      } = await openKeySignIn({
        host: OPENKEY_HOST,
        clientId: OPENKEY_CLIENT_ID,
        redirectUri: window.location.origin,
      });
      tokenStoreRef.current.setTokens(
        tokens.accessToken,
        tokens.refreshToken ?? "",
        tokens.expiresIn,
        addr,
      );
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
  }, [tcw]);

  // ── Render ────────────────────────────────────────────────────────

  const isSignedIn = address !== null && api !== null;

  return (
    <div style={s.shell}>
      <header style={s.header}>
        <h1 style={s.logo}>Conversation Sync</h1>
        <span style={s.badge}>Fireflies</span>
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

        {isSignedIn && hasKey === false && (
          <SetupWizard api={api} onComplete={() => setHasKey(true)} backendUrl={BACKEND_URL} />
        )}

        {isSignedIn && hasKey === true && selectedConversationId && (
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

        {isSignedIn && hasKey === true && !selectedConversationId && (
          <>
            <SyncControl
              api={api}
              backendUrl={BACKEND_URL}
              getAccessToken={() => tokenStoreRef.current.getAccessToken()}
              onSyncComplete={() => setRefreshKey((k) => k + 1)}
            />
            <ConversationList
              api={api}
              onSelectConversation={setSelectedConversationId}
              refreshKey={refreshKey}
            />
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
