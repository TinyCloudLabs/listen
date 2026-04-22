import { existsSync } from "node:fs";
import { readEnv } from "../lib/env.js";
import { peekDelegationExpiry } from "../lib/delegation.js";
import { writeJson } from "../lib/output.js";

type Status = "ok" | "missing" | "expired" | "unreachable";

async function checkTinyCloud(host: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(host, { method: "GET", signal: controller.signal });
    clearTimeout(timer);
    return res.status < 500;
  } catch {
    return false;
  }
}

export async function doctor(): Promise<void> {
  const env = readEnv();

  const agentKey: Status = existsSync(env.agentKeyPath) ? "ok" : "missing";

  let delegation: Status;
  let delegationExpiresAt: string | null = null;
  if (!existsSync(env.delegationPath)) {
    delegation = "missing";
  } else {
    const { expiresAt, expired } = peekDelegationExpiry(env.delegationPath);
    delegationExpiresAt = expiresAt;
    delegation = expired ? "expired" : "ok";
  }

  const reachable = await checkTinyCloud(env.host);
  const tinycloudReachable = reachable ? "ok" : "unreachable";

  const report = {
    agentKey,
    delegation,
    delegationExpiresAt,
    tinycloudHost: env.host,
    tinycloudReachable,
  };
  writeJson(report);

  const allOk = agentKey === "ok" && delegation === "ok" && reachable;
  process.exit(allOk ? 0 : 1);
}
