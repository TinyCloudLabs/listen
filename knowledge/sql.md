---
type: TinyCloud SQL
title: SQL
description: The conversations database and its schema-seeding split.
tinycloud:
  app: xyz.tinycloud.listen
  service: sql
  profile: tinycloud.app.v1
  sensitivity: user-data
  containsSecretValue: false
---

# SQL

Database: `conversations`

Engine: TinyCloud SQL

Purpose: Stores normalized conversation records synced from external transcript
providers. Transcript content may be inline on the conversation row or mirrored
to KV for compatibility with transcript readers.

## Required capabilities

| Capability | Why |
| --- | --- |
| `tinycloud.sql/read` | Read normalized conversation records. |
| `tinycloud.sql/write` | Insert and update conversation records. |
| `tinycloud.sql/schema` | Create and migrate the conversations schema (`ensureSchema`). |

## Schema seeding (hybrid: backend-primary, browser fallback)

The conversations schema is seeded in two places:

- Backend-primary: the delegated backend runs `ensureSchema` to seed fresh
  accounts. Its delegation carries `tinycloud.sql/schema` (PR #97 / TC-136).
- Browser fallback: the browser seeds the schema on first read when the backend
  seeder is unavailable, using its own `tinycloud.sql/schema` grant.

Both paths require `tinycloud.sql/schema`. Do not run cold DDL in request paths;
seed during install/startup or first-read readiness checks.
