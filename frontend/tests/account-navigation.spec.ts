import { expect, test } from "@playwright/test";

test("authenticated pages share accessible navigation and public auth pages do not", async ({ page }) => {
  const email = `navigation${Date.now()}@example.com`;
  await page.goto("/register");
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toHaveCount(0);
  await page.getByLabel("Nume complet").fill("Navigation User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Parol/).fill("ExamplePass1!");
  await page.getByLabel("Confirmă parola").fill("ExamplePass1!");
  await page.getByRole("button", { name: "Creează cont" }).click();
  await page.getByRole("link", { name: "Autentificare" }).click();
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toHaveCount(0);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Parolă").fill("ExamplePass1!");
  await page.getByRole("button", { name: "Autentificare" }).click();
  await expect(page).toHaveURL(/\/trip$/);
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(navigation.getByRole("link", { name: "Plan a trip" })).toHaveAttribute("aria-current", "page");
  await navigation.getByRole("link", { name: "Profile" }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(navigation.getByRole("link", { name: "Profile" })).toHaveAttribute("aria-current", "page");
  await navigation.getByRole("link", { name: "My vehicles" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/vehicles$/);
  await expect(navigation.getByRole("link", { name: "My vehicles" })).toHaveAttribute("aria-current", "page");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
