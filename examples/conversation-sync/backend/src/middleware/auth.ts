import type { Request, Response, NextFunction } from "express";
import { verifySessionToken } from "@tinyboilerplate/server";

// ── Auth Middleware ──────────────────────────────────────────────────

/**
 * Session token auth middleware.
 *
 * Verifies the session JWT (signed by this backend with BACKEND_PRIVATE_KEY).
 * Sets req.user with the verified wallet address.
 */
export function createAuthMiddleware(privateKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        error: "missing_token",
        message: "Authorization header is required",
      });
      return;
    }

    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

    if (!token) {
      res.status(401).json({
        error: "missing_token",
        message: "Bearer token is required",
      });
      return;
    }

    try {
      const { address } = await verifySessionToken(token, privateKey);
      req.user = { address };
      next();
    } catch (err) {
      console.error("[auth] token verification failed:", err);
      res.status(401).json({
        error: "invalid_token",
        message: "Token verification failed",
      });
    }
  };
}
