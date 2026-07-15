import { describe, expect, test } from "bun:test";
import {
  LOCAL_FRONTEND_ORIGINS,
  computeAllowedSiweDomains,
  computeFrontendOrigins,
} from "../frontend-origins.js";

describe("frontend origins", () => {
  test("production excludes local origins", () => {
    const origins = computeFrontendOrigins("https://listen.tinycloud.xyz", true);

    expect(origins).toEqual(new Set(["https://listen.tinycloud.xyz"]));
    for (const origin of LOCAL_FRONTEND_ORIGINS) {
      expect(origins.has(origin)).toBe(false);
    }
  });

  test("non-production includes local origins", () => {
    const origins = computeFrontendOrigins("https://listen.tinycloud.xyz", false);

    expect(origins.has("https://listen.localhost")).toBe(true);
    expect(origins.has("https://listen.localhost:1355")).toBe(true);
    expect(origins.has("https://localhost:5173")).toBe(true);
    expect(origins.has("http://localhost:5173")).toBe(true);
  });

  test("comma-separated frontend URL parses trimmed non-empty origins", () => {
    const origins = computeFrontendOrigins("https://a.example, https://b.example, ", true);

    expect(origins).toEqual(new Set(["https://a.example", "https://b.example"]));
  });

  test("allowed SIWE domains include URL hostname and host for every origin", () => {
    const domains = computeAllowedSiweDomains([
      "https://listen.localhost:1355",
      "https://listen.tinycloud.xyz",
    ]);

    expect(domains.has("listen.localhost")).toBe(true);
    expect(domains.has("listen.localhost:1355")).toBe(true);
    expect(domains.has("listen.tinycloud.xyz")).toBe(true);
  });
});
