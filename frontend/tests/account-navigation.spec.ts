import { expect, test } from "@playwright/test";

test("authenticated pages share accessible navigation and public auth pages do not", async ({ page }) => {
  const apiPort = new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").port;
  await page.route((url) => url.port === apiPort && url.pathname === "/auth/me", (route) => route.fulfill({ json: {
    data: { id: "navigation-user", name: "Navigation User", email: "navigation@example.test", email_verified: true, role: "user" },
  } }));
  await page.route((url) => url.port === apiPort && url.pathname.startsWith("/vehicles"), (route) => route.fulfill({ json: { data: { vehicles: [] } } }));
  await page.route((url) => url.port === apiPort && url.pathname === "/trips/favorites", (route) => route.fulfill({ json: { data: { favorites: [] } } }));
  await page.route((url) => url.port === apiPort && url.pathname.startsWith("/trips/history"), (route) => route.fulfill({ json: { data: { trips: [], summary: { total_trips: 0, total_distance_m: 0, total_duration_s: 0 }, pagination: { page: 1, page_size: 10, total: 0, total_pages: 0 } } } }));

  await page.goto("/register");
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toHaveCount(0);
  await page.goto("/login");
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toHaveCount(0);
  await page.goto("/trip");
  await expect(page).toHaveURL(/\/trip$/);
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(navigation.getByRole("link", { name: "Plan a trip" })).toHaveAttribute("aria-current", "page");
  await navigation.getByRole("link", { name: "Profile" }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(navigation.getByRole("link", { name: "Profile" })).toHaveAttribute("aria-current", "page");
  await navigation.getByRole("link", { name: "My vehicles" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/vehicles$/);
  await expect(navigation.getByRole("link", { name: "My vehicles" })).toHaveAttribute("aria-current", "page");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
