# Conversation Sync

Sync meeting transcripts from Fireflies.ai into your TinyCloud space. Server-orchestrated sync: user clicks Sync, backend reads their Fireflies API key from app-scoped KV, fetches transcripts, normalizes, and writes conversation rows to the manifest-prefixed TinyCloud SQL database `com.tinycloud.conversation-sync/conversations` plus transcript blobs to KV. All data sovereign.

**What this demonstrates:**
- OAuth PKCE sign-in via OpenKey (popup mode)
- TinyCloud session creation + space auto-provisioning
- Scoped delegation from user to backend
- A single app manifest that describes the app/data surface and drives frontend sign-in
- JWT-authenticated API with delegation-based authorization
- Server-side sync with external API (Fireflies)
- SQL + KV hybrid storage in user's TinyCloud space

## Prerequisites

- [Bun](https://bun.sh) v1.0+
- An [OpenKey](https://openkey.so) account with a registered OAuth client
- The OAuth client must allow `https://localhost:5173`
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

# Optional — defaults work for local dev
TINYCLOUD_HOST=https://node.tinycloud.xyz
OPENKEY_ISSUER_URL=https://openkey.so
FRONTEND_URL=https://localhost:5173
PORT=3001
VITE_OPENKEY_HOST=https://openkey.so
VITE_TINYCLOUD_HOST=
VITE_TINYCLOUD_LOCATION_REGISTRY_URL=https://registry.tinycloud.xyz
VITE_BACKEND_URL=http://localhost:3001
VITE_ENABLE_TINYCLOUD_HOOKS=false
```

Note: The Fireflies API key is per-user, entered in the setup wizard, and stored in the user's TinyCloud KV via the backend. It is not an env var and should not have a default value. The local frontend must use HTTPS for OpenKey/passkey sign-in; the backend API can remain HTTP on `localhost:3001`.

Live TinyCloud write-event hooks are disabled by default because the hosted node currently returns `404` for `POST /hooks/tickets`. Set `VITE_ENABLE_TINYCLOUD_HOOKS=true` only when the target TinyCloud host supports the hooks ticket endpoint. The manifest contains the correctly scoped hook permission for that opt-in path.

By default, the frontend resolves the user's TinyCloud node through `https://registry.tinycloud.xyz`, then falls back to `https://node.tinycloud.xyz`. Set `VITE_TINYCLOUD_HOST` only when you want to force a specific node and skip registry discovery.

## Running

```bash
# From this directory (examples/conversation-sync)
bun run dev

# Or run separately
bun run dev:frontend   # Just the frontend (https://localhost:5173)
bun run dev:backend    # Just the backend (http://localhost:3001)
```

## API Reference

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/manifest` | Returns the user-facing TinyCloud manifest |
| GET | `/api/server-info` | Returns backend DID, display name, expiry, and app-logic TinyCloud KV + SQL permissions |

The app manifest is `examples/conversation-sync/manifest.json`. It declares `manifest_version: 1`, the `app_id`/name/description, `defaults: true`, and the additional hooks permission used for optional live updates. The manifest has no backend-only section: it is the app/data contract a user or agent can inspect.

Backend delegation is app logic exposed by `/api/server-info`. The backend asks for app-relative KV `/` and SQL `conversations`; the frontend turns that into a backend delegate manifest, composes it with the app manifest, and signs one capability request. After sign-in, it calls `materializeDelegation()` to create the backend UCAN with no second wallet prompt. Those app-relative paths resolve to `com.tinycloud.conversation-sync/` and `com.tinycloud.conversation-sync/conversations`. Runtime SQL queries go through `conversationSql(access)`, which calls `access.sql.db("com.tinycloud.conversation-sync/conversations")` instead of the SDK default database named `default`.

The delegation is multi-resource and is carried in `PortableDelegation.resources`. The backend relies on node-sdk `useDelegation()` preserving that full resource list when it derives its active backend session; otherwise only the flat first resource is available and SQL writes fail.

See [Manifest and capability chain](../../SPEC-manifest-and-capability-chain.md) for the manifest model and SDK flow.

### Authenticated (JWT required)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/delegations` | Store a delegation. Body: `{ serialized: string }` |
| GET | `/api/delegations/status` | Check delegation status for current user |
| DELETE | `/api/delegations` | Revoke delegation for current user |

**Error responses** follow `{ error: string, message: string }`.
