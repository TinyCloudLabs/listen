import type { DelegatedAccess } from "@listen/server";
import type { DelegatedAccessResolution } from "./delegation-resolver.js";

export interface OwnerAddressReadResult {
  ok?: unknown;
  data?: unknown;
  error?: { code?: unknown; message?: unknown };
}

export type GoogleMeetDelegationLookup =
  | DelegatedAccess
  | { access: null; reason: "no_delegation" | "delegation_unavailable" };

export type OwnerAddressDelegationLookup =
  | { access: DelegatedAccess; reason: "ready" }
  | { access: null; reason: "no_delegation" | "delegation_unavailable" };

const NOT_FOUND_CODES = new Set(["key_not_found", "not_found", "kv_not_found"]);

function isNotFound(result: unknown): boolean {
  if (!result || typeof result !== "object") return false;
  const code = (result as OwnerAddressReadResult).error?.code;
  return typeof code === "string" && NOT_FOUND_CODES.has(code.toLowerCase());
}

function unavailable(): { access: null; reason: "delegation_unavailable" } {
  return { access: null, reason: "delegation_unavailable" };
}

export async function resolveOwnerAddressDelegation(config: {
  readOwnerAddress: () => Promise<unknown>;
  resolve: (address: string) => Promise<DelegatedAccessResolution>;
}): Promise<OwnerAddressDelegationLookup> {
  let addressResult: unknown;
  try {
    addressResult = await config.readOwnerAddress();
  } catch {
    return unavailable();
  }

  if (
    !addressResult ||
    typeof addressResult !== "object" ||
    (addressResult as OwnerAddressReadResult).ok !== true
  ) {
    return isNotFound(addressResult) ? { access: null, reason: "no_delegation" } : unavailable();
  }

  const payload = (addressResult as OwnerAddressReadResult).data;
  if (!payload || typeof payload !== "object" || !("data" in payload)) return unavailable();
  const rawAddress = (payload as { data?: unknown }).data;
  if (rawAddress === null) return { access: null, reason: "no_delegation" };
  if (typeof rawAddress !== "string" || rawAddress.trim() === "") return unavailable();

  let resolution: DelegatedAccessResolution;
  try {
    resolution = await config.resolve(rawAddress);
  } catch {
    return unavailable();
  }

  if (resolution.kind === "active") {
    return resolution.access ? { access: resolution.access, reason: "ready" } : unavailable();
  }
  if (resolution.kind === "none" || resolution.kind === "expired" || resolution.kind === "stale") {
    return { access: null, reason: "no_delegation" };
  }
  return unavailable();
}

/** Preserve the Google Meet adapter's legacy bare-access success shape. */
export async function resolveGoogleMeetDelegation(config: {
  readOwnerAddress: () => Promise<unknown>;
  resolve: (address: string) => Promise<DelegatedAccessResolution>;
}): Promise<GoogleMeetDelegationLookup> {
  const result = await resolveOwnerAddressDelegation(config);
  return result.reason === "ready" ? result.access : result;
}
