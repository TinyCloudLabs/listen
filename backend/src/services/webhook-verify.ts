import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify a Fireflies webhook signature (HMAC-SHA256).
 *
 * @param rawBody    - The raw request body as a Buffer (before JSON parsing)
 * @param signatureHeader - The `x-hub-signature` header value, e.g. `sha256={hex}`
 * @param secret     - The shared webhook secret
 * @returns true if the signature is valid
 */
export function verifyFirefliesSignature(
  rawBody: Buffer,
  signatureHeader: string,
  secret: string,
): boolean {
  if (!signatureHeader.startsWith("sha256=")) return false;

  const computed = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expected = `sha256=${computed}`;

  if (signatureHeader.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
}
