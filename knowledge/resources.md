---
type: TinyCloud Resources
title: Resources
description: Implicit defaults plus the explicit SQL and hooks grants Listen requests.
tinycloud:
  app: xyz.tinycloud.listen
  profile: tinycloud.app.v1
  containsSecretValue: false
---

# Resources

Listen's `manifest.json` sets `defaults: true`, so the app receives the
implicit app-scoped defaults in addition to its explicit permission grants.

## Implicit defaults (`defaults: true`)

- App-scoped KV under `xyz.tinycloud.listen/*`: `get`, `put`, `del`, `list`, `metadata`.
- App-scoped SQL: `read`, `write`.
- Capability introspection: `tinycloud.capabilities/read`.

## Explicit grants (`manifest.json` `permissions`)

- `tinycloud.sql` on `conversations`: `read`, `write`, `schema`. The `schema`
  action lets the browser seed the conversations schema on first read when the
  backend seeder is unavailable. The backend delegation also carries
  `tinycloud.sql/schema` (added in PR #97 / TC-136) so it can seed fresh
  accounts.
- `tinycloud.hooks` subscribe on `sql/conversations/conversation` (with
  `skipPrefix`): live conversation-row write events when hooks are enabled.

## Backend delegation

The backend receives a separate, user-granted delegation (see
[Operations](operations.md)) that is a superset of the browser grants: app KV,
`conversations` SQL read/write/schema, the ten secret references (see
[Secrets](secrets.md)), and decrypt on the user's default encryption network.
Its resolved permission set is pinned by `backendDelegationPolicyHash`; changing
it forces every user through a re-grant.
