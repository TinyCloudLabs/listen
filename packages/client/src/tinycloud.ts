import { TinyCloudWeb } from "@tinycloud/web-sdk";

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
  return new TinyCloudWeb({
    providers: {
      web3: { driver: eip1193Provider },
    },
    tinycloudHosts: config?.tinycloudHosts ?? ["https://node.tinycloud.xyz"],
    autoCreateSpace: config?.autoCreateSpace ?? true,
  });
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
