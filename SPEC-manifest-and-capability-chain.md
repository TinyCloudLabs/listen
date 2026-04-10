# SPEC: App Manifest + Capability Chain Delegation

**Status:** Draft
**Owners:** TinyCloud protocol team
**Target repos:** `tinycloud-node` (Rust WASM), `js-sdk` (TypeScript SDK), consuming apps
**Related:** multi-prompt SIWE issue, listen app PR, `@tinycloud/web-sdk@2.0.4`

---

## Motivation

Today, signing into a TinyCloud app prompts the wallet **3–4 times**:

1. Main session SIWE (with server nonce + recap for session key)
2. User→backend delegation SIWE (fresh wallet signature)
3. Public-space companion delegation SIWE (another fresh wallet signature, auto-triggered when KV actions are present)
4. (First-sign-in only) Host space SIWE for space creation

The core problem: **every new delegation round-trips to the wallet**, even when the capabilities being delegated are already granted to an existing session key. The SDK's `createDelegation` and `createSubDelegation` both call `this.signer.signMessage()` — i.e., Alice's wallet — instead of chaining off the session key authority already in hand.

This spec proposes two changes that together collapse sign-in to **one wallet prompt per session** and enable seamless downstream delegation to backends without additional prompts:

1. **App manifest** (`manifest.json`) — a declarative file that describes the app's identity and the capabilities it needs (including all downstream delegates). The SDK loads the manifest at sign-in time and asks the user to approve the full union of permissions in a single SIWE.

2. **Capability-chain sub-delegation** — when an app needs to delegate to a backend, the SDK checks whether the requested capabilities are derivable from the current session. If yes, it emits a session-key-signed delegation (no wallet prompt). If no, it triggers a re-sign flow with user-visible escalation.

---

## The Alice / Bob / Charlie Model

- **Alice** — the user (wallet owner, root of trust)
- **Bob** — the app's session key (an Ed25519 key held by the frontend, created during sign-in)
- **Charlie** — a backend service the app wants to delegate to (may be any downstream delegate, not just one backend)

**Current broken flow:**

```
Alice signs session SIWE → Bob gets defaultActions
Alice signs createDelegation SIWE → Charlie (backend) gets actions
Alice signs public-space SIWE → backend gets kv/ on public space
```

Three signatures. Alice is re-proving her wallet ownership each time.

**Proposed correct flow:**

```
App loads manifest.json (declares app + all delegate permissions)
App composes a final manifest (its own + any external addenda it has gathered)
SDK computes UNION of all required capabilities
Alice signs ONE SIWE containing the full union as ReCap resources
→ Bob receives session key + recap of full union
Later:
  App calls tcw.delegateTo(charlieDID, subsetOfCaps)
  SDK checks: is subsetOfCaps ⊆ Bob's recap? → YES
  SDK emits UCAN signed with Bob's session key → Charlie
  NO WALLET PROMPT
```

One wallet prompt for the whole app lifetime (until capabilities are exhausted or escalation occurs).

---

## Manifest Schema

### Where the manifest comes from

The manifest can be provided to the SDK in **two ways**:

1. **Loaded from a file** — e.g. `/manifest.json` at the web app's public root
2. **Passed inline as a config object** — directly to `createAndSignIn`

Either form is accepted. The app is responsible for gathering any **external manifests** it wants to compose in (from a backend, from an agent, from anywhere) — the SDK does NOT fetch external manifests itself. The app composes a final manifest and hands it to the SDK.

### Schema

