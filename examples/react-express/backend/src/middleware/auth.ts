import type { Request, Response, NextFunction } from "express";

// ── Auth Middleware ──────────────────────────────────────────────────

/**
 * Simple address-based auth middleware.
 *
 * The frontend authenticates via OpenKey passkey + TinyCloud SIWE.
 * The delegation itself is cryptographic proof of authorization.
 * This middleware extracts the user's address from the X-User-Address header.
 */
export function createAuthMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const address = req.headers["x-user-address"] as string | undefined;

    if (!address) {
      res.status(401).json({
        error: "missing_address",
        message: "X-User-Address header is required",
      });
      return;
    }

    req.user = { sub: address, address };
    next();
  };
}
