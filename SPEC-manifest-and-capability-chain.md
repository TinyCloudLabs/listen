# SPEC: App Manifest v1 + Capability Chain Delegation

**Status:** Draft implementation
**Target repos:** `tinycloud-node`, `js-sdk`, consuming apps

## Motivation

TinyCloud apps need a stable, inspectable description of the data they use and the capabilities they request. That description should be useful to users, wallets, and agents. It should also let apps sign one complete capability request and then derive downstream delegations without another wallet prompt.

The manifest is not backend configuration. It is the app/data contract:

- What app is this?
- What TinyCloud spaces, services, paths, and actions does it need?
- Why are those permissions useful?
- Which manifests can become delegation targets because they include a DID?

Fetching manifests and delivering generated delegations are explicitly out of band. Apps decide how manifests are discovered and how delegations are transported.

## Actors

- Alice: the user and wallet root of trust.
- Bob: the app session key created during sign-in.
- Charlie: any downstream delegate, such as a backend, agent, worker, or peer.

The desired flow is:

```text
App gathers one or more manifests out of band
SDK composes manifests into one capability request
Alice signs one SIWE/ReCap request for the full union
Bob receives the session grant
App asks SDK to materialize delegations for manifests that declared did
Bob signs UCAN delegations for those targets without another wallet prompt
App delivers those delegations out of band
```

## Manifest v1

`manifest_version` is optional. Missing means version `1`.

```jsonc
{
  "manifest_version": 1,
  "app_id": "xyz.tinycloud.listen",
  "name": "Listen",
  "description": "Sync meeting transcripts into TinyCloud.",
  "icon": "/icon.png",
  "appVersion": "0.1.0",

  // Optional. If present, this manifest can become a delegation target.
  "did": "did:pkh:eip155:1:0x...",

  // Optional. Missing means "applications".
  "space": "applications",

  // Optional. Missing means app_id.
  "prefix": "xyz.tinycloud.listen",

  // Optional. Missing means true.
  "defaults": true,

  // Optional. Missing means "30d".
  "expiry": "30d",

  "permissions": [
    {
      "service": "tinycloud.hooks",
      "path": "sql/xyz.tinycloud.listen/conversations/conversation",
      "actions": ["subscribe"],
      "skipPrefix": true,
      "description": "Subscribe to conversation row write events for live updates."
    }
  ],

  // Optional. Missing means true.
  "includePublicSpace": true
}
```

### Fields

| Field | Required | Semantics |
|---|---:|---|
| `manifest_version` | no | Schema version. Missing means `1`. |
| `app_id` | yes | Stable app namespace and default path prefix. |
| `name` | yes | Human-readable app or delegate name. |
| `description` | no | User/agent-readable description of what the app does and what its data means. |
| `did` | no | Delegate DID. If absent, permissions can still be requested but no automatic delegation target is created. |
| `space` | no | Default TinyCloud space for this manifest. Missing means `applications`. |
| `prefix` | no | Default path prefix. Missing means `app_id`; `""` disables prefixing. |
| `defaults` | no | Built-in app-scoped tier. Missing means `true`; `false` requests only explicit permissions. |
| `expiry` | no | Manifest default permission expiry. Missing means `30d`. |
| `permissions` | no | Explicit permissions beyond the defaults. |
| `includePublicSpace` | no | Existing public-space companion behavior. Missing means `true`. |

There is no `backend` section and no `delegations[]` section in v1. Downstream participants are represented by their own manifests.

### Permission Entries

```ts
interface PermissionEntry {
  service: string;
  space?: string;
  path: string;
  actions: string[];
  expiry?: string;
  description?: string;
  skipPrefix?: boolean;
}
```

`space` is optional. Missing means the manifest's default space, which itself defaults to `applications`.

Paths are app-relative by default. The SDK prefixes each path with `prefix` or `app_id`. `skipPrefix: true` means the path is already absolute in the service's namespace and should not be prefixed.

Actions can be short names like `get`, `put`, `read`, and `write`; the SDK expands them to full TinyCloud action URNs.

