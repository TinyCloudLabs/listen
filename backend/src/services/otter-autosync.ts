import type { DelegatedAccess } from "@listen/server";
import { OtterClient } from "./otter-client.js";
import { readOtterCookieResult } from "./otter-secret.js";
import { runOtterSync } from "./otter-sync-runner.js";

interface AutoSyncConfig {
  intervalMs: number;
  /** Held backend delegation for the connected user (null if none connected). */
  getAccess: () => Promise<DelegatedAccess | null>;
  createClient?: (cookie: import("./otter-secret.js").OtterCookie) => OtterClient;
  log?: (msg: string) => void;
}

/**
 * Periodically run an incremental Otter sync inside the enclave using the
 * sealed cookie — no user session required. Otter has no webhooks, so this
 * polling loop is the "runs automatically" path. Returns a stop() handle.
 */
export function startOtterAutoSync(config: AutoSyncConfig): () => void {
  const makeClient = config.createClient ?? ((cookie) => new OtterClient(cookie));
  const log = config.log ?? ((msg) => console.log(`[otter-autosync] ${msg}`));
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const access = await config.getAccess();
      if (!access) return;
      const cookieResult = await readOtterCookieResult(access);
      if (!cookieResult.ok) {
        if (cookieResult.reason === "unavailable") log("Otter cookie read unavailable");
        return;
      }
      const summary = await runOtterSync(access, makeClient(cookieResult.data));
      if (summary.synced || summary.failed) {
        log(`synced ${summary.synced}, skipped ${summary.skipped}, failed ${summary.failed}`);
      }
    } catch {
      // logs are public — never echo cookie/upstream detail
      log("auto-sync tick failed");
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => void tick(), config.intervalMs);
  if (typeof timer.unref === "function") timer.unref();
  void tick();
  return () => clearInterval(timer);
}
