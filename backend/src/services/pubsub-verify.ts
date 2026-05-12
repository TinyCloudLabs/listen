/**
 * Verify a Google Cloud Pub/Sub OIDC push token.
 *
 * Decodes the JWT from the Authorization header and checks that the
 * `aud`, `email`, and `exp` claims match expectations. No cryptographic
 * signature verification is performed — the push endpoint relies on
 * network-level trust (HTTPS) and claim validation only.
 *
 * @param authorizationHeader - The full `Authorization` header value, e.g. `Bearer {jwt}`
 * @param expectedAudience   - The audience claim the token must contain
 * @param expectedEmail      - The service-account email the token must contain
 * @returns true if all checks pass
 */
export function verifyPubSubToken(
  authorizationHeader: string,
  expectedAudience: string,
  expectedEmail: string,
): boolean {
  if (!authorizationHeader.startsWith("Bearer ")) return false;

  const token = authorizationHeader.slice("Bearer ".length);
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  let payload: Record<string, unknown>;
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf-8");
    payload = JSON.parse(json);
  } catch {
    return false;
  }

  if (typeof payload.aud !== "string" || payload.aud !== expectedAudience) return false;
  if (typeof payload.email !== "string" || payload.email !== expectedEmail) return false;
  if (typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000)) return false;

  return true;
}
