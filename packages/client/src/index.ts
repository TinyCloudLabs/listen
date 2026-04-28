// ── Re-export everything ─────────────────────────────────────────────

export { connectWallet, type ConnectWalletConfig, type ConnectWalletResult } from "./openkey.js";

export { createTinyCloudWeb, createAndSignIn, type TinyCloudWebConfig } from "./tinycloud.js";

export {
  loadAppManifest,
  backendManifestFromServerInfo,
  composeManifestWithBackend,
  resolveManifestPermissions,
  resolveManifestDelegationPermissions,
  resolveManifestPermissionPath,
} from "./manifest.js";

export {
  loadPersistedSession,
  clearPersistedSession,
  type PersistedTinyCloudSession,
} from "./session-persistence.js";

export {
  resolveTinyCloudHosts,
  type ResolveTinyCloudHostsOptions,
  type TinyCloudHostResolution,
} from "./location.js";

export {
  createDelegation,
  createManifestDelegation,
  sendDelegation,
  checkDelegationStatus,
  revokeDelegation,
  type DelegationOptions,
} from "./delegation.js";

export { requestNonce, verifySession, type VerifyResponse } from "./auth.js";

export { SessionStore, type StoredSession } from "./tokens.js";

export { createApiClient, type ApiClient, type ApiClientConfig } from "./api.js";
