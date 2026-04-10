# Agent Keys & Delegation Design

Status: **MVP uses the user's own delegation. Ephemeral-keypair path is designed but not implemented.**

## Goal

When a user chats with an agent, every SQL call the agent makes against the
user's TinyCloud space should be attributable to the agent itself — not to the
user. Concretely:

- Each agent chat session should have its own short-lived identity
  (DID + keypair), scoped to a narrow delegation (~1h, `tinycloud.sql/read` +
  `tinycloud.sql/write`, path-limited to agent-relevant tables).
- Audit logs and TinyCloud's UCAN chain should show "agent did:key:z6Mk…
  acting under delegation from user did:pkh:…" rather than the user directly.
- Revoking an agent's access should be a one-step operation that doesn't
  affect the user's other delegations (backend webhook access, etc.).

## Intended Architecture

```
┌──────────┐   1. POST /api/agents/:id/session    ┌─────────┐
│ Frontend │ ────────────────────────────────────▶│ Backend │
│          │                                      │         │
│          │   2. { agentDID: "did:key:z6Mk…" }   │ generates│
│          │ ◀────────────────────────────────────│ keypair │
│          │                                      │ in WASM │
│          │                                      │         │
│   user   │   3. tcw.createDelegation({          │ stashes │
│   signs  │        delegateDID: agentDID,        │ privkey │
│          │        path: "agent-…",              │ keyed by│
│          │        actions: [sql/read, sql/write]│ sessionID│
│          │        expiryMs: 3_600_000,          │         │
│          │      })                              │         │
│          │                                      │         │
│          │   4. POST /api/agents/:id/messages    │         │
│          │      X-Agent-Delegation: <serialized>│         │
│          │ ────────────────────────────────────▶│         │
│          │                                      │ 5. node │
│          │                                      │  .useDelegation(d)│
│          │                                      │ → access│
│          │                                      │   bound │
│          │                                      │   to    │
│          │                                      │   agent │
│          │                                      │   DID   │
└──────────┘                                      └─────────┘
```

Key property: **the agent's private key lives on the backend, never the
frontend.** The user's wallet signs a delegation to the agent's DID, but the
backend is the only party that can actually exercise it. This mirrors how
every other delegation in the project already works (backend's long-lived
`BACKEND_PRIVATE_KEY` → user delegates to `/api/delegations`).

## Why the frontend does NOT generate the keypair

An earlier sketch had the frontend generating an Ed25519 keypair in the
browser and shipping both the DID _and the private key_ to the backend. This
is worse than the status quo:

- The private key would cross the wire (over TLS, but still — needlessly).
- The frontend can't use the key for anything useful, since the backend is
  the one running the agent loop and making SQL calls.
- It splits key custody across two machines without gaining anything.

The right place to generate the keypair is inside the backend's
`TinyCloudNode` session manager, where it already knows how to sign UCAN
invocations.

## SDK gap blocking the MVP

For the intended architecture to work end-to-end, we need two primitives
that the currently-published SDKs do not clearly expose:

1. **Backend-side fresh session key creation**, returning a DID that can be
   named in a delegation. The sdk-core `ISessionManager` interface
   (`@tinycloud/sdk-core` v2.1.0-beta.0) has `createSessionKey(id): string`
   and `getDID(keyId): string`, but `@tinycloud/node-sdk`'s public
   `TinyCloudNode` surface does not re-export a way to reach these —
   `node.useDelegation(d)` assumes the session key that matches `d.delegateDID`
   is already registered with the node, without a public registration API.

2. **Frontend-side `createDelegation` for an arbitrary non-self DID** —
   `@tinycloud/web-sdk` v2.1.0-beta.0 _does_ expose this:
   `tcw.createDelegation({ delegateDID, path, actions, expiryMs })`. So the
   client half of the flow is already buildable; it's the server half that
   needs SDK work.

Until the node-sdk exposes something like
`node.createAgentSessionKey(id): Promise<{ did: string }>` followed by a
path for `useDelegation()` to pick up that specific key, there is no way to
land the full ephemeral-keypair flow without monkey-patching the WASM
module, which is out of scope for this example app.

## MVP: reuse the user's delegation

For the MVP the agent runs under **the user's own `DelegatedAccess`** — the
same one that `delegationMiddleware` already produces for every authenticated
request. This means:

- Every SQL call the agent makes looks (to TinyCloud) identical to a SQL
  call the user made directly.
- The agent's scope is the user's entire SQL scope. There is no extra
  confinement to agent-related tables specifically.
- Revoking agent access = revoking the user's entire delegation. The two are
  indistinguishable until the SDK gap above is closed.

This is explicitly documented here as a **short-term tradeoff** and the
backend is already wired to accept and activate an `X-Agent-Delegation`
header the moment the frontend can produce one:

- `backend/src/routes/agents.ts → resolveAgentAccess()` reads
  `X-Agent-Delegation`, deserializes, calls `node.useDelegation()`, and
  returns the resulting `DelegatedAccess` for the agent runner to use.
- If the header is absent, it falls back to `req.delegatedAccess` — the
  user's own delegation.

No frontend code change is required to start the MVP. When the SDK gap is
closed, the fix is:

1. Backend: add a `POST /api/agents/:id/session` route that creates a fresh
   session key on the node, stashes it in an in-memory session store keyed
   by `(userAddress, agentId)`, and returns the `agentDID`.
2. Frontend: on agent open, call that endpoint, then
   `tcw.createDelegation({ delegateDID: agentDID, path, actions, expiryMs: 3_600_000 })`,
   and cache the serialized delegation in sessionStorage under
   `agent-delegation:{agentId}`.
3. Frontend: include `X-Agent-Delegation: <serialized>` on every
   `/api/agents/:id/messages` POST.
4. Backend: `resolveAgentAccess` already does the right thing — nothing to
   change.

## TODO

- [ ] Upstream fix: surface `createSessionKey` / session key registration
      on `@tinycloud/node-sdk`'s public `TinyCloudNode` API.
- [ ] Once the above lands, implement the four-step flow described in the
      previous section and remove the fallback path in `resolveAgentAccess`.
- [ ] Audit-log every `useDelegation` activation with the agent DID and
      session ID (currently just `console.log`).
- [ ] Narrow the delegation path from the user's full space to an
      `agent/` sub-path (requires schema change to namespace agent tables).