```jsonc
{
  "$schema": "https://tinycloud.xyz/schemas/manifest-v1.json",
  "version": 1,

  // Identity (required)
  "name": "Listen",
  "description": "Meeting transcript sync and review",
  "icon": "/icon.png",
  "appVersion": "0.1.0",

  // Default expiry for all permissions in this manifest (optional, default "30d")
  // Duration string parsed by the `ms` library: "30d", "2h", "90m", "1y", etc.
  // Per-permission expiry overrides this default when set.
  "expiry": "30d",

  // Permissions the app needs (required).
  // Each entry is a capability grant scoped to a service + space + path.
  // The `path` is interpreted by the service:
  //   - tinycloud.kv      → hierarchical prefix (ending in "/" covers all children)
  //   - tinycloud.sql     → database name / file (e.g. "data.sqlite")
  //   - tinycloud.duckdb  → database name / file
  // Paths follow the reverse-DNS convention for app-namespacing: "com.listen.app/..."
  "permissions": [
    {
      "service": "tinycloud.kv",
      "space": "default",
      "path": "com.listen.app/",
      "actions": ["get", "put", "del", "list", "metadata"]
    },
    {
      "service": "tinycloud.sql",
      "space": "default",
      "path": "com.listen.app/data.sqlite",
      "actions": ["read", "write", "ddl"]
    },
    {
      "service": "tinycloud.duckdb",
      "space": "default",
      "path": "com.listen.app/analytics.duckdb",
      "actions": ["read", "write"]
    }
  ],

  // Whether to request public-space capabilities (optional, default: true)
  // When true, the app can publish vault keys and read/write on the user's public space.
  // Apps that don't use public-space publishing set this to `false`.
  "includePublicSpace": true,

  // OPTIONAL: permissions to pre-delegate to other DIDs at sign-in time.
  // The SDK includes these as additional targets in the main SIWE's ReCap,
  // so the app can later sub-delegate to them without a fresh wallet prompt.
  // The `to` field is a DID. The app resolves DIDs itself (fetch from backend,
  // hardcode, receive from agent, etc.) — the SDK does not do DID discovery.
  "delegations": [
    {
      "to": "did:pkh:eip155:1:0xf845Cb45554dbd24Fc03338544684799e0201ca1",
      "name": "listen-backend",               // informational
      "expiry": "7d",                         // optional override
      "permissions": [
        {
          "service": "tinycloud.kv",
          "space": "default",
          "path": "com.listen.app/",
          "actions": ["get", "put", "del", "list"]
        },
        {
          "service": "tinycloud.sql",
          "space": "default",
          "path": "com.listen.app/data.sqlite",
          "actions": ["read", "write"]
        }
      ]
    }
  ]
}
```

### Field semantics

| Field | Required | Notes |
|---|---|---|
| `version` | yes | Schema version, currently `1` |
| `name` | yes | Human-readable app name (shown in wallet prompt) |
| `description` | no | One-line app description |
| `icon` | no | URL to app icon |
| `appVersion` | no | App version string |
| `expiry` | no | Default expiry for all permissions (`ms`-format, default `"30d"`) |
| `permissions` | yes | Array of capability grants for the session key |
| `includePublicSpace` | no | Default `true`. Set `false` to skip public-space companion |
| `delegations` | no | Array of pre-delegation targets (additional recap entries) |

### Permission entry semantics

