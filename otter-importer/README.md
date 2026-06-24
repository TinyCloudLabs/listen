# otter-importer

CLI importer for **Otter.ai** transcripts. It lists the conversations your Otter
account can see (owned + shared), pulls each diarized transcript, normalizes it,
and publishes it to TinyCloud as a Listen `conversation` — the same SQL + KV shape
Listen's own Fireflies / Google Meet / Granola sources write.

Otter has **no public API**. This reuses the session cookie from a browser you're
already logged into, so the cookie stays on **your machine** — nothing in this tool
needs an Otter password or a server-side credential.

## Install

```sh
bun install
bun link        # exposes `otter-importer`
```

## Auth

1. **TinyCloud** — authenticate the `tc` CLI for your space (see the `listen` /
   `listen-importer` docs). `otter-importer auth` should print your status.
2. **Otter cookie** — grab `sessionid` + `csrftoken` from a logged-in otter.ai session:
   - `python3 scripts/dump_cookie.py` (needs `pip install browser_cookie3`, Chrome), or
   - browser devtools: otter.ai → Application → Cookies → copy `sessionid` and `csrftoken`.

   ```sh
   otter-importer cookie --sessionid <sessionid> --csrftoken <csrftoken>
   ```

   Stores `~/.otter-importer/cookie.json` (mode 600). `OTTER_SESSIONID` /
   `OTTER_CSRFTOKEN` env vars work too.

## Use

```sh
otter-importer init
otter-importer scan                 # list speeches (owned+shared) into the local db
otter-importer pull                 # fetch + parse transcripts for new/changed speeches
otter-importer upload               # publish them to TinyCloud (Listen conversations)
otter-importer status
```

`scan` re-detects edited transcripts (via Otter's `transcript_updated_at`), so the
loop is incremental and resumable.

## What it writes

For each Otter speech, a Listen conversation:

- `conversation` row in `xyz.tinycloud.listen/conversations` (`source = "otter"`,
  `source_id = "otter:<otid>"`, with inline `transcript_json` / `transcript_text`),
- `participant` rows (one per distinct speaker name),
- a transcript blob in KV at `xyz.tinycloud.listen/transcript/otter-<otid>`.

Transcripts use Otter's diarized export (real speaker names + per-segment start
times). Frames and audio are out of scope for v1 — this is transcript-first.

## Layout

```
src/cli.ts          commands
src/otter.ts        Otter unofficial-API client (user, speeches, bulk_export)
src/cookie.ts       cookie resolution + storage
src/transcript.ts   diarized .txt -> normalized sentences
src/db.ts           local SQLite state (bun:sqlite)
src/upload.ts       publish to TinyCloud via the tc CLI
```
