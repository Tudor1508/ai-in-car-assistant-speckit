import { expect, test, type Page } from "@playwright/test";
import type { TripRoutePreview } from "../src/features/trips/tripsSlice";

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be configured for live trip scenarios.`);
  return value;
};
const accountName = required("TRIP_TEST_ACCOUNT_NAME");
const accountEmail = required("TRIP_TEST_ACCOUNT_EMAIL");
const accountPassword = required("TRIP_TEST_ACCOUNT_PASSWORD");
const vehicleName = required("TRIP_TEST_VEHICLE_NAME");
const vehicleModel = required("TRIP_TEST_VEHICLE_MODEL");
const vehicleYear = required("TRIP_TEST_VEHICLE_YEAR");
const vehicleMileage = required("TRIP_TEST_VEHICLE_MILEAGE_KM");
const vehicleType = required("TRIP_TEST_VEHICLE_TYPE");
const fuelType = vehicleType === "combustion" ? required("TRIP_TEST_FUEL_TYPE") : "";
const originQuery = required("TRIP_TEST_ORIGIN_QUERY");
const destinationQuery = required("TRIP_TEST_DESTINATION_QUERY");
const unresolvedQuery = required("TRIP_TEST_UNRESOLVED_QUERY");
const rangeKm = required("TRIP_TEST_VEHICLE_RANGE_KM");
const currentPercent = required("TRIP_TEST_CURRENT_LEVEL_PERCENT");
const stopOriginQuery = required("TRIP_TEST_STOP_ORIGIN_QUERY");
const stopDestinationQuery = required("TRIP_TEST_STOP_DESTINATION_QUERY");
const stopRangeKm = required("TRIP_TEST_STOP_VEHICLE_RANGE_KM");
const stopPercent = required("TRIP_TEST_STOP_CURRENT_LEVEL_PERCENT");
const noStationOrigin = required("TRIP_TEST_NO_STATION_ORIGIN_QUERY");
const noStationDestination = required("TRIP_TEST_NO_STATION_DESTINATION_QUERY");
const noStationRange = required("TRIP_TEST_NO_STATION_VEHICLE_RANGE_KM");
const noStationPercent = required("TRIP_TEST_NO_STATION_CURRENT_LEVEL_PERCENT");
const currentLatitude = Number(required("TRIP_TEST_CURRENT_LOCATION_LATITUDE"));
const currentLongitude = Number(required("TRIP_TEST_CURRENT_LOCATION_LONGITUDE"));

function emailFor(label: string) {
  const [name, domain] = accountEmail.split("@");
  return `${name}+trip-${label}-${Date.now()}@${domain}`;
}

async function registerAndLogin(page: Page, label: string) {
  const email = emailFor(label);
  await page.goto("/register");
  await page.getByLabel("Nume complet").fill(accountName);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Parol/).fill(accountPassword);
  await page.getByLabel(/Confirm/).fill(accountPassword);
  await page.getByRole("button", { name: /Creează cont/i }).click();
  await expect(page.getByText(/Contul a fost creat/)).toBeVisible();
  await page.getByRole("link", { name: "Autentificare" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Parol/).fill(accountPassword);
  await page.getByRole("button", { name: /Autentificare/i }).click();
  await expect(page).toHaveURL(/\/trip$/);
}

async function addVehicle(page: Page, suffix: string, range: string, requestedType = vehicleType) {
  await page.goto("/vehicles");
  await page.getByRole("button", { name: /Adaugă vehicul/i }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nume vehicul").fill(`${vehicleName} ${suffix}`);
  await dialog.getByLabel("Model").fill(vehicleModel);
  await dialog.getByLabel("Tip").click();
  await page.getByRole("option", { name: requestedType === "electric" ? "Electric" : "Combustie" }).click();
  await dialog.getByLabel("An").fill(vehicleYear);
  await dialog.getByLabel("Autonomie (km)").fill(range);
  await dialog.getByLabel("Kilometraj (km)").fill(vehicleMileage);
  if (requestedType === "combustion") {
    const fuelLabels: Record<string, string> = { petrol: "Benzină", diesel: "Diesel", lpg: "GPL", cng: "GNC", other: "Alt tip" };
    await dialog.getByLabel("Combustibil").click();
    await page.getByRole("option", { name: fuelLabels[fuelType] }).click();
  }
  await dialog.getByRole("button", { name: "Salvează" }).click();
  await expect(page.getByText(`${vehicleName} ${suffix}`)).toBeVisible();
}

function scenicPreviewFixture(stationType: "fuel" | "charging", attractions: TripRoutePreview["attractions"]): TripRoutePreview {
  const route = { geometry: { type: "LineString" as const, coordinates: [[23, 46], [23.5, 46.5], [24, 47]] as [number, number][] }, distance_m: 100_000, duration_s: 3_600 };
  const stops: TripRoutePreview["stops"] = [{ sequence: 1, provider_id: `fixture-${stationType}`, name: null, station_type: stationType, latitude: 46.4, longitude: 23.4, leg_distance_m: 40_000, route_progress_m: 40_000 }];
  const shared = { feasibility: { status: "complete" as const, message: null }, vehicle: { id: "fixture-vehicle", current_level_percent: 100, available_range_km: 500, maximum_range_km: 500 }, legs: [{ sequence: 1, distance_m: 40_000, duration_s: 1_440 }, { sequence: 2, distance_m: 60_000, duration_s: 2_160 }] };
  const fastest = { ...shared, id: "fastest-option-fixture", attraction_count: 0, route_labels: ["fastest" as const], route, stops: [], attractions: [] };
  const shortestRoute = { ...route, geometry: { ...route.geometry, coordinates: [[23, 46], [23.25, 46.75], [24, 47]] as [number, number][] }, distance_m: 95_000, duration_s: 3_900 };
  const shortest = { ...shared, id: "shortest-option-fixture", attraction_count: 0, route_labels: ["shortest" as const], route: shortestRoute, stops: [], attractions: [] };
  const scenicRoute = { ...route, geometry: { ...route.geometry, coordinates: [[23, 46], [23.6, 46.4], [24, 47]] as [number, number][] }, distance_m: 110_000, duration_s: 4_200 };
  const scenic = { ...shared, id: "scenic-option-fixture", attraction_count: attractions?.length ?? 0, route_labels: ["scenic" as const], route: scenicRoute, stops, attractions: attractions ?? [] };
  return {
    ...fastest,
    route_preference: "all",
    selected_route_option_id: fastest.id,
    route_options: [fastest, shortest, scenic],
    route_choices: [
      { preference: "fastest", status: "available", route_option_id: fastest.id, reason: null },
      { preference: "shortest", status: "available", route_option_id: shortest.id, reason: null },
      { preference: "scenic", status: "available", route_option_id: scenic.id, reason: null },
    ],
    attractions: [],
    restaurants: [],
  };
}

async function prepareScenicFixtureScenario(page: Page, suffix: string, requestedType: "combustion" | "electric", preview: TripRoutePreview): Promise<TripRoutePreview> {
  await page.route("**/trips/places?*", async (route) => {
    const query = new URL(route.request().url()).searchParams.get("q") ?? "";
    const isOrigin = query.toLowerCase().includes("origin");
    await route.fulfill({ json: { data: { places: [{ label: isOrigin ? "Origin fixture" : "Destination fixture", latitude: isOrigin ? 46 : 47, longitude: isOrigin ? 23 : 24, provider_id: isOrigin ? "origin-fixture" : "destination-fixture" }] } } });
  });
  await page.route("**/trips/preview", (route) => route.fulfill({ json: { data: preview } }));
  await registerAndLogin(page, `scenic-fixture-${suffix}`);
  await addVehicle(page, suffix, "500", requestedType);
  await page.goto("/");
  await selectPlace(page, "Punct de plecare", "Origin fixture");
  await selectPlace(page, "Destinație", "Destination fixture");
  await page.getByLabel("Vehicul").click();
  await page.getByRole("option").first().click();
  await page.getByLabel("Nivel curent procentual").fill("100");
  const previewResponse = page.waitForResponse((response) => response.url().endsWith("/trips/preview"));
  const previewButton = page.getByRole("button", { name: /Genereaz/ });
  await previewButton.click();
  const response = await previewResponse;
  const responseBody = await response.json() as { data: TripRoutePreview };
  expect((await response.request().postDataJSON()).route_preference).toBe("all");
  await page.getByRole("button", { name: /Scenic/ }).click();
  await expect(page.getByRole("heading", { name: /Scenic/ })).toBeVisible();
  return responseBody.data;
}

async function selectPlace(page: Page, label: string, query: string) {
  await page.getByLabel(label).fill(query);
  await page.getByRole("option").first().click();
}

async function previewConfiguredRoute(page: Page, scenario: {
  origin: string; destination: string; range: string; percent: string; vehicleSuffix: string; preference?: "fastest" | "shortest" | "scenic";
}): Promise<TripRoutePreview | null> {
  await addVehicle(page, scenario.vehicleSuffix, scenario.range);
  await page.goto("/");
  await selectPlace(page, "Punct de plecare", scenario.origin);
  await selectPlace(page, "Destina\u021bie", scenario.destination);
  await page.getByLabel("Vehicul").click();
  await page.getByRole("option").first().click();
  await page.getByLabel("Nivel curent procentual").fill(scenario.percent);
  const preference = scenario.preference ?? "fastest";
  const originInput = page.getByLabel("Punct de plecare");
  const destinationInput = page.getByLabel("Destina\u021bie");
  const selectedOrigin = await originInput.inputValue();
  const selectedDestination = await destinationInput.inputValue();
  const previewButton = page.getByRole("button", { name: /Genereaz/ });
  const previewResponse = page.waitForResponse((response) => response.url().endsWith("/trips/preview"));
  const loadingState = expect(previewButton).toBeDisabled();
  await previewButton.click();
  await loadingState;
  const response = await previewResponse;
  const body = await response.json() as { data?: TripRoutePreview; error?: { code?: string } };
  if (!response.ok()) {
    if (body.error?.code === "routing_provider_unavailable") {
      test.skip(true, "ORS routing is unavailable for this live integration request.");
    }
    await expect(originInput).toHaveValue(selectedOrigin);
    await expect(destinationInput).toHaveValue(selectedDestination);
    if (preference === "scenic" && body.error?.code === "route_preference_unavailable") return null;
    throw new Error(`Unexpected trip preview error: ${body.error?.code ?? response.status()}`);
  }
  await expect(originInput).toHaveValue(selectedOrigin);
  await expect(destinationInput).toHaveValue(selectedDestination);
  expect(body.data?.route_preference).toBe("all");
  const choice = body.data?.route_choices?.find((item) => item.preference === preference);
  if (!choice || choice.status !== "available" || !choice.route_option_id) return null;
  const option = body.data?.route_options?.find((item) => item.id === choice.route_option_id);
  if (!option) throw new Error(`The ${preference} route choice has no matching option.`);
  if (preference !== "fastest") await page.getByRole("button", { name: new RegExp(preference === "shortest" ? "Shortest" : "Scenic") }).click();
  const selectedPreview = { ...body.data!, ...option, route_preference: preference, selected_route_option_id: option.id, route_options: [option] };
  expect(selectedPreview.selected_route_option_id).toBe(option.id);
  expect(selectedPreview.route.distance_m).toBe(option.route.distance_m);
  expect(selectedPreview.route.duration_s).toBe(option.route.duration_s);
  return selectedPreview;
}

test("no-vehicle guidance, unresolved search, permission denial, and responsive keyboard flow", async ({ page, context }) => {
  await registerAndLogin(page, "no-vehicle");
  await expect(page.getByText(/Adaugă un vehicul în My vehicles/)).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "My vehicles" })).toBeVisible();

  const origin = page.getByLabel("Punct de plecare");
  await origin.fill(unresolvedQuery);
  await expect(page.getByText("Nu am găsit sugestii")).toBeVisible({ timeout: 15000 });
  await expect(origin).toHaveValue(unresolvedQuery);
  await page.getByRole("button", { name: "Reîncearcă căutarea" }).click();
  await expect(origin).toHaveValue(unresolvedQuery);
  await origin.focus();
  await page.keyboard.press("Control+A");
  await page.keyboard.type(originQuery);
  await expect(page.getByRole("option").first()).toBeVisible({ timeout: 15000 });
  await page.keyboard.press("Escape");

  await context.grantPermissions([], { origin: page.url().replace(/\/$/, "") });
  await page.getByRole("button", { name: "Folosește locația curentă" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /Nu am putut accesa locația|nu oferă acces/i })).toBeVisible();
  await expect(origin).toHaveValue(originQuery);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("Destinație")).toBeVisible();
});

test("current location action uses configured browser coordinates after permission is granted", async ({ page, context }) => {
  await registerAndLogin(page, "current-location");
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: currentLatitude, longitude: currentLongitude });
  await page.getByRole("button", { name: "Folosește locația curentă" }).click();
  await expect(page.getByLabel("Punct de plecare")).toHaveValue(new RegExp(`Locația mea \\(${currentLatitude.toFixed(4)}`));
});

test("range-feasible live route shows map, metrics, and visible attribution", async ({ page }) => {
  await registerAndLogin(page, "range-feasible");
  await previewConfiguredRoute(page, { origin: originQuery, destination: destinationQuery, range: rangeKm, percent: currentPercent, vehicleSuffix: "range" });
  await expect(page.getByText("Distanță", { exact: true })).toBeVisible({ timeout: 90000 });
  await expect(page.getByText("Timp la volan", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Hartă cu traseul planificat")).toBeVisible();
  await expect(page.locator(".leaflet-control-attribution")).toBeVisible();
});

test("configured route needing stops lists real stations and per-leg distances", async ({ page }) => {
  await registerAndLogin(page, "with-stops");
  const preview = await previewConfiguredRoute(page, { origin: stopOriginQuery, destination: stopDestinationQuery, range: stopRangeKm, percent: stopPercent, vehicleSuffix: "stops" });
  if (!preview) throw new Error("The configured Fastest route did not return a preview.");
  await expect(page.getByText("Etapele traseului")).toBeVisible({ timeout: 90000 });
  await expect(page.getByText("Opriri", { exact: true })).toBeVisible();
  await expect(page.getByLabel(/Hart.*cu traseul planificat/)).toBeVisible();
  await expect(page.getByText(/Etapa 1/)).toBeVisible();
  expect(preview.stops.length).toBeGreaterThan(0);
  expect(preview.stops.map((stop) => stop.sequence)).toEqual(preview.stops.map((_, index) => index + 1));
  expect(preview.stops.every((stop) => stop.station_type === (vehicleType === "electric" ? "charging" : "fuel"))).toBeTruthy();
  const energyMarkers = page.locator(".leaflet-overlay-pane path.energy-stop-marker");
  await expect(energyMarkers).toHaveCount(preview.stops.length);
  const markerClasses = await energyMarkers.evaluateAll((nodes) => nodes.map((node) => [...node.classList]));
  expect(markerClasses.map((classes) => classes.find((value) => value.startsWith("energy-stop-sequence-")))).toEqual(
    preview.stops.map((stop) => `energy-stop-sequence-${stop.sequence}`),
  );
  expect(markerClasses.map((classes) => classes.find((value) => value.startsWith("energy-stop-type-")))).toEqual(
    preview.stops.map((stop) => `energy-stop-type-${stop.station_type}`),
  );
  for (const stop of preview.stops) {
    const label = `${stop.sequence}. ${stop.name ?? (stop.station_type === "charging" ? "Stație de încărcare" : "Stație de alimentare")}`;
    const stopTitle = page.getByText(label, { exact: true });
    await expect(stopTitle).toBeVisible();
    await expect(stopTitle.locator("xpath=../..")).toContainText(
      stop.station_type === "charging" ? "Încărcare" : "Combustibil compatibil",
    );
  }
});

test("configured route without a feasible station chain is clearly incomplete", async ({ page }) => {
  await registerAndLogin(page, "incomplete");
  const preview = await previewConfiguredRoute(page, { origin: noStationOrigin, destination: noStationDestination, range: noStationRange, percent: noStationPercent, vehicleSuffix: "incomplete" });
  if (!preview) throw new Error("The configured Fastest route did not return a preview.");
  expect(preview.feasibility.status).toBe("incomplete");
  await expect(page.getByRole("status").filter({ hasText: /No compatible station|maximum number of stops|incomplet/i })).toBeVisible({ timeout: 90000 });

  const scenic = await previewConfiguredRoute(page, { origin: noStationOrigin, destination: noStationDestination, range: noStationRange, percent: noStationPercent, vehicleSuffix: "incomplete-scenic", preference: "scenic" });
  if (scenic) {
    expect(scenic.feasibility.status).toBe("incomplete");
    await expect(page.getByRole("status").filter({ hasText: /No compatible station|maximum number of stops|incomplet/i })).toBeVisible({ timeout: 90000 });
    await expect(page.getByText(/Atrac.*recomandate/)).toBeVisible();
    await expect(page.locator(".leaflet-overlay-pane path.energy-stop-marker")).toHaveCount(scenic.stops.length);
    await expect(page.locator(".leaflet-overlay-pane path.tourist-attraction-marker")).toHaveCount(scenic.attractions?.length ?? 0);
  } else {
    await expect(page.getByRole("alert").filter({ hasText: /scenic.*nu este disponibil/i })).toBeVisible();
  }
});

test("shortest and scenic preferences identify their result or explain Scenic unavailability", async ({ page }) => {
  await registerAndLogin(page, "route-preferences");
  const shortest = await previewConfiguredRoute(page, { origin: originQuery, destination: destinationQuery, range: rangeKm, percent: currentPercent, vehicleSuffix: "shortest", preference: "shortest" });
  if (!shortest) throw new Error("The configured Shortest route did not return a preview.");
  expect(shortest.route_preference).toBe("shortest");
  expect(shortest.selected_route_option_id).toBe(shortest.route_options?.[0]?.id);
  expect(shortest.route.distance_m).toBe(shortest.route_options?.[0]?.route.distance_m);
  expect(shortest.route.duration_s).toBe(shortest.route_options?.[0]?.route.duration_s);
  const shortestHeading = page.getByRole("heading", { name: /Shortest/ });
  await expect(shortestHeading).toBeVisible({ timeout: 90000 });
  let previewRequestsAfterSelection = 0;
  const countPreviewRequest = (request: import("@playwright/test").Request) => {
    if (request.url().endsWith("/trips/preview")) previewRequestsAfterSelection += 1;
  };
  page.on("request", countPreviewRequest);
  await page.getByRole("button", { name: /Scenic/ }).click();
  expect(previewRequestsAfterSelection).toBe(0);
  await expect(shortestHeading).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Scenic/ })).toBeVisible();
  await expect(page.getByLabel(/Hart.*cu traseul planificat/)).toBeVisible();
  page.off("request", countPreviewRequest);

  const scenic = await previewConfiguredRoute(page, { origin: originQuery, destination: destinationQuery, range: rangeKm, percent: currentPercent, vehicleSuffix: "scenic", preference: "scenic" });
  const scenicSuccess = page.getByRole("heading", { name: /Scenic/ });
  const scenicUnavailable = page.getByRole("alert").filter({ hasText: /scenic.*nu este disponibil/i });
  await expect(scenicSuccess.or(scenicUnavailable)).toBeVisible({ timeout: 90000 });
  if (scenic) {
    expect(scenic.route_preference).toBe("scenic");
    expect(scenic.selected_route_option_id).toBe(scenic.route_options?.[0]?.id);
    expect(scenic.route.distance_m).toBe(scenic.route_options?.[0]?.route.distance_m);
    expect(scenic.route.duration_s).toBe(scenic.route_options?.[0]?.route.duration_s);
    expect(scenic.route_options?.every((option) => option.attraction_count === scenic.route_options?.[0]?.attraction_count)).toBeTruthy();
    await expect(page.getByText(/Atrac.*recomandate/)).toBeVisible();
    expect(scenic.attractions).toEqual(scenic.route_options?.[0]?.attractions);
    expect(scenic.attractions?.map((item) => item.sequence)).toEqual(scenic.attractions?.map((_, index) => index + 1));
    const attractionMarkers = page.locator(".leaflet-overlay-pane path.tourist-attraction-marker");
    await expect(attractionMarkers).toHaveCount(scenic.attractions?.length ?? 0);
    const markerClasses = await attractionMarkers.evaluateAll((nodes) => nodes.map((node) => [...node.classList]));
    expect(markerClasses.map((classes) => classes.find((value) => value.startsWith("tourist-sequence-")))).toEqual(
      (scenic.attractions ?? []).map((item) => `tourist-sequence-${item.sequence}`),
    );
    expect(markerClasses.map((classes) => classes.find((value) => value.startsWith("tourist-category-")))).toEqual(
      (scenic.attractions ?? []).map((item) => `tourist-category-${item.category}`),
    );
    if (scenic.attractions?.length === 0) {
      await expect(page.getByText(/Nu au fost g.*site atrac.*turistice pe acest traseu/)).toBeVisible();
    }
    for (const attraction of scenic.attractions ?? []) {
      await expect(page.getByText(`${attraction.sequence}. ${attraction.name ?? attraction.category}`, { exact: true })).toBeVisible();
      const progress = `${(attraction.route_progress_m / 1000).toLocaleString("ro-RO", { maximumFractionDigits: 1 })} km`;
      await expect(page.getByText(`${attraction.category} · ${progress} de la plecare · ${attraction.latitude.toFixed(5)}, ${attraction.longitude.toFixed(5)}`, { exact: true })).toBeVisible();
    }
    if ((scenic.route_options?.length ?? 0) > 1) {
      for (const option of scenic.route_options ?? []) {
        const distanceLabel = `${(option.route.distance_m / 1000).toLocaleString("ro-RO", { maximumFractionDigits: 1 })} km`;
        const durationLabel = `${Math.round(option.route.duration_s / 60)} min`;
        await expect(page.getByRole("button", { name: new RegExp(`${distanceLabel}.*${durationLabel}`) })).toBeVisible();
      }
    }
    await page.getByRole("button", { name: /Fastest/ }).click();
    await expect(scenicSuccess).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Fastest/ })).toBeVisible();
    await expect(page.getByLabel(/Hart.*cu traseul planificat/)).toBeVisible();
  } else {
    await page.getByRole("button", { name: /Fastest/ }).click();
    const fastest = await previewConfiguredRoute(page, { origin: originQuery, destination: destinationQuery, range: rangeKm, percent: currentPercent, vehicleSuffix: "fastest-after-scenic", preference: "fastest" });
    if (!fastest) throw new Error("Fastest did not return a preview after Scenic was unavailable.");
    expect(fastest.route_preference).toBe("fastest");
    await expect(page.getByRole("heading", { name: /Fastest/ })).toBeVisible({ timeout: 90000 });
    test.skip(true, "Scenic was unavailable from the live provider; fallback was verified, but attraction marker/list parity was not exercised.");
  }
});

test("one Generate routes request returns canonical choices and switching stays local", async ({ page }) => {
  const attraction: NonNullable<TripRoutePreview["attractions"]>[number] = { source_id: "scenic-only", name: "Scenic fixture", category: "viewpoint", latitude: 46.25, longitude: 23.25, sequence: 1, route_progress_m: 25_000 };
  const response = await prepareScenicFixtureScenario(page, "all-canonical", "combustion", scenicPreviewFixture("fuel", [attraction]));

  expect(response.route_preference).toBe("all");
  expect(response.route_choices?.map((choice) => choice.preference)).toEqual(["fastest", "shortest", "scenic"]);
  expect(response.route_options).toHaveLength(3);
  const scenicChoice = response.route_choices?.find((choice) => choice.preference === "scenic");
  const scenicOption = response.route_options?.find((option) => option.id === scenicChoice?.route_option_id);
  expect(scenicOption?.attractions).toHaveLength(1);
  await expect(page.getByText("1. Scenic fixture", { exact: true })).toBeVisible();

  let previewRequests = 0;
  const trackPreview = (request: import("@playwright/test").Request) => {
    if (request.url().endsWith("/trips/preview")) previewRequests += 1;
  };
  page.on("request", trackPreview);
  const fastestChoice = response.route_choices?.find((choice) => choice.preference === "fastest");
  const fastestOption = response.route_options?.find((option) => option.id === fastestChoice?.route_option_id);
  await page.getByRole("button", { name: /Fastest/ }).click();
  expect(previewRequests).toBe(0);
  await expect(page.getByRole("button", { name: /Fastest/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: /Fastest/ })).toBeVisible();
  await expect(page.getByText("1. Scenic fixture", { exact: true })).toHaveCount(0);
  await expect(page.getByText(`${(fastestOption!.route.distance_m / 1000).toLocaleString("ro-RO", { maximumFractionDigits: 1 })} km`, { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: /Shortest/ }).click();
  const shortestChoice = response.route_choices?.find((choice) => choice.preference === "shortest");
  const shortestOption = response.route_options?.find((option) => option.id === shortestChoice?.route_option_id);
  await expect(page.getByRole("heading", { name: /Shortest/ })).toBeVisible();
  expect(shortestOption?.route.distance_m).not.toBe(fastestOption?.route.distance_m);
  expect(previewRequests).toBe(0);
  page.off("request", trackPreview);
});

test("Scenic map and list keep a tourist attraction separate from a fuel stop", async ({ page }) => {
  const attractions: NonNullable<TripRoutePreview["attractions"]> = [{ source_id: "attraction-fixture", name: "Fixture Museum", category: "attraction", latitude: 46.25, longitude: 23.25, sequence: 1, route_progress_m: 25_000 }];
  await prepareScenicFixtureScenario(page, "fuel-marker", "combustion", scenicPreviewFixture("fuel", attractions));

  await expect(page.getByText("1. Fixture Museum", { exact: true })).toBeVisible();
  await expect(page.getByText("attraction · 25 km de la plecare · 46.25000, 23.25000", { exact: true })).toBeVisible();
  const touristMarker = page.locator(".leaflet-overlay-pane path.tourist-attraction-marker");
  const fuelMarker = page.locator(".leaflet-overlay-pane path.energy-stop-marker.energy-stop-type-fuel");
  await expect(touristMarker).toHaveCount(1);
  await expect(fuelMarker).toHaveCount(1);
  await expect(page.getByText(/Nu au fost g.*site atrac.*turistice pe acest traseu/)).toHaveCount(0);
});

test("Scenic empty-attractions state keeps charging marker distinct", async ({ page }) => {
  await prepareScenicFixtureScenario(page, "charging-empty", "electric", scenicPreviewFixture("charging", []));

  await expect(page.getByText(/Nu au fost g.*site atrac.*turistice pe acest traseu/)).toBeVisible();
  await expect(page.locator(".leaflet-overlay-pane path.tourist-attraction-marker")).toHaveCount(0);
  const chargingMarker = page.locator(".leaflet-overlay-pane path.energy-stop-marker.energy-stop-type-charging");
  await expect(chargingMarker).toHaveCount(1);
  await expect(page.getByText(/Stație de încărcare/)).toBeVisible();
});
