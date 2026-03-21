import { TinyCloudWeb, BrowserSessionStorage } from "@tinycloud/web-sdk";
import type { providers } from "ethers";

// ── Configuration ────────────────────────────────────────────────────

export interface TinyCloudWebConfig {
  tinycloudHosts?: string[];
  autoCreateSpace?: boolean;
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
  });

  // Set provider for createDelegation() signing (SDK bug workaround)
  tcw.provider = web3Provider;

  return tcw;
}

/**
 * Create a TinyCloudWeb instance and sign in.
 *
 * Takes an ethers Web3Provider (from openKeySignIn) and returns
 * a signed-in TinyCloudWeb instance ready for KV/delegation operations.
 */
export async function createAndSignIn(
  web3Provider: providers.Web3Provider,
  config?: TinyCloudWebConfig,
): Promise<TinyCloudWeb> {
  const tcw = createTinyCloudWeb(web3Provider, config);
  await tcw.signIn();
  return tcw;
}
