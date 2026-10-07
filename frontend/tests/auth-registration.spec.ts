import { expect, test } from "@playwright/test";

test("registration validates passwords, announces pending and success, and keeps verification copy out of the UI", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Registration Check");
  await page.getByLabel("Email").fill(`register${Date.now()}@example.com`);
  await page.getByLabel(/^Password/).fill("ExamplePass1!");
  await page.getByLabel("Confirm password").fill("DifferentPass2!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.locator(".MuiAlert-root[role=alert]")).toHaveText("Passwords do not match.");

  await page.getByLabel("Confirm password").fill("ExamplePass1!");
  const registrationResponse = page.waitForResponse((response) => response.url().endsWith("/auth/register"));
  await page.getByRole("button", { name: "Create account" }).click();
  const response = await registrationResponse;
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload.data.email_verified).toBe(false);
  await expect(page.getByRole("status")).toHaveText("Your account was created.");
  await expect(page.getByText(/email.*not verified|not verified.*email/i)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
});

test("registration disables duplicate submission while the request is pending", async ({ page }) => {
  await page.route("**/auth/register", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ data: {
        id: "registration-pending-check",
        name: "Pending Check",
        email: "pending-check@example.com",
        email_verified: false,
        role: "user",
      } }),
    });
  });

  await page.goto("/register");
  await page.getByLabel("Full name").fill("Pending Check");
  await page.getByLabel("Email").fill("pending-check@example.com");
  await page.getByLabel(/^Password/).fill("ExamplePass1!");
  await page.getByLabel("Confirm password").fill("ExamplePass1!");
  const form = page.locator("form");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(form).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("button", { name: "Creating account" })).toBeDisabled();
  await expect(page.getByRole("status")).toHaveText("Your account was created.");
});

test("login failure gives safe feedback and its controls remain keyboard accessible", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
  await page.getByLabel("Email").fill("not-present@example.com");
  await page.getByLabel(/^Password/).fill("WrongPass1!");
  await page.getByLabel("Email").focus();
  await expect(page.locator(":focus")).toHaveAttribute("name", "email");
  await page.getByRole("button", { name: "Sign in" }).focus();
  await expect(page.locator(":focus")).toHaveText("Sign in");

  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator(".MuiAlert-root[role=alert]")).toHaveText("The email or password is incorrect.");
});
