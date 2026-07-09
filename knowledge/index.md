---
type: TinyCloud App
title: Listen
description: Sync Fireflies, Granola, Soundcore, Otter, and Google Meet transcripts into a TinyCloud space.
tinycloud:
  app: xyz.tinycloud.listen
  profile: tinycloud.app.v1
  containsSecretValue: false
---

# Listen

Listen normalizes meeting transcripts from external providers (Fireflies,
Granola, Soundcore, Otter, Google Meet) into the owner's `applications` space
under `xyz.tinycloud.listen/conversations`. A browser app and an Express
backend share the same TinyCloud app id; the backend holds a delegated grant so
it can sync on the user's behalf.

## Resources

- [Resources](resources.md) - Implicit defaults plus the explicit SQL and hooks grants.
- [KV](kv.md) - Key families under the app prefix (delegations, webhook state, transcript blobs, sync state).
- [SQL](sql.md) - The `conversations` database and its schema-seeding split.
- [Secrets](secrets.md) - The ten secret references and their shapes (references only).
- [Operations](operations.md) - The delegation lifecycle: grant, 7-day TTL, silent renewal, sign-out revoke, and the policy-rotation re-grant-wave property.
