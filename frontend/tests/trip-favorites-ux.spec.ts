import { expect, test, type Page } from "@playwright/test";

function favorite(index: number) {
  return {
    id: String(index).padStart(32, "0"),
    origin: { label: `Origin ${index}`, latitude: 46 + index / 100, longitude: 23 },
    destination: { label: `Destination ${index}`, latitude: 47 + index / 100, longitude: 24 },
    created_at: `2026-10-0${index}T10:00:00Z`,
  };
}

async function installFavoriteApi(page: Page, initialCount = 4) {
  const apiPort = new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").port;
  let favorites = Array.from({ length: initialCount }, (_, index) => favorite(index + 1));
  let failNextDelete = false;
  await page.route((url) => url.port === apiPort && url.pathname === "/auth/me", (route) => route.fulfill({ json: { data: { id: "favorite-ux", name: "Favorite UX", email: "favorite@example.test", email_verified: true, role: "user" } } }));
  await page.route((url) => url.port === apiPort && url.pathname === "/auth/csrf/bootstrap", (route) => route.fulfill({ json: { data: { csrf_token: "favorite-csrf" } } }));
  await page.route((url) => url.port === apiPort && url.pathname === "/vehicles", (route) => route.fulfill({ json: { data: { vehicles: [] } } }));
  await page.route((url) => url.port === apiPort && url.pathname === "/trips/favorites", (route) => route.fulfill({ json: { data: { favorites } } }));
  await page.route((url) => url.port === apiPort && url.pathname.startsWith("/trips/favorites/"), async (route) => {
    if (failNextDelete) {
      failNextDelete = false;
      await route.fulfill({ status: 404, json: { error: { code: "http_error", message: "The request could not be completed" } } });
      return;
    }
    const id = route.request().url().split("/").at(-1);
    favorites = favorites.filter((item) => item.id !== id);
    await route.fulfill({ json: { data: { status: "deleted" } } });
  });
  return { failDeleteOnce: () => { failNextDelete = true; } };
}

test("favorites collapse to two, expand, and refill the visible slot after deletion", async ({ page }) => {
  await installFavoriteApi(page, 4);
  await page.goto("/trip");
  await expect(page.getByRole("button", { name: /Use route from Origin 1 to Destination 1/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Use route from Origin 2 to Destination 2/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Use route from Origin 3 to Destination 3/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Show more (2)" }).click();
  await expect(page.getByRole("button", { name: /Use route from Origin 4 to Destination 4/ })).toBeVisible();
  await page.getByRole("button", { name: "Show less" }).click();

  await page.getByRole("button", { name: "Remove favorite route from Origin 1 to Destination 1" }).click();
  await expect(page.getByRole("button", { name: /Use route from Origin 1 to Destination 1/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Use route from Origin 2 to Destination 2/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Use route from Origin 3 to Destination 3/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Use route from Origin 4 to Destination 4/ })).toHaveCount(0);
});

test("empty, one, and exactly two favorites render without an unnecessary Show more action", async ({ page }) => {
  for (const count of [0, 1, 2]) {
    await installFavoriteApi(page, count);
    await page.goto("/trip");

    if (count === 0) {
      await expect(page.getByText("You do not have any favorite routes yet.")).toBeVisible();
    } else {
      for (let index = 1; index <= count; index += 1) {
        await expect(page.getByRole("button", { name: new RegExp(`Use route from Origin ${index} to Destination ${index}`) })).toBeVisible();
      }
    }
    await expect(page.getByRole("button", { name: /^Show more/ })).toHaveCount(0);
  }
});

test("failed favorite removal keeps the route visible and can be retried", async ({ page }) => {
  const api = await installFavoriteApi(page, 1);
  await page.goto("/trip");
  api.failDeleteOnce();
  await page.getByRole("button", { name: "Remove favorite route from Origin 1 to Destination 1" }).click();
  await expect(page.locator(".MuiAlert-colorError[role=alert]")).toContainText("The request could not be completed");
  await expect(page.getByRole("button", { name: /Use route from Origin 1 to Destination 1/ })).toBeVisible();
  await page.getByRole("button", { name: "Retry removal" }).click();
  await expect(page.getByText("You do not have any favorite routes yet.")).toBeVisible();
});
