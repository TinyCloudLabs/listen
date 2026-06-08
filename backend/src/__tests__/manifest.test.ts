import { describe, expect, test } from "bun:test";
import {
  backendDelegationResolvedPermissions,
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
      ASSEMBLYAI_API_KEY: ["read"],
      DEEPGRAM_API_KEY: ["read"],
    });
    expect(manifest.delegations).toBeUndefined();
    expect("backend" in manifest).toBe(false);
    expect(manifest.permissions).toEqual([
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

  test("includes the owner default-network decrypt grant in concrete backend policy", () => {
    const principalDid = "did:pkh:eip155:1:0xTEST";

    expect(backendDelegationResolvedPermissions("did:key:backend", principalDid)).toContainEqual({
      service: "tinycloud.encryption",
      space: "encryption",
      path: `urn:tinycloud:encryption:${principalDid}:default`,
      actions: ["tinycloud.encryption/decrypt"],
      skipPrefix: true,
      description: "Decrypt Listen secrets through the user's default encryption network.",
    });
  });
});
