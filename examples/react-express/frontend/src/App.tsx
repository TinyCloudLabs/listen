import { useCallback, useRef, useState } from "react";
import type { TinyCloudWeb } from "@tinycloud/web-sdk";
import {
  createOpenKey,
  startOAuthFlow,
  connectWallet,
  createTinyCloudWeb,
  signIn,
  TokenStore,
  createApiClient,
  type ApiClient,
} from "@tinyboilerplate/client";

import { AuthPanel } from "./components/AuthPanel";
import { DelegationPanel } from "./components/DelegationPanel";
import { ItemsCRUD } from "./components/ItemsCRUD";

// ── Environment ─────────────────────────────────────────────────────

const OPENKEY_HOST =
  import.meta.env.VITE_OPENKEY_HOST || "https://openkey.so";
const OPENKEY_CLIENT_ID = import.meta.env.VITE_OPENKEY_CLIENT_ID || "";
const TINYCLOUD_HOST =
  import.meta.env.VITE_TINYCLOUD_HOST || "https://node.tinycloud.xyz";
const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

// ── App ─────────────────────────────────────────────────────────────

export function App() {
  // Persistent refs (not re-created on render)
  const tokenStoreRef = useRef(new TokenStore());

  // Auth state
  const [address, setAddress] = useState<string | null>(null);
  const [did, setDid] = useState<string | null>(null);
  const [tcw, setTcw] = useState<TinyCloudWeb | null>(null);
  const [api, setApi] = useState<ApiClient | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Delegation state (lifted so Items panel can react to it)
  const [delegationActive, setDelegationActive] = useState(false);

  // ── Sign In ───────────────────────────────────────────────────────

  const handleSignIn = useCallback(async () => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      // 1. Create OpenKey instance
      const openkey = createOpenKey({ host: OPENKEY_HOST });

      // 2. OAuth flow to get tokens
      const tokens = await startOAuthFlow(openkey, {
        clientId: OPENKEY_CLIENT_ID,
        redirectUri: window.location.origin,
      });

      // 3. Store tokens
      tokenStoreRef.current.setTokens(
        tokens.access_token,
        tokens.refresh_token,
        tokens.expires_in,
      );

      // 4. Connect wallet to get EIP-1193 provider
      const wallet = await connectWallet(openkey);

      // 5. Create TinyCloudWeb with the provider
      const tcwInstance = createTinyCloudWeb(wallet.provider, {
        tinycloudHosts: [TINYCLOUD_HOST],
        autoCreateSpace: true,
      });

      // 6. Sign in with TinyCloud
      await signIn(tcwInstance);

      // 7. Create API client
      const apiClient = createApiClient(BACKEND_URL, tokenStoreRef.current, {
        refreshConfig: {
          openKeyHost: OPENKEY_HOST,
          clientId: OPENKEY_CLIENT_ID,
        },
        userAddress: wallet.address,
      });

      // Update state
      setAddress(wallet.address);
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

  const handleSignOut = useCallback(() => {
    tokenStoreRef.current.clear();
    setAddress(null);
    setDid(null);
    setTcw(null);
    setApi(null);
    setDelegationActive(false);
    setAuthError(null);
  }, []);

  // ── Render ────────────────────────────────────────────────────────

  const isSignedIn = address !== null && tcw !== null && api !== null;

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

        <DelegationPanel
          isSignedIn={isSignedIn}
          tcw={tcw}
          tokenStore={tokenStoreRef.current}
          backendUrl={BACKEND_URL}
          userAddress={address}
          onStatusChange={setDelegationActive}
        />

        <ItemsCRUD
          api={api}
          delegationActive={delegationActive}
        />
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
