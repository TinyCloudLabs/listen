import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface TcOptions {
  profile?: string;
  host?: string;
  space?: string;
}

export interface TcRunResult {
  stdout: string;
  stderr: string;
}

export function runTc(args: string[], options: TcOptions = {}): TcRunResult {
  const tc = tcExecutable();
  const fullArgs = [
    ...(options.profile ? ["--profile", options.profile] : []),
    ...(options.host ? ["--host", options.host] : []),
    ...args,
    ...(options.space ? ["--space", options.space] : []),
  ];
  const result = spawnSync(tc, fullArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `tc exited ${result.status}`;
    throw new Error(`${tc} ${fullArgs.join(" ")} failed: ${detail}`);
  }
  return { stdout: result.stdout, stderr: result.stderr };
}

function tcExecutable(): string {
  if (process.env.OTTER_IMPORTER_TC_PATH) return process.env.OTTER_IMPORTER_TC_PATH;
  const localBinName = process.platform === "win32" ? "tc.cmd" : "tc";
  const candidates = [
    join(process.cwd(), "node_modules", ".bin", localBinName),
    join(dirname(fileURLToPath(import.meta.url)), "..", "node_modules", ".bin", localBinName),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? "tc";
}

export function authStatus(options: TcOptions = {}): string {
  return runTc(["auth", "status"], options).stdout.trim();
}

export function putKvString(key: string, value: string, options: TcOptions = {}): void {
  runTc(["kv", "put", key, value], options);
}

export function sqlExecute(
  db: string,
  sql: string,
  params: unknown[] = [],
  options: TcOptions = {},
): void {
  runTc(["sql", "execute", sql, "--db", db, "--params", JSON.stringify(params)], options);
}

export function createDelegation(
  to: string,
  path: string,
  actions: string[],
  expiry: string,
  options: TcOptions = {},
): string {
  return runTc(
    [
      "delegation",
      "create",
      "--to",
      to,
      "--path",
      path,
      "--actions",
      actions.join(","),
      "--expiry",
      expiry,
    ],
    options,
  ).stdout.trim();
}
