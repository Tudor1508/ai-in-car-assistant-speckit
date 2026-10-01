import { expect, test } from "@playwright/test";

test("registration creates an ordinary account with an unverified email", async ({ page }) => {
  const email = `driver${Date.now()}@example.com`;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/register");
  await expect(page.getByLabel("Nume complet")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveAttribute("name", "name");
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await page.getByLabel("Nume complet").fill("Alex Driver");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Parol/).fill("ExamplePass1!");
  await expect(page.getByText(/Minimum 8 caractere/)).toBeVisible();
  await page.getByLabel("Confirmă parola").fill("ExamplePass1!");
  await page.getByRole("button", { name: "Creează cont" }).click();
  await expect(page.getByText(/Contul a fost creat/)).toBeVisible();
  await expect(page.getByText(/neverificat/i)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test("registration validation identifies each unmet password rule and confirmation mismatch", async ({ page }) => {
  const email = `invalid${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Nume complet").fill("Validation Check");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Parol/).fill("weak");
  await page.getByLabel("Confirmă parola").fill("different");
  await page.getByRole("button", { name: "Creează cont" }).click();
  const alert = page.locator(".MuiAlert-root[role=alert]");
  await expect(alert).toContainText("cel puțin 8 caractere");
  await expect(alert).toContainText("o literă mare");
  await expect(alert).toContainText("o cifră");
  await expect(alert).toContainText("un caracter special");
  await page.getByLabel(/^Parol/).fill("ExamplePass1!");
  await page.getByLabel("Confirmă parola").fill("DifferentPass2!");
  await page.getByRole("button", { name: "Creează cont" }).click();
  await expect(alert).toHaveText("Parolele nu se potrivesc.");
  await page.getByLabel("Confirmă parola").fill("ExamplePass1!");
  await page.getByRole("button", { name: "Creează cont" }).click();
  await expect(page.getByText(/Contul a fost creat/)).toBeVisible();
});
