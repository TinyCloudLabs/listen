import { parseArgs } from "node:util";
import { readEnv } from "../lib/env.js";
import { loadAgentKey, buildNode } from "../lib/identity.js";
import { activateDelegation } from "../lib/delegation.js";
import { withSessionRefresh } from "../lib/session-refresh.js";
import { writeError, writeJson, writeRaw, mapError } from "../lib/output.js";

function unwrap<T>(
  result: { ok: true; data: T } | { ok: false; error?: { code?: string; message?: string } },
): T {
  if (result.ok) return result.data;
  const err = result.error ?? {};
  const message = err.message ?? "Unknown error from TinyCloud";
  const code = typeof err.code === "string" ? err.code : "internal";
  if (/40[13]|forbidden|unauthor/i.test(`${code} ${message}`)) {
    writeError("permission_denied", message);
  }
  writeError("internal", message);
}

async function getAccess() {
  const env = readEnv();
  const key = loadAgentKey(env.agentKeyPath);
  if (!key) {
    writeError(
      "no_agent_key",
      `Agent key not found at ${env.agentKeyPath}. Run: listen agent init`,
    );
  }
  const node = buildNode(key.privateKey, env.host);
  await node.signIn();
  const activated = await activateDelegation(node, env.delegationPath, env.sessionCachePath);
  return { node, access: activated.access };
}

export async function kvList(argv: string[]): Promise<void> {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: { prefix: { type: "string" } },
      allowPositionals: true,
      strict: true,
    });
  } catch (err) {
    writeError("invalid_args", (err as Error).message);
  }

  const { node, access } = await getAccess();
  try {
    const result = await withSessionRefresh(node, () =>
      access.kv.list(parsed.values.prefix ? { prefix: parsed.values.prefix } : undefined),
    );
    const data = unwrap(result as any);
    writeJson({ keys: (data as any).keys ?? [] });
  } catch (err) {
    const { code, message } = mapError(err);
    writeError(code, message);
  }
}

export async function kvGet(argv: string[]): Promise<void> {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: { raw: { type: "boolean", default: false } },
      allowPositionals: true,
      strict: true,
    });
  } catch (err) {
    writeError("invalid_args", (err as Error).message);
  }

  const [key] = parsed.positionals;
  if (!key) writeError("invalid_args", "Usage: listen kv get <key> [--raw]");

  const { node, access } = await getAccess();
  try {
    const result = await withSessionRefresh(node, () => access.kv.get(key));
    const data = unwrap(result as any);
    const value = (data as any).data ?? data;

    if (parsed.values.raw) {
      if (typeof value === "string") writeRaw(value);
      else if (value instanceof Uint8Array) writeRaw(value);
      else writeRaw(JSON.stringify(value));
      process.exit(0);
    }

    writeJson({ value });
  } catch (err) {
    const { code, message } = mapError(err);
    writeError(code, message);
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

export async function kvPut(argv: string[]): Promise<void> {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, options: {}, allowPositionals: true, strict: true });
  } catch (err) {
    writeError("invalid_args", (err as Error).message);
  }

  const [key, inlineValue] = parsed.positionals;
  if (!key)
    writeError("invalid_args", "Usage: listen kv put <key> <value>   (or pipe value via stdin)");

  let rawValue: string;
  if (inlineValue !== undefined && inlineValue !== "-") {
    rawValue = inlineValue;
  } else {
    rawValue = await readStdin();
  }

  let value: unknown = rawValue;
  try {
    value = JSON.parse(rawValue);
  } catch {
    // keep as string
  }

  const { node, access } = await getAccess();
  try {
    const result = await withSessionRefresh(node, () => access.kv.put(key, value));
    unwrap(result as any);
    writeJson({ ok: true });
  } catch (err) {
    const { code, message } = mapError(err);
    writeError(code, message);
  }
}

export async function kvDel(argv: string[]): Promise<void> {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, options: {}, allowPositionals: true, strict: true });
  } catch (err) {
    writeError("invalid_args", (err as Error).message);
  }

  const [key] = parsed.positionals;
  if (!key) writeError("invalid_args", "Usage: listen kv del <key>");

  const { node, access } = await getAccess();
  try {
    const result = await withSessionRefresh(node, () => access.kv.delete(key));
    unwrap(result as any);
    writeJson({ ok: true });
  } catch (err) {
    const { code, message } = mapError(err);
    writeError(code, message);
  }
}
