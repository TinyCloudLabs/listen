import { ISessionStorage, PersistedSessionData, AutoSignStrategy, AutoRejectStrategy, CallbackStrategy, IUserAuthorization, ISigner, ISpaceCreationHandler, IWasmBindings, SiweConfig, Manifest, ComposedManifestRequest, ClientSession, TinyCloudSession, Extension, SignRequest, SignInOptions, Delegation, DelegatedResource, PermissionEntry, TelemetryConfig, IKVService, ISQLService, IDuckDbService, IHooksService, INotificationHandler, IENSResolver, AccountService, IDataVaultService, IEncryptionService, NetworkDescriptor, ISecretsService, ICapabilityKeyRegistry, DelegationManager, ISpaceService, ISpace, ISharingService, CreateDelegationParams, DelegationResult, ResolvedDelegate, KeyProvider, ISessionManager, JWK } from '@tinycloud/sdk-core';
import { EventEmitter } from 'events';
import { InvokeFunction, InvokeAnyFunction } from '@tinycloud/sdk-services';

/**
 * In-memory session storage for Node.js.
 *
 * Sessions are stored in memory and lost when the process exits.
 * Suitable for:
 * - Development and testing
 * - Stateless server deployments
 * - Short-lived processes
 *
 * @example
 * ```typescript
 * const storage = new MemorySessionStorage();
 * await storage.save("0x123...", sessionData);
 * const session = await storage.load("0x123...");
 * ```
 */
declare class MemorySessionStorage implements ISessionStorage {
    private sessions;
    /**
     * Save a session for an address.
     */
    save(address: string, session: PersistedSessionData): Promise<void>;
    /**
     * Load a session for an address.
     */
    load(address: string): Promise<PersistedSessionData | null>;
    /**
     * Clear a session for an address.
     */
    clear(address: string): Promise<void>;
    /**
     * Check if a session exists for an address.
     */
    exists(address: string): boolean;
    /**
     * Memory storage is always available.
     */
    isAvailable(): boolean;
    /**
     * Clear all sessions.
     */
    clearAll(): void;
    /**
     * Get the number of stored sessions.
     */
    size(): number;
}

/**
 * File-based session storage for Node.js.
 *
 * Sessions are persisted to the file system and survive process restarts.
 * Suitable for:
 * - CLI applications
 * - Long-running server processes
 * - Development environments
 *
 * @example
 * ```typescript
 * const storage = new FileSessionStorage("/tmp/tinycloud-sessions");
 * await storage.save("0x123...", sessionData);
 * // Session persists across process restarts
 * ```
 */
declare class FileSessionStorage implements ISessionStorage {
    private readonly baseDir;
    /**
     * Create a new FileSessionStorage.
     *
     * @param baseDir - Directory to store session files (default: ~/.tinycloud/sessions)
     */
    constructor(baseDir?: string);
    /**
     * Get the default session storage directory.
     */
    private getDefaultDir;
    /**
     * Ensure the storage directory exists.
     */
    private ensureDirectoryExists;
    /**
     * Get the file path for an address.
     */
    private getFilePath;
    /**
     * Save a session for an address.
     */
    save(address: string, session: PersistedSessionData): Promise<void>;
    /**
     * Load a session for an address.
     */
    load(address: string): Promise<PersistedSessionData | null>;
    /**
     * Clear a session for an address.
     */
    clear(address: string): Promise<void>;
    /**
     * Check if a session exists for an address.
     */
    exists(address: string): boolean;
    /**
     * Check if file system storage is available.
     */
    isAvailable(): boolean;
}

/**
 * Node.js-specific SignStrategy types for TinyCloud authorization.
 *
 * This module re-exports common types from sdk-core and provides
 * Node.js-specific implementations (e.g., NodeEventEmitterStrategy
 * using Node's EventEmitter instead of browser EventTarget).
 *
 * @packageDocumentation
 */

/**
 * Node.js event emitter strategy: emits sign requests as events.
 *
 * Uses Node.js EventEmitter for compatibility with Node.js applications.
 * For browser environments, use the EventEmitterStrategy from sdk-core
 * which uses EventTarget.
 *
 * Events emitted:
 * - 'sign-request': When a sign request is received
 *
 * Use cases:
 * - Async approval workflows in Node.js
 * - External signing services
 * - Multi-step authorization flows
 *
 * @example
 * ```typescript
 * const emitter = new EventEmitter();
 * const strategy: NodeEventEmitterStrategy = { type: 'event-emitter', emitter };
 *
 * emitter.on('sign-request', async (req, respond) => {
 *   const approved = await externalApprovalService.check(req);
 *   respond({ approved, signature: approved ? await sign(req.message) : undefined });
 * });
 * ```
 */
interface NodeEventEmitterStrategy {
    type: "event-emitter";
    emitter: EventEmitter;
    /** Timeout in milliseconds for waiting on event response (default: 60000) */
    timeout?: number;
}
/**
 * Node.js sign strategy union type.
 *
 * Determines how sign requests are handled in NodeUserAuthorization.
 * Uses Node.js EventEmitter for the event-emitter strategy.
 */
type SignStrategy = AutoSignStrategy | AutoRejectStrategy | CallbackStrategy | NodeEventEmitterStrategy;
/**
 * Default sign strategy is auto-sign for convenience.
 * This is the Node.js-specific version typed with SignStrategy.
 */
declare const defaultSignStrategy: SignStrategy;

/**
 * Configuration for NodeUserAuthorization.
 */
interface NodeUserAuthorizationConfig {
    /** The signer used for signing messages */
    signer: ISigner;
    /** Sign strategy for handling sign requests */
    signStrategy?: SignStrategy;
    /** Session storage implementation */
    sessionStorage?: ISessionStorage;
    /** Domain for SIWE messages */
    domain: string;
    /** URI for SIWE messages (default: domain) */
    uri?: string;
    /** Statement included in SIWE messages */
    statement?: string;
    /** Space prefix for new sessions */
    spacePrefix?: string;
    /** Default actions for sessions */
    defaultActions?: Record<string, Record<string, string[]>>;
    /** Session expiration time in milliseconds (default: 1 hour) */
    sessionExpirationMs?: number;
    /** Automatically create space if it doesn't exist (default: false) */
    autoCreateSpace?: boolean;
    /** Custom space creation handler. If provided, takes precedence over autoCreateSpace. */
    spaceCreationHandler?: ISpaceCreationHandler;
    /** Explicit TinyCloud server endpoints. When omitted, signIn resolves the user's host. */
    tinycloudHosts?: string[];
    /** TinyCloud location registry URL. Default: https://registry.tinycloud.xyz. */
    tinycloudRegistryUrl?: string | null;
    /** Fallback TinyCloud hosts. Default: hosted TinyCloud node. */
    tinycloudFallbackHosts?: string[] | null;
    /** Whether to include public space capabilities in the session (default: true) */
    enablePublicSpace?: boolean;
    /** WASM bindings for cryptographic operations. Required. */
    wasmBindings: IWasmBindings;
    /**
     * SIWE nonce override. If omitted, the WASM layer generates a random nonce.
     * If `siweConfig.nonce` is also provided, `siweConfig.nonce` wins.
     */
    nonce?: string;
    /** Optional SIWE configuration overrides (e.g., nonce for server-provided nonces) */
    siweConfig?: SiweConfig;
    /**
     * App manifest used to drive the SIWE recap at sign-in.
     *
     * When set, `signIn` resolves the manifest (via
     * {@link resolveManifest}), unions the app's own permissions with
     * every `delegations[*].permissions` list, converts to the WASM
     * abilities shape, and uses that map as the session's granted
     * capabilities — *instead* of `defaultActions`.
     *
     * This is what makes manifest-declared pre-delegations usable: the
     * session key's recap covers both the app's runtime needs and the
     * downstream delegation targets, so `delegateTo` can issue the
     * sub-delegation via the session-key UCAN path without a wallet
     * prompt.
     *
     * When omitted, `signIn` falls back to `defaultActions` for
     * backwards compatibility.
     */
    manifest?: Manifest | Manifest[];
    /** Pre-composed manifest request. Takes precedence over `manifest`. */
    capabilityRequest?: ComposedManifestRequest;
    /** Include implicit account registry permissions when composing `manifest`. Default true. */
    includeAccountRegistryPermissions?: boolean;
}
interface CreateBootstrapSessionOptions {
    spaceId: string;
    capabilityRequest: ComposedManifestRequest;
    rawAbilities?: Record<string, string[]>;
}
/**
 * Node.js implementation of IUserAuthorization.
 *
 * Supports multiple sign strategies for different use cases:
 * - auto-sign: Automatically approve all sign requests (trusted backends)
 * - auto-reject: Reject all sign requests (read-only mode)
 * - callback: Delegate to a custom callback function (CLI prompts)
 * - event-emitter: Emit sign requests as events (async workflows)
 *
 * @example
 * ```typescript
 * // Auto-sign for backend services
 * const auth = new NodeUserAuthorization({
 *   signer: new PrivateKeySigner(process.env.PRIVATE_KEY),
 *   signStrategy: { type: 'auto-sign' },
 *   domain: 'api.myapp.com',
 * });
 *
 * // Callback for CLI prompts
 * const auth = new NodeUserAuthorization({
 *   signer,
 *   signStrategy: {
 *     type: 'callback',
 *     handler: async (req) => {
 *       const approved = await promptUser(`Sign for ${req.address}?`);
 *       return { approved };
 *     }
 *   },
 *   domain: 'cli.myapp.com',
 * });
 * ```
 */
