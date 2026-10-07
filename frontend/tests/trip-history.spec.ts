import { expect, test } from "@playwright/test";

const trip = (id: number) => ({
  id: id.toString(16).padStart(32, "0"),
  origin: { label: "Bucharest", latitude: 44.4268, longitude: 26.1025 },
  destination: { label: "Timisoara", latitude: 45.7489, longitude: 21.2087 },
  created_at: new Date(Date.UTC(2026, 0, id)).toISOString(), route_preference: "fastest",
  vehicle: { id: "a".repeat(32), name: "DriveWise", model: "EV", type: "electric", current_level_percent: 80, available_range_km: 320, maximum_range_km: 400 },
  route: { geometry: { type: "LineString", coordinates: [[26.1025, 44.4268], [21.2087, 45.7489]] }, distance_m: 540000, duration_s: 21600 },
  feasibility: { status: "complete", message: null }, legs: [{ sequence: 1, distance_m: 540000, duration_s: 21600 }], stops: [], attractions: [], restaurants: [],
});

test("Trip History shows saved metadata and pages through server results", async ({ page }) => {
  let requestedPage = 0; let requestedSort = "desc";
  await page.route("**/auth/me", (route) => route.fulfill({ json: { data: { id: "u", name: "Test", email: "test@example.com", email_verified: false, role: "user" } } }));
  await page.route("**/trips/history?**", (route) => {
    const url = new URL(route.request().url()); requestedPage = Number(url.searchParams.get("page")); requestedSort = url.searchParams.get("sort_order") ?? "";
    return route.fulfill({ json: { data: { trips: requestedPage === 1 ? [trip(2)] : [trip(1)], summary: { total_trips: 11, total_distance_m: 5940000, total_duration_s: 237600 }, pagination: { page: requestedPage, page_size: 10, total: 11, total_pages: 2 } } } });
  });
  await page.goto("/trips");
  await expect(page.getByRole("heading", { name: /Trip history/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Trip history" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("5,940 km")).toBeVisible();
  await expect(page.getByText("Bucharest → Timisoara")).toBeVisible();
  await expect(page.getByText("DriveWise EV")).toBeVisible();
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect.poll(() => requestedPage).toBe(2);
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await page.getByLabel("Sort trips").click();
  await page.getByRole("option", { name: "Oldest first" }).click();
  await expect.poll(() => requestedPage).toBe(1);
  await expect.poll(() => requestedSort).toBe("asc");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect.poll(() => requestedPage).toBe(2);
  await expect.poll(() => requestedSort).toBe("asc");
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText("Bucharest → Timisoara")).toBeVisible();
  const overflow = await page.evaluate(() => Array.from(document.querySelectorAll("body *")).map((element) => ({ tag: element.tagName, text: element.textContent?.slice(0, 36), cls: (element as HTMLElement).className.toString().slice(0, 80), right: Math.round(element.getBoundingClientRect().right), width: Math.round(element.getBoundingClientRect().width) })).filter((item) => item.right > innerWidth + 1).slice(0, 8));
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width, JSON.stringify(overflow)).toBeLessThanOrEqual(390);
});

test("Trip History keeps trip details available when configured map tiles fail", async ({ page }) => {
  test.skip(!process.env.NEXT_PUBLIC_MAP_TILE_URL, "Configured map tiles are unavailable in this environment.");
  const tilePattern = new URL(process.env.NEXT_PUBLIC_MAP_TILE_URL!).origin + "/**";
  await page.route("**/auth/me", (route) => route.fulfill({ json: { data: { id: "u", name: "Test", email: "test@example.com", email_verified: false, role: "user" } } }));
  await page.route("**/trips/history?**", (route) => route.fulfill({ json: { data: { trips: [trip(1)], summary: { total_trips: 1, total_distance_m: 540000, total_duration_s: 21600 }, pagination: { page: 1, page_size: 10, total: 1, total_pages: 1 } } } }));
  await page.route(tilePattern, (route) => route.fulfill({ status: 503, body: "Unavailable" }));
  await page.goto("/trips");
  await expect(page.getByText("The route map is temporarily unavailable.")).toBeVisible();
  await expect(page.getByText("Bucharest → Timisoara")).toBeVisible();
  await expect(page.getByRole("heading", { name: "540 km" })).toBeVisible();
  await expect(page.getByText("DriveWise EV")).toBeVisible();
  await expect(page.getByText("6 h 0 min", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Fastest", { exact: true })).toBeVisible();
  await expect(page.locator("time")).toBeVisible();
});

test("Trip History presents empty and retrieval error states", async ({ page }) => {
  let fail = false;
  await page.route("**/auth/me", (route) => route.fulfill({ json: { data: { id: "u", name: "Test", email: "test@example.com", email_verified: false, role: "user" } } }));
  await page.route("**/trips/history?**", async (route) => {
    if (fail) return route.fulfill({ status: 500, json: { error: { code: "internal_error", message: "History unavailable" } } });
    await new Promise((resolve) => setTimeout(resolve, 500));
    return route.fulfill({ json: { data: { trips: [], summary: { total_trips: 0, total_distance_m: 0, total_duration_s: 0 }, pagination: { page: 1, page_size: 10, total: 0, total_pages: 0 } } } });
  });
  await page.goto("/trips");
  await expect(page.getByText(/Loading trip history(?:\.{3}|…)/)).toBeVisible();
  await expect(page.getByText("No trips saved yet")).toBeVisible();
  fail = true;
  await page.reload();
  await expect(page.getByText("History unavailable")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});

test("invalid persisted geometry has a separate fallback and keeps trip details", async ({ page }) => {
  const invalid = trip(1) as ReturnType<typeof trip>;
  invalid.route.geometry.coordinates = [];
  await page.route("**/auth/me", (route) => route.fulfill({ json: { data: { id: "u", name: "Test", email: "test@example.com", email_verified: false, role: "user" } } }));
  await page.route("**/trips/history?**", (route) => route.fulfill({ json: { data: { trips: [invalid], summary: { total_trips: 1, total_distance_m: 540000, total_duration_s: 21600 }, pagination: { page: 1, page_size: 10, total: 1, total_pages: 1 } } } }));
  await page.goto("/trips");
  await expect(page.getByText("The saved route map is unavailable because its route geometry is missing or invalid.")).toBeVisible();
  await expect(page.getByText("Bucharest → Timisoara")).toBeVisible();
});
