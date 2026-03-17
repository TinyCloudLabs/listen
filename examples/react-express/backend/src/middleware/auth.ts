import type { Request, Response, NextFunction } from "express";
import { createJWTVerifier } from "@tinyboilerplate/server";

// ── Auth Middleware ──────────────────────────────────────────────────

/**
 * JWT-based auth middleware.
 *
 * Verifies the OpenKey access token via JWKS (or userinfo fallback).
 * Sets req.user with the verified `sub` claim.
 *
 * The wallet address is NOT resolved here — it comes from the delegation
 * itself (delegation.ownerAddress) when a delegation is first submitted.
 */
export function createAuthMiddleware(openKeyIssuerUrl: string) {
  const verify = createJWTVerifier(openKeyIssuerUrl);

  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        error: "missing_token",
        message: "Authorization header is required",
      });
      return;
    }

    try {
      const { claims } = await verify(authHeader);
      req.user = { sub: claims.sub };
      next();
    } catch (err) {
      res.status(401).json({
        error: "invalid_token",
        message: err instanceof Error ? err.message : "Token verification failed",
      });
    }
  };
}
