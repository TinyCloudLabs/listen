import { describe, expect, test } from "bun:test";

(globalThis as unknown as { HTMLElement?: unknown }).HTMLElement ??= class HTMLElement {};
(globalThis as unknown as { customElements?: unknown }).customElements ??= {
  define() {},
  get() {
    return undefined;
  },
};

const { createPermissionDelegation } = await import("../delegation.js");

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
