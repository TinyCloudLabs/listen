"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ACCOUNT_INDEX_SCHEMA: () => import_bootstrap3.ACCOUNT_INDEX_SCHEMA,
  ACCOUNT_REGISTRY_PATH: () => ACCOUNT_REGISTRY_PATH,
  ACCOUNT_REGISTRY_SPACE: () => ACCOUNT_REGISTRY_SPACE,
  AccountService: () => AccountService,
  AutoApproveSpaceCreationHandler: () => AutoApproveSpaceCreationHandler,
  BOOTSTRAP_ALLOWLIST: () => import_bootstrap3.BOOTSTRAP_ALLOWLIST,
  BOOTSTRAP_DEFAULT_SPACE: () => import_bootstrap3.BOOTSTRAP_DEFAULT_SPACE,
  BOOTSTRAP_ENCRYPTION_NETWORK_NAME: () => import_bootstrap3.BOOTSTRAP_ENCRYPTION_NETWORK_NAME,
  BOOTSTRAP_ENCRYPTION_NETWORK_RESOURCE_TEMPLATE: () => import_bootstrap3.BOOTSTRAP_ENCRYPTION_NETWORK_RESOURCE_TEMPLATE,
  BOOTSTRAP_MANIFEST: () => import_bootstrap3.BOOTSTRAP_MANIFEST,
  BOOTSTRAP_PERSISTED_APPLICATION_MANIFESTS: () => import_bootstrap3.BOOTSTRAP_PERSISTED_APPLICATION_MANIFESTS,
  BOOTSTRAP_PUBLIC_SPACE: () => import_bootstrap3.BOOTSTRAP_PUBLIC_SPACE,
  BOOTSTRAP_SESSION_REQUESTS: () => import_bootstrap3.BOOTSTRAP_SESSION_REQUESTS,
  BOOTSTRAP_SPACE_MANIFESTS: () => import_bootstrap3.BOOTSTRAP_SPACE_MANIFESTS,
  BOOTSTRAP_SPACE_NAMES: () => import_bootstrap3.BOOTSTRAP_SPACE_NAMES,
  CAPABILITIES: () => import_bootstrap3.CAPABILITIES,
  CAPABILITY_REGISTRY: () => import_bootstrap3.CAPABILITY_REGISTRY,
  CapabilityKeyRegistry: () => CapabilityKeyRegistry,
  CapabilityKeyRegistryErrorCodes: () => CapabilityKeyRegistryErrorCodes,
  ClientSessionSchema: () => ClientSessionSchema,
  CloudLocationResolutionError: () => CloudLocationResolutionError,
  DECRYPT_ACTION: () => import_sdk_services7.DECRYPT_ACTION,
  DECRYPT_FACT_TYPE: () => import_sdk_services7.DECRYPT_FACT_TYPE,
  DECRYPT_RESULT_TYPE: () => import_sdk_services7.DECRYPT_RESULT_TYPE,
  DEFAULT_DEFAULTS: () => DEFAULT_DEFAULTS,
  DEFAULT_ENCRYPTION_ALG: () => import_sdk_services7.DEFAULT_ENCRYPTION_ALG,
  DEFAULT_EXPIRY: () => DEFAULT_EXPIRY,
  DEFAULT_KEY_VERSION: () => import_sdk_services7.DEFAULT_KEY_VERSION,
  DEFAULT_KNOWLEDGE_ROOT: () => DEFAULT_KNOWLEDGE_ROOT,
  DEFAULT_MANIFEST_SPACE: () => DEFAULT_MANIFEST_SPACE,
  DEFAULT_MANIFEST_VERSION: () => DEFAULT_MANIFEST_VERSION,
  DEFAULT_SIGNED_READ_URL_EXPIRY_MS: () => DEFAULT_SIGNED_READ_URL_EXPIRY_MS,
  DEFAULT_TINYCLOUD_FALLBACK_HOST: () => DEFAULT_TINYCLOUD_FALLBACK_HOST,
  DEFAULT_TINYCLOUD_LOCATION_REGISTRY_URL: () => DEFAULT_TINYCLOUD_LOCATION_REGISTRY_URL,
  DUCKDB: () => import_bootstrap3.DUCKDB,
  DataVaultService: () => import_sdk_services7.DataVaultService,
  DatabaseHandle: () => import_sdk_services7.DatabaseHandle,
  DelegationErrorCodes: () => DelegationErrorCodes,
  DelegationManager: () => DelegationManager,
  DuckDbAction: () => import_sdk_services7.DuckDbAction,
  DuckDbDatabaseHandle: () => import_sdk_services7.DuckDbDatabaseHandle,
  DuckDbService: () => import_sdk_services7.DuckDbService,
  ED25519_JCS_SIGNATURE_SUITE: () => ED25519_JCS_SIGNATURE_SUITE,
  EIP191_JCS_SIGNATURE_SUITE: () => EIP191_JCS_SIGNATURE_SUITE,
  ENCRYPTION: () => import_bootstrap3.ENCRYPTION,
  ENCRYPTION_MANIFEST_SPACE: () => ENCRYPTION_MANIFEST_SPACE,
  ENCRYPTION_NETWORK_URN_PREFIX: () => import_sdk_services7.ENCRYPTION_NETWORK_URN_PREFIX,
  ENCRYPTION_PERMISSION_SERVICE: () => ENCRYPTION_PERMISSION_SERVICE,
  ENCRYPTION_SERVICE: () => import_sdk_services7.ENCRYPTION_SERVICE,
  ENCRYPTION_SERVICE_SHORT: () => import_sdk_services7.ENCRYPTION_SERVICE_SHORT,
  ENVELOPE_VERSION: () => import_sdk_services7.ENVELOPE_VERSION,
  EXPIRY: () => EXPIRY,
  EncryptionService: () => import_sdk_services7.EncryptionService,
  EnsDataSchema: () => EnsDataSchema,
  ErrorCodes: () => import_sdk_services7.ErrorCodes,
  HOOKS: () => import_bootstrap3.HOOKS,
  HooksService: () => import_sdk_services7.HooksService,
  IdentityParseError: () => IdentityParseError,
  KV: () => import_bootstrap3.KV,
  KVService: () => import_sdk_services7.KVService,
  LocationRecordValidationError: () => LocationRecordValidationError,
  ManifestValidationError: () => ManifestValidationError,
  NETWORK_NAME_PATTERN: () => import_sdk_services7.NETWORK_NAME_PATTERN,
  NetworkIdError: () => import_sdk_services7.NetworkIdError,
  POLICY_ENGINE_RECORD_SCHEMA: () => POLICY_ENGINE_RECORD_SCHEMA,
  POLICY_SCHEMA: () => POLICY_SCHEMA,
  POLICY_STATUS_SCHEMA: () => POLICY_STATUS_SCHEMA,
  PermissionNotInManifestError: () => PermissionNotInManifestError,
  PrefixedKVService: () => import_sdk_services7.PrefixedKVService,
  ProtocolMismatchError: () => ProtocolMismatchError,
  SECRETS_SPACE: () => SECRETS_SPACE,
  SECRET_NAME_RE: () => import_sdk_services7.SECRET_NAME_RE,
  SECRET_RECORDS_SCHEMA: () => import_bootstrap3.SECRET_RECORDS_SCHEMA,
  SERVICE_LONG_TO_SHORT: () => SERVICE_LONG_TO_SHORT,
  SERVICE_SHORT_TO_LONG: () => SERVICE_SHORT_TO_LONG,
  SPACE: () => import_bootstrap3.SPACE,
  SQL: () => import_bootstrap3.SQL,
  SQLAction: () => import_sdk_services7.SQLAction,
  SQLService: () => import_sdk_services7.SQLService,
  SecretsService: () => import_sdk_services7.SecretsService,
  ServiceContext: () => import_sdk_services7.ServiceContext,
  SessionExpiredError: () => SessionExpiredError,
  SharingService: () => SharingService,
  SignatureMaterialError: () => SignatureMaterialError,
  SignatureVerificationError: () => SignatureVerificationError,
  SignedObjectCanonicalizationError: () => SignedObjectCanonicalizationError,
  SignedObjectDigestError: () => SignedObjectDigestError,
  SignedObjectIdError: () => SignedObjectIdError,
  SignedObjectProfileError: () => SignedObjectProfileError,
  SignedObjectSchemaError: () => SignedObjectSchemaError,
  SigningKeyBindingError: () => SigningKeyBindingError,
  SilentNotificationHandler: () => SilentNotificationHandler,
  SiweConfigSchema: () => SiweConfigSchema,
  SiweMessage: () => import_siwe.SiweMessage,
  Space: () => Space,
  SpaceErrorCodes: () => SpaceErrorCodes,
  SpaceService: () => SpaceService,
  TINYCLOUD_ACCOUNT_SPACE_MANIFEST: () => import_bootstrap3.TINYCLOUD_ACCOUNT_SPACE_MANIFEST,
  TINYCLOUD_APPLICATIONS_SPACE_MANIFEST: () => import_bootstrap3.TINYCLOUD_APPLICATIONS_SPACE_MANIFEST,
  TINYCLOUD_DEFAULT_SPACE_MANIFEST: () => import_bootstrap3.TINYCLOUD_DEFAULT_SPACE_MANIFEST,
  TINYCLOUD_PUBLIC_SPACE_MANIFEST: () => import_bootstrap3.TINYCLOUD_PUBLIC_SPACE_MANIFEST,
  TINYCLOUD_SECRETS_BOOTSTRAP_MANIFEST: () => import_bootstrap3.TINYCLOUD_SECRETS_BOOTSTRAP_MANIFEST,
  TinyCloud: () => TinyCloud,
  TinyCloudDebugLogger: () => import_sdk_services7.TinyCloudDebugLogger,
  UnsupportedFeatureError: () => UnsupportedFeatureError,
  UnsupportedSignatureSuiteError: () => UnsupportedSignatureSuiteError,
  VAULT_PERMISSION_SERVICE: () => VAULT_PERMISSION_SERVICE,
  VaultHeaders: () => import_sdk_services7.VaultHeaders,
  VaultPublicSpaceKVActions: () => import_sdk_services7.VaultPublicSpaceKVActions,
  VersionCheckError: () => VersionCheckError,
  activateSessionWithHost: () => activateSessionWithHost,
  addressStorageKey: () => addressStorageKey,
  applyPrefix: () => applyPrefix,
  bootstrapEncryptionNetworkId: () => import_bootstrap3.bootstrapEncryptionNetworkId,
  bootstrapSpaceId: () => import_bootstrap3.bootstrapSpaceId,
  bootstrapSteps: () => import_bootstrap3.bootstrapSteps,
  buildCanonicalDecryptRequest: () => import_sdk_services7.buildCanonicalDecryptRequest,
  buildDecryptAttenuation: () => import_sdk_services7.buildDecryptAttenuation,
  buildDecryptFacts: () => import_sdk_services7.buildDecryptFacts,
  buildDecryptInvocation: () => import_sdk_services7.buildDecryptInvocation,
  buildNetworkId: () => import_sdk_services7.buildNetworkId,
  buildSpaceUri: () => buildSpaceUri,
  canonicalHashHex: () => import_sdk_services7.canonicalHashHex,
  canonicalLocationPayload: () => canonicalLocationPayload,
  canonicalSignedResponse: () => import_sdk_services7.canonicalSignedResponse,
  canonicalizeAddress: () => canonicalizeAddress,
  canonicalizeDid: () => canonicalizeDid,
  canonicalizeDidUrl: () => canonicalizeDidUrl,
  canonicalizeEncryptionJson: () => import_sdk_services7.canonicalizeEncryptionJson,
  canonicalizeNetworkId: () => canonicalizeNetworkId,
  canonicalizeSecretScope: () => import_sdk_services7.canonicalizeSecretScope,
  canonicalizeSignedObjectUnsigned: () => canonicalizeSignedObjectUnsigned,
  checkDecryptInvocationInput: () => import_sdk_services7.checkDecryptInvocationInput,
  checkNodeInfo: () => checkNodeInfo,
  clearTinyCloudDebugLogs: () => import_sdk_services7.clearTinyCloudDebugLogs,
  composeBootstrapSpaceManifest: () => import_bootstrap3.composeBootstrapSpaceManifest,
  composeManifestRequest: () => composeManifestRequest,
  createAndSignPolicy: () => createAndSignPolicy,
  createAndSignPolicyEngineRecord: () => createAndSignPolicyEngineRecord,
  createAndSignPolicyStatus: () => createAndSignPolicyStatus,
  createAndSignSignedObject: () => createAndSignSignedObject,
  createCapabilityKeyRegistry: () => createCapabilityKeyRegistry,
  createOpenKeyCallbackSigningStrategy: () => createOpenKeyCallbackSigningStrategy,
  createSharingService: () => createSharingService,
  createSpaceService: () => createSpaceService,
  createVaultCrypto: () => import_sdk_services7.createVaultCrypto,
  decryptEnvelopeWithKey: () => import_sdk_services7.decryptEnvelopeWithKey,
  defaultRetryPolicy: () => import_sdk_services7.defaultRetryPolicy,
  defaultSignStrategy: () => defaultSignStrategy,
  defaultSpaceCreationHandler: () => defaultSpaceCreationHandler,
  deriveSignedObjectMaterial: () => deriveSignedObjectMaterial,
  deriveSignedReceiverKey: () => import_sdk_services7.deriveSignedReceiverKey,
  didCacheKey: () => didCacheKey,
  didEquals: () => didEquals,
  disableTinyCloudDebug: () => import_sdk_services7.disableTinyCloudDebug,
  discoverNetwork: () => import_sdk_services7.discoverNetwork,
  enableTinyCloudDebug: () => import_sdk_services7.enableTinyCloudDebug,
  encryptToNetwork: () => import_sdk_services7.encryptToNetwork,
  encryptionBase64Decode: () => import_sdk_services7.base64Decode,
  encryptionBase64Encode: () => import_sdk_services7.base64Encode,
  encryptionError: () => import_sdk_services7.encryptionError,
  encryptionUtf8Decode: () => import_sdk_services7.utf8Decode,
  encryptionUtf8Encode: () => import_sdk_services7.utf8Encode,
  ensureNetworkUsableForDecrypt: () => import_sdk_services7.ensureNetworkUsableForDecrypt,
  err: () => import_sdk_services7.err,
  expandActionShortNames: () => expandActionShortNames,
  expandPermissionEntries: () => expandPermissionEntries,
  expandPermissionEntry: () => expandPermissionEntry,
  fetchLocationRecord: () => fetchLocationRecord,
  fetchPeerId: () => fetchPeerId,
  generateRandomReceiverKey: () => import_sdk_services7.generateRandomReceiverKey,
  getTinyCloudDebugLogs: () => import_sdk_services7.getTinyCloudDebugLogs,
  hexDecode: () => import_sdk_services7.hexDecode,
  hexEncode: () => import_sdk_services7.hexEncode,
  httpUrlToMultiaddr: () => httpUrlToMultiaddr,
  installTinyCloudDebugGlobals: () => import_sdk_services7.installTinyCloudDebugGlobals,
  isCapabilitySubset: () => isCapabilitySubset,
  isEvmAddress: () => isEvmAddress,
  isNetworkId: () => import_sdk_services7.isNetworkId,
  jcsCanonicalize: () => jcsCanonicalize,
  loadManifest: () => loadManifest,
  locationPayloadForRecord: () => locationPayloadForRecord,
  makePkhSpaceId: () => makePkhSpaceId,
  makePublicSpaceId: () => makePublicSpaceId,
  manifestAbilitiesUnion: () => manifestAbilitiesUnion,
  multiaddrToHttpUrl: () => multiaddrToHttpUrl,
  networkDiscoveryKey: () => import_sdk_services7.networkDiscoveryKey,
  normalizeDefaults: () => normalizeDefaults,
  normalizeJson: () => normalizeJson,
  ok: () => import_sdk_services7.ok,
  openWrappedKey: () => import_sdk_services7.openWrappedKey,
  parseCanonicalNetworkId: () => parseCanonicalNetworkId,
  parseExpiry: () => parseExpiry,
  parseNetworkId: () => import_sdk_services7.parseNetworkId,
  parsePkhDid: () => parsePkhDid,
  parseRecapCapabilities: () => parseRecapCapabilities,
  parseSpaceUri: () => parseSpaceUri,
  pkhDid: () => pkhDid,
  principalDid: () => principalDid,
  principalDidEquals: () => principalDidEquals,
  resolveCloudLocation: () => resolveCloudLocation,
  resolveManifest: () => resolveManifest,
  resolveManifestKnowledgeRoot: () => resolveManifestKnowledgeRoot,
  resolveSecretListPrefix: () => import_sdk_services7.resolveSecretListPrefix,
  resolveSecretPath: () => import_sdk_services7.resolveSecretPath,
  resolveTinyCloudHosts: () => resolveTinyCloudHosts,
  resourceCapabilitiesToAbilitiesMap: () => resourceCapabilitiesToAbilitiesMap,
  resourceCapabilitiesToSpaceAbilitiesMap: () => resourceCapabilitiesToSpaceAbilitiesMap,
  serializeJcsJson: () => serialize,
  serviceError: () => import_sdk_services7.serviceError,
  signLocationRecord: () => signLocationRecord,
  signedObjectIdFor: () => signedObjectIdFor,
  submitHostDelegation: () => submitHostDelegation,
  tinyCloudDebugLogger: () => import_sdk_services7.tinyCloudDebugLogger,
  toSignedObjectError: () => toSignedObjectError,
  validateClientSession: () => validateClientSession,
  validateEnvelope: () => import_sdk_services7.validateEnvelope,
  validateLocationRecord: () => validateLocationRecord,
  validateLocationRecordPayload: () => validateLocationRecordPayload,
  validateManifest: () => validateManifest,
  validatePersistedSessionData: () => validatePersistedSessionData,
  validatePolicyEngineRecordSigned: () => validatePolicyEngineRecordSigned,
  validatePolicyEngineRecordSignedShape: () => validatePolicyEngineRecordSignedShape,
  validatePolicyEngineRecordUnsigned: () => validatePolicyEngineRecordUnsigned,
  validatePolicySigned: () => validatePolicySigned,
  validatePolicySignedShape: () => validatePolicySignedShape,
  validatePolicyStatusSigned: () => validatePolicyStatusSigned,
  validatePolicyStatusSignedShape: () => validatePolicyStatusSignedShape,
  validatePolicyStatusUnsigned: () => validatePolicyStatusUnsigned,
  validatePolicyUnsigned: () => validatePolicyUnsigned,
  verifyDecryptResponse: () => import_sdk_services7.verifyDecryptResponse,
  verifyDidKeyEd25519Signature: () => verifyDidKeyEd25519Signature,
  verifyLocationRecord: () => verifyLocationRecord,
  verifyPolicy: () => verifyPolicy,
  verifyPolicyEngineRecord: () => verifyPolicyEngineRecord,
  verifyPolicyStatus: () => verifyPolicyStatus,
  verifySignedObject: () => verifySignedObject
});
module.exports = __toCommonJS(index_exports);

// src/client-types.ts
var import_zod = require("zod");
var import_siwe = require("siwe");
var EnsDataSchema = import_zod.z.object({
  domain: import_zod.z.string().nullable().optional(),
  avatarUrl: import_zod.z.string().nullable().optional()
});
var SiweConfigSchema = import_zod.z.object({
  domain: import_zod.z.string().optional(),
  uri: import_zod.z.string().optional(),
  chainId: import_zod.z.number().optional(),
  statement: import_zod.z.string().optional(),
  nonce: import_zod.z.string().optional(),
  expirationTime: import_zod.z.string().optional(),
  notBefore: import_zod.z.string().optional(),
  requestId: import_zod.z.string().optional(),
  resources: import_zod.z.array(import_zod.z.string()).optional()
}).passthrough();
var ClientSessionSchema = import_zod.z.object({
  address: import_zod.z.string(),
  walletAddress: import_zod.z.string(),
  chainId: import_zod.z.number(),
  sessionKey: import_zod.z.string(),
  siwe: import_zod.z.string(),
  signature: import_zod.z.string(),
  ens: EnsDataSchema.optional()
});
function validateClientSession(data) {
  const result = ClientSessionSchema.safeParse(data);
  return result.success ? result.data : null;
}

// src/notifications.ts
var SilentNotificationHandler = class {
  success() {
  }
  warning() {
  }
  error() {
  }
};

// src/identity.ts
var import_viem = require("viem");
var IdentityParseError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "IdentityParseError";
  }
};
var PKH_DID_RE = /^did:pkh:eip155:(\d+):(0x[a-fA-F0-9]{40})$/;
var DID_RE = /^did:[a-z0-9]+:.+$/;
function splitDidUrl(input) {
  const fragmentIndex = input.indexOf("#");
  if (fragmentIndex < 0) {
    return { did: input, fragment: "" };
  }
  return {
    did: input.slice(0, fragmentIndex),
    fragment: input.slice(fragmentIndex)
  };
}
function assertValidChainId(chainId) {
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    throw new IdentityParseError(`Invalid EIP-155 chain ID: ${chainId}`);
  }
}
function isEvmAddress(input) {
  return (0, import_viem.isAddress)(input, { strict: false });
}
function canonicalizeAddress(address) {
  if (!isEvmAddress(address)) {
    throw new IdentityParseError(`Invalid EVM address: ${address}`);
  }
  return (0, import_viem.getAddress)(address);
}
function addressStorageKey(address) {
  return canonicalizeAddress(address).toLowerCase();
}
function pkhDid(address, chainId = 1) {
  assertValidChainId(chainId);
  return `did:pkh:eip155:${chainId}:${canonicalizeAddress(address)}`;
}
function parsePkhDid(did) {
  const match = did.match(PKH_DID_RE);
  if (!match) return null;
  const chainId = Number(match[1]);
  assertValidChainId(chainId);
  return {
    method: "pkh",
    namespace: "eip155",
    chainId,
    address: canonicalizeAddress(match[2])
  };
}
function canonicalizeDid(did) {
  const pkh = parsePkhDid(did);
  if (pkh) {
    return pkhDid(pkh.address, pkh.chainId);
  }
  if (DID_RE.test(did)) {
    return did;
  }
  throw new IdentityParseError(`Invalid DID: ${did}`);
}
function canonicalizeDidUrl(didUrl) {
  const { did, fragment } = splitDidUrl(didUrl);
  return `${canonicalizeDid(did)}${fragment}`;
}
function principalDid(didUrl) {
  return canonicalizeDid(splitDidUrl(didUrl).did);
}
function didEquals(a, b, options = {}) {
  const canonicalize = options.ignoreFragment ? principalDid : canonicalizeDidUrl;
  return canonicalize(a) === canonicalize(b);
}
function principalDidEquals(a, b) {
  return didEquals(a, b, { ignoreFragment: true });
}
function didCacheKey(input, options = {}) {
  const { did, fragment } = splitDidUrl(input);
  const pkh = parsePkhDid(did);
  const base = pkh ? `did:pkh:eip155:${pkh.chainId}:${addressStorageKey(pkh.address)}` : canonicalizeDid(did);
  return options.preserveFragment ? `${base}${fragment}` : base;
}
function makePkhSpaceId(address, chainId, name) {
  assertValidChainId(chainId);
  if (!name) {
    throw new IdentityParseError("Space name cannot be empty");
  }
  return `tinycloud:pkh:eip155:${chainId}:${canonicalizeAddress(address)}:${name}`;
}

// src/networkId.ts
var import_sdk_services = require("@tinycloud/sdk-services");
function canonicalizeNetworkId(networkId) {
  const parsed = (0, import_sdk_services.parseNetworkId)(networkId);
  return (0, import_sdk_services.buildNetworkId)(canonicalizeDid(parsed.ownerDid), parsed.name);
}
function parseCanonicalNetworkId(networkId) {
  const canonical = canonicalizeNetworkId(networkId);
  return (0, import_sdk_services.parseNetworkId)(canonical);
}

// src/storage.schema.ts
var import_zod2 = require("zod");
var ethereumAddressPattern = /^0x[a-fA-F0-9]{40}$/;
var EnsDataSchema2 = import_zod2.z.object({
  /** ENS name/domain. */
  domain: import_zod2.z.string().nullable().optional(),
  /** ENS avatar URL. */
  avatarUrl: import_zod2.z.string().nullable().optional()
});
var PersistedTinyCloudSessionSchema = import_zod2.z.object({
  /** The delegation header containing the UCAN */
  delegationHeader: import_zod2.z.object({
    Authorization: import_zod2.z.string()
  }),
  /** The delegation CID */
  delegationCid: import_zod2.z.string(),
  /** The space ID for this session */
  spaceId: import_zod2.z.string(),
  /** Additional spaces included in this session's capabilities. Key is logical name, value is full spaceId URI */
  spaces: import_zod2.z.record(import_zod2.z.string(), import_zod2.z.string()).optional(),
  /** The verification method DID */
  verificationMethod: import_zod2.z.string()
});
var PersistedSessionDataSchema = import_zod2.z.object({
  /** User's Ethereum address */
  address: import_zod2.z.string().regex(ethereumAddressPattern, "Invalid Ethereum address"),
  /** EIP-155 Chain ID */
  chainId: import_zod2.z.number().int().positive(),
  /** Session key in JWK format (stringified) */
  sessionKey: import_zod2.z.string(),
  /** The signed SIWE message */
  siwe: import_zod2.z.string(),
  /** User's signature of the SIWE message */
  signature: import_zod2.z.string(),
  /** TinyCloud delegation data if available */
  tinycloudSession: PersistedTinyCloudSessionSchema.optional(),
  /** Session expiration timestamp (ISO 8601 with timezone offset) */
  expiresAt: import_zod2.z.string().datetime({ offset: true }),
  /** Session creation timestamp (ISO 8601 with timezone offset) */
  createdAt: import_zod2.z.string().datetime({ offset: true }),
  /** Schema version for migrations */
  version: import_zod2.z.string(),
  /** Optional ENS data */
  ens: EnsDataSchema2.optional(),
  /**
   * TinyCloud hosts this session was created against. Persisted so a
   * restored session resolves to the same node without re-running the
   * registry/fallback resolution (or the wallet sign-in flow). Optional
   * for backward compatibility with sessions persisted before this field
   * existed — those restore and lazily re-resolve their hosts.
   */
  tinycloudHosts: import_zod2.z.array(import_zod2.z.string()).optional()
});
var TinyCloudSessionSchema = import_zod2.z.object({
  /** User's Ethereum address */
  address: import_zod2.z.string().regex(ethereumAddressPattern, "Invalid Ethereum address"),
  /** EIP-155 Chain ID */
  chainId: import_zod2.z.number().int().positive(),
  /** Session key ID */
  sessionKey: import_zod2.z.string(),
  /** The space ID for this session */
  spaceId: import_zod2.z.string(),
  /** Additional spaces included in this session's capabilities. Key is logical name, value is full spaceId URI */
  spaces: import_zod2.z.record(import_zod2.z.string(), import_zod2.z.string()).optional(),
  /** The delegation CID */
  delegationCid: import_zod2.z.string(),
  /** The delegation header for API calls */
  delegationHeader: import_zod2.z.object({
    Authorization: import_zod2.z.string()
  }),
  /** The verification method DID */
  verificationMethod: import_zod2.z.string(),
  /** The session key JWK (required for invoke operations) */
  jwk: import_zod2.z.object({}).passthrough(),
  /** The signed SIWE message */
  siwe: import_zod2.z.string(),
  /** User's signature of the SIWE message */
  signature: import_zod2.z.string()
});
function validatePersistedSessionData(data) {
  const result = PersistedSessionDataSchema.safeParse(data);
  if (!result.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: result.error.message,
        service: "session",
        meta: { issues: result.error.issues }
      }
    };
  }
  return { ok: true, data: result.data };
}

// src/TinyCloud.ts
var import_sdk_services3 = require("@tinycloud/sdk-services");

// src/spaces/SpaceService.ts
var import_sdk_services2 = require("@tinycloud/sdk-services");

// src/spaces/Space.ts
function unavailableSecretsService() {
  return new Proxy({}, {
    get: () => {
      throw new Error(
        "Secrets service factory not configured. Provide createSecrets in SpaceConfig."
      );
    }
  });
}
var Space = class {
  /**
   * Create a new Space instance.
   *
   * @param config - Space configuration
   */
  constructor(config) {
    this._id = config.id;
    this._name = config.name;
    this._kv = config.createKV(config.id);
    this._vault = config.createVault(config.id);
    this._secrets = config.createSecrets?.(config.id) ?? unavailableSecretsService();
    this._delegations = config.createDelegations(config.id);
    this._sharing = config.createSharing(config.id);
    this._getInfo = config.getInfo;
  }
  /**
   * The space identifier (full URI).
   */
  get id() {
    return this._id;
  }
  /**
   * The short name of the space.
   */
  get name() {
    return this._name;
  }
  /**
   * KV operations scoped to this space.
   */
  get kv() {
    return this._kv;
  }
  /**
   * Data Vault operations scoped to this space.
   */
  get vault() {
    return this._vault;
  }
  /**
   * Secrets operations scoped to this space.
   */
  get secrets() {
    return this._secrets;
  }
  /**
   * Delegation operations scoped to this space.
   */
  get delegations() {
    return this._delegations;
  }
  /**
   * Sharing operations scoped to this space.
   */
  get sharing() {
    return this._sharing;
  }
  /**
   * Get space metadata.
   *
   * @returns Result containing space information
   */
  async info() {
    return this._getInfo(this._id);
  }
};

// src/spaces/spaces.schema.ts
var import_zod4 = require("zod");

