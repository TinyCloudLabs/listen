import { TinyCloudWeb, BrowserSessionStorage } from "@tinycloud/web-sdk";
import type { ClientSession, SiweConfig, Manifest } from "@tinycloud/web-sdk";
import type { providers } from "ethers";

// ── Configuration ────────────────────────────────────────────────────

export interface TinyCloudWebConfig {
  tinycloudHosts?: string[];
  autoCreateSpace?: boolean;
  siweConfig?: SiweConfig;
  /**
   * Manifest driving the SIWE recap at sign-in. When provided, the
   * session key acquires capability coverage for BOTH the app's own
   * permissions AND every manifest-declared delegation target — in
   * one wallet prompt. Subsequent `tcw.delegateTo(declaredDid, perms)`
   * calls issue via the session-key UCAN path with no further prompt.
   */
  manifest?: Manifest;
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
  });

  // Set provider for createDelegation() signing (SDK bug workaround)
  tcw.provider = web3Provider;

  return tcw;
}

/**
 * Create a TinyCloudWeb instance and sign in.
 *
 * Accepts an optional `nonce` to pass through to the SDK's SIWE message
 * construction, and an optional `manifest` that drives the session's
 * granted capabilities. The SDK's `signIn()` returns a `ClientSession`
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
