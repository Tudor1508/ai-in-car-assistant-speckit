import { expect, test, type Page } from "@playwright/test";

async function registerAndLogin(page: Page, email: string) {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Garage Owner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").first().fill("ExamplePass1!");
  await page.getByLabel("Confirm password").fill("ExamplePass1!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(/Your account was created/)).toBeVisible();
  await page.getByRole("link", { name: "Sign in" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("ExamplePass1!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/trip$/);
}

async function addCombustionVehicle(page: Page) {
  await page.goto("/vehicles");
  await page.getByRole("button", { name: /add vehicle/i }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Vehicle name").fill("Daily driver");
  await dialog.getByLabel("Brand").fill("Audi");
  await dialog.getByLabel("Model").fill("Audi A5");
  await dialog.getByLabel("Year").fill("2020");
  await dialog.getByLabel("Range (km)").fill("600");
  await dialog.getByLabel("Mileage (km)").fill("320000");
  await dialog.getByLabel("Fuel type").click();
  await page.getByRole("option", { name: "Diesel" }).click();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Daily driver")).toBeVisible();
}

test("user can add, edit, reload, and view an electric car", async ({ page }) => {
  await registerAndLogin(page, `create-edit${Date.now()}@example.com`);
  await addCombustionVehicle(page);
  await page.getByRole("button", { name: "Edit Daily driver" }).click();
  await page.getByLabel("Mileage (km)").fill("325000");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(/325[,.\u00a0]000 km/)).toBeVisible();
  await page.getByRole("button", { name: /add vehicle/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Vehicle name").fill("City car");
  await dialog.getByLabel("Brand").fill("Drivewise");
  await dialog.getByLabel("Model").fill("EV One");
  await dialog.getByRole("combobox", { name: "Type", exact: true }).click();
  await page.getByRole("option", { name: "Electric" }).click();
  await dialog.getByLabel("Year").fill("2024");
  await dialog.getByLabel("Range (km)").fill("420");
  await dialog.getByLabel("Mileage (km)").fill("12000");
  await expect(dialog.getByLabel("Fuel type")).toHaveValue("Not applicable");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Not applicable")).toBeVisible();
  await page.reload();
  await expect(page.getByText("City car")).toBeVisible();
  await expect(page.getByText("Daily driver")).toBeVisible();
});

test("vehicle form identifies invalid fields and does not save them", async ({ page }) => {
  await registerAndLogin(page, `validation${Date.now()}@example.com`);
  await page.goto("/vehicles");
  await page.getByRole("button", { name: /add vehicle/i }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Vehicle name").fill(" ");
  await dialog.getByLabel("Model").fill("Model");
  await dialog.getByLabel("Brand").fill("Tesla");
  await dialog.getByLabel("Year").fill("2100");
  await dialog.getByLabel("Range (km)").fill("-2");
  await dialog.getByLabel("Mileage (km)").fill("1.5");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByText(/name between 1 and 80 characters/i)).toBeVisible();
  await expect(dialog.getByText(/year between 1886 and/i)).toBeVisible();
  await expect(page.getByText("Daily driver")).toHaveCount(0);
});

test("failed create and edit preserve form input and vehicle state for retry", async ({ page }) => {
  await registerAndLogin(page, `mutation-retry${Date.now()}@example.com`);
  await page.goto("/vehicles");

  await page.getByRole("button", { name: /Add vehicle/i }).first().click();
  const createDialog = page.getByRole("dialog");
  await createDialog.getByLabel("Vehicle name").fill("Daily driver");
  await createDialog.getByLabel("Brand").fill("Audi");
  await createDialog.getByLabel("Model").fill("Audi A5");
  await createDialog.getByLabel("Year").fill("2020");
  await createDialog.getByLabel("Range (km)").fill("600");
  await createDialog.getByLabel("Mileage (km)").fill("320000");
  await createDialog.getByLabel("Fuel type").click();
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

  await createDialog.getByRole("button", { name: "Save" }).click();
  await expect(createDialog.getByRole("alert").filter({ hasText: /The request could not be processed/ })).toBeVisible();
  await expect(createDialog.getByLabel("Vehicle name")).toHaveValue("Daily driver");
  await expect(createDialog.getByLabel("Model")).toHaveValue("Audi A5");
  await expect(page.getByText("Daily driver")).toHaveCount(0);

  await createDialog.getByRole("button", { name: "Save" }).click();
  await expect(page.locator('button[aria-label*="Daily driver"]')).toHaveCount(2);
  failNextPatch = true;
  await page.getByRole("button", { name: /Daily driver/ }).filter({ hasText: /Edit/ }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("Vehicle name").fill("Updated driver");
  await editDialog.getByRole("button", { name: "Save" }).click();
  await expect(editDialog.getByRole("alert").filter({ hasText: /The request could not be processed/ })).toBeVisible();
  await expect(editDialog.getByLabel("Vehicle name")).toHaveValue("Updated driver");
  await expect(page.locator('button[aria-label*="Daily driver"]')).toHaveCount(2);

  await editDialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: /Updated driver/ }).filter({ hasText: /Edit/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Daily driver/ }).filter({ hasText: /Edit/ })).toHaveCount(0);
});
