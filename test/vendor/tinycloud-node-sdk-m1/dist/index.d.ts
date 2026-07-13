import { ISigner, Bytes, IWasmBindings, ISessionManager } from '@tinycloud/sdk-core';
export { ACCOUNT_REGISTRY_PATH, ACCOUNT_REGISTRY_SPACE, AccountApplication, AccountApplicationListOptions, AccountDelegation, AccountDelegationListOptions, AccountDelegationRevokeOptions, AccountIndexEnsureResult, AccountIndexRebuildResult, AccountIndexStatus, AccountIndexedReadOptions, AccountService, AccountServiceConfig, AccountSpace, AccountSpaceListOptions, AccountStatus, AutoApproveSpaceCreationHandler, AutoRejectStrategy, AutoSignStrategy, BatchOptions, BatchResponse, BuildCanonicalDecryptRequestInput, BuildDecryptFactsInput, BuildDecryptInvocationInput, BuiltDecryptInvocation, CallbackStrategy, CanonicalAddress, CanonicalDecryptRequest, CanonicalJson, CanonicalParsedNetworkId, CapabilityEntry, CapabilityKeyRegistry, CapabilityKeyRegistryErrorCode, CapabilityKeyRegistryErrorCodes, ClientSession, ColumnInfo, ComposeManifestOptions, ComposedManifestRequest, CreateDelegationParams, DECRYPT_ACTION, DECRYPT_FACT_TYPE, DECRYPT_RESULT_TYPE, DEFAULT_ENCRYPTION_ALG, DEFAULT_KEY_VERSION, DEFAULT_MANIFEST_SPACE, DEFAULT_MANIFEST_VERSION, DEFAULT_SIGNED_READ_URL_EXPIRY_MS, DataVaultConfig, DataVaultService, DatabaseHandle, DecryptCapabilityProof, DecryptEnvelopeOptions, DecryptInvocationFact, DecryptInvocationSigner, DecryptRequestBody, DecryptResponseBody, DecryptTransport, Delegation, DelegationChain, DelegationChainV2, DelegationDirection, DelegationError, DelegationErrorCode, DelegationErrorCodes, DelegationFilters, DelegationManager, DelegationManagerConfig, DelegationRecord, DelegationResult, DidCacheKeyOptions, DidEqualsOptions, DiscoverNetworkInput, DiscoveredNetwork, DiscoverySource, DuckDbAction, DuckDbActionType, DuckDbBatchOptions, DuckDbBatchResponse, DuckDbDatabaseHandle, DuckDbExecuteOptions, DuckDbExecuteResponse, DuckDbOptions, DuckDbQueryOptions, DuckDbQueryResponse, DuckDbService, DuckDbServiceConfig, DuckDbStatement, DuckDbValue, ENCRYPTION_NETWORK_URN_PREFIX, ENCRYPTION_SERVICE, ENCRYPTION_SERVICE_SHORT, ENVELOPE_VERSION, EncodedShareData, EncryptToNetworkInput, EncryptToNetworkOptions, EncryptToNetworkResult, EncryptionCrypto, EncryptionError, EncryptionErrorInput, EncryptionService, EncryptionServiceConfig, ExecuteOptions, ExecuteResponse, Extension, FetchFunction, GenerateShareParams, HookEvent, HookServiceName, HookStreamEvent, HookSubscription, HookWebhookListOptions, HookWebhookRecord, HookWebhookRegistration, HookWebhookScope, HookWebhookUnregisterOptions, HooksService, HooksServiceConfig, ICapabilityKeyRegistry, IDataVaultService, IDatabaseHandle, IDuckDbDatabaseHandle, IDuckDbService, IENSResolver, IEncryptionService, IHooksService, IKVService, INotificationHandler, IPrefixedKVService, ISQLService, ISecretsService, ISessionManager, ISessionStorage, ISharingService, ISigner, ISpace, ISpaceCreationHandler, ISpaceScopedDelegations, ISpaceScopedSharing, ISpaceService, IUserAuthorization, IWasmBindings, IdentityParseError, IngestOptions, InlineEncryptedEnvelope, InvokeFunction, JWK, KVCreateSignedReadUrlOptions, KVResponse, KVService, KVServiceConfig, KVSignedReadUrlResponse, KeyInfo, KeyProvider, KeyType, Manifest, ManifestDefaults, ManifestRegistryRecord, ManifestSecretActions, ManifestValidationError, NETWORK_NAME_PATTERN, NetworkDescriptor, NetworkIdError, NodeDescriptorFetcher, OpenKeyCallbackStrategy, OpenKeySigningRequestBody, OpenKeySigningResponseBody, OpenKeySigningStrategyOptions, ParsedNetworkId, PermissionEntry, PermissionNotInManifestError, PersistedSessionData, PkhDidParts, PrefixedKVService, ProtocolMismatchError, QueryOptions, QueryResponse, RandomReceiverKeyInput, ReceiveOptions, ReceiverKeyPair, ReceiverKeySigner, ResolvedCapabilities, ResolvedDelegate, ResolvedSecretPath, ResourceCapability, SECRET_NAME_RE, SQLAction, SQLActionType, SQLService, SQLServiceConfig, SchemaInfo, SecretPayload, SecretScopeOptions, SecretsError, SecretsService, ServiceContext, ServiceContextConfig, ServiceSession, SessionExpiredError, ShareAccess, ShareLink, ShareLinkData, ShareSchema, SharingService, SharingServiceConfig, SignCallback, SignInOptions, SignRequest, SignResponse, SignedReceiverKeyInput, SilentNotificationHandler, Space, SpaceAbilitiesMap, SpaceConfig, SpaceCreationContext, SpaceErrorCode, SpaceErrorCodes, SpaceInfo, SpaceOwnership, SpaceService, SpaceServiceConfig, SqlStatement, SqlValue, StoredDelegationChain, SubscribeOptions, TableInfo, TelemetryConfig, TelemetryEventHandler, TinyCloud, TinyCloudConfig, TinyCloudDebugEnableOptions, TinyCloudDebugEvent, TinyCloudDebugLevel, TinyCloudDebugLogger, TinyCloudDebugTimer, TinyCloudSession, UnsupportedFeatureError, VAULT_PERMISSION_SERVICE, VaultCrypto, VaultEntry, VaultError, VaultGetOptions, VaultGrantOptions, VaultHeaders, VaultListOptions, VaultPublicSpaceKVActions, VaultPutOptions, VerifyDecryptResponseInput, VersionCheckError, ViewInfo, WasmVaultFunctions, WellKnownDescriptorFetcher, addressStorageKey, buildCanonicalDecryptRequest, buildDecryptAttenuation, buildDecryptFacts, buildDecryptInvocation, buildNetworkId, buildSpaceUri, canonicalHashHex, canonicalSignedResponse, canonicalizeAddress, canonicalizeDid, canonicalizeDidUrl, canonicalizeEncryptionJson, canonicalizeNetworkId, canonicalizeSecretScope, checkDecryptInvocationInput, checkNodeInfo, clearTinyCloudDebugLogs, composeManifestRequest, createCapabilityKeyRegistry, createOpenKeyCallbackSigningStrategy, createSharingService, createSpaceService, createVaultCrypto, decryptEnvelopeWithKey, defaultSpaceCreationHandler, deriveSignedReceiverKey, didCacheKey, didEquals, disableTinyCloudDebug, discoverNetwork, enableTinyCloudDebug, encryptToNetwork, encryptionBase64Decode, encryptionBase64Encode, encryptionError, encryptionUtf8Decode, encryptionUtf8Encode, ensureNetworkUsableForDecrypt, expandActionShortNames, expandPermissionEntries, expandPermissionEntry, generateRandomReceiverKey, getTinyCloudDebugLogs, hexDecode, hexEncode, installTinyCloudDebugGlobals, isCapabilitySubset, isEvmAddress, isNetworkId, loadManifest, makePkhSpaceId, makePublicSpaceId, networkDiscoveryKey, openWrappedKey, parseCanonicalNetworkId, parseExpiry, parseNetworkId, parsePkhDid, parseSpaceUri, pkhDid, principalDid, principalDidEquals, resolveManifest, resolveSecretListPrefix, resolveSecretPath, resourceCapabilitiesToSpaceAbilitiesMap, tinyCloudDebugLogger, validateEnvelope, validateManifest, verifyDecryptResponse } from '@tinycloud/sdk-core';
export { A as AuthDelegationArtifact, a as AuthRequestArtifact, C as CreateOwnerDelegationParams, D as DelegateToOptions, b as DelegateToResult, c as DelegatedAccess, d as DelegationAuthority, F as FileSessionStorage, M as MemorySessionStorage, N as NodeEventEmitterStrategy, e as NodeUserAuthorization, f as NodeUserAuthorizationConfig, O as OwnerDelegationReceipt, P as PortableDelegation, R as RestorableSession, g as RuntimePermissionGrantOptions, S as SignStrategy, T as TinyCloudNode, h as TinyCloudNodeConfig, W as WasmKeyProvider, i as WasmKeyProviderConfig, j as createWasmKeyProvider, k as defaultSignStrategy, l as deserializeDelegation, m as grantAuthRequest, s as serializeDelegation } from './core-DUOq4mXg.js';
import { invoke, invokeAny, computeCid, prepareSession, completeSessionSetup, ensureEip55, makeSpaceId, createDelegation, parseRecapFromSiwe, generateHostSIWEMessage, siweToDelegationHeaders, protocolVersion, vault_encrypt, vault_decrypt, vault_derive_key, vault_x25519_from_seed, vault_x25519_dh, vault_random_bytes, vault_sha256 } from '@tinycloud/node-sdk-wasm';
import 'events';
import '@tinycloud/sdk-services';

