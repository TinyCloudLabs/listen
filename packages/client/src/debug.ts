const DEBUG_STORAGE_KEY = "listen:debug";
const FETCH_PATCH_FLAG = "__listenDebugFetchPatched";
const FETCH_SKIP_LOG = Symbol.for("listen.debug.fetch.skipLog");

export type DebugDetails = Record<string, unknown>;

export interface DebugStep {
  complete(details?: DebugDetails): void;
  fail(error: unknown, details?: DebugDetails): void;
}

let nextRequestId = 1;
type FetchInitWithDebug = RequestInit & { [FETCH_SKIP_LOG]?: boolean };

function canUseStorage(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

export function isListenDebugEnabled(): boolean {
  if (!canUseStorage()) return false;
  return window.localStorage.getItem(DEBUG_STORAGE_KEY) === "true";
}

function timestamp(): string {
  return new Date().toISOString();
}

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function elapsedMs(startedAtMs: number): number {
  return Math.round(nowMs() - startedAtMs);
}

function errorDetails(error: unknown): DebugDetails {
  if (error instanceof Error) {
    return { error: error.message, errorName: error.name };
  }
  return { error: String(error) };
}

function requestUrl(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function requestPath(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function requestMethod(input: Parameters<typeof fetch>[0], init?: RequestInit): string {
  const method =
    init?.method ?? (typeof input !== "string" && !(input instanceof URL) ? input.method : "GET");
  return method.toUpperCase();
}

export function listenDebugLog(step: string, event: string, details: DebugDetails = {}): void {
  if (!isListenDebugEnabled()) return;
  console.info(`[listen] ${step} ${event}`, {
    at: timestamp(),
    ...details,
  });
}

export function startListenDebugStep(step: string, details: DebugDetails = {}): DebugStep {
  const startedAt = timestamp();
  const startedAtMs = nowMs();
  listenDebugLog(step, "started", { startedAt, ...details });

  return {
    complete(doneDetails: DebugDetails = {}) {
      listenDebugLog(step, "completed", {
        startedAt,
        completedAt: timestamp(),
        elapsedMs: elapsedMs(startedAtMs),
        ...doneDetails,
      });
    },
    fail(error: unknown, failDetails: DebugDetails = {}) {
      listenDebugLog(step, "failed", {
        startedAt,
        failedAt: timestamp(),
        elapsedMs: elapsedMs(startedAtMs),
        ...errorDetails(error),
        ...failDetails,
      });
    },
  };
}

function networkDebugLog(event: string, details: DebugDetails): void {
  if (!isListenDebugEnabled()) return;

  const requestId = details.requestId;
  const method = typeof details.method === "string" ? details.method : "";
  const path = typeof details.path === "string" ? details.path : details.url;
  const status = details.status != null ? ` ${details.status}` : "";
  const elapsed = details.elapsedMs != null ? ` ${details.elapsedMs}ms` : "";

  console.info(
    `[listen] network.request ${event} #${requestId} ${method} ${path}${status}${elapsed}`,
    {
      at: timestamp(),
      ...details,
    },
  );
}

export async function listenDebugFetch(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
  details: DebugDetails = {},
): Promise<Response> {
  const requestId = nextRequestId++;
  const url = requestUrl(input);
  const method = requestMethod(input, init);
  const path = requestPath(url);
  const startedAt = timestamp();
  const startedAtMs = nowMs();
  const baseDetails = {
    requestId,
    method,
    url,
    path,
    ...details,
  };
  networkDebugLog("started", { startedAt, ...baseDetails });

  try {
    const initWithSkip: FetchInitWithDebug | undefined = init
      ? { ...init, [FETCH_SKIP_LOG]: true }
      : ({ [FETCH_SKIP_LOG]: true } as FetchInitWithDebug);
    const response = await fetch(input, initWithSkip);
    networkDebugLog("completed", {
      startedAt,
      completedAt: timestamp(),
      elapsedMs: elapsedMs(startedAtMs),
      requestId,
      method,
      url,
      path,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      ...details,
    });
    return response;
  } catch (err) {
    networkDebugLog("failed", {
      startedAt,
      failedAt: timestamp(),
      elapsedMs: elapsedMs(startedAtMs),
      requestId,
      method,
      url,
      path,
      ...errorDetails(err),
      ...details,
    });
    throw err;
  }
}

export function installListenDebugFetchLogger(): void {
  if (typeof window === "undefined") return;

  const target = window as Window &
    typeof globalThis & {
      [FETCH_PATCH_FLAG]?: boolean;
    };
  if (target[FETCH_PATCH_FLAG]) return;

  const originalFetch = target.fetch.bind(target);
  target.fetch = async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    if ((init as FetchInitWithDebug | undefined)?.[FETCH_SKIP_LOG]) {
      return originalFetch(input, init);
    }

    const requestId = nextRequestId++;
    const url = requestUrl(input);
    const method = requestMethod(input, init);
    const path = requestPath(url);
    const startedAt = timestamp();
    const startedAtMs = nowMs();

    networkDebugLog("started", {
      requestId,
      method,
      url,
      path,
      startedAt,
      client: "global-fetch",
    });

    try {
      const response = await originalFetch(input, init);
      networkDebugLog("completed", {
        requestId,
        method,
        url,
        path,
        startedAt,
        completedAt: timestamp(),
        elapsedMs: elapsedMs(startedAtMs),
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        client: "global-fetch",
      });
      return response;
    } catch (err) {
      networkDebugLog("failed", {
        requestId,
        method,
        url,
        path,
        startedAt,
        failedAt: timestamp(),
        elapsedMs: elapsedMs(startedAtMs),
        ...errorDetails(err),
        client: "global-fetch",
      });
      throw err;
    }
  };
  target[FETCH_PATCH_FLAG] = true;
}
