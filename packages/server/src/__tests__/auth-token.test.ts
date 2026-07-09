import { describe, expect, test } from "bun:test";
import { SignJWT, jwtVerify } from "jose";
import { issueSessionToken, verifySessionToken } from "../auth.js";

describe("session tokens", () => {
  test("preserve verified wallet address casing", async () => {
    const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const secret = "test-backend-secret";

    const { token } = await issueSessionToken(address, secret);
    const verified = await verifySessionToken(token, secret);

    expect(verified.address).toBe(address);
  });

  test("session JWT is not signed with the raw private key", async () => {
    const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const pk = "test-backend-private-key";

    const { token } = await issueSessionToken(address, pk);

    await expect(
      jwtVerify(token, new TextEncoder().encode(pk), {
        algorithms: ["HS256"],
      }),
    ).rejects.toThrow();
  });

  test("token signed with the raw private key is rejected by verifySessionToken", async () => {
    const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const pk = "test-backend-private-key";

    const token = await new SignJWT({ address })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(address)
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(new TextEncoder().encode(pk));

    await expect(verifySessionToken(token, pk)).rejects.toThrow();
  });

  test("different private keys derive different JWT secrets", async () => {
    const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const pk1 = "test-backend-private-key-1";
    const pk2 = "test-backend-private-key-2";

    const { token } = await issueSessionToken(address, pk1);

    await expect(verifySessionToken(token, pk2)).rejects.toThrow();
  });
});
