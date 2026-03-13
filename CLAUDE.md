# TinyBoilerplate — AI Project Guide

## What This Is

A monorepo boilerplate for building full-stack apps with TinyCloud (user-owned storage) and OpenKey (OAuth + wallet auth). Three packages provide framework-agnostic helpers; an example app shows everything wired together.

**Three-actor pattern**: Frontend (browser) authenticates user, creates delegation to backend. Backend receives delegation, operates on user's TinyCloud data. TinyCloud is the sole database.

## Package Map

```
@tinyboilerplate/core     → shared types + constants (no runtime deps)
@tinyboilerplate/client   → browser: OpenKey auth, TC sign-in, delegation, API client
@tinyboilerplate/server   → server: TC identity, delegation store/cache, JWT verification
```

Dependency chain: `core` ← `client`, `core` ← `server`. Client and server are independent of each other.

## Build & Run

```bash
bun install                          # Install all workspace deps
bun run build                        # Build core → client → server (order matters)
bun run generate-key                 # Generate BACKEND_PRIVATE_KEY
bun run dev                          # Run react-express example (frontend:5173 + backend:3001)
```

Workspace root: `package.json` defines `"workspaces": ["packages/*", "examples/react-express/frontend", "examples/react-express/backend"]`.

Backend runs with `bun --watch`, frontend with Vite.

## Architecture: Two Auth Layers

### Layer 1: Authentication (OpenKey JWT)

OpenKey provides OAuth 2.1 PKCE. Frontend gets JWT tokens (access, refresh, id). Backend verifies via JWKS (`/.well-known/jwks.json`). The `sub` claim identifies the user; the `address` is fetched from the userinfo endpoint and cached.

### Layer 2: Authorization (TinyCloud Delegation)

After JWT auth, the user creates a `PortableDelegation` scoping what the backend can do in their TinyCloud space. The backend stores the serialized delegation in its own TC KV store and caches the activated `DelegatedAccess` in memory.

**Request pipeline for data routes:**
```
Request → authMiddleware (JWT → req.user) → delegationMiddleware (resolve DelegatedAccess → req.delegatedAccess) → route handler
```

## Key APIs

### Client Package

```typescript
// OpenKey auth
createOpenKey(config?: { host?, appName?, mode? }): OpenKey
startOAuthFlow(openkey, { clientId, redirectUri }): Promise<OAuthTokens>
connectWallet(openkey, { clientId, redirectUri }): Promise<{ address, provider, openkey }>

// TinyCloud
createTinyCloudWeb(eip1193Provider, config?: { tinycloudHosts?, signStrategy?, autoCreateSpace? }): TinyCloudWeb
signIn(tcw: TinyCloudWeb): Promise<session>

// Delegation
createDelegation(tcw, backendDID, options?: { actions?, path?, expiryMs? }): Promise<string>  // serialized
sendDelegation(backendUrl, serialized, accessToken): Promise<DelegationResponse>
checkDelegationStatus(backendUrl, accessToken): Promise<DelegationResponse>
revokeDelegation(backendUrl, accessToken): Promise<void>

// API Client — fetch wrapper with Bearer auth and auto-refresh
createApiClient(backendUrl, tokenStore, config?: { refreshConfig? }): ApiClient
// ApiClient has: get<T>(path), post<T>(path, body?), put<T>(path, body?), del<T>(path)

// Token Store — in-memory JWT storage
TokenStore.setTokens(accessToken, refreshToken, expiresIn)
TokenStore.getAccessToken(): string | null
TokenStore.isExpired(): boolean
TokenStore.refresh(config: { openKeyHost, clientId }): Promise<void>
TokenStore.clear(): void
```

### Server Package

```typescript
// Backend identity
createBackendIdentity(config: { privateKey, host?, prefix?, autoCreateSpace? }): Promise<{ node: TinyCloudNode, did: string }>
withSessionRefresh<T>(node, fn: () => Promise<T>): Promise<T>  // retries on session expiry

// Delegation persistence (in backend's own TC KV)
DelegationStore(node: TinyCloudNode)
  .store(address, serialized, metadata: { expiresAt, actions, path }): Promise<void>
  .load(address): Promise<StoredDelegation | null>
  .remove(address): Promise<void>
  .isActive(address): Promise<boolean>

// Delegation cache (in-memory, 50-min TTL)
DelegationCache(ttlMs?: number)
  .get(address): DelegatedAccess | null
  .set(address, delegatedAccess): void
  .evict(address): void
  .has(address): boolean

// JWT verification (backed by JWKS)
createJWTVerifier(openKeyIssuerUrl, config?: { issuer?, audience? }): (authHeaderOrToken: string) => Promise<{ claims, token }>
fetchUserInfo(openKeyUrl, accessToken): Promise<{ sub, address?, email? }>
```

### Core Package

```typescript
// Types
interface Item { id, title, data?, createdAt, updatedAt }
interface CreateItemInput { title, data? }
interface UpdateItemInput { title?, data? }
interface StoredDelegation { serialized, grantedAt, expiresAt, actions, path }
interface DelegationInfo { status: "active" | "expired" | "none", expiresAt }
interface ServerInfo { did, status }
type StoreType = "kv" | "sql"

// Constants
DEFAULT_DELEGATION_ACTIONS = ["tinycloud.kv/get", "tinycloud.kv/put", "tinycloud.kv/del", "tinycloud.kv/list", "tinycloud.sql/read", "tinycloud.sql/write"]
DEFAULT_DELEGATION_PATH = "items/"
DEFAULT_DELEGATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000  // 7 days
DELEGATION_CACHE_TTL_MS = 50 * 60 * 1000  // 50 minutes
```

