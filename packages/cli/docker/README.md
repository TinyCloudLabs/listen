# tc-agent Docker image

Part of [TC-1344](https://linear.app/tinycloudlabs/issue/TC-1344) / [TC-1353](https://linear.app/tinycloudlabs/issue/TC-1353). An app-agnostic Docker image bundling:

- OpenCode (web UI on `:4096`)
- The `tc-agent` CLI (from `packages/cli`) as `/usr/local/bin/tc-agent`
- A tiny `delegation-endpoint` HTTP server on `:4097` that receives a serialized `PortableDelegation` from an app's frontend and writes it to `/root/.tc-agent/delegation.txt`

**App-specific schema docs live outside this image.** Apps mount their own `CLAUDE.md` at `/workspace/CLAUDE.md` to teach the agent about their SQL tables and KV key layout — see `examples/conversation-sync/` for a listen example.

## Build

From the repo root (so the Docker build context sees the workspace):

```bash
docker build -f packages/cli/docker/Dockerfile -t tc-agent .
```

## Run

```bash
docker run --rm -it \
  -p 4096:4096 -p 4097:4097 \
  -v tc-agent-state:/root/.tc-agent \
  -v /absolute/path/to/your/CLAUDE.md:/workspace/CLAUDE.md:ro \
  -e OPENCODE_ZEN_API_KEY=sk-... \
  tc-agent
```

Or, from any `examples/<app>/` that provides a `docker-compose.yml` and `agent/CLAUDE.md`:

```bash
cp .env.example .env       # fill in OPENCODE_ZEN_API_KEY
docker compose up
```

## First-boot flow

1. Entrypoint runs `tc-agent agent init` (generates `/root/.tc-agent/agent-key.json` on first run, idempotent afterwards).
2. Container logs print the agent DID:
   ```
   Agent DID: did:pkh:eip155:1:0xD10bc910…
   ```
3. Copy that DID, open your app, click **Connect Agent**, paste the DID.
4. The app's frontend POSTs the serialized delegation to `http://localhost:4097/delegation` — `delegation-endpoint` writes it to `/root/.tc-agent/delegation.txt`.
5. Open `http://localhost:4096` (OpenCode web UI) and start chatting.

## Configuration

| Env var | Default | Meaning |
|---|---|---|
| `OPENCODE_ZEN_API_KEY` | *(required for model access)* | OpenCode Zen key for the configured model |
| `TINYCLOUD_HOST` | `https://node.tinycloud.xyz` | Passed to the CLI |
| `TC_AGENT_PREFIX` | `tc-agent` | Override per-app if multiple apps share one TC node |
| `TC_AGENT_DELEGATION_PATH` | `/root/.tc-agent/delegation.txt` | Where `delegation-endpoint` writes, where CLI reads |

## Swapping the model

The OpenCode model ID is pinned in `opencode.json` to `opencode-zen/minimax-m1`. If that ID changes in the Zen catalog, edit `packages/cli/docker/opencode.json` and rebuild.

## Ports

| Port | Service |
|---|---|
| `4096` | OpenCode web UI (the agent) |
| `4097` | `delegation-endpoint` (receives delegations from an app's frontend) |

## Security

`:4097` is localhost-only (mapped to host's `127.0.0.1:4097` via `-p`) and has no auth. It accepts only JSON bodies of the form `{"serialized": "<PortableDelegation>"}` and writes them straight to disk. Rationale: the endpoint at worst DoSes the container if abused; the delegations it accepts must be signed by the user's wallet, so an attacker can't forge access this way. Multi-user or cloud deployments need auth here (see TC-1356).

## Verifying without a model key

You can validate the bootstrap without hitting any LLM:

```bash
# 1. Build + run
docker build -f packages/cli/docker/Dockerfile -t tc-agent .
docker run --rm -d -p 4096:4096 -p 4097:4097 -v tc-agent-test:/root/.tc-agent --name tc-agent-test tc-agent

# 2. Agent DID should appear in logs
docker logs tc-agent-test | grep "Agent DID:"

# 3. Endpoint accepts a POST
curl -sS -X POST http://localhost:4097/delegation \
  -H 'Content-Type: application/json' \
  -d '{"serialized":"dummy-for-shape-test"}'
# -> {"ok":true,"bytes":21}

# 4. File was written
docker exec tc-agent-test cat /root/.tc-agent/delegation.txt
# -> dummy-for-shape-test

# 5. Clean up
docker rm -f tc-agent-test && docker volume rm tc-agent-test
```
