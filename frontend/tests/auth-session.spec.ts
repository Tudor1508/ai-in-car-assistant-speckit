import { expect, test, type Page } from "@playwright/test";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
if (!apiBaseUrl) throw new Error("NEXT_PUBLIC_API_BASE_URL must be configured for Playwright.");

async function registerAndLogin(page: Page, email: string) {
  await page.goto("/register");
  await page.getByLabel("Nume complet").fill("Session Check");
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
}

test("login errors do not reveal account existence", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("not-present@example.com");
  await page.getByLabel("Parolă").fill("WrongPass1!");
  await page.getByRole("button", { name: "Autentificare" }).click();
  await expect(page.locator(".MuiAlert-root[role=alert]")).toHaveText("Emailul sau parola sunt incorecte.");
});

test("the trip planner has a dedicated protected route", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);

  const email = `trip-route${Date.now()}@example.com`;
  await registerAndLogin(page, email);
  await page.goto("/");
  await expect(page).toHaveURL(/\/trip$/);
  await expect(page.getByRole("heading", { name: "Plan a trip." })).toBeVisible();
});

test("anonymous bootstrap and login rotate the protected cookie and CSRF binding", async ({ page }) => {
  const email = `csrf${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Nume complet").fill("CSRF Check");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Parol/).fill("ExamplePass1!");
  await page.getByLabel("Confirmă parola").fill("ExamplePass1!");

  const bootstrapPromise = page.waitForResponse((response) => response.url().endsWith("/auth/csrf/bootstrap"));
  await page.getByRole("button", { name: "Creează cont" }).click();
  const bootstrapResponse = await bootstrapPromise;
  expect(bootstrapResponse.status()).toBe(200);
  const anonymousToken = (await bootstrapResponse.json()).data.csrf_token as string;
  const anonymousCookie = (await page.context().cookies(apiBaseUrl))
    .find((cookie) => cookie.name === "__Host-dw_session");
  expect(anonymousCookie).toBeTruthy();
  expect(anonymousCookie?.httpOnly).toBeTruthy();
  expect(anonymousCookie?.secure).toBeTruthy();
  expect(anonymousCookie?.sameSite).toBe("Lax");
  expect(anonymousCookie?.path).toBe("/");
  expect(anonymousCookie?.domain).toBe("localhost");

  await page.getByRole("link", { name: "Autentificare" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Parolă").fill("ExamplePass1!");
  const loginPromise = page.waitForResponse((response) => response.url().endsWith("/auth/login"));
  await page.getByRole("button", { name: "Autentificare" }).click();
  const loginResponse = await loginPromise;
  expect(loginResponse.status()).toBe(200);
  const loginBody = (await loginResponse.json()).data as { csrf_token: string };
  expect(loginBody.csrf_token).toBeTruthy();
  expect(loginBody.csrf_token).not.toBe(anonymousToken);
  const authenticatedCookie = (await page.context().cookies(apiBaseUrl))
    .find((cookie) => cookie.name === "__Host-dw_session");
  expect(authenticatedCookie?.httpOnly).toBeTruthy();
  expect(authenticatedCookie?.secure).toBeTruthy();
  expect(authenticatedCookie?.sameSite).toBe("Lax");
  expect(authenticatedCookie?.path).toBe("/");
  expect(authenticatedCookie?.domain).toBe("localhost");
  expect(authenticatedCookie?.value).not.toBe(anonymousCookie?.value);

  const forgedStatus = await page.evaluate(async ({ apiBase, token }) => {
    const response = await fetch(`${apiBase}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
      body: "{}",
    });
    return response.status;
  }, { apiBase: "http://localhost:8000", token: anonymousToken });
  expect(forgedStatus).toBe(403);

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.context().cookies(apiBaseUrl)).toHaveLength(0);
});

test("logout revokes access and redirects protected profile requests", async ({ page }) => {
  await registerAndLogin(page, `logout${Date.now()}@example.com`);
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login$/);
});
