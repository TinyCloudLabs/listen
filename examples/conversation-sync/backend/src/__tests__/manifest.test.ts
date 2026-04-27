import { describe, expect, test } from "bun:test";
import { runtimeManifestForBackend, resolveAppPath } from "../manifest.js";

describe("manifest", () => {
  test("serves a runtime manifest with the backend DID injected", () => {
    const manifest = runtimeManifestForBackend("did:key:backend");

    expect(manifest.id).toBe("com.tinycloud.conversation-sync");
    expect(manifest.prefix).toBeUndefined();
    expect(manifest.defaults).toBeUndefined();
    expect(manifest.delegations).toEqual([
      {
        to: "did:key:backend",
        name: "Conversation Sync Backend",
        expiry: "7d",
        permissions: [
          {
            service: "tinycloud.kv",
            space: "default",
            path: "/",
            actions: ["get", "put", "del", "list", "metadata"],
          },
          {
            service: "tinycloud.sql",
            space: "default",
            path: "conversations",
            actions: ["read", "write"],
          },
        ],
      },
    ]);
  });

  test("resolves app-relative paths with the manifest id prefix", () => {
    expect(resolveAppPath("config/fireflies-key")).toBe(
      "com.tinycloud.conversation-sync/config/fireflies-key",
    );
    expect(resolveAppPath("conversations", "tinycloud.sql")).toBe(
      "com.tinycloud.conversation-sync/conversations",
    );
  });
});
