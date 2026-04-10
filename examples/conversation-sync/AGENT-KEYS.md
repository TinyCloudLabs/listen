# Agent Keys & Delegation Design

Status: **MVP uses the user's own delegation. Ephemeral-keypair path is designed, buildable against today's SDKs, and deferred for scope — not blocked on upstream.**

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

## SDK surface (both halves buildable today)

Both primitives we need are already in the published SDKs:

1. **Backend-side fresh keypair + DID** — `new TinyCloudNode()` with **no
   config** returns a session-only node that generates a fresh Ed25519
   keypair inside WASM and exposes `node.did` as `did:key:z6Mk…`
   immediately. `@tinycloud/node-sdk/core.d.ts` documents this explicitly:

   ```ts
   // Session-only mode - can receive delegations
   const bob = new TinyCloudNode();
   console.log(bob.did); // did:key:z6Mk... - available immediately
   ```

   `useDelegation()` also explicitly supports session-only mode, with the
   constraint that the delegation must target the node's session key DID:
   _"Session-only mode: Uses the delegation directly (must target session
   key DID)"_. That's exactly our flow.

2. **Frontend-side `createDelegation` for an arbitrary non-self DID** —
   `@tinycloud/web-sdk` v2.1.0-beta.0 exposes this on the `TinyCloudWeb`
   instance: `tcw.createDelegation({ delegateDID, path, actions, expiryMs })`.
   The `delegateDID` parameter accepts any DID string — including a fresh
   `did:key:z6Mk…` from a session-only `TinyCloudNode` on the backend.

So the ephemeral-keypair flow is buildable against today's published SDKs
with zero upstream changes. The implementation is:

```ts
// backend/src/services/agent-sessions.ts
const agentNode = new TinyCloudNode(); // fresh keypair, fresh did:key
sessions.set(sessionKey, { node: agentNode, did: agentNode.did, ... });

// POST /api/agents/:id/session → { agentDID: agentNode.did }
// POST /api/agents/:id/delegation body { serialized }
const delegation = deserializeDelegation(serialized);
const agentAccess = await agentNode.useDelegation(delegation);
// → DelegatedAccess whose SQL invocations are signed by the agent's
//   session key and verified against the UCAN chain from user → agent DID.
```

## MVP: reuse the user's delegation

For the MVP the agent runs under **the user's own `DelegatedAccess`** — the
same one that `delegationMiddleware` already produces for every authenticated
request. This means:

- Every SQL call the agent makes looks (to TinyCloud) identical to a SQL
  call the user made directly.
- The agent's scope is the user's entire SQL scope. There is no extra
  confinement to agent-related tables specifically.
- Revoking agent access = revoking the user's entire delegation. The two
  are indistinguishable until the ephemeral-keypair flow is implemented.

This is explicitly documented here as a **short-term tradeoff** and the
backend is already wired to accept and activate an `X-Agent-Delegation`
header the moment the frontend can produce one:

- `backend/src/routes/agents.ts → resolveAgentAccess()` reads
  `X-Agent-Delegation`, deserializes, calls `node.useDelegation()`, and
  returns the resulting `DelegatedAccess` for the agent runner to use.
- If the header is absent, it falls back to `req.delegatedAccess` — the
  user's own delegation.

No frontend code change is required for the MVP. When we implement the
real flow, the plan is:

1. Backend: new `backend/src/services/agent-sessions.ts` — in-memory map
   `(userAddress, agentId) → { agentNode: TinyCloudNode, access?: DelegatedAccess, expiresAt }`
   with a 1h TTL and periodic sweeper.
2. Backend: `POST /api/agents/:id/session` — `new TinyCloudNode()`, stash,
   return `{ agentDID, expiresAt }`.
3. Backend: `POST /api/agents/:id/delegation` — body `{ serialized }`,
   `deserializeDelegation()` → `agentNode.useDelegation()` → cache
   `DelegatedAccess` on the session record.
4. Backend: `POST /api/agents/:id/messages` — swap `resolveAgentAccess`
   for `getAgentAccess(userAddress, id)`. Throw loudly if no active
   session (no silent fallback to user delegation — per project rule).
5. Frontend: on agent open, POST `/session` → `tcw.createDelegation({
delegateDID: agentDID, path, actions, expiryMs: 3_600_000 })` → POST
   `/delegation` with serialized blob. Cache session + refresh before expiry.

Note: the existing `resolveAgentAccess` helper in
`backend/src/routes/agents.ts` is the _wrong_ shape for this flow — it
calls `useDelegation` on the main backend node, which would reject a
delegation whose `delegateDID` is not the main node's session key. That
helper needs to be replaced (not extended) when implementing the real
flow.

## TODO (when we implement the real flow)

- [ ] Remove `resolveAgentAccess` and its `X-Agent-Delegation` header code
      path from `routes/agents.ts` — replaced by the session-based model.
- [ ] Implement `agent-sessions.ts` + the two new endpoints.
- [ ] Frontend delegation activation in `AgentChat.tsx` (task 3 follow-up).
- [ ] Audit-log every `useDelegation` activation with the agent DID and
      session ID (currently just `console.log`).
- [ ] Narrow the delegation path from the user's full space to an
      `agent/` sub-path (requires schema change to namespace agent tables).
