import { Router } from "express";
import type { ServerInfo } from "@tinyboilerplate/core";

// ── Server Info Route ────────────────────────────────────────────────

/**
 * GET /api/server-info
 *
 * Returns the backend's {@link ServerInfo}: identity, name, delegation
 * expiry, and the permissions the backend needs the user to delegate.
 * No auth required.
 *
 * The frontend consumes this response at sign-in time to compose a
 * manifest that pre-declares the delegation to this backend. That
 * manifest drives the SIWE recap so the session key already holds the
 * capabilities the backend needs — the delegation is then issued via
 * the session-key UCAN path in one wallet prompt for the whole flow.
 */
export function createServerInfoRouter(did: string) {
  const router = Router();

  // Permissions the backend needs the user to grant. These are the
  // capabilities every authenticated data route (`/api/items`, etc)
  // touches, across both KV and SQL stores.
  //
  // `space: "default"` means "the user's default space"; the SDK
  // resolves this to the real SpaceId at sign-in. `path: ""` means
  // "no path segment on the resource URI" — the same convention the
  // TinyCloud default actions table uses, and what the current backend
  // middleware expects to receive. Shortform actions are expanded to
  // full URNs by the SDK.
  const backendPermissions: ServerInfo["permissions"] = [
    {
      service: "tinycloud.kv",
      space: "default",
      path: "",
      actions: ["get", "put", "del", "list", "metadata"],
    },
    {
      service: "tinycloud.sql",
      space: "default",
      path: "",
      actions: ["read", "write"],
    },
  ];

  router.get("/", (_req, res) => {
    const info: ServerInfo = {
      did,
      status: "ready",
      name: "TinyBoilerplate Backend",
      expiry: "7d",
      permissions: backendPermissions,
    };
    res.json(info);
  });

  return router;
}
