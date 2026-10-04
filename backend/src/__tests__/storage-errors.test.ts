import { describe, it, expect } from "bun:test";
import { STORAGE_TOO_LARGE_SAVE_MESSAGE, StorageFullError, storageErrorCode } from "@listen/core";
import { throwIfStorageRejected } from "../storage-errors.js";

describe("storageErrorCode", () => {
  it("detects SDK 2.8.0 SQL 402s by the node text", () => {
    expect(
      storageErrorCode({
        code: "NETWORK_ERROR",
        message: "SQL execute failed: 402 - Storage quota exceeded. Used: 1 bytes, Limit: 0 bytes",
      }),
    ).toBe("STORAGE_QUOTA_EXCEEDED");
  });

  it("detects a write larger than what is left", () => {
    expect(storageErrorCode({ code: "STORAGE_LIMIT_REACHED", message: "too big" })).toBe(
      "STORAGE_LIMIT_REACHED",
    );
    expect(storageErrorCode(new Error("write exceeds remaining storage"))).toBe(
      "STORAGE_LIMIT_REACHED",
    );
  });

  it("does not treat SQL rate limiting or other failures as storage", () => {
    expect(storageErrorCode({ code: "SQL_QUOTA_EXCEEDED", message: "Too many requests" })).toBe(
      null,
    );
    expect(storageErrorCode(new Error("SQL batch failed: 524 - A timeout occurred"))).toBe(null);
  });
});

describe("throwIfStorageRejected", () => {
  it("throws the too-large copy for a 413 storage rejection", () => {
    let thrown: unknown;
    try {
      throwIfStorageRejected({ ok: false, error: { code: "STORAGE_LIMIT_REACHED" } });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(StorageFullError);
    expect((thrown as Error).message).toBe(STORAGE_TOO_LARGE_SAVE_MESSAGE);
  });

  it("leaves other write failures to the caller", () => {
    expect(() =>
      throwIfStorageRejected({ ok: false, error: { message: "SQL unavailable" } }),
    ).not.toThrow();
  });
});
