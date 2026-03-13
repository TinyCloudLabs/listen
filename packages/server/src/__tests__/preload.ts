import { mock } from "bun:test";

// Mock external dependencies that aren't installed in the test environment.
// These mocks must be registered before any source module tries to import them.

mock.module("@tinyboilerplate/core", () => ({
  DELEGATION_CACHE_TTL_MS: 50 * 60 * 1000,
}));

mock.module("@tinycloud/node-sdk", () => ({
  TinyCloudNode: class {},
}));
