import { describe, expect, test } from "bun:test";

(globalThis as unknown as { HTMLElement?: unknown }).HTMLElement ??= class HTMLElement {};
(globalThis as unknown as { customElements?: unknown }).customElements ??= {
  define() {},
  get() {
    return undefined;
  },
};

const {
  composeManifestWithBackend,
  resolveManifestPermissions,
  resolveManifestDelegationPermissions,
  resolveManifestPermissionPath,
} = await import("../manifest.js");

describe("resolveManifestPermissions", () => {
  test("composes backend info into an SDK capability request", () => {
    const request = composeManifestWithBackend(
      {
        app_id: "com.example.app",
        name: "Example App",
        defaults: false,
      },
      {
        did: "did:key:backend",
        status: "ok",
        name: "Backend",
        permissions: [
          {
            service: "tinycloud.sql",
            path: "conversations",
            actions: ["read", "write"],
            description: "Store transcript rows",
          },
        ],
      },
    );

    expect(request.delegationTargets[0]?.did).toBe("did:key:backend");
    expect(request.delegationTargets[0]?.permissions[0]?.path).toBe(
      "com.example.app/conversations",
    );
    expect(request.delegationTargets[0]?.permissions[0]?.description).toBe("Store transcript rows");
    expect(request.resources.some((permission) => permission.space === "account")).toBe(true);
  });

  test("resolves app-logic delegation requests with the manifest prefix", () => {
    const permissions = resolveManifestPermissions(
      {
        app_id: "com.example.app",
        name: "Example App",
        defaults: true,
      },
      [
        {
          service: "tinycloud.kv",
          path: "/",
          actions: ["get", "put"],
          description: "Backend sync state",
        },
        {
          service: "tinycloud.sql",
          path: "conversations",
          actions: ["read", "write"],
          description: "Conversation records",
        },
      ],
    );

    expect(permissions).toEqual([
      {
        service: "tinycloud.kv",
        space: "applications",
        path: "com.example.app/",
        actions: ["tinycloud.kv/get", "tinycloud.kv/put"],
        description: "Backend sync state",
      },
      {
        service: "tinycloud.sql",
        space: "applications",
        path: "com.example.app/conversations",
        actions: ["tinycloud.sql/read", "tinycloud.sql/write"],
        description: "Conversation records",
      },
      {
        service: "tinycloud.capabilities",
        space: "applications",
        path: "",
        actions: ["tinycloud.capabilities/read"],
        description: undefined,
      },
    ]);
  });
});

describe("resolveManifestDelegationPermissions", () => {
  test("returns manifest-resolved backend permissions for delegateTo", () => {
    const permissions = resolveManifestDelegationPermissions(
      {
        app_id: "com.example.app",
        name: "Example App",
        did: "did:key:backend",
        defaults: false,
        permissions: [
          {
            service: "tinycloud.kv",
            path: "/",
            actions: ["get", "put"],
            description: "Backend sync state",
          },
          {
            service: "tinycloud.sql",
            path: "conversations",
            actions: ["read", "write"],
            description: "Conversation records",
          },
        ],
      },
      "did:key:backend",
    );

    expect(permissions).toEqual([
      {
        service: "tinycloud.kv",
        space: "applications",
        path: "com.example.app/",
        actions: ["tinycloud.kv/get", "tinycloud.kv/put"],
        description: "Backend sync state",
      },
      {
        service: "tinycloud.sql",
        space: "applications",
        path: "com.example.app/conversations",
        actions: ["tinycloud.sql/read", "tinycloud.sql/write"],
        description: "Conversation records",
      },
      {
        service: "tinycloud.capabilities",
        space: "applications",
        path: "",
        actions: ["tinycloud.capabilities/read"],
        description: undefined,
      },
    ]);
  });

  test("returns an empty list when the backend is not declared", () => {
    expect(
      resolveManifestDelegationPermissions(
        {
          app_id: "com.example.app",
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
          app_id: "com.example.app",
          name: "Example App",
        },
        "tinycloud.sql",
        "conversations/conversation",
      ),
    ).toBe("com.example.app/conversations/conversation");
  });
});
