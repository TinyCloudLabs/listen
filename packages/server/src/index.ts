// ── Re-export everything ─────────────────────────────────────────────

export {
  createBackendIdentity,
  withSessionRefresh,
  type BackendIdentityConfig,
  type BackendIdentity,
} from "./identity.js";

export { DelegationStore, type DelegationMetadata } from "./delegation-store.js";

export { DelegationCache } from "./delegation-cache.js";

export type { DelegatedAccess } from "@tinycloud/node-sdk";

export {
  createNonceStore,
  verifySIWE,
  issueSessionToken,
  verifySessionToken,
  type NonceStore,
  type NonceEntry,
  type SessionTokenPayload,
} from "./auth.js";

export { createCsrfMiddleware, type CsrfConfig } from "./csrf.js";