declare class NodeUserAuthorization implements IUserAuthorization {
    private readonly signer;
    private readonly signStrategy;
    private readonly sessionStorage;
    private readonly domain;
    private readonly uri;
    private readonly statement?;
    private readonly spacePrefix;
    private readonly defaultActions;
    private readonly sessionExpirationMs;
    private readonly autoCreateSpace;
    private readonly spaceCreationHandler?;
    private tinycloudHosts?;
    private readonly tinycloudRegistryUrl?;
    private readonly tinycloudFallbackHosts?;
    private readonly enablePublicSpace;
    private readonly nonce?;
    private readonly siweConfig?;
    private readonly wasm;
    /**
     * Stored manifest, if one was provided at construction time. Used by
     * {@link signIn} to derive the session's granted capabilities instead
     * of falling back to {@link defaultActions}.
     */
    private _manifest?;
    private _capabilityRequest?;
    private readonly includeAccountRegistryPermissions;
    private sessionManager;
    private extensions;
    private _session?;
    private _tinyCloudSession?;
    private _address?;
    private _chainId?;
    private _nodeFeatures;
    private _lastActivationSkippedSpaceIds;
    constructor(config: NodeUserAuthorizationConfig);
    /**
     * Return the manifest currently driving sign-in behavior, or
     * `undefined` if none is set. Used by TinyCloudWeb/TinyCloudNode
     * internals to surface the manifest for requestPermissions flows
     * without forcing the caller to track it separately.
     */
    get manifest(): Manifest | Manifest[] | undefined;
    get capabilityRequest(): ComposedManifestRequest | undefined;
    get hosts(): string[];
    /**
     * Install or replace the stored manifest. Takes effect on the next
     * `signIn()` call — the current session (if any) is not touched.
     */
    setManifest(manifest: Manifest | Manifest[] | undefined): void;
    setCapabilityRequest(request: ComposedManifestRequest | undefined): void;
    /**
     * The current active session (web-core compatible).
     */
    get session(): ClientSession | undefined;
    /**
     * The current TinyCloud session with full delegation data.
     * Includes spaceId, delegationHeader, and delegationCid.
     */
    get tinyCloudSession(): TinyCloudSession | undefined;
    /**
     * Rehydrate the auth-layer session from previously-persisted delegation
     * data. Used by {@link TinyCloudNode.restoreSession} so that downstream
     * surfaces that read from `tinyCloudSession` (notably
     * `grantRuntimePermissions`, which extracts the SIWE expiry from it) work
     * without re-running the full sign-in flow.
     *
     * Caller must supply the same fields that `signIn` would have written —
     * `siwe` is the load-bearing one because `extractSiweExpiration` returns
     * undefined for missing SIWEs and the SDK then treats the session as
     * expired-at-epoch-zero.
     *
     * @param hosts - The TinyCloud hosts this session was created against,
     *   as persisted in {@link PersistedSessionData.tinycloudHosts}. When
     *   present (and non-empty) they are adopted directly so the restored
     *   session resolves to the same node as the original sign-in without
     *   re-running registry/fallback resolution. When absent (old session)
     *   hosts are resolved lazily on the first host-needing call via
     *   {@link ensureTinyCloudHosts}.
     */
    setRestoredTinyCloudSession(session: TinyCloudSession, hosts?: string[]): void;
    /**
     * Ensure `tinycloudHosts` are resolved before a host-needing call.
     *
     * Fresh sign-in resolves hosts up front; a restored session may not have
     * (old persisted sessions predate {@link PersistedSessionData.tinycloudHosts}).
     * This guard makes a restored session resolve the node exactly like a fresh
     * sign-in — persisted hosts are preferred (already set by
     * {@link setRestoredTinyCloudSession}), otherwise the registry/fallback
     * resolution runs lazily here. Idempotent: {@link resolveTinyCloudHostsForSignIn}
     * early-returns when hosts are already set.
     *
     * Throws if hosts are unset and the restored session has no address/chainId
     * to resolve from — a real failure that must surface, not be masked.
     */
    ensureTinyCloudHosts(): Promise<void>;
    private resolveTinyCloudHostsForSignIn;
    private requireTinyCloudHosts;
    private get primaryTinyCloudHost();
    get nodeFeatures(): string[];
    get lastActivationSkippedSpaceIds(): string[];
    /**
     * Compute the `abilities` map the WASM `prepareSession` call should
     * see at sign-in time.
     *
     * When a manifest is installed, we resolve it and union together:
     * - the app's own `resources` (what it needs at runtime)
     * - every `additionalDelegates[*].permissions` list (what it will
     *   re-delegate to other DIDs post sign-in)
     *
     * into the short-service / path / full-URN-actions shape the WASM
     * layer expects. This is the key invariant that lets
     * {@link TinyCloudNode.delegateTo} issue manifest-declared
     * delegations via the session key (no wallet prompt): the session's
     * own recap already covers every action those delegations need.
     *
     * When no manifest is installed, we fall back to the
     * {@link defaultActions} table so existing callers see no change.
     *
     * This is a pure function of `this._manifest` + `this.defaultActions`
     * — the manifest resolution performs no I/O and throws a
     * {@link ManifestValidationError} on structural problems (missing
     * id/name, unparseable expiry, etc), which will surface at sign-in
     * rather than being silently swallowed.
     *
     * @internal
     */
    private getCapabilityRequest;
    private resolveSpaceName;
    private defaultEncryptionNetworkId;
    private resolveSignInCapabilities;
    /**
     * Build SIWE overrides from the top-level nonce and siweConfig.
     * - Top-level `nonce` is seeded first so `siweConfig.nonce` wins if both are set.
     * - statement is prepended to the default statement
     * - resources are appended to the default resources
     * - uri triggers a warning (overwriting delegation target)
     * - all other fields override directly
     * - per-call nonce overrides siweConfig.nonce when provided
     */
    private buildSiweOverrides;
    /**
     * Add an extension to the authorization flow.
     */
    extend(extension: Extension): void;
    /**
     * Get the space ID for the current session.
     */
    getSpaceId(): string | undefined;
    /**
     * Create the space on the TinyCloud server (host delegation).
     * This registers the user as the owner of the space.
     */
    private hostSpace;
    /**
     * Create a specific space on the server via host delegation.
     * Used for lazy creation of additional spaces (e.g., public).
     */
    hostPublicSpace(spaceId: string): Promise<boolean>;
    /**
     * Create a specific owned space on the server via host delegation.
     * Used by manifest registry setup for the account space.
     */
    hostOwnedSpace(spaceId: string, purpose?: SignRequest["purpose"]): Promise<boolean>;
    /**
     * Ensure the user's space exists on the TinyCloud server.
     * Creates the space if it doesn't exist and autoCreateSpace is enabled.
     * If autoCreateSpace is false and space doesn't exist, silently returns
     * (user may be using delegations to access other spaces).
     *
     * @throws Error if space creation fails
     */
    ensureSpaceExists(): Promise<void>;
    private recordActivationSkippedSpaces;
    createBootstrapSession(options: CreateBootstrapSessionOptions): Promise<TinyCloudSession>;
    /**
     * Sign in and create a new session.
     *
     * This follows the correct SIWE-ReCap flow:
     * 1. Create session key and get JWK
     * 2. Call prepareSession() which generates the SIWE with ReCap capabilities
     * 3. Sign the SIWE string from prepareSession
     * 4. Call completeSessionSetup() with the prepared session + signature
     *
     * @param options - Optional per-call SIWE overrides for this sign-in only
     */
    signIn(options?: SignInOptions): Promise<ClientSession>;
    /**
     * Sign out and clear the current session.
     */
    signOut(): Promise<void>;
    /**
     * Get the current wallet/signer address.
     */
    address(): string | undefined;
    /**
     * Get the current chain ID.
     */
    chainId(): number | undefined;
    /**
     * Sign a message with the connected signer.
     */
    signMessage(message: string, purpose?: SignRequest["purpose"]): Promise<string>;
    /**
     * Prepare a session for external signing.
     *
     * Use this method when you need to sign the SIWE message externally (e.g., via
     * a hardware wallet, multi-sig, or external service). After obtaining the signature,
     * call `signInWithPreparedSession()` to complete the sign-in.
     *
     * @example
     * ```typescript
     * const { prepared, keyId, jwk } = await auth.prepareSessionForSigning();
     * const signature = await externalSigner.signMessage(prepared.siwe);
     * const session = await auth.signInWithPreparedSession(prepared, signature, keyId, jwk);
     * ```
     */
    prepareSessionForSigning(): Promise<{
        prepared: {
            siwe: string;
            jwk: Record<string, unknown>;
            spaceId: string;
            verificationMethod: string;
        };
        keyId: string;
        jwk: Record<string, unknown>;
        address: string;
        chainId: number;
    }>;
    /**
     * Complete sign-in with a prepared session and signature.
     *
     * Use this method after obtaining a signature for the SIWE message from
     * `prepareSessionForSigning()`. The signature MUST be over `prepared.siwe`.
     *
     * @param prepared - The prepared session from `prepareSessionForSigning()`
     * @param signature - The signature over `prepared.siwe`
     * @param keyId - The session key ID from `prepareSessionForSigning()`
     * @param jwk - The JWK from `prepareSessionForSigning()`
     */
    signInWithPreparedSession(prepared: {
        siwe: string;
        jwk: Record<string, unknown>;
        spaceId: string;
        verificationMethod: string;
    }, signature: string, keyId: string, jwk: Record<string, unknown>): Promise<ClientSession>;
    /**
     * Clear persisted session data.
     */
    clearPersistedSession(address?: string): Promise<void>;
    /**
     * Check if a session is persisted for an address.
     */
    isSessionPersisted(address: string): boolean;
    /**
     * Request a signature based on the configured strategy.
     */
    private requestSignature;
    /**
     * Request signature via event emitter with timeout.
     */
    private requestSignatureViaEmitter;
}

