// ── Re-export everything ─────────────────────────────────────────────

export {
  createBackendIdentity,
  withSessionRefresh,
  type BackendIdentityConfig,
  type BackendIdentity,
} from "./identity.js";

export {
  DelegationStore,
  type DelegationMetadata,
} from "./delegation-store.js";

export {
  DelegationCache,
  type DelegatedAccess,
} from "./delegation-cache.js";

export {
  createJWTVerifier,
  fetchUserInfo,
  type JWTClaims,
  type VerifyResult,
  type UserInfo,
  type JWTVerifierConfig,
} from "./auth.js";
