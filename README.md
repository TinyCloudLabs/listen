# TinyBoilerplate

Full-stack boilerplate for [TinyCloud](https://tinycloud.xyz) + [OpenKey](https://openkey.so). Framework-agnostic core with example apps.

## Architecture

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Frontend   │       │   Backend    │       │  TinyCloud   │
│   (browser)  │       │   (server)   │       │   (storage)  │
│              │       │              │       │              │
│ OpenKey auth ├──JWT──► Verify JWT   │       │              │
│ TC sign-in   │       │              │       │              │
│ Create deleg ├──────►│ Store deleg  ├──────►│ BE's KV      │
│              │       │ Cache access │       │              │
│ CRUD via API ├──────►│ Use deleg    ├──────►│ User's KV/SQL│
│              │       │              │       │              │
│ Direct KV/SQL├──────────────────────────────►│ User's KV/SQL│
└──────────────┘       └──────────────┘       └──────────────┘
```

**Two data access patterns:**

| Pattern | Path | Use case |
|---------|------|----------|
| Delegated (via backend) | Frontend → Backend → TinyCloud | Server-side logic, validation, multi-user |
| Direct (browser-only) | Frontend → TinyCloud | Simple reads/writes, no backend needed |

**Two auth layers:**

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| Authentication | OpenKey JWT (JWKS-verified) | "Who are you?" |
| Authorization | TinyCloud delegation (PortableDelegation) | "What can you do in this user's space?" |

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/tinycloudlabs/tinyboilerplate.git
cd tinyboilerplate
bun install

# 2. Build packages
bun run build

# 3. Generate a backend private key
bun run generate-key

# 4. Configure environment
cp examples/react-express/.env.example examples/react-express/.env
# Edit .env — set BACKEND_PRIVATE_KEY and VITE_OPENKEY_CLIENT_ID

# 5. Run the example
bun run dev
```

The frontend runs on `http://localhost:5173`, the backend on `http://localhost:3001`.

## Project Structure

```
tinyboilerplate/
├── packages/
│   ├── core/                        # Shared types + constants
│   ├── client/                      # Browser helpers (auth, delegation, API client)
│   └── server/                      # Server helpers (identity, delegation store, JWT)
├── examples/
│   └── react-express/               # Full working example
│       ├── frontend/                # React + Vite
│       └── backend/                 # Express + Bun
├── package.json                     # Bun workspace root
└── tsconfig.base.json
```

## Packages

### `@tinyboilerplate/core`

Shared types and constants used by both client and server.

- `Item`, `CreateItemInput`, `UpdateItemInput` — CRUD entity types
- `DelegationInfo`, `StoredDelegation`, `ServerInfo` — delegation/server types
- `DEFAULT_DELEGATION_EXPIRY_MS`, `DELEGATION_CACHE_TTL_MS` — delegation lifetime constants

### `@tinyboilerplate/client`

Framework-agnostic browser helpers.

| Export | Description |
|--------|-------------|
| `createOpenKey(config?)` | Create an OpenKey instance |
| `startOAuthFlow(openkey, oauthConfig)` | Run OAuth PKCE flow, return JWT tokens |
| `connectWallet(openkey)` | Connect wallet, return EIP-1193 provider |
| `createTinyCloudWeb(provider, config?)` | Create TinyCloudWeb instance |
| `signIn(tcw)` | Sign into TinyCloud, sets `tcw.did` and `tcw.spaceId` |
| `loadAppManifest(url)` | Load and validate a manifest |
| `composeManifestWithBackend(manifest, serverInfo)` | Compose the app manifest with backend-requested delegation permissions |
| `createManifestDelegation(tcw, backendDID, capabilityRequest)` | Materialize a manifest-declared delegation to backend |
| `sendDelegation(url, serialized, token)` | POST delegation to backend |
| `checkDelegationStatus(url, token)` | Check if backend has active delegation |
| `revokeDelegation(url, token)` | Revoke backend's delegation |
| `TokenStore` | In-memory JWT storage with auto-refresh |
| `createApiClient(url, tokenStore, config?)` | Fetch wrapper with Bearer auth + 401 retry |

### `@tinyboilerplate/server`

Framework-agnostic Node.js/Bun helpers.

| Export | Description |
|--------|-------------|
| `createBackendIdentity(config)` | Initialize TinyCloudNode, sign in, return `{ node, did }` |
| `withSessionRefresh(node, fn)` | Retry on session expiry (auto re-sign-in) |
| `DelegationStore` | Persist delegations in backend's own TC KV store |
| `DelegationCache` | In-memory cache for `DelegatedAccess` (50-min TTL) |
| `createJWTVerifier(issuerUrl, config?)` | JWKS-backed JWT verification function |
| `fetchUserInfo(openKeyUrl, token)` | Fetch user profile from OpenKey userinfo endpoint |

## How It Works

### 1. User authenticates via OpenKey

```
Frontend                    OpenKey
   │── OAuth PKCE popup ──────►│
   │◄── JWT (access + refresh) │
   │── connect() ─────────────►│
   │◄── EIP-1193 provider ─────│
```

The JWT authenticates the user to your backend. The EIP-1193 provider enables TinyCloud signing.

### 2. Frontend signs into TinyCloud

```typescript
const tcw = createTinyCloudWeb(wallet.provider);
await signIn(tcw);
// tcw.did → user's primary DID (did:pkh:eip155:...)
// tcw.spaceId → user's space ID
```

### 3. Frontend delegates access to backend

```
Frontend                    Backend                    TinyCloud
   │── GET /api/server-info ──►│                           │
   │◄── { did: "did:key:..." } │                           │
   │                           │                           │
   │ materializeDelegation(backendDID)                     │
   │── POST /api/delegations ─►│                           │
   │                           │── store delegation ──────►│ (BE's KV)
   │                           │── cache DelegatedAccess   │
   │◄── { status: "active" } ──│                           │
```

### 4. Backend operates on user's data via delegation

```
Frontend                    Backend                    TinyCloud
   │── GET /api/items ────────►│                           │
   │                           │── kv.list("com.example.app/items/") ─►│
   │◄── { items: [...] } ──────│                           │
```

The delegation middleware resolves `DelegatedAccess` from cache (or store on miss) before any data route.

### 5. Frontend accesses TinyCloud directly (no backend)

```
Frontend                                       TinyCloud
   │── tcw.kv.put("key", value) ──────────────►│ (User's space)
   │◄── Result<KVResponse> ───────────────────│
   │                                           │
   │── tcw.sql.query("SELECT * FROM items") ──►│
   │◄── Result<{ columns, rows }> ────────────│
```

The `DirectStorage` panel uses the `TinyCloudWeb` instance directly — `tcw.kv.*` for key-value and `tcw.sql.*` for SQL. No delegation or backend involved. This only works with a fresh sign-in session (not session restore).

## Building Your Own App

1. **Define your model** in `packages/core/src/index.ts` (replace `Item` with your types)
2. **Update the manifest** — change `app_id`, name, description, and any permissions in `manifest.json`
3. **Write your routes** — copy `examples/react-express/backend/src/routes/items.ts` as a template
4. **Wire up the frontend** — use `createApiClient` to call your new routes
5. **Store type** — the example supports both `kv` and `sql` via `?store=kv|sql` query param

The delegation chain is the same regardless of your data model: authenticate (JWT), delegate (PortableDelegation), then operate (KV/SQL via `DelegatedAccess`).

## Environment Variables

### Backend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BACKEND_PRIVATE_KEY` | Yes | — | Ethereum private key (0x-prefixed). Generate with `bun run generate-key` |
| `TINYCLOUD_HOST` | No | `https://node.tinycloud.xyz` | TinyCloud node URL |
| `OPENKEY_ISSUER_URL` | No | `https://openkey.so` | OpenKey issuer for JWT verification |
| `PORT` | No | `3001` | Backend port |

### Frontend (Vite)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_OPENKEY_CLIENT_ID` | Yes | — | Your OpenKey OAuth client ID |
| `VITE_OPENKEY_HOST` | No | `https://openkey.so` | OpenKey host |
| `VITE_BACKEND_URL` | No | `http://localhost:3001` | Backend URL |

## Known Constraints

- **Wallet-mode session cap**: TinyCloud wallet-mode sessions expire after 1 hour. The `DelegationCache` uses a 50-minute TTL to stay under this cap. On expiry, the delegation is re-activated from the persistent store.
- **WASM ESM fix**: `@tinycloud/node-sdk-wasm` ships CJS wrappers that break in ESM. The `postinstall` script in `@tinyboilerplate/server` patches this automatically.
- **Delegation expiry**: Default 7 days. After expiry, the user must grant a new delegation from the frontend.
- **Backend identity**: The backend has its own TinyCloud space (auto-created on first boot). Delegations are stored in the backend's KV, not the user's.

## License

MIT
