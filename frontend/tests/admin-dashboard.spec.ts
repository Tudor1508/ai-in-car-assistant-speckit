import { expect, test } from "@playwright/test";

const emptyPage = { stats: { total: 1 }, pagination: { page: 1, page_size: 25, total: 1, total_pages: 1 } };

test("administrator can view each section and the dashboard paginates", async ({ page }) => {
  await page.route("**/auth/me", (route) => route.fulfill({ json: { data: { id: "admin", name: "Admin", email: "admin@example.test", email_verified: false, role: "admin" } } }));
  await page.route("**/admin/users?*", (route) => route.fulfill({ json: { data: { ...emptyPage, users: [{ id: "u1", name: "Ana Popescu", email: "ana@example.test", status: "active", created_at: "2026-10-06T10:00:00Z" }] } } }));
  await page.route("**/admin/vehicles?*", (route) => route.fulfill({ json: { data: { ...emptyPage, vehicles: [{ id: "v1", name: "Daily", model: "Model X", type: "electric", year: 2025, created_at: "2026-10-06T10:00:00Z" }] } } }));
  await page.route("**/admin/producers?*", (route) => route.fulfill({ json: { data: { ...emptyPage, producers: [{ id: "p1", name: "Dealer", brand: "Dacia", email: "dealer@example.test", status: "active", created_at: "2026-10-06T10:00:00Z" }] } } }));

  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  await expect(page.getByText("ana@example.test")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Admin sections" }).getByRole("link", { name: "Vehicles" })).toBeVisible();
  await page.goto("/admin/vehicles");
  await expect(page.getByText("Model X")).toBeVisible();
  await expect(page.getByRole("button", { name: /edit|delete/i })).toHaveCount(0);
  await page.goto("/admin/producers");
  await expect(page.getByText("Dacia")).toBeVisible();
  await expect(page.getByLabel("Parolă")).toBeVisible();
});
