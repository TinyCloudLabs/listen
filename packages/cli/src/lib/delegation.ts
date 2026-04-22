import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import {
  deserializeDelegation,
  type DelegatedAccess,
  type PortableDelegation,
  type TinyCloudNode,
} from "@tinycloud/node-sdk";
import { writeError } from "./output.js";
import {
  isFresh,
  readSessionCache,
  writeSessionCache,
  type SessionCacheEntry,
} from "./session-cache.js";

export interface ActivatedDelegation {
  access: DelegatedAccess;
  delegation: PortableDelegation;
  fingerprint: string;
  cacheHit: boolean;
}

export function fingerprint(serialized: string): string {
  return createHash("sha256").update(serialized).digest("hex");
}

export function loadSerializedDelegation(path: string): string {
  if (!existsSync(path)) {
    writeError(
      "no_delegation",
      `Run Connect Agent in the app UI to grant a delegation. (expected file at ${path})`,
    );
  }
  return readFileSync(path, "utf-8").trim();
}

function expiryDate(d: PortableDelegation): Date | null {
  const raw = d.expiry as unknown;
  if (!raw) return null;
  if (raw instanceof Date) return raw;
  if (typeof raw === "string" || typeof raw === "number") return new Date(raw);
  return null;
}

export async function activateDelegation(
  node: TinyCloudNode,
  delegationPath: string,
  sessionCachePath: string,
): Promise<ActivatedDelegation> {
  const serialized = loadSerializedDelegation(delegationPath);
  const fp = fingerprint(serialized);
  const cache = readSessionCache(sessionCachePath);
  const cacheHit = isFresh(cache, fp);

  const delegation = deserializeDelegation(serialized);

  if (!cacheHit) {
    const exp = expiryDate(delegation);
    if (exp && exp.getTime() < Date.now()) {
      writeError(
        "expired_delegation",
        `Delegation expired at ${exp.toISOString()}. Re-run Connect Agent in the app UI.`,
      );
    }
  }

  const access = await node.useDelegation(delegation);

  const entry: SessionCacheEntry = {
    delegationFingerprint: fp,
    activatedAt: Date.now(),
    agentDid: node.did,
  };
  writeSessionCache(sessionCachePath, entry);

  return { access, delegation, fingerprint: fp, cacheHit };
}

export function peekDelegationExpiry(path: string): { expiresAt: string | null; expired: boolean } {
  if (!existsSync(path)) return { expiresAt: null, expired: false };
  try {
    const serialized = readFileSync(path, "utf-8").trim();
    const delegation = deserializeDelegation(serialized);
    const exp = expiryDate(delegation);
    if (!exp) return { expiresAt: null, expired: false };
    return { expiresAt: exp.toISOString(), expired: exp.getTime() < Date.now() };
  } catch {
    return { expiresAt: null, expired: false };
  }
}
