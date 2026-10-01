import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  timeout: 60_000,
  retries: 0,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : undefined,
  },
  webServer: [
    { command: "powershell -NoProfile -ExecutionPolicy Bypass -File ../backend/scripts/e2e-server.ps1", url: "http://localhost:8000/health", reuseExistingServer: !process.env.CI, timeout: 60_000 },
    { command: "npm run dev -- --hostname localhost", url: "http://localhost:3000", reuseExistingServer: !process.env.CI, timeout: 120_000, env: { NEXT_PUBLIC_API_BASE_URL: "http://localhost:8000" } },
  ],
});
