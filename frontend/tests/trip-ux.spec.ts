import { expect, test, type Page } from "@playwright/test";

const routeStop = { sequence: 1, provider_id: "station-1", name: "Fuel stop", station_type: "fuel" as const, latitude: 46.3, longitude: 23.3, leg_distance_m: 40_000, route_progress_m: 40_000 };
const routeData = {
  feasibility: { status: "complete" as const, message: null },
  vehicle: { id: "vehicle-1", current_level_percent: 50, available_range_km: 200, maximum_range_km: 400 },
  route: { geometry: { type: "LineString" as const, coordinates: [[23, 46], [23.5, 46.5], [24, 47]] as [number, number][] }, distance_m: 100_000, duration_s: 3_600 },
  legs: [{ sequence: 1, distance_m: 40_000, duration_s: 1_440 }, { sequence: 2, distance_m: 60_000, duration_s: 2_160 }],
  stops: [routeStop],
  attractions: [],
  restaurants: [],
};
const preview = {
  ...routeData,
  route_preference: "all" as const,
  selected_route_option_id: "option-1",
  route_options: [{ ...routeData, id: "option-1", attraction_count: 0, route_labels: ["fastest" as const] }],
  route_choices: [
    { preference: "fastest" as const, status: "available" as const, route_option_id: "option-1", reason: null },
    { preference: "shortest" as const, status: "unavailable" as const, route_option_id: null, reason: "no_distinct_candidates" as const },
    { preference: "scenic" as const, status: "unavailable" as const, route_option_id: null, reason: "no_attractions_found" as const },
  ],
};

