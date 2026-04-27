import { TinyCloudWeb, serializeDelegation, type PermissionEntry } from "@tinycloud/web-sdk";
import {
  DEFAULT_DELEGATION_ACTIONS,
  DEFAULT_DELEGATION_EXPIRY_MS,
  DEFAULT_DELEGATION_PATH,
  type DelegationResponse,
  type ServerInfoPermission,
} from "@tinyboilerplate/core";

// ── Configuration ────────────────────────────────────────────────────

export interface DelegationOptions {
  actions?: string[];
  path?: string;
  expiryMs?: number;
}

// ── Create Delegation ────────────────────────────────────────────────

/**
 * Legacy single-(path, actions) delegation helper.
 *
 * Prefer {@link createManifestDelegation} for manifest-driven flows —
 * that variant takes a `PermissionEntry[]` and goes through
 * `tcw.delegateTo`, which issues the delegation via the session-key
 * UCAN path (no wallet prompt) when the requested caps are a subset
 * of the current session's recap.
 *
 * This function stays for backwards compat; it still calls the legacy
 * `tcw.createDelegation` which will wallet-prompt if the caps exceed
 * the current session.
 */
export async function createDelegation(
  tcw: TinyCloudWeb,
  backendDID: string,
  options?: DelegationOptions,
): Promise<string> {
  const actions = options?.actions ? [...options.actions] : [...DEFAULT_DELEGATION_ACTIONS];
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

/**
 * Manifest-driven delegation helper.
 *
 * Takes the backend permissions resolved from the app manifest and calls
 * `tcw.delegateTo` to issue a single multi-resource UCAN covering all of
 * them. When the requested caps are a subset of the current session's recap
 * (the normal case when the manifest was installed at sign-in with the same
 * backend delegation), no wallet prompt is shown — `result.prompted` will be
 * `false`.
 *
 * Returns the serialized delegation ready for POST to the backend's
 * `/api/delegations` endpoint.
 */
export async function createManifestDelegation(
  tcw: TinyCloudWeb,
  backendDID: string,
  permissions: readonly ServerInfoPermission[],
): Promise<{ serialized: string; prompted: boolean }> {
  if (permissions.length === 0) {
    throw new Error(
      "createManifestDelegation: backend permissions list is empty — nothing to delegate",
    );
  }

  // Convert ServerInfoPermission[] → PermissionEntry[]. The shapes are
  // identical in practice; we copy the action list so the SDK can't
  // accidentally mutate the caller's data.
  const entries: PermissionEntry[] = permissions.map((p) => ({
    service: p.service,
    space: p.space,
    path: p.path,
    actions: [...p.actions],
  }));

  const result = await tcw.delegateTo(backendDID, entries);
  return {
    serialized: serializeDelegation(result.delegation),
    prompted: result.prompted,
  };
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
