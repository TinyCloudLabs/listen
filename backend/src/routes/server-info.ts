import { Router } from "express";
import { createHash } from "node:crypto";
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
    features: {
      googleMeet: process.env.GOOGLE_CLIENT_ID
        ? { available: true }
        : {
            available: false,
            reason: "google_client_not_configured",
          },
    },
  };
  const etag = `"${createHash("sha256").update(JSON.stringify(info)).digest("base64url")}"`;

  router.get("/", (req, res) => {
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
    res.setHeader("ETag", etag);
    if (req.headers["if-none-match"] === etag) {
      res.status(304).end();
      return;
    }

    res.json(info);
  });

  return router;
}
