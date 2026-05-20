# App Automated Testing

Listen has two browser automation paths:

1. A CI-safe app smoke test that restores a local session and mocks backend HTTP.
2. An opt-in OpenKey passkey harness for real local or production sign-in.

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
