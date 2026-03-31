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

# Optional — defaults work for local dev
TINYCLOUD_HOST=https://node.tinycloud.xyz
OPENKEY_ISSUER_URL=https://openkey.so
FRONTEND_URL=http://localhost:5173
PORT=3001
VITE_OPENKEY_HOST=https://openkey.so
VITE_TINYCLOUD_HOST=https://node.tinycloud.xyz
VITE_BACKEND_URL=http://localhost:3001
```

Note: The Fireflies API key is per-user, stored in TinyCloud KV (not an env var).

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
