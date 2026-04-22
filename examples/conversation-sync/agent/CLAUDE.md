# listen — your own TinyCloud space

You can read and write the user's listen data (meeting transcripts, conversations) through the `tc-agent` CLI. Every command prints JSON to stdout; pipe to `jq` to extract fields.

If a command returns `{"error":{"code":"no_delegation",...}}`, the user has not yet granted you access. Ask them to click **Connect Agent** in listen.

## Commands

```
tc-agent kv list [--prefix <p>]        -> {"keys":[...]}
tc-agent kv get <key>                   -> {"value":<v>}
tc-agent kv put <key> <value>           -> {"ok":true}
tc-agent kv del <key>                   -> {"ok":true}
tc-agent sql query "<sql>" [--param p]  -> {"columns":[...],"rows":[...],"rowCount":n}
tc-agent sql execute "<sql>"            -> {"changes":n,"lastInsertRowId":n}
tc-agent doctor                         -> health check (exit 0 if all good)
```

## SQL schema

Database name: `conversations`.

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

- **"Summarize my most recent meeting"**: `tc-agent sql query "SELECT * FROM conversation ORDER BY started_at DESC LIMIT 1"` to get the id, then `tc-agent kv get /app.conversations/transcript/<id>` for the full transcript.
- **"List meetings from last week"**: `tc-agent sql query "SELECT id, title, started_at FROM conversation WHERE started_at >= '2026-04-15' ORDER BY started_at DESC"` (substitute dates).
- **"Who was in that meeting?"**: `tc-agent sql query "SELECT name, email FROM participant WHERE conversation_id = ?" --param <id>`.
