import { describe, expect, test } from "bun:test";
import {
  backendDelegationResolvedPermissions,
  delegationCoversBackendPolicy,
  runtimeManifest,
  resolveAppPath,
  BACKEND_SECRET_GRANTS,
} from "../manifest.js";

// manifest.json declares secret actions as read/write/delete; the backend
// requests them as get/put/del. This map bridges the two vocabularies.
const MANIFEST_TO_GRANT_ACTION: Record<string, string> = {
  read: "get",
  write: "put",
  delete: "del",
};

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

  test("declares the default knowledge root", () => {
    expect((runtimeManifest() as { knowledge?: unknown }).knowledge).toBe(true);
  });

  test("BACKEND_SECRET_GRANTS matches manifest.json secrets", () => {
    const secrets = runtimeManifest().secrets as Record<
      string,
      string[] | { scope?: string; actions: string[] }
    >;

    const sortedManifestActions = (name: string): string[] => {
      const entry = secrets[name];
      const actions = Array.isArray(entry) ? entry : entry.actions;
      return actions.map((action) => MANIFEST_TO_GRANT_ACTION[action] ?? action).sort();
    };

    // Every grant maps exactly onto a manifest secret.
    for (const grant of BACKEND_SECRET_GRANTS) {
      const manifestEntry = secrets[grant.name];
      expect(manifestEntry, `manifest.secrets is missing ${grant.name}`).toBeDefined();

      expect(sortedManifestActions(grant.name)).toEqual([...grant.actions].sort());

      const grantScope = "scope" in grant ? grant.scope : undefined;
      if (grantScope !== undefined) {
        // A scoped grant must use the manifest object form with a matching scope.
        expect(Array.isArray(manifestEntry)).toBe(false);
        expect((manifestEntry as { scope?: string }).scope).toBe(grantScope);
      }
    }

    // Every manifest secret is requested by exactly one grant (no drift either way).
    const grantNames = BACKEND_SECRET_GRANTS.map((grant) => grant.name);
    expect(new Set(grantNames).size).toBe(grantNames.length);
    expect(grantNames.sort()).toEqual(Object.keys(secrets).sort());
  });
});
