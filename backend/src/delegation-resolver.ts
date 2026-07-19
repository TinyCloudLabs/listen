import type { DelegationCache, DelegationStore } from "@listen/server";
import type { StoredDelegation } from "@listen/core";
import { delegationContentIdentity } from "@listen/server";
import type { DelegatedAccess, DelegationActivator } from "./delegation-activation.js";
import { TinyCloudOperationTimeoutError, withTimeout } from "./middleware/timeout.js";

export type StoredDelegationClassification =
  | { kind: "none" }
  | { kind: "expired"; stored: StoredDelegation }
  | { kind: "stale"; stored: StoredDelegation }
  | { kind: "valid"; stored: StoredDelegation; identity: string };

export function classifyStoredDelegation(
  stored: StoredDelegation | null,
  expectedPolicyHash: string,
  now = Date.now(),
): StoredDelegationClassification {
  if (!stored) return { kind: "none" };
  if (new Date(stored.expiresAt).getTime() <= now) return { kind: "expired", stored };
  if (stored.policyHash !== expectedPolicyHash) return { kind: "stale", stored };
  return {
    kind: "valid",
    stored,
    identity: delegationContentIdentity(stored.serialized),
  };
}

export type DelegatedAccessResolution =
  | { kind: "none" }
  | { kind: "expired"; stored: StoredDelegation }
  | { kind: "stale"; stored: StoredDelegation }
  | { kind: "active"; stored: StoredDelegation; access: DelegatedAccess }
  | { kind: "timeout"; stored: StoredDelegation; error: unknown }
  | { kind: "failed"; stored: StoredDelegation; error: unknown };

interface DelegationResolverConfig {
  store: DelegationStore;
  cache: DelegationCache;
  activator: DelegationActivator;
  policyHashForAddress: (address: string) => string;
}

interface ResolveOptions {
  activationTimeoutMs?: number;
}

export function createDelegationResolver(config: DelegationResolverConfig) {
  const resolve = async (
    address: string,
    options: ResolveOptions = {},
    replacementAttempt = 0,
  ): Promise<DelegatedAccessResolution> => {
    const classification = classifyStoredDelegation(
      await config.store.load(address),
      config.policyHashForAddress(address),
    );

    if (classification.kind !== "valid") {
      // Classification is a read. A delayed expired/stale/none snapshot may
      // race a newer POST, so it must not mutate activation or cache state.
      return classification;
    }

    const { stored, identity } = classification;
    const cached = config.cache.get(address, identity, stored.revision);
    if (cached) return { kind: "active", stored, access: cached };

    try {
      const activation = config.activator.activate(
        address,
        stored.serialized,
        identity,
        stored.revision,
      );
      const access =
        options.activationTimeoutMs === undefined
          ? await activation
          : await withTimeout(activation, options.activationTimeoutMs);

      // A POST may replace the row while activation is in progress. Do not
      // allow the old activation to become authoritative for this request.
      const current = await config.store.load(address);
      if (current?.revision !== stored.revision) {
        evictObservedCache(config.cache, address, stored.revision);
        if (replacementAttempt >= 2) {
          return {
            kind: "failed",
            stored,
            error: new Error("Delegation was replaced repeatedly during activation"),
          };
        }
        return resolve(address, options, replacementAttempt + 1);
      }

      return { kind: "active", stored, access };
    } catch (error) {
      if (error instanceof TinyCloudOperationTimeoutError) {
        return { kind: "timeout", stored, error };
      }
      evictObservedCache(config.cache, address, stored.revision);
      return { kind: "failed", stored, error };
    }
  };

  return { resolve };
}

function evictObservedCache(cache: DelegationCache, address: string, revision: string): void {
  cache.evictIfRevision(address, revision);
}
