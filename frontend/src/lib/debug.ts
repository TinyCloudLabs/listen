import {
  installListenDebugFetchLogger,
  isListenDebugEnabled,
  listenDebugFetch,
  listenDebugLog,
  startListenDebugStep,
  type DebugDetails,
  type DebugStep,
} from "@listen/client";

const DEBUG_STORAGE_KEY = "listen:debug";

type ListenDebugToggle = (enabled?: boolean) => boolean;

export type { DebugDetails, DebugStep };
export const debugFetch = listenDebugFetch;

function canUseStorage(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

export function isDebugEnabled(): boolean {
  return isListenDebugEnabled();
}

function setDebugEnabled(enabled: boolean): boolean {
  if (!canUseStorage()) return false;
  window.localStorage.setItem(DEBUG_STORAGE_KEY, enabled ? "true" : "false");
  console.debug(`[listen] debug ${enabled ? "enabled" : "disabled"}`);
  return enabled;
}

export function debugLog(step: string, event: string, details: DebugDetails = {}): void {
  listenDebugLog(step, event, details);
}

export function startDebugStep(step: string, details: DebugDetails = {}): DebugStep {
  return startListenDebugStep(step, details);
}

installListenDebugFetchLogger();

if (typeof window !== "undefined") {
  const target = window as unknown as Window & { debug?: ListenDebugToggle };
  target.debug = (enabled?: boolean): boolean => {
    if (enabled === undefined) {
      const current = isDebugEnabled();
      console.debug(`[listen] debug ${current ? "enabled" : "disabled"}`);
      return current;
    }
    return setDebugEnabled(Boolean(enabled));
  };
}
