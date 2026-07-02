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

/**
 * OpenKey serves its API from the `api.` subdomain of the widget host
 * (openkey.so → api.openkey.so). Localhost dev serves both from one origin.
 */
function deriveOpenKeyApiHost(host: string): string {
  try {
    const url = new URL(host);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return host.replace(/\/+$/, "");
    }
    if (!url.hostname.startsWith("api.")) {
      url.hostname = `api.${url.hostname}`;
    }
    return url.toString().replace(/\/+$/, "");
  } catch {
    return "https://api.openkey.so";
  }
}

function createTinyCloudOpenKeySignStrategy(input: {
  host: string;
  openkey: OpenKey;
  keyId: string;
}): SignStrategy {
  const apiHost = deriveOpenKeyApiHost(input.host);

  const strategy: SignStrategy & { openKeyAutoSign: true } = {
    type: "callback",
    openKeyAutoSign: true,
    handler: async (request: SignRequest): Promise<SignResponse> => {
      // Bootstrap signatures must never reach the interactive widget (that
      // is the TC-86 prompt flood). Anything else falls back to exactly one
      // widget prompt: approved-without-signature makes the SDK sign with
      // its own (interactive) signer.
      // `purpose` ships in @tinycloud/sdk-core > 2.4.0; older SDKs send none.
      const purpose = (request as SignRequest & { purpose?: string }).purpose;
      const isBootstrap = purpose === "bootstrap-session" || purpose === "bootstrap-host";
      const widgetFallback: SignResponse = { approved: true };

      // Session token relayed during connect(); older @openkey/sdk builds
      // have no accessor — the request then goes out unauthenticated and
      // the failure policy below applies.
      const token = (
        input.openkey as { getSessionToken?: () => string | null }
      ).getSessionToken?.();

      try {
        const response = await fetch(`${apiHost}/api/delegate/sign`, {
          method: "POST",
          credentials: "omit",
          headers: {
            "content-type": "application/json",
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
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

        if (!isBootstrap) {
          return widgetFallback;
        }

        return {
          approved: false,
          reason:
            parsed?.reason ??
            parsed?.error ??
            `OpenKey signing failed with HTTP ${response.status}`,
        };
      } catch (err) {
        if (!isBootstrap) {
          return widgetFallback;
        }
        return {
          approved: false,
          reason: `OpenKey signing unreachable: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
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
