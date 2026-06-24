# Listen Project Guide

Listen is a TinyCloud transcript workspace. The runnable app lives at the repo
root:

- `frontend/` is the React + Vite browser app.
- `backend/` is the Express + Bun API.
- `packages/client`, `packages/core`, and `packages/server` are internal shared packages.
- `packages/agent-runtime` is the optional local OpenCode agent sidecar.

Use root scripts:

```bash
bun run dev
bun run dev:portless
bun run build
bun run test
```

The TinyCloud app manifest is `manifest.json`, with app id `xyz.tinycloud.listen`.
Normalized conversations are written to the owner's `applications` space under
`xyz.tinycloud.listen/conversations`; transcript content may be inline on the
conversation row or mirrored to KV for compatibility with transcript readers.

Keep this repo Listen-specific. Do not add generic starter examples back into the root workspace.
