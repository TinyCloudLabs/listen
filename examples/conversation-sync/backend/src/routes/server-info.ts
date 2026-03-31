import { Router } from "express";

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
    res.json({
      did,
      status: "ready",
    });
  });

  return router;
}
