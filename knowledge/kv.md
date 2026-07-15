---
type: TinyCloud KV
title: KV
description: Key families under the app prefix.
tinycloud:
  app: xyz.tinycloud.listen
  service: kv
  profile: tinycloud.app.v1
  sensitivity: user-data
  containsSecretValue: false
---

# KV

All keys live under the app prefix `xyz.tinycloud.listen/`.

## Key families

| Prefix | Space | Purpose | Agent notes |
| --- | --- | --- | --- |
| `delegations/{address}` | backend | Stored backend-delegation rows, keyed by wallet address. Also holds sign-out revoke tombstones (an expired row with empty `serialized` and no actions). | Do not overwrite; the backend manages these. A row whose `expiresAt` is in the past is inactive (revoked or expired). |
| `webhooks/config/*` | app | Per-user webhook subscription config for provider push. | Preserve unknown fields. |
| Transcript blobs | app | Transcript content mirrored from conversation rows for reader compatibility. | Rebuildable from the `conversations` SQL rows. |
| Sync state | app | Per-provider sync cursors and last-sync markers. | Safe to reset; a full re-sync repopulates. |

## Notes

- The `delegations/{address}` tombstone is a durable-revoke mechanism: `kv.put`
  overwrites succeed where `kv.delete` silently no-ops on overwritten keys
  (TC-140), so sign-out overwrites the row with an already-expired record.
- Expiry is checked before any policy-hash check at every consumer, so an
  expired row (revoked or naturally expired) is terminal regardless of its
  policy hash.
