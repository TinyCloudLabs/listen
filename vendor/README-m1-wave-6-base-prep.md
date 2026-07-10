# PM base-prep: vendored @tinycloud/sdk-core for M1-F (m1-wave-6)

Flagged PM commit (Data Exchange v0, session 14, 2026-07-09) on the m1-f-01
wave base — NOT builder output. Provenance:

- `tinycloud-sdk-core-2.6.0-m1-46754ef.tgz`
  - sha256 `37949c214b238581484367c359718a565a03ee67174230aa2b487b535da90cf0`
  - packed (`npm pack`) from `packages/sdk-core` of TinyCloudLabs/js-sdk at
    commit `46754eff508ffaeb61074c7fc6c69b64557f2703`
    (`smithers/data-exchange/m1-wave-2-5/m1-integration` — the M1 js-sdk
    promotion surface containing the merged m1-b-01a signed-object core and
    m1-b-01b share-authoring/bootstrap/engine-record surface), dist built and
    verified green by the whole-repo verify proof of 2026-07-09.
- Purpose: the m1-f-01 owner share flow consumes the REAL pinned merged SDK
  share surface (`@tinycloud/sdk-core@file:vendor/...` with subpath exports
  `/policy`, `/bootstrap`) per the vector-consumption rule (consumer tickets
  pin the producer's merged SHA). It is replaced by the published SDK release
  at the milestone-gate promotion; this vendored artifact must not outlive M1.
- The builder must consume this surface, never re-implement or copy SDK logic
  into listen.
