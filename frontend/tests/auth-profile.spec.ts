import { expect, test, type Page } from "@playwright/test";

async function registerAndLogin(page: Page, email: string) {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Profile Check");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Password/).fill("ExamplePass1!");
  await page.getByLabel("Confirm password").fill("ExamplePass1!");
  const registrationResponse = page.waitForResponse((response) => response.url().endsWith("/auth/register"));
  await page.getByRole("button", { name: "Create account" }).click();
  const response = await registrationResponse;
  const body = await response.json();
  expect(response.ok(), JSON.stringify(body)).toBeTruthy();
  await expect(page.getByRole("status")).toHaveText("Your account was created.");
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Password/).fill("ExamplePass1!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/trip$/);
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "My profile" })).toBeVisible();
}

test("profile hides verification copy, shows role as static information, and saves responsively", async ({ page }) => {
  await registerAndLogin(page, `profile${Date.now()}@example.com`);
  await page.setViewportSize({ width: 390, height: 844 });

  await expect(page.getByText(/email.*not verified|not verified.*email/i)).toHaveCount(0);
  const role = page.getByRole("region", { name: "Account role" });
  await expect(role).toContainText("user");
  await expect(role.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Log out" })).toHaveCount(1);

  await page.getByLabel("Full name").fill("Alex Updated");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.locator(".MuiAlert-root[role=status]")).toHaveText("Your profile has been updated.");
  await expect(page.getByLabel("Full name")).toHaveValue("Alex Updated");
  await page.reload();
  await expect(page.getByLabel("Full name")).toHaveValue("Alex Updated");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();

  await page.setViewportSize({ width: 1440, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.getByRole("button", { name: "Change password" }).focus();
  await expect(page.locator(":focus")).toHaveText("Change password");
});

test("password change failure and cancellation preserve the session; success clears it and redirects home", async ({ page }) => {
  const email = `password${Date.now()}@example.com`;
  await registerAndLogin(page, email);

  await page.getByRole("button", { name: "Change password" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Current password").fill("WrongPass1!");
  await dialog.getByRole("textbox", { name: "New password", exact: true }).fill("NewPassword2!");
  await dialog.getByLabel("Confirm new password").fill("NewPassword2!");
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(dialog.locator(".MuiAlert-root[role=alert]")).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "My profile" })).toBeVisible();

  await page.getByRole("button", { name: "Change password" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Current password").fill("ExamplePass1!");
  await dialog.getByRole("textbox", { name: "New password", exact: true }).fill("NewPassword2!");
  await dialog.getByLabel("Confirm new password").fill("NewPassword2!");
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Password/).fill("ExamplePass1!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator(".MuiAlert-root[role=alert]")).toBeVisible();
  await page.getByLabel(/^Password/).fill("NewPassword2!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/trip$/);
});

test("deactivation requires confirmation and password, retains session after failure, and ends it on success", async ({ page }) => {
  const email = `deactivate${Date.now()}@example.com`;
  await registerAndLogin(page, email);

  await page.getByRole("button", { name: "Deactivate account" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Type DELETE to confirm").fill("DELETE");
  await dialog.getByLabel("Current password").fill("WrongPass1!");
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(dialog.locator(".MuiAlert-root[role=alert]")).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "My profile" })).toBeVisible();

  await page.getByRole("button", { name: "Deactivate account" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Type DELETE to confirm").fill("DELETE");
  await dialog.getByLabel("Current password").fill("ExamplePass1!");
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Password/).fill("ExamplePass1!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator(".MuiAlert-root[role=alert]")).toBeVisible();
});