// src/delegations/types.schema.ts
var import_zod3 = require("zod");
var JWKSchema = import_zod3.z.object({
  /** Key type (e.g., "EC", "RSA", "OKP") */
  kty: import_zod3.z.string(),
  /** Curve for EC/OKP keys (e.g., "P-256", "Ed25519") */
  crv: import_zod3.z.string().optional(),
  /** X coordinate for EC keys, public key for OKP */
  x: import_zod3.z.string().optional(),
  /** Y coordinate for EC keys */
  y: import_zod3.z.string().optional(),
  /** Private key value (d parameter) */
  d: import_zod3.z.string().optional(),
  /** Public exponent for RSA keys */
  e: import_zod3.z.string().optional(),
  /** Modulus for RSA keys */
  n: import_zod3.z.string().optional(),
  /** Key ID */
  kid: import_zod3.z.string().optional(),
  /** Algorithm */
  alg: import_zod3.z.string().optional(),
  /** Key use (e.g., "sig", "enc") */
  use: import_zod3.z.string().optional(),
  /** Key operations (e.g., ["sign", "verify"]) */
  key_ops: import_zod3.z.array(import_zod3.z.string()).optional()
});
var KeyTypeSchema = import_zod3.z.enum(["main", "session", "ingested"]);
var KeyInfoSchema = import_zod3.z.object({
  /** Unique identifier for this key */
  id: import_zod3.z.string(),
  /** DID associated with this key */
  did: import_zod3.z.string(),
  /** Type of key determining its authority level */
  type: KeyTypeSchema,
  /** Private key in JWK format */
  jwk: JWKSchema.optional(),
  /** Priority for key selection (lower = higher priority) */
  priority: import_zod3.z.number()
});
var DelegationErrorSchema = import_zod3.z.object({
  /** Error code for programmatic handling */
  code: import_zod3.z.string(),
  /** Human-readable error message */
  message: import_zod3.z.string(),
  /** The service that produced the error */
  service: import_zod3.z.literal("delegation"),
  /** Original error if wrapping another error */
  cause: import_zod3.z.instanceof(Error).optional(),
  /** Additional metadata about the error */
  meta: import_zod3.z.record(import_zod3.z.string(), import_zod3.z.unknown()).optional()
});
var DelegationErrorCodes = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  AUTH_EXPIRED: "AUTH_EXPIRED",
  NOT_INITIALIZED: "NOT_INITIALIZED",
  NOT_FOUND: "NOT_FOUND",
  REVOKED: "REVOKED",
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
  ABORTED: "ABORTED",
  INVALID_INPUT: "INVALID_INPUT",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  CREATION_FAILED: "CREATION_FAILED",
  REVOCATION_FAILED: "REVOCATION_FAILED",
  INVALID_TOKEN: "INVALID_TOKEN",
  KV_SERVICE_UNAVAILABLE: "KV_SERVICE_UNAVAILABLE",
  DATA_FETCH_FAILED: "DATA_FETCH_FAILED",
  VALIDATION_ERROR: "VALIDATION_ERROR"
};
var DelegationSchema = import_zod3.z.object({
  /** Content identifier (CID) of the delegation */
  cid: import_zod3.z.string(),
  /** DID of the delegate (the party receiving the delegation) */
  delegateDID: import_zod3.z.string(),
  /** Space ID this delegation applies to */
  spaceId: import_zod3.z.string(),
  /** Resource path this delegation grants access to */
  path: import_zod3.z.string(),
  /** Actions this delegation authorizes */
  actions: import_zod3.z.array(import_zod3.z.string()),
  /** When this delegation expires (accepts Date or ISO string from JSON) */
  expiry: import_zod3.z.coerce.date(),
  /** Whether this delegation has been revoked */
  isRevoked: import_zod3.z.boolean(),
  /** DID of the delegator (the party granting the delegation) */
  delegatorDID: import_zod3.z.string().optional(),
  /** When this delegation was created (accepts Date or ISO string from JSON) */
  createdAt: import_zod3.z.coerce.date().optional(),
  /** Parent delegation CID if this is a sub-delegation */
  parentCid: import_zod3.z.string().optional(),
  /** Whether sub-delegation is allowed */
  allowSubDelegation: import_zod3.z.boolean().optional(),
  /** Authorization header (UCAN bearer token) */
  authHeader: import_zod3.z.string().optional()
});
var CapabilityEntrySchema = import_zod3.z.object({
  /** Resource URI this capability applies to */
  resource: import_zod3.z.string(),
  /** Action this capability authorizes */
  action: import_zod3.z.string(),
  /** Keys that can exercise this capability, ordered by priority */
  keys: import_zod3.z.array(KeyInfoSchema),
  /** The delegation that grants this capability */
  delegation: DelegationSchema,
  /** When this capability expires (accepts Date or ISO string from JSON) */
  expiresAt: import_zod3.z.coerce.date().optional()
});
var DelegationRecordSchema = import_zod3.z.object({
  /** Content identifier (CID) of the delegation */
  cid: import_zod3.z.string(),
  /** Space ID this delegation applies to */
  spaceId: import_zod3.z.string(),
  /** DID of the delegator (grantor) */
  delegator: import_zod3.z.string(),
  /** DID of the delegatee (recipient) */
  delegatee: import_zod3.z.string(),
  /** Key ID used to sign/exercise this delegation */
  keyId: import_zod3.z.string().optional(),
  /** Resource path pattern this delegation grants access to */
  path: import_zod3.z.string(),
  /** Actions this delegation authorizes */
  actions: import_zod3.z.array(import_zod3.z.string()),
  /** When this delegation expires (accepts Date or ISO string from JSON) */
  expiry: import_zod3.z.coerce.date().optional(),
  /** When this delegation becomes valid (not before) (accepts Date or ISO string) */
  notBefore: import_zod3.z.coerce.date().optional(),
  /** Whether this delegation has been revoked */
  isRevoked: import_zod3.z.boolean(),
  /** When this delegation was created (accepts Date or ISO string from JSON) */
  createdAt: import_zod3.z.coerce.date(),
  /** Parent delegation CID if this is a sub-delegation */
  parentCid: import_zod3.z.string().optional()
});
var CreateDelegationParamsSchema = import_zod3.z.object({
  /** DID of the delegate (the party receiving the delegation) */
  delegateDID: import_zod3.z.string(),
  /** Resource path this delegation grants access to */
  path: import_zod3.z.string(),
  /** Actions to authorize */
  actions: import_zod3.z.array(import_zod3.z.string()),
  /** When this delegation expires (accepts Date or ISO string) */
  expiry: import_zod3.z.coerce.date().optional(),
  /** Whether to disable sub-delegation */
  disableSubDelegation: import_zod3.z.boolean().optional(),
  /** Optional statement for the SIWE message */
  statement: import_zod3.z.string().optional()
});
var DelegationChainSchema = import_zod3.z.array(DelegationSchema);
var DelegationChainV2Schema = import_zod3.z.object({
  /** The root delegation from the original authority */
  root: DelegationSchema,
  /** Intermediate delegations in the chain (may be empty) */
  chain: import_zod3.z.array(DelegationSchema),
  /** The final delegation to the current user */
  leaf: DelegationSchema
});
var DelegationDirectionSchema = import_zod3.z.enum(["granted", "received", "all"]);
var DelegationFiltersSchema = import_zod3.z.object({
  /** Filter by delegation direction */
  direction: DelegationDirectionSchema.optional(),
  /** Filter by resource path pattern */
  path: import_zod3.z.string().optional(),
  /** Filter by required actions */
  actions: import_zod3.z.array(import_zod3.z.string()).optional(),
  /** Include revoked delegations */
  includeRevoked: import_zod3.z.boolean().optional(),
  /** Filter by delegator DID */
  delegator: import_zod3.z.string().optional(),
  /** Filter by delegatee DID */
  delegatee: import_zod3.z.string().optional(),
  /** Only include delegations valid at this time */
  validAt: import_zod3.z.coerce.date().optional(),
  /** Maximum number of results to return */
  limit: import_zod3.z.number().optional(),
  /** Cursor for pagination */
  cursor: import_zod3.z.string().optional()
});
var SpaceOwnershipSchema = import_zod3.z.enum(["owned", "delegated"]);
var SpaceInfoSchema = import_zod3.z.object({
  /** Space identifier */
  id: import_zod3.z.string(),
  /** Human-readable name for the space */
  name: import_zod3.z.string().optional(),
  /** DID of the space owner */
  owner: import_zod3.z.string(),
  /** Whether user owns or has delegated access */
  type: SpaceOwnershipSchema,
  /** Permissions the user has in this space */
  permissions: import_zod3.z.array(import_zod3.z.string()).optional(),
  /** When the access expires (for delegated spaces) */
  expiresAt: import_zod3.z.coerce.date().optional()
});
var ShareSchemaSchema = import_zod3.z.enum(["base64", "compact", "ipfs"]);
var ShareLinkSchema = import_zod3.z.object({
  /** Unique token identifying this share link */
  token: import_zod3.z.string(),
  /** Full URL for sharing */
  url: import_zod3.z.string(),
  /** The delegation this link grants access to */
  delegation: DelegationSchema,
  /** Encoding schema used for the link */
  schema: ShareSchemaSchema,
  /** When this share link expires */
  expiresAt: import_zod3.z.coerce.date().optional(),
  /** Human-readable description of what is being shared */
  description: import_zod3.z.string().optional()
});
function createShareLinkDataSchema(dataSchema) {
  return import_zod3.z.object({
    /** The retrieved data */
    data: dataSchema,
    /** The delegation that authorized this access */
    delegation: DelegationSchema,
    /** The space the data belongs to */
    spaceId: import_zod3.z.string(),
    /** The resource path that was accessed */
    path: import_zod3.z.string()
  });
}
var ShareLinkDataSchema = createShareLinkDataSchema(import_zod3.z.unknown());
var IngestOptionsSchema = import_zod3.z.object({
  /** Whether to persist the delegation to storage */
  persist: import_zod3.z.boolean().optional(),
  /** Whether to validate the full delegation chain */
  validateChain: import_zod3.z.boolean().optional(),
  /** Name for the ingested key */
  keyName: import_zod3.z.string().optional(),
  /** Whether to create a session key for this delegation */
  createSessionKey: import_zod3.z.boolean().optional(),
  /** Override the priority for the ingested key */
  priority: import_zod3.z.number().optional()
});
var GenerateShareParamsSchema = import_zod3.z.object({
  /** Resource path to share */
  path: import_zod3.z.string(),
  /** Actions to authorize */
  actions: import_zod3.z.array(import_zod3.z.string()).optional(),
  /** When the share link expires */
  expiry: import_zod3.z.coerce.date().optional(),
  /** Encoding schema for the link */
  schema: ShareSchemaSchema.optional(),
  /** Human-readable description */
  description: import_zod3.z.string().optional(),
  /** Base URL for the share link */
  baseUrl: import_zod3.z.string().optional()
});
var DelegationManagerConfigSchema = import_zod3.z.object({
  /** TinyCloud host URLs */
  hosts: import_zod3.z.array(import_zod3.z.string()),
  /** Active session for authentication */
  session: import_zod3.z.unknown().refine(
    (val) => val !== null && typeof val === "object",
    { message: "Expected a ServiceSession object" }
  ),
  /** Platform-specific invoke function */
  invoke: import_zod3.z.unknown().refine(
    (val) => typeof val === "function",
    { message: "Expected an invoke function" }
  ),
  /** Optional custom fetch implementation */
  fetch: import_zod3.z.unknown().refine(
    (val) => val === void 0 || typeof val === "function",
    { message: "Expected a fetch function or undefined" }
  ).optional()
});
var KeyProviderSchema = import_zod3.z.object({
  /** Generate a new session key, returns key ID */
  createSessionKey: import_zod3.z.unknown().refine(
    (val) => typeof val === "function",
    { message: "Expected a function" }
  ),
  /** Get JWK for a key */
  getJWK: import_zod3.z.unknown().refine(
    (val) => typeof val === "function",
    { message: "Expected a function" }
  ),
  /** Get DID for a key */
  getDID: import_zod3.z.unknown().refine(
    (val) => typeof val === "function",
    { message: "Expected a function" }
  )
});
var DelegationApiResponseSchema = import_zod3.z.object({
  /** SIWE message content */
  siwe: import_zod3.z.string(),
  /** Signature of the SIWE message */
  signature: import_zod3.z.string(),
  /** Delegation version */
  version: import_zod3.z.number(),
  /** CID of the created delegation */
  cid: import_zod3.z.string().optional()
});
var DelegatedResourceSchema = import_zod3.z.object({
  /** Short-form service name, e.g. "kv", "sql", "duckdb", "capabilities", "hooks". */
  service: import_zod3.z.string(),
  /** Full space id string, e.g. "tinycloud:pkh:eip155:1:0x....:default". */
  space: import_zod3.z.string(),
  /** Resource path; empty string when the resource URI had no path segment. */
  path: import_zod3.z.string(),
  /** Full-URN ability strings, e.g. ["tinycloud.kv/get", "tinycloud.kv/put"]. */
  actions: import_zod3.z.array(import_zod3.z.string())
});
var CreateDelegationWasmParamsSchema = import_zod3.z.object({
  /** The session containing delegation credentials */
  session: import_zod3.z.unknown().refine(
    (val) => val !== null && typeof val === "object",
    { message: "Expected a ServiceSession object" }
  ),
  /** DID of the delegate */
  delegateDID: import_zod3.z.string(),
  /** Space ID this delegation applies to */
  spaceId: import_zod3.z.string(),
  /**
   * Multi-resource abilities map: short-service → path → full-URN actions.
   * Matches the shape accepted by `prepareSession`.
   *
   * Example:
   * ```
   * {
   *   kv: {
   *     "com.listen.app/": ["tinycloud.kv/get", "tinycloud.kv/put"]
   *   },
   *   sql: {
   *     "com.listen.app/data.sqlite": ["tinycloud.sql/read"]
   *   }
   * }
   * ```
   */
  abilities: import_zod3.z.record(import_zod3.z.string(), import_zod3.z.record(import_zod3.z.string(), import_zod3.z.array(import_zod3.z.string()))),
  /** Expiration time in seconds since Unix epoch */
  expirationSecs: import_zod3.z.number(),
  /** Optional not-before time in seconds since Unix epoch */
  notBeforeSecs: import_zod3.z.number().optional()
});
var CreateDelegationWasmResultSchema = import_zod3.z.object({
  /** Base64url-encoded UCAN delegation */
  delegation: import_zod3.z.string(),
  /** CID of the delegation */
  cid: import_zod3.z.string(),
  /** DID of the delegate */
  delegateDID: import_zod3.z.string(),
  /** Expiration time */
  expiry: import_zod3.z.coerce.date(),
  /**
   * All (service, space, path, actions) entries granted by this delegation.
   * Always non-empty on success.
   */
  resources: import_zod3.z.array(DelegatedResourceSchema)
});

// src/spaces/spaces.schema.ts
var SpaceConfigSchema = import_zod4.z.object({
  /** The space identifier (full URI) */
  id: import_zod4.z.string(),
  /** The short name of the space */
  name: import_zod4.z.string(),
  /** Factory function to create a space-scoped KV service */
  createKV: import_zod4.z.function(),
  /** Factory function to create a space-scoped Data Vault service */
  createVault: import_zod4.z.function(),
  /** Optional factory function to create a space-scoped secrets service */
  createSecrets: import_zod4.z.function().optional(),
  /** Factory function to create space-scoped delegations */
  createDelegations: import_zod4.z.function(),
  /** Factory function to create space-scoped sharing */
  createSharing: import_zod4.z.function(),
  /** Function to get space info */
  getInfo: import_zod4.z.function()
});
var SpaceServiceConfigSchema = import_zod4.z.object({
  /** TinyCloud host URLs */
  hosts: import_zod4.z.array(import_zod4.z.string()),
  /** Active session for authentication */
  session: import_zod4.z.unknown(),
  /** Platform-specific invoke function */
  invoke: import_zod4.z.function(),
  /** Optional custom fetch implementation */
  fetch: import_zod4.z.function().optional(),
  /** Optional capability key registry for delegated space discovery */
  capabilityRegistry: import_zod4.z.unknown().optional(),
  /** Factory function to create a space-scoped KV service */
  createKVService: import_zod4.z.function().optional(),
  /** Factory function to create a space-scoped Data Vault service */
  createVaultService: import_zod4.z.function().optional(),
  /** Factory function to create a space-scoped secrets service */
  createSecretsService: import_zod4.z.function().optional(),
  /** User's PKH DID (derived from address or provided explicitly) */
  userDid: import_zod4.z.string().optional(),
  /** Optional SharingService for v2 sharing links (client-side) */
  sharingService: import_zod4.z.unknown().optional(),
  /** Factory function to create delegations using SIWE-based flow */
  createDelegation: import_zod4.z.function().optional()
});
var SpaceDelegationParamsSchema = CreateDelegationParamsSchema.extend({
  /** The space ID to create the delegation for */
  spaceId: import_zod4.z.string()
});
var ServerDelegationInfoSchema = import_zod4.z.object({
  /** DID of the delegator */
  delegator: import_zod4.z.string(),
  /** DID of the delegate */
  delegate: import_zod4.z.string(),
  /** Parent delegation CIDs - accepts string or byte array format from server */
  parents: import_zod4.z.array(import_zod4.z.union([import_zod4.z.string(), import_zod4.z.array(import_zod4.z.number())])),
  /** Expiration time (ISO8601 string) */
  expiry: import_zod4.z.string().optional(),
  /** Not-before time (ISO8601 string) */
  not_before: import_zod4.z.string().optional(),
  /** Issued-at time (ISO8601 string) */
  issued_at: import_zod4.z.string().optional(),
  /** Capabilities granted by this delegation */
  capabilities: import_zod4.z.array(
    import_zod4.z.object({
      resource: import_zod4.z.string(),
      ability: import_zod4.z.string()
    })
  )
});
var ServerDelegationsResponseSchema = import_zod4.z.record(
  import_zod4.z.string(),
  ServerDelegationInfoSchema
);
var ServerOwnedSpaceSchema = import_zod4.z.object({
  /** Space identifier */
  id: import_zod4.z.string(),
  /** Space name (optional, can be derived from id) */
  name: import_zod4.z.string().optional(),
  /** Owner DID */
  owner: import_zod4.z.string(),
  /** Creation timestamp */
  createdAt: import_zod4.z.string().optional()
});
var ServerOwnedSpacesResponseSchema = import_zod4.z.array(ServerOwnedSpaceSchema);
var ServerCreateSpaceResponseSchema = import_zod4.z.object({
  /** Space identifier */
  id: import_zod4.z.string(),
  /** Space name */
  name: import_zod4.z.string(),
  /** Owner DID */
  owner: import_zod4.z.string(),
  /** Creation timestamp */
  createdAt: import_zod4.z.string().optional()
});
var ServerSpaceInfoResponseSchema = import_zod4.z.object({
  /** Space identifier */
  id: import_zod4.z.string(),
  /** Space name (optional) */
  name: import_zod4.z.string().optional(),
  /** Owner DID */
  owner: import_zod4.z.string(),
  /** Ownership type */
  type: import_zod4.z.enum(["owned", "delegated"]).optional(),
  /** Permissions the user has in this space */
  permissions: import_zod4.z.array(import_zod4.z.string()).optional(),
  /** Expiration for delegated access */
  expiresAt: import_zod4.z.string().optional()
});
function validateServerDelegationsResponse(data) {
  if (data === null || data === void 0) {
    return { ok: true, data: {} };
  }
  if (Array.isArray(data)) {
    return { ok: true, data: {} };
  }
  const result = ServerDelegationsResponseSchema.safeParse(data);
  if (!result.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: `Invalid server delegations response: ${result.error.message}`,
        service: "space",
        meta: { issues: result.error.issues }
      }
    };
  }
  return { ok: true, data: result.data };
}
function validateServerOwnedSpacesResponse(data) {
  const result = ServerOwnedSpacesResponseSchema.safeParse(data);
  if (!result.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: `Invalid server owned spaces response: ${result.error.message}`,
        service: "space",
        meta: { issues: result.error.issues }
      }
    };
  }
  return { ok: true, data: result.data };
}
function validateServerCreateSpaceResponse(data) {
  const result = ServerCreateSpaceResponseSchema.safeParse(data);
  if (!result.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: `Invalid server create space response: ${result.error.message}`,
        service: "space",
        meta: { issues: result.error.issues }
      }
    };
  }
  return { ok: true, data: result.data };
}
function validateServerSpaceInfoResponse(data) {
  const result = ServerSpaceInfoResponseSchema.safeParse(data);
  if (!result.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: `Invalid server space info response: ${result.error.message}`,
        service: "space",
        meta: { issues: result.error.issues }
      }
    };
  }
  return { ok: true, data: result.data };
}

// src/expiry.ts
var EPHEMERAL_MS = 60 * 60 * 1e3;
var SIGNED_READ_URL_MS = 5 * 60 * 1e3;
var SESSION_MS = 7 * 24 * 60 * 60 * 1e3;
var SHARE_MS = 7 * 24 * 60 * 60 * 1e3;
var APP_MS = 30 * 24 * 60 * 60 * 1e3;
var MAX_MS = 10 * 365 * 24 * 60 * 60 * 1e3;
var EXPIRY = {
  EPHEMERAL_MS,
  SIGNED_READ_URL_MS,
  SESSION_MS,
  SHARE_MS,
  APP_MS,
  MAX_MS
};
var DEFAULT_SIGNED_READ_URL_EXPIRY_MS = EXPIRY.SIGNED_READ_URL_MS;

// src/spaces/SpaceService.ts
var SERVICE_NAME = "space";
function ownerDidEquals(a, b) {
  if (!b) return false;
  try {
    return principalDidEquals(a, b);
  } catch {
    return a === b;
  }
}
var SpaceErrorCodes = {
  /** Space not found */
  NOT_FOUND: "SPACE_NOT_FOUND",
  /** Space already exists */
  ALREADY_EXISTS: "SPACE_ALREADY_EXISTS",
  /** Creation failed */
  CREATION_FAILED: "SPACE_CREATION_FAILED",
  /** Authentication required */
  AUTH_REQUIRED: "AUTH_REQUIRED",
  /** Invalid space name or URI */
  INVALID_NAME: "INVALID_SPACE_NAME",
  /** Network error */
  NETWORK_ERROR: "NETWORK_ERROR",
  /** Not initialized */
  NOT_INITIALIZED: "NOT_INITIALIZED"
};
function makePublicSpaceId(address, chainId) {
  return makePkhSpaceId(address, chainId, "public");
}
function parseSpaceUri(uri) {
  const fullUriMatch = uri.match(
    /^tinycloud:pkh:eip155:(\d+):(0x[a-fA-F0-9]{40}):(.+)$/
  );
  if (fullUriMatch) {
    const [, chainId, address, name] = fullUriMatch;
    try {
      const chainIdNumber = Number(chainId);
      const canonicalAddress = canonicalizeAddress(address);
      return {
        owner: pkhDid(canonicalAddress, chainIdNumber),
        name,
        chainId: String(chainIdNumber),
        address: canonicalAddress
      };
    } catch {
      return null;
    }
  }
  if (/^[a-zA-Z0-9_-]+$/.test(uri)) {
    return {
      owner: "",
      // Will be filled in from session
      name: uri
    };
  }
  return null;
}
function buildSpaceUri(owner, name) {
  const pkh = parsePkhDid(owner);
  if (pkh) {
    return makePkhSpaceId(pkh.address, pkh.chainId, name);
  }
  return `tinycloud:${owner}:${name}`;
}
function transformServerDelegations(validatedData, defaultSpaceId) {
  const result = [];
  for (const [cid, info] of Object.entries(validatedData)) {
    const capabilities = info.capabilities;
    let path = "";
    let spaceId = defaultSpaceId;
    const actions = [];
    for (const cap of capabilities) {
      actions.push(cap.ability);
      const resourceMatch = cap.resource.match(
        /^(tinycloud:pkh:eip155:\d+:0x[a-fA-F0-9]+:[^/]+)\/[^/]+\/(.*)$/
      );
      if (resourceMatch) {
        spaceId = resourceMatch[1];
        path = resourceMatch[2] || "";
      }
    }
    const firstStringParent = info.parents?.find((p) => typeof p === "string");
    result.push({
      cid,
      delegateDID: info.delegate,
      delegatorDID: info.delegator,
      spaceId,
      path,
      actions,
      expiry: info.expiry ? new Date(info.expiry) : new Date(Date.now() + EXPIRY.SHARE_MS),
      isRevoked: false,
      createdAt: info.issued_at ? new Date(info.issued_at) : void 0,
      parentCid: firstStringParent
    });
  }
  return result;
}
var SpaceService = class {
  /**
   * Create a new SpaceService instance.
   *
   * @param config - Service configuration
   */
  constructor(config) {
    /** Cache of created Space objects */
    this.spaceCache = /* @__PURE__ */ new Map();
    /** Cache of space info */
    this.infoCache = /* @__PURE__ */ new Map();
    /** Cache TTL in milliseconds (5 minutes) */
    this.cacheTTL = 5 * 60 * 1e3;
    this.hosts = config.hosts;
    this.session = config.session;
    this.invoke = config.invoke;
    this.fetchFn = config.fetch ?? globalThis.fetch.bind(globalThis);
    this.capabilityRegistry = config.capabilityRegistry;
    this.createKVServiceFn = config.createKVService;
    this.createVaultServiceFn = config.createVaultService;
    this.createSecretsServiceFn = config.createSecretsService;
    this._userDid = config.userDid;
    this.sharingService = config.sharingService;
    this.createDelegationFn = config.createDelegation;
    this.onSpaceRegisteredFn = config.onSpaceRegistered;
  }
  /**
   * Update the service configuration.
   */
  updateConfig(config) {
    if (config.hosts) this.hosts = config.hosts;
    if (config.session) this.session = config.session;
    if (config.invoke) this.invoke = config.invoke;
    if (config.fetch) this.fetchFn = config.fetch;
    if (config.capabilityRegistry) this.capabilityRegistry = config.capabilityRegistry;
    if (config.createKVService) this.createKVServiceFn = config.createKVService;
    if (config.createVaultService) this.createVaultServiceFn = config.createVaultService;
    if (config.createSecretsService) this.createSecretsServiceFn = config.createSecretsService;
    if (config.userDid !== void 0) this._userDid = config.userDid;
    if (config.sharingService) this.sharingService = config.sharingService;
    if (config.createDelegation) this.createDelegationFn = config.createDelegation;
    if (config.onSpaceRegistered) this.onSpaceRegisteredFn = config.onSpaceRegistered;
    this.spaceCache.clear();
    this.infoCache.clear();
  }
  /**
   * Get the current user's primary space ID.
   */
  getCurrentSpaceId() {
    return this.session?.spaceId;
  }
  /**
   * Get the primary host URL.
   */
  get host() {
    return this.hosts[0];
  }
  /**
   * Get the current user's PKH DID.
   */
  get userDid() {
    if (this._userDid) {
      return this._userDid;
    }
    return void 0;
  }
  // ===========================================================================
  // List Spaces
  // ===========================================================================
  /**
   * List all spaces the user has access to.
   *
   * Combines owned spaces (from the server) with delegated spaces
   * (from the capability registry).
   */
  async list() {
    if (!this.session) {
      return (0, import_sdk_services2.err)(
        (0, import_sdk_services2.serviceError)(SpaceErrorCodes.AUTH_REQUIRED, "Authentication required", SERVICE_NAME)
      );
    }
    try {
      const spaces = [];
      const ownedResult = await this.listOwnedSpaces();
      if (ownedResult.ok) {
        spaces.push(...ownedResult.data);
      }
      if (this.capabilityRegistry) {
        const delegatedSpaces = this.discoverDelegatedSpaces();
        spaces.push(...delegatedSpaces);
      }
      const uniqueSpaces = this.deduplicateSpaces(spaces);
      for (const space of uniqueSpaces) {
        this.notifySpaceRegistered(space);
      }
      return (0, import_sdk_services2.ok)(uniqueSpaces);
    } catch (error) {
      return (0, import_sdk_services2.err)(
        (0, import_sdk_services2.serviceError)(
          SpaceErrorCodes.NETWORK_ERROR,
          `Failed to list spaces: ${String(error)}`,
          SERVICE_NAME,
          { cause: error instanceof Error ? error : void 0 }
        )
      );
    }
  }
  /**
   * List owned spaces from the server.
   */
  async listOwnedSpaces() {
    try {
      const headers = this.invoke(this.session, "space", "", "tinycloud.space/list");
      const response = await this.fetchFn(`${this.host}/invoke`, {
        method: "POST",
        headers
      });
      if (!response.ok) {
        const errorText = await response.text();
        return (0, import_sdk_services2.err)(
          (0, import_sdk_services2.serviceError)(
            SpaceErrorCodes.NETWORK_ERROR,
            `Failed to list owned spaces: ${response.status} - ${errorText}`,
            SERVICE_NAME,
            { meta: { status: response.status } }
          )
        );
      }
      const rawData = await response.json();
      const validationResult = validateServerOwnedSpacesResponse(rawData);
      if (!validationResult.ok) {
        return (0, import_sdk_services2.err)(
          (0, import_sdk_services2.serviceError)(
            SpaceErrorCodes.NETWORK_ERROR,
            validationResult.error.message,
            SERVICE_NAME,
            { meta: validationResult.error.meta }
          )
        );
      }
      const spaces = validationResult.data.map((item) => ({
        id: item.id,
        name: item.name ?? this.extractNameFromId(item.id),
        owner: item.owner,
        type: "owned",
        permissions: ["*"]
        // Full permissions for owned spaces
      }));
      return (0, import_sdk_services2.ok)(spaces);
    } catch (error) {
      return (0, import_sdk_services2.err)(
        (0, import_sdk_services2.serviceError)(
          SpaceErrorCodes.NETWORK_ERROR,
          `Network error listing owned spaces: ${String(error)}`,
          SERVICE_NAME,
          { cause: error instanceof Error ? error : void 0 }
        )
      );
    }
  }
  /**
   * Discover delegated spaces from the capability registry.
   */
  discoverDelegatedSpaces() {
    if (!this.capabilityRegistry) {
      return [];
    }
    const spaces = /* @__PURE__ */ new Map();
    const capabilities = this.capabilityRegistry.getAllCapabilities();
    for (const capability of capabilities) {
      const spaceId = capability.delegation.spaceId;
      if (spaces.has(spaceId)) {
        const existing = spaces.get(spaceId);
        if (existing.permissions) {
          const actions = capability.delegation.actions;
          for (const action of actions) {
            if (!existing.permissions.includes(action)) {
              existing.permissions.push(action);
            }
          }
        }
        continue;
      }
      if (spaceId === this.session?.spaceId) {
        continue;
      }
      const parsed = parseSpaceUri(spaceId);
      spaces.set(spaceId, {
        id: spaceId,
        name: parsed?.name ?? this.extractNameFromId(spaceId),
        owner: capability.delegation.delegatorDID ?? parsed?.owner ?? "",
        type: "delegated",
        permissions: [...capability.delegation.actions],
        expiresAt: capability.expiresAt
      });
    }
    return Array.from(spaces.values());
  }
  /**
   * Extract space name from a full space ID.
   */
  extractNameFromId(id) {
    const parsed = parseSpaceUri(id);
    if (parsed) {
      return parsed.name;
    }
    const parts = id.split(":");
    return parts[parts.length - 1] || id;
  }
  /**
   * Deduplicate spaces, preferring owned over delegated.
   */
  deduplicateSpaces(spaces) {
    const seen = /* @__PURE__ */ new Map();
    for (const space of spaces) {
      const existing = seen.get(space.id);
      if (!existing || existing.type === "delegated" && space.type === "owned") {
        seen.set(space.id, space);
      }
    }
    return Array.from(seen.values());
  }
  // ===========================================================================
  // Create Space
  // ===========================================================================
  /**
   * Create a new space.
   *
   * @param name - The name for the new space
   */
  async create(name) {
    if (!this.session) {
      return (0, import_sdk_services2.err)(
        (0, import_sdk_services2.serviceError)(SpaceErrorCodes.AUTH_REQUIRED, "Authentication required", SERVICE_NAME)
      );
    }
    if (!name || !/^[a-zA-Z0-9_-]+$/.test(name)) {
      return (0, import_sdk_services2.err)(
        (0, import_sdk_services2.serviceError)(
          SpaceErrorCodes.INVALID_NAME,
          "Space name must contain only alphanumeric characters, underscores, and hyphens",
          SERVICE_NAME
        )
      );
    }
    try {
      const headers = this.invoke(this.session, "space", name, "tinycloud.space/create");
      const response = await this.fetchFn(`${this.host}/invoke`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name })
      });
      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 409) {
          return (0, import_sdk_services2.err)(
            (0, import_sdk_services2.serviceError)(
              SpaceErrorCodes.ALREADY_EXISTS,
              `Space "${name}" already exists`,
              SERVICE_NAME
            )
          );
        }
        return (0, import_sdk_services2.err)(
          (0, import_sdk_services2.serviceError)(
            SpaceErrorCodes.CREATION_FAILED,
            `Failed to create space: ${response.status} - ${errorText}`,
            SERVICE_NAME,
            { meta: { status: response.status } }
          )
        );
      }
      const rawData = await response.json();
      const validationResult = validateServerCreateSpaceResponse(rawData);
      if (!validationResult.ok) {
        return (0, import_sdk_services2.err)(
          (0, import_sdk_services2.serviceError)(
            SpaceErrorCodes.CREATION_FAILED,
            validationResult.error.message,
            SERVICE_NAME,
            { meta: validationResult.error.meta }
          )
        );
      }
      const spaceInfo = {
        id: validationResult.data.id,
        name: validationResult.data.name || name,
        owner: validationResult.data.owner || this.userDid || "",
        type: "owned",
        permissions: ["*"]
      };
      this.infoCache.set(spaceInfo.id, { info: spaceInfo, cachedAt: Date.now() });
      this.notifySpaceRegistered(spaceInfo);
      return (0, import_sdk_services2.ok)(spaceInfo);
    } catch (error) {
      return (0, import_sdk_services2.err)(
        (0, import_sdk_services2.serviceError)(
          SpaceErrorCodes.NETWORK_ERROR,
          `Network error creating space: ${String(error)}`,
          SERVICE_NAME,
          { cause: error instanceof Error ? error : void 0 }
        )
      );
    }
  }
  notifySpaceRegistered(space) {
    if (!this.onSpaceRegisteredFn) return;
    void Promise.resolve(this.onSpaceRegisteredFn(space)).catch(() => {
    });
  }
  // ===========================================================================
  // Get Space
  // ===========================================================================
  /**
   * Get a Space object by name or full URI.
   *
   * @param nameOrUri - Short name or full URI
   */
  get(nameOrUri) {
    const spaceId = this.resolveSpaceId(nameOrUri);
    const cached = this.spaceCache.get(spaceId);
    if (cached) {
      return cached;
    }
    const parsed = parseSpaceUri(spaceId);
    const name = parsed?.name ?? this.extractNameFromId(spaceId);
    const config = {
      id: spaceId,
      name,
      createKV: this.createSpaceScopedKV.bind(this),
      createVault: this.createSpaceScopedVault.bind(this),
      createSecrets: this.createSpaceScopedSecrets.bind(this),
      createDelegations: this.createSpaceScopedDelegations.bind(this),
      createSharing: this.createSpaceScopedSharing.bind(this),
      getInfo: this.getSpaceInfo.bind(this)
    };
    const space = new Space(config);
    this.spaceCache.set(spaceId, space);
    return space;
  }
  /**
   * Resolve a name or URI to a full space ID.
   */
  resolveSpaceId(nameOrUri) {
    const parsed = parseSpaceUri(nameOrUri);
    if (!parsed) {
      return nameOrUri;
    }
    if (parsed.owner) {
      return nameOrUri;
    }
    if (this.userDid) {
      return buildSpaceUri(this.userDid, parsed.name);
    }
    return nameOrUri;
  }
  // ===========================================================================
  // Exists Check
  // ===========================================================================
  /**
   * Check if a space exists and the user has access.
   */
  async exists(nameOrUri) {
    const spaceId = this.resolveSpaceId(nameOrUri);
    const cached = this.infoCache.get(spaceId);
    if (cached && Date.now() - cached.cachedAt < this.cacheTTL) {
      return (0, import_sdk_services2.ok)(true);
    }
    const infoResult = await this.getSpaceInfo(spaceId);
    return (0, import_sdk_services2.ok)(infoResult.ok);
  }
  // ===========================================================================
  // Space Info
  // ===========================================================================
  /**
   * Get space info from server or cache.
   */
  async getSpaceInfo(spaceId) {
    const cached = this.infoCache.get(spaceId);
    if (cached && Date.now() - cached.cachedAt < this.cacheTTL) {
      return (0, import_sdk_services2.ok)(cached.info);
    }
    if (!this.session) {
      return (0, import_sdk_services2.err)(
        (0, import_sdk_services2.serviceError)(SpaceErrorCodes.AUTH_REQUIRED, "Authentication required", SERVICE_NAME)
      );
    }
    try {
      const headers = this.invoke(this.session, "space", spaceId, "tinycloud.space/info");
      const response = await this.fetchFn(`${this.host}/invoke`, {
        method: "POST",
        headers,
        body: JSON.stringify({ spaceId })
      });
      if (!response.ok) {
        if (response.status === 404) {
          return (0, import_sdk_services2.err)(
            (0, import_sdk_services2.serviceError)(SpaceErrorCodes.NOT_FOUND, `Space not found: ${spaceId}`, SERVICE_NAME)
          );
        }
        const errorText = await response.text();
        return (0, import_sdk_services2.err)(
          (0, import_sdk_services2.serviceError)(
            SpaceErrorCodes.NETWORK_ERROR,
            `Failed to get space info: ${response.status} - ${errorText}`,
            SERVICE_NAME
          )
        );
      }
      const rawData = await response.json();
      const validationResult = validateServerSpaceInfoResponse(rawData);
      if (!validationResult.ok) {
        return (0, import_sdk_services2.err)(
          (0, import_sdk_services2.serviceError)(
            SpaceErrorCodes.NETWORK_ERROR,
            validationResult.error.message,
            SERVICE_NAME,
            { meta: validationResult.error.meta }
          )
        );
      }
      const data = validationResult.data;
      const spaceInfo = {
        id: data.id,
        name: data.name ?? this.extractNameFromId(data.id),
        owner: data.owner,
        type: data.type ?? (ownerDidEquals(data.owner, this.userDid) ? "owned" : "delegated"),
        permissions: data.permissions,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : void 0
      };
      this.infoCache.set(spaceId, { info: spaceInfo, cachedAt: Date.now() });
      return (0, import_sdk_services2.ok)(spaceInfo);
    } catch (error) {
      return (0, import_sdk_services2.err)(
        (0, import_sdk_services2.serviceError)(
          SpaceErrorCodes.NETWORK_ERROR,
          `Network error getting space info: ${String(error)}`,
          SERVICE_NAME,
          { cause: error instanceof Error ? error : void 0 }
        )
      );
    }
  }
  // ===========================================================================
  // Space-Scoped Service Factories
  // ===========================================================================
  /**
   * Create a space-scoped KV service.
   */
  createSpaceScopedKV(spaceId) {
    if (this.createKVServiceFn) {
      return this.createKVServiceFn(spaceId);
    }
    return new Proxy({}, {
      get: () => {
        throw new Error(
          "KV service factory not configured. Provide createKVService in SpaceServiceConfig."
        );
      }
    });
  }
  /**
   * Create a space-scoped Data Vault service.
   */
  createSpaceScopedVault(spaceId) {
    if (this.createVaultServiceFn) {
      return this.createVaultServiceFn(spaceId);
    }
    return new Proxy({}, {
      get: () => {
        throw new Error(
          "Vault service factory not configured. Provide createVaultService in SpaceServiceConfig."
        );
      }
    });
  }
  /**
   * Create a space-scoped secrets service.
   */
  createSpaceScopedSecrets(spaceId) {
    if (this.createSecretsServiceFn) {
      return this.createSecretsServiceFn(spaceId);
    }
    return new Proxy({}, {
      get: () => {
        throw new Error(
          "Secrets service factory not configured. Provide createSecretsService in SpaceServiceConfig."
        );
      }
    });
  }
  /**
   * Create space-scoped delegation operations.
   */
  createSpaceScopedDelegations(spaceId) {
    const self = this;
    return {
      async list() {
        try {
          const facts = [
            {
              capabilitiesReadParams: {
                type: "list",
                filters: { direction: "created" }
              }
            }
          ];
          const headers = self.invoke(
            self.session,
            "capabilities",
            "all",
            "tinycloud.capabilities/read",
            facts
          );
          const response = await self.fetchFn(`${self.host}/invoke`, {
            method: "POST",
            headers
          });
          if (!response.ok) {
            const errorText = await response.text();
            return (0, import_sdk_services2.err)(
              (0, import_sdk_services2.serviceError)(
                SpaceErrorCodes.NETWORK_ERROR,
                `Failed to list delegations: ${response.status} - ${errorText}`,
                SERVICE_NAME
              )
            );
          }
          const rawData = await response.json();
          const validationResult = validateServerDelegationsResponse(rawData);
          if (!validationResult.ok) {
            return (0, import_sdk_services2.err)(
              (0, import_sdk_services2.serviceError)(
                SpaceErrorCodes.NETWORK_ERROR,
                validationResult.error.message,
                SERVICE_NAME,
                { meta: validationResult.error.meta }
              )
            );
          }
          const delegations = transformServerDelegations(validationResult.data, spaceId);
          return (0, import_sdk_services2.ok)(delegations);
        } catch (error) {
          return (0, import_sdk_services2.err)(
            (0, import_sdk_services2.serviceError)(
              SpaceErrorCodes.NETWORK_ERROR,
              `Network error listing delegations: ${String(error)}`,
              SERVICE_NAME
            )
          );
        }
      },
      async listReceived() {
        try {
          const facts = [
            {
              capabilitiesReadParams: {
                type: "list",
                filters: { direction: "received" }
              }
            }
          ];
          const headers = self.invoke(
            self.session,
            "capabilities",
            "all",
            "tinycloud.capabilities/read",
            facts
          );
          const response = await self.fetchFn(`${self.host}/invoke`, {
            method: "POST",
            headers
          });
          if (!response.ok) {
            const errorText = await response.text();
            return (0, import_sdk_services2.err)(
              (0, import_sdk_services2.serviceError)(
                SpaceErrorCodes.NETWORK_ERROR,
                `Failed to list received delegations: ${response.status} - ${errorText}`,
                SERVICE_NAME
              )
            );
          }
          const rawData = await response.json();
          const validationResult = validateServerDelegationsResponse(rawData);
          if (!validationResult.ok) {
            return (0, import_sdk_services2.err)(
              (0, import_sdk_services2.serviceError)(
                SpaceErrorCodes.NETWORK_ERROR,
                validationResult.error.message,
                SERVICE_NAME,
                { meta: validationResult.error.meta }
              )
            );
          }
          const delegations = transformServerDelegations(validationResult.data, spaceId);
          return (0, import_sdk_services2.ok)(delegations);
        } catch (error) {
          return (0, import_sdk_services2.err)(
            (0, import_sdk_services2.serviceError)(
              SpaceErrorCodes.NETWORK_ERROR,
              `Network error listing received delegations: ${String(error)}`,
              SERVICE_NAME
            )
          );
        }
      },
      async create(params) {
        if (self.createDelegationFn) {
          return self.createDelegationFn({ ...params, spaceId });
        }
        return (0, import_sdk_services2.err)(
          (0, import_sdk_services2.serviceError)(
            SpaceErrorCodes.NOT_INITIALIZED,
            "Delegation creation requires a createDelegation function. This should be provided by the platform SDK (web-sdk or node-sdk).",
            SERVICE_NAME
          )
        );
      },
      async revoke(cid) {
        try {
          const headers = self.invoke(
            self.session,
            "delegation",
            cid,
            "tinycloud.delegation/revoke"
          );
          const response = await self.fetchFn(`${self.host}/revoke`, {
            method: "POST",
            headers,
            body: JSON.stringify({ cid, spaceId })
          });
          if (!response.ok) {
            const errorText = await response.text();
            return (0, import_sdk_services2.err)(
              (0, import_sdk_services2.serviceError)(
                SpaceErrorCodes.NETWORK_ERROR,
                `Failed to revoke delegation: ${response.status} - ${errorText}`,
                SERVICE_NAME
              )
            );
          }
          return (0, import_sdk_services2.ok)(void 0);
        } catch (error) {
          return (0, import_sdk_services2.err)(
            (0, import_sdk_services2.serviceError)(
              SpaceErrorCodes.NETWORK_ERROR,
              `Network error revoking delegation: ${String(error)}`,
              SERVICE_NAME
            )
          );
        }
      }
    };
  }
  /**
   * Create space-scoped sharing operations.
   *
   * When a SharingService is configured, delegates to client-side v2 sharing.
   * V2 sharing links are self-contained with embedded private keys - no server tracking.
   */
  createSpaceScopedSharing(spaceId) {
    const self = this;
    return {
      async generate(params) {
        if (self.sharingService) {
          const result = await self.sharingService.generate(params);
          if (!result.ok) {
            return (0, import_sdk_services2.err)(
              (0, import_sdk_services2.serviceError)(
                SpaceErrorCodes.NETWORK_ERROR,
                result.error.message || "Failed to generate share link",
                SERVICE_NAME
              )
            );
          }
          return (0, import_sdk_services2.ok)(result.data);
        }
        return (0, import_sdk_services2.err)(
          (0, import_sdk_services2.serviceError)(
            SpaceErrorCodes.NOT_INITIALIZED,
            "SharingService not configured. V2 sharing requires a SharingService instance.",
            SERVICE_NAME
          )
        );
      },
      async list() {
        return (0, import_sdk_services2.err)(
          (0, import_sdk_services2.serviceError)(
            SpaceErrorCodes.NOT_INITIALIZED,
            "Listing share links is not supported in v2. Share links are self-contained tokens that are not tracked on the server.",
            SERVICE_NAME
          )
        );
      },
      async revoke(token) {
        return (0, import_sdk_services2.err)(
          (0, import_sdk_services2.serviceError)(
            SpaceErrorCodes.NOT_INITIALIZED,
            "Revoking share links by token is not supported in v2. To revoke access, revoke the underlying delegation using space.delegations.revoke(cid).",
            SERVICE_NAME
          )
        );
      }
    };
  }
};
function createSpaceService(config) {
  return new SpaceService(config);
}

