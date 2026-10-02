import { expect, test, type Page } from "@playwright/test";

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
  await expect(page).toHaveURL(/\/$/);
}

async function addVehicle(page: Page, suffix: string, range: string) {
  await page.goto("/vehicles");
  await page.getByRole("button", { name: /Adaugă vehicul/i }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nume vehicul").fill(`${vehicleName} ${suffix}`);
  await dialog.getByLabel("Model").fill(vehicleModel);
  await dialog.getByLabel("Tip").click();
  await page.getByRole("option", { name: vehicleType === "electric" ? "Electric" : "Combustie" }).click();
  await dialog.getByLabel("An").fill(vehicleYear);
  await dialog.getByLabel("Autonomie (km)").fill(range);
  await dialog.getByLabel("Kilometraj (km)").fill(vehicleMileage);
  if (vehicleType === "combustion") {
    const fuelLabels: Record<string, string> = { petrol: "Benzină", diesel: "Diesel", lpg: "GPL", cng: "GNC", other: "Alt tip" };
    await dialog.getByLabel("Combustibil").click();
    await page.getByRole("option", { name: fuelLabels[fuelType] }).click();
  }
  await dialog.getByRole("button", { name: "Salvează" }).click();
  await expect(page.getByText(`${vehicleName} ${suffix}`)).toBeVisible();
}

async function selectPlace(page: Page, label: string, query: string) {
  await page.getByLabel(label).fill(query);
  await page.getByRole("option").first().click();
}

async function previewConfiguredRoute(page: Page, scenario: {
  origin: string; destination: string; range: string; percent: string; vehicleSuffix: string;
}) {
  await addVehicle(page, scenario.vehicleSuffix, scenario.range);
  await page.goto("/");
  await selectPlace(page, "Punct de plecare", scenario.origin);
  await selectPlace(page, "Destinație", scenario.destination);
  await page.getByLabel("Vehicul").click();
  await page.getByRole("option").first().click();
  await page.getByLabel("Nivel curent procentual").fill(scenario.percent);
  const previewButton = page.getByRole("button", { name: "Previzualizează traseul" });
  const previewRequest = page.waitForRequest((request) => request.url().endsWith("/trips/preview"));
  await previewButton.click();
  await previewRequest;
  await expect(previewButton).toBeDisabled();
}

test("no-vehicle guidance, unresolved search, permission denial, and responsive keyboard flow", async ({ page, context }) => {
  await registerAndLogin(page, "no-vehicle");
  await expect(page.getByText(/Adaugă un vehicul în My vehicles/)).toBeVisible();
  await expect(page.getByRole("link", { name: "My vehicles" })).toBeVisible();

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
  await previewConfiguredRoute(page, { origin: stopOriginQuery, destination: stopDestinationQuery, range: stopRangeKm, percent: stopPercent, vehicleSuffix: "stops" });
  await expect(page.getByText("Etapele traseului")).toBeVisible({ timeout: 90000 });
  await expect(page.getByText("Opriri", { exact: true })).toBeVisible();
  await expect(page.getByText(/Etapa 1/)).toBeVisible();
});

test("configured route without a feasible station chain is clearly incomplete", async ({ page }) => {
  await registerAndLogin(page, "incomplete");
  await previewConfiguredRoute(page, { origin: noStationOrigin, destination: noStationDestination, range: noStationRange, percent: noStationPercent, vehicleSuffix: "incomplete" });
  await expect(page.getByRole("status").filter({ hasText: /No compatible station|maximum number of stops|incomplet/i })).toBeVisible({ timeout: 90000 });
});
