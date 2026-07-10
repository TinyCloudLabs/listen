import { z } from 'zod';
import { InvokeFunction, InvokeAnyFunction, ParsedNetworkId, ServiceError, Result as Result$1, ServiceSession, FetchFunction, ServiceConstructor, RetryPolicy, TelemetryConfig, IServiceContext, IService, IKVService, ISQLService, IDuckDbService, IHooksService, IDataVaultService, IEncryptionService, ISecretsService, IDatabaseHandle, SqlValue, QueryResponse } from '@tinycloud/sdk-services';
export { BatchOptions, BatchResponse, BuildCanonicalDecryptRequestInput, BuildDecryptFactsInput, BuildDecryptInvocationInput, BuiltDecryptInvocation, CanonicalDecryptRequest, CanonicalJson, ColumnInfo, DECRYPT_ACTION, DECRYPT_FACT_TYPE, DECRYPT_RESULT_TYPE, DEFAULT_ENCRYPTION_ALG, DEFAULT_KEY_VERSION, DataVaultConfig, DataVaultService, DatabaseHandle, DecryptCapabilityProof, DecryptEnvelopeOptions, DecryptInvocationFact, DecryptInvocationSigner, DecryptRequestBody, DecryptResponseBody, DecryptTransport, DiscoverNetworkInput, DiscoveredNetwork, DiscoverySource, DuckDbAction, DuckDbActionType, DuckDbBatchOptions, DuckDbBatchResponse, DuckDbDatabaseHandle, DuckDbExecuteOptions, DuckDbExecuteResponse, DuckDbOptions, DuckDbQueryOptions, DuckDbQueryResponse, DuckDbService, DuckDbServiceConfig, DuckDbStatement, DuckDbValue, ENCRYPTION_NETWORK_URN_PREFIX, ENCRYPTION_SERVICE, ENCRYPTION_SERVICE_SHORT, ENVELOPE_VERSION, EncryptToNetworkInput, EncryptToNetworkOptions, EncryptToNetworkResult, EncryptionCrypto, EncryptionError, EncryptionErrorInput, EncryptionService, EncryptionServiceConfig, ErrorCode, ErrorCodes, ExecuteOptions, ExecuteResponse, FetchFunction, HookEvent, HookServiceName, HookStreamEvent, HookSubscription, HookWebhookListOptions, HookWebhookRecord, HookWebhookRegistration, HookWebhookScope, HookWebhookUnregisterOptions, HooksService, HooksServiceConfig, IDataVaultService, IDatabaseHandle, IDuckDbDatabaseHandle, IDuckDbService, IEncryptionService, IHooksService, IKVService, IPrefixedKVService, ISQLService, ISecretsService, IService, IServiceContext, InlineEncryptedEnvelope, InvokeAnyEntry, InvokeAnyFunction, InvokeFunction, KVCreateSignedReadUrlOptions, KVDeleteOptions, KVGetOptions, KVHeadOptions, KVListOptions, KVListResponse, KVPutOptions, KVResponse, KVResponseHeaders, KVService, KVServiceConfig, KVSignedReadUrlResponse, NETWORK_NAME_PATTERN, NetworkDescriptor, NetworkIdError, NodeDescriptorFetcher, ParsedNetworkId, PrefixedKVService, QueryOptions, QueryResponse, RandomReceiverKeyInput, ReceiverKeyPair, ReceiverKeySigner, ResolvedSecretPath, Result, RetryPolicy, SECRET_NAME_RE, SQLAction, SQLActionType, SQLService, SQLServiceConfig, SchemaInfo, SecretPayload, SecretScopeOptions, SecretsError, SecretsService, ServiceContext, ServiceContextConfig, ServiceError, ServiceSession, SignedReceiverKeyInput, SqlStatement, SqlValue, SubscribeOptions, TableInfo, TelemetryConfig, TelemetryEventHandler, TinyCloudDebugEnableOptions, TinyCloudDebugEvent, TinyCloudDebugLevel, TinyCloudDebugLogger, TinyCloudDebugTimer, VaultCrypto, VaultEntry, VaultError, VaultGetOptions, VaultGrantOptions, VaultHeaders, VaultListOptions, VaultPublicSpaceKVActions, VaultPutOptions, VerifyDecryptResponseInput, ViewInfo, WasmVaultFunctions, WellKnownDescriptorFetcher, buildCanonicalDecryptRequest, buildDecryptAttenuation, buildDecryptFacts, buildDecryptInvocation, buildNetworkId, canonicalHashHex, canonicalSignedResponse, canonicalizeEncryptionJson, canonicalizeSecretScope, checkDecryptInvocationInput, clearTinyCloudDebugLogs, createVaultCrypto, decryptEnvelopeWithKey, defaultRetryPolicy, deriveSignedReceiverKey, disableTinyCloudDebug, discoverNetwork, enableTinyCloudDebug, encryptToNetwork, base64Decode as encryptionBase64Decode, base64Encode as encryptionBase64Encode, encryptionError, utf8Decode as encryptionUtf8Decode, utf8Encode as encryptionUtf8Encode, ensureNetworkUsableForDecrypt, err, generateRandomReceiverKey, getTinyCloudDebugLogs, hexDecode, hexEncode, installTinyCloudDebugGlobals, isNetworkId, networkDiscoveryKey, ok, openWrappedKey, parseNetworkId, resolveSecretListPrefix, resolveSecretPath, serviceError, tinyCloudDebugLogger, validateEnvelope, verifyDecryptResponse } from '@tinycloud/sdk-services';
export { ACCOUNT_INDEX_SCHEMA, BOOTSTRAP_ALLOWLIST, BOOTSTRAP_DEFAULT_SPACE, BOOTSTRAP_ENCRYPTION_NETWORK_NAME, BOOTSTRAP_ENCRYPTION_NETWORK_RESOURCE_TEMPLATE, BOOTSTRAP_MANIFEST, BOOTSTRAP_PERSISTED_APPLICATION_MANIFESTS, BOOTSTRAP_PUBLIC_SPACE, BOOTSTRAP_SESSION_REQUESTS, BOOTSTRAP_SPACE_MANIFESTS, BOOTSTRAP_SPACE_NAMES, BootstrapAllowlistEntry, BootstrapAllowlistKind, BootstrapEncryptionNetworkStep, BootstrapManifest, BootstrapRawAbilityAllowlistEntry, BootstrapSchemaStep, BootstrapSeedApplicationsStep, BootstrapSeedSpacesStep, BootstrapSpaceDescriptor, BootstrapSpaceName, BootstrapSpaceStep, BootstrapStep, BootstrapStepKind, CAPABILITIES, CAPABILITY_REGISTRY, CapabilityRegistryEntry, CapabilityStatus, DUCKDB, ENCRYPTION, HOOKS, KV, SECRET_RECORDS_SCHEMA, SPACE, SQL, TINYCLOUD_ACCOUNT_SPACE_MANIFEST, TINYCLOUD_APPLICATIONS_SPACE_MANIFEST, TINYCLOUD_DEFAULT_SPACE_MANIFEST, TINYCLOUD_PUBLIC_SPACE_MANIFEST, TINYCLOUD_SECRETS_BOOTSTRAP_MANIFEST, bootstrapEncryptionNetworkId, bootstrapSpaceId, bootstrapSteps, composeBootstrapSpaceManifest } from '@tinycloud/bootstrap';
export { E as ED25519_JCS_SIGNATURE_SUITE, b as EIP191_JCS_SIGNATURE_SUITE, c as JsonObject, J as JsonValue, d as POLICY_ENGINE_RECORD_SCHEMA, e as POLICY_SCHEMA, f as POLICY_STATUS_SCHEMA, a as Policy, P as PolicyEngineRecord, g as PolicyStatus, h as SignatureMaterialError, i as SignatureSuite, j as SignatureVerificationError, k as SignedObjectCanonicalizationError, l as SignedObjectDigestError, m as SignedObjectErrorCode, n as SignedObjectIdError, o as SignedObjectKind, p as SignedObjectMaterial, q as SignedObjectProfileError, r as SignedObjectSchemaError, s as SignedObjectSignature, S as SignedObjectSigner, t as SignedObjectVerificationResult, u as SignedPolicyObject, v as SigningKeyBindingError, w as UnsignedPolicy, U as UnsignedPolicyEngineRecord, x as UnsignedPolicyObject, y as UnsignedPolicyStatus, z as UnsupportedSignatureSuiteError, A as canonicalizeSignedObjectUnsigned, B as createAndSignPolicy, C as createAndSignPolicyEngineRecord, D as createAndSignPolicyStatus, F as createAndSignSignedObject, G as deriveSignedObjectMaterial, H as jcsCanonicalize, I as normalizeJson, K as serializeJcsJson, L as signedObjectIdFor, M as toSignedObjectError, N as validatePolicyEngineRecordSigned, O as validatePolicyEngineRecordSignedShape, Q as validatePolicyEngineRecordUnsigned, R as validatePolicySigned, T as validatePolicySignedShape, V as validatePolicyStatusSigned, W as validatePolicyStatusSignedShape, X as validatePolicyStatusUnsigned, Y as validatePolicyUnsigned, Z as verifyPolicy, _ as verifyPolicyEngineRecord, $ as verifyPolicyStatus, a0 as verifySignedObject } from './signed-object-CPfSG1iS.cjs';
export { SiweMessage } from 'siwe';

/**
 * Platform-agnostic client types for TinyCloud SDK.
 *
 * @packageDocumentation
 */

