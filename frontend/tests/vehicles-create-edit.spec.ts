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

async function addCombustionVehicle(page: Page) {
  await page.goto("/vehicles");
  await page.getByRole("button", { name: /adaugă vehicul/i }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nume vehicul").fill("Daily driver");
  await dialog.getByLabel("Model").fill("Audi A5");
  await dialog.getByLabel("An").fill("2020");
  await dialog.getByLabel("Autonomie (km)").fill("600");
  await dialog.getByLabel("Kilometraj (km)").fill("320000");
  await dialog.getByLabel("Combustibil").click();
  await page.getByRole("option", { name: "Diesel" }).click();
  await dialog.getByRole("button", { name: "Salvează" }).click();
  await expect(page.getByText("Daily driver")).toBeVisible();
}

test("user can add, edit, reload, and view an electric car", async ({ page }) => {
  await registerAndLogin(page, `create-edit${Date.now()}@example.com`);
  await addCombustionVehicle(page);
  await page.getByRole("button", { name: "Editează Daily driver" }).click();
  await page.getByLabel("Kilometraj (km)").fill("325000");
  await page.getByRole("button", { name: "Salvează" }).click();
  await expect(page.getByText(/325[,.\u00a0]000 km/)).toBeVisible();
  await page.getByRole("button", { name: /adaugă vehicul/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nume vehicul").fill("City car");
  await dialog.getByLabel("Model").fill("EV One");
  await dialog.getByLabel("Tip").click();
  await page.getByRole("option", { name: "Electric" }).click();
  await dialog.getByLabel("An").fill("2024");
  await dialog.getByLabel("Autonomie (km)").fill("420");
  await dialog.getByLabel("Kilometraj (km)").fill("12000");
  await expect(dialog.getByLabel("Combustibil")).toHaveValue("Nu se aplică");
  await dialog.getByRole("button", { name: "Salvează" }).click();
  await expect(page.getByText("Nu se aplică")).toBeVisible();
  await page.reload();
  await expect(page.getByText("City car")).toBeVisible();
  await expect(page.getByText("Daily driver")).toBeVisible();
});

test("vehicle form identifies invalid fields and does not save them", async ({ page }) => {
  await registerAndLogin(page, `validation${Date.now()}@example.com`);
  await page.goto("/vehicles");
  await page.getByRole("button", { name: /adaugă vehicul/i }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nume vehicul").fill(" ");
  await dialog.getByLabel("Model").fill("Model");
  await dialog.getByLabel("An").fill("2100");
  await dialog.getByLabel("Autonomie (km)").fill("-2");
  await dialog.getByLabel("Kilometraj (km)").fill("1.5");
  await dialog.getByRole("button", { name: "Salvează" }).click();
  await expect(dialog.getByText(/nume cu 1–80 de caractere/i)).toBeVisible();
  await expect(dialog.getByText(/an între 1886/i)).toBeVisible();
  await expect(page.getByText("Daily driver")).toHaveCount(0);
});

test("failed create and edit preserve form input and vehicle state for retry", async ({ page }) => {
  await registerAndLogin(page, `mutation-retry${Date.now()}@example.com`);
  await page.goto("/vehicles");

  await page.getByRole("button", { name: /Adaug/i }).first().click();
  const createDialog = page.getByRole("dialog");
  await createDialog.getByLabel("Nume vehicul").fill("Daily driver");
  await createDialog.getByLabel("Model").fill("Audi A5");
  await createDialog.getByLabel("An").fill("2020");
  await createDialog.getByLabel("Autonomie (km)").fill("600");
  await createDialog.getByLabel("Kilometraj (km)").fill("320000");
  await createDialog.getByLabel("Combustibil").click();
  await page.getByRole("option", { name: "Diesel" }).click();

  let failNextPost = true;
  let failNextPatch = false;
  await page.route("http://localhost:8000/vehicles**", async (route) => {
    const method = route.request().method();
    if (method === "POST" && failNextPost) {
      failNextPost = false;
      await route.abort();
      return;
    }
    if (method === "PATCH" && failNextPatch) {
      failNextPatch = false;
      await route.abort();
      return;
    }
    await route.continue();
  });

  await createDialog.getByRole("button", { name: /Salveaz/ }).click();
  await expect(createDialog.getByRole("alert").filter({ hasText: /Cererea nu a putut fi procesat/ })).toBeVisible();
  await expect(createDialog.getByLabel("Nume vehicul")).toHaveValue("Daily driver");
  await expect(createDialog.getByLabel("Model")).toHaveValue("Audi A5");
  await expect(page.getByText("Daily driver")).toHaveCount(0);

  await createDialog.getByRole("button", { name: /Salveaz/ }).click();
  await expect(page.locator('button[aria-label*="Daily driver"]')).toHaveCount(2);
  failNextPatch = true;
  await page.getByRole("button", { name: /Daily driver/ }).filter({ hasText: /Editeaz/ }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("Nume vehicul").fill("Updated driver");
  await editDialog.getByRole("button", { name: /Salveaz/ }).click();
  await expect(editDialog.getByRole("alert").filter({ hasText: /Cererea nu a putut fi procesat/ })).toBeVisible();
  await expect(editDialog.getByLabel("Nume vehicul")).toHaveValue("Updated driver");
  await expect(page.locator('button[aria-label*="Daily driver"]')).toHaveCount(2);

  await editDialog.getByRole("button", { name: /Salveaz/ }).click();
  await expect(page.getByRole("button", { name: /Updated driver/ }).filter({ hasText: /Editeaz/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Daily driver/ }).filter({ hasText: /Editeaz/ })).toHaveCount(0);
});
