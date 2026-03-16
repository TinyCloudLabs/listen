import { createRemoteJWKSet, jwtVerify } from "jose";
import type { JWTPayload, JWTVerifyResult } from "jose";

// ── Types ────────────────────────────────────────────────────────────

export interface JWTClaims extends JWTPayload {
  sub: string;
  [key: string]: unknown;
}

export interface VerifyResult {
  claims: JWTClaims;
  token: string;
}

export interface UserInfo {
  sub: string;
  address?: string;
  email?: string;
  [key: string]: unknown;
}

export interface JWTVerifierConfig {
  /** Expected issuer (e.g., "https://openkey.so") */
  issuer?: string;
  /** Expected audience (your client ID or app identifier) */
  audience?: string;
}

// ── JWT Verifier ─────────────────────────────────────────────────────

/**
 * Create a token verification function.
 *
 * Supports two modes:
 * 1. JWT verification via JWKS (standard OAuth2 JWT access tokens)
 * 2. Opaque token verification via userinfo endpoint (better-auth session tokens)
 *
 * Tries JWT first, falls back to userinfo if the token isn't a JWT.
 */
export function createJWTVerifier(
  openKeyIssuerUrl: string,
  config?: JWTVerifierConfig,
) {
  const jwksUrl = new URL(
    "/api/auth/jwks",
    openKeyIssuerUrl,
  );
  const jwks = createRemoteJWKSet(jwksUrl);

  const issuer = config?.issuer ?? openKeyIssuerUrl;
  const audience = config?.audience;

  async function verify(authHeaderOrToken: string): Promise<VerifyResult> {
    const token = authHeaderOrToken.startsWith("Bearer ")
      ? authHeaderOrToken.slice(7)
      : authHeaderOrToken;

    if (!token) {
      throw new Error("No token provided");
    }

    // Try JWT verification first
    if (token.split(".").length === 3) {
      try {
        const verifyOptions: Parameters<typeof jwtVerify>[2] = { issuer };
        if (audience) verifyOptions.audience = audience;

        const result: JWTVerifyResult = await jwtVerify(token, jwks, verifyOptions);
        const claims = result.payload as JWTClaims;
        if (!claims.sub) throw new Error("JWT missing 'sub' claim");
        return { claims, token };
      } catch {
        // Fall through to userinfo validation
      }
    }

    // Opaque token — validate via userinfo endpoint
    const userInfo = await fetchUserInfo(openKeyIssuerUrl, token);
    if (!userInfo.sub) {
      throw new Error("Token validation failed: no sub in userinfo");
    }
    return {
      claims: { sub: userInfo.sub, iss: openKeyIssuerUrl } as JWTClaims,
      token,
    };
  }

  return verify;
}

// ── User Info ────────────────────────────────────────────────────────

/**
 * Fetch the authenticated user's profile from the OpenKey userinfo endpoint.
 * Requires a valid access token.
 */
export async function fetchUserInfo(
  openKeyUrl: string,
  accessToken: string,
): Promise<UserInfo> {
  const res = await fetch(`${openKeyUrl}/api/auth/oauth2/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Failed to fetch user info: ${text}`);
  }

  return res.json() as Promise<UserInfo>;
}