/**
 * A portable delegation that can be transported between users.
 * Extends the base Delegation type with fields required for transport.
 *
 * @remarks
 * PortableDelegation adds transport fields to Delegation:
 * - `delegationHeader`: Structured authorization header for API calls
 * - `ownerAddress`: Space owner's address for session creation
 * - `chainId`: Chain ID for session creation
 * - `host`: Optional server URL
 * - `resources`: Multi-resource grant breakdown (present when the
 *   delegation was issued via the multi-resource WASM path, i.e. one
 *   UCAN covering multiple `(service, path, actions)` entries). The
 *   flat `path` + `actions` fields mirror the first entry for
 *   single-resource callers; consumers that need the full picture
 *   read `resources`.
 */
interface PortableDelegation extends Omit<Delegation, "isRevoked"> {
    /** The authorization header for this delegation (structured format) */
    delegationHeader: {
        Authorization: string;
    };
    /** The address of the space owner */
    ownerAddress: string;
    /** The chain ID */
    chainId: number;
    /** TinyCloud server URL where this delegation was created */
    host?: string;
    /** Whether the recipient is prevented from creating sub-delegations */
    disableSubDelegation?: boolean;
    /** Companion delegation for the user's public space (auto-created when includePublicSpace is true) */
    publicDelegation?: PortableDelegation;
    /**
     * Full multi-resource grant breakdown. Present when the delegation
     * was issued via the multi-resource WASM path; each entry describes
     * one `(service, space, path, actions)` grant carried by the single
     * underlying UCAN. When absent, only the flat `path` + `actions`
     * fields are authoritative (legacy single-resource shape).
     */
    resources?: DelegatedResource[];
}
/**
 * The transport shape `tc auth request --emit` produces and that an owner
 * grants to its requester. Only the fields the grant logic needs are declared;
 * the CLI artifact carries more (posture, captured command, ...) and remains a
 * structural superset of this interface.
 */
interface AuthRequestArtifact {
    kind: "tinycloud.auth.request";
    version: 1;
    requestId: string;
    /** The requester's session DID — the audience the grant is issued to. */
    sessionDid: string;
    /** The capabilities the requester is asking the owner to delegate. */
    requested: PermissionEntry[];
    /** Optional lifetime override carried from the request. */
    requestedExpiry?: string | number;
}
/**
 * The transport shape returned by {@link grantAuthRequest} (and written by
 * `tc auth grant`). `tc auth import` accepts this artifact directly.
 */
interface AuthDelegationArtifact {
    kind: "tinycloud.auth.delegation";
    version: 1;
    requestId: string;
    delegationCid: string;
    delegation: PortableDelegation;
    permissions: PermissionEntry[];
    expiry: string;
    /** Whether issuing the delegation triggered a wallet prompt. */
    prompted: boolean;
}
/**
 * Minimal owner-side capability {@link grantAuthRequest} needs: the signed
 * `delegateTo` primitive. `TinyCloudNode` satisfies this directly; web/SDK
 * contexts can supply any object that exposes the same method.
 */
interface DelegationAuthority {
    delegateTo(did: string, permissions: PermissionEntry[], options?: {
        expiry?: string | number;
        forceWalletSign?: boolean;
    }): Promise<{
        delegation: PortableDelegation;
        prompted: boolean;
    }>;
}
/**
 * Turn a delegation REQUEST into a signed GRANT.
 *
 * Lifts the body of `tc auth grant` into the SDK so the request→grant
 * handshake is callable programmatically (future SDK/web owner tooling and the
 * KV delegation inbox), with the CLI verb reduced to a thin wrapper. The owner
 * `authority` (a `TinyCloudNode`) signs a delegation scoped to exactly the
 * requested caps, audienced to the requester's `sessionDid`, honoring the
 * request's expiry. The returned artifact round-trips through `tc auth import`.
 *
 * Authorization is enforced cryptographically by `delegateTo`: caps that are
 * not derivable from the owner's own session capability chain are rejected
 * (it throws), so this never widens authority the owner doesn't hold.
 */
declare function grantAuthRequest(authority: DelegationAuthority, request: AuthRequestArtifact, options?: {
    expiry?: string | number;
}): Promise<AuthDelegationArtifact>;
/**
 * Serialize a PortableDelegation for transport (e.g., over network).
 */
declare function serializeDelegation(delegation: PortableDelegation): string;
/**
 * Deserialize a PortableDelegation from transport.
 */
declare function deserializeDelegation(data: string): PortableDelegation;

/**
 * The handles needed to rehydrate this delegation activation in a fresh
 * `TinyCloudNode` via `TinyCloudNode.restoreSession(...)` in another process
 * or after a restart.
 *
 * In wallet mode, `delegationHeader` and `delegationCid` are bound to the
 * session key that ran `useDelegation`. They are NOT intrinsic to the
 * portable delegation — they expire with the server-side session (typically
 * ~1h). To keep a restored node alive longer, re-run `useDelegation` with
 * the original portable delegation and call `restoreSession` again with the
 * fresh `RestorableSession`.
 */
interface RestorableSession {
    delegationHeader: {
        Authorization: string;
    };
    delegationCid: string;
    spaceId: string;
    jwk: object;
    verificationMethod: string;
    address: string;
    chainId: number;
}
/**
 * Provides access to a space via a received delegation.
 *
 * This is returned by TinyCloudNode.useDelegation() and provides
 * KV operations on the delegated space.
 */
declare class DelegatedAccess {
    private session;
    private _delegation;
    private host;
    private _serviceContext;
    private _kv;
    private _sql;
    private _duckdb;
    private _hooks;
    constructor(session: TinyCloudSession, delegation: PortableDelegation, host: string, invoke: InvokeFunction, invokeAny?: InvokeAnyFunction, telemetry?: TelemetryConfig);
    /**
     * Get the delegation this access was created from.
     */
    get delegation(): PortableDelegation;
    /**
     * The space ID this access is for.
     */
    get spaceId(): string;
    /**
     * The path this access is scoped to.
     */
    get path(): string;
    /**
     * KV operations on the delegated space.
     */
    get kv(): IKVService;
    /**
     * SQL operations on the delegated space.
     */
    get sql(): ISQLService;
    /**
     * DuckDB operations on the delegated space.
     */
    get duckdb(): IDuckDbService;
    /**
     * Hooks write-stream subscriptions on the delegated space.
     */
    get hooks(): IHooksService;
    /**
     * Export the handles needed to rehydrate this activated delegation via
     * `TinyCloudNode.restoreSession(...)` in another process or after a
     * restart.
     *
     * See `RestorableSession` for lifetime caveats.
     */
    get restorable(): RestorableSession;
}

/**
 * TinyCloudNode - High-level API for Node.js users.
 *
 * Each user has their own TinyCloudNode instance with their own key.
 * This class provides a simplified interface for:
 * - Signing in and managing sessions
 * - Key-value storage operations on own space
 * - Creating and using delegations
 *
 * @example
 * ```typescript
 * const alice = new TinyCloudNode({
 *   privateKey: process.env.ALICE_PRIVATE_KEY,
 *   host: "https://node.tinycloud.xyz",
 *   prefix: "myapp",
 * });
 *
 * await alice.signIn();
 * await alice.kv.put("greeting", "Hello, world!");
 *
 * // Delegate access to Bob
 * const delegation = await alice.createDelegation({
 *   path: "shared/",
 *   actions: ["tinycloud.kv/get", "tinycloud.kv/put"],
 *   delegateDID: bob.did,
 * });
 *
 * // Bob uses the delegation
 * const access = await bob.useDelegation(delegation);
 * const data = await access.kv.get("shared/data");
 * ```
 */