Descriptions are optional context for permission UIs and agents. The top-level description explains the app in general. A permission description explains why that specific capability exists.

## Spaces

The manifest default space is `applications`. This means app data is scoped under:

```text
tinycloud://<wallet>/<chain>/applications
```

The account-space app registry uses:

```text
space: account
kv path: applications/
record key: applications/{app_id}
```

The SDK manifest composer includes the account registry KV grant by default:

- `tinycloud.kv/get`
- `tinycloud.kv/put`
- `tinycloud.kv/list`

This default is controlled by `includeAccountRegistryPermissions`, which defaults to `true`. On successful sign-in, SDK code writes the composed manifest registry record into the account space. The account space is created/hosted if needed.

## Composition

Apps pass already-loaded manifests into the SDK:

```ts
const request = composeManifestRequest([appManifest, backendManifest], {
  includeAccountRegistryPermissions: true,
});
```

Composition rules:

- Validate all manifests as v1.
- Expand defaults and explicit permissions.
- Apply path prefixes.
- Default missing spaces to `applications`.
- Merge and dedupe equivalent permissions.
- Preserve different `app_id` values as distinct app prefixes.
- Create delegation targets only for manifests with `did`.
- Add account registry permissions and records unless disabled.
- Return one `ComposedManifestRequest` for one sign-in prompt.

The abstract shape is:

```text
f(manifests[]) -> capability request
f(capability request, signer) -> session grant
f(session grant, delegation targets[]) -> subdelegations[]
```

No network fetching belongs in this function. No delegation delivery belongs in this function.

## SDK Surface

Core helpers:

```ts
loadManifest(url, fetchFn?)
validateManifest(input)
resolveManifest(manifest)
composeManifestRequest(manifests, options?)
resourceCapabilitiesToSpaceAbilitiesMap(resources)
isCapabilitySubset(requested, granted)
```

Node/web SDK config:

```ts
new TinyCloudWeb({
  manifest: appManifestOrManifests,
  capabilityRequest,
  includeAccountRegistryPermissions: true,
});
```

`capabilityRequest` takes precedence over `manifest`. If only `manifest` is provided, the SDK composes it with `includeAccountRegistryPermissions` defaulting to `true`.

Delegation materialization:

```ts
const result = await tcw.materializeDelegation(delegateDid, request);
const all = await tcw.materializeDelegations(request);
```

These helpers only create delegations that were declared by manifests with `did`. Transport is app-specific: POST to a backend, hand to an agent, QR code, local channel, etc.

## Listen Implementation

Listen has one app manifest at:

```text
./manifest.json
```

The browser imports the local app manifest and optionally fetches an app-defined
`/api/server-info` response with the backend DID and backend-specific
permissions. If the backend is reachable, the frontend converts that response
into a backend delegate manifest with the same `app_id`, composes it with the
app manifest, signs one request, and materializes the backend delegation:

```ts
const appManifest = LISTEN_APP_MANIFEST;
const info = await fetchServerInfo().catch(() => null);
const request = composeManifestWithDelegatees(
  appManifest,
  info ? [info] : [],
  {
    ownerDid,
    ...(info ? { decryptDelegateDid: info.did } : {}),
  },
);

const { tcw, session } = await createAndSignIn(provider, {
  ...(nonce ? { nonce } : {}),
  capabilityRequest: request,
});

if (info && token) {
  const { serialized } = await createManifestDelegation(tcw, info.did, request);
  await sendDelegation(BACKEND_URL, serialized, token);
}
```

Listen's backend delegate manifest also adds the user's default encryption
network grant as a separate `tinycloud.encryption/decrypt` permission on
`urn:tinycloud:encryption:<ownerDid>:default`. That grant stays distinct from
the backend's KV and SQL reads. Secret names are env-style uppercase identifiers
such as `FIREFLIES_API_KEY`, so the app's secret permissions stay explicit.

This composition depends on an SDK release that already supports
`tinycloud.encryption` manifest entries; older releases cannot materialize the
default-network decrypt grant.

The backend policy remains app logic. The SDK owns manifest validation, permission composition, one signed capability request, account registry grants, and materialized subdelegations.
