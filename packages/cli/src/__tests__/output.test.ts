import { describe, expect, test } from "bun:test";
import { mapError } from "../lib/output.js";

describe("mapError", () => {
  test("network error → tinycloud_unreachable", () => {
    expect(mapError(new Error("fetch failed")).code).toBe("tinycloud_unreachable");
    expect(mapError(new Error("getaddrinfo ENOTFOUND foo")).code).toBe("tinycloud_unreachable");
    expect(mapError(new Error("connect ECONNREFUSED")).code).toBe("tinycloud_unreachable");
    expect(mapError(new Error("Request timeout")).code).toBe("tinycloud_unreachable");
  });

  test("auth error → permission_denied", () => {
    expect(mapError(new Error("401 Unauthorized")).code).toBe("permission_denied");
    expect(mapError(new Error("403 Forbidden")).code).toBe("permission_denied");
    expect(mapError(new Error("permission denied on space")).code).toBe("permission_denied");
  });

  test("unknown error → internal", () => {
    expect(mapError(new Error("something weird happened")).code).toBe("internal");
    expect(mapError("plain string")).toEqual({ code: "internal", message: "plain string" });
  });

  test("preserves the original message", () => {
    expect(mapError(new Error("fetch failed: dns lookup")).message).toBe(
      "fetch failed: dns lookup",
    );
  });
});
