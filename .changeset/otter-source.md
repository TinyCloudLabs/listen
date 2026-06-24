---
"listen-backend": minor
---

Add Otter.ai as a transcript source. The user's Otter session cookie is sealed as a TinyCloud Secret (encrypted to their encryption network, only openable inside the attested backend), and the enclave syncs owned + shared transcripts server-side — no client involvement. Connect via `PUT /api/otter/cookie`, sync via `GET /api/sync/otter/stream`, with an optional automatic background poller (Otter has no webhooks). Normalizes to the same `conversation`/`participant`/transcript contract as Fireflies/Meet/Granola (`source = "otter"`). The cookie is never logged or written to conversation rows.
