// src/core.ts
import { TinyCloud as TinyCloud2 } from "@tinycloud/sdk-core";
import {
  SilentNotificationHandler as SilentNotificationHandler2,
  AutoApproveSpaceCreationHandler as AutoApproveSpaceCreationHandler2,
  defaultSpaceCreationHandler,
  IdentityParseError,
  addressStorageKey,
  canonicalizeAddress as canonicalizeAddress3,
  canonicalizeDid,
  canonicalizeDidUrl,
  canonicalizeNetworkId,
  didCacheKey,
  didEquals,
  isEvmAddress,
  makePkhSpaceId as makePkhSpaceId2,
  parsePkhDid,
  pkhDid as pkhDid3,
  principalDid,
  principalDidEquals as principalDidEquals3,
  parseCanonicalNetworkId,
  TinyCloudDebugLogger,
  tinyCloudDebugLogger,
  enableTinyCloudDebug,
  disableTinyCloudDebug,
  getTinyCloudDebugLogs,
  clearTinyCloudDebugLogs,
  installTinyCloudDebugGlobals
} from "@tinycloud/sdk-core";

// src/storage/MemorySessionStorage.ts
var MemorySessionStorage = class {
  constructor() {
    this.sessions = /* @__PURE__ */ new Map();
  }
  /**
   * Save a session for an address.
   */
  async save(address, session) {
    const normalizedAddress = address.toLowerCase();
    this.sessions.set(normalizedAddress, session);
  }
  /**
   * Load a session for an address.
   */
  async load(address) {
    const normalizedAddress = address.toLowerCase();
    const session = this.sessions.get(normalizedAddress);
    if (!session) {
      return null;
    }
    const expiresAt = new Date(session.expiresAt);
    if (expiresAt < /* @__PURE__ */ new Date()) {
      this.sessions.delete(normalizedAddress);
      return null;
    }
    return session;
  }
  /**
   * Clear a session for an address.
   */
  async clear(address) {
    const normalizedAddress = address.toLowerCase();
    this.sessions.delete(normalizedAddress);
  }
  /**
   * Check if a session exists for an address.
   */
  exists(address) {
    const normalizedAddress = address.toLowerCase();
    const session = this.sessions.get(normalizedAddress);
    if (!session) {
      return false;
    }
    const expiresAt = new Date(session.expiresAt);
    if (expiresAt < /* @__PURE__ */ new Date()) {
      this.sessions.delete(normalizedAddress);
      return false;
    }
    return true;
  }
  /**
   * Memory storage is always available.
   */
  isAvailable() {
    return true;
  }
  /**
   * Clear all sessions.
   */
  clearAll() {
    this.sessions.clear();
  }
  /**
   * Get the number of stored sessions.
   */
  size() {
    return this.sessions.size;
  }
};

