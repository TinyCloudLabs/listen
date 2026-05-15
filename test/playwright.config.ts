import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.APP_URL ?? "http://127.0.0.1:5173";

export default defineConfig({
  testDir: "./app",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.APP_URL
    ? undefined
    : {
        command:
          "VITE_BACKEND_URL=http://127.0.0.1:5173 bun run --cwd ../frontend dev -- --host 127.0.0.1",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
