import { TinyCloudWeb, BrowserSessionStorage } from "@tinycloud/web-sdk";
import type {
  ClientSession,
  ComposedManifestRequest,
  Manifest,
  SiweConfig,
  SignStrategy,
} from "@tinycloud/web-sdk";
import type { providers } from "ethers";

// ── Configuration ────────────────────────────────────────────────────

export interface TinyCloudWebConfig {
  tinycloudHosts?: string[];
  tinycloudRegistryUrl?: string | null;
  tinycloudFallbackHosts?: string[] | null;
  autoCreateSpace?: boolean;
  siweConfig?: SiweConfig;
  /**
   * Manifest driving the SIWE recap at sign-in. If `capabilityRequest`
   * is present, it takes precedence and is signed directly.
   */
  manifest?: Manifest;
  /** Pre-composed manifest request that may include app and delegate manifests. */
  capabilityRequest?: ComposedManifestRequest;
  /** Include implicit account registry permissions when composing `manifest`. Default true in the SDK. */
  includeAccountRegistryPermissions?: boolean;
  /** Optional non-interactive signing strategy for TinyCloud SIWE requests. */
  signStrategy?: SignStrategy;
}

// ── TinyCloudWeb Instance ────────────────────────────────────────────

/**
 * Create a TinyCloudWeb instance with BrowserSessionStorage for session persistence.
 */
export function createTinyCloudWeb(
  web3Provider: providers.Web3Provider,
  config?: TinyCloudWebConfig,
): TinyCloudWeb {
  const manifest = config?.manifest ?? config?.capabilityRequest?.manifests;
  const tcw = new (TinyCloudWeb as any)({
    providers: { web3: { driver: web3Provider } },
    tinycloudHosts: config?.tinycloudHosts,
    tinycloudRegistryUrl: config?.tinycloudRegistryUrl,
    tinycloudFallbackHosts: config?.tinycloudFallbackHosts,
    autoCreateSpace: config?.autoCreateSpace ?? true,
    sessionStorage: new BrowserSessionStorage(),
    siweConfig: config?.siweConfig,
    manifest,
    capabilityRequest: config?.capabilityRequest,
    signStrategy: config?.signStrategy,
    includeAccountRegistryPermissions: config?.includeAccountRegistryPermissions,
  });

  // Set provider for SDK signing paths that still read the provider property.
  tcw.provider = web3Provider;

  return tcw;
}

/**
 * Restore a persisted TinyCloud browser session without requiring a wallet.
 *
 * This is useful after an app reload: the backend JWT can restore API access,
 * while the TinyCloud session restore rehydrates the SDK client needed for
 * direct reads and hook subscriptions.
 */
export async function restoreTinyCloudWeb(
  address: string,
  config?: TinyCloudWebConfig,
): Promise<{ tcw: TinyCloudWeb; session: ClientSession } | null> {
  const manifest = config?.manifest ?? config?.capabilityRequest?.manifests;
  const tcw = new (TinyCloudWeb as any)({
    tinycloudHosts: config?.tinycloudHosts,
    tinycloudRegistryUrl: config?.tinycloudRegistryUrl,
    tinycloudFallbackHosts: config?.tinycloudFallbackHosts,
    autoCreateSpace: config?.autoCreateSpace ?? true,
    sessionStorage: new BrowserSessionStorage(),
    siweConfig: config?.siweConfig,
    manifest,
    capabilityRequest: config?.capabilityRequest,
    signStrategy: config?.signStrategy,
    includeAccountRegistryPermissions: config?.includeAccountRegistryPermissions,
  });

  const restored = await tcw.restoreSession(address);
  if (restored.status !== "restored" || !restored.session) {
    return null;
  }

  return {
    tcw,
    session: restored.session,
  };
}

/**
 * Create a TinyCloudWeb instance and sign in.
 *
 * Accepts an optional `nonce` to pass through to the SDK's SIWE message
 * construction, and optional manifest/capability request inputs that drive
 * the session's granted capabilities. The SDK's `signIn()` returns a `ClientSession`
 * containing the signed SIWE message and signature.
 */
export async function createAndSignIn(
  web3Provider: providers.Web3Provider,
  config?: TinyCloudWebConfig & { nonce?: string },
): Promise<{ tcw: TinyCloudWeb; session: ClientSession }> {
  const siweConfig = config?.nonce
    ? { ...config?.siweConfig, nonce: config.nonce }
    : config?.siweConfig;
  const tcw = createTinyCloudWeb(web3Provider, { ...config, siweConfig });
  const session = await tcw.signIn();
  return { tcw, session };
}
