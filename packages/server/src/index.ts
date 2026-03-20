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
  createJWTVerifier,
  fetchUserInfo,
  type JWTClaims,
  type VerifyResult,
  type UserInfo,
  type JWTVerifierConfig,
} from "./auth.js";
