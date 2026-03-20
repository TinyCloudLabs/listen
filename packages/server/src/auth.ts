import { createRemoteJWKSet, jwtVerify } from "jose";
import type { JWTPayload, JWTVerifyResult } from "jose";
import { JWSSignatureVerificationFailed, JWTClaimValidationFailed, JWTExpired } from "jose/errors";
import { deriveApiHost } from "@tinyboilerplate/core";

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
 *
 * Accepts either the frontend host (https://openkey.so) or API host
 * (https://api.openkey.so) — the API host is derived automatically.
 */
export function createJWTVerifier(openKeyIssuerUrl: string, config?: JWTVerifierConfig) {
  const apiHost = deriveApiHost(openKeyIssuerUrl);
  const jwksUrl = new URL("/api/auth/jwks", apiHost);
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
      } catch (err) {
        // Re-throw only when the token IS a valid JWT that failed a security check.
        // Other errors (JWKSNoMatchingKey, JWSInvalid, JWKSTimeout) fall through
        // to userinfo — the token may be a better-auth session token, not a JWT.
        if (
          err instanceof JWSSignatureVerificationFailed ||
          err instanceof JWTExpired ||
          err instanceof JWTClaimValidationFailed
        ) {
          throw err;
        }
        // Fall through to userinfo validation
      }
    }

    // Opaque token — validate via userinfo endpoint
    const userInfo = await fetchUserInfo(apiHost, token);
    if (!userInfo.sub) {
      throw new Error("Token validation failed: no sub in userinfo");
    }
    return {
      claims: { sub: userInfo.sub, iss: apiHost } as JWTClaims,
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
export async function fetchUserInfo(openKeyUrl: string, accessToken: string): Promise<UserInfo> {
  const url = deriveApiHost(openKeyUrl);
  const res = await fetch(`${url}/api/auth/oauth2/userinfo`, {
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
