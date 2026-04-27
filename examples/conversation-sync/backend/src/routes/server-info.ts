import { Router } from "express";
import type { ServerInfo } from "@tinyboilerplate/core";
import { backendManifestConfig } from "../manifest.js";

// ── Server Info Route ────────────────────────────────────────────────

/**
 * GET /api/server-info
 *
 * Returns the backend's DID and status. No auth required.
 * Useful for the frontend to discover the backend's DID before
 * creating a delegation.
 */
export function createServerInfoRouter(did: string) {
  const router = Router();

  router.get("/", (_req, res) => {
    const backend = backendManifestConfig();
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
      })),
    };

    res.json(info);
  });

  return router;
}
