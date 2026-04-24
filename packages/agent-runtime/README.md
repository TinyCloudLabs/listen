# @tinyboilerplate/agent-runtime

Docker image + activation sidecar that lets an agent environment (e.g. OpenCode in a container) operate on a user's TinyCloud space as a delegatee — using the official `@tinycloud/cli` (binary `tc`), not a custom wrapper.

## What's in the box

- **`docker/Dockerfile`** — multi-stage build. Runtime stage installs `opencode-ai` and `@tinycloud/cli` globally via npm, and ships a compiled Bun binary of the activation sidecar.
- **`docker/delegation-endpoint.ts`** — the activation sidecar. HTTP server on `:4097` (`POST /delegation`, `POST /refresh`, `GET /health`). Owns a long-lived `TinyCloudNode` instance and writes a `tc`-compatible profile to `/root/.tinycloud/profiles/default/` on each successful activation. Re-runs activation every 25 min to keep the server-side session fresh (wallet-mode sub-sessions cap at ~60 min).
- **`docker/profile-writer.ts`** — synthesizes the three profile files (`profile.json`, `key.json`, `session.json`) atomically. `key.json` and `profile.json` are write-once; only `session.json` is rewritten on refresh.
- **`docker/refresh-loop.ts`** — 25-min timer with in-flight lock + retry ladder. Transient failures (5s / 15s / 60s backoff) keep the last-good profile on disk; terminal failures (401 / revoked) clear `session.json` so `tc` surfaces `AUTH_REQUIRED`.
- **`docker/agent-key.ts`** — load / generate / migrate the agent's wallet key (secp256k1 `did:pkh:eip155:1:0x…`). The agent's DID is stable across container restarts — it's the DID users paste into the Connect Agent dialog.
- **`docker/entrypoint.sh`** — backgrounds the sidecar, execs `opencode serve`.

## How the pieces fit

```
frontend  ── POST serialized PortableDelegation ──▶  sidecar :4097
                                                       │
                                                       │ useDelegation()
                                                       ▼
                                                  DelegatedAccess
                                                       │
                                                       │ project RestorableSession
                                                       ▼
                                         /root/.tinycloud/profiles/default/
                                                       │
                                                       │ restoreSession() on each invocation
                                                       ▼
agent (OpenCode) ──▶ bash: tc kv / tc sql ──▶ /root/.tinycloud/profiles/default/ ──▶ TinyCloud node
```

`tc` never sees the delegation directly — only the restored session. This is the canonical OAuth2 auth-sidecar pattern (Vault / OpenUnison / oauth2-proxy).

## Directory layout inside the container

```
/var/lib/delegation-endpoint/   ← sidecar state (named volume)
  agent-key.json                ← { privateKey: "0x..." } — stable agent wallet
  delegation.json               ← serialized PortableDelegation (source of truth for refresh)

/root/.tinycloud/                ← tc profile dir (named volume)
  config.json                    ← { defaultProfile: "default" }
  profiles/default/
    profile.json                 ← { host, chainId, spaceId, did, authMethod: "openkey", ... }
    key.json                     ← session-key JWK
    session.json                 ← { delegationHeader, delegationCid, spaceId, jwk, verificationMethod, address, chainId }
```

## Environment

| Var | Default |
|---|---|
| `TINYCLOUD_HOST` | `https://node.tinycloud.xyz` |
| `DELEGATION_SIDECAR_DIR` | `/var/lib/delegation-endpoint` |
| `TC_PROFILES_ROOT` | `/root/.tinycloud` |
| `TC_PROFILE_NAME` | `default` |
| `REFRESH_INTERVAL_MS` | `1500000` (25 min) |
| `TC_AGENT_PREFIX` | `tc-agent` — override per-app to avoid TC-level space-namespace collisions |

**Layer-1 migration note:** if a pre-existing Layer-1 named volume is remounted at `DELEGATION_SIDECAR_DIR` on upgrade, the sidecar reads the existing `agent-key.json` (same filename in both layouts — DID stays stable) and falls back to `$DELEGATION_SIDECAR_DIR/delegation.txt` when `delegation.json` is missing, rewriting it as JSON on the next grant.

## Using this runtime in your app

1. Build the image: `docker build -f packages/agent-runtime/docker/Dockerfile -t my-agent .` from the repo root.
2. In your compose file, bind-mount your app-specific `CLAUDE.md` at `/workspace/CLAUDE.md:ro` — that's what teaches the agent about your SQL schema and KV key layout.
3. Wire the frontend's Connect Agent dialog to POST `{ serialized }` to `http://localhost:4097/delegation`.

See `examples/conversation-sync/` for the listen wiring.

## Troubleshooting

- `GET /health` returns the sidecar's full state, including `lastError` and refresh state. Check this first.
- `POST /refresh` forces an immediate re-activation, bypassing the 25-min timer.
- `docker logs <container> | grep "Agent DID:"` — the DID banner is printed once on boot; stable across restarts as long as the `/var/lib/delegation-endpoint` volume persists.
- If `tc` inside the container returns `AUTH_REQUIRED`, the sidecar has either (a) never received a delegation, or (b) hit a terminal failure. Check `GET /health`.
