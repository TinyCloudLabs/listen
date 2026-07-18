import { defineConfig, devices } from "@playwright/test";

process.env.LISTEN_E2E_MODE = "browser-recovery";

export default defineConfig({
  testDir: "./recovery",
  timeout: 600_000,
  globalSetup: "./hooks/global-setup.ts",
  globalTeardown: "./hooks/global-teardown.ts",
  expect: { timeout: 45_000 },
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    trace: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
