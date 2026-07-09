---
type: TinyCloud Operations
title: Operations
description: The backend delegation lifecycle and session-auth invariants.
tinycloud:
  app: xyz.tinycloud.listen
  service: operations
  profile: tinycloud.app.v1
  containsSecretValue: false
---

# Operations

## Backend delegation lifecycle

- **Grant.** The browser POSTs a serialized delegation to
  `POST /api/delegations`. The backend rejects any grant that is not a superset
  of the current backend policy (`delegationCoversBackendPolicy`) or that is
  already expired / expires within the grant margin.
- **TTL.** Backend delegations carry a **7-day TTL**
  (`BACKEND_DELEGATION_EXPIRY = "7d"`, `backend/src/manifest.ts`). This is the
  product knob for how long the backend can act without a re-grant.
- **Silent auto-renewal.** On sign-in and session restore the frontend renews
  the delegation when the stored row is expired, or missing with evidence of a
  prior grant (PR #98). Renewal is silent when the TinyCloud session can still
  derive the delegation; otherwise it degrades to the explicit re-grant UI.
- **Revoke (sign-out).** Sign-out durably revokes by overwriting the
  `delegations/{address}` row with an already-expired tombstone (`kv.put`
  overwrites succeed where `kv.delete` silently no-ops on overwritten keys,
  TC-140), then best-effort deletes. Expiry is checked before policy-hash at
  every consumer, so the tombstone is terminal even when the delete no-ops.

### Revoke semantics (same-browser vs cross-device)

Revoke is **per-session and same-browser**. In the signing-out browser the
frontend also nulls the delegation renewer before awaiting revoke and writes a
short-lived (~10 minute) `listen:revoked-at` localStorage tombstone that gates
**all** renewal paths, so an in-flight gated request cannot silently re-grant
the delegation. A fresh grant (re-sign-in) clears that marker.

Cross-device is **out of scope**: any other still-authenticated tab or device
holds live credentials (a live session JWT and a live TinyCloud session) and may
legitimately re-establish the delegation on its next gated request or session
restore. Fully global revoke would require server-side session revocation, which
this batch does not implement.

## Policy-rotation re-grant-wave property

Any change to `backendDelegationPermissions` (`backend/src/manifest.ts`) rotates
`backendDelegationPolicyHash`. Stored delegations carry the hash they were
granted under; when it no longer matches, consumers treat the row as stale and
force the user through a re-grant. PR #97 (adding `tinycloud.sql/schema`) is the
live example — it re-granted every user. Do not change the resolved backend
policy casually.

## Session auth invariants

- **JWT secret split.** The HS256 session-JWT secret is derived from
  `BACKEND_PRIVATE_KEY` via HKDF-SHA256 (`info = "listen:session-jwt:v1"`), not
  used verbatim. Rotating `BACKEND_PRIVATE_KEY` therefore rotates all session
  JWTs (it already rotated the backend DID, so this adds no new operational
  coupling). Deploying the split invalidates all live session JWTs once; users
  re-authenticate via SIWE.
- **iss/aud.** Session JWTs set and verify `issuer = "listen-backend"` and
  `audience = "xyz.tinycloud.listen"`.
- **SIWE domain binding.** `verifySIWE` requires the parsed message domain to be
  in an allowlist derived from `FRONTEND_URL` (hostnames + hosts), and enforces
  `expirationTime`/`notBefore`. A misconfigured `FRONTEND_URL` now fails sign-in
  closed, not just CORS.
- **Nonce store is single-instance.** SIWE nonces live in per-process memory;
  single-use enforcement holds only for a single backend instance (or sticky
  routing). Listen's Phala deployment is single-instance today; horizontal
  scaling requires moving nonces to a shared store with atomic
  delete-on-validate.