interface CreateOwnerDelegationParams {
    readonly delegateDid: string;
    readonly spaceId: string;
    readonly path: string;
    readonly actions: readonly string[];
    readonly expiresAt: Date;
}
interface OwnerDelegationReceipt {
    readonly delegation: Delegation;
    /** Exact signed DAG-CBOR bytes submitted in the Authorization header. */
    readonly signedDagCbor: Uint8Array;
    /** Locally derived by the node WASM implementation; this is delegation identity. */
    readonly delegationCid: string;
    readonly nodeReceipt: {
        /** Raw /delegate response CID: a commit-event id, not delegation identity. */
        readonly commitEventCid?: string;
        readonly activated: readonly string[];
        readonly skipped: readonly string[];
    };
}
/**
 * Configuration for TinyCloudNode.
 * All fields are optional - TinyCloudNode can work with zero configuration.
 */
interface TinyCloudNodeConfig {
    /** Hex-encoded private key (with or without 0x prefix). Optional - only needed for wallet mode and signIn() */
    privateKey?: string;
    /** Custom signer implementation. If provided, takes precedence over privateKey. */
    signer?: ISigner;
    /** Strategy for root signature requests. Defaults to auto-sign for local keys. */
    signStrategy?: SignStrategy;
    /** Explicit TinyCloud server URL. When omitted, signIn resolves the user's host. */
    host?: string;
    /** TinyCloud location registry URL. Default: https://registry.tinycloud.xyz. */
    tinycloudRegistryUrl?: string | null;
    /** Fallback TinyCloud hosts. Default: hosted TinyCloud node. */
    tinycloudFallbackHosts?: string[] | null;
    /** Space prefix for this user's space. Optional - only needed for signIn() */
    prefix?: string;
    /** Domain for SIWE messages (default: derived from host) */
    domain?: string;
    /** Session expiration time in milliseconds (default: 1 hour) */
    sessionExpirationMs?: number;
    /** Whether to automatically create space if it doesn't exist (default: false) */
    autoCreateSpace?: boolean;
    /** Custom session storage implementation (default: MemorySessionStorage) */
    sessionStorage?: ISessionStorage;
    /** Whether to include public space capabilities in the session (default: true).
     * When true, signIn() automatically includes capabilities for the user's public space,
     * accessible via spaces.get('public').kv */
    enablePublicSpace?: boolean;
    /** Custom WASM bindings (default: @tinycloud/node-sdk-wasm). Used by browser wrapper. */
    wasmBindings?: IWasmBindings;
    /** Notification handler for sign-in/sign-out/error events (default: SilentNotificationHandler) */
    notificationHandler?: INotificationHandler;
    /** ENS resolver for resolving .eth names in delegation methods */
    ensResolver?: IENSResolver;
    /** Custom space creation handler (default: auto-approve when autoCreateSpace is true) */
    spaceCreationHandler?: ISpaceCreationHandler;
    /**
     * SIWE nonce override. If omitted, the WASM layer generates a random nonce.
     * If `siweConfig.nonce` is also provided, `siweConfig.nonce` wins.
     */
    nonce?: string;
    /** Optional SIWE configuration overrides (e.g., nonce for server-provided nonces) */
    siweConfig?: SiweConfig;
    /**
     * App manifest driving the SIWE recap at sign-in.
     *
     * When set, `signIn()` resolves the manifest, unions the app's own
     * permissions with every manifest-declared delegation's permissions,
     * and uses that union as the session's granted capabilities — NOT
     * the legacy `defaultActions` table. This is what makes
     * `delegateTo(manifestDeclaredDid, permissions)` work without a
     * wallet prompt: the session key's recap already covers the
     * delegation target's needs at sign-in time.
     *
     * When omitted, `signIn()` falls back to `defaultActions` for
     * backwards compatibility with callers that pre-date the manifest
     * flow.
     */
    manifest?: Manifest | Manifest[];
    /** Pre-composed manifest request. Takes precedence over `manifest`. */
    capabilityRequest?: ComposedManifestRequest;
    /** Include implicit account registry permissions when composing `manifest`. Default true. */
    includeAccountRegistryPermissions?: boolean;
    /** Run canonical first-account bootstrap when fresh account state is detected. Default true. */
    autoBootstrapAccount?: boolean;
    /** Default-off service telemetry. */
    telemetry?: TelemetryConfig;
}
/**
 * Options for {@link TinyCloudNode.delegateTo}.
 *
 * `expiry` accepts either an ms-format duration string (e.g. `"7d"`, `"1h"`)
 * or a raw number of milliseconds. When omitted, the default is 1 hour.
 *
 * `forceWalletSign` bypasses the derivability check and sends the
 * delegation through the legacy wallet-signed SIWE path, which always
 * triggers a wallet prompt. Used for testing, for explicit wallet
 * confirmation flows, and by the legacy `createDelegation` fallback.
 */
interface DelegateToOptions {
    /** Override expiry. ms-format string ("7d", "1h") or raw milliseconds. */
    expiry?: string | number;
    /** Force the wallet-signed SIWE path even if the caps are derivable. Default false. */
    forceWalletSign?: boolean;
}
/**
 * Result of {@link TinyCloudNode.delegateTo}.
 *
 * `prompted` indicates whether a wallet prompt was shown — `true` for the
 * legacy wallet path (always), `false` for the session-key UCAN path (never).
 * Callers wiring single-prompt sign-in flows use this to assert that their
 * capability chain was derivable.
 */
interface DelegateToResult {
    delegation: PortableDelegation;
    prompted: boolean;
}
/**
 * Options for runtime permission escalation.
 */
interface RuntimePermissionGrantOptions {
    /** Override expiry. ms-format string ("7d", "1h") or raw milliseconds. */
    expiry?: string | number;
}
/**
 * High-level TinyCloud API for Node.js environments.
 *
 * Each user creates their own TinyCloudNode instance with their private key.
 * The instance manages the user's session and provides access to their space.
 */
