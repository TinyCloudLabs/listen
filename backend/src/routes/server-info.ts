import { Router } from "express";
import type { ServerInfo } from "@listen/core";
import { backendManifestConfig } from "../manifest.js";

// ── Server Info Route ────────────────────────────────────────────────

/**
 * GET /api/server-info
 *
 * Returns the backend's DID plus the app-logic permissions this backend
 * should receive. No auth required. The frontend resolves these
 * app-relative permissions against the user-facing manifest, signs one
 * composed capability request, then materializes the backend delegation.
 */
export function createServerInfoRouter(did: string) {
  const router = Router();

  router.get("/", (_req, res) => {
    const backend = backendManifestConfig(did);
    const info: ServerInfo = {
      did,
      status: "ready",
      name: backend.name,
      expiry: backend.expiry,
      permissions: backend.permissions.map((permission) => ({
        service: permission.service,
        space: permission.space,
        path: permission.path,
        actions: [...permission.actions],
        skipPrefix: permission.skipPrefix,
        description: permission.description,
      })),
    };

    res.json(info);
  });

  return router;
}
