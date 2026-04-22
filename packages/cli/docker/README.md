# listen-agent Docker image

Part of [TC-1344](https://linear.app/tinycloudlabs/issue/TC-1344) / [TC-1353](https://linear.app/tinycloudlabs/issue/TC-1353). A Docker image bundling:

- OpenCode (web UI on `:4096`)
- The `listen` CLI (from `packages/cli`) as `/usr/local/bin/listen`
- A tiny `delegation-endpoint` HTTP server on `:4097` that receives a serialized `PortableDelegation` from the listen frontend and writes it to `/root/.listen/delegation.txt`

## Build

From the listen repo root (so the Docker build context sees the workspace):

```bash
docker build -f packages/cli/docker/Dockerfile -t listen-agent .
```

## Run

```bash
docker run --rm -it \
  -p 4096:4096 -p 4097:4097 \
  -v listen-agent-state:/root/.listen \
  -e OPENCODE_ZEN_API_KEY=sk-... \
  listen-agent
```

Or, from `examples/conversation-sync/`:

```bash
cp .env.example .env       # fill in OPENCODE_ZEN_API_KEY
docker compose up
```

## First-boot flow

1. Entrypoint runs `listen agent init` (generates `/root/.listen/agent-key.json` on first run, idempotent afterwards).
2. Container logs print the agent DID:
   ```
   Agent DID: did:pkh:eip155:1:0xD10bc910…
   ```
3. Copy that DID, open listen, click **Connect Agent**, paste the DID.
4. Listen's frontend POSTs the serialized delegation to `http://localhost:4097/delegation` — `delegation-endpoint` writes it to `/root/.listen/delegation.txt`.
5. Open `http://localhost:4096` (OpenCode web UI) and start chatting.

## Configuration

| Env var | Default | Meaning |
|---|---|---|
| `OPENCODE_ZEN_API_KEY` | *(required for model access)* | OpenCode Zen key for the configured model |
| `TINYCLOUD_HOST` | `https://node.tinycloud.xyz` | Passed to the CLI |
| `LISTEN_DELEGATION_PATH` | `/root/.listen/delegation.txt` | Where `delegation-endpoint` writes, where CLI reads |

## Swapping the model

The OpenCode model ID is pinned in `opencode.json` to `opencode-zen/minimax-m1`. If that ID changes in the Zen catalog, edit `packages/cli/docker/opencode.json` and rebuild.

## Ports

| Port | Service |
|---|---|
| `4096` | OpenCode web UI (the agent) |
| `4097` | `delegation-endpoint` (receives delegations from listen's frontend) |

## Security

`:4097` is localhost-only (mapped to host's `127.0.0.1:4097` via `-p`) and has no auth. It accepts only JSON bodies of the form `{"serialized": "<PortableDelegation>"}` and writes them straight to disk. Rationale: the endpoint at worst DoSes the container if abused; the delegations it accepts must be signed by the user's wallet, so an attacker can't forge access this way. Multi-user or cloud deployments need auth here (see TC-1356).

## Verifying without a model key

You can validate the bootstrap without hitting any LLM:

```bash
# 1. Build + run
docker build -f packages/cli/docker/Dockerfile -t listen-agent .
docker run --rm -d -p 4096:4096 -p 4097:4097 -v listen-test:/root/.listen --name listen-agent-test listen-agent

# 2. Agent DID should appear in logs
docker logs listen-agent-test | grep "Agent DID:"

# 3. Endpoint accepts a POST
curl -sS -X POST http://localhost:4097/delegation \
  -H 'Content-Type: application/json' \
  -d '{"serialized":"dummy-for-shape-test"}'
# -> {"ok":true,"bytes":21}

# 4. File was written
docker exec listen-agent-test cat /root/.listen/delegation.txt
# -> dummy-for-shape-test

# 5. Clean up
docker rm -f listen-agent-test && docker volume rm listen-test
```
