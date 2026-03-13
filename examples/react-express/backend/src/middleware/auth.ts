import type { Request, Response, NextFunction } from "express";
import type { fetchUserInfo } from "@tinyboilerplate/server";

// ── Types ────────────────────────────────────────────────────────────

type JWTVerifier = (token: string) => Promise<{ claims: { sub: string }; token: string }>;
type UserInfoFetcher = typeof fetchUserInfo;

interface AuthMiddlewareConfig {
  verifyJWT: JWTVerifier;
  fetchUserInfo: UserInfoFetcher;
  openKeyUrl: string;
}

// ── Sub-to-Address Cache ─────────────────────────────────────────────

const subToAddress = new Map<string, string>();

// ── Auth Middleware Factory ──────────────────────────────────────────

/**
 * Creates Express middleware that:
 * 1. Extracts Bearer token from Authorization header
 * 2. Verifies the JWT against the OpenKey JWKS
 * 3. Resolves the user's blockchain address via userinfo
 * 4. Attaches { sub, address } to req.user
 */
export function createAuthMiddleware(config: AuthMiddlewareConfig) {
  const { verifyJWT, fetchUserInfo: fetchInfo, openKeyUrl } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        error: "missing_token",
        message: "Authorization header with Bearer token is required",
      });
      return;
    }

    const token = authHeader.slice(7);

    try {
      // Verify the JWT signature and claims
      const { claims } = await verifyJWT(token);
      const sub = claims.sub;

      // Resolve address: check cache first, then fetch from OpenKey
      let address = subToAddress.get(sub);

      if (!address) {
        const userInfo = await fetchInfo(openKeyUrl, token);

        // OpenKey userinfo returns keys: [{ address, keyId }]
        const keys = (userInfo as any).keys;
        address = keys?.[0]?.address ?? userInfo.address;

        if (!address) {
          res.status(401).json({
            error: "no_address",
            message: "User has no blockchain address associated",
          });
          return;
        }

        subToAddress.set(sub, address);
      }

      req.user = { sub, address };
      next();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      res.status(401).json({
        error: "invalid_token",
        message: `Authentication failed: ${message}`,
      });
    }
  };
}
