# listen — your own TinyCloud space

You can read and write the user's listen data (meeting transcripts, conversations) through the official `tc` CLI. Every command prints JSON to stdout; pipe to `jq` to extract fields.

If a command exits non-zero with an `AUTH_REQUIRED` error, the user has not yet granted you access (or the delegation was revoked). Ask them to click **Connect Agent** in listen.

## Commands

```
tc kv list [--prefix <p>]              -> {"keys":[...],"count":n,"prefix":...}
tc kv get <key> [--raw]                 -> {"key":...,"data":<v>,"metadata":{...}}
tc kv put <key> <value>                 -> {"key":...,"written":true}
tc kv delete <key>                      -> {"key":...,"deleted":true}
tc sql query "<sql>" [--params '[...]'] -> {"columns":[...],"rows":[...],"rowCount":n}
tc sql execute "<sql>"                  -> {"changes":n,"lastInsertRowId":n}
tc doctor                               -> health check (exit 0 if all good)
```

Notes:
- `--params` takes a JSON array of bind parameters, e.g. `--params '["abc123"]'`. Not the `--param x` multi-flag syntax of some earlier tools.
- Piping values from stdin: `echo '{"foo":1}' | tc kv put somekey --stdin`.

## SQL schema

Database name: `conversations`. If `tc sql query` defaults to the wrong database, append `--db conversations`.

### `conversation`
| column | type | notes |
|---|---|---|
| `id` | TEXT PK | |
| `title` | TEXT | |
| `source` | TEXT | `'fireflies'` or `'google-meet'` |
| `source_id` | TEXT | |
| `source_url` | TEXT | link to the original meeting |
| `started_at` | TEXT | ISO-8601 |
| `ended_at` | TEXT | ISO-8601 |
| `duration_secs` | REAL | |
| `summary` | TEXT | |
| `metadata` | TEXT | JSON blob |
| `created_at` | TEXT | |
| `updated_at` | TEXT | |

### `participant`
| column | type | notes |
|---|---|---|
| `id` | TEXT PK | |
| `conversation_id` | TEXT FK → `conversation.id` | |
| `name` | TEXT | |
| `email` | TEXT | |
| `speaker_label` | TEXT | how the speaker appears in the transcript |

## KV layout

| key pattern | contents |
|---|---|
| `/app.conversations/transcript/{id}` | full transcript JSON (segments, timings, speakers) |
| `/app.conversations/config/fireflies-key` | user's Fireflies API key — **do not echo, never log** |
| `/app.webhooks/*` | webhook configuration — don't mutate unless the user asks |

## Typical flows

- **"Summarize my most recent meeting"**: `tc sql query "SELECT * FROM conversation ORDER BY started_at DESC LIMIT 1"` to get the id, then `tc kv get /app.conversations/transcript/<id>` for the full transcript.
- **"List meetings from last week"**: `tc sql query "SELECT id, title, started_at FROM conversation WHERE started_at >= '2026-04-16' ORDER BY started_at DESC"` (substitute dates).
- **"Who was in that meeting?"**: `tc sql query "SELECT name, email FROM participant WHERE conversation_id = ?" --params '["<id>"]'`.
