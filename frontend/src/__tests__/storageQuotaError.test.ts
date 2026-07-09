import { describe, expect, it } from "vitest";
import { parseStorageQuotaError } from "../lib/storageQuotaError";

describe("parseStorageQuotaError", () => {
  it("recognizes TinyCloud quota errors and formats byte usage", () => {
    const parsed = parseStorageQuotaError(
      "Failed to initialize conversations schema: SQL batch failed: 402 - Storage quota exceeded. Used: 82313216 bytes, Limit: 62390272 bytes",
    );

    expect(parsed?.usageLabel).toBe("78.5 MB of 59.5 MB");
  });

  it("ignores non-quota errors", () => {
    expect(parseStorageQuotaError("API error (500): unavailable")).toBeNull();
  });
});