// src/TinyCloud.ts
var TinyCloud = class _TinyCloud {
  /**
   * Create a new TinyCloud SDK instance.
   *
   * @param userAuthorization - Platform-specific authorization implementation
   * @param config - Optional SDK configuration
   */
  constructor(userAuthorization, config) {
    /**
     * Registered extensions.
     */
    this.extensions = [];
    /**
     * Registered services by name.
     */
    this._services = /* @__PURE__ */ new Map();
    /**
     * Whether services have been initialized.
     */
    this._servicesInitialized = false;
    this.userAuthorization = userAuthorization;
    this.config = config || {};
  }
  // === Service Management ===
  /**
   * Initialize services with platform dependencies.
   * Must be called before using services.
   *
   * @param invoke - Platform-specific invoke function from WASM binding
   * @param hosts - TinyCloud host URLs (optional, uses config.hosts)
   * @param fetchFn - Custom fetch implementation (optional)
   */
  initializeServices(invoke, hosts, fetchFn) {
    const effectiveInvoke = invoke ?? this.config.invoke;
    const effectiveHosts = hosts ?? this.config.hosts;
    if (!effectiveInvoke) {
      throw new Error(
        "invoke function is required to initialize services. Provide it via config.invoke or initializeServices()."
      );
    }
    if (!effectiveHosts || effectiveHosts.length === 0) {
      throw new Error(
        "hosts are required to initialize services. Provide them via config.hosts or initializeServices()."
      );
    }
    this._serviceContext = new import_sdk_services3.ServiceContext({
      invoke: effectiveInvoke,
      invokeAny: this.config.invokeAny,
      fetch: fetchFn ?? this.config.fetch ?? globalThis.fetch.bind(globalThis),
      hosts: effectiveHosts,
      retryPolicy: this.config.retryPolicy,
      telemetry: this.config.telemetry
    });
    const serviceConstructors = {
      kv: import_sdk_services3.KVService,
      sql: import_sdk_services3.SQLService,
      duckdb: import_sdk_services3.DuckDbService,
      hooks: import_sdk_services3.HooksService,
      ...this.config.services
    };
    for (const [name, ServiceClass] of Object.entries(serviceConstructors)) {
      const serviceConfig = this.config.serviceConfigs?.[name] ?? {};
      const service = new ServiceClass(serviceConfig);
      service.initialize(this._serviceContext);
      this._serviceContext.registerService(name, service);
      this._services.set(name, service);
    }
    this._servicesInitialized = true;
  }
  /**
   * Get the service context.
   * @throws Error if services are not initialized
   */
  get serviceContext() {
    if (!this._serviceContext) {
      throw new Error(
        "Services not initialized. Call initializeServices() first."
      );
    }
    return this._serviceContext;
  }
  /**
   * Get a registered service by name.
   *
   * @param name - Service name (e.g., 'kv')
   * @returns The service instance or undefined
   */
  getService(name) {
    return this._services.get(name);
  }
  /**
   * Get the KV service.
   * @throws Error if services are not initialized
   */
  get kv() {
    if (!this._servicesInitialized) {
      throw new Error(
        "Services not initialized. Call initializeServices() first, or use TinyCloudWeb/TinyCloudNode which handles this automatically."
      );
    }
    const service = this._services.get("kv");
    if (!service) {
      throw new Error("KV service is not registered.");
    }
    return service;
  }
  /**
   * Get the SQL service.
   * @throws Error if services are not initialized
   */
  get sql() {
    if (!this._servicesInitialized) {
      throw new Error(
        "Services not initialized. Call initializeServices() first, or use TinyCloudWeb/TinyCloudNode which handles this automatically."
      );
    }
    const service = this._services.get("sql");
    if (!service) {
      throw new Error("SQL service is not registered.");
    }
    return service;
  }
  /**
   * Get the DuckDB service.
   * @throws Error if services are not initialized
   */
  get duckdb() {
    if (!this._servicesInitialized) {
      throw new Error(
        "Services not initialized. Call initializeServices() first, or use TinyCloudWeb/TinyCloudNode which handles this automatically."
      );
    }
    const service = this._services.get("duckdb");
    if (!service) {
      throw new Error("DuckDB service is not registered.");
    }
    return service;
  }
  /**
   * Get the Hooks service.
   * @throws Error if services are not initialized
   */
  get hooks() {
    if (!this._servicesInitialized) {
      throw new Error(
        "Services not initialized. Call initializeServices() first, or use TinyCloudWeb/TinyCloudNode which handles this automatically."
      );
    }
    const service = this._services.get("hooks");
    if (!service) {
      throw new Error("Hooks service is not registered.");
    }
    return service;
  }
  /**
   * Get the Data Vault service.
   * @throws Error if services are not initialized or vault service is not registered
   */
  get vault() {
    if (!this._servicesInitialized) {
      throw new Error(
        "Services not initialized. Call initializeServices() first, or use TinyCloudWeb/TinyCloudNode which handles this automatically."
      );
    }
    const service = this._services.get("vault");
    if (!service) {
      throw new Error("Vault service is not registered.");
    }
    return service;
  }
  /**
   * Get the Encryption service.
   * @throws Error if services are not initialized or encryption service is not registered
   */
  get encryption() {
    if (!this._servicesInitialized) {
      throw new Error(
        "Services not initialized. Call initializeServices() first, or use TinyCloudWeb/TinyCloudNode which handles this automatically."
      );
    }
    const service = this._services.get("encryption");
    if (!service) {
      throw new Error("Encryption service is not registered.");
    }
    return service;
  }
  /**
   * Notify services of session change.
   * Called internally after sign-in and sign-out.
   *
   * @param session - The new session, or null if signed out
   */
  notifyServicesOfSessionChange(session) {
    if (this._serviceContext) {
      this._serviceContext.setSession(session);
    }
  }
  /**
   * Abort all pending service operations.
   * Called internally before sign-out.
   */
  abortServiceOperations() {
    if (this._serviceContext) {
      this._serviceContext.abort();
    }
  }
  /**
   * Convert ClientSession to ServiceSession.
   * Returns null if session lacks required fields.
   */
  toServiceSession(clientSession) {
    if (!clientSession) return null;
    const tcSession = clientSession.tinycloudSession;
    if (!tcSession) return null;
    return {
      delegationHeader: tcSession.delegationHeader,
      delegationCid: tcSession.delegationCid,
      spaceId: tcSession.spaceId,
      verificationMethod: tcSession.verificationMethod,
      jwk: tcSession.jwk
    };
  }
  /**
   * Add an extension to the SDK.
   * Extensions can add capabilities and lifecycle hooks.
   */
  extend(extension) {
    this.extensions.push(extension);
    this.userAuthorization.extend(extension);
  }
  /**
   * Check if an extension is enabled.
   * @param namespace - The extension namespace to check
   */
  isExtensionEnabled(namespace) {
    return this.extensions.some((ext) => ext.namespace === namespace);
  }
  // === Authentication Methods (delegate to userAuthorization) ===
  /**
   * Get the current session, if signed in.
   */
  get session() {
    return this.userAuthorization.session;
  }
  /**
   * Check if the user is signed in.
   */
  get isSignedIn() {
    return !!this.userAuthorization.session;
  }
  /**
   * Sign in and create a new session.
   * Notifies services of the new session after successful sign-in.
   * @param options - Optional per-call SIWE overrides for this sign-in only
   * @returns The new session
   */
  async signIn(options) {
    const session = await this.userAuthorization.signIn(options);
    const serviceSession = this.toServiceSession(session);
    this.notifyServicesOfSessionChange(serviceSession);
    return session;
  }
  /**
   * Sign out and clear the current session.
   * Aborts pending service operations and notifies services.
   */
  async signOut() {
    this.abortServiceOperations();
    await this.userAuthorization.signOut();
    this._publicKV = void 0;
    this.notifyServicesOfSessionChange(null);
  }
  /**
   * Get the current wallet address.
   */
  address() {
    return this.userAuthorization.address();
  }
  /**
   * Get the current chain ID.
   */
  chainId() {
    return this.userAuthorization.chainId();
  }
  /**
   * Sign a message with the connected wallet.
   * @param message - Message to sign
   */
  async signMessage(message) {
    return this.userAuthorization.signMessage(message);
  }
  /**
   * Construct the deterministic public space ID for a given address and chain ID.
   *
   * @param address - Ethereum address (0x-prefixed)
   * @param chainId - Chain ID (e.g., 1 for mainnet)
   * @returns The public space ID
   */
  static makePublicSpaceId(address, chainId) {
    return makePublicSpaceId(address, chainId);
  }
  /**
   * Ensure the user's public space exists.
   * Creates it via spaces.create('public') if it doesn't.
   * Called automatically by modules that need to publish data.
   *
   * Requires the user to be signed in and services to be initialized.
   */
  async ensurePublicSpace() {
    const address = this.address();
    const chainId = this.chainId();
    if (!address || !chainId) {
      return (0, import_sdk_services3.err)(
        (0, import_sdk_services3.serviceError)(
          import_sdk_services3.ErrorCodes.AUTH_REQUIRED,
          "Must be signed in to ensure public space",
          "public-space"
        )
      );
    }
    if (!this._serviceContext) {
      return (0, import_sdk_services3.err)(
        (0, import_sdk_services3.serviceError)(
          import_sdk_services3.ErrorCodes.AUTH_REQUIRED,
          "Services not initialized. Call initializeServices() or signIn() first.",
          "public-space"
        )
      );
    }
    const spaceId = makePublicSpaceId(address, chainId);
    try {
      const session = this._serviceContext.session;
      if (!session) {
        return (0, import_sdk_services3.err)(
          (0, import_sdk_services3.serviceError)(
            import_sdk_services3.ErrorCodes.AUTH_REQUIRED,
            "No active session",
            "public-space"
          )
        );
      }
      const headers = this._serviceContext.invoke(
        session,
        "space",
        spaceId,
        "tinycloud.space/info"
      );
      const response = await this._serviceContext.fetch(
        `${this._serviceContext.hosts[0]}/invoke`,
        { method: "POST", headers, body: JSON.stringify({ spaceId }) }
      );
      if (response.ok) {
        return (0, import_sdk_services3.ok)(void 0);
      }
      if (response.status === 404) {
        const createHeaders = this._serviceContext.invoke(
          session,
          "space",
          "public",
          "tinycloud.space/create"
        );
        const createResponse = await this._serviceContext.fetch(
          `${this._serviceContext.hosts[0]}/invoke`,
          {
            method: "POST",
            headers: createHeaders,
            body: JSON.stringify({ name: "public" })
          }
        );
        if (!createResponse.ok) {
          if (createResponse.status === 409) {
            return (0, import_sdk_services3.ok)(void 0);
          }
          const errorText2 = await createResponse.text();
          return (0, import_sdk_services3.err)(
            (0, import_sdk_services3.serviceError)(
              import_sdk_services3.ErrorCodes.NETWORK_ERROR,
              `Failed to create public space: ${createResponse.status} - ${errorText2}`,
              "public-space"
            )
          );
        }
        return (0, import_sdk_services3.ok)(void 0);
      }
      const errorText = await response.text();
      return (0, import_sdk_services3.err)(
        (0, import_sdk_services3.serviceError)(
          import_sdk_services3.ErrorCodes.NETWORK_ERROR,
          `Failed to check public space: ${response.status} - ${errorText}`,
          "public-space"
        )
      );
    } catch (error) {
      return (0, import_sdk_services3.err)(
        (0, import_sdk_services3.serviceError)(
          import_sdk_services3.ErrorCodes.NETWORK_ERROR,
          `Network error ensuring public space: ${String(error)}`,
          "public-space",
          { cause: error instanceof Error ? error : void 0 }
        )
      );
    }
  }
  /**
   * Get a KVService scoped to the user's own public space.
   * Writes require authentication (owner/delegate).
   *
   * @throws Error if not signed in or services not initialized
   */
  get publicKV() {
    if (!this._servicesInitialized || !this._serviceContext) {
      throw new Error(
        "Services not initialized. Call initializeServices() first, or use TinyCloudWeb/TinyCloudNode which handles this automatically."
      );
    }
    const address = this.address();
    const chainId = this.chainId();
    if (!address || !chainId) {
      throw new Error("Must be signed in to access publicKV.");
    }
    if (this._publicKV) {
      return this._publicKV;
    }
    const publicSpaceId = makePublicSpaceId(address, chainId);
    const session = this._serviceContext.session;
    if (!session) {
      throw new Error("No active session. Sign in first.");
    }
    const publicKV = new import_sdk_services3.KVService({ prefix: "" });
    const publicContext = new import_sdk_services3.ServiceContext({
      invoke: this._serviceContext.invoke,
      fetch: this._serviceContext.fetch,
      hosts: this._serviceContext.hosts,
      retryPolicy: this.config.retryPolicy,
      telemetry: this.config.telemetry
    });
    publicContext.setSession({
      ...session,
      spaceId: publicSpaceId
    });
    publicKV.initialize(publicContext);
    this._publicKV = publicKV;
    return this._publicKV;
  }
  /**
   * Read from any user's public space (unauthenticated).
   * Uses the public REST endpoint — no session needed.
   *
   * @param host - TinyCloud server URL (e.g., "https://node.tinycloud.xyz")
   * @param spaceId - Full public space ID
   * @param key - Key to read
   * @param fetchFn - Optional custom fetch function
   * @returns The data at the key
   */
  static async readPublicSpace(host, spaceId, key, fetchFn) {
    const doFetch = fetchFn ?? globalThis.fetch.bind(globalThis);
    const encodedKey = key.split("/").map(encodeURIComponent).join("/");
    const url = `${host}/public/${encodeURIComponent(spaceId)}/kv/${encodedKey}`;
    try {
      const response = await doFetch(url, { method: "GET" });
      if (!response.ok) {
        if (response.status === 404) {
          return (0, import_sdk_services3.err)(
            (0, import_sdk_services3.serviceError)(
              import_sdk_services3.ErrorCodes.NOT_FOUND,
              `Key not found: ${key} in space ${spaceId}`,
              "public-space"
            )
          );
        }
        const errorText = await response.text();
        return (0, import_sdk_services3.err)(
          (0, import_sdk_services3.serviceError)(
            import_sdk_services3.ErrorCodes.NETWORK_ERROR,
            `Failed to read public space: ${response.status} - ${errorText}`,
            "public-space",
            { meta: { status: response.status } }
          )
        );
      }
      const contentType = response.headers.get("content-type");
      let data;
      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }
      return (0, import_sdk_services3.ok)(data);
    } catch (error) {
      return (0, import_sdk_services3.err)(
        (0, import_sdk_services3.serviceError)(
          import_sdk_services3.ErrorCodes.NETWORK_ERROR,
          `Network error reading public space: ${String(error)}`,
          "public-space",
          { cause: error instanceof Error ? error : void 0 }
        )
      );
    }
  }
  /**
   * Read from any user's public space by address (unauthenticated).
   * Convenience method that constructs the space ID from address and chain ID.
   *
   * @param host - TinyCloud server URL
   * @param address - Ethereum address (0x-prefixed)
   * @param chainId - Chain ID (e.g., 1 for mainnet)
   * @param key - Key to read
   * @param fetchFn - Optional custom fetch function
   * @returns The data at the key
   */
  static async readPublicKey(host, address, chainId, key, fetchFn) {
    const spaceId = makePublicSpaceId(address, chainId);
    return _TinyCloud.readPublicSpace(host, spaceId, key, fetchFn);
  }
};

// src/account/AccountService.ts
var import_sdk_services5 = require("@tinycloud/sdk-services");

