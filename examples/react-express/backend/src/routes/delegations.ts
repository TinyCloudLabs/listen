import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import type { TinyCloudNode } from "@tinycloud/node-sdk";
import { deserializeDelegation } from "@tinycloud/node-sdk";
import type { DelegationStore, DelegationCache } from "@tinyboilerplate/server";
import { DEFAULT_DELEGATION_EXPIRY_MS } from "@tinyboilerplate/core";

// ── Types ────────────────────────────────────────────────────────────

interface DelegationRoutesConfig {
  node: TinyCloudNode;
  did: string;
  store: DelegationStore;
  cache: DelegationCache;
  authMiddleware: RequestHandler;
}

// ── Delegation Routes ────────────────────────────────────────────────

export function createDelegationRouter(config: DelegationRoutesConfig) {
  const { node, store, cache, authMiddleware } = config;
  const router = Router();

  // All delegation routes require authentication
  router.use(authMiddleware);

  // ── POST /api/delegations — receive + store delegation ─────────
  router.post("/", async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthenticated", message: "Authentication required" });
      return;
    }
    const { address } = req.user;
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
        ? (delegation.expiry instanceof Date
            ? delegation.expiry
            : new Date(delegation.expiry)
          ).toISOString()
        : new Date(Date.now() + DEFAULT_DELEGATION_EXPIRY_MS).toISOString();

      // Store the delegation keyed by address
      await store.store(address, serialized, {
        expiresAt,
        actions: delegation.actions ?? [],
        path: delegation.path ?? "",
      });

      // Cache the active DelegatedAccess keyed by address
      cache.set(address, access);

      res.json({
        status: "active",
        expiresAt,
      });
    } catch (err) {
      // DIAGNOSTIC: surface the full error to the client temporarily so we
      // can debug UCAN deserialization / activation failures. Revert before
      // merging.
      const errMsg = err instanceof Error ? err.message : String(err);
      const errStack = err instanceof Error ? err.stack : undefined;
      console.error("[delegations] failed to process delegation:", err);
      res.status(400).json({
        error: "invalid_delegation",
        message: "Failed to process delegation",
        detail: errMsg,
        stack: errStack,
      });
    }
  });

  // ── DELETE /api/delegations — revoke delegation ────────────────
  router.delete("/", async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthenticated", message: "Authentication required" });
      return;
    }
    const { address } = req.user;

    try {
      await store.remove(address);
      cache.evict(address);

      res.json({
        status: "none",
        expiresAt: null,
      });
    } catch (err) {
      console.error("[delegations] failed to revoke delegation:", err);
      res.status(500).json({
        error: "revoke_failed",
        message: "Failed to revoke delegation",
      });
    }
  });

  // ── GET /api/delegations/status — check delegation status ─────
  router.get("/status", async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthenticated", message: "Authentication required" });
      return;
    }
    const { address } = req.user;

    try {
      const stored = await store.load(address);

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
      console.error("[delegations] failed to check delegation status:", err);
      res.status(500).json({
        error: "status_check_failed",
        message: "Failed to check delegation status",
      });
    }
  });

  return router;
}
