# agent-runtime Docker image

Part of [TC-1344](https://linear.app/tinycloudlabs/issue/TC-1344). An app-agnostic Docker image bundling:

- OpenCode (web UI on `:4096`)
- The official `@tinycloud/cli` (binary `tc`) from npm — the agent invokes `tc kv …` / `tc sql …` from bash.
- `delegation-endpoint` — a small Bun sidecar on `:4097` that receives a serialized `PortableDelegation` from an app's frontend, activates it via `node.useDelegation()`, and writes a `tc`-compatible session profile to `/root/.tinycloud/profiles/default/`. Refreshes the session every 25 min.

**App-specific schema docs live outside this image.** Apps mount their own `CLAUDE.md` at `/workspace/CLAUDE.md:ro` — see `examples/conversation-sync/` for a listen example.

For the architecture rationale + full sidecar API, see `packages/agent-runtime/README.md`.

## Build

From the repo root (so the Docker build context sees the workspace):

```bash
docker build -f packages/agent-runtime/docker/Dockerfile -t tc-agent .
```

## Run

```bash
docker run --rm -it \
  -p 4096:4096 -p 4097:4097 \
  -v tc-agent-state:/var/lib/delegation-endpoint \
  -v tc-profile:/root/.tinycloud \
  -v /absolute/path/to/your/CLAUDE.md:/workspace/CLAUDE.md:ro \
  -e OPENCODE_ZEN_API_KEY=sk-... \
  tc-agent
```

Or, from any `examples/<app>/` that provides a `docker-compose.yml` + `agent/CLAUDE.md`:

```bash
cp .env.example .env       # fill in OPENCODE_ZEN_API_KEY
docker compose up --build
```

## First-boot flow

1. Sidecar runs. Generates or loads `/var/lib/delegation-endpoint/agent-key.json`. Prints the DID:
   ```
   Agent DID: did:pkh:eip155:1:0xD10bc910…
   ```
2. Copy that DID, open your app, click **Connect Agent**, paste.
3. The app's frontend POSTs `{ serialized }` to `http://localhost:4097/delegation`. The sidecar activates via `node.useDelegation()` and writes `/root/.tinycloud/profiles/default/{profile,key,session}.json`.
4. Open `http://localhost:4096` (OpenCode). The agent invokes `tc kv …` / `tc sql …` from bash; `tc` reads the profile and routes through the delegated session with no knowledge that a delegation was involved.
5. Every 25 min, the sidecar re-runs `useDelegation` and rewrites `session.json` atomically — the server-side session caps at ~1h in wallet mode.

## Ports

| Port | Service |
|---|---|
| `4096` | OpenCode web UI (the agent) |
| `4097` | `delegation-endpoint` (receives delegations + exposes `GET /health`, `POST /refresh`) |

## Security

`:4097` is localhost-only (mapped to host's `127.0.0.1:4097` via `-p`) and has no auth. It accepts only JSON bodies of the form `{"serialized": "<PortableDelegation>"}`. The delegations it accepts must be signed by the user's wallet, so an attacker on localhost cannot forge access. Multi-user or cloud deployments need auth here.

## Swapping the model

The OpenCode model ID is pinned in `opencode.json`. Edit `packages/agent-runtime/docker/opencode.json` and rebuild.

## Verifying without a model key

```bash
# 1. Build + run
docker build -f packages/agent-runtime/docker/Dockerfile -t tc-agent .
docker run --rm -d -p 4096:4096 -p 4097:4097 \
  -v tc-agent-test-state:/var/lib/delegation-endpoint \
  -v tc-agent-test-profile:/root/.tinycloud \
  --name tc-agent-test tc-agent

# 2. Agent DID appears in logs (printed by the sidecar on boot)
docker logs tc-agent-test | grep "Agent DID:"

# 3. Health check
curl -sS http://localhost:4097/health
# -> {"ok":true,"agentDid":"did:pkh:eip155:1:0x…","hasDelegation":false, …}

# 4. tc is installed and sees no profile yet
docker exec tc-agent-test tc --version

# 5. Clean up
docker rm -f tc-agent-test && docker volume rm tc-agent-test-state tc-agent-test-profile
```
