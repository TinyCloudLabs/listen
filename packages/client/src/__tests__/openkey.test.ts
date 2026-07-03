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

    getSessionToken() {
      return "session-token-test";
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

const baseRequest = {
  address: "0x0000000000000000000000000000000000000001",
  chainId: 1,
  type: "siwe" as const,
};

describe("connectWallet TinyCloud OpenKey sign strategy", () => {
  beforeEach(() => {
    signMessage.mockClear();
    openKeyConfig = undefined;
  });

  test("auto-signs bootstrap requests through the API host with a bearer token", async () => {
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
      ...baseRequest,
      message: "bootstrap-siwe",
      purpose: "bootstrap-session",
    });

    expect(openKeyConfig).toEqual(
      expect.objectContaining({
        host: "https://openkey.test",
      }),
    );
    expect(result).toEqual({ approved: true, signature: "0xdelegate" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openkey.test/api/delegate/sign",
      expect.objectContaining({
        credentials: "omit",
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer session-token-test",
        }),
      }),
    );
    expect(signMessage).not.toHaveBeenCalled();
  });

  test("non-bootstrap requests fall back to the interactive signer on denial", async () => {
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
      ...baseRequest,
      message: "app-siwe",
      purpose: "sign-in",
    });

    // approved-without-signature → the SDK signs with its own signer
    // (exactly one widget prompt); the wrapper never calls the widget itself.
    expect(result).toEqual({ approved: true });
    expect(signMessage).not.toHaveBeenCalled();
  });

  test("bootstrap denials do not fall back to the widget", async () => {
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
      ...baseRequest,
      message: "bootstrap-siwe",
      purpose: "bootstrap-host",
    });

    expect(result).toEqual({
      approved: false,
      reason: "Auto-Sign is disabled for this account",
    });
    expect(signMessage).not.toHaveBeenCalled();
  });

  test("bootstrap requests degrade to denial when the endpoint is unreachable", async () => {
    globalThis.fetch = mock(async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;

    const { tinycloudSignStrategy } = await connectWallet({
      host: "https://openkey.test",
    });
    const result = await (tinycloudSignStrategy as any).handler({
      ...baseRequest,
      message: "bootstrap-siwe",
      purpose: "bootstrap-session",
    });

    expect(result.approved).toBe(false);
    expect(result.reason).toContain("unreachable");
    expect(signMessage).not.toHaveBeenCalled();
  });

  test("non-bootstrap requests fall back to the interactive signer when the endpoint is unreachable", async () => {
    globalThis.fetch = mock(async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;

    const { tinycloudSignStrategy } = await connectWallet({
      host: "https://openkey.test",
    });
    const result = await (tinycloudSignStrategy as any).handler({
      ...baseRequest,
      message: "app-siwe",
      purpose: "sign-in",
    });

    expect(result).toEqual({ approved: true });
  });

  test("untagged requests (older SDK) are treated as non-bootstrap", async () => {
    globalThis.fetch = mock(async () =>
      jsonResponse({ approved: false, reason: "nope" }, { status: 401 }),
    ) as typeof fetch;

    const { tinycloudSignStrategy } = await connectWallet({
      host: "https://openkey.test",
    });
    const result = await (tinycloudSignStrategy as any).handler({
      ...baseRequest,
      message: "app-siwe",
    });

    expect(result).toEqual({ approved: true });
  });

  test("localhost hosts are not rewritten to an api subdomain", async () => {
    const fetchMock = mock(async () => jsonResponse({ approved: true, signature: "0xdelegate" }));
    globalThis.fetch = fetchMock as typeof fetch;

    const { tinycloudSignStrategy } = await connectWallet({
      host: "http://localhost:3001",
    });
    await (tinycloudSignStrategy as any).handler({
      ...baseRequest,
      message: "bootstrap-siwe",
      purpose: "bootstrap-session",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/delegate/sign",
      expect.anything(),
    );
  });
});
