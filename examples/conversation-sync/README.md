# Conversation Sync

Sync meeting transcripts from Fireflies.ai into your TinyCloud space. Server-orchestrated sync: user clicks Sync, backend reads their Fireflies API key from app-scoped KV, fetches transcripts, normalizes, and writes conversation rows to the manifest-prefixed TinyCloud SQL database `com.tinycloud.conversation-sync/conversations` plus transcript blobs to KV. All data sovereign.

**What this demonstrates:**
- OAuth PKCE sign-in via OpenKey (popup mode)
- TinyCloud session creation + space auto-provisioning
- Scoped delegation from user to backend
- A single app manifest that drives frontend sign-in, backend delegation scope, and app namespace
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
VITE_TINYCLOUD_HOST=https://node.tinycloud.xyz
VITE_BACKEND_URL=http://localhost:3001
VITE_ENABLE_TINYCLOUD_HOOKS=false
```

Note: The Fireflies API key is per-user, entered in the setup wizard, and stored in the user's TinyCloud KV via the backend. It is not an env var and should not have a default value. The local frontend must use HTTPS for OpenKey/passkey sign-in; the backend API can remain HTTP on `localhost:3001`.

Live TinyCloud write-event hooks are disabled by default because the hosted node currently returns `404` for `POST /hooks/tickets`. Set `VITE_ENABLE_TINYCLOUD_HOOKS=true` only when the target TinyCloud host supports the hooks ticket endpoint. The manifest contains the correctly scoped hook permission for that opt-in path.

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
| GET | `/api/manifest` | Returns the runtime manifest with the backend DID injected into the manifest-defined delegation |
| GET | `/api/server-info` | Returns backend DID, display name, expiry, and manifest-derived TinyCloud KV + SQL permissions |

The single source of truth is `examples/conversation-sync/manifest.json`. It omits `prefix` and `defaults`, so the SDK uses the normal defaults: `prefix` is the manifest `id`, and `defaults` is `true`. The backend reads the same file, serves `/api/manifest`, and injects its live DID into the manifest's `backend` delegation template.

The backend delegation template stays app-relative: KV `/` and SQL `conversations`. At sign-in those resolve to `com.tinycloud.conversation-sync/` and `com.tinycloud.conversation-sync/conversations`. Runtime SQL queries go through `conversationSql(access)`, which calls `access.sql.db("com.tinycloud.conversation-sync/conversations")` instead of the SDK default database named `default`.

The delegation is multi-resource and is carried in `PortableDelegation.resources`. The backend relies on node-sdk `useDelegation()` preserving that full resource list when it derives its active backend session; otherwise only the flat first resource is available and SQL writes fail.

### Authenticated (JWT required)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/delegations` | Store a delegation. Body: `{ serialized: string }` |
| GET | `/api/delegations/status` | Check delegation status for current user |
| DELETE | `/api/delegations` | Revoke delegation for current user |

**Error responses** follow `{ error: string, message: string }`.
