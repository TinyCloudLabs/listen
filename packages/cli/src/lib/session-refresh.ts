import type { TinyCloudNode } from "@tinycloud/node-sdk";

const SESSION_ERROR_PATTERN =
  /\b(session\s+expired|invalid\s+session|token\s+expired|expired\s+credentials?|unauthorized|unauthenticated|sign.?in\s*required)\b|\b401\b(?![\d-])/i;

function isSessionError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return SESSION_ERROR_PATTERN.test(message);
}

export async function withSessionRefresh<T>(node: TinyCloudNode, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    if (isSessionError(err)) {
      await node.signIn();
      return fn();
    }
    throw err;
  }
}
