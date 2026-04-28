import {
  TinyCloudWeb,
  serializeDelegation,
  type ComposedManifestRequest,
} from "@tinycloud/web-sdk";
import { type DelegationResponse } from "@tinyboilerplate/core";

// ── Create Delegation ────────────────────────────────────────────────

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

  const result = await tcw.materializeDelegation(backendDID, capabilityRequest);
  return {
    serialized: serializeDelegation(result.delegation),
    prompted: result.prompted,
  };
}

export const createDelegation = createManifestDelegation;

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
