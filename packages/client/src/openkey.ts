import OpenKey, { OpenKeyEIP1193Provider } from "@openkey/sdk";

// ── Configuration ────────────────────────────────────────────────────

export interface OpenKeyConfig {
  host?: string;
  appName?: string;
  mode?: "popup" | "redirect";
}

export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
}

export interface OAuthTokens {
  access_token: string;
  id_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface WalletConnection {
  address: string;
  provider: OpenKeyEIP1193Provider;
  openkey: OpenKey;
}

// ── OpenKey Instance ─────────────────────────────────────────────────

const DEFAULTS: Required<OpenKeyConfig> = {
  host: "https://openkey.so",
  appName: "TinyBoilerplate",
  mode: "popup",
};

/**
 * Create an OpenKey instance for authentication.
 */
export function createOpenKey(config?: OpenKeyConfig): OpenKey {
  const merged = { ...DEFAULTS, ...config };
  return new OpenKey({
    host: merged.host,
    appName: merged.appName,
    mode: merged.mode,
  });
}

// ── OAuth PKCE Flow ──────────────────────────────────────────────────

/**
 * Run the full OAuth PKCE flow: connect to get an authorization code,
 * then exchange it for tokens.
 */
export async function startOAuthFlow(
  openkey: OpenKey,
  oauthConfig: OAuthConfig,
): Promise<OAuthTokens> {
  // Step 1: OAuth connect — opens popup/redirect, returns auth code
  const { code } = await openkey.oauth.connect({
    clientId: oauthConfig.clientId,
    redirectUri: oauthConfig.redirectUri,
  });

  // Step 2: Exchange authorization code for tokens
  const tokens = await openkey.oauth.exchangeCode(code, {
    clientId: oauthConfig.clientId,
    redirectUri: oauthConfig.redirectUri,
  });

  return tokens as OAuthTokens;
}

// ── Wallet Connection ────────────────────────────────────────────────

/**
 * Connect via OpenKey to get an EIP-1193 provider suitable for TinyCloudWeb.
 * Returns the wallet address and a provider that can be passed to createTinyCloudWeb.
 */
export async function connectWallet(
  openkey: OpenKey,
): Promise<WalletConnection> {
  // Key selection flow — user picks a key, returns address + signing capability
  const authResult = await openkey.connect();

  // Create an EIP-1193 compatible provider from the OpenKey session
  const provider = new OpenKeyEIP1193Provider(openkey, authResult);

  return {
    address: authResult.address,
    provider,
    openkey,
  };
}
