import { Router } from "express";

export function createHealthRouter() {
  const router = Router();

  router.get("/", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({
      status: "ok",
      service: "listen-backend",
      buildSha: process.env.LISTEN_BUILD_SHA || null,
      deployRunUrl: process.env.LISTEN_DEPLOY_RUN_URL || null,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
