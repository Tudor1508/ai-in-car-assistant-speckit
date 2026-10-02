import { expect, test, type Page } from "@playwright/test";

async function registerAndLogin(page: Page, email: string) {
  await page.goto("/register");
  await page.getByLabel("Nume complet").fill("Garage Owner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Parol/).fill("ExamplePass1!");
  await page.getByLabel("Confirmă parola").fill("ExamplePass1!");
  await page.getByRole("button", { name: "Creează cont" }).click();
  await expect(page.getByText(/Contul a fost creat/)).toBeVisible();
  await page.getByRole("link", { name: "Autentificare" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Parolă").fill("ExamplePass1!");
  await page.getByRole("button", { name: "Autentificare" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function addVehicle(page: Page, name: string) {
  await page.getByRole("button", { name: /Adaug/i }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nume vehicul").fill(name);
  await dialog.getByLabel("Model").fill("Test model");
  await dialog.getByLabel("An").fill("2020");
  await dialog.getByLabel("Autonomie (km)").fill("500");
  await dialog.getByLabel("Kilometraj (km)").fill("10000");
  await dialog.getByLabel("Combustibil").click();
  await page.getByRole("option", { name: "Diesel" }).click();
  await dialog.getByRole("button", { name: /Salveaz/ }).click();
  await expect(page.getByText(name)).toBeVisible();
}

test("vehicles page shows a useful empty garage and requires sign in", async ({ page }) => {
  await registerAndLogin(page, `garage${Date.now()}@example.com`);
  await page.goto("/vehicles");
  await expect(page.getByRole("heading", { name: /vehicule/i })).toBeVisible();
  await expect(page.getByText(/garajul tău este gol/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /adaugă vehicul/i }).first()).toBeVisible();
  await page.getByRole("button", { name: "Log out" }).click();
  await page.goto("/vehicles");
  await expect(page).toHaveURL(/\/login$/);
});

test("vehicle cards show all stored values and keep the page responsive", async ({ page }) => {
  await registerAndLogin(page, `garage-card${Date.now()}@example.com`);
  await page.goto("/vehicles");
  await page.getByRole("button", { name: /adaugă vehicul/i }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/nume vehicul/i).fill("Daily driver");
  await dialog.getByLabel(/model/i).fill("Audi A5");
  await dialog.getByLabel(/tip/i).click();
  await page.getByRole("option", { name: /combustie/i }).click();
  await dialog.getByLabel(/an/i).fill("2020");
  await dialog.getByLabel(/autonomie/i).fill("600");
  await dialog.getByLabel(/kilometraj/i).fill("320000");
  await dialog.getByLabel(/combustibil/i).click();
  await page.getByRole("option", { name: /benzină/i }).click();
  await dialog.getByRole("button", { name: /salvează/i }).click();
  await expect(page.getByText("Daily driver")).toBeVisible();
  await expect(page.getByText("Audi A5")).toBeVisible();
  await expect(page.getByText("320.000 km")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test("failed refresh retains the loaded garage and session loss clears it for the next owner", async ({ page }) => {
  await registerAndLogin(page, `garage-state-a${Date.now()}@example.com`);
  await page.goto("/vehicles");
  await addVehicle(page, "Owner A car");

  let failNextList = true;
  await page.route("http://localhost:8000/vehicles", async (route) => {
    if (route.request().method() === "GET" && failNextList) {
      failNextList = false;
      await route.abort();
      return;
    }
    await route.continue();
  });
  await page.getByRole("button", { name: /Re.*garajul/i }).click();
  const listError = page.getByRole("alert").filter({ hasText: /Cererea nu a putut fi procesat/ });
  await expect(listError).toBeVisible();
  await expect(page.getByText("Owner A car")).toBeVisible();
  await page.unroute("http://localhost:8000/vehicles");
  await listError.getByRole("button").click();
  await expect(page.getByText("Owner A car")).toBeVisible();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await registerAndLogin(page, `garage-state-b${Date.now()}@example.com`);
  let releaseVehicleList!: () => void;
  const vehicleListGate = new Promise<void>((resolve) => { releaseVehicleList = resolve; });
  await page.route("http://localhost:8000/vehicles", async (route) => {
    if (route.request().method() === "GET") await vehicleListGate;
    await route.continue();
  });
  await page.getByRole("link", { name: "My vehicles" }).click();
  await expect(page.getByText("Owner A car")).toHaveCount(0);
  releaseVehicleList();
  await expect(page.getByText(/garajul t/i)).toBeVisible();
});

test("a failed garage request can be retried without losing the page", async ({ page }) => {
  await registerAndLogin(page, `garage-retry${Date.now()}@example.com`);
  await page.route("http://localhost:8000/vehicles", (route) => route.abort());
  await page.goto("/vehicles");
  await expect(page.getByRole("alert").filter({ hasText: "Cererea nu a putut fi procesată" })).toBeVisible();
  await page.unroute("http://localhost:8000/vehicles");
  await page.getByRole("button", { name: "Reîncearcă" }).click();
  await expect(page.getByText(/garajul tău este gol/i)).toBeVisible();
});
