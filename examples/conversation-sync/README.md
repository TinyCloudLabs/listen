# Conversation Sync

Sync meeting transcripts from Fireflies.ai into your TinyCloud space. Server-orchestrated sync: user clicks Sync, backend reads their Fireflies API key from KV, fetches transcripts, normalizes, and writes to SQL + KV. All data sovereign.

**What this demonstrates:**
- OAuth PKCE sign-in via OpenKey (popup mode)
- TinyCloud session creation + space auto-provisioning
- Scoped delegation from user to backend
- JWT-authenticated API with delegation-based authorization
- Server-side sync with external API (Fireflies)
- SQL + KV hybrid storage in user's TinyCloud space

## Prerequisites

- [Bun](https://bun.sh) v1.0+
- An [OpenKey](https://openkey.so) account with a registered OAuth client
- The OAuth client must have `http://localhost:5173` as an allowed redirect URI
- A [Fireflies.ai](https://fireflies.ai) account with API key (entered in-app)

## Setup

```bash
# 1. Install dependencies (from repo root)
cd ../..
bun install

# 2. Build packages
bun run build

# 3. Generate a backend private key
bun run generate-key
# Copy the output key

# 4. Create your .env file
cp .env.example .env
```

Edit `.env`:

```bash
# Required — paste the generated key
BACKEND_PRIVATE_KEY=0x...

# Required — your OpenKey OAuth client ID
VITE_OPENKEY_CLIENT_ID=your-client-id

# Required for the Agents tab — backend only
ANTHROPIC_API_KEY=sk-ant-...

# Optional — defaults work for local dev
TINYCLOUD_HOST=https://node.tinycloud.xyz
OPENKEY_ISSUER_URL=https://openkey.so
FRONTEND_URL=http://localhost:5173
PORT=3001
VITE_OPENKEY_HOST=https://openkey.so
VITE_TINYCLOUD_HOST=https://node.tinycloud.xyz
VITE_BACKEND_URL=http://localhost:3001
```

Notes:
- The Fireflies API key is per-user, stored in TinyCloud KV (not an env var).
- `ANTHROPIC_API_KEY` (or `CLAUDE_API_KEY`) is only required if you open the Agents tab. The agent runner will throw a loud error on the first message if it's unset.

## Running

```bash
# From this directory (examples/conversation-sync)
bun run dev

# Or run separately
bun run dev:frontend   # Just the frontend (http://localhost:5173)
bun run dev:backend    # Just the backend (http://localhost:3001)
```

## API Reference

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/server-info` | Returns `{ did, status }` for the backend |

### Authenticated (JWT required)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/delegations` | Store a delegation. Body: `{ serialized: string }` |
| GET | `/api/delegations/status` | Check delegation status for current user |
| DELETE | `/api/delegations` | Revoke delegation for current user |

**Error responses** follow `{ error: string, message: string }`.

## Agents

The **Agents** tab runs Claude-powered assistants that can read and write your TinyCloud SQL store on your behalf. Each agent has its own chat history and can call two tools against the user's space:

- `sql_query` — read-only `SELECT` / `WITH` queries
- `sql_execute` — `INSERT` / `UPDATE` / `DELETE` / `CREATE` / `DROP`

Each agent gets its own **ephemeral identity** (a fresh `did:key`) via a 3-step delegation handshake, so every SQL call is attributable to that agent's session — not to the user directly. See [`AGENT-KEYS.md`](./AGENT-KEYS.md) for the full design.

### Environment

| Variable | Required? | Description |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Yes (for Agents) | Backend-only. Used by the Claude Agent SDK runner. Also accepts `CLAUDE_API_KEY`. |

If unset, the first message send will fail with a loud error: `ANTHROPIC_API_KEY (or CLAUDE_API_KEY) is required to run agents.`

### Delegation handshake

On the first message send in each session, `AgentChat.tsx` runs a 3-step handshake:

1. **`POST /api/agents/:id/session`** — backend creates a session-only `TinyCloudNode` with a fresh Ed25519 keypair. Returns `{ agentDID: "did:key:z6Mk…", expiresAt }`.
2. **`tcw.createDelegation(...)`** — frontend asks the user's wallet to sign a 1-hour delegation scoped to `["tinycloud.sql/read", "tinycloud.sql/write"]` targeting the `agentDID`.
3. **`POST /api/agents/:id/delegation { serialized }`** — backend deserializes the delegation, calls `agentNode.useDelegation()`, and caches the resulting `DelegatedAccess` in memory.

After step 3, `POST /api/agents/:id/messages` uses the agent's own `DelegatedAccess` for all SQL tool calls. If the session expires or is missing (409 from the messages endpoint), the frontend re-runs the handshake once and retries. If the retry also 409s, the error is surfaced — no silent loop.

The handshake is **lazy**: it runs on first send, not on view mount. Navigating away and back resets the component-scoped state; the next send re-handshakes.

**Session restore limitation:** the handshake requires `tcw` (the `TinyCloudWeb` instance with wallet access). On session restore (browser refresh), `tcw` is null. The user must do a fresh sign-in to use Agents. The chat view shows a clear error if `tcw` is unavailable.

### End-to-end smoke test

Manual walkthrough to verify the Agents feature is wired end-to-end. Assumes at least one synced conversation exists (sync a Fireflies or Google Meet transcript first).

1. **Sign in** — click Sign In, approve the wallet connection in OpenKey, and grant the delegation when prompted. Must be a fresh sign-in, not a session restore.
2. **Open the Agents tab** — the tab nav above the main content. The tab is visible immediately after sign-in; you don't need Fireflies or Google Meet set up to use Agents.
3. **Create an agent** — in the "Active" lane, type `inventory-helper` into the "New agent name" input and click **Create**. A new card appears in the Active lane.
4. **Open the chat** — click the card. You land in `AgentChat` with an empty message list. The session indicator reads "Not yet active — starts on first message".
5. **Read test (`sql_query`)** — type:
   > How many conversations have I synced, and what are the titles of the three most recent ones?

   The wallet prompts you to sign the agent delegation (one-time per session). The session indicator switches to "Ephemeral agent session — renews at HH:MM". The agent calls `sql_query` against the `conversation` table and answers. You'll see a "Thinking…" indicator while it runs. Watch the backend logs for `[agents] activated agent delegation: agentId=… agentDID=did:key:z6Mk…` — a new ephemeral DID appears each session.
6. **Write test (`sql_execute`)** — type:
   > Create a new table called `agent_notes` with columns `id TEXT PRIMARY KEY`, `text TEXT`, `created_at TEXT`. Then insert one row with text "e2e smoke test".

   The agent should call `sql_execute` twice (one `CREATE TABLE IF NOT EXISTS`, one `INSERT`) and confirm both succeeded. Verify by asking:
   > Read everything from agent_notes.

   It should `sql_query` the table and return the row you just inserted. No wallet prompt this time — the session is already active.
7. **Back out and archive** — click **← Back** to return to the kanban. Hover the `inventory-helper` card and click **Archive**. The card moves to the Archive lane. Clicking **Unarchive** restores it to Active.

### Known limitations

- **In-memory session store.** Agent sessions (`backend/src/services/agent-sessions.ts`) live in a JS `Map`. Restarting the backend invalidates all sessions — the frontend will 409 on the next message and re-handshake automatically.
- **Delegation path is `""` (empty).** The agent's delegation is not yet namespaced to an `agent/` sub-path. Every agent can read and write the user's entire SQL space. Narrowing this requires a schema change to namespace agent tables.
- **No streaming.** The chat view is request/response. The assistant's reply arrives as a single JSON blob and is rendered once; there's no token-by-token streaming.
- **Lanes are derived, not stored.** Active / Stale / Archive lanes are computed from `last_message_at` (<24h / 24h–7d / >7d) plus the `archived` flag. The backend returns the classification on list; the frontend re-derives it locally after toggling archive.
- **`last_message_preview` is not yet populated.** Cards show "No messages yet" instead of a snippet. Wiring this end-to-end requires either a `SELECT ... JOIN ... ORDER BY created_at DESC LIMIT 1` on the list endpoint or a denormalized column — neither is in the MVP.
