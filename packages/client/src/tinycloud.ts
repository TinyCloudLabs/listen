import { TinyCloudWeb, BrowserSessionStorage } from "@tinycloud/web-sdk";
import type {
  ClientSession,
  ComposedManifestRequest,
  Manifest,
  SiweConfig,
} from "@tinycloud/web-sdk";
import type { providers } from "ethers";

// ── Configuration ────────────────────────────────────────────────────

export interface TinyCloudWebConfig {
  tinycloudHosts?: string[];
  autoCreateSpace?: boolean;
  siweConfig?: SiweConfig;
  /**
   * Manifest driving the SIWE recap at sign-in. If `capabilityRequest`
   * is present, it takes precedence and is signed directly.
   */
  manifest?: Manifest;
  /** Pre-composed manifest request that may include app and delegate manifests. */
  capabilityRequest?: ComposedManifestRequest;
}

// ── TinyCloudWeb Instance ────────────────────────────────────────────

/**
 * Create a TinyCloudWeb instance with BrowserSessionStorage for session persistence.
 */
export function createTinyCloudWeb(
  web3Provider: providers.Web3Provider,
  config?: TinyCloudWebConfig,
): TinyCloudWeb {
  const tcw = new (TinyCloudWeb as any)({
    providers: { web3: { driver: web3Provider } },
    tinycloudHosts: config?.tinycloudHosts ?? ["https://node.tinycloud.xyz"],
    autoCreateSpace: config?.autoCreateSpace ?? true,
    sessionStorage: new BrowserSessionStorage(),
    siweConfig: config?.siweConfig,
    manifest: config?.manifest,
    capabilityRequest: config?.capabilityRequest,
  });

  // Set provider for createDelegation() signing (SDK bug workaround)
  tcw.provider = web3Provider;

  return tcw;
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