## Example App Structure (react-express)

### Backend Routes

| Method | Path | Auth | Delegation | Description |
|--------|------|------|------------|-------------|
| GET | `/api/server-info` | No | No | Returns `{ did, status }` |
| POST | `/api/delegations` | JWT | No | Receive + store delegation. Body: `{ serialized }` |
| GET | `/api/delegations/status` | JWT | No | Check delegation status for authenticated user |
| DELETE | `/api/delegations` | JWT | No | Revoke delegation for authenticated user |
| GET | `/api/items?store=kv\|sql` | JWT | Yes | List all items |
| POST | `/api/items?store=kv\|sql` | JWT | Yes | Create item. Body: `{ title, data? }` |
| GET | `/api/items/:id?store=kv\|sql` | JWT | Yes | Get single item |
| PUT | `/api/items/:id?store=kv\|sql` | JWT | Yes | Update item. Body: `{ title?, data? }` |
| DELETE | `/api/items/:id?store=kv\|sql` | JWT | Yes | Delete item |

### Backend Middleware

- **Auth middleware** (`middleware/auth.ts`): Extracts Bearer token, verifies JWT via JWKS, fetches address from userinfo, sets `req.user = { sub, address }`. Caches sub→address mapping.
- **Delegation middleware** (`middleware/delegation.ts`): Looks up `DelegatedAccess` in cache by address. On miss: loads serialized delegation from store, deserializes, activates via `node.useDelegation()`, caches result. Sets `req.delegatedAccess`. Returns 403 if no delegation, 401 if expired.

### Frontend Components

- `AuthPanel` — Sign in/out with OpenKey. Shows address and DID.
- `DelegationPanel` — Fetch backend DID, grant/revoke delegation. Polls status every 30s.
- `ItemsCRUD` — Create/read/update/delete items. Toggle between KV and SQL storage. Shows raw API responses.

### Express Type Augmentation

`backend/src/types/index.ts` augments Express Request:
```typescript
interface Request {
  user?: { sub: string; address: string };
  delegatedAccess?: DelegatedAccess;
}
```

## Environment Variables

### Backend
| Variable | Default | Notes |
|----------|---------|-------|
| `BACKEND_PRIVATE_KEY` | (required) | 0x-prefixed Ethereum key. `bun run generate-key` |
| `TINYCLOUD_HOST` | `https://node.tinycloud.xyz` | |
| `OPENKEY_ISSUER_URL` | `https://openkey.so` | |
| `PORT` | `3001` | |

### Frontend (Vite — prefix with VITE_)
| Variable | Default | Notes |
|----------|---------|-------|
| `VITE_OPENKEY_CLIENT_ID` | (required) | Register at openkey.so |
| `VITE_OPENKEY_HOST` | `https://openkey.so` | |
| `VITE_TINYCLOUD_HOST` | `https://node.tinycloud.xyz` | |
| `VITE_BACKEND_URL` | `http://localhost:3001` | |

## Common Patterns

### withSessionRefresh

Wraps any async TC operation. If the operation fails with a session/auth error, re-signs-in and retries once:
```typescript
await withSessionRefresh(node, () => node.kv.put("key", "value"));
```
Used internally by `DelegationStore` for all KV operations.

### DelegationCache TTL

The cache uses a 50-minute TTL because TinyCloud wallet-mode sub-sessions cap at 1 hour. When cache misses or expires, the delegation is re-deserialized and re-activated from the persistent store. The caller (delegation middleware) handles this transparently.

### API Client Auto-Refresh

`createApiClient` checks token expiry before each request. If expired and `refreshConfig` is set, it refreshes the token. On 401 response, it also tries one refresh-and-retry cycle. This means the frontend almost never sees auth errors.

### Store Type Toggle

The items route supports `?store=kv` (default) or `?store=sql`. KV stores items as JSON blobs at `items/{id}`. SQL creates an `items` table on first use (via `ensureTable()`). The SQL table creation uses a `WeakSet` to run `CREATE TABLE IF NOT EXISTS` at most once per `DelegatedAccess` object.

## Terminology

- **Space** (not "namespace" or "orbit") — a TinyCloud data ownership container
- **DID** — Decentralized Identifier. Primary DID is `did:pkh:eip155:{chainId}:{address}`. Session key DID is `did:key:z6Mk...`
- **Delegation** — A `PortableDelegation` granting scoped access from user to backend
- **DelegatedAccess** — The activated form of a delegation, providing `kv` and `sql` service interfaces

## Pitfalls

- **DID timing**: `tcw.did` returns the primary DID only after `signIn()`. Before sign-in it returns the session key DID. Always create delegations after sign-in.
- **WASM ESM fix**: The `postinstall` in `@tinyboilerplate/server` patches `@tinycloud/node-sdk-wasm` CJS→ESM. If you get `require is not defined` errors, run `node packages/server/scripts/fix-wasm-esm.mjs`.
- **Build order**: Must build `core` before `client`/`server` since they depend on it. `bun run build` handles this.
- **Key format**: `BACKEND_PRIVATE_KEY` must be 0x-prefixed 32-byte hex. The generate-key script produces the correct format.
- **Delegation expiry vs cache TTL**: Delegation expiry (default 7 days) is the user-facing expiry. Cache TTL (50 min) is the internal re-activation cycle. These are independent.
