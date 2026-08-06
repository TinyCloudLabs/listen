import type { Request, Response, NextFunction } from "express";
import type { DelegationStore, DelegationCache } from "@listen/server";
import { backendDelegationPolicyHash, ownerDidFromAddress } from "../manifest.js";
import type { DelegationActivator } from "../delegation-activation.js";
import { TINY_CLOUD_OPERATION_TIMEOUT_MS } from "./timeout.js";
import {
  createDelegationResolver,
  type DelegatedAccessResolution,
} from "../delegation-resolver.js";

interface DelegationMiddlewareConfig {
  store: DelegationStore;
  cache: DelegationCache;
  activator: DelegationActivator;
  backendDid: string;
  activationTimeoutMs?: number;
}

export function createDelegationMiddleware(config: DelegationMiddlewareConfig) {
  const resolver = createDelegationResolver({
    store: config.store,
    cache: config.cache,
    activator: config.activator,
    policyHashForAddress: (address) =>
      backendDelegationPolicyHash(config.backendDid, ownerDidFromAddress(address)),
  });

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

    try {
      const activationTimeoutMs = config.activationTimeoutMs ?? TINY_CLOUD_OPERATION_TIMEOUT_MS;
      let result = await resolver.resolve(address, { activationTimeoutMs });
      if (result.kind === "failed" && isUnauthorized(result.error)) {
        config.activator.invalidate(address, result.stored.revision);
        config.cache.evictIfRevision(address, result.stored.revision);
        result = await resolver.resolve(address, { activationTimeoutMs });
      }

      handleResolution(result, req, res, next, address);
    } catch (err) {
      console.error(`[delegation] failed to resolve ${address}:`, err);
      res.status(503).json({
        error: "delegation_unavailable",
        message: "Failed to resolve delegation",
      });
    }
  };
}

function handleResolution(
  result: DelegatedAccessResolution,
  req: Request,
  res: Response,
  next: NextFunction,
  address: string,
): void {
  switch (result.kind) {
    case "active":
      req.delegatedAccess = result.access;
      next();
      return;
    case "none":
      res.status(403).json({
        error: "no_delegation",
        message: "No delegation found. Please delegate access from the frontend.",
      });
      return;
    case "expired":
      res.status(401).json({
        error: "delegation_expired",
        message: "Delegation has expired. Please delegate access again.",
      });
      return;
    case "stale":
      res.status(403).json({
        error: "delegation_stale",
        message: "Delegation permissions are stale. Please sign in again.",
      });
      return;
    case "timeout":
      console.error(`[delegation] activation timed out for ${address}:`, result.error);
      res.status(504).json({
        error: "gateway_timeout",
        message: "TinyCloud operation timed out",
      });
      return;
    case "failed":
      console.error(`[delegation] activation failed for ${address}:`, result.error);
      res.status(500).json({
        error: "delegation_activation_failed",
        message: "Failed to activate delegation",
      });
      return;
  }
}

function isUnauthorized(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /401|unauthorized/i.test(message);
}
