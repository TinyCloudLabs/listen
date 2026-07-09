import { describe, it, expect, jest, afterEach } from "bun:test";
import { withTimeout } from "../middleware/timeout.js";

// A promise that never settles, so only the timeout can reject the wrapper.
function never<T>(): Promise<T> {
  return new Promise<T>(() => {});
}

describe("withTimeout", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("rejects with the default 10s timeout", async () => {
    jest.useFakeTimers();
    let rejected: unknown = null;
    withTimeout(never()).catch((err) => {
      rejected = err;
    });

    jest.advanceTimersByTime(9999);
    await Promise.resolve();
    expect(rejected).toBeNull();

    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(rejected).toBeInstanceOf(Error);
    expect((rejected as Error).message).toContain("timed out");
  });

  it("honors an explicit timeout over the default", async () => {
    jest.useFakeTimers();
    let rejected: unknown = null;
    withTimeout(never(), 50).catch((err) => {
      rejected = err;
    });

    jest.advanceTimersByTime(49);
    await Promise.resolve();
    expect(rejected).toBeNull();

    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(rejected).toBeInstanceOf(Error);
  });
});
