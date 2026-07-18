# App Automated Testing

Listen has three browser automation paths:

1. A CI-safe app smoke test that restores a local session and mocks backend HTTP.
2. An opt-in OpenKey passkey harness for real local or production sign-in.
3. A local full-stack hooks test using a disposable Ethereum owner key.

## CI-safe smoke test

Run the smoke test from the repository root:

```bash
bun install
bun run test:app:install
bun run test:app
```

`bun run test:app` builds the shared client package first, then starts the frontend dev server unless
`APP_URL` is set. The test seeds the existing `listen:session` localStorage record, mocks `/api/*`
responses with Playwright routes, and clicks through:

- restored authenticated shell
- inbox conversation list
- transcript detail
- chat route
- connections route
- source setup reconnect state

This path does not call OpenKey, TinyCloud, or a real backend, and it does not require secrets. It is
intended to catch app-shell regressions in CI while keeping production credentials out of the repo.

To point the smoke test at an already-running frontend:

```bash
APP_URL=http://127.0.0.1:5173 bun run test:app
```

When `APP_URL` is set, the Playwright config does not start Vite.

## Local TinyCloud hooks E2E

Run the full local stack from the repository root:

```bash
bun install
bun run test:app:install
bun run test:hooks:e2e
```

The hooks harness starts a fresh TinyCloud node, the Listen backend, and the
frontend. Before exercising the browser-style signer and backend delegation,
it explicitly bootstraps the disposable Ethereum owner account with the
non-interactive private-key client. This provisions the canonical account
spaces and schemas once, matching the server-provisioned account expected by
interactive OpenKey signers without requiring repeated wallet prompts in the
test.

The test then verifies SIWE authentication, backend delegation activation,
conversation import, hook ticket and event-stream setup, and a live inbox
update without reloading the page. Override `LISTEN_E2E_OWNER_PRIVATE_KEY` only
with a disposable local test key; never use a production owner key.

`LISTEN_E2E_OWNER_PRIVATE_KEY` is required. Store a throwaway Ethereum key in
the local or CI secret manager and expose it only to the test process; the
harness performs the manual bootstrap before starting browser authentication.
The key must never control production funds or a production TinyCloud account.

To exercise browser recovery after a node loses the persisted parent
registration, run:

```bash
bun run test:recovery:e2e
```

This serial Playwright test follows the TinyCloud browser E2E guide: it injects
a test-only EIP-1193 wallet before navigation, announces it with EIP-6963, and
selects it through OpenKey's real external-wallet UI. Production code receives
no private key or signer bypass. The harness manually bootstraps the owner,
imports a transcript through Listen's normal delegation flow, removes only that
browser session's root registration from the owned local node, and restarts the
node without deleting application data. It then verifies the restored session
is rejected, one user-initiated reconnect creates a different parent, and
authorized reads and writes still work. The targeted database mutation is a
test-only simulation of the deploy-time invariant break and must never run
against a remote node.

## Real OpenKey passkey harness

The existing `test/setup-passkey.ts` and `test/run-signin.ts` scripts exercise the real OpenKey flow
with Chromium's virtual WebAuthn authenticator.

Initial operator setup:

```bash
cd test
bun run setup
```

This opens a headed browser. Sign up or sign in to OpenKey with a test account, complete the app
sign-in once, then press Enter in the terminal. The script stores virtual authenticator credentials in
`test/.passkey.json`, which is ignored by git.

Repeat sign-in run:

```bash
cd test
APP_URL=https://listen.localhost \
BACKEND_URL=https://api.listen.localhost \
bun run signin
```

Optional environment:

- `APP_URL`: frontend URL. Use `https://listen.tinycloud.xyz` only when intentionally testing production.
- `BACKEND_URL`: backend API URL used for post-sign-in backend checks.
- `OPENKEY_HOST`: OpenKey host for setup. Defaults to `https://openkey.so`.
- `TEST_EMAIL`: operator-owned OpenKey test email for setup.
- `FIREFLIES_API_KEY`: optional; if present, `run-signin.ts` also verifies Fireflies setup and sync.
- `HEADLESS=1`: runs the repeat sign-in script without opening a visible browser.
- `KEEP_OPEN=1`: leaves the browser open after `run-signin.ts`.

Do not commit `test/.passkey.json`, Playwright traces, browser profiles, API keys, or production
credentials. Production OpenKey testing should use an operator-owned test account and a disposable
credential generated outside CI.

## Notes

- `ncli` was not available on PATH during TC-1384 implementation.
- The smoke test intentionally uses semantic waits and role/text locators instead of fixed sleeps.
- The real OpenKey harness can still fail on external service state, passkey account state, or backend
  credentials; treat it as an opt-in integration test, not the default CI gate.
