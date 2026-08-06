import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import {
  delegationContentIdentity,
  type DelegationStore,
  type DelegationCache,
} from "@listen/server";
import {
  DEFAULT_DELEGATION_EXPIRY_MS,
  type ServerInfoPermission,
  type StoredDelegation,
} from "@listen/core";
import {
  backendDelegationPolicyHash,
  delegationCoversBackendPolicy,
  ownerDidFromAddress,
} from "../manifest.js";
import {
  DelegationActivationError,
  deserializePortableDelegationSet,
  portableDelegationExpiry,
  portableDelegations,
  type DelegationActivator,
  type PortableDelegationSet,
} from "../delegation-activation.js";
import { classifyStoredDelegation } from "../delegation-resolver.js";

// ── Types ────────────────────────────────────────────────────────────

interface DelegationRoutesConfig {
  did: string;
  store: DelegationStore;
  cache: DelegationCache;
  activator: DelegationActivator;
  authMiddleware: RequestHandler;
  writeLimiter?: RequestHandler;
}

/**
 * Minimum remaining lifetime a delegation must have at grant time. Freshly
 * minted delegations carry days of lifetime; anything at or below this margin
 * is already expired (or useless) and must not be stored. The SDK applies a
 * ~60s client-side safety margin when deriving delegations, so 30s here only
 * rejects genuinely stale grants.
 */
const GRANT_EXPIRY_MARGIN_MS = 30_000;

// ── Delegation Routes ────────────────────────────────────────────────

