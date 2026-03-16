import { TinyCloudWeb, serializeDelegation } from "@tinycloud/web-sdk";
import {
  DEFAULT_DELEGATION_ACTIONS,
  DEFAULT_DELEGATION_EXPIRY_MS,
  DEFAULT_DELEGATION_PATH,
  type DelegationResponse,
} from "@tinyboilerplate/core";

// ── Configuration ────────────────────────────────────────────────────

export interface DelegationOptions {
  /** KV/SQL actions to grant. Defaults to DEFAULT_DELEGATION_ACTIONS. */
  actions?: string[];
  /** Path scope for the delegation. Defaults to DEFAULT_DELEGATION_PATH. */
  path?: string;
  /** Expiry in milliseconds from now. Defaults to DEFAULT_DELEGATION_EXPIRY_MS (7 days). */
  expiryMs?: number;
}

// ── Create Delegation ────────────────────────────────────────────────

/**
 * Create a portable delegation from the signed-in user to the backend DID.
 * Returns the serialized delegation string ready to send to the backend.
 *
 * IMPORTANT: `tcw.did` must be the primary DID (user is signed in).
 * `backendDID` is the server's DID obtained from GET /api/server-info.
 */
export async function createDelegation(
  tcw: TinyCloudWeb,
  backendDID: string,
  options?: DelegationOptions,
): Promise<string> {
  const actions = options?.actions
    ? [...options.actions]
    : [...DEFAULT_DELEGATION_ACTIONS];
  const path = options?.path ?? DEFAULT_DELEGATION_PATH;
  const expiryMs = options?.expiryMs ?? DEFAULT_DELEGATION_EXPIRY_MS;

  const delegation = await tcw.createDelegation({
    delegateDID: backendDID,
    path,
    actions,
    expiryMs,
  });

  return serializeDelegation(delegation);
}

// ── Send Delegation to Backend ───────────────────────────────────────

/**
 * POST the serialized delegation to the backend so it can act on the user's behalf.
 */
export async function sendDelegation(
  backendUrl: string,
  serialized: string,
  accessToken: string,
  userAddress?: string,
): Promise<DelegationResponse> {
  const res = await fetch(`${backendUrl}/api/delegations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(userAddress ? { "X-User-Address": userAddress } : {}),
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

/**
 * Check whether the backend already has an active delegation for the current user.
 */
export async function checkDelegationStatus(
  backendUrl: string,
  accessToken: string,
  userAddress?: string,
): Promise<DelegationResponse> {
  const res = await fetch(`${backendUrl}/api/delegations/status`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(userAddress ? { "X-User-Address": userAddress } : {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "unknown", message: res.statusText }));
    throw new Error(`Failed to check delegation status: ${err.message ?? err.error}`);
  }

  return res.json() as Promise<DelegationResponse>;
}

// ── Revoke Delegation ────────────────────────────────────────────────

/**
 * Revoke the backend's delegation for the current user.
 */
export async function revokeDelegation(
  backendUrl: string,
  accessToken: string,
  userAddress?: string,
): Promise<void> {
  const res = await fetch(`${backendUrl}/api/delegations`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(userAddress ? { "X-User-Address": userAddress } : {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "unknown", message: res.statusText }));
    throw new Error(`Failed to revoke delegation: ${err.message ?? err.error}`);
  }
}
