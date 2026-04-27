import { loadManifest, resolveManifest, type Manifest } from "@tinycloud/web-sdk";
import type { ServerInfo, ServerInfoPermission } from "@tinyboilerplate/core";

// ── Manifest Loading ──────────────────────────────────────────────────

/**
 * Fetch and validate the app's manifest from a URL. Apps can serve this
 * from their frontend public directory or from a backend endpoint that
 * injects runtime delegation targets.
 *
 * This is a thin re-export of the SDK's {@link loadManifest} so
 * consumers don't need to pull `@tinycloud/web-sdk` directly just
 * to load a manifest.
 */
export async function loadAppManifest(url: string): Promise<Manifest> {
  return loadManifest(url);
}

// ── Composition ───────────────────────────────────────────────────────

/**
 * Compose an app manifest with a backend delegation declared from the
 * backend's `/api/server-info` response.
 *
 * This is the bridge between "app declares its own permissions" (via
 * `manifest.json` in the app's public directory) and "backend declares
 * the permissions it needs the user to delegate" (via `server-info`).
 * The composed manifest is what drives the SIWE recap at sign-in: the
 * session key gets coverage for BOTH the app's own runtime needs AND
 * the backend's declared permissions, in one wallet prompt.
 *
 * Rules:
 * - If `info.permissions` is undefined or empty, returns the input
 *   manifest unchanged (no delegation to compose).
 * - Otherwise appends a new `delegations[*]` entry with the backend's
 *   DID, informational name, expiry (if provided), and permissions.
 * - Existing manifest delegations are preserved — we append, not
 *   overwrite.
 *
 * The returned manifest is a new object; the input is not mutated.
 */
export function composeManifestWithBackend(appManifest: Manifest, info: ServerInfo): Manifest {
  if (!info.permissions || info.permissions.length === 0) {
    return appManifest;
  }
  return {
    ...appManifest,
    delegations: [
      ...(appManifest.delegations ?? []),
      {
        to: info.did,
        name: info.name ?? "Backend",
        expiry: info.expiry,
        permissions: info.permissions.map((p) => ({
          service: p.service,
          space: p.space,
          path: p.path,
          actions: [...p.actions],
        })),
      },
    ],
  };
}

/**
 * Return the fully resolved permissions for a manifest-declared backend
 * delegation. Use this output for `delegateTo` after sign-in: it has the
 * manifest prefix applied and short actions expanded to full action URNs,
 * matching the SIWE recap the wallet signed.
 */
export function resolveManifestDelegationPermissions(
  manifest: Manifest,
  backendDid: string,
): ServerInfoPermission[] {
  const resolved = resolveManifest(manifest);
  const delegate = resolved.additionalDelegates.find((entry) => entry.did === backendDid);
  if (!delegate) return [];

  return delegate.permissions.map((permission) => ({
    service: permission.service,
    space: permission.space,
    path: permission.path,
    actions: [...permission.actions],
  }));
}

/**
 * Resolve one app-relative path with the manifest's prefix rules. This is
 * useful for frontend code that needs to subscribe to or display a runtime
 * path that matches the manifest namespace.
 */
export function resolveManifestPermissionPath(
  manifest: Manifest,
  service: string,
  path: string,
  actions: string[] = ["read"],
): string {
  const resolved = resolveManifest({
    ...manifest,
    defaults: false,
    permissions: [
      {
        service,
        space: "default",
        path,
        actions,
      },
    ],
    delegations: undefined,
  }).resources[0];

  if (!resolved) {
    throw new Error(`Failed to resolve manifest path: ${path}`);
  }

  return resolved.path;
}
