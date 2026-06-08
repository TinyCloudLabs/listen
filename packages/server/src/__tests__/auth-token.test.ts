import { describe, expect, test } from "bun:test";
import { issueSessionToken, verifySessionToken } from "../auth.js";

describe("session tokens", () => {
  test("preserve verified wallet address casing", async () => {
    const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const secret = "test-backend-secret";

    const { token } = await issueSessionToken(address, secret);
    const verified = await verifySessionToken(token, secret);

    expect(verified.address).toBe(address);
  });
});
