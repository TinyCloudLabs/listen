import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.LISTEN_E2E_FRONTEND_URL ?? "http://127.0.0.1:5183";

export default defineConfig({
  testDir: "./hooks",
  timeout: 120_000,
  globalSetup: "./hooks/global-setup.ts",
  globalTeardown: "./hooks/global-teardown.ts",
  expect: {
    timeout: 30_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    // This test injects a browser-restorable session. Do not persist traces
    // containing the backend bearer token or TinyCloud session key material.
    trace: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
