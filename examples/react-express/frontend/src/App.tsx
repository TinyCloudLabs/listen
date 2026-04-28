import { useCallback, useEffect, useRef, useState } from "react";
import type { TinyCloudWeb } from "@tinycloud/web-sdk";
import type { ServerInfo } from "@tinyboilerplate/core";
import {
  connectWallet,
  createAndSignIn,
  createApiClient,
  createManifestDelegation,
  sendDelegation,
  checkDelegationStatus,
  revokeDelegation,
  requestNonce,
  verifySession,
  loadAppManifest,
  composeManifestWithBackend,
  SessionStore,
  type ApiClient,
} from "@tinyboilerplate/client";

import { AuthPanel } from "./components/AuthPanel";
import { ItemsCRUD } from "./components/ItemsCRUD";
import { DirectStorage } from "./components/DirectStorage";

// ── Environment ─────────────────────────────────────────────────────

const OPENKEY_HOST = import.meta.env.VITE_OPENKEY_HOST || "https://openkey.so";
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

  // Session store (persists across re-renders, auto-loads from localStorage)
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

        // 1. Create API client with persisted session
        const apiClient = createApiClient(BACKEND_URL, {
          sessionStore,
        });

        // 2. Check if backend still has an active delegation
        const token = sessionStore.getToken();
        if (!token) throw new Error("No session token after restore");

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
        sessionStore.clear();
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
      // 1. Connect wallet via OpenKey passkey
      console.log("[sign-in] Step 1: Connecting wallet...");
      const { address: addr, web3Provider } = await connectWallet({
        host: OPENKEY_HOST,
      });
      console.log("[sign-in] Step 1 complete. Address:", addr);

      // 2. Get nonce from backend AND fetch the backend's advertised
      //    permissions up front. We need those permissions BEFORE
      //    signing in so we can compose the manifest that drives the
      //    SIWE recap. Running both fetches in parallel keeps the
      //    wall-clock overhead negligible.
      console.log("[sign-in] Step 2: Fetching nonce + server-info in parallel...");
      const [nonce, info] = await Promise.all([
        requestNonce(BACKEND_URL, addr),
        (async (): Promise<ServerInfo> => {
          const res = await fetch(`${BACKEND_URL}/api/server-info`);
          if (!res.ok) throw new Error(`Server info: ${res.statusText}`);
          return res.json();
        })(),
      ]);
      console.log("[sign-in] Step 2 complete. Backend DID:", info.did);

      // 3. Load the app manifest from /manifest.json and compose it
      //    with the backend delegation the server-info response
      //    declared. This is the object that drives the SIWE recap:
      //    the session key acquires coverage for both the app's own
      //    permissions and the backend's pre-declared delegation in
      //    one unified capability set.
      console.log("[sign-in] Step 3: Loading + composing manifest...");
      const appManifest = await loadAppManifest("/manifest.json");
      const composed = composeManifestWithBackend(appManifest, info);
      console.log(
        `[sign-in] Step 3 complete. Request has ${composed.delegationTargets.length} delegation target(s).`,
      );

      // 4. Create TinyCloudWeb with the composed capability request and
      //    sign in. ONE wallet prompt covers the full app + backend union.
      console.log("[sign-in] Step 4: TinyCloud sign-in with manifest...");
      const { tcw: tcwInstance, session } = await createAndSignIn(web3Provider, {
        nonce,
        tinycloudHosts: [TINYCLOUD_HOST],
        autoCreateSpace: true,
        capabilityRequest: composed,
      });
      console.log("[sign-in] Step 4 complete. DID:", tcwInstance.did);

      // 5. Send the SDK's SIWE message + signature to backend for verification
      console.log("[sign-in] Step 5: Verifying SIWE with backend...");
      const { token, expiresIn } = await verifySession(
        BACKEND_URL,
        session.siwe,
        session.signature,
      );
      sessionStoreRef.current.setSession(token, expiresIn, addr);
      console.log("[sign-in] Step 5 complete. Session token received.");

      // 6. Create API client with session-based auth
      const apiClient = createApiClient(BACKEND_URL, {
        sessionStore: sessionStoreRef.current,
      });
      console.log("[sign-in] Step 6: API client created.");

      const sessionToken = sessionStoreRef.current.getToken();
      if (!sessionToken) throw new Error("No session token after sign-in");

      // 7. Materialize the backend delegation via the capability-chain flow.
      //    Delivery remains app logic.
      console.log("[sign-in] Step 7: Issuing backend delegation...");
      if (composed.delegationTargets.length === 0) {
        throw new Error(
          "Backend /api/server-info did not advertise any permissions — cannot build delegation",
        );
      }
      // DIAGNOSTIC: dump the signed SIWE so we can inspect the recap
      console.log("[diagnostic] session.siwe:\n" + session.siwe);
      console.log("[diagnostic] composed request:", composed);
      const { serialized, prompted } = await createManifestDelegation(
        tcwInstance,
        info.did,
        composed,
      );
      console.log(`[sign-in] Step 7 complete. Delegation issued (wallet prompted: ${prompted}).`);

      console.log("[sign-in] Step 8: Sending delegation to backend...");
      await sendDelegation(BACKEND_URL, serialized, sessionToken);
      console.log("[sign-in] Step 8 complete. Sign-in complete!");

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
    const token = sessionStoreRef.current.getToken();
    if (token) {
      revokeDelegation(BACKEND_URL, token).catch(() => {});
    }

    await tcw?.signOut?.();
    sessionStoreRef.current.clear();
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