export function createDelegationRouter(config: DelegationRoutesConfig) {
  const { store, cache, activator, authMiddleware, writeLimiter } = config;
  const router = Router();

  // All delegation routes require authentication
  router.use(authMiddleware);

  // ── POST /api/delegations — receive + store delegation ─────────
  router.post("/", ...(writeLimiter ? [writeLimiter] : []), async (req: Request, res: Response) => {
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
      const delegation = deserializePortableDelegationSet(serialized);
      const resources = extractDelegationResources(delegation);
      const ownerDid = ownerDidFromAddress(address);

      if (!delegationCoversBackendPolicy(resources, config.did, ownerDid)) {
        throw new Error("Delegation does not cover the current backend permission policy");
      }

      // Extract metadata from the delegation itself
      const expiry = portableDelegationExpiry(delegation);
      if (expiry && expiry.getTime() <= Date.now() + GRANT_EXPIRY_MARGIN_MS) {
        res.status(400).json({
          error: "delegation_expired_at_grant",
          message:
            "Delegation is already expired or expires too soon to store. Create a fresh delegation and try again.",
        });
        return;
      }
      const expiresAt = expiry
        ? expiry.toISOString()
        : new Date(Date.now() + DEFAULT_DELEGATION_EXPIRY_MS).toISOString();

      // Store the delegation keyed by wallet address. A durable-store failure
      // is operational and must not look like an invalid owner grant.
      let stored: StoredDelegation;
      try {
        stored = await store.store(address, serialized, {
          expiresAt,
          actions: resources.flatMap((resource) => resource.actions),
          path: resources.map((resource) => `${resource.service}:${resource.path}`).join(","),
          resources,
          policyHash: backendDelegationPolicyHash(config.did, ownerDid),
        });
      } catch (storeErr) {
        console.error("[delegations] failed to store delegation:", storeErr);
        res.status(503).json({
          error: "delegation_store_unavailable",
          message: "Delegation storage is temporarily unavailable",
        });
        return;
      }
      activator.invalidate(address);
      cache.evict(address);

      const identity = delegationContentIdentity(stored.serialized);
      let activation: "active" | "pending" = "active";
      try {
        // Cache the active DelegatedAccess keyed by address when activation is available now.
        await activator.activate(address, stored.serialized, identity, stored.revision);
      } catch (activationErr) {
        activation = "pending";
        console.warn(
          "[delegations] stored delegation but activation is pending:",
          describeActivationError(activationErr),
        );
      }

      let current: StoredDelegation | null;
      try {
        current = await store.load(address);
      } catch (storeErr) {
        activator.invalidate(address, stored.revision);
        cache.evictIfRevision(address, stored.revision);
        console.error("[delegations] failed to confirm stored delegation:", storeErr);
        res.status(503).json({
          error: "delegation_store_unavailable",
          message: "Delegation storage is temporarily unavailable",
        });
        return;
      }
      if (current?.revision !== stored.revision) {
        activator.invalidate(address, stored.revision);
        cache.evictIfRevision(address, stored.revision);
        res.status(409).json({
          error: "delegation_superseded",
          message: "Delegation was replaced or removed before activation completed",
        });
        return;
      }

      res.json({
        status: "active",
        expiresAt,
        activation,
      });
    } catch (err) {
      console.error("[delegations] failed to process delegation:", err);
      res.status(400).json({
        error: "invalid_delegation",
        message: "Failed to process delegation",
      });
    }
  });

  // ── DELETE /api/delegations — revoke delegation ────────────────
  router.delete(
    "/",
    ...(writeLimiter ? [writeLimiter] : []),
    async (req: Request, res: Response) => {
      if (!req.user) {
        res.status(401).json({ error: "unauthenticated", message: "Authentication required" });
        return;
      }
      const { address } = req.user;

      try {
        activator.invalidate(address);
        await store.remove(address);
        activator.invalidate(address);
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
    },
  );

  // ── GET /api/delegations/status — check delegation status ─────
  router.get("/status", async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthenticated", message: "Authentication required" });
      return;
    }
    const { address } = req.user;

    try {
      const classification = classifyStoredDelegation(
        await store.load(address),
        backendDelegationPolicyHash(config.did, ownerDidFromAddress(address)),
      );

      if (classification.kind === "none") {
        res.json({
          status: "none",
          expiresAt: null,
        });
        return;
      }

      if (classification.kind === "expired") {
        activator.invalidate(address, classification.stored.revision);
        cache.evictIfRevision(address, classification.stored.revision);

        res.json({
          status: "expired",
          expiresAt: classification.stored.expiresAt,
        });
        return;
      }

      if (classification.kind === "stale") {
        activator.invalidate(address, classification.stored.revision);
        cache.evictIfRevision(address, classification.stored.revision);

        // A stale row is evidence of a prior grant, so surface it as "stale"
        // (not "none") — the frontend renews unconditionally on stale.
        res.json({
          status: "stale",
          expiresAt: classification.stored.expiresAt,
        });
        return;
      }

      res.json({
        status: "active",
        expiresAt: classification.stored.expiresAt,
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

function describeActivationError(err: unknown) {
  if (err instanceof DelegationActivationError) {
    return {
      message: err.message,
      resource: err.resource,
      cause: err.cause instanceof Error ? err.cause.message : String(err.cause),
    };
  }

  return err;
}

function extractDelegationResources(delegation: PortableDelegationSet): ServerInfoPermission[] {
  return portableDelegations(delegation).flatMap(extractSingleDelegationResources);
}

function extractSingleDelegationResources(delegation: {
  resources?: unknown;
}): ServerInfoPermission[] {
  if (!Array.isArray(delegation.resources)) return [];

  return delegation.resources.flatMap((resource) => {
    if (
      typeof resource !== "object" ||
      resource === null ||
      !("service" in resource) ||
      !("path" in resource) ||
      !("actions" in resource)
    ) {
      return [];
    }

    const entry = resource as {
      service?: unknown;
      space?: unknown;
      path?: unknown;
      actions?: unknown;
    };

    if (
      typeof entry.service !== "string" ||
      typeof entry.path !== "string" ||
      !Array.isArray(entry.actions) ||
      !entry.actions.every((action) => typeof action === "string")
    ) {
      return [];
    }

    const service = normalizeDelegationService(entry.service);
    const space =
      service === "tinycloud.encryption"
        ? "encryption"
        : typeof entry.space === "string"
          ? normalizeDelegationSpace(entry.space)
          : undefined;

    return [
      {
        service,
        ...(space !== undefined ? { space } : {}),
        path: entry.path,
        actions: entry.actions.map((action) => normalizeDelegationAction(action, service)),
      },
    ];
  });
}

function normalizeDelegationService(service: string): string {
  return service.startsWith("tinycloud.") ? service : `tinycloud.${service}`;
}

function normalizeDelegationSpace(space: string): string {
  const parts = space.split(":");
  return parts.at(-1) || space;
}

function normalizeDelegationAction(action: string, service: string): string {
  return action.includes("/") ? action : `${service}/${action}`;
}
