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
    const { sub } = req.user!;
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

      // Extract metadata from the delegation itself
      const expiresAt = delegation.expiry
        ? (delegation.expiry instanceof Date ? delegation.expiry : new Date(delegation.expiry)).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Store the delegation keyed by JWT sub (not client-supplied address)
      await store.store(sub, serialized, {
        expiresAt,
        actions: delegation.actions ?? [],
        path: delegation.path ?? "",
      });

      // Cache the active DelegatedAccess keyed by sub
      cache.set(sub, access);

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
    const { sub } = req.user!;

    try {
      await store.remove(sub);
      cache.evict(sub);

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
    const { sub } = req.user!;

    try {
      const stored = await store.load(sub);

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
        await store.remove(sub);
        cache.evict(sub);

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
