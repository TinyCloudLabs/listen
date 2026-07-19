import { afterEach, beforeEach, describe, expect, test } from "bun:test";

(globalThis as unknown as { HTMLElement?: unknown }).HTMLElement ??= class HTMLElement {};
(globalThis as unknown as { customElements?: unknown }).customElements ??= {
  define() {},
  get() {
    return undefined;
  },
};

const {
  createManifestDelegation,
  createPermissionDelegation,
  sendDelegation,
  checkDelegationStatus,
} = await import("../delegation.js");
const { ApiRequestError } = await import("../api.js");

describe("createManifestDelegation", () => {
  test("splits multi-action manifest entries for SDK recap subset checks", async () => {
    const calls: unknown[][] = [];
    const tcw = {
      delegateTo: async (...args: unknown[]) => {
        calls.push(args);
        return {
          prompted: false,
          delegation: {
            cid: "cid-1",
            expiry: new Date("2026-12-31T00:00:00.000Z"),
            resources: args[1],
          },
        };
      },
    };

    await createManifestDelegation(tcw as never, "did:key:backend", {
      delegationTargets: [
        {
          did: "did:key:backend",
          expiryMs: 60_000,
          permissions: [
            {
              service: "tinycloud.kv",
              space: "applications",
              path: "xyz.tinycloud.listen/",
              actions: ["tinycloud.kv/get", "tinycloud.kv/put"],
            },
          ],
        },
      ],
    } as never);

    expect(calls).toHaveLength(1);
    expect(calls[0][1]).toEqual([
      {
        service: "tinycloud.kv",
        space: "applications",
        path: "xyz.tinycloud.listen/",
        actions: ["tinycloud.kv/get"],
      },
      {
        service: "tinycloud.kv",
        space: "applications",
        path: "xyz.tinycloud.listen/",
        actions: ["tinycloud.kv/put"],
      },
    ]);
  });
});

describe("createPermissionDelegation", () => {
  test("groups mixed-space permissions into same-space delegations", async () => {
    const calls: unknown[][] = [];
    const tcw = {
      delegateTo: async (...args: unknown[]) => {
        calls.push(args);
        return {
          prompted: false,
          delegation: {
            cid: `cid-${calls.length}`,
            expiry: new Date("2026-12-31T00:00:00.000Z"),
            resources: args[1],
          },
        };
      },
    };

    const result = await createPermissionDelegation(tcw as never, "did:key:backend", [
      {
        service: "tinycloud.kv",
        space: "applications",
        path: "xyz.tinycloud.listen/",
        actions: ["tinycloud.kv/get"],
      },
      {
        service: "tinycloud.sql",
        space: "applications",
        path: "xyz.tinycloud.listen/conversations",
        actions: ["tinycloud.sql/read"],
      },
      {
        service: "tinycloud.kv",
        space: "secrets",
        path: "vault/secrets/SOUNDCORE_SESSION",
        actions: ["tinycloud.kv/get"],
      },
    ]);

    expect(calls).toHaveLength(2);
    expect((calls[0][1] as Array<{ space: string }>).map((permission) => permission.space)).toEqual(
      ["applications", "applications"],
    );
    expect((calls[1][1] as Array<{ space: string }>).map((permission) => permission.space)).toEqual(
      ["secrets"],
    );
    expect(JSON.parse(result.serialized)).toMatchObject({
      format: "listen.delegation-bundle",
      version: 1,
    });
  });
});

describe("delegation API error handling", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function stubFetch(response: {
    ok: boolean;
    status: number;
    statusText: string;
    json: () => Promise<unknown>;
  }) {
    globalThis.fetch = (async () => response) as unknown as typeof fetch;
  }

  async function expectApiRequestError(action: () => Promise<unknown>) {
    try {
      await action();
      throw new Error("expected request to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiRequestError);
      return err as InstanceType<typeof ApiRequestError>;
    }
  }

  test("sendDelegation throws ApiRequestError with backend status and code on a 400", async () => {
    stubFetch({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({ error: "delegation_policy_mismatch", message: "Policy mismatch" }),
    });

    const err = await expectApiRequestError(() =>
      sendDelegation("https://api.example.com", "serialized", "session-token"),
    );

    expect(err.status).toBe(400);
    expect(err.code).toBe("delegation_policy_mismatch");
    expect(err.message).toBe("Failed to send delegation: Policy mismatch");
  });

  test("sendDelegation preserves the 429 status so callers can treat rate limits as transient", async () => {
    stubFetch({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      json: async () => ({ error: "rate_limited", message: "Slow down" }),
    });

    const err = await expectApiRequestError(() =>
      sendDelegation("https://api.example.com", "serialized", "session-token"),
    );

    expect(err.status).toBe(429);
    expect(err.code).toBe("rate_limited");
  });

  test("checkDelegationStatus throws ApiRequestError with backend status and code", async () => {
    stubFetch({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ error: "invalid_token", message: "Invalid or expired token" }),
    });

    const err = await expectApiRequestError(() =>
      checkDelegationStatus("https://api.example.com", "session-token"),
    );

    expect(err.status).toBe(401);
    expect(err.code).toBe("invalid_token");
    expect(err.message).toBe("Failed to check delegation status: Invalid or expired token");
  });

  test("sendDelegation falls back to unknown code when the error body is not JSON", async () => {
    stubFetch({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      json: async () => {
        throw new Error("not json");
      },
    });

    const err = await expectApiRequestError(() =>
      sendDelegation("https://api.example.com", "serialized", "session-token"),
    );

    expect(err.status).toBe(502);
    expect(err.code).toBe("unknown");
    expect(err.message).toBe("Failed to send delegation: Bad Gateway");
  });
});
