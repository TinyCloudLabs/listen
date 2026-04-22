import { existsSync, readFileSync, writeFileSync } from "node:fs";

export interface SessionCacheEntry {
  delegationFingerprint: string;
  activatedAt: number;
  agentDid: string;
}

const TTL_MS = 50 * 60 * 1000;

export function readSessionCache(path: string): SessionCacheEntry | null {
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw) as SessionCacheEntry;
    if (
      typeof parsed.delegationFingerprint !== "string" ||
      typeof parsed.activatedAt !== "number" ||
      typeof parsed.agentDid !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeSessionCache(path: string, entry: SessionCacheEntry): void {
  writeFileSync(path, JSON.stringify(entry), "utf-8");
}

export function isFresh(
  cache: SessionCacheEntry | null,
  fingerprint: string,
  now: number = Date.now(),
): boolean {
  if (!cache) return false;
  if (cache.delegationFingerprint !== fingerprint) return false;
  return now - cache.activatedAt < TTL_MS;
}
