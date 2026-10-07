import { expect, test, type Page } from "@playwright/test";

async function registerAndLogin(page: Page) {
  const email = `concierge-integration-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Nume complet").fill("Concierge Integration Test");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Parol/).fill("ExamplePass1!");
  await page.getByLabel(/Confirm/).fill("ExamplePass1!");
  await page.getByRole("button", { name: /Creeaz/ }).click();
  await expect(page.getByText(/Contul a fost creat/)).toBeVisible();
  await page.getByRole("link", { name: "Autentificare" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Parol/).fill("ExamplePass1!");
  await page.getByRole("button", { name: /Autentificare/ }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("frontend sends recent context to isolated FastAPI for a general follow-up; fake failure preserves the draft", async ({ page }) => {
  const requests: Array<{ question: string; locale: string; history: Array<{ role: "user" | "assistant"; text: string }> }> = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/assistant/messages")) requests.push(request.postDataJSON());
  });
  await registerAndLogin(page);
  await page.getByRole("button", { name: "Open Drivewise Assistant" }).click();

  const input = page.getByLabel("Travel question");
  const firstQuestion = "Suggest a route from Cluj to Bucharest.";
  await input.fill(firstQuestion);
  const firstResponsePromise = page.waitForResponse((response) => response.url().endsWith("/assistant/messages"));
  await page.getByRole("button", { name: "Send" }).click();
  expect((await firstResponsePromise).status()).toBe(200);
  const firstAnswer = `Fake en answer for: ${firstQuestion}`;
  expect(requests[0]).toEqual({ question: firstQuestion, locale: "en", history: [] });
  await expect(page.getByText(firstAnswer)).toBeVisible();

  const followUp = "What stop would work along it?";
  await input.fill(followUp);
  const followUpResponsePromise = page.waitForResponse((response) => response.url().endsWith("/assistant/messages"));
  await page.getByRole("button", { name: "Send" }).click();
  expect((await followUpResponsePromise).status()).toBe(200);
  expect(requests[1]).toEqual({
    question: followUp,
    locale: "en",
    history: [
      { role: "user", text: firstQuestion },
      { role: "assistant", text: firstAnswer },
    ],
  });
  await expect(page.getByText(/Follow-up understood from earlier conversation:.*Cluj to Bucharest.*I can use these details/i)).toBeVisible();

  const failedQuestion = "fail this provider request";
  await input.fill(failedQuestion);
  const failedResponsePromise = page.waitForResponse((response) => response.url().endsWith("/assistant/messages"));
  await page.getByRole("button", { name: "Send" }).click();
  expect((await failedResponsePromise).status()).toBe(502);
  expect(requests).toHaveLength(3);
  expect(requests[2].question).toBe(failedQuestion);
  expect(requests[2].history).toHaveLength(4);
  await expect(input).toHaveValue(failedQuestion);
  await expect(page.getByRole("alert").filter({ hasText: /question remains in the input/i })).toBeVisible();
});

test("approved recording reaches authenticated FastAPI fake transcription and only fills the draft", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) },
    });
    class FakeMediaRecorder {
      static isTypeSupported = () => true;
      state = "inactive";
      mimeType = "audio/webm;codecs=opus";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(_stream: unknown, options?: { mimeType?: string }) { this.mimeType = options?.mimeType ?? this.mimeType; }
      start() { this.state = "recording"; }
      stop() {
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob(["fake approved audio"], { type: "audio/webm" }) });
        this.onstop?.();
      }
    }
    Object.defineProperty(window, "MediaRecorder", { configurable: true, value: FakeMediaRecorder });
  });
  await registerAndLogin(page);
  await page.getByRole("button", { name: "Open Drivewise Assistant" }).click();
  const input = page.getByLabel("Travel question");
  await input.fill("Typed draft stays available");
  await page.getByRole("button", { name: "Record question" }).click();
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.getByRole("group")).toContainText(/audio recording will be sent to OpenAI/i);
  const transcription = page.waitForResponse((response) => response.url().endsWith("/assistant/transcriptions"));
  await page.getByRole("button", { name: "Allow and transcribe" }).click();
  const response = await transcription;
  expect(response.status()).toBe(200);
  await expect(input).toHaveValue("Typed draft stays available Fake transcript from approved recording");
  await expect(page.getByRole("button", { name: "Send" })).toBeEnabled();
});
