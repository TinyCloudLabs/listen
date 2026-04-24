import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { DelegatedAccess, PortableDelegation } from "@tinycloud/node-sdk";

/**
 * Handles needed to rehydrate an activated delegation via
 * TinyCloudNode.restoreSession(). Mirrors the shape the SDK exposes in
 * DelegatedAccess.restorable once SDK PR #196 lands + publishes; until
 * then we extract via the shim in `extractRestorable`.
 */
export interface RestorableSession {
  delegationHeader: { Authorization: string };
  delegationCid: string;
  spaceId: string;
  jwk: object;
  verificationMethod: string;
  address: string;
  chainId: number;
}

/**
 * Shim — remove and replace with `access.restorable` once the consuming
 * @tinycloud/node-sdk version includes the `restorable` getter from
 * https://github.com/TinyCloudLabs/js-sdk/pull/196.
 */
export function extractRestorable(access: DelegatedAccess): RestorableSession {
  const anyAccess = access as unknown as {
    restorable?: RestorableSession;
    session?: RestorableSession;
  };
  if (anyAccess.restorable) return anyAccess.restorable;
  const session = anyAccess.session;
  if (!session)
    throw new Error(
      "DelegatedAccess exposes neither .restorable nor .session — SDK version mismatch",
    );
  return {
    delegationHeader: session.delegationHeader,
    delegationCid: session.delegationCid,
    spaceId: session.spaceId,
    jwk: session.jwk,
    verificationMethod: session.verificationMethod,
    address: session.address,
    chainId: session.chainId,
  };
}

export interface ProfileSynthesisInput {
  profilesRoot: string; // e.g. /root/.tinycloud
  profileName: string; // e.g. "default"
  host: string; // TINYCLOUD_HOST
  agentAddress: string; // 0x… — the agent's wallet address
  delegation: PortableDelegation;
  restorable: RestorableSession;
}

interface ProfileConfig {
  name: string;
  host: string;
  chainId: number;
  spaceName: string;
  did: string;
  primaryDid: string;
  spaceId: string;
  createdAt: string;
  authMethod: "openkey";
}

interface SessionData {
  delegationHeader: { Authorization: string };
  delegationCid: string;
  spaceId: string;
  verificationMethod: string;
  jwk: object;
  address: string;
  chainId: number;
  primaryDid: string;
}

function profileDir(root: string, name: string): string {
  return join(root, "profiles", name);
}

function loadExistingCreatedAt(path: string): string | null {
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as { createdAt?: string };
    return typeof parsed.createdAt === "string" ? parsed.createdAt : null;
  } catch {
    return null;
  }
}

function writeJsonAtomic(path: string, body: unknown): void {
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tmp, JSON.stringify(body, null, 2) + "\n", "utf-8");
  renameSync(tmp, path);
}

/**
 * Initial profile write — runs once per delegation grant.
 *
 * Writes profile.json and key.json (both write-once — the JWK is stable
 * across refreshes because the sidecar reuses one long-lived
 * TinyCloudNode), then session.json.
 */
export function writeInitialProfile(input: ProfileSynthesisInput): void {
  const dir = profileDir(input.profilesRoot, input.profileName);
  mkdirSync(dir, { recursive: true });

  const profilePath = join(dir, "profile.json");
  const keyPath = join(dir, "key.json");
  const sessionPath = join(dir, "session.json");

  const createdAt = loadExistingCreatedAt(profilePath) ?? new Date().toISOString();

  const agentDid = `did:pkh:eip155:${input.delegation.chainId}:${input.agentAddress}`;

  const profile: ProfileConfig = {
    name: input.profileName,
    host: input.host,
    chainId: input.delegation.chainId,
    spaceName: input.profileName,
    did: input.restorable.verificationMethod,
    primaryDid: agentDid,
    spaceId: input.delegation.spaceId,
    createdAt,
    authMethod: "openkey",
  };
  writeJsonAtomic(profilePath, profile);
  writeJsonAtomic(keyPath, input.restorable.jwk);

  writeSessionOnly(input);

  writeGlobalConfig(input.profilesRoot, input.profileName);
}

/**
 * Session-only write — runs on every refresh.
 *
 * Only session.json is rewritten. profile.json and key.json are stable
 * across refreshes (see writeInitialProfile).
 */
export function writeSessionOnly(input: ProfileSynthesisInput): void {
  const dir = profileDir(input.profilesRoot, input.profileName);
  mkdirSync(dir, { recursive: true });

  const ownerDid = `did:pkh:eip155:${input.delegation.chainId}:${input.delegation.ownerAddress}`;

  const session: SessionData = {
    delegationHeader: input.restorable.delegationHeader,
    delegationCid: input.restorable.delegationCid,
    spaceId: input.restorable.spaceId,
    verificationMethod: input.restorable.verificationMethod,
    jwk: input.restorable.jwk,
    address: input.delegation.ownerAddress,
    chainId: input.delegation.chainId,
    primaryDid: ownerDid,
  };
  writeJsonAtomic(join(dir, "session.json"), session);
}

/**
 * Clear session.json so `tc` surfaces AUTH_REQUIRED via its existing
 * code path (packages/cli/src/lib/sdk.ts:86). Called on terminal failure
 * (revoked delegation, persistent 401). Keeps profile.json/key.json so
 * the profile metadata + key stay intact.
 */
export function clearSession(profilesRoot: string, profileName: string): void {
  const sessionPath = join(profileDir(profilesRoot, profileName), "session.json");
  if (!existsSync(sessionPath)) return;
  try {
    renameSync(sessionPath, `${sessionPath}.revoked-${Date.now()}`);
  } catch {
    // best effort
  }
}

function writeGlobalConfig(root: string, defaultProfile: string): void {
  const configPath = join(root, "config.json");
  if (existsSync(configPath)) return;
  mkdirSync(root, { recursive: true });
  writeJsonAtomic(configPath, { defaultProfile, version: 1 });
}
