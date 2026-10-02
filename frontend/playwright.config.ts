import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be configured for Playwright.`);
  return value;
}

const apiBaseUrl = requiredEnvironmentValue("NEXT_PUBLIC_API_BASE_URL");
const frontendHost = requiredEnvironmentValue("DRIVE_WISE_FRONTEND_HOST");
const frontendPort = requiredEnvironmentValue("DRIVE_WISE_FRONTEND_PORT");
const playwrightBaseUrl = requiredEnvironmentValue("PLAYWRIGHT_BASE_URL");

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  retries: 0,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: playwrightBaseUrl,
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : undefined,
  },
  webServer: [
    { command: "powershell -NoProfile -ExecutionPolicy Bypass -File ../backend/scripts/e2e-server.ps1", url: `${apiBaseUrl}/health`, reuseExistingServer: !process.env.CI, timeout: 60_000 },
    { command: `npm run dev -- --hostname ${frontendHost} --port ${frontendPort}`, url: playwrightBaseUrl, reuseExistingServer: !process.env.CI, timeout: 120_000, env: { NEXT_PUBLIC_API_BASE_URL: apiBaseUrl } },
  ],
});
