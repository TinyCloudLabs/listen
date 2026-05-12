# PR Preview Deployments

TC-1367 adds a same-repository pull request preview path for Listen:

1. Build and push a PR-tagged backend image.
2. Deploy or update one small Phala CVM named `listen-pr-<number>`.
3. Build the frontend with `VITE_BACKEND_URL=https://api-listen-pr-<number>.<PHALA_PREVIEW_DOMAIN_SUFFIX>`.
4. Upload the frontend to Cloudflare Pages with branch alias `pr-<number>`, which resolves to `https://pr-<number>.listen.pages.dev`.
5. Delete the Phala CVM when the PR closes.

The workflow skips forked PRs because it needs deployment secrets.

## Required GitHub Configuration

Repository variables:

| Name | Required | Default | Notes |
| --- | --- | --- | --- |
| `PHALA_PREVIEW_DOMAIN_SUFFIX` | Yes | | DNS suffix for backend preview domains, for example `tinycloud.xyz`, producing `api-listen-pr-123.tinycloud.xyz`. The Cloudflare token must be able to manage this zone. |
| `CLOUDFLARE_ACCOUNT_ID` | No | `9959301f03d2db1a5fcf5e004278d467` | Cloudflare account containing the Pages project. |
| `CLOUDFLARE_PAGES_PROJECT` | No | `listen` | Cloudflare Pages project name. |
| `LISTEN_BACKEND_IMAGE` | No | `ghcr.io/tinycloudlabs/listen-backend` | GitHub Container Registry image repository used for PR backend tags. |
| `PHALA_PREVIEW_INSTANCE_TYPE` | No | `tdx.small` | Phala instance type for PR CVMs. |
| `TINYCLOUD_HOST` | No | `https://node.tinycloud.xyz` | TinyCloud node used by previews. |
| `OPENKEY_ISSUER_URL` | No | `https://openkey.so` | Backend OpenKey issuer. |
| `VITE_OPENKEY_HOST` | No | `https://openkey.so` | Frontend OpenKey host. |
| `VITE_ENABLE_TINYCLOUD_HOOKS` | No | `false` | Frontend feature flag. |
| `VITE_ENABLE_AGENT` | No | `false` | Frontend feature flag. |

Repository secrets:

| Name | Required | Notes |
| --- | --- | --- |
| `PHALA_CLOUD_API_KEY` | Yes | Phala Cloud API key with access to create, update, and delete preview CVMs. |
| `CLOUDFLARE_API_TOKEN` | Yes | Cloudflare token for Pages uploads and `dstack-ingress` DNS/cert setup. |
| `CERTBOT_EMAIL` | Yes | Let's Encrypt contact for preview backend certificates. |
| `LISTEN_PREVIEW_BACKEND_PRIVATE_KEY` | Yes | Backend wallet private key for preview CVMs. |
| `LISTEN_PREVIEW_GOOGLE_CLIENT_ID` | No | Enables Google UI and backend OAuth in previews. |
| `LISTEN_PREVIEW_GOOGLE_CLIENT_SECRET` | No | Enables Google OAuth in previews. |
| `LISTEN_PREVIEW_GOOGLE_SERVICE_ACCOUNT_KEY` | No | Enables Google Meet webhook processing in previews. |

## Production Data and Secret Scope

The issue asks for production environment variables in the preview backend. That is technically possible by setting the preview secrets to production values, but it has real risk:

- PR code from same-repository branches runs with those secrets.
- Preview backends using the production TinyCloud node can read or write production data through normal application paths.
- Google OAuth/webhook credentials may need allowlist updates for each preview backend/frontend domain.

The safer default is to use preview-scoped credentials and only reuse production values after an explicit repository-admin decision. Forked PRs are skipped so secrets are not exposed to untrusted forks.

Preview backend images are pushed to GitHub Container Registry with the workflow `GITHUB_TOKEN`.
The GHCR package must be readable by Phala when the CVM pulls the image; keep the preview image
public or configure Phala/private-registry pull credentials outside this workflow.

## Cleanup

`.github/workflows/preview-cleanup.yml` deletes the Phala CVM named `listen-pr-<number>` when a same-repository PR closes.

Cloudflare Pages keeps deployment history and the latest deployment for a branch alias cannot always be deleted automatically. If preview retention needs to be stricter, delete old `pr-<number>` deployments from Cloudflare Pages or configure project retention outside this repo.
