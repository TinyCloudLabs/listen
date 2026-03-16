import { TinyCloudWeb } from "@tinycloud/web-sdk";
import { providers } from "ethers";

// ── Configuration ────────────────────────────────────────────────────

export interface TinyCloudWebConfig {
  tinycloudHosts?: string[];
  autoCreateSpace?: boolean;
}

// ── TinyCloudWeb Instance ────────────────────────────────────────────

/**
 * Create a TinyCloudWeb instance wired to the given EIP-1193 provider.
 * The provider typically comes from `connectWallet()` in openkey.ts.
 */
export function createTinyCloudWeb(
  eip1193Provider: unknown,
  config?: TinyCloudWebConfig,
): TinyCloudWeb {
  const tcw = new TinyCloudWeb({
    providers: {
      web3: { driver: eip1193Provider },
    },
    tinycloudHosts: config?.tinycloudHosts ?? ["https://node.tinycloud.xyz"],
    autoCreateSpace: config?.autoCreateSpace ?? true,
  });

  // WORKAROUND: The SDK's createDelegation() uses tcw.provider.getSigner()
  // but the constructor never sets tcw.provider from the config.
  // Manually set it so delegation signing works.
  tcw.provider = new providers.Web3Provider(
    eip1193Provider as providers.ExternalProvider,
  );

  return tcw;
}

// ── Sign In ──────────────────────────────────────────────────────────

/**
 * Sign in with TinyCloudWeb and return the session.
 * After sign-in, `tcw.did` is the user's primary DID and `tcw.spaceId` is set.
 */
export async function signIn(tcw: TinyCloudWeb) {
  const session = await tcw.signIn();
  return session;
}
