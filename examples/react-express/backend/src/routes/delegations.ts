import { Router } from "express";
import type { Request, Response } from "express";
import type { TinyCloudNode } from "@tinycloud/node-sdk";
import { deserializeDelegation } from "@tinycloud/node-sdk";
import type { DelegationStore, DelegationCache } from "@tinyboilerplate/server";

// ── Types ────────────────────────────────────────────────────────────

interface DelegationRoutesConfig {
  node: TinyCloudNode;
  did: string;
  store: DelegationStore;
  cache: DelegationCache;
  authMiddleware: (req: Request, res: Response, next: () => void) => void;
}

// ── Delegation Routes ────────────────────────────────────────────────

export function createDelegationRouter(config: DelegationRoutesConfig) {
  const { node, did, store, cache, authMiddleware } = config;
  const router = Router();

  // All delegation routes require authentication
  router.use(authMiddleware as any);

  // ── POST /api/delegations — receive + store delegation ─────────
  router.post("/", async (req: Request, res: Response) => {
    const { address } = req.user!;
    const { serialized } = req.body;

    if (!serialized || typeof serialized !== "string") {
      res.status(400).json({
        error: "invalid_body",
        message: "Request body must include a 'serialized' string field",
      });
      return;
    }

    try {
      // Deserialize and validate the delegation
      const delegation = deserializeDelegation(serialized);

      // Activate the delegation to verify it works
      const access = await node.useDelegation(delegation);

      // Extract expiry from the delegation if available
      const expiresAt = (delegation as any).expiry
        ? new Date((delegation as any).expiry * 1000).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Store the delegation persistently
      await store.store(address, serialized, {
        expiresAt,
        actions: [
          "tinycloud.kv/get",
          "tinycloud.kv/put",
          "tinycloud.kv/del",
          "tinycloud.kv/list",
          "tinycloud.sql/read",
          "tinycloud.sql/write",
        ],
        path: "items/",
      });

      // Cache the active DelegatedAccess
      cache.set(address, access);

      res.json({
        status: "active",
        expiresAt,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      res.status(400).json({
        error: "invalid_delegation",
        message: `Failed to process delegation: ${message}`,
      });
    }
  });

  // ── DELETE /api/delegations — revoke delegation ────────────────
  router.delete("/", async (req: Request, res: Response) => {
    const { address } = req.user!;

    try {
      await store.remove(address);
      cache.evict(address);

      res.json({
        status: "none",
        expiresAt: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      res.status(500).json({
        error: "revoke_failed",
        message: `Failed to revoke delegation: ${message}`,
      });
    }
  });

  // ── GET /api/delegations/status — check delegation status ─────
  router.get("/status", async (req: Request, res: Response) => {
    const { address } = req.user!;
    console.log(`[delegations/status] address=${address}`);

    try {
      const stored = await store.load(address);
      console.log(`[delegations/status] stored=${stored ? "yes" : "no"} expiresAt=${stored?.expiresAt ?? "n/a"}`);

      if (!stored) {
        res.json({
          status: "none",
          expiresAt: null,
        });
        return;
      }

      const isExpired = new Date(stored.expiresAt).getTime() <= Date.now();

      if (isExpired) {
        // Clean up expired delegation
        await store.remove(address);
        cache.evict(address);

        res.json({
          status: "expired",
          expiresAt: stored.expiresAt,
        });
        return;
      }

      res.json({
        status: "active",
        expiresAt: stored.expiresAt,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      res.status(500).json({
        error: "status_check_failed",
        message: `Failed to check delegation status: ${message}`,
      });
    }
  });

  return router;
}
