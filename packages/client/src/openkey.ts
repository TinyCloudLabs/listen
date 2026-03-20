import OpenKey from "@openkey/sdk";
import { providers } from "ethers";

// ── Configuration ────────────────────────────────────────────────────

export interface OpenKeyConfig {
  host?: string;
  appName?: string;
  /** OAuth client ID — required for token-based auth */
  clientId: string;
  /** OAuth redirect URI — must match your OpenKey app settings */
  redirectUri: string;
  /** EIP-155 chain ID in hex, defaults to "0x1" (Ethereum mainnet) */
  chainId?: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string | undefined;
  expiresIn: number;
  idToken: string;
}

export interface SignInResult {
  address: string;
  keyId: string;
  openkey: OpenKey;
  web3Provider: providers.Web3Provider;
  tokens: OAuthTokens;
}

// ── EIP-1193 Provider ────────────────────────────────────────────────

/**
 * EIP-1193 compatible provider that routes signing to OpenKey.
 * TinyCloudWeb treats this like any browser wallet.
 */
class OpenKeyEIP1193Provider {
  constructor(
    private openkey: OpenKey,
    private address: string,
    private keyId: string,
    private chainId: string,
  ) {}

  on(_event: string, _listener: (...args: any[]) => void): void {}
  removeListener(_event: string, _listener: (...args: any[]) => void): void {}

  async request({ method, params }: { method: string; params?: any[] }): Promise<any> {
    switch (method) {
      case "eth_accounts":
      case "eth_requestAccounts":
        return [this.address];
      case "eth_chainId":
        return this.chainId;
      case "personal_sign": {
        const hexMessage = params![0];
        const message = hexToString(hexMessage);
        const result = await this.openkey.signMessage({
          message,
          keyId: this.keyId,
        });
        return result.signature;
      }
      case "eth_getBalance":
        return "0x0";
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }
}

function hexToString(hex: string): string {
  const cleaned = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleaned.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  return new TextDecoder().decode(bytes);
}

// ── Sign In ──────────────────────────────────────────────────────────

/**
 * Full OpenKey sign-in: passkey authentication + OAuth PKCE token exchange.
 *
 * 1. Opens a popup for passkey authentication (connect)
 * 2. Runs OAuth PKCE flow to get verifiable tokens (oauth.connect + exchangeCode)
 * 3. Returns an ethers Web3Provider for TinyCloud signing + JWT tokens for backend auth
 */
export async function openKeySignIn(config: OpenKeyConfig): Promise<SignInResult> {
  const openkey = new OpenKey({
    host: config.host ?? "https://openkey.so",
    appName: config.appName ?? "TinyBoilerplate",
  });

  // 1. Passkey authentication via iframe — user authenticates, we get signing capability
  const authResult = await openkey.connect();

  // 2. OAuth PKCE — exchange session for verifiable tokens
  //    Passkey session persists, so the OAuth popup auto-approves instantly
  const oauthConfig = {
    clientId: config.clientId,
    redirectUri: config.redirectUri,
  };
  const oauthResult = await openkey.oauth.connect(oauthConfig);
  const tokenResponse = await openkey.oauth.exchangeCode(oauthResult.code, oauthConfig);

  // 3. Create EIP-1193 provider for TinyCloud SIWE signing
  const eip1193 = new OpenKeyEIP1193Provider(
    openkey,
    authResult.address,
    authResult.keyId,
    config.chainId ?? "0x1",
  );

  // Wrap in ethers Web3Provider for TinyCloudWeb compatibility
  const web3Provider = new providers.Web3Provider(eip1193);

  return {
    address: authResult.address,
    keyId: authResult.keyId,
    openkey,
    web3Provider,
    tokens: {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresIn: tokenResponse.expires_in,
      idToken: tokenResponse.id_token,
    },
  };
}