/** @internal */
interface NodeDefaults {
    createWasmBindings: () => IWasmBindings;
    createSigner: (privateKey: string, chainId?: number) => ISigner;
}
declare class TinyCloudNode {
    /** @internal Registered by importing @tinycloud/node-sdk (not /core) */
    private static nodeDefaults?;
    /** @internal Register Node.js-specific defaults (NodeWasmBindings, PrivateKeySigner) */
    static registerNodeDefaults(defaults: NodeDefaults): void;
    private config;
    private readonly explicitHost?;
    private signer;
    private auth;
    private tc;
    private _address?;
    private _chainId;
    private wasmBindings;
    private sessionManager;
    private _serviceContext?;
    private _kv?;
    private _sql?;
    private _duckdb?;
    private _hooks?;
    private _vault?;
    private _encryption?;
    private _baseSecrets;
    private _secrets;
    private _account?;
    /** Cached public KV with proper delegation (set by ensurePublicSpace) */
    private _publicKV?;
    /** Session key ID - always available */
    private sessionKeyId;
    /** Session key JWK as object - always available */
    private sessionKeyJwk;
    /** Notification handler for user-facing events */
    private notificationHandler;
    private _capabilityRegistry;
    private _keyProvider;
    private _sharingService;
    private _delegationManager?;
    private _spaceService?;
    private runtimePermissionGrants;
    /**
     * Memoized `recapOperationsFromSession` result, keyed by the exact SIWE it
     * was parsed from. The primary session is stable for the life of a sign-in,
     * so this avoids re-parsing the recap on every registration.
     */
    private _recapOperationsCache?;
    /**
     * TinyCloudSession captured by {@link restoreSession} when there's no
     * auth-layer signer available (session-only mode used by OpenKey-backed
     * CLI restores, public-space replays, …). Read by
     * {@link currentTinyCloudSession} as a fallback for `auth.tinyCloudSession`.
     */
    private _restoredTcSession?;
    /**
     * True when the last signIn() detected an interactive signer and skipped
     * client-side bootstrap. Apps can read this to know whether bootstrap was
     * deferred to the server (OpenKey) or requires a separate user action.
     */
    private _bootstrapSkipped;
    /**
     * Outcome of the last signIn()'s account-bootstrap attempt. `skipped` is
     * true when bootstrap did not complete (interactive signer, auto-sign
     * denied, or a bootstrap step failed); `reason` carries the cause so apps
     * can surface a "finish account setup" call-to-action.
     */
    private _bootstrapStatus;
    /** Whether the last signIn() skipped client-side bootstrap because the
     * signer is interactive (browser wallet / EIP-1193 provider). */
    get bootstrapSkipped(): boolean;
    /** Outcome of the last signIn()'s account-bootstrap attempt. */
    get bootstrapStatus(): {
        skipped: boolean;
        reason?: string;
    };
    private get nodeFeatures();
    /** SIWE domain — uses config override or defaults to app.tinycloud.xyz */
    private get siweDomain();
    private readonly invokeWithRuntimePermissions;
    private readonly invokeAnyWithRuntimePermissions;
    /**
     * Create a new TinyCloudNode instance.
     *
     * All configuration is optional. Without a privateKey, the instance operates
     * in "session-only" mode where it can receive delegations but cannot create
     * its own space via signIn().
     *
     * @param config - Configuration options (all optional)
     *
     * @example
     * ```typescript
     * // Session-only mode - can receive delegations
     * const bob = new TinyCloudNode();
     * console.log(bob.did); // did:key:z6Mk... - available immediately
     *
     * // Wallet mode - can create own space
     * const alice = new TinyCloudNode({
     *   privateKey: process.env.ALICE_PRIVATE_KEY,
     *   prefix: "myapp",
     * });
     * await alice.signIn();
     * ```
     */
    constructor(config?: TinyCloudNodeConfig);
    /**
     * Set up authorization handler and TinyCloud instance.
     * @internal
     */
    private setupAuth;
    private shouldUseBootstrapSignInRequest;
    private syncResolvedHostFromAuth;
    /**
     * Install or replace the manifest that drives the SIWE recap at
     * sign-in. Takes effect on the next `signIn()` call — the current
     * session (if any) is not touched. Wire this up from a higher
     * layer (e.g. TinyCloudWeb.setManifest) so the manifest is kept
     * in sync across the stack.
     */
    setManifest(manifest: Manifest | Manifest[] | undefined): void;
    setCapabilityRequest(request: ComposedManifestRequest | undefined): void;
    /**
     * Return the manifest currently installed on the auth handler,
     * or `undefined` if none is set.
     */
    get manifest(): Manifest | Manifest[] | undefined;
    get capabilityRequest(): ComposedManifestRequest | undefined;
    get hosts(): string[];
    /**
     * Get the primary identity DID for this user.
     * - If wallet connected and signed in: returns PKH DID (did:pkh:eip155:{chainId}:{address})
     * - If session-only mode: returns session key DID (did:key:z6Mk...)
     *
     * Use this for delegations - it always returns the appropriate identity.
     */
    get did(): string;
    /**
     * Get the session key DID. Always available.
     * Format: did:key:z6Mk...#z6Mk...
     *
     * Use this when you specifically need the session key, not the user identity.
     */
    get sessionDid(): string;
    /**
     * Get the Ethereum address for this user.
     */
    get address(): string | undefined;
    /**
     * Check if this instance is in session-only mode (no wallet).
     * In session-only mode, the instance can receive delegations but cannot
     * create its own space via signIn().
     */
    get isSessionOnly(): boolean;
    /**
     * Get the space ID for this user.
     * Available after signIn().
     */
    get spaceId(): string | undefined;
    /**
     * Get the account space ID for this wallet identity.
     * Available after wallet-backed sign-in or a restored session with address metadata.
     */
    get accountSpaceId(): string | undefined;
    /**
     * Account-level application and delegation helpers.
     */
    get account(): AccountService;
    /**
     * Get the current TinyCloud session.
     * Available after signIn().
     */
    get session(): TinyCloudSession | undefined;
    /**
     * Get the currently active session in the shape callers can persist and later
     * pass back to {@link restoreSession}.
     */
    get restorableSession(): TinyCloudSession | undefined;
    /**
     * Sign in and create a new session.
     * This creates the user's space if it doesn't exist.
     * Requires wallet mode (privateKey in config).
     *
     * @param options - Optional per-call SIWE overrides for this sign-in only
     */
    signIn(options?: SignInOptions): Promise<void>;
    private ownedSpaceId;
    private bootstrapAccountIfNeeded;
    private isFreshBootstrapAccount;
    private runAccountBootstrap;
    private registerBootstrapRuntimeGrant;
    /**
     * Map the base session's OWN recap into runtime permission operations.
     *
     * Uses the RAW `parseRecapFromSiwe` binding — NOT `parseRecapCapabilities`,
     * whose `normalizeSpace` collapses `tinycloud:pkh:...:<owner>:<space>` to a
     * bare short name and would conflate two owners' identically-named spaces.
     * We must keep the full owner-scoped URI so a synthetic primary grant can
     * never cover an operation on a different owner's space.
     *
     * Mirrors {@link operationsFromDelegation}'s op shape: encryption network
     * entries (`urn:tinycloud:encryption:` paths) become `resource` ops; every
     * other entry becomes a `spaceId` op carrying the raw recap `space` URI.
     * One op per action.
     *
     * Returns `[]` for session-only / restored-without-siwe modes and for any
     * unparseable SIWE — the primary grant is simply not registered in that case.
     */
    private recapOperationsFromSession;
    /**
     * Register the base (primary) session's own recap as a synthetic runtime
     * grant tagged `provenance: "primary"` so it always out-ranks other covering
     * grants in {@link findGrantForOperations}. This closes the selection-design
     * hazard where a broad — possibly broken — bootstrap/delegated grant could
     * hijack an operation the primary session itself already authorized (TC-111).
     *
     * Two safety exclusions:
     *  - Ops whose space is in `lastActivationSkippedSpaceIds` are dropped: the
     *    node refused to activate those spaces this sign-in even though the recap
     *    claims them. Including them would let the synthetic primary out-rank a
     *    working grant and 401 (the "skipped-activation inverted hijack").
     *  - Encryption `resource` ops are kept as-is (space-independent).
     *
     * No-ops when nothing remains after exclusion. Callers (`signIn`,
     * `restoreSession`) clear `runtimePermissionGrants` first, so no dupes.
     */
    private registerPrimarySessionGrant;
    private writeManifestRegistryRecords;
    private scheduleAccountRegistrySync;
    private withAccountRegistryRetry;
    private requestedEncryptionNetworkIds;
    private ensureRequestedEncryptionNetworks;
    private ensureOwnedSpaceHostedById;
    /**
     * Host one of this user's owned spaces by name (e.g. `"applications"`).
     *
     * Resolves the name to the owned space URI
     * (`tinycloud:pkh:eip155:<chain>:<addr>:<name>`) and registers it on the
     * server via the host-SIWE delegation flow, so subsequent KV/SQL writes to
     * that space succeed instead of returning `404 - Space not found`. The
     * caller is the root authority of their own owned spaces, so no additional
     * delegation is required.
     *
     * Unlike {@link ensureOwnedSpaceHostedById}, this always submits the host
     * delegation rather than inferring hosting from session activation: a space
     * the current session has never referenced is reported neither as
     * `activated` nor `skipped`, so activation-based detection would wrongly
     * skip the host. The host SIWE is idempotent server-side, so re-hosting an
     * existing space is a safe no-op. Must be called after {@link signIn}.
     *
     * @param name - The owned space name (e.g. `"applications"`).
     * @returns The hosted space URI.
     */
    hostOwnedSpace(name: string): Promise<string>;
    /**
     * Ensure one of this user's owned spaces (e.g. `"secrets"`) is hosted on the
     * server.
     *
     * At sign-in, a full-authority session auto-hosts the owner's `secrets`
     * space, but a session created with a manifest / capabilityRequest does not.
     * Such a session can therefore hold valid `tinycloud.kv/*` capabilities for
     * the owned `secrets` space yet still fail its first scoped
     * `secrets.put(...)` with `404 Space not found`, because the space was never
     * registered on the node.
     *
     * Calling this resolves `name` to the owner's owned-space URI
     * (`tinycloud:pkh:eip155:<chain>:<addr>:<name>`). It first consults the
     * account-space spaces registry (`account/spaces/{space_id}`, the canonical
     * KV source of truth, fronted by a best-effort SQLite index): if the space is
     * already registered/hosted it returns the URI WITHOUT submitting a host
     * delegation, avoiding a redundant host-SIWE signature prompt for owners who
     * already use the space. Only when the space is absent — or the registry
     * check fails for any reason (e.g. a cold SQLite index reporting
     * `no such table: spaces`) — does it fall through to {@link hostOwnedSpace}.
     *
     * The registry check is purely an optimization: any failure falls back to
     * hosting, and the host SIWE is idempotent server-side, so re-hosting an
     * existing space remains a safe no-op. Must be called after {@link signIn}.
     *
     * @param name - The owned space name (e.g. `"secrets"`).
     * @returns The hosted owned-space URI.
     */
    ensureOwnedSpaceHosted(name: string): Promise<string>;
    /**
     * Check whether an owned space is already registered/hosted by consulting the
     * account spaces registry.
     *
     * Source of truth is the canonical KV registry record
     * `account/spaces/{space_id}`, read here via `account.spaces.get(spaceId)`.
     * The KV path is used (rather than `syncAccessible()`) because it works under
     * a manifest/recap session with NO extra prompt: the composed manifest recap
     * already grants `tinycloud.kv get/list` on the account space `spaces/`
     * prefix, whereas `syncAccessible()` depends on `tinycloud.space/list`, which
     * a recap session does not hold. Before reading, it consults the fast SQLite
     * index (`account.index.spaces.list()`) as a best-effort short-circuit; on a
     * cold index (`no such table: spaces`) or any other index failure it falls
     * back to the canonical KV read.
     *
     * This is a best-effort optimization. ANY failure of the check path (missing
     * table, KV error, missing record, thrown exception) resolves to `false` so
     * the caller falls through to hosting — per the directive, "if it fails in any
     * way then create the space".
     */
    private isOwnedSpaceRegistered;
    /**
     * Restore a previously established session from stored delegation data.
     *
     * This is used by the CLI to restore a session that was created via the
     * browser-based delegation flow (OpenKey `/delegate` page). Instead of
     * signing in with a private key, it injects the delegation data directly.
     *
     * @param sessionData - The stored delegation data from the browser flow
     */
    restoreSession(sessionData: {
        delegationHeader: {
            Authorization: string;
        };
        delegationCid: string;
        spaceId: string;
        jwk: object;
        verificationMethod: string;
        address?: string;
        chainId?: number;
        /**
         * The SIWE message that authorized this session. Required for
         * downstream operations that need the session's expiry (e.g.
         * {@link grantRuntimePermissions}). When omitted the SDK can still
         * invoke services with the existing delegation, but anything that
         * reads `auth.tinyCloudSession.siwe` will treat the session as
         * expired-at-epoch-zero.
         */
        siwe?: string;
        /**
         * The wallet/OpenKey signature over `siwe`. Optional because the
         * runtime doesn't re-verify it — it's persisted alongside the SIWE
         * for callers that need to round-trip the full session shape.
         */
        signature?: string;
        /**
         * The TinyCloud hosts this session was created against (from
         * {@link PersistedSessionData.tinycloudHosts}). When present they are
         * adopted so the restored session targets the same node as the
         * original sign-in — without this, service calls fall back to the
         * default host and the auth layer throws "TinyCloud hosts have not
         * been resolved". When absent (old persisted session) hosts resolve
         * lazily via the registry/fallback on the first host-needing call.
         */
        tinycloudHosts?: string[];
    }): Promise<void>;
    /**
     * Resolve the host a restored session should target.
     *
     * Mirrors fresh sign-in host resolution but for the restore path:
     * an explicit/pinned host always wins, then the hosts the session was
     * persisted with, then a lazy registry/fallback resolution for sessions
     * that predate the persisted `tinycloudHosts` field. Returns `undefined`
     * only when there's nothing to resolve from (no explicit host, no
     * persisted hosts, and no address/chainId) — in which case the existing
     * `config.host` (default) is left in place.
     *
     * Resolution failures are surfaced, not swallowed: a genuinely broken
     * registry lookup throws rather than silently falling back to a wrong host.
     */
    private resolveRestoredHost;
    /**
     * Resolve the currently-active TinyCloudSession, preferring the auth
     * layer's value (wallet mode) and falling back to the node-level
     * rehydration set by {@link restoreSession} (session-only mode).
     */
    private currentTinyCloudSession;
    /**
     * Connect a wallet to upgrade from session-only mode to wallet mode.
     *
     * This allows a user who started in session-only mode to later connect
     * a wallet and gain the ability to create their own space.
     *
     * Note: This does NOT automatically sign in. Call signIn() after connecting
     * the wallet to create your space.
     *
     * @param privateKey - The Ethereum private key (hex string, no 0x prefix)
     * @param options - Optional configuration
     * @param options.prefix - Space name prefix (defaults to "default")
     *
     * @example
     * ```typescript
     * // Start in session-only mode
     * const node = new TinyCloudNode({ host: "https://node.tinycloud.xyz" });
     * console.log(node.did); // did:key:z6Mk... (session key)
     *
     * // Later, connect a wallet
     * node.connectWallet(privateKey);
     * await node.signIn();
     * console.log(node.did); // did:pkh:eip155:1:0x... (PKH)
     * ```
     */
    connectWallet(privateKey: string, options?: {
        prefix?: string;
        sessionStorage?: ISessionStorage;
    }): void;
    /**
     * Connect any ISigner to upgrade from session-only mode to wallet mode.
     *
     * Same as connectWallet() but accepts any ISigner implementation instead
     * of a raw private key string. Use this for browser wallets, hardware wallets,
     * or custom signing backends.
     *
     * Note: This does NOT automatically sign in. Call signIn() after connecting.
     *
     * @param signer - Any ISigner implementation
     * @param options - Optional configuration
     * @param options.prefix - Space name prefix (defaults to "default")
     */
    connectSigner(signer: ISigner, options?: {
        prefix?: string;
        sessionStorage?: ISessionStorage;
    }): void;
    /**
     * Initialize the service context and KV service after sign-in.
     * @internal
     */
    private initializeServices;
    private createSpaceScopedKVService;
    getDefaultEncryptionNetworkId(name?: string): string;
    getEncryptionNetworkIdForSpace(spaceId: string, name?: string): string;
    private ownerDidFromSpaceId;
    private requireServiceSession;
    private createEncryptionCrypto;
    private fetchNodeId;
    private signRawNetworkAuthorization;
    private createEncryptionService;
    private getEncryptionService;
    private createVaultService;
    /**
     * Initialize the v2 delegation system services.
     * @internal
     */
    private initializeV2Services;
    /**
     * Get the session expiry time.
     * @internal
     */
    private getSessionExpiry;
    /**
     * Wrapper for the WASM createDelegation function.
     *
     * The WASM call now takes a multi-resource `abilities` map
     * (matching `prepareSession`'s shape) and emits ONE UCAN that
     * covers every `(service, path, actions)` entry. We mirror the raw
     * result back through `CreateDelegationWasmResult`, converting the
     * seconds-since-epoch `expiry` to a Date and normalizing the
     * `delegateDid` → `delegateDID` case.
     *
     * Both SharingService (single-entry) and
     * {@link TinyCloudNode.delegateTo} (multi-entry) drive this through
     * the same code path so there's exactly one place that touches the
     * WASM boundary.
     *
     * @internal
     */
    private createDelegationWrapper;
    /**
     * Create a direct root delegation from the wallet to a share key.
     * This bypasses the session delegation chain, allowing share links
     * with expiry longer than the current session.
     * @internal
     */
    createOwnerDelegation(params: CreateOwnerDelegationParams): Promise<OwnerDelegationReceipt>;
    private createRootDelegationForSharing;
    /**
     * Track a received delegation in the capability registry.
     * @internal
     */
    private trackReceivedDelegation;
    /**
     * Key-value storage operations on this user's space.
     */
    get kv(): IKVService;
    /**
     * SQL database operations on this user's space.
     */
    get sql(): ISQLService;
    /**
     * Get an SQL service scoped to a specific space.
     *
     * Mirrors {@link SpaceService}'s per-space KV factory: clones the active
     * service context and overrides its session's spaceId so that subsequent
     * `sql/<dbName>/<action>` invocations route to that space. Useful when
     * the caller already holds a delegation covering the target space (e.g.
     * via {@link grantRuntimePermissions} or {@link useRuntimeDelegation})
     * but the SDK's per-space SQL surface isn't otherwise exposed.
     *
     * Does NOT auto-create the space.
     *
     * @param spaceId - Full space URI (`tinycloud:pkh:eip155:<chain>:<addr>:<name>`).
     */
    sqlForSpace(spaceId: string): ISQLService;
    /**
     * Get a KV service scoped to a specific space.
     *
     * The KV counterpart to {@link sqlForSpace}: clones the active service
     * context and overrides its session's spaceId so that subsequent
     * `kv/<action>` invocations route to that space. Useful for reading data
     * that a manifest app stores outside the primary space (e.g. transcripts a
     * `defaults: true` app keeps under the owner's `applications` space), when
     * the caller already holds a delegation covering the target space.
     *
     * Does NOT auto-create the space.
     *
     * @param spaceId - Full space URI (`tinycloud:pkh:eip155:<chain>:<addr>:<name>`).
     */
    kvForSpace(spaceId: string): IKVService;
    /**
     * DuckDB database operations on this user's space.
     */
    get duckdb(): IDuckDbService;
    /**
     * Data Vault operations - client-side encrypted KV storage.
     * Call `vault.unlock(signer)` after signIn() to derive encryption keys.
     */
    get vault(): IDataVaultService;
    /**
     * Network-scoped encryption/decrypt service.
     */
    get encryption(): IEncryptionService;
    getEncryptionNetwork(nameOrNetworkId?: string): Promise<NetworkDescriptor | null>;
    createEncryptionNetwork(name?: string): Promise<NetworkDescriptor>;
    ensureEncryptionNetwork(nameOrNetworkId?: string): Promise<NetworkDescriptor>;
    /**
     * App-facing secrets API backed by the `secrets` space vault.
     */
    get secrets(): ISecretsService;
    /**
     * App-facing secrets API backed by the requested space's vault.
     */
    secretsForSpace(spaceId: string): ISecretsService;
    private getBaseSecrets;
    /**
     * Hooks write stream subscription API.
     */
    get hooks(): IHooksService;
    /**
     * Get the CapabilityKeyRegistry for managing keys and their capabilities.
     *
     * The registry tracks keys (session, main, ingested) and their associated
     * delegations, enabling automatic key selection for operations.
     *
     * @example
     * ```typescript
     * const registry = alice.capabilityRegistry;
     *
     * // Get the best key for an operation
     * const key = registry.getKeyForCapability(
     *   "tinycloud://my-space/kv/data",
     *   "tinycloud.kv/get"
     * );
     *
     * // List all capabilities
     * const capabilities = registry.getAllCapabilities();
     * ```
     */
    get capabilityRegistry(): ICapabilityKeyRegistry;
    /**
     * Access received delegations (recipient view).
     *
     * Use this to see what delegations have been received via useDelegation().
     *
     * @example
     * ```typescript
     * // List all received delegations
     * const received = bob.delegations.list();
     * console.log("I have access to:", received.length, "spaces");
     *
     * // Get a specific delegation by CID
     * const delegation = bob.delegations.get(cid);
     * ```
     */
    get delegations(): {
        /** List all received delegations */
        list: () => Delegation[];
        /** Get a delegation by CID */
        get: (cid: string) => Delegation | undefined;
    };
    /**
     * Check whether the current session or an approved runtime delegation covers
     * every requested permission.
     */
    hasRuntimePermissions(permissions: PermissionEntry[]): boolean;
    /**
     * Return installed runtime permission delegations. When `permissions` is
     * provided, only delegations currently covering those permissions are
     * returned. Base-session manifest permissions are not represented here.
     */
    getRuntimePermissionDelegations(permissions?: PermissionEntry[]): PortableDelegation[];
    /**
     * Install a portable runtime permission delegation into this SDK instance so
     * matching service calls and downstream `delegateTo()` calls can use it.
     */
    useRuntimeDelegation(delegation: PortableDelegation): Promise<void>;
    /**
     * Store additional permissions as narrow delegations to the current session
     * key. Future service invocations automatically use a stored delegation when
     * its `(space, service, path, action)` covers the request.
     */
    grantRuntimePermissions(permissions: PermissionEntry[], options?: RuntimePermissionGrantOptions): Promise<PortableDelegation[]>;
    /**
     * Get the DelegationManager for delegation CRUD operations.
     *
     * This is the v2 delegation service providing a cleaner API than
     * the legacy createDelegation/useDelegation methods.
     *
     * @example
     * ```typescript
     * const delegations = alice.delegationManager;
     *
     * // Create a delegation
     * const result = await delegations.create({
     *   delegateDID: bob.did,
     *   path: "shared/",
     *   actions: ["tinycloud.kv/get", "tinycloud.kv/put"],
     *   expiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
     * });
     *
     * // List delegations
     * const listResult = await delegations.list();
     *
     * // Revoke a delegation
     * await delegations.revoke(delegationCid);
     * ```
     */
    get delegationManager(): DelegationManager;
    /**
     * Get the SpaceService for managing spaces.
     *
     * The SpaceService provides access to owned and delegated spaces,
     * including space creation, listing, and scoped operations.
     *
     * @example
     * ```typescript
     * const spaces = alice.spaces;
     *
     * // List all accessible spaces
     * const result = await spaces.list();
     *
     * // Create a new space
     * const createResult = await spaces.create('photos');
     *
     * // Get a space object for operations
     * const mySpace = spaces.get('default');
     * await mySpace.kv.put('key', 'value');
     *
     * // Check if a space exists
     * const exists = await spaces.exists('photos');
     * ```
     */
    get spaces(): ISpaceService;
    /**
     * Alias for `spaces` - get the SpaceService.
     * @see spaces
     */
    get spaceService(): ISpaceService;
    /**
     * Get a Space object by short name or full URI.
     */
    space(nameOrUri: string): ISpace;
    /**
     * Get the SharingService for creating and receiving v2 sharing links.
     *
     * The SharingService creates sharing links with embedded private keys,
     * allowing recipients to exercise delegations without prior session setup.
     *
     * @example
     * ```typescript
     * const sharing = alice.sharing;
     *
     * // Generate a sharing link
     * const result = await sharing.generate({
     *   path: "/kv/documents/report.pdf",
     *   actions: ["tinycloud.kv/get"],
     *   expiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
     * });
     *
     * if (result.ok) {
     *   console.log("Share URL:", result.data.url);
     *   // Send the URL to the recipient
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
    get sharing(): ISharingService;
    /**
     * Alias for `sharing` - get the SharingService.
     * @see sharing
     */
    get sharingService(): ISharingService;
    /**
     * Ensure the user's public space exists and is accessible.
     * Creates the space and activates a session delegation for it.
     * This is the trigger for lazy public space creation — call it
     * before writing to spaces.get('public').kv.
     */
    ensurePublicSpace(): Promise<void>;
    /**
     * Get a KVService scoped to the user's own public space.
     * Writes require authentication (owner/delegate).
     */
    get publicKV(): IKVService;
    /**
     * Create a delegation using the v2 DelegationManager.
     *
     * This is a convenience method that wraps DelegationManager.create().
     * For more control, use `this.delegationManager` directly.
     *
     * @param params - Delegation parameters
     * @returns Result containing the created Delegation
     *
     * @example
     * ```typescript
     * const result = await alice.delegate({
     *   delegateDID: bob.did,
     *   path: "shared/",
     *   actions: ["tinycloud.kv/get", "tinycloud.kv/put"],
     *   expiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
     * });
     *
     * if (result.ok) {
     *   console.log("Delegation created:", result.data.cid);
     * }
     * ```
     */
    delegate(params: CreateDelegationParams): Promise<DelegationResult<Delegation>>;
    /**
     * Revoke a delegation using the v2 DelegationManager.
     *
     * @param cid - The CID of the delegation to revoke
     * @returns Result indicating success or failure
     */
    revokeDelegation(cid: string): Promise<DelegationResult<void>>;
    /**
     * List all delegations for the current session's space.
     *
     * @returns Result containing an array of Delegations
     */
    listDelegations(): Promise<DelegationResult<Delegation[]>>;
    /**
     * Check if the current session has permission for a path and action.
     *
     * @param path - The resource path to check
     * @param action - The action to check (e.g., "tinycloud.kv/get")
     * @returns Result containing boolean permission status
     */
    checkPermission(path: string, action: string): Promise<DelegationResult<boolean>>;
    /**
     * Safety margin before the session's own expiry at which {@link delegateTo}
     * will refuse to issue a derived delegation. Prevents issuing sub-delegations
     * that would be invalid by the time the recipient used them. Spec: 60 seconds.
     *
     * @internal
     */
    private static readonly SESSION_EXPIRY_SAFETY_MARGIN_MS;
    /**
     * Issue a delegation using the capability-chain flow.
     *
     * When every requested permission is a subset of the current
     * session's recap, or of one installed runtime permission delegation,
     * the delegation is signed by the session key via WASM — no wallet
     * prompt. When at least one is NOT derivable, a
     * {@link PermissionNotInManifestError} is raised (carrying the
     * missing entries) so the caller can trigger an escalation flow
     * (e.g. `TinyCloudWeb.requestPermissions`). Passing
     * `forceWalletSign: true` bypasses the derivability check and
     * always uses the wallet-signed SIWE path — used by the legacy
     * `createDelegation` fallback and by callers that want explicit
     * wallet confirmation.
     *
     * Multi-entry delegations are now emitted as **one** signed UCAN:
     * the underlying WASM `createDelegation` takes a full
     * `HashMap<Service, HashMap<Path, Vec<Ability>>>` abilities map
     * and produces a single attenuation carrying every
     * `(service, path, actions)` entry. The returned
     * {@link DelegateToResult.delegation} is that single blob, and
     * apps can POST it to their backend exactly like a single-entry
     * delegation (the server verifies all granted resources from one
     * UCAN).
     *
     * For single-entry requests the `PortableDelegation.path` and
     * `.actions` fields mirror the one granted entry. For
     * multi-entry requests they mirror the **first** entry (stable
     * lexicographic order from the Rust side); consumers that need
     * the full picture read `PortableDelegation.resources`.
     *
     * @throws {@link SessionExpiredError} when there is no session or
     *   the current session has expired (or will within the 60s
     *   safety margin).
     * @throws {@link PermissionNotInManifestError} when any requested
     *   entry is not a subset of the granted session capabilities and
     *   `forceWalletSign` is not set.
     */
    delegateTo(did: string, permissions: PermissionEntry[], options?: DelegateToOptions): Promise<DelegateToResult>;
    /**
     * Materialize one manifest-declared delegation using the current session key.
     * Delivery is intentionally out of band; callers decide how to transmit the
     * returned UCAN to the delegate.
     */
    materializeDelegation(did: string, request?: ComposedManifestRequest | undefined): Promise<DelegateToResult & {
        target: ResolvedDelegate;
    }>;
    /**
     * Materialize every delegation target declared by the composed manifest
     * request. This does not deliver the delegations anywhere.
     */
    materializeDelegations(request?: ComposedManifestRequest | undefined): Promise<Array<DelegateToResult & {
        target: ResolvedDelegate;
    }>>;
    /**
     * Issue a delegation via the session-key UCAN WASM path.
     *
     * The caller has already verified every entry is derivable from
     * the current session; we build one multi-resource abilities map
     * and emit one signed UCAN covering them all.
     *
     * Non-encryption entries must share the same target space. Encryption
     * entries are raw network URNs and do not participate in space grouping.
     *
     * @internal
     */
    private createDelegationViaWasmPath;
    private createDelegationViaRuntimeGrant;
    private resolvePermissionSpace;
    private expandPermissionEntries;
    private shortServiceName;
    private permissionsToAbilities;
    private isEncryptionPermissionEntry;
    private permissionsToRawAbilities;
    private permissionOperations;
    private sessionCoversPermissionEntries;
    private permissionEntriesToOperations;
    private findRuntimeGrantsForPermissionEntries;
    private runtimeDelegationFromSession;
    private runtimeGrantFromDelegation;
    private installRuntimeGrantFromServiceSession;
    private delegatedResourcesForEntries;
    private operationsFromDelegation;
    private flatDelegationResources;
    /**
     * Build the abilities/rawAbilities maps for a wallet-mode activation
     * sub-delegation from the FULL resource set of a received delegation.
     *
     * Each entry in `delegation.resources[]` is one `(service, space, path,
     * actions)` grant; the flat top-level `path`/`actions` mirror only the
     * first resource. We must reconstruct every grant so the activated
     * session carries all of them (e.g. both `tinycloud.kv/get` and
     * `tinycloud.encryption/decrypt`) — not just the primary one.
     *
     * Encryption resources are raw network URNs (space-independent) and go
     * into `rawAbilities`. All other resources are space-scoped and go into
     * `abilities` keyed by short service name. The activation `prepareSession`
     * call uses a single `spaceId` (`delegation.spaceId`), so every
     * non-encryption resource must target that same space — which is exactly
     * what the multi-resource issuance path enforces. A resource targeting a
     * different space cannot be activated in one call, so we fail loudly
     * rather than silently dropping it.
     *
     * @internal
     */
    private buildActivationAbilities;
    private selectInvocationSession;
    private findGrantForOperations;
    private findGrantForOperation;
    private pruneExpiredRuntimePermissionGrants;
    private operationCovers;
    private spaceIdsEqual;
    private normalizeSpaceAddress;
    private actionContains;
    private invocationServiceName;
    private isEncryptionNetworkOperation;
    private operationFromInvokeAnyEntry;
    private pathContains;
    /**
     * Issue a delegation via the legacy wallet-signed SIWE path for a single
     * {@link PermissionEntry}. Shares the implementation with the public
     * `createDelegation` method via {@link createDelegationWalletPath} so
     * both entry points hit exactly the same SIWE / signer / public-space
     * logic without mutual recursion.
     *
     * @internal
     */
    private createDelegationLegacyWalletPath;
    /**
     * Create a delegation from this user to another user.
     *
     * The delegation grants the recipient access to a specific path and actions
     * within this user's space.
     *
     * @param params - Delegation parameters
     * @returns A portable delegation that can be sent to the recipient
     */
    createDelegation(params: {
        /** Path within the space to delegate access to */
        path: string;
        /** Actions to allow (e.g., ["tinycloud.kv/get", "tinycloud.kv/put"]) */
        actions: string[];
        /** DID of the recipient (from their TinyCloudNode.did) */
        delegateDID: string;
        /** Whether to prevent the recipient from creating sub-delegations (default: false) */
        disableSubDelegation?: boolean;
        /** Expiration time in milliseconds from now (default: 1 hour) */
        expiryMs?: number;
        /** Override space ID (for creating delegations to non-primary spaces like public) */
        spaceIdOverride?: string;
        /** Include a companion delegation for the user's public space (default: true) */
        includePublicSpace?: boolean;
    }): Promise<PortableDelegation>;
    /**
     * Legacy wallet-signed SIWE delegation path. Lifted from the original
     * `createDelegation` body verbatim so both the legacy public method and
     * `delegateTo({ forceWalletSign: true })` hit the same code.
     *
     * @internal
     */
    private createDelegationWalletPath;
    /**
     * Use a delegation received from another user.
     *
     * This creates a new session key for this user that chains from the
     * received delegation, allowing operations on the delegator's space.
     *
     * Works in both modes:
     * - **Wallet mode**: Creates a SIWE sub-delegation from PKH to session key
     * - **Session-only mode**: Uses the delegation directly (must target session key DID)
     *
     * @param delegation - The PortableDelegation to use (from createDelegation or transport)
     * @returns A DelegatedAccess instance for performing operations
     */
    useDelegation(delegation: PortableDelegation): Promise<DelegatedAccess>;
    /**
     * Create a sub-delegation from a received delegation.
     *
     * This allows further delegating access that was received from another user,
     * if the original delegation allows sub-delegation.
     *
     * @param parentDelegation - The delegation received from another user
     * @param params - Sub-delegation parameters (must be within parent's scope)
     * @returns A portable delegation for the sub-delegate
     */
    createSubDelegation(parentDelegation: PortableDelegation, params: {
        /** Path within the delegated path to sub-delegate */
        path: string;
        /** Actions to allow (must be subset of parent's actions) */
        actions: string[];
        /** DID of the recipient */
        delegateDID: string;
        /** Whether to prevent the recipient from creating further sub-delegations */
        disableSubDelegation?: boolean;
        /** Expiration time in milliseconds from now (must be before parent's expiry) */
        expiryMs?: number;
    }): Promise<PortableDelegation>;
}

