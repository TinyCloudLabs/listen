# Agent Keys & Delegation Design

Status: **Implemented.** Every agent chat runs under its own ephemeral
`did:key` identity. The user signs a short-lived `PortableDelegation`
targeting that DID; the backend activates it and uses the resulting
`DelegatedAccess` for every SQL call the agent makes. There is no
fallback to the user's own delegation — if the handshake hasn't
happened, `/messages` returns `409`.

## Goal

When a user chats with an agent, every SQL call the agent makes against
the user's TinyCloud space should be attributable to the agent itself —
not to the user. Concretely:

- Each agent chat session has its own short-lived identity (DID +
  keypair), scoped to a narrow delegation (~1h, `tinycloud.sql/read` +
  `tinycloud.sql/write`).
- TinyCloud's UCAN chain shows "agent `did:key:z6Mk…` acting under
  delegation from user `did:pkh:…`" rather than the user directly.
- Revoking an agent's access is a one-step operation that doesn't
  affect the user's other delegations (backend webhook access, etc.).
  Just drop the session entry — the ephemeral keypair vanishes with it.

## Architecture

```
┌──────────┐  1. POST /api/agents/:id/session     ┌──────────┐
│ Frontend │ ────────────────────────────────────▶│  Backend │
│          │                                      │          │
│          │  2. { agentDID: "did:key:z6Mk…",     │ new Tiny │
│          │      expiresAt: "…" }                │ CloudNode│
│          │ ◀────────────────────────────────────│ (session │
│          │                                      │  only)   │
│          │                                      │          │
│   user   │  3. tcw.createDelegation({           │ stashes  │
│   signs  │       delegateDID: agentDID,         │ handle   │
│          │       path: "",                      │ in map   │
│          │       actions: [sql/read, sql/write] │ keyed by │
│          │       expiryMs: 3_600_000,           │ (user,   │
│          │     })                               │  agent)  │
│          │                                      │          │
│          │  4. POST /api/agents/:id/delegation  │          │
│          │     { serialized }                   │          │
│          │ ────────────────────────────────────▶│ 5. agent │
│          │                                      │ Node     │
│          │                                      │ .useDel- │
│          │                                      │ egation()│
│          │                                      │ → cached │
│          │                                      │ access   │
│          │                                      │          │
│          │  6. POST /api/agents/:id/messages    │          │
│          │     { content }                      │ 7. agent │
│          │ ────────────────────────────────────▶│ runner   │
│          │                                      │ uses     │
│          │                                      │ session  │
│          │                                      │ access   │
│          │                                      │ for SQL  │
└──────────┘                                      └──────────┘
```

Key property: **the agent's private key lives on the backend, never
the frontend.** The user's wallet signs a delegation to the agent's
DID, but the backend is the only party that can exercise it. This
mirrors every other delegation in the project (backend's long-lived
`BACKEND_PRIVATE_KEY` → user delegates via `/api/delegations`), except
the agent keypair is fresh and short-lived instead of long-lived.

## Why the frontend does NOT generate the keypair

An earlier sketch had the frontend generating an Ed25519 keypair in
the browser and shipping both the DID _and the private key_ to the
backend. This is strictly worse than the backend-side approach:

- The private key would cross the wire (over TLS, but still —
  needlessly).
- The frontend can't use the key for anything useful, since the
  backend is the one running the agent loop and making SQL calls.
- It splits key custody across two machines without gaining anything.

The right place to generate the keypair is inside the backend's
`TinyCloudNode` session manager, where it already knows how to sign
UCAN invocations.

## SDK primitives used

Both halves of the flow use primitives that already ship in the
published SDKs — no upstream changes required.

### Backend: session-only `TinyCloudNode`

`new TinyCloudNode()` with **no config** returns a session-only node
that generates a fresh Ed25519 keypair inside WASM and exposes
`node.did` as `did:key:z6Mk…` immediately. From the published type
declarations (`@tinycloud/node-sdk` → `core.d.ts`):

```ts
// Session-only mode - can receive delegations
const bob = new TinyCloudNode();
console.log(bob.did); // did:key:z6Mk... - available immediately
```

`useDelegation()` explicitly supports session-only mode, with the
constraint that the delegation's `delegateDID` must match the node's
session key DID — which is exactly what we want:

> Session-only mode: Uses the delegation directly (must target session
> key DID)

### Frontend: `tcw.createDelegation` with arbitrary `delegateDID`

`@tinycloud/web-sdk` v2.1.0-beta.0 exposes `tcw.createDelegation` on
the `TinyCloudWeb` instance with a `delegateDID` parameter that
accepts any DID string — including a fresh `did:key:z6Mk…` from a
session-only `TinyCloudNode` on the backend.

