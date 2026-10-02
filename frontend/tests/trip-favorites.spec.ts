import { expect, test, type Page } from "@playwright/test";

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be configured for live favorite scenarios.`);
  return value;
};
const name = required("TRIP_TEST_ACCOUNT_NAME");
const baseEmail = required("TRIP_TEST_ACCOUNT_EMAIL");
const password = required("TRIP_TEST_ACCOUNT_PASSWORD");
const originQuery = required("TRIP_TEST_ORIGIN_QUERY");
const destinationQuery = required("TRIP_TEST_DESTINATION_QUERY");

async function registerAndLogin(page: Page) {
  const [user, domain] = baseEmail.split("@");
  const email = `${user}+favorite-${Date.now()}@${domain}`;
  await page.goto("/register");
  await page.getByLabel("Nume complet").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Parol/).fill(password);
  await page.getByLabel(/Confirm/).fill(password);
  await page.getByRole("button", { name: /Creează cont/i }).click();
  await expect(page.getByText(/Contul a fost creat/)).toBeVisible();
  await page.getByRole("link", { name: "Autentificare" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Parol/).fill(password);
  await page.getByRole("button", { name: /Autentificare/i }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function choose(page: Page, label: string, query: string) {
  await page.getByLabel(label).fill(query);
  await page.getByRole("option").first().click();
}

test("favorites persist across reload, duplicate saves are idempotent, and selecting does not preview", async ({ page }) => {
  await registerAndLogin(page);
  await choose(page, "Punct de plecare", originQuery);
  await choose(page, "Destinație", destinationQuery);
  let previewRequests = 0;
  page.on("request", (request) => { if (request.url().endsWith("/trips/preview")) previewRequests += 1; });

  await page.getByRole("button", { name: "Salvează traseul" }).click();
  await expect(page.getByRole("status").filter({ hasText: /salvat la favorite/i })).toBeVisible();
  await page.getByRole("button", { name: "Salvează traseul" }).click();
  await expect(page.getByRole("status").filter({ hasText: /deja în lista de favorite/i })).toBeVisible();
  await page.reload();

  const favoriteButton = page.getByRole("button", { name: /Folosește traseul/ }).first();
  await expect(favoriteButton).toBeVisible({ timeout: 30000 });
  await favoriteButton.click();
  await expect(page.getByLabel("Punct de plecare")).not.toHaveValue("");
  await expect(page.getByLabel("Destinație")).not.toHaveValue("");
  expect(previewRequests).toBe(0);
});

test("favorites are private to each account and clearing the session returns to login", async ({ page }) => {
  await registerAndLogin(page);
  await choose(page, "Punct de plecare", originQuery);
  await choose(page, "Destinație", destinationQuery);
  await page.getByRole("button", { name: "Salvează traseul" }).click();
  await expect(page.getByRole("status").filter({ hasText: /salvat la favorite/i })).toBeVisible();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await registerAndLogin(page);
  await expect(page.getByText("Nu ai încă trasee favorite.")).toBeVisible({ timeout: 30000 });
});
