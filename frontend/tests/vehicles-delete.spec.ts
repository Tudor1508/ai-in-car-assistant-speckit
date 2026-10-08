import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Delete Owner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Password/).fill("ExamplePass1!");
  await page.getByLabel("Confirm password").fill("ExamplePass1!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("status")).toHaveText("Your account was created.");
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Password/).fill("ExamplePass1!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/trip$/);
}

async function addVehicle(page: Page, name: string) {
  await page.goto("/vehicles");
  await page.getByRole("button", { name: /Add vehicle/i }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add vehicle" });
  await dialog.getByLabel("Vehicle name").fill(name);
  await dialog.getByLabel("Brand").fill("Test Brand");
  await dialog.getByLabel("Model").fill("Test model");
  await dialog.getByLabel("Year").fill("2020");
  await dialog.getByLabel("Range (km)").fill("500");
  await dialog.getByLabel("Mileage (km)").fill("10000");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
}

test("delete confirmation names the vehicle, allows cancellation, and returns focus to the garage", async ({ page }) => {
  await login(page, `delete${Date.now()}@example.com`);
  await addVehicle(page, "Keep this car");
  await addVehicle(page, "Remove this car");

  await page.getByRole("button", { name: "Delete Keep this car" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete this vehicle?" });
  await expect(dialog).toContainText("Keep this car");
  await expect(dialog).toContainText("will be removed from your garage");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Keep this car", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Delete Remove this car" }).click();
  await page.getByRole("dialog", { name: "Delete this vehicle?" }).getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("Remove this car", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Keep this car", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "My garage" })).toBeFocused();
});

test("failed vehicle deletion keeps both records and can be retried", async ({ page }) => {
  await login(page, `delete-retry${Date.now()}@example.com`);
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

  await page.getByRole("button", { name: "Delete Retry this delete" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete this vehicle?" });
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog).toContainText("Retry this delete");
  await expect(page.getByText("Keep this car", { exact: true })).toHaveCount(1);

  await dialog.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("button", { name: "Delete Retry this delete" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Keep this car" })).toBeVisible();
});
