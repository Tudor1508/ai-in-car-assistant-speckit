import { expect, test } from "@playwright/test";

const apiPort = new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").port;
const admin = { id: "admin-014", name: "Admin", email: "admin@example.test", email_verified: false, role: "admin" };

test("producer deactivation confirms target, handles retry and pending, then refreshes the record", async ({ page }) => {
  let producer = { id: "producer-1", name: "Dealer One", brand: "Dacia", email: "dealer@example.test", status: "active", created_at: "2026-10-06T10:00:00Z" };
  let deleteCalls = 0;
  let listCalls = 0;
  await page.route((url) => url.port === apiPort && url.pathname === "/auth/me", (route) => route.fulfill({ json: { data: admin } }));
  await page.route((url) => url.port === apiPort && url.pathname === "/auth/csrf/bootstrap", (route) => route.fulfill({ json: { data: { csrf_token: "admin-csrf" } } }));
  await page.route((url) => url.port === apiPort && url.pathname === "/admin/producers" && url.search.length > 0, (route) => {
    listCalls += 1;
    return route.fulfill({ json: { data: { producers: [producer], stats: { total: 1, by_brand: [{ brand: "Dacia", count: 1 }] }, pagination: { page: 1, page_size: 25, total: 1, total_pages: 1 } } } });
  });
  await page.route((url) => url.port === apiPort && url.pathname === "/admin/producers/producer-1", async (route) => {
    deleteCalls += 1;
    expect(route.request().method()).toBe("DELETE");
    expect(route.request().postDataJSON()).toEqual({ confirmation: "DELETE" });
    if (deleteCalls === 1) return route.fulfill({ status: 500, json: { error: { code: "internal_error", message: "The request could not be completed" } } });
    await new Promise((resolve) => setTimeout(resolve, 700));
    producer = { ...producer, status: "disabled" };
    return route.fulfill({ json: { data: { status: "disabled" } } });
  });

  await page.goto("/admin/producers");
  await expect(page.getByRole("link", { name: /drivewise/i })).toBeVisible();
  await expect(page.getByText("Dacia", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Total", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Deactivate producer Dacia" })).toBeVisible();
  await page.getByRole("button", { name: "Deactivate producer Dacia" }).click();
  let dialog = page.getByRole("dialog", { name: "Deactivate this producer?" });
  await expect(dialog).toContainText("Dacia");
  await expect(dialog).toContainText("active sessions will be closed");
  await expect(dialog).toContainText("Existing records will be retained");
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  expect(deleteCalls).toBe(0);

  await page.getByRole("button", { name: "Deactivate producer Dacia" }).click();
  dialog = page.getByRole("dialog", { name: "Deactivate this producer?" });
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(dialog.getByRole("alert")).toContainText("The producer could not be deactivated");
  await expect(dialog).toContainText("Dacia");
  expect(deleteCalls).toBe(1);
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(dialog.getByRole("button", { name: "Deactivating..." })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeDisabled();
  await expect(page.getByText("The producer has been deactivated. Active sessions were closed.")).toBeVisible();
  const disabledStatus = page.getByLabel("Producers table").getByText("Disabled", { exact: true });
  await expect(disabledStatus).toHaveCount(2);
  await expect(disabledStatus.first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Deactivate producer Dacia" })).toHaveCount(0);
  expect(deleteCalls).toBe(2);
  expect(listCalls).toBeGreaterThanOrEqual(2);
});

test("admin list filters, sorting, pagination, and statistics keep server totals", async ({ page }) => {
  const seen: URL[] = [];
  await page.route((url) => url.port === apiPort && url.pathname === "/auth/me", (route) => route.fulfill({ json: { data: admin } }));
  await page.route((url) => url.port === apiPort && url.pathname === "/admin/users" && url.search.length > 0, (route) => {
    const url = new URL(route.request().url());
    seen.push(url);
    const filtered = url.searchParams.get("name") === "Alex";
    const pageNumber = Number(url.searchParams.get("page") ?? 1);
    const items = filtered ? [{ id: "alex", name: "Alex Driver", email: "alex@example.test", status: "active", created_at: "2026-10-01T00:00:00Z" }] : pageNumber === 2 ? [{ id: "page-two", name: "Page Two", email: "page2@example.test", status: "active", created_at: "2026-10-02T00:00:00Z" }] : [{ id: "page-one", name: "Page One", email: "page1@example.test", status: "active", created_at: "2026-10-03T00:00:00Z" }];
    const total = filtered ? 1 : 51;
    const pageSize = Number(url.searchParams.get("page_size") ?? 25);
    return route.fulfill({ json: { data: { users: items, stats: { total: 51, by_status: { active: 45, disabled: 6 } }, pagination: { page: pageNumber, page_size: pageSize, total, total_pages: Math.ceil(total / pageSize) } } } });
  });

  await page.goto("/admin/users");
  await expect(page.getByText("Page One", { exact: true })).toBeVisible();
  await expect(page.getByText("45", { exact: true })).toBeVisible();
  await expect(page.getByText(/Page 1 of 3/)).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect.poll(() => seen.at(-1)?.searchParams.get("page")).toBe("2");
  await expect(page.getByText("Page Two", { exact: true })).toBeVisible();
  await page.getByLabel("Sort by").click();
  await page.getByRole("option", { name: "Name" }).click();
  await expect.poll(() => seen.at(-1)?.searchParams.get("sort_by")).toBe("name");
  await page.getByLabel("Rows per page").click();
  await page.getByRole("option", { name: "50", exact: true }).click();
  await expect.poll(() => seen.at(-1)?.searchParams.get("page_size")).toBe("50");
  await page.getByRole("button", { name: /Filters/ }).click();
  await page.getByLabel("Name").fill("Alex");
  await expect.poll(() => seen.at(-1)?.searchParams.get("name")).toBe("Alex");
  await expect(page.getByText("Alex Driver", { exact: true })).toBeVisible();
  await expect(page.getByText(/Page 1 of 1/)).toBeVisible();
  await expect(page.getByText("45", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test("user deactivation names the account, can be canceled, and closes the session after confirmation", async ({ page }) => {
  const user = { id: "user-target", name: "Alex Driver", email: "alex@example.test", status: "active", created_at: "2026-10-01T00:00:00Z" };
  let deleteCalls = 0;
  let listCalls = 0;
  await page.route((url) => url.port === apiPort && url.pathname === "/auth/me", (route) => route.fulfill({ json: { data: admin } }));
  await page.route((url) => url.port === apiPort && url.pathname === "/auth/csrf/bootstrap", (route) => route.fulfill({ json: { data: { csrf_token: "admin-csrf" } } }));
  await page.route((url) => url.port === apiPort && url.pathname === "/admin/users" && url.search.length > 0, (route) => {
    listCalls += 1;
    return route.fulfill({ json: { data: { users: [user], stats: { total: 1, by_status: { active: 1 } }, pagination: { page: 1, page_size: 25, total: 1, total_pages: 1 } } } });
  });
  await page.route((url) => url.port === apiPort && url.pathname === "/admin/users/user-target", async (route) => {
    deleteCalls += 1;
    expect(route.request().method()).toBe("DELETE");
    expect(route.request().postDataJSON()).toEqual({ confirmation: "DELETE" });
    await new Promise((resolve) => setTimeout(resolve, 300));
    return route.fulfill({ json: { data: { status: "disabled" } } });
  });

  await page.goto("/admin/users");
  await expect(page.getByRole("button", { name: "Deactivate user alex@example.test" })).toBeVisible();
  await page.getByRole("button", { name: "Deactivate user alex@example.test" }).click();
  const dialog = page.getByRole("dialog", { name: "Deactivate this user?" });
  await expect(dialog).toContainText("alex@example.test");
  await expect(dialog).toContainText("disabled and its active sessions will be closed");
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  expect(deleteCalls).toBe(0);

  await page.getByRole("button", { name: "Deactivate user alex@example.test" }).click();
  await page.getByRole("dialog", { name: "Deactivate this user?" }).getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Deactivating..." })).toBeDisabled();
  await expect(page.getByText("The user has been deactivated.", { exact: true })).toBeVisible();
  expect(deleteCalls).toBe(1);
  expect(listCalls).toBeGreaterThanOrEqual(2);
});

test("non-admin account is redirected away from admin routes", async ({ page }) => {
  await page.route((url) => url.port === apiPort && url.pathname === "/auth/me", (route) => route.fulfill({ json: { data: { ...admin, id: "user-014", role: "user" } } }));
  await page.route((url) => url.port === apiPort && url.pathname === "/vehicles", (route) => route.fulfill({ json: { data: { vehicles: [] } } }));
  await page.route((url) => url.port === apiPort && url.pathname === "/trips/favorites", (route) => route.fulfill({ json: { data: { favorites: [] } } }));
  await page.goto("/admin/producers");
  await expect(page).toHaveURL(/\/trip$/);
});
