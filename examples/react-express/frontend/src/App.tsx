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
import { ItemsCRUD } from "./components/ItemsCRUD";
import { DirectStorage } from "./components/DirectStorage";

// ── Environment ─────────────────────────────────────────────────────

const OPENKEY_HOST = import.meta.env.VITE_OPENKEY_HOST || "https://openkey.so";
const OPENKEY_CLIENT_ID = import.meta.env.VITE_OPENKEY_CLIENT_ID;
const TINYCLOUD_HOST = import.meta.env.VITE_TINYCLOUD_HOST || "https://node.tinycloud.xyz";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

// ── App ─────────────────────────────────────────────────────────────

export function App() {
  // Auth state
  const [address, setAddress] = useState<string | null>(null);
  const [did, setDid] = useState<string | null>(null);
  const [tcw, setTcw] = useState<TinyCloudWeb | null>(null);
  const [api, setApi] = useState<ApiClient | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Token store (persists across re-renders, auto-loads from localStorage)
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

        // 1. Create API client with persisted tokens
        const apiClient = createApiClient(BACKEND_URL, {
          tokenStore,
          refreshConfig: {
            openKeyHost: OPENKEY_HOST,
            clientId: OPENKEY_CLIENT_ID,
          },
        });

        // 2. Check if backend still has an active delegation
        const token = tokenStore.getAccessToken();
        if (!token) throw new Error("No access token after restore");

        const status = await checkDelegationStatus(BACKEND_URL, token);
        if (status.status !== "active") {
          throw new Error("Delegation expired or missing — re-auth required");
        }
        console.log("[restore] Delegation active. Session fully restored!");

        // DID is deterministic from address (mainnet)
        const did = `did:pkh:eip155:1:${storedAddress}`;

        // No TinyCloudWeb instance — not needed for API operations.
        // User must re-authenticate to create new delegations.
        setAddress(storedAddress);
        setDid(did);
        setApi(apiClient);
      } catch (err) {
        console.warn("[restore] Session restore failed, clearing state:", err);
        tokenStore.clear();
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  // ── Sign In ───────────────────────────────────────────────────────

  const handleSignIn = useCallback(async () => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      // 1. OpenKey sign-in — passkey auth + OAuth PKCE token exchange
      console.log("[sign-in] Step 1: OpenKey sign-in...");
      const {
        address: addr,
        web3Provider,
        tokens,
      } = await openKeySignIn({
        host: OPENKEY_HOST,
        clientId: OPENKEY_CLIENT_ID,
        redirectUri: window.location.origin,
      });
      console.log("[sign-in] Step 1 complete. Address:", addr);

      // 2. Store tokens for backend auth (with address for session restore)
      tokenStoreRef.current.setTokens(
        tokens.accessToken,
        tokens.refreshToken ?? "",
        tokens.expiresIn,
        addr,
      );
      console.log("[sign-in] Step 2: Tokens stored.");

      // 3. TinyCloud sign-in — SIWE signed via OpenKey
      console.log("[sign-in] Step 3: TinyCloud sign-in...");
      const tcwInstance = await createAndSignIn(web3Provider, {
        tinycloudHosts: [TINYCLOUD_HOST],
        autoCreateSpace: true,
      });
      console.log("[sign-in] Step 3 complete. DID:", tcwInstance.did);

      // 4. Create API client with token-based auth
      const apiClient = createApiClient(BACKEND_URL, {
        tokenStore: tokenStoreRef.current,
        refreshConfig: {
          openKeyHost: OPENKEY_HOST,
          clientId: OPENKEY_CLIENT_ID,
        },
      });
      console.log("[sign-in] Step 4: API client created.");

      // 5. Auto-delegate to backend
      console.log("[sign-in] Step 5: Fetching server-info...");
      const infoRes = await fetch(`${BACKEND_URL}/api/server-info`);
      if (!infoRes.ok) throw new Error(`Server info: ${infoRes.statusText}`);
      const info: ServerInfo = await infoRes.json();
      const backendDID = info.did;
      console.log("[sign-in] Step 5 complete. Backend DID:", backendDID);

      const token = tokenStoreRef.current.getAccessToken();
      if (!token) throw new Error("No access token after sign-in");

      // Always create a fresh delegation on sign-in to pick up any
      // config changes (path, actions, expiry). Sending a new delegation
      // overwrites the previous one on the backend.
      console.log("[sign-in] Step 6: Creating delegation...");
      const serialized = await createDelegation(tcwInstance, backendDID);
      console.log("[sign-in] Step 6 complete. Sending delegation...");
      await sendDelegation(BACKEND_URL, serialized, token);
      console.log("[sign-in] Step 7: Delegation sent. Sign-in complete!");

      // Update state — api being non-null signals delegation is ready
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

  // ── Sign Out ──────────────────────────────────────────────────────

  const handleSignOut = useCallback(async () => {
    // Best-effort revoke — don't block sign-out on failure
    const token = tokenStoreRef.current.getAccessToken();
    if (token) {
      revokeDelegation(BACKEND_URL, token).catch(() => {});
    }

    await tcw?.signOut?.();
    tokenStoreRef.current.clear();
    setAddress(null);
    setDid(null);
    setTcw(null);
    setApi(null);
    setAuthError(null);
  }, [tcw]);

  // ── Render ────────────────────────────────────────────────────────

  const isSignedIn = address !== null && api !== null;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>TinyBoilerplate</h1>
        <p style={styles.subtitle}>React + Express Example</p>
      </header>

      <main style={styles.main}>
        <AuthPanel
          isSignedIn={isSignedIn}
          address={address}
          did={did}
          loading={authLoading}
          error={authError}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
        />

        <ItemsCRUD api={api} />

        <DirectStorage tcw={tcw} />
      </main>

      <footer style={styles.footer}>
        <p>
          Powered by{" "}
          <a href="https://tinycloud.xyz" target="_blank" rel="noreferrer">
            TinyCloud
          </a>{" "}
          &{" "}
          <a href="https://openkey.so" target="_blank" rel="noreferrer">
            OpenKey
          </a>
        </p>
      </footer>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "24px 16px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    color: "#1a1a1a",
    lineHeight: 1.5,
  },
  header: {
    textAlign: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    margin: "4px 0 0",
  },
  main: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  footer: {
    textAlign: "center",
    marginTop: 48,
    fontSize: 13,
    color: "#999",
  },
};
