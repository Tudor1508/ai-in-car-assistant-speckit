import { expect, test, type Page } from "@playwright/test";

const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").origin;
const viewportWidths = [375, 768, 1440] as const;

const appRoutes = [
  { path: "/", role: "user" },
  { path: "/contact", role: "user" },
  { path: "/privacy", role: "user" },
  { path: "/login", role: "anonymous" },
  { path: "/register", role: "anonymous" },
  { path: "/profile", role: "user" },
  { path: "/trip", role: "user" },
  { path: "/trips", role: "user" },
  { path: "/vehicles", role: "user" },
  { path: "/admin", role: "admin" },
  { path: "/admin/users", role: "admin" },
  { path: "/admin/producers", role: "admin" },
  { path: "/admin/vehicles", role: "admin" },
] as const;

function response(data: unknown, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify({ data }) };
}

async function mockApi(page: Page, currentRole: { value: "user" | "admin" | "anonymous" }) {
  await page.route((url) => url.origin === apiOrigin, async (route) => {
    const url = new URL(route.request().url());
    const pageNumber = Number(url.searchParams.get("page") ?? 1);
    const pageSize = Number(url.searchParams.get("page_size") ?? 25);
    if (url.pathname === "/auth/me" && currentRole.value === "anonymous") {
      return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: { code: "authentication_required", message: "Sign in to continue." } }) });
    }
    if (url.pathname === "/auth/me") {
      return route.fulfill(response({ id: "ux-audit", name: "UX Audit", email: "ux@example.test", email_verified: false, role: currentRole.value }));
    }
    if (url.pathname === "/auth/csrf/bootstrap") return route.fulfill(response({ csrf_token: "ux-audit-csrf" }));
    if (url.pathname === "/assistant/status") return route.fulfill(response({ enabled: true, availability: "available" }));
    if (url.pathname === "/vehicles") return route.fulfill(response({ vehicles: [] }));
    if (url.pathname === "/trips/favorites") return route.fulfill(response({ favorites: [] }));
    if (url.pathname === "/trips/history") {
      return route.fulfill(response({
        trips: [{
          id: "1".repeat(32),
          origin: { label: "Bucharest", latitude: 44.4268, longitude: 26.1025 },
          destination: { label: "Timisoara", latitude: 45.7489, longitude: 21.2087 },
          created_at: "2026-10-07T10:00:00Z",
          route_preference: "fastest",
          vehicle: { id: "2".repeat(32), name: "Drive Wise", model: "EV", type: "electric", current_level_percent: 80, available_range_km: 320, maximum_range_km: 400 },
          route: { geometry: { type: "LineString", coordinates: [[26.1025, 44.4268], [21.2087, 45.7489]] }, distance_m: 540000, duration_s: 21600 },
          feasibility: { status: "complete", message: null },
          legs: [{ sequence: 1, distance_m: 540000, duration_s: 21600 }], stops: [], attractions: [], restaurants: [],
        }],
        summary: { total_trips: 11, total_distance_m: 5940000, total_duration_s: 237600 },
        pagination: { page: pageNumber, page_size: 10, total: 11, total_pages: 2 },
      }));
    }
    const section = url.pathname.match(/^\/admin\/(users|vehicles|producers)$/)?.[1];
    if (section) {
      const rows = section === "users"
        ? [{ id: "user-1", name: "Audit User", email: "user@example.test", status: "active", created_at: "2026-10-07T10:00:00Z" }]
        : section === "producers"
          ? [{ id: "producer-1", name: "Audit Producer", brand: "Dacia", email: "producer@example.test", status: "active", created_at: "2026-10-07T10:00:00Z" }]
          : [{ id: "vehicle-1", name: "Audit Driver", model: "EV", type: "electric", year: 2024, range_km: 400, mileage_km: 10000, fuel_type: null, created_at: "2026-10-07T10:00:00Z" }];
      return route.fulfill(response({
        [section]: rows,
        stats: { total: 51, by_status: { active: 45, disabled: 6 }, by_type: { combustion: 20, electric: 31 }, by_brand: [{ brand: "Dacia", count: 1 }] },
        pagination: { page: pageNumber, page_size: pageSize, total: 51, total_pages: Math.ceil(51 / pageSize) },
      }));
    }
    return route.fulfill(response({}));
  });
}

