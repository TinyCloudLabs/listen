# PR Preview Deployments

TC-1367 adds a same-repository pull request preview path for Listen:

1. Create or reuse a Railway environment named `pr-<number>`.
2. Deploy the backend service to Railway from the PR source.
3. Build the frontend with `VITE_BACKEND_URL` set to the Railway backend URL.
4. Upload the frontend to Cloudflare Pages with branch alias `pr-<number>`, which resolves to `https://pr-<number>.listen.pages.dev`.
5. Delete the Railway environment when the PR closes.

The workflow skips forked PRs because it needs deployment secrets.

## Railway Setup

The Railway project needs a base service named `listen-backend` in the base environment. The base service can be empty; PR environments duplicate it and the workflow deploys the PR source into the duplicated service.

The backend service uses the repo-root deployment context with:

```text
RAILWAY_DOCKERFILE_PATH=backend/Dockerfile
PORT=3001
```

If Railway falls back to Railpack for the repo-root monorepo context, `railpack.json`
sets the backend start command to `bun run --cwd backend start`.

The Railway CLI was used to create the initial `listen-backend` service in project `d0603e71-78b2-45ca-91ed-15d6fb253c1b`.

## Required GitHub Configuration

Repository variables:

| Name | Required | Default | Notes |
| --- | --- | --- | --- |
| `RAILWAY_PROJECT_ID` | Yes | | Railway project ID that owns the preview environments. |
| `RAILWAY_SERVICE` | No | `listen-backend` | Railway backend service to deploy in each PR environment. |
| `RAILWAY_BASE_ENVIRONMENT` | No | `production` | Railway environment duplicated to create `pr-<number>`. |
| `CLOUDFLARE_ACCOUNT_ID` | No | `9959301f03d2db1a5fcf5e004278d467` | Cloudflare account containing the Pages project. |
| `CLOUDFLARE_PAGES_PROJECT` | No | `listen` | Cloudflare Pages project name. |
| `TINYCLOUD_HOST` | No | `https://node.tinycloud.xyz` | TinyCloud node used by previews. |
| `OPENKEY_ISSUER_URL` | No | `https://openkey.so` | Backend OpenKey issuer. |
| `VITE_OPENKEY_HOST` | No | `https://openkey.so` | Frontend OpenKey host. |
| `VITE_ENABLE_TINYCLOUD_HOOKS` | No | `false` | Frontend feature flag. |
| `VITE_ENABLE_AGENT` | No | `false` | Frontend feature flag. |

Repository secrets:

| Name | Required | Notes |
| --- | --- | --- |
| `RAILWAY_TOKEN` | Yes | Railway project/account token that can create environments, set service variables, deploy, and delete PR environments. |
| `CLOUDFLARE_API_TOKEN` | No | Cloudflare token for Pages uploads. If missing or under-scoped, the Railway backend preview still deploys and the PR comment marks the frontend as not deployed. |
| `LISTEN_PREVIEW_BACKEND_PRIVATE_KEY` | Yes | Backend wallet private key for preview backend instances. |
| `LISTEN_PREVIEW_GOOGLE_CLIENT_ID` | No | Enables Google UI and backend OAuth in previews. |
| `LISTEN_PREVIEW_GOOGLE_CLIENT_SECRET` | No | Enables Google OAuth in previews. |
| `LISTEN_PREVIEW_GOOGLE_SERVICE_ACCOUNT_KEY` | No | Enables Google Meet webhook processing in previews. |

## Runtime Variables

For each PR environment, the workflow sets service variables before deploying:

- `RAILWAY_DOCKERFILE_PATH=backend/Dockerfile`
- `NODE_ENV=production`
- `PORT=3001`
- `BACKEND_PRIVATE_KEY`
- `TINYCLOUD_HOST`
- `FRONTEND_URL=https://pr-<number>.listen.pages.dev`
- `OPENKEY_ISSUER_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_SERVICE_ACCOUNT_KEY`
- `GOOGLE_PUBSUB_PUSH_URL=<railway-backend-url>/api/webhooks/google-meet`

## Production Data and Secret Scope

The issue asks for production environment variables in the preview backend. That is technically possible by setting the preview secrets to production values, but it has real risk:

- PR code from same-repository branches runs with those secrets.
- Preview backends using the production TinyCloud node can read or write production data through normal application paths.
- Google OAuth/webhook credentials may need allowlist updates for each preview backend/frontend domain.

The safer default is to use preview-scoped credentials and only reuse production values after an explicit repository-admin decision. Forked PRs are skipped so secrets are not exposed to untrusted forks.

When required Railway deployment configuration is missing, the workflow still runs backend and frontend builds and comments on the PR with the missing names. Railway deployment is skipped until those values are configured. Cloudflare Pages deployment is best-effort; a missing or under-scoped Cloudflare token does not block the Railway backend preview.

## Cleanup

`.github/workflows/preview-cleanup.yml` deletes the Railway environment named `pr-<number>` when a same-repository PR closes.

Cloudflare Pages keeps deployment history and the latest deployment for a branch alias cannot always be deleted automatically. If preview retention needs to be stricter, delete old `pr-<number>` deployments from Cloudflare Pages or configure project retention outside this repo.
