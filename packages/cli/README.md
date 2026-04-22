# @tinyboilerplate/cli — `tc-agent`

A Bun-compiled single-file binary that bridges an agent environment (e.g. OpenCode in Docker) to a user's TinyCloud space. The CLI loads a persistent agent private key, reads a user-granted `PortableDelegation` from disk, and runs KV/SQL operations against `node.tinycloud.xyz`.

The package is **app-agnostic**: any tinyboilerplate-based app can reuse this CLI and its Docker image by mounting its own `CLAUDE.md` into `/workspace/`. See `examples/conversation-sync/` for a concrete consumer (listen).

Originated in [TC-1344](https://linear.app/tinycloudlabs/issue/TC-1344) / [TC-1351](https://linear.app/tinycloudlabs/issue/TC-1351).

## Install & build

From the repo root:

```bash
bun install
cd packages/cli
bun run build              # typecheck only
bun run build:binary       # produce dist/tc-agent for current platform
bun run build:all-targets  # linux/darwin × x64/arm64
```

## Subcommands

### Agent identity

```
tc-agent agent init    # generate + persist the agent private key (idempotent)
tc-agent agent did     # print the agent's did:pkh
```

### Data ops (require a delegation on disk)

```
tc-agent kv list [--prefix <p>]
tc-agent kv get <key> [--raw]
tc-agent kv put <key> <value>           # value via arg; pass "-" or omit to read from stdin
tc-agent kv del <key>
tc-agent sql query "<sql>" [--param <p>]...
tc-agent sql execute "<sql>" [--param <p>]...
```

### Diagnostics

```
tc-agent doctor        # checks agent key, delegation file + expiry, TC node reachability
```

All data-op commands emit one JSON object to stdout on success. Errors emit `{"error":{"code":"...","message":"..."}}` to stderr and exit non-zero. Error codes: `no_delegation`, `expired_delegation`, `no_agent_key`, `tinycloud_unreachable`, `permission_denied`, `invalid_args`, `internal`.

## Environment

| Var | Default | Meaning |
|---|---|---|
| `TINYCLOUD_HOST` | `https://node.tinycloud.xyz` | TinyCloud node URL |
| `TC_AGENT_PREFIX` | `tc-agent` | Wallet-mode sub-session prefix. Override per-app to avoid space-namespace collisions if multiple apps share one node. |
| `TC_AGENT_KEY_PATH` | `/root/.tc-agent/agent-key.json` | Persisted agent private key |
| `TC_AGENT_DELEGATION_PATH` | `/root/.tc-agent/delegation.txt` | Serialized `PortableDelegation` written by the frontend |
| `TC_AGENT_SESSION_CACHE_PATH` | `/tmp/tc-agent-session.json` | Fingerprint-only cache keyed by delegation SHA-256 |

## Using this CLI in your app

1. Build the base Docker image from `packages/cli/docker/Dockerfile`.
2. In your app's compose/run, bind-mount your app-specific `CLAUDE.md` at `/workspace/CLAUDE.md`. That file documents your app's SQL schema and KV key layout for the agent.
3. Optionally set `TC_AGENT_PREFIX` to an app-specific value if multiple apps share one TC node.

See `examples/conversation-sync/docker-compose.yml` and `examples/conversation-sync/agent/CLAUDE.md` for a working example.

## Architecture

- **Agent identity**: wallet-mode Ethereum key (32 random bytes, 0x-hex) persisted as `{"privateKey":"0x..."}`. Produces a stable `did:pkh:eip155:1:0x...` that survives container restarts — required because the user pastes this DID into the frontend Connect Agent dialog.
- **Delegation activation**: read serialized delegation → `deserializeDelegation` → `node.useDelegation` → dispatch subcommand against `access.kv` / `access.sql`. Wrapped in `withSessionRefresh` for transparent retry on 401.
- **Session cache** (`TC_AGENT_SESSION_CACHE_PATH`): fingerprint-only. The cache stores `{delegationFingerprint, activatedAt, agentDid}`. On hit (same fingerprint, activated within 50 min), the pre-flight expiry check is skipped; we still call `useDelegation` in-process (`DelegatedAccess` is live SDK state and can't be serialized).

## Running from source

```bash
bun run src/index.ts agent init
bun run src/index.ts kv list --prefix items/
```

## Tests

```bash
bun test
```

Unit tests cover `session-cache` (fingerprint + TTL), `identity` (key generation, idempotent ensure, perms), `output` (`mapError` categorization), and `delegation` (fingerprint determinism). They do not hit the network.

## Manual integration harness

The full round-trip test (real TC node + real delegation) is intentionally manual — it creates live state on `node.tinycloud.xyz`.

```bash
# 1. Generate an agent key at a known path
export TC_AGENT_KEY_PATH=/tmp/tc-agent-integration/agent-key.json
export TC_AGENT_DELEGATION_PATH=/tmp/tc-agent-integration/delegation.txt
export TC_AGENT_SESSION_CACHE_PATH=/tmp/tc-agent-integration/session.json
./dist/tc-agent agent init

# 2. From a separate TinyCloudWeb session (or the root e2e-test.ts harness),
#    create a delegation to the agent DID and write the serialized string to
#    $TC_AGENT_DELEGATION_PATH.

# 3. Smoke the CLI
./dist/tc-agent doctor
./dist/tc-agent kv put items/test '{"title":"hello"}'
./dist/tc-agent kv get items/test
./dist/tc-agent kv list --prefix items/
./dist/tc-agent sql query "SELECT 1"
./dist/tc-agent kv del items/test
```

## Out of scope for this ticket

- `hooks_*` subcommands — public node runs v1.2.1 without `/hooks/*`.
- Daemon mode (long-running socket between OpenCode and the CLI).
- The delegation-receiving HTTP server on `:4097` — lives in the Docker image (TC-1353).
- Frontend Connect Agent dialog (TC-1354).
- Publishing as a standalone `@tinycloud/agent-cli` npm package — that's Layer 2.
