import OpenKey from "@openkey/sdk";
import { providers } from "ethers";

// ── Configuration ────────────────────────────────────────────────────

export interface OpenKeyConfig {
  host?: string;
  appName?: string;
}

export interface SignInResult {
  address: string;
  keyId: string;
  openkey: OpenKey;
  web3Provider: providers.Web3Provider;
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
  ) {}

  async request({ method, params }: { method: string; params?: any[] }): Promise<any> {
    switch (method) {
      case "eth_accounts":
      case "eth_requestAccounts":
        return [this.address];
      case "eth_chainId":
        return "0x1";
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
  const bytes = new Uint8Array(
    cleaned.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)),
  );
  return new TextDecoder().decode(bytes);
}

// ── Sign In ──────────────────────────────────────────────────────────

/**
 * Single-step OpenKey sign-in: connect → get signing provider.
 *
 * Opens one popup for passkey authentication. Returns an ethers
 * Web3Provider wired to OpenKey for signing, ready for TinyCloudWeb.
 */
export async function openKeySignIn(config?: OpenKeyConfig): Promise<SignInResult> {
  const openkey = new OpenKey({
    host: config?.host ?? "https://openkey.so",
    appName: config?.appName ?? "TinyBoilerplate",
  });

  // Single popup — user authenticates with passkey, selects key
  const authResult = await openkey.connect();

  // Create EIP-1193 provider that routes signing through OpenKey
  const eip1193 = new OpenKeyEIP1193Provider(
    openkey,
    authResult.address,
    authResult.keyId,
  );

  // Wrap in ethers Web3Provider for TinyCloudWeb compatibility
  const web3Provider = new providers.Web3Provider(eip1193 as any);

  return {
    address: authResult.address,
    keyId: authResult.keyId,
    openkey,
    web3Provider,
  };
}
