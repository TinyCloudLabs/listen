export type ErrorCode =
  | "no_delegation"
  | "expired_delegation"
  | "tinycloud_unreachable"
  | "permission_denied"
  | "invalid_args"
  | "no_agent_key"
  | "internal";

export function writeJson(obj: unknown): void {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

export function writeRaw(buf: Uint8Array | string): void {
  if (typeof buf === "string") {
    process.stdout.write(buf);
  } else {
    process.stdout.write(buf);
  }
}

export function writeError(code: ErrorCode, message: string): never {
  const payload = { error: { code, message } };
  process.stderr.write(JSON.stringify(payload) + "\n");
  process.exit(1);
}

export function mapError(err: unknown): { code: ErrorCode; message: string } {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (/\b(fetch failed|enotfound|econnrefused|network|dns|timeout)\b/.test(lower)) {
    return { code: "tinycloud_unreachable", message };
  }
  if (/\b(40[13]|forbidden|unauthorized|permission)\b/.test(lower)) {
    return { code: "permission_denied", message };
  }
  return { code: "internal", message };
}
