const MISSING_PARENT_CODES = new Set(["MISSING_PARENT_DELEGATION", "PARENT_DELEGATION_NOT_FOUND"]);

const MISSING_PARENT_MESSAGE = /\bcannot find parent delegation\b/i;

/** A stable Listen error for the node's currently-untyped dead-session failure. */
export class MissingParentDelegationError extends Error {
  readonly code = "missing_parent_delegation";

  constructor(cause: unknown) {
    super("The restored TinyCloud session is no longer registered with the node.", { cause });
    this.name = "MissingParentDelegationError";
  }
}

/**
 * Narrowly identifies the node failure emitted when a restored browser
 * session points at a parent delegation the node no longer knows about.
 */
export function isMissingParentDelegationError(error: unknown): boolean {
  const seen = new Set<object>();

  const matches = (value: unknown, depth: number): boolean => {
    if (depth > 5 || value == null) return false;
    if (typeof value === "string") {
      if (MISSING_PARENT_MESSAGE.test(value)) return true;
      const trimmed = value.trim();
      if ((trimmed.startsWith("{") || trimmed.startsWith("[")) && trimmed.length <= 20_000) {
        try {
          return matches(JSON.parse(trimmed), depth + 1);
        } catch {
          return false;
        }
      }
      return false;
    }
    if (typeof value !== "object") return false;
    if (seen.has(value)) return false;
    seen.add(value);

    const record = value as Record<string, unknown>;
    const code = record.code;
    if (typeof code === "string" && MISSING_PARENT_CODES.has(code.toUpperCase())) return true;

    return [
      record.message,
      record.cause,
      record.error,
      record.reason,
      record.body,
      record.data,
      record.response,
    ].some((candidate) => matches(candidate, depth + 1));
  };

  return matches(error, 0);
}

export function normalizeMissingParentDelegationError(error: unknown): unknown {
  if (error instanceof MissingParentDelegationError) return error;
  return isMissingParentDelegationError(error) ? new MissingParentDelegationError(error) : error;
}
