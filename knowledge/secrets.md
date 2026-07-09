---
type: TinyCloud Secrets
title: Secrets
description: Secret references used by Listen (references only, no values).
tinycloud:
  app: xyz.tinycloud.listen
  service: secrets
  profile: tinycloud.app.v1
  sensitivity: secret-reference
  containsSecretValue: false
---

# Secrets

Listen declares ten secret references in `manifest.json`. These are references
only; no plaintext values live here or in the app. The backend reads them via
its delegation (`get`, and `put`/`del` for the two writable scoped tokens) and
decrypts them through the user's default encryption network.

## Read-only provider keys

| Name | Actions |
| --- | --- |
| `FIREFLIES_API_KEY` | `read` |
| `GRANOLA_API_KEY` | `read` |
| `SOUNDCORE_SESSION` | `read` |
| `SOUNDCORE_AUTH_TOKEN` | `read` |
| `SOUNDCORE_UID` | `read` |
| `SOUNDCORE_OPENUDID` | `read` |
| `ASSEMBLYAI_API_KEY` | `read` |
| `DEEPGRAM_API_KEY` | `read` |

## Scoped read/write tokens

| Name | Scope | Actions |
| --- | --- | --- |
| `GOOGLE_MEET_TOKENS` | `listen` | `read`, `write`, `delete` |
| `OTTER_COOKIE` | `listen` | `read`, `write`, `delete` |

## Notes

- The manifest `read`/`write`/`delete` verbs map to the backend grant verbs
  `get`/`put`/`del`. The two vocabularies are kept consistent by
  `BACKEND_SECRET_GRANTS` and enforced by a manifest-consistency test.
- Never write plaintext secret values into this bundle
  (`containsSecretValue: false`).
