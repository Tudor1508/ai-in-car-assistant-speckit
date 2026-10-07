import { expect, test, type Page } from "@playwright/test";

async function registerAndLogin(page: Page, email: string) {
  await page.goto("/register");
  await page.getByLabel("Nume complet").fill("Profile Check");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Parol/).fill("ExamplePass1!");
  await page.getByLabel("Confirmă parola").fill("ExamplePass1!");
  await page.getByRole("button", { name: "Creează cont" }).click();
  await expect(page.getByText(/Contul a fost creat/)).toBeVisible();
  await page.getByRole("link", { name: "Autentificare" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Parolă").fill("ExamplePass1!");
  await page.getByRole("button", { name: "Autentificare" }).click();
  await expect(page).toHaveURL(/\/trip$/);
  await page.goto("/profile");
}

test("profile shows unverified email, read-only role, and remains usable at narrow and wide widths", async ({ page }) => {
  await registerAndLogin(page, `profile${Date.now()}@example.com`);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText("Adresa de email este neverificată.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Rol", exact: true })).toHaveValue("user");
  await page.getByLabel("Nume complet").fill("Alex Updated");
  await page.getByRole("button", { name: "Salvează profilul" }).click();
  await expect(page.getByText("Profilul a fost actualizat.")).toBeVisible();
  await expect(page.getByLabel("Nume complet")).toHaveValue("Alex Updated");
  await page.reload();
  await expect(page.getByLabel("Nume complet")).toHaveValue("Alex Updated");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.setViewportSize({ width: 1440, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.getByRole("button", { name: "Schimbă parola" }).focus();
  await expect(page.locator(":focus")).toHaveText("Schimbă parola");
});

test("password mismatch is actionable and failed change leaves the current password valid", async ({ page }) => {
  const email = `password${Date.now()}@example.com`;
  await registerAndLogin(page, email);
  await page.getByRole("button", { name: "Schimbă parola" }).click();
  const dialog = page.getByRole("dialog");
  await expect(page.getByText(/Minimum 8 caractere/)).toBeVisible();
  await page.getByRole("textbox", { name: "Parola curentă", exact: true }).fill("ExamplePass1!");
  await page.getByLabel("Parolă nouă").fill("weak");
  await page.getByLabel("Confirmă parola nouă").fill("different");
  await page.getByRole("button", { name: "Confirmă" }).click();
  const validationAlert = dialog.getByRole("alert");
  await expect(validationAlert).toContainText("cel puțin 8 caractere");
  await expect(validationAlert).toContainText("o literă mare");
  await expect(validationAlert).toContainText("o cifră");
  await expect(validationAlert).toContainText("un caracter special");
  await page.getByLabel("Parolă nouă").fill("NewPassword2!");
  await page.getByLabel("Confirmă parola nouă").fill("Mismatch3!");
  await page.getByRole("button", { name: "Confirmă" }).click();
  await expect(validationAlert).toHaveText("Parolele nu se potrivesc.");
  await page.getByRole("button", { name: "Anulează" }).click();
  await page.getByRole("button", { name: "Deconectare" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Parolă").fill("ExamplePass1!");
  await page.getByRole("button", { name: "Autentificare" }).click();
  await expect(page).toHaveURL(/\/trip$/);
  await page.goto("/profile");

  await page.getByRole("button", { name: "Schimbă parola" }).click();
  await page.getByRole("textbox", { name: "Parola curentă", exact: true }).fill("ExamplePass1!");
  await page.getByLabel("Parolă nouă").fill("NewPassword2!");
  await page.getByLabel("Confirmă parola nouă").fill("NewPassword2!");
  await page.getByRole("button", { name: "Confirmă" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Parolă").fill("ExamplePass1!");
  await page.getByRole("button", { name: "Autentificare" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Emailul sau parola sunt incorecte." })).toBeVisible();
  await page.getByLabel("Parolă").fill("NewPassword2!");
  await page.getByRole("button", { name: "Autentificare" }).click();
  await expect(page).toHaveURL(/\/trip$/);
});

test("deactivation requires the current password and explicit confirmation", async ({ page }) => {
  const email = `deactivate${Date.now()}@example.com`;
  await registerAndLogin(page, email);
  await page.getByRole("button", { name: "Dezactivează contul" }).click();
  const dialog = page.getByRole("dialog");
  await page.getByLabel("Scrie DELETE pentru confirmare").fill("DELETE");
  await page.getByRole("textbox", { name: "Parola curentă", exact: true }).fill("WrongPass1!");
  await page.getByRole("button", { name: "Confirmă" }).click();
  const dialogAlert = dialog.getByRole("alert");
  await expect(dialogAlert).toHaveText("Parola curentă este incorectă.");
  await page.getByRole("textbox", { name: "Parola curentă", exact: true }).fill("ExamplePass1!");
  await page.getByLabel("Scrie DELETE pentru confirmare").fill("no");
  await page.getByRole("button", { name: "Confirmă" }).click();
  await expect(dialogAlert).toHaveText("Cererea nu a putut fi procesată. Verifică informațiile și încearcă din nou.");
  await page.getByLabel("Scrie DELETE pentru confirmare").fill("DELETE");
  await page.getByRole("button", { name: "Confirmă" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Parolă").fill("ExamplePass1!");
  await page.getByRole("button", { name: "Autentificare" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Emailul sau parola sunt incorecte." })).toBeVisible();
});
