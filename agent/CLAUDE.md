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

Database name in the manifest app space: `xyz.tinycloud.listen/conversations`.
Use `--space applications --db xyz.tinycloud.listen/conversations` when reading
the Listen store.

### `conversation`
| column | type | notes |
|---|---|---|
| `id` | TEXT PK | |
| `title` | TEXT | |
| `source` | TEXT | Fireflies, Granola, Google Meet, manual import, Soundcore Sync, or importer-written values such as `recorder`, `voice_memos`, and `voxterm` |
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
| `xyz.tinycloud.listen/transcript/{id}` | full transcript JSON (segments, timings, speakers), used for KV compatibility |
| inline `conversation.transcript_json` / `conversation.transcript_text` | transcript content for current Listen sync rows |
| TinyCloud Secrets `vault/secrets/<NAME>` | provider keys and captured source credentials such as Fireflies, Granola, and Soundcore — **do not echo, never log** |
| `/app.webhooks/*` | webhook configuration — don't mutate unless the user asks |

## Typical flows

- **"Summarize my most recent meeting"**: `tc sql query "SELECT * FROM conversation ORDER BY started_at DESC LIMIT 1" --space applications --db xyz.tinycloud.listen/conversations` to get the id, then prefer inline transcript columns when present and fall back to `tc kv get xyz.tinycloud.listen/transcript/<id> --space applications`.
- **"List meetings from last week"**: `tc sql query "SELECT id, title, started_at FROM conversation WHERE started_at >= '2026-04-16' ORDER BY started_at DESC" --space applications --db xyz.tinycloud.listen/conversations` (substitute dates).
- **"Who was in that meeting?"**: `tc sql query "SELECT name, email FROM participant WHERE conversation_id = ?" --params '["<id>"]' --space applications --db xyz.tinycloud.listen/conversations`.