/**
 * Private key signer for Node.js environments.
 *
 * Uses the node-sdk-wasm package for Ethereum signing operations.
 * The private key should be a hex string (with or without 0x prefix).
 *
 * @example
 * ```typescript
 * const signer = new PrivateKeySigner(process.env.PRIVATE_KEY);
 * const address = await signer.getAddress();
 * const signature = await signer.signMessage("Hello, world!");
 * ```
 */
declare class PrivateKeySigner implements ISigner {
    private readonly privateKeyHex;
    private readonly chainId;
    private cachedAddress?;
    /**
     * Create a new PrivateKeySigner.
     *
     * @param privateKey - Hex-encoded private key (with or without 0x prefix)
     * @param chainId - Chain ID for signing (default: 1 for mainnet)
     */
    constructor(privateKey: string, chainId?: number);
    /**
     * Get the Ethereum address for this signer.
     */
    getAddress(): Promise<string>;
    /**
     * Derive Ethereum address from private key.
     * Uses secp256k1 public key derivation via ethers.js.
     */
    private deriveAddress;
    /**
     * Get the chain ID for this signer.
     */
    getChainId(): Promise<number>;
    /**
     * Sign a message.
     *
     * @param message - The message to sign (string or bytes)
     * @returns The signature as a hex string
     */
    signMessage(message: Bytes | string): Promise<string>;
}

