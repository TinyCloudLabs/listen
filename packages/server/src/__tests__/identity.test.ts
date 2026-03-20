import { describe, test, expect, mock, beforeEach } from "bun:test";
import { withSessionRefresh } from "../identity.js";

function createMockNode() {
  return {
    signIn: mock(() => Promise.resolve()),
  };
}

describe("withSessionRefresh", () => {
  let mockNode: ReturnType<typeof createMockNode>;

  beforeEach(() => {
    mockNode = createMockNode();
  });

  test("returns the function result on success", async () => {
    const result = await withSessionRefresh(mockNode as any, () => Promise.resolve("ok"));
    expect(result).toBe("ok");
    expect(mockNode.signIn).not.toHaveBeenCalled();
  });

  test("retries once after session-related error", async () => {
    let callCount = 0;
    const fn = mock(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error("session expired"));
      }
      return Promise.resolve("recovered");
    });

    const result = await withSessionRefresh(mockNode as any, fn);

    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(mockNode.signIn).toHaveBeenCalledTimes(1);
  });

  test("re-throws non-session errors without retrying", async () => {
    const fn = mock(() => Promise.reject(new Error("network timeout")));

    await expect(withSessionRefresh(mockNode as any, fn)).rejects.toThrow("network timeout");

    expect(fn).toHaveBeenCalledTimes(1);
    expect(mockNode.signIn).not.toHaveBeenCalled();
  });

  test("calls node.signIn() before retry", async () => {
    const callOrder: string[] = [];

    mockNode.signIn = mock(() => {
      callOrder.push("signIn");
      return Promise.resolve();
    });

    let callCount = 0;
    const fn = mock(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error("401 Unauthorized"));
      }
      callOrder.push("fn-retry");
      return Promise.resolve("done");
    });

    await withSessionRefresh(mockNode as any, fn);

    expect(callOrder).toEqual(["signIn", "fn-retry"]);
  });

  describe("session error detection", () => {
    const sessionErrorMessages = [
      "session expired",
      "invalid session token",
      "expired credentials",
      "401 Not Authorized",
      "Unauthorized access",
      "unauthorized request",
    ];

    for (const msg of sessionErrorMessages) {
      test(`retries on error: "${msg}"`, async () => {
        let callCount = 0;
        const fn = mock(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.reject(new Error(msg));
          }
          return Promise.resolve("ok");
        });

        const result = await withSessionRefresh(mockNode as any, fn);
        expect(result).toBe("ok");
        expect(mockNode.signIn).toHaveBeenCalledTimes(1);
      });
    }
  });

  test("does not retry on generic errors", async () => {
    const nonSessionErrors = ["not found", "internal server error", "rate limited", "ECONNREFUSED"];

    for (const msg of nonSessionErrors) {
      const node = createMockNode();
      const fn = mock(() => Promise.reject(new Error(msg)));

      await expect(withSessionRefresh(node as any, fn)).rejects.toThrow(msg);
      expect(node.signIn).not.toHaveBeenCalled();
    }
  });

  describe("false positive rejection", () => {
    const falsePositives = [
      "Failed to update session preferences for user 401-smith",
      "session preferences not found",
      "session config invalid",
      "subscription expired",
    ];

    for (const msg of falsePositives) {
      test(`does NOT retry on: "${msg}"`, async () => {
        const node = createMockNode();
        const fn = mock(() => Promise.reject(new Error(msg)));

        await expect(withSessionRefresh(node as any, fn)).rejects.toThrow();
        expect(node.signIn).not.toHaveBeenCalled();
      });
    }
  });
});
