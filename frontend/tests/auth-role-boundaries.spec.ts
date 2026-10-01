import { expect, test } from "@playwright/test";

for (const role of ["user", "admin", "producer"] as const) {
  test(`${role} profile displays role as read-only and exposes no product dashboard`, async ({ page }) => {
    await page.route("**/auth/me", async (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { id: "fixture", name: "Test Driver", email: "test@example.com", email_verified: false, role } }),
    }));
    await page.goto("/profile");
    const roleField = page.getByRole("textbox", { name: "Rol", exact: true });
    await expect(roleField).toHaveValue(role);
    await expect(roleField).toHaveAttribute("readonly", "");
    await expect(page.getByRole("link", { name: /dashboard|vehicul|rut|istoric/i })).toHaveCount(0);
  });
}
