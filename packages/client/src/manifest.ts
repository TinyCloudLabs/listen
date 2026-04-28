import {
  composeManifestRequest,
  loadManifest,
  resolveManifest,
  type ComposedManifestRequest,
  type Manifest,
} from "@tinycloud/sdk-core";
import type { ServerInfo, ServerInfoPermission } from "@tinyboilerplate/core";

// ── Manifest Loading ──────────────────────────────────────────────────

/**
 * Fetch and validate the app's manifest from a URL. Apps can serve this
 * from their frontend public directory or from a backend endpoint.
 *
 * This is a thin re-export of the SDK's {@link loadManifest} so
 * consumers don't need to pull `@tinycloud/web-sdk` directly just
 * to load a manifest.
 */
export async function loadAppManifest(url: string): Promise<Manifest> {
  return loadManifest(url);
}

// ── Composition ───────────────────────────────────────────────────────

/** Turn backend-advertised permissions into a delegate manifest. */
export function backendManifestFromServerInfo(appManifest: Manifest, info: ServerInfo): Manifest {
  if (!info.permissions || info.permissions.length === 0) {
    throw new Error("Backend did not advertise any permissions to delegate");
  }
  return {
    manifest_version: 1,
    app_id: appManifest.app_id,
    name: info.name ?? "Backend",
    description: `${info.name ?? "Backend"} access for ${appManifest.name}`,
    did: info.did,
    expiry: info.expiry,
    defaults: false,
    permissions: info.permissions.map((p) => ({
      service: p.service,
      ...(p.space !== undefined ? { space: p.space } : {}),
      path: p.path,
      actions: [...p.actions],
      ...(p.description !== undefined ? { description: p.description } : {}),
    })),
  };
}

/** Compose the app manifest and backend delegate manifest into one request. */
export function composeManifestWithBackend(
  appManifest: Manifest,
  info: ServerInfo,
): ComposedManifestRequest {
  return composeManifestRequest([appManifest, backendManifestFromServerInfo(appManifest, info)]);
}

/**
 * Resolve app-relative permission entries using the manifest's prefix/action
 * rules. Use this when delegation is app logic rather than manifest structure:
 * a backend or agent can ask for app-relative caps, and the frontend resolves
 * them to the concrete caps already covered by the signed manifest session.
 */
export function resolveManifestPermissions(
  manifest: Manifest,
  permissions: readonly ServerInfoPermission[],
): ServerInfoPermission[] {
  if (permissions.length === 0) return [];

  const resolved = resolveManifest({
    ...manifest,
    defaults: false,
    permissions: permissions.map((permission) => ({
      service: permission.service,
      ...(permission.space !== undefined ? { space: permission.space } : {}),
      path: permission.path,
      actions: [...permission.actions],
      ...(permission.description !== undefined ? { description: permission.description } : {}),
    })),
  }).resources;

  return resolved.map((permission, index) => ({
    service: permission.service,
    space: permission.space,
    path: permission.path,
    actions: [...permission.actions],
    description: permissions[index]?.description,
  }));
}

/**
 * Return the fully resolved permissions for a manifest with `did`.
 * This is mainly useful for diagnostics and tests; production code should
 * generally use `composeManifestRequest` plus `materializeDelegation`.
 */
export function resolveManifestDelegationPermissions(
  manifest: Manifest,
  delegateDid: string,
): ServerInfoPermission[] {
  const resolved = resolveManifest(manifest);
  const delegate = resolved.additionalDelegates.find((entry) => entry.did === delegateDid);
  if (!delegate) return [];

  return delegate.permissions.map((permission) => ({
    service: permission.service,
    space: permission.space,
    path: permission.path,
    actions: [...permission.actions],
    description: permission.description,
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
        path,
        actions,
      },
    ],
  }).resources[0];

  if (!resolved) {
    throw new Error(`Failed to resolve manifest path: ${path}`);
  }

  return resolved.path;
}
