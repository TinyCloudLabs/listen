import { describe, expect, test } from "bun:test";
import { Wallet } from "ethers";
import { SiweMessage } from "siwe";
import { verifySIWE } from "../auth.js";

async function signedSiwe(overrides: Partial<SiweMessage> = {}) {
  const wallet = Wallet.createRandom();
  const msg = new SiweMessage({
    domain: "listen.tinycloud.xyz",
    address: wallet.address,
    uri: "https://listen.tinycloud.xyz",
    version: "1",
    chainId: 1,
    nonce: "a".repeat(17),
    issuedAt: new Date().toISOString(),
    ...overrides,
  });
  const message = msg.prepareMessage();
  return { message, signature: await wallet.signMessage(message), address: wallet.address };
}

describe("verifySIWE", () => {
  const allowedDomains = new Set(["listen.tinycloud.xyz"]);

  test("accepts a message whose domain is in the allowlist", async () => {
    const { message, signature, address } = await signedSiwe();

    await expect(verifySIWE(message, signature, allowedDomains)).resolves.toEqual({
      address,
      nonce: "a".repeat(17),
    });
  });

  test("rejects when the message domain is not in the allowlist", async () => {
    const { message, signature } = await signedSiwe({
      domain: "evil.example",
      uri: "https://evil.example",
    });

    await expect(verifySIWE(message, signature, allowedDomains)).rejects.toThrow("evil.example");
  });

  test("rejects a message with expirationTime in the past", async () => {
    const { message, signature } = await signedSiwe({
      expirationTime: new Date(Date.now() - 60_000).toISOString(),
    });

    await expect(verifySIWE(message, signature, allowedDomains)).rejects.toBeDefined();
  });

  test("rejects a message with notBefore in the future", async () => {
    const { message, signature } = await signedSiwe({
      notBefore: new Date(Date.now() + 60_000).toISOString(),
    });

    await expect(verifySIWE(message, signature, allowedDomains)).rejects.toBeDefined();
  });

  test("rejects on a bad signature", async () => {
    const { message } = await signedSiwe();
    const signature = await Wallet.createRandom().signMessage(message);

    await expect(verifySIWE(message, signature, allowedDomains)).rejects.toBeDefined();
  });

  test("accepts local-dev domain when the allowlist contains it", async () => {
    const { message, signature, address } = await signedSiwe({
      domain: "listen.localhost",
      uri: "https://listen.localhost",
    });

    await expect(verifySIWE(message, signature, new Set(["listen.localhost"]))).resolves.toEqual({
      address,
      nonce: "a".repeat(17),
    });
  });
});
