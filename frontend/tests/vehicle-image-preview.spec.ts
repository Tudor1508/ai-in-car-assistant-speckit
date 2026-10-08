import { expect, test, type Page, type Route } from "@playwright/test";

const image = {
  provider: "wikimedia_commons" as const,
  file_title: "File:Audi A5 2020.jpg",
  image_url: "https://upload.wikimedia.org/wikipedia/commons/a/a1/Audi_A5.jpg",
  file_page_url: "https://commons.wikimedia.org/wiki/File:Audi_A5_2020.jpg",
  creator: "Jane Driver",
  license_name: "CC BY-SA 4.0",
  license_url: "https://creativecommons.org/licenses/by-sa/4.0/",
  match_kind: "exact" as const,
};
const similarImage = {
  ...image,
  file_title: "File:Tesla Model 3 electric car.jpg",
  file_page_url: "https://commons.wikimedia.org/wiki/File:Tesla_Model_3_electric_car.jpg",
  creator: "Tesla photographer",
  match_kind: "similar" as const,
};

async function registerAndLogin(page: Page, email: string) {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Garage Owner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").first().fill("ExamplePass1!");
  await page.getByLabel("Confirm password").fill("ExamplePass1!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(/Your account was created/)).toBeVisible();
  await page.getByRole("link", { name: "Sign in" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("ExamplePass1!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/trip$/);
}

async function fulfill(route: Route, data: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ data }) });
}