/**
 * WasmKeyProvider - KeyProvider implementation using WASM session manager.
 *
 * This provider wraps the SessionManager from node-sdk-wasm to provide
 * cryptographic key operations required by the SharingService.
 *
 * @packageDocumentation
 */

/**
 * Extended session manager with optional key listing support.
 * The base ISessionManager doesn't include listSessionKeys(),
 * but concrete implementations (e.g., TCWSessionManager) may provide it.
 */
interface SessionManagerWithListing extends ISessionManager {
    listSessionKeys?(): string[];
}
/**
 * Configuration for WasmKeyProvider.
 */
interface WasmKeyProviderConfig {
    /**
     * The WASM session manager instance.
     * Must be created before constructing the KeyProvider.
     */
    sessionManager: SessionManagerWithListing;
}
/**
 * KeyProvider implementation that wraps the WASM session manager.
 *
 * This allows the SharingService to create new session keys for sharing links
 * using the same cryptographic operations as the main session management.
 *
 * @example
 * ```typescript
 * // sessionManager from wasmBindings.createSessionManager()
 * import { WasmKeyProvider } from "@tinycloud/node-sdk";
 *
 * const sessionManager = new SessionManager();
 * const keyProvider = new WasmKeyProvider({ sessionManager });
 *
 * // Create a session key for a sharing link
 * const keyId = await keyProvider.createSessionKey("share:abc123");
 * const jwk = keyProvider.getJWK(keyId);
 * const did = await keyProvider.getDID(keyId);
 * ```
 */
