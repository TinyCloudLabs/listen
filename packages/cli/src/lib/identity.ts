import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { TinyCloudNode } from "@tinycloud/node-sdk";

export interface AgentKeyFile {
  privateKey: string;
}

export function generatePrivateKey(): string {
  return "0x" + randomBytes(32).toString("hex");
}

export function loadAgentKey(path: string): AgentKeyFile | null {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf-8");
  const parsed = JSON.parse(raw) as AgentKeyFile;
  if (typeof parsed?.privateKey !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(parsed.privateKey)) {
    throw new Error(`Invalid agent key file at ${path}: missing or malformed privateKey`);
  }
  return parsed;
}

export function writeAgentKey(path: string, key: AgentKeyFile): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(key, null, 2), { mode: 0o600 });
}

export function ensureAgentKey(path: string): { key: AgentKeyFile; generated: boolean } {
  const existing = loadAgentKey(path);
  if (existing) return { key: existing, generated: false };
  const key: AgentKeyFile = { privateKey: generatePrivateKey() };
  writeAgentKey(path, key);
  return { key, generated: true };
}

export function buildNode(privateKey: string, host: string): TinyCloudNode {
  return new TinyCloudNode({
    privateKey,
    host,
    prefix: process.env.TC_AGENT_PREFIX ?? "tc-agent",
    autoCreateSpace: false,
  });
}
