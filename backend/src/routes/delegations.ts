import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import type { TinyCloudNode } from "@tinycloud/node-sdk";
import type { DelegationStore, DelegationCache } from "@listen/server";
import { DEFAULT_DELEGATION_EXPIRY_MS, type ServerInfoPermission } from "@listen/core";
import { backendDelegationPolicyHash, delegationCoversBackendPolicy } from "../manifest.js";
import {
  activatePortableDelegation,
  deserializePortableDelegationSet,
  portableDelegationExpiry,
  portableDelegations,
  type PortableDelegationSet,
} from "../delegation-activation.js";

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
      const delegation = deserializePortableDelegationSet(serialized);
      const resources = extractDelegationResources(delegation);

      if (!delegationCoversBackendPolicy(resources, config.did)) {
        throw new Error("Delegation does not cover the current backend permission policy");
      }

      // Activate the delegation to verify it works
      const access = await activatePortableDelegation(node, delegation);

      // Extract metadata from the delegation itself
      const expiry = portableDelegationExpiry(delegation);
      const expiresAt = expiry
        ? expiry.toISOString()
        : new Date(Date.now() + DEFAULT_DELEGATION_EXPIRY_MS).toISOString();

      // Store the delegation keyed by wallet address
      await store.store(address, serialized, {
        expiresAt,
        actions: resources.flatMap((resource) => resource.actions),
        path: resources.map((resource) => `${resource.service}:${resource.path}`).join(","),
        resources,
        policyHash: backendDelegationPolicyHash(config.did),
      });

      // Cache the active DelegatedAccess keyed by address
      cache.set(address, access);

      res.json({
        status: "active",
        expiresAt,
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

      if (stored.policyHash !== backendDelegationPolicyHash(config.did)) {
        await store.remove(address);
        cache.evict(address);

        res.json({
          status: "none",
          expiresAt: null,
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

    return [
      {
        service,
        ...(typeof entry.space === "string"
          ? { space: normalizeDelegationSpace(entry.space) }
          : {}),
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
