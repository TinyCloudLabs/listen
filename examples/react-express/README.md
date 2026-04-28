# React + Express Example

A full-stack demo showing OpenKey authentication, TinyCloud delegation, and CRUD operations through a backend that operates on the user's TinyCloud space.

**What this demonstrates:**
- OAuth PKCE sign-in via OpenKey (popup mode)
- TinyCloud session creation + space auto-provisioning
- Manifest-backed delegation from user to backend (7-day expiry, `com.example.app/` app scope)
- JWT-authenticated API with delegation-based authorization
- CRUD on user-owned data via KV, SQL, and DuckDB storage

## Prerequisites

- [Bun](https://bun.sh) v1.0+
- An [OpenKey](https://openkey.so) account with a registered OAuth client
- The OAuth client must have `http://localhost:5173` as an allowed redirect URI

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
# TINYCLOUD_HOST=https://node.tinycloud.xyz
OPENKEY_ISSUER_URL=https://openkey.so
PORT=3001
VITE_OPENKEY_HOST=https://openkey.so
VITE_BACKEND_URL=http://localhost:3001
```

## Running

```bash
# From this directory (examples/react-express)
bun run dev

# Or from repo root
bun run dev
```

This starts both:
- **Frontend**: `http://localhost:5173` (Vite dev server)
- **Backend**: `http://localhost:3001` (Bun with --watch)

You can also run them separately:
```bash
bun run dev:frontend   # Just the frontend
bun run dev:backend    # Just the backend
```

## API Reference

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/server-info` | Returns backend DID and app-relative permissions for manifest composition |

### Authenticated (JWT required)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/delegations` | Store a delegation. Body: `{ serialized: string }` |
| GET | `/api/delegations/status` | Check delegation status for current user |
| DELETE | `/api/delegations` | Revoke delegation for current user |

### Authenticated + Delegated (JWT + active delegation required)

All item routes accept `?store=kv` (default), `?store=sql`, or `?store=duckdb`.

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/items` | — | `{ items: Item[] }` |
| POST | `/api/items` | `{ title, data? }` | `{ item: Item }` (201) |
| GET | `/api/items/:id` | — | `{ item: Item }` |
| PUT | `/api/items/:id` | `{ title?, data? }` | `{ item: Item }` |
| DELETE | `/api/items/:id` | — | 204 No Content |

**Error responses** follow `{ error: string, message: string }`.

## Frontend Panels

### 1. Authentication
Sign in with OpenKey. This opens a popup for OAuth, connects the wallet, and creates a TinyCloud session. After sign-in, your address and DID are displayed.

### 2. Delegation
Fetches `/api/server-info`, composes those app-relative backend permissions with `manifest.json`, signs one TinyCloud session request, then materializes the backend delegation. Status is polled every 30 seconds.

### 3. Items (CRUD)
Create, read, update, and delete items. Toggle between KV and SQL storage modes. A collapsible "Last API Response" section shows raw JSON for debugging.

## How to Modify

To replace "items" with your own model:

**1. Define your types** in `packages/core/src/index.ts`:
```typescript
export interface Task {
  id: string;
  name: string;
  done: boolean;
  createdAt: string;
}
```

**2. Update the manifest** if needed:
```typescript
// frontend/public/manifest.json
{
  "manifest_version": 1,
  "app_id": "com.example.app",
  "name": "Example App",
  "defaults": true
}
```

**3. Add new routes** — copy `backend/src/routes/items.ts`:
```typescript
// backend/src/routes/tasks.ts
export function createTasksRouter() {
  const router = Router();

  router.get("/", async (req, res) => {
    const access = req.delegatedAccess!;
    const result = await access.kv.list("tasks/");
    // ...
  });

  return router;
}
```

**4. Mount in** `backend/src/index.ts`:
```typescript
app.use("/api/tasks", authMiddleware, delegationMiddleware, createTasksRouter());
```

**5. Build a frontend component** using `api.get<TaskListResponse>("/api/tasks")`.

The auth and delegation layers are model-agnostic. Only the routes and frontend components change.
