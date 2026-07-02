import OpenKey from "@openkey/sdk";
import { providers } from "ethers";
import type { SignRequest, SignResponse, SignStrategy } from "@tinycloud/sdk-core";

// ── Configuration ────────────────────────────────────────────────────

export interface ConnectWalletConfig {
  host?: string;
  appName?: string;
  /** EIP-155 chain ID in hex, defaults to "0x1" (Ethereum mainnet) */
  chainId?: string;
}

export interface ConnectWalletResult {
  address: string;
  keyId: string;
  openkey: OpenKey;
  web3Provider: providers.Web3Provider;
  tinycloudSignStrategy: SignStrategy;
}

interface OpenKeyDelegateSignResponse {
  approved?: boolean;
  signature?: string;
  reason?: string;
  error?: string;
  code?: string;
  needsApproval?: boolean;
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

function createTinyCloudOpenKeySignStrategy(input: {
  host: string;
  openkey: OpenKey;
  keyId: string;
}): SignStrategy {
  const strategy: SignStrategy & { openKeyAutoSign: true } = {
    type: "callback",
    openKeyAutoSign: true,
    handler: async (request: SignRequest): Promise<SignResponse> => {
      const response = await fetch(`${input.host}/api/delegate/sign`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...request, keyId: input.keyId }),
      });

      let parsed: OpenKeyDelegateSignResponse | undefined;
      try {
        parsed = (await response.json()) as OpenKeyDelegateSignResponse;
      } catch {
        parsed = undefined;
      }

      if (response.ok && parsed?.approved === true && parsed.signature) {
        return { approved: true, signature: parsed.signature };
      }

      if (response.ok && parsed?.code === "outside_bootstrap_allowlist") {
        const result = await input.openkey.signMessage({
          message: request.message,
          keyId: input.keyId,
        });
        return { approved: true, signature: result.signature };
      }

      return {
        approved: false,
        reason:
          parsed?.reason ?? parsed?.error ?? `OpenKey signing failed with HTTP ${response.status}`,
      };
    },
  };

  return strategy;
}

// ── Connect Wallet ──────────────────────────────────────────────────

/**
 * Connect wallet via OpenKey passkey authentication.
 *
 * Returns an EIP-1193-compatible provider (wrapped in ethers Web3Provider)
 * and the wallet address. No OAuth tokens — authentication is handled
 * separately via SIWE.
 */
export async function connectWallet(config?: ConnectWalletConfig): Promise<ConnectWalletResult> {
  const host = (config?.host ?? "https://openkey.so").replace(/\/+$/, "");
  const openkey = new OpenKey({
    host,
    appName: config?.appName ?? "Listen",
  });

  // Passkey authentication via iframe — user authenticates, we get signing capability
  console.log("[openkey] Calling openkey.connect()...");
  const authResult = await openkey.connect();
  console.log("[openkey] connect() done. Address:", authResult.address);

  // Create EIP-1193 provider for SIWE signing
  const eip1193 = new OpenKeyEIP1193Provider(
    openkey,
    authResult.address,
    authResult.keyId,
    config?.chainId ?? "0x1",
  );

  // Wrap in ethers Web3Provider for TinyCloudWeb compatibility
  const web3Provider = new providers.Web3Provider(eip1193);
  const tinycloudSignStrategy = createTinyCloudOpenKeySignStrategy({
    host,
    openkey,
    keyId: authResult.keyId,
  });

  return {
    address: authResult.address,
    keyId: authResult.keyId,
    openkey,
    web3Provider,
    tinycloudSignStrategy,
  };
}
