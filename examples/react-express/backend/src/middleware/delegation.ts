import type { Request, Response, NextFunction } from "express";
import type { TinyCloudNode } from "@tinycloud/node-sdk";
import { deserializeDelegation } from "@tinycloud/node-sdk";
import type { DelegationStore, DelegationCache } from "@tinyboilerplate/server";

// ── Types ────────────────────────────────────────────────────────────

interface DelegationMiddlewareConfig {
  node: TinyCloudNode;
  store: DelegationStore;
  cache: DelegationCache;
}

// ── Delegation Middleware Factory ────────────────────────────────────

/**
 * Creates Express middleware that:
 * 1. Runs AFTER auth middleware (requires req.user.sub)
 * 2. Looks up DelegatedAccess from cache by JWT sub
 * 3. On cache miss: loads from store -> deserialize -> useDelegation -> cache
 * 4. Attaches DelegatedAccess to req.delegatedAccess
 * 5. Returns 403 if no delegation found, 401 if expired
 */
export function createDelegationMiddleware(config: DelegationMiddlewareConfig) {
  const { node, store, cache } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: "unauthenticated",
        message: "Authentication required before delegation check",
      });
      return;
    }

    const { sub } = user;

    // Check cache first
    let access = cache.get(sub);

    if (access) {
      req.delegatedAccess = access;
      next();
      return;
    }

    // Cache miss — load from persistent store
    try {
      const stored = await store.load(sub);

      if (!stored) {
        res.status(403).json({
          error: "no_delegation",
          message: "No delegation found. Please delegate access from the frontend.",
        });
        return;
      }

      // Check expiry
      if (new Date(stored.expiresAt).getTime() <= Date.now()) {
        await store.remove(sub);
        res.status(401).json({
          error: "delegation_expired",
          message: "Delegation has expired. Please delegate access again.",
        });
        return;
      }

      // Deserialize and activate the delegation
      access = await activateDelegation(node, cache, sub, stored.serialized);
      req.delegatedAccess = access;
      next();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      // If TinyCloud returns 401, evict cache and retry once
      if (message.includes("401") || message.includes("Unauthorized") || message.includes("unauthorized")) {
        cache.evict(sub);

        try {
          const stored = await store.load(sub);
          if (!stored) {
            res.status(403).json({
              error: "no_delegation",
              message: "No delegation found after retry.",
            });
            return;
          }

          if (new Date(stored.expiresAt).getTime() <= Date.now()) {
            await store.remove(sub);
            res.status(401).json({
              error: "delegation_expired",
              message: "Delegation has expired. Please delegate access again.",
            });
            return;
          }

          access = await activateDelegation(node, cache, sub, stored.serialized);
          req.delegatedAccess = access;
          next();
        } catch (retryErr) {
          const retryMessage = retryErr instanceof Error ? retryErr.message : String(retryErr);
          console.error(`[delegation] activation failed after retry for ${sub}:`, retryErr);
          res.status(500).json({
            error: "delegation_activation_failed",
            message: `Failed to activate delegation after retry: ${retryMessage}`,
          });
        }

        return;
      }

      console.error(`[delegation] activation failed for ${sub}:`, err);
      res.status(500).json({
        error: "delegation_activation_failed",
        message: `Failed to activate delegation: ${message}`,
      });
    }
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

async function activateDelegation(
  node: TinyCloudNode,
  cache: DelegationCache,
  sub: string,
  serialized: string,
) {
  const delegation = deserializeDelegation(serialized);
  const access = await node.useDelegation(delegation);
  console.log(`[delegation] activated: sub=${sub} spaceId=${access.spaceId} path=${JSON.stringify(access.path)}`);
  cache.set(sub, access);
  return access;
}
