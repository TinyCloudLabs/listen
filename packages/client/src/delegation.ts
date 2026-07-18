import {
  TinyCloudWeb,
  serializeDelegation,
  type ComposedManifestRequest,
  type PortableDelegation,
  type ResourceCapability,
} from "@tinycloud/web-sdk";
import { type DelegationResponse, type ServerInfoPermission } from "@listen/core";
import { ApiRequestError } from "./api.js";
import { listenDebugFetch, listenDebugLog } from "./debug.js";
import { normalizeMissingParentDelegationError } from "./missing-parent.js";

// ── Create Delegation ────────────────────────────────────────────────

const DELEGATION_BUNDLE_FORMAT = "listen.delegation-bundle";

interface DelegationBundle {
  format: typeof DELEGATION_BUNDLE_FORMAT;
  version: 1;
  delegations: string[];
}

/**
 * Manifest-driven delegation helper.
 *
 * Takes the composed capability request signed at login and asks the SDK to
 * materialize the backend's manifest-declared delegation. Delivery to the
 * backend remains app logic.
 *
 * Returns the serialized delegation ready for POST to the backend's
 * `/api/delegations` endpoint.
 */
export async function createManifestDelegation(
  tcw: TinyCloudWeb,
  backendDID: string,
  capabilityRequest: ComposedManifestRequest,
): Promise<{ serialized: string; prompted: boolean }> {
  if (capabilityRequest.delegationTargets.length === 0) {
    throw new Error(
      "createManifestDelegation: backend permissions list is empty — nothing to delegate",
    );
  }

  const target = capabilityRequest.delegationTargets.find((entry) => entry.did === backendDID);
  if (!target) {
    throw new Error(`No manifest delegation target found for DID ${backendDID}`);
  }

  // ReCap parsing represents one resource/action pair per entry, while
  // composed manifests may keep several actions on one resource. Split the
  // requested actions so the SDK's subset check compares equivalent shapes.
  const permissionsBySpace = groupPermissionsBySpace(
    normalizeDelegationPermissions(target.permissions),
  );
  const delegations: PortableDelegation[] = [];
  let prompted = false;

  for (const permissions of permissionsBySpace.values()) {
    const result = await delegationOperation(() =>
      tcw.delegateTo(target.did, permissions, { expiry: target.expiryMs }),
    );
    delegations.push(result.delegation);
    prompted ||= result.prompted;
  }

  return {
    serialized: serializeDelegationBundle(delegations),
    prompted,
  };
}

export const createDelegation = createManifestDelegation;

/**
 * Build a backend delegation from an explicit permission list.
 *
 * This is used for source-specific access that should be requested after the
 * user opts into a connector, while preserving the core backend permissions
 * that were part of initial sign-in.
 */
export async function createPermissionDelegation(
  tcw: TinyCloudWeb,
  backendDID: string,
  permissions: readonly (ResourceCapability | ServerInfoPermission)[],
  options?: { expiryMs?: number },
): Promise<{ serialized: string; prompted: boolean }> {
  if (permissions.length === 0) {
    throw new Error("createPermissionDelegation: permissions list is empty");
  }

  const resourcePermissions = normalizeDelegationPermissions(permissions.map(toResourceCapability));
  const permissionsBySpace = groupPermissionsBySpace(resourcePermissions);
  const delegations: PortableDelegation[] = [];
  let prompted = false;

  for (const groupedPermissions of permissionsBySpace.values()) {
    const result = await delegationOperation(() =>
      tcw.delegateTo(backendDID, groupedPermissions, {
        expiry: options?.expiryMs,
      }),
    );
    delegations.push(result.delegation);
    prompted ||= result.prompted;
  }

  return {
    serialized: serializeDelegationBundle(delegations),
    prompted,
  };
}

function toResourceCapability(
  permission: ResourceCapability | ServerInfoPermission,
): ResourceCapability {
  const capability = {
    service: permission.service,
    path: permission.path,
    actions: [...permission.actions],
    ...(permission.description !== undefined ? { description: permission.description } : {}),
  };

  return permission.space !== undefined
    ? ({ ...capability, space: permission.space } as ResourceCapability)
    : (capability as ResourceCapability);
}

