import { useCallback, useRef, useState } from "react";
import type { TinyCloudWeb } from "@tinycloud/web-sdk";
import {
  openKeySignIn,
  createAndSignIn,
  createApiClient,
  type ApiClient,
} from "@tinyboilerplate/client";

import { AuthPanel } from "./components/AuthPanel";
import { DelegationPanel } from "./components/DelegationPanel";
import { ItemsCRUD } from "./components/ItemsCRUD";

// ── Environment ─────────────────────────────────────────────────────

const OPENKEY_HOST =
  import.meta.env.VITE_OPENKEY_HOST || "https://openkey.so";
const TINYCLOUD_HOST =
  import.meta.env.VITE_TINYCLOUD_HOST || "https://node.tinycloud.xyz";
const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

// ── App ─────────────────────────────────────────────────────────────

export function App() {

  // Auth state
  const [address, setAddress] = useState<string | null>(null);
  const [did, setDid] = useState<string | null>(null);
  const [tcw, setTcw] = useState<TinyCloudWeb | null>(null);
  const [api, setApi] = useState<ApiClient | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Delegation state
  const [delegationActive, setDelegationActive] = useState(false);

  // ── Sign In ───────────────────────────────────────────────────────

  const handleSignIn = useCallback(async () => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      // 1. OpenKey sign-in — single popup, passkey auth
      const { address: addr, web3Provider } = await openKeySignIn({
        host: OPENKEY_HOST,
      });

      // 2. TinyCloud sign-in — SIWE signed via OpenKey
      const tcwInstance = await createAndSignIn(web3Provider, {
        tinycloudHosts: [TINYCLOUD_HOST],
        autoCreateSpace: true,
      });

      // 3. Create API client for backend calls
      const apiClient = createApiClient(BACKEND_URL, { userAddress: addr });

      // Update state
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

  const handleSignOut = useCallback(() => {
    tcw?.signOut?.();
    setAddress(null);
    setDid(null);
    setTcw(null);
    setApi(null);
    setDelegationActive(false);
    setAuthError(null);
  }, [tcw]);

  // ── Render ────────────────────────────────────────────────────────

  const isSignedIn = address !== null && tcw !== null;

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
