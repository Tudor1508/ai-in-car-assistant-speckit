import { expect, test } from "@playwright/test";

test("landing actions, blocked public pages, and shared theme work across route groups", async ({ page }) => {
  let role: "user" | "admin" = "user";
  const apiPort = new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").port;
  await page.route("**/auth/me", (route) => route.fulfill({ json: { data: { id: "theme-test", name: "Theme Test", email: "theme@example.test", email_verified: false, role } } }));
  await page.route((url) => url.port === apiPort && url.pathname.startsWith("/vehicles"), (route) => route.fulfill({ json: { data: { vehicles: [] } } }));
  await page.route((url) => url.port === apiPort && url.pathname.startsWith("/trips/history"), (route) => route.fulfill({ json: { data: { trips: [], summary: { total_trips: 0, total_distance_m: 0, total_duration_s: 0 }, pagination: { page: 1, page_size: 10, total: 0, total_pages: 0 } } } }));
  await page.route((url) => url.port === apiPort && /^\/admin\/(users|vehicles|producers)$/.test(url.pathname), (route) => {
    const section = new URL(route.request().url()).pathname.split("/").at(-1) ?? "users";
    return route.fulfill({ json: { data: {
      [section]: [],
      stats: { total: 0, by_status: { active: 0, disabled: 0 }, by_type: { combustion: 0, electric: 0 }, by_brand: [] },
      pagination: { page: 1, page_size: 25, total: 0, total_pages: 0 },
    } } });
  });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Start your journey" })).toHaveAttribute("href", "/login");
  const howItWorks = page.getByRole("link", { name: "How it works" });
  await expect(howItWorks).toBeVisible();
  await howItWorks.focus();
  await expect(howItWorks).toBeFocused();
  await howItWorks.press("Enter");
  await expect(page).toHaveURL(/#how-it-works$/);
  await expect(page.getByRole("heading", { name: "A clearer way to get there." })).toBeVisible();

  const footerNavigation = page.getByRole("navigation", { name: "Footer navigation" });
  await expect(footerNavigation.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
  await expect(footerNavigation.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
  await page.goto("/contact");
  await expect(page.getByRole("heading", { name: "Contact" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("blocked until the project owner provides and approves it");
  await expect(page.getByText(/@|privacy policy|we collect/i)).toHaveCount(0);
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("blocked until the project owner provides and approves it");

  await page.goto("/login");
  const lightModeToggle = page.getByRole("button", { name: "Switch to light mode" });
  await expect(lightModeToggle).toBeVisible();
  await lightModeToggle.focus();
  await expect(lightModeToggle).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Switch to dark mode" })).toBeVisible();
  await page.goto("/register");
  await expect(page.getByRole("button", { name: "Switch to dark mode" })).toBeVisible();
  await page.goto("/trip");
  await expect(page.getByRole("button", { name: "Switch to dark mode" })).toBeVisible();
  const tripMain = page.locator("main").first();
  await expect(tripMain).toBeVisible();
  await expect.poll(() => tripMain.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(244, 247, 251)");
  await page.getByRole("banner").getByRole("button", { name: "Switch to dark mode" }).click();
  await expect.poll(() => tripMain.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(8, 21, 35)");
  await page.getByRole("banner").getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.getByRole("button", { name: "Open Drivewise Assistant" })).toBeVisible();
  await page.goto("/profile");
  await expect(page.getByRole("button", { name: "Switch to dark mode" })).toBeVisible();
  await page.goto("/vehicles");
  await expect(page.getByRole("button", { name: "Switch to dark mode" })).toBeVisible();
  await page.goto("/trips");
  await expect(page.getByRole("button", { name: "Switch to dark mode" })).toBeVisible();

  role = "admin";
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 500 ? 812 : 900 });
    for (const [path, heading] of [["/admin", "Overview"], ["/admin/users", "Users"], ["/admin/producers", "Producers"], ["/admin/vehicles", "Vehicles"]] as const) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      await expect(page.getByRole("button", { name: "Switch to dark mode" })).toBeVisible();
      await expect(page.getByRole("link", { name: /drivewise/i })).toBeVisible();
      await expect(page.getByRole("button", { name: "Log out" })).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${path} overflows at ${width}px`).toBeTruthy();
    }
  }
  await page.reload();
  await expect(page.getByRole("button", { name: "Switch to dark mode" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("drivewise-theme"))).toBe("light");
});
