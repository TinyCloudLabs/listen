import { describe, expect, test } from "bun:test";

(globalThis as unknown as { HTMLElement?: unknown }).HTMLElement ??= class HTMLElement {};
(globalThis as unknown as { customElements?: unknown }).customElements ??= {
  define() {},
  get() {
    return undefined;
  },
};

const { resolveManifestDelegationPermissions, resolveManifestPermissionPath } =
  await import("../manifest.js");

describe("resolveManifestDelegationPermissions", () => {
  test("returns manifest-resolved backend permissions for delegateTo", () => {
    const permissions = resolveManifestDelegationPermissions(
      {
        id: "com.example.app",
        name: "Example App",
        delegations: [
          {
            to: "did:key:backend",
            permissions: [
              {
                service: "tinycloud.kv",
                space: "default",
                path: "/",
                actions: ["get", "put"],
              },
              {
                service: "tinycloud.sql",
                space: "default",
                path: "conversations",
                actions: ["read", "write"],
              },
            ],
          },
        ],
      },
      "did:key:backend",
    );

    expect(permissions).toEqual([
      {
        service: "tinycloud.kv",
        space: "default",
        path: "com.example.app/",
        actions: ["tinycloud.kv/get", "tinycloud.kv/put"],
      },
      {
        service: "tinycloud.sql",
        space: "default",
        path: "com.example.app/conversations",
        actions: ["tinycloud.sql/read", "tinycloud.sql/write"],
      },
    ]);
  });

  test("returns an empty list when the backend is not declared", () => {
    expect(
      resolveManifestDelegationPermissions(
        {
          id: "com.example.app",
          name: "Example App",
        },
        "did:key:backend",
      ),
    ).toEqual([]);
  });

  test("resolves an app-relative path with the manifest prefix", () => {
    expect(
      resolveManifestPermissionPath(
        {
          id: "com.example.app",
          name: "Example App",
        },
        "tinycloud.sql",
        "conversations/conversation",
      ),
    ).toBe("com.example.app/conversations/conversation");
  });
});
