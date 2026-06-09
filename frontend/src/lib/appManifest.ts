import type { Manifest } from "@tinycloud/web-sdk";
import { resolveManifestPermissionPath } from "@listen/client";
import manifestJson from "../../../manifest.json";

export const APP_MANIFEST = manifestJson as Manifest;

export function resolveAppPath(path: string, service = "tinycloud.kv"): string {
  return resolveManifestPermissionPath(
    APP_MANIFEST,
    service,
    path,
    service === "tinycloud.sql" ? ["read"] : ["get"],
  );
}

export function resolveAppKvPath(path: string): string {
  return resolveAppPath(path, "tinycloud.kv");
}

export function resolveAppSqlPath(path: string): string {
  return resolveAppPath(path, "tinycloud.sql");
}

export function normalizeAppRelativeKvKey(key: string): string {
  const appRoot = resolveAppKvPath("/");
  return key.startsWith(appRoot) ? key.slice(appRoot.length) : key;
}
