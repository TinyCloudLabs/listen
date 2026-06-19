// ── Re-export everything ─────────────────────────────────────────────

export { connectWallet, type ConnectWalletConfig, type ConnectWalletResult } from "./openkey.js";

export {
  createTinyCloudWeb,
  createAndSignIn,
  restoreTinyCloudWeb,
  type TinyCloudWebConfig,
} from "./tinycloud.js";

export {
  loadAppManifest,
  backendManifestFromServerInfo,
  composeManifestWithBackend,
  composeManifestWithDelegatees,
  defaultEncryptionNetworkId,
  resolveManifestPermissions,
  resolveManifestDelegationPermissions,
  resolveManifestPermissionPath,
} from "./manifest.js";

export {
  LISTEN_CONTENT_SPACE,
  LISTEN_CONVERSATIONS_SQL_PATH,
  LISTEN_RESOURCE_PREFIX,
  LISTEN_TRANSCRIPT_CONVERSATION_COLUMNS,
  LISTEN_TRANSCRIPT_PARTICIPANT_COLUMNS,
  LISTEN_TRANSCRIPT_RESOURCE_TYPE,
  LISTEN_TRANSCRIPT_SQL_STATEMENT_TEMPLATES,
  LISTEN_TRANSCRIPT_STATEMENT_NAMES,
  createListenTranscriptCapability,
  listenTranscriptResourceId,
  listenTranscriptSqlInvokeRequests,
  type ListenTranscriptSqlCapability,
  type ListenTranscriptSqlInvokeRequest,
  type ListenTranscriptSqlStatement,
  type ListenTranscriptSqlStatementTemplate,
  type ListenTranscriptStatementName,
  type SqlConstrainedStatementCaveat,
  type SqlFixedParam,
} from "./transcript-binding.js";

export {
  loadPersistedSession,
  clearPersistedSession,
  type PersistedTinyCloudSession,
} from "./session-persistence.js";

export {
  createDelegation,
  createManifestDelegation,
  sendDelegation,
  checkDelegationStatus,
  revokeDelegation,
} from "./delegation.js";

export { requestNonce, verifySession, type VerifyResponse } from "./auth.js";

export { SessionStore, type StoredSession } from "./tokens.js";

export { createApiClient, type ApiClient, type ApiClientConfig } from "./api.js";

export {
  isListenDebugEnabled,
  installListenDebugFetchLogger,
  listenDebugFetch,
  listenDebugLog,
  startListenDebugStep,
  type DebugDetails,
  type DebugStep,
} from "./debug.js";
