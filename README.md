# Listen

Listen is a transcript workspace for TinyCloud. It syncs Fireflies and Google Meet transcripts, supports manual transcript import, stores normalized conversation rows in TinyCloud SQL, and stores transcript blobs in TinyCloud KV.

## Run Locally

Prerequisites:

- Bun 1.3+
- An OpenKey OAuth client that allows `https://listen.localhost`
- A backend private key

```bash
bun install
bun run generate-key
cp .env.example .env
```

Edit `.env`:

```bash
BACKEND_PRIVATE_KEY=0x...
VITE_OPENKEY_HOST=https://openkey.so
VITE_BACKEND_URL=https://api.listen.localhost
FRONTEND_URL=https://listen.localhost
PORT=3001
```

Run the app:

```bash
bun run dev
```

The default dev stack uses Portless. The frontend runs at `https://listen.localhost` and the backend runs at `https://api.listen.localhost`.

For raw localhost ports:

```bash
bun run dev:localhost
```

This serves the frontend at `http://localhost:5173` and the backend at `http://localhost:3001`.

## Project Layout

```text
listen/
├── frontend/              # React + Vite app
├── backend/               # Express + Bun API
├── packages/
│   ├── client/            # Browser auth/delegation/API helpers
│   ├── core/              # Shared types and constants
│   ├── server/            # Backend identity/auth/delegation helpers
│   └── agent-runtime/     # Optional local OpenCode agent sidecar
├── manifest.json          # TinyCloud app manifest
├── docker-compose.yml     # Optional local agent runtime
├── docker-compose.phala.yml
└── phala.toml
```

## Environment

Backend:

| Variable | Required | Description |
| --- | --- | --- |
| `BACKEND_PRIVATE_KEY` | Yes | Backend wallet key. Generate with `bun run generate-key`. |
| `FRONTEND_URL` | Yes | Allowed browser origin for CORS. Local: `https://listen.localhost`. Production: `https://listen.tinycloud.xyz`. |
| `PORT` | No | Backend port. Defaults to `3001`. |
| `TINYCLOUD_HOST` | No | TinyCloud node URL. Defaults to `https://node.tinycloud.xyz`. |
| `OPENKEY_ISSUER_URL` | No | OpenKey issuer. Defaults to `https://openkey.so`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional | Enables Google Meet OAuth sync. |
| `GOOGLE_SERVICE_ACCOUNT_KEY` / `GOOGLE_PUBSUB_PUSH_URL` | Optional | Enables Google Meet push webhooks. |

Frontend:

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_BACKEND_URL` | Yes | Backend API URL. Production defaults to `https://api.listen.tinycloud.xyz`. |
| `VITE_OPENKEY_HOST` | No | OpenKey host. Defaults to `https://openkey.so`. |
| `VITE_GOOGLE_CLIENT_ID` | Optional | Shows Google Meet source UI. |
| `VITE_ENABLE_TINYCLOUD_HOOKS` | No | Enables live TinyCloud hook subscriptions. Defaults to `false`. |
| `VITE_ENABLE_AGENT` | No | Shows the optional agent connection UI. Defaults to hidden unless set to `true`. |
| `VITE_AGENT_ENDPOINT` | No | Local agent endpoint. Defaults to `http://localhost:4097`. |

## Optional Agent

The local OpenCode agent is opt-in.

```bash
VITE_ENABLE_AGENT=true docker compose up --build listen-agent
```

Set `VITE_ENABLE_AGENT=true` in `.env` when you want the frontend to show the agent connection control. Production config keeps it disabled.

## Deploy

Frontend target: Cloudflare Pages project `listen`, custom domain `https://listen.tinycloud.xyz`.

```bash
bun run deploy:frontend
```

Backend target: Phala Cloud TEE CVM `listen-backend`, instance type `tdx.small`, custom domain `https://api.listen.tinycloud.xyz`.

```bash
phala login
bun run docker:backend:push
bun run deploy:backend:phala
```

Configuration still needed outside the repo:

- Cloudflare auth (`wrangler login` or `CLOUDFLARE_API_TOKEN`) with access to the `listen` Pages project.
- Cloudflare custom domain mapping for `listen.tinycloud.xyz`.
- Phala auth (`phala login` or `PHALA_CLOUD_API_KEY`) with credits/workspace access.
- `CLOUDFLARE_API_TOKEN` and `CERTBOT_EMAIL` in `.env.prod`; `dstack-ingress` uses those to map `api.listen.tinycloud.xyz` and issue the certificate.
- A pushed amd64 backend image. The default target is the public Docker Hub image `skgbafa/listen-backend:latest`; create that Docker Hub repo as public before the first push, and set `LISTEN_BACKEND_IMAGE` to deploy a specific tag.
- For automated backend deploys, set GitHub Actions secrets `DOCKER_REGISTRY_USERNAME`, `DOCKER_REGISTRY_PASSWORD`, and `PHALA_CLOUD_API_KEY`.
- OpenKey OAuth redirect/origin allowlist entries for production and local URLs.
- Production `.env` values for `BACKEND_PRIVATE_KEY`, `FRONTEND_URL`, and optional Google credentials.

Pull request previews for same-repository branches deploy a PR-tagged Phala backend and a Cloudflare Pages preview frontend. See [docs/pr-preview-deployments.md](docs/pr-preview-deployments.md) for required GitHub secrets/vars, production-data caveats, and cleanup behavior.

## Checks

```bash
bun run lint
bun run format:check
bun run build
bun run test
```