async function installPlannerApi(page: Page, options: { delayedPreview?: () => Promise<void>; previewData?: typeof preview } = {}) {
  await page.route("**/auth/me", (route) => route.fulfill({ json: { data: { id: "trip-ux", name: "Trip UX", email: "trip@example.test", email_verified: true, role: "user" } } }));
  await page.route("**/auth/csrf/bootstrap", (route) => route.fulfill({ json: { data: { csrf_token: "trip-csrf" } } }));
  await page.route("**/vehicles", (route) => route.fulfill({ json: { data: { vehicles: [{ id: "vehicle-1", name: "Test vehicle", model: "Model", type: "combustion", year: 2020, range_km: 400, mileage_km: 10_000, fuel_type: "petrol", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" }] } } }));
  await page.route("**/trips/favorites", (route) => route.fulfill({ json: { data: { favorites: [] } } }));
  await page.route("**/trips/places?**", (route) => {
    const query = new URL(route.request().url()).searchParams.get("q") ?? "";
    const isOrigin = query.toLowerCase().includes("origin");
    return route.fulfill({ json: { data: { places: [{ label: isOrigin ? "Origin fixture" : "Destination fixture", latitude: isOrigin ? 46 : 47, longitude: isOrigin ? 23 : 24, provider_id: isOrigin ? "origin" : "destination" }] } } });
  });
  await page.route("**/trips/preview", async (route) => {
    await options.delayedPreview?.();
    return route.fulfill({ json: { data: options.previewData ?? preview } });
  });
}

async function selectLocation(page: Page, label: string, query: string) {
  await page.getByLabel(label).fill(query);
  await page.getByRole("option").first().click();
}

async function preparePlanner(page: Page, options: { delayedPreview?: () => Promise<void>; previewData?: typeof preview } = {}) {
  await installPlannerApi(page, options);
  await page.goto("/trip");
  await page.getByLabel("Vehicle").click();
  await page.getByRole("option", { name: /Test vehicle/ }).click();
  await page.getByRole("button", { name: /Fuel remaining/ }).click();
  await page.getByLabel("Current level percentage").fill("50");
  await page.keyboard.press("Escape");
  await selectLocation(page, "Starting point", "Origin fixture");
  await selectLocation(page, "Destination", "Destination fixture");
}

test("map region is informative before a route and range dashboard stays accessible and calculated", async ({ page }) => {
  await installPlannerApi(page);
  await page.goto("/trip");
  const mapRegion = page.getByRole("region", { name: "Trip map" });
  await expect(mapRegion).toBeVisible();
  await expect(mapRegion).toContainText("map preview will appear here after a route is generated");
  await expect(page.getByLabel(/route endpoints/i)).toHaveCount(0);

  await page.getByLabel("Vehicle").click();
  await page.getByRole("option", { name: /Test vehicle/ }).click();
  const openDashboard = page.getByRole("button", { name: /Fuel remaining/ });
  await openDashboard.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Fuel remaining dashboard" });
  await expect(dialog).toBeVisible();
  const levelInput = dialog.getByLabel("Current level percentage");
  const meter = dialog.getByRole("meter", { name: "Fuel remaining percentage" });
  await levelInput.fill("0");
  const needle = dialog.getByTestId("range-dashboard-needle");
  const needleAtZero = await needle.getAttribute("data-percent");
  await expect(meter).toHaveAttribute("aria-valuenow", "0");
  await expect(meter).toContainText("0 km of 400 km");
  await levelInput.fill("100");
  const needleAtHundred = await needle.getAttribute("data-percent");
  expect(needleAtHundred).not.toBe(needleAtZero);
  await expect(meter).toHaveAttribute("aria-valuenow", "100");
  await expect(meter).toContainText("400 km of 400 km");
  expect(await levelInput.evaluate((element) => getComputedStyle(element).appearance)).toBe("textfield");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /400 km/ })).toBeVisible();
});

test("Stop ignores a late route preview and restores planner controls", async ({ page }) => {
  let releasePreview!: () => void;
  const delayedPreview = new Promise<void>((resolve) => { releasePreview = resolve; });
  await preparePlanner(page, { delayedPreview: () => delayedPreview });
  await page.getByRole("button", { name: /Generează rutele/ }).click();
  const stop = page.getByRole("button", { name: "Stop" });
  await expect(stop).toBeVisible();
  await expect(page.getByLabel("Starting point")).toBeDisabled();
  await stop.click();
  await expect(page.getByRole("button", { name: /Generează rutele/ })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Stop" })).toHaveCount(0);
  releasePreview();
  await page.waitForTimeout(300);
  await expect(page.getByRole("heading", { name: "Generated routes" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Trip map" })).toBeVisible();
});

test("route details show contract endpoints, ordered legs, stop, and distances", async ({ page }) => {
  await preparePlanner(page);
  await page.getByRole("button", { name: /Generează rutele/ }).click();
  await expect(page.getByText("Origin fixture", { exact: true })).toBeVisible();
  await expect(page.getByText("Destination fixture", { exact: true })).toBeVisible();
  const legs = page.getByRole("list", { name: "Ordered route legs" });
  await expect(legs.getByText("Leg 1 · to Fuel stop")).toBeVisible();
  await expect(legs.getByText("Leg 2 · to Destination fixture")).toBeVisible();
  await expect(legs).toContainText("40 km");
  await expect(legs).toContainText("60 km");
  await expect(page.getByText(/1\. Fuel stop/)).toBeVisible();
});

test("successful route uses the map and keeps attribution visible when tiles fail", async ({ page }) => {
  test.skip(!process.env.NEXT_PUBLIC_MAP_TILE_URL, "No map tile provider is configured in this environment.");
  const tilePattern = new URL(process.env.NEXT_PUBLIC_MAP_TILE_URL!).origin + "/**";
  await preparePlanner(page);
  await page.route(tilePattern, (route) => route.fulfill({ status: 503, body: "Tile provider unavailable" }));
  await page.getByRole("button", { name: /Generează rutele/ }).click();
  await expect(page.getByRole("region", { name: "Map showing the planned route" })).toBeVisible();
  await expect(page.getByText("The route map is temporarily unavailable. Trip details are still available.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Map showing the planned route" }).getByLabel("Map attribution")).toBeVisible();
  await expect(page.getByText("Origin fixture", { exact: true })).toBeVisible();
  await expect(page.getByText("Destination fixture", { exact: true })).toBeVisible();
});
