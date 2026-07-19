export type DelegationLifecycleState = "ready" | "needs_consent" | "unavailable";

const CONSENT_CODES = new Set([
  "delegation_expired_at_grant",
  "delegation_policy_mismatch",
  "invalid_delegation",
  "missing_token",
  "session_expired",
  "invalid_token",
  "unauthenticated",
  "unauthorized",
]);

function failureShape(error: unknown): {
  code?: unknown;
  name?: unknown;
  message?: unknown;
  status?: unknown;
} {
  if (typeof error !== "object" || error === null) return {};
  const value = error as { code?: unknown; name?: unknown; message?: unknown; status?: unknown };
  return {
    code: value.code,
    name: value.name,
    message: error instanceof Error ? error.message : value.message,
    status: value.status,
  };
}

export function classifyDelegationFailure(error: unknown): DelegationLifecycleState {
  const { code, name, message } = failureShape(error);
  const codeText = typeof code === "string" ? code : "";
  const nameText = typeof name === "string" ? name : "";
  const messageText = typeof message === "string" ? message : "";

  if (
    CONSENT_CODES.has(codeText) ||
    nameText === "SessionExpiredError" ||
    nameText === "PermissionNotInManifestError" ||
    /SessionExpiredError|PermissionNotInManifestError|Missing backend session token/.test(
      messageText,
    )
  ) {
    return "needs_consent";
  }

  // Unknown 4xx responses are not proof that the owner must consent again.
  // They remain retryable on a later non-wallet trigger.
  return "unavailable";
}

export function classifyDelegationState(input: {
  status?: string;
  activation?: string;
  error?: unknown;
}): DelegationLifecycleState {
  if (input.error !== undefined) return classifyDelegationFailure(input.error);
  if (input.status === "active" && input.activation === "active") return "ready";
  if (input.activation === "pending" || input.activation === "failed") return "unavailable";
  if (input.status === "none" || input.status === "expired" || input.status === "stale") {
    return "needs_consent";
  }
  return "unavailable";
}

/**
 * A saved source key can need an additional, explicit permission even when
 * the base backend delegation is already active. Operationally unavailable
 * state never exposes this consent path.
 */
export function sourceNeedsConsent(input: {
  delegationState?: DelegationLifecycleState | null;
  hasBackendDelegation: boolean | null;
  sourceAccess: boolean | null;
}): boolean {
  if (input.sourceAccess !== false || input.delegationState === "unavailable") return false;
  return (
    input.delegationState === "needs_consent" ||
    (input.delegationState === "ready" && input.hasBackendDelegation === true)
  );
}