// src/storage/FileSessionStorage.ts
import { validatePersistedSessionData } from "@tinycloud/sdk-core";
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";
var FileSessionStorage = class {
  /**
   * Create a new FileSessionStorage.
   *
   * @param baseDir - Directory to store session files (default: ~/.tinycloud/sessions)
   */
  constructor(baseDir) {
    this.baseDir = baseDir || this.getDefaultDir();
    this.ensureDirectoryExists();
  }
  /**
   * Get the default session storage directory.
   */
  getDefaultDir() {
    const home = process.env.HOME || process.env.USERPROFILE || "/tmp";
    return join(home, ".tinycloud", "sessions");
  }
  /**
   * Ensure the storage directory exists.
   */
  ensureDirectoryExists() {
    if (!existsSync(this.baseDir)) {
      mkdirSync(this.baseDir, { recursive: true });
    }
  }
  /**
   * Get the file path for an address.
   */
  getFilePath(address) {
    const normalizedAddress = address.toLowerCase();
    const filename = `${normalizedAddress.replace("0x", "")}.json`;
    return join(this.baseDir, filename);
  }
  /**
   * Save a session for an address.
   */
  async save(address, session) {
    const filePath = this.getFilePath(address);
    const data = JSON.stringify(session, null, 2);
    writeFileSync(filePath, data, "utf-8");
  }
  /**
   * Load a session for an address.
   */
  async load(address) {
    const filePath = this.getFilePath(address);
    if (!existsSync(filePath)) {
      return null;
    }
    try {
      const data = readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(data);
      const validation = validatePersistedSessionData(parsed);
      if (!validation.ok) {
        console.warn(`Invalid session data for ${address}:`, validation.error.message);
        unlinkSync(filePath);
        return null;
      }
      const session = validation.data;
      const expiresAt = new Date(session.expiresAt);
      if (expiresAt < /* @__PURE__ */ new Date()) {
        unlinkSync(filePath);
        return null;
      }
      return session;
    } catch (error) {
      try {
        unlinkSync(filePath);
      } catch {
      }
      return null;
    }
  }
  /**
   * Clear a session for an address.
   */
  async clear(address) {
    const filePath = this.getFilePath(address);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }
  /**
   * Check if a session exists for an address.
   */
  exists(address) {
    const filePath = this.getFilePath(address);
    if (!existsSync(filePath)) {
      return false;
    }
    try {
      const data = readFileSync(filePath, "utf-8");
      const session = JSON.parse(data);
      const expiresAt = new Date(session.expiresAt);
      if (expiresAt < /* @__PURE__ */ new Date()) {
        unlinkSync(filePath);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Check if file system storage is available.
   */
  isAvailable() {
    try {
      this.ensureDirectoryExists();
      return existsSync(this.baseDir);
    } catch {
      return false;
    }
  }
};

// src/authorization/NodeUserAuthorization.ts
import {
  fetchPeerId,
  submitHostDelegation,
  activateSessionWithHost,
  checkNodeInfo,
  AutoApproveSpaceCreationHandler,
  DEFAULT_MANIFEST_SPACE,
  ENCRYPTION_PERMISSION_SERVICE,
  composeManifestRequest,
  parseNetworkId,
  principalDidEquals,
  resourceCapabilitiesToAbilitiesMap,
  resourceCapabilitiesToSpaceAbilitiesMap,
  resolveTinyCloudHosts,
  EXPIRY,
  canonicalizeAddress,
  makePkhSpaceId,
  pkhDid,
  KV,
  SQL,
  DUCKDB,
  CAPABILITIES,
  HOOKS,
  ENCRYPTION
} from "@tinycloud/sdk-core";

// src/authorization/strategies.ts
import { createOpenKeyCallbackSigningStrategy } from "@tinycloud/sdk-core";
var defaultSignStrategy = { type: "auto-sign" };

// src/authorization/NodeUserAuthorization.ts
var DECRYPT_ACTION = ENCRYPTION.DECRYPT;
var NETWORK_CREATE_ACTION = ENCRYPTION.NETWORK_CREATE;
function didPrincipalMatches(actual, expected) {
  try {
    return principalDidEquals(actual, expected);
  } catch {
    return actual === expected;
  }
}
function addRawAbility(rawAbilities, resource, action) {
  const actions = rawAbilities[resource];
  if (actions === void 0) {
    rawAbilities[resource] = [action];
    return;
  }
  if (!actions.includes(action)) {
    actions.push(action);
  }
}
var NodeUserAuthorization = class {
  constructor(config) {
    this.extensions = [];
    this._nodeFeatures = [];
    this._lastActivationSkippedSpaceIds = [];
    this.wasm = config.wasmBindings;
    this.signer = config.signer;
    this.signStrategy = config.signStrategy ?? defaultSignStrategy;
    this.sessionStorage = config.sessionStorage ?? new MemorySessionStorage();
    this.domain = config.domain;
    this.uri = config.uri ?? `https://${config.domain}`;
    this.statement = config.statement;
    this.spacePrefix = config.spacePrefix ?? "default";
    this.defaultActions = config.defaultActions ?? {
      kv: {
        "": [KV.PUT, KV.GET, KV.DEL, KV.LIST, KV.METADATA]
      },
      sql: {
        "": [SQL.READ, SQL.WRITE, SQL.SCHEMA, SQL.ADMIN, SQL.EXPORT]
      },
      duckdb: {
        "": [
          DUCKDB.READ,
          DUCKDB.WRITE,
          DUCKDB.ADMIN,
          DUCKDB.DESCRIBE,
          DUCKDB.EXPORT,
          DUCKDB.IMPORT,
          DUCKDB.EXECUTE
        ]
      },
      capabilities: {
        "": [CAPABILITIES.READ]
      },
      hooks: {
        "": [HOOKS.SUBSCRIBE, HOOKS.REGISTER, HOOKS.LIST, HOOKS.UNREGISTER]
      }
    };
    this.sessionExpirationMs = config.sessionExpirationMs ?? EXPIRY.SESSION_MS;
    this.autoCreateSpace = config.autoCreateSpace ?? false;
    this.spaceCreationHandler = config.spaceCreationHandler;
    this.tinycloudHosts = config.tinycloudHosts;
    this.tinycloudRegistryUrl = config.tinycloudRegistryUrl;
    this.tinycloudFallbackHosts = config.tinycloudFallbackHosts;
    this.enablePublicSpace = config.enablePublicSpace ?? true;
    this.nonce = config.nonce;
    this.siweConfig = config.siweConfig;
    this.includeAccountRegistryPermissions = config.includeAccountRegistryPermissions ?? true;
    this._manifest = config.manifest;
    this._capabilityRequest = config.capabilityRequest;
    this.sessionManager = this.wasm.createSessionManager();
  }
  /**
   * Return the manifest currently driving sign-in behavior, or
   * `undefined` if none is set. Used by TinyCloudWeb/TinyCloudNode
   * internals to surface the manifest for requestPermissions flows
   * without forcing the caller to track it separately.
   */
  get manifest() {
    return this._manifest;
  }
  get capabilityRequest() {
    return this.getCapabilityRequest();
  }
  get hosts() {
    return this.tinycloudHosts ? [...this.tinycloudHosts] : [];
  }
  /**
   * Install or replace the stored manifest. Takes effect on the next
   * `signIn()` call — the current session (if any) is not touched.
   */
  setManifest(manifest) {
    this._manifest = manifest;
    this._capabilityRequest = void 0;
  }
  setCapabilityRequest(request) {
    this._capabilityRequest = request;
  }
  /**
   * The current active session (web-core compatible).
   */
  get session() {
    return this._session;
  }
  /**
   * The current TinyCloud session with full delegation data.
   * Includes spaceId, delegationHeader, and delegationCid.
   */
  get tinyCloudSession() {
    return this._tinyCloudSession;
  }
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
  setRestoredTinyCloudSession(session, hosts) {
    const address = canonicalizeAddress(session.address);
    this._tinyCloudSession = { ...session, address };
    this._address = address;
    this._chainId = session.chainId;
    if ((!this.tinycloudHosts || this.tinycloudHosts.length === 0) && hosts && hosts.length > 0) {
      this.tinycloudHosts = [...hosts];
    }
  }
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
  async ensureTinyCloudHosts() {
    if (this.tinycloudHosts && this.tinycloudHosts.length > 0) {
      return;
    }
    if (this._address === void 0 || this._chainId === void 0) {
      throw new Error(
        "Cannot resolve TinyCloud hosts: no address/chainId available. Sign in or restore a session first."
      );
    }
    await this.resolveTinyCloudHostsForSignIn(this._address, this._chainId);
  }
  async resolveTinyCloudHostsForSignIn(address, chainId) {
    if (this.tinycloudHosts && this.tinycloudHosts.length > 0) {
      return;
    }
    const subject = pkhDid(address, chainId);
    const resolved = await resolveTinyCloudHosts(subject, {
      registryUrl: this.tinycloudRegistryUrl,
      fallbackHosts: this.tinycloudFallbackHosts
    });
    this.tinycloudHosts = resolved.hosts;
  }
  requireTinyCloudHosts() {
    if (!this.tinycloudHosts || this.tinycloudHosts.length === 0) {
      throw new Error("TinyCloud hosts have not been resolved. Call signIn() first.");
    }
    return this.tinycloudHosts;
  }
  get primaryTinyCloudHost() {
    return this.requireTinyCloudHosts()[0];
  }
  get nodeFeatures() {
    return this._nodeFeatures;
  }
  get lastActivationSkippedSpaceIds() {
    return [...this._lastActivationSkippedSpaceIds];
  }
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
  getCapabilityRequest() {
    if (this._capabilityRequest !== void 0) {
      return this._capabilityRequest;
    }
    if (this._manifest === void 0) {
      return void 0;
    }
    this._capabilityRequest = composeManifestRequest(
      Array.isArray(this._manifest) ? this._manifest : [this._manifest],
      {
        includeAccountRegistryPermissions: this.includeAccountRegistryPermissions
      }
    );
    return this._capabilityRequest;
  }
  resolveSpaceName(space, address, chainId) {
    if (space.startsWith("tinycloud:")) {
      return space;
    }
    return makePkhSpaceId(address, chainId, space);
  }
  defaultEncryptionNetworkId(address, chainId) {
    return `urn:tinycloud:encryption:${pkhDid(address, chainId)}:default`;
  }
  resolveSignInCapabilities(address, chainId) {
    const request = this.getCapabilityRequest();
    if (request === void 0) {
      const defaultNetworkId = this.defaultEncryptionNetworkId(address, chainId);
      const primarySpaceId2 = makePkhSpaceId(address, chainId, this.spacePrefix);
      const secretsSpaceId = makePkhSpaceId(address, chainId, "secrets");
      return {
        abilities: this.defaultActions,
        spaceId: primarySpaceId2,
        spaceAbilities: {
          [primarySpaceId2]: this.defaultActions,
          [secretsSpaceId]: {
            kv: {
              "vault/secrets/": [
                KV.GET,
                KV.PUT,
                KV.DEL,
                KV.LIST,
                KV.METADATA
              ]
            }
          }
        },
        rawAbilities: {
          [defaultNetworkId]: [DECRYPT_ACTION, NETWORK_CREATE_ACTION]
        }
      };
    }
    const rawAbilities = {};
    const currentDid = pkhDid(address, chainId);
    const spaceResources = request.resources.filter((entry) => {
      if (entry.service !== ENCRYPTION_PERMISSION_SERVICE) {
        return true;
      }
      for (const action of entry.actions) {
        addRawAbility(rawAbilities, entry.path, action);
      }
      if (entry.actions.includes(DECRYPT_ACTION)) {
        const parsed = parseNetworkId(entry.path);
        if (didPrincipalMatches(parsed.ownerDid, currentDid)) {
          addRawAbility(rawAbilities, entry.path, NETWORK_CREATE_ACTION);
        }
      }
      return false;
    });
    const primarySpaceName = spaceResources.find((entry) => entry.space !== "account")?.space ?? DEFAULT_MANIFEST_SPACE;
    const primarySpaceId = this.resolveSpaceName(
      primarySpaceName,
      address,
      chainId
    );
    const bySpace = resourceCapabilitiesToSpaceAbilitiesMap(spaceResources);
    const spaceAbilities = {};
    for (const [space, abilities] of Object.entries(bySpace)) {
      spaceAbilities[this.resolveSpaceName(space, address, chainId)] = abilities;
    }
    return {
      abilities: spaceAbilities[primarySpaceId] ?? resourceCapabilitiesToAbilitiesMap([]),
      spaceId: primarySpaceId,
      spaceAbilities,
      rawAbilities: Object.keys(rawAbilities).length > 0 ? rawAbilities : void 0
    };
  }
  /**
   * Build SIWE overrides from the top-level nonce and siweConfig.
   * - Top-level `nonce` is seeded first so `siweConfig.nonce` wins if both are set.
   * - statement is prepended to the default statement
   * - resources are appended to the default resources
   * - uri triggers a warning (overwriting delegation target)
   * - all other fields override directly
   * - per-call nonce overrides siweConfig.nonce when provided
   */
  buildSiweOverrides(options) {
    const base = { uri: this.uri };
    if (this.nonce !== void 0) {
      base.nonce = this.nonce;
    }
    if (!this.siweConfig && !options?.nonce) {
      return base;
    }
    const { statement, resources, uri, ...rest } = this.siweConfig ?? {};
    const overrides = { ...base, ...rest };
    if (statement) {
      overrides.statement = this.statement ? `${statement} ${this.statement}` : statement;
    }
    if (resources && resources.length > 0) {
      overrides.resources = resources;
    }
    if (uri) {
      console.warn(
        "[tinycloud] siweConfig.uri is overwriting the delegation target URI. This may break delegation chain validation if the URI does not match the session key DID."
      );
      overrides.uri = uri;
    }
    if (options?.nonce) {
      overrides.nonce = options.nonce;
    }
    return overrides;
  }
  /**
   * Add an extension to the authorization flow.
   */
  extend(extension) {
    this.extensions.push(extension);
  }
  /**
   * Get the space ID for the current session.
   */
  getSpaceId() {
    return this._tinyCloudSession?.spaceId;
  }
  /**
   * Create the space on the TinyCloud server (host delegation).
   * This registers the user as the owner of the space.
   */
  async hostSpace(targetSpaceId, purpose) {
    if (!this._tinyCloudSession || !this._address || !this._chainId) {
      throw new Error("Must be signed in to host space");
    }
    await this.ensureTinyCloudHosts();
    const host = this.primaryTinyCloudHost;
    const spaceId = targetSpaceId ?? this._tinyCloudSession.spaceId;
    const peerId = await fetchPeerId(host, spaceId);
    const siwe = this.wasm.generateHostSIWEMessage({
      address: this._address,
      chainId: this._chainId,
      domain: this.domain,
      issuedAt: (/* @__PURE__ */ new Date()).toISOString(),
      spaceId,
      peerId
    });
    const signature = await this.signMessage(siwe, purpose);
    const headers = this.wasm.siweToDelegationHeaders({ siwe, signature });
    const result = await submitHostDelegation(host, headers);
    return result.success;
  }
  /**
   * Create a specific space on the server via host delegation.
   * Used for lazy creation of additional spaces (e.g., public).
   */
  async hostPublicSpace(spaceId) {
    return this.hostSpace(spaceId);
  }
  /**
   * Create a specific owned space on the server via host delegation.
   * Used by manifest registry setup for the account space.
   */
  async hostOwnedSpace(spaceId, purpose) {
    return this.hostSpace(spaceId, purpose);
  }
  /**
   * Ensure the user's space exists on the TinyCloud server.
   * Creates the space if it doesn't exist and autoCreateSpace is enabled.
   * If autoCreateSpace is false and space doesn't exist, silently returns
   * (user may be using delegations to access other spaces).
   *
   * @throws Error if space creation fails
   */
  async ensureSpaceExists() {
    if (!this._tinyCloudSession) {
      throw new Error("Must be signed in to ensure space exists");
    }
    await this.ensureTinyCloudHosts();
    const host = this.primaryTinyCloudHost;
    const primarySpaceId = this._tinyCloudSession.spaceId;
    const result = await activateSessionWithHost(
      host,
      this._tinyCloudSession.delegationHeader
    );
    this.recordActivationSkippedSpaces(result, primarySpaceId);
    const handler = this.spaceCreationHandler ?? (this.autoCreateSpace ? new AutoApproveSpaceCreationHandler() : void 0);
    const creationContext = {
      spaceId: primarySpaceId,
      address: this._address,
      chainId: this._chainId,
      host
    };
    if (result.success) {
      const primarySkipped = result.skipped?.includes(primarySpaceId);
      if (!primarySkipped) {
        return;
      }
      if (!handler) {
        return;
      }
      const confirmed = await handler.confirmSpaceCreation(creationContext);
      if (!confirmed) {
        return;
      }
      try {
        const created = await this.hostSpace();
        if (!created) {
          const err = new Error(`Failed to create space: ${primarySpaceId}`);
          handler.onSpaceCreationFailed?.(creationContext, err);
          throw err;
        }
      } catch (error) {
        handler.onSpaceCreationFailed?.(
          creationContext,
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
      const retryResult = await activateSessionWithHost(
        host,
        this._tinyCloudSession.delegationHeader
      );
      if (!retryResult.success) {
        const err = new Error(
          `Failed to activate session after creating space: ${retryResult.error}`
        );
        handler.onSpaceCreationFailed?.(creationContext, err);
        throw err;
      }
      handler.onSpaceCreated?.(creationContext);
      return;
    }
    if (result.status === 404) {
      if (!handler) {
        return;
      }
      const confirmed = await handler.confirmSpaceCreation(creationContext);
      if (!confirmed) {
        return;
      }
      try {
        const created = await this.hostSpace();
        if (!created) {
          const err = new Error(`Failed to create space: ${primarySpaceId}`);
          handler.onSpaceCreationFailed?.(creationContext, err);
          throw err;
        }
      } catch (error) {
        handler.onSpaceCreationFailed?.(
          creationContext,
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
      const retryResult = await activateSessionWithHost(
        host,
        this._tinyCloudSession.delegationHeader
      );
      if (!retryResult.success) {
        const err = new Error(
          `Failed to activate session after creating space: ${retryResult.error}`
        );
        handler.onSpaceCreationFailed?.(creationContext, err);
        throw err;
      }
      handler.onSpaceCreated?.(creationContext);
      return;
    }
    throw new Error(`Failed to activate session: ${result.error}`);
  }
  recordActivationSkippedSpaces(result, primarySpaceId) {
    if (result.success) {
      this._lastActivationSkippedSpaceIds = result.skipped ?? [];
      return;
    }
    this._lastActivationSkippedSpaceIds = result.status === 404 ? [primarySpaceId] : [];
  }
  async createBootstrapSession(options) {
    if (!this._address || !this._chainId) {
      throw new Error("Must be signed in before creating bootstrap sessions");
    }
    const address = this._address;
    const chainId = this._chainId;
    const keyId = `bootstrap-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.sessionManager.createSessionKey(keyId);
    const jwkString = this.sessionManager.jwk(keyId);
    if (!jwkString) {
      throw new Error("Failed to create bootstrap session key");
    }
    const jwk = JSON.parse(jwkString);
    const now = /* @__PURE__ */ new Date();
    const expirationTime = new Date(now.getTime() + this.sessionExpirationMs);
    const abilities = resourceCapabilitiesToAbilitiesMap(
      options.capabilityRequest.resources
    );
    const prepared = this.wasm.prepareSession({
      abilities,
      ...options.rawAbilities !== void 0 ? { rawAbilities: options.rawAbilities } : {},
      address,
      chainId,
      domain: this.domain,
      issuedAt: now.toISOString(),
      expirationTime: expirationTime.toISOString(),
      spaceId: options.spaceId,
      jwk,
      ...this.buildSiweOverrides()
    });
    const signature = await this.requestSignature({
      address,
      chainId,
      message: prepared.siwe,
      type: "siwe",
      purpose: "bootstrap-session"
    });
    const session = this.wasm.completeSessionSetup({
      ...prepared,
      signature
    });
    return {
      address,
      chainId,
      sessionKey: keyId,
      spaceId: options.spaceId,
      delegationCid: session.delegationCid,
      delegationHeader: session.delegationHeader,
      verificationMethod: this.sessionManager.getDID(keyId),
      jwk,
      siwe: prepared.siwe,
      signature
    };
  }
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
  async signIn(options) {
    this._address = canonicalizeAddress(await this.signer.getAddress());
    this._chainId = await this.signer.getChainId();
    const address = this._address;
    const chainId = this._chainId;
    await this.resolveTinyCloudHostsForSignIn(address, chainId);
    const keyId = `session-${Date.now()}`;
    this.sessionManager.renameSessionKeyId("default", keyId);
    const jwkString = this.sessionManager.jwk(keyId);
    if (!jwkString) {
      throw new Error("Failed to create session key");
    }
    const jwk = JSON.parse(jwkString);
    const capabilityPlan = this.resolveSignInCapabilities(address, chainId);
    const spaceId = capabilityPlan.spaceId;
    const now = /* @__PURE__ */ new Date();
    const expirationTime = new Date(now.getTime() + this.sessionExpirationMs);
    const prepared = this.wasm.prepareSession({
      abilities: capabilityPlan.abilities,
      ...capabilityPlan.spaceAbilities !== void 0 ? { spaceAbilities: capabilityPlan.spaceAbilities } : {},
      ...capabilityPlan.rawAbilities !== void 0 ? { rawAbilities: capabilityPlan.rawAbilities } : {},
      address,
      chainId,
      domain: this.domain,
      issuedAt: now.toISOString(),
      expirationTime: expirationTime.toISOString(),
      spaceId,
      jwk,
      ...this.buildSiweOverrides(options)
    });
    const signature = await this.requestSignature({
      address,
      chainId,
      message: prepared.siwe,
      type: "siwe",
      purpose: "sign-in"
    });
    const session = this.wasm.completeSessionSetup({
      ...prepared,
      signature
    });
    const clientSession = {
      address,
      walletAddress: address,
      chainId,
      sessionKey: keyId,
      siwe: prepared.siwe,
      signature
    };
    const spacesMetadata = this.enablePublicSpace ? { public: makePkhSpaceId(address, chainId, "public") } : void 0;
    const tinyCloudSession = {
      address,
      chainId,
      sessionKey: keyId,
      spaceId,
      spaces: spacesMetadata,
      delegationCid: session.delegationCid,
      delegationHeader: session.delegationHeader,
      verificationMethod: this.sessionManager.getDID(keyId),
      jwk,
      siwe: prepared.siwe,
      signature
    };
    const persistedData = {
      address,
      chainId,
      sessionKey: JSON.stringify(jwk),
      siwe: prepared.siwe,
      signature,
      tinycloudSession: {
        delegationHeader: session.delegationHeader,
        delegationCid: session.delegationCid,
        spaceId,
        spaces: spacesMetadata,
        verificationMethod: this.sessionManager.getDID(keyId)
      },
      expiresAt: expirationTime.toISOString(),
      createdAt: now.toISOString(),
      version: "1.0",
      tinycloudHosts: this.tinycloudHosts
    };
    await this.sessionStorage.save(address, persistedData);
    this._session = clientSession;
    this._tinyCloudSession = tinyCloudSession;
    this._address = address;
    this._chainId = chainId;
    const nodeInfo = await checkNodeInfo(
      this.primaryTinyCloudHost,
      this.wasm.protocolVersion()
    );
    this._nodeFeatures = nodeInfo.features;
    for (const ext of this.extensions) {
      if (ext.afterSignIn) {
        await ext.afterSignIn(clientSession);
      }
    }
    await this.ensureSpaceExists();
    return clientSession;
  }
  /**
   * Sign out and clear the current session.
   */
  async signOut() {
    if (this._address) {
      await this.clearPersistedSession(this._address);
    }
    this._session = void 0;
  }
  /**
   * Get the current wallet/signer address.
   */
  address() {
    return this._address;
  }
  /**
   * Get the current chain ID.
   */
  chainId() {
    return this._chainId;
  }
  /**
   * Sign a message with the connected signer.
   */
  async signMessage(message, purpose) {
    if (!this._address) {
      this._address = canonicalizeAddress(await this.signer.getAddress());
    }
    if (!this._chainId) {
      this._chainId = await this.signer.getChainId();
    }
    return this.requestSignature({
      address: this._address,
      chainId: this._chainId,
      message,
      type: "message",
      ...purpose ? { purpose } : {}
    });
  }
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
  async prepareSessionForSigning() {
    const address = canonicalizeAddress(await this.signer.getAddress());
    const chainId = await this.signer.getChainId();
    const keyId = `session-${Date.now()}`;
    this.sessionManager.renameSessionKeyId("default", keyId);
    const jwkString = this.sessionManager.jwk(keyId);
    if (!jwkString) {
      throw new Error("Failed to create session key");
    }
    const jwk = JSON.parse(jwkString);
    const capabilityPlan = this.resolveSignInCapabilities(address, chainId);
    const spaceId = capabilityPlan.spaceId;
    const now = /* @__PURE__ */ new Date();
    const expirationTime = new Date(now.getTime() + this.sessionExpirationMs);
    const prepared = this.wasm.prepareSession({
      abilities: capabilityPlan.abilities,
      ...capabilityPlan.spaceAbilities !== void 0 ? { spaceAbilities: capabilityPlan.spaceAbilities } : {},
      ...capabilityPlan.rawAbilities !== void 0 ? { rawAbilities: capabilityPlan.rawAbilities } : {},
      address,
      chainId,
      domain: this.domain,
      issuedAt: now.toISOString(),
      expirationTime: expirationTime.toISOString(),
      spaceId,
      jwk,
      ...this.buildSiweOverrides()
    });
    return {
      prepared,
      keyId,
      jwk,
      address,
      chainId
    };
  }
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
  async signInWithPreparedSession(prepared, signature, keyId, jwk) {
    const session = this.wasm.completeSessionSetup({
      ...prepared,
      signature
    });
    const address = canonicalizeAddress(await this.signer.getAddress());
    const chainId = await this.signer.getChainId();
    await this.resolveTinyCloudHostsForSignIn(address, chainId);
    const clientSession = {
      address,
      walletAddress: address,
      chainId,
      sessionKey: keyId,
      siwe: prepared.siwe,
      signature
    };
    const spacesMetadata = this.enablePublicSpace ? { public: makePkhSpaceId(address, chainId, "public") } : void 0;
    const tinyCloudSession = {
      address,
      chainId,
      sessionKey: keyId,
      spaceId: prepared.spaceId,
      spaces: spacesMetadata,
      delegationCid: session.delegationCid,
      delegationHeader: session.delegationHeader,
      verificationMethod: this.sessionManager.getDID(keyId),
      jwk,
      siwe: prepared.siwe,
      signature
    };
    const expirationMatch = prepared.siwe.match(/Expiration Time: (.+)/);
    const issuedAtMatch = prepared.siwe.match(/Issued At: (.+)/);
    const expiresAt = expirationMatch?.[1] ?? new Date(Date.now() + this.sessionExpirationMs).toISOString();
    const createdAt = issuedAtMatch?.[1] ?? (/* @__PURE__ */ new Date()).toISOString();
    const persistedData = {
      address,
      chainId,
      sessionKey: JSON.stringify(jwk),
      siwe: prepared.siwe,
      signature,
      tinycloudSession: {
        delegationHeader: session.delegationHeader,
        delegationCid: session.delegationCid,
        spaceId: prepared.spaceId,
        spaces: spacesMetadata,
        verificationMethod: this.sessionManager.getDID(keyId)
      },
      expiresAt,
      createdAt,
      version: "1.0",
      tinycloudHosts: this.tinycloudHosts
    };
    await this.sessionStorage.save(address, persistedData);
    this._session = clientSession;
    this._tinyCloudSession = tinyCloudSession;
    this._address = address;
    this._chainId = chainId;
    const nodeInfo = await checkNodeInfo(
      this.primaryTinyCloudHost,
      this.wasm.protocolVersion()
    );
    this._nodeFeatures = nodeInfo.features;
    for (const ext of this.extensions) {
      if (ext.afterSignIn) {
        await ext.afterSignIn(clientSession);
      }
    }
    await this.ensureSpaceExists();
    return clientSession;
  }
  /**
   * Clear persisted session data.
   */
  async clearPersistedSession(address) {
    const targetAddress = address ?? this._address;
    if (targetAddress) {
      await this.sessionStorage.clear(targetAddress);
    }
  }
  /**
   * Check if a session is persisted for an address.
   */
  isSessionPersisted(address) {
    return this.sessionStorage.exists(address);
  }
  /**
   * Request a signature based on the configured strategy.
   */
  async requestSignature(request) {
    switch (this.signStrategy.type) {
      case "auto-sign":
        return this.signer.signMessage(request.message);
      case "auto-reject":
        throw new Error("Sign request rejected by auto-reject strategy");
      case "callback": {
        const response = await this.signStrategy.handler(request);
        if (!response.approved) {
          throw new Error(
            response.reason ?? "Sign request rejected by callback"
          );
        }
        return response.signature ?? await this.signer.signMessage(request.message);
      }
      case "event-emitter": {
        return this.requestSignatureViaEmitter(
          request,
          this.signStrategy.emitter,
          this.signStrategy.timeout ?? 6e4
        );
      }
      default:
        throw new Error(
          `Unknown sign strategy: ${this.signStrategy.type}`
        );
    }
  }
  /**
   * Request signature via event emitter with timeout.
   */
  requestSignatureViaEmitter(request, emitter, timeout) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Sign request timed out"));
      }, timeout);
      const respond = async (response) => {
        clearTimeout(timeoutId);
        if (!response.approved) {
          reject(
            new Error(response.reason ?? "Sign request rejected via emitter")
          );
        } else {
          const signature = response.signature ?? await this.signer.signMessage(request.message);
          resolve(signature);
        }
      };
      emitter.emit("sign-request", request, respond);
    });
  }
};

// src/TinyCloudNode.ts
import {
  TinyCloud,
  activateSessionWithHost as activateSessionWithHost2,
  KVService as KVService2,
  SQLService as SQLService2,
  DuckDbService as DuckDbService2,
  HooksService as HooksService2,
  DataVaultService,
  EncryptionService,
  SecretsService,
  createVaultCrypto,
  ServiceContext as ServiceContext2,
  SilentNotificationHandler,
  DelegationManager,
  SpaceService,
  CapabilityKeyRegistry,
  SharingService,
  UnsupportedFeatureError,
  makePublicSpaceId,
  ACCOUNT_REGISTRY_SPACE,
  BOOTSTRAP_SESSION_REQUESTS,
  SECRET_RECORDS_SCHEMA,
  SECRETS_SPACE as SECRETS_SPACE2,
  TINYCLOUD_SECRETS_BOOTSTRAP_MANIFEST,
  bootstrapSteps,
  ENCRYPTION_PERMISSION_SERVICE as ENCRYPTION_PERMISSION_SERVICE2,
  PermissionNotInManifestError,
  SessionExpiredError,
  expandPermissionEntries as expandPermissionEntriesCore,
  isCapabilitySubset,
  parseRecapCapabilities,
  SERVICE_LONG_TO_SHORT,
  KV as KV2,
  SQL as SQL2,
  DUCKDB as DUCKDB2,
  ENCRYPTION as ENCRYPTION2,
  EXPIRY as EXPIRY3,
  canonicalHashHex,
  canonicalizeEncryptionJson,
  verifyDidKeyEd25519Signature,
  canonicalizeAddress as canonicalizeAddress2,
  pkhDid as pkhDid2,
  resolveTinyCloudHosts as resolveTinyCloudHosts2,
  principalDidEquals as principalDidEquals2,
  parseNetworkId as parseNetworkId2
} from "@tinycloud/sdk-core";

// src/account/AccountService.ts
import { AccountService } from "@tinycloud/sdk-core";

// src/DelegatedAccess.ts
import {
  KVService,
  HooksService,
  SQLService,
  DuckDbService,
  ServiceContext
} from "@tinycloud/sdk-core";
var DelegatedAccess = class {
  constructor(session, delegation, host, invoke, invokeAny, telemetry) {
    this.session = session;
    this._delegation = delegation;
    this.host = host;
    this._serviceContext = new ServiceContext({
      invoke,
      invokeAny,
      fetch: globalThis.fetch.bind(globalThis),
      hosts: [host],
      telemetry
    });
    const prefix = this._delegation.path.replace(/\/$/, "");
    this._kv = new KVService({ prefix });
    this._kv.initialize(this._serviceContext);
    this._serviceContext.registerService("kv", this._kv);
    this._sql = new SQLService({});
    this._sql.initialize(this._serviceContext);
    this._serviceContext.registerService("sql", this._sql);
    this._duckdb = new DuckDbService({});
    this._duckdb.initialize(this._serviceContext);
    this._serviceContext.registerService("duckdb", this._duckdb);
    this._hooks = new HooksService({});
    this._hooks.initialize(this._serviceContext);
    this._serviceContext.registerService("hooks", this._hooks);
    const serviceSession = {
      delegationHeader: session.delegationHeader,
      delegationCid: session.delegationCid,
      spaceId: session.spaceId,
      verificationMethod: session.verificationMethod,
      jwk: session.jwk
    };
    this._serviceContext.setSession(serviceSession);
  }
  /**
   * Get the delegation this access was created from.
   */
  get delegation() {
    return this._delegation;
  }
  /**
   * The space ID this access is for.
   */
  get spaceId() {
    return this._delegation.spaceId;
  }
  /**
   * The path this access is scoped to.
   */
  get path() {
    return this._delegation.path;
  }
  /**
   * KV operations on the delegated space.
   */
  get kv() {
    return this._kv;
  }
  /**
   * SQL operations on the delegated space.
   */
  get sql() {
    return this._sql;
  }
  /**
   * DuckDB operations on the delegated space.
   */
  get duckdb() {
    return this._duckdb;
  }
  /**
   * Hooks write-stream subscriptions on the delegated space.
   */
  get hooks() {
    return this._hooks;
  }
  /**
   * Export the handles needed to rehydrate this activated delegation via
   * `TinyCloudNode.restoreSession(...)` in another process or after a
   * restart.
   *
   * See `RestorableSession` for lifetime caveats.
   */
  get restorable() {
    return {
      delegationHeader: this.session.delegationHeader,
      delegationCid: this.session.delegationCid,
      spaceId: this.session.spaceId,
      jwk: this.session.jwk,
      verificationMethod: this.session.verificationMethod,
      address: this.session.address,
      chainId: this.session.chainId
    };
  }
};

// src/keys/WasmKeyProvider.ts
var WasmKeyProvider = class {
  /**
   * Create a new WasmKeyProvider.
   *
   * @param config - Configuration with the WASM session manager
   */
  constructor(config) {
    this.sessionManager = config.sessionManager;
  }
  /**
   * Generate a new session key with the given name.
   *
   * This creates a new Ed25519 key pair in the WASM session manager.
   * The key can then be used for signing delegations in sharing links.
   *
   * @param name - A unique name/ID for the key (e.g., "share:timestamp:random")
   * @returns The key ID (same as the name provided)
   */
  async createSessionKey(name) {
    return this.sessionManager.createSessionKey(name);
  }
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
  getJWK(keyId) {
    const jwkJson = this.sessionManager.jwk(keyId);
    if (!jwkJson) {
      throw new Error(`Key not found: ${keyId}`);
    }
    return JSON.parse(jwkJson);
  }
  /**
   * Get the DID (Decentralized Identifier) for a key.
   *
   * Returns the did:key format DID derived from the key's public key.
   * This DID can be used as the delegatee in delegations.
   *
   * @param keyId - The key ID to retrieve
   * @returns The DID in did:key format (e.g., "did:key:z6Mk...")
   */
  async getDID(keyId) {
    return this.sessionManager.getDID(keyId);
  }
  /**
   * List all session keys currently held by the provider.
   *
   * @returns Array of key IDs
   */
  listKeys() {
    const keys = this.sessionManager.listSessionKeys?.();
    return Array.isArray(keys) ? keys : [];
  }
  /**
   * Check if a key exists in the provider.
   *
   * @param keyId - The key ID to check
   * @returns True if the key exists
   */
  hasKey(keyId) {
    const jwk = this.sessionManager.jwk(keyId);
    return jwk !== void 0;
  }
};
function createWasmKeyProvider(sessionManager) {
  return new WasmKeyProvider({ sessionManager });
}

// src/delegateToHelpers.ts
import {
  parseExpiry,
  SiweMessage,
  EXPIRY as EXPIRY2
} from "@tinycloud/sdk-core";
function legacyParamsToPermissionEntries(actions, path, spaceIdOverride) {
  const byService = /* @__PURE__ */ new Map();
  for (const a of actions) {
    const slashIdx = a.indexOf("/");
    if (slashIdx === -1) {
      continue;
    }
    const service = a.slice(0, slashIdx);
    if (!service.startsWith("tinycloud.")) {
      continue;
    }
    const list = byService.get(service);
    if (list === void 0) {
      byService.set(service, [a]);
    } else {
      list.push(a);
    }
  }
  const space = spaceIdOverride ?? "default";
  const entries = [];
  for (const [service, actionList] of byService) {
    entries.push({
      service,
      space,
      path,
      actions: actionList
    });
  }
  return entries;
}
var DEFAULT_DELEGATION_EXPIRY_MS = EXPIRY2.SESSION_MS;
function resolveExpiryMs(expiry) {
  if (expiry === void 0) {
    return DEFAULT_DELEGATION_EXPIRY_MS;
  }
  if (typeof expiry === "number") {
    if (!Number.isFinite(expiry) || expiry <= 0) {
      throw new Error(
        `delegateTo expiry must be a positive finite number (got ${expiry})`
      );
    }
    return expiry;
  }
  return parseExpiry(expiry);
}
function extractSiweExpiration(siwe) {
  const parsed = new SiweMessage(siwe);
  if (parsed.expirationTime === void 0 || parsed.expirationTime === null) {
    return void 0;
  }
  const d = new Date(parsed.expirationTime);
  if (Number.isNaN(d.getTime())) {
    throw new Error(
      `Session SIWE has unparseable expirationTime: ${parsed.expirationTime}`
    );
  }
  return d;
}

// src/NodeSecretsService.ts
import {
  ErrorCodes,
  resolveSecretListPrefix,
  resolveSecretPath,
  expandPermissionEntries,
  resolveManifest
} from "@tinycloud/sdk-core";
var SECRETS_SPACE = "secrets";
function ok() {
  return { ok: true, data: void 0 };
}
function secretsError(code, message, cause) {
  return {
    ok: false,
    error: {
      code,
      service: "secrets",
      message,
      ...cause ? { cause } : {}
    }
  };
}
function displayActionUrn(action) {
  switch (action) {
    case "get":
      return "tinycloud.kv/get";
    case "put":
      return "tinycloud.kv/put";
    case "del":
      return "tinycloud.kv/del";
    case "list":
      return "tinycloud.kv/list";
  }
}
function secretActionName(action) {
  return action;
}
function secretPermissionEntries(name, options, action, space, encryptionNetworkId) {
  const entries = [];
  const path = action === "list" ? resolveSecretListPrefix(options) : resolveSecretPath(name, options).permissionPaths.vault;
  entries.push({
    service: "tinycloud.kv",
    space,
    path,
    actions: [secretActionName(action)],
    skipPrefix: true
  });
  if (action === "get" && encryptionNetworkId !== void 0) {
    entries.push({
      service: "tinycloud.encryption",
      path: encryptionNetworkId,
      actions: ["decrypt"],
      skipPrefix: true
    });
  }
  return entries;
}
function normalizeSpace(space, resolveSpace) {
  if (!space) return void 0;
  if (space.startsWith("tinycloud:")) return space;
  return resolveSpace?.(space) ?? space;
}
function spaceMatches(granted, requested, resolveSpace) {
  if (!granted || !requested) return false;
  return normalizeSpace(granted, resolveSpace) === normalizeSpace(requested, resolveSpace);
}
var NodeSecretsService = class {
  constructor(config) {
    this.config = config;
    this.shouldRestoreUnlock = false;
  }
  get space() {
    return this.config.space ?? SECRETS_SPACE;
  }
  get vault() {
    return this.service.vault;
  }
  get isUnlocked() {
    return this.service.isUnlocked;
  }
  async unlock(signer) {
    const effectiveSigner = signer ?? this.config.getUnlockSigner?.();
    if (effectiveSigner !== void 0) {
      this.unlockSigner = effectiveSigner;
    }
    const result = await this.service.unlock(effectiveSigner);
    if (result.ok) {
      this.shouldRestoreUnlock = true;
    }
    return result;
  }
  lock() {
    this.shouldRestoreUnlock = false;
    this.service.lock();
  }
  async get(name, options) {
    const permission = await this.ensurePermission(name, options, "get");
    if (!permission.ok) return permission;
    return options === void 0 ? this.service.get(name) : this.service.get(name, options);
  }
  async put(name, value, options) {
    const permission = await this.ensurePermission(name, options, "put");
    if (!permission.ok) return permission;
    return options === void 0 ? this.service.put(name, value) : this.service.put(name, value, options);
  }
  async delete(name, options) {
    const permission = await this.ensurePermission(name, options, "del");
    if (!permission.ok) return permission;
    return options === void 0 ? this.service.delete(name) : this.service.delete(name, options);
  }
  async list(options) {
    const permission = await this.ensurePermission("", options, "list");
    if (!permission.ok) return permission;
    return options === void 0 ? this.service.list() : this.service.list(options);
  }
  get service() {
    return this.config.getService();
  }
  async ensurePermission(name, options, action) {
    const target = name || "secrets";
    let permissionEntries;
    try {
      permissionEntries = secretPermissionEntries(
        name,
        options,
        action,
        this.space,
        action === "get" ? this.config.getEncryptionNetworkId?.() : void 0
      );
    } catch (error) {
      return secretsError(
        ErrorCodes.INVALID_INPUT,
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : void 0
      );
    }
    if (this.hasPermission(permissionEntries)) {
      return ok();
    }
    if (!this.config.canEscalate()) {
      return secretsError(
        ErrorCodes.PERMISSION_DENIED,
        `Cannot autosign ${displayActionUrn(action)} for ${target}; TinyCloudNode needs wallet mode with a signer or privateKey.`
      );
    }
    try {
      await this.config.grantPermissions(permissionEntries);
      return this.restoreUnlockAfterEscalation();
    } catch (error) {
      return secretsError(
        ErrorCodes.PERMISSION_DENIED,
        error instanceof Error ? error.message : `Autosign escalation for ${displayActionUrn(action)} on ${target} failed.`,
        error instanceof Error ? error : void 0
      );
    }
  }
  async restoreUnlockAfterEscalation() {
    if (!this.shouldRestoreUnlock) {
      return ok();
    }
    return this.service.unlock(this.unlockSigner);
  }
  hasPermission(permissionEntries) {
    if (this.config.hasPermissions?.(permissionEntries)) {
      return true;
    }
    const manifest = this.config.getManifest();
    if (manifest === void 0) {
      return false;
    }
    const manifests = Array.isArray(manifest) ? manifest : [manifest];
    const requestedEntries = expandPermissionEntries(permissionEntries);
    return requestedEntries.every(
      (entry) => manifests.some((candidate) => {
        const resolved = resolveManifest(candidate);
        return resolved.resources.some(
          (resource) => resource.service === entry.service && spaceMatches(resource.space, entry.space, this.config.resolveSpace) && resource.path === entry.path && entry.actions.every((action) => resource.actions.includes(action))
        );
      })
    );
  }
};

// src/TinyCloudNode.ts
var DEFAULT_HOST = "https://node.tinycloud.xyz";
var DEFAULT_ENCRYPTION_NETWORK_NAME = "default";
var NETWORK_CREATE_ACTION2 = ENCRYPTION2.NETWORK_CREATE;
var DECRYPT_ACTION2 = ENCRYPTION2.DECRYPT;
var NETWORK_ADMIN_TYPE = "tinycloud.encryption.network-admin/v1";
var ROOT_DELEGATION_ACTIONS = [
  KV2.PUT,
  KV2.GET,
  KV2.DEL,
  KV2.LIST,
  KV2.METADATA,
  SQL2.READ,
  SQL2.WRITE,
  SQL2.ADMIN,
  SQL2.ALL,
  DUCKDB2.READ,
  DUCKDB2.WRITE,
  DUCKDB2.ADMIN,
  DUCKDB2.DESCRIBE,
  DUCKDB2.EXPORT,
  DUCKDB2.IMPORT,
  DUCKDB2.ALL
];
var DEFAULT_SESSION_EXPIRATION_MS = EXPIRY3.SESSION_MS;
function decodeAuthorizationBytes(authorization) {
  const encoded = authorization.replace(/^Bearer /i, "");
  const match = /^([A-Za-z0-9_-]+)(={1,2})?$/.exec(encoded);
  const unpadded = match?.[1];
  const paddingLength = match?.[2]?.length ?? 0;
  const remainder = unpadded === void 0 ? 1 : unpadded.length % 4;
  const expectedPaddingLength = remainder === 2 ? 2 : remainder === 3 ? 1 : 0;
  if (unpadded === void 0 || remainder === 1 || paddingLength !== 0 && paddingLength !== expectedPaddingLength) {
    throw new Error("Delegation Authorization is not canonical base64url DAG-CBOR");
  }
  const decoded = Uint8Array.from(Buffer.from(unpadded, "base64url"));
  if (Buffer.from(decoded).toString("base64url") !== unpadded) {
    throw new Error("Delegation Authorization is not canonical base64url DAG-CBOR");
  }
  return decoded;
}
function isOpenKeyAutoSignStrategy(strategy) {
  return strategy?.openKeyAutoSign === true;
}
function isInteractiveSigner(config) {
  if (config.privateKey) {
    return false;
  }
  if (isOpenKeyAutoSignStrategy(config.signStrategy)) {
    return false;
  }
  return config.signer !== void 0;
}
function didPrincipalMatches2(actual, expected) {
  try {
    return principalDidEquals2(actual, expected);
  } catch {
    return actual === expected;
  }
}
function sharingActionsToAbilities(path, actions) {
  var _a;
  const abilities = {};
  for (const action of actions) {
    const slash = action.indexOf("/");
    if (slash === -1) return void 0;
    const shortService = SERVICE_LONG_TO_SHORT[action.slice(0, slash)];
    if (shortService === void 0) return void 0;
    abilities[shortService] ?? (abilities[shortService] = {});
    (_a = abilities[shortService])[path] ?? (_a[path] = []);
    abilities[shortService][path].push(action);
  }
  return Object.keys(abilities).length > 0 ? abilities : void 0;
}
function base64UrlEncode(bytes) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let output = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    const triplet = a << 16 | (b ?? 0) << 8 | (c ?? 0);
    output += alphabet[triplet >> 18 & 63];
    output += alphabet[triplet >> 12 & 63];
    if (i + 1 < bytes.length) output += alphabet[triplet >> 6 & 63];
    if (i + 2 < bytes.length) output += alphabet[triplet & 63];
  }
  return output;
}
function base64UrlDecode(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const bytes = [];
  let buffer = 0;
  let bits = 0;
  for (const char of value) {
    const index = alphabet.indexOf(char);
    if (index < 0) {
      throw new Error("invalid base64url input");
    }
    buffer = buffer << 6 | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push(buffer >> bits & 255);
    }
  }
  return new Uint8Array(bytes);
}
async function signJwtInputWithJwk(signingInput, jwk) {
  const bytes = new TextEncoder().encode(signingInput);
  try {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) {
      throw new Error("WebCrypto subtle API is unavailable");
    }
    const key = await subtle.importKey(
      "jwk",
      jwk,
      { name: "Ed25519" },
      false,
      ["sign"]
    );
    return new Uint8Array(await subtle.sign({ name: "Ed25519" }, key, bytes));
  } catch {
    const nodeCrypto = await import("crypto");
    const key = nodeCrypto.createPrivateKey({ key: jwk, format: "jwk" });
    return new Uint8Array(nodeCrypto.sign(null, Buffer.from(bytes), key));
  }
}
async function rewriteInvocationAudience(authorization, audience, jwk) {
  const [headerPart, payloadPart] = authorization.split(".");
  if (!headerPart || !payloadPart) {
    throw new Error("invalid invocation authorization");
  }
  const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(headerPart)));
  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadPart)));
  payload.aud = audience;
  const signingInput = `${base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(header))
  )}.${base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)))}`;
  const signature = await signJwtInputWithJwk(signingInput, jwk);
  return `${signingInput}.${base64UrlEncode(signature)}`;
}
function authorizationHeader(headers) {
  if (Array.isArray(headers)) {
    const entry = headers.find(([name]) => name.toLowerCase() === "authorization");
    if (!entry) {
      throw new Error("network invocation did not include an Authorization header");
    }
    return entry[1];
  }
  const value = headers.Authorization ?? headers.authorization;
  if (!value) {
    throw new Error("network invocation did not include an Authorization header");
  }
  return value;
}
var _TinyCloudNode = class _TinyCloudNode {
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
  constructor(config = {}) {
    this.signer = null;
    this.auth = null;
    this.tc = null;
    this._chainId = 1;
    this._baseSecrets = /* @__PURE__ */ new Map();
    this._secrets = /* @__PURE__ */ new Map();
    this.runtimePermissionGrants = [];
    /**
     * True when the last signIn() detected an interactive signer and skipped
     * client-side bootstrap. Apps can read this to know whether bootstrap was
     * deferred to the server (OpenKey) or requires a separate user action.
     */
    this._bootstrapSkipped = false;
    /**
     * Outcome of the last signIn()'s account-bootstrap attempt. `skipped` is
     * true when bootstrap did not complete (interactive signer, auto-sign
     * denied, or a bootstrap step failed); `reason` carries the cause so apps
     * can surface a "finish account setup" call-to-action.
     */
    this._bootstrapStatus = {
      skipped: false
    };
    this.invokeWithRuntimePermissions = (session, service, path, action, facts) => {
      return this.wasmBindings.invoke(
        this.selectInvocationSession(session, service, path, action),
        service,
        path,
        action,
        facts
      );
    };
    this.invokeAnyWithRuntimePermissions = (session, entries, facts) => {
      if (!this.wasmBindings.invokeAny) {
        throw new Error("WASM binding does not support invokeAny");
      }
      const grant = this.findGrantForOperations(
        entries.flatMap((entry) => {
          const operation = this.operationFromInvokeAnyEntry(entry);
          return operation ? [operation] : [];
        })
      );
      return this.wasmBindings.invokeAny(grant?.session ?? session, entries, facts);
    };
    this.explicitHost = config.host;
    this.config = {
      ...config,
      host: config.host ?? DEFAULT_HOST
    };
    if (config.wasmBindings) {
      this.wasmBindings = config.wasmBindings;
    } else if (_TinyCloudNode.nodeDefaults) {
      this.wasmBindings = _TinyCloudNode.nodeDefaults.createWasmBindings();
    } else {
      throw new Error(
        "wasmBindings must be provided in config. Import from '@tinycloud/node-sdk' (not '/core') for automatic Node.js defaults."
      );
    }
    this.sessionManager = this.wasmBindings.createSessionManager();
    const defaultKeyId = "default";
    let jwkStr = this.sessionManager.jwk(defaultKeyId);
    if (jwkStr) {
      this.sessionKeyId = defaultKeyId;
    } else {
      this.sessionKeyId = this.sessionManager.createSessionKey(defaultKeyId);
      jwkStr = this.sessionManager.jwk(this.sessionKeyId);
    }
    if (!jwkStr) {
      throw new Error("Failed to get session key JWK");
    }
    this.sessionKeyJwk = JSON.parse(jwkStr);
    this._capabilityRegistry = new CapabilityKeyRegistry();
    this._keyProvider = new WasmKeyProvider({
      sessionManager: this.sessionManager
    });
    this.notificationHandler = config.notificationHandler ?? new SilentNotificationHandler();
    this._sharingService = new SharingService({
      hosts: [this.config.host],
      // session: undefined - not needed for receive()
      invoke: this.invokeWithRuntimePermissions,
      fetch: globalThis.fetch.bind(globalThis),
      keyProvider: this._keyProvider,
      registry: this._capabilityRegistry,
      // delegationManager: undefined - not needed for receive()
      createKVService: (config2) => {
        const prefix = config2.pathPrefix?.replace(/\/$/, "");
        const kvService = new KVService2({ prefix });
        const kvContext = new ServiceContext2({
          invoke: config2.invoke,
          fetch: config2.fetch ?? globalThis.fetch.bind(globalThis),
          hosts: config2.hosts,
          telemetry: this.config.telemetry
        });
        kvContext.setSession(config2.session);
        kvService.initialize(kvContext);
        return kvService;
      }
    });
    if (config.signer) {
      this.signer = config.signer;
      this.setupAuth(config);
    } else if (config.privateKey) {
      if (!_TinyCloudNode.nodeDefaults) {
        throw new Error(
          "privateKey requires PrivateKeySigner. Either provide a signer in config, or import from '@tinycloud/node-sdk' (not '/core') for automatic Node.js defaults."
        );
      }
      this.signer = _TinyCloudNode.nodeDefaults.createSigner(config.privateKey, this._chainId);
      this.setupAuth(config);
    }
  }
  /** @internal Register Node.js-specific defaults (NodeWasmBindings, PrivateKeySigner) */
  static registerNodeDefaults(defaults) {
    _TinyCloudNode.nodeDefaults = defaults;
  }
  /** Whether the last signIn() skipped client-side bootstrap because the
   * signer is interactive (browser wallet / EIP-1193 provider). */
  get bootstrapSkipped() {
    return this._bootstrapSkipped;
  }
  /** Outcome of the last signIn()'s account-bootstrap attempt. */
  get bootstrapStatus() {
    return this._bootstrapStatus;
  }
  get nodeFeatures() {
    return this.auth?.nodeFeatures ?? [];
  }
  /** SIWE domain — uses config override or defaults to app.tinycloud.xyz */
  get siweDomain() {
    return this.config.domain ?? "app.tinycloud.xyz";
  }
  /**
   * Set up authorization handler and TinyCloud instance.
   * @internal
   */
  setupAuth(config) {
    const useBootstrapSignInRequest = this.shouldUseBootstrapSignInRequest(config);
    this.auth = new NodeUserAuthorization({
      signer: this.signer,
      signStrategy: config.signStrategy ?? { type: "auto-sign" },
      wasmBindings: this.wasmBindings,
      sessionStorage: config.sessionStorage ?? new MemorySessionStorage(),
      domain: this.siweDomain,
      spacePrefix: config.prefix,
      sessionExpirationMs: config.sessionExpirationMs ?? DEFAULT_SESSION_EXPIRATION_MS,
      tinycloudHosts: this.explicitHost ? [this.explicitHost] : void 0,
      tinycloudRegistryUrl: config.tinycloudRegistryUrl,
      tinycloudFallbackHosts: config.tinycloudFallbackHosts,
      autoCreateSpace: useBootstrapSignInRequest ? false : config.autoCreateSpace,
      enablePublicSpace: config.enablePublicSpace ?? true,
      spaceCreationHandler: useBootstrapSignInRequest ? void 0 : config.spaceCreationHandler,
      nonce: config.nonce,
      siweConfig: config.siweConfig,
      manifest: useBootstrapSignInRequest ? void 0 : config.manifest,
      capabilityRequest: useBootstrapSignInRequest ? BOOTSTRAP_SESSION_REQUESTS.default : config.capabilityRequest,
      includeAccountRegistryPermissions: useBootstrapSignInRequest ? false : config.includeAccountRegistryPermissions
    });
    this.tc = new TinyCloud(this.auth, {
      invokeAny: this.invokeAnyWithRuntimePermissions,
      telemetry: config.telemetry
    });
  }
  shouldUseBootstrapSignInRequest(config) {
    return config.autoBootstrapAccount !== false && config.manifest === void 0 && config.capabilityRequest === void 0 && (config.prefix ?? "default") === "default" && isOpenKeyAutoSignStrategy(config.signStrategy);
  }
  syncResolvedHostFromAuth() {
    const host = this.auth?.hosts[0];
    if (host) {
      this.config.host = host;
    }
  }
  /**
   * Install or replace the manifest that drives the SIWE recap at
   * sign-in. Takes effect on the next `signIn()` call — the current
   * session (if any) is not touched. Wire this up from a higher
   * layer (e.g. TinyCloudWeb.setManifest) so the manifest is kept
   * in sync across the stack.
   */
  setManifest(manifest) {
    if (!this.auth) {
      throw new Error(
        "setManifest requires wallet mode. Provide a signer or privateKey in the TinyCloudNode config."
      );
    }
    this.config.manifest = manifest;
    this.config.capabilityRequest = void 0;
    this.auth.setManifest(manifest);
  }
  setCapabilityRequest(request) {
    if (!this.auth) {
      throw new Error(
        "setCapabilityRequest requires wallet mode. Provide a signer or privateKey in the TinyCloudNode config."
      );
    }
    this.config.capabilityRequest = request;
    this.config.manifest = request?.manifests;
    this.auth.setCapabilityRequest(request);
  }
  /**
   * Return the manifest currently installed on the auth handler,
   * or `undefined` if none is set.
   */
  get manifest() {
    return this.auth?.manifest;
  }
  get capabilityRequest() {
    return this.auth?.capabilityRequest;
  }
  get hosts() {
    const authHosts = this.auth?.hosts ?? [];
    return authHosts.length > 0 ? authHosts : [this.config.host];
  }
  /**
   * Get the primary identity DID for this user.
   * - If wallet connected and signed in: returns PKH DID (did:pkh:eip155:{chainId}:{address})
   * - If session-only mode: returns session key DID (did:key:z6Mk...)
   *
   * Use this for delegations - it always returns the appropriate identity.
   */
  get did() {
    if (this._address) {
      return pkhDid2(this._address, this._chainId);
    }
    return this.sessionManager.getDID(this.sessionKeyId);
  }
  /**
   * Get the session key DID. Always available.
   * Format: did:key:z6Mk...#z6Mk...
   *
   * Use this when you specifically need the session key, not the user identity.
   */
  get sessionDid() {
    return this.sessionManager.getDID(this.sessionKeyId);
  }
  /**
   * Get the Ethereum address for this user.
   */
  get address() {
    return this.auth?.address() ?? this._address;
  }
  /**
   * Check if this instance is in session-only mode (no wallet).
   * In session-only mode, the instance can receive delegations but cannot
   * create its own space via signIn().
   */
  get isSessionOnly() {
    return this.signer === null;
  }
  /**
   * Get the space ID for this user.
   * Available after signIn().
   */
  get spaceId() {
    return this.auth?.tinyCloudSession?.spaceId;
  }
  /**
   * Get the account space ID for this wallet identity.
   * Available after wallet-backed sign-in or a restored session with address metadata.
   */
  get accountSpaceId() {
    if (!this._address) {
      return void 0;
    }
    return this.wasmBindings.makeSpaceId(this._address, this._chainId, ACCOUNT_REGISTRY_SPACE);
  }
  /**
   * Account-level application and delegation helpers.
   */
  get account() {
    if (!this._account) {
      this._account = new AccountService({
        getDid: () => this.did,
        getHost: () => this.hosts[0] ?? this.config.host,
        getPrimarySpaceId: () => this.spaceId,
        getAccountSpaceId: () => this.accountSpaceId,
        getSpaces: () => this.spaces,
        getAccountDb: () => this.accountSpaceId ? this.sqlForSpace(this.accountSpaceId).db("account") : void 0,
        ensureAccountSpaceHosted: async () => {
          if (this.accountSpaceId && this.auth) {
            await this.ensureOwnedSpaceHostedById(this.accountSpaceId);
          }
        }
      });
    }
    return this._account;
  }
  /**
   * Get the current TinyCloud session.
   * Available after signIn().
   */
  get session() {
    return this.auth?.tinyCloudSession;
  }
  /**
   * Get the currently active session in the shape callers can persist and later
   * pass back to {@link restoreSession}.
   */
  get restorableSession() {
    return this.currentTinyCloudSession();
  }
  /**
   * Sign in and create a new session.
   * This creates the user's space if it doesn't exist.
   * Requires wallet mode (privateKey in config).
   *
   * @param options - Optional per-call SIWE overrides for this sign-in only
   */
  async signIn(options) {
    if (!this.signer || !this.tc) {
      throw new Error(
        "Cannot signIn() in session-only mode. Provide a privateKey in config to create your own space."
      );
    }
    await this.wasmBindings.ensureInitialized?.();
    this._address = canonicalizeAddress2(await this.signer.getAddress());
    this._chainId = await this.signer.getChainId();
    this._kv = void 0;
    this._sql = void 0;
    this._duckdb = void 0;
    this._hooks = void 0;
    this._vault = void 0;
    this._encryption = void 0;
    this._baseSecrets.clear();
    this._secrets.clear();
    this._spaceService = void 0;
    this._serviceContext = void 0;
    this.runtimePermissionGrants = [];
    await this.tc.signIn(options);
    this.syncResolvedHostFromAuth();
    this.initializeServices();
    const primarySession = this.currentTinyCloudSession();
    if (primarySession) {
      this.registerPrimarySessionGrant(primarySession);
    }
    const bootstrapped = await this.bootstrapAccountIfNeeded();
    await this.ensureRequestedEncryptionNetworks();
    if (!bootstrapped && this.config.manifest === void 0 && this.config.capabilityRequest === void 0) {
      await this.ensureOwnedSpaceHostedById(this.ownedSpaceId(SECRETS_SPACE2));
    }
    if (!bootstrapped) {
      this.scheduleAccountRegistrySync();
    }
    this.notificationHandler.success("Successfully signed in");
  }
  ownedSpaceId(name) {
    if (!this._address) {
      throw new Error("Cannot resolve owned space before sign-in");
    }
    return this.wasmBindings.makeSpaceId(this._address, this._chainId, name);
  }
  async bootstrapAccountIfNeeded() {
    this._bootstrapSkipped = false;
    this._bootstrapStatus = { skipped: false };
    if (this.config.autoBootstrapAccount === false) {
      return false;
    }
    if (!this.auth || !this._address) {
      return false;
    }
    if (isInteractiveSigner(this.config)) {
      console.debug(
        "[TinyCloudNode] bootstrap skipped: interactive signer detected. Server-side bootstrap (OpenKey) is expected to have provisioned the account."
      );
      this._bootstrapSkipped = true;
      this._bootstrapStatus = { skipped: true, reason: "interactive-signer" };
      return false;
    }
    const steps = bootstrapSteps(this._address, this._chainId);
    if (!await this.isFreshBootstrapAccount(steps)) {
      return false;
    }
    try {
      await this.runAccountBootstrap(steps);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this._bootstrapSkipped = true;
      this._bootstrapStatus = { skipped: true, reason };
      this.notificationHandler.warning(
        `Account bootstrap did not complete: ${reason}`
      );
      console.warn(`[TinyCloudNode] account bootstrap failed: ${reason}`);
      return false;
    }
    return true;
  }
  async isFreshBootstrapAccount(steps) {
    const enshrinedSpaceIds = /* @__PURE__ */ new Set();
    for (const step of steps) {
      if (step.kind === "session") {
        enshrinedSpaceIds.add(step.spaceId);
      }
    }
    const skipped = this.auth.lastActivationSkippedSpaceIds;
    if (skipped.some((spaceId) => enshrinedSpaceIds.has(spaceId))) {
      return true;
    }
    try {
      const indexed = await this.account.index.spaces.list();
      if (indexed.ok && indexed.data.length === 0) {
        return true;
      }
    } catch {
    }
    try {
      const spaces = await this.account.spaces.list();
      return spaces.ok && spaces.data.length === 0;
    } catch {
      return false;
    }
  }
  async runAccountBootstrap(steps) {
    if (!this.auth || !this._address) {
      throw new Error("Account bootstrap requires an active wallet session");
    }
    const host = this.hosts[0] ?? this.config.host;
    if (!host) {
      throw new Error("Account bootstrap requires a TinyCloud host");
    }
    const auth = this.auth;
    const sessions = /* @__PURE__ */ new Map();
    const rawAbilitiesBySpace = /* @__PURE__ */ new Map();
    const primarySession = auth.tinyCloudSession;
    const defaultSpaceId = this.ownedSpaceId("default");
    const canReusePrimaryBootstrapSession = primarySession?.spaceId === defaultSpaceId && auth.capabilityRequest === BOOTSTRAP_SESSION_REQUESTS.default;
    for (const step of steps) {
      if (step.kind !== "session") continue;
      if (step.space === "default" && canReusePrimaryBootstrapSession && primarySession) {
        sessions.set(step.space, primarySession);
        continue;
      }
      const rawAbilities = step.rawAbilities;
      if (rawAbilities) {
        rawAbilitiesBySpace.set(step.space, rawAbilities);
      }
      let session;
      try {
        session = await auth.createBootstrapSession({
          spaceId: step.spaceId,
          capabilityRequest: step.request ?? BOOTSTRAP_SESSION_REQUESTS[step.space],
          rawAbilities
        });
      } catch (err) {
        throw new Error(
          `Account bootstrap aborted: signature rejected for space "${step.space}". Cause: ${err instanceof Error ? err.message : String(err)}`
        );
      }
      sessions.set(step.space, session);
    }
    for (const step of steps) {
      if (step.kind !== "host") continue;
      const hosted = await auth.hostOwnedSpace(step.spaceId, "bootstrap-host");
      if (!hosted) {
        throw new Error(`Failed to host bootstrap space: ${step.spaceId}`);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    for (const step of steps) {
      if (step.kind !== "activate") continue;
      const session = sessions.get(step.space);
      if (!session) {
        throw new Error(`Missing bootstrap session for ${step.space}`);
      }
      const activated = await activateSessionWithHost2(host, session.delegationHeader);
      if (!activated.success || activated.skipped?.includes(step.spaceId)) {
        throw new Error(
          `Failed to activate bootstrap session for ${step.spaceId}: ${activated.error ?? "space was skipped"}`
        );
      }
      this.registerBootstrapRuntimeGrant(
        session,
        BOOTSTRAP_SESSION_REQUESTS[step.space],
        rawAbilitiesBySpace.get(step.space)
      );
    }
    for (const step of steps) {
      if (step.kind === "account-index-schema") {
        const ensured = await this.account.index.ensure();
        if (!ensured.ok) {
          throw new Error(`Failed to create account index schema: ${ensured.error.message}`);
        }
      }
      if (step.kind === "seed-spaces") {
        for (const space of step.spaces) {
          const registered = await this.account.spaces.register({
            spaceId: space.spaceId,
            name: space.name,
            ownerDid: this.did,
            type: "owned",
            permissions: ["*"],
            status: "active"
          });
          if (!registered.ok) {
            throw new Error(
              `Failed to seed account space ${space.spaceId}: ${registered.error.message}`
            );
          }
        }
      }
      if (step.kind === "seed-applications") {
        const registered = await this.account.applications.register(
          step.manifests.length > 0 ? [...step.manifests] : TINYCLOUD_SECRETS_BOOTSTRAP_MANIFEST
        );
        if (!registered.ok) {
          throw new Error(`Failed to seed bootstrap applications: ${registered.error.message}`);
        }
      }
      if (step.kind === "encryption-network-create") {
        await this.ensureEncryptionNetwork(step.networkId);
      }
      if (step.kind === "secret-records-schema") {
        const db = this.sqlForSpace(step.spaceId).db(step.database);
        const migrated = await db.migrations.apply({
          namespace: "tinycloud.secrets.records",
          migrations: [
            {
              id: "001_initial",
              sql: [...SECRET_RECORDS_SCHEMA]
            }
          ]
        });
        if (!migrated.ok) {
          throw new Error(
            `Failed to create secret_records schema: ${migrated.error.message}`
          );
        }
      }
    }
  }
  registerBootstrapRuntimeGrant(session, request, rawAbilities) {
    const operations = [];
    for (const resource of request.resources) {
      const service = resource.service.startsWith("tinycloud.") ? this.shortServiceName(resource.service) : resource.service;
      const spaceId = resource.space.startsWith("tinycloud:") ? resource.space : this.ownedSpaceId(resource.space);
      for (const action of resource.actions) {
        operations.push({
          spaceId,
          service,
          path: resource.path,
          action
        });
      }
    }
    for (const [resource, actions2] of Object.entries(rawAbilities ?? {})) {
      for (const action of actions2) {
        operations.push({
          resource,
          service: "encryption",
          path: resource,
          action
        });
      }
    }
    const expiresAt = extractSiweExpiration(session.siwe) ?? this.getSessionExpiry();
    const actions = [...new Set(operations.map((operation) => operation.action))];
    this.runtimePermissionGrants.push({
      session: {
        delegationHeader: session.delegationHeader,
        delegationCid: session.delegationCid,
        spaceId: session.spaceId,
        verificationMethod: session.verificationMethod,
        jwk: session.jwk
      },
      delegation: {
        cid: session.delegationCid,
        delegationHeader: session.delegationHeader,
        delegateDID: session.verificationMethod,
        delegatorDID: this.did,
        spaceId: session.spaceId,
        path: "",
        actions,
        expiry: expiresAt,
        allowSubDelegation: true,
        ownerAddress: session.address,
        chainId: session.chainId,
        host: this.config.host
      },
      operations,
      expiresAt,
      provenance: "bootstrap"
    });
  }
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
  recapOperationsFromSession(session) {
    const siwe = session.siwe;
    if (!siwe) {
      return [];
    }
    if (this._recapOperationsCache?.siwe === siwe) {
      return this._recapOperationsCache.operations;
    }
    let operations = [];
    try {
      const entries = this.wasmBindings.parseRecapFromSiwe(siwe);
      if (Array.isArray(entries)) {
        operations = entries.flatMap((entry) => {
          const service = this.invocationServiceName(entry.service);
          return entry.actions.map((action) => ({
            ...this.isEncryptionNetworkOperation(service, entry.path) ? { resource: entry.path } : { spaceId: entry.space },
            service,
            path: entry.path,
            action
          }));
        });
      }
    } catch {
      operations = [];
    }
    this._recapOperationsCache = { siwe, operations };
    return operations;
  }
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
  registerPrimarySessionGrant(session) {
    const skipped = this.auth ? this.auth.lastActivationSkippedSpaceIds ?? [] : [];
    const operations = this.recapOperationsFromSession(session).filter(
      (operation) => operation.spaceId === void 0 || !skipped.some((spaceId) => this.spaceIdsEqual(spaceId, operation.spaceId))
    );
    if (operations.length === 0) {
      return;
    }
    const expiresAt = extractSiweExpiration(session.siwe) ?? this.getSessionExpiry();
    const actions = [...new Set(operations.map((operation) => operation.action))];
    this.runtimePermissionGrants.push({
      session: {
        delegationHeader: session.delegationHeader,
        delegationCid: session.delegationCid,
        spaceId: session.spaceId,
        verificationMethod: session.verificationMethod,
        jwk: session.jwk
      },
      delegation: {
        cid: session.delegationCid,
        delegationHeader: session.delegationHeader,
        delegateDID: session.verificationMethod,
        delegatorDID: this.did,
        spaceId: session.spaceId,
        path: "",
        actions,
        expiry: expiresAt,
        allowSubDelegation: true,
        ownerAddress: session.address,
        chainId: session.chainId,
        host: this.config.host
      },
      operations,
      expiresAt,
      provenance: "primary"
    });
  }
  async writeManifestRegistryRecords() {
    const request = this.capabilityRequest;
    if (!request || request.registryRecords.length === 0) {
      return;
    }
    if (!this.auth || !this.signer) {
      throw new Error("Manifest registry write requires wallet mode");
    }
    const accountSpaceId = this.ownedSpaceId(ACCOUNT_REGISTRY_SPACE);
    await this.ensureOwnedSpaceHostedById(accountSpaceId);
    const result = await this.account.applications.register(request.manifests);
    if (!result.ok) {
      throw new Error(
        `Failed to write manifest registry records: ${result.error.message}`
      );
    }
  }
  scheduleAccountRegistrySync() {
    void this.withAccountRegistryRetry(async () => {
      void this.account.index.ensure();
      await this.writeManifestRegistryRecords();
      const spaces = await this.account.spaces.syncAccessible();
      if (!spaces.ok) {
        throw new Error(`Failed to sync account spaces: ${spaces.error.message}`);
      }
    });
  }
  async withAccountRegistryRetry(task) {
    const delays = [250, 1e3, 3e3];
    let lastError;
    for (let attempt = 0; attempt < delays.length; attempt += 1) {
      try {
        await task();
        return;
      } catch (error) {
        lastError = error;
        if (attempt < delays.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
        }
      }
    }
    console.warn(
      "TinyCloud account registry sync failed after retries",
      lastError
    );
  }
  requestedEncryptionNetworkIds() {
    const request = this.capabilityRequest;
    if (!request) {
      return [];
    }
    const networkIds = /* @__PURE__ */ new Set();
    for (const resource of request.resources) {
      if (resource.service === ENCRYPTION_PERMISSION_SERVICE2 && resource.path.startsWith("urn:tinycloud:encryption:") && resource.actions.includes(DECRYPT_ACTION2)) {
        networkIds.add(resource.path);
      }
    }
    return [...networkIds];
  }
  async ensureRequestedEncryptionNetworks() {
    if (!this.signer || !this.auth) {
      return;
    }
    for (const networkId of this.requestedEncryptionNetworkIds()) {
      const parsed = parseNetworkId2(networkId);
      if (!didPrincipalMatches2(parsed.ownerDid, this.did)) {
        continue;
      }
      await this.ensureEncryptionNetwork(networkId);
    }
  }
  async ensureOwnedSpaceHostedById(spaceId) {
    if (!this.auth) {
      throw new Error("Owned space hosting requires wallet mode");
    }
    const session = this.auth.tinyCloudSession;
    if (!session) {
      throw new Error("Owned space hosting requires an active session");
    }
    const host = this.hosts[0] ?? this.config.host;
    if (!host) {
      throw new Error("Owned space hosting requires a TinyCloud host");
    }
    const activation = await activateSessionWithHost2(host, session.delegationHeader);
    if (activation.success && !activation.skipped?.includes(spaceId)) {
      return;
    }
    if (!activation.success && activation.status !== 404) {
      throw new Error(
        `Failed to check owned space ${spaceId}: ${activation.error ?? activation.status}`
      );
    }
    const created = await this.auth.hostOwnedSpace(spaceId);
    if (!created) {
      throw new Error(`Failed to create owned space: ${spaceId}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    const retry = await activateSessionWithHost2(host, session.delegationHeader);
    if (!retry.success || retry.skipped?.includes(spaceId)) {
      throw new Error(
        `Failed to activate session after creating owned space ${spaceId}: ${retry.error ?? "space was skipped"}`
      );
    }
  }
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
  async hostOwnedSpace(name) {
    if (!this.auth || !this.auth.tinyCloudSession) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    const spaceId = this.ownedSpaceId(name);
    const host = this.hosts[0] ?? this.config.host;
    if (!host) {
      throw new Error("Owned space hosting requires a TinyCloud host");
    }
    const hosted = await this.auth.hostOwnedSpace(
      spaceId
    );
    if (!hosted) {
      throw new Error(`Failed to host owned space: ${spaceId}`);
    }
    const activation = await activateSessionWithHost2(
      host,
      this.auth.tinyCloudSession.delegationHeader
    );
    if (!activation.success || activation.skipped?.includes(spaceId)) {
      throw new Error(
        `Failed to activate session for owned space ${spaceId}: ${activation.error ?? "space was skipped"}`
      );
    }
    void this.account.spaces.register({
      spaceId,
      name,
      ownerDid: this.did,
      type: "owned",
      permissions: ["*"],
      status: "active"
    }).catch(() => {
    });
    return spaceId;
  }
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
  async ensureOwnedSpaceHosted(name) {
    if (!this.auth || !this.auth.tinyCloudSession) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    const spaceId = this.ownedSpaceId(name);
    if (await this.isOwnedSpaceRegistered(spaceId)) {
      return spaceId;
    }
    const hosted = await this.hostOwnedSpace(name);
    try {
      await this.account.spaces.register({
        spaceId,
        name,
        ownerDid: this.did,
        type: "owned",
        permissions: ["*"],
        status: "active"
      });
    } catch {
    }
    return hosted;
  }
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
  async isOwnedSpaceRegistered(spaceId) {
    try {
      const indexed = await this.account.index.spaces.list();
      if (indexed.ok && indexed.data.some((space) => space.spaceId === spaceId)) {
        return true;
      }
    } catch {
    }
    try {
      const record = await this.account.spaces.get(spaceId);
      return record.ok;
    } catch {
      return false;
    }
  }
  /**
   * Restore a previously established session from stored delegation data.
   *
   * This is used by the CLI to restore a session that was created via the
   * browser-based delegation flow (OpenKey `/delegate` page). Instead of
   * signing in with a private key, it injects the delegation data directly.
   *
   * @param sessionData - The stored delegation data from the browser flow
   */
  async restoreSession(sessionData) {
    await this.wasmBindings.ensureInitialized?.();
    this._kv = void 0;
    this._sql = void 0;
    this._duckdb = void 0;
    this._hooks = void 0;
    this._vault = void 0;
    this._encryption = void 0;
    this._baseSecrets.clear();
    this._secrets.clear();
    this._spaceService = void 0;
    this._serviceContext = void 0;
    this.runtimePermissionGrants = [];
    const restoredAddress = sessionData.address ? canonicalizeAddress2(sessionData.address) : void 0;
    if (restoredAddress) {
      this._address = restoredAddress;
    }
    if (sessionData.chainId) {
      this._chainId = sessionData.chainId;
    }
    const resolvedHost = await this.resolveRestoredHost(
      sessionData.tinycloudHosts,
      restoredAddress,
      sessionData.chainId
    );
    if (resolvedHost) {
      this.config.host = resolvedHost;
    }
    this._serviceContext = new ServiceContext2({
      invoke: this.invokeWithRuntimePermissions,
      invokeAny: this.invokeAnyWithRuntimePermissions,
      fetch: globalThis.fetch.bind(globalThis),
      hosts: [this.config.host],
      telemetry: this.config.telemetry
    });
    this._kv = new KVService2({});
    this._kv.initialize(this._serviceContext);
    this._serviceContext.registerService("kv", this._kv);
    this._sql = new SQLService2({});
    this._sql.initialize(this._serviceContext);
    this._serviceContext.registerService("sql", this._sql);
    this._duckdb = new DuckDbService2({});
    this._duckdb.initialize(this._serviceContext);
    this._serviceContext.registerService("duckdb", this._duckdb);
    this._hooks = new HooksService2({});
    this._hooks.initialize(this._serviceContext);
    this._serviceContext.registerService("hooks", this._hooks);
    const serviceSession = {
      delegationHeader: sessionData.delegationHeader,
      delegationCid: sessionData.delegationCid,
      spaceId: sessionData.spaceId,
      verificationMethod: sessionData.verificationMethod,
      jwk: sessionData.jwk
    };
    this._serviceContext.setSession(serviceSession);
    this._vault = this.createVaultService(sessionData.spaceId, this._kv);
    this._vault.initialize(this._serviceContext);
    this._serviceContext.registerService("vault", this._vault);
    this.initializeV2Services(serviceSession);
    if (sessionData.siwe && restoredAddress && sessionData.chainId) {
      const tcSession = {
        address: restoredAddress,
        chainId: sessionData.chainId,
        sessionKey: JSON.stringify(sessionData.jwk),
        spaceId: sessionData.spaceId,
        delegationCid: sessionData.delegationCid,
        delegationHeader: sessionData.delegationHeader,
        verificationMethod: sessionData.verificationMethod,
        jwk: sessionData.jwk,
        siwe: sessionData.siwe,
        signature: sessionData.signature ?? ""
      };
      if (this.auth) {
        this.auth.setRestoredTinyCloudSession(
          tcSession,
          this.config.host ? [this.config.host] : void 0
        );
      } else {
        this._restoredTcSession = tcSession;
      }
      this.registerPrimarySessionGrant(tcSession);
    }
  }
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
  async resolveRestoredHost(persistedHosts, address, chainId) {
    if (this.explicitHost) {
      return this.explicitHost;
    }
    if (persistedHosts && persistedHosts.length > 0) {
      return persistedHosts[0];
    }
    if (address === void 0 || chainId === void 0) {
      return void 0;
    }
    const resolved = await resolveTinyCloudHosts2(pkhDid2(address, chainId), {
      registryUrl: this.config.tinycloudRegistryUrl,
      fallbackHosts: this.config.tinycloudFallbackHosts
    });
    return resolved.hosts[0];
  }
  /**
   * Resolve the currently-active TinyCloudSession, preferring the auth
   * layer's value (wallet mode) and falling back to the node-level
   * rehydration set by {@link restoreSession} (session-only mode).
   */
  currentTinyCloudSession() {
    return this.auth?.tinyCloudSession ?? this._restoredTcSession;
  }
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
  connectWallet(privateKey, options) {
    if (this.signer) {
      throw new Error("Wallet already connected. Cannot connect another wallet.");
    }
    const prefix = options?.prefix ?? "default";
    if (!_TinyCloudNode.nodeDefaults) {
      throw new Error(
        "connectWallet() requires PrivateKeySigner. Use connectSigner() instead, or import from '@tinycloud/node-sdk' (not '/core') for automatic Node.js defaults."
      );
    }
    this.signer = _TinyCloudNode.nodeDefaults.createSigner(privateKey);
    const authConfig = { ...this.config, prefix };
    const useBootstrapSignInRequest = this.shouldUseBootstrapSignInRequest(authConfig);
    this.auth = new NodeUserAuthorization({
      signer: this.signer,
      signStrategy: this.config.signStrategy ?? { type: "auto-sign" },
      wasmBindings: this.wasmBindings,
      sessionStorage: options?.sessionStorage ?? this.config.sessionStorage ?? new MemorySessionStorage(),
      domain: this.siweDomain,
      spacePrefix: prefix,
      sessionExpirationMs: this.config.sessionExpirationMs ?? DEFAULT_SESSION_EXPIRATION_MS,
      tinycloudHosts: this.explicitHost ? [this.explicitHost] : void 0,
      tinycloudRegistryUrl: this.config.tinycloudRegistryUrl,
      tinycloudFallbackHosts: this.config.tinycloudFallbackHosts,
      autoCreateSpace: useBootstrapSignInRequest ? false : this.config.autoCreateSpace,
      enablePublicSpace: this.config.enablePublicSpace ?? true,
      spaceCreationHandler: useBootstrapSignInRequest ? void 0 : this.config.spaceCreationHandler,
      nonce: this.config.nonce,
      siweConfig: this.config.siweConfig,
      manifest: useBootstrapSignInRequest ? void 0 : this.config.manifest,
      capabilityRequest: useBootstrapSignInRequest ? BOOTSTRAP_SESSION_REQUESTS.default : this.config.capabilityRequest,
      includeAccountRegistryPermissions: useBootstrapSignInRequest ? false : this.config.includeAccountRegistryPermissions
    });
    this.tc = new TinyCloud(this.auth, {
      invokeAny: this.invokeAnyWithRuntimePermissions,
      telemetry: this.config.telemetry
    });
    this.config.prefix = prefix;
  }
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
  connectSigner(signer, options) {
    if (this.signer) {
      throw new Error("Signer already connected. Cannot connect another signer.");
    }
    const prefix = options?.prefix ?? "default";
    this.signer = signer;
    const authConfig = { ...this.config, prefix };
    const useBootstrapSignInRequest = this.shouldUseBootstrapSignInRequest(authConfig);
    this.auth = new NodeUserAuthorization({
      signer: this.signer,
      signStrategy: this.config.signStrategy ?? { type: "auto-sign" },
      wasmBindings: this.wasmBindings,
      sessionStorage: options?.sessionStorage ?? this.config.sessionStorage ?? new MemorySessionStorage(),
      domain: this.siweDomain,
      spacePrefix: prefix,
      sessionExpirationMs: this.config.sessionExpirationMs ?? DEFAULT_SESSION_EXPIRATION_MS,
      tinycloudHosts: this.explicitHost ? [this.explicitHost] : void 0,
      tinycloudRegistryUrl: this.config.tinycloudRegistryUrl,
      tinycloudFallbackHosts: this.config.tinycloudFallbackHosts,
      autoCreateSpace: useBootstrapSignInRequest ? false : this.config.autoCreateSpace,
      enablePublicSpace: this.config.enablePublicSpace ?? true,
      spaceCreationHandler: useBootstrapSignInRequest ? void 0 : this.config.spaceCreationHandler,
      nonce: this.config.nonce,
      siweConfig: this.config.siweConfig,
      manifest: useBootstrapSignInRequest ? void 0 : this.config.manifest,
      capabilityRequest: useBootstrapSignInRequest ? BOOTSTRAP_SESSION_REQUESTS.default : this.config.capabilityRequest,
      includeAccountRegistryPermissions: useBootstrapSignInRequest ? false : this.config.includeAccountRegistryPermissions
    });
    this.tc = new TinyCloud(this.auth, {
      invokeAny: this.invokeAnyWithRuntimePermissions,
      telemetry: this.config.telemetry
    });
    this.config.prefix = prefix;
  }
  /**
   * Initialize the service context and KV service after sign-in.
   * @internal
   */
  initializeServices() {
    const session = this.currentTinyCloudSession();
    if (!session) {
      return;
    }
    this.tc.initializeServices(this.invokeWithRuntimePermissions, [this.config.host]);
    this._serviceContext = new ServiceContext2({
      invoke: this.invokeWithRuntimePermissions,
      invokeAny: this.invokeAnyWithRuntimePermissions,
      fetch: globalThis.fetch.bind(globalThis),
      hosts: [this.config.host],
      telemetry: this.config.telemetry
    });
    this._kv = new KVService2({});
    this._kv.initialize(this._serviceContext);
    this._serviceContext.registerService("kv", this._kv);
    const features = this.nodeFeatures;
    if (features.length === 0 || features.includes("sql")) {
      this._sql = new SQLService2({});
      this._sql.initialize(this._serviceContext);
      this._serviceContext.registerService("sql", this._sql);
    }
    if (features.length === 0 || features.includes("duckdb")) {
      this._duckdb = new DuckDbService2({});
      this._duckdb.initialize(this._serviceContext);
      this._serviceContext.registerService("duckdb", this._duckdb);
    }
    this._hooks = new HooksService2({});
    this._hooks.initialize(this._serviceContext);
    this._serviceContext.registerService("hooks", this._hooks);
    const serviceSession = {
      delegationHeader: session.delegationHeader,
      delegationCid: session.delegationCid,
      spaceId: session.spaceId,
      verificationMethod: session.verificationMethod,
      jwk: session.jwk
    };
    this._serviceContext.setSession(serviceSession);
    this.tc.serviceContext.setSession(serviceSession);
    this._vault = this.createVaultService(session.spaceId, this._kv);
    this._vault.initialize(this._serviceContext);
    this._serviceContext.registerService("vault", this._vault);
    this.initializeV2Services(serviceSession);
  }
  createSpaceScopedKVService(spaceId) {
    const kvService = new KVService2({});
    if (this._serviceContext) {
      const spaceScopedContext = new ServiceContext2({
        invoke: this._serviceContext.invoke,
        fetch: this._serviceContext.fetch,
        hosts: this._serviceContext.hosts,
        telemetry: this.config.telemetry
      });
      const session = this._serviceContext.session;
      if (session) {
        spaceScopedContext.setSession({ ...session, spaceId });
      }
      kvService.initialize(spaceScopedContext);
    }
    return kvService;
  }
  getDefaultEncryptionNetworkId(name = DEFAULT_ENCRYPTION_NETWORK_NAME) {
    return `urn:tinycloud:encryption:${this.did}:${name}`;
  }
  getEncryptionNetworkIdForSpace(spaceId, name = DEFAULT_ENCRYPTION_NETWORK_NAME) {
    const ownerDid = this.ownerDidFromSpaceId(spaceId) ?? this.did;
    return `urn:tinycloud:encryption:${ownerDid}:${name}`;
  }
  ownerDidFromSpaceId(spaceId) {
    if (!spaceId.startsWith("tinycloud:")) return void 0;
    const body = spaceId.slice("tinycloud:".length);
    const lastSeparator = body.lastIndexOf(":");
    if (lastSeparator <= 0) return void 0;
    const owner = body.slice(0, lastSeparator);
    if (owner.startsWith("did:")) return owner;
    if (!owner.includes(":")) return void 0;
    return `did:${owner}`;
  }
  requireServiceSession() {
    const session = this._serviceContext?.session;
    if (!session) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    return session;
  }
  createEncryptionCrypto() {
    const wasm = this.wasmBindings;
    const columnEncrypt = (key, plaintext) => {
      const encrypted = wasm.vault_encrypt(key, plaintext);
      const out = new Uint8Array(1 + encrypted.length);
      out[0] = 1;
      out.set(encrypted, 1);
      return out;
    };
    const columnDecrypt = (key, blob) => {
      if (blob[0] !== 1) {
        return blob;
      }
      return wasm.vault_decrypt(key, blob.slice(1));
    };
    return {
      sha256: (data) => wasm.vault_sha256(data),
      randomBytes: (length) => wasm.vault_random_bytes(length),
      x25519FromSeed: (seed) => wasm.vault_x25519_from_seed(seed),
      x25519Dh: (privateKey, publicKey) => wasm.vault_x25519_dh(privateKey, publicKey),
      authEncrypt: (key, plaintext) => wasm.vault_encrypt(key, plaintext),
      authDecrypt: (key, ciphertext) => wasm.vault_decrypt(key, ciphertext),
      sealToNetworkKey: (networkPublicKey, symmetricKey) => {
        const seed = wasm.vault_random_bytes(32);
        const ephemeral = wasm.vault_x25519_from_seed(seed);
        const shared = wasm.vault_x25519_dh(
          ephemeral.privateKey,
          networkPublicKey
        );
        const encrypted = columnEncrypt(shared, symmetricKey);
        const out = new Uint8Array(ephemeral.publicKey.length + encrypted.length);
        out.set(ephemeral.publicKey, 0);
        out.set(encrypted, ephemeral.publicKey.length);
        return out;
      },
      openWithReceiverKey: (receiverPrivateKey, wrappedKey) => {
        const peerPublic = wrappedKey.slice(0, 32);
        const ciphertext = wrappedKey.slice(32);
        const shared = wasm.vault_x25519_dh(receiverPrivateKey, peerPublic);
        return columnDecrypt(shared, ciphertext);
      },
      verifyNodeSignature: (nodeId, message, signature) => verifyDidKeyEd25519Signature(nodeId, message, signature)
    };
  }
  async fetchNodeId() {
    const response = await fetch(`${this.config.host}/info`);
    if (!response.ok) {
      throw new Error(`Failed to fetch node info: HTTP ${response.status}`);
    }
    const info = await response.json();
    if (typeof info.nodeId !== "string" || info.nodeId.length === 0) {
      throw new Error("Node /info response did not include nodeId");
    }
    return info.nodeId;
  }
  async signRawNetworkAuthorization(input) {
    if (!this.wasmBindings.invokeAny) {
      throw new Error("WASM binding does not support raw-resource invokeAny");
    }
    if (!this.wasmBindings.computeCid) {
      throw new Error("WASM binding does not support invocation CID computation");
    }
    const session = this.requireServiceSession();
    const headers = this.invokeAnyWithRuntimePermissions(
      session,
      [
        {
          resource: input.networkId,
          service: "encryption",
          path: input.networkId,
          action: input.action
        }
      ],
      [input.facts]
    );
    const authorization = authorizationHeader(headers);
    const audienceBound = await rewriteInvocationAudience(
      authorization,
      input.targetNode,
      session.jwk
    );
    return {
      authorization: audienceBound,
      invocationCid: this.wasmBindings.computeCid(
        new TextEncoder().encode(audienceBound),
        0x55n
      )
    };
  }
  createEncryptionService() {
    const crypto = this.createEncryptionCrypto();
    const transport = {
      postDecrypt: async ({ networkId, authorization, canonicalBody }) => {
        const response = await fetch(
          `${this.config.host}/encryption/networks/${encodeURIComponent(networkId)}/decrypt`,
          {
            method: "POST",
            headers: {
              Authorization: authorization,
              "Content-Type": "application/json"
            },
            body: canonicalBody
          }
        );
        if (!response.ok) {
          throw new Error(
            `decrypt failed ${response.status}: ${await response.text()}`
          );
        }
        return await response.json();
      }
    };
    return new EncryptionService({
      crypto,
      signer: {
        signDecryptInvocation: async (input) => {
          const signed = await this.signRawNetworkAuthorization({
            targetNode: input.targetNode,
            networkId: input.networkId,
            action: DECRYPT_ACTION2,
            facts: input.facts
          });
          return {
            ...signed,
            canonicalBody: canonicalizeEncryptionJson(
              input.body
            )
          };
        }
      },
      transport,
      node: {
        fetchByNetworkId: (networkId) => this.getEncryptionNetwork(networkId)
      },
      wellKnown: {
        fetchWellKnown: async (principal, discoveryKey) => {
          if (!this._address || !didPrincipalMatches2(principal, this.did)) {
            return null;
          }
          if (!this.config.host) {
            return null;
          }
          const publicSpaceId = makePublicSpaceId(this._address, this._chainId);
          const result = await TinyCloud.readPublicSpace(this.config.host, publicSpaceId, discoveryKey);
          if (!result.ok) {
            return null;
          }
          const body = result.data;
          return "descriptor" in body && body.descriptor ? body.descriptor : body;
        }
      }
    });
  }
  getEncryptionService() {
    if (!this._serviceContext) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    if (!this._encryption) {
      this._encryption = this.createEncryptionService();
      this._encryption.initialize(this._serviceContext);
      this._serviceContext.registerService("encryption", this._encryption);
    }
    return this._encryption;
  }
  createVaultService(spaceId, kv) {
    const wasm = this.wasmBindings;
    const vaultCrypto = createVaultCrypto({
      vault_encrypt: wasm.vault_encrypt,
      vault_decrypt: wasm.vault_decrypt,
      vault_derive_key: wasm.vault_derive_key,
      vault_x25519_from_seed: wasm.vault_x25519_from_seed,
      vault_x25519_dh: wasm.vault_x25519_dh,
      vault_random_bytes: wasm.vault_random_bytes,
      vault_sha256: wasm.vault_sha256
    });
    const self = this;
    return new DataVaultService({
      spaceId,
      crypto: vaultCrypto,
      encryption: {
        networkId: this.getEncryptionNetworkIdForSpace(spaceId),
        service: this.getEncryptionService(),
        decryptCapabilityProof: () => ({
          proofs: [this.requireServiceSession().delegationCid]
        })
      },
      tc: {
        kv,
        ensurePublicSpace: async () => {
          try {
            await self.ensurePublicSpace();
            return { ok: true, data: void 0 };
          } catch (error) {
            return { ok: false, error: { code: "STORAGE_ERROR", message: error instanceof Error ? error.message : String(error), service: "vault" } };
          }
        },
        get publicKV() {
          return self._publicKV ?? self.tc.publicKV;
        },
        readPublicSpace: (host, targetSpaceId, key) => TinyCloud.readPublicSpace(host, targetSpaceId, key),
        makePublicSpaceId: TinyCloud.makePublicSpaceId,
        did: this.did,
        address: this._address ?? "",
        chainId: this._chainId,
        hosts: [this.config.host]
      }
    });
  }
  /**
   * Initialize the v2 delegation system services.
   * @internal
   */
  initializeV2Services(serviceSession) {
    this._capabilityRegistry = new CapabilityKeyRegistry();
    const tcSession = this.auth?.tinyCloudSession;
    if (tcSession && this._address) {
      const sessionKey = {
        id: tcSession.sessionKey,
        did: tcSession.verificationMethod,
        type: "session",
        // Cast jwk from generic object to JWK - we know it has the required structure
        jwk: tcSession.jwk,
        priority: 0
        // Session keys have highest priority
      };
      const rootDelegation = {
        cid: tcSession.delegationCid,
        delegateDID: tcSession.verificationMethod,
        spaceId: tcSession.spaceId,
        path: "",
        // Root access
        actions: [...ROOT_DELEGATION_ACTIONS],
        expiry: this.getSessionExpiry(),
        isRevoked: false,
        allowSubDelegation: true
      };
      const delegations = [rootDelegation];
      if (tcSession.spaces) {
        for (const [spaceName, spaceId] of Object.entries(tcSession.spaces)) {
          delegations.push({
            cid: tcSession.delegationCid,
            delegateDID: tcSession.verificationMethod,
            spaceId,
            path: "",
            actions: [...ROOT_DELEGATION_ACTIONS],
            expiry: this.getSessionExpiry(),
            isRevoked: false,
            allowSubDelegation: true
          });
        }
      }
      this._capabilityRegistry.registerKey(sessionKey, delegations);
    }
    this._delegationManager = new DelegationManager({
      hosts: [this.config.host],
      session: serviceSession,
      invoke: this.invokeWithRuntimePermissions,
      fetch: globalThis.fetch.bind(globalThis)
    });
    this._spaceService = new SpaceService({
      hosts: [this.config.host],
      session: serviceSession,
      invoke: this.wasmBindings.invoke,
      fetch: globalThis.fetch.bind(globalThis),
      capabilityRegistry: this._capabilityRegistry,
      userDid: this.did,
      createKVService: (spaceId) => {
        return this.createSpaceScopedKVService(spaceId);
      },
      createVaultService: (spaceId) => {
        const kvService = this.createSpaceScopedKVService(spaceId);
        const vaultService = this.createVaultService(spaceId, kvService);
        if (this._serviceContext) {
          vaultService.initialize(this._serviceContext);
        }
        return vaultService;
      },
      createSecretsService: (spaceId) => {
        return this.secretsForSpace(spaceId);
      },
      // Enable space.delegations.create() via SIWE-based delegation
      createDelegation: async (params) => {
        try {
          const portableDelegation = await this.createDelegation({
            delegateDID: params.delegateDID,
            path: params.path,
            actions: params.actions,
            disableSubDelegation: params.disableSubDelegation,
            expiryMs: params.expiry ? params.expiry.getTime() - Date.now() : void 0
          });
          const delegation = {
            cid: portableDelegation.cid,
            delegateDID: portableDelegation.delegateDID,
            delegatorDID: this.did,
            spaceId: portableDelegation.spaceId,
            path: portableDelegation.path,
            actions: portableDelegation.actions,
            expiry: portableDelegation.expiry,
            isRevoked: false,
            allowSubDelegation: !portableDelegation.disableSubDelegation,
            createdAt: /* @__PURE__ */ new Date(),
            authHeader: portableDelegation.delegationHeader.Authorization
          };
          return { ok: true, data: delegation };
        } catch (error) {
          return {
            ok: false,
            error: {
              code: "CREATION_FAILED",
              message: error instanceof Error ? error.message : String(error),
              service: "delegation"
            }
          };
        }
      },
      onSpaceRegistered: async (space) => {
        await this.account.spaces.register(space);
      }
    });
    this._sharingService.updateConfig({
      session: serviceSession,
      delegationManager: this._delegationManager,
      sessionExpiry: this.getSessionExpiry(),
      // WASM-based delegation creation (preferred - no server roundtrip)
      createDelegationWasm: (params) => this.createDelegationWrapper(params),
      // Root delegation for long-lived share links (bypasses session expiry)
      // In node-sdk we have direct signer access, so no popup needed
      onRootDelegationNeeded: this.signer ? async (params) => this.createRootDelegationForSharing(params) : void 0
    });
    this._spaceService.updateConfig({
      sharingService: this._sharingService
    });
  }
  /**
   * Get the session expiry time.
   * @internal
   */
  getSessionExpiry() {
    const expirationMs = this.config.sessionExpirationMs ?? DEFAULT_SESSION_EXPIRATION_MS;
    return new Date(Date.now() + expirationMs);
  }
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
  createDelegationWrapper(params) {
    const wasmSession = {
      delegationHeader: params.session.delegationHeader,
      delegationCid: params.session.delegationCid,
      jwk: params.session.jwk,
      spaceId: params.session.spaceId,
      verificationMethod: params.session.verificationMethod
    };
    const result = this.wasmBindings.createDelegation(
      wasmSession,
      params.delegateDID,
      params.spaceId,
      params.abilities,
      params.expirationSecs,
      params.notBeforeSecs
    );
    return {
      delegation: result.delegation,
      cid: result.cid,
      // Rust serde `rename_all = "camelCase"` emits `delegateDid`
      // (lowercase d); the TypeScript interface uses `delegateDID`
      // (historical, matches Delegation.delegateDID). Normalize here.
      delegateDID: result.delegateDid ?? result.delegateDID,
      expiry: new Date(result.expiry * 1e3),
      resources: result.resources
    };
  }
  /**
   * Create a direct root delegation from the wallet to a share key.
   * This bypasses the session delegation chain, allowing share links
   * with expiry longer than the current session.
   * @internal
   */
  async createOwnerDelegation(params) {
    if (!params.delegateDid.startsWith("did:key:") || params.actions.length === 0 || params.path.length === 0) {
      throw new Error("Owner delegation requires an external did:key audience and bounded capabilities");
    }
    const now = /* @__PURE__ */ new Date();
    if (params.expiresAt.getTime() <= now.getTime() || params.expiresAt.getTime() - now.getTime() > EXPIRY3.MAX_MS) {
      throw new Error("Owner delegation expiry must be explicit, future, and within EXPIRY.MAX_MS");
    }
    if (!this.signer) throw new Error("Owner wallet signer is required");
    const session = this.currentTinyCloudSession();
    if (!session) throw new Error("Owner session is required");
    const abilities = sharingActionsToAbilities(params.path, [...params.actions]);
    if (!abilities) throw new Error("Owner delegation capabilities are unsupported");
    const host = this.config.host;
    const prepared = this.wasmBindings.prepareSession({
      abilities,
      address: this.wasmBindings.ensureEip55(session.address),
      chainId: session.chainId,
      domain: this.siweDomain,
      issuedAt: now.toISOString(),
      expirationTime: params.expiresAt.toISOString(),
      spaceId: params.spaceId,
      delegateUri: params.delegateDid
    });
    const signature = await this.signer.signMessage(prepared.siwe);
    const delegationSession = this.wasmBindings.completeSessionSetup({ ...prepared, signature });
    const activation = await activateSessionWithHost2(host, delegationSession.delegationHeader);
    if (!activation.success) {
      throw new Error(`Owner delegation import failed: ${activation.status} ${activation.error ?? ""}`.trim());
    }
    const delegation = {
      cid: delegationSession.delegationCid,
      delegateDID: params.delegateDid,
      delegatorDID: pkhDid2(session.address, session.chainId),
      spaceId: params.spaceId,
      path: params.path,
      actions: [...params.actions],
      expiry: params.expiresAt,
      isRevoked: false,
      allowSubDelegation: true,
      createdAt: now,
      authHeader: delegationSession.delegationHeader.Authorization
    };
    return {
      delegation,
      signedDagCbor: decodeAuthorizationBytes(delegationSession.delegationHeader.Authorization),
      delegationCid: delegationSession.delegationCid,
      nodeReceipt: {
        commitEventCid: activation.commitEventCid,
        activated: activation.activated ?? [],
        skipped: activation.skipped ?? []
      }
    };
  }
  async createRootDelegationForSharing(params) {
    try {
      return (await this.createOwnerDelegation({
        delegateDid: params.shareKeyDID,
        spaceId: params.spaceId,
        path: params.path,
        actions: params.actions,
        expiresAt: params.requestedExpiry
      })).delegation;
    } catch {
      return void 0;
    }
  }
  /**
   * Track a received delegation in the capability registry.
   * @internal
   */
  trackReceivedDelegation(delegation, jwk) {
    if (!this._capabilityRegistry) {
      return;
    }
    const keyInfo = {
      id: `received:${delegation.cid}`,
      did: this.sessionDid,
      type: "ingested",
      jwk,
      priority: 2
    };
    const delegationRecord = {
      cid: delegation.cid,
      delegateDID: delegation.delegateDID,
      spaceId: delegation.spaceId,
      path: delegation.path,
      actions: delegation.actions,
      expiry: delegation.expiry,
      isRevoked: false,
      allowSubDelegation: !delegation.disableSubDelegation
    };
    this._capabilityRegistry.ingestKey(keyInfo, delegationRecord);
  }
  /**
   * Key-value storage operations on this user's space.
   */
  get kv() {
    if (!this._kv) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    return this._kv;
  }
  /**
   * SQL database operations on this user's space.
   */
  get sql() {
    if (!this._sql) {
      const features = this.nodeFeatures;
      if (features.length > 0 && !features.includes("sql")) {
        throw new UnsupportedFeatureError("sql", this.config.host, features);
      }
      throw new Error("Not signed in. Call signIn() first.");
    }
    return this._sql;
  }
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
  sqlForSpace(spaceId) {
    if (!this._serviceContext || !this._serviceContext.session) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    const sql = new SQLService2({});
    const spaceScopedContext = new ServiceContext2({
      invoke: this._serviceContext.invoke,
      fetch: this._serviceContext.fetch,
      hosts: this._serviceContext.hosts,
      telemetry: this.config.telemetry
    });
    spaceScopedContext.setSession({ ...this._serviceContext.session, spaceId });
    sql.initialize(spaceScopedContext);
    return sql;
  }
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
  kvForSpace(spaceId) {
    if (!this._serviceContext || !this._serviceContext.session) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    const kv = new KVService2({});
    const spaceScopedContext = new ServiceContext2({
      invoke: this._serviceContext.invoke,
      fetch: this._serviceContext.fetch,
      hosts: this._serviceContext.hosts
    });
    spaceScopedContext.setSession({ ...this._serviceContext.session, spaceId });
    kv.initialize(spaceScopedContext);
    return kv;
  }
  /**
   * DuckDB database operations on this user's space.
   */
  get duckdb() {
    if (!this._duckdb) {
      const features = this.nodeFeatures;
      if (features.length > 0 && !features.includes("duckdb")) {
        throw new UnsupportedFeatureError("duckdb", this.config.host, features);
      }
      throw new Error("Not signed in. Call signIn() first.");
    }
    return this._duckdb;
  }
  /**
   * Data Vault operations - client-side encrypted KV storage.
   * Call `vault.unlock(signer)` after signIn() to derive encryption keys.
   */
  get vault() {
    if (!this._vault) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    return this._vault;
  }
  /**
   * Network-scoped encryption/decrypt service.
   */
  get encryption() {
    return this.getEncryptionService();
  }
  async getEncryptionNetwork(nameOrNetworkId = this.getDefaultEncryptionNetworkId()) {
    const networkId = nameOrNetworkId.startsWith("urn:tinycloud:encryption:") ? nameOrNetworkId : this.getDefaultEncryptionNetworkId(nameOrNetworkId);
    const response = await fetch(
      `${this.config.host}/encryption/networks/${encodeURIComponent(networkId)}`
    );
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(
        `Failed to fetch encryption network ${networkId}: HTTP ${response.status} ${await response.text()}`
      );
    }
    const body = await response.json();
    return "descriptor" in body && body.descriptor ? body.descriptor : body;
  }
  async createEncryptionNetwork(name = DEFAULT_ENCRYPTION_NETWORK_NAME) {
    const targetNode = await this.fetchNodeId();
    const ownerDid = this.did;
    const networkId = this.getDefaultEncryptionNetworkId(name);
    const body = {
      name,
      ownerDid,
      threshold: { n: 1, t: 1 }
    };
    const crypto = this.createEncryptionCrypto();
    const facts = {
      type: NETWORK_ADMIN_TYPE,
      targetNode,
      networkId,
      bodyHash: canonicalHashHex(
        crypto.sha256,
        body
      ),
      action: NETWORK_CREATE_ACTION2
    };
    const signed = await this.signRawNetworkAuthorization({
      targetNode,
      networkId,
      action: NETWORK_CREATE_ACTION2,
      facts
    });
    const response = await fetch(`${this.config.host}/encryption/networks`, {
      method: "POST",
      headers: {
        Authorization: signed.authorization,
        "Content-Type": "application/json"
      },
      body: canonicalizeEncryptionJson(
        body
      )
    });
    if (!response.ok) {
      throw new Error(
        `Failed to create encryption network ${networkId}: HTTP ${response.status} ${await response.text()}`
      );
    }
    const created = await response.json();
    return created.descriptor;
  }
  async ensureEncryptionNetwork(nameOrNetworkId = DEFAULT_ENCRYPTION_NETWORK_NAME) {
    const networkId = nameOrNetworkId.startsWith("urn:tinycloud:encryption:") ? nameOrNetworkId : this.getDefaultEncryptionNetworkId(nameOrNetworkId);
    const existing = await this.getEncryptionNetwork(networkId);
    if (existing) {
      return existing;
    }
    const parsed = parseNetworkId2(networkId);
    if (!didPrincipalMatches2(parsed.ownerDid, this.did)) {
      throw new Error(
        `Cannot create encryption network ${networkId}: owner ${parsed.ownerDid} does not match signed-in DID ${this.did}`
      );
    }
    return this.createEncryptionNetwork(parsed.name);
  }
  /**
   * App-facing secrets API backed by the `secrets` space vault.
   */
  get secrets() {
    if (!this._spaceService) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    return this.secretsForSpace("secrets");
  }
  /**
   * App-facing secrets API backed by the requested space's vault.
   */
  secretsForSpace(spaceId) {
    if (!this._spaceService) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    const resolvedSpace = spaceId.startsWith("tinycloud:") ? spaceId : this.ownedSpaceId(spaceId);
    let secrets = this._secrets.get(resolvedSpace);
    if (!secrets) {
      secrets = new NodeSecretsService({
        getService: () => this.getBaseSecrets(resolvedSpace),
        space: resolvedSpace,
        getManifest: () => this.manifest,
        hasPermissions: (permissions) => this.hasRuntimePermissions(permissions),
        grantPermissions: (additional) => this.grantRuntimePermissions(additional),
        canEscalate: () => this.signer !== void 0 && this.tc !== void 0,
        getEncryptionNetworkId: () => this.getEncryptionNetworkIdForSpace(resolvedSpace),
        resolveSpace: (space) => space.startsWith("tinycloud:") ? space : this.ownedSpaceId(space),
        getUnlockSigner: () => this.signer ?? void 0
      });
      this._secrets.set(resolvedSpace, secrets);
    }
    return secrets;
  }
  getBaseSecrets(spaceId) {
    if (!this._spaceService) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    const resolvedSpace = spaceId.startsWith("tinycloud:") ? spaceId : this.ownedSpaceId(spaceId);
    let secrets = this._baseSecrets.get(resolvedSpace);
    if (!secrets) {
      const kvService = this.createSpaceScopedKVService(resolvedSpace);
      const vaultService = this.createVaultService(resolvedSpace, kvService);
      if (this._serviceContext) {
        vaultService.initialize(this._serviceContext);
      }
      secrets = new SecretsService(() => vaultService);
      this._baseSecrets.set(resolvedSpace, secrets);
    }
    return secrets;
  }
  /**
   * Hooks write stream subscription API.
   */
  get hooks() {
    if (!this._hooks) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    return this._hooks;
  }
  // ===========================================================================
  // v2 Service Accessors
  // ===========================================================================
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
  get capabilityRegistry() {
    if (!this._capabilityRegistry) {
      throw new Error("CapabilityKeyRegistry not initialized.");
    }
    return this._capabilityRegistry;
  }
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
  get delegations() {
    const registry = this._capabilityRegistry;
    if (!registry) {
      return {
        list: () => [],
        get: () => void 0
      };
    }
    return {
      list: () => registry.getAllCapabilities().map((entry) => entry.delegation),
      get: (cid) => {
        const capabilities = registry.getAllCapabilities();
        const entry = capabilities.find((e) => e.delegation.cid === cid);
        return entry?.delegation;
      }
    };
  }
  /**
   * Check whether the current session or an approved runtime delegation covers
   * every requested permission.
   */
  hasRuntimePermissions(permissions) {
    const session = this.currentTinyCloudSession();
    if (!session || !Array.isArray(permissions) || permissions.length === 0) {
      return false;
    }
    const expanded = this.expandPermissionEntries(permissions);
    if (this.sessionCoversPermissionEntries(session, expanded)) {
      return true;
    }
    return this.findRuntimeGrantsForPermissionEntries(expanded, session).length > 0;
  }
  /**
   * Return installed runtime permission delegations. When `permissions` is
   * provided, only delegations currently covering those permissions are
   * returned. Base-session manifest permissions are not represented here.
   */
  getRuntimePermissionDelegations(permissions) {
    this.pruneExpiredRuntimePermissionGrants();
    if (permissions === void 0) {
      return this.runtimePermissionGrants.filter((grant) => grant.provenance !== "primary").map((grant) => grant.delegation);
    }
    const session = this.currentTinyCloudSession();
    if (!session || !Array.isArray(permissions) || permissions.length === 0) {
      return [];
    }
    const expanded = this.expandPermissionEntries(permissions);
    return this.findRuntimeGrantsForPermissionEntries(expanded, session).map(
      (grant) => grant.delegation
    );
  }
  /**
   * Install a portable runtime permission delegation into this SDK instance so
   * matching service calls and downstream `delegateTo()` calls can use it.
   */
  async useRuntimeDelegation(delegation) {
    const session = this.currentTinyCloudSession();
    if (!session) {
      throw new SessionExpiredError(/* @__PURE__ */ new Date(0));
    }
    if (delegation.expiry.getTime() <= Date.now()) {
      throw new SessionExpiredError(delegation.expiry);
    }
    const expectedDids = [session.verificationMethod, this.sessionDid];
    if (!expectedDids.some((did) => didPrincipalMatches2(delegation.delegateDID, did))) {
      throw new Error(
        `Runtime delegation targets ${delegation.delegateDID} but this session key is ${session.verificationMethod}.`
      );
    }
    const targetHost = delegation.host ?? this.config.host;
    const activateResult = await activateSessionWithHost2(
      targetHost,
      delegation.delegationHeader
    );
    if (!activateResult.success) {
      throw new Error(
        `Failed to activate runtime permission delegation: ${activateResult.error}`
      );
    }
    this.runtimePermissionGrants = this.runtimePermissionGrants.filter(
      (grant) => grant.delegation.cid !== delegation.cid
    );
    this.runtimePermissionGrants.push(
      this.runtimeGrantFromDelegation(delegation, session)
    );
  }
  /**
   * Store additional permissions as narrow delegations to the current session
   * key. Future service invocations automatically use a stored delegation when
   * its `(space, service, path, action)` covers the request.
   */
  async grantRuntimePermissions(permissions, options) {
    if (!Array.isArray(permissions) || permissions.length === 0) {
      throw new Error("grantRuntimePermissions requires a non-empty permissions array");
    }
    const session = this.currentTinyCloudSession();
    if (!session) {
      throw new SessionExpiredError(/* @__PURE__ */ new Date(0));
    }
    const sessionExpiry = extractSiweExpiration(session.siwe);
    if (sessionExpiry !== void 0) {
      const marginMs = _TinyCloudNode.SESSION_EXPIRY_SAFETY_MARGIN_MS;
      if (sessionExpiry.getTime() <= Date.now() + marginMs) {
        throw new SessionExpiredError(sessionExpiry);
      }
    }
    const expanded = this.expandPermissionEntries(permissions);
    if (this.sessionCoversPermissionEntries(session, expanded)) {
      return [];
    }
    const existingGrants = this.findRuntimeGrantsForPermissionEntries(expanded, session);
    if (existingGrants.length > 0) {
      return existingGrants.map((grant) => grant.delegation);
    }
    if (!this.signer) {
      throw new Error(
        "grantRuntimePermissions requires wallet mode with a signer or privateKey."
      );
    }
    const rawEntries = expanded.filter(
      (entry) => this.isEncryptionPermissionEntry(entry)
    );
    const spaceEntries = expanded.filter(
      (entry) => !this.isEncryptionPermissionEntry(entry)
    );
    const bySpace = /* @__PURE__ */ new Map();
    for (const entry of spaceEntries) {
      const spaceId = this.resolvePermissionSpace(entry.space, session);
      const current = bySpace.get(spaceId) ?? [];
      current.push(entry);
      bySpace.set(spaceId, current);
    }
    if (bySpace.size === 0 && rawEntries.length > 0) {
      bySpace.set(session.spaceId, []);
    }
    const now = /* @__PURE__ */ new Date();
    const requestedExpiryMs = resolveExpiryMs(options?.expiry);
    let expiresAt = new Date(now.getTime() + requestedExpiryMs);
    if (sessionExpiry !== void 0 && sessionExpiry < expiresAt) {
      expiresAt = sessionExpiry;
    }
    const delegations = [];
    let rawEntriesAttached = false;
    for (const [spaceId, entries] of bySpace) {
      const rawForDelegation = !rawEntriesAttached ? rawEntries : [];
      if (rawForDelegation.length > 0) {
        rawEntriesAttached = true;
      }
      const delegatedEntries = [...entries, ...rawForDelegation];
      const abilities = this.permissionsToAbilities(entries);
      const prepared = this.wasmBindings.prepareSession({
        abilities,
        ...rawForDelegation.length > 0 ? { rawAbilities: this.permissionsToRawAbilities(rawForDelegation) } : {},
        address: this.wasmBindings.ensureEip55(session.address),
        chainId: session.chainId,
        domain: this.siweDomain,
        issuedAt: now.toISOString(),
        expirationTime: expiresAt.toISOString(),
        spaceId,
        jwk: session.jwk
      });
      const signature = await this.signer.signMessage(prepared.siwe);
      const delegatedSession = this.wasmBindings.completeSessionSetup({
        ...prepared,
        signature
      });
      const activateResult = await activateSessionWithHost2(
        this.config.host,
        delegatedSession.delegationHeader
      );
      if (!activateResult.success) {
        throw new Error(
          `Failed to activate runtime permission delegation: ${activateResult.error}`
        );
      }
      const delegation = this.runtimeDelegationFromSession(
        delegatedSession,
        delegatedEntries,
        spaceId,
        session,
        expiresAt
      );
      this.runtimePermissionGrants.push({
        session: {
          delegationHeader: delegatedSession.delegationHeader,
          delegationCid: delegatedSession.delegationCid,
          spaceId,
          verificationMethod: session.verificationMethod,
          jwk: session.jwk
        },
        delegation,
        operations: this.permissionOperations(delegatedEntries, spaceId),
        expiresAt,
        provenance: "runtime"
      });
      delegations.push(delegation);
    }
    return delegations;
  }
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
  get delegationManager() {
    if (!this._delegationManager) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    return this._delegationManager;
  }
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
  get spaces() {
    if (!this._spaceService) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    return this._spaceService;
  }
  /**
   * Alias for `spaces` - get the SpaceService.
   * @see spaces
   */
  get spaceService() {
    return this.spaces;
  }
  /**
   * Get a Space object by short name or full URI.
   */
  space(nameOrUri) {
    return this.spaces.get(nameOrUri);
  }
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
  get sharing() {
    return this._sharingService;
  }
  /**
   * Alias for `sharing` - get the SharingService.
   * @see sharing
   */
  get sharingService() {
    return this.sharing;
  }
  // ===========================================================================
  // Public Space Methods
  // ===========================================================================
  /**
   * Ensure the user's public space exists and is accessible.
   * Creates the space and activates a session delegation for it.
   * This is the trigger for lazy public space creation — call it
   * before writing to spaces.get('public').kv.
   */
  async ensurePublicSpace() {
    if (!this.auth || !this.session || !this.signer) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    const publicSpaceId = this.session.spaces?.public;
    if (!publicSpaceId) {
      throw new Error("Public space not enabled. Set enablePublicSpace: true in config.");
    }
    await this.auth.hostPublicSpace(publicSpaceId);
    const kvActions = [KV2.PUT, KV2.GET, KV2.DEL, KV2.LIST, KV2.METADATA];
    const abilities = { kv: { "": kvActions } };
    const now = /* @__PURE__ */ new Date();
    const expiryMs = EXPIRY3.EPHEMERAL_MS;
    const expirationTime = new Date(now.getTime() + expiryMs);
    const prepared = this.wasmBindings.prepareSession({
      abilities,
      address: this.wasmBindings.ensureEip55(this.session.address),
      chainId: this.session.chainId,
      domain: this.siweDomain,
      issuedAt: now.toISOString(),
      expirationTime: expirationTime.toISOString(),
      spaceId: publicSpaceId,
      jwk: this.session.jwk,
      parents: [this.session.delegationCid]
    });
    const signature = await this.signer.signMessage(prepared.siwe);
    const delegationSession = this.wasmBindings.completeSessionSetup({
      ...prepared,
      signature
    });
    const activateResult = await activateSessionWithHost2(
      this.config.host,
      delegationSession.delegationHeader
    );
    if (!activateResult.success) {
      throw new Error(`Failed to activate public space delegation: ${activateResult.error}`);
    }
    if (this._capabilityRegistry && this.session) {
      const sessionKey = {
        id: this.session.sessionKey,
        did: this.session.verificationMethod,
        type: "session",
        jwk: this.session.jwk,
        priority: 0
      };
      this._capabilityRegistry.registerKey(sessionKey, [{
        cid: delegationSession.delegationCid,
        delegateDID: this.session.verificationMethod,
        spaceId: publicSpaceId,
        path: "",
        actions: kvActions,
        expiry: expirationTime,
        isRevoked: false,
        allowSubDelegation: true
      }]);
    }
    if (this._serviceContext) {
      const publicKV = new KVService2({ prefix: "" });
      const publicContext = new ServiceContext2({
        invoke: this.invokeWithRuntimePermissions,
        fetch: this._serviceContext.fetch,
        hosts: this._serviceContext.hosts,
        telemetry: this.config.telemetry
      });
      publicContext.setSession({
        delegationHeader: delegationSession.delegationHeader,
        delegationCid: delegationSession.delegationCid,
        spaceId: publicSpaceId,
        verificationMethod: this.session.verificationMethod,
        jwk: this.session.jwk
      });
      publicKV.initialize(publicContext);
      this._publicKV = publicKV;
    }
  }
  /**
   * Get a KVService scoped to the user's own public space.
   * Writes require authentication (owner/delegate).
   */
  get publicKV() {
    if (this._publicKV) {
      return this._publicKV;
    }
    if (!this.tc) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    return this.tc.publicKV;
  }
  // ===========================================================================
  // v2 Delegation Convenience Methods
  // ===========================================================================
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
  async delegate(params) {
    return this.delegationManager.create(params);
  }
  /**
   * Revoke a delegation using the v2 DelegationManager.
   *
   * @param cid - The CID of the delegation to revoke
   * @returns Result indicating success or failure
   */
  async revokeDelegation(cid) {
    return this.delegationManager.revoke(cid);
  }
  /**
   * List all delegations for the current session's space.
   *
   * @returns Result containing an array of Delegations
   */
  async listDelegations() {
    return this.delegationManager.list();
  }
  /**
   * Check if the current session has permission for a path and action.
   *
   * @param path - The resource path to check
   * @param action - The action to check (e.g., "tinycloud.kv/get")
   * @returns Result containing boolean permission status
   */
  async checkPermission(path, action) {
    return this.delegationManager.checkPermission(path, action);
  }
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
  async delegateTo(did, permissions, options) {
    const session = this.currentTinyCloudSession();
    if (!session) {
      throw new SessionExpiredError(/* @__PURE__ */ new Date(0));
    }
    const sessionExpiry = extractSiweExpiration(session.siwe);
    if (sessionExpiry !== void 0) {
      const now2 = Date.now();
      const marginMs = _TinyCloudNode.SESSION_EXPIRY_SAFETY_MARGIN_MS;
      if (sessionExpiry.getTime() <= now2 + marginMs) {
        throw new SessionExpiredError(sessionExpiry);
      }
    }
    if (!Array.isArray(permissions) || permissions.length === 0) {
      throw new Error(
        "delegateTo requires a non-empty permissions array"
      );
    }
    const expandedEntries = this.expandPermissionEntries(permissions);
    const now = /* @__PURE__ */ new Date();
    const expiryMs = resolveExpiryMs(options?.expiry);
    const expirationTime = new Date(now.getTime() + expiryMs);
    let effectiveExpiration = expirationTime;
    if (sessionExpiry !== void 0 && sessionExpiry < expirationTime) {
      effectiveExpiration = sessionExpiry;
    }
    if (options?.forceWalletSign) {
      if (expandedEntries.length > 1) {
        throw new Error(
          "delegateTo with forceWalletSign=true supports at most one PermissionEntry. Multi-entry requests must go through the session-key UCAN path (drop forceWalletSign) or the legacy createDelegation method."
        );
      }
      const delegation2 = await this.createDelegationLegacyWalletPath(
        did,
        expandedEntries[0],
        effectiveExpiration
      );
      return { delegation: delegation2, prompted: true };
    }
    const granted = parseRecapCapabilities(
      (siwe) => this.wasmBindings.parseRecapFromSiwe(siwe),
      session.siwe
    );
    const { subset, missing } = isCapabilitySubset(expandedEntries, granted);
    if (!subset) {
      const runtimeGrant = this.findGrantForOperations(
        this.permissionEntriesToOperations(expandedEntries, session)
      );
      if (runtimeGrant) {
        const marginMs = _TinyCloudNode.SESSION_EXPIRY_SAFETY_MARGIN_MS;
        if (runtimeGrant.expiresAt.getTime() <= Date.now() + marginMs) {
          throw new SessionExpiredError(runtimeGrant.expiresAt);
        }
        const runtimeExpiration = runtimeGrant.expiresAt < effectiveExpiration ? runtimeGrant.expiresAt : effectiveExpiration;
        const delegation2 = await this.createDelegationViaRuntimeGrant(
          did,
          expandedEntries,
          runtimeExpiration,
          runtimeGrant
        );
        return { delegation: delegation2, prompted: false };
      }
      throw new PermissionNotInManifestError(missing, granted);
    }
    const delegation = await this.createDelegationViaWasmPath(
      did,
      expandedEntries,
      effectiveExpiration,
      session
    );
    return { delegation, prompted: false };
  }
  /**
   * Materialize one manifest-declared delegation using the current session key.
   * Delivery is intentionally out of band; callers decide how to transmit the
   * returned UCAN to the delegate.
   */
  async materializeDelegation(did, request = this.capabilityRequest) {
    if (!request) {
      throw new Error(
        "materializeDelegation requires a composed manifest request"
      );
    }
    const target = request.delegationTargets.find(
      (entry) => didPrincipalMatches2(entry.did, did)
    );
    if (!target) {
      throw new Error(`No manifest delegation target found for DID ${did}`);
    }
    const result = await this.delegateTo(target.did, target.permissions, {
      expiry: target.expiryMs
    });
    return { ...result, target };
  }
  /**
   * Materialize every delegation target declared by the composed manifest
   * request. This does not deliver the delegations anywhere.
   */
  async materializeDelegations(request = this.capabilityRequest) {
    if (!request) {
      throw new Error(
        "materializeDelegations requires a composed manifest request"
      );
    }
    const out = [];
    for (const target of request.delegationTargets) {
      out.push(await this.materializeDelegation(target.did, request));
    }
    return out;
  }
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
  async createDelegationViaWasmPath(did, entries, expirationTime, session) {
    if (entries.length === 0) {
      throw new Error(
        "createDelegationViaWasmPath requires a non-empty entries array"
      );
    }
    const resolvedSpaces = /* @__PURE__ */ new Set();
    for (const entry of entries) {
      if (this.isEncryptionPermissionEntry(entry)) {
        continue;
      }
      const spaceId2 = this.resolvePermissionSpace(entry.space, session);
      resolvedSpaces.add(spaceId2);
    }
    if (resolvedSpaces.size > 1) {
      throw new Error(
        `delegateTo: all permission entries must target the same space, got ${resolvedSpaces.size}: ${JSON.stringify([...resolvedSpaces])}`
      );
    }
    const spaceId = resolvedSpaces.size === 1 ? [...resolvedSpaces][0] : session.spaceId;
    const abilities = {};
    for (const entry of entries) {
      const shortService = SERVICE_LONG_TO_SHORT[entry.service];
      if (shortService === void 0) {
        throw new Error(
          `delegateTo: unknown service '${entry.service}' \u2014 no short-form mapping`
        );
      }
      if (abilities[shortService] === void 0) {
        abilities[shortService] = {};
      }
      const pathsMap = abilities[shortService];
      const existing = pathsMap[entry.path];
      if (existing === void 0) {
        pathsMap[entry.path] = [...entry.actions];
      } else {
        const seen = new Set(existing);
        for (const action of entry.actions) {
          if (!seen.has(action)) {
            existing.push(action);
            seen.add(action);
          }
        }
      }
    }
    const serviceSession = {
      delegationHeader: session.delegationHeader,
      delegationCid: session.delegationCid,
      jwk: session.jwk,
      spaceId,
      verificationMethod: session.verificationMethod
    };
    const expirationSecs = Math.floor(expirationTime.getTime() / 1e3);
    const result = this.createDelegationWrapper({
      session: serviceSession,
      delegateDID: did,
      spaceId,
      abilities,
      expirationSecs
    });
    const primary = result.resources[0];
    const delegationHeader = { Authorization: result.delegation };
    const activateResult = await activateSessionWithHost2(
      this.config.host,
      delegationHeader
    );
    if (!activateResult.success) {
      throw new Error(
        `Failed to activate delegation with host: ${activateResult.error}`
      );
    }
    return {
      cid: result.cid,
      delegationHeader,
      spaceId,
      path: primary.path,
      actions: primary.actions,
      resources: result.resources,
      disableSubDelegation: false,
      expiry: result.expiry,
      delegateDID: did,
      ownerAddress: session.address,
      chainId: session.chainId,
      host: this.config.host
    };
  }
  async createDelegationViaRuntimeGrant(did, entries, expirationTime, grant) {
    const result = this.createDelegationWrapper({
      session: grant.session,
      delegateDID: did,
      spaceId: grant.session.spaceId,
      abilities: this.permissionsToAbilities(entries),
      expirationSecs: Math.floor(expirationTime.getTime() / 1e3)
    });
    const primary = result.resources[0];
    const delegationHeader = { Authorization: result.delegation };
    const targetHost = grant.delegation.host ?? this.config.host;
    const activateResult = await activateSessionWithHost2(
      targetHost,
      delegationHeader
    );
    if (!activateResult.success) {
      throw new Error(
        `Failed to activate delegation with host: ${activateResult.error}`
      );
    }
    return {
      cid: result.cid,
      delegationHeader,
      spaceId: grant.session.spaceId,
      path: primary.path,
      actions: primary.actions,
      resources: result.resources,
      disableSubDelegation: false,
      expiry: result.expiry,
      delegateDID: did,
      ownerAddress: grant.delegation.ownerAddress,
      chainId: grant.delegation.chainId,
      host: targetHost
    };
  }
  resolvePermissionSpace(space, session) {
    if (space === void 0) {
      return this.wasmBindings.makeSpaceId(
        session.address,
        session.chainId,
        "applications"
      );
    }
    if (space === "default") {
      return session.spaceId;
    }
    if (space.startsWith("tinycloud:")) {
      return space;
    }
    return this.wasmBindings.makeSpaceId(session.address, session.chainId, space);
  }
  expandPermissionEntries(permissions) {
    return expandPermissionEntriesCore(permissions);
  }
  shortServiceName(service) {
    const short = SERVICE_LONG_TO_SHORT[service];
    if (short === void 0) {
      throw new Error(
        `unknown service '${service}' \u2014 no short-form mapping`
      );
    }
    return short;
  }
  permissionsToAbilities(entries) {
    const abilities = {};
    for (const entry of entries) {
      const service = this.shortServiceName(entry.service);
      abilities[service] ?? (abilities[service] = {});
      const existing = abilities[service][entry.path] ?? [];
      const seen = new Set(existing);
      for (const action of entry.actions) {
        if (!seen.has(action)) {
          existing.push(action);
          seen.add(action);
        }
      }
      abilities[service][entry.path] = existing;
    }
    return abilities;
  }
  isEncryptionPermissionEntry(entry) {
    return entry.service === ENCRYPTION_PERMISSION_SERVICE2 && entry.path.startsWith("urn:tinycloud:encryption:");
  }
  permissionsToRawAbilities(entries) {
    const rawAbilities = {};
    for (const entry of entries) {
      if (!this.isEncryptionPermissionEntry(entry)) {
        continue;
      }
      const existing = rawAbilities[entry.path] ?? [];
      const seen = new Set(existing);
      for (const action of entry.actions) {
        if (!seen.has(action)) {
          existing.push(action);
          seen.add(action);
        }
      }
      rawAbilities[entry.path] = existing;
    }
    return rawAbilities;
  }
  permissionOperations(entries, spaceId) {
    return entries.flatMap((entry) => {
      const service = this.shortServiceName(entry.service);
      return entry.actions.map((action) => ({
        ...this.isEncryptionNetworkOperation(service, entry.path) ? { resource: entry.path } : { spaceId },
        service,
        path: entry.path,
        action
      }));
    });
  }
  sessionCoversPermissionEntries(session, entries) {
    try {
      const granted = parseRecapCapabilities(
        (siwe) => this.wasmBindings.parseRecapFromSiwe(siwe),
        session.siwe
      );
      return isCapabilitySubset(entries, granted).subset;
    } catch {
      return false;
    }
  }
  permissionEntriesToOperations(entries, session) {
    return entries.flatMap((entry) => {
      const spaceId = this.resolvePermissionSpace(entry.space, session);
      const service = this.shortServiceName(entry.service);
      return entry.actions.map((action) => ({
        ...this.isEncryptionNetworkOperation(service, entry.path) ? { resource: entry.path } : { spaceId },
        service,
        path: entry.path,
        action
      }));
    });
  }
  findRuntimeGrantsForPermissionEntries(entries, session) {
    const grants = [];
    const operations = this.permissionEntriesToOperations(entries, session);
    if (operations.length === 0) {
      return grants;
    }
    for (const operation of operations) {
      const grant = this.findGrantForOperation(operation, { excludePrimary: true });
      if (!grant) {
        return [];
      }
      if (!grants.includes(grant)) {
        grants.push(grant);
      }
    }
    return grants;
  }
  runtimeDelegationFromSession(delegatedSession, entries, spaceId, session, expiresAt) {
    const resources = this.delegatedResourcesForEntries(entries, spaceId);
    const primary = resources[0];
    return {
      cid: delegatedSession.delegationCid,
      delegationHeader: delegatedSession.delegationHeader,
      spaceId,
      path: primary.path,
      actions: primary.actions,
      resources,
      disableSubDelegation: false,
      expiry: expiresAt,
      delegateDID: session.verificationMethod,
      ownerAddress: session.address,
      chainId: session.chainId,
      host: this.config.host
    };
  }
  runtimeGrantFromDelegation(delegation, session) {
    const operations = this.operationsFromDelegation(delegation);
    return {
      session: {
        delegationHeader: delegation.delegationHeader,
        delegationCid: delegation.cid,
        spaceId: delegation.spaceId,
        verificationMethod: session.verificationMethod,
        jwk: session.jwk
      },
      delegation,
      operations,
      expiresAt: delegation.expiry,
      provenance: "delegated"
    };
  }
  installRuntimeGrantFromServiceSession(delegation, session, expiresAt) {
    const operations = this.operationsFromDelegation(delegation);
    if (operations.length === 0) {
      return;
    }
    this.runtimePermissionGrants = this.runtimePermissionGrants.filter(
      (grant) => grant.delegation.cid !== delegation.cid && grant.session.delegationCid !== session.delegationCid
    );
    this.runtimePermissionGrants.push({
      session,
      delegation,
      operations,
      expiresAt,
      provenance: "delegated"
    });
  }
  delegatedResourcesForEntries(entries, spaceId) {
    return entries.map((entry) => ({
      service: this.shortServiceName(entry.service),
      space: this.isEncryptionPermissionEntry(entry) ? "encryption" : spaceId,
      path: entry.path,
      actions: [...entry.actions]
    }));
  }
  operationsFromDelegation(delegation) {
    const resources = delegation.resources !== void 0 && delegation.resources.length > 0 ? delegation.resources : this.flatDelegationResources(delegation);
    return resources.flatMap((resource) => {
      const service = this.invocationServiceName(resource.service);
      return resource.actions.map((action) => ({
        ...this.isEncryptionNetworkOperation(service, resource.path) ? { resource: resource.path } : { spaceId: resource.space },
        service,
        path: resource.path,
        action
      }));
    });
  }
  flatDelegationResources(delegation) {
    const byService = /* @__PURE__ */ new Map();
    for (const action of delegation.actions) {
      const service = this.shortServiceName(action.split("/")[0]);
      const actions = byService.get(service) ?? [];
      actions.push(action);
      byService.set(service, actions);
    }
    return [...byService.entries()].map(([service, actions]) => ({
      service,
      space: delegation.spaceId,
      path: delegation.path,
      actions
    }));
  }
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
  buildActivationAbilities(delegation) {
    var _a, _b, _c;
    const resources = delegation.resources !== void 0 && delegation.resources.length > 0 ? delegation.resources : this.flatDelegationResources(delegation);
    const abilities = {};
    const rawAbilities = {};
    const addActions = (target, actions) => {
      const seen = new Set(target);
      for (const action of actions) {
        if (!seen.has(action)) {
          target.push(action);
          seen.add(action);
        }
      }
    };
    for (const resource of resources) {
      const service = this.invocationServiceName(resource.service);
      if (this.isEncryptionNetworkOperation(service, resource.path)) {
        rawAbilities[_a = resource.path] ?? (rawAbilities[_a] = []);
        addActions(rawAbilities[resource.path], resource.actions);
        continue;
      }
      if (resource.space !== delegation.spaceId) {
        throw new Error(
          `useDelegation: resource targets space '${resource.space}' but the delegation activates space '${delegation.spaceId}'. Multi-space delegations cannot be activated in a single useDelegation call.`
        );
      }
      abilities[service] ?? (abilities[service] = {});
      (_b = abilities[service])[_c = resource.path] ?? (_b[_c] = []);
      addActions(abilities[service][resource.path], resource.actions);
    }
    return { abilities, rawAbilities };
  }
  selectInvocationSession(fallback, service, path, action) {
    const grant = this.findGrantForOperation({
      spaceId: fallback.spaceId,
      service: this.invocationServiceName(service),
      path,
      action
    });
    return grant?.session ?? fallback;
  }
  findGrantForOperations(operations, options) {
    if (operations.length === 0) {
      return void 0;
    }
    this.pruneExpiredRuntimePermissionGrants();
    const covering = this.runtimePermissionGrants.filter((grant) => {
      if (options?.excludePrimary && grant.provenance === "primary") {
        return false;
      }
      return operations.every(
        (operation) => grant.operations.some(
          (granted) => this.operationCovers(granted, operation)
        )
      );
    });
    if (covering.length === 0) {
      return void 0;
    }
    return covering.find((grant) => grant.provenance === "primary") ?? covering[0];
  }
  findGrantForOperation(operation, options) {
    return this.findGrantForOperations([operation], options);
  }
  pruneExpiredRuntimePermissionGrants() {
    const now = Date.now();
    this.runtimePermissionGrants = this.runtimePermissionGrants.filter(
      (grant) => grant.expiresAt.getTime() > now
    );
  }
  operationCovers(granted, requested) {
    if (granted.service !== requested.service || !this.actionContains(granted.action, requested.action)) {
      return false;
    }
    if (granted.resource !== void 0 || requested.resource !== void 0) {
      return granted.resource !== void 0 && requested.resource !== void 0 && granted.resource === requested.resource && this.pathContains(granted.path, requested.path);
    }
    return granted.spaceId !== void 0 && requested.spaceId !== void 0 && this.spaceIdsEqual(granted.spaceId, requested.spaceId) && this.pathContains(granted.path, requested.path);
  }
  // Space IDs are `tinycloud:pkh:eip155:<chain>:<0xADDR>:<name>`. The embedded
  // EIP-155 address is case-insensitive, but the CLI canonicalizes it to
  // lowercase when building a space URI while stored runtime delegations keep
  // the EIP-55 checksummed form — so a byte-for-byte compare spuriously rejects
  // an otherwise-valid grant. Lowercase ONLY the `eip155:<chain>:0x<addr>`
  // segment and leave everything else (crucially the case-sensitive space NAME)
  // byte-exact. Mirrors the CLI's `normalizeSpaceForCompare` (OPENKEY_SCOPE_MISMATCH fix).
  spaceIdsEqual(a, b) {
    return this.normalizeSpaceAddress(a) === this.normalizeSpaceAddress(b);
  }
  normalizeSpaceAddress(space) {
    return space.replace(
      /(eip155:\d+:)(0x[0-9a-fA-F]{40})/,
      (_match, prefix, addr) => prefix + addr.toLowerCase()
    );
  }
  actionContains(grantedAction, requestedAction) {
    if (grantedAction === requestedAction) {
      return true;
    }
    if (grantedAction.endsWith("/*")) {
      const prefix = grantedAction.slice(0, -2);
      return requestedAction.startsWith(`${prefix}/`);
    }
    return false;
  }
  invocationServiceName(service) {
    return service.startsWith("tinycloud.") ? this.shortServiceName(service) : service;
  }
  isEncryptionNetworkOperation(service, path) {
    return service === "encryption" && path.startsWith("urn:tinycloud:encryption:");
  }
  operationFromInvokeAnyEntry(entry) {
    const service = this.invocationServiceName(entry.service);
    if (typeof entry.resource === "string") {
      return {
        resource: entry.resource,
        service,
        path: entry.path,
        action: entry.action
      };
    }
    if (this.isEncryptionNetworkOperation(service, entry.path)) {
      return {
        resource: entry.path,
        service,
        path: entry.path,
        action: entry.action
      };
    }
    if (typeof entry.spaceId === "string") {
      return {
        spaceId: entry.spaceId,
        service,
        path: entry.path,
        action: entry.action
      };
    }
    return void 0;
  }
  pathContains(grantedPath, requestedPath) {
    if (grantedPath === "" || grantedPath === "/") {
      return true;
    }
    if (grantedPath.endsWith("/**")) {
      return requestedPath.startsWith(grantedPath.slice(0, -3));
    }
    if (grantedPath.endsWith("/*")) {
      const prefix = grantedPath.slice(0, -2);
      if (!requestedPath.startsWith(prefix)) {
        return false;
      }
      const remainder = requestedPath.slice(prefix.length);
      return !remainder.includes("/") || remainder === "/";
    }
    if (grantedPath.endsWith("/")) {
      return requestedPath.startsWith(grantedPath);
    }
    return grantedPath === requestedPath;
  }
  /**
   * Issue a delegation via the legacy wallet-signed SIWE path for a single
   * {@link PermissionEntry}. Shares the implementation with the public
   * `createDelegation` method via {@link createDelegationWalletPath} so
   * both entry points hit exactly the same SIWE / signer / public-space
   * logic without mutual recursion.
   *
   * @internal
   */
  async createDelegationLegacyWalletPath(delegateDID, entry, expirationTime) {
    const session = this.auth?.tinyCloudSession;
    const spaceIdOverride = session === void 0 || entry.space === "default" ? void 0 : this.resolvePermissionSpace(entry.space, session);
    return this.createDelegationWalletPath({
      path: entry.path,
      actions: entry.actions,
      delegateDID,
      includePublicSpace: true,
      expiryMs: Math.max(0, expirationTime.getTime() - Date.now()),
      spaceIdOverride
    });
  }
  /**
   * Create a delegation from this user to another user.
   *
   * The delegation grants the recipient access to a specific path and actions
   * within this user's space.
   *
   * @param params - Delegation parameters
   * @returns A portable delegation that can be sent to the recipient
   */
  async createDelegation(params) {
    if (!this.signer) {
      throw new Error("Cannot createDelegation() in session-only mode. Requires wallet mode.");
    }
    if (!this.auth?.tinyCloudSession) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    let resolvedDelegateDID = params.delegateDID;
    if (resolvedDelegateDID.endsWith(".eth") && this.config.ensResolver) {
      const address = await this.config.ensResolver.resolveAddress(resolvedDelegateDID);
      if (!address) throw new Error(`Could not resolve ENS name: ${resolvedDelegateDID}`);
      resolvedDelegateDID = pkhDid2(address, 1);
    }
    const entries = legacyParamsToPermissionEntries(
      params.actions,
      params.path,
      params.spaceIdOverride
    );
    try {
      const result = await this.delegateTo(
        resolvedDelegateDID,
        entries,
        params.expiryMs !== void 0 ? { expiry: params.expiryMs } : void 0
      );
      return result.delegation;
    } catch (err) {
      if (err instanceof PermissionNotInManifestError) {
      } else {
        throw err;
      }
    }
    return this.createDelegationWalletPath({
      ...params,
      delegateDID: resolvedDelegateDID
    });
  }
  /**
   * Legacy wallet-signed SIWE delegation path. Lifted from the original
   * `createDelegation` body verbatim so both the legacy public method and
   * `delegateTo({ forceWalletSign: true })` hit the same code.
   *
   * @internal
   */
  async createDelegationWalletPath(params) {
    if (!this.signer) {
      throw new Error("Cannot createDelegation() in session-only mode. Requires wallet mode.");
    }
    const session = this.auth?.tinyCloudSession;
    if (!session) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    const abilities = {};
    const kvActions = params.actions.filter((a) => a.startsWith("tinycloud.kv/"));
    const sqlActions = params.actions.filter((a) => a.startsWith("tinycloud.sql/"));
    const duckdbActions = params.actions.filter((a) => a.startsWith("tinycloud.duckdb/"));
    if (kvActions.length > 0) {
      abilities.kv = { [params.path]: kvActions };
    }
    if (sqlActions.length > 0) {
      abilities.sql = { [params.path]: sqlActions };
    }
    if (duckdbActions.length > 0) {
      abilities.duckdb = { [params.path]: duckdbActions };
    }
    const now = /* @__PURE__ */ new Date();
    const expiryMs = params.expiryMs ?? 60 * 60 * 1e3;
    const expirationTime = new Date(now.getTime() + expiryMs);
    const prepared = this.wasmBindings.prepareSession({
      abilities,
      address: this.wasmBindings.ensureEip55(session.address),
      chainId: session.chainId,
      domain: this.siweDomain,
      issuedAt: now.toISOString(),
      expirationTime: expirationTime.toISOString(),
      spaceId: params.spaceIdOverride ?? session.spaceId,
      delegateUri: params.delegateDID,
      parents: [session.delegationCid]
    });
    const signature = await this.signer.signMessage(prepared.siwe);
    const delegationSession = this.wasmBindings.completeSessionSetup({
      ...prepared,
      signature
    });
    const activateResult = await activateSessionWithHost2(
      this.config.host,
      delegationSession.delegationHeader
    );
    if (!activateResult.success) {
      throw new Error(`Failed to activate delegation: ${activateResult.error}`);
    }
    const result = {
      cid: delegationSession.delegationCid,
      delegationHeader: delegationSession.delegationHeader,
      spaceId: params.spaceIdOverride ?? session.spaceId,
      path: params.path,
      actions: params.actions,
      disableSubDelegation: params.disableSubDelegation ?? false,
      expiry: expirationTime,
      delegateDID: params.delegateDID,
      ownerAddress: session.address,
      chainId: session.chainId,
      host: this.config.host
    };
    const hasKvActions = params.actions.some((a) => a.startsWith("tinycloud.kv/"));
    if (hasKvActions && params.includePublicSpace !== false) {
      const publicSpaceId = makePublicSpaceId(
        this.wasmBindings.ensureEip55(session.address),
        session.chainId
      );
      const publicAbilities = {
        kv: { "": [KV2.GET, KV2.PUT, KV2.METADATA] }
      };
      const publicPrepared = this.wasmBindings.prepareSession({
        abilities: publicAbilities,
        address: this.wasmBindings.ensureEip55(session.address),
        chainId: session.chainId,
        domain: this.siweDomain,
        issuedAt: now.toISOString(),
        expirationTime: expirationTime.toISOString(),
        spaceId: publicSpaceId,
        delegateUri: params.delegateDID,
        parents: [session.delegationCid]
      });
      const publicSignature = await this.signer.signMessage(publicPrepared.siwe);
      const publicSession = this.wasmBindings.completeSessionSetup({
        ...publicPrepared,
        signature: publicSignature
      });
      const publicActivateResult = await activateSessionWithHost2(
        this.config.host,
        publicSession.delegationHeader
      );
      if (publicActivateResult.success) {
        result.publicDelegation = {
          cid: publicSession.delegationCid,
          delegationHeader: publicSession.delegationHeader,
          spaceId: publicSpaceId,
          path: "",
          actions: [KV2.GET, KV2.PUT, KV2.METADATA],
          disableSubDelegation: params.disableSubDelegation ?? false,
          expiry: expirationTime,
          delegateDID: params.delegateDID,
          ownerAddress: session.address,
          chainId: session.chainId,
          host: this.config.host
        };
      }
    }
    return result;
  }
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
  async useDelegation(delegation) {
    const delegationHeader = delegation.delegationHeader;
    const targetHost = delegation.host ?? this.config.host;
    if (this.isSessionOnly) {
      const myDid = this.did;
      if (!didPrincipalMatches2(delegation.delegateDID, myDid)) {
        throw new Error(
          `Delegation targets ${delegation.delegateDID} but this user's DID is ${myDid}. The delegation must target this user's DID.`
        );
      }
      const session2 = {
        address: delegation.ownerAddress,
        chainId: delegation.chainId,
        sessionKey: JSON.stringify(this.sessionKeyJwk),
        spaceId: delegation.spaceId,
        delegationCid: delegation.cid,
        delegationHeader,
        verificationMethod: this.sessionDid,
        jwk: this.sessionKeyJwk,
        siwe: "",
        // Not used in session-only mode
        signature: ""
        // Not used in session-only mode
      };
      this.trackReceivedDelegation(delegation, this.sessionKeyJwk);
      this.installRuntimeGrantFromServiceSession(
        delegation,
        {
          delegationHeader: session2.delegationHeader,
          delegationCid: session2.delegationCid,
          spaceId: session2.spaceId,
          verificationMethod: session2.verificationMethod,
          jwk: session2.jwk
        },
        delegation.expiry
      );
      return new DelegatedAccess(
        session2,
        delegation,
        targetHost,
        this.wasmBindings.invoke,
        this.wasmBindings.invokeAny,
        this.config.telemetry
      );
    }
    const mySession = this.auth?.tinyCloudSession;
    if (!mySession) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    const jwk = mySession.jwk;
    const { abilities, rawAbilities } = this.buildActivationAbilities(delegation);
    const now = /* @__PURE__ */ new Date();
    const maxExpiry = new Date(now.getTime() + 60 * 60 * 1e3);
    const expirationTime = delegation.expiry < maxExpiry ? delegation.expiry : maxExpiry;
    const prepared = this.wasmBindings.prepareSession({
      abilities,
      address: this.wasmBindings.ensureEip55(mySession.address),
      chainId: mySession.chainId,
      domain: this.siweDomain,
      issuedAt: now.toISOString(),
      expirationTime: expirationTime.toISOString(),
      spaceId: delegation.spaceId,
      jwk,
      parents: [delegation.cid],
      ...Object.keys(rawAbilities).length > 0 ? { rawAbilities } : {}
    });
    const signature = await this.signer.signMessage(prepared.siwe);
    const invokerSession = this.wasmBindings.completeSessionSetup({
      ...prepared,
      signature
    });
    const activateResult = await activateSessionWithHost2(
      targetHost,
      invokerSession.delegationHeader
    );
    if (!activateResult.success) {
      throw new Error(`Failed to activate delegated session: ${activateResult.error}`);
    }
    const session = {
      address: mySession.address,
      chainId: mySession.chainId,
      sessionKey: mySession.sessionKey,
      spaceId: delegation.spaceId,
      delegationCid: invokerSession.delegationCid,
      delegationHeader: invokerSession.delegationHeader,
      verificationMethod: mySession.verificationMethod,
      jwk,
      siwe: prepared.siwe,
      signature
    };
    this.trackReceivedDelegation(delegation, jwk);
    this.installRuntimeGrantFromServiceSession(
      delegation,
      {
        delegationHeader: session.delegationHeader,
        delegationCid: session.delegationCid,
        spaceId: session.spaceId,
        verificationMethod: session.verificationMethod,
        jwk: session.jwk
      },
      expirationTime
    );
    return new DelegatedAccess(
      session,
      delegation,
      targetHost,
      this.wasmBindings.invoke,
      this.wasmBindings.invokeAny,
      this.config.telemetry
    );
  }
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
  async createSubDelegation(parentDelegation, params) {
    if (!this.signer) {
      throw new Error("Cannot createSubDelegation() in session-only mode. Requires wallet mode.");
    }
    if (!this._address) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    if (parentDelegation.disableSubDelegation) {
      throw new Error("Parent delegation does not allow sub-delegation");
    }
    if (!params.path.startsWith(parentDelegation.path)) {
      throw new Error(
        `Sub-delegation path "${params.path}" must be within parent path "${parentDelegation.path}"`
      );
    }
    const parentActions = new Set(parentDelegation.actions);
    for (const action of params.actions) {
      if (!parentActions.has(action)) {
        throw new Error(
          `Sub-delegation action "${action}" is not in parent's actions: ${parentDelegation.actions.join(", ")}`
        );
      }
    }
    const now = /* @__PURE__ */ new Date();
    const expiryMs = params.expiryMs ?? 60 * 60 * 1e3;
    const requestedExpiry = new Date(now.getTime() + expiryMs);
    const actualExpiry = requestedExpiry > parentDelegation.expiry ? parentDelegation.expiry : requestedExpiry;
    const abilities = {};
    const kvActions = params.actions.filter((a) => a.startsWith("tinycloud.kv/"));
    const sqlActions = params.actions.filter((a) => a.startsWith("tinycloud.sql/"));
    const duckdbActions = params.actions.filter((a) => a.startsWith("tinycloud.duckdb/"));
    if (kvActions.length > 0) {
      abilities.kv = { [params.path]: kvActions };
    }
    if (sqlActions.length > 0) {
      abilities.sql = { [params.path]: sqlActions };
    }
    if (duckdbActions.length > 0) {
      abilities.duckdb = { [params.path]: duckdbActions };
    }
    const targetHost = parentDelegation.host ?? this.config.host;
    const prepared = this.wasmBindings.prepareSession({
      abilities,
      address: this.wasmBindings.ensureEip55(this._address),
      chainId: this._chainId,
      domain: this.siweDomain,
      issuedAt: now.toISOString(),
      expirationTime: actualExpiry.toISOString(),
      spaceId: parentDelegation.spaceId,
      delegateUri: params.delegateDID,
      parents: [parentDelegation.cid]
    });
    const signature = await this.signer.signMessage(prepared.siwe);
    const subDelegationSession = this.wasmBindings.completeSessionSetup({
      ...prepared,
      signature
    });
    const activateResult = await activateSessionWithHost2(
      targetHost,
      subDelegationSession.delegationHeader
    );
    if (!activateResult.success) {
      throw new Error(`Failed to activate sub-delegation: ${activateResult.error}`);
    }
    return {
      cid: subDelegationSession.delegationCid,
      delegationHeader: subDelegationSession.delegationHeader,
      spaceId: parentDelegation.spaceId,
      path: params.path,
      actions: params.actions,
      disableSubDelegation: params.disableSubDelegation ?? false,
      expiry: actualExpiry,
      delegateDID: params.delegateDID,
      ownerAddress: parentDelegation.ownerAddress,
      chainId: parentDelegation.chainId,
      host: targetHost
    };
  }
};
// ===========================================================================
// Capability-chain delegation (spec: .claude/specs/capability-chain.md)
// ===========================================================================
/**
 * Safety margin before the session's own expiry at which {@link delegateTo}
 * will refuse to issue a derived delegation. Prevents issuing sub-delegations
 * that would be invalid by the time the recipient used them. Spec: 60 seconds.
 *
 * @internal
 */
_TinyCloudNode.SESSION_EXPIRY_SAFETY_MARGIN_MS = 6e4;
var TinyCloudNode = _TinyCloudNode;

// src/core.ts
import {
  ACCOUNT_REGISTRY_PATH,
  ACCOUNT_REGISTRY_SPACE as ACCOUNT_REGISTRY_SPACE2,
  DEFAULT_MANIFEST_SPACE as DEFAULT_MANIFEST_SPACE2,
  DEFAULT_MANIFEST_VERSION,
  VAULT_PERMISSION_SERVICE,
  PermissionNotInManifestError as PermissionNotInManifestError2,
  SessionExpiredError as SessionExpiredError2,
  ManifestValidationError,
  composeManifestRequest as composeManifestRequest2,
  resolveManifest as resolveManifest2,
  validateManifest,
  loadManifest,
  isCapabilitySubset as isCapabilitySubset2,
  expandActionShortNames,
  expandPermissionEntries as expandPermissionEntries2,
  expandPermissionEntry,
  parseExpiry as parseExpiry2,
  resourceCapabilitiesToSpaceAbilitiesMap as resourceCapabilitiesToSpaceAbilitiesMap2
} from "@tinycloud/sdk-core";

// src/delegation.ts
function serializeDelegation(delegation) {
  return JSON.stringify({
    ...delegation,
    expiry: delegation.expiry.toISOString()
  });
}
function deserializeDelegation(data) {
  const parsed = JSON.parse(data);
  return {
    ...parsed,
    cid: parsed.cid,
    expiry: new Date(parsed.expiry)
  };
}

// src/core.ts
import {
  DEFAULT_SIGNED_READ_URL_EXPIRY_MS,
  KVService as KVService3,
  PrefixedKVService
} from "@tinycloud/sdk-core";
import { SQLService as SQLService3, SQLAction, DatabaseHandle } from "@tinycloud/sdk-core";
import {
  DuckDbService as DuckDbService3,
  DuckDbDatabaseHandle,
  DuckDbAction
} from "@tinycloud/sdk-core";
import {
  DataVaultService as DataVaultService2,
  VaultHeaders,
  VaultPublicSpaceKVActions,
  createVaultCrypto as createVaultCrypto2,
  SecretsService as SecretsService2,
  SECRET_NAME_RE,
  canonicalizeSecretScope,
  resolveSecretListPrefix as resolveSecretListPrefix2,
  resolveSecretPath as resolveSecretPath2
} from "@tinycloud/sdk-core";
import {
  DelegationManager as DelegationManager2,
  SharingService as SharingService2,
  createSharingService,
  DelegationErrorCodes
} from "@tinycloud/sdk-core";
import {
  CapabilityKeyRegistry as CapabilityKeyRegistry2,
  createCapabilityKeyRegistry,
  CapabilityKeyRegistryErrorCodes
} from "@tinycloud/sdk-core";
import {
  SpaceService as SpaceService2,
  SpaceErrorCodes,
  createSpaceService,
  parseSpaceUri,
  buildSpaceUri,
  makePublicSpaceId as makePublicSpaceId2,
  Space
} from "@tinycloud/sdk-core";
import {
  ProtocolMismatchError,
  VersionCheckError,
  UnsupportedFeatureError as UnsupportedFeatureError2,
  checkNodeInfo as checkNodeInfo2
} from "@tinycloud/sdk-core";
import { ServiceContext as ServiceContext3 } from "@tinycloud/sdk-core";
export {
  ACCOUNT_REGISTRY_PATH,
  ACCOUNT_REGISTRY_SPACE2 as ACCOUNT_REGISTRY_SPACE,
  AccountService,
  AutoApproveSpaceCreationHandler2 as AutoApproveSpaceCreationHandler,
  CapabilityKeyRegistry2 as CapabilityKeyRegistry,
  CapabilityKeyRegistryErrorCodes,
  DEFAULT_MANIFEST_SPACE2 as DEFAULT_MANIFEST_SPACE,
  DEFAULT_MANIFEST_VERSION,
  DEFAULT_SIGNED_READ_URL_EXPIRY_MS,
  DataVaultService2 as DataVaultService,
  DatabaseHandle,
  DelegatedAccess,
  DelegationErrorCodes,
  DelegationManager2 as DelegationManager,
  DuckDbAction,
  DuckDbDatabaseHandle,
  DuckDbService3 as DuckDbService,
  FileSessionStorage,
  IdentityParseError,
  KVService3 as KVService,
  ManifestValidationError,
  MemorySessionStorage,
  NodeUserAuthorization,
  PermissionNotInManifestError2 as PermissionNotInManifestError,
  PrefixedKVService,
  ProtocolMismatchError,
  SECRET_NAME_RE,
  SQLAction,
  SQLService3 as SQLService,
  SecretsService2 as SecretsService,
  ServiceContext3 as ServiceContext,
  SessionExpiredError2 as SessionExpiredError,
  SharingService2 as SharingService,
  SilentNotificationHandler2 as SilentNotificationHandler,
  Space,
  SpaceErrorCodes,
  SpaceService2 as SpaceService,
  TinyCloud2 as TinyCloud,
  TinyCloudDebugLogger,
  TinyCloudNode,
  UnsupportedFeatureError2 as UnsupportedFeatureError,
  VAULT_PERMISSION_SERVICE,
  VaultHeaders,
  VaultPublicSpaceKVActions,
  VersionCheckError,
  WasmKeyProvider,
  addressStorageKey,
  buildSpaceUri,
  canonicalizeAddress3 as canonicalizeAddress,
  canonicalizeDid,
  canonicalizeDidUrl,
  canonicalizeNetworkId,
  canonicalizeSecretScope,
  checkNodeInfo2 as checkNodeInfo,
  clearTinyCloudDebugLogs,
  composeManifestRequest2 as composeManifestRequest,
  createCapabilityKeyRegistry,
  createOpenKeyCallbackSigningStrategy,
  createSharingService,
  createSpaceService,
  createVaultCrypto2 as createVaultCrypto,
  createWasmKeyProvider,
  defaultSignStrategy,
  defaultSpaceCreationHandler,
  deserializeDelegation,
  didCacheKey,
  didEquals,
  disableTinyCloudDebug,
  enableTinyCloudDebug,
  expandActionShortNames,
  expandPermissionEntries2 as expandPermissionEntries,
  expandPermissionEntry,
  getTinyCloudDebugLogs,
  installTinyCloudDebugGlobals,
  isCapabilitySubset2 as isCapabilitySubset,
  isEvmAddress,
  loadManifest,
  makePkhSpaceId2 as makePkhSpaceId,
  makePublicSpaceId2 as makePublicSpaceId,
  parseCanonicalNetworkId,
  parseExpiry2 as parseExpiry,
  parsePkhDid,
  parseSpaceUri,
  pkhDid3 as pkhDid,
  principalDid,
  principalDidEquals3 as principalDidEquals,
  resolveManifest2 as resolveManifest,
  resolveSecretListPrefix2 as resolveSecretListPrefix,
  resolveSecretPath2 as resolveSecretPath,
  resourceCapabilitiesToSpaceAbilitiesMap2 as resourceCapabilitiesToSpaceAbilitiesMap,
  serializeDelegation,
  tinyCloudDebugLogger,
  validateManifest
};
//# sourceMappingURL=core.js.map