import { TinyCloudWeb, serializeDelegation } from "@tinycloud/web-sdk";
import {
  DEFAULT_DELEGATION_ACTIONS,
  DEFAULT_DELEGATION_EXPIRY_MS,
  DEFAULT_DELEGATION_PATH,
  type DelegationResponse,
} from "@tinyboilerplate/core";

// ── Configuration ────────────────────────────────────────────────────

export interface DelegationOptions {
  actions?: string[];
  path?: string;
  expiryMs?: number;
}

// ── Create Delegation ────────────────────────────────────────────────

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

export async function sendDelegation(
  backendUrl: string,
  serialized: string,
  accessToken: string,
): Promise<DelegationResponse> {
  const res = await fetch(`${backendUrl}/api/delegations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
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
  accessToken: string,
): Promise<DelegationResponse> {
  const res = await fetch(`${backendUrl}/api/delegations/status`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "unknown", message: res.statusText }));
    throw new Error(`Failed to check delegation status: ${err.message ?? err.error}`);
  }

  return res.json() as Promise<DelegationResponse>;
}

// ── Revoke Delegation ────────────────────────────────────────────────

export async function revokeDelegation(
  backendUrl: string,
  accessToken: string,
): Promise<void> {
  const res = await fetch(`${backendUrl}/api/delegations`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "unknown", message: res.statusText }));
    throw new Error(`Failed to revoke delegation: ${err.message ?? err.error}`);
  }
}
