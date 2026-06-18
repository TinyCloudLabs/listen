import { listenDebugFetch } from "./debug.js";

// ── Types ────────────────────────────────────────────────────────────

export interface VerifyResponse {
  token: string;
  expiresIn: number;
  address: string;
}

// ── Nonce Request ───────────────────────────────────────────────────

/**
 * Request a nonce from the backend for SIWE authentication.
 */
export async function requestNonce(backendUrl: string, address: string): Promise<string> {
  const path = `/api/auth/nonce?address=${encodeURIComponent(address)}`;
  const res = await listenDebugFetch(`${backendUrl}${path}`, undefined, {
    client: "auth",
    method: "GET",
    path,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "unknown", message: res.statusText }));
    throw new Error(`Failed to request nonce: ${err.message ?? err.error}`);
  }

  const data = await res.json();
  return data.nonce;
}

// ── Backend Verification ────────────────────────────────────────────

/**
 * Send the SDK-produced SIWE message and signature to the backend for verification.
 * Returns a session token on success.
 */
export async function verifySession(
  backendUrl: string,
  siwe: string,
  signature: string,
): Promise<VerifyResponse> {
  const path = "/api/auth/verify";
  const res = await listenDebugFetch(
    `${backendUrl}${path}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "Listen",
      },
      body: JSON.stringify({ message: siwe, signature }),
    },
    { client: "auth", method: "POST", path },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "unknown", message: res.statusText }));
    throw new Error(`SIWE verification failed: ${err.message ?? err.error}`);
  }

  return res.json() as Promise<VerifyResponse>;
}
