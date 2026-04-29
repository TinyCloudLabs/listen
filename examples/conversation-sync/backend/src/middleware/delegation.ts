import type { Request, Response, NextFunction } from "express";
import type { TinyCloudNode } from "@tinycloud/node-sdk";
import { deserializeDelegation } from "@tinycloud/node-sdk";
import type { DelegationStore, DelegationCache } from "@tinyboilerplate/server";
import { withTimeout } from "./timeout.js";
import { backendDelegationPolicyHash } from "../manifest.js";
import { activatePortableDelegation } from "../delegation-activation.js";

// ── Types ────────────────────────────────────────────────────────────

interface DelegationMiddlewareConfig {
  node: TinyCloudNode;
  store: DelegationStore;
  cache: DelegationCache;
}

// ── Delegation Middleware Factory ────────────────────────────────────

/**
 * Creates Express middleware that:
 * 1. Runs AFTER auth middleware (requires req.user.address)
 * 2. Looks up DelegatedAccess from cache by wallet address
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

    const { address } = user;

    // Check cache first
    let access = cache.get(address);

    if (access) {
      req.delegatedAccess = access;
      next();
      return;
    }

    // Cache miss — load from persistent store
    try {
      const stored = await store.load(address);

      if (!stored) {
        res.status(403).json({
          error: "no_delegation",
          message: "No delegation found. Please delegate access from the frontend.",
        });
        return;
      }

      // Check expiry
      if (new Date(stored.expiresAt).getTime() <= Date.now()) {
        await store.remove(address);
        res.status(401).json({
          error: "delegation_expired",
          message: "Delegation has expired. Please delegate access again.",
        });
        return;
      }

      if (stored.policyHash !== backendDelegationPolicyHash()) {
        await store.remove(address);
        cache.evict(address);
        res.status(403).json({
          error: "delegation_stale",
          message: "Delegation permissions are stale. Please sign in again.",
        });
        return;
      }

      // Deserialize and activate the delegation
      access = await withTimeout(activateDelegation(node, cache, address, stored.serialized));
      req.delegatedAccess = access;
      next();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      // If timed out, return 504
      if (message.includes("timed out")) {
        console.error(`[delegation] activation timed out for ${address}:`, err);
        res.status(504).json({
          error: "gateway_timeout",
          message: "TinyCloud operation timed out",
        });
        return;
      }

      // If TinyCloud returns 401, evict cache and retry once
      if (
        message.includes("401") ||
        message.includes("Unauthorized") ||
        message.includes("unauthorized")
      ) {
        cache.evict(address);

        try {
          const stored = await store.load(address);
          if (!stored) {
            res.status(403).json({
              error: "no_delegation",
              message: "No delegation found after retry.",
            });
            return;
          }

          if (new Date(stored.expiresAt).getTime() <= Date.now()) {
            await store.remove(address);
            res.status(401).json({
              error: "delegation_expired",
              message: "Delegation has expired. Please delegate access again.",
            });
            return;
          }

          if (stored.policyHash !== backendDelegationPolicyHash()) {
            await store.remove(address);
            cache.evict(address);
            res.status(403).json({
              error: "delegation_stale",
              message: "Delegation permissions are stale. Please sign in again.",
            });
            return;
          }

          access = await withTimeout(activateDelegation(node, cache, address, stored.serialized));
          req.delegatedAccess = access;
          next();
        } catch (retryErr) {
          const retryMessage = retryErr instanceof Error ? retryErr.message : String(retryErr);
          const isTimeout = retryMessage.includes("timed out");
          console.error(`[delegation] activation failed after retry for ${address}:`, retryErr);
          res.status(isTimeout ? 504 : 500).json({
            error: isTimeout ? "gateway_timeout" : "delegation_activation_failed",
            message: isTimeout ? "TinyCloud operation timed out" : "Failed to activate delegation",
          });
        }

        return;
      }

      console.error(`[delegation] activation failed for ${address}:`, err);
      res.status(500).json({
        error: "delegation_activation_failed",
        message: "Failed to activate delegation",
      });
    }
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

async function activateDelegation(
  node: TinyCloudNode,
  cache: DelegationCache,
  address: string,
  serialized: string,
) {
  const delegation = deserializeDelegation(serialized);
  const access = await activatePortableDelegation(node, delegation);
  console.log(
    `[delegation] activated: address=${address} spaceId=${access.spaceId} path=${JSON.stringify(access.path)}`,
  );
  cache.set(address, access);
  return access;
}
