import { parseArgs } from "node:util";
import { readEnv } from "../lib/env.js";
import { loadAgentKey, buildNode } from "../lib/identity.js";
import { activateDelegation } from "../lib/delegation.js";
import { withSessionRefresh } from "../lib/session-refresh.js";
import { writeError, writeJson, mapError } from "../lib/output.js";

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

function coerceParam(p: string): string | number | boolean | null {
  if (p === "null") return null;
  if (p === "true") return true;
  if (p === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(p)) return Number(p);
  return p;
}

async function getAccess() {
  const env = readEnv();
  const key = loadAgentKey(env.agentKeyPath);
  if (!key) {
    writeError(
      "no_agent_key",
      `Agent key not found at ${env.agentKeyPath}. Run: tc-agent agent init`,
    );
  }
  const node = buildNode(key.privateKey, env.host);
  await node.signIn();
  const activated = await activateDelegation(node, env.delegationPath, env.sessionCachePath);
  return { node, access: activated.access };
}

export async function sqlQuery(argv: string[]): Promise<void> {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: { param: { type: "string", multiple: true } },
      allowPositionals: true,
      strict: true,
    });
  } catch (err) {
    writeError("invalid_args", (err as Error).message);
  }

  const [sql] = parsed.positionals;
  if (!sql) writeError("invalid_args", 'Usage: tc-agent sql query "<sql>" [--param <p>]...');

  const params = (parsed.values.param ?? []).map(coerceParam);

  const { node, access } = await getAccess();
  try {
    const result = await withSessionRefresh(node, () => access.sql.query(sql, params as any));
    const data = unwrap(result as any);
    writeJson({
      columns: (data as any).columns ?? [],
      rows: (data as any).rows ?? [],
      rowCount: (data as any).rowCount ?? (data as any).rows?.length ?? 0,
    });
  } catch (err) {
    const { code, message } = mapError(err);
    writeError(code, message);
  }
}

export async function sqlExecute(argv: string[]): Promise<void> {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: { param: { type: "string", multiple: true } },
      allowPositionals: true,
      strict: true,
    });
  } catch (err) {
    writeError("invalid_args", (err as Error).message);
  }

  const [sql] = parsed.positionals;
  if (!sql) writeError("invalid_args", 'Usage: tc-agent sql execute "<sql>" [--param <p>]...');

  const params = (parsed.values.param ?? []).map(coerceParam);

  const { node, access } = await getAccess();
  try {
    const result = await withSessionRefresh(node, () => access.sql.execute(sql, params as any));
    const data = unwrap(result as any);
    writeJson({
      changes: (data as any).changes ?? 0,
      lastInsertRowId: (data as any).lastInsertRowId ?? null,
    });
  } catch (err) {
    const { code, message } = mapError(err);
    writeError(code, message);
  }
}