// src/manifest.ts
var import_ms = __toESM(require("ms"), 1);
var import_sdk_services4 = require("@tinycloud/sdk-services");
var DEFAULT_KNOWLEDGE_ROOT = "knowledge/index.md";
var ManifestValidationError = class extends Error {
  constructor(message) {
    super(`Manifest validation failed: ${message}`);
    this.name = "ManifestValidationError";
  }
};
var DEFAULT_EXPIRY = "30d";
var DEFAULT_DEFAULTS = true;
var DEFAULT_MANIFEST_VERSION = 1;
var DEFAULT_MANIFEST_SPACE = "applications";
var ACCOUNT_REGISTRY_SPACE = "account";
var ACCOUNT_REGISTRY_PATH = "applications/";
var SECRETS_SPACE = "secrets";
var VAULT_PERMISSION_SERVICE = "tinycloud.vault";
var SERVICE_SHORT_TO_LONG = Object.freeze({
  kv: "tinycloud.kv",
  sql: "tinycloud.sql",
  duckdb: "tinycloud.duckdb",
  capabilities: "tinycloud.capabilities",
  hooks: "tinycloud.hooks",
  encryption: "tinycloud.encryption"
});
var ENCRYPTION_PERMISSION_SERVICE = "tinycloud.encryption";
var ENCRYPTION_MANIFEST_SPACE = "encryption";
var SERVICE_LONG_TO_SHORT = Object.freeze(
  Object.fromEntries(
    Object.entries(SERVICE_SHORT_TO_LONG).map(([s, l]) => [l, s])
  )
);
var DEFAULT_STANDARD_ENTRIES = [
  {
    service: "tinycloud.kv",
    space: DEFAULT_MANIFEST_SPACE,
    path: "/",
    actions: ["get", "put", "del", "list", "metadata"]
  },
  {
    service: "tinycloud.sql",
    space: DEFAULT_MANIFEST_SPACE,
    path: "/",
    actions: ["read", "write"]
  }
];
var DEFAULT_ADMIN_ENTRIES = [
  {
    service: "tinycloud.kv",
    space: DEFAULT_MANIFEST_SPACE,
    path: "/",
    actions: ["get", "put", "del", "list", "metadata"]
  },
  {
    service: "tinycloud.sql",
    space: DEFAULT_MANIFEST_SPACE,
    path: "/",
    actions: ["read", "write", "schema"]
  }
];
var DEFAULT_ALL_ENTRIES = [
  {
    service: "tinycloud.kv",
    space: DEFAULT_MANIFEST_SPACE,
    path: "/",
    actions: ["get", "put", "del", "list", "metadata"]
  },
  {
    service: "tinycloud.sql",
    space: DEFAULT_MANIFEST_SPACE,
    path: "/",
    actions: ["read", "write", "schema"]
  },
  {
    service: "tinycloud.duckdb",
    space: DEFAULT_MANIFEST_SPACE,
    path: "/",
    actions: ["read", "write"]
  }
];
function parseExpiry(duration) {
  if (typeof duration !== "string" || duration.length === 0) {
    throw new ManifestValidationError(
      `expiry must be a non-empty duration string (got ${JSON.stringify(duration)})`
    );
  }
  const parsed = (0, import_ms.default)(duration);
  if (typeof parsed !== "number" || !Number.isFinite(parsed) || parsed <= 0) {
    throw new ManifestValidationError(
      `invalid expiry duration: ${JSON.stringify(duration)}`
    );
  }
  return parsed;
}
function expandActionShortNames(service, actions) {
  return actions.map((a) => {
    if (a.includes("/")) {
      return a;
    }
    return `${service}/${a}`;
  });
}
function expandPermissionEntry(entry) {
  if (entry.service === ENCRYPTION_PERMISSION_SERVICE) {
    return expandEncryptionPermissionEntry(entry);
  }
  if (entry.service !== VAULT_PERMISSION_SERVICE) {
    return [
      {
        ...entry,
        actions: expandActionShortNames(entry.service, entry.actions)
      }
    ];
  }
  return expandVaultPermissionEntry(entry);
}
function expandEncryptionPermissionEntry(entry) {
  if (typeof entry.path !== "string" || !entry.path.startsWith("urn:tinycloud:encryption:")) {
    throw new ManifestValidationError(
      `tinycloud.encryption entries require path to be a networkId URN (got ${JSON.stringify(entry.path)})`
    );
  }
  const normalizedActions = [];
  for (const action of entry.actions) {
    if (action === "decrypt" || action === "tinycloud.encryption/decrypt") {
      normalizedActions.push("tinycloud.encryption/decrypt");
      continue;
    }
    if (action === "network.create" || action === "tinycloud.encryption/network.create") {
      normalizedActions.push("tinycloud.encryption/network.create");
      continue;
    }
    if (action === "network.revoke" || action === "tinycloud.encryption/network.revoke") {
      normalizedActions.push("tinycloud.encryption/network.revoke");
      continue;
    }
    if (action.includes("/")) {
      throw new ManifestValidationError(
        `unknown encryption action ${JSON.stringify(action)}; expected decrypt, network.create, or network.revoke`
      );
    }
    throw new ManifestValidationError(
      `unknown encryption action ${JSON.stringify(action)}; expected decrypt, network.create, or network.revoke`
    );
  }
  const dedupedActions = [];
  const seen = /* @__PURE__ */ new Set();
  for (const a of normalizedActions) {
    if (!seen.has(a)) {
      dedupedActions.push(a);
      seen.add(a);
    }
  }
  return [
    {
      service: ENCRYPTION_PERMISSION_SERVICE,
      space: ENCRYPTION_MANIFEST_SPACE,
      path: entry.path,
      actions: dedupedActions,
      skipPrefix: true,
      ...entry.expiry !== void 0 ? { expiry: entry.expiry } : {},
      ...entry.description !== void 0 ? { description: entry.description } : {}
    }
  ];
}
function expandPermissionEntries(entries) {
  return entries.flatMap(expandPermissionEntry);
}
function applyPrefix(prefix, path, skipPrefix) {
  if (skipPrefix) {
    return path;
  }
  if (prefix === "") {
    return path;
  }
  if (path.startsWith("/")) {
    return `${prefix}${path}`;
  }
  return `${prefix}/${path}`;
}
async function loadManifest(url) {
  const fetchFn = globalThis.fetch;
  if (typeof fetchFn !== "function") {
    throw new ManifestValidationError(
      "loadManifest requires a global fetch; pass the manifest object directly on runtimes without fetch"
    );
  }
  const res = await fetchFn(url);
  if (!res.ok) {
    throw new ManifestValidationError(
      `failed to fetch manifest from ${url}: HTTP ${res.status}`
    );
  }
  const json = await res.json();
  return validateManifest(json);
}
function validateManifest(input) {
  if (input === null || typeof input !== "object") {
    throw new ManifestValidationError("manifest must be an object");
  }
  const m = input;
  if (m.manifest_version !== void 0 && m.manifest_version !== DEFAULT_MANIFEST_VERSION) {
    throw new ManifestValidationError(
      `manifest.manifest_version must be ${DEFAULT_MANIFEST_VERSION}`
    );
  }
  if (typeof m.app_id !== "string" || m.app_id.length === 0) {
    throw new ManifestValidationError(
      "manifest.app_id is required and must be a non-empty string"
    );
  }
  if (typeof m.name !== "string" || m.name.length === 0) {
    throw new ManifestValidationError(
      "manifest.name is required and must be a non-empty string"
    );
  }
  if (m.did !== void 0 && (typeof m.did !== "string" || m.did.length === 0)) {
    throw new ManifestValidationError(
      "manifest.did must be a non-empty DID string"
    );
  }
  if (m.space !== void 0 && (typeof m.space !== "string" || m.space.length === 0)) {
    throw new ManifestValidationError(
      "manifest.space must be a non-empty string"
    );
  }
  if (m.expiry !== void 0) {
    parseExpiry(m.expiry);
  }
  if (m.knowledge !== void 0) {
    resolveManifestKnowledgeRoot(m.knowledge);
  }
  if (m.permissions !== void 0) {
    if (!Array.isArray(m.permissions)) {
      throw new ManifestValidationError(
        "manifest.permissions must be an array"
      );
    }
    m.permissions.forEach(
      (p, i) => validatePermissionEntry(p, `permissions[${i}]`)
    );
  }
  if (m.secrets !== void 0) {
    validateManifestSecrets(m.secrets);
  }
  return m;
}
function resolveManifestKnowledgeRoot(knowledge) {
  if (knowledge === void 0) {
    return void 0;
  }
  if (knowledge === true) {
    return DEFAULT_KNOWLEDGE_ROOT;
  }
  if (typeof knowledge !== "string" || knowledge.length === 0) {
    throw new ManifestValidationError(
      "manifest.knowledge must be true or a knowledge/*.md root path"
    );
  }
  if (!/^knowledge\/.+\.md$/.test(knowledge)) {
    throw new ManifestValidationError(
      "manifest.knowledge must be true or a knowledge/*.md root path"
    );
  }
  return knowledge;
}
function validateManifestSecrets(secrets) {
  if (secrets === null || typeof secrets !== "object" || Array.isArray(secrets)) {
    throw new ManifestValidationError("manifest.secrets must be an object");
  }
  for (const [name, spec] of Object.entries(secrets)) {
    if (!import_sdk_services4.SECRET_NAME_RE.test(name)) {
      throw new ManifestValidationError(
        `manifest.secrets.${name} must match ${import_sdk_services4.SECRET_NAME_RE.source}`
      );
    }
    try {
      (0, import_sdk_services4.resolveSecretPath)(
        secretNameFromSpec(name, spec),
        { scope: secretScopeFromSpec(spec) }
      );
    } catch (error) {
      throw new ManifestValidationError(
        `manifest.secrets.${name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    const actions = secretActionsFromSpec(name, spec);
    if (actions.length === 0) {
      throw new ManifestValidationError(
        `manifest.secrets.${name} actions must be non-empty`
      );
    }
    for (const action of actions) {
      if (typeof action !== "string" || action.length === 0) {
        throw new ManifestValidationError(
          `manifest.secrets.${name} actions must be non-empty strings`
        );
      }
    }
    if (spec !== null && typeof spec === "object" && !Array.isArray(spec) && spec.expiry !== void 0) {
      parseExpiry(spec.expiry);
    }
  }
}
function validatePermissionEntry(p, path) {
  if (p === null || typeof p !== "object") {
    throw new ManifestValidationError(`${path} must be an object`);
  }
  const entry = p;
  if (typeof entry.service !== "string" || entry.service.length === 0) {
    throw new ManifestValidationError(`${path}.service is required`);
  }
  if (entry.space !== void 0 && (typeof entry.space !== "string" || entry.space.length === 0)) {
    throw new ManifestValidationError(
      `${path}.space must be a non-empty string`
    );
  }
  if (typeof entry.path !== "string") {
    throw new ManifestValidationError(
      `${path}.path is required (use "" or "/" for root)`
    );
  }
  if (!Array.isArray(entry.actions) || entry.actions.length === 0) {
    throw new ManifestValidationError(
      `${path}.actions must be a non-empty array`
    );
  }
  for (const action of entry.actions) {
    if (typeof action !== "string" || action.length === 0) {
      throw new ManifestValidationError(
        `${path}.actions must contain non-empty strings`
      );
    }
    if (entry.service === VAULT_PERMISSION_SERVICE) {
      vaultActionExpansion(action);
    }
  }
  if (entry.expiry !== void 0) {
    parseExpiry(entry.expiry);
  }
}
function normalizeDefaults(value) {
  if (value === void 0) {
    return DEFAULT_DEFAULTS;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value !== "string") {
    return true;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "admin" || normalized === "all") {
    return normalized;
  }
  return true;
}
function defaultEntriesForTier(tier) {
  if (tier === false) {
    return [];
  }
  const source = tier === "admin" ? DEFAULT_ADMIN_ENTRIES : tier === "all" ? DEFAULT_ALL_ENTRIES : DEFAULT_STANDARD_ENTRIES;
  return source.map((e) => ({
    service: e.service,
    space: e.space,
    path: e.path,
    actions: [...e.actions],
    ...e.skipPrefix !== void 0 ? { skipPrefix: e.skipPrefix } : {}
  }));
}
function resolveManifest(input) {
  const manifest = validateManifest(input);
  const prefix = manifest.prefix !== void 0 ? manifest.prefix : manifest.app_id;
  const space = manifest.space ?? DEFAULT_MANIFEST_SPACE;
  const expiryMs = parseExpiry(manifest.expiry ?? DEFAULT_EXPIRY);
  const includePublicSpace = manifest.includePublicSpace ?? true;
  const tier = normalizeDefaults(manifest.defaults);
  const defaultEntries = defaultEntriesForTier(tier);
  const explicitEntries = manifest.permissions ?? [];
  const secretEntries = secretEntriesForManifest(manifest.secrets);
  const allEntries = [
    ...defaultEntries,
    ...explicitEntries,
    ...secretEntries
  ];
  const resources = withCapabilitiesReadForSpaces(
    allEntries.flatMap((entry) => resolveEntry(entry, prefix, expiryMs, space))
  );
  const additionalDelegates = manifest.did === void 0 ? [] : [
    {
      did: manifest.did,
      name: manifest.name,
      expiryMs,
      permissions: resources.map(cloneResourceCapability)
    }
  ];
  return {
    app_id: manifest.app_id,
    ...manifest.did !== void 0 ? { did: manifest.did } : {},
    space,
    resources,
    expiryMs,
    includePublicSpace,
    additionalDelegates
  };
}
function normalizeSecretActions(actions) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  const add = (action) => {
    if (!seen.has(action)) {
      out.push(action);
      seen.add(action);
    }
  };
  for (const action of actions) {
    if (action === "read") {
      add("get");
      continue;
    }
    if (action === "write") {
      add("put");
      continue;
    }
    if (action === "delete") {
      add("del");
      continue;
    }
    if (action === "get" || action === "put" || action === "del" || action === "list" || action === "metadata") {
      add(action);
      continue;
    }
    if (action === "tinycloud.kv/get" || action === "tinycloud.kv/put" || action === "tinycloud.kv/del" || action === "tinycloud.kv/list" || action === "tinycloud.kv/metadata") {
      add(action);
      continue;
    }
    throw new ManifestValidationError(
      `unknown secret action ${JSON.stringify(action)}; expected read, write, delete, list, or metadata`
    );
  }
  return out;
}
function secretNameFromSpec(fallbackName, spec) {
  if (spec !== null && typeof spec === "object" && !Array.isArray(spec)) {
    return spec.name ?? fallbackName;
  }
  return fallbackName;
}
function secretScopeFromSpec(spec) {
  if (spec !== null && typeof spec === "object" && !Array.isArray(spec)) {
    return spec.scope;
  }
  return void 0;
}
function secretActionsFromSpec(name, spec) {
  if (spec === true) {
    return ["read"];
  }
  if (typeof spec === "string") {
    return [spec];
  }
  if (Array.isArray(spec)) {
    return spec;
  }
  if (spec === null || typeof spec !== "object") {
    throw new ManifestValidationError(
      `manifest.secrets.${name} must be true, a string action, an actions array, or an object`
    );
  }
  if (spec.actions === void 0) {
    return ["read"];
  }
  if (typeof spec.actions === "string") {
    return [spec.actions];
  }
  if (Array.isArray(spec.actions)) {
    return spec.actions;
  }
  throw new ManifestValidationError(
    `manifest.secrets.${name}.actions must be a string or array`
  );
}
function secretEntriesForManifest(secrets) {
  if (secrets === void 0) {
    return [];
  }
  const entries = [];
  for (const [name, spec] of Object.entries(secrets)) {
    const actions = secretActionsFromSpec(name, spec);
    const secretPath = (0, import_sdk_services4.resolveSecretPath)(
      secretNameFromSpec(name, spec),
      { scope: secretScopeFromSpec(spec) }
    );
    const extra = spec !== true && typeof spec === "object" && !Array.isArray(spec) ? spec : {};
    entries.push({
      service: VAULT_PERMISSION_SERVICE,
      space: SECRETS_SPACE,
      path: secretPath.vaultKey,
      actions: normalizeSecretActions(actions),
      skipPrefix: true,
      ...extra.expiry !== void 0 ? { expiry: extra.expiry } : {},
      ...extra.description !== void 0 ? { description: extra.description } : {}
    });
  }
  return entries;
}
function resolveEntry(entry, prefix, _inheritedExpiryMs, inheritedSpace) {
  const skipPrefixForEntry = entry.skipPrefix === true || entry.service === ENCRYPTION_PERMISSION_SERVICE;
  const resolvedPath = applyPrefix(prefix, entry.path, skipPrefixForEntry);
  const entryExpiryMs = entry.expiry !== void 0 ? parseExpiry(entry.expiry) : void 0;
  return expandPermissionEntry({
    ...entry,
    space: entry.space ?? inheritedSpace,
    path: resolvedPath,
    skipPrefix: true
  }).map((expanded) => ({
    service: expanded.service,
    space: expanded.space ?? inheritedSpace,
    path: expanded.path,
    actions: expanded.actions,
    // Only populate `expiryMs` when the entry had its own expiry override.
    // When absent, callers use the parent (delegation or manifest) expiry
    // which is carried on ResolvedDelegate.expiryMs / ResolvedCapabilities.expiryMs.
    ...entryExpiryMs !== void 0 ? { expiryMs: entryExpiryMs } : {},
    ...entry.description !== void 0 ? { description: entry.description } : {}
  }));
}
function expandVaultPermissionEntry(entry) {
  const byBase = /* @__PURE__ */ new Map();
  for (const action of entry.actions) {
    const expansion = vaultActionExpansion(action);
    for (const base of expansion.bases) {
      const actions = byBase.get(base) ?? [];
      if (!actions.includes(expansion.action)) {
        actions.push(expansion.action);
      }
      byBase.set(base, actions);
    }
  }
  return [...byBase.entries()].map(([base, actions]) => ({
    ...entry,
    service: "tinycloud.kv",
    path: vaultKVPath(base, entry.path),
    actions,
    skipPrefix: true
  }));
}
function vaultActionExpansion(action) {
  const normalized = normalizeVaultAction(action);
  if (normalized === "read" || normalized === "get") {
    return { bases: ["vault"], action: "tinycloud.kv/get" };
  }
  if (normalized === "write" || normalized === "put") {
    return { bases: ["vault"], action: "tinycloud.kv/put" };
  }
  if (normalized === "delete" || normalized === "del") {
    return { bases: ["vault"], action: "tinycloud.kv/del" };
  }
  if (normalized === "list") {
    return { bases: ["vault"], action: "tinycloud.kv/list" };
  }
  if (normalized === "head") {
    return { bases: ["vault"], action: "tinycloud.kv/get" };
  }
  if (normalized === "metadata") {
    return { bases: ["vault"], action: "tinycloud.kv/metadata" };
  }
  throw new ManifestValidationError(
    `unknown vault action ${JSON.stringify(action)}; expected read, write, delete, get, put, del, list, head, or metadata`
  );
}
function normalizeVaultAction(action) {
  if (action.startsWith(`${VAULT_PERMISSION_SERVICE}/`)) {
    return action.slice(`${VAULT_PERMISSION_SERVICE}/`.length);
  }
  if (action.startsWith("tinycloud.kv/")) {
    return action.slice("tinycloud.kv/".length);
  }
  if (action.includes("/")) {
    throw new ManifestValidationError(
      `unknown vault action ${JSON.stringify(action)}; expected a tinycloud.vault or tinycloud.kv action`
    );
  }
  return action;
}
function vaultKVPath(base, path) {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `${base}/${normalized}`;
}
function cloneResourceCapability(entry) {
  return {
    service: entry.service,
    space: entry.space,
    path: entry.path,
    actions: [...entry.actions],
    ...entry.expiryMs !== void 0 ? { expiryMs: entry.expiryMs } : {},
    ...entry.description !== void 0 ? { description: entry.description } : {}
  };
}
function clonePermissionEntry(entry) {
  return {
    service: entry.service,
    ...entry.space !== void 0 ? { space: entry.space } : {},
    path: entry.path,
    actions: [...entry.actions],
    ...entry.skipPrefix !== void 0 ? { skipPrefix: entry.skipPrefix } : {},
    ...entry.expiry !== void 0 ? { expiry: entry.expiry } : {},
    ...entry.description !== void 0 ? { description: entry.description } : {}
  };
}
function dedupeResources(resources) {
  const byKey = /* @__PURE__ */ new Map();
  for (const resource of resources) {
    const key = `${resource.service}\0${resource.space}\0${resource.path}\0${resource.expiryMs ?? ""}`;
    const existing = byKey.get(key);
    if (existing === void 0) {
      byKey.set(key, cloneResourceCapability(resource));
      continue;
    }
    const seen = new Set(existing.actions);
    for (const action of resource.actions) {
      if (!seen.has(action)) {
        existing.actions.push(action);
        seen.add(action);
      }
    }
    if (existing.description === void 0 && resource.description !== void 0) {
      existing.description = resource.description;
    }
  }
  return [...byKey.values()];
}
function capabilitiesReadPermission(space) {
  return {
    service: "tinycloud.capabilities",
    space,
    path: "",
    actions: ["tinycloud.capabilities/read"]
  };
}
function withCapabilitiesReadForSpaces(resources) {
  if (resources.length === 0) {
    return [];
  }
  const spaces = new Set(
    resources.filter((resource) => resource.service !== ENCRYPTION_PERMISSION_SERVICE).map((resource) => resource.space)
  );
  return dedupeResources([
    ...resources,
    ...[...spaces].map(capabilitiesReadPermission)
  ]);
}
function accountRegistryPermissions() {
  return [ACCOUNT_REGISTRY_PATH, "spaces/"].map((path) => ({
    service: "tinycloud.kv",
    space: ACCOUNT_REGISTRY_SPACE,
    path,
    actions: ["tinycloud.kv/get", "tinycloud.kv/put", "tinycloud.kv/list"]
  }));
}
function accountRegistryIndexPermission() {
  return {
    service: "tinycloud.sql",
    space: ACCOUNT_REGISTRY_SPACE,
    path: "account",
    actions: ["tinycloud.sql/read", "tinycloud.sql/write", "tinycloud.sql/schema"]
  };
}
function composeManifestRequest(inputs, options = {}) {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new ManifestValidationError(
      "composeManifestRequest requires at least one manifest"
    );
  }
  const includeAccountRegistryPermissions = options.includeAccountRegistryPermissions ?? true;
  const manifests = inputs.map(validateManifest);
  const resolved = manifests.map(resolveManifest);
  const resources = resolved.flatMap((entry) => entry.resources);
  const delegationTargets = resolved.flatMap(
    (entry) => entry.additionalDelegates.map((delegate) => ({
      ...delegate,
      permissions: dedupeResources(delegate.permissions)
    }))
  );
  if (includeAccountRegistryPermissions) {
    resources.push(...accountRegistryPermissions());
    resources.push(accountRegistryIndexPermission());
  }
  const resourcesWithImplicitCapabilities = withCapabilitiesReadForSpaces(resources);
  const manifestsByAppId = /* @__PURE__ */ new Map();
  for (const manifest of manifests) {
    const current = manifestsByAppId.get(manifest.app_id);
    if (current === void 0) {
      manifestsByAppId.set(manifest.app_id, [manifest]);
    } else {
      current.push(manifest);
    }
  }
  const registryRecords = includeAccountRegistryPermissions ? [...manifestsByAppId.entries()].map(([app_id, appManifests]) => ({
    key: `${ACCOUNT_REGISTRY_PATH}${app_id}`,
    app_id,
    manifests: appManifests.map((manifest) => ({
      ...manifest,
      permissions: manifest.permissions?.map(clonePermissionEntry)
    }))
  })) : [];
  return {
    manifests,
    resources: resourcesWithImplicitCapabilities,
    delegationTargets,
    registryRecords,
    expiryMs: Math.max(...resolved.map((entry) => entry.expiryMs)),
    includePublicSpace: resolved.some((entry) => entry.includePublicSpace)
  };
}
function resourceCapabilitiesToAbilitiesMap(resources) {
  const out = {};
  for (const r of resources) {
    const shortService = SERVICE_LONG_TO_SHORT[r.service];
    if (shortService === void 0) {
      throw new ManifestValidationError(
        `unknown service '${r.service}' \u2014 no short-form mapping. Known services: ${Object.keys(SERVICE_LONG_TO_SHORT).join(", ")}`
      );
    }
    if (out[shortService] === void 0) {
      out[shortService] = {};
    }
    const pathsMap = out[shortService];
    const existing = pathsMap[r.path];
    if (existing === void 0) {
      pathsMap[r.path] = [...r.actions];
    } else {
      const seen = new Set(existing);
      for (const action of r.actions) {
        if (!seen.has(action)) {
          existing.push(action);
          seen.add(action);
        }
      }
    }
  }
  return out;
}
function resourceCapabilitiesToSpaceAbilitiesMap(resources) {
  const grouped = /* @__PURE__ */ new Map();
  for (const resource of resources) {
    const entries = grouped.get(resource.space);
    if (entries === void 0) {
      grouped.set(resource.space, [resource]);
    } else {
      entries.push(resource);
    }
  }
  const out = {};
  for (const [space, entries] of grouped.entries()) {
    out[space] = resourceCapabilitiesToAbilitiesMap(entries);
  }
  return out;
}
function manifestAbilitiesUnion(resolved) {
  const all = [...resolved.resources];
  for (const delegate of resolved.additionalDelegates) {
    for (const perm of delegate.permissions) {
      all.push(perm);
    }
  }
  return resourceCapabilitiesToAbilitiesMap(all);
}

// src/account/AccountService.ts
var import_bootstrap = require("@tinycloud/bootstrap");
var SERVICE_NAME2 = "account";
var ACCOUNT_INDEX_DB = "account";
var ACCOUNT_INDEX_NAMESPACE = "tinycloud.account.index";
var ACCOUNT_SPACES_PATH = "spaces/";
var AccountService = class {
  constructor(config) {
    this.config = config;
    this.applications = {
      list: async (options = {}) => {
        if (options.preferIndex) {
          const indexed = await this.index.applications.list();
          if (indexed.ok && indexed.data.length > 0) return indexed;
          if (!indexed.ok && !isMissingIndexError(indexed.error)) return indexed;
          const canonical = await this.applications.list();
          if (canonical.ok && options.refreshIndex !== false) {
            await this.replaceApplicationsIndexQuietly(canonical.data);
          }
          return canonical;
        }
        const kvResult = this.accountKV();
        if (!kvResult.ok) return kvResult;
        const listed = await kvResult.data.list({ prefix: ACCOUNT_REGISTRY_PATH });
        if (!listed.ok) return accountErr(listed.error);
        const applications = [];
        for (const key of listed.data.keys) {
          const loaded = await kvResult.data.get(key);
          if (!loaded.ok) return accountErr(loaded.error);
          applications.push(applicationFromRecord(key, loaded.data.data));
        }
        applications.sort((a, b) => a.appId.localeCompare(b.appId));
        return (0, import_sdk_services5.ok)(applications);
      },
      get: async (appId) => {
        const kvResult = this.accountKV();
        if (!kvResult.ok) return kvResult;
        const key = applicationKey(appId);
        const loaded = await kvResult.data.get(key);
        if (!loaded.ok) return accountErr(loaded.error);
        return (0, import_sdk_services5.ok)(applicationFromRecord(key, loaded.data.data));
      },
      register: async (manifest) => {
        const manifests = Array.isArray(manifest) ? manifest : [manifest];
        const request = composeManifestRequest(manifests);
        if (request.registryRecords.length === 0) {
          return (0, import_sdk_services5.err)(
            (0, import_sdk_services5.serviceError)(
              "INVALID_MANIFEST",
              "Manifest did not produce an account application registry record",
              SERVICE_NAME2
            )
          );
        }
        await this.config.ensureAccountSpaceHosted?.();
        const kvResult = this.accountKV();
        if (!kvResult.ok) return kvResult;
        let registered;
        for (const record of request.registryRecords) {
          const manifestHash = hashJson(record.manifests);
          if (await this.indexHasApplicationHash(record.app_id, manifestHash)) {
            registered = {
              appId: record.app_id,
              manifests: record.manifests,
              manifestHash,
              name: record.manifests[0]?.name,
              description: record.manifests[0]?.description
            };
            continue;
          }
          const stored = {
            app_id: record.app_id,
            manifests: record.manifests,
            manifest_hash: manifestHash,
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          };
          const written = await kvResult.data.put(record.key, stored);
          if (!written.ok) return accountErr(written.error);
          registered = applicationFromRecord(record.key, stored);
          await this.upsertApplicationIndexQuietly(registered);
        }
        return (0, import_sdk_services5.ok)(registered);
      },
      remove: async (appId) => {
        const kvResult = this.accountKV();
        if (!kvResult.ok) return kvResult;
        const removed = await kvResult.data.delete(applicationKey(appId));
        if (!removed.ok) return accountErr(removed.error);
        await this.deleteApplicationIndexQuietly(appId);
        return (0, import_sdk_services5.ok)(void 0);
      }
    };
    this.spaces = {
      list: async (options = {}) => {
        if (options.preferIndex) {
          const indexed = await this.index.spaces.list();
          if (indexed.ok && indexed.data.length > 0) return indexed;
          if (!indexed.ok && !isMissingIndexError(indexed.error)) return indexed;
          const canonical = await this.spaces.syncAccessible();
          if (canonical.ok && options.refreshIndex !== false) {
            await this.replaceSpacesIndexQuietly(canonical.data);
          }
          return canonical;
        }
        const kvResult = this.accountKV();
        if (!kvResult.ok) return kvResult;
        const listed = await kvResult.data.list({ prefix: ACCOUNT_SPACES_PATH });
        if (!listed.ok) return accountErr(listed.error);
        const spaces = [];
        for (const key of listed.data.keys) {
          const loaded = await kvResult.data.get(key);
          if (!loaded.ok) return accountErr(loaded.error);
          spaces.push(spaceFromRecord(key, loaded.data.data));
        }
        spaces.sort((a, b) => a.name.localeCompare(b.name) || a.spaceId.localeCompare(b.spaceId));
        return (0, import_sdk_services5.ok)(spaces);
      },
      get: async (spaceId) => {
        const kvResult = this.accountKV();
        if (!kvResult.ok) return kvResult;
        const loaded = await kvResult.data.get(spaceKey(spaceId));
        if (!loaded.ok) return accountErr(loaded.error);
        return (0, import_sdk_services5.ok)(spaceFromRecord(spaceKey(spaceId), loaded.data.data));
      },
      register: async (space) => {
        await this.config.ensureAccountSpaceHosted?.();
        const kvResult = this.accountKV();
        if (!kvResult.ok) return kvResult;
        const stored = spaceRecordFromInput(space);
        const written = await kvResult.data.put(spaceKey(stored.space_id), stored);
        if (!written.ok) return accountErr(written.error);
        const registered = spaceFromRecord(spaceKey(stored.space_id), stored);
        await this.upsertSpaceIndexQuietly(registered);
        return (0, import_sdk_services5.ok)(registered);
      },
      syncAccessible: async () => {
        const listed = await this.config.getSpaces().list();
        if (!listed.ok) return accountErr(listed.error);
        const registered = [];
        for (const space of listed.data) {
          const result = await this.spaces.register(space);
          if (!result.ok) return result;
          registered.push(result.data);
        }
        return (0, import_sdk_services5.ok)(registered);
      },
      remove: async (spaceId) => {
        const kvResult = this.accountKV();
        if (!kvResult.ok) return kvResult;
        const removed = await kvResult.data.delete(spaceKey(spaceId));
        if (!removed.ok) return accountErr(removed.error);
        await this.deleteSpaceIndexQuietly(spaceId);
        return (0, import_sdk_services5.ok)(void 0);
      }
    };
    this.delegations = {
      list: async (options = {}) => {
        if (options.preferIndex) {
          const indexed = await this.index.delegations.list(options);
          if (indexed.ok && indexed.data.length > 0) return indexed;
          if (!indexed.ok && !isMissingIndexError(indexed.error)) return indexed;
          const live = await this.delegations.list({
            direction: options.direction,
            space: options.space
          });
          if (live.ok && options.refreshIndex !== false) {
            await this.replaceDelegationsIndexQuietly(live.data);
          }
          return live;
        }
        const spaces = await this.config.getSpaces().list();
        if (!spaces.ok) return accountErr(spaces.error);
        const targetSpaces = options.space ? spaces.data.filter((space) => space.id === options.space || space.name === options.space) : spaces.data;
        const delegations = [];
        for (const space of targetSpaces) {
          const scoped = this.config.getSpaces().get(space.id).delegations;
          if (options.direction !== "received") {
            const granted = await scoped.list();
            if (!granted.ok) return accountErr(granted.error);
            delegations.push(...granted.data.map((d) => mapDelegation(d, space, "granted")));
          }
          if (options.direction !== "granted") {
            const received = await scoped.listReceived();
            if (!received.ok) return accountErr(received.error);
            delegations.push(...received.data.map((d) => mapDelegation(d, space, "received")));
          }
        }
        delegations.sort((a, b) => a.spaceId.localeCompare(b.spaceId) || a.cid.localeCompare(b.cid));
        return (0, import_sdk_services5.ok)(delegations);
      },
      revoke: async (options) => {
        const space = await this.resolveSpace(options.space);
        if (!space.ok) return space;
        const revoked = await this.config.getSpaces().get(space.data.id).delegations.revoke(options.cid);
        if (!revoked.ok) return accountErr(revoked.error);
        return (0, import_sdk_services5.ok)(void 0);
      }
    };
    this.index = {
      ensure: async () => {
        const dbResult = this.accountDb();
        if (!dbResult.ok) return dbResult;
        const schema = await this.ensureAccountIndex(dbResult.data);
        if (!schema.ok) return schema;
        return (0, import_sdk_services5.ok)({ database: ACCOUNT_INDEX_DB });
      },
      rebuild: async () => {
        const dbResult = this.accountDb();
        if (!dbResult.ok) return dbResult;
        const applications = await this.applications.list();
        if (!applications.ok) return applications;
        const spaces = await this.spaces.list();
        if (!spaces.ok) return spaces;
        const delegations = await this.delegations.list();
        if (!delegations.ok) return delegations;
        const syncedAt = (/* @__PURE__ */ new Date()).toISOString();
        const schema = await this.ensureAccountIndex(dbResult.data);
        if (!schema.ok) return schema;
        const statements = [
          { sql: "DELETE FROM applications" },
          { sql: "DELETE FROM application_state" },
          { sql: "DELETE FROM spaces" },
          { sql: "DELETE FROM delegations" },
          { sql: "DELETE FROM sync_state" },
          ...applications.data.map((app) => ({
            sql: "INSERT INTO applications (app_id, name, description, updated_at, manifest_json) VALUES (?, ?, ?, ?, ?)",
            params: [
              app.appId,
              app.name ?? null,
              app.description ?? null,
              app.updatedAt ?? syncedAt,
              JSON.stringify(app.manifests)
            ]
          })),
          ...applications.data.map((app) => ({
            sql: "INSERT OR REPLACE INTO application_state (app_id, manifest_hash, indexed_at) VALUES (?, ?, ?)",
            params: [app.appId, app.manifestHash ?? hashJson(app.manifests), syncedAt]
          })),
          ...spaces.data.map((space) => ({
            sql: "INSERT OR REPLACE INTO spaces (space_id, name, owner_did, type, permissions_json, status, registered_at, updated_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params: [
              space.spaceId,
              space.name,
              space.ownerDid,
              space.type,
              JSON.stringify(space.permissions),
              space.status,
              space.registeredAt ?? syncedAt,
              space.updatedAt ?? syncedAt,
              space.expiresAt?.toISOString() ?? null
            ]
          })),
          ...delegations.data.map((delegation) => ({
            sql: "INSERT INTO delegations (cid, direction, space_id, space_name, counterparty_did, delegate_did, delegator_did, path, actions_json, expiry, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params: [
              delegation.cid,
              delegation.direction,
              delegation.spaceId,
              delegation.spaceName ?? null,
              delegation.counterpartyDid,
              delegation.delegateDid,
              delegation.delegatorDid ?? null,
              delegation.path,
              JSON.stringify(delegation.actions),
              delegation.expiry.toISOString(),
              delegation.status,
              delegation.createdAt?.toISOString() ?? null,
              syncedAt
            ]
          })),
          {
            sql: "INSERT INTO sync_state (source, synced_at, count) VALUES (?, ?, ?)",
            params: ["applications", syncedAt, applications.data.length]
          },
          {
            sql: "INSERT INTO sync_state (source, synced_at, count) VALUES (?, ?, ?)",
            params: ["spaces", syncedAt, spaces.data.length]
          },
          {
            sql: "INSERT INTO sync_state (source, synced_at, count) VALUES (?, ?, ?)",
            params: ["delegations", syncedAt, delegations.data.length]
          }
        ];
        const rebuilt = await dbResult.data.batch(statements);
        if (!rebuilt.ok) return accountErr(rebuilt.error);
        return (0, import_sdk_services5.ok)({
          database: ACCOUNT_INDEX_DB,
          applications: applications.data.length,
          spaces: spaces.data.length,
          delegations: delegations.data.length,
          syncedAt
        });
      },
      applications: {
        list: async () => {
          const dbResult = this.accountDb();
          if (!dbResult.ok) return dbResult;
          const queried = await dbResult.data.query(
            "SELECT applications.app_id, name, description, updated_at, manifest_json, application_state.manifest_hash FROM applications LEFT JOIN application_state ON applications.app_id = application_state.app_id ORDER BY applications.app_id"
          );
          if (!queried.ok) return accountErr(queried.error);
          return (0, import_sdk_services5.ok)(queried.data.rows.map(indexedApplicationFromRow));
        }
      },
      spaces: {
        list: async () => {
          const dbResult = this.accountDb();
          if (!dbResult.ok) return dbResult;
          const queried = await dbResult.data.query(
            "SELECT space_id, name, owner_did, type, permissions_json, status, registered_at, updated_at, expires_at FROM spaces ORDER BY name, space_id"
          );
          if (!queried.ok) return accountErr(queried.error);
          return (0, import_sdk_services5.ok)(queried.data.rows.map(indexedSpaceFromRow));
        }
      },
      delegations: {
        list: async (options = {}) => {
          const dbResult = this.accountDb();
          if (!dbResult.ok) return dbResult;
          const where = [];
          const params = [];
          if (options.direction && options.direction !== "all") {
            where.push("direction = ?");
            params.push(options.direction);
          }
          if (options.space) {
            where.push("(space_id = ? OR space_name = ?)");
            params.push(options.space, options.space);
          }
          const queried = await dbResult.data.query(
            `SELECT cid, direction, space_id, space_name, counterparty_did, delegate_did, delegator_did, path, actions_json, expiry, status, created_at FROM delegations${where.length > 0 ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY space_id, cid`,
            params
          );
          if (!queried.ok) return accountErr(queried.error);
          return (0, import_sdk_services5.ok)(queried.data.rows.map(indexedDelegationFromRow));
        }
      },
      query: async (sql, params) => {
        const dbResult = this.accountDb();
        if (!dbResult.ok) return dbResult;
        const queried = await dbResult.data.query(sql, params);
        if (!queried.ok) return accountErr(queried.error);
        return (0, import_sdk_services5.ok)(queried.data);
      },
      status: async () => {
        const dbResult = this.accountDb();
        if (!dbResult.ok) return dbResult;
        const queried = await dbResult.data.query(
          "SELECT source, synced_at, count FROM sync_state ORDER BY source"
        );
        if (!queried.ok) {
          if (isMissingIndexError(queried.error)) {
            return (0, import_sdk_services5.ok)({ database: ACCOUNT_INDEX_DB, state: "missing", sources: [] });
          }
          return accountErr(queried.error);
        }
        return (0, import_sdk_services5.ok)({
          database: ACCOUNT_INDEX_DB,
          state: "ready",
          sources: queried.data.rows.map(([source, syncedAt, count]) => ({
            source,
            syncedAt,
            count
          }))
        });
      }
    };
  }
  async status() {
    const apps = await this.applications.list();
    if (!apps.ok) return apps;
    const delegations = await this.delegations.list();
    if (!delegations.ok) return delegations;
    const spaces = await this.spaces.list();
    if (!spaces.ok) return spaces;
    return (0, import_sdk_services5.ok)({
      did: this.config.getDid(),
      host: this.config.getHost(),
      primarySpaceId: this.config.getPrimarySpaceId(),
      accountSpaceId: this.config.getAccountSpaceId(),
      applications: apps.data.length,
      spaces: spaces.data.length,
      grantedDelegations: delegations.data.filter((d) => d.direction === "granted").length,
      receivedDelegations: delegations.data.filter((d) => d.direction === "received").length
    });
  }
  accountKV() {
    const accountSpaceId = this.config.getAccountSpaceId();
    if (!accountSpaceId) {
      return (0, import_sdk_services5.err)(
        (0, import_sdk_services5.serviceError)(
          "ACCOUNT_SPACE_UNAVAILABLE",
          "Account space is unavailable. Sign in with a wallet-backed profile first.",
          SERVICE_NAME2
        )
      );
    }
    return (0, import_sdk_services5.ok)(this.config.getSpaces().get(accountSpaceId).kv);
  }
  accountDb() {
    const db = this.config.getAccountDb?.();
    if (!db) {
      return (0, import_sdk_services5.err)(
        (0, import_sdk_services5.serviceError)(
          "ACCOUNT_INDEX_UNAVAILABLE",
          "Account index database is unavailable. Sign in with a wallet-backed profile first.",
          SERVICE_NAME2
        )
      );
    }
    return (0, import_sdk_services5.ok)(db);
  }
  async indexHasApplicationHash(appId, manifestHash) {
    const dbResult = this.accountDb();
    if (!dbResult.ok) return false;
    const schema = await this.ensureAccountIndex(dbResult.data);
    if (!schema.ok) return false;
    const queried = await dbResult.data.query(
      "SELECT 1 FROM application_state WHERE app_id = ? AND manifest_hash = ? LIMIT 1",
      [appId, manifestHash]
    );
    return queried.ok && queried.data.rows.length > 0;
  }
  async upsertApplicationIndexQuietly(app) {
    await ignoreIndexFailure(() => this.upsertApplicationIndex(app));
  }
  async upsertApplicationIndex(app) {
    const dbResult = this.accountDb();
    if (!dbResult.ok) return (0, import_sdk_services5.ok)(void 0);
    const schema = await this.ensureAccountIndex(dbResult.data);
    if (!schema.ok) return schema;
    const updatedAt = app.updatedAt ?? (/* @__PURE__ */ new Date()).toISOString();
    const manifestHash = app.manifestHash ?? hashJson(app.manifests);
    const written = await dbResult.data.batch([
      {
        sql: "INSERT OR REPLACE INTO applications (app_id, name, description, updated_at, manifest_json) VALUES (?, ?, ?, ?, ?)",
        params: [
          app.appId,
          app.name ?? null,
          app.description ?? null,
          updatedAt,
          JSON.stringify(app.manifests)
        ]
      },
      {
        sql: "INSERT OR REPLACE INTO application_state (app_id, manifest_hash, indexed_at) VALUES (?, ?, ?)",
        params: [app.appId, manifestHash, updatedAt]
      }
    ]);
    if (!written.ok) return accountErr(written.error);
    return (0, import_sdk_services5.ok)(void 0);
  }
  async deleteApplicationIndexQuietly(appId) {
    await ignoreIndexFailure(() => this.deleteApplicationIndex(appId));
  }
  async deleteApplicationIndex(appId) {
    const dbResult = this.accountDb();
    if (!dbResult.ok) return (0, import_sdk_services5.ok)(void 0);
    const schema = await this.ensureAccountIndex(dbResult.data);
    if (!schema.ok) return schema;
    const deleted = await dbResult.data.batch([
      { sql: "DELETE FROM applications WHERE app_id = ?", params: [appId] },
      { sql: "DELETE FROM application_state WHERE app_id = ?", params: [appId] }
    ]);
    if (!deleted.ok) return accountErr(deleted.error);
    return (0, import_sdk_services5.ok)(void 0);
  }
  async upsertSpaceIndexQuietly(space) {
    await ignoreIndexFailure(() => this.upsertSpaceIndex(space));
  }
  async upsertSpaceIndex(space) {
    const dbResult = this.accountDb();
    if (!dbResult.ok) return (0, import_sdk_services5.ok)(void 0);
    const schema = await this.ensureAccountIndex(dbResult.data);
    if (!schema.ok) return schema;
    const updatedAt = space.updatedAt ?? (/* @__PURE__ */ new Date()).toISOString();
    const written = await dbResult.data.batch([
      {
        sql: "INSERT OR REPLACE INTO spaces (space_id, name, owner_did, type, permissions_json, status, registered_at, updated_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params: [
          space.spaceId,
          space.name,
          space.ownerDid,
          space.type,
          JSON.stringify(space.permissions),
          space.status,
          space.registeredAt ?? updatedAt,
          updatedAt,
          space.expiresAt?.toISOString() ?? null
        ]
      }
    ]);
    if (!written.ok) return accountErr(written.error);
    return (0, import_sdk_services5.ok)(void 0);
  }
  async deleteSpaceIndexQuietly(spaceId) {
    await ignoreIndexFailure(() => this.deleteSpaceIndex(spaceId));
  }
  async deleteSpaceIndex(spaceId) {
    const dbResult = this.accountDb();
    if (!dbResult.ok) return (0, import_sdk_services5.ok)(void 0);
    const schema = await this.ensureAccountIndex(dbResult.data);
    if (!schema.ok) return schema;
    const deleted = await dbResult.data.batch([
      { sql: "DELETE FROM spaces WHERE space_id = ?", params: [spaceId] }
    ]);
    if (!deleted.ok) return accountErr(deleted.error);
    return (0, import_sdk_services5.ok)(void 0);
  }
  async resolveSpace(space) {
    const listed = await this.config.getSpaces().list();
    if (!listed.ok) return accountErr(listed.error);
    const found = listed.data.find((candidate) => candidate.id === space || candidate.name === space);
    if (!found) {
      return (0, import_sdk_services5.err)(
        (0, import_sdk_services5.serviceError)("SPACE_NOT_FOUND", `No account space found for ${JSON.stringify(space)}`, SERVICE_NAME2)
      );
    }
    return (0, import_sdk_services5.ok)(found);
  }
  async replaceApplicationsIndexQuietly(applications) {
    await ignoreIndexFailure(async () => {
      const dbResult = this.accountDb();
      if (!dbResult.ok) return;
      const syncedAt = (/* @__PURE__ */ new Date()).toISOString();
      const schema = await this.ensureAccountIndex(dbResult.data);
      if (!schema.ok) return;
      await dbResult.data.batch([
        { sql: "DELETE FROM applications" },
        { sql: "DELETE FROM application_state" },
        ...applications.map((app) => ({
          sql: "INSERT OR REPLACE INTO applications (app_id, name, description, updated_at, manifest_json) VALUES (?, ?, ?, ?, ?)",
          params: [
            app.appId,
            app.name ?? null,
            app.description ?? null,
            app.updatedAt ?? syncedAt,
            JSON.stringify(app.manifests)
          ]
        })),
        ...applications.map((app) => ({
          sql: "INSERT OR REPLACE INTO application_state (app_id, manifest_hash, indexed_at) VALUES (?, ?, ?)",
          params: [app.appId, app.manifestHash ?? hashJson(app.manifests), syncedAt]
        })),
        {
          sql: "INSERT OR REPLACE INTO sync_state (source, synced_at, count) VALUES (?, ?, ?)",
          params: ["applications", syncedAt, applications.length]
        }
      ]);
    });
  }
  async replaceSpacesIndexQuietly(spaces) {
    await ignoreIndexFailure(async () => {
      const dbResult = this.accountDb();
      if (!dbResult.ok) return;
      const syncedAt = (/* @__PURE__ */ new Date()).toISOString();
      const schema = await this.ensureAccountIndex(dbResult.data);
      if (!schema.ok) return;
      await dbResult.data.batch([
        { sql: "DELETE FROM spaces" },
        ...spaces.map((space) => ({
          sql: "INSERT OR REPLACE INTO spaces (space_id, name, owner_did, type, permissions_json, status, registered_at, updated_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          params: [
            space.spaceId,
            space.name,
            space.ownerDid,
            space.type,
            JSON.stringify(space.permissions),
            space.status,
            space.registeredAt ?? syncedAt,
            space.updatedAt ?? syncedAt,
            space.expiresAt?.toISOString() ?? null
          ]
        })),
        {
          sql: "INSERT OR REPLACE INTO sync_state (source, synced_at, count) VALUES (?, ?, ?)",
          params: ["spaces", syncedAt, spaces.length]
        }
      ]);
    });
  }
  async replaceDelegationsIndexQuietly(delegations) {
    await ignoreIndexFailure(async () => {
      const dbResult = this.accountDb();
      if (!dbResult.ok) return;
      const syncedAt = (/* @__PURE__ */ new Date()).toISOString();
      const schema = await this.ensureAccountIndex(dbResult.data);
      if (!schema.ok) return;
      await dbResult.data.batch([
        { sql: "DELETE FROM delegations" },
        ...delegations.map((delegation) => ({
          sql: "INSERT OR REPLACE INTO delegations (cid, direction, space_id, space_name, counterparty_did, delegate_did, delegator_did, path, actions_json, expiry, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          params: [
            delegation.cid,
            delegation.direction,
            delegation.spaceId,
            delegation.spaceName ?? null,
            delegation.counterpartyDid,
            delegation.delegateDid,
            delegation.delegatorDid ?? null,
            delegation.path,
            JSON.stringify(delegation.actions),
            delegation.expiry.toISOString(),
            delegation.status,
            delegation.createdAt?.toISOString() ?? null,
            syncedAt
          ]
        })),
        {
          sql: "INSERT OR REPLACE INTO sync_state (source, synced_at, count) VALUES (?, ?, ?)",
          params: ["delegations", syncedAt, delegations.length]
        }
      ]);
    });
  }
  async ensureAccountIndex(db) {
    const migrated = await db.migrations.apply({
      namespace: ACCOUNT_INDEX_NAMESPACE,
      migrations: [
        {
          id: "001_initial",
          sql: [...import_bootstrap.ACCOUNT_INDEX_SCHEMA]
        }
      ]
    });
    if (!migrated.ok) return accountErr(migrated.error);
    return (0, import_sdk_services5.ok)(void 0);
  }
};
function applicationKey(appId) {
  return `${ACCOUNT_REGISTRY_PATH}${appId}`;
}
function appIdFromKey(key) {
  return key.startsWith(ACCOUNT_REGISTRY_PATH) ? key.slice(ACCOUNT_REGISTRY_PATH.length) : key;
}
function applicationFromRecord(key, record) {
  const manifests = Array.isArray(record.manifests) ? record.manifests : [];
  const first = manifests[0];
  return {
    appId: record.app_id ?? record.appId ?? first?.app_id ?? appIdFromKey(key),
    manifests,
    updatedAt: record.updated_at ?? record.updatedAt,
    name: first?.name,
    description: first?.description,
    manifestHash: record.manifest_hash ?? record.manifestHash ?? hashJson(manifests)
  };
}
function indexedApplicationFromRow(row) {
  const [appId, name, description, updatedAt, manifestJson, manifestHash] = row;
  return {
    appId,
    name: name ?? void 0,
    description: description ?? void 0,
    updatedAt: updatedAt ?? void 0,
    manifests: JSON.parse(manifestJson),
    manifestHash: manifestHash ?? void 0
  };
}
function spaceKey(spaceId) {
  return `${ACCOUNT_SPACES_PATH}${spaceId}`;
}
function spaceIdFromKey(key) {
  return key.startsWith(ACCOUNT_SPACES_PATH) ? key.slice(ACCOUNT_SPACES_PATH.length) : key;
}
function spaceRecordFromInput(space) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const accountSpace = "spaceId" in space ? space : {
    spaceId: space.id,
    name: space.name ?? space.id.split(":").pop() ?? space.id,
    ownerDid: space.owner ?? "",
    type: space.type ?? "discovered",
    permissions: space.permissions ?? [],
    status: "active",
    expiresAt: space.expiresAt
  };
  return {
    space_id: accountSpace.spaceId,
    name: accountSpace.name,
    owner_did: accountSpace.ownerDid,
    type: accountSpace.type,
    permissions: accountSpace.permissions,
    status: accountSpace.status,
    registered_at: accountSpace.registeredAt ?? now,
    updated_at: now,
    expires_at: accountSpace.expiresAt instanceof Date ? accountSpace.expiresAt.toISOString() : accountSpace.expiresAt
  };
}
function spaceFromRecord(key, record) {
  const expiresAt = record.expires_at ?? record.expiresAt;
  return {
    spaceId: record.space_id ?? record.spaceId ?? spaceIdFromKey(key),
    name: record.name ?? spaceIdFromKey(key).split(":").pop() ?? spaceIdFromKey(key),
    ownerDid: record.owner_did ?? record.ownerDid ?? record.owner ?? "",
    type: record.type ?? "discovered",
    permissions: Array.isArray(record.permissions) ? record.permissions : [],
    status: record.status ?? "active",
    registeredAt: record.registered_at ?? record.registeredAt,
    updatedAt: record.updated_at ?? record.updatedAt,
    expiresAt: expiresAt ? new Date(expiresAt) : void 0
  };
}
function indexedSpaceFromRow(row) {
  const [spaceId, name, ownerDid, type, permissionsJson, status, registeredAt, updatedAt, expiresAt] = row;
  return {
    spaceId,
    name,
    ownerDid,
    type,
    permissions: JSON.parse(permissionsJson),
    status,
    registeredAt: registeredAt ?? void 0,
    updatedAt,
    expiresAt: expiresAt ? new Date(expiresAt) : void 0
  };
}
function hashJson(value) {
  const input = stableJson(value);
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= BigInt(input.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * prime);
  }
  return hash.toString(16).padStart(16, "0");
}
function stableJson(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  const object = value;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`).join(",")}}`;
}
function indexedDelegationFromRow(row) {
  const [
    cid,
    direction,
    spaceId,
    spaceName,
    counterpartyDid,
    delegateDid,
    delegatorDid,
    path,
    actionsJson,
    expiry,
    status,
    createdAt
  ] = row;
  return {
    cid,
    direction,
    spaceId,
    spaceName: spaceName ?? void 0,
    counterpartyDid,
    delegateDid,
    delegatorDid: delegatorDid ?? void 0,
    path,
    actions: JSON.parse(actionsJson),
    expiry: new Date(expiry),
    status,
    createdAt: createdAt ? new Date(createdAt) : void 0
  };
}
function mapDelegation(delegation, space, direction) {
  return {
    cid: delegation.cid,
    direction,
    spaceId: delegation.spaceId || space.id,
    spaceName: space.name,
    counterpartyDid: direction === "granted" ? delegation.delegateDID : delegation.delegatorDID ?? delegation.delegateDID,
    delegateDid: delegation.delegateDID,
    delegatorDid: delegation.delegatorDID,
    path: delegation.path,
    actions: delegation.actions,
    expiry: delegation.expiry,
    status: delegation.isRevoked ? "revoked" : delegation.expiry.getTime() <= Date.now() ? "expired" : "active",
    createdAt: delegation.createdAt
  };
}
function accountErr(error) {
  return (0, import_sdk_services5.err)((0, import_sdk_services5.serviceError)(error.code, error.message, SERVICE_NAME2, { cause: error.cause, meta: error.meta }));
}
function isMissingIndexError(error) {
  return /no such table:/i.test(error.message);
}
async function ignoreIndexFailure(task) {
  try {
    await task();
  } catch {
  }
}

// src/index.ts
var import_sdk_services7 = require("@tinycloud/sdk-services");

// src/space.ts
async function fetchPeerId(host, spaceId) {
  const res = await fetch(
    `${host}/peer/generate/${encodeURIComponent(spaceId)}`
  );
  if (!res.ok) {
    const error = await res.text().catch(() => res.statusText);
    throw new Error(`Failed to get peer ID: ${res.status} - ${error}`);
  }
  return res.text();
}
async function submitHostDelegation(host, headers) {
  const res = await fetch(`${host}/delegate`, {
    method: "POST",
    headers
  });
  return {
    success: res.ok,
    status: res.status,
    error: res.ok ? void 0 : await res.text().catch(() => res.statusText)
  };
}
async function activateSessionWithHost(host, delegationHeader) {
  const res = await fetch(`${host}/delegate`, {
    method: "POST",
    headers: delegationHeader
  });
  if (res.ok) {
    try {
      const body = await res.json();
      return {
        success: true,
        status: res.status,
        activated: body.activated ?? [],
        skipped: body.skipped ?? []
      };
    } catch {
      return {
        success: true,
        status: res.status,
        activated: [],
        skipped: []
      };
    }
  }
  return {
    success: false,
    status: res.status,
    error: await res.text().catch(() => res.statusText)
  };
}

// src/delegations/DelegationManager.ts
var DelegationAction = {
  CREATE: "tinycloud.delegation/create",
  REVOKE: "tinycloud.delegation/revoke",
  LIST: "tinycloud.delegation/list",
  GET: "tinycloud.delegation/get",
  CHECK: "tinycloud.delegation/check"
};
function createError(code, message, cause, meta) {
  return {
    code,
    message,
    service: "delegation",
    cause,
    meta
  };
}
var DelegationManager = class {
  /**
   * Creates a new DelegationManager instance.
   *
   * @param config - Configuration including hosts, session, and invoke function
   */
  constructor(config) {
    this.hosts = config.hosts;
    this.session = config.session;
    this.invoke = config.invoke;
    this.fetchFn = config.fetch ?? globalThis.fetch.bind(globalThis);
  }
  /**
   * Updates the session (e.g., after re-authentication).
   *
   * @param session - New session to use for operations
   */
  updateSession(session) {
    this.session = session;
  }
  /**
   * Gets the primary host URL.
   */
  get host() {
    return this.hosts[0];
  }
  /**
   * Executes an invoke operation against the delegation API.
   */
  async invokeOperation(path, action, body) {
    const headers = this.invoke(this.session, "delegation", path, action);
    return this.fetchFn(`${this.host}/invoke`, {
      method: "POST",
      headers,
      body
    });
  }
  /**
   * Creates a new delegation.
   *
   * Delegates specific permissions to another DID for a given path.
   * The delegatee can then use these permissions to access resources
   * within the specified scope.
   *
   * @param params - Parameters for the delegation
   * @returns Result containing the created Delegation or an error
   *
   * @example
   * ```typescript
   * const result = await manager.create({
   *   delegateDID: bob.did,
   *   path: "documents/shared/",
   *   actions: ["tinycloud.kv/get", "tinycloud.kv/put"],
   *   expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
   * });
   * ```
   */
  async create(params) {
    if (!params.delegateDID) {
      return {
        ok: false,
        error: createError(
          DelegationErrorCodes.INVALID_INPUT,
          "delegateDID is required"
        )
      };
    }
    if (!params.path) {
      return {
        ok: false,
        error: createError(
          DelegationErrorCodes.INVALID_INPUT,
          "path is required"
        )
      };
    }
    if (!params.actions || params.actions.length === 0) {
      return {
        ok: false,
        error: createError(
          DelegationErrorCodes.INVALID_INPUT,
          "at least one action is required"
        )
      };
    }
    try {
      const body = JSON.stringify({
        delegateDID: params.delegateDID,
        path: params.path,
        actions: params.actions,
        expiry: params.expiry?.toISOString(),
        disableSubDelegation: params.disableSubDelegation ?? false,
        statement: params.statement
      });
      const response = await this.invokeOperation(
        params.path,
        DelegationAction.CREATE,
        body
      );
      if (!response.ok) {
        const errorText = await response.text();
        return {
          ok: false,
          error: createError(
            DelegationErrorCodes.CREATION_FAILED,
            `Failed to create delegation: ${response.status} - ${errorText}`,
            void 0,
            { status: response.status, path: params.path }
          )
        };
      }
      const apiResponse = await response.json();
      const delegation = {
        cid: apiResponse.cid ?? "",
        delegateDID: params.delegateDID,
        spaceId: this.session.spaceId,
        path: params.path,
        actions: params.actions,
        expiry: params.expiry ?? new Date(Date.now() + EXPIRY.SHARE_MS),
        isRevoked: false,
        allowSubDelegation: !(params.disableSubDelegation ?? false),
        createdAt: /* @__PURE__ */ new Date()
      };
      return { ok: true, data: delegation };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return {
          ok: false,
          error: createError(
            DelegationErrorCodes.ABORTED,
            "Request aborted",
            error
          )
        };
      }
      return {
        ok: false,
        error: createError(
          DelegationErrorCodes.NETWORK_ERROR,
          `Network error during delegation creation: ${String(error)}`,
          error instanceof Error ? error : void 0
        )
      };
    }
  }
  /**
   * Revokes an existing delegation.
   *
   * Once revoked, the delegation can no longer be used to access resources.
   * This also invalidates any sub-delegations derived from this delegation.
   *
   * @param cid - The CID of the delegation to revoke
   * @returns Result indicating success or an error
   *
   * @example
   * ```typescript
   * const result = await manager.revoke("bafy...");
   * if (result.ok) {
   *   console.log("Delegation revoked successfully");
   * }
   * ```
   */
  async revoke(cid) {
    if (!cid) {
      return {
        ok: false,
        error: createError(
          DelegationErrorCodes.INVALID_INPUT,
          "cid is required"
        )
      };
    }
    try {
      const body = JSON.stringify({ cid });
      const response = await this.invokeOperation(
        cid,
        DelegationAction.REVOKE,
        body
      );
      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 404) {
          return {
            ok: false,
            error: createError(
              DelegationErrorCodes.NOT_FOUND,
              `Delegation not found: ${cid}`
            )
          };
        }
        return {
          ok: false,
          error: createError(
            DelegationErrorCodes.REVOCATION_FAILED,
            `Failed to revoke delegation: ${response.status} - ${errorText}`,
            void 0,
            { status: response.status, cid }
          )
        };
      }
      return { ok: true, data: void 0 };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return {
          ok: false,
          error: createError(
            DelegationErrorCodes.ABORTED,
            "Request aborted",
            error
          )
        };
      }
      return {
        ok: false,
        error: createError(
          DelegationErrorCodes.NETWORK_ERROR,
          `Network error during delegation revocation: ${String(error)}`,
          error instanceof Error ? error : void 0
        )
      };
    }
  }
  /**
   * Lists all delegations for the current session's space.
   *
   * Returns both delegations created by the current user (as delegator)
   * and delegations granted to the current user (as delegatee).
   *
   * @returns Result containing an array of Delegations or an error
   *
   * @example
   * ```typescript
   * const result = await manager.list();
   * if (result.ok) {
   *   for (const delegation of result.data) {
   *     console.log(`${delegation.cid}: ${delegation.path} -> ${delegation.delegateDID}`);
   *   }
   * }
   * ```
   */
  async list() {
    try {
      const response = await this.invokeOperation("", DelegationAction.LIST);
      if (!response.ok) {
        const errorText = await response.text();
        return {
          ok: false,
          error: createError(
            DelegationErrorCodes.NETWORK_ERROR,
            `Failed to list delegations: ${response.status} - ${errorText}`,
            void 0,
            { status: response.status }
          )
        };
      }
      const data = await response.json();
      const delegations = data.map((item) => ({
        cid: item.cid,
        delegateDID: item.delegateDID,
        delegatorDID: item.delegatorDID,
        spaceId: item.spaceId,
        path: item.path,
        actions: item.actions,
        expiry: new Date(item.expiry),
        isRevoked: item.isRevoked,
        createdAt: item.createdAt ? new Date(item.createdAt) : void 0,
        parentCid: item.parentCid,
        allowSubDelegation: item.allowSubDelegation
      }));
      return { ok: true, data: delegations };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return {
          ok: false,
          error: createError(
            DelegationErrorCodes.ABORTED,
            "Request aborted",
            error
          )
        };
      }
      return {
        ok: false,
        error: createError(
          DelegationErrorCodes.NETWORK_ERROR,
          `Network error during delegation list: ${String(error)}`,
          error instanceof Error ? error : void 0
        )
      };
    }
  }
  /**
   * Gets the full delegation chain for a given delegation.
   *
   * Returns the chain of delegations from the root (original delegator)
   * to the specified delegation, including all intermediate sub-delegations.
   *
   * @param cid - The CID of the delegation to get the chain for
   * @returns Result containing the DelegationChain or an error
   *
   * @example
   * ```typescript
   * const result = await manager.getChain("bafy...");
   * if (result.ok) {
   *   console.log("Chain length:", result.data.length);
   *   for (const delegation of result.data) {
   *     console.log(`- ${delegation.delegatorDID} -> ${delegation.delegateDID}`);
   *   }
   * }
   * ```
   */
  async getChain(cid) {
    if (!cid) {
      return {
        ok: false,
        error: createError(
          DelegationErrorCodes.INVALID_INPUT,
          "cid is required"
        )
      };
    }
    try {
      const body = JSON.stringify({ cid, includeChain: true });
      const response = await this.invokeOperation(
        cid,
        DelegationAction.GET,
        body
      );
      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 404) {
          return {
            ok: false,
            error: createError(
              DelegationErrorCodes.NOT_FOUND,
              `Delegation not found: ${cid}`
            )
          };
        }
        return {
          ok: false,
          error: createError(
            DelegationErrorCodes.NETWORK_ERROR,
            `Failed to get delegation chain: ${response.status} - ${errorText}`,
            void 0,
            { status: response.status, cid }
          )
        };
      }
      const data = await response.json();
      const chain = data.chain.map((item) => ({
        cid: item.cid,
        delegateDID: item.delegateDID,
        delegatorDID: item.delegatorDID,
        spaceId: item.spaceId,
        path: item.path,
        actions: item.actions,
        expiry: new Date(item.expiry),
        isRevoked: item.isRevoked,
        createdAt: item.createdAt ? new Date(item.createdAt) : void 0,
        parentCid: item.parentCid,
        allowSubDelegation: item.allowSubDelegation
      }));
      return { ok: true, data: chain };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return {
          ok: false,
          error: createError(
            DelegationErrorCodes.ABORTED,
            "Request aborted",
            error
          )
        };
      }
      return {
        ok: false,
        error: createError(
          DelegationErrorCodes.NETWORK_ERROR,
          `Network error during chain retrieval: ${String(error)}`,
          error instanceof Error ? error : void 0
        )
      };
    }
  }
  /**
   * Checks if the current session has permission for a given path and action.
   *
   * This can be used to verify permissions before attempting an operation,
   * or to implement custom access control logic.
   *
   * @param path - The resource path to check
   * @param action - The action to check (e.g., "tinycloud.kv/get")
   * @returns Result containing a boolean indicating permission or an error
   *
   * @example
   * ```typescript
   * const result = await manager.checkPermission("documents/private/", "tinycloud.kv/put");
   * if (result.ok && result.data) {
   *   console.log("Permission granted");
   * } else {
   *   console.log("Permission denied");
   * }
   * ```
   */
  async checkPermission(path, action) {
    if (!path) {
      return {
        ok: false,
        error: createError(
          DelegationErrorCodes.INVALID_INPUT,
          "path is required"
        )
      };
    }
    if (!action) {
      return {
        ok: false,
        error: createError(
          DelegationErrorCodes.INVALID_INPUT,
          "action is required"
        )
      };
    }
    try {
      const body = JSON.stringify({ path, action });
      const response = await this.invokeOperation(
        path,
        DelegationAction.CHECK,
        body
      );
      if (!response.ok) {
        if (response.status === 403) {
          return { ok: true, data: false };
        }
        const errorText = await response.text();
        return {
          ok: false,
          error: createError(
            DelegationErrorCodes.NETWORK_ERROR,
            `Failed to check permission: ${response.status} - ${errorText}`,
            void 0,
            { status: response.status, path, action }
          )
        };
      }
      const data = await response.json();
      return { ok: true, data: data.allowed };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return {
          ok: false,
          error: createError(
            DelegationErrorCodes.ABORTED,
            "Request aborted",
            error
          )
        };
      }
      return {
        ok: false,
        error: createError(
          DelegationErrorCodes.NETWORK_ERROR,
          `Network error during permission check: ${String(error)}`,
          error instanceof Error ? error : void 0
        )
      };
    }
  }
};

// src/delegations/SharingService.schema.ts
var import_zod5 = require("zod");
var EncodedShareDataSchema = import_zod5.z.object({
  /** Private key in JWK format (must include d parameter) */
  key: JWKSchema.refine(
    (jwk) => typeof jwk.d === "string" && jwk.d.length > 0,
    { message: "JWK must include private key (d parameter)" }
  ),
  /** DID of the key */
  keyDid: import_zod5.z.string().min(1, "keyDid is required"),
  /** The delegation granting access */
  delegation: DelegationSchema,
  /** Resource path this link grants access to */
  path: import_zod5.z.string().min(1, "path is required"),
  /** TinyCloud host URL */
  host: import_zod5.z.string().url("host must be a valid URL"),
  /** Space ID */
  spaceId: import_zod5.z.string().min(1, "spaceId is required"),
  /** Schema version (must be 1) */
  version: import_zod5.z.literal(1)
});
var ReceiveOptionsSchema = import_zod5.z.object({
  /**
   * Whether to automatically create a sub-delegation to the current session key.
   * Default: true
   */
  autoSubdelegate: import_zod5.z.boolean().optional(),
  /**
   * Whether to use the current session key for operations (requires autoSubdelegate).
   * Default: true
   */
  useSessionKey: import_zod5.z.boolean().optional(),
  /**
   * Ingestion options passed to CapabilityKeyRegistry.
   */
  ingestOptions: IngestOptionsSchema.optional()
});
var SharingServiceConfigSchema = import_zod5.z.object({
  /** TinyCloud host URLs */
  hosts: import_zod5.z.array(import_zod5.z.string().url()).min(1, "At least one host URL is required"),
  /**
   * Active session for authentication.
   * Required for generate(), optional for receive().
   */
  session: import_zod5.z.unknown().refine(
    (val) => val === void 0 || val !== null && typeof val === "object",
    { message: "Expected a ServiceSession object or undefined" }
  ).optional(),
  /** Platform-specific invoke function */
  invoke: import_zod5.z.unknown().refine((val) => typeof val === "function", {
    message: "Expected an invoke function"
  }),
  /** Optional custom fetch implementation */
  fetch: import_zod5.z.unknown().refine(
    (val) => val === void 0 || typeof val === "function",
    { message: "Expected a fetch function or undefined" }
  ).optional(),
  /** Key provider for cryptographic operations */
  keyProvider: KeyProviderSchema,
  /** Capability key registry for key/delegation management */
  registry: import_zod5.z.unknown().refine(
    (val) => val !== null && typeof val === "object",
    { message: "Expected an ICapabilityKeyRegistry object" }
  ),
  /**
   * Delegation manager for creating delegations.
   * Required for generate(), optional for receive().
   */
  delegationManager: import_zod5.z.unknown().refine(
    (val) => val === void 0 || val !== null && typeof val === "object",
    { message: "Expected a DelegationManager object or undefined" }
  ).optional(),
  /** Factory for creating KV service instances */
  createKVService: import_zod5.z.unknown().refine(
    (val) => typeof val === "function",
    { message: "Expected a createKVService factory function" }
  ),
  /** Base URL for sharing links (e.g., "https://share.myapp.com") */
  baseUrl: import_zod5.z.string().optional(),
  /**
   * Custom delegation creation function.
   */
  createDelegation: import_zod5.z.unknown().refine((val) => val === void 0 || typeof val === "function", {
    message: "Expected a createDelegation function or undefined"
  }).optional(),
  /**
   * WASM function for client-side delegation creation.
   */
  createDelegationWasm: import_zod5.z.unknown().refine((val) => val === void 0 || typeof val === "function", {
    message: "Expected a createDelegationWasm function or undefined"
  }).optional(),
  /**
   * Path prefix for KV operations.
   */
  pathPrefix: import_zod5.z.string().optional(),
  /**
   * Session expiry time.
   */
  sessionExpiry: import_zod5.z.date().optional(),
  /**
   * Callback to create a DIRECT delegation from wallet to share key.
   * This is the preferred method for long-lived share links because it
   * bypasses the session delegation chain entirely.
   */
  onRootDelegationNeeded: import_zod5.z.unknown().refine((val) => val === void 0 || typeof val === "function", {
    message: "Expected an onRootDelegationNeeded function or undefined"
  }).optional()
});
function validateEncodedShareData(data) {
  const result = EncodedShareDataSchema.safeParse(data);
  if (!result.success) {
    return {
      ok: false,
      error: {
        code: DelegationErrorCodes.VALIDATION_ERROR,
        message: `Invalid share data: ${result.error.message}`,
        service: "delegation",
        meta: { issues: result.error.issues }
      }
    };
  }
  return { ok: true, data: result.data };
}

// src/delegations/SharingService.ts
function inferShortServiceFromActionUrns(actions) {
  let short;
  for (const action of actions) {
    const slash = action.indexOf("/");
    if (slash === -1) return void 0;
    const longService = action.slice(0, slash);
    const candidate = SERVICE_LONG_TO_SHORT[longService];
    if (candidate === void 0) return void 0;
    if (short === void 0) {
      short = candidate;
    } else if (short !== candidate) {
      return void 0;
    }
  }
  return short;
}
var DEFAULT_READ_ACTIONS = ["tinycloud.kv/get", "tinycloud.kv/metadata"];
var DEFAULT_EXPIRY_MS = EXPIRY.SHARE_MS;
var BASE64_PREFIX = "tc1:";
function createError2(code, message, cause, meta) {
  return {
    code,
    message,
    service: "delegation",
    cause,
    meta
  };
}
function base64UrlEncode(data) {
  let base64;
  if (typeof btoa !== "undefined") {
    base64 = btoa(unescape(encodeURIComponent(data)));
  } else if (typeof Buffer !== "undefined") {
    base64 = Buffer.from(data, "utf-8").toString("base64");
  } else {
    throw new Error("No base64 encoding available");
  }
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function base64UrlDecode(encoded) {
  let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  if (typeof atob !== "undefined") {
    return decodeURIComponent(escape(atob(base64)));
  } else if (typeof Buffer !== "undefined") {
    return Buffer.from(base64, "base64").toString("utf-8");
  } else {
    throw new Error("No base64 decoding available");
  }
}
var SharingService = class {
  /**
   * Creates a new SharingService instance.
   */
  constructor(config) {
    this.hosts = config.hosts;
    this.session = config.session;
    this.invoke = config.invoke;
    this.fetchFn = config.fetch ?? globalThis.fetch.bind(globalThis);
    this.keyProvider = config.keyProvider;
    this.registry = config.registry;
    this.delegationManager = config.delegationManager;
    this.createKVService = config.createKVService;
    this.baseUrl = (config.baseUrl ?? "").replace(/\/$/, "");
    this.createDelegationFn = config.createDelegation;
    this.createDelegationWasmFn = config.createDelegationWasm;
    this.pathPrefix = config.pathPrefix ?? "";
    this.sessionExpiry = config.sessionExpiry;
    this.onRootDelegationNeeded = config.onRootDelegationNeeded;
  }
  /**
   * Gets the primary host URL.
   */
  get host() {
    return this.hosts[0];
  }
  /**
   * Updates the session (e.g., after re-authentication).
   */
  updateSession(session) {
    this.session = session;
  }
  /**
   * Updates the service configuration.
   * Used to add full capabilities (session, delegationManager, createDelegation, createDelegationWasm) after signIn.
   */
  updateConfig(config) {
    if (config.session !== void 0) {
      this.session = config.session;
    }
    if (config.delegationManager !== void 0) {
      this.delegationManager = config.delegationManager;
    }
    if (config.createDelegation !== void 0) {
      this.createDelegationFn = config.createDelegation;
    }
    if (config.createDelegationWasm !== void 0) {
      this.createDelegationWasmFn = config.createDelegationWasm;
    }
    if (config.sessionExpiry !== void 0) {
      this.sessionExpiry = config.sessionExpiry;
    }
    if (config.onRootDelegationNeeded !== void 0) {
      this.onRootDelegationNeeded = config.onRootDelegationNeeded;
    }
  }
  /**
   * Generate a sharing link with an embedded private key.
   *
   * Flow:
   * 1. Spawn new session key (unique per share)
   * 2. Create delegation from current session to spawned key
   * 3. Package: { key (with private!), delegation, path, host }
   * 4. Encode based on schema (base64 for now)
   * 5. Return link string
   */
  async generate(params) {
    if (!this.session) {
      return {
        ok: false,
        error: createError2(
          DelegationErrorCodes.NOT_INITIALIZED,
          "Session required for generating sharing links. Call signIn() first."
        )
      };
    }
    if (!this.createDelegationWasmFn && !this.createDelegationFn && !this.delegationManager) {
      return {
        ok: false,
        error: createError2(
          DelegationErrorCodes.NOT_INITIALIZED,
          "DelegationManager, createDelegation, or createDelegationWasm function required for generating sharing links."
        )
      };
    }
    if (!params.path) {
      return {
        ok: false,
        error: createError2(
          DelegationErrorCodes.INVALID_INPUT,
          "path is required"
        )
      };
    }
    const actions = params.actions ?? DEFAULT_READ_ACTIONS;
    const requestedExpiry = params.expiry ?? new Date(Date.now() + DEFAULT_EXPIRY_MS);
    let expiry = requestedExpiry;
    const schema = params.schema ?? "base64";
    const fullPath = this.pathPrefix ? `${this.pathPrefix}/${params.path}`.replace(/\/+/g, "/") : params.path;
    if (schema !== "base64") {
      return {
        ok: false,
        error: createError2(
          DelegationErrorCodes.INVALID_INPUT,
          `Schema '${schema}' not implemented. Only 'base64' is supported.`
        )
      };
    }
    let keyId;
    let keyDid;
    let keyJwk;
    try {
      const shareKeyName = `share:${Date.now()}:${Math.random().toString(36).substring(2, 10)}`;
      keyId = await this.keyProvider.createSessionKey(shareKeyName);
      keyDid = await this.keyProvider.getDID(keyId);
      keyJwk = this.keyProvider.getJWK(keyId);
      if (!keyJwk.d) {
        return {
          ok: false,
          error: createError2(
            DelegationErrorCodes.CREATION_FAILED,
            "KeyProvider did not return private key (d parameter) in JWK"
          )
        };
      }
    } catch (err6) {
      return {
        ok: false,
        error: createError2(
          DelegationErrorCodes.CREATION_FAILED,
          `Failed to generate session key for share: ${err6 instanceof Error ? err6.message : String(err6)}`,
          err6 instanceof Error ? err6 : void 0
        )
      };
    }
    let delegation;
    const plainDID = keyDid.split("#")[0];
    const handleDelegationResult = (result) => {
      if (result && typeof result === "object" && "ok" in result) {
        return result;
      }
      return result;
    };
    const canSatisfyFromRegistry = this.findSuitableKeyForDelegation(
      fullPath,
      actions,
      requestedExpiry
    );
    if (canSatisfyFromRegistry) {
      const delegationResult = await this.createSessionDelegation(plainDID, fullPath, actions, expiry);
      const parsed = handleDelegationResult(delegationResult);
      if ("ok" in parsed && parsed.ok === false) {
        return parsed;
      }
      delegation = parsed;
    } else if (this.onRootDelegationNeeded) {
      try {
        const rootDelegation = await this.onRootDelegationNeeded({
          shareKeyDID: plainDID,
          spaceId: this.session.spaceId,
          path: fullPath,
          actions,
          requestedExpiry
        });
        if (rootDelegation) {
          delegation = rootDelegation;
          expiry = requestedExpiry;
        } else {
          const fallbackResult = await this.handleSessionExtensionFallback(requestedExpiry);
          expiry = fallbackResult.expiry;
          const delegationResult = await this.createSessionDelegation(plainDID, fullPath, actions, expiry);
          const parsed = handleDelegationResult(delegationResult);
          if ("ok" in parsed && parsed.ok === false) {
            return parsed;
          }
          delegation = parsed;
        }
      } catch (err6) {
        const fallbackResult = await this.handleSessionExtensionFallback(requestedExpiry);
        expiry = fallbackResult.expiry;
        const delegationResult = await this.createSessionDelegation(plainDID, fullPath, actions, expiry);
        const parsed = handleDelegationResult(delegationResult);
        if ("ok" in parsed && parsed.ok === false) {
          return parsed;
        }
        delegation = parsed;
      }
    } else {
      const fallbackResult = await this.handleSessionExtensionFallback(requestedExpiry);
      expiry = fallbackResult.expiry;
      const delegationResult = await this.createSessionDelegation(plainDID, fullPath, actions, expiry);
      const parsed = handleDelegationResult(delegationResult);
      if ("ok" in parsed && parsed.ok === false) {
        return parsed;
      }
      delegation = parsed;
    }
    const shareData = {
      key: keyJwk,
      keyDid,
      delegation,
      path: fullPath,
      host: this.host,
      spaceId: this.session.spaceId,
      version: 1
    };
    const encodedData = this.encodeLink(shareData, schema);
    const baseUrl = params.baseUrl ?? this.baseUrl;
    const url = baseUrl ? `${baseUrl}/share/${encodedData}` : encodedData;
    const shareLink = {
      token: encodedData,
      url,
      delegation,
      schema,
      expiresAt: expiry,
      description: params.description
    };
    return { ok: true, data: shareLink };
  }
  /**
   * Check if any key in the registry can satisfy the delegation request.
   * A key can satisfy if it has a delegation that:
   * 1. Covers the required path (exact match or parent path)
   * 2. Has all required actions
   * 3. Has sufficient expiry (delegation.expiry >= requestedExpiry)
   * 4. Allows sub-delegation
   * @internal
   */
  findSuitableKeyForDelegation(path, actions, requestedExpiry) {
    if (this.sessionExpiry && requestedExpiry <= this.sessionExpiry) {
      return true;
    }
    const allKeys = this.registry.getAllKeys();
    for (const key of allKeys) {
      const delegations = this.registry.getDelegationsForKey(key.id);
      for (const delegation of delegations) {
        if (!this.registry.isDelegationValid(delegation)) {
          continue;
        }
        if (delegation.expiry < requestedExpiry) {
          continue;
        }
        if (delegation.allowSubDelegation === false) {
          continue;
        }
        const delegationPath = delegation.path || "";
        if (!this.pathMatches(delegationPath, path)) {
          continue;
        }
        const delegationActions = delegation.actions || [];
        const hasAllActions = actions.every(
          (action) => delegationActions.includes(action) || delegationActions.includes("*")
        );
        if (!hasAllActions) {
          continue;
        }
        return true;
      }
    }
    return false;
  }
  /**
   * Check if a delegation path matches/covers the requested path.
   * A delegation path covers the request if:
   * - It's an exact match
   * - It's a parent path (e.g., delegation for "" covers "foo/bar")
   * - It uses wildcards that match
   * @internal
   */
  pathMatches(delegationPath, requestedPath) {
    if (delegationPath === "" || delegationPath === "*") {
      return true;
    }
    if (delegationPath === requestedPath) {
      return true;
    }
    const normalizedDelegation = delegationPath.replace(/\/$/, "");
    const normalizedRequest = requestedPath.replace(/\/$/, "");
    if (normalizedRequest.startsWith(normalizedDelegation + "/")) {
      return true;
    }
    return false;
  }
  /**
   * Handle fallback to session extension when root delegation is not available.
   * @internal
   */
  async handleSessionExtensionFallback(requestedExpiry) {
    return { expiry: this.sessionExpiry ?? requestedExpiry };
  }
  /**
   * Create a delegation from the current session to a share key.
   * This is the fallback path when root delegation is not available.
   * @internal
   */
  async createSessionDelegation(delegateDID, path, actions, expiry) {
    if (!this.session) {
      return {
        ok: false,
        error: createError2(
          DelegationErrorCodes.NOT_INITIALIZED,
          "Session required for creating delegation"
        )
      };
    }
    if (this.createDelegationWasmFn) {
      try {
        if (actions.length === 0) {
          return {
            ok: false,
            error: createError2(
              DelegationErrorCodes.VALIDATION_ERROR,
              "createDelegation requires at least one action"
            )
          };
        }
        const shortService = inferShortServiceFromActionUrns(actions);
        if (shortService === void 0) {
          return {
            ok: false,
            error: createError2(
              DelegationErrorCodes.VALIDATION_ERROR,
              `createDelegation: cannot infer service from actions ${JSON.stringify(actions)} \u2014 expected full URNs like "tinycloud.kv/get"`
            )
          };
        }
        const wasmResult = this.createDelegationWasmFn({
          session: this.session,
          delegateDID,
          spaceId: this.session.spaceId,
          abilities: {
            [shortService]: {
              [path]: [...actions]
            }
          },
          expirationSecs: Math.floor(expiry.getTime() / 1e3)
        });
        const registerRes = await this.fetchFn(`${this.host}/delegate`, {
          method: "POST",
          headers: {
            Authorization: wasmResult.delegation
          }
        });
        if (!registerRes.ok) {
          const errorText = await registerRes.text();
          return {
            ok: false,
            error: createError2(
              DelegationErrorCodes.CREATION_FAILED,
              `Failed to register delegation with server: ${registerRes.status} ${errorText}`
            )
          };
        }
        if (wasmResult.resources.length === 0) {
          return {
            ok: false,
            error: createError2(
              DelegationErrorCodes.CREATION_FAILED,
              "createDelegation WASM returned empty resources array for a single-entry request"
            )
          };
        }
        const primary = wasmResult.resources[0];
        return {
          cid: wasmResult.cid,
          delegateDID: wasmResult.delegateDID,
          spaceId: this.session.spaceId,
          path: primary.path,
          actions: primary.actions,
          expiry: wasmResult.expiry,
          isRevoked: false,
          authHeader: wasmResult.delegation,
          allowSubDelegation: true,
          createdAt: /* @__PURE__ */ new Date()
        };
      } catch (err6) {
        return {
          ok: false,
          error: createError2(
            DelegationErrorCodes.CREATION_FAILED,
            `Failed to create delegation via WASM: ${err6 instanceof Error ? err6.message : String(err6)}`,
            err6 instanceof Error ? err6 : void 0
          )
        };
      }
    } else {
      const delegationParams = {
        delegateDID,
        path,
        actions,
        expiry,
        disableSubDelegation: false
      };
      const delegationResult = this.createDelegationFn ? await this.createDelegationFn(delegationParams) : await this.delegationManager.create(delegationParams);
      if (!delegationResult.ok) {
        return {
          ok: false,
          error: createError2(
            DelegationErrorCodes.CREATION_FAILED,
            `Failed to create delegation for share: ${delegationResult.error.message}`,
            delegationResult.error.cause,
            delegationResult.error.meta
          )
        };
      }
      return delegationResult.data;
    }
  }
  /**
   * Receive and activate a sharing link.
   *
   * Flow:
   * 1. Decode link -> extract { key, delegation, path, host }
   * 2. Ingest key into CapabilityKeyRegistry
   * 3. If autoSubdelegate (default true) + useSessionKey:
   *    - Create sub-delegation from ingested key -> current session
   *    - Register sub-delegation capabilities
   * 4. Return ShareAccess with pre-configured KV service
   */
  async receive(link, options = {}) {
    const {
      autoSubdelegate = true,
      useSessionKey = true,
      ingestOptions
    } = options;
    const decodeResult = this.decodeLinkWithValidation(link);
    if (!decodeResult.ok) {
      return decodeResult;
    }
    const shareData = decodeResult.data;
    const delegationExpiry = new Date(shareData.delegation.expiry);
    if (delegationExpiry < /* @__PURE__ */ new Date()) {
      return {
        ok: false,
        error: createError2(
          DelegationErrorCodes.AUTH_EXPIRED,
          "Sharing link has expired"
        )
      };
    }
    if (shareData.delegation.isRevoked) {
      return {
        ok: false,
        error: createError2(
          DelegationErrorCodes.REVOKED,
          "Sharing link has been revoked"
        )
      };
    }
    const keyInfo = {
      id: `ingested:${shareData.keyDid}`,
      did: shareData.keyDid,
      type: "ingested",
      jwk: shareData.key,
      priority: 2
      // Ingested keys have lowest priority
    };
    this.registry.ingestKey(keyInfo, shareData.delegation, ingestOptions);
    let activeDelegation = shareData.delegation;
    let activeKey = keyInfo;
    if (autoSubdelegate && useSessionKey && this.session) {
      try {
      } catch (err6) {
        console.warn("Auto-subdelegation failed, using ingested key directly:", err6);
      }
    }
    const authHeader = shareData.delegation.authHeader ?? `Bearer ${shareData.delegation.cid}`;
    const shareSession = {
      delegationHeader: { Authorization: authHeader },
      delegationCid: shareData.delegation.cid,
      spaceId: shareData.spaceId,
      verificationMethod: shareData.keyDid,
      jwk: shareData.key
    };
    const kvService = this.createKVService({
      hosts: [shareData.host],
      session: shareSession,
      invoke: this.invoke,
      fetch: this.fetchFn,
      pathPrefix: shareData.path
    });
    const shareAccess = {
      delegation: activeDelegation,
      key: activeKey,
      kv: kvService,
      spaceId: shareData.spaceId,
      path: shareData.path
    };
    return { ok: true, data: shareAccess };
  }
  /**
   * Encode sharing data into a link string.
   *
   * @param data - The share data to encode
   * @param schema - The encoding schema (default: "base64")
   * @returns Encoded link string
   */
  encodeLink(data, schema = "base64") {
    if (schema !== "base64") {
      throw new Error(`Schema '${schema}' not implemented. Only 'base64' is supported.`);
    }
    const jsonString = JSON.stringify(data);
    const encoded = base64UrlEncode(jsonString);
    return `${BASE64_PREFIX}${encoded}`;
  }
  /**
   * Decode a link string into sharing data.
   *
   * @param link - The encoded link string (may include URL prefix)
   * @returns Decoded share data
   * @throws Error if link format is invalid or data fails validation
   */
  decodeLink(link) {
    const result = this.decodeLinkWithValidation(link);
    if (!result.ok) {
      throw new Error(result.error.message);
    }
    return result.data;
  }
  /**
   * Decode and validate a link string into sharing data.
   *
   * Internal method that returns a Result instead of throwing.
   * Used by receive() for proper error handling.
   *
   * @param link - The encoded link string (may include URL prefix)
   * @returns Result with decoded share data or validation error
   */
  decodeLinkWithValidation(link) {
    let encoded = link;
    if (link.includes("/share/")) {
      const parts = link.split("/share/");
      encoded = parts[parts.length - 1];
    }
    if (link.includes("?share=")) {
      try {
        const url = new URL(link);
        encoded = url.searchParams.get("share") ?? encoded;
      } catch {
        return {
          ok: false,
          error: createError2(
            DelegationErrorCodes.INVALID_TOKEN,
            "Invalid URL format in sharing link"
          )
        };
      }
    }
    if (!encoded.startsWith(BASE64_PREFIX)) {
      return {
        ok: false,
        error: createError2(
          DelegationErrorCodes.INVALID_TOKEN,
          `Invalid sharing link format. Expected prefix '${BASE64_PREFIX}'`
        )
      };
    }
    const base64Data = encoded.slice(BASE64_PREFIX.length);
    let jsonString;
    try {
      jsonString = base64UrlDecode(base64Data);
    } catch (err6) {
      return {
        ok: false,
        error: createError2(
          DelegationErrorCodes.INVALID_TOKEN,
          `Failed to decode base64 data: ${err6 instanceof Error ? err6.message : String(err6)}`,
          err6 instanceof Error ? err6 : void 0
        )
      };
    }
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (err6) {
      return {
        ok: false,
        error: createError2(
          DelegationErrorCodes.INVALID_TOKEN,
          `Failed to parse share data JSON: ${err6 instanceof Error ? err6.message : String(err6)}`,
          err6 instanceof Error ? err6 : void 0
        )
      };
    }
    if (parsed && typeof parsed === "object" && "delegation" in parsed && parsed.delegation && typeof parsed.delegation === "object" && "expiry" in parsed.delegation && typeof parsed.delegation.expiry === "string") {
      parsed.delegation.expiry = new Date(parsed.delegation.expiry);
    }
    const validationResult = validateEncodedShareData(parsed);
    if (!validationResult.ok) {
      return {
        ok: false,
        error: createError2(
          DelegationErrorCodes.INVALID_TOKEN,
          validationResult.error.message,
          void 0,
          validationResult.error.meta
        )
      };
    }
    return { ok: true, data: validationResult.data };
  }
};
function createSharingService(config) {
  return new SharingService(config);
}

// src/authorization/CapabilityKeyRegistry.ts
var import_sdk_services6 = require("@tinycloud/sdk-services");
var SERVICE_NAME3 = "capability-key-registry";
var CapabilityKeyRegistryErrorCodes = {
  /** Key not found in registry */
  KEY_NOT_FOUND: "KEY_NOT_FOUND",
  /** No key available for the requested capability */
  NO_CAPABLE_KEY: "NO_CAPABLE_KEY",
  /** Delegation has expired */
  DELEGATION_EXPIRED: "DELEGATION_EXPIRED",
  /** Delegation has been revoked */
  DELEGATION_REVOKED: "DELEGATION_REVOKED",
  /** Invalid delegation data */
  INVALID_DELEGATION: "INVALID_DELEGATION",
  /** Key already registered */
  KEY_EXISTS: "KEY_EXISTS"
};
var CapabilityKeyRegistry = class {
  constructor() {
    /**
     * Registry of all keys indexed by ID.
     */
    this.keys = /* @__PURE__ */ new Map();
    /**
     * Delegation storage.
     */
    this.store = {
      byKey: /* @__PURE__ */ new Map(),
      byCid: /* @__PURE__ */ new Map(),
      byCapability: /* @__PURE__ */ new Map()
    };
  }
  // ===========================================================================
  // Key Management
  // ===========================================================================
  /**
   * Register a key with its associated delegations.
   *
   * @param key - Key information
   * @param delegations - Delegations granted to this key
   */
  registerKey(key, delegations) {
    this.keys.set(key.id, key);
    if (!this.store.byKey.has(key.id)) {
      this.store.byKey.set(key.id, []);
    }
    for (const delegation of delegations) {
      this.addDelegation(key, delegation);
    }
  }
  /**
   * Remove a key and all its associated delegations.
   *
   * @param keyId - The key ID to remove
   */
  removeKey(keyId) {
    const delegations = this.store.byKey.get(keyId) || [];
    for (const delegation of delegations) {
      this.store.byCid.delete(delegation.cid);
    }
    for (const [capKey, entries] of this.store.byCapability) {
      const filtered = entries.filter(
        (entry) => !entry.keys.some((k) => k.id === keyId)
      );
      if (filtered.length === 0) {
        this.store.byCapability.delete(capKey);
      } else {
        for (const entry of filtered) {
          entry.keys = entry.keys.filter((k) => k.id !== keyId);
        }
        this.store.byCapability.set(capKey, filtered.filter((e) => e.keys.length > 0));
      }
    }
    this.store.byKey.delete(keyId);
    this.keys.delete(keyId);
  }
  // ===========================================================================
  // Capability Lookup
  // ===========================================================================
  /**
   * Get a key that can exercise the specified capability.
   *
   * Key selection algorithm:
   * 1. Filter keys that have the required capability
   * 2. Check delegation validity (not expired, not revoked)
   * 3. Sort by priority (session=0, main=1, ingested=2)
   * 4. Return highest priority valid key
   *
   * @param resource - Resource URI
   * @param action - Action to perform
   * @returns The best matching key, or null if none available
   */
  getKeyForCapability(resource, action) {
    const matchingEntries = this.findMatchingEntries(resource, action);
    if (matchingEntries.length === 0) {
      return null;
    }
    const validKeys = [];
    for (const entry of matchingEntries) {
      if (!this.isDelegationValid(entry.delegation)) {
        continue;
      }
      for (const key of entry.keys) {
        if (!validKeys.some((k) => k.id === key.id)) {
          validKeys.push(key);
        }
      }
    }
    if (validKeys.length === 0) {
      return null;
    }
    validKeys.sort((a, b) => a.priority - b.priority);
    return validKeys[0];
  }
  /**
   * Get all registered capabilities.
   *
   * @returns All capability entries in the registry
   */
  getAllCapabilities() {
    const all = [];
    for (const entries of this.store.byCapability.values()) {
      all.push(...entries);
    }
    return all;
  }
  // ===========================================================================
  // Delegation Tracking
  // ===========================================================================
  /**
   * Get all delegations for a specific key.
   *
   * @param keyId - The key ID
   * @returns Array of delegations for this key
   */
  getDelegationsForKey(keyId) {
    return this.store.byKey.get(keyId) || [];
  }
  // ===========================================================================
  // Ingestion
  // ===========================================================================
  /**
   * Ingest a key and delegation from an external source.
   *
   * @param key - Key information to ingest
   * @param delegation - Delegation to associate with the key
   * @param options - Ingestion options
   */
  ingestKey(key, delegation, options) {
    const keyToStore = options?.priority !== void 0 ? { ...key, priority: options.priority } : key;
    this.keys.set(keyToStore.id, keyToStore);
    if (!this.store.byKey.has(keyToStore.id)) {
      this.store.byKey.set(keyToStore.id, []);
    }
    this.addDelegation(keyToStore, delegation);
  }
  // ===========================================================================
  // Validation
  // ===========================================================================
  /**
   * Check if a delegation is currently valid.
   *
   * @param delegation - The delegation to check
   * @returns true if valid, false if expired or revoked
   */
  isDelegationValid(delegation) {
    if (delegation.isRevoked) {
      return false;
    }
    const now = /* @__PURE__ */ new Date();
    if (delegation.expiry && delegation.expiry < now) {
      return false;
    }
    return true;
  }
  // ===========================================================================
  // Key Access
  // ===========================================================================
  /**
   * Get a key by its ID.
   *
   * @param keyId - The key ID
   * @returns The key info, or undefined if not found
   */
  getKey(keyId) {
    return this.keys.get(keyId);
  }
  /**
   * Get all registered keys.
   *
   * @returns Array of all registered keys
   */
  getAllKeys() {
    return Array.from(this.keys.values());
  }
  // ===========================================================================
  // Clear
  // ===========================================================================
  /**
   * Clear all registered keys and delegations.
   */
  clear() {
    this.keys.clear();
    this.store.byKey.clear();
    this.store.byCid.clear();
    this.store.byCapability.clear();
  }
  // ===========================================================================
  // Revocation
  // ===========================================================================
  /**
   * Revoke a delegation by CID.
   *
   * @param cid - The delegation CID to revoke
   * @returns Result indicating success or failure
   */
  revokeDelegation(cid) {
    const stored = this.store.byCid.get(cid);
    if (!stored) {
      return (0, import_sdk_services6.err)(
        (0, import_sdk_services6.serviceError)(
          CapabilityKeyRegistryErrorCodes.KEY_NOT_FOUND,
          `Delegation not found: ${cid}`,
          SERVICE_NAME3
        )
      );
    }
    stored.delegation.isRevoked = true;
    const keyDelegations = this.store.byKey.get(stored.keyId);
    if (keyDelegations) {
      const delegation = keyDelegations.find((d) => d.cid === cid);
      if (delegation) {
        delegation.isRevoked = true;
      }
    }
    for (const entries of this.store.byCapability.values()) {
      for (const entry of entries) {
        if (entry.delegation.cid === cid) {
          entry.delegation.isRevoked = true;
        }
      }
    }
    return (0, import_sdk_services6.ok)(void 0);
  }
  // ===========================================================================
  // Search
  // ===========================================================================
  /**
   * Find capabilities that match a resource path pattern.
   *
   * @param resourcePattern - Resource pattern (supports wildcards)
   * @param action - Optional action filter
   * @returns Matching capability entries
   */
  findCapabilities(resourcePattern, action) {
    const results = [];
    for (const entries of this.store.byCapability.values()) {
      for (const entry of entries) {
        if (action && entry.action !== action) {
          continue;
        }
        if (this.matchesResourcePattern(entry.resource, resourcePattern)) {
          results.push(entry);
        }
      }
    }
    return results;
  }
  // ===========================================================================
  // Private Methods
  // ===========================================================================
  /**
   * Add a delegation to the store.
   *
   * @param key - The key associated with this delegation
   * @param delegation - The delegation to add
   */
  addDelegation(key, delegation) {
    const keyDelegations = this.store.byKey.get(key.id) || [];
    if (!keyDelegations.some((d) => d.cid === delegation.cid)) {
      keyDelegations.push(delegation);
      this.store.byKey.set(key.id, keyDelegations);
    }
    if (!this.store.byCid.has(delegation.cid)) {
      this.store.byCid.set(delegation.cid, {
        delegation,
        parentCid: delegation.parentCid,
        keyId: key.id,
        storedAt: /* @__PURE__ */ new Date()
      });
    }
    for (const action of delegation.actions) {
      const capKey = this.makeCapabilityKey(delegation.path, action);
      const entries = this.store.byCapability.get(capKey) || [];
      const existingEntry = entries.find((e) => e.delegation.cid === delegation.cid);
      if (existingEntry) {
        if (!existingEntry.keys.some((k) => k.id === key.id)) {
          existingEntry.keys.push(key);
          existingEntry.keys.sort((a, b) => a.priority - b.priority);
        }
      } else {
        const entry = {
          resource: delegation.path,
          action,
          keys: [key],
          delegation,
          expiresAt: delegation.expiry
        };
        entries.push(entry);
        this.store.byCapability.set(capKey, entries);
      }
    }
  }
  /**
   * Create a capability key for indexing.
   *
   * @param resource - Resource path
   * @param action - Action
   * @returns Combined key string
   */
  makeCapabilityKey(resource, action) {
    return `${resource}|${action}`;
  }
  /**
   * Find capability entries that match a resource and action.
   *
   * @param resource - Resource to match
   * @param action - Action to match
   * @returns Matching entries
   */
  findMatchingEntries(resource, action) {
    const results = [];
    const exactKey = this.makeCapabilityKey(resource, action);
    const exactEntries = this.store.byCapability.get(exactKey);
    if (exactEntries) {
      results.push(...exactEntries);
    }
    for (const [capKey, entries] of this.store.byCapability) {
      if (capKey === exactKey) continue;
      for (const entry of entries) {
        if (!this.actionMatches(entry.action, action)) {
          continue;
        }
        if (this.resourceMatchesPattern(resource, entry.resource)) {
          if (!results.some((r) => r.delegation.cid === entry.delegation.cid)) {
            results.push(entry);
          }
        }
      }
    }
    return results;
  }
  /**
   * Check if an action pattern matches a specific action.
   *
   * @param pattern - Action pattern (may include wildcard like "tinycloud.kv/*")
   * @param action - Specific action to check
   * @returns true if pattern matches action
   */
  actionMatches(pattern, action) {
    if (pattern === action) {
      return true;
    }
    if (pattern.endsWith("/*")) {
      const prefix = pattern.slice(0, -2);
      return action.startsWith(prefix + "/") || action === prefix;
    }
    return false;
  }
  /**
   * Check if a resource matches a pattern.
   *
   * Patterns support:
   * - Exact match: "/kv/data" matches "/kv/data"
   * - Wildcard suffix: "/kv/*" matches "/kv/anything"
   * - Double wildcard: "/kv/**" matches "/kv/any/nested/path"
   *
   * @param resource - The specific resource being accessed
   * @param pattern - The pattern from the delegation
   * @returns true if resource matches pattern
   */
  resourceMatchesPattern(resource, pattern) {
    if (pattern === resource) {
      return true;
    }
    if (pattern.endsWith("/**")) {
      const prefix = pattern.slice(0, -3);
      return resource.startsWith(prefix);
    }
    if (pattern.endsWith("/*")) {
      const prefix = pattern.slice(0, -2);
      if (!resource.startsWith(prefix)) {
        return false;
      }
      const remainder = resource.slice(prefix.length);
      return !remainder.includes("/") || remainder === "/";
    }
    if (pattern.endsWith("/") && resource.startsWith(pattern)) {
      return true;
    }
    return false;
  }
  /**
   * Check if a specific resource matches a resource pattern for searching.
   *
   * @param entryResource - The resource from a capability entry
   * @param searchPattern - The pattern to search for
   * @returns true if entry resource matches search pattern
   */
  matchesResourcePattern(entryResource, searchPattern) {
    return this.resourceMatchesPattern(entryResource, searchPattern) || this.resourceMatchesPattern(searchPattern, entryResource);
  }
};
function createCapabilityKeyRegistry() {
  return new CapabilityKeyRegistry();
}

// src/authorization/strategies.ts
async function resolveOpenKeyToken(token) {
  return typeof token === "function" ? token() : token;
}
async function resolveOpenKeyHeaders(headers) {
  return typeof headers === "function" ? headers() : headers ?? {};
}
function openKeyApprovalReason(body) {
  if (body.reason) return body.reason;
  if (body.error) return body.error;
  if (body.approvalUrl) {
    return `OpenKey explicit approval required: ${body.approvalUrl}`;
  }
  return "OpenKey explicit approval required";
}
function createOpenKeyCallbackSigningStrategy(options) {
  return {
    type: "callback",
    openKeyAutoSign: true,
    handler: async (request) => {
      const fetchImpl = options.fetch ?? globalThis.fetch;
      if (!fetchImpl) {
        throw new Error("OpenKey signing strategy requires a fetch implementation");
      }
      const token = await resolveOpenKeyToken(options.token);
      const extraHeaders = await resolveOpenKeyHeaders(options.headers);
      const body = {
        ...request,
        ...options.keyId ? { keyId: options.keyId } : {}
      };
      const response = await fetchImpl(options.endpoint, {
        method: "POST",
        credentials: options.credentials,
        headers: {
          "content-type": "application/json",
          ...token ? { authorization: `Bearer ${token}` } : {},
          ...extraHeaders
        },
        body: JSON.stringify(body)
      });
      let parsed;
      try {
        parsed = await response.json();
      } catch {
        parsed = void 0;
      }
      if (!response.ok) {
        return {
          approved: false,
          reason: parsed?.reason ?? parsed?.error ?? `OpenKey signing failed with HTTP ${response.status}`
        };
      }
      if (parsed?.needsApproval || parsed?.approved === false) {
        return {
          approved: false,
          reason: openKeyApprovalReason(parsed)
        };
      }
      if (typeof parsed?.signature === "string" && parsed.signature.length > 0) {
        return {
          approved: true,
          signature: parsed.signature
        };
      }
      return {
        approved: false,
        reason: "OpenKey signing response did not include a signature"
      };
    }
  };
}
var defaultSignStrategy = { type: "auto-sign" };

// src/authorization/spaceCreation.ts
var AutoApproveSpaceCreationHandler = class {
  /**
   * Always returns true to auto-approve space creation.
   */
  async confirmSpaceCreation() {
    return true;
  }
};
var defaultSpaceCreationHandler = new AutoApproveSpaceCreationHandler();

// src/version.ts
var ProtocolMismatchError = class extends Error {
  constructor(sdkProtocol, nodeProtocol, nodeVersion, host) {
    super(
      `SDK protocol version ${sdkProtocol} is incompatible with node protocol version ${nodeProtocol} (node v${nodeVersion}) at ${host}. ` + (sdkProtocol < nodeProtocol ? "Please update your SDK." : "Please update the TinyCloud node.")
    );
    this.sdkProtocol = sdkProtocol;
    this.nodeProtocol = nodeProtocol;
    this.nodeVersion = nodeVersion;
    this.host = host;
    this.name = "ProtocolMismatchError";
  }
};
var VersionCheckError = class extends Error {
  constructor(host, cause) {
    super(
      `Failed to fetch node info at ${host}. Ensure the node is running and the /info endpoint is accessible.`
    );
    this.host = host;
    this.cause = cause;
    this.name = "VersionCheckError";
  }
};
var UnsupportedFeatureError = class extends Error {
  constructor(feature, host, availableFeatures) {
    super(
      `Feature "${feature}" is not supported by the node at ${host}. Available features: ${availableFeatures.join(", ") || "none"}.`
    );
    this.feature = feature;
    this.host = host;
    this.availableFeatures = availableFeatures;
    this.name = "UnsupportedFeatureError";
  }
};
async function checkNodeInfo(host, sdkProtocol, fetchFn = globalThis.fetch.bind(globalThis)) {
  let response;
  try {
    response = await fetchFn(`${host}/info`, {
      signal: AbortSignal.timeout(5e3)
    });
  } catch (err6) {
    throw new VersionCheckError(host, err6);
  }
  if (!response.ok) {
    throw new VersionCheckError(host);
  }
  const data = await response.json();
  if (sdkProtocol !== data.protocol) {
    throw new ProtocolMismatchError(
      sdkProtocol,
      data.protocol,
      data.version,
      host
    );
  }
  return {
    features: data.features ?? [],
    nodeId: data.nodeId,
    quotaUrl: data.quota_url
  };
}

// src/index.ts
var import_bootstrap3 = require("@tinycloud/bootstrap");

// src/location.ts
var import_multiaddr = require("@multiformats/multiaddr");
var import_multiaddr_to_uri = require("@multiformats/multiaddr-to-uri");
var import_uri_to_multiaddr = require("@multiformats/uri-to-multiaddr");
var import_ed25519 = require("@noble/curves/ed25519");
var import_basics = require("multiformats/basics");
var import_viem2 = require("viem");
var DEFAULT_TINYCLOUD_LOCATION_REGISTRY_URL = "https://registry.tinycloud.xyz";
var DEFAULT_TINYCLOUD_FALLBACK_HOST = "https://node.tinycloud.xyz";
var LocationRecordValidationError = class extends Error {
  constructor(message) {
    super(`Location record validation failed: ${message}`);
    this.name = "LocationRecordValidationError";
  }
};
var CloudLocationResolutionError = class extends Error {
  constructor(subject, attempts) {
    super(`Unable to resolve TinyCloud location for ${subject}`);
    this.name = "CloudLocationResolutionError";
    this.attempts = attempts;
  }
};
function locationPayloadForRecord(record) {
  return {
    version: record.version,
    subject: record.subject,
    multiaddrs: [...record.multiaddrs],
    updated_at: record.updated_at,
    sequence: record.sequence
  };
}
function canonicalLocationPayload(payload) {
  return JSON.stringify({
    version: payload.version,
    subject: payload.subject,
    multiaddrs: payload.multiaddrs,
    updated_at: payload.updated_at,
    sequence: payload.sequence
  });
}
async function signLocationRecord(payload, signer) {
  validateLocationRecordPayload(payload);
  const message = canonicalLocationPayload(payload);
  const signature = signer.type === "did:pkh" ? await signer.signMessage(message) : base64UrlEncode2(
    await signer.signBytes(new TextEncoder().encode(message))
  );
  return { ...payload, signature };
}
function validateLocationRecordPayload(input) {
  if (input === null || typeof input !== "object") {
    throw new LocationRecordValidationError("payload must be an object");
  }
  const payload = input;
  if (payload.version !== 1) {
    throw new LocationRecordValidationError("version must be 1");
  }
  validateSubject(payload.subject);
  validateMultiaddrs(payload.multiaddrs);
  if (typeof payload.updated_at !== "string" || Number.isNaN(Date.parse(payload.updated_at))) {
    throw new LocationRecordValidationError(
      "updated_at must be an ISO timestamp"
    );
  }
  if (typeof payload.sequence !== "number" || !Number.isSafeInteger(payload.sequence) || payload.sequence < 0) {
    throw new LocationRecordValidationError(
      "sequence must be a non-negative safe integer"
    );
  }
  return {
    version: 1,
    subject: payload.subject,
    multiaddrs: [...payload.multiaddrs],
    updated_at: payload.updated_at,
    sequence: payload.sequence
  };
}
function validateLocationRecord(input) {
  const payload = validateLocationRecordPayload(input);
  const signature = input.signature;
  if (typeof signature !== "string" || signature.length === 0) {
    throw new LocationRecordValidationError(
      "signature must be a non-empty string"
    );
  }
  return { ...payload, signature };
}
async function verifyLocationRecord(input) {
  const record = validateLocationRecord(input);
  const payload = canonicalLocationPayload(locationPayloadForRecord(record));
  if (record.subject.startsWith("did:pkh:")) {
    return verifyPkhSignature(record.subject, payload, record.signature);
  }
  if (record.subject.startsWith("did:key:")) {
    return verifyDidKeySignature(record.subject, payload, record.signature);
  }
  return false;
}
async function fetchLocationRecord(registryUrl, subject, fetchFn = globalThis.fetch) {
  const url = `${registryUrl.replace(/\/$/, "")}/v1/locations/${encodeURIComponent(subject)}`;
  const response = await fetchFn(url);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`location registry returned HTTP ${response.status}`);
  }
  const body = await response.json();
  if (body.record === void 0) {
    throw new LocationRecordValidationError("registry response missing record");
  }
  return validateLocationRecord(body.record);
}
async function resolveCloudLocation(subject, options = {}) {
  validateSubject(subject);
  const verifyRecords = options.verifyRecords ?? true;
  const attempts = await Promise.all([
    resolveExplicit(subject, options.explicitMultiaddrs),
    resolveBlockchain(subject, options.blockchain, verifyRecords),
    resolveCentralized(subject, options, verifyRecords),
    resolveFallback(subject, options.fallbackMultiaddrs)
  ]);
  const winner = attempts.find((attempt) => attempt.candidate)?.candidate;
  if (!winner) {
    throw new CloudLocationResolutionError(subject, attempts);
  }
  return {
    subject,
    source: winner.source,
    multiaddrs: [...winner.multiaddrs],
    ...winner.record ? { record: winner.record } : {},
    attempts,
    resolvedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function resolveTinyCloudHosts(subject, options = {}) {
  const location = await resolveCloudLocation(subject, {
    explicitMultiaddrs: hostsToMultiaddrs(options.explicitHosts),
    blockchain: options.blockchain,
    centralizedRegistryUrl: options.registryUrl === null ? void 0 : options.registryUrl ?? DEFAULT_TINYCLOUD_LOCATION_REGISTRY_URL,
    fallbackMultiaddrs: hostsToMultiaddrs(
      options.fallbackHosts === null ? void 0 : options.fallbackHosts ?? [DEFAULT_TINYCLOUD_FALLBACK_HOST]
    ),
    fetch: options.fetch,
    verifyRecords: options.verifyRecords
  });
  return {
    hosts: location.multiaddrs.map((addr) => multiaddrToHttpUrl(addr)),
    location
  };
}
function multiaddrToHttpUrl(input) {
  const uri = (0, import_multiaddr_to_uri.multiaddrToUri)((0, import_multiaddr.multiaddr)(input));
  if (!uri.startsWith("http://") && !uri.startsWith("https://")) {
    throw new LocationRecordValidationError(
      `multiaddr does not resolve to http/https: ${input}`
    );
  }
  return uri;
}
function httpUrlToMultiaddr(input) {
  const url = new URL(input);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new LocationRecordValidationError("URL must use http or https");
  }
  return (0, import_uri_to_multiaddr.uriToMultiaddr)(url.toString()).toString();
}
function hostsToMultiaddrs(hosts) {
  if (hosts === void 0 || hosts.length === 0) {
    return void 0;
  }
  return hosts.map(
    (host) => host.startsWith("/") ? host : httpUrlToMultiaddr(host)
  );
}
async function resolveExplicit(subject, multiaddrs) {
  return resolveAttempt("explicit", async () => {
    if (multiaddrs === void 0 || multiaddrs.length === 0) {
      return null;
    }
    return toCandidate(subject, "explicit", multiaddrs, false);
  });
}
async function resolveBlockchain(subject, resolver, verifyRecords) {
  return resolveAttempt("blockchain", async () => {
    if (!resolver) {
      return null;
    }
    return toCandidate(
      subject,
      "blockchain",
      await resolver(subject),
      verifyRecords
    );
  });
}
async function resolveCentralized(subject, options, verifyRecords) {
  return resolveAttempt("centralized", async () => {
    if (!options.centralizedRegistryUrl) {
      return null;
    }
    const record = await fetchLocationRecord(
      options.centralizedRegistryUrl,
      subject,
      options.fetch
    );
    return toCandidate(subject, "centralized", record, verifyRecords);
  });
}
async function resolveFallback(subject, multiaddrs) {
  return resolveAttempt("fallback", async () => {
    if (multiaddrs === void 0 || multiaddrs.length === 0) {
      return null;
    }
    return toCandidate(subject, "fallback", multiaddrs, false);
  });
}
async function resolveAttempt(source, resolve) {
  try {
    const candidate = await resolve();
    return candidate ? { source, candidate } : { source };
  } catch (error) {
    return {
      source,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}
async function toCandidate(subject, source, input, verifyRecord) {
  if (input === null || input === void 0) {
    return null;
  }
  if (Array.isArray(input)) {
    validateMultiaddrs(input);
    return { source, multiaddrs: [...input] };
  }
  const maybeRecord = input;
  if (maybeRecord.version === 1 && maybeRecord.signature !== void 0) {
    const record = validateLocationRecord(input);
    if (record.subject !== subject) {
      throw new LocationRecordValidationError(
        "location record subject does not match requested subject"
      );
    }
    if (verifyRecord && !await verifyLocationRecord(record)) {
      throw new LocationRecordValidationError(
        "location record signature is invalid"
      );
    }
    return { source, multiaddrs: [...record.multiaddrs], record };
  }
  const candidateInput = input;
  if (!Array.isArray(candidateInput.multiaddrs)) {
    throw new LocationRecordValidationError(
      "candidate multiaddrs must be an array"
    );
  }
  validateMultiaddrs(candidateInput.multiaddrs);
  if (candidateInput.record !== void 0) {
    const record = validateLocationRecord(candidateInput.record);
    if (record.subject !== subject) {
      throw new LocationRecordValidationError(
        "location record subject does not match requested subject"
      );
    }
    if (verifyRecord && !await verifyLocationRecord(record)) {
      throw new LocationRecordValidationError(
        "location record signature is invalid"
      );
    }
    return { source, multiaddrs: [...candidateInput.multiaddrs], record };
  }
  return { source, multiaddrs: [...candidateInput.multiaddrs] };
}
function validateSubject(subject) {
  if (typeof subject !== "string" || subject.length === 0) {
    throw new LocationRecordValidationError(
      "subject must be a non-empty string"
    );
  }
  if (!subject.startsWith("did:pkh:") && !subject.startsWith("did:key:")) {
    throw new LocationRecordValidationError(
      "subject must be did:pkh or did:key"
    );
  }
}
function validateMultiaddrs(input) {
  if (!Array.isArray(input)) {
    throw new LocationRecordValidationError("multiaddrs must be an array");
  }
  for (const addr of input) {
    if (typeof addr !== "string" || addr.length === 0) {
      throw new LocationRecordValidationError(
        "multiaddr entries must be non-empty strings"
      );
    }
    try {
      (0, import_multiaddr.multiaddr)(addr);
    } catch {
      throw new LocationRecordValidationError(`invalid multiaddr: ${addr}`);
    }
  }
}
async function verifyPkhSignature(did, payload, signature) {
  const address = did.split(":").at(-1);
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new LocationRecordValidationError(
      "did:pkh subject must end with an EVM address"
    );
  }
  if (!/^0x[0-9a-fA-F]+$/.test(signature)) {
    throw new LocationRecordValidationError("did:pkh signature must be hex");
  }
  return (0, import_viem2.verifyMessage)({
    address,
    message: payload,
    signature
  });
}
function verifyDidKeySignature(did, payload, signature) {
  const publicKey = ed25519PublicKeyFromDidKey(did);
  const signatureBytes = decodeBase64Url(signature);
  if (signatureBytes.length !== 64) {
    throw new LocationRecordValidationError(
      "did:key signature must be a base64url Ed25519 signature"
    );
  }
  return import_ed25519.ed25519.verify(
    signatureBytes,
    new TextEncoder().encode(payload),
    publicKey
  );
}
function verifyDidKeyEd25519Signature(did, payload, signature) {
  const publicKey = ed25519PublicKeyFromDidKey(did);
  return import_ed25519.ed25519.verify(signature, payload, publicKey);
}
function ed25519PublicKeyFromDidKey(did) {
  const identifier = did.slice("did:key:".length);
  if (!identifier.startsWith("z")) {
    throw new LocationRecordValidationError(
      "did:key must use base58btc multibase"
    );
  }
  const bytes = import_basics.bases.base58btc.decode(identifier);
  if (bytes.length === 34 && bytes[0] === 237 && bytes[1] === 1) {
    return bytes.slice(2);
  }
  if (bytes.length === 33 && bytes[0] === 237) {
    return bytes.slice(1);
  }
  throw new LocationRecordValidationError(
    "did:key must be an Ed25519 public key"
  );
}
function base64UrlEncode2(bytes) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let output = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    const triplet = a << 16 | (b ?? 0) << 8 | (c ?? 0);
    output += alphabet[triplet >> 18 & 63];
    output += alphabet[triplet >> 12 & 63];
    if (i + 1 < bytes.length) {
      output += alphabet[triplet >> 6 & 63];
    }
    if (i + 2 < bytes.length) {
      output += alphabet[triplet & 63];
    }
  }
  return output;
}
function decodeBase64Url(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const bytes = [];
  let buffer = 0;
  let bits = 0;
  for (const char of value) {
    const index = alphabet.indexOf(char);
    if (index < 0) {
      throw new LocationRecordValidationError(
        "did:key signature must be base64url"
      );
    }
    buffer = buffer << 6 | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push(buffer >> bits & 255);
    }
  }
  return Uint8Array.from(bytes);
}

// src/capabilities.ts
var PermissionNotInManifestError = class extends Error {
  constructor(missing, granted) {
    super(
      `Requested capabilities exceed current session. Missing ${missing.length} entries.`
    );
    this.name = "PermissionNotInManifestError";
    this.missing = missing;
    this.granted = granted;
  }
};
var SessionExpiredError = class extends Error {
  constructor(expiredAt) {
    super(`Session expired at ${expiredAt.toISOString()}`);
    this.name = "SessionExpiredError";
    this.expiredAt = expiredAt;
  }
};
function normalizeSpace(space) {
  if (!space.startsWith("tinycloud:")) {
    return space;
  }
  const lastColon = space.lastIndexOf(":");
  if (lastColon === -1 || lastColon === space.length - 1) {
    return space;
  }
  return space.slice(lastColon + 1);
}
function isCapabilitySubset(requested, granted) {
  const missing = [];
  for (const req of requested) {
    const match = granted.find((g) => canonicalizeEntryMatches(req, g));
    if (match === void 0) {
      missing.push(cloneEntry(req));
      continue;
    }
  }
  return { subset: missing.length === 0, missing };
}
function canonicalizeEntryMatches(requested, granted) {
  if (requested.service !== granted.service) {
    return false;
  }
  if (normalizeSpace(requested.space ?? DEFAULT_MANIFEST_SPACE) !== normalizeSpace(granted.space ?? DEFAULT_MANIFEST_SPACE)) {
    return false;
  }
  if (!pathContains(granted.path, requested.path)) {
    return false;
  }
  const reqActions = new Set(
    expandActionShortNames(requested.service, requested.actions)
  );
  const grantedActions = new Set(
    expandActionShortNames(granted.service, granted.actions)
  );
  for (const a of reqActions) {
    if (!grantedActions.has(a)) {
      return false;
    }
  }
  return true;
}
function pathContains(grantedPath, requestedPath) {
  if (grantedPath === "" || grantedPath === "/") {
    return true;
  }
  if (grantedPath.endsWith("/")) {
    return requestedPath.startsWith(grantedPath);
  }
  return requestedPath === grantedPath;
}
function cloneEntry(entry) {
  return {
    service: entry.service,
    ...entry.space !== void 0 ? { space: entry.space } : {},
    path: entry.path,
    actions: [...entry.actions],
    ...entry.skipPrefix !== void 0 ? { skipPrefix: entry.skipPrefix } : {},
    ...entry.expiry !== void 0 ? { expiry: entry.expiry } : {}
  };
}
function parseRecapCapabilities(parseWasm, siwe) {
  const raw = parseWasm(siwe);
  if (!Array.isArray(raw)) {
    throw new Error(
      "parseRecapFromSiwe returned a non-array value; wasm binding may be out of sync"
    );
  }
  const normalized = raw.map((entry) => {
    const longService = SERVICE_SHORT_TO_LONG[entry.service] ?? // Unknown short names pass through. If the recap already contained a
    // long-form service (e.g. a future tinycloud-node version emits long
    // form directly), don't double-prefix.
    (entry.service.startsWith("tinycloud.") ? entry.service : `tinycloud.${entry.service}`);
    return {
      service: longService,
      // The Rust layer emits the space as a full `tinycloud:pkh:...:name`
      // URI (the recap target URI). Normalize to the short name so the
      // returned entries match the shape manifests use.
      space: normalizeSpace(entry.space),
      path: entry.path,
      actions: [...entry.actions]
    };
  });
  normalized.sort((a, b) => {
    const aSpace = a.space ?? DEFAULT_MANIFEST_SPACE;
    const bSpace = b.space ?? DEFAULT_MANIFEST_SPACE;
    if (aSpace !== bSpace) return aSpace < bSpace ? -1 : 1;
    if (a.service !== b.service) return a.service < b.service ? -1 : 1;
    if (a.path !== b.path) return a.path < b.path ? -1 : 1;
    return 0;
  });
  return normalized;
}

// src/policy/errors.ts
var SignedObjectProfileError = class extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SignedObjectProfileError";
    this.code = code;
  }
};
var SignedObjectSchemaError = class extends SignedObjectProfileError {
  constructor(message) {
    super("schema-invalid", message);
    this.name = "SignedObjectSchemaError";
  }
};
var SignedObjectCanonicalizationError = class extends SignedObjectProfileError {
  constructor(message) {
    super("canonicalization-mismatch", message);
    this.name = "SignedObjectCanonicalizationError";
  }
};
var SignedObjectDigestError = class extends SignedObjectProfileError {
  constructor(message) {
    super("digest-mismatch", message);
    this.name = "SignedObjectDigestError";
  }
};
var SignedObjectIdError = class extends SignedObjectProfileError {
  constructor(message) {
    super("id-mismatch", message);
    this.name = "SignedObjectIdError";
  }
};
var SigningKeyBindingError = class extends SignedObjectProfileError {
  constructor(message) {
    super("signing-key-binding", message);
    this.name = "SigningKeyBindingError";
  }
};
var SignatureMaterialError = class extends SignedObjectProfileError {
  constructor(message) {
    super("signature-material-invalid", message);
    this.name = "SignatureMaterialError";
  }
};
var UnsupportedSignatureSuiteError = class extends SignedObjectProfileError {
  constructor(message) {
    super("signature-suite-unsupported", message);
    this.name = "UnsupportedSignatureSuiteError";
  }
};
var SignatureVerificationError = class extends SignedObjectProfileError {
  constructor(message) {
    super("signature-invalid", message);
    this.name = "SignatureVerificationError";
  }
};
function toSignedObjectError(error) {
  if (error instanceof SignedObjectProfileError) {
    return error;
  }
  return new SignedObjectProfileError(
    "schema-invalid",
    error instanceof Error ? error.message : String(error)
  );
}

// src/policy/jcs.ts
var objectHasOwn = Object.hasOwn ?? Object.prototype.hasOwnProperty.call.bind(
  Object.prototype.hasOwnProperty
);
function jcsCanonicalize(input) {
  return serialize(normalizeJson(input, "$"));
}
function normalizeJson(input, path = "$") {
  if (input === null) {
    return null;
  }
  switch (typeof input) {
    case "boolean":
      return input;
    case "number":
      if (!Number.isFinite(input)) {
        throw new SignedObjectCanonicalizationError(
          `${path} must be a finite JSON number`
        );
      }
      return input;
    case "string":
      assertUnicodeScalarString(input, path);
      return input;
    case "object":
      return normalizeJsonObjectOrArray(input, path);
    case "bigint":
    case "function":
    case "symbol":
    case "undefined":
    default:
      throw new SignedObjectCanonicalizationError(
        `${path} is not a JSON value`
      );
  }
}
function serialize(value) {
  if (value === null) {
    return "null";
  }
  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number": {
      const encoded = JSON.stringify(value);
      if (encoded === void 0) {
        throw new SignedObjectCanonicalizationError(
          "number could not be serialized as JSON"
        );
      }
      return encoded;
    }
    case "string":
      return JSON.stringify(value);
    case "object":
      if (Array.isArray(value)) {
        return `[${value.map((item) => serialize(item)).join(",")}]`;
      }
      return serializeObject(value);
    default:
      throw new SignedObjectCanonicalizationError(
        `unsupported JSON value type ${typeof value}`
      );
  }
}
function normalizeJsonObjectOrArray(input, path) {
  assertNoSymbolKeys(input, path);
  if (Array.isArray(input)) {
    for (const key of Object.getOwnPropertyNames(input)) {
      if (key === "length") {
        continue;
      }
      if (!isArrayIndexKey(key, input.length)) {
        throw new SignedObjectCanonicalizationError(
          `${path}.${key} is not allowed on a JSON array`
        );
      }
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (descriptor?.enumerable !== true) {
        throw new SignedObjectCanonicalizationError(
          `${path}[${key}] must be an enumerable JSON array item`
        );
      }
      if (!("value" in descriptor)) {
        throw new SignedObjectCanonicalizationError(
          `${path}[${key}] must be a JSON data property`
        );
      }
    }
    const output2 = [];
    for (let index = 0; index < input.length; index++) {
      if (!objectHasOwn(input, index)) {
        throw new SignedObjectCanonicalizationError(
          `${path}[${index}] must not be a sparse array hole`
        );
      }
      output2.push(normalizeJson(input[index], `${path}[${index}]`));
    }
    return output2;
  }
  const proto = Object.getPrototypeOf(input);
  if (proto !== Object.prototype && proto !== null) {
    throw new SignedObjectCanonicalizationError(
      `${path} must be a plain JSON object`
    );
  }
  const output = /* @__PURE__ */ Object.create(null);
  for (const key of Object.getOwnPropertyNames(input)) {
    assertUnicodeScalarString(key, `${path} key`);
    if (key === "__proto__" || key === "constructor") {
      throw new SignedObjectCanonicalizationError(
        `${path}.${key} is not allowed`
      );
    }
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (descriptor?.enumerable !== true) {
      throw new SignedObjectCanonicalizationError(
        `${path}.${key} must be an enumerable JSON object property`
      );
    }
    if (!("value" in descriptor)) {
      throw new SignedObjectCanonicalizationError(
        `${path}.${key} must be a JSON data property`
      );
    }
    const value = descriptor.value;
    output[key] = normalizeJson(value, `${path}.${key}`);
  }
  return output;
}
function assertNoSymbolKeys(input, path) {
  if (Object.getOwnPropertySymbols(input).length > 0) {
    throw new SignedObjectCanonicalizationError(
      `${path} must not have symbol properties`
    );
  }
}
function isArrayIndexKey(key, length) {
  if (!/^(0|[1-9]\d*)$/.test(key)) {
    return false;
  }
  const index = Number(key);
  return Number.isSafeInteger(index) && index >= 0 && index < length;
}
function serializeObject(value) {
  const keys = Object.keys(value).sort(compareCodePoints);
  const parts = keys.map((key) => `${JSON.stringify(key)}:${serialize(value[key])}`);
  return `{${parts.join(",")}}`;
}
function compareCodePoints(a, b) {
  const left = Array.from(a);
  const right = Array.from(b);
  const max = Math.min(left.length, right.length);
  for (let index = 0; index < max; index++) {
    const leftPoint = left[index].codePointAt(0) ?? 0;
    const rightPoint = right[index].codePointAt(0) ?? 0;
    if (leftPoint !== rightPoint) {
      return leftPoint - rightPoint;
    }
  }
  return left.length - right.length;
}
function assertUnicodeScalarString(value, path) {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code >= 55296 && code <= 56319) {
      const next = value.charCodeAt(index + 1);
      if (Number.isNaN(next) || next < 56320 || next > 57343) {
        throw new SignedObjectCanonicalizationError(
          `${path} contains a lone high surrogate`
        );
      }
      index++;
      continue;
    }
    if (code >= 56320 && code <= 57343) {
      throw new SignedObjectCanonicalizationError(
        `${path} contains a lone low surrogate`
      );
    }
  }
}

// src/policy/capability.ts
var import_bootstrap2 = require("@tinycloud/bootstrap");
var import_viem3 = require("viem");
var textEncoder = new TextEncoder();
var PolicyCapabilityError = class extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PolicyCapabilityError";
    this.code = code;
  }
};
var objectHasOwn2 = Object.hasOwn ?? Object.prototype.hasOwnProperty.call.bind(
  Object.prototype.hasOwnProperty
);
var CEILING_SERVICES = /* @__PURE__ */ new Set(["tinycloud.kv", "tinycloud.sql", "tinycloud.vfs"]);
var GRANTABLE_ACTIONS = /* @__PURE__ */ new Map();
for (const entry of import_bootstrap2.CAPABILITY_REGISTRY) {
  if (!CEILING_SERVICES.has(entry.service)) {
    continue;
  }
  if (entry.aliasOf !== void 0 || entry.implies !== void 0 || entry.urn.endsWith("/*")) {
    continue;
  }
  const existing = GRANTABLE_ACTIONS.get(entry.service);
  if (existing === void 0) {
    GRANTABLE_ACTIONS.set(entry.service, /* @__PURE__ */ new Set([entry.urn]));
    continue;
  }
  existing.add(entry.urn);
}
function normalizePolicyCapability(input) {
  return normalizePolicyCapabilityWithOptions(input, { requireCanonical: true });
}
function canonicalizePolicyCapability(input) {
  return normalizePolicyCapabilityWithOptions(input, { allowPrefixPaths: true });
}
function normalizePolicyCapabilityWithOptions(input, options) {
  const object = expectObject(input, "$");
  assertExactKeys(object, ["service", "space", "path", "actions", "caveats"], "$");
  const service = requiredString(object, "service", "$", "policy-capability-malformed-service");
  if (!CEILING_SERVICES.has(service)) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-service",
      "$.service is outside the frozen permissionsCeiling vocabulary"
    );
  }
  const space = requiredString(object, "space", "$", "policy-capability-malformed-space");
  validateConcreteSpace(space);
  const canonicalSpace = space.normalize("NFC");
  if (options.requireCanonical && canonicalSpace !== space) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-space",
      "$.space must already be canonical NFC"
    );
  }
  const rawPath = requiredString(object, "path", "$", "policy-capability-malformed-path");
  validateRawPath(rawPath, options);
  const path = normalizePath(rawPath);
  if (options.requireCanonical && path !== rawPath) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-path",
      "$.path must already be canonical"
    );
  }
  validateRawPath(path, options);
  const actions = normalizeActions(
    requiredArray(object, "actions", "$", "policy-capability-malformed-action"),
    service,
    options
  );
  const output = /* @__PURE__ */ Object.create(null);
  output.service = service;
  output.space = canonicalSpace;
  output.path = path;
  output.actions = actions;
  if (hasOwn(object, "caveats")) {
    output.caveats = validateCaveats(
      requiredValue(object, "caveats", "$", "policy-capability-malformed-caveats"),
      output.service
    );
  }
  return output;
}
function expectObject(input, path) {
  try {
    const normalized = normalizeJson(input);
    if (normalized === null || typeof normalized !== "object" || Array.isArray(normalized)) {
      throw new PolicyCapabilityError("policy-capability-malformed", `${path} must be an object`);
    }
    return normalized;
  } catch (error) {
    if (error instanceof PolicyCapabilityError) {
      throw error;
    }
    throw new PolicyCapabilityError(
      "policy-capability-malformed",
      error instanceof Error ? error.message : String(error)
    );
  }
}
function assertExactKeys(object, allowed, path) {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(object)) {
    if (!allowedSet.has(key)) {
      throw new PolicyCapabilityError(
        key === "id" || key === "scope" ? "policy-capability-malformed" : "policy-capability-unknown-key",
        `${path} has unknown field ${key}`
      );
    }
  }
}
function requiredValue(object, key, path, code) {
  if (!hasOwn(object, key)) {
    throw new PolicyCapabilityError(code, `${path}.${key} is required`);
  }
  return object[key];
}
function requiredString(object, key, path, code) {
  const value = requiredValue(object, key, path, code);
  if (typeof value !== "string" || value.length === 0) {
    throw new PolicyCapabilityError(code, `${path}.${key} must be a non-empty string`);
  }
  return value;
}
function requiredArray(object, key, path, code) {
  const value = requiredValue(object, key, path, code);
  if (!Array.isArray(value)) {
    throw new PolicyCapabilityError(code, `${path}.${key} must be an array`);
  }
  return value;
}
function validateConcreteSpace(space) {
  if (space === "*" || space.includes("*") || space.includes("?") || space.includes("/")) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-space",
      "$.space must be concrete"
    );
  }
}
function validateRawPath(path, options) {
  if (path.length === 0) {
    throw new PolicyCapabilityError("policy-capability-malformed-path", "$.path is empty");
  }
  if (!options.allowPrefixPaths && path.endsWith("/")) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-path",
      "$.path must be an exact concrete path, not a prefix"
    );
  }
  if (path.endsWith("/*") || path.includes("**")) {
    throw new PolicyCapabilityError("policy-capability-malformed-path", "$.path is a prefix form");
  }
  const segments = path.split("/");
  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index];
    const isTrailingPrefixSegment = options.allowPrefixPaths && index === segments.length - 1 && segment.length === 0;
    if (segment.length === 0 && !isTrailingPrefixSegment) {
      throw new PolicyCapabilityError("policy-capability-malformed-path", "$.path has an empty segment");
    }
    if (segment === "." || segment === "..") {
      throw new PolicyCapabilityError(
        "policy-capability-malformed-path",
        "$.path has a traversal segment"
      );
    }
    if (segment === "*" || segment === "?" || segment.includes("*") || segment.includes("?")) {
      throw new PolicyCapabilityError(
        "policy-capability-malformed-path",
        "$.path has a wildcard segment"
      );
    }
  }
}
function normalizePath(path) {
  return decodeUnreserved(path).normalize("NFC");
}
function decodeUnreserved(path) {
  return path.replace(/%[0-9A-Fa-f]{2}/g, (encoded) => {
    const char = String.fromCharCode(Number.parseInt(encoded.slice(1), 16));
    return /^[A-Za-z0-9._~-]$/.test(char) ? char : encoded.toUpperCase();
  });
}
function normalizeActions(actions, service, options) {
  const accepted = GRANTABLE_ACTIONS.get(service);
  if (accepted === void 0) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-service",
      "$.service is unsupported"
    );
  }
  const unique = /* @__PURE__ */ new Set();
  const rawActions = [];
  for (let index = 0; index < actions.length; index++) {
    const action = actions[index];
    if (typeof action !== "string" || action.length === 0) {
      throw new PolicyCapabilityError(
        "policy-capability-malformed-action",
        `$.actions[${index}] must be a non-empty action URN`
      );
    }
    if (!action.startsWith(`${service}/`) || action.includes("*") || !accepted.has(action)) {
      throw new PolicyCapabilityError(
        "policy-capability-malformed-action",
        `$.actions[${index}] is not a grantable action URN`
      );
    }
    rawActions.push(action);
    unique.add(action);
  }
  if (unique.size === 0) {
    throw new PolicyCapabilityError(
      "policy-capability-empty-actions",
      "$.actions must not be empty"
    );
  }
  const normalizedActions = [...unique].sort();
  if (options.requireCanonical && (rawActions.length !== normalizedActions.length || rawActions.some((action, index) => action !== normalizedActions[index]))) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-action",
      "$.actions must already be sorted, deduplicated canonical action URNs"
    );
  }
  return normalizedActions;
}
function validateCaveats(input, service) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-caveats",
      "$.caveats must be an object"
    );
  }
  if (service === "tinycloud.sql") {
    return validateSqlCaveats(input);
  }
  throw new PolicyCapabilityError(
    "policy-capability-malformed-caveats",
    "$.caveats are not defined for this service"
  );
}
function validateSqlCaveats(input) {
  assertCaveatKeys(input, ["mode", "readOnly", "statements"], "$.caveats");
  const mode = caveatString(input, "mode", "$.caveats");
  if (mode !== "constrained-statements") {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-caveats",
      "$.caveats.mode is unsupported"
    );
  }
  if (requiredCaveat(input, "readOnly", "$.caveats") !== true) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-caveats",
      "$.caveats.readOnly must be true"
    );
  }
  const statements = requiredCaveat(input, "statements", "$.caveats");
  if (!Array.isArray(statements) || statements.length === 0) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-caveats",
      "$.caveats.statements must be a non-empty array"
    );
  }
  for (let index = 0; index < statements.length; index++) {
    validateSqlStatement(statements[index], `$.caveats.statements[${index}]`);
  }
  return input;
}
function validateSqlStatement(input, path) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new PolicyCapabilityError("policy-capability-malformed-caveats", `${path} must be an object`);
  }
  const object = input;
  assertCaveatKeys(object, ["name", "sql", "fixedParams"], path);
  caveatString(object, "name", path);
  caveatString(object, "sql", path);
  const fixedParams = requiredCaveat(object, "fixedParams", path);
  if (!Array.isArray(fixedParams)) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-caveats",
      `${path}.fixedParams must be an array`
    );
  }
  for (let index = 0; index < fixedParams.length; index++) {
    validateFixedParam(fixedParams[index], `${path}.fixedParams[${index}]`);
  }
}
function validateFixedParam(input, path) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new PolicyCapabilityError("policy-capability-malformed-caveats", `${path} must be an object`);
  }
  const object = input;
  assertCaveatKeys(object, ["index", "value"], path);
  const index = requiredCaveat(object, "index", path);
  if (typeof index !== "number" || !Number.isSafeInteger(index) || index < 0) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-caveats",
      `${path}.index must be a non-negative integer`
    );
  }
  requiredCaveat(object, "value", path);
}
function assertCaveatKeys(object, allowed, path) {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(object)) {
    if (!allowedSet.has(key)) {
      throw new PolicyCapabilityError(
        "policy-capability-malformed-caveats",
        `${path} has unknown field ${key}`
      );
    }
  }
}
function requiredCaveat(object, key, path) {
  if (!hasOwn(object, key)) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-caveats",
      `${path}.${key} is required`
    );
  }
  return object[key];
}
function caveatString(object, key, path) {
  const value = requiredCaveat(object, key, path);
  if (typeof value !== "string" || value.length === 0) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-caveats",
      `${path}.${key} must be a non-empty string`
    );
  }
  return value;
}
function hasOwn(object, key) {
  return objectHasOwn2(object, key);
}

// src/policy/signed-object.ts
var import_ed255192 = require("@noble/curves/ed25519");
var import_basics2 = require("multiformats/basics");
var import_viem4 = require("viem");
var POLICY_SCHEMA = "xyz.tinycloud.policy/policy/v0";
var POLICY_STATUS_SCHEMA = "xyz.tinycloud.policy/status/v0";
var POLICY_ENGINE_RECORD_SCHEMA = "xyz.tinycloud.policy/engine-record/v0";
var ED25519_JCS_SIGNATURE_SUITE = "eddsa-ed25519-sha256-jcs-v1";
var EIP191_JCS_SIGNATURE_SUITE = "eip191-secp256k1-sha256-jcs-v1";
var DESCRIPTORS = {
  Policy: {
    kind: "Policy",
    schema: POLICY_SCHEMA,
    idField: "policyId",
    idPrefix: "pol_",
    domain: POLICY_SCHEMA
  },
  PolicyStatus: {
    kind: "PolicyStatus",
    schema: POLICY_STATUS_SCHEMA,
    idField: "statusId",
    idPrefix: "polst_",
    domain: POLICY_STATUS_SCHEMA
  },
  PolicyEngineRecord: {
    kind: "PolicyEngineRecord",
    schema: POLICY_ENGINE_RECORD_SCHEMA,
    idField: "engineRecordId",
    idPrefix: "peng_",
    domain: POLICY_ENGINE_RECORD_SCHEMA
  }
};
var textEncoder2 = new TextEncoder();
var BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";
var BASE64URL_RE = /^[A-Za-z0-9_-]+$/;
var objectHasOwn3 = Object.hasOwn ?? Object.prototype.hasOwnProperty.call.bind(
  Object.prototype.hasOwnProperty
);
function canonicalizeSignedObjectUnsigned(input) {
  return jcsCanonicalize(input);
}
function deriveSignedObjectMaterial(input) {
  const descriptor = descriptorForUnsigned(input);
  const unsigned = validateUnsignedForDescriptor(input, descriptor);
  return materialForUnsigned(unsigned, descriptor);
}
function signedObjectIdFor(input) {
  return deriveSignedObjectMaterial(input).id;
}
async function createAndSignSignedObject(input, signer) {
  const normalized = expectJsonObject(normalizeJson(input), "$");
  const descriptor = descriptorForUnsigned(normalized);
  const stripped = stripOwnIdAndSignature(normalized, descriptor);
  const unsigned = validateUnsignedForDescriptor(stripped, descriptor);
  if (descriptor.kind === "Policy") {
    validatePolicyPermissionsCeilingForSigning(unsigned);
  }
  assertSupportedSignatureSuite(signer.suite);
  requireStringType(signer.signerDid, "$.signer.signerDid");
  assertSignerDidMatchesSuite(signer.signerDid, signer.suite);
  assertSigningKeyBindingForCreate(unsigned, signer.signerDid);
  const material = materialForUnsigned(unsigned, descriptor);
  const signatureValue = encodeSignatureValue(
    await signer.signDigest(material.digest),
    signer.suite
  );
  const signature = validateSignature({
    suite: signer.suite,
    signerDid: signer.signerDid,
    value: signatureValue
  });
  return {
    ...unsigned,
    [descriptor.idField]: material.id,
    signature
  };
}
function createAndSignPolicy(input, signer) {
  return createAndSignSignedObject(input, signer).then(
    (object) => validatePolicySignedShape(object)
  );
}
function createAndSignPolicyStatus(input, signer) {
  return createAndSignSignedObject(input, signer).then(
    (object) => validatePolicyStatusSignedShape(object)
  );
}
function createAndSignPolicyEngineRecord(input, signer) {
  return createAndSignSignedObject(input, signer).then(
    (object) => validatePolicyEngineRecordSignedShape(object)
  );
}
async function verifySignedObject(input) {
  const signed = validateSignedObjectShape(input);
  const signedJson = signed;
  const descriptor = descriptorForSchema(signed.schema);
  const signature = validateSignature(signed.signature);
  assertSigningKeyBindingForVerify(signedJson, signature);
  const unsigned = stripOwnIdAndSignature(signedJson, descriptor);
  const material = materialForUnsigned(unsigned, descriptor);
  assertIdMatches(signedJson, material, descriptor);
  if (!await verifySignature(signature, material.digest)) {
    throw new SignatureVerificationError("signature verification failed");
  }
  return { object: signed, material };
}
async function verifyPolicy(input) {
  const result = await verifySignedObject(input);
  return {
    object: validatePolicySignedShape(result.object),
    material: result.material
  };
}
async function verifyPolicyStatus(input) {
  const result = await verifySignedObject(input);
  return {
    object: validatePolicyStatusSignedShape(result.object),
    material: result.material
  };
}
async function verifyPolicyEngineRecord(input) {
  const result = await verifySignedObject(input);
  return {
    object: validatePolicyEngineRecordSignedShape(result.object),
    material: result.material
  };
}
async function validatePolicySigned(input) {
  try {
    const result = await verifyPolicy(input);
    return { ok: true, object: result.object, material: result.material };
  } catch (error) {
    return { ok: false, error: toSignedObjectError(error) };
  }
}
async function validatePolicyStatusSigned(input) {
  try {
    const result = await verifyPolicyStatus(input);
    return { ok: true, object: result.object, material: result.material };
  } catch (error) {
    return { ok: false, error: toSignedObjectError(error) };
  }
}
async function validatePolicyEngineRecordSigned(input) {
  try {
    const result = await verifyPolicyEngineRecord(input);
    return { ok: true, object: result.object, material: result.material };
  } catch (error) {
    return { ok: false, error: toSignedObjectError(error) };
  }
}
function validatePolicyUnsigned(input) {
  return validatePolicyShape(input, false);
}
function validatePolicyStatusUnsigned(input) {
  return validatePolicyStatusShape(input, false);
}
function validatePolicyEngineRecordUnsigned(input) {
  return validatePolicyEngineRecordShape(input, false);
}
function validatePolicySignedShape(input) {
  return validatePolicyShape(input, true);
}
function validatePolicyStatusSignedShape(input) {
  return validatePolicyStatusShape(input, true);
}
function validatePolicyEngineRecordSignedShape(input) {
  return validatePolicyEngineRecordShape(input, true);
}
function validateSignedObjectShape(input) {
  const normalized = expectJsonObject(normalizeJson(input), "$");
  const schema = requiredString2(normalized, "schema", "$");
  const descriptor = descriptorForSchema(schema);
  switch (descriptor.kind) {
    case "Policy":
      return validatePolicySignedShape(normalized);
    case "PolicyStatus":
      return validatePolicyStatusSignedShape(normalized);
    case "PolicyEngineRecord":
      return validatePolicyEngineRecordSignedShape(normalized);
  }
}
function validateUnsignedForDescriptor(input, descriptor) {
  switch (descriptor.kind) {
    case "Policy":
      return validatePolicyUnsigned(input);
    case "PolicyStatus":
      return validatePolicyStatusUnsigned(input);
    case "PolicyEngineRecord":
      return validatePolicyEngineRecordUnsigned(input);
  }
}
function validatePolicyShape(input, signed) {
  const object = expectJsonObject(normalizeJson(input), "$");
  assertExactKeys2(
    object,
    signed ? [
      "schema",
      "policyId",
      "ownerDid",
      "signingKeyDid",
      "createdAt",
      "expiresAt",
      "resource",
      "when",
      "grant",
      "disclosure",
      "audit",
      "signature"
    ] : [
      "schema",
      "ownerDid",
      "signingKeyDid",
      "createdAt",
      "expiresAt",
      "resource",
      "when",
      "grant",
      "disclosure",
      "audit"
    ],
    "$"
  );
  expectConst(requiredString2(object, "schema", "$"), POLICY_SCHEMA, "$.schema");
  if (signed) {
    requiredString2(object, "policyId", "$");
    validateSignature(requiredValue2(object, "signature", "$"));
  }
  requiredString2(object, "ownerDid", "$");
  requiredString2(object, "signingKeyDid", "$");
  requiredDateString(object, "createdAt", "$");
  optionalDateString(object, "expiresAt", "$");
  validatePolicyResource(requiredValue2(object, "resource", "$"), "$.resource");
  validateExpression(requiredValue2(object, "when", "$"), "$.when");
  validateGrant(requiredValue2(object, "grant", "$"), "$.grant");
  if (hasOwn2(object, "disclosure")) {
    validateDisclosure(requiredValue2(object, "disclosure", "$"), "$.disclosure");
  }
  if (hasOwn2(object, "audit")) {
    validateAudit(requiredValue2(object, "audit", "$"), "$.audit");
  }
  return object;
}
function validatePolicyStatusShape(input, signed) {
  const object = expectJsonObject(normalizeJson(input), "$");
  assertExactKeys2(
    object,
    signed ? [
      "schema",
      "statusId",
      "policyId",
      "ownerDid",
      "sequence",
      "disposition",
      "effectiveAt",
      "reasonCode",
      "signingKeyDid",
      "signature"
    ] : [
      "schema",
      "policyId",
      "ownerDid",
      "sequence",
      "disposition",
      "effectiveAt",
      "reasonCode",
      "signingKeyDid"
    ],
    "$"
  );
  expectConst(requiredString2(object, "schema", "$"), POLICY_STATUS_SCHEMA, "$.schema");
  if (signed) {
    requiredString2(object, "statusId", "$");
    validateSignature(requiredValue2(object, "signature", "$"));
  }
  requiredString2(object, "policyId", "$");
  requiredString2(object, "ownerDid", "$");
  requiredInteger(object, "sequence", "$", 0);
  expectOneOf(requiredString2(object, "disposition", "$"), [
    "active",
    "suspended",
    "revoked"
  ], "$.disposition");
  requiredDateString(object, "effectiveAt", "$");
  optionalString(object, "reasonCode", "$");
  requiredString2(object, "signingKeyDid", "$");
  return object;
}
function validatePolicyEngineRecordShape(input, signed) {
  const object = expectJsonObject(normalizeJson(input), "$");
  assertExactKeys2(
    object,
    signed ? [
      "schema",
      "engineRecordId",
      "ownerDid",
      "endpoint",
      "audience",
      "supportedPolicyVersions",
      "supportedEvidenceVerifiers",
      "grantIssuerDid",
      "expiresAt",
      "signature"
    ] : [
      "schema",
      "ownerDid",
      "endpoint",
      "audience",
      "supportedPolicyVersions",
      "supportedEvidenceVerifiers",
      "grantIssuerDid",
      "expiresAt"
    ],
    "$"
  );
  expectConst(
    requiredString2(object, "schema", "$"),
    POLICY_ENGINE_RECORD_SCHEMA,
    "$.schema"
  );
  if (signed) {
    requiredString2(object, "engineRecordId", "$");
    validateSignature(requiredValue2(object, "signature", "$"));
  }
  requiredString2(object, "ownerDid", "$");
  requiredString2(object, "endpoint", "$");
  requiredString2(object, "audience", "$");
  requiredStringArray(
    object,
    "supportedPolicyVersions",
    "$",
    (value, path) => expectConst(value, "v0", path)
  );
  requiredStringArray(object, "supportedEvidenceVerifiers", "$");
  requiredString2(object, "grantIssuerDid", "$");
  requiredDateString(object, "expiresAt", "$");
  return object;
}
function validateSignature(input) {
  const object = expectJsonObject(input, "$.signature");
  assertExactKeys2(object, ["suite", "signerDid", "value"], "$.signature");
  const suite = requiredString2(object, "suite", "$.signature");
  assertSupportedSignatureSuite(suite);
  const signerDid = requiredString2(object, "signerDid", "$.signature");
  const value = requiredString2(object, "value", "$.signature");
  decodeSignatureValue(value, suite);
  return { suite, signerDid, value };
}
function validatePolicyResource(input, path) {
  const object = expectJsonObject(input, path);
  assertExactKeys2(object, ["resourceType", "resourceId", "permissionsCeiling"], path);
  requiredString2(object, "resourceType", path);
  requiredString2(object, "resourceId", path);
  const ceiling = requiredArray2(object, "permissionsCeiling", path, 1);
  for (let index = 0; index < ceiling.length; index++) {
    validatePolicyCapability(ceiling[index], `${path}.permissionsCeiling[${index}]`);
  }
}
function validatePolicyPermissionsCeilingForSigning(input) {
  const resource = expectJsonObject(requiredValue2(input, "resource", "$"), "$.resource");
  const ceiling = requiredArray2(resource, "permissionsCeiling", "$.resource", 1);
  for (let index = 0; index < ceiling.length; index++) {
    validatePolicyCapabilityForSigning(
      ceiling[index],
      `$.resource.permissionsCeiling[${index}]`
    );
  }
}
function validatePolicyCapability(input, path) {
  const object = expectJsonObject(input, path);
  try {
    const canonical = canonicalizePolicyCapability(object);
    if (jcsCanonicalize(object) !== jcsCanonicalize(canonical)) {
      throw new SignedObjectSchemaError(`${path} must be canonical PolicyCapability JSON`);
    }
  } catch (error) {
    if (error instanceof SignedObjectSchemaError) {
      throw error;
    }
    throw new SignedObjectSchemaError(
      error instanceof Error ? error.message : String(error)
    );
  }
}
function validatePolicyCapabilityForSigning(input, path) {
  const object = expectJsonObject(input, path);
  try {
    const canonical = normalizePolicyCapability(object);
    if (jcsCanonicalize(object) !== jcsCanonicalize(canonical)) {
      throw new SignedObjectSchemaError(`${path} must be strict canonical PolicyCapability JSON`);
    }
  } catch (error) {
    if (error instanceof SignedObjectSchemaError) {
      throw error;
    }
    throw new SignedObjectSchemaError(
      error instanceof Error ? error.message : String(error)
    );
  }
}
function validateExpression(input, path) {
  const object = expectJsonObject(input, path);
  const keys = Object.keys(object);
  if (keys.length !== 1) {
    throw new SignedObjectSchemaError(`${path} must have exactly one expression key`);
  }
  const key = keys[0];
  if (key === "allOf" || key === "anyOf") {
    const values = requiredArray2(object, key, path, 1);
    for (let index = 0; index < values.length; index++) {
      validateExpression(values[index], `${path}.${key}[${index}]`);
    }
    return;
  }
  if (key === "subject") {
    const subject = expectJsonObject(requiredValue2(object, "subject", path), `${path}.subject`);
    assertExactKeys2(subject, ["did"], `${path}.subject`);
    requiredString2(subject, "did", `${path}.subject`);
    return;
  }
  if (key === "evidence") {
    validateEvidenceRequirement(requiredValue2(object, "evidence", path), `${path}.evidence`);
    return;
  }
  throw new SignedObjectSchemaError(`${path} has unknown expression key ${key}`);
}
function validateEvidenceRequirement(input, path) {
  const object = expectJsonObject(input, path);
  assertExactKeys2(
    object,
    ["requirementId", "verifier", "requirements", "authority", "freshness"],
    path
  );
  requiredString2(object, "requirementId", path);
  requiredString2(object, "verifier", path);
  requiredValue2(object, "requirements", path);
  if (hasOwn2(object, "authority")) {
    const authority = expectJsonObject(requiredValue2(object, "authority", path), `${path}.authority`);
    assertExactKeys2(
      authority,
      ["profile", "acceptedIssuers", "allowOwnerAuthorizedIssuer"],
      `${path}.authority`
    );
    optionalString(authority, "profile", `${path}.authority`);
    if (hasOwn2(authority, "acceptedIssuers")) {
      requiredStringArray(authority, "acceptedIssuers", `${path}.authority`);
    }
    optionalBoolean(authority, "allowOwnerAuthorizedIssuer", `${path}.authority`);
  }
  if (hasOwn2(object, "freshness")) {
    const freshness = expectJsonObject(requiredValue2(object, "freshness", path), `${path}.freshness`);
    assertExactKeys2(freshness, ["maxStatusAgeSeconds"], `${path}.freshness`);
    requiredInteger(freshness, "maxStatusAgeSeconds", `${path}.freshness`, 0);
  }
}
function validateGrant(input, path) {
  const object = expectJsonObject(input, path);
  assertExactKeys2(object, ["output", "maxTtlSeconds", "delegationMode", "revocation"], path);
  expectConst(requiredString2(object, "output", path), "portable-delegation", `${path}.output`);
  requiredInteger(object, "maxTtlSeconds", path, 1);
  expectOneOf(requiredString2(object, "delegationMode", path), [
    "terminal",
    "attenuable"
  ], `${path}.delegationMode`);
  expectOneOf(requiredString2(object, "revocation", path), [
    "refresh_only",
    "active_cutoff"
  ], `${path}.revocation`);
}
function validateDisclosure(input, path) {
  const object = expectJsonObject(input, path);
  assertExactKeys2(object, ["denial"], path);
  expectOneOf(requiredString2(object, "denial", path), ["none", "code", "debug"], `${path}.denial`);
}
function validateAudit(input, path) {
  const object = expectJsonObject(input, path);
  assertExactKeys2(object, ["issuance"], path);
  expectOneOf(requiredString2(object, "issuance", path), ["off", "security", "full"], `${path}.issuance`);
}
function materialForUnsigned(unsigned, descriptor) {
  const jcs = jcsCanonicalize(unsigned);
  const jcsBytes = textEncoder2.encode(jcs);
  const digest = sha256Bytes(concatBytes(textEncoder2.encode(`${descriptor.domain}\0`), jcsBytes));
  const id = `${descriptor.idPrefix}${base32LowerNoPad(digest)}`;
  return {
    kind: descriptor.kind,
    idField: descriptor.idField,
    id,
    domain: descriptor.domain,
    unsigned,
    jcs,
    jcsBytes,
    digest,
    digestHex: (0, import_viem4.bytesToHex)(digest).slice(2)
  };
}
function assertIdMatches(signed, material, descriptor) {
  const actual = requiredString2(signed, descriptor.idField, "$");
  if (actual === material.id) {
    return;
  }
  if (new RegExp(`^${descriptor.idPrefix}[a-z2-7]{52}$`).test(actual)) {
    throw new SignedObjectDigestError(
      `${descriptor.idField} was not derived from the signed object digest`
    );
  }
  throw new SignedObjectIdError(`${descriptor.idField} does not match ${descriptor.idPrefix}`);
}
function assertSigningKeyBindingForCreate(unsigned, signerDid) {
  if (!hasOwn2(unsigned, "signingKeyDid")) {
    return;
  }
  const signingKeyDid = requiredString2(unsigned, "signingKeyDid", "$");
  if (signingKeyDid !== signerDid) {
    throw new SigningKeyBindingError(
      `signer DID ${signerDid} does not match signingKeyDid ${signingKeyDid}`
    );
  }
}
function assertSigningKeyBindingForVerify(signed, signature) {
  if (!hasOwn2(signed, "signingKeyDid")) {
    return;
  }
  const signingKeyDid = requiredString2(signed, "signingKeyDid", "$");
  if (signature.signerDid !== signingKeyDid) {
    throw new SigningKeyBindingError(
      `signature signerDid ${signature.signerDid} does not match signingKeyDid ${signingKeyDid}`
    );
  }
}
function assertSignerDidMatchesSuite(signerDid, suite) {
  if (suite === ED25519_JCS_SIGNATURE_SUITE) {
    ed25519PublicKeyFromDidKey2(signerDid);
    return;
  }
  if (suite === EIP191_JCS_SIGNATURE_SUITE) {
    parseDidPkh(signerDid);
    return;
  }
  throw new UnsupportedSignatureSuiteError(`unsupported signature suite: ${suite}`);
}
async function verifySignature(signature, digest) {
  if (signature.suite === ED25519_JCS_SIGNATURE_SUITE) {
    const publicKey = ed25519PublicKeyFromDidKey2(signature.signerDid);
    const signatureBytes = decodeSignatureValue(signature.value, signature.suite);
    try {
      return import_ed255192.ed25519.verify(signatureBytes, digest, publicKey);
    } catch {
      throw new SignatureVerificationError("Ed25519 signature verification failed");
    }
  }
  if (signature.suite === EIP191_JCS_SIGNATURE_SUITE) {
    const pkh = parseDidPkh(signature.signerDid);
    const signatureBytes = decodeSignatureValue(signature.value, signature.suite);
    try {
      return (0, import_viem4.verifyMessage)({
        address: pkh.address,
        message: { raw: digest },
        signature: (0, import_viem4.bytesToHex)(signatureBytes)
      });
    } catch {
      throw new SignatureVerificationError("EIP-191 signature verification failed");
    }
  }
  throw new UnsupportedSignatureSuiteError(`unsupported signature suite: ${signature.suite}`);
}
function ed25519PublicKeyFromDidKey2(did) {
  if (!did.startsWith("did:key:")) {
    throw new SignatureMaterialError("Ed25519 signerDid must be did:key");
  }
  const identifier = did.slice("did:key:".length);
  if (!identifier.startsWith("z")) {
    throw new SignatureMaterialError("did:key must use base58btc multibase");
  }
  let bytes;
  try {
    bytes = import_basics2.bases.base58btc.decode(identifier);
  } catch {
    throw new SignatureMaterialError("did:key signerDid is undecodable");
  }
  if (bytes.length === 34 && bytes[0] === 237 && bytes[1] === 1) {
    return bytes.slice(2);
  }
  throw new SignatureMaterialError("did:key signerDid is not an Ed25519 key");
}
function parseDidPkh(did) {
  let parsed;
  try {
    parsed = parsePkhDid(did);
  } catch {
    throw new SignatureMaterialError("did:pkh signerDid is undecodable");
  }
  if (!parsed) {
    throw new SignatureMaterialError("EIP-191 signerDid must be did:pkh");
  }
  return { address: parsed.address };
}
function decodeSignatureValue(value, suite) {
  if (value.length === 0 || !BASE64URL_RE.test(value) || value.includes("=")) {
    throw new SignatureMaterialError("signature value must be base64url without padding");
  }
  const bytes = base64UrlDecode2(value);
  if (suite === ED25519_JCS_SIGNATURE_SUITE && bytes.length !== 64) {
    throw new SignatureMaterialError("Ed25519 signature must be 64 bytes");
  }
  if (suite === EIP191_JCS_SIGNATURE_SUITE) {
    if (bytes.length !== 65) {
      throw new SignatureMaterialError("EIP-191 signature must be 65 bytes");
    }
    const v = bytes[64];
    if (v !== 27 && v !== 28) {
      throw new SignatureMaterialError("EIP-191 signature recovery id must be 27 or 28");
    }
  }
  return bytes;
}
function encodeSignatureValue(value, suite) {
  if (typeof value === "string") {
    const encoded2 = value.startsWith("0x") ? base64UrlEncode3(hexToBytes(value)) : value;
    decodeSignatureValue(encoded2, suite);
    return encoded2;
  }
  const encoded = base64UrlEncode3(value);
  decodeSignatureValue(encoded, suite);
  return encoded;
}
function stripOwnIdAndSignature(object, descriptor) {
  const output = /* @__PURE__ */ Object.create(null);
  for (const [key, value] of Object.entries(object)) {
    if (key === descriptor.idField || key === "signature") {
      continue;
    }
    output[key] = value;
  }
  return output;
}
function descriptorForUnsigned(input) {
  const object = expectJsonObject(normalizeJson(input), "$");
  return descriptorForSchema(requiredString2(object, "schema", "$"));
}
function descriptorForSchema(schema) {
  if (schema === POLICY_SCHEMA) return DESCRIPTORS.Policy;
  if (schema === POLICY_STATUS_SCHEMA) return DESCRIPTORS.PolicyStatus;
  if (schema === POLICY_ENGINE_RECORD_SCHEMA) return DESCRIPTORS.PolicyEngineRecord;
  throw new SignedObjectSchemaError(`unsupported signed-object schema: ${schema}`);
}
function expectJsonObject(input, path) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new SignedObjectSchemaError(`${path} must be an object`);
  }
  return input;
}
function assertExactKeys2(object, allowed, path) {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(object)) {
    if (!allowedSet.has(key)) {
      throw new SignedObjectSchemaError(`${path} has unknown field ${key}`);
    }
  }
}
function requiredValue2(object, key, path) {
  if (!hasOwn2(object, key)) {
    throw new SignedObjectSchemaError(`${path}.${key} is required`);
  }
  return object[key];
}
function requiredString2(object, key, path) {
  return requireStringType(requiredValue2(object, key, path), `${path}.${key}`);
}
function optionalString(object, key, path) {
  if (!hasOwn2(object, key)) {
    return;
  }
  requireStringType(requiredValue2(object, key, path), `${path}.${key}`);
}
function requireStringType(value, path) {
  if (typeof value !== "string" || value.length === 0) {
    throw new SignedObjectSchemaError(`${path} must be a non-empty string`);
  }
  return value;
}
function optionalBoolean(object, key, path) {
  if (!hasOwn2(object, key)) {
    return;
  }
  if (typeof requiredValue2(object, key, path) !== "boolean") {
    throw new SignedObjectSchemaError(`${path}.${key} must be a boolean`);
  }
}
function requiredInteger(object, key, path, minimum) {
  const value = requiredValue2(object, key, path);
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) {
    throw new SignedObjectSchemaError(
      `${path}.${key} must be an integer >= ${minimum}`
    );
  }
  return value;
}
function requiredArray2(object, key, path, minimum) {
  const value = requiredValue2(object, key, path);
  if (!Array.isArray(value) || value.length < minimum) {
    throw new SignedObjectSchemaError(
      `${path}.${key} must be an array with at least ${minimum} item(s)`
    );
  }
  return value;
}
function requiredStringArray(object, key, path, check) {
  const values = requiredArray2(object, key, path, 0);
  for (let index = 0; index < values.length; index++) {
    const itemPath = `${path}.${key}[${index}]`;
    const value = requireStringType(values[index], itemPath);
    check?.(value, itemPath);
  }
}
function requiredDateString(object, key, path) {
  assertRfc3339(requiredString2(object, key, path), `${path}.${key}`);
}
function optionalDateString(object, key, path) {
  if (!hasOwn2(object, key)) {
    return;
  }
  assertRfc3339(requiredString2(object, key, path), `${path}.${key}`);
}
function assertRfc3339(value, path) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/
  );
  if (!match) {
    throw new SignedObjectSchemaError(`${path} must be strict RFC 3339`);
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new SignedObjectSchemaError(`${path} must be a parseable RFC 3339 timestamp`);
  }
  const canonical = new Date(parsed).toISOString().replace(".000Z", "Z");
  if (canonical !== value) {
    throw new SignedObjectSchemaError(`${path} must be a normalizable RFC 3339 timestamp`);
  }
}
function expectConst(actual, expected, path) {
  if (actual !== expected) {
    throw new SignedObjectSchemaError(`${path} must be ${expected}`);
  }
  return expected;
}
function expectOneOf(actual, allowed, path) {
  for (const value of allowed) {
    if (actual === value) {
      return value;
    }
  }
  throw new SignedObjectSchemaError(`${path} has unsupported value ${actual}`);
}
function hasOwn2(object, key) {
  return objectHasOwn3(object, key);
}
function assertSupportedSignatureSuite(suite) {
  if (suite !== ED25519_JCS_SIGNATURE_SUITE && suite !== EIP191_JCS_SIGNATURE_SUITE) {
    throw new UnsupportedSignatureSuiteError(`unsupported signature suite: ${suite}`);
  }
}
function sha256Bytes(bytes) {
  return (0, import_viem4.sha256)(bytes, "bytes");
}
function concatBytes(left, right) {
  const output = new Uint8Array(left.length + right.length);
  output.set(left, 0);
  output.set(right, left.length);
  return output;
}
function base32LowerNoPad(bytes) {
  let output = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = buffer << 8 | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += BASE32_ALPHABET[buffer >> bits & 31];
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[buffer << 5 - bits & 31];
  }
  return output;
}
function base64UrlEncode3(bytes) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index];
    const b = bytes[index + 1];
    const c = bytes[index + 2];
    const triplet = a << 16 | (b ?? 0) << 8 | (c ?? 0);
    output += alphabet[triplet >> 18 & 63];
    output += alphabet[triplet >> 12 & 63];
    if (index + 1 < bytes.length) {
      output += alphabet[triplet >> 6 & 63];
    }
    if (index + 2 < bytes.length) {
      output += alphabet[triplet & 63];
    }
  }
  return output;
}
function base64UrlDecode2(value) {
  if (value.length % 4 === 1) {
    throw new SignatureMaterialError("signature value is not canonical base64url");
  }
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const bytes = [];
  let buffer = 0;
  let bits = 0;
  for (const char of value) {
    const index = alphabet.indexOf(char);
    if (index < 0) {
      throw new SignatureMaterialError("signature value is not base64url");
    }
    buffer = buffer << 6 | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push(buffer >> bits & 255);
    }
  }
  const decoded = Uint8Array.from(bytes);
  if (base64UrlEncode3(decoded) !== value) {
    throw new SignatureMaterialError("signature value is not canonical base64url");
  }
  return decoded;
}
function hexToBytes(value) {
  const hex = value.slice(2);
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
    throw new SignatureMaterialError("hex signature must have even length");
  }
  const output = new Uint8Array(hex.length / 2);
  for (let index = 0; index < output.length; index++) {
    output[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return output;
}

// src/policy/authoring.ts
var objectHasOwn4 = Object.hasOwn ?? Object.prototype.hasOwnProperty.call.bind(
  Object.prototype.hasOwnProperty
);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ACCOUNT_INDEX_SCHEMA,
  ACCOUNT_REGISTRY_PATH,
  ACCOUNT_REGISTRY_SPACE,
  AccountService,
  AutoApproveSpaceCreationHandler,
  BOOTSTRAP_ALLOWLIST,
  BOOTSTRAP_DEFAULT_SPACE,
  BOOTSTRAP_ENCRYPTION_NETWORK_NAME,
  BOOTSTRAP_ENCRYPTION_NETWORK_RESOURCE_TEMPLATE,
  BOOTSTRAP_MANIFEST,
  BOOTSTRAP_PERSISTED_APPLICATION_MANIFESTS,
  BOOTSTRAP_PUBLIC_SPACE,
  BOOTSTRAP_SESSION_REQUESTS,
  BOOTSTRAP_SPACE_MANIFESTS,
  BOOTSTRAP_SPACE_NAMES,
  CAPABILITIES,
  CAPABILITY_REGISTRY,
  CapabilityKeyRegistry,
  CapabilityKeyRegistryErrorCodes,
  ClientSessionSchema,
  CloudLocationResolutionError,
  DECRYPT_ACTION,
  DECRYPT_FACT_TYPE,
  DECRYPT_RESULT_TYPE,
  DEFAULT_DEFAULTS,
  DEFAULT_ENCRYPTION_ALG,
  DEFAULT_EXPIRY,
  DEFAULT_KEY_VERSION,
  DEFAULT_KNOWLEDGE_ROOT,
  DEFAULT_MANIFEST_SPACE,
  DEFAULT_MANIFEST_VERSION,
  DEFAULT_SIGNED_READ_URL_EXPIRY_MS,
  DEFAULT_TINYCLOUD_FALLBACK_HOST,
  DEFAULT_TINYCLOUD_LOCATION_REGISTRY_URL,
  DUCKDB,
  DataVaultService,
  DatabaseHandle,
  DelegationErrorCodes,
  DelegationManager,
  DuckDbAction,
  DuckDbDatabaseHandle,
  DuckDbService,
  ED25519_JCS_SIGNATURE_SUITE,
  EIP191_JCS_SIGNATURE_SUITE,
  ENCRYPTION,
  ENCRYPTION_MANIFEST_SPACE,
  ENCRYPTION_NETWORK_URN_PREFIX,
  ENCRYPTION_PERMISSION_SERVICE,
  ENCRYPTION_SERVICE,
  ENCRYPTION_SERVICE_SHORT,
  ENVELOPE_VERSION,
  EXPIRY,
  EncryptionService,
  EnsDataSchema,
  ErrorCodes,
  HOOKS,
  HooksService,
  IdentityParseError,
  KV,
  KVService,
  LocationRecordValidationError,
  ManifestValidationError,
  NETWORK_NAME_PATTERN,
  NetworkIdError,
  POLICY_ENGINE_RECORD_SCHEMA,
  POLICY_SCHEMA,
  POLICY_STATUS_SCHEMA,
  PermissionNotInManifestError,
  PrefixedKVService,
  ProtocolMismatchError,
  SECRETS_SPACE,
  SECRET_NAME_RE,
  SECRET_RECORDS_SCHEMA,
  SERVICE_LONG_TO_SHORT,
  SERVICE_SHORT_TO_LONG,
  SPACE,
  SQL,
  SQLAction,
  SQLService,
  SecretsService,
  ServiceContext,
  SessionExpiredError,
  SharingService,
  SignatureMaterialError,
  SignatureVerificationError,
  SignedObjectCanonicalizationError,
  SignedObjectDigestError,
  SignedObjectIdError,
  SignedObjectProfileError,
  SignedObjectSchemaError,
  SigningKeyBindingError,
  SilentNotificationHandler,
  SiweConfigSchema,
  SiweMessage,
  Space,
  SpaceErrorCodes,
  SpaceService,
  TINYCLOUD_ACCOUNT_SPACE_MANIFEST,
  TINYCLOUD_APPLICATIONS_SPACE_MANIFEST,
  TINYCLOUD_DEFAULT_SPACE_MANIFEST,
  TINYCLOUD_PUBLIC_SPACE_MANIFEST,
  TINYCLOUD_SECRETS_BOOTSTRAP_MANIFEST,
  TinyCloud,
  TinyCloudDebugLogger,
  UnsupportedFeatureError,
  UnsupportedSignatureSuiteError,
  VAULT_PERMISSION_SERVICE,
  VaultHeaders,
  VaultPublicSpaceKVActions,
  VersionCheckError,
  activateSessionWithHost,
  addressStorageKey,
  applyPrefix,
  bootstrapEncryptionNetworkId,
  bootstrapSpaceId,
  bootstrapSteps,
  buildCanonicalDecryptRequest,
  buildDecryptAttenuation,
  buildDecryptFacts,
  buildDecryptInvocation,
  buildNetworkId,
  buildSpaceUri,
  canonicalHashHex,
  canonicalLocationPayload,
  canonicalSignedResponse,
  canonicalizeAddress,
  canonicalizeDid,
  canonicalizeDidUrl,
  canonicalizeEncryptionJson,
  canonicalizeNetworkId,
  canonicalizeSecretScope,
  canonicalizeSignedObjectUnsigned,
  checkDecryptInvocationInput,
  checkNodeInfo,
  clearTinyCloudDebugLogs,
  composeBootstrapSpaceManifest,
  composeManifestRequest,
  createAndSignPolicy,
  createAndSignPolicyEngineRecord,
  createAndSignPolicyStatus,
  createAndSignSignedObject,
  createCapabilityKeyRegistry,
  createOpenKeyCallbackSigningStrategy,
  createSharingService,
  createSpaceService,
  createVaultCrypto,
  decryptEnvelopeWithKey,
  defaultRetryPolicy,
  defaultSignStrategy,
  defaultSpaceCreationHandler,
  deriveSignedObjectMaterial,
  deriveSignedReceiverKey,
  didCacheKey,
  didEquals,
  disableTinyCloudDebug,
  discoverNetwork,
  enableTinyCloudDebug,
  encryptToNetwork,
  encryptionBase64Decode,
  encryptionBase64Encode,
  encryptionError,
  encryptionUtf8Decode,
  encryptionUtf8Encode,
  ensureNetworkUsableForDecrypt,
  err,
  expandActionShortNames,
  expandPermissionEntries,
  expandPermissionEntry,
  fetchLocationRecord,
  fetchPeerId,
  generateRandomReceiverKey,
  getTinyCloudDebugLogs,
  hexDecode,
  hexEncode,
  httpUrlToMultiaddr,
  installTinyCloudDebugGlobals,
  isCapabilitySubset,
  isEvmAddress,
  isNetworkId,
  jcsCanonicalize,
  loadManifest,
  locationPayloadForRecord,
  makePkhSpaceId,
  makePublicSpaceId,
  manifestAbilitiesUnion,
  multiaddrToHttpUrl,
  networkDiscoveryKey,
  normalizeDefaults,
  normalizeJson,
  ok,
  openWrappedKey,
  parseCanonicalNetworkId,
  parseExpiry,
  parseNetworkId,
  parsePkhDid,
  parseRecapCapabilities,
  parseSpaceUri,
  pkhDid,
  principalDid,
  principalDidEquals,
  resolveCloudLocation,
  resolveManifest,
  resolveManifestKnowledgeRoot,
  resolveSecretListPrefix,
  resolveSecretPath,
  resolveTinyCloudHosts,
  resourceCapabilitiesToAbilitiesMap,
  resourceCapabilitiesToSpaceAbilitiesMap,
  serializeJcsJson,
  serviceError,
  signLocationRecord,
  signedObjectIdFor,
  submitHostDelegation,
  tinyCloudDebugLogger,
  toSignedObjectError,
  validateClientSession,
  validateEnvelope,
  validateLocationRecord,
  validateLocationRecordPayload,
  validateManifest,
  validatePersistedSessionData,
  validatePolicyEngineRecordSigned,
  validatePolicyEngineRecordSignedShape,
  validatePolicyEngineRecordUnsigned,
  validatePolicySigned,
  validatePolicySignedShape,
  validatePolicyStatusSigned,
  validatePolicyStatusSignedShape,
  validatePolicyStatusUnsigned,
  validatePolicyUnsigned,
  verifyDecryptResponse,
  verifyDidKeyEd25519Signature,
  verifyLocationRecord,
  verifyPolicy,
  verifyPolicyEngineRecord,
  verifyPolicyStatus,
  verifySignedObject
});
//# sourceMappingURL=index.cjs.map