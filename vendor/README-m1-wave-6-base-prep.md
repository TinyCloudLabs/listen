# Vendored TinyCloud SDK artifacts for M1-F

The original wave-6 SDK artifact has been retired. M1-F-02 pins the merged
m1-e-02 output used by the owner live driver. Provenance:

- `tinycloud-sdk-core-2.6.0-m1-5a42dd6.tgz`
  - sha256 `7f7c9213ae5732dd63b4c5076f16f8b32f1fa5579c4d1b9cef1feb12a3edbebe`
  - packed with `npm pack` from `packages/sdk-core` at js-sdk commit
    `5a42dd6` on `smithers/data-exchange/m1-direct/m1-integration`.
- `tinycloud-node-sdk-2.6.0-m1-5a42dd6.tgz`
  - sha256 `7ec4e3c0a89dce064f52f99f0a078b9fc3b81244f736ebb1edba9c1692fbe483`
  - packed with `npm pack` from `packages/node-sdk` at the same branch and
    commit.
- Purpose: the M1 owner share flow consumes the real pinned merged SDK
  policy-authoring and wallet-rooted external-DID delegation surfaces per the
  vector-consumption rule. These artifacts are replaced by the published SDK
  release at milestone-gate promotion and must not outlive M1.
- The builder must consume these surfaces, never reimplement or copy SDK logic
  into Listen.
