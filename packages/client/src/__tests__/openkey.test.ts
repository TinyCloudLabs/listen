import { beforeEach, describe, expect, mock, test } from "bun:test";

const signMessage = mock(async () => ({ signature: "0xwidget" }));
let openKeyConfig: unknown;

mock.module("@openkey/sdk", () => ({
  default: class OpenKey {
    constructor(config: unknown) {
      openKeyConfig = config;
    }

    async connect() {
      return {
        address: "0x0000000000000000000000000000000000000001",
        keyId: "key_test",
      };
    }

    signMessage = signMessage;
  },
}));

const { connectWallet } = await import("../openkey.js");

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("connectWallet TinyCloud OpenKey sign strategy", () => {
  beforeEach(() => {
    signMessage.mockClear();
    openKeyConfig = undefined;
  });

  test("auto-signs bootstrap requests through /api/delegate/sign", async () => {
    const fetchMock = mock(async () =>
      jsonResponse({
        approved: true,
        signature: "0xdelegate",
      }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const { tinycloudSignStrategy } = await connectWallet({
      host: "https://openkey.test/",
    });
    const result = await (tinycloudSignStrategy as any).handler({
      address: "0x0000000000000000000000000000000000000001",
      chainId: 1,
      message: "bootstrap-siwe",
      type: "siwe",
    });

    expect(openKeyConfig).toEqual(
      expect.objectContaining({
        host: "https://openkey.test",
      }),
    );
    expect(result).toEqual({ approved: true, signature: "0xdelegate" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://openkey.test/api/delegate/sign",
      expect.objectContaining({
        credentials: "include",
        method: "POST",
      }),
    );
    expect(signMessage).not.toHaveBeenCalled();
  });

  test("falls back to one OpenKey widget signature outside the bootstrap allowlist", async () => {
    globalThis.fetch = mock(async () =>
      jsonResponse({
        approved: false,
        needsApproval: true,
        code: "outside_bootstrap_allowlist",
        reason: "not bootstrap",
      }),
    ) as typeof fetch;

    const { tinycloudSignStrategy } = await connectWallet({
      host: "https://openkey.test",
    });
    const result = await (tinycloudSignStrategy as any).handler({
      address: "0x0000000000000000000000000000000000000001",
      chainId: 1,
      message: "app-siwe",
      type: "siwe",
    });

    expect(result).toEqual({ approved: true, signature: "0xwidget" });
    expect(signMessage).toHaveBeenCalledWith({
      message: "app-siwe",
      keyId: "key_test",
    });
  });

  test("does not fall back to widget signing for bootstrap auto-sign denials", async () => {
    globalThis.fetch = mock(async () =>
      jsonResponse({
        approved: false,
        needsApproval: true,
        code: "auto_sign_disabled",
        reason: "Auto-Sign is disabled for this account",
      }),
    ) as typeof fetch;

    const { tinycloudSignStrategy } = await connectWallet({
      host: "https://openkey.test",
    });
    const result = await (tinycloudSignStrategy as any).handler({
      address: "0x0000000000000000000000000000000000000001",
      chainId: 1,
      message: "bootstrap-siwe",
      type: "siwe",
    });

    expect(result).toEqual({
      approved: false,
      reason: "Auto-Sign is disabled for this account",
    });
    expect(signMessage).not.toHaveBeenCalled();
  });
});
