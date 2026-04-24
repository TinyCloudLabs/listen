import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export interface AgentKeyFile {
  privateKey: string;
}

function generatePrivateKey(): string {
  return "0x" + randomBytes(32).toString("hex");
}

function isValidKey(value: unknown): value is AgentKeyFile {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as AgentKeyFile).privateKey === "string" &&
    /^0x[0-9a-fA-F]{64}$/.test((value as AgentKeyFile).privateKey)
  );
}

export function loadAgentKey(path: string): AgentKeyFile | null {
  if (!existsSync(path)) return null;
  const parsed = JSON.parse(readFileSync(path, "utf-8"));
  if (!isValidKey(parsed)) {
    throw new Error(`Invalid agent key file at ${path}: missing or malformed privateKey`);
  }
  return parsed;
}

export function writeAgentKey(path: string, key: AgentKeyFile): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(key, null, 2), { mode: 0o600 });
}

export interface EnsureAgentKeyOptions {
  primaryPath: string;
  legacyPath?: string;
}

export interface EnsureAgentKeyResult {
  key: AgentKeyFile;
  generated: boolean;
  migrated: boolean;
}

/**
 * Load the agent key from `primaryPath`. If not present but `legacyPath`
 * has one (the Layer-1 location), migrate it. Otherwise generate a fresh
 * key and persist it at `primaryPath`.
 */
export function ensureAgentKey(opts: EnsureAgentKeyOptions): EnsureAgentKeyResult {
  const primary = loadAgentKey(opts.primaryPath);
  if (primary) return { key: primary, generated: false, migrated: false };

  if (opts.legacyPath) {
    const legacy = loadAgentKey(opts.legacyPath);
    if (legacy) {
      writeAgentKey(opts.primaryPath, legacy);
      return { key: legacy, generated: false, migrated: true };
    }
  }

  const fresh: AgentKeyFile = { privateKey: generatePrivateKey() };
  writeAgentKey(opts.primaryPath, fresh);
  return { key: fresh, generated: true, migrated: false };
}
