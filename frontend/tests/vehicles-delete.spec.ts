import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/register");
  await page.getByLabel("Nume complet").fill("Delete Owner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Parol/).fill("ExamplePass1!");
  await page.getByLabel("Confirmă parola").fill("ExamplePass1!");
  await page.getByRole("button", { name: "Creează cont" }).click();
  await page.getByRole("link", { name: "Autentificare" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Parolă").fill("ExamplePass1!");
  await page.getByRole("button", { name: "Autentificare" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function addVehicle(page: Page, name: string) {
  await page.getByRole("button", { name: /adaugă vehicul/i }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nume vehicul").fill(name);
  await dialog.getByLabel("Model").fill("Test model");
  await dialog.getByLabel("An").fill("2020");
  await dialog.getByLabel("Autonomie (km)").fill("500");
  await dialog.getByLabel("Kilometraj (km)").fill("10000");
  await dialog.getByLabel("Combustibil").click();
  await page.getByRole("option", { name: "Diesel" }).click();
  await dialog.getByRole("button", { name: "Salvează" }).click();
  await expect(page.getByText(name)).toBeVisible();
}

test("delete confirmation removes a vehicle and cancellation preserves another", async ({ page }) => {
  await login(page, `delete${Date.now()}@example.com`);
  await page.goto("/vehicles");
  await addVehicle(page, "Keep this car");
  await addVehicle(page, "Remove this car");
  await page.getByRole("button", { name: "Șterge Keep this car" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Keep this car");
  await dialog.getByRole("button", { name: "Anulează" }).click();
  await expect(page.getByText("Keep this car")).toBeVisible();
  await page.getByRole("button", { name: "Șterge Remove this car" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Șterge" }).click();
  await expect(page.getByText("Remove this car")).toHaveCount(0);
  await expect(page.getByText("Keep this car")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Garajul meu" })).toBeFocused();
});

test("failed delete keeps the selected and unrelated vehicles and can be retried", async ({ page }) => {
  await login(page, `delete-retry${Date.now()}@example.com`);
  await page.goto("/vehicles");
  await addVehicle(page, "Keep this car");
  await addVehicle(page, "Retry this delete");

  let failNextDelete = true;
  await page.route("http://localhost:8000/vehicles**", async (route) => {
    if (route.request().method() === "DELETE" && failNextDelete) {
      failNextDelete = false;
      await route.abort();
      return;
    }
    await route.continue();
  });

  await page.getByRole("button", { name: /Retry this delete/ }).filter({ hasText: /terge/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /terge/ }).click();
  await expect(dialog.getByRole("alert").filter({ hasText: /Cererea nu a putut fi procesat/ })).toBeVisible();
  await expect(dialog).toContainText("Retry this delete");
  await expect(page.locator('button[aria-label*="Keep this car"]')).toHaveCount(2);

  await dialog.getByRole("button", { name: /terge/ }).click();
  await expect(page.getByRole("button", { name: /Retry this delete/ }).filter({ hasText: /terge/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Keep this car/ }).filter({ hasText: /terge/ })).toBeVisible();
});