async function auditKeyboardReachability(page: Page, routePath: string, width: number) {
  const candidates = await page.evaluate(() => {
    const selector = 'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]';
    return Array.from(document.querySelectorAll<HTMLElement>(selector))
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return element.tabIndex >= 0 && !element.hasAttribute("disabled") && style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0 && !element.closest("[aria-hidden='true'], nextjs-portal");
      })
      .map((element, index) => {
        element.dataset.responsiveAuditFocus = String(index);
        const labelledBy = element.getAttribute("aria-labelledby")?.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ");
        const labels = "labels" in element ? Array.from((element as HTMLInputElement).labels ?? []).map((label) => label.textContent ?? "").join(" ") : "";
        const name = element.getAttribute("aria-label") || labelledBy || labels || element.innerText || element.getAttribute("title") || element.getAttribute("placeholder") || ("value" in element ? String((element as HTMLInputElement).value) : "");
        return { index, name: name.trim() };
      });
  });

  expect(candidates.filter(({ name }) => !name).map(({ index }) => index), `${routePath} has unnamed visible keyboard controls at ${width}px`).toEqual([]);
  if (candidates.length === 0) return;

  const reached = new Set<number>();
  for (let tab = 0; tab < candidates.length + 2; tab += 1) {
    await page.keyboard.press("Tab");
    const index = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      return active?.dataset.responsiveAuditFocus === undefined ? null : Number(active.dataset.responsiveAuditFocus);
    });
    if (index !== null) reached.add(index);
  }

  expect([...reached].sort((a, b) => a - b), `${routePath} has visible controls skipped by Tab at ${width}px`).toEqual(candidates.map(({ index }) => index));
}

for (const width of viewportWidths) {
  for (const route of appRoutes) {
    test(`${route.path} at ${width}px has no page overflow and all visible controls are keyboard reachable`, async ({ page }) => {
      const currentRole: { value: "user" | "admin" | "anonymous" } = { value: route.role };
      await mockApi(page, currentRole);
      await page.setViewportSize({ width, height: width < 500 ? 812 : 900 });
      await page.goto(route.path, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await expect(page.getByRole("heading").first(), `${route.path} page heading should be visible at ${width}px`).toBeVisible();
      if (route.path === "/login") await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
      if (route.path === "/register") await expect(page.getByRole("button", { name: "Create account", exact: true })).toBeEnabled();
      await expect.poll(() => new URL(page.url()).pathname, { message: `${route.path} should not redirect at ${width}px` }).toBe(route.path);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth), { message: `${route.path} should not overflow the page at ${width}px` }).toBeLessThanOrEqual(width);
      if (route.path === "/trips") {
        await expect(page.getByText("5,940 km")).toBeVisible();
        await expect(page.getByText("Page 1 of 2")).toBeVisible();
        await page.getByRole("button", { name: "Next", exact: true }).click();
        await expect(page.getByText("Page 2 of 2")).toBeVisible();
        await expect(page.getByText("5,940 km")).toBeVisible();
      }
      await auditKeyboardReachability(page, route.path, width);

      if (route.path === "/trip") {
        await page.getByRole("button", { name: "Open Drivewise Assistant" }).click();
        const assistant = page.getByRole("dialog", { name: "Drivewise Assistant" });
        await expect(assistant).toBeVisible();
        const bounds = await assistant.boundingBox();
        expect(bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= width && bounds.y + bounds.height <= (width < 500 ? 812 : 900), `Concierge panel should fit at ${width}px`).toBeTruthy();
        await auditKeyboardReachability(page, "/trip Concierge", width);
        await page.getByRole("button", { name: "Close chat" }).click();
        await expect(assistant).toBeHidden();
      }

      if (route.path === "/admin/producers") {
        await page.getByRole("button", { name: /Add producer/ }).click();
        const addDialog = page.getByRole("dialog", { name: "Add producer" });
        await expect(addDialog).toBeVisible();
        await auditKeyboardReachability(page, "/admin/producers Add producer dialog", width);
        await page.keyboard.press("Escape");
        await expect(addDialog).toBeHidden();

        await page.getByRole("button", { name: "Deactivate producer Dacia" }).click();
        const confirmDialog = page.getByRole("dialog", { name: "Deactivate this producer?" });
        await expect(confirmDialog).toBeVisible();
        await auditKeyboardReachability(page, "/admin/producers deactivation dialog", width);
        await confirmDialog.getByRole("button", { name: "Cancel" }).click();
        await expect(confirmDialog).toBeHidden();
      }
    });
  }
}
