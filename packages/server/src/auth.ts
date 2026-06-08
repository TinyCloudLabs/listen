import { randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";

// ── Types ────────────────────────────────────────────────────────────

export interface NonceEntry {
  nonce: string;
  address: string;
  createdAt: number;
}

export interface NonceStore {
  generate(address: string): string;
  validate(address: string, nonce: string): boolean;
}

export interface SessionTokenPayload {
  address: string;
}

// ── Nonce Store ─────────────────────────────────────────────────────

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Create an in-memory nonce store for SIWE authentication.
 *
 * Nonces are:
 * - Cryptographically random (32 bytes hex)
 * - Bound to a specific address
 * - Single-use (deleted after validation)
 * - Short-lived (5 minute TTL)
 */
export function createNonceStore(): NonceStore {
  const store = new Map<string, NonceEntry>();

  // Periodic cleanup of expired nonces
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now - entry.createdAt > NONCE_TTL_MS) {
        store.delete(key);
      }
    }
  }, 60_000);
  cleanupInterval.unref();

  return {
    generate(address: string): string {
      const normalizedAddress = address.toLowerCase();
      const nonce = randomBytes(32).toString("hex");
      const key = `${normalizedAddress}:${nonce}`;

      store.set(key, {
        nonce,
        address: normalizedAddress,
        createdAt: Date.now(),
      });

      return nonce;
    },

    validate(address: string, nonce: string): boolean {
      const normalizedAddress = address.toLowerCase();
      const key = `${normalizedAddress}:${nonce}`;
      const entry = store.get(key);

      if (!entry) return false;

      // Delete immediately — single use
      store.delete(key);

      // Check TTL
      if (Date.now() - entry.createdAt > NONCE_TTL_MS) {
        return false;
      }

      return true;
    },
  };
}

// ── SIWE Verification ───────────────────────────────────────────────

/**
 * Verify a SIWE message and signature using the `siwe` package.
 * Returns the recovered address and nonce from the message.
 */
export async function verifySIWE(
  message: string,
  signature: string,
): Promise<{ address: string; nonce: string }> {
  // Dynamic import to avoid requiring siwe at module load time
  const { SiweMessage } = await import("siwe");

  const siweMessage = new SiweMessage(message);
  const result = await siweMessage.verify({ signature });

  if (!result.success) {
    throw new Error("SIWE signature verification failed");
  }

  return {
    address: result.data.address,
    nonce: result.data.nonce,
  };
}

// ── Session Token ───────────────────────────────────────────────────

/**
 * Issue a session JWT signed with HS256.
 * Subject is the wallet address.
 */
export async function issueSessionToken(
  address: string,
  privateKey: string,
): Promise<{ token: string; expiresIn: number }> {
  const secret = new TextEncoder().encode(privateKey);
  const expiresIn = 24 * 60 * 60; // 24 hours in seconds

  const token = await new SignJWT({ address })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(address)
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);

  return { token, expiresIn };
}

/**
 * Verify a session JWT issued by this backend.
 * Returns the wallet address from the token.
 */
export async function verifySessionToken(
  token: string,
  privateKey: string,
): Promise<{ address: string }> {
  const secret = new TextEncoder().encode(privateKey);

  const { payload } = await jwtVerify(token, secret, {
    algorithms: ["HS256"],
  });

  if (!payload.sub) {
    throw new Error("Session token missing 'sub' claim");
  }

  return { address: payload.sub };
}
