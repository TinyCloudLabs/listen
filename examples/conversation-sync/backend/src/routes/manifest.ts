import { Router } from "express";
import { runtimeManifest } from "../manifest.js";

export function createManifestRouter(did: string) {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json(runtimeManifest(did));
  });

  return router;
}