## Implementation

### `backend/src/services/agent-sessions.ts`

In-memory session store keyed by `(userAddress, agentId)`. Each entry
owns an `AgentNodeHandle` — a thin interface over a fresh
`TinyCloudNode` — and holds the activated `DelegatedAccess` once the
delegation is in place. Entries expire after 1h; a background sweeper
runs every 5 minutes to evict expired entries.

```ts
export class AgentSessionStore {
  openSession(userAddress, agentId): Promise<AgentSessionEntry>;
  activateDelegation(userAddress, agentId, serialized): Promise<AgentSessionEntry>;
  requireAccess(userAddress, agentId): DelegatedAccess; // throws AgentSessionError
  evict(userAddress, agentId): void;
  peek(userAddress, agentId): AgentSessionEntry | null;
}
```

The store takes an optional `createAgentNode` factory in its
constructor. Production uses the default, which dynamic-imports
`@tinycloud/node-sdk` and wraps `new TinyCloudNode()`. Tests inject a
stub factory that returns fake handles so the router can be exercised
without loading the real WASM runtime.

### `backend/src/routes/agents.ts` — new endpoints

| Method | Path                       | Role                                                           |
| ------ | -------------------------- | -------------------------------------------------------------- |
| POST   | `/api/agents/:id/session`  | Mint a fresh agent keypair, return `{ agentDID, expiresAt }`   |
| POST   | `/api/agents/:id/delegation` | Activate a signed `PortableDelegation` on the current session |

The `POST /:id/messages` handler calls `sessionStore.requireAccess()`
**before** any write hits the user's space. If there is no session, or
the session has no activated delegation, or the session has expired,
the handler throws `AgentSessionError`, which the router translates to
HTTP `409` with one of these error codes:

- `no_agent_session` — no session exists for this (user, agent)
- `no_agent_delegation` — session exists but has no activated delegation
- `agent_session_expired` — session has expired

On `409` the frontend should re-run the handshake (open session → sign
new delegation → activate) before retrying the message. There is no
fallback to the user's own delegation.

`DELETE /:id` also evicts any ephemeral session for the deleted agent.

### `runAgentTurn` uses the session-scoped access

`POST /:id/messages` resolves `agentAccess` via
`sessionStore.requireAccess()` and passes it into `runAgentTurn()`,
which closes the two in-process MCP SQL tools (`sql_query`,
`sql_execute`) over it. Every SQL call the agent makes is signed by
the agent's session key and verified against the UCAN chain from user
→ agent DID. The user's main delegation (`req.delegatedAccess`) is
still used for bookkeeping writes on the `agent` and `agent_message`
tables — the user is still the one appending to their own conversation
history.

## Contract for the frontend

On agent-chat open:

1. `POST /api/agents/:id/session` → `{ agentDID, expiresAt }`
2. `tcw.createDelegation({ delegateDID: agentDID, path: "", actions: ["tinycloud.sql/read", "tinycloud.sql/write"], expiryMs: 3_600_000 })`
3. `POST /api/agents/:id/delegation` with body `{ serialized }`
4. `POST /api/agents/:id/messages` as normal

If any subsequent `POST /:id/messages` returns `409` with
`error: "no_agent_session" | "no_agent_delegation" | "agent_session_expired"`,
re-run steps 1–3 before retrying.

## Tests

`backend/src/__tests__/agents.test.ts` covers:

- `AgentSessionStore` unit tests — fresh-did-per-open, activation
  flow, expiry, evict.
- Session-handshake endpoint tests — happy path, 404 for unknown
  agent, 400 for missing body, 409 when activating without a session,
  fresh-DID-per-call.
- `/messages` 409 cases — no session, session without delegation.
- `/messages` happy path now opens a session and activates a stub
  delegation before sending the message.

Stub `AgentNodeHandle` (in `createStubSessionStore`) mints
`did:key:z6Mktest-<n>` DIDs so tests don't need the real WASM runtime.

## Open items

- **Narrow the delegation path.** Today the frontend is expected to
  delegate `path: ""` — effectively the user's whole SQL scope.
  Restricting to an `agent/` sub-path is a follow-up that requires
  namespacing the agent tables.
- **Audit logging.** `POST /:id/delegation` currently `console.log`s
  the activation with the agent DID and expiry; a structured audit
  record would be better once there's somewhere to put it.
- **Session persistence.** The session store is in-memory, so a
  backend restart invalidates all open agent sessions and forces the
  frontend to re-handshake. That's an acceptable tradeoff for the MVP;
  persistence would only become interesting once we care about
  surviving backend restarts without user action.
