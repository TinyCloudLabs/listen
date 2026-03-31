import { describe, it, expect } from "bun:test";
import { createHmac } from "crypto";
import { verifyFirefliesSignature } from "../services/webhook-verify.js";

// ── Test Helpers ─────────────────────────────────────────────────────

const SECRET = "test-webhook-secret-abc123";

function sign(body: Buffer, secret: string): string {
  const hmac = createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${hmac}`;
}

// ── Tests ────────────────────────────────────────────────────────────

describe("verifyFirefliesSignature", () => {
  it("returns true for a valid signature", () => {
    const body = Buffer.from('{"meetingId":"abc","eventType":"Transcription completed"}');
    const signature = sign(body, SECRET);

    expect(verifyFirefliesSignature(body, signature, SECRET)).toBe(true);
  });

  it("returns false for an invalid signature", () => {
    const body = Buffer.from('{"meetingId":"abc"}');
    const signature = "sha256=0000000000000000000000000000000000000000000000000000000000000000";

    expect(verifyFirefliesSignature(body, signature, SECRET)).toBe(false);
  });

  it("returns false when signature header is missing (empty string)", () => {
    const body = Buffer.from('{"meetingId":"abc"}');

    expect(verifyFirefliesSignature(body, "", SECRET)).toBe(false);
  });

  it("returns false when signature header has no sha256= prefix", () => {
    const body = Buffer.from('{"meetingId":"abc"}');
    const hmac = createHmac("sha256", SECRET).update(body).digest("hex");

    // Raw hex without prefix
    expect(verifyFirefliesSignature(body, hmac, SECRET)).toBe(false);
  });

  it("returns false for an empty body with valid-looking signature", () => {
    const body = Buffer.from("");
    // Sign a different, non-empty body
    const signature = sign(Buffer.from("something else"), SECRET);

    expect(verifyFirefliesSignature(body, signature, SECRET)).toBe(false);
  });

  it("returns true for an empty body with correctly computed signature", () => {
    const body = Buffer.from("");
    const signature = sign(body, SECRET);

    expect(verifyFirefliesSignature(body, signature, SECRET)).toBe(true);
  });

  it("returns false when signature length doesn't match expected", () => {
    const body = Buffer.from('{"meetingId":"abc"}');
    // Truncated signature
    expect(verifyFirefliesSignature(body, "sha256=abcd", SECRET)).toBe(false);
  });

  it("returns false when body was tampered after signing", () => {
    const original = Buffer.from('{"meetingId":"abc"}');
    const signature = sign(original, SECRET);
    const tampered = Buffer.from('{"meetingId":"xyz"}');

    expect(verifyFirefliesSignature(tampered, signature, SECRET)).toBe(false);
  });

  it("returns false when signed with a different secret", () => {
    const body = Buffer.from('{"meetingId":"abc"}');
    const signature = sign(body, "wrong-secret");

    expect(verifyFirefliesSignature(body, signature, SECRET)).toBe(false);
  });
});
