import { loadManifest, type Manifest } from "@tinycloud/web-sdk";
import type { ServerInfo } from "@tinyboilerplate/core";

// ── Manifest Loading ──────────────────────────────────────────────────

/**
 * Fetch and validate the app's `manifest.json` from the app's own
 * public directory (e.g. `/manifest.json`).
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