/** ENS data associated with a user session. */
interface EnsData {
    domain?: string | null;
    avatarUrl?: string | null;
}
declare const EnsDataSchema: z.ZodObject<{
    domain: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    avatarUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    domain?: string | null | undefined;
    avatarUrl?: string | null | undefined;
}, {
    domain?: string | null | undefined;
    avatarUrl?: string | null | undefined;
}>;
/** SIWE configuration. All fields optional — callers provide only what they need to override. */
interface SiweConfig {
    domain?: string;
    uri?: string;
    chainId?: number;
    statement?: string;
    nonce?: string;
    expirationTime?: string;
    notBefore?: string;
    requestId?: string;
    resources?: string[];
}
declare const SiweConfigSchema: z.ZodObject<{
    domain: z.ZodOptional<z.ZodString>;
    uri: z.ZodOptional<z.ZodString>;
    chainId: z.ZodOptional<z.ZodNumber>;
    statement: z.ZodOptional<z.ZodString>;
    nonce: z.ZodOptional<z.ZodString>;
    expirationTime: z.ZodOptional<z.ZodString>;
    notBefore: z.ZodOptional<z.ZodString>;
    requestId: z.ZodOptional<z.ZodString>;
    resources: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    domain: z.ZodOptional<z.ZodString>;
    uri: z.ZodOptional<z.ZodString>;
    chainId: z.ZodOptional<z.ZodNumber>;
    statement: z.ZodOptional<z.ZodString>;
    nonce: z.ZodOptional<z.ZodString>;
    expirationTime: z.ZodOptional<z.ZodString>;
    notBefore: z.ZodOptional<z.ZodString>;
    requestId: z.ZodOptional<z.ZodString>;
    resources: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    domain: z.ZodOptional<z.ZodString>;
    uri: z.ZodOptional<z.ZodString>;
    chainId: z.ZodOptional<z.ZodNumber>;
    statement: z.ZodOptional<z.ZodString>;
    nonce: z.ZodOptional<z.ZodString>;
    expirationTime: z.ZodOptional<z.ZodString>;
    notBefore: z.ZodOptional<z.ZodString>;
    requestId: z.ZodOptional<z.ZodString>;
    resources: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, z.ZodTypeAny, "passthrough">>;
/** Representation of an active client session. */
interface ClientSession {
    /** User address (may be delegated) */
    address: string;
    /** User address without delegation */
    walletAddress: string;
    /** EIP-155 chain ID */
    chainId: number;
    /** Key to identify the session */
    sessionKey: string;
    /** The SIWE message text (from SiweMessage.prepareMessage()) */
    siwe: string;
    /** The signature of the SIWE message */
    signature: string;
    /** ENS data supported by TinyCloud */
    ens?: EnsData;
}
declare const ClientSessionSchema: z.ZodObject<{
    address: z.ZodString;
    walletAddress: z.ZodString;
    chainId: z.ZodNumber;
    sessionKey: z.ZodString;
    siwe: z.ZodString;
    signature: z.ZodString;
    ens: z.ZodOptional<z.ZodObject<{
        domain: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        avatarUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        domain?: string | null | undefined;
        avatarUrl?: string | null | undefined;
    }, {
        domain?: string | null | undefined;
        avatarUrl?: string | null | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    chainId: number;
    address: string;
    walletAddress: string;
    sessionKey: string;
    siwe: string;
    signature: string;
    ens?: {
        domain?: string | null | undefined;
        avatarUrl?: string | null | undefined;
    } | undefined;
}, {
    chainId: number;
    address: string;
    walletAddress: string;
    sessionKey: string;
    siwe: string;
    signature: string;
    ens?: {
        domain?: string | null | undefined;
        avatarUrl?: string | null | undefined;
    } | undefined;
}>;
/** The URL of a server running tinycloud-node. */
type ServerHost = string;
/** Validate unknown data as a ClientSession. Returns the parsed session or null. */
declare function validateClientSession(data: unknown): ClientSession | null;

/**
 * Notification handler interface for TinyCloud SDK.
 *
 * Abstracts UI notifications so that web-sdk can show toasts
 * while node-sdk uses a silent no-op handler.
 *
 * @packageDocumentation
 */
/**
 * Platform-agnostic notification handler.
 *
 * Implementations can provide different UX patterns:
 * - Browser: toast notifications via antd or similar
 * - Node.js: silent (default) or logging
 * - CLI: console output
 */
interface INotificationHandler {
    /** Called on successful operations (e.g., "Successfully signed in") */
    success(message: string, description?: string): void;
    /** Called on warnings */
    warning(message: string, description?: string): void;
    /** Called on errors */
    error(category: string, message: string, description?: string): void;
    /** Optional cleanup (e.g., dismiss all active notifications) */
    cleanup?(): void;
}
/** No-op handler for environments without UI (node-sdk default). */
declare class SilentNotificationHandler implements INotificationHandler {
    success(): void;
    warning(): void;
    error(): void;
}

/**
 * Platform-agnostic ENS resolution interface.
 *
 * Browser implementations use ethers.js provider.
 * Node implementations can use any Ethereum RPC.
 *
 * @packageDocumentation
 */
interface IENSResolver {
    /** Resolve an ENS name to an Ethereum address */
    resolveAddress(ensName: string): Promise<string | null>;
    /** Reverse-resolve an address to an ENS name */
    resolveName(address: string): Promise<string | null>;
    /** Resolve an ENS name to an avatar URL */
    resolveAvatar?(ensName: string): Promise<string | null>;
}

/**
 * TinyCloud App Manifest
 *
 * A declarative description of an app's identity and the capabilities it
 * needs. The manifest drives the SIWE recap at sign-in time, enabling a
 * single wallet prompt that covers the app's own permissions plus any
 * pre-declared delegations.
 *
 * The SDK does NOT fetch external manifests. Apps compose their own manifest
 * (optionally including backend or agent addenda) before handing it to the
 * SDK.
 *
 * Canonical spec: `.claude/specs/manifest.md`.
 *
 * @packageDocumentation
 */
/**
 * A single permission entry inside a manifest. This is the shape apps write
 * in their `manifest.json` and the shape we compare against when performing
 * the capability-subset derivability check in the delegation flow.
 *
 * `service` uses the long form (e.g. `"tinycloud.kv"`, `"tinycloud.sql"`).
 * `"tinycloud.vault"` is an SDK-only shorthand that expands to the KV
 * resources the vault service uses; it is never encoded as a recap service.
 */
interface PermissionEntry {
    /** Service namespace, e.g. "tinycloud.kv", "tinycloud.sql", "tinycloud.duckdb", "tinycloud.capabilities". */
    service: string;
    /** Space name or full space URI. Defaults to "applications" inside manifests. */
    space?: string;
    /**
     * Service-specific path.
     * - tinycloud.kv: hierarchical prefix. "/" = all, "foo/" = prefix match, "foo" = exact key
     * - tinycloud.sql: database name/file (e.g. "data.sqlite") or "/" for all
     * - tinycloud.duckdb: database name/file
     * - tinycloud.capabilities: capability key URI or "/" for all
     */
    path: string;
    /**
     * Short action names (e.g. "get", "put", "read", "schema"). The SDK expands
     * these to full URNs (e.g. `tinycloud.kv/get`) during resolution.
     * Already-expanded URNs are passed through unchanged.
     */
    actions: string[];
    /** When true, the manifest prefix is NOT prepended to `path`. Default false. */
    skipPrefix?: boolean;
    /** Per-entry expiry override, ms-format. */
    expiry?: string;
    /** User/agent-facing context for why this permission is requested. */
    description?: string;
}
type ManifestSecretActions = true | string | string[] | {
    /** Actual vault secret name. Defaults to the manifest object key. */
    name?: string;
    /** Optional scoped secret namespace. Omit for global secrets. */
    scope?: string;
    actions?: string | string[];
    expiry?: string;
    description?: string;
};
/**
 * The valid values for `Manifest.defaults`.
 *
 * - `false` → no auto-included permissions
 * - `true` → standard tier (KV + SQL read/write + capabilities:read)
 * - `"admin"` → standard + SQL schema
 * - `"all"` → everything the SDK supports (including DuckDB)
 *
 * Unknown string values silently fall back to `true`. Values are normalized
 * (lowercase + trim) before matching.
 */
type ManifestDefaults = boolean | "admin" | "all";
/**
 * Agent-readable app knowledge bundle pointer.
 *
 * - `true` means the default root: `knowledge/index.md`
 * - string values must point at a markdown root under `knowledge/`
 */
type ManifestKnowledge = true | string;
/** Default root used when `manifest.knowledge === true`. */
declare const DEFAULT_KNOWLEDGE_ROOT = "knowledge/index.md";
/**
 * The raw manifest shape an app declares. See `.claude/specs/manifest.md`.
 */
interface Manifest {
    /** Schema version. Optional, defaults to 1. */
    manifest_version?: 1;
    /** Application identifier / namespace prefix. Required. */
    app_id: string;
    /** Display name. Required. */
    name: string;
    /** Description of what the app or delegate does. Optional. */
    description?: string;
    /** DID of this manifest's delegate target. Optional. Required only for delegation materialization. */
    did?: string;
    /** URL to app icon. Optional. */
    icon?: string;
    /** App version string. Optional. */
    appVersion?: string;
    /** Default expiry for permissions. ms-format ("30d", "2h", "1y"). Default "30d". */
    expiry?: string;
    /** Space name or full space URI. Optional, defaults to "applications". */
    space?: string;
    /**
     * Path prefix auto-prepended to permission paths. Optional, defaults to
     * `app_id`. Set to `""` to disable entirely. Individual permissions can opt
     * out with `skipPrefix: true`.
     */
    prefix?: string;
    /**
     * Default permission set to auto-include. Optional, defaults to `true`.
     * See {@link ManifestDefaults}.
     */
    defaults?: ManifestDefaults | string;
    /** Whether to include the public-space companion delegation. Default `true`. */
    includePublicSpace?: boolean;
    /** Agent-readable knowledge bundle root. `true` means `knowledge/index.md`. */
    knowledge?: ManifestKnowledge;
    /**
     * Additional permissions beyond the defaults. Use for cross-space access,
     * DuckDB (opt-in), or `skipPrefix: true` entries.
     */
    permissions?: PermissionEntry[];
    /**
     * Secret name shorthand. Entries resolve to encrypted vault KV resources in
     * the `secrets` space.
     */
    secrets?: Record<string, ManifestSecretActions>;
}
/**
 * A resolved permission entry with fully-expanded paths and action URNs.
 * This is the shape the delegation flow compares against parsed recap
 * capabilities, and the shape the session-key delegation path actually uses.
 */
interface ResourceCapability {
    /** Long-form service, e.g. "tinycloud.kv". */
    service: string;
    /** Space name or URI. Short names are resolved to full SpaceIds at sign-in time. */
    space: string;
    /** Path with the manifest prefix applied (or skipped per `skipPrefix`). */
    path: string;
    /** Full-URN actions, e.g. ["tinycloud.kv/get", "tinycloud.kv/put"]. */
    actions: string[];
    /** Per-entry expiry override in milliseconds. */
    expiryMs?: number;
    /** User/agent-facing context copied from the source permission entry. */
    description?: string;
}
/**
 * A resolved delegation entry with fully-expanded permissions.
 */
interface ResolvedDelegate {
    /** DID of the delegate. */
    did: string;
    /** Informational display name. Optional. */
    name?: string;
    /** Expiry in milliseconds (per-delegation > manifest default > 30 days). */
    expiryMs: number;
    /** Fully resolved permissions. */
    permissions: ResourceCapability[];
}
/**
 * The output of {@link resolveManifest}: a fully-expanded capability set
 * ready to drive the SIWE recap.
 */
interface ResolvedCapabilities {
    /** Application identifier copied from manifest.app_id. */
    app_id: string;
    /** Delegate DID copied from manifest.did, when present. */
    did?: string;
    /** Effective default space for this manifest. */
    space: string;
    /** All session-key resources with paths fully resolved (prefix applied). */
    resources: ResourceCapability[];
    /** Default expiry for the session, in milliseconds. */
    expiryMs: number;
    /** Whether to include the public-space companion. */
    includePublicSpace: boolean;
    /** Delegate targets derived from manifests that declare `did`. */
    additionalDelegates: ResolvedDelegate[];
}
interface ManifestRegistryRecord {
    /** KV key inside the account space. */
    key: string;
    /** App id this record describes. */
    app_id: string;
    /** Latest manifest payloads composed for this app id. */
    manifests: Manifest[];
}
interface ComposeManifestOptions {
    /** Include implicit account-space registry permissions. Default true. */
    includeAccountRegistryPermissions?: boolean;
}
interface ComposedManifestRequest {
    /** Validated manifests that were composed. */
    manifests: Manifest[];
    /** Full permission union requested from the user in one SIWE. */
    resources: ResourceCapability[];
    /** Delegations that can be materialized after sign-in. */
    delegationTargets: ResolvedDelegate[];
    /** Account-space registry records to write after successful sign-in. */
    registryRecords: ManifestRegistryRecord[];
    /** Effective session expiry, using the longest composed manifest expiry. */
    expiryMs: number;
    /** Whether to include the public-space companion behavior. */
    includePublicSpace: boolean;
}
/**
 * Thrown when the manifest fails validation (missing id/name, bad expiry,
 * empty actions on a permission, etc).
 */
declare class ManifestValidationError extends Error {
    constructor(message: string);
}
/**
 * Default expiry when neither the manifest, delegation, nor permission
 * specifies one. APP tier — see `expiry.ts`. Spec: 30 days.
 *
 * Kept as an ms-format string because the manifest schema stores expiry
 * as a string and the parser is shared between this default and
 * caller-provided values; converting `EXPIRY.APP_MS` back to a string
 * here would duplicate that same `30d` literal in another form.
 */
declare const DEFAULT_EXPIRY = "30d";
/**
 * Default `defaults` value when the manifest omits it. Spec: standard tier.
 */
declare const DEFAULT_DEFAULTS: ManifestDefaults;
/** Default manifest schema version. */
declare const DEFAULT_MANIFEST_VERSION = 1;
/** Default space for manifest-declared app data. */
declare const DEFAULT_MANIFEST_SPACE = "applications";
/** Account-space name used for installed-application registry records. */
declare const ACCOUNT_REGISTRY_SPACE = "account";
/** Account-space KV prefix used for installed-application registry records. */
declare const ACCOUNT_REGISTRY_PATH = "applications/";
declare const SECRETS_SPACE = "secrets";
/** SDK-only permission service for encrypted vault resources. */
declare const VAULT_PERMISSION_SERVICE = "tinycloud.vault";
/**
 * Known services and their short-form (recap URI) names. The TinyCloud
 * node encodes the recap resource URI with the short service name, while
 * action URNs and manifest entries use the long `tinycloud.<short>` form.
 * This table is the canonical bridge between the two.
 */
declare const SERVICE_SHORT_TO_LONG: Readonly<Record<string, string>>;
/**
 * Manifest service identifier for TinyCloud encryption network grants.
 *
 * Encryption permissions live on a network id URN
 * (`urn:tinycloud:encryption:<ownerDid>:<network>`), not on a space.
 * The `path` field is the literal networkId; `actions` are
 * `["decrypt"]` (expanded to `["tinycloud.encryption/decrypt"]`).
 *
 * Apps should omit `space` for encryption permissions. The SDK may emit
 * an internal `"encryption"` compatibility label after expansion so the
 * older `PermissionEntry`/`ResourceCapability` shape can still carry the
 * raw network URN through subset checks.
 */
declare const ENCRYPTION_PERMISSION_SERVICE = "tinycloud.encryption";
/** Synthetic space label used by encryption manifest entries. */
declare const ENCRYPTION_MANIFEST_SPACE = "encryption";
/**
 * Inverse of {@link SERVICE_SHORT_TO_LONG}.
 */
declare const SERVICE_LONG_TO_SHORT: Readonly<Record<string, string>>;
/**
 * Parse an ms-format duration string (e.g. "30d", "2h", "1y") into
 * milliseconds.
 *
 * @throws {ManifestValidationError} on empty string, non-string input, or
 * any input `ms()` cannot parse.
 */
declare function parseExpiry(duration: string): number;
/**
 * Expand a list of action short names (or already-expanded URNs) into full
 * ability URNs of the form `<service>/<action>`.
 *
 * Examples:
 *   `expandActionShortNames("tinycloud.kv", ["get", "put"])`
 *     → `["tinycloud.kv/get", "tinycloud.kv/put"]`
 *   `expandActionShortNames("tinycloud.kv", ["tinycloud.kv/get"])`
 *     → `["tinycloud.kv/get"]` (passed through unchanged)
 */
declare function expandActionShortNames(service: string, actions: readonly string[]): string[];
/**
 * Expand SDK virtual permission services into concrete recap-capable services.
 *
 * Today this handles `"tinycloud.vault"`, which is backed by inline
 * network-encrypted KV records:
 * - read/get: `vault/<path>` with `tinycloud.kv/get`
 * - write/put: `vault/<path>` with `tinycloud.kv/put`
 * - delete/del: `vault/<path>` with `tinycloud.kv/del`
 * - list: `vault/<path>` with `tinycloud.kv/list`
 * - head: `vault/<path>` with `tinycloud.kv/get`
 * - metadata: `vault/<path>` with `tinycloud.kv/metadata`
 */
declare function expandPermissionEntry(entry: PermissionEntry): PermissionEntry[];
/**
 * Expand a list of permission entries using {@link expandPermissionEntry}.
 */
declare function expandPermissionEntries(entries: readonly PermissionEntry[]): PermissionEntry[];
/**
 * Apply the manifest prefix to a permission path per the spec rules.
 *
 * - `skipPrefix: true` → path is returned as-is
 * - `prefix === ""` → path is returned as-is
 * - path starts with "/" → `prefix + path`  (e.g. "com.listen.app" + "/" → "com.listen.app/")
 * - otherwise → `prefix + "/" + path`  (e.g. "com.listen.app" + "data.sqlite" → "com.listen.app/data.sqlite")
 */
declare function applyPrefix(prefix: string, path: string, skipPrefix: boolean): string;
/**
 * Fetch and parse a manifest from a URL (browser) or file path (node).
 * The runtime decides the fetch strategy via `globalThis.fetch`; this is
 * platform-agnostic. Callers that want custom loading should JSON.parse a
 * Manifest themselves and skip this helper.
 *
 * @throws if the fetch fails, the JSON is invalid, or the manifest fails
 * validation.
 */
declare function loadManifest(url: string): Promise<Manifest>;
/**
 * Validate a manifest-shaped object and return it strongly-typed.
 * Throws {@link ManifestValidationError} on any hard failure.
 */
declare function validateManifest(input: unknown): Manifest;
/**
 * Resolve a manifest knowledge pointer to its root markdown file.
 *
 * This is metadata only; app knowledge does not create capabilities.
 */
declare function resolveManifestKnowledgeRoot(knowledge: Manifest["knowledge"] | undefined): string | undefined;
/**
 * Normalize a `defaults` value: lowercase + trim, then match against known
 * tiers. Unknown string values silently fall back to `true` (standard).
 * Boolean values pass through.
 */
declare function normalizeDefaults(value: Manifest["defaults"] | undefined): ManifestDefaults;
/**
 * Resolve a raw manifest into a {@link ResolvedCapabilities} object: expand
 * shortform actions, apply the prefix, merge defaults, and compute effective
 * expiries. Pure function — does no I/O.
 *
 * Resolution semantics (spec):
 * - `prefix` defaults to `app_id`; set to `""` to disable prefix application entirely.
 * - `space` defaults to `applications`; per-permission `space` overrides it.
 * - `defaults` defaults to `true` (standard tier); unknown string values fall back to `true`.
 * - Per-entry expiry overrides per-delegation overrides manifest > `DEFAULT_EXPIRY`.
 * - Default entries use `skipPrefix: false` so they inherit the manifest prefix.
 */
declare function resolveManifest(input: Manifest): ResolvedCapabilities;
/**
 * Compose one or more manifests into the single capability request that should
 * be signed. Fetching manifests is intentionally out of band; callers pass the
 * already-loaded manifest objects.
 */
declare function composeManifestRequest(inputs: readonly Manifest[], options?: ComposeManifestOptions): ComposedManifestRequest;
/**
 * The shape `prepareSession` and the multi-resource `createDelegation` WASM
 * export both accept:
 *
 * ```
 * { [shortService]: { [path]: [fullUrnAction, ...] } }
 * ```
 *
 * - `shortService` is the recap-level service segment (`"kv"`, `"sql"`,
 *   `"duckdb"`, `"capabilities"`, `"hooks"`) — not the manifest long form.
 * - `path` is the fully-resolved path (prefix already applied). An empty
 *   string means "no path segment" on the resource URI.
 * - Action strings are full URNs like `"tinycloud.kv/get"`.
 *
 * This is a single source of truth for both the session's own recap (at
 * sign-in) and the delegations it can derive (post sign-in). We re-use it
 * for both so one manifest drives both sides.
 */
type AbilitiesMap = Record<string, Record<string, string[]>>;
/**
 * Per-space abilities map accepted by the newer WASM session config:
 *
 * ```
 * { [spaceIdOrName]: { [shortService]: { [path]: [fullUrnAction, ...] } } }
 * ```
 */
type SpaceAbilitiesMap = Record<string, AbilitiesMap>;
/**
 * Convert a list of {@link ResourceCapability} entries (manifest
 * long-form service, full-URN actions) into the {@link AbilitiesMap}
 * shape the WASM layer expects.
 *
 * When multiple entries target the same `(service, path)` pair, their
 * action lists are merged and deduped. Entries whose service has no
 * short-form mapping in {@link SERVICE_LONG_TO_SHORT} are rejected with
 * a {@link ManifestValidationError} — the SDK does not silently drop
 * unknown services because the recap encoding would lose them.
 *
 * Paths are kept verbatim: this function does NOT collapse
 * `"com.listen.app/"` and `"com.listen.app"` or reinterpret empty /
 * slash strings. Callers that care about path canonicalization should
 * normalize before calling.
 */
declare function resourceCapabilitiesToAbilitiesMap(resources: readonly ResourceCapability[]): AbilitiesMap;
/**
 * Group resolved capabilities by `space`, then convert each group into a WASM
 * abilities map. Short space names are left as-is here; platform layers that
 * know the wallet address and chain id turn them into full SpaceIds.
 */
declare function resourceCapabilitiesToSpaceAbilitiesMap(resources: readonly ResourceCapability[]): SpaceAbilitiesMap;
/**
 * Build the {@link AbilitiesMap} that a session should be signed with,
 * given a {@link ResolvedCapabilities} (i.e. the output of
 * {@link resolveManifest}).
 *
 * The resulting map is the **union** of:
 * 1. the app's own resources (`resolved.resources`), and
 * 2. every permission declared in every `additionalDelegates[*]` entry.
 *
 * The union is what makes the manifest's delegations ergonomic: at
 * sign-in, the session key acquires recap coverage for both the app's
 * runtime needs and every downstream delegation target. Post sign-in,
 * `delegateTo(backendDID, backendPermissions)` can then issue the
 * sub-delegation via the session key (no wallet prompt) because the
 * caps are already part of the granted set.
 *
 * Duplicate `(service, path, action)` triples across resources and
 * delegations are merged and deduped — the session SIWE doesn't need
 * them repeated.
 */
declare function manifestAbilitiesUnion(resolved: ResolvedCapabilities): AbilitiesMap;

/**
 * Capability subset checking and recap parsing.
 *
 * This module powers the capability-chain delegation flow. The key decision
 * a `delegateTo` call has to make is: "are the requested capabilities a
 * subset of what the current session already grants?"
 *
 * - If yes → issue the delegation via the session-key UCAN path (no wallet prompt).
 * - If no → raise {@link PermissionNotInManifestError} so the caller can
 *   trigger an escalation flow via `requestPermissions`.
 *
 * Canonical spec: `.claude/specs/capability-chain.md`.
 *
 * @packageDocumentation
 */

/**
 * Thrown when a `delegateTo` call requests capabilities that the current
 * session does not already grant. The caller can catch this and trigger
 * `requestPermissions(missing)` to show an escalation modal.
 */
declare class PermissionNotInManifestError extends Error {
    readonly missing: PermissionEntry[];
    readonly granted: PermissionEntry[];
    constructor(missing: PermissionEntry[], granted: PermissionEntry[]);
}
/**
 * Thrown when the current session has expired (or will expire within the
 * safety margin). The caller should trigger a fresh sign-in.
 */
declare class SessionExpiredError extends Error {
    readonly expiredAt: Date;
    constructor(expiredAt: Date);
}
interface SubsetCheckResult {
    /** True when every requested entry is covered by a granted entry. */
    subset: boolean;
    /** Entries the granted set does not cover (empty when `subset` is true). */
    missing: PermissionEntry[];
}
/**
 * Check whether `requested` is a strict subset of `granted`.
 *
 * Matching rules for each `requested[i]`:
 * - `service` matches exactly.
 * - `space` matches exactly.
 * - Path containment:
 *     - If `granted.path` ends with `/`, it covers any `requested.path` that
 *       starts with `granted.path`.
 *     - Otherwise, the paths must match exactly.
 * - Action containment: every URN in `requested.actions` must appear in
 *   `granted.actions` (set subset).
 *
 * Any `requested` entry that does not find a matching `granted` entry is
 * added to `missing` and the overall result is non-subset.
 *
 * Both sides are expected to be in the canonical long-form shape (service
 * starts with `tinycloud.`, actions are full URNs). Use {@link parseRecapCapabilities}
 * or `expandActionShortNames` to normalize inputs first.
 */
declare function isCapabilitySubset(requested: readonly PermissionEntry[], granted: readonly PermissionEntry[]): SubsetCheckResult;
/**
 * The raw shape returned from the WASM `parseRecapFromSiwe` export. The
 * Rust layer encodes the service in the short form (e.g. `"kv"`) because
 * that is what the SIWE recap resource URI actually contains. We normalize
 * to the manifest long form (`"tinycloud.kv"`) in {@link parseRecapCapabilities}.
 *
 * @internal
 */
interface WasmRecapEntry {
    service: string;
    space: string;
    path: string;
    actions: string[];
}
/**
 * Signature of the WASM `parseRecapFromSiwe` export. Accepts the signed
 * SIWE message string and returns an array of raw recap entries. Throws if
 * the SIWE is malformed or the recap statement has been tampered.
 *
 * Exposed as an interface so the SDK can inject the web or node binding
 * without `capabilities.ts` needing to know which.
 */
type ParseRecapFromSiwe = (siweString: string) => WasmRecapEntry[];
/**
 * Parse a signed SIWE message into an array of {@link PermissionEntry}
 * objects in the canonical long-form manifest shape.
 *
 * This is a thin wrapper around the WASM `parseRecapFromSiwe` export that:
 * 1. Normalizes short-form services (`"kv"`) to long-form (`"tinycloud.kv"`).
 * 2. Returns entries in a deterministic order (sorted by space, then service,
 *    then path) so downstream equality checks are stable.
 *
 * Returns an empty array when the SIWE has no recap resource (plain auth
 * SIWE); this matches the WASM function's behavior and the spec.
 *
 * @param parseWasm The WASM `parseRecapFromSiwe` binding.
 * @param siwe The signed SIWE message string (exactly what `session.siwe` stores).
 */
declare function parseRecapCapabilities(parseWasm: ParseRecapFromSiwe, siwe: string): PermissionEntry[];

/**
 * WASM binding abstraction for TinyCloud SDK.
 *
 * Allows TinyCloudNode to accept either @tinycloud/node-sdk-wasm (Node.js)
 * or @tinycloud/web-sdk-wasm (browser) without direct dependency on either.
 *
 * @packageDocumentation
 */

/**
 * Platform-agnostic WASM bindings interface.
 *
 * Each platform provides its own implementation:
 * - node-sdk-wasm: Node.js WASM bindings
 * - web-sdk-wasm: Browser WASM bindings
 */
interface IWasmBindings {
    /** Invoke a TinyCloud action */
    invoke: InvokeFunction;
    /** Invoke multiple TinyCloud capabilities in one authorization header */
    invokeAny?: InvokeAnyFunction;
    /** Compute a CID for signed invocation bytes. */
    computeCid?: (data: Uint8Array, codec: bigint) => string;
    /** Prepare a session (generate session key, build SIWE message) */
    prepareSession: (params: any) => any;
    /** Complete session setup (create delegation) */
    completeSessionSetup: (params: any) => any;
    /** Ensure an address is in EIP-55 checksummed format */
    ensureEip55: (address: string) => string;
    /** Generate a space ID from address, chain ID, and prefix */
    makeSpaceId: (address: string, chainId: number, prefix: string) => string;
    /** Create a delegation */
    createDelegation: (...args: any[]) => any;
    /**
     * Parse the recap resource of a signed SIWE message into structured
     * permission entries. Used by the capability-chain delegation flow to
     * decide whether a requested delegation is derivable from the current
     * session without a fresh wallet prompt.
     *
     * Returns an empty array when the SIWE has no recap resource.
     */
    parseRecapFromSiwe: (siweString: string) => WasmRecapEntry[];
    /** Generate a host SIWE message for space activation */
    generateHostSIWEMessage: (params: any) => string;
    /** Convert a signed SIWE message to delegation headers */
    siweToDelegationHeaders: (params: any) => any;
    /** Get the protocol version */
    protocolVersion: () => number;
    vault_encrypt: (key: Uint8Array, plaintext: Uint8Array) => Uint8Array;
    vault_decrypt: (key: Uint8Array, blob: Uint8Array) => Uint8Array;
    vault_derive_key: (salt: Uint8Array, signature: Uint8Array, info: Uint8Array) => Uint8Array;
    vault_x25519_from_seed: (seed: Uint8Array) => {
        publicKey: Uint8Array;
        privateKey: Uint8Array;
    };
    vault_x25519_dh: (privateKey: Uint8Array, publicKey: Uint8Array) => Uint8Array;
    vault_random_bytes: (length: number) => Uint8Array;
    vault_sha256: (data: Uint8Array) => Uint8Array;
    /** Factory for session managers */
    createSessionManager: () => ISessionManager;
    /** Ensure WASM module is initialized (optional — some bindings auto-init) */
    ensureInitialized?: () => Promise<void>;
}
/**
 * Session key manager backed by WASM.
 *
 * Manages Ed25519 session keys used for delegated authentication.
 */
interface ISessionManager {
    /** Create a new session key with the given ID, returns the DID */
    createSessionKey(id: string): string;
    /** Rename a session key ID */
    renameSessionKeyId(oldId: string, newId: string): void;
    /** Get the DID for a session key */
    getDID(keyId: string): string;
    /** Get the JWK representation of a session key */
    jwk(keyId: string): string | undefined;
}

/**
 * Bytes representation as an array of integers.
 */
type Bytes = ArrayLike<number>;
/**
 * Platform-agnostic signer interface.
 *
 * This interface defines the minimal signing capabilities required by TinyCloud.
 * It can be implemented by browser wallets (via ethers.js Signer), private key
 * signers in Node.js, or hardware wallets.
 */
interface ISigner {
    /**
     * Returns the account address.
     */
    getAddress(): Promise<string>;
    /**
     * Returns the chain ID that this signer is connected to.
     */
    getChainId(): Promise<number>;
    /**
     * Signs a message and returns the signature.
     * @param message - The message to sign (string or bytes)
     * @returns The signature as a hex string (format: "0x<65 bytes>")
     */
    signMessage(message: Bytes | string): Promise<string>;
}

type CanonicalAddress = `0x${string}`;
interface PkhDidParts {
    method: "pkh";
    namespace: "eip155";
    chainId: number;
    address: CanonicalAddress;
}
interface DidEqualsOptions {
    ignoreFragment?: boolean;
}
interface DidCacheKeyOptions {
    preserveFragment?: boolean;
}
declare class IdentityParseError extends Error {
    constructor(message: string);
}
declare function isEvmAddress(input: string): boolean;
declare function canonicalizeAddress(address: string): CanonicalAddress;
declare function addressStorageKey(address: string): CanonicalAddress;
declare function pkhDid(address: string, chainId?: number): string;
declare function parsePkhDid(did: string): PkhDidParts | null;
declare function canonicalizeDid(did: string): string;
declare function canonicalizeDidUrl(didUrl: string): string;
declare function principalDid(didUrl: string): string;
declare function didEquals(a: string, b: string, options?: DidEqualsOptions): boolean;
declare function principalDidEquals(a: string, b: string): boolean;
declare function didCacheKey(input: string, options?: DidCacheKeyOptions): string;
declare function makePkhSpaceId(address: string, chainId: number, name: string): string;

interface CanonicalParsedNetworkId extends ParsedNetworkId {
    /** Owner DID canonicalized with TinyCloud identity rules. */
    ownerDid: string;
}
/**
 * Canonicalize a TinyCloud encryption network id.
 *
 * Network ids embed an owner DID. For `did:pkh:eip155` owners, address casing
 * can vary between SIWE/session tokens and delegated network resources. This
 * helper parses the network id, canonicalizes the owner DID, and rebuilds the
 * URN so comparisons can use one stable representation.
 */
declare function canonicalizeNetworkId(networkId: string): string;
declare function parseCanonicalNetworkId(networkId: string): CanonicalParsedNetworkId;

/**
 * Zod schemas for session persistence types.
 *
 * This is the source of truth for session-related types. TypeScript types
 * are derived from these schemas using z.infer<>.
 *
 * @packageDocumentation
 */

/**
 * Schema for TinyCloud-specific session data that's persisted.
 */
declare const PersistedTinyCloudSessionSchema: z.ZodObject<{
    /** The delegation header containing the UCAN */
    delegationHeader: z.ZodObject<{
        Authorization: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        Authorization: string;
    }, {
        Authorization: string;
    }>;
    /** The delegation CID */
    delegationCid: z.ZodString;
    /** The space ID for this session */
    spaceId: z.ZodString;
    /** Additional spaces included in this session's capabilities. Key is logical name, value is full spaceId URI */
    spaces: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    /** The verification method DID */
    verificationMethod: z.ZodString;
}, "strip", z.ZodTypeAny, {
    delegationHeader: {
        Authorization: string;
    };
    delegationCid: string;
    spaceId: string;
    verificationMethod: string;
    spaces?: Record<string, string> | undefined;
}, {
    delegationHeader: {
        Authorization: string;
    };
    delegationCid: string;
    spaceId: string;
    verificationMethod: string;
    spaces?: Record<string, string> | undefined;
}>;
type PersistedTinyCloudSession = z.infer<typeof PersistedTinyCloudSessionSchema>;
/**
 * Schema for full persisted session data.
 *
 * Contains all data needed to restore a session without re-authentication.
 */
declare const PersistedSessionDataSchema: z.ZodObject<{
    /** User's Ethereum address */
    address: z.ZodString;
    /** EIP-155 Chain ID */
    chainId: z.ZodNumber;
    /** Session key in JWK format (stringified) */
    sessionKey: z.ZodString;
    /** The signed SIWE message */
    siwe: z.ZodString;
    /** User's signature of the SIWE message */
    signature: z.ZodString;
    /** TinyCloud delegation data if available */
    tinycloudSession: z.ZodOptional<z.ZodObject<{
        /** The delegation header containing the UCAN */
        delegationHeader: z.ZodObject<{
            Authorization: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            Authorization: string;
        }, {
            Authorization: string;
        }>;
        /** The delegation CID */
        delegationCid: z.ZodString;
        /** The space ID for this session */
        spaceId: z.ZodString;
        /** Additional spaces included in this session's capabilities. Key is logical name, value is full spaceId URI */
        spaces: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        /** The verification method DID */
        verificationMethod: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        delegationHeader: {
            Authorization: string;
        };
        delegationCid: string;
        spaceId: string;
        verificationMethod: string;
        spaces?: Record<string, string> | undefined;
    }, {
        delegationHeader: {
            Authorization: string;
        };
        delegationCid: string;
        spaceId: string;
        verificationMethod: string;
        spaces?: Record<string, string> | undefined;
    }>>;
    /** Session expiration timestamp (ISO 8601 with timezone offset) */
    expiresAt: z.ZodString;
    /** Session creation timestamp (ISO 8601 with timezone offset) */
    createdAt: z.ZodString;
    /** Schema version for migrations */
    version: z.ZodString;
    /** Optional ENS data */
    ens: z.ZodOptional<z.ZodObject<{
        /** ENS name/domain. */
        domain: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        /** ENS avatar URL. */
        avatarUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        domain?: string | null | undefined;
        avatarUrl?: string | null | undefined;
    }, {
        domain?: string | null | undefined;
        avatarUrl?: string | null | undefined;
    }>>;
    /**
     * TinyCloud hosts this session was created against. Persisted so a
     * restored session resolves to the same node without re-running the
     * registry/fallback resolution (or the wallet sign-in flow). Optional
     * for backward compatibility with sessions persisted before this field
     * existed — those restore and lazily re-resolve their hosts.
     */
    tinycloudHosts: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    chainId: number;
    address: string;
    sessionKey: string;
    siwe: string;
    signature: string;
    expiresAt: string;
    createdAt: string;
    version: string;
    ens?: {
        domain?: string | null | undefined;
        avatarUrl?: string | null | undefined;
    } | undefined;
    tinycloudSession?: {
        delegationHeader: {
            Authorization: string;
        };
        delegationCid: string;
        spaceId: string;
        verificationMethod: string;
        spaces?: Record<string, string> | undefined;
    } | undefined;
    tinycloudHosts?: string[] | undefined;
}, {
    chainId: number;
    address: string;
    sessionKey: string;
    siwe: string;
    signature: string;
    expiresAt: string;
    createdAt: string;
    version: string;
    ens?: {
        domain?: string | null | undefined;
        avatarUrl?: string | null | undefined;
    } | undefined;
    tinycloudSession?: {
        delegationHeader: {
            Authorization: string;
        };
        delegationCid: string;
        spaceId: string;
        verificationMethod: string;
        spaces?: Record<string, string> | undefined;
    } | undefined;
    tinycloudHosts?: string[] | undefined;
}>;
type PersistedSessionData = z.infer<typeof PersistedSessionDataSchema>;
/**
 * Schema for full TinyCloud session with delegation data.
 *
 * This is the runtime session type used for making invocations and delegations.
 */
declare const TinyCloudSessionSchema: z.ZodObject<{
    /** User's Ethereum address */
    address: z.ZodString;
    /** EIP-155 Chain ID */
    chainId: z.ZodNumber;
    /** Session key ID */
    sessionKey: z.ZodString;
    /** The space ID for this session */
    spaceId: z.ZodString;
    /** Additional spaces included in this session's capabilities. Key is logical name, value is full spaceId URI */
    spaces: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    /** The delegation CID */
    delegationCid: z.ZodString;
    /** The delegation header for API calls */
    delegationHeader: z.ZodObject<{
        Authorization: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        Authorization: string;
    }, {
        Authorization: string;
    }>;
    /** The verification method DID */
    verificationMethod: z.ZodString;
    /** The session key JWK (required for invoke operations) */
    jwk: z.ZodObject<{}, "passthrough", z.ZodTypeAny, z.objectOutputType<{}, z.ZodTypeAny, "passthrough">, z.objectInputType<{}, z.ZodTypeAny, "passthrough">>;
    /** The signed SIWE message */
    siwe: z.ZodString;
    /** User's signature of the SIWE message */
    signature: z.ZodString;
}, "strip", z.ZodTypeAny, {
    chainId: number;
    address: string;
    sessionKey: string;
    siwe: string;
    signature: string;
    delegationHeader: {
        Authorization: string;
    };
    delegationCid: string;
    spaceId: string;
    verificationMethod: string;
    jwk: {} & {
        [k: string]: unknown;
    };
    spaces?: Record<string, string> | undefined;
}, {
    chainId: number;
    address: string;
    sessionKey: string;
    siwe: string;
    signature: string;
    delegationHeader: {
        Authorization: string;
    };
    delegationCid: string;
    spaceId: string;
    verificationMethod: string;
    jwk: {} & {
        [k: string]: unknown;
    };
    spaces?: Record<string, string> | undefined;
}>;
type TinyCloudSession = z.infer<typeof TinyCloudSessionSchema>;
/**
 * Validation error type for schema validation failures.
 */
interface ValidationError extends ServiceError {
    code: "VALIDATION_ERROR";
    meta?: {
        issues: z.ZodIssue[];
        path?: string;
    };
}
/**
 * Validate persisted session data against the schema.
 *
 * @param data - Unknown data to validate
 * @returns Result with validated data or validation error
 *
 * @example
 * ```typescript
 * const result = validatePersistedSessionData(JSON.parse(rawData));
 * if (result.ok) {
 *   // result.data is typed as PersistedSessionData
 *   console.log(result.data.address);
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */
declare function validatePersistedSessionData(data: unknown): Result$1<PersistedSessionData, ValidationError>;

/**
 * Session storage types and interfaces.
 *
 * Types are derived from Zod schemas in storage.schema.ts.
 *
 * @packageDocumentation
 */

/**
 * Session storage interface.
 *
 * Abstracts how sessions are persisted across different platforms.
 * - Browser: localStorage
 * - Node.js: file system or memory
 */
interface ISessionStorage {
    /**
     * Save a session for an address.
     * @param address - Ethereum address (key for lookup)
     * @param session - Session data to persist
     */
    save(address: string, session: PersistedSessionData): Promise<void>;
    /**
     * Load a session for an address.
     * @param address - Ethereum address
     * @returns Session data or null if not found
     */
    load(address: string): Promise<PersistedSessionData | null>;
    /**
     * Clear a session for an address.
     * @param address - Ethereum address
     */
    clear(address: string): Promise<void>;
    /**
     * Check if a session exists for an address (synchronous check).
     * @param address - Ethereum address
     * @returns true if session exists
     */
    exists(address: string): boolean;
    /**
     * Check if the storage backend is available.
     * @returns true if storage can be used
     */
    isAvailable(): boolean;
}

/**
 * Zod schemas for delegation management types.
 *
 * These schemas provide runtime validation for delegation, capability key management,
 * and sharing link functionality. Types are derived from schemas using z.infer<>.
 *
 * @packageDocumentation
 */

/**
 * Result type pattern for delegation operations.
 */
type Result<T, E = DelegationError> = {
    ok: true;
    data: T;
} | {
    ok: false;
    error: E;
};
/**
 * JSON Web Key representation for cryptographic keys.
 * Follows the JWK specification (RFC 7517).
 */
declare const JWKSchema: z.ZodObject<{
    /** Key type (e.g., "EC", "RSA", "OKP") */
    kty: z.ZodString;
    /** Curve for EC/OKP keys (e.g., "P-256", "Ed25519") */
    crv: z.ZodOptional<z.ZodString>;
    /** X coordinate for EC keys, public key for OKP */
    x: z.ZodOptional<z.ZodString>;
    /** Y coordinate for EC keys */
    y: z.ZodOptional<z.ZodString>;
    /** Private key value (d parameter) */
    d: z.ZodOptional<z.ZodString>;
    /** Public exponent for RSA keys */
    e: z.ZodOptional<z.ZodString>;
    /** Modulus for RSA keys */
    n: z.ZodOptional<z.ZodString>;
    /** Key ID */
    kid: z.ZodOptional<z.ZodString>;
    /** Algorithm */
    alg: z.ZodOptional<z.ZodString>;
    /** Key use (e.g., "sig", "enc") */
    use: z.ZodOptional<z.ZodString>;
    /** Key operations (e.g., ["sign", "verify"]) */
    key_ops: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    kty: string;
    crv?: string | undefined;
    x?: string | undefined;
    y?: string | undefined;
    d?: string | undefined;
    e?: string | undefined;
    n?: string | undefined;
    kid?: string | undefined;
    alg?: string | undefined;
    use?: string | undefined;
    key_ops?: string[] | undefined;
}, {
    kty: string;
    crv?: string | undefined;
    x?: string | undefined;
    y?: string | undefined;
    d?: string | undefined;
    e?: string | undefined;
    n?: string | undefined;
    kid?: string | undefined;
    alg?: string | undefined;
    use?: string | undefined;
    key_ops?: string[] | undefined;
}>;
type JWK = z.infer<typeof JWKSchema>;
/**
 * Type of key in the capability registry.
 */
declare const KeyTypeSchema: z.ZodEnum<["main", "session", "ingested"]>;
type KeyType = z.infer<typeof KeyTypeSchema>;
/**
 * Information about a cryptographic key used for delegations.
 */
declare const KeyInfoSchema: z.ZodObject<{
    /** Unique identifier for this key */
    id: z.ZodString;
    /** DID associated with this key */
    did: z.ZodString;
    /** Type of key determining its authority level */
    type: z.ZodEnum<["main", "session", "ingested"]>;
    /** Private key in JWK format */
    jwk: z.ZodOptional<z.ZodObject<{
        /** Key type (e.g., "EC", "RSA", "OKP") */
        kty: z.ZodString;
        /** Curve for EC/OKP keys (e.g., "P-256", "Ed25519") */
        crv: z.ZodOptional<z.ZodString>;
        /** X coordinate for EC keys, public key for OKP */
        x: z.ZodOptional<z.ZodString>;
        /** Y coordinate for EC keys */
        y: z.ZodOptional<z.ZodString>;
        /** Private key value (d parameter) */
        d: z.ZodOptional<z.ZodString>;
        /** Public exponent for RSA keys */
        e: z.ZodOptional<z.ZodString>;
        /** Modulus for RSA keys */
        n: z.ZodOptional<z.ZodString>;
        /** Key ID */
        kid: z.ZodOptional<z.ZodString>;
        /** Algorithm */
        alg: z.ZodOptional<z.ZodString>;
        /** Key use (e.g., "sig", "enc") */
        use: z.ZodOptional<z.ZodString>;
        /** Key operations (e.g., ["sign", "verify"]) */
        key_ops: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        kty: string;
        crv?: string | undefined;
        x?: string | undefined;
        y?: string | undefined;
        d?: string | undefined;
        e?: string | undefined;
        n?: string | undefined;
        kid?: string | undefined;
        alg?: string | undefined;
        use?: string | undefined;
        key_ops?: string[] | undefined;
    }, {
        kty: string;
        crv?: string | undefined;
        x?: string | undefined;
        y?: string | undefined;
        d?: string | undefined;
        e?: string | undefined;
        n?: string | undefined;
        kid?: string | undefined;
        alg?: string | undefined;
        use?: string | undefined;
        key_ops?: string[] | undefined;
    }>>;
    /** Priority for key selection (lower = higher priority) */
    priority: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "session" | "main" | "ingested";
    did: string;
    id: string;
    priority: number;
    jwk?: {
        kty: string;
        crv?: string | undefined;
        x?: string | undefined;
        y?: string | undefined;
        d?: string | undefined;
        e?: string | undefined;
        n?: string | undefined;
        kid?: string | undefined;
        alg?: string | undefined;
        use?: string | undefined;
        key_ops?: string[] | undefined;
    } | undefined;
}, {
    type: "session" | "main" | "ingested";
    did: string;
    id: string;
    priority: number;
    jwk?: {
        kty: string;
        crv?: string | undefined;
        x?: string | undefined;
        y?: string | undefined;
        d?: string | undefined;
        e?: string | undefined;
        n?: string | undefined;
        kid?: string | undefined;
        alg?: string | undefined;
        use?: string | undefined;
        key_ops?: string[] | undefined;
    } | undefined;
}>;
type KeyInfo = z.infer<typeof KeyInfoSchema>;
/**
 * Error type for delegation operations.
 */
declare const DelegationErrorSchema: z.ZodObject<{
    /** Error code for programmatic handling */
    code: z.ZodString;
    /** Human-readable error message */
    message: z.ZodString;
    /** The service that produced the error */
    service: z.ZodLiteral<"delegation">;
    /** Original error if wrapping another error */
    cause: z.ZodOptional<z.ZodType<Error, z.ZodTypeDef, Error>>;
    /** Additional metadata about the error */
    meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    code: string;
    message: string;
    service: "delegation";
    cause?: Error | undefined;
    meta?: Record<string, unknown> | undefined;
}, {
    code: string;
    message: string;
    service: "delegation";
    cause?: Error | undefined;
    meta?: Record<string, unknown> | undefined;
}>;
type DelegationError = z.infer<typeof DelegationErrorSchema>;
/**
 * Error codes for delegation operations.
 */
declare const DelegationErrorCodes: {
    readonly AUTH_REQUIRED: "AUTH_REQUIRED";
    readonly AUTH_EXPIRED: "AUTH_EXPIRED";
    readonly NOT_INITIALIZED: "NOT_INITIALIZED";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly REVOKED: "REVOKED";
    readonly NETWORK_ERROR: "NETWORK_ERROR";
    readonly TIMEOUT: "TIMEOUT";
    readonly ABORTED: "ABORTED";
    readonly INVALID_INPUT: "INVALID_INPUT";
    readonly PERMISSION_DENIED: "PERMISSION_DENIED";
    readonly CREATION_FAILED: "CREATION_FAILED";
    readonly REVOCATION_FAILED: "REVOCATION_FAILED";
    readonly INVALID_TOKEN: "INVALID_TOKEN";
    readonly KV_SERVICE_UNAVAILABLE: "KV_SERVICE_UNAVAILABLE";
    readonly DATA_FETCH_FAILED: "DATA_FETCH_FAILED";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
};
type DelegationErrorCode = (typeof DelegationErrorCodes)[keyof typeof DelegationErrorCodes];
/**
 * Represents a delegation from one DID to another.
 */
declare const DelegationSchema: z.ZodObject<{
    /** Content identifier (CID) of the delegation */
    cid: z.ZodString;
    /** DID of the delegate (the party receiving the delegation) */
    delegateDID: z.ZodString;
    /** Space ID this delegation applies to */
    spaceId: z.ZodString;
    /** Resource path this delegation grants access to */
    path: z.ZodString;
    /** Actions this delegation authorizes */
    actions: z.ZodArray<z.ZodString, "many">;
    /** When this delegation expires (accepts Date or ISO string from JSON) */
    expiry: z.ZodDate;
    /** Whether this delegation has been revoked */
    isRevoked: z.ZodBoolean;
    /** DID of the delegator (the party granting the delegation) */
    delegatorDID: z.ZodOptional<z.ZodString>;
    /** When this delegation was created (accepts Date or ISO string from JSON) */
    createdAt: z.ZodOptional<z.ZodDate>;
    /** Parent delegation CID if this is a sub-delegation */
    parentCid: z.ZodOptional<z.ZodString>;
    /** Whether sub-delegation is allowed */
    allowSubDelegation: z.ZodOptional<z.ZodBoolean>;
    /** Authorization header (UCAN bearer token) */
    authHeader: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path: string;
    expiry: Date;
    actions: string[];
    spaceId: string;
    cid: string;
    delegateDID: string;
    isRevoked: boolean;
    createdAt?: Date | undefined;
    delegatorDID?: string | undefined;
    parentCid?: string | undefined;
    allowSubDelegation?: boolean | undefined;
    authHeader?: string | undefined;
}, {
    path: string;
    expiry: Date;
    actions: string[];
    spaceId: string;
    cid: string;
    delegateDID: string;
    isRevoked: boolean;
    createdAt?: Date | undefined;
    delegatorDID?: string | undefined;
    parentCid?: string | undefined;
    allowSubDelegation?: boolean | undefined;
    authHeader?: string | undefined;
}>;
type Delegation = z.infer<typeof DelegationSchema>;
/**
 * Entry in the capability registry mapping a capability to available keys.
 */
declare const CapabilityEntrySchema: z.ZodObject<{
    /** Resource URI this capability applies to */
    resource: z.ZodString;
    /** Action this capability authorizes */
    action: z.ZodString;
    /** Keys that can exercise this capability, ordered by priority */
    keys: z.ZodArray<z.ZodObject<{
        /** Unique identifier for this key */
        id: z.ZodString;
        /** DID associated with this key */
        did: z.ZodString;
        /** Type of key determining its authority level */
        type: z.ZodEnum<["main", "session", "ingested"]>;
        /** Private key in JWK format */
        jwk: z.ZodOptional<z.ZodObject<{
            /** Key type (e.g., "EC", "RSA", "OKP") */
            kty: z.ZodString;
            /** Curve for EC/OKP keys (e.g., "P-256", "Ed25519") */
            crv: z.ZodOptional<z.ZodString>;
            /** X coordinate for EC keys, public key for OKP */
            x: z.ZodOptional<z.ZodString>;
            /** Y coordinate for EC keys */
            y: z.ZodOptional<z.ZodString>;
            /** Private key value (d parameter) */
            d: z.ZodOptional<z.ZodString>;
            /** Public exponent for RSA keys */
            e: z.ZodOptional<z.ZodString>;
            /** Modulus for RSA keys */
            n: z.ZodOptional<z.ZodString>;
            /** Key ID */
            kid: z.ZodOptional<z.ZodString>;
            /** Algorithm */
            alg: z.ZodOptional<z.ZodString>;
            /** Key use (e.g., "sig", "enc") */
            use: z.ZodOptional<z.ZodString>;
            /** Key operations (e.g., ["sign", "verify"]) */
            key_ops: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            kty: string;
            crv?: string | undefined;
            x?: string | undefined;
            y?: string | undefined;
            d?: string | undefined;
            e?: string | undefined;
            n?: string | undefined;
            kid?: string | undefined;
            alg?: string | undefined;
            use?: string | undefined;
            key_ops?: string[] | undefined;
        }, {
            kty: string;
            crv?: string | undefined;
            x?: string | undefined;
            y?: string | undefined;
            d?: string | undefined;
            e?: string | undefined;
            n?: string | undefined;
            kid?: string | undefined;
            alg?: string | undefined;
            use?: string | undefined;
            key_ops?: string[] | undefined;
        }>>;
        /** Priority for key selection (lower = higher priority) */
        priority: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "session" | "main" | "ingested";
        did: string;
        id: string;
        priority: number;
        jwk?: {
            kty: string;
            crv?: string | undefined;
            x?: string | undefined;
            y?: string | undefined;
            d?: string | undefined;
            e?: string | undefined;
            n?: string | undefined;
            kid?: string | undefined;
            alg?: string | undefined;
            use?: string | undefined;
            key_ops?: string[] | undefined;
        } | undefined;
    }, {
        type: "session" | "main" | "ingested";
        did: string;
        id: string;
        priority: number;
        jwk?: {
            kty: string;
            crv?: string | undefined;
            x?: string | undefined;
            y?: string | undefined;
            d?: string | undefined;
            e?: string | undefined;
            n?: string | undefined;
            kid?: string | undefined;
            alg?: string | undefined;
            use?: string | undefined;
            key_ops?: string[] | undefined;
        } | undefined;
    }>, "many">;
    /** The delegation that grants this capability */
    delegation: z.ZodObject<{
        /** Content identifier (CID) of the delegation */
        cid: z.ZodString;
        /** DID of the delegate (the party receiving the delegation) */
        delegateDID: z.ZodString;
        /** Space ID this delegation applies to */
        spaceId: z.ZodString;
        /** Resource path this delegation grants access to */
        path: z.ZodString;
        /** Actions this delegation authorizes */
        actions: z.ZodArray<z.ZodString, "many">;
        /** When this delegation expires (accepts Date or ISO string from JSON) */
        expiry: z.ZodDate;
        /** Whether this delegation has been revoked */
        isRevoked: z.ZodBoolean;
        /** DID of the delegator (the party granting the delegation) */
        delegatorDID: z.ZodOptional<z.ZodString>;
        /** When this delegation was created (accepts Date or ISO string from JSON) */
        createdAt: z.ZodOptional<z.ZodDate>;
        /** Parent delegation CID if this is a sub-delegation */
        parentCid: z.ZodOptional<z.ZodString>;
        /** Whether sub-delegation is allowed */
        allowSubDelegation: z.ZodOptional<z.ZodBoolean>;
        /** Authorization header (UCAN bearer token) */
        authHeader: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        expiry: Date;
        actions: string[];
        spaceId: string;
        cid: string;
        delegateDID: string;
        isRevoked: boolean;
        createdAt?: Date | undefined;
        delegatorDID?: string | undefined;
        parentCid?: string | undefined;
        allowSubDelegation?: boolean | undefined;
        authHeader?: string | undefined;
    }, {
        path: string;
        expiry: Date;
        actions: string[];
        spaceId: string;
        cid: string;
        delegateDID: string;
        isRevoked: boolean;
        createdAt?: Date | undefined;
        delegatorDID?: string | undefined;
        parentCid?: string | undefined;
        allowSubDelegation?: boolean | undefined;
        authHeader?: string | undefined;
    }>;
    /** When this capability expires (accepts Date or ISO string from JSON) */
    expiresAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    keys: {
        type: "session" | "main" | "ingested";
        did: string;
        id: string;
        priority: number;
        jwk?: {
            kty: string;
            crv?: string | undefined;
            x?: string | undefined;
            y?: string | undefined;
            d?: string | undefined;
            e?: string | undefined;
            n?: string | undefined;
            kid?: string | undefined;
            alg?: string | undefined;
            use?: string | undefined;
            key_ops?: string[] | undefined;
        } | undefined;
    }[];
    delegation: {
        path: string;
        expiry: Date;
        actions: string[];
        spaceId: string;
        cid: string;
        delegateDID: string;
        isRevoked: boolean;
        createdAt?: Date | undefined;
        delegatorDID?: string | undefined;
        parentCid?: string | undefined;
        allowSubDelegation?: boolean | undefined;
        authHeader?: string | undefined;
    };
    resource: string;
    action: string;
    expiresAt?: Date | undefined;
}, {
    keys: {
        type: "session" | "main" | "ingested";
        did: string;
        id: string;
        priority: number;
        jwk?: {
            kty: string;
            crv?: string | undefined;
            x?: string | undefined;
            y?: string | undefined;
            d?: string | undefined;
            e?: string | undefined;
            n?: string | undefined;
            kid?: string | undefined;
            alg?: string | undefined;
            use?: string | undefined;
            key_ops?: string[] | undefined;
        } | undefined;
    }[];
    delegation: {
        path: string;
        expiry: Date;
        actions: string[];
        spaceId: string;
        cid: string;
        delegateDID: string;
        isRevoked: boolean;
        createdAt?: Date | undefined;
        delegatorDID?: string | undefined;
        parentCid?: string | undefined;
        allowSubDelegation?: boolean | undefined;
        authHeader?: string | undefined;
    };
    resource: string;
    action: string;
    expiresAt?: Date | undefined;
}>;
type CapabilityEntry = z.infer<typeof CapabilityEntrySchema>;
/**
 * Persistent record of a delegation stored in the system.
 */
declare const DelegationRecordSchema: z.ZodObject<{
    /** Content identifier (CID) of the delegation */
    cid: z.ZodString;
    /** Space ID this delegation applies to */
    spaceId: z.ZodString;
    /** DID of the delegator (grantor) */
    delegator: z.ZodString;
    /** DID of the delegatee (recipient) */
    delegatee: z.ZodString;
    /** Key ID used to sign/exercise this delegation */
    keyId: z.ZodOptional<z.ZodString>;
    /** Resource path pattern this delegation grants access to */
    path: z.ZodString;
    /** Actions this delegation authorizes */
    actions: z.ZodArray<z.ZodString, "many">;
    /** When this delegation expires (accepts Date or ISO string from JSON) */
    expiry: z.ZodOptional<z.ZodDate>;
    /** When this delegation becomes valid (not before) (accepts Date or ISO string) */
    notBefore: z.ZodOptional<z.ZodDate>;
    /** Whether this delegation has been revoked */
    isRevoked: z.ZodBoolean;
    /** When this delegation was created (accepts Date or ISO string from JSON) */
    createdAt: z.ZodDate;
    /** Parent delegation CID if this is a sub-delegation */
    parentCid: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path: string;
    actions: string[];
    spaceId: string;
    createdAt: Date;
    cid: string;
    isRevoked: boolean;
    delegator: string;
    delegatee: string;
    notBefore?: Date | undefined;
    expiry?: Date | undefined;
    parentCid?: string | undefined;
    keyId?: string | undefined;
}, {
    path: string;
    actions: string[];
    spaceId: string;
    createdAt: Date;
    cid: string;
    isRevoked: boolean;
    delegator: string;
    delegatee: string;
    notBefore?: Date | undefined;
    expiry?: Date | undefined;
    parentCid?: string | undefined;
    keyId?: string | undefined;
}>;
type DelegationRecord = z.infer<typeof DelegationRecordSchema>;
/**
 * Parameters for creating a new delegation.
 */
declare const CreateDelegationParamsSchema: z.ZodObject<{
    /** DID of the delegate (the party receiving the delegation) */
    delegateDID: z.ZodString;
    /** Resource path this delegation grants access to */
    path: z.ZodString;
    /** Actions to authorize */
    actions: z.ZodArray<z.ZodString, "many">;
    /** When this delegation expires (accepts Date or ISO string) */
    expiry: z.ZodOptional<z.ZodDate>;
    /** Whether to disable sub-delegation */
    disableSubDelegation: z.ZodOptional<z.ZodBoolean>;
    /** Optional statement for the SIWE message */
    statement: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path: string;
    actions: string[];
    delegateDID: string;
    statement?: string | undefined;
    expiry?: Date | undefined;
    disableSubDelegation?: boolean | undefined;
}, {
    path: string;
    actions: string[];
    delegateDID: string;
    statement?: string | undefined;
    expiry?: Date | undefined;
    disableSubDelegation?: boolean | undefined;
}>;
type CreateDelegationParams = z.infer<typeof CreateDelegationParamsSchema>;
/**
 * A chain of delegations from root to leaf (array format).
 */
declare const DelegationChainSchema: z.ZodArray<z.ZodObject<{
    /** Content identifier (CID) of the delegation */
    cid: z.ZodString;
    /** DID of the delegate (the party receiving the delegation) */
    delegateDID: z.ZodString;
    /** Space ID this delegation applies to */
    spaceId: z.ZodString;
    /** Resource path this delegation grants access to */
    path: z.ZodString;
    /** Actions this delegation authorizes */
    actions: z.ZodArray<z.ZodString, "many">;
    /** When this delegation expires (accepts Date or ISO string from JSON) */
    expiry: z.ZodDate;
    /** Whether this delegation has been revoked */
    isRevoked: z.ZodBoolean;
    /** DID of the delegator (the party granting the delegation) */
    delegatorDID: z.ZodOptional<z.ZodString>;
    /** When this delegation was created (accepts Date or ISO string from JSON) */
    createdAt: z.ZodOptional<z.ZodDate>;
    /** Parent delegation CID if this is a sub-delegation */
    parentCid: z.ZodOptional<z.ZodString>;
    /** Whether sub-delegation is allowed */
    allowSubDelegation: z.ZodOptional<z.ZodBoolean>;
    /** Authorization header (UCAN bearer token) */
    authHeader: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path: string;
    expiry: Date;
    actions: string[];
    spaceId: string;
    cid: string;
    delegateDID: string;
    isRevoked: boolean;
    createdAt?: Date | undefined;
    delegatorDID?: string | undefined;
    parentCid?: string | undefined;
    allowSubDelegation?: boolean | undefined;
    authHeader?: string | undefined;
}, {
    path: string;
    expiry: Date;
    actions: string[];
    spaceId: string;
    cid: string;
    delegateDID: string;
    isRevoked: boolean;
    createdAt?: Date | undefined;
    delegatorDID?: string | undefined;
    parentCid?: string | undefined;
    allowSubDelegation?: boolean | undefined;
    authHeader?: string | undefined;
}>, "many">;
type DelegationChain = z.infer<typeof DelegationChainSchema>;
/**
 * Structured delegation chain (v2 spec).
 */
declare const DelegationChainV2Schema: z.ZodObject<{
    /** The root delegation from the original authority */
    root: z.ZodObject<{
        /** Content identifier (CID) of the delegation */
        cid: z.ZodString;
        /** DID of the delegate (the party receiving the delegation) */
        delegateDID: z.ZodString;
        /** Space ID this delegation applies to */
        spaceId: z.ZodString;
        /** Resource path this delegation grants access to */
        path: z.ZodString;
        /** Actions this delegation authorizes */
        actions: z.ZodArray<z.ZodString, "many">;
        /** When this delegation expires (accepts Date or ISO string from JSON) */
        expiry: z.ZodDate;
        /** Whether this delegation has been revoked */
        isRevoked: z.ZodBoolean;
        /** DID of the delegator (the party granting the delegation) */
        delegatorDID: z.ZodOptional<z.ZodString>;
        /** When this delegation was created (accepts Date or ISO string from JSON) */
        createdAt: z.ZodOptional<z.ZodDate>;
        /** Parent delegation CID if this is a sub-delegation */
        parentCid: z.ZodOptional<z.ZodString>;
        /** Whether sub-delegation is allowed */
        allowSubDelegation: z.ZodOptional<z.ZodBoolean>;
        /** Authorization header (UCAN bearer token) */
        authHeader: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        expiry: Date;
        actions: string[];
        spaceId: string;
        cid: string;
        delegateDID: string;
        isRevoked: boolean;
        createdAt?: Date | undefined;
        delegatorDID?: string | undefined;
        parentCid?: string | undefined;
        allowSubDelegation?: boolean | undefined;
        authHeader?: string | undefined;
    }, {
        path: string;
        expiry: Date;
        actions: string[];
        spaceId: string;
        cid: string;
        delegateDID: string;
        isRevoked: boolean;
        createdAt?: Date | undefined;
        delegatorDID?: string | undefined;
        parentCid?: string | undefined;
        allowSubDelegation?: boolean | undefined;
        authHeader?: string | undefined;
    }>;
    /** Intermediate delegations in the chain (may be empty) */
    chain: z.ZodArray<z.ZodObject<{
        /** Content identifier (CID) of the delegation */
        cid: z.ZodString;
        /** DID of the delegate (the party receiving the delegation) */
        delegateDID: z.ZodString;
        /** Space ID this delegation applies to */
        spaceId: z.ZodString;
        /** Resource path this delegation grants access to */
        path: z.ZodString;
        /** Actions this delegation authorizes */
        actions: z.ZodArray<z.ZodString, "many">;
        /** When this delegation expires (accepts Date or ISO string from JSON) */
        expiry: z.ZodDate;
        /** Whether this delegation has been revoked */
        isRevoked: z.ZodBoolean;
        /** DID of the delegator (the party granting the delegation) */
        delegatorDID: z.ZodOptional<z.ZodString>;
        /** When this delegation was created (accepts Date or ISO string from JSON) */
        createdAt: z.ZodOptional<z.ZodDate>;
        /** Parent delegation CID if this is a sub-delegation */
        parentCid: z.ZodOptional<z.ZodString>;
        /** Whether sub-delegation is allowed */
        allowSubDelegation: z.ZodOptional<z.ZodBoolean>;
        /** Authorization header (UCAN bearer token) */
        authHeader: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        expiry: Date;
        actions: string[];
        spaceId: string;
        cid: string;
        delegateDID: string;
        isRevoked: boolean;
        createdAt?: Date | undefined;
        delegatorDID?: string | undefined;
        parentCid?: string | undefined;
        allowSubDelegation?: boolean | undefined;
        authHeader?: string | undefined;
    }, {
        path: string;
        expiry: Date;
        actions: string[];
        spaceId: string;
        cid: string;
        delegateDID: string;
        isRevoked: boolean;
        createdAt?: Date | undefined;
        delegatorDID?: string | undefined;
        parentCid?: string | undefined;
        allowSubDelegation?: boolean | undefined;
        authHeader?: string | undefined;
    }>, "many">;
    /** The final delegation to the current user */
    leaf: z.ZodObject<{
        /** Content identifier (CID) of the delegation */
        cid: z.ZodString;
        /** DID of the delegate (the party receiving the delegation) */
        delegateDID: z.ZodString;
        /** Space ID this delegation applies to */
        spaceId: z.ZodString;
        /** Resource path this delegation grants access to */
        path: z.ZodString;
        /** Actions this delegation authorizes */
        actions: z.ZodArray<z.ZodString, "many">;
        /** When this delegation expires (accepts Date or ISO string from JSON) */
        expiry: z.ZodDate;
        /** Whether this delegation has been revoked */
        isRevoked: z.ZodBoolean;
        /** DID of the delegator (the party granting the delegation) */
        delegatorDID: z.ZodOptional<z.ZodString>;
        /** When this delegation was created (accepts Date or ISO string from JSON) */
        createdAt: z.ZodOptional<z.ZodDate>;
        /** Parent delegation CID if this is a sub-delegation */
        parentCid: z.ZodOptional<z.ZodString>;
        /** Whether sub-delegation is allowed */
        allowSubDelegation: z.ZodOptional<z.ZodBoolean>;
        /** Authorization header (UCAN bearer token) */
        authHeader: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        expiry: Date;
        actions: string[];
        spaceId: string;
        cid: string;
        delegateDID: string;
        isRevoked: boolean;
        createdAt?: Date | undefined;
        delegatorDID?: string | undefined;
        parentCid?: string | undefined;
        allowSubDelegation?: boolean | undefined;
        authHeader?: string | undefined;
    }, {
        path: string;
        expiry: Date;
        actions: string[];
        spaceId: string;
        cid: string;
        delegateDID: string;
        isRevoked: boolean;
        createdAt?: Date | undefined;
        delegatorDID?: string | undefined;
        parentCid?: string | undefined;
        allowSubDelegation?: boolean | undefined;
        authHeader?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    root: {
        path: string;
        expiry: Date;
        actions: string[];
        spaceId: string;
        cid: string;
        delegateDID: string;
        isRevoked: boolean;
        createdAt?: Date | undefined;
        delegatorDID?: string | undefined;
        parentCid?: string | undefined;
        allowSubDelegation?: boolean | undefined;
        authHeader?: string | undefined;
    };
    chain: {
        path: string;
        expiry: Date;
        actions: string[];
        spaceId: string;
        cid: string;
        delegateDID: string;
        isRevoked: boolean;
        createdAt?: Date | undefined;
        delegatorDID?: string | undefined;
        parentCid?: string | undefined;
        allowSubDelegation?: boolean | undefined;
        authHeader?: string | undefined;
    }[];
    leaf: {
        path: string;
        expiry: Date;
        actions: string[];
        spaceId: string;
        cid: string;
        delegateDID: string;
        isRevoked: boolean;
        createdAt?: Date | undefined;
        delegatorDID?: string | undefined;
        parentCid?: string | undefined;
        allowSubDelegation?: boolean | undefined;
        authHeader?: string | undefined;
    };
}, {
    root: {
        path: string;
        expiry: Date;
        actions: string[];
        spaceId: string;
        cid: string;
        delegateDID: string;
        isRevoked: boolean;
        createdAt?: Date | undefined;
        delegatorDID?: string | undefined;
        parentCid?: string | undefined;
        allowSubDelegation?: boolean | undefined;
        authHeader?: string | undefined;
    };
    chain: {
        path: string;
        expiry: Date;
        actions: string[];
        spaceId: string;
        cid: string;
        delegateDID: string;
        isRevoked: boolean;
        createdAt?: Date | undefined;
        delegatorDID?: string | undefined;
        parentCid?: string | undefined;
        allowSubDelegation?: boolean | undefined;
        authHeader?: string | undefined;
    }[];
    leaf: {
        path: string;
        expiry: Date;
        actions: string[];
        spaceId: string;
        cid: string;
        delegateDID: string;
        isRevoked: boolean;
        createdAt?: Date | undefined;
        delegatorDID?: string | undefined;
        parentCid?: string | undefined;
        allowSubDelegation?: boolean | undefined;
        authHeader?: string | undefined;
    };
}>;
type DelegationChainV2 = z.infer<typeof DelegationChainV2Schema>;
/**
 * Direction of delegation to filter by.
 */
declare const DelegationDirectionSchema: z.ZodEnum<["granted", "received", "all"]>;
type DelegationDirection = z.infer<typeof DelegationDirectionSchema>;
/**
 * Filters for listing delegations.
 */
declare const DelegationFiltersSchema: z.ZodObject<{
    /** Filter by delegation direction */
    direction: z.ZodOptional<z.ZodEnum<["granted", "received", "all"]>>;
    /** Filter by resource path pattern */
    path: z.ZodOptional<z.ZodString>;
    /** Filter by required actions */
    actions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Include revoked delegations */
    includeRevoked: z.ZodOptional<z.ZodBoolean>;
    /** Filter by delegator DID */
    delegator: z.ZodOptional<z.ZodString>;
    /** Filter by delegatee DID */
    delegatee: z.ZodOptional<z.ZodString>;
    /** Only include delegations valid at this time */
    validAt: z.ZodOptional<z.ZodDate>;
    /** Maximum number of results to return */
    limit: z.ZodOptional<z.ZodNumber>;
    /** Cursor for pagination */
    cursor: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path?: string | undefined;
    actions?: string[] | undefined;
    delegator?: string | undefined;
    delegatee?: string | undefined;
    direction?: "received" | "all" | "granted" | undefined;
    includeRevoked?: boolean | undefined;
    validAt?: Date | undefined;
    limit?: number | undefined;
    cursor?: string | undefined;
}, {
    path?: string | undefined;
    actions?: string[] | undefined;
    delegator?: string | undefined;
    delegatee?: string | undefined;
    direction?: "received" | "all" | "granted" | undefined;
    includeRevoked?: boolean | undefined;
    validAt?: Date | undefined;
    limit?: number | undefined;
    cursor?: string | undefined;
}>;
type DelegationFilters = z.infer<typeof DelegationFiltersSchema>;
/**
 * Type of space ownership.
 */
declare const SpaceOwnershipSchema: z.ZodEnum<["owned", "delegated"]>;
type SpaceOwnership = z.infer<typeof SpaceOwnershipSchema>;
/**
 * Information about a space the user has access to.
 */
declare const SpaceInfoSchema: z.ZodObject<{
    /** Space identifier */
    id: z.ZodString;
    /** Human-readable name for the space */
    name: z.ZodOptional<z.ZodString>;
    /** DID of the space owner */
    owner: z.ZodString;
    /** Whether user owns or has delegated access */
    type: z.ZodEnum<["owned", "delegated"]>;
    /** Permissions the user has in this space */
    permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** When the access expires (for delegated spaces) */
    expiresAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    type: "owned" | "delegated";
    id: string;
    owner: string;
    name?: string | undefined;
    expiresAt?: Date | undefined;
    permissions?: string[] | undefined;
}, {
    type: "owned" | "delegated";
    id: string;
    owner: string;
    name?: string | undefined;
    expiresAt?: Date | undefined;
    permissions?: string[] | undefined;
}>;
type SpaceInfo = z.infer<typeof SpaceInfoSchema>;
/**
 * Schema for encoding share link data.
 */
declare const ShareSchemaSchema: z.ZodEnum<["base64", "compact", "ipfs"]>;
type ShareSchema = z.infer<typeof ShareSchemaSchema>;
/**
 * A shareable link containing delegation credentials.
 */
declare const ShareLinkSchema: z.ZodObject<{
    /** Unique token identifying this share link */
    token: z.ZodString;
    /** Full URL for sharing */
    url: z.ZodString;
    /** The delegation this link grants access to */
    delegation: z.ZodObject<{
        /** Content identifier (CID) of the delegation */
        cid: z.ZodString;
        /** DID of the delegate (the party receiving the delegation) */
        delegateDID: z.ZodString;
        /** Space ID this delegation applies to */
        spaceId: z.ZodString;
        /** Resource path this delegation grants access to */
        path: z.ZodString;
        /** Actions this delegation authorizes */
        actions: z.ZodArray<z.ZodString, "many">;
        /** When this delegation expires (accepts Date or ISO string from JSON) */
        expiry: z.ZodDate;
        /** Whether this delegation has been revoked */
        isRevoked: z.ZodBoolean;
        /** DID of the delegator (the party granting the delegation) */
        delegatorDID: z.ZodOptional<z.ZodString>;
        /** When this delegation was created (accepts Date or ISO string from JSON) */
        createdAt: z.ZodOptional<z.ZodDate>;
        /** Parent delegation CID if this is a sub-delegation */
        parentCid: z.ZodOptional<z.ZodString>;
        /** Whether sub-delegation is allowed */
        allowSubDelegation: z.ZodOptional<z.ZodBoolean>;
        /** Authorization header (UCAN bearer token) */
        authHeader: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        expiry: Date;
        actions: string[];
        spaceId: string;
        cid: string;
        delegateDID: string;
        isRevoked: boolean;
        createdAt?: Date | undefined;
        delegatorDID?: string | undefined;
        parentCid?: string | undefined;
        allowSubDelegation?: boolean | undefined;
        authHeader?: string | undefined;
    }, {
        path: string;
        expiry: Date;
        actions: string[];
        spaceId: string;
        cid: string;
        delegateDID: string;
        isRevoked: boolean;
        createdAt?: Date | undefined;
        delegatorDID?: string | undefined;
        parentCid?: string | undefined;
        allowSubDelegation?: boolean | undefined;
        authHeader?: string | undefined;
    }>;
    /** Encoding schema used for the link */
    schema: z.ZodEnum<["base64", "compact", "ipfs"]>;
    /** When this share link expires */
    expiresAt: z.ZodOptional<z.ZodDate>;
    /** Human-readable description of what is being shared */
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    schema: "base64" | "compact" | "ipfs";
    url: string;
    delegation: {
        path: string;
        expiry: Date;
        actions: string[];
        spaceId: string;
        cid: string;
        delegateDID: string;
        isRevoked: boolean;
        createdAt?: Date | undefined;
        delegatorDID?: string | undefined;
        parentCid?: string | undefined;
        allowSubDelegation?: boolean | undefined;
        authHeader?: string | undefined;
    };
    token: string;
    description?: string | undefined;
    expiresAt?: Date | undefined;
}, {
    schema: "base64" | "compact" | "ipfs";
    url: string;
    delegation: {
        path: string;
        expiry: Date;
        actions: string[];
        spaceId: string;
        cid: string;
        delegateDID: string;
        isRevoked: boolean;
        createdAt?: Date | undefined;
        delegatorDID?: string | undefined;
        parentCid?: string | undefined;
        allowSubDelegation?: boolean | undefined;
        authHeader?: string | undefined;
    };
    token: string;
    description?: string | undefined;
    expiresAt?: Date | undefined;
}>;
type ShareLink = z.infer<typeof ShareLinkSchema>;
type ShareLinkData<T = unknown> = {
    data: T;
    delegation: Delegation;
    spaceId: string;
    path: string;
};
/**
 * Options for ingesting an external delegation.
 */
declare const IngestOptionsSchema: z.ZodObject<{
    /** Whether to persist the delegation to storage */
    persist: z.ZodOptional<z.ZodBoolean>;
    /** Whether to validate the full delegation chain */
    validateChain: z.ZodOptional<z.ZodBoolean>;
    /** Name for the ingested key */
    keyName: z.ZodOptional<z.ZodString>;
    /** Whether to create a session key for this delegation */
    createSessionKey: z.ZodOptional<z.ZodBoolean>;
    /** Override the priority for the ingested key */
    priority: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    priority?: number | undefined;
    persist?: boolean | undefined;
    validateChain?: boolean | undefined;
    keyName?: string | undefined;
    createSessionKey?: boolean | undefined;
}, {
    priority?: number | undefined;
    persist?: boolean | undefined;
    validateChain?: boolean | undefined;
    keyName?: string | undefined;
    createSessionKey?: boolean | undefined;
}>;
type IngestOptions = z.infer<typeof IngestOptionsSchema>;
/**
 * Parameters for generating a share link.
 */
declare const GenerateShareParamsSchema: z.ZodObject<{
    /** Resource path to share */
    path: z.ZodString;
    /** Actions to authorize */
    actions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** When the share link expires */
    expiry: z.ZodOptional<z.ZodDate>;
    /** Encoding schema for the link */
    schema: z.ZodOptional<z.ZodEnum<["base64", "compact", "ipfs"]>>;
    /** Human-readable description */
    description: z.ZodOptional<z.ZodString>;
    /** Base URL for the share link */
    baseUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path: string;
    schema?: "base64" | "compact" | "ipfs" | undefined;
    expiry?: Date | undefined;
    description?: string | undefined;
    actions?: string[] | undefined;
    baseUrl?: string | undefined;
}, {
    path: string;
    schema?: "base64" | "compact" | "ipfs" | undefined;
    expiry?: Date | undefined;
    description?: string | undefined;
    actions?: string[] | undefined;
    baseUrl?: string | undefined;
}>;
type GenerateShareParams = z.infer<typeof GenerateShareParamsSchema>;
/**
 * Configuration for DelegationManager.
 * Note: ServiceSession, InvokeFunction, and FetchFunction are external types.
 */
declare const DelegationManagerConfigSchema: z.ZodObject<{
    /** TinyCloud host URLs */
    hosts: z.ZodArray<z.ZodString, "many">;
    /** Active session for authentication */
    session: z.ZodEffects<z.ZodUnknown, ServiceSession, unknown>;
    /** Platform-specific invoke function */
    invoke: z.ZodEffects<z.ZodUnknown, InvokeFunction, unknown>;
    /** Optional custom fetch implementation */
    fetch: z.ZodOptional<z.ZodEffects<z.ZodUnknown, FetchFunction, unknown>>;
}, "strip", z.ZodTypeAny, {
    session: ServiceSession;
    hosts: string[];
    invoke: InvokeFunction;
    fetch?: FetchFunction | undefined;
}, {
    hosts: string[];
    session?: unknown;
    invoke?: unknown;
    fetch?: unknown;
}>;
type DelegationManagerConfig = z.infer<typeof DelegationManagerConfigSchema>;
/**
 * Provider interface for cryptographic key operations.
 */
declare const KeyProviderSchema: z.ZodObject<{
    /** Generate a new session key, returns key ID */
    createSessionKey: z.ZodEffects<z.ZodUnknown, (name: string) => Promise<string>, unknown>;
    /** Get JWK for a key */
    getJWK: z.ZodEffects<z.ZodUnknown, (keyId: string) => object, unknown>;
    /** Get DID for a key */
    getDID: z.ZodEffects<z.ZodUnknown, (keyId: string) => Promise<string>, unknown>;
}, "strip", z.ZodTypeAny, {
    createSessionKey: (name: string) => Promise<string>;
    getJWK: (keyId: string) => object;
    getDID: (keyId: string) => Promise<string>;
}, {
    createSessionKey?: unknown;
    getJWK?: unknown;
    getDID?: unknown;
}>;
type KeyProvider = z.infer<typeof KeyProviderSchema>;
/**
 * Response from the delegation API.
 */
declare const DelegationApiResponseSchema: z.ZodObject<{
    /** SIWE message content */
    siwe: z.ZodString;
    /** Signature of the SIWE message */
    signature: z.ZodString;
    /** Delegation version */
    version: z.ZodNumber;
    /** CID of the created delegation */
    cid: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    siwe: string;
    signature: string;
    version: number;
    cid?: string | undefined;
}, {
    siwe: string;
    signature: string;
    version: number;
    cid?: string | undefined;
}>;
type DelegationApiResponse = z.infer<typeof DelegationApiResponseSchema>;
/**
 * A single (service, space, path, actions) entry inside a
 * createDelegation WASM result.
 *
 * Mirrors the Rust `DelegatedResource` struct in
 * `tinycloud-sdk-wasm/src/session.rs`. Field names match the manifest
 * {@link PermissionEntry} shape so callers can reconstruct what they sent
 * without having to re-parse the UCAN.
 *
 * `service` is the short form (e.g. `"kv"`, `"sql"`) as returned by the
 * Rust layer. The SDK layer translates to the long form
 * (`"tinycloud.kv"`) when comparing against manifests.
 */
declare const DelegatedResourceSchema: z.ZodObject<{
    /** Short-form service name, e.g. "kv", "sql", "duckdb", "capabilities", "hooks". */
    service: z.ZodString;
    /** Full space id string, e.g. "tinycloud:pkh:eip155:1:0x....:default". */
    space: z.ZodString;
    /** Resource path; empty string when the resource URI had no path segment. */
    path: z.ZodString;
    /** Full-URN ability strings, e.g. ["tinycloud.kv/get", "tinycloud.kv/put"]. */
    actions: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    path: string;
    actions: string[];
    space: string;
    service: string;
}, {
    path: string;
    actions: string[];
    space: string;
    service: string;
}>;
type DelegatedResource = z.infer<typeof DelegatedResourceSchema>;
/**
 * Input parameters for the createDelegation WASM function.
 *
 * A single call may encode multiple `(service, path, actions)` entries
 * via the `abilities` map — the underlying UCAN will contain one
 * attenuation entry per `(service, path)` pair, all signed by the same
 * session key in one blob.
 *
 * The `abilities` shape is identical to what `prepareSession` accepts
 * (`Record<shortService, Record<path, actionURNs[]>>`), so manifest
 * resolution can feed both sides from one data structure.
 */
declare const CreateDelegationWasmParamsSchema: z.ZodObject<{
    /** The session containing delegation credentials */
    session: z.ZodEffects<z.ZodUnknown, ServiceSession, unknown>;
    /** DID of the delegate */
    delegateDID: z.ZodString;
    /** Space ID this delegation applies to */
    spaceId: z.ZodString;
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
    abilities: z.ZodRecord<z.ZodString, z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
    /** Expiration time in seconds since Unix epoch */
    expirationSecs: z.ZodNumber;
    /** Optional not-before time in seconds since Unix epoch */
    notBeforeSecs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    spaceId: string;
    session: ServiceSession;
    delegateDID: string;
    abilities: Record<string, Record<string, string[]>>;
    expirationSecs: number;
    notBeforeSecs?: number | undefined;
}, {
    spaceId: string;
    delegateDID: string;
    abilities: Record<string, Record<string, string[]>>;
    expirationSecs: number;
    session?: unknown;
    notBeforeSecs?: number | undefined;
}>;
type CreateDelegationWasmParams = z.infer<typeof CreateDelegationWasmParamsSchema>;
/**
 * Result from the createDelegation WASM function.
 *
 * A single UCAN may cover multiple resources. The `resources` array
 * describes every `(service, space, path, actions)` entry granted, in
 * deterministic (service, path) lexicographic order (the Rust side sorts
 * the HashMap entries before signing).
 */
declare const CreateDelegationWasmResultSchema: z.ZodObject<{
    /** Base64url-encoded UCAN delegation */
    delegation: z.ZodString;
    /** CID of the delegation */
    cid: z.ZodString;
    /** DID of the delegate */
    delegateDID: z.ZodString;
    /** Expiration time */
    expiry: z.ZodDate;
    /**
     * All (service, space, path, actions) entries granted by this delegation.
     * Always non-empty on success.
     */
    resources: z.ZodArray<z.ZodObject<{
        /** Short-form service name, e.g. "kv", "sql", "duckdb", "capabilities", "hooks". */
        service: z.ZodString;
        /** Full space id string, e.g. "tinycloud:pkh:eip155:1:0x....:default". */
        space: z.ZodString;
        /** Resource path; empty string when the resource URI had no path segment. */
        path: z.ZodString;
        /** Full-URN ability strings, e.g. ["tinycloud.kv/get", "tinycloud.kv/put"]. */
        actions: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        path: string;
        actions: string[];
        space: string;
        service: string;
    }, {
        path: string;
        actions: string[];
        space: string;
        service: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    resources: {
        path: string;
        actions: string[];
        space: string;
        service: string;
    }[];
    expiry: Date;
    delegation: string;
    cid: string;
    delegateDID: string;
}, {
    resources: {
        path: string;
        actions: string[];
        space: string;
        service: string;
    }[];
    expiry: Date;
    delegation: string;
    cid: string;
    delegateDID: string;
}>;
type CreateDelegationWasmResult = z.infer<typeof CreateDelegationWasmResultSchema>;

/**
 * CapabilityKeyRegistry - Tracks keys and their capabilities for automatic key selection.
 *
 * The registry maintains mappings between:
 * - Keys and their associated delegations
 * - Capabilities (resource/action pairs) and the keys that can exercise them
 *
 * This enables automatic key selection when performing operations, choosing
 * the most appropriate key based on priority and validity.
 *
 * @packageDocumentation
 */

/**
 * Error codes specific to CapabilityKeyRegistry operations.
 */
declare const CapabilityKeyRegistryErrorCodes: {
    /** Key not found in registry */
    readonly KEY_NOT_FOUND: "KEY_NOT_FOUND";
    /** No key available for the requested capability */
    readonly NO_CAPABLE_KEY: "NO_CAPABLE_KEY";
    /** Delegation has expired */
    readonly DELEGATION_EXPIRED: "DELEGATION_EXPIRED";
    /** Delegation has been revoked */
    readonly DELEGATION_REVOKED: "DELEGATION_REVOKED";
    /** Invalid delegation data */
    readonly INVALID_DELEGATION: "INVALID_DELEGATION";
    /** Key already registered */
    readonly KEY_EXISTS: "KEY_EXISTS";
};
type CapabilityKeyRegistryErrorCode = (typeof CapabilityKeyRegistryErrorCodes)[keyof typeof CapabilityKeyRegistryErrorCodes];
/**
 * Stored delegation with chain information.
 */
interface StoredDelegationChain {
    /** The delegation itself */
    delegation: Delegation;
    /** Parent delegation CID if this is a sub-delegation */
    parentCid?: string;
    /** Key ID used to sign/exercise this delegation */
    keyId: string;
    /** When this was stored */
    storedAt: Date;
}
/**
 * Interface for the CapabilityKeyRegistry.
 *
 * Tracks keys and their capabilities for automatic key selection.
 */
interface ICapabilityKeyRegistry {
    /**
     * Register a key with its associated delegations.
     *
     * @param key - Key information
     * @param delegations - Delegations granted to this key
     */
    registerKey(key: KeyInfo, delegations: Delegation[]): void;
    /**
     * Remove a key and all its associated delegations.
     *
     * @param keyId - The key ID to remove
     */
    removeKey(keyId: string): void;
    /**
     * Get a key that can exercise the specified capability.
     *
     * Uses the key selection algorithm:
     * 1. Filter keys that have the required capability
     * 2. Check delegation validity (not expired, not revoked)
     * 3. Sort by priority (session=0, main=1, ingested=2)
     * 4. Return highest priority valid key
     *
     * @param resource - Resource URI (e.g., "tinycloud://space-id/kv/my-data")
     * @param action - Action to perform (e.g., "tinycloud.kv/get")
     * @returns The best matching key, or null if none available
     */
    getKeyForCapability(resource: string, action: string): KeyInfo | null;
    /**
     * Get all registered capabilities.
     *
     * @returns All capability entries in the registry
     */
    getAllCapabilities(): CapabilityEntry[];
    /**
     * Get all delegations for a specific key.
     *
     * @param keyId - The key ID
     * @returns Array of delegations for this key
     */
    getDelegationsForKey(keyId: string): Delegation[];
    /**
     * Ingest a key and delegation from an external source (e.g., sharing link).
     *
     * @param key - Key information to ingest
     * @param delegation - Delegation to associate with the key
     * @param options - Ingestion options
     */
    ingestKey(key: KeyInfo, delegation: Delegation, options?: IngestOptions): void;
    /**
     * Check if a delegation is currently valid.
     *
     * @param delegation - The delegation to check
     * @returns true if valid, false if expired or revoked
     */
    isDelegationValid(delegation: Delegation): boolean;
    /**
     * Get a key by its ID.
     *
     * @param keyId - The key ID
     * @returns The key info, or undefined if not found
     */
    getKey(keyId: string): KeyInfo | undefined;
    /**
     * Get all registered keys.
     *
     * @returns Array of all registered keys
     */
    getAllKeys(): KeyInfo[];
    /**
     * Clear all registered keys and delegations.
     */
    clear(): void;
    /**
     * Revoke a delegation by CID.
     *
     * @param cid - The delegation CID to revoke
     * @returns Result indicating success or failure
     */
    revokeDelegation(cid: string): Result$1<void, ServiceError>;
    /**
     * Find capabilities that match a resource path pattern.
     *
     * @param resourcePattern - Resource pattern (supports wildcards)
     * @param action - Optional action filter
     * @returns Matching capability entries
     */
    findCapabilities(resourcePattern: string, action?: string): CapabilityEntry[];
}
/**
 * CapabilityKeyRegistry - Tracks keys and their capabilities for automatic key selection.
 *
 * @example
 * ```typescript
 * const registry = new CapabilityKeyRegistry();
 *
 * // Register a session key with its delegations
 * registry.registerKey(sessionKey, [rootDelegation]);
 *
 * // Get the best key for an operation
 * const key = registry.getKeyForCapability(
 *   "tinycloud://my-space/kv/data",
 *   "tinycloud.kv/get"
 * );
 *
 * if (key) {
 *   // Use this key for the operation
 *   console.log("Using key:", key.id);
 * }
 * ```
 */
declare class CapabilityKeyRegistry implements ICapabilityKeyRegistry {
    /**
     * Registry of all keys indexed by ID.
     */
    private keys;
    /**
     * Delegation storage.
     */
    private store;
    /**
     * Register a key with its associated delegations.
     *
     * @param key - Key information
     * @param delegations - Delegations granted to this key
     */
    registerKey(key: KeyInfo, delegations: Delegation[]): void;
    /**
     * Remove a key and all its associated delegations.
     *
     * @param keyId - The key ID to remove
     */
    removeKey(keyId: string): void;
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
    getKeyForCapability(resource: string, action: string): KeyInfo | null;
    /**
     * Get all registered capabilities.
     *
     * @returns All capability entries in the registry
     */
    getAllCapabilities(): CapabilityEntry[];
    /**
     * Get all delegations for a specific key.
     *
     * @param keyId - The key ID
     * @returns Array of delegations for this key
     */
    getDelegationsForKey(keyId: string): Delegation[];
    /**
     * Ingest a key and delegation from an external source.
     *
     * @param key - Key information to ingest
     * @param delegation - Delegation to associate with the key
     * @param options - Ingestion options
     */
    ingestKey(key: KeyInfo, delegation: Delegation, options?: IngestOptions): void;
    /**
     * Check if a delegation is currently valid.
     *
     * @param delegation - The delegation to check
     * @returns true if valid, false if expired or revoked
     */
    isDelegationValid(delegation: Delegation): boolean;
    /**
     * Get a key by its ID.
     *
     * @param keyId - The key ID
     * @returns The key info, or undefined if not found
     */
    getKey(keyId: string): KeyInfo | undefined;
    /**
     * Get all registered keys.
     *
     * @returns Array of all registered keys
     */
    getAllKeys(): KeyInfo[];
    /**
     * Clear all registered keys and delegations.
     */
    clear(): void;
    /**
     * Revoke a delegation by CID.
     *
     * @param cid - The delegation CID to revoke
     * @returns Result indicating success or failure
     */
    revokeDelegation(cid: string): Result$1<void, ServiceError>;
    /**
     * Find capabilities that match a resource path pattern.
     *
     * @param resourcePattern - Resource pattern (supports wildcards)
     * @param action - Optional action filter
     * @returns Matching capability entries
     */
    findCapabilities(resourcePattern: string, action?: string): CapabilityEntry[];
    /**
     * Add a delegation to the store.
     *
     * @param key - The key associated with this delegation
     * @param delegation - The delegation to add
     */
    private addDelegation;
    /**
     * Create a capability key for indexing.
     *
     * @param resource - Resource path
     * @param action - Action
     * @returns Combined key string
     */
    private makeCapabilityKey;
    /**
     * Find capability entries that match a resource and action.
     *
     * @param resource - Resource to match
     * @param action - Action to match
     * @returns Matching entries
     */
    private findMatchingEntries;
    /**
     * Check if an action pattern matches a specific action.
     *
     * @param pattern - Action pattern (may include wildcard like "tinycloud.kv/*")
     * @param action - Specific action to check
     * @returns true if pattern matches action
     */
    private actionMatches;
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
    private resourceMatchesPattern;
    /**
     * Check if a specific resource matches a resource pattern for searching.
     *
     * @param entryResource - The resource from a capability entry
     * @param searchPattern - The pattern to search for
     * @returns true if entry resource matches search pattern
     */
    private matchesResourcePattern;
}
/**
 * Create a new CapabilityKeyRegistry instance.
 *
 * @returns A new registry instance
 */
declare function createCapabilityKeyRegistry(): ICapabilityKeyRegistry;

/**
 * SignStrategy types for TinyCloud authorization.
 *
 * These types define how sign requests are handled across different
 * SDK implementations (web-sdk, node-sdk). The pattern allows for
 * automatic signing, rejection, callback-based approval, or event-driven
 * workflows.
 *
 * @packageDocumentation
 */
/**
 * Sign request passed to callback or event handlers.
 */
interface SignRequest {
    /** Ethereum address of the signer */
    address: string;
    /** Chain ID for the signing context */
    chainId: number;
    /** Message to be signed */
    message: string;
    /** Type of sign operation */
    type: "siwe" | "message";
    /**
     * What the signature is for. Lets strategies apply different policies to
     * account-bootstrap signatures (which may be auto-signed server-side)
     * versus the user-initiated sign-in. Absent on requests from older SDKs.
     */
    purpose?: "sign-in" | "bootstrap-session" | "bootstrap-host" | "message";
}
/**
 * Sign response from callback or event handlers.
 */
interface SignResponse {
    /** Whether the sign request was approved */
    approved: boolean;
    /** The signature if approved */
    signature?: string;
    /** Reason for rejection if not approved */
    reason?: string;
}
/**
 * Callback handler type for sign requests.
 */
type SignCallback = (request: SignRequest) => Promise<SignResponse>;
interface OpenKeySigningStrategyOptions {
    /**
     * OpenKey signing endpoint URL.
     *
     * The SDK sends `POST endpoint` with JSON:
     * `{ address, chainId, message, type, keyId? }`.
     *
     * Expected successful response shape:
     * `{ signature: "0x..." }` or `{ approved: true, signature: "0x..." }`.
     *
     * Explicit-approval-needed response shape:
     * `{ approved: false, reason?: string }` or
     * `{ needsApproval: true, reason?: string, approvalUrl?: string }`.
     */
    endpoint: string;
    /** Optional OpenKey managed key id. */
    keyId?: string;
    /** Optional bearer token or async token supplier. */
    token?: string | (() => string | Promise<string | undefined>) | undefined;
    /** Extra headers to include on every request. */
    headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>);
    /** Fetch implementation. Defaults to `globalThis.fetch`. */
    fetch?: typeof fetch;
    /** Request credentials mode for browser integrations. */
    credentials?: "include" | "omit" | "same-origin";
}
interface OpenKeySigningRequestBody extends SignRequest {
    keyId?: string;
}
interface OpenKeySigningResponseBody {
    approved?: boolean;
    signature?: string;
    reason?: string;
    error?: string;
    needsApproval?: boolean;
    approvalUrl?: string;
}
interface OpenKeyCallbackStrategy extends CallbackStrategy {
    /** Marker used by SDK runtimes to choose the bootstrap-safe initial SIWE. */
    openKeyAutoSign: true;
}
/**
 * Create a callback signing strategy that delegates message signing to OpenKey.
 *
 * The helper deliberately returns the existing `CallbackStrategy` shape. When
 * OpenKey's policy gate says a request needs explicit approval, the callback
 * returns `{ approved: false, reason }`; `NodeUserAuthorization` then surfaces
 * that reason as the sign-in/signing error.
 */
declare function createOpenKeyCallbackSigningStrategy(options: OpenKeySigningStrategyOptions): OpenKeyCallbackStrategy;
/**
 * Auto-sign strategy: automatically signs all requests.
 *
 * Use cases:
 * - Trusted backend services
 * - Automated scripts
 * - CI/CD pipelines
 *
 * @example
 * ```typescript
 * const strategy: AutoSignStrategy = { type: 'auto-sign' };
 * ```
 */
interface AutoSignStrategy {
    type: "auto-sign";
}
/**
 * Auto-reject strategy: rejects all sign requests.
 *
 * Use cases:
 * - Read-only applications
 * - Testing rejection flows
 *
 * @example
 * ```typescript
 * const strategy: AutoRejectStrategy = { type: 'auto-reject' };
 * ```
 */
interface AutoRejectStrategy {
    type: "auto-reject";
}
/**
 * Callback strategy: delegates sign decisions to a callback function.
 *
 * Use cases:
 * - CLI applications with user prompts
 * - Custom approval workflows
 * - Interactive sign flows
 *
 * @example
 * ```typescript
 * const strategy: CallbackStrategy = {
 *   type: 'callback',
 *   handler: async (req) => {
 *     const approved = await promptUser(`Sign message for ${req.address}?`);
 *     return { approved, signature: approved ? await signer.sign(req.message) : undefined };
 *   }
 * };
 * ```
 */
interface CallbackStrategy {
    type: "callback";
    handler: SignCallback;
}
/**
 * Event emitter strategy: emits sign requests as events.
 *
 * Uses EventTarget for cross-platform compatibility (browser + Node.js).
 *
 * Events emitted:
 * - 'sign-request': When a sign request is received
 *
 * Use cases:
 * - Async approval workflows
 * - External signing services
 * - Multi-step authorization flows
 *
 * @example
 * ```typescript
 * const emitter = new EventTarget();
 * const strategy: EventEmitterStrategy = { type: 'event-emitter', emitter };
 *
 * emitter.addEventListener('sign-request', async (event) => {
 *   const { request, respond } = (event as CustomEvent).detail;
 *   const approved = await externalApprovalService.check(request);
 *   respond({ approved, signature: approved ? await sign(request.message) : undefined });
 * });
 * ```
 */
interface EventEmitterStrategy {
    type: "event-emitter";
    emitter: EventTarget;
    /** Timeout in milliseconds for waiting on event response (default: 60000) */
    timeout?: number;
}
/**
 * Sign strategy union type.
 *
 * Determines how sign requests are handled in UserAuthorization implementations.
 */
type SignStrategy = AutoSignStrategy | AutoRejectStrategy | CallbackStrategy | EventEmitterStrategy;
/**
 * Default sign strategy is auto-sign for convenience.
 */
declare const defaultSignStrategy: SignStrategy;

/**
 * Space creation handler types for TinyCloud authorization.
 *
 * These types abstract space creation confirmation, allowing different
 * implementations for web (modal) vs node (auto-approve) environments.
 *
 * @packageDocumentation
 */
/**
 * Context passed to space creation handlers.
 */
interface SpaceCreationContext {
    /** The unique identifier for the space being created */
    spaceId: string;
    /** Ethereum address of the user creating the space */
    address: string;
    /** Chain ID for the creation context */
    chainId: number;
    /** Host URL where the space will be created */
    host: string;
}
/**
 * Interface for handling space creation confirmation.
 *
 * Implementations can provide different UX patterns:
 * - Auto-approve for backend services
 * - Modal confirmation for web apps
 * - CLI prompts for terminal apps
 *
 * @example
 * ```typescript
 * class ModalSpaceCreationHandler implements ISpaceCreationHandler {
 *   async confirmSpaceCreation(context: SpaceCreationContext): Promise<boolean> {
 *     return await showConfirmationModal(`Create space ${context.spaceId}?`);
 *   }
 *
 *   onSpaceCreated(context: SpaceCreationContext): void {
 *     showToast(`Space ${context.spaceId} created!`);
 *   }
 *
 *   onSpaceCreationFailed(context: SpaceCreationContext, error: Error): void {
 *     showErrorModal(`Failed to create space: ${error.message}`);
 *   }
 * }
 * ```
 */
interface ISpaceCreationHandler {
    /**
     * Called when a new space needs to be created.
     * Returns true if space should be created, false to skip.
     *
     * @param context - Information about the space to be created
     * @returns Promise resolving to true to proceed, false to cancel
     */
    confirmSpaceCreation(context: SpaceCreationContext): Promise<boolean>;
    /**
     * Called after successful space creation.
     * Optional - implement to show success UI or perform cleanup.
     *
     * @param context - Information about the created space
     */
    onSpaceCreated?(context: SpaceCreationContext): void;
    /**
     * Called if space creation fails.
     * Optional - implement to show error UI or perform recovery.
     *
     * @param context - Information about the space that failed to create
     * @param error - The error that occurred
     */
    onSpaceCreationFailed?(context: SpaceCreationContext, error: Error): void;
}
/**
 * Default handler that auto-approves all space creation.
 *
 * Use cases:
 * - Backend services
 * - Automated scripts
 * - Node.js applications without UI
 *
 * @example
 * ```typescript
 * const handler = new AutoApproveSpaceCreationHandler();
 * const config = { spaceCreationHandler: handler };
 * ```
 */
declare class AutoApproveSpaceCreationHandler implements ISpaceCreationHandler {
    /**
     * Always returns true to auto-approve space creation.
     */
    confirmSpaceCreation(): Promise<boolean>;
}
/**
 * Default space creation handler that auto-approves all requests.
 */
declare const defaultSpaceCreationHandler: ISpaceCreationHandler;

/**
 * Interface for an extension to TCW.
 * This is the platform-agnostic subset — browser-coupled extensions
 * (IConnected, ConfigOverrides, ExtraFields) live in web-sdk/providers.
 */
interface Extension {
    /** [recap] Capability namespace. */
    namespace?: string;
    /** [recap] Default delegated actions in capability namespace. */
    defaultActions?(): Promise<string[]>;
    /** [recap] Delegated actions by target in capability namespace. */
    targetedActions?(): Promise<{
        [target: string]: string[];
    }>;
    /** [recap] Extra metadata to help validate the capability. */
    extraFields?(): Promise<Record<string, unknown>>;
    /** Hook to run after TCW has signed in. */
    afterSignIn?(session: ClientSession): Promise<void>;
}
/**
 * Partial SIWE message for overrides.
 */
interface PartialSiweMessage extends Partial<SiweConfig> {
    address?: string;
    chainId?: number;
    uri?: string;
    version?: string;
}
/**
 * Options for a single sign-in call.
 */
interface SignInOptions {
    /** Nonce to use for this sign-in only. Overrides `siweConfig.nonce` when provided. */
    nonce?: string;
}
/**
 * Platform-agnostic user authorization interface.
 *
 * This interface defines how users authenticate and manage sessions.
 * Implementations differ by platform:
 * - WebUserAuthorization: Browser with wallet popups
 * - NodeUserAuthorization: Node.js with configurable sign strategies
 */
interface IUserAuthorization {
    /**
     * The current active session, if signed in.
     */
    session?: ClientSession;
    /**
     * Add an extension to the authorization flow.
     * Extensions can add capabilities and lifecycle hooks.
     */
    extend(extension: Extension): void;
    /**
     * Sign in and create a new session.
     * This will prompt for wallet signature (browser) or use configured strategy (node).
     * Per-call options override constructor defaults for this sign-in only.
     * @returns The new session
     */
    signIn(options?: SignInOptions): Promise<ClientSession>;
    /**
     * Sign out and clear the current session.
     */
    signOut(): Promise<void>;
    /**
     * Get the current wallet/signer address.
     * @returns Address or undefined if not connected
     */
    address(): string | undefined;
    /**
     * Get the current chain ID.
     * @returns Chain ID or undefined if not connected
     */
    chainId(): number | undefined;
    /**
     * Sign a message with the connected wallet/signer.
     * @param message - Message to sign
     * @returns Signature hex string
     */
    signMessage(message: string): Promise<string>;
    /**
     * Get the current space ID.
     * @returns Space ID or undefined if not available
     */
    getSpaceId?(): string | undefined;
    /**
     * Ensure the user's space exists on the TinyCloud server.
     * Creates the space if it doesn't exist (when autoCreateSpace is true).
     * This is called automatically during sign-in but can be invoked manually.
     */
    ensureSpaceExists?(): Promise<void>;
}
/**
 * Configuration for creating a UserAuthorization instance.
 */
interface UserAuthorizationConfig {
    /** The signer to use for signing */
    signer: ISigner;
    /** Session storage implementation */
    sessionStorage?: ISessionStorage;
    /** Default SIWE configuration */
    siweConfig?: SiweConfig;
    /** Domain for SIWE messages */
    domain?: string;
    /** Extensions to apply */
    extensions?: Extension[];
    /** Strategy for handling sign requests (default: auto-sign for node, callback for web) */
    signStrategy?: SignStrategy;
    /** Handler for space creation confirmation (default: AutoApproveSpaceCreationHandler) */
    spaceCreationHandler?: ISpaceCreationHandler;
    /** Whether to automatically create space if it doesn't exist */
    autoCreateSpace?: boolean;
    /** Space name prefix (default: "default") */
    spacePrefix?: string;
    /** TinyCloud host URLs */
    tinycloudHosts?: string[];
    /** Session expiration in milliseconds */
    sessionExpirationMs?: number;
}

/**
 * Configuration for the TinyCloud SDK.
 */
interface TinyCloudConfig {
    /** Whether to automatically resolve ENS names */
    resolveEns?: boolean;
    /**
     * TinyCloud host URLs.
     * Required when using services.
     */
    hosts?: string[];
    /**
     * Platform-specific invoke function from WASM binding.
     * Required when using services.
     */
    invoke?: InvokeFunction;
    /**
     * Optional multi-resource invoke function for aggregated capability requests.
     */
    invokeAny?: InvokeAnyFunction;
    /**
     * Custom fetch implementation.
     * Defaults to globalThis.fetch.
     */
    fetch?: FetchFunction;
    /**
     * Service constructors to register.
     * Built-in services (like KVService) are registered by default unless overridden.
     *
     * @example
     * ```typescript
     * services: {
     *   kv: KVService,  // default
     *   files: MyFileService,  // custom
     * }
     * ```
     */
    services?: Record<string, ServiceConstructor>;
    /**
     * Per-service configuration.
     *
     * @example
     * ```typescript
     * serviceConfigs: {
     *   kv: { prefix: 'myapp' },
     *   files: { maxSize: 10_000_000 },
     * }
     * ```
     */
    serviceConfigs?: Record<string, Record<string, unknown>>;
    /**
     * Retry policy for service operations.
     */
    retryPolicy?: Partial<RetryPolicy>;
    /**
     * Default-off telemetry for service operation timing.
     */
    telemetry?: TelemetryConfig;
}
/**
 * TinyCloud SDK - Unified entry point for web and node.
 *
 * This class provides the main SDK interface. Platform-specific behavior
 * is injected through the IUserAuthorization implementation:
 * - WebUserAuthorization for browser environments
 * - NodeUserAuthorization for Node.js environments
 *
 * @example
 * ```typescript
 * // Web usage
 * import { TinyCloud } from '@tinycloud/sdk-core';
 * import { WebUserAuthorization } from '@tinycloud/web-sdk';
 *
 * const auth = new WebUserAuthorization({ ... });
 * const tc = new TinyCloud(auth);
 * await tc.signIn();
 * const result = await tc.kv.put('key', 'value');
 *
 * // Node usage
 * import { TinyCloud } from '@tinycloud/sdk-core';
 * import { NodeUserAuthorization, PrivateKeySigner } from '@tinycloud/node-sdk';
 *
 * const signer = new PrivateKeySigner(process.env.PRIVATE_KEY);
 * const auth = new NodeUserAuthorization({
 *   signStrategy: { type: 'auto-sign' },
 *   signer,
 *   domain: 'api.myapp.com'
 * });
 * const tc = new TinyCloud(auth);
 * await tc.signIn();
 * ```
 */
declare class TinyCloud {
    /**
     * User authorization handler.
     * Provides authentication and signing capabilities.
     */
    readonly userAuthorization: IUserAuthorization;
    /**
     * SDK configuration.
     */
    private config;
    /**
     * Registered extensions.
     */
    private extensions;
    /**
     * Service context providing platform dependencies to services.
     */
    private _serviceContext?;
    /**
     * Registered services by name.
     */
    private _services;
    /**
     * Whether services have been initialized.
     */
    private _servicesInitialized;
    /**
     * Create a new TinyCloud SDK instance.
     *
     * @param userAuthorization - Platform-specific authorization implementation
     * @param config - Optional SDK configuration
     */
    constructor(userAuthorization: IUserAuthorization, config?: TinyCloudConfig);
    /**
     * Initialize services with platform dependencies.
     * Must be called before using services.
     *
     * @param invoke - Platform-specific invoke function from WASM binding
     * @param hosts - TinyCloud host URLs (optional, uses config.hosts)
     * @param fetchFn - Custom fetch implementation (optional)
     */
    initializeServices(invoke?: InvokeFunction, hosts?: string[], fetchFn?: FetchFunction): void;
    /**
     * Get the service context.
     * @throws Error if services are not initialized
     */
    get serviceContext(): IServiceContext;
    /**
     * Get a registered service by name.
     *
     * @param name - Service name (e.g., 'kv')
     * @returns The service instance or undefined
     */
    getService<T extends IService>(name: string): T | undefined;
    /**
     * Get the KV service.
     * @throws Error if services are not initialized
     */
    get kv(): IKVService;
    /**
     * Get the SQL service.
     * @throws Error if services are not initialized
     */
    get sql(): ISQLService;
    /**
     * Get the DuckDB service.
     * @throws Error if services are not initialized
     */
    get duckdb(): IDuckDbService;
    /**
     * Get the Hooks service.
     * @throws Error if services are not initialized
     */
    get hooks(): IHooksService;
    /**
     * Get the Data Vault service.
     * @throws Error if services are not initialized or vault service is not registered
     */
    get vault(): IDataVaultService;
    /**
     * Get the Encryption service.
     * @throws Error if services are not initialized or encryption service is not registered
     */
    get encryption(): IEncryptionService;
    /**
     * Notify services of session change.
     * Called internally after sign-in and sign-out.
     *
     * @param session - The new session, or null if signed out
     */
    private notifyServicesOfSessionChange;
    /**
     * Abort all pending service operations.
     * Called internally before sign-out.
     */
    private abortServiceOperations;
    /**
     * Convert ClientSession to ServiceSession.
     * Returns null if session lacks required fields.
     */
    private toServiceSession;
    /**
     * Add an extension to the SDK.
     * Extensions can add capabilities and lifecycle hooks.
     */
    extend(extension: Extension): void;
    /**
     * Check if an extension is enabled.
     * @param namespace - The extension namespace to check
     */
    isExtensionEnabled(namespace: string): boolean;
    /**
     * Get the current session, if signed in.
     */
    get session(): ClientSession | undefined;
    /**
     * Check if the user is signed in.
     */
    get isSignedIn(): boolean;
    /**
     * Sign in and create a new session.
     * Notifies services of the new session after successful sign-in.
     * @param options - Optional per-call SIWE overrides for this sign-in only
     * @returns The new session
     */
    signIn(options?: SignInOptions): Promise<ClientSession>;
    /**
     * Sign out and clear the current session.
     * Aborts pending service operations and notifies services.
     */
    signOut(): Promise<void>;
    /**
     * Get the current wallet address.
     */
    address(): string | undefined;
    /**
     * Get the current chain ID.
     */
    chainId(): number | undefined;
    /**
     * Sign a message with the connected wallet.
     * @param message - Message to sign
     */
    signMessage(message: string): Promise<string>;
    /**
     * Cached public KV service instance.
     */
    private _publicKV?;
    /**
     * Construct the deterministic public space ID for a given address and chain ID.
     *
     * @param address - Ethereum address (0x-prefixed)
     * @param chainId - Chain ID (e.g., 1 for mainnet)
     * @returns The public space ID
     */
    static makePublicSpaceId(address: string, chainId: number): string;
    /**
     * Ensure the user's public space exists.
     * Creates it via spaces.create('public') if it doesn't.
     * Called automatically by modules that need to publish data.
     *
     * Requires the user to be signed in and services to be initialized.
     */
    ensurePublicSpace(): Promise<Result$1<void, ServiceError>>;
    /**
     * Get a KVService scoped to the user's own public space.
     * Writes require authentication (owner/delegate).
     *
     * @throws Error if not signed in or services not initialized
     */
    get publicKV(): IKVService;
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
    static readPublicSpace<T = unknown>(host: string, spaceId: string, key: string, fetchFn?: FetchFunction): Promise<Result$1<T, ServiceError>>;
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
    static readPublicKey<T = unknown>(host: string, address: string, chainId: number, key: string, fetchFn?: FetchFunction): Promise<Result$1<T, ServiceError>>;
}

/**
 * DelegationManager - Handles delegation CRUD operations.
 *
 * This class manages the creation, revocation, listing, and querying
 * of delegations within TinyCloud. It extracts and improves upon the
 * delegation functionality previously in ITinyCloudStorage.
 *
 * @packageDocumentation
 */

/**
 * DelegationManager handles all delegation-related operations.
 *
 * @example
 * ```typescript
 * import { DelegationManager } from "@tinycloud/sdk-core/delegations";
 *
 * const delegations = new DelegationManager({
 *   hosts: ["https://node.tinycloud.xyz"],
 *   session,
 *   invoke,
 * });
 *
 * // Create a delegation
 * const result = await delegations.create({
 *   delegateDID: "did:pkh:eip155:1:0x...",
 *   path: "shared/",
 *   actions: ["tinycloud.kv/get", "tinycloud.kv/list"],
 *   expiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
 * });
 *
 * if (result.ok) {
 *   console.log("Created delegation:", result.data.cid);
 * }
 * ```
 */
declare class DelegationManager {
    private hosts;
    private session;
    private invoke;
    private fetchFn;
    /**
     * Creates a new DelegationManager instance.
     *
     * @param config - Configuration including hosts, session, and invoke function
     */
    constructor(config: DelegationManagerConfig);
    /**
     * Updates the session (e.g., after re-authentication).
     *
     * @param session - New session to use for operations
     */
    updateSession(session: ServiceSession): void;
    /**
     * Gets the primary host URL.
     */
    private get host();
    /**
     * Executes an invoke operation against the delegation API.
     */
    private invokeOperation;
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
    create(params: CreateDelegationParams): Promise<Result<Delegation>>;
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
    revoke(cid: string): Promise<Result<void>>;
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
    list(): Promise<Result<Delegation[]>>;
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
    getChain(cid: string): Promise<Result<DelegationChain>>;
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
    checkPermission(path: string, action: string): Promise<Result<boolean>>;
}

/**
 * SharingService - v2 sharing link service with embedded private keys.
 *
 * This service implements the v2 sharing specification, which embeds private keys
 * directly in sharing links. This allows recipients to exercise delegations
 * without requiring prior session setup.
 *
 * Key differences from v1 SharingLinks:
 * - Private keys are embedded in the link (not just tokens)
 * - Recipients can optionally sub-delegate to their own session key
 * - Pre-configured KV service returned for immediate use
 *
 * @packageDocumentation
 */

/**
 * Data encoded in a sharing link.
 */
interface EncodedShareData {
    /** Private key in JWK format (includes d parameter) */
    key: JWK;
    /** DID of the key */
    keyDid: string;
    /** The delegation granting access */
    delegation: Delegation;
    /** Resource path this link grants access to */
    path: string;
    /** TinyCloud host URL */
    host: string;
    /** Space ID */
    spaceId: string;
    /** Schema version */
    version: 1;
}
/**
 * Options for receiving a sharing link.
 */
interface ReceiveOptions {
    /**
     * Whether to automatically create a sub-delegation to the current session key.
     * Default: true
     */
    autoSubdelegate?: boolean;
    /**
     * Whether to use the current session key for operations (requires autoSubdelegate).
     * Default: true
     */
    useSessionKey?: boolean;
    /**
     * Ingestion options passed to CapabilityKeyRegistry.
     */
    ingestOptions?: IngestOptions;
}
/**
 * Result of receiving a sharing link.
 */
interface ShareAccess {
    /** The delegation that was received/created */
    delegation: Delegation;
    /** Key info for the received key */
    key: KeyInfo;
    /** Pre-configured KV service for the shared path */
    kv: IKVService;
    /** The space ID */
    spaceId: string;
    /** The path prefix for this share */
    path: string;
}
/**
 * Configuration for SharingService.
 */
interface SharingServiceConfig {
    /** TinyCloud host URLs */
    hosts: string[];
    /**
     * Active session for authentication.
     * Required for generate(), optional for receive().
     */
    session?: ServiceSession;
    /** Platform-specific invoke function */
    invoke: InvokeFunction;
    /** Optional custom fetch implementation */
    fetch?: FetchFunction;
    /** Key provider for cryptographic operations */
    keyProvider: KeyProvider;
    /** Capability key registry for key/delegation management */
    registry: ICapabilityKeyRegistry;
    /**
     * Delegation manager for creating delegations (used if createDelegation not provided).
     * Required for generate(), optional for receive().
     */
    delegationManager?: DelegationManager;
    /** Factory for creating KV service instances */
    createKVService: (config: {
        hosts: string[];
        session: ServiceSession;
        invoke: InvokeFunction;
        fetch?: FetchFunction;
        pathPrefix?: string;
    }) => IKVService;
    /** Base URL for sharing links (e.g., "https://share.myapp.com") */
    baseUrl?: string;
    /**
     * Custom delegation creation function. When provided, this is used instead
     * of delegationManager.create(). This allows platforms to use their own
     * delegation creation logic (e.g., SIWE-based /delegate endpoint).
     */
    createDelegation?: (params: CreateDelegationParams) => Promise<Result<Delegation, DelegationError>>;
    /**
     * WASM function for client-side delegation creation.
     * When provided, this is preferred over server-side creation (createDelegation/delegationManager).
     * Creates UCAN delegations directly without requiring server roundtrip.
     */
    createDelegationWasm?: (params: CreateDelegationWasmParams) => CreateDelegationWasmResult;
    /**
     * Path prefix for KV operations.
     * When set, paths passed to generate() are prefixed with this value.
     * This ensures the share path matches the session's authorized paths.
     */
    pathPrefix?: string;
    /**
     * Session expiry time.
     * When set, sharing link expiry is clamped to not exceed this value
     * unless onRootDelegationNeeded is provided and returns a new delegation.
     */
    sessionExpiry?: Date;
    /**
     * Callback to create a DIRECT delegation from the root (wallet) to a share key.
     * This bypasses the session delegation chain, allowing share links with
     * expiry longer than the current session.
     *
     * When provided and share expiry > session expiry:
     * 1. SharingService creates the ephemeral share key
     * 2. This callback is invoked with the share key DID
     * 3. The callback signs a direct PKH -> share key delegation with the wallet
     * 4. The returned delegation is used for the share link
     *
     * This is the CORRECT solution for long-lived share links because:
     * - It creates a fresh delegation chain: PKH -> share key
     * - Not constrained by session expiry (no sub-delegation from session key)
     *
     * @param params - Parameters for creating the root delegation
     * @returns The delegation from wallet to share key, or undefined to fall back to session extension
     */
    onRootDelegationNeeded?: (params: {
        /** DID of the share key to delegate to */
        shareKeyDID: string;
        /** Space ID */
        spaceId: string;
        /** Path to grant access to */
        path: string;
        /** Actions to grant */
        actions: string[];
        /** Requested expiry time */
        requestedExpiry: Date;
    }) => Promise<Delegation | undefined>;
}
/**
 * Interface for the SharingService.
 */
interface ISharingService {
    /**
     * Generate a sharing link with an embedded private key.
     *
     * This creates a new session key, delegates to it, and encodes
     * the key and delegation into a shareable link.
     */
    generate(params: GenerateShareParams): Promise<Result<ShareLink, DelegationError>>;
    /**
     * Receive and activate a sharing link.
     *
     * Decodes the link, ingests the key into the registry, and optionally
     * creates a sub-delegation to the current session key.
     */
    receive(link: string, options?: ReceiveOptions): Promise<Result<ShareAccess, DelegationError>>;
    /**
     * Encode sharing data into a link string.
     */
    encodeLink(data: EncodedShareData, schema?: ShareSchema): string;
    /**
     * Decode a link string into sharing data.
     */
    decodeLink(link: string): EncodedShareData;
}
/**
 * SharingService - v2 sharing link service with embedded private keys.
 *
 * @example
 * ```typescript
 * import { SharingService } from "@tinycloud/sdk-core/delegations";
 *
 * const sharing = new SharingService({
 *   hosts: ["https://node.tinycloud.xyz"],
 *   session,
 *   invoke,
 *   keyProvider,
 *   registry,
 *   delegationManager,
 *   createKVService,
 *   baseUrl: "https://share.myapp.com"
 * });
 *
 * // Generate a sharing link
 * const result = await sharing.generate({
 *   path: "/kv/documents/report.pdf",
 *   actions: ["tinycloud.kv/get"],
 *   expiry: new Date("2024-12-31")
 * });
 *
 * if (result.ok) {
 *   console.log("Share this URL:", result.data.url);
 * }
 *
 * // Receive a sharing link
 * const receiveResult = await sharing.receive(shareUrl);
 * if (receiveResult.ok) {
 *   // Use the pre-configured KV service
 *   const data = await receiveResult.data.kv.get("report.pdf");
 * }
 * ```
 */
declare class SharingService implements ISharingService {
    private hosts;
    private session?;
    private invoke;
    private fetchFn;
    private keyProvider;
    private registry;
    private delegationManager?;
    private createKVService;
    private baseUrl;
    private createDelegationFn?;
    private createDelegationWasmFn?;
    private pathPrefix;
    private sessionExpiry?;
    private onRootDelegationNeeded?;
    /**
     * Creates a new SharingService instance.
     */
    constructor(config: SharingServiceConfig);
    /**
     * Gets the primary host URL.
     */
    private get host();
    /**
     * Updates the session (e.g., after re-authentication).
     */
    updateSession(session: ServiceSession): void;
    /**
     * Updates the service configuration.
     * Used to add full capabilities (session, delegationManager, createDelegation, createDelegationWasm) after signIn.
     */
    updateConfig(config: Partial<Pick<SharingServiceConfig, "session" | "delegationManager" | "createDelegation" | "createDelegationWasm" | "sessionExpiry" | "onRootDelegationNeeded">>): void;
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
    generate(params: GenerateShareParams): Promise<Result<ShareLink, DelegationError>>;
    /**
     * Check if any key in the registry can satisfy the delegation request.
     * A key can satisfy if it has a delegation that:
     * 1. Covers the required path (exact match or parent path)
     * 2. Has all required actions
     * 3. Has sufficient expiry (delegation.expiry >= requestedExpiry)
     * 4. Allows sub-delegation
     * @internal
     */
    private findSuitableKeyForDelegation;
    /**
     * Check if a delegation path matches/covers the requested path.
     * A delegation path covers the request if:
     * - It's an exact match
     * - It's a parent path (e.g., delegation for "" covers "foo/bar")
     * - It uses wildcards that match
     * @internal
     */
    private pathMatches;
    /**
     * Handle fallback to session extension when root delegation is not available.
     * @internal
     */
    private handleSessionExtensionFallback;
    /**
     * Create a delegation from the current session to a share key.
     * This is the fallback path when root delegation is not available.
     * @internal
     */
    private createSessionDelegation;
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
    receive(link: string, options?: ReceiveOptions): Promise<Result<ShareAccess, DelegationError>>;
    /**
     * Encode sharing data into a link string.
     *
     * @param data - The share data to encode
     * @param schema - The encoding schema (default: "base64")
     * @returns Encoded link string
     */
    encodeLink(data: EncodedShareData, schema?: ShareSchema): string;
    /**
     * Decode a link string into sharing data.
     *
     * @param link - The encoded link string (may include URL prefix)
     * @returns Decoded share data
     * @throws Error if link format is invalid or data fails validation
     */
    decodeLink(link: string): EncodedShareData;
    /**
     * Decode and validate a link string into sharing data.
     *
     * Internal method that returns a Result instead of throwing.
     * Used by receive() for proper error handling.
     *
     * @param link - The encoded link string (may include URL prefix)
     * @returns Result with decoded share data or validation error
     */
    private decodeLinkWithValidation;
}
/**
 * Create a new SharingService instance.
 */
declare function createSharingService(config: SharingServiceConfig): ISharingService;

/**
 * Interface for space-scoped delegation operations.
 *
 * Provides delegation management scoped to a specific space.
 */
interface ISpaceScopedDelegations {
    /**
     * List delegations created by the user in this space (outgoing).
     */
    list(): Promise<Result$1<Delegation[], ServiceError>>;
    /**
     * List delegations received by the user for this space (incoming).
     */
    listReceived(): Promise<Result$1<Delegation[], ServiceError>>;
    /**
     * Create a delegation within this space.
     */
    create(params: Omit<CreateDelegationParams, "spaceId">): Promise<Result$1<Delegation, ServiceError>>;
    /**
     * Revoke a delegation within this space.
     */
    revoke(cid: string): Promise<Result$1<void, ServiceError>>;
}
/**
 * Interface for space-scoped sharing operations.
 *
 * Provides sharing link management scoped to a specific space.
 */
interface ISpaceScopedSharing {
    /**
     * Generate a sharing link for a resource in this space.
     */
    generate(params: Omit<GenerateShareParams, "spaceId">): Promise<Result$1<ShareLink, ServiceError>>;
    /**
     * List active sharing links in this space.
     */
    list(): Promise<Result$1<ShareLink[], ServiceError>>;
    /**
     * Revoke a sharing link.
     */
    revoke(token: string): Promise<Result$1<void, ServiceError>>;
}
/**
 * Interface for a Space object.
 *
 * Provides scoped access to services within a specific space.
 */
interface ISpace {
    /**
     * The space identifier.
     */
    readonly id: string;
    /**
     * The short name of the space.
     */
    readonly name: string;
    /**
     * KV operations scoped to this space.
     */
    readonly kv: IKVService;
    /**
     * Data Vault operations scoped to this space.
     */
    readonly vault: IDataVaultService;
    /**
     * Secrets operations scoped to this space.
     */
    readonly secrets: ISecretsService;
    /**
     * Delegation operations scoped to this space.
     */
    readonly delegations: ISpaceScopedDelegations;
    /**
     * Sharing operations scoped to this space.
     */
    readonly sharing: ISpaceScopedSharing;
    /**
     * Get space metadata.
     */
    info(): Promise<Result$1<SpaceInfo, ServiceError>>;
}
/**
 * Configuration for creating a Space object.
 */
interface SpaceConfig {
    /**
     * The space identifier (full URI).
     */
    id: string;
    /**
     * The short name of the space.
     */
    name: string;
    /**
     * Factory function to create a space-scoped KV service.
     */
    createKV: (spaceId: string) => IKVService;
    /**
     * Factory function to create a space-scoped Data Vault service.
     */
    createVault: (spaceId: string) => IDataVaultService;
    /**
     * Factory function to create a space-scoped secrets service.
     */
    createSecrets?: (spaceId: string) => ISecretsService;
    /**
     * Factory function to create space-scoped delegations.
     */
    createDelegations: (spaceId: string) => ISpaceScopedDelegations;
    /**
     * Factory function to create space-scoped sharing.
     */
    createSharing: (spaceId: string) => ISpaceScopedSharing;
    /**
     * Function to get space info.
     */
    getInfo: (spaceId: string) => Promise<Result$1<SpaceInfo, ServiceError>>;
}
/**
 * Space - Provides scoped access to services within a specific space.
 *
 * @example
 * ```typescript
 * const space = sdk.space('default');
 *
 * // KV operations scoped to this space
 * await space.kv.put('key', 'value');
 * const result = await space.kv.get('key');
 *
 * // Delegation operations scoped to this space
 * await space.delegations.create({
 *   delegateDID: 'did:pkh:eip155:1:0x...',
 *   path: '/shared/',
 *   actions: ['tinycloud.kv/get']
 * });
 *
 * // Get space metadata
 * const info = await space.info();
 * ```
 */
declare class Space implements ISpace {
    private readonly _id;
    private readonly _name;
    private readonly _kv;
    private readonly _vault;
    private readonly _secrets;
    private readonly _delegations;
    private readonly _sharing;
    private readonly _getInfo;
    /**
     * Create a new Space instance.
     *
     * @param config - Space configuration
     */
    constructor(config: SpaceConfig);
    /**
     * The space identifier (full URI).
     */
    get id(): string;
    /**
     * The short name of the space.
     */
    get name(): string;
    /**
     * KV operations scoped to this space.
     */
    get kv(): IKVService;
    /**
     * Data Vault operations scoped to this space.
     */
    get vault(): IDataVaultService;
    /**
     * Secrets operations scoped to this space.
     */
    get secrets(): ISecretsService;
    /**
     * Delegation operations scoped to this space.
     */
    get delegations(): ISpaceScopedDelegations;
    /**
     * Sharing operations scoped to this space.
     */
    get sharing(): ISpaceScopedSharing;
    /**
     * Get space metadata.
     *
     * @returns Result containing space information
     */
    info(): Promise<Result$1<SpaceInfo, ServiceError>>;
}

/**
 * SpaceService - Global singleton for managing spaces (owned and delegated).
 *
 * SpaceService provides a unified interface for discovering, creating,
 * and accessing spaces. It handles both owned spaces (created by the user)
 * and delegated spaces (shared by other users).
 *
 * @packageDocumentation
 */

/**
 * Error codes for SpaceService operations.
 */
declare const SpaceErrorCodes: {
    /** Space not found */
    readonly NOT_FOUND: "SPACE_NOT_FOUND";
    /** Space already exists */
    readonly ALREADY_EXISTS: "SPACE_ALREADY_EXISTS";
    /** Creation failed */
    readonly CREATION_FAILED: "SPACE_CREATION_FAILED";
    /** Authentication required */
    readonly AUTH_REQUIRED: "AUTH_REQUIRED";
    /** Invalid space name or URI */
    readonly INVALID_NAME: "INVALID_SPACE_NAME";
    /** Network error */
    readonly NETWORK_ERROR: "NETWORK_ERROR";
    /** Not initialized */
    readonly NOT_INITIALIZED: "NOT_INITIALIZED";
};
type SpaceErrorCode = (typeof SpaceErrorCodes)[keyof typeof SpaceErrorCodes];
/**
 * Parameters for creating a space-scoped delegation.
 * Extends CreateDelegationParams with the spaceId.
 */
interface SpaceDelegationParams extends Omit<CreateDelegationParams, "spaceId"> {
    /** The space ID to create the delegation for */
    spaceId: string;
}
/**
 * Function type for creating delegations.
 * Platform SDKs provide this to handle SIWE-based delegation creation.
 */
type CreateDelegationFunction = (params: SpaceDelegationParams) => Promise<Result$1<Delegation, ServiceError>>;
/**
 * Configuration for SpaceService.
 */
interface SpaceServiceConfig {
    /** TinyCloud host URLs */
    hosts: string[];
    /** Active session for authentication */
    session: ServiceSession;
    /** Platform-specific invoke function */
    invoke: InvokeFunction;
    /** Optional custom fetch implementation */
    fetch?: FetchFunction;
    /** Optional capability key registry for delegated space discovery */
    capabilityRegistry?: ICapabilityKeyRegistry;
    /** Factory function to create a space-scoped KV service */
    createKVService?: (spaceId: string) => IKVService;
    /** Factory function to create a space-scoped Data Vault service */
    createVaultService?: (spaceId: string) => IDataVaultService;
    /** Factory function to create a space-scoped secrets service */
    createSecretsService?: (spaceId: string) => ISecretsService;
    /** User's PKH DID (derived from address or provided explicitly) */
    userDid?: string;
    /** Optional SharingService for v2 sharing links (client-side) */
    sharingService?: ISharingService;
    /**
     * Factory function to create delegations using SIWE-based flow.
     * Platform SDKs (web-sdk, node-sdk) provide this using their WASM bindings.
     * Required for space.delegations.create() to work.
     */
    createDelegation?: CreateDelegationFunction;
    /** Optional best-effort hook after the SDK discovers or creates a space. */
    onSpaceRegistered?: (space: SpaceInfo) => void | Promise<void>;
}
/**
 * Interface for SpaceService.
 */
interface ISpaceService {
    /**
     * List all spaces the user has access to (owned + delegated).
     */
    list(): Promise<Result$1<SpaceInfo[], ServiceError>>;
    /**
     * Create a new space.
     *
     * @param name - The name for the new space
     */
    create(name: string): Promise<Result$1<SpaceInfo, ServiceError>>;
    /**
     * Get a Space object by name or full URI.
     *
     * For owned spaces, use the short name: `sdk.space('default')`
     * For delegated spaces, use the full URI: `sdk.space('tinycloud:pkh:eip155:1:0x...:photos')`
     *
     * @param nameOrUri - Short name or full URI
     */
    get(nameOrUri: string): ISpace;
    /**
     * Check if a space exists and the user has access.
     *
     * @param nameOrUri - Short name or full URI
     */
    exists(nameOrUri: string): Promise<Result$1<boolean, ServiceError>>;
    /**
     * Get the current user's primary space ID.
     */
    getCurrentSpaceId(): string | undefined;
    /**
     * Update the service configuration.
     */
    updateConfig(config: Partial<SpaceServiceConfig>): void;
}
/**
 * Construct the deterministic public space ID for a given address and chain ID.
 *
 * Public space IDs follow the format:
 * `tinycloud:pkh:eip155:{chainId}:{address}:public`
 *
 * Given an address and chain ID, any client can construct this ID
 * to discover and read a user's public data without prior interaction.
 *
 * @param address - Ethereum address (0x-prefixed)
 * @param chainId - Chain ID (e.g., 1 for mainnet)
 * @returns The full public space ID URI
 *
 * @example
 * ```typescript
 * const spaceId = makePublicSpaceId('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', 1);
 * // => "tinycloud:pkh:eip155:1:0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045:public"
 * ```
 */
declare function makePublicSpaceId(address: string, chainId: number): string;
/**
 * Parse a space URI to extract components.
 *
 * Full URI format: `tinycloud:pkh:eip155:{chainId}:{address}:{name}`
 * Short name format: `{name}`
 *
 * @param uri - The space URI or short name
 * @returns Parsed components or null if invalid
 */
declare function parseSpaceUri(uri: string): {
    owner: string;
    name: string;
    chainId?: string;
    address?: string;
} | null;
/**
 * Build a full space URI from components.
 *
 * @param owner - Owner DID (did:pkh:eip155:{chainId}:{address})
 * @param name - Space name
 * @returns Full space URI
 */
declare function buildSpaceUri(owner: string, name: string): string;
/**
 * SpaceService - Global singleton for managing spaces.
 *
 * @example
 * ```typescript
 * const spaceService = new SpaceService({
 *   hosts: ['https://node.tinycloud.xyz'],
 *   session,
 *   invoke,
 * });
 *
 * // List all accessible spaces
 * const result = await spaceService.list();
 * if (result.ok) {
 *   for (const space of result.data) {
 *     console.log(`${space.name} (${space.type})`);
 *   }
 * }
 *
 * // Create a new space
 * const createResult = await spaceService.create('photos');
 *
 * // Get a space object for operations
 * const space = spaceService.get('photos');
 * await space.kv.put('album/vacation', { photos: [...] });
 * ```
 */
declare class SpaceService implements ISpaceService {
    private hosts;
    private session;
    private invoke;
    private fetchFn;
    private capabilityRegistry?;
    private createKVServiceFn?;
    private createVaultServiceFn?;
    private createSecretsServiceFn?;
    private _userDid?;
    private sharingService?;
    private createDelegationFn?;
    private onSpaceRegisteredFn?;
    /** Cache of created Space objects */
    private spaceCache;
    /** Cache of space info */
    private infoCache;
    /** Cache TTL in milliseconds (5 minutes) */
    private readonly cacheTTL;
    /**
     * Create a new SpaceService instance.
     *
     * @param config - Service configuration
     */
    constructor(config: SpaceServiceConfig);
    /**
     * Update the service configuration.
     */
    updateConfig(config: Partial<SpaceServiceConfig>): void;
    /**
     * Get the current user's primary space ID.
     */
    getCurrentSpaceId(): string | undefined;
    /**
     * Get the primary host URL.
     */
    private get host();
    /**
     * Get the current user's PKH DID.
     */
    private get userDid();
    /**
     * List all spaces the user has access to.
     *
     * Combines owned spaces (from the server) with delegated spaces
     * (from the capability registry).
     */
    list(): Promise<Result$1<SpaceInfo[], ServiceError>>;
    /**
     * List owned spaces from the server.
     */
    private listOwnedSpaces;
    /**
     * Discover delegated spaces from the capability registry.
     */
    private discoverDelegatedSpaces;
    /**
     * Extract space name from a full space ID.
     */
    private extractNameFromId;
    /**
     * Deduplicate spaces, preferring owned over delegated.
     */
    private deduplicateSpaces;
    /**
     * Create a new space.
     *
     * @param name - The name for the new space
     */
    create(name: string): Promise<Result$1<SpaceInfo, ServiceError>>;
    private notifySpaceRegistered;
    /**
     * Get a Space object by name or full URI.
     *
     * @param nameOrUri - Short name or full URI
     */
    get(nameOrUri: string): ISpace;
    /**
     * Resolve a name or URI to a full space ID.
     */
    private resolveSpaceId;
    /**
     * Check if a space exists and the user has access.
     */
    exists(nameOrUri: string): Promise<Result$1<boolean, ServiceError>>;
    /**
     * Get space info from server or cache.
     */
    private getSpaceInfo;
    /**
     * Create a space-scoped KV service.
     */
    private createSpaceScopedKV;
    /**
     * Create a space-scoped Data Vault service.
     */
    private createSpaceScopedVault;
    /**
     * Create a space-scoped secrets service.
     */
    private createSpaceScopedSecrets;
    /**
     * Create space-scoped delegation operations.
     */
    private createSpaceScopedDelegations;
    /**
     * Create space-scoped sharing operations.
     *
     * When a SharingService is configured, delegates to client-side v2 sharing.
     * V2 sharing links are self-contained with embedded private keys - no server tracking.
     */
    private createSpaceScopedSharing;
}
/**
 * Create a new SpaceService instance.
 *
 * @param config - Service configuration
 * @returns A new SpaceService instance
 */
declare function createSpaceService(config: SpaceServiceConfig): ISpaceService;

interface AccountApplication {
    appId: string;
    manifests: Manifest[];
    updatedAt?: string;
    name?: string;
    description?: string;
    manifestHash?: string;
}
interface AccountSpace {
    spaceId: string;
    name: string;
    ownerDid: string;
    type: "owned" | "delegated" | "discovered";
    permissions: string[];
    status: "active" | "archived";
    registeredAt?: string;
    updatedAt?: string;
    expiresAt?: Date;
}
interface AccountDelegation {
    cid: string;
    direction: "granted" | "received";
    spaceId: string;
    spaceName?: string;
    counterpartyDid: string;
    delegateDid: string;
    delegatorDid?: string;
    path: string;
    actions: string[];
    expiry: Date;
    status: "active" | "expired" | "revoked";
    createdAt?: Date;
}
interface AccountStatus {
    did: string;
    host: string;
    primarySpaceId?: string;
    accountSpaceId?: string;
    applications: number;
    spaces: number;
    grantedDelegations: number;
    receivedDelegations: number;
}
interface AccountIndexRebuildResult {
    database: string;
    applications: number;
    spaces: number;
    delegations: number;
    syncedAt: string;
}
interface AccountIndexEnsureResult {
    database: string;
}
interface AccountIndexedReadOptions {
    preferIndex?: boolean;
    refreshIndex?: boolean;
}
type AccountApplicationListOptions = AccountIndexedReadOptions;
type AccountSpaceListOptions = AccountIndexedReadOptions;
interface AccountDelegationListOptions {
    direction?: "granted" | "received" | "all";
    space?: string;
    preferIndex?: boolean;
    refreshIndex?: boolean;
}
interface AccountDelegationRevokeOptions {
    cid: string;
    space: string;
}
interface AccountServiceConfig {
    getDid: () => string;
    getHost: () => string;
    getPrimarySpaceId: () => string | undefined;
    getAccountSpaceId: () => string | undefined;
    getSpaces: () => ISpaceService;
    getAccountDb?: () => IDatabaseHandle | undefined;
    ensureAccountSpaceHosted?: () => Promise<void>;
}
declare class AccountService {
    private readonly config;
    constructor(config: AccountServiceConfig);
    status(): Promise<Result$1<AccountStatus>>;
    readonly applications: {
        list: (options?: AccountApplicationListOptions) => Promise<Result$1<AccountApplication[]>>;
        get: (appId: string) => Promise<Result$1<AccountApplication>>;
        register: (manifest: Manifest | Manifest[]) => Promise<Result$1<AccountApplication>>;
        remove: (appId: string) => Promise<Result$1<void>>;
    };
    readonly spaces: {
        list: (options?: AccountSpaceListOptions) => Promise<Result$1<AccountSpace[]>>;
        get: (spaceId: string) => Promise<Result$1<AccountSpace>>;
        register: (space: SpaceInfo | AccountSpace) => Promise<Result$1<AccountSpace>>;
        syncAccessible: () => Promise<Result$1<AccountSpace[]>>;
        remove: (spaceId: string) => Promise<Result$1<void>>;
    };
    readonly delegations: {
        list: (options?: AccountDelegationListOptions) => Promise<Result$1<AccountDelegation[]>>;
        revoke: (options: AccountDelegationRevokeOptions) => Promise<Result$1<void>>;
    };
    readonly index: {
        ensure: () => Promise<Result$1<AccountIndexEnsureResult>>;
        rebuild: () => Promise<Result$1<AccountIndexRebuildResult>>;
        applications: {
            list: () => Promise<Result$1<AccountApplication[]>>;
        };
        spaces: {
            list: () => Promise<Result$1<AccountSpace[]>>;
        };
        delegations: {
            list: (options?: AccountDelegationListOptions) => Promise<Result$1<AccountDelegation[]>>;
        };
        query: <T = Record<string, unknown>>(sql: string, params?: SqlValue[]) => Promise<Result$1<QueryResponse<T>>>;
        status: () => Promise<Result$1<AccountIndexStatus>>;
    };
    private accountKV;
    private accountDb;
    private indexHasApplicationHash;
    private upsertApplicationIndexQuietly;
    private upsertApplicationIndex;
    private deleteApplicationIndexQuietly;
    private deleteApplicationIndex;
    private upsertSpaceIndexQuietly;
    private upsertSpaceIndex;
    private deleteSpaceIndexQuietly;
    private deleteSpaceIndex;
    private resolveSpace;
    private replaceApplicationsIndexQuietly;
    private replaceSpacesIndexQuietly;
    private replaceDelegationsIndexQuietly;
    private ensureAccountIndex;
}
interface AccountIndexStatus {
    database: string;
    state: "ready" | "missing";
    sources: Array<{
        source: string;
        syncedAt: string;
        count: number;
    }>;
}

/**
 * Shared space utilities for TinyCloud.
 *
 * These functions are platform-agnostic and can be used by both
 * web-sdk and node-sdk for space hosting and session activation.
 */
/**
 * Result of a space hosting or session activation attempt.
 */
interface SpaceHostResult {
    /** Whether the operation succeeded (2xx status) */
    success: boolean;
    /** HTTP status code */
    status: number;
    /** Error message if failed */
    error?: string;
    /** Space IDs that were successfully activated */
    activated?: string[];
    /** Space IDs that were skipped (e.g., space doesn't exist yet) */
    skipped?: string[];
}
/**
 * Fetch the peer ID from TinyCloud server for space hosting.
 *
 * The peer ID identifies the TinyCloud server instance that will host the space.
 *
 * @param host - TinyCloud server URL (e.g., "https://node.tinycloud.xyz")
 * @param spaceId - The space ID to host
 * @returns The peer ID string
 * @throws Error if the request fails
 */
declare function fetchPeerId(host: string, spaceId: string): Promise<string>;
/**
 * Submit a space hosting delegation to TinyCloud server.
 *
 * This registers a new space with the server, allowing the user
 * to store data in it.
 *
 * @param host - TinyCloud server URL
 * @param headers - Delegation headers (from siweToDelegationHeaders)
 * @returns Result indicating success/failure
 */
declare function submitHostDelegation(host: string, headers: Record<string, string>): Promise<SpaceHostResult>;
/**
 * Activate a session with TinyCloud server.
 *
 * This submits the session delegation to the server, enabling the session
 * key to perform operations on behalf of the user.
 *
 * @param host - TinyCloud server URL
 * @param delegationHeader - Session delegation header (from session.delegationHeader)
 * @returns Result indicating success/failure (404 means space doesn't exist)
 */
declare function activateSessionWithHost(host: string, delegationHeader: {
    Authorization: string;
}): Promise<SpaceHostResult>;

/**
 * Protocol version checking for SDK-to-node compatibility.
 *
 * @packageDocumentation
 */
declare class ProtocolMismatchError extends Error {
    readonly sdkProtocol: number;
    readonly nodeProtocol: number;
    readonly nodeVersion: string;
    readonly host: string;
    name: "ProtocolMismatchError";
    constructor(sdkProtocol: number, nodeProtocol: number, nodeVersion: string, host: string);
}
declare class VersionCheckError extends Error {
    readonly host: string;
    readonly cause?: Error | undefined;
    name: "VersionCheckError";
    constructor(host: string, cause?: Error | undefined);
}
declare class UnsupportedFeatureError extends Error {
    readonly feature: string;
    readonly host: string;
    readonly availableFeatures: string[];
    name: "UnsupportedFeatureError";
    constructor(feature: string, host: string, availableFeatures: string[]);
}
interface NodeInfo {
    features: string[];
    nodeId?: string;
    quotaUrl?: string;
}
declare function checkNodeInfo(host: string, sdkProtocol: number, fetchFn?: typeof globalThis.fetch): Promise<NodeInfo>;

/**
 * TinyCloud location registry helpers.
 *
 * The registry maps a DID to one or more multiaddrs. Registry records are
 * signed by the DID subject; centralized storage is only a discovery cache.
 */
interface LocationRecordPayload {
    version: 1;
    subject: string;
    multiaddrs: string[];
    updated_at: string;
    sequence: number;
}
interface LocationRecord extends LocationRecordPayload {
    signature: string;
}
type LocationSource = "explicit" | "blockchain" | "centralized" | "fallback";
declare const DEFAULT_TINYCLOUD_LOCATION_REGISTRY_URL = "https://registry.tinycloud.xyz";
declare const DEFAULT_TINYCLOUD_FALLBACK_HOST = "https://node.tinycloud.xyz";
interface LocationCandidate {
    source: LocationSource;
    multiaddrs: string[];
    record?: LocationRecord;
}
interface LocationResolutionAttempt {
    source: LocationSource;
    candidate?: LocationCandidate;
    error?: Error;
}
interface ResolvedCloudLocation {
    subject: string;
    source: LocationSource;
    multiaddrs: string[];
    record?: LocationRecord;
    attempts: LocationResolutionAttempt[];
    resolvedAt: string;
}
interface ResolveCloudLocationOptions {
    /** Highest-priority location supplied directly by the caller. */
    explicitMultiaddrs?: string[];
    /** Optional blockchain resolver adapter. */
    blockchain?: (subject: string) => Promise<LocationCandidateInput | null | undefined>;
    /** Centralized location registry base URL, e.g. https://registry.tinycloud.xyz. */
    centralizedRegistryUrl?: string;
    /** Lowest-priority fallback location. */
    fallbackMultiaddrs?: string[];
    /** Custom fetch implementation. Defaults to globalThis.fetch. */
    fetch?: typeof fetch;
    /** Verify centralized/blockchain record signatures. Default true. */
    verifyRecords?: boolean;
}
interface ResolvedTinyCloudHosts {
    hosts: string[];
    location: ResolvedCloudLocation;
}
interface ResolveTinyCloudHostsOptions {
    /** Highest-priority TinyCloud HTTP host URLs or multiaddrs supplied directly. */
    explicitHosts?: string[];
    /** Optional blockchain resolver adapter. */
    blockchain?: ResolveCloudLocationOptions["blockchain"];
    /** Centralized location registry URL. Default https://registry.tinycloud.xyz. */
    registryUrl?: string | null;
    /** Lowest-priority fallback HTTP host URLs or multiaddrs. Default hosted TinyCloud node. */
    fallbackHosts?: string[] | null;
    /** Custom fetch implementation. Defaults to globalThis.fetch. */
    fetch?: typeof fetch;
    /** Verify centralized/blockchain record signatures. Default true. */
    verifyRecords?: boolean;
}
type LocationCandidateInput = string[] | LocationRecord | {
    multiaddrs: string[];
    record?: LocationRecord;
};
type LocationRecordSigner = {
    type: "did:pkh";
    signMessage(message: string): Promise<string>;
} | {
    type: "did:key";
    signBytes(bytes: Uint8Array): Promise<Uint8Array>;
};
declare class LocationRecordValidationError extends Error {
    constructor(message: string);
}
declare class CloudLocationResolutionError extends Error {
    readonly attempts: LocationResolutionAttempt[];
    constructor(subject: string, attempts: LocationResolutionAttempt[]);
}
declare function locationPayloadForRecord(record: LocationRecord): LocationRecordPayload;
declare function canonicalLocationPayload(payload: LocationRecordPayload): string;
declare function signLocationRecord(payload: LocationRecordPayload, signer: LocationRecordSigner): Promise<LocationRecord>;
declare function validateLocationRecordPayload(input: unknown): LocationRecordPayload;
declare function validateLocationRecord(input: unknown): LocationRecord;
declare function verifyLocationRecord(input: LocationRecord): Promise<boolean>;
declare function fetchLocationRecord(registryUrl: string, subject: string, fetchFn?: typeof fetch): Promise<LocationRecord | null>;
declare function resolveCloudLocation(subject: string, options?: ResolveCloudLocationOptions): Promise<ResolvedCloudLocation>;
declare function resolveTinyCloudHosts(subject: string, options?: ResolveTinyCloudHostsOptions): Promise<ResolvedTinyCloudHosts>;
declare function multiaddrToHttpUrl(input: string): string;
declare function httpUrlToMultiaddr(input: string): string;
declare function verifyDidKeyEd25519Signature(did: string, payload: Uint8Array, signature: Uint8Array): boolean;

/**
 * Default lifetimes for the various delegation shapes the SDK mints.
 *
 * The SDK has many delegation flows (session sign-in, runtime grants,
 * share links, manifest installs, public-space sub-delegations, …) and
 * each one used to pick its own number freehand. That made it hard to
 * tell whether a chosen value was deliberate or copy-pasted, and made
 * silent inconsistencies easy to ship.
 *
 * Every default below answers two questions:
 *  - Who recovers if the delegation leaks? (re-auth, revocation, no one)
 *  - Who is the principal at use time? (issuer, third party)
 *
 * The five tiers fall out of those answers. Pick a tier, not a number,
 * when introducing a new delegation surface.
 *
 * @packageDocumentation
 */
declare const EXPIRY: {
    readonly EPHEMERAL_MS: number;
    readonly SIGNED_READ_URL_MS: number;
    readonly SESSION_MS: number;
    readonly SHARE_MS: number;
    readonly APP_MS: number;
    readonly MAX_MS: number;
};
declare const DEFAULT_SIGNED_READ_URL_EXPIRY_MS: number;
type ExpiryTier = keyof typeof EXPIRY;

export { ACCOUNT_REGISTRY_PATH, ACCOUNT_REGISTRY_SPACE, type AbilitiesMap, type AccountApplication, type AccountApplicationListOptions, type AccountDelegation, type AccountDelegationListOptions, type AccountDelegationRevokeOptions, type AccountIndexEnsureResult, type AccountIndexRebuildResult, type AccountIndexStatus, type AccountIndexedReadOptions, AccountService, type AccountServiceConfig, type AccountSpace, type AccountSpaceListOptions, type AccountStatus, AutoApproveSpaceCreationHandler, type AutoRejectStrategy, type AutoSignStrategy, type Bytes, type CallbackStrategy, type CanonicalAddress, type CanonicalParsedNetworkId, type CapabilityEntry, CapabilityKeyRegistry, type CapabilityKeyRegistryErrorCode, CapabilityKeyRegistryErrorCodes, type ClientSession, ClientSessionSchema, CloudLocationResolutionError, type ComposeManifestOptions, type ComposedManifestRequest, type CreateDelegationFunction, type CreateDelegationParams, type CreateDelegationWasmParams, type CreateDelegationWasmResult, DEFAULT_DEFAULTS, DEFAULT_EXPIRY, DEFAULT_KNOWLEDGE_ROOT, DEFAULT_MANIFEST_SPACE, DEFAULT_MANIFEST_VERSION, DEFAULT_SIGNED_READ_URL_EXPIRY_MS, DEFAULT_TINYCLOUD_FALLBACK_HOST, DEFAULT_TINYCLOUD_LOCATION_REGISTRY_URL, type DelegatedResource, type Delegation, type DelegationApiResponse, type DelegationChain, type DelegationChainV2, type DelegationDirection, type DelegationError, type DelegationErrorCode, DelegationErrorCodes, type DelegationFilters, DelegationManager, type DelegationManagerConfig, type DelegationRecord, type Result as DelegationResult, type DidCacheKeyOptions, type DidEqualsOptions, ENCRYPTION_MANIFEST_SPACE, ENCRYPTION_PERMISSION_SERVICE, EXPIRY, type EncodedShareData, type EnsData, EnsDataSchema, type EventEmitterStrategy, type ExpiryTier, type Extension, type GenerateShareParams, type ICapabilityKeyRegistry, type IENSResolver, type INotificationHandler, type ISessionManager, type ISessionStorage, type ISharingService, type ISigner, type ISpace, type ISpaceCreationHandler, type ISpaceScopedDelegations, type ISpaceScopedSharing, type ISpaceService, type IUserAuthorization, type IWasmBindings, IdentityParseError, type IngestOptions, type JWK, type KeyInfo, type KeyProvider, type KeyType, type LocationCandidate, type LocationCandidateInput, type LocationRecord, type LocationRecordPayload, type LocationRecordSigner, LocationRecordValidationError, type LocationResolutionAttempt, type LocationSource, type Manifest, type ManifestDefaults, type ManifestKnowledge, type ManifestRegistryRecord, type ManifestSecretActions, ManifestValidationError, type NodeInfo, type OpenKeyCallbackStrategy, type OpenKeySigningRequestBody, type OpenKeySigningResponseBody, type OpenKeySigningStrategyOptions, type ParseRecapFromSiwe, type PartialSiweMessage, type PermissionEntry, PermissionNotInManifestError, type PersistedSessionData, type PersistedTinyCloudSession, type PkhDidParts, ProtocolMismatchError, type ReceiveOptions, type ResolveCloudLocationOptions, type ResolveTinyCloudHostsOptions, type ResolvedCapabilities, type ResolvedCloudLocation, type ResolvedDelegate, type ResolvedTinyCloudHosts, type ResourceCapability, SECRETS_SPACE, SERVICE_LONG_TO_SHORT, SERVICE_SHORT_TO_LONG, type ServerHost, SessionExpiredError, type ShareAccess, type ShareLink, type ShareLinkData, type ShareSchema, SharingService, type SharingServiceConfig, type SignCallback, type SignInOptions, type SignRequest, type SignResponse, type SignStrategy, SilentNotificationHandler, type SiweConfig, SiweConfigSchema, Space, type SpaceAbilitiesMap, type SpaceConfig, type SpaceCreationContext, type SpaceDelegationParams, type SpaceErrorCode, SpaceErrorCodes, type SpaceHostResult, type SpaceInfo, type SpaceOwnership, SpaceService, type SpaceServiceConfig, type StoredDelegationChain, type SubsetCheckResult, TinyCloud, type TinyCloudConfig, type TinyCloudSession, UnsupportedFeatureError, type UserAuthorizationConfig, VAULT_PERMISSION_SERVICE, type ValidationError, VersionCheckError, type WasmRecapEntry, activateSessionWithHost, addressStorageKey, applyPrefix, buildSpaceUri, canonicalLocationPayload, canonicalizeAddress, canonicalizeDid, canonicalizeDidUrl, canonicalizeNetworkId, checkNodeInfo, composeManifestRequest, createCapabilityKeyRegistry, createOpenKeyCallbackSigningStrategy, createSharingService, createSpaceService, defaultSignStrategy, defaultSpaceCreationHandler, didCacheKey, didEquals, expandActionShortNames, expandPermissionEntries, expandPermissionEntry, fetchLocationRecord, fetchPeerId, httpUrlToMultiaddr, isCapabilitySubset, isEvmAddress, loadManifest, locationPayloadForRecord, makePkhSpaceId, makePublicSpaceId, manifestAbilitiesUnion, multiaddrToHttpUrl, normalizeDefaults, parseCanonicalNetworkId, parseExpiry, parsePkhDid, parseRecapCapabilities, parseSpaceUri, pkhDid, principalDid, principalDidEquals, resolveCloudLocation, resolveManifest, resolveManifestKnowledgeRoot, resolveTinyCloudHosts, resourceCapabilitiesToAbilitiesMap, resourceCapabilitiesToSpaceAbilitiesMap, signLocationRecord, submitHostDelegation, validateClientSession, validateLocationRecord, validateLocationRecordPayload, validateManifest, validatePersistedSessionData, verifyDidKeyEd25519Signature, verifyLocationRecord };
