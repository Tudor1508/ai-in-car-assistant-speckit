import { expect, test, type Page } from "@playwright/test";

const report = {
  companyName: "Tesla",
  usersCount: 2,
  activeUsersCount: 2,
  vehiclesCount: 3,
  historicalVehiclesCount: 4,
  usedVehiclesCount: 2,
  historicalUsedVehiclesCount: 3,
  tripsCount: 5,
  totalDistanceKm: 1250.5,
  vehicleTypes: [
    { vehicleType: "electric", vehiclesCount: 3, historicalVehiclesCount: 4, usedVehiclesCount: 2, tripsCount: 5 },
    { vehicleType: "combustion", vehiclesCount: 0, historicalVehiclesCount: 0, usedVehiclesCount: 0, tripsCount: 0 },
  ],
  fleetTimeline: [
    { month: "2026-09", activeVehicles: 2, allTimeVehicles: 3 },
    { month: "2026-10", activeVehicles: 3, allTimeVehicles: 4 },
  ],
  routes: [{
    origin: "Bucharest", destination: "Brasov", tripsCount: 5, uniqueUsersCount: 2, vehicleCount: 3,
    totalDistanceKm: 1250.5,
    vehicles: [{ name: "Tesla", model: "Model 3", tripsCount: 3, totalDistanceKm: 800 }],
  }],
  vehicleTopRoutes: [{ vehicleName: "Tesla", vehicleModel: "Model 3", origin: "Bucharest", destination: "Brasov", tripsCount: 3, totalDistanceKm: 800 }],
  recentTrips: [{
    createdAt: "2026-10-08T09:30:00Z", origin: "Bucharest", destination: "Brasov",
    vehicleName: "Tesla", vehicleModel: "Model 3", vehicleType: "electric", distanceKm: 250.1,
  }],
};

async function mockAccount(page: Page, role: "producer" | "user" = "producer") {
  await page.route("**/auth/me", (route) => route.fulfill({ json: { data: {
    id: "account-id", name: "Producer Account", email: "producer@example.com", email_verified: false, role,
  } } }));
}

async function mockReport(page: Page, value = report) {
  await page.route("**/producer/report", (route) => route.fulfill({ json: { data: value } }));
}

test("Producer dashboard shows brand totals, routes, and saved trips without owner details", async ({ page }) => {
  await mockAccount(page);
  await mockReport(page);
  await page.goto("/producer");

  await expect(page.getByText("Partner Insights")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tesla" })).toBeVisible();
  await expect(page.getByText("Reported distance")).toBeVisible();
  await expect(page.getByText("1,250.5 km").first()).toBeVisible();
  await expect(page.getByText("Vehicle Type")).toBeVisible();
  await expect(page.getByText("Most Used Routes")).toBeVisible();
  await expect(page.getByText("Bucharest → Brasov").first()).toBeVisible();
  await expect(page.getByText("Recent Saved Trips")).toBeVisible();
  await expect(page.getByText("producer@example.com")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Producer navigation" }).getByRole("link")).toHaveCount(2);
});

test("zero data, empty states, and retry are clear", async ({ page }) => {
  await mockAccount(page);
  const emptyReport = {
    ...report, usersCount: 0, activeUsersCount: 0, vehiclesCount: 0, historicalVehiclesCount: 0,
    usedVehiclesCount: 0, historicalUsedVehiclesCount: 0, tripsCount: 0, totalDistanceKm: 0,
    vehicleTypes: report.vehicleTypes.map((row) => ({ ...row, vehiclesCount: 0, historicalVehiclesCount: 0, usedVehiclesCount: 0, tripsCount: 0 })),
    fleetTimeline: [], routes: [], vehicleTopRoutes: [], recentTrips: [],
  };
  let requests = 0;
  await page.route("**/producer/report", (route) => {
    requests += 1;
    if (requests === 1) return route.fulfill({ status: 503, json: { error: { code: "internal_error", message: "Try again later." } } });
    return route.fulfill({ json: { data: emptyReport } });
  });
  await page.goto("/producer");
  await expect(page.getByRole("alert").filter({ hasText: "Try again later." })).toBeVisible();
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("heading", { name: "Tesla" })).toBeVisible();
  await expect(page.getByText("No saved routes for this brand yet.")).toBeVisible();
  await expect(page.getByText("No saved trips for this brand yet.")).toBeVisible();
  await expect(page.getByText("No active vehicles are associated with Tesla yet.")).toBeVisible();
  await expect(page.getByText("0 km")).toBeVisible();
});

test("Producer theme preference is reused across dashboard and profile", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("drivewise-admin-theme", "light"));
  await mockAccount(page);
  await mockReport(page);
  await page.goto("/producer");
  const dashboardBackground = page.locator("main").evaluate((element) => getComputedStyle(element.parentElement!).backgroundColor);
  await expect.poll(() => dashboardBackground).toBe("rgb(244, 247, 251)");
  await expect(page.getByRole("button", { name: "Switch to dark mode" })).toBeVisible();
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect.poll(() => page.locator("main").evaluate((element) => getComputedStyle(element.parentElement!).backgroundColor)).toBe("rgb(16, 24, 32)");
  await expect(page.getByRole("button", { name: "Switch to light mode" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("drivewise-admin-theme"))).toBe("dark");
  await page.getByRole("link", { name: "Profile" }).click();
  await expect(page.getByRole("heading", { name: "My profile" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Switch to light mode" })).toBeVisible();
  await page.getByRole("link", { name: "Back to dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Tesla" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Switch to light mode" })).toBeVisible();
});

test("other roles cannot stay in Producer pages and Producers are redirected from garage pages", async ({ page }) => {
  await mockAccount(page, "user");
  await page.goto("/producer");
  await expect(page).toHaveURL(/\/trip$/);

  await page.unrouteAll();
  await mockAccount(page, "producer");
  await page.goto("/vehicles");
  await expect(page).toHaveURL(/\/producer$/);
});
