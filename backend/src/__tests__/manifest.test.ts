import { describe, expect, test } from "bun:test";
import {
  backendDelegationResolvedPermissions,
  delegationCoversBackendPolicy,
  runtimeManifest,
  resolveAppPath,
} from "../manifest.js";

describe("manifest", () => {
  test("serves the v1 user-permission manifest without backend-only sections", () => {
    const manifest = runtimeManifest();

    expect((manifest as { manifest_version?: number }).manifest_version).toBe(1);
    expect(manifest.app_id).toBe("xyz.tinycloud.listen");
    expect(manifest.prefix).toBeUndefined();
    expect(manifest.defaults).toBe(true);
    expect(manifest.secrets).toEqual({
      FIREFLIES_API_KEY: ["read"],
      GRANOLA_API_KEY: ["read"],
      SOUNDCORE_SESSION: ["read"],
      SOUNDCORE_AUTH_TOKEN: ["read"],
      SOUNDCORE_UID: ["read"],
      SOUNDCORE_OPENUDID: ["read"],
      ASSEMBLYAI_API_KEY: ["read"],
      DEEPGRAM_API_KEY: ["read"],
      GOOGLE_MEET_TOKENS: {
        scope: "listen",
        actions: ["read", "write", "delete"],
      },
      OTTER_COOKIE: {
        scope: "listen",
        actions: ["read", "write", "delete"],
      },
    });
    expect(manifest.delegations).toBeUndefined();
    expect("backend" in manifest).toBe(false);
    expect(manifest.permissions).toEqual([
      {
        service: "tinycloud.sql",
        path: "conversations",
        actions: ["read", "write", "schema"],
        description:
          "Create and migrate the conversations schema so the browser can seed it on first read when the backend seeder is unavailable.",
      },
      {
        service: "tinycloud.hooks",
        path: "sql/conversations/conversation",
        actions: ["subscribe"],
        skipPrefix: true,
        description:
          "Subscribe to conversation row write events for live updates when hooks are enabled.",
      },
    ]);
  });

  test("resolves app-relative paths with the manifest app_id prefix", () => {
    expect(resolveAppPath("config/fireflies-key")).toBe(
      "xyz.tinycloud.listen/config/fireflies-key",
    );
    expect(resolveAppPath("conversations", "tinycloud.sql")).toBe(
      "xyz.tinycloud.listen/conversations",
    );
  });

  test("keeps app data grants scoped and adds explicit backend secret grants", () => {
    const ownerDid = "did:pkh:eip155:1:0xTEST";
    const permissions = backendDelegationResolvedPermissions("did:key:backend", ownerDid);

    expect(permissions).toContainEqual(
      expect.objectContaining({
        service: "tinycloud.kv",
        space: "applications",
        path: "xyz.tinycloud.listen/",
      }),
    );
    expect(permissions).toContainEqual(
      expect.objectContaining({
        service: "tinycloud.sql",
        space: "applications",
        path: "xyz.tinycloud.listen/conversations",
      }),
    );
    expect(permissions).toContainEqual(
      expect.objectContaining({
        service: "tinycloud.kv",
        space: "secrets",
        path: "vault/secrets/SOUNDCORE_SESSION",
      }),
    );
    expect(permissions).toContainEqual(
      expect.objectContaining({
        service: "tinycloud.kv",
        space: "secrets",
        path: "vault/secrets/scoped/listen/GOOGLE_MEET_TOKENS",
      }),
    );
    expect(permissions).toContainEqual(
      expect.objectContaining({
        service: "tinycloud.encryption",
        space: "encryption",
        path: `urn:tinycloud:encryption:${ownerDid}:default`,
      }),
    );
  });

  test("matches backend policy when the grant covers the app data policy", () => {
    const ownerDid = "did:pkh:eip155:1:0xd559ccd9eb87c530a9a349262669386de93cf412";
    const granted = backendDelegationResolvedPermissions("did:key:backend", ownerDid);

    expect(delegationCoversBackendPolicy(granted, "did:key:backend", ownerDid)).toBe(true);
  });
});
