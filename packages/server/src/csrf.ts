// ── Types ────────────────────────────────────────────────────────────

/** Minimal request shape compatible with Express/Connect-style frameworks. */
interface IncomingRequest {
  method: string;
  headers: Record<string, string | string[] | undefined>;
}

/** Minimal response shape compatible with Express/Connect-style frameworks. */
interface OutgoingResponse {
  status(code: number): OutgoingResponse;
  json(body: unknown): void;
}

export interface CsrfConfig {
  /** Header name to check (case-insensitive). Default: "x-requested-with" */
  headerName?: string;
  /** Expected header value (exact match). Default: "Listen" */
  headerValue?: string;
  /** HTTP methods exempt from the check. Default: ["GET", "HEAD", "OPTIONS"] */
  safeMethods?: string[];
}

// ── Middleware ────────────────────────────────────────────────────────

const DEFAULT_HEADER_NAME = "x-requested-with";
const DEFAULT_HEADER_VALUE = "Listen";
const DEFAULT_SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

/**
 * CSRF protection middleware using a custom header check.
 *
 * Browsers enforce that cross-origin requests with custom headers trigger a
 * CORS preflight. Combined with a restrictive CORS origin policy, this
 * prevents cross-site request forgery without cookies or server-side state.
 *
 * Safe methods (GET, HEAD, OPTIONS) are exempt by default since they should
 * be idempotent.
 */
export function createCsrfMiddleware(config?: CsrfConfig) {
  const headerName = (config?.headerName ?? DEFAULT_HEADER_NAME).toLowerCase();
  const headerValue = config?.headerValue ?? DEFAULT_HEADER_VALUE;
  const safeMethods = new Set(
    (config?.safeMethods ?? DEFAULT_SAFE_METHODS).map((m) => m.toUpperCase()),
  );

  return (req: IncomingRequest, res: OutgoingResponse, next: () => void): void => {
    if (safeMethods.has(req.method.toUpperCase())) {
      next();
      return;
    }

    const actual = req.headers[headerName];
    if (actual !== headerValue) {
      res.status(403).json({
        error: "csrf_rejected",
        message: "Missing or invalid X-Requested-With header",
      });
      return;
    }

    next();
  };
}