- **`service`** — e.g. `tinycloud.kv`, `tinycloud.sql`, `tinycloud.duckdb`, `tinycloud.capabilities`. Extensible.
- **`space`** — `"default"` (user's personal space) or a specific space ID. Multiple entries can target different spaces.
- **`path`** — service-specific path:
  - For `tinycloud.kv`: hierarchical prefix. Ending in `/` means "this and all children". No trailing slash means exact key match.
  - For `tinycloud.sql` / `tinycloud.duckdb`: the database name or file (e.g. `"data.sqlite"`, `"com.listen.app/data.sqlite"`).
  - For `tinycloud.capabilities`: a capability key URI or empty for all.
- **`actions`** — short action names (`"get"`, `"put"`, `"read"`, `"write"`, `"ddl"`). SDK expands these to URNs (`tinycloud.kv/get`).
- **`expiry`** — optional per-permission expiry override (`ms`-format).

### Multi-space / multi-resource example

```jsonc
"permissions": [
  // App's primary data in the default space
  { "service": "tinycloud.kv",  "space": "default",    "path": "com.listen.app/",              "actions": ["get", "put", "del", "list"] },
  { "service": "tinycloud.sql", "space": "default",    "path": "com.listen.app/data.sqlite",   "actions": ["read", "write", "ddl"] },

  // Read-only access to a shared DB in a work space
  { "service": "tinycloud.sql", "space": "work-space", "path": "com.listen.shared/meetings.db", "actions": ["read"] }
]
```

### External manifests (composition pattern)

The SDK does not fetch external manifests. Instead, the app composes its own manifest with any external addenda before passing it to the SDK:

```typescript
// App-level composition. NOT in the SDK.
const appManifest = await loadManifestFile("/manifest.json");

// Backend advertises its needs via whatever endpoint the app defines.
const backendManifest = await fetch(`${BACKEND_URL}/manifest`).then(r => r.json());
// or an agent hands you a manifest out-of-band:
// const agentManifest = await agent.requestManifest();

const composed: Manifest = {
  ...appManifest,
  delegations: [
    ...(appManifest.delegations ?? []),
    {
      to: backendManifest.did,
      name: backendManifest.name,
      permissions: backendManifest.permissions,
    },
  ],
};

// Hand the composed manifest to the SDK.
const { tcw, session } = await createAndSignIn(web3Provider, {
  nonce,
  manifest: composed,    // inline config object — no file loading needed
});
```

The external manifest format is whatever the app defines — the SDK only cares about the final composed `Manifest` shape it receives. Backends/agents can serve any format they want as long as the app can translate it to permission entries before handing to the SDK.

---

## SDK API Changes

### Client SDK (`packages/client/` in listen + `js-sdk/packages/web-sdk`)

#### New: `Manifest` types

```typescript
export interface Manifest {
  version: 1;
  name: string;
  description?: string;
  icon?: string;
  appVersion?: string;
  /** Default expiry (ms-format: "30d", "2h"). Default "30d". */
  expiry?: string;
  permissions: PermissionEntry[];
  /** Default true. Set false to skip public-space companion. */
  includePublicSpace?: boolean;
  /** Optional pre-delegation targets (additional recap entries). */
  delegations?: ManifestDelegation[];
}

export interface PermissionEntry {
  service: string;        // "tinycloud.kv" | "tinycloud.sql" | "tinycloud.duckdb" | ...
  space: string;          // "default" or a specific space ID
  path: string;           // service-specific: prefix, db file, etc.
  actions: string[];      // short names: ["get", "put", "read", "write", ...]
  expiry?: string;        // optional per-permission override (ms-format)
}

export interface ManifestDelegation {
  to: string;             // DID of the delegate
  name?: string;          // informational
  expiry?: string;        // optional override
  permissions: PermissionEntry[];
}
```

#### New: `loadManifest(path?: string)` — optional file loader

```typescript
export async function loadManifest(
  path: string = "/manifest.json",
  fetchFn?: typeof fetch,
): Promise<Manifest>;
```

Fetches + validates a manifest file. Apps that pass an inline config object don't need this.

#### New: `resolveManifest(manifest): ResolvedCapabilities`

Pure function — no network. Takes a `Manifest` (loaded or inline) and expands it into the shape `prepareSession` needs:

```typescript
export interface ResolvedCapabilities {
  /** All session-key actions, expanded to URN form. */
  actions: string[];
  /** Resources for the session key's own access (app permissions). */
  resources: ResourceCapability[];
  /** Additional delegation targets to include in the recap. */
  additionalDelegates: ResolvedDelegate[];
  /** Expiry in milliseconds (resolved from the default string). */
  expiryMs: number;
  /** Whether to include the public-space companion. */
  includePublicSpace: boolean;
}

export interface ResourceCapability {
  service: string;
  space: string;
  path: string;
  actions: string[];      // URN form
  expiryMs?: number;      // per-entry override
}

export interface ResolvedDelegate {
  did: string;
  name?: string;
  expiryMs: number;
  permissions: ResourceCapability[];
}

export function resolveManifest(manifest: Manifest): ResolvedCapabilities;
```

Logic:
1. Validate manifest against schema (throw on invalid)
2. Parse `expiry` strings via `ms` library (`"30d"` → `2592000000`)
3. Expand action short-names to URNs (`"get"` → `"tinycloud.kv/get"` when under `service: tinycloud.kv`)
4. Union all `permissions` entries into `resources` for the session key
5. Convert each `delegations` entry into a `ResolvedDelegate` (no network fetching — the `to` DID is already a DID)
6. Return the flat structure ready for `prepareSession`

#### New: duration parser

Use the `ms` npm library (already well-established, tiny footprint). Supports: `"30d"`, `"2h"`, `"90m"`, `"1y"`, `"45s"`, etc.

```typescript
import ms from "ms";

export function parseExpiry(duration: string, fallback?: string): number {
  const parsed = ms(duration);
  if (typeof parsed !== "number") {
    if (fallback) return parseExpiry(fallback);
    throw new Error(`Invalid expiry duration: ${duration}`);
  }
  return parsed;
}
```

#### Modified: `createAndSignIn` / `TinyCloudWeb` config

Accept a `Manifest` (inline or resolved) and plumb it through to `prepareSession`:

```typescript
export async function createAndSignIn(
  web3Provider: providers.Web3Provider,
  config: TinyCloudWebConfig & {
    nonce?: string;
    /** Inline manifest object, or null. SDK does not fetch files. */
    manifest?: Manifest;
  },
): Promise<{ tcw: TinyCloudWeb; session: ClientSession }> {
  const resolved = config.manifest ? resolveManifest(config.manifest) : undefined;

  const tcw = createTinyCloudWeb(web3Provider, {
    ...config,
    siweConfig: { nonce: config.nonce },
    resolvedCapabilities: resolved,   // <-- NEW: forward to prepareSession
  });

  const session = await tcw.signIn();
  return { tcw, session };
}
```

The `tcw.signIn()` internally passes `resolvedCapabilities` to `NodeUserAuthorization.signIn()` which forwards to `prepareSession` as the full action/resource set — NOT the hardcoded `defaultActions`. The ReCap encodes the app's own actions AND all `additionalDelegates` in one SIWE.

#### New: `tcw.delegateTo(did, permissions, options?)`

Replaces the app's current `createDelegation` helper. Checks derivability before signing:

```typescript
export interface DelegateToOptions {
  /** Force fresh wallet signature even if derivable from session. */
  forceWalletSign?: boolean;
  /** How long until the delegation expires. Capped by the current session expiry. */
  expiry?: string;  // ms-format: "7d", "1h"
}

// On TinyCloudWeb / TinyCloudNode:
tcw.delegateTo(
  did: string,
  permissions: PermissionEntry[],
  options?: DelegateToOptions,
): Promise<{ delegation: PortableDelegation; prompted: boolean }>;
```

Logic:
1. Convert `permissions` to full URN actions + resolve expiry
2. Call `isCapabilitySubset(requested, grantedInSession)`:
   - Parse the current session's recap capabilities (`parseRecapCapabilities(session.siwe)`)
   - Check each requested (service, space, path, actions) fits under something in the session
3. If subset AND `!forceWalletSign`:
   - **Sign with the session key** (requires new WASM binding, see Rust section)
   - Emit a session-key UCAN chained from the session's delegation CID
   - `prompted: false`
4. If NOT subset:
   - Throw `PermissionNotInManifestError` with the missing entries
   - Caller can catch and call `tcw.requestPermissions(missing)` for escalation

#### New: `PermissionNotInManifestError`

```typescript
export class PermissionNotInManifestError extends Error {
  constructor(
    public missingPermissions: PermissionEntry[],
    public grantedPermissions: PermissionEntry[],
  ) {
    super(
      `Requested permissions exceed current session. Missing: ${JSON.stringify(
        missingPermissions,
      )}`,
    );
  }
}
```

#### New: `tcw.requestPermissions(permissions)`

The escalation path. Opens a TinyCloud UI modal ("This app is requesting additional permissions"), then triggers a fresh sign-in with the expanded set:

```typescript
tcw.requestPermissions(
  additionalPermissions: PermissionEntry[],
): Promise<{ session: ClientSession; approved: boolean }>;
```

Logic:
1. Show `PermissionRequestModal` with the list of additional permissions
2. If user approves:
   - Re-call `signIn` with union of (current recap ∪ additional)
   - Returns new session
3. If user declines:
   - Return `{ approved: false }`

#### New UI: `PermissionRequestModal`

Web Component, same style as the existing `SpaceCreationModal` in the web-sdk. Shows:
- App name + icon from manifest
- "This app is requesting additional permissions:"
- List of each requested `(service, space, path, actions)`
- Approve / Decline buttons

---

### Core SDK (`@tinycloud/sdk-core`)

#### New utility: `isCapabilitySubset(requested, granted)`

Subset check using Set operations on action URNs + path containment:

```typescript
export function isCapabilitySubset(
  requested: PermissionEntry[],
  granted: PermissionEntry[],
): { subset: boolean; missing: PermissionEntry[] };
```

Rules:
- For each requested `(service, space, path)`, find a granted entry that matches `service` + `space` + path containment:
  - If `granted.path` ends in `/`, matches when `requested.path.startsWith(granted.path)` or equals
  - Else matches only on exact `requested.path === granted.path`
- If found, check `requested.actions ⊆ granted.actions`
- Any mismatch → added to `missing` list

#### New utility: `parseRecapCapabilities(siwe): PermissionEntry[]`

Parses a signed SIWE message's `Resources:` URNs back into a structured permissions list. Used by `tcw.delegateTo` to check derivability against the current session.

---

### Node SDK (`@tinycloud/node-sdk`)

#### Modified: `NodeUserAuthorization.signIn()`

Accept `resolvedCapabilities` from constructor config and pass to `prepareSession` instead of `defaultActions`:

```typescript
// NodeUserAuthorization.ts:442-570
signIn = async (): Promise<ClientSession> => {
  // ...
  const actions = this.resolvedCapabilities?.actions ?? this.defaultActions;
  const resources = this.resolvedCapabilities?.resources;

  const prepared = await this.wasm.prepareSession({
    abilities: actions,
    resources,                          // <-- NEW: explicit resource list
    additionalDelegates:                // <-- NEW: list of backend DIDs from manifest
      this.resolvedCapabilities?.delegates.map(d => ({
        did: d.did,
        permissions: d.permissions,
      })),
    address, chainId, domain,
    issuedAt, expirationTime,
    spaceId, jwk,
    ...this.buildSiweOverrides(),       // nonce lives here
  });

  await this.requestSignature({
    address, chainId,
    message: prepared.siwe,
    type: "siwe",
  });
  // ...
};
```

This requires **Rust WASM changes** to accept `resources` and `additionalDelegates` — see next section.

#### New: `TinyCloudNode.delegateToSessionKey()` (internal)

The session-key-signed sub-delegation path. Uses a new WASM export `signDelegationWithSessionKey`:

```typescript
async delegateToSessionKey(
  delegateDID: string,
  actions: string[],
  path: string,
  expiryMs?: number,
): Promise<PortableDelegation> {
  const session = this.userAuth.getCurrentSession();
  if (!session) throw new Error("Not signed in");

  // Prepare the delegation message
  const prepared = await this.wasm.prepareDelegationFromSession({
    parentCid: session.delegationCid,
    delegateUri: delegateDID,
    actions,
    path,
    expirationTime: new Date(Date.now() + (expiryMs ?? DEFAULT_EXPIRY)).toISOString(),
  });

  // Sign with session key — NO wallet prompt
  const signedDelegation = await this.wasm.signDelegationWithSessionKey({
    sessionJwk: session.jwk,
    message: prepared.message,
  });

  return signedDelegation;
}
```

---

### Rust WASM (`tinycloud-node/tinycloud-sdk-wasm/src/session.rs`)

#### 1. Extend `SessionConfig` to accept manifest-derived inputs

```rust
#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SessionConfig {
    // ... existing fields ...

    /// Optional: explicit resources list (ReCap URNs) instead of deriving from abilities.
    /// When present, takes precedence over `abilities` for recap construction.
    #[serde(default)]
    pub resources: Option<Vec<ResourceCapability>>,

    /// Optional: additional delegate targets to include in the recap.
    /// Each delegate is added as an additional `att:` entry in the ReCap URN.
    #[serde(default)]
    pub additional_delegates: Option<Vec<AdditionalDelegate>>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ResourceCapability {
    pub service: String,
    pub space: String,
    pub path: String,
    pub actions: Vec<String>,
    #[serde(default)]
    pub expiry_ms: Option<u64>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AdditionalDelegate {
    pub did: String,
    pub permissions: Vec<ResourceCapability>,
}
```

#### 2. Update `into_message()` to build a single recap with all targets

The current `into_message()` builds a capability for the session key URI only. Change it to:
- Start with the session key URI + its abilities
- For each `additional_delegates` entry, add an `Ability` under that delegate's URI
- The resulting ReCap URN encodes **all target URIs in one `att:` map**

```rust
fn into_message(self) -> Result<Message, JsError> {
    // ... existing header setup ...

    let mut capabilities = Capability::default();

    // Primary target: session key
    for action in &self.abilities {
        capabilities = capabilities.with_action(
            &session_key_uri,
            action,
        )?;
    }

    // Additional targets: each delegate from the manifest
    if let Some(delegates) = &self.additional_delegates {
        for delegate in delegates {
            for perm in &delegate.permissions {
                for action in &perm.actions {
                    let action_urn = format!("{}/{}", perm.service, action);
                    capabilities = capabilities.with_action(
                        &delegate.did,
                        &action_urn,
                    )?;
                }
            }
        }
    }

    let message = capabilities.build_message(Message {
        domain, address, statement,
        uri: session_key_uri,
        version, chain_id,
        nonce: self.nonce.unwrap_or_else(generate_nonce),
        issued_at, expiration_time,
        not_before: None, request_id: None,
        resources: vec![],
    })?;

    Ok(message)
}
```

#### 3. New WASM export: `sign_delegation_with_session_key`

This is the critical missing primitive. The SDK currently has no way to sign with the Ed25519 session key; the architecture assumes wallet-as-root.

```rust
#[wasm_bindgen]
pub async fn sign_delegation_with_session_key(
    config: JsValue,
) -> Result<JsValue, JsError> {
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Input {
        session_jwk: serde_json::Value,   // Ed25519 private key JWK
        delegation: DelegationPayload,    // parent CID, delegate URI, actions, path, expiry
    }

    let input: Input = serde_wasm_bindgen::from_value(config)?;

    // 1. Reconstruct Ed25519 keypair from JWK
    let keypair = ed25519_from_jwk(&input.session_jwk)?;

    // 2. Build the delegation payload (UCAN-style)
    let delegation_bytes = build_delegation_bytes(&input.delegation)?;

    // 3. Sign with Ed25519
    let signature = keypair.sign(&delegation_bytes);

    // 4. Return signed delegation
    let signed = SignedDelegation {
        parent: input.delegation.parent_cid,
        delegate: input.delegation.delegate_uri,
        actions: input.delegation.actions,
        path: input.delegation.path,
        expiry: input.delegation.expiration_time,
        signature: base64_encode(signature.to_bytes()),
        verification_method: did_key_from_jwk(&input.session_jwk)?,
    };

    Ok(serde_wasm_bindgen::to_value(&signed)?)
}
```

#### 4. New WASM export: `prepare_delegation_from_session`

Builds the delegation payload WITHOUT signing it (for inspection or batched signing):

```rust
#[wasm_bindgen]
pub fn prepare_delegation_from_session(config: JsValue) -> Result<JsValue, JsError> {
    // Returns { message: bytes, cid: string } ready to be signed
    // by sign_delegation_with_session_key
}
```

---

### Backend SDK (`@tinyboilerplate/server`)

The backend's manifest advertisement is entirely app-defined — not something the SDK provides. Backends expose their required permissions however they want (REST endpoint, gRPC, config file, etc.) and apps fetch and compose them client-side before calling `createAndSignIn`.

The ONLY SDK-level change on the backend is verifying session-key-signed delegations.

#### New: delegation verification from session-key UCAN

The backend's delegation middleware currently activates a user-signed SIWE delegation. With capability-chain delegation, it also needs to verify session-key-signed UCANs:

```typescript
export async function verifySessionKeyDelegation(
  delegation: SessionKeySignedDelegation,
  trustedParentCid: string,
): Promise<{ address: string; access: DelegatedAccess }>;
```

Logic:
1. Verify signature using `verificationMethod` (the `did:key:...` embedded in the delegation)
2. Resolve the parent delegation CID via TinyCloud node
3. Verify parent is signed by a wallet the backend trusts
4. Verify requested capabilities are ⊆ parent's recap
5. Activate the delegation via the existing `useDelegation` path

---

## Consuming App Changes (Listen)

### 1. Create `public/manifest.json`

```json
{
  "version": 1,
  "name": "Listen",
  "description": "Meeting transcript sync",
  "expiry": "30d",
  "permissions": [
    {
      "service": "tinycloud.kv",
      "space": "default",
      "path": "com.listen.app/",
      "actions": ["get", "put", "del", "list", "metadata"]
    },
    {
      "service": "tinycloud.sql",
      "space": "default",
      "path": "com.listen.app/data.sqlite",
      "actions": ["read", "write", "ddl"]
    }
  ],
  "includePublicSpace": true
}
```

Note: `delegations` is NOT included in the static manifest because the backend DID is only known at runtime. The app fetches the backend DID and composes it dynamically.

### 2. Simplify `handleSignIn` in `App.tsx`

```typescript
const handleSignIn = useCallback(async () => {
  setAuthLoading(true);
  setAuthError(null);
  try {
    const appManifest = await loadManifest("/manifest.json");

    // Fetch the backend's advertised permissions and compose them into the manifest.
    // The format of `${BACKEND_URL}/manifest` is app-defined — the SDK doesn't care.
    const info = await fetchServerInfo(BACKEND_URL);  // { did, name, permissions }

    const composedManifest: Manifest = {
      ...appManifest,
      delegations: [
        {
          to: info.did,
          name: "listen-backend",
          expiry: "7d",
          permissions: info.permissions,
        },
      ],
    };

    const { address: addr, web3Provider } = await connectWallet({ host: OPENKEY_HOST });
    const nonce = await requestNonce(BACKEND_URL, addr);

    // Single wallet prompt — SIWE includes app + backend caps in one ReCap.
    const { tcw, session } = await createAndSignIn(web3Provider, {
      nonce,
      manifest: composedManifest,
      tinycloudHosts: [TINYCLOUD_HOST],
      autoCreateSpace: true,
    });

    const { token, expiresIn } = await verifySession(
      BACKEND_URL,
      session.siwe,
      session.signature,
    );
    sessionStoreRef.current.setSession(token, expiresIn, addr);

    // Backend delegation is derivable from the already-signed session — no wallet prompt.
    const { delegation, prompted } = await tcw.delegateTo(info.did, info.permissions);
    console.log(`[auth] backend delegation prompted: ${prompted}`); // false

    await sendDelegation(BACKEND_URL, delegation.serialized, token);

    setAddress(addr);
    setDid(tcw.did ?? null);
    setTcw(tcw);
    setApi(createApiClient(BACKEND_URL, { sessionStore: sessionStoreRef.current }));
  } catch (err) {
    if (err instanceof PermissionNotInManifestError) {
      const { approved } = await tcw.requestPermissions(err.missingPermissions);
      if (!approved) setAuthError("User declined additional permissions");
    } else {
      setAuthError(err instanceof Error ? err.message : String(err));
    }
  } finally {
    setAuthLoading(false);
  }
}, []);
```

### 3. Update backend to expose its required permissions

The backend exposes its permissions however the app wants — the SDK doesn't care about the endpoint format. The simplest path is to extend the existing `/api/server-info` endpoint:

```typescript
// examples/react-express/backend/src/routes/server-info.ts
router.get("/", (_req, res) => {
  res.json({
    did,
    name: "listen-backend",
    status: "ready",
    permissions: [
      { service: "tinycloud.kv",  space: "default", path: "com.listen.app/",            actions: ["get", "put", "del", "list"] },
      { service: "tinycloud.sql", space: "default", path: "com.listen.app/data.sqlite", actions: ["read", "write"] },
    ],
  });
});
```

This stays completely app-defined. Other backends could use gRPC, well-known JSON, env-var hardcoding, etc. The SDK never calls these endpoints.

### 4. Update delegation middleware to accept session-key UCANs

```typescript
const delegationMiddleware = createDelegationMiddleware({
  node,
  store: delegationStore,
  cache: delegationCache,
  acceptSessionKeyDelegations: true,   // <-- NEW
});
```

---

## Migration / Backwards Compatibility

- **Without manifest** (existing apps): Fall back to current `defaultActions` behavior. `createDelegation` still works with wallet prompts. Nothing breaks.
- **With manifest**: Apps opt in by providing `manifest` to `createAndSignIn`. New behavior is isolated to manifest-aware sign-in.
- **Backend opt-in**: Backends set `acceptSessionKeyDelegations: true` to accept the new UCAN format. Defaults to `false` to preserve current behavior.
- **WASM rev bump**: This requires a tinycloud-node release and a coordinated js-sdk rev update. Existing deployments pinned to the old WASM continue working.

---

## Implementation Plan

### Phase 1 — Rust WASM (tinycloud-node)

**Repo:** `TinyCloudLabs/tinycloud-node`
**Files:** `tinycloud-sdk-wasm/src/session.rs`, `tinycloud-sdk-wasm/src/lib.rs`, plus new `delegation.rs` module

1. Extend `SessionConfig` struct with `resources` and `additional_delegates` fields
2. Update `into_message()` to build multi-target ReCap capabilities
3. Add `prepare_delegation_from_session` WASM export
4. Add `sign_delegation_with_session_key` WASM export (Ed25519 signing from JWK)
5. Add `verify_session_key_delegation` WASM export (for backend-side verification)
6. Write Rust unit tests for:
   - Multi-target ReCap builder
   - Ed25519 sign/verify round-trip from JWK
   - Subset check between child and parent recap
7. Build WASM, publish artifacts, create PR

**Acceptance:** `cargo test` passes, WASM size diff < 50KB, existing tests unaffected.

### Phase 2 — sdk-core (js-sdk)

**Repo:** `TinyCloudLabs/js-sdk`
**Files:** `packages/sdk-core/src/manifest.ts` (new), `packages/sdk-core/src/capabilities.ts` (new), `packages/sdk-core/src/delegations/*`

1. Add `Manifest`, `PermissionEntry`, `ManifestDelegation`, `ResolvedCapabilities`, `ResolvedDelegate` types
2. Add `loadManifest(path)` — fetches + validates a manifest file (optional helper)
3. Add `resolveManifest(manifest)` — pure function, expands manifest into `ResolvedCapabilities`
4. Add `parseExpiry(duration)` — wraps the `ms` library with fallbacks
5. Add `isCapabilitySubset()` — subset checker
6. Add `parseRecapCapabilities()` — parse SIWE resources back to structured list
7. Add `expandActionShortNames()` helper
8. Add `PermissionNotInManifestError` type
9. Add `ms` as a dependency of `@tinycloud/sdk-core`
10. Update `@tinycloud/sdk-core` exports
11. Unit tests

### Phase 3 — node-sdk + web-sdk

**Repo:** `TinyCloudLabs/js-sdk`
**Files:** `packages/node-sdk/src/authorization/NodeUserAuthorization.ts`, `packages/node-sdk/src/TinyCloudNode.ts`, `packages/web-sdk/src/modules/tcw.ts`

1. Extend `NodeUserAuthorization` constructor to accept `resolvedCapabilities`
2. Update `signIn()` to forward `resources` + `additionalDelegates` to `prepareSession`
3. Add `TinyCloudNode.delegateTo(did, permissions)` — uses new WASM exports
4. Add `TinyCloudNode.delegateToSessionKey()` private method
5. Add `TinyCloudNode.requestPermissions()` — escalation flow
6. Update `TinyCloudWeb` to surface `manifest` and `delegateTo` in its public API
7. Wire WASM rev in `Cargo.toml` to the new tinycloud-node commit
8. Unit tests + integration tests

### Phase 4 — Web SDK UI

**Files:** `packages/web-sdk/src/ui/PermissionRequestModal.ts` (new), `packages/web-sdk/src/ui/ModalManager.ts`

1. Create `PermissionRequestModal` Web Component (same style as `SpaceCreationModal`)
2. Extend `ModalManager` to show it
3. Wire to `tcw.requestPermissions()`
4. Storybook / visual tests

### Phase 5 — Backend SDK (`@tinyboilerplate/server`)

**Files:** `packages/server/src/auth.ts`

1. Add `verifySessionKeyDelegation()` — verifies UCAN-style session-key-signed delegations
2. Update `DelegationStore` to accept both wallet-signed SIWE delegations and session-key UCANs
3. Update delegation middleware to handle both

Note: there is NO `createManifestRouter` — the SDK does not prescribe how backends advertise their permissions. That's a per-app concern.

### Phase 6 — Listen app migration

**Repo:** `TinyCloudLabs/listen`
**Files:** `public/manifest.json` (new), `examples/react-express/frontend/src/App.tsx`, `examples/react-express/backend/src/routes/server-info.ts`

1. Create `public/manifest.json`
2. Update `handleSignIn` to load manifest, compose backend delegation entry, use new `delegateTo`
3. Backend: extend `/api/server-info` to include `permissions` array
4. Backend: enable `acceptSessionKeyDelegations` on delegation middleware
5. Update e2e tests
6. Verify single wallet prompt on repeat sign-in

### Phase 7 — Release

1. Publish new `tinycloud-node` tag
2. Update js-sdk WASM rev, publish new `@tinycloud/*` packages
3. Update listen to new SDK version
4. Document in migration guide

---

## Acceptance Criteria

- [ ] Listen app sign-in triggers **exactly 1 wallet prompt** on repeat sign-in (2 on first-ever sign-in due to host space SIWE — separately addressable)
- [ ] Backend delegation via `tcw.delegateTo(did, permissions)` happens without any additional wallet prompt
- [ ] Manifest schema is validated; malformed manifests fail loudly with clear errors
- [ ] Manifest can be loaded from file (`loadManifest("/manifest.json")`) OR passed inline as a config object — both code paths work
- [ ] Duration strings (`"30d"`, `"2h"`, `"90m"`) parse correctly via the `ms` library
- [ ] Per-permission expiry overrides the top-level default
- [ ] Requesting a permission outside the session's recap throws `PermissionNotInManifestError` with the missing entries listed
- [ ] `tcw.requestPermissions(missing)` shows the escalation modal and triggers a fresh sign-in with expanded caps when approved
- [ ] Session-key-signed delegations verify end-to-end on the backend
- [ ] Existing apps without manifest continue to work unchanged (fallback to `defaultActions`)
- [ ] WASM rev is pinned; `bun install` + build succeed in listen
- [ ] `bun run test` passes across all affected packages
- [ ] Multi-space manifest example works (two `permissions` entries targeting different spaces)
- [ ] Specific-resource example works (`tinycloud.sql` permission with `path: "data.sqlite"`)

---

## Out of Scope (Follow-ups)

- Host SIWE compression (first-sign-in host space creation still requires a separate signature). Addressed separately in a future spec.
- Manifest signing / trust model (external manifests are trusted because the app chose to compose them; the SDK does not verify them)
- Manifest diff UI (showing the user exactly what changed when an app version updates)
- Revocation of session-key UCANs (today they expire but can't be explicitly revoked)
- Cross-app manifest composition (apps importing manifests from shared modules)

---

## Open Questions

1. **Expiry inheritance.** If manifest top-level says 30d and a `delegations[i].expiry` says 7d, do we use 7d (delegate-specified) or the min of both? Propose: delegate-specified, capped at the session's remaining lifetime.

2. **Public-space path convention.** When `includePublicSpace: true`, what path is used on the public space? Propose: same as the first permission's path (e.g. `com.listen.app/`).

3. **Multi-delegate expiry skew.** If the manifest includes several `delegations` with different expiries, each target gets its own expiry in the recap. Confirm that ReCap supports per-target expiry or if we need a single expiry for the whole signature.

---

## References

- [EIP-4361 SIWE](https://eips.ethereum.org/EIPS/eip-4361)
- [ReCap spec (siwe-recap)](https://github.com/spruceid/siwe-recap)
- [UCAN spec](https://github.com/ucan-wg/spec)
- [WebExtension manifest.json](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json) (prior art for manifest format)
- Multi-prompt root-cause analysis: see `project_web-sdk_signin_multi_prompts.md` memory
- `TinyCloudLabs/js-sdk` PRs #171, #172, #179 (SIWE nonce passthrough fixes leading into this work)
