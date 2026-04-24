export interface RefreshLoopOptions {
  intervalMs: number; // e.g. 25 * 60 * 1000
  refresh: () => Promise<void>; // does one activation + session write
  onTerminalFailure?: (err: unknown) => void;
  onTransientFailure?: (err: unknown, attempt: number) => void;
  onSuccess?: () => void;
}

export interface RefreshState {
  lastAttemptAt: number | null;
  lastSuccessAt: number | null;
  lastError: string | null;
  inFlight: boolean;
}

const TRANSIENT_BACKOFF_MS = [5_000, 15_000, 60_000];

/**
 * Background refresh coordinator. Re-runs the supplied `refresh` function on
 * the configured interval, serializes concurrent refreshes via an in-flight
 * promise guard, and retries transient failures with a short backoff ladder
 * before falling back to the regular tick.
 *
 * Transient failures keep the previous session on disk — callers upstream
 * should only delete session state on a terminal failure (e.g. 401 from a
 * revoked delegation).
 */
export class RefreshLoop {
  private opts: RefreshLoopOptions;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Promise<void> | null = null;
  private backoffAttempt = 0;
  private state: RefreshState = {
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastError: null,
    inFlight: false,
  };

  constructor(opts: RefreshLoopOptions) {
    this.opts = opts;
  }

  getState(): RefreshState {
    return { ...this.state, inFlight: this.inFlight !== null };
  }

  start(): void {
    this.scheduleNext(this.opts.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Trigger a refresh immediately; if one is already running, join it.
   * Resolves when the running refresh finishes (success or failure).
   */
  async runNow(): Promise<void> {
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.doRefresh().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private scheduleNext(delayMs: number): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.runNow().catch(() => {
        /* errors handled inside doRefresh */
      });
    }, delayMs);
  }

  private async doRefresh(): Promise<void> {
    this.state.lastAttemptAt = Date.now();

    try {
      await this.opts.refresh();
      this.state.lastSuccessAt = Date.now();
      this.state.lastError = null;
      this.backoffAttempt = 0;
      this.opts.onSuccess?.();
      this.scheduleNext(this.opts.intervalMs);
    } catch (err) {
      this.state.lastError = err instanceof Error ? err.message : String(err);

      if (isTerminalFailure(err)) {
        this.opts.onTerminalFailure?.(err);
        this.scheduleNext(this.opts.intervalMs);
        return;
      }

      this.opts.onTransientFailure?.(err, this.backoffAttempt);
      const backoff = TRANSIENT_BACKOFF_MS[this.backoffAttempt];
      this.backoffAttempt = Math.min(this.backoffAttempt + 1, TRANSIENT_BACKOFF_MS.length - 1);
      this.scheduleNext(backoff ?? this.opts.intervalMs);
    }
  }
}

function isTerminalFailure(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b(401|403|revoked|forbidden|unauthor)\b/i.test(msg);
}