test("vehicle image preview ignores stale lookups and stays attributed in the garage after reload", async ({ page }) => {
  await registerAndLogin(page, `vehicle-image-${Date.now()}@example.com`);

  let failImageLoads = false;
  await page.route("https://upload.wikimedia.org/**", (route) => failImageLoads
    ? route.abort()
    : route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l5sAAAAASUVORK5CYII=", "base64"),
    }));

  const requestedModels: string[] = [];
  let savedVehicle: Record<string, unknown> | null = null;
  await page.route("http://localhost:8000/vehicles**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const method = route.request().method();
    if (requestUrl.pathname.endsWith("/image-preview")) {
      const model = requestUrl.searchParams.get("model") ?? "";
      const year = requestUrl.searchParams.get("year");
      requestedModels.push(model);
      if (model === "Unavailable") {
        await route.abort();
        return;
      }
      if (model === "Obsolete Model") {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        await fulfill(route, { status: "matched", image: { ...image, file_title: "File:Stale.jpg" } });
      } else if (model === "A5" && year === "2020") {
        await fulfill(route, { status: "matched", image });
      } else {
        await fulfill(route, { status: "fallback", image: null });
      }
      return;
    }
    if (method === "GET") {
      await fulfill(route, { vehicles: savedVehicle ? [savedVehicle] : [] });
      return;
    }
    if (method === "POST" || method === "PATCH") {
      const payload = route.request().postDataJSON() as Record<string, unknown>;
      savedVehicle = {
        id: "vehicle-image-test-id",
        ...payload,
        image: payload.image_file_title ? image : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await fulfill(route, { vehicle: savedVehicle }, method === "POST" ? 201 : 200);
      return;
    }
    await fulfill(route, { status: "deleted" });
  });

  await page.goto("/vehicles");
  await page.getByRole("button", { name: /Add vehicle/i }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Vehicle name").focus();
  await page.keyboard.press("Tab");
  await expect(dialog.getByLabel("Model")).toBeFocused();
  await dialog.getByLabel("Vehicle name").fill("Audi");
  await dialog.getByLabel("Year").fill("2020");
  await dialog.getByLabel("Model").fill("Obsolete Model");
  await expect.poll(() => requestedModels.includes("Obsolete Model")).toBeTruthy();
  await dialog.getByLabel("Model").fill("A5");
  await expect(dialog.getByText("Jane Driver")).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Wikimedia Commons" })).toHaveAttribute("href", image.file_page_url);
  await expect.poll(() => requestedModels.includes("A5")).toBeTruthy();
  await expect(dialog.locator('img[alt*="Audi A5 2020"]')).toHaveAttribute("src", image.image_url);
  await expect.poll(async () => dialog.getByText("Jane Driver").count()).toBe(1);
  await page.waitForTimeout(1300);
  await expect(dialog.locator('img[alt*="Audi A5 2020"]')).toHaveAttribute("src", image.image_url);

  await dialog.getByLabel("Range (km)").fill("600");
  await dialog.getByLabel("Mileage (km)").fill("12000");
  await dialog.getByLabel("Fuel type").click();
  await page.getByRole("option", { name: "Diesel" }).click();
  await dialog.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Jane Driver")).toBeVisible();
  await expect(page.getByRole("link", { name: "CC BY-SA 4.0" })).toHaveAttribute("href", image.license_url);
  await page.reload();
  await expect(page.getByText("Audi")).toBeVisible();
  await expect(page.getByRole("link", { name: "Wikimedia Commons" })).toHaveAttribute("href", image.file_page_url);
  await expect(page.getByText("Jane Driver")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.getByRole("button", { name: "Edit Audi" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("Year").fill("2021");
  await expect(editDialog.getByText("No reliable image match is available.")).toBeVisible();
  await expect(editDialog.locator('img[alt="Generic vehicle illustration; exact model image unavailable."]')).toBeVisible();
  await editDialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Generic illustration; it does not represent the exact vehicle model.").last()).toBeVisible();
  await page.reload();
  await expect(page.getByText("Audi")).toBeVisible();
  await expect(page.locator('img[alt="Generic vehicle illustration; exact model image unavailable."]').first()).toBeVisible();

  await page.getByRole("button", { name: "Edit Audi" }).click();
  const brokenImageDialog = page.getByRole("dialog");
  failImageLoads = true;
  await brokenImageDialog.getByLabel("Year").fill("2020");
  await expect(brokenImageDialog.locator('img[alt="Generic vehicle illustration; exact model image unavailable."]')).toBeVisible();
  await brokenImageDialog.getByRole("button", { name: "Save" }).click();
  await expect(page.locator('img[alt="Generic vehicle illustration; exact model image unavailable."]').first()).toBeVisible();

  await page.getByRole("button", { name: "Edit Audi" }).click();
  const pendingDialog = page.getByRole("dialog");
  await pendingDialog.getByLabel("Model").fill("Pending lookup");
  await expect(pendingDialog.getByRole("button", { name: "Save" })).toBeEnabled();
  await pendingDialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Generic illustration; it does not represent the exact vehicle model.").last()).toBeVisible();

  await page.getByRole("button", { name: "Edit Audi" }).click();
  const unavailableDialog = page.getByRole("dialog");
  await unavailableDialog.getByLabel("Model").fill("Unavailable");
  await expect(unavailableDialog.getByText("No reliable image match is available.")).toBeVisible();
  await expect(unavailableDialog.getByRole("button", { name: "Save" })).toBeEnabled();
});

test("a same-model image without confirmed year is labeled similar in preview and garage", async ({ page }) => {
  await registerAndLogin(page, `vehicle-similar-image-${Date.now()}@example.com`);
  await page.route("https://upload.wikimedia.org/**", (route) => route.fulfill({
    status: 200,
    contentType: "image/png",
    body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l5sAAAAASUVORK5CYII=", "base64"),
  }));
  let savedVehicle: Record<string, unknown> | null = null;
  let submittedImageTitle: unknown;
  await page.route("http://localhost:8000/vehicles**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const method = route.request().method();
    if (requestUrl.pathname.endsWith("/image-preview")) {
      await fulfill(route, { status: "matched", image: similarImage });
      return;
    }
    if (method === "GET") {
      await fulfill(route, { vehicles: savedVehicle ? [savedVehicle] : [] });
      return;
    }
    if (method === "POST" || method === "PATCH") {
      const payload = route.request().postDataJSON() as Record<string, unknown>;
      submittedImageTitle = payload.image_file_title;
      savedVehicle = {
        id: "vehicle-similar-image-test-id",
        ...payload,
        image: payload.image_file_title ? similarImage : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await fulfill(route, { vehicle: savedVehicle }, method === "POST" ? 201 : 200);
      return;
    }
    await fulfill(route, { status: "deleted" });
  });

  await page.goto("/vehicles");
  await page.getByRole("button", { name: /Add vehicle/i }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Vehicle name").fill("Tesla");
  await dialog.getByLabel("Model").fill("Model 3");
  await dialog.getByLabel("Year").fill("2020");
  await expect(dialog.getByText("Similar vehicle image; the exact model or year is not confirmed.")).toBeVisible();
  await dialog.getByLabel("Range (km)").fill("400");
  await dialog.getByLabel("Mileage (km)").fill("100000");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  expect(submittedImageTitle).toBe(similarImage.file_title);
  await expect(page.getByText("Similar vehicle image; the exact model or year is not confirmed.")).toBeVisible();
  await expect(page.getByText("Tesla photographer")).toBeVisible();
});

test("uploaded vehicle photo overrides Commons and is explicitly discarded", async ({ page }) => {
  await registerAndLogin(page, `vehicle-upload-image-${Date.now()}@example.com`);
  await page.route("https://upload.wikimedia.org/**", (route) => route.fulfill({
    status: 200,
    contentType: "image/png",
    body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l5sAAAAASUVORK5CYII=", "base64"),
  }));
  const uploadedPhoto = {
    provider: "user_upload",
    image_url: "/vehicles/vehicle-upload-test-id/image-content",
    match_kind: "uploaded",
  };
  let savedVehicle: Record<string, unknown> | null = null;
  let previewCalls = 0;
  let uploadCalls = 0;
  await page.route("http://localhost:8000/vehicles**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.pathname.endsWith("/image-preview")) {
      previewCalls += 1;
      await fulfill(route, { status: "matched", image });
      return;
    }
    if (url.pathname.endsWith("/image-content")) {
      await route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l5sAAAAASUVORK5CYII=", "base64") });
      return;
    }
    if (url.pathname.endsWith("/image") && method === "POST") {
      uploadCalls += 1;
      savedVehicle = { ...savedVehicle!, image: uploadedPhoto };
      await fulfill(route, { vehicle: savedVehicle });
      return;
    }
    if (method === "GET") {
      await fulfill(route, { vehicles: savedVehicle ? [savedVehicle] : [] });
      return;
    }
    if (method === "POST" || method === "PATCH") {
      const payload = route.request().postDataJSON() as Record<string, unknown>;
      savedVehicle = {
        id: "vehicle-upload-test-id",
        ...payload,
        image: payload.image_file_title || payload.discard_uploaded_image ? image : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await fulfill(route, { vehicle: savedVehicle }, method === "POST" ? 201 : 200);
      return;
    }
    await fulfill(route, { status: "deleted" });
  });

  await page.goto("/vehicles");
  await page.getByRole("button", { name: /Add vehicle/i }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Vehicle name").fill("Tesla");
  await dialog.getByLabel("Model").fill("Model 3");
  await dialog.getByLabel("Year").fill("2020");
  await dialog.getByLabel("Range (km)").fill("400");
  await dialog.getByLabel("Mileage (km)").fill("1000");
  await dialog.getByRole("combobox", { name: "Type", exact: true }).click();
  await page.getByRole("option", { name: "Electric" }).click();
  await expect.poll(() => previewCalls).toBeGreaterThan(0);
  await dialog.getByLabel("Upload a photo of your vehicle").setInputFiles({
    name: "my-tesla.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l5sAAAAASUVORK5CYII=", "base64"),
  });
  await expect(dialog.getByText("Your uploaded vehicle photo")).toBeVisible();
  await expect(dialog.getByText("Photo by Jane Driver")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect.poll(() => uploadCalls).toBe(1);
  await expect(page.getByText("Your uploaded vehicle photo")).toBeVisible();

  await page.getByRole("button", { name: "Edit Tesla" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("Model").fill("Model 3 Long Range");
  await expect(editDialog.getByText("Your uploaded photo stays active until you discard it.")).toBeVisible();
  await editDialog.getByRole("button", { name: "Discard uploaded photo" }).click();
  await expect(editDialog.getByText("Photo by Jane Driver")).toBeVisible();
  await expect.poll(() => previewCalls).toBeGreaterThan(1);
  await editDialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Photo by Jane Driver")).toBeVisible();
  expect(uploadCalls).toBe(1);
});

test("Add/Edit dialogs keep photo controls responsive and keyboard accessible", async ({ page }) => {
  await registerAndLogin(page, `vehicle-image-dialog-ux-${Date.now()}@example.com`);

  let savedVehicle: Record<string, unknown> | null = null;
  await page.route("http://localhost:8000/vehicles**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.pathname.endsWith("/image-preview")) {
      await fulfill(route, { status: "fallback", image: null });
      return;
    }
    if (method === "GET") {
      await fulfill(route, { vehicles: savedVehicle ? [savedVehicle] : [] });
      return;
    }
    if (method === "POST" || method === "PATCH") {
      const payload = route.request().postDataJSON() as Record<string, unknown>;
      savedVehicle = {
        id: "vehicle-image-dialog-ux-id",
        ...payload,
        image: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await fulfill(route, { vehicle: savedVehicle }, method === "POST" ? 201 : 200);
      return;
    }
    await fulfill(route, { status: "deleted" });
  });

  await page.goto("/vehicles");
  const viewports = [375, 768, 1440];
  for (const width of viewports) {
    await page.setViewportSize({ width, height: 900 });
    const addButton = page.getByRole("button", { name: /Add vehicle/i }).first();
    await addButton.click();
    const addDialog = page.getByRole("dialog", { name: "Add vehicle" });
    await expect(addDialog).toBeVisible();
    const bounds = await addDialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();

    const uploadButton = addDialog.getByRole("button", { name: "Not your car in the image? Upload a photo" });
    await uploadButton.focus();
    await expect(uploadButton).toBeFocused();
    await addDialog.getByLabel("Upload a photo of your vehicle").setInputFiles({
      name: "my-car.png",
      mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l5sAAAAASUVORK5CYII=", "base64"),
    });
    await expect(addDialog.getByText("Your uploaded vehicle photo")).toBeVisible();
    const removePhotoButton = addDialog.getByRole("button", { name: "Remove selected photo" });
    await expect(removePhotoButton).toBeVisible();
    await uploadButton.focus();
    await page.keyboard.press("Tab");
    await expect(removePhotoButton).toBeFocused();
    await removePhotoButton.click();

    if (width === 375) {
      await addDialog.getByRole("button", { name: "Save" }).click();
      await expect(addDialog.getByLabel("Vehicle name")).toHaveAttribute("aria-invalid", "true");
      await expect(addDialog.getByLabel("Model")).toHaveAttribute("aria-invalid", "true");
      await expect(addDialog.getByLabel("Year")).toHaveAttribute("aria-invalid", "true");
      await expect(addDialog.getByLabel("Range (km)")).toHaveAttribute("aria-invalid", "true");
      await expect(addDialog.getByLabel("Mileage (km)")).toHaveAttribute("aria-invalid", "true");
      await addDialog.getByLabel("Vehicle name").fill("Audi");
      await addDialog.getByLabel("Model").fill("A5");
      await addDialog.getByLabel("Year").fill("2020");
      await addDialog.getByLabel("Range (km)").fill("600");
      await addDialog.getByLabel("Mileage (km)").fill("12000");
      await addDialog.getByRole("button", { name: "Save" }).click();
      await expect(page.getByRole("button", { name: "Edit Audi" })).toBeVisible();
      await expect(addButton).toBeFocused();
    } else {
      await addDialog.getByRole("button", { name: "Cancel" }).click();
      await expect(addButton).toBeFocused();
    }

    const editButton = page.getByRole("button", { name: "Edit Audi" });
    await editButton.click();
    const editDialog = page.getByRole("dialog", { name: "Edit vehicle" });
    await expect(editDialog).toBeVisible();
    const editBounds = await editDialog.boundingBox();
    expect(editBounds).not.toBeNull();
    expect(editBounds!.x).toBeGreaterThanOrEqual(0);
    expect(editBounds!.x + editBounds!.width).toBeLessThanOrEqual(width + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    const title = editDialog.getByRole("heading", { name: "Edit vehicle" });
    await expect(title).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(editDialog).toBeHidden();
    await expect(editButton).toBeFocused();
  }
});
