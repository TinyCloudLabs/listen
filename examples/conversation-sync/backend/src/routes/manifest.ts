import { Router } from "express";
import { runtimeManifestForBackend } from "../manifest.js";

export function createManifestRouter(did: string) {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json(runtimeManifestForBackend(did));
  });

  return router;
}