/**
 * NodeWasmBindings - Default IWasmBindings implementation for Node.js.
 *
 * Wraps @tinycloud/node-sdk-wasm functions into the IWasmBindings interface.
 * This is used as the default when no custom wasmBindings is provided in config.
 *
 * @packageDocumentation
 */

/**
 * Node.js WASM bindings using @tinycloud/node-sdk-wasm.
 *
 * This is the default IWasmBindings implementation for Node.js environments.
 * Browser environments provide their own BrowserWasmBindings via config.wasmBindings.
 */
declare class NodeWasmBindings implements IWasmBindings {
    private static panicHookInitialized;
    constructor();
    invoke: typeof invoke;
    invokeAny: typeof invokeAny;
    computeCid: typeof computeCid;
    prepareSession: typeof prepareSession;
    completeSessionSetup: typeof completeSessionSetup;
    ensureEip55: typeof ensureEip55;
    makeSpaceId: typeof makeSpaceId;
    createDelegation: typeof createDelegation;
    parseRecapFromSiwe: typeof parseRecapFromSiwe;
    generateHostSIWEMessage: typeof generateHostSIWEMessage;
    siweToDelegationHeaders: typeof siweToDelegationHeaders;
    protocolVersion: typeof protocolVersion;
    vault_encrypt: typeof vault_encrypt;
    vault_decrypt: typeof vault_decrypt;
    vault_derive_key: typeof vault_derive_key;
    vault_x25519_from_seed: typeof vault_x25519_from_seed;
    vault_x25519_dh: typeof vault_x25519_dh;
    vault_random_bytes: typeof vault_random_bytes;
    vault_sha256: typeof vault_sha256;
    createSessionManager(): ISessionManager;
}

export { NodeWasmBindings, PrivateKeySigner };
