const DEBUG_STORAGE_KEY = "listen:debug";

type DebugDetails = Record<string, unknown>;
type ListenDebugToggle = (enabled?: boolean) => boolean;

export interface DebugStep {
  complete(details?: DebugDetails): void;
  fail(error: unknown, details?: DebugDetails): void;
}

function canUseStorage(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

export function isDebugEnabled(): boolean {
  if (!canUseStorage()) return false;
  return window.localStorage.getItem(DEBUG_STORAGE_KEY) === "true";
}

function setDebugEnabled(enabled: boolean): boolean {
  if (!canUseStorage()) return false;
  window.localStorage.setItem(DEBUG_STORAGE_KEY, enabled ? "true" : "false");
  console.info(`[listen] debug ${enabled ? "enabled" : "disabled"}`);
  return enabled;
}

function timestamp(): string {
  return new Date().toISOString();
}

function elapsedMs(startedAtMs: number): number {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  return Math.round(now - startedAtMs);
}

function errorDetails(error: unknown): DebugDetails {
  if (error instanceof Error) {
    return { error: error.message, errorName: error.name };
  }
  return { error: String(error) };
}

export function debugLog(step: string, event: string, details: DebugDetails = {}): void {
  if (!isDebugEnabled()) return;
  console.debug(`[listen] ${step} ${event}`, {
    at: timestamp(),
    ...details,
  });
}

export function startDebugStep(step: string, details: DebugDetails = {}): DebugStep {
  const startedAt = timestamp();
  const startedAtMs = typeof performance !== "undefined" ? performance.now() : Date.now();
  debugLog(step, "started", { startedAt, ...details });

  return {
    complete(doneDetails: DebugDetails = {}) {
      debugLog(step, "completed", {
        startedAt,
        completedAt: timestamp(),
        elapsedMs: elapsedMs(startedAtMs),
        ...doneDetails,
      });
    },
    fail(error: unknown, failDetails: DebugDetails = {}) {
      debugLog(step, "failed", {
        startedAt,
        failedAt: timestamp(),
        elapsedMs: elapsedMs(startedAtMs),
        ...errorDetails(error),
        ...failDetails,
      });
    },
  };
}

if (typeof window !== "undefined") {
  const target = window as unknown as Window & { debug?: ListenDebugToggle };
  target.debug = (enabled?: boolean): boolean => {
    if (enabled === undefined) {
      const current = isDebugEnabled();
      console.info(`[listen] debug ${current ? "enabled" : "disabled"}`);
      return current;
    }
    return setDebugEnabled(Boolean(enabled));
  };
}
