import { describe, it, expect } from "bun:test";
import { verifyPubSubToken } from "../services/pubsub-verify.js";

const EXPECTED_AUDIENCE = "https://example.com/api/webhooks/google-meet";
const EXPECTED_EMAIL = "pubsub@my-project.iam.gserviceaccount.com";

/** Build a JWT from payload claims (no signature verification needed). */
function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = "fake-signature";
  return `${header}.${body}.${signature}`;
}

function validPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    aud: EXPECTED_AUDIENCE,
    email: EXPECTED_EMAIL,
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    ...overrides,
  };
}

describe("verifyPubSubToken", () => {
  it("returns true for a valid token", () => {
    const token = makeJwt(validPayload());
    const header = `Bearer ${token}`;
    expect(verifyPubSubToken(header, EXPECTED_AUDIENCE, EXPECTED_EMAIL)).toBe(true);
  });

  it("returns false when token is expired", () => {
    const token = makeJwt(validPayload({ exp: Math.floor(Date.now() / 1000) - 60 }));
    const header = `Bearer ${token}`;
    expect(verifyPubSubToken(header, EXPECTED_AUDIENCE, EXPECTED_EMAIL)).toBe(false);
  });

  it("returns false when aud does not match", () => {
    const token = makeJwt(validPayload({ aud: "https://wrong.example.com" }));
    const header = `Bearer ${token}`;
    expect(verifyPubSubToken(header, EXPECTED_AUDIENCE, EXPECTED_EMAIL)).toBe(false);
  });

  it("returns false when email does not match", () => {
    const token = makeJwt(validPayload({ email: "wrong@example.com" }));
    const header = `Bearer ${token}`;
    expect(verifyPubSubToken(header, EXPECTED_AUDIENCE, EXPECTED_EMAIL)).toBe(false);
  });

  it("returns false for malformed JWT (not three parts)", () => {
    const header = "Bearer not-a-jwt";
    expect(verifyPubSubToken(header, EXPECTED_AUDIENCE, EXPECTED_EMAIL)).toBe(false);
  });

  it("returns false for malformed JWT (invalid base64 payload)", () => {
    const header = "Bearer aaa.!!!invalid!!!.ccc";
    expect(verifyPubSubToken(header, EXPECTED_AUDIENCE, EXPECTED_EMAIL)).toBe(false);
  });

  it("returns false when Authorization header is missing (empty string)", () => {
    expect(verifyPubSubToken("", EXPECTED_AUDIENCE, EXPECTED_EMAIL)).toBe(false);
  });

  it("returns false when Authorization header has no Bearer prefix", () => {
    const token = makeJwt(validPayload());
    expect(verifyPubSubToken(token, EXPECTED_AUDIENCE, EXPECTED_EMAIL)).toBe(false);
  });

  it("returns false when exp claim is missing", () => {
    const { exp, ...noExp } = validPayload();
    const token = makeJwt(noExp);
    const header = `Bearer ${token}`;
    expect(verifyPubSubToken(header, EXPECTED_AUDIENCE, EXPECTED_EMAIL)).toBe(false);
  });

  it("returns false when aud claim is missing", () => {
    const { aud, ...noAud } = validPayload();
    const token = makeJwt(noAud);
    const header = `Bearer ${token}`;
    expect(verifyPubSubToken(header, EXPECTED_AUDIENCE, EXPECTED_EMAIL)).toBe(false);
  });

  it("returns false when email claim is missing", () => {
    const { email, ...noEmail } = validPayload();
    const token = makeJwt(noEmail);
    const header = `Bearer ${token}`;
    expect(verifyPubSubToken(header, EXPECTED_AUDIENCE, EXPECTED_EMAIL)).toBe(false);
  });

  it("returns true when exp is exactly now (not expired yet)", () => {
    const token = makeJwt(validPayload({ exp: Math.floor(Date.now() / 1000) + 1 }));
    const header = `Bearer ${token}`;
    expect(verifyPubSubToken(header, EXPECTED_AUDIENCE, EXPECTED_EMAIL)).toBe(true);
  });
});