declare class WasmKeyProvider implements KeyProvider {
    private sessionManager;
    /**
     * Create a new WasmKeyProvider.
     *
     * @param config - Configuration with the WASM session manager
     */
    constructor(config: WasmKeyProviderConfig);
    /**
     * Generate a new session key with the given name.
     *
     * This creates a new Ed25519 key pair in the WASM session manager.
     * The key can then be used for signing delegations in sharing links.
     *
     * @param name - A unique name/ID for the key (e.g., "share:timestamp:random")
     * @returns The key ID (same as the name provided)
     */
    createSessionKey(name: string): Promise<string>;
    /**
     * Get the JWK (JSON Web Key) for a key.
     *
     * Returns the full JWK including the private key (d parameter),
     * which is required for signing and for embedding in sharing links.
     *
     * @param keyId - The key ID to retrieve
     * @returns The JWK object with public and private key components
     * @throws Error if the key is not found
     */
    getJWK(keyId: string): JWK;
    /**
     * Get the DID (Decentralized Identifier) for a key.
     *
     * Returns the did:key format DID derived from the key's public key.
     * This DID can be used as the delegatee in delegations.
     *
     * @param keyId - The key ID to retrieve
     * @returns The DID in did:key format (e.g., "did:key:z6Mk...")
     */
    getDID(keyId: string): Promise<string>;
    /**
     * List all session keys currently held by the provider.
     *
     * @returns Array of key IDs
     */
    listKeys(): string[];
    /**
     * Check if a key exists in the provider.
     *
     * @param keyId - The key ID to check
     * @returns True if the key exists
     */
    hasKey(keyId: string): boolean;
}
/**
 * Create a new WasmKeyProvider instance.
 *
 * @param sessionManager - The WASM session manager
 * @returns A new WasmKeyProvider instance
 */
declare function createWasmKeyProvider(sessionManager: SessionManagerWithListing): WasmKeyProvider;

export { type AuthDelegationArtifact as A, type CreateOwnerDelegationParams as C, type DelegateToOptions as D, FileSessionStorage as F, MemorySessionStorage as M, type NodeEventEmitterStrategy as N, type OwnerDelegationReceipt as O, type PortableDelegation as P, type RestorableSession as R, type SignStrategy as S, TinyCloudNode as T, WasmKeyProvider as W, type AuthRequestArtifact as a, type DelegateToResult as b, DelegatedAccess as c, type DelegationAuthority as d, NodeUserAuthorization as e, type NodeUserAuthorizationConfig as f, type RuntimePermissionGrantOptions as g, type TinyCloudNodeConfig as h, type WasmKeyProviderConfig as i, createWasmKeyProvider as j, defaultSignStrategy as k, deserializeDelegation as l, grantAuthRequest as m, serializeDelegation as s };
