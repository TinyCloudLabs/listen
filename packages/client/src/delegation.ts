import {
  TinyCloudWeb,
  serializeDelegation,
  type ComposedManifestRequest,
  type PortableDelegation,
  type ResourceCapability,
} from "@tinycloud/web-sdk";
import { type DelegationResponse } from "@tinyboilerplate/core";

// ── Create Delegation ────────────────────────────────────────────────

const DELEGATION_BUNDLE_FORMAT = "tinyboilerplate.delegation-bundle";

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

  const permissionsBySpace = groupPermissionsBySpace(target.permissions);
  if (permissionsBySpace.size > 1) {
    const delegations: PortableDelegation[] = [];
    let prompted = false;

    for (const permissions of permissionsBySpace.values()) {
      const result = await tcw.delegateTo(target.did, permissions, { expiry: target.expiryMs });
      delegations.push(result.delegation);
      prompted ||= result.prompted;
    }

    return {
      serialized: serializeDelegationBundle(delegations),
      prompted,
    };
  }

  const result = await tcw.materializeDelegation(backendDID, capabilityRequest);
  return {
    serialized: serializeDelegation(result.delegation),
    prompted: result.prompted,
  };
}

export const createDelegation = createManifestDelegation;

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

// ── Send Delegation to Backend ───────────────────────────────────────

export async function sendDelegation(
  backendUrl: string,
  serialized: string,
  sessionToken: string,
): Promise<DelegationResponse> {
  const res = await fetch(`${backendUrl}/api/delegations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionToken}`,
      "X-Requested-With": "TinyBoilerplate",
    },
    body: JSON.stringify({ serialized }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "unknown", message: res.statusText }));
    throw new Error(`Failed to send delegation: ${err.message ?? err.error}`);
  }

  return res.json() as Promise<DelegationResponse>;
}

// ── Check Delegation Status ──────────────────────────────────────────

export async function checkDelegationStatus(
  backendUrl: string,
  sessionToken: string,
): Promise<DelegationResponse> {
  const res = await fetch(`${backendUrl}/api/delegations/status`, {
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "X-Requested-With": "TinyBoilerplate",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "unknown", message: res.statusText }));
    throw new Error(`Failed to check delegation status: ${err.message ?? err.error}`);
  }

  return res.json() as Promise<DelegationResponse>;
}

// ── Revoke Delegation ────────────────────────────────────────────────

export async function revokeDelegation(backendUrl: string, sessionToken: string): Promise<void> {
  const res = await fetch(`${backendUrl}/api/delegations`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "X-Requested-With": "TinyBoilerplate",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "unknown", message: res.statusText }));
    throw new Error(`Failed to revoke delegation: ${err.message ?? err.error}`);
  }
}
