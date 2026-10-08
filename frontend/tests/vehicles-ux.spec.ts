import { expect, test } from "@playwright/test";

test("empty garage has one Add action; vehicle errors and dialog remain usable on mobile and edit", async ({ page }) => {
  const vehicles: Array<Record<string, unknown>> = [];
  const apiPort = new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").port;
  await page.route((url) => url.port === apiPort && url.pathname === "/auth/me", (route) => route.fulfill({ json: { data: { id: "vehicle-ux", name: "Vehicle UX", email: "vehicle@example.test", email_verified: true, role: "user" } } }));
  await page.route((url) => url.port === apiPort && url.pathname === "/auth/csrf/bootstrap", (route) => route.fulfill({ json: { data: { csrf_token: "vehicle-csrf" } } }));
  await page.route((url) => url.port === apiPort && url.pathname.startsWith("/vehicles"), async (route) => {
    const method = route.request().method();
    if (method === "GET") return route.fulfill({ json: { data: { vehicles } } });
    const body = route.request().postDataJSON() as Record<string, unknown>;
    if (method === "POST") {
      const vehicle = { ...body, name: `${body.brand} ${body.model}`, id: "v".repeat(32), created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z" };
      vehicles.push(vehicle);
      return route.fulfill({ status: 201, json: { data: { vehicle } } });
    }
    if (method === "PATCH") {
      const merged = { ...vehicles[0], ...body };
      const vehicle = { ...merged, name: `${merged.brand} ${merged.model}`, updated_at: "2026-10-02T00:00:00Z" };
      vehicles[0] = vehicle;
      return route.fulfill({ json: { data: { vehicle } } });
    }
    return route.fulfill({ status: 405, json: { error: { code: "http_error", message: "The request could not be completed" } } });
  });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/vehicles");
  await expect(page.getByText("Your garage is empty")).toBeVisible();
  await expect(page.getByRole("button", { name: /Add vehicle/ })).toHaveCount(1);
  await page.getByRole("button", { name: /Add vehicle/ }).click();
  let dialog = page.getByRole("dialog", { name: "Add vehicle" });
  await expect(dialog).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await dialog.getByLabel("Brand").fill(" ");
  await dialog.getByLabel("Model").fill(" ");
  await dialog.getByLabel("Year").fill("2100");
  await dialog.getByLabel("Range (km)").fill("-2");
  await dialog.getByLabel("Mileage (km)").fill("1.5");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByLabel("Brand")).toHaveAttribute("aria-invalid", "true");
  await expect(dialog.getByLabel("Model")).toHaveAttribute("aria-invalid", "true");
  await expect(dialog.getByLabel("Year")).toHaveAttribute("aria-invalid", "true");
  await expect(dialog.getByLabel("Range (km)")).toHaveAttribute("aria-invalid", "true");
  await expect(dialog.getByLabel("Mileage (km)")).toHaveAttribute("aria-invalid", "true");
  expect(vehicles).toHaveLength(0);

  const thisYear = new Date().getFullYear();
  await dialog.getByLabel("Brand").fill("Audi");
  await dialog.getByLabel("Model").fill("A5");
  await dialog.getByLabel("Year").fill(String(thisYear));
  await dialog.getByLabel("Range (km)").fill("400");
  await dialog.getByLabel("Mileage (km)").fill("10000");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Audi A5", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Add vehicle/ })).toHaveCount(1);

  await page.getByRole("button", { name: "Edit Audi A5" }).click();
  dialog = page.getByRole("dialog", { name: "Edit vehicle" });
  await expect(dialog.getByLabel("Model")).toHaveValue("A5");
  await dialog.getByLabel("Model").fill("A5 Sportback");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Audi A5 Sportback", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test("vehicle dialog guards duplicate submission while pending", async ({ page }) => {
  const apiPort = new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").port;
  await page.route((url) => url.port === apiPort && url.pathname === "/auth/me", (route) => route.fulfill({ json: { data: { id: "vehicle-pending", name: "Pending", email: "pending@example.test", email_verified: true, role: "user" } } }));
  await page.route((url) => url.port === apiPort && url.pathname === "/vehicles", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { data: { vehicles: [] } } });
    await new Promise((resolve) => setTimeout(resolve, 900));
    return route.fulfill({ status: 201, json: { data: { vehicle: { id: "p".repeat(32), name: "Pending P1", brand: "Pending", model: "P1", type: "combustion", year: 2020, range_km: 400, mileage_km: 1000, fuel_type: "petrol", created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z" } } } });
  });
  await page.goto("/vehicles");
  await page.getByRole("button", { name: /Add vehicle/ }).click();
  const dialog = page.getByRole("dialog", { name: "Add vehicle" });
  await dialog.getByLabel("Brand").fill("Pending");
  await dialog.getByLabel("Model").fill("P1");
  await dialog.getByLabel("Year").fill("2020");
  await dialog.getByLabel("Range (km)").fill("400");
  await dialog.getByLabel("Mileage (km)").fill("1000");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.locator("form")).toHaveAttribute("aria-busy", "true");
  await expect(dialog.getByLabel("Model")).toBeDisabled();
  await expect(dialog.getByRole("button", { name: /Saving/ })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeDisabled();
  await expect(page.getByText("Pending P1", { exact: true })).toBeVisible();
});
