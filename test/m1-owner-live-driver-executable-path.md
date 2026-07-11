# M1-F-02 owner live driver executable-path trace

Pinned inputs: Listen `3c34a3e00ac2f9fb3b5ac21485063149719a9eb7`; js-sdk
`5a42dd6` (`smithers/data-exchange/m1-direct/m1-integration`). Claims below
are **confirmed from code** unless explicitly assigned to the live gate.

## Process and dependency order

1. Install the freshly packed sdk-core and node-sdk `2.6.0` artifacts from
   js-sdk `5a42dd6`. The driver imports the production package exports; no SDK
   logic is copied into Listen.
2. `publish --state <path>` reads public share input and a headless Ethereum
   private key from the process environment only. It constructs
   `TinyCloudNode({ privateKey, host, prefix })`, whose constructor selects the
   non-interactive `PrivateKeySigner`, then calls `signIn()`.
3. `signIn()` creates the authenticated primary session and runs
   `bootstrapAccountIfNeeded()` -> `bootstrapSteps(address, chainId)` before
   the driver uses KV or delegation. The account bootstrap may report a
   provisioning failure without rejecting sign-in, so the driver requires a
   usable session/space and lets subsequent authenticated writes/import fail
   closed. The node process must already be reachable; no Listen process
   starts it.
4. The driver composes the share, publishes all four signed objects, creates
   and imports the bounded parent delegation, verifies its receipt, and only
   then atomically replaces the state file. The live interval begins after
   this process exits successfully.
5. `revoke --state <path>` starts a new process with the same externally
   provisioned owner key, creates and signs in a fresh `TinyCloudNode`, checks
   the public owner/session/space identity against state, loads the persisted
   `PublishedListenOwnerShare`, and writes only the sequence-2 revoked status.

## Required hops and observations

| Required behavior | Production path / runtime dependency | Acceptance observation |
| --- | --- | --- |
| Headless owner account | `@tinycloud/node-sdk` `TinyCloudNode` constructor, `PrivateKeySigner`, and `signIn()` (`packages/node-sdk/src/TinyCloudNode.ts:672-730,981-1010` at `5a42dd6`) | Unit tests inspect state/artifacts for secret-shaped fields; the live gate observes successful bootstrap/session creation with an ephemeral or secret-provisioned key. |
| Standard account bootstrap | `signIn()` -> `bootstrapAccountIfNeeded()` -> sdk-core `bootstrapSteps(address, chainId)` (`TinyCloudNode.ts:1020-1100`; `tests/node-sdk/setup.ts:9,28-30`) | Live node behavior only: gate observes authenticated session and fresh owner space. No unit test claims network behavior. |
| Four owner writes | `composeListenOwnerShareDraft` -> `publishListenOwnerShare`; its `writerFromTinyCloud` requires authenticated `kv.put` and writes policy, engine record, sequence-1 status, then bootstrap (`frontend/src/lib/listenOwnerShares.ts:349-355,514-563,899-932`) | Dry-run unit test observes the exact four-path write set and deterministic signed-object artifact; live gate observes node state during the publish/revoke interval. |
| Owner-node bootstrap routing | sdk-core `composeTranscriptShareBootstrap({ ownerNodeEndpoint, ownerSpaceId, ... })` returns validated `ownerNode.endpoint` and `ownerNode.spaceId` (`packages/sdk-core/src/policy/authoring.ts:244-274` at `5a42dd6`) | Existing/new authoring tests observe the additive bootstrap shape; live state file exposes the same public endpoint/space identifiers. |
| Bounded owner parent | `TinyCloudNode.createOwnerDelegation({ delegateDid, spaceId, path, actions, expiresAt })` prepares an owner-signed SIWE/CACAO root delegation, sets `allowSubDelegation: true`, calls the production `/delegate` activation path, and returns exact signed DAG-CBOR plus both CIDs and raw activation fields (`TinyCloudNode.ts:2654-2710` at `5a42dd6`) | Driver fails unless HTTP activation succeeded, target space is in `activated`, and target space is absent from `skipped`. State records signed bytes, locally derived delegation CID, and raw receipt with response CID labelled only `commitEventCid`. Unit tests assert shape/labels, not persistence. |
| Parent CID identity | Production receipt exposes `signedDagCbor` and `delegationCid`, where the latter is locally derived by the node WASM formula rather than copied from `/delegate` (`TinyCloudNode.ts:203-214,2694-2708` at `5a42dd6`; node `authorization.rs:44-58`, `hash.rs:9-38` per frozen contract) | Driver records exact bytes and checks the receipt delegation CID against the delegation object CID. **Decisive persistence is gate-owned:** engine child has exactly one `prf`, equal to this CID, and imports successfully. `/delegate` `commitEventCid` is never compared to it. |
| Delegatee identity | The signed delegation returned by `createOwnerDelegation` carries `delegateDID: params.delegateDid` (`TinyCloudNode.ts:2687-2698`) | Driver checks it equals configured grant-issuer did:key. **Persistence evidence is gate-owned:** runner pre/post DB snapshots, verifier-derived comparison. |
| Split revoke | State parser reconstructs only the public `PublishedListenOwnerShare`; `revokeListenOwnerShare` signs/writes fixed sequence 2 (`frontend/src/lib/listenOwnerShares.ts:934-963`) through the newly authenticated node session | Unit test observes one status write and state round-trip; live gate observes active state before the separate revoke invocation and revoked state after it. |
| Deterministic dry run | Test-only in-process writer and fixed date/signature fixture; it never sends a request | Unit tests compare canonical publish and revoke artifacts across runs. Dry-run evidence is conformance only. |

## Unsupported-hop audit / stop-rule result

No required hop is unsupported at the pinned inputs. No live hop requires a
mock, direct node/DB state mutation, canned evidence, or artifact existence as
a substitute for behavior. The downstream singleton-child-`prf` import and DB
delegatee snapshot are deliberately not claimed by this driver; they remain
live-gate observations as required by amendment 35.
