import { homedir } from "node:os";
import { join, resolve } from "node:path";

export const DEFAULT_LISTEN_SQL_DB = "xyz.tinycloud.listen/conversations";
export const DEFAULT_LISTEN_KV_PREFIX = "xyz.tinycloud.listen";
export const DEFAULT_LISTEN_APP_SPACE = "applications";
export const DEFAULT_OTTER_API_BASE = "https://otter.ai/forward/api/v1/";

export interface AppConfig {
  homeDir: string;
  dbPath: string;
  cookiePath: string;
  otterApiBase: string;
  listenSqlDb: string;
  listenKvPrefix: string;
  listenAppSpace: string;
}

export function getConfig(): AppConfig {
  const homeDir = resolve(process.env.OTTER_IMPORTER_HOME || join(homedir(), ".otter-importer"));
  return {
    homeDir,
    dbPath: join(homeDir, "otter-importer.sqlite"),
    cookiePath: join(homeDir, "cookie.json"),
    otterApiBase: ensureTrailingSlash(process.env.OTTER_API_BASE || DEFAULT_OTTER_API_BASE),
    listenSqlDb: process.env.OTTER_IMPORTER_SQL_DB || DEFAULT_LISTEN_SQL_DB,
    listenKvPrefix: stripSlashes(process.env.OTTER_IMPORTER_KV_PREFIX || DEFAULT_LISTEN_KV_PREFIX),
    listenAppSpace: process.env.OTTER_IMPORTER_APP_SPACE || DEFAULT_LISTEN_APP_SPACE,
  };
}

export function remoteKey(config: Pick<AppConfig, "listenKvPrefix">, key: string): string {
  return `${stripSlashes(config.listenKvPrefix)}/${stripSlashes(key)}`;
}

function stripSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}
