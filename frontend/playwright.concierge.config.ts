import { defineConfig, devices } from "@playwright/test";

const apiBaseUrl = "http://127.0.0.1:8765";
const frontendBaseUrl = "http://127.0.0.1:3011";

export default defineConfig({
  testDir: "./tests",
  testMatch: ["concierge.spec.ts", "concierge.integration.spec.ts"],
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: frontendBaseUrl },
  webServer: [
    {
      command: ".\\.venv\\Scripts\\python.exe tests\\fake_assistant_e2e_server.py",
      cwd: "../backend",
      url: `${apiBaseUrl}/health`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 3011",
      url: frontendBaseUrl,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { NEXT_PUBLIC_API_BASE_URL: apiBaseUrl },
    },
  ],
});
