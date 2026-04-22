# @tinyboilerplate/cli — `listen` CLI

A Bun-compiled single-file binary that bridges an agent environment (e.g. OpenCode in Docker) to a user's TinyCloud space. The CLI loads a persistent agent private key, reads a user-granted `PortableDelegation` from disk, and runs KV/SQL operations against `node.tinycloud.xyz`.

Part of [TC-1344](https://linear.app/tinycloudlabs/issue/TC-1344) — subtask [TC-1351](https://linear.app/tinycloudlabs/issue/TC-1351).

## Install & build

From the listen repo root:

```bash
bun install
cd packages/cli
bun run build              # typecheck only
bun run build:binary       # produce dist/listen for current platform
bun run build:all-targets  # linux/darwin × x64/arm64
```

## Subcommands

### Agent identity

```
listen agent init    # generate + persist the agent private key (idempotent)
listen agent did     # print the agent's did:pkh
```

### Data ops (require a delegation on disk)

```
listen kv list [--prefix <p>]
listen kv get <key> [--raw]
listen kv put <key> <value>          # value via arg; pass "-" or omit to read from stdin
listen kv del <key>
listen sql query "<sql>" [--param <p>]...
listen sql execute "<sql>" [--param <p>]...
```

### Diagnostics

```
listen doctor        # checks agent key, delegation file + expiry, TC node reachability
```

All data-op commands emit one JSON object to stdout on success. Errors emit `{"error":{"code":"...","message":"..."}}` to stderr and exit non-zero. Error codes: `no_delegation`, `expired_delegation`, `no_agent_key`, `tinycloud_unreachable`, `permission_denied`, `invalid_args`, `internal`.

## Environment

| Var | Default |
|---|---|
| `TINYCLOUD_HOST` | `https://node.tinycloud.xyz` |
| `LISTEN_AGENT_KEY_PATH` | `/root/.listen/agent-key.json` |
| `LISTEN_DELEGATION_PATH` | `/root/.listen/delegation.txt` |
| `LISTEN_SESSION_CACHE_PATH` | `/tmp/listen-cli-session.json` |

## Architecture

- **Agent identity**: wallet-mode Ethereum key (32 random bytes, 0x-hex) persisted as `{"privateKey":"0x..."}`. Produces a stable `did:pkh:eip155:1:0x...` that survives container restarts — required because the user pastes this DID into the frontend Connect Agent dialog.
- **Delegation activation**: read serialized delegation → `deserializeDelegation` → `node.useDelegation` → dispatch subcommand against `access.kv` / `access.sql`. Wrapped in `withSessionRefresh` for transparent retry on 401.
- **Session cache** (`LISTEN_SESSION_CACHE_PATH`): fingerprint-only. The cache stores `{delegationFingerprint, activatedAt, agentDid}`. On hit (same fingerprint, activated within 50 min), the pre-flight expiry check is skipped; we still call `useDelegation` in-process (`DelegatedAccess` is live SDK state and can't be serialized).

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
export LISTEN_AGENT_KEY_PATH=/tmp/listen-cli-integration/agent-key.json
export LISTEN_DELEGATION_PATH=/tmp/listen-cli-integration/delegation.txt
export LISTEN_SESSION_CACHE_PATH=/tmp/listen-cli-integration/session.json
./dist/listen agent init

# 2. From a separate TinyCloudWeb session (or the root e2e-test.ts harness),
#    create a delegation to the agent DID and write the serialized string to
#    $LISTEN_DELEGATION_PATH.
#
#    See ../../e2e-test.ts for the `user.createDelegation(...)` + `serializeDelegation(...)`
#    pattern. The CLI works identically to the backend middleware flow.

# 3. Smoke the CLI
./dist/listen doctor
./dist/listen kv put items/test '{"title":"hello"}'
./dist/listen kv get items/test
./dist/listen kv list --prefix items/
./dist/listen sql query "SELECT 1"
./dist/listen kv del items/test
```

## Out of scope for this ticket

- `hooks_*` subcommands — public node runs v1.2.1 without `/hooks/*`.
- Daemon mode (long-running socket between OpenCode and the CLI).
- The delegation-receiving HTTP server on `:4097` — lives in the Docker image (TC-1353).
- Frontend Connect Agent dialog (TC-1354).