function dedupePermissions(permissions: readonly ResourceCapability[]): ResourceCapability[] {
  const seen = new Set<string>();
  const deduped: ResourceCapability[] = [];

  for (const permission of permissions) {
    const key = JSON.stringify({
      service: permission.service,
      space: permission.space ?? null,
      path: permission.path,
      actions: [...permission.actions].sort(),
    });
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(permission);
  }

  return deduped;
}

function normalizeDelegationPermissions(
  permissions: readonly ResourceCapability[],
): ResourceCapability[] {
  return dedupePermissions(
    permissions.flatMap((permission) =>
      permission.actions.map((action) => ({ ...permission, actions: [action] })),
    ),
  );
}

function groupPermissionsBySpace(
  permissions: readonly ResourceCapability[],
): Map<string, ResourceCapability[]> {
  const grouped = new Map<string, ResourceCapability[]>();

  for (const permission of permissions) {
    const key = permission.space;
    const existing = grouped.get(key);
    if (existing) {
      existing.push(permission);
    } else {
      grouped.set(key, [permission]);
    }
  }

  return grouped;
}

function serializeDelegationBundle(delegations: readonly PortableDelegation[]): string {
  if (delegations.length === 1) return serializeDelegation(delegations[0]);

  const bundle: DelegationBundle = {
    format: DELEGATION_BUNDLE_FORMAT,
    version: 1,
    delegations: delegations.map((delegation) => serializeDelegation(delegation)),
  };

  return JSON.stringify(bundle);
}

async function delegationOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const missing =
      typeof error === "object" &&
      error !== null &&
      Array.isArray((error as { missing?: unknown }).missing)
        ? (error as { missing: unknown[] }).missing
        : undefined;
    listenDebugLog("delegation.materialize", "failed", {
      error: error instanceof Error ? error.message : String(error),
      ...(missing ? { missing } : {}),
    });
    throw normalizeMissingParentDelegationError(error);
  }
}

// ── Send Delegation to Backend ───────────────────────────────────────

export async function sendDelegation(
  backendUrl: string,
  serialized: string,
  sessionToken: string,
): Promise<DelegationResponse> {
  const path = "/api/delegations";
  const res = await listenDebugFetch(
    `${backendUrl}${path}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
        "X-Requested-With": "Listen",
      },
      body: JSON.stringify({ serialized }),
    },
    { client: "delegation", method: "POST", path },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "unknown", message: res.statusText }));
    const error = new ApiRequestError(
      res.status,
      err.error,
      `Failed to send delegation: ${err.message ?? err.error}`,
    );
    const context = {
      error,
      body: err,
    };
    const normalized = normalizeMissingParentDelegationError(context);
    throw normalized === context ? error : normalized;
  }

  return res.json() as Promise<DelegationResponse>;
}

// ── Check Delegation Status ──────────────────────────────────────────

export async function checkDelegationStatus(
  backendUrl: string,
  sessionToken: string,
): Promise<DelegationResponse> {
  const path = "/api/delegations/status";
  const res = await listenDebugFetch(
    `${backendUrl}${path}`,
    {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "X-Requested-With": "Listen",
      },
    },
    { client: "delegation", method: "GET", path },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "unknown", message: res.statusText }));
    throw new ApiRequestError(
      res.status,
      err.error,
      `Failed to check delegation status: ${err.message ?? err.error}`,
    );
  }

  return res.json() as Promise<DelegationResponse>;
}

// ── Revoke Delegation ────────────────────────────────────────────────

export async function revokeDelegation(backendUrl: string, sessionToken: string): Promise<void> {
  const path = "/api/delegations";
  const res = await listenDebugFetch(
    `${backendUrl}${path}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "X-Requested-With": "Listen",
      },
    },
    { client: "delegation", method: "DELETE", path },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "unknown", message: res.statusText }));
    throw new Error(`Failed to revoke delegation: ${err.message ?? err.error}`);
  }
}
