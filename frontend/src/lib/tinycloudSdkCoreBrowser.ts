// @tinycloud/sdk-core's root bundle imports Node-only modules. The web SDK
// bundles the same manifest helpers for browsers without those dependencies.
export { composeManifestRequest, loadManifest, resolveManifest } from "@tinycloud/web-sdk";
