import { expect, test, type Page } from "@playwright/test";

async function openAsAuthenticatedUser(page: Page) {
  const apiPort = new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").port;
  await page.route((url) => url.port === apiPort && url.pathname === "/auth/me", (route) => route.fulfill({ json: {
    data: { id: "concierge-user", name: "Concierge Test", email: "concierge@example.test", email_verified: true, role: "user" },
  } }));
  await page.route((url) => url.port === apiPort && url.pathname === "/auth/csrf/bootstrap", (route) => route.fulfill({ json: { data: { csrf_token: "concierge-csrf" } } }));
  await page.route((url) => url.port === apiPort && url.pathname.startsWith("/vehicles"), (route) => route.fulfill({ json: { data: { vehicles: [] } } }));
  await page.route((url) => url.port === apiPort && url.pathname === "/trips/favorites", (route) => route.fulfill({ json: { data: { favorites: [] } } }));
  await page.goto("/trip");
  await expect(page.getByRole("heading", { name: "Plan a trip." })).toBeVisible();
}

async function installFakeAssistantApi(page: Page, messageHandler: (requestBody: unknown) => Promise<{ status: number; body: unknown }>) {
  await page.route("**/assistant/status", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: { enabled: true, availability: "available" } }),
  }));
  await page.route("**/assistant/messages", async (route) => {
    const result = await messageHandler(route.request().postDataJSON());
    await route.fulfill({ status: result.status, contentType: "application/json", body: JSON.stringify(result.body) });
  });
  await page.route("**/assistant/speech", (route) => route.fulfill({
    status: 422,
    contentType: "application/json",
    body: JSON.stringify({ error: { code: "speech_language_unsupported", message: "Speech playback is unavailable for this language" } }),
  }));
  await page.route("**/assistant/transcriptions", (route) => route.fulfill({
    status: 502,
    contentType: "application/json",
    body: JSON.stringify({ error: { code: "transcription_unavailable", message: "Speech transcription is temporarily unavailable" } }),
  }));
}

async function installFakeRecorder(page: Page) {
  await page.addInitScript(() => {
    const track = { stop() {} };
    const stream = { getTracks: () => [track] };
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: async () => stream },
    });
    class FakeMediaRecorder {
      static isTypeSupported = () => true;
      state = "inactive";
      mimeType = "audio/webm;codecs=opus";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(_stream: unknown, options?: { mimeType?: string }) { this.mimeType = options?.mimeType ?? this.mimeType; }
      start() { this.state = "recording"; (window as Window & { fakeRecorder?: FakeMediaRecorder }).fakeRecorder = this; }
      stop() {
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob(["fake voice question"], { type: "audio/webm" }) });
        this.onstop?.();
      }
    }
    Object.defineProperty(window, "MediaRecorder", { configurable: true, value: FakeMediaRecorder });
  });
}

test("launcher overlays the trip page and Send submits only question and locale without confirmation", async ({ page }) => {
  let count = 0;
  let received: unknown;
  await installFakeAssistantApi(page, async (body) => {
    count += 1;
    received = body;
    return { status: 200, body: { data: { reply: { text: "Fake answer with approximate estimates.", language: "en-US", is_demo: false } } } };
  });
  await openAsAuthenticatedUser(page);

  const heading = page.getByRole("heading", { name: "Plan a trip." });
  const before = await heading.boundingBox();
  const launcher = page.getByRole("button", { name: "Open Drivewise Assistant" });
  await expect(launcher).toBeVisible();
  const launcherBox = await launcher.boundingBox();
  expect(launcherBox).toBeTruthy();
  expect(launcherBox!.x + launcherBox!.width / 2).toBeGreaterThan(page.viewportSize()!.width / 2);
  expect(launcherBox!.x + launcherBox!.width).toBeCloseTo(page.viewportSize()!.width - 24, 0);
  expect(launcherBox!.y + launcherBox!.height).toBeCloseTo(page.viewportSize()!.height - 24, 0);

  await launcher.click();
  await expect(page.getByRole("dialog", { name: "Drivewise Assistant" })).toBeVisible();
  await expect(launcher).toBeHidden();
  expect(await heading.boundingBox()).toEqual(before);
  await expect(page.getByText(/Travel guidance only|Estimates are approximate|Requests are sent to|may incur charges to the company/i)).toHaveCount(0);
  await page.getByLabel("Travel question").fill("Suggest a weekend in BraÈ™ov");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("Fake answer with approximate estimates.")).toBeVisible();
  const assistantPanel = page.getByRole("dialog", { name: "Drivewise Assistant" });
  const panelBox = await assistantPanel.boundingBox();
  expect(panelBox?.width).toBeCloseTo(304, 0);
  const userBox = await page.getByTestId("user-message").boundingBox();
  const assistantBox = await page.getByTestId("assistant-message").boundingBox();
  expect(userBox).toBeTruthy();
  expect(assistantBox).toBeTruthy();
  expect(userBox!.x + userBox!.width).toBeGreaterThan(panelBox!.x + panelBox!.width * 0.8);
  expect(assistantBox!.x).toBeLessThan(panelBox!.x + panelBox!.width * 0.2);
  const composer = page.getByTestId("concierge-composer");
  const composerBox = await composer.boundingBox();
  const composerItems = [
    await page.getByLabel("Travel question").boundingBox(),
    await page.getByRole("button", { name: "Read latest answer aloud" }).boundingBox(),
    await page.getByRole("button", { name: "Record question" }).boundingBox(),
    await page.getByRole("button", { name: "Send" }).boundingBox(),
  ];
  expect(composerBox).toBeTruthy();
  expect(composerItems.every(Boolean)).toBe(true);
  expect(composerItems.map((box) => box!.x)).toEqual([...composerItems.map((box) => box!.x)].sort((a, b) => a - b));
  expect(Math.abs(composerBox!.y + composerBox!.height - (panelBox!.y + panelBox!.height - 8))).toBeLessThanOrEqual(1);
  expect(count).toBe(1);
  expect(received).toEqual({ question: "Suggest a weekend in BraÈ™ov", locale: "en", history: [] });
  await expect(page.getByRole("dialog", { name: /Send this question/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Close chat" }).click();
  await expect(launcher).toBeVisible();
  expect(await heading.boundingBox()).toEqual(before);
  expect(await launcher.boundingBox()).toEqual(launcherBox);

  await page.setViewportSize({ width: 390, height: 844 });
  await launcher.click();
  const panel = page.getByRole("dialog", { name: "Drivewise Assistant" });
  const narrowPanelBox = await panel.boundingBox();
  expect(narrowPanelBox).toBeTruthy();
  expect(narrowPanelBox!.x).toBeGreaterThanOrEqual(0);
  expect(narrowPanelBox!.x + narrowPanelBox!.width).toBeLessThanOrEqual(390);
  expect(narrowPanelBox!.y).toBeGreaterThanOrEqual(0);
  await expect(page.getByLabel("Travel question")).toBeVisible();
});

test("failed assistant request keeps the question in the conversation and offers retry", async ({ page }) => {
  let count = 0;
  await installFakeAssistantApi(page, async () => {
    count += 1;
    return count === 1
      ? { status: 502, body: { error: { code: "assistant_unavailable", message: "The travel assistant is temporarily unavailable" } } }
      : { status: 200, body: { data: { reply: { text: "Retry answer", language: "en-US", is_demo: false } } } };
  });
  await openAsAuthenticatedUser(page);
  await page.getByRole("button", { name: "Open Drivewise Assistant" }).click();
  const draft = "Plan a city break";
  const input = page.getByLabel("Travel question");
  await input.fill(draft);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /question is still in the conversation/i })).toBeVisible();
  await expect(page.getByTestId("user-message")).toHaveText(draft);
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("Retry answer")).toBeVisible();
  await expect(page.getByTestId("user-message")).toHaveCount(1);
  expect(count).toBe(2);
});

test("shows a compact assistant loading bubble in the message list without moving the composer", async ({ page }) => {
  let finishRequest!: () => void;
  const requestGate = new Promise<void>((resolve) => { finishRequest = resolve; });
  await installFakeAssistantApi(page, async () => {
    await requestGate;
    return { status: 200, body: { data: { reply: { text: "Fake answer", language: "en-US", is_demo: false } } } };
  });
  await openAsAuthenticatedUser(page);
  await page.getByRole("button", { name: "Open Drivewise Assistant" }).click();
  await page.getByLabel("Travel question").fill("Plan a weekend trip");
  const composer = page.getByTestId("concierge-composer");
  const composerBefore = await composer.boundingBox();
  await page.getByRole("button", { name: "Send" }).click();
  const loadingBubble = page.getByTestId("assistant-loading-bubble");
  await expect(loadingBubble).toBeVisible();
  const loadingBox = await loadingBubble.boundingBox();
  const composerDuring = await composer.boundingBox();
  expect(loadingBox).toBeTruthy();
  expect(composerBefore).toBeTruthy();
  expect(composerDuring).toBeTruthy();
  expect(loadingBox!.x).toBeLessThan(composerDuring!.x + composerDuring!.width / 2);
  expect(composerDuring!.y).toBeCloseTo(composerBefore!.y, 0);
  await expect(loadingBubble.locator("span")).toHaveCount(5);
  finishRequest();
  await expect(page.getByText("Fake answer")).toBeVisible();
  await expect(loadingBubble).toHaveCount(0);
});

test("missing OpenAI configuration shows unavailable state and blocks Send", async ({ page }) => {
  let sendCount = 0;
  await page.route("**/assistant/status", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: {
      enabled: false,
      availability: "temporarily_unavailable",
    } }),
  }));
  await page.route("**/assistant/messages", async (route) => {
    sendCount += 1;
    await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
  });
  await openAsAuthenticatedUser(page);
  await page.getByRole("button", { name: "Open Drivewise Assistant" }).click();
  await expect(page.getByRole("status").filter({ hasText: /OpenAI provider configuration is not ready/i })).toBeVisible();
  const input = page.getByLabel("Travel question");
  await input.fill("Suggest a weekend itinerary");
  await expect(page.getByRole("button", { name: "Send" })).toBeDisabled();
  expect(sendCount).toBe(0);
});

test("records locally, asks consent before upload, edits the transcript, and never auto-sends it", async ({ page }) => {
  let transcriptionRequests = 0;
  let assistantRequests = 0;
  await installFakeAssistantApi(page, async () => {
    assistantRequests += 1;
    return { status: 200, body: { data: { reply: { text: "Fake spoken answer", language: "en-US", is_demo: false } } } };
  });
  await page.route("**/assistant/transcriptions", async (route) => {
    transcriptionRequests += 1;
    expect(route.request().headers()["content-type"]).toContain("audio/webm");
    expect(route.request().postDataBuffer()?.toString()).toContain("fake voice question");
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { text: "Find a museum" } }) });
  });
  await installFakeRecorder(page);
  await openAsAuthenticatedUser(page);
  await page.getByRole("button", { name: "Open Drivewise Assistant" }).click();
  const input = page.getByLabel("Travel question");
  await input.fill("Existing typed text");
  await page.getByRole("button", { name: "Record question" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Recording on this device/ })).toBeVisible();
  await page.getByRole("button", { name: "Stop recording" }).click();
  const consent = page.getByRole("group");
  await expect(consent).toBeVisible();
  await expect(consent).toContainText(/audio recording will be sent to OpenAI/i);
  await expect(consent).toContainText(/may incur company charges/i);
  expect(transcriptionRequests).toBe(0);
  await expect(input).toHaveValue("Existing typed text");
  await page.getByRole("button", { name: "Allow and transcribe" }).click();
  await expect(input).toHaveValue("Existing typed text Find a museum");
  expect(transcriptionRequests).toBe(1);
  expect(assistantRequests).toBe(0);
  await input.fill("Edited transcript");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Fake spoken answer")).toBeVisible();
  expect(assistantRequests).toBe(1);
});

test("declining transcription consent sends no recording and preserves typed input", async ({ page }) => {
  let transcriptionRequests = 0;
  await installFakeAssistantApi(page, async () => ({ status: 200, body: { data: { reply: { text: "Typed answer", language: "en-US", is_demo: false } } } }));
  await page.route("**/assistant/transcriptions", async (route) => {
    transcriptionRequests += 1;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { text: "Should not arrive" } }) });
  });
  await installFakeRecorder(page);
  await openAsAuthenticatedUser(page);
  await page.getByRole("button", { name: "Open Drivewise Assistant" }).click();
  const input = page.getByLabel("Travel question");
  await input.fill("Typed fallback");
  await page.getByRole("button", { name: "Record question" }).click();
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.getByRole("group")).toBeVisible();
  await page.getByRole("button", { name: "No, discard" }).click();
  expect(transcriptionRequests).toBe(0);
  await expect(input).toHaveValue("Typed fallback");
  await expect(page.getByRole("button", { name: "Send" })).toBeEnabled();
});

test("microphone denial and transcription failure keep typed questions available", async ({ page }) => {
  let transcriptionRequests = 0;
  await installFakeAssistantApi(page, async () => ({ status: 200, body: { data: { reply: { text: "Typed answer", language: "en-US", is_demo: false } } } }));
  await page.route("**/assistant/transcriptions", async (route) => {
    transcriptionRequests += 1;
    await route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: { code: "transcription_unavailable", message: "Speech transcription is temporarily unavailable" } }) });
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: async () => { throw new DOMException("Permission denied", "NotAllowedError"); } },
    });
  });
  await openAsAuthenticatedUser(page);
  await page.getByRole("button", { name: "Open Drivewise Assistant" }).click();
  const input = page.getByLabel("Travel question");
  await page.getByRole("button", { name: "Record question" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /Microphone permission was denied/i })).toBeVisible();
  await input.fill("Typed after permission denial");
  await expect(page.getByRole("button", { name: "Send" })).toBeEnabled();
  await page.evaluate(() => {
    const stream = { getTracks: () => [{ stop() {} }] };
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: async () => stream } });
    class FakeMediaRecorder {
      static isTypeSupported = () => true;
      state = "inactive";
      mimeType = "audio/webm;codecs=opus";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(_stream: unknown, options?: { mimeType?: string }) { this.mimeType = options?.mimeType ?? this.mimeType; }
      start() { this.state = "recording"; }
      stop() { this.state = "inactive"; this.ondataavailable?.({ data: new Blob(["fake"], { type: "audio/webm" }) }); this.onstop?.(); }
    }
    Object.defineProperty(window, "MediaRecorder", { configurable: true, value: FakeMediaRecorder });
  });
  await page.getByRole("button", { name: "Record question" }).click();
  await page.getByRole("button", { name: "Stop recording" }).click();
  await page.getByRole("button", { name: "Allow and transcribe" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /Transcription failed/i })).toBeVisible();
  expect(transcriptionRequests).toBe(1);
  await expect(input).toHaveValue("Typed after permission denial");
  await expect(page.getByRole("button", { name: "Send" })).toBeEnabled();
});

test("read aloud selects local voices matching each response language and can be stopped", async ({ page }) => {
  let answerNumber = 0;
  let speechRequests = 0;
  await installFakeAssistantApi(page, async () => {
    answerNumber += 1;
    return { status: 200, body: { data: { reply: {
      text: answerNumber === 1 ? "Răspuns în limba română" : "Answer in English",
      language: answerNumber === 1 ? "ro-RO" : "en-US",
      is_demo: false,
    } } } };
  });
  await page.route("**/assistant/speech", async (route) => {
    speechRequests += 1;
    await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
  });
  await page.addInitScript(() => {
    class FakeUtterance {
      text: string;
      lang = "";
      voice: unknown = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) { this.text = text; }
    }
    const voices = [
      { localService: true, lang: "en-US", name: "Local English" },
      { localService: true, lang: "ro-RO", name: "Local Romanian" },
    ];
    const fakeSynthesis = {
      cancelCount: 0,
      spoken: [] as FakeUtterance[],
      getVoices: () => voices,
      addEventListener() {},
      removeEventListener() {},
      cancel() { this.cancelCount += 1; },
      speak(utterance: FakeUtterance) { this.spoken.push(utterance); },
    };
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: FakeUtterance });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: fakeSynthesis });
    Object.defineProperty(window, "fakeSynthesis", { configurable: true, value: fakeSynthesis });
  });
  await openAsAuthenticatedUser(page);
  await page.getByRole("button", { name: "Open Drivewise Assistant" }).click();
  const input = page.getByLabel("Travel question");
  const playButton = page.getByRole("button", { name: "Read latest answer aloud" });
  await input.fill("Întrebare în română");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Răspuns în limba română")).toBeVisible();
  await playButton.click();
  await expect(page.getByRole("button", { name: "Stop audio" })).toBeVisible();
  const firstUtterance = await page.evaluate(() => (window as unknown as { fakeSynthesis: { spoken: Array<{ lang: string; voice: { lang: string } }> } }).fakeSynthesis.spoken[0]);
  expect(firstUtterance.lang).toBe("ro-RO");
  expect(firstUtterance.voice.lang).toBe("ro-RO");

  await input.fill("English question");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Answer in English")).toBeVisible();
  await playButton.click();
  const spoken = await page.evaluate(() => (window as unknown as { fakeSynthesis: { spoken: Array<{ lang: string; voice: { lang: string } }> } }).fakeSynthesis.spoken);
  expect(spoken).toHaveLength(2);
  expect(spoken[1].lang).toBe("en-US");
  expect(spoken[1].voice.lang).toBe("en-US");
  expect(speechRequests).toBe(0);
  await page.getByRole("button", { name: "Stop audio" }).click();
  await expect(page.getByRole("button", { name: "Read latest answer aloud" })).toBeVisible();
});

test("waits for asynchronously loaded local voices before playback", async ({ page }) => {
  await installFakeAssistantApi(page, async () => ({ status: 200, body: { data: { reply: { text: "Răspuns românesc", language: "ro-RO", is_demo: false } } } }));
  await page.addInitScript(() => {
    class FakeUtterance {
      lang = "";
      voice: unknown = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {}
    }
    let voices: Array<{ localService: boolean; lang: string }> = [];
    let listener: (() => void) | undefined;
    const fakeSynthesis = {
      spoken: [] as FakeUtterance[],
      getVoices: () => voices,
      addEventListener(_event: string, callback: () => void) { listener = callback; },
      removeEventListener() { listener = undefined; },
      cancel() {},
      speak(utterance: FakeUtterance) { this.spoken.push(utterance); },
      loadRomanianVoice() { voices = [{ localService: true, lang: "ro-RO" }]; listener?.(); },
    };
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: FakeUtterance });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: fakeSynthesis });
    Object.defineProperty(window, "fakeSynthesis", { configurable: true, value: fakeSynthesis });
  });
  await openAsAuthenticatedUser(page);
  await page.getByRole("button", { name: "Open Drivewise Assistant" }).click();
  await page.getByLabel("Travel question").fill("O întrebare în română");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Răspuns românesc")).toBeVisible();
  await page.getByRole("button", { name: "Read latest answer aloud" }).click();
  await page.evaluate(() => (window as unknown as { fakeSynthesis: { loadRomanianVoice(): void } }).fakeSynthesis.loadRomanianVoice());
  await expect(page.getByRole("button", { name: "Stop audio" })).toBeVisible();
  const utterance = await page.evaluate(() => (window as unknown as { fakeSynthesis: { spoken: Array<{ lang: string; voice: { lang: string } }> } }).fakeSynthesis.spoken[0]);
  expect(utterance.lang).toBe("ro-RO");
  expect(utterance.voice.lang).toBe("ro-RO");
});

test("uses the backend TTS fake in the response language when no local matching voice exists and can stop", async ({ page }) => {
  let speechRequest: unknown;
  await installFakeAssistantApi(page, async () => ({ status: 200, body: { data: { reply: { text: "Răspuns fără voce potrivită", language: "ro-RO", is_demo: false } } } }));
  await page.route("**/assistant/speech", async (route) => {
    speechRequest = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "audio/mpeg", body: "fake-mp3-audio" });
  });
  await page.addInitScript(() => {
    class FakeUtterance { constructor(public text: string) {} }
    const fakeSynthesis = {
      getVoices: () => [{ localService: true, lang: "en-US" }, { localService: false, lang: "ro-RO" }],
      addEventListener() {},
      removeEventListener() {},
      cancel() {},
      speak() { throw new Error("A non-matching voice must not be used"); },
    };
    class FakeAudio {
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      pauseCount = 0;
      constructor(public src: string) {}
      async play() { (window as unknown as { fakeAudio: FakeAudio }).fakeAudio = this; }
      pause() { this.pauseCount += 1; }
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: FakeUtterance });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: fakeSynthesis });
    Object.defineProperty(window, "Audio", { configurable: true, value: FakeAudio });
  });
  await openAsAuthenticatedUser(page);
  await page.getByRole("button", { name: "Open Drivewise Assistant" }).click();
  await page.getByLabel("Travel question").fill("Întrebare");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Răspuns fără voce potrivită")).toBeVisible();
  expect(speechRequest).toBeUndefined();
  await page.getByRole("button", { name: "Read latest answer aloud" }).click();
  await expect(page.getByRole("button", { name: "Stop audio" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "AI-generated voice (not a human voice)" })).toBeVisible();
  expect(speechRequest).toEqual({ text: "Răspuns fără voce potrivită", language: "ro-RO" });
  await page.getByRole("button", { name: "Stop audio" }).click();
  const pauseCount = await page.evaluate(() => (window as unknown as { fakeAudio: { pauseCount: number } }).fakeAudio.pauseCount);
  expect(pauseCount).toBe(1);
  await expect(page.getByRole("button", { name: "Read latest answer aloud" })).toBeVisible();
  await expect(page.getByText("Răspuns fără voce potrivită")).toBeVisible();
});

test("reports unavailable when neither a local voice nor backend TTS supports the answer language", async ({ page }) => {
  await installFakeAssistantApi(page, async () => ({ status: 200, body: { data: { reply: { text: "Unsupported language response", language: "xx-XX", is_demo: false } } } }));
  await page.addInitScript(() => {
    class FakeUtterance { constructor(public text: string) {} }
    const fakeSynthesis = { getVoices: () => [], addEventListener() {}, removeEventListener() {}, cancel() {}, speak() {} };
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: FakeUtterance });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: fakeSynthesis });
  });
  await openAsAuthenticatedUser(page);
  await page.getByRole("button", { name: "Open Drivewise Assistant" }).click();
  await page.getByLabel("Travel question").fill("Test question");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Unsupported language response")).toBeVisible();
  await page.getByRole("button", { name: "Read latest answer aloud" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /No voice supports this answer language/i })).toBeVisible();
  await expect(page.getByText("Unsupported language response")).toBeVisible();
});

test("keeps the composer fixed and scrolls long conversations to the latest response, including after reopen", async ({ page }) => {
  let replyNumber = 0;
  await installFakeAssistantApi(page, async () => {
    replyNumber += 1;
    const text = `Long answer ${replyNumber} begins. ${"Travel details and approximate itinerary information. ".repeat(70)} Latest answer ${replyNumber} ends.`;
    return { status: 200, body: { data: { reply: { text, language: "en-US", is_demo: false } } } };
  });
  await openAsAuthenticatedUser(page);
  const pageScrollBefore = await page.evaluate(() => window.scrollY);
  await page.getByRole("button", { name: "Open Drivewise Assistant" }).click();
  const panel = page.getByRole("dialog", { name: "Drivewise Assistant" });
  const messages = page.getByTestId("concierge-messages");
  const composer = page.getByTestId("concierge-composer");
  const panelBox = await panel.boundingBox();
  const composerBox = await composer.boundingBox();
  expect(panelBox).toBeTruthy();
  expect(composerBox).toBeTruthy();

  for (let index = 1; index <= 6; index += 1) {
    await page.getByLabel("Travel question").fill(`Question ${index}`);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(`Latest answer ${index} ends.`)).toBeVisible();
  }

  const scrollState = await messages.evaluate((element) => ({
    scrollTop: element.scrollTop,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
  }));
  expect(scrollState.scrollHeight).toBeGreaterThan(scrollState.clientHeight);
  expect(scrollState.scrollTop + scrollState.clientHeight).toBeGreaterThanOrEqual(scrollState.scrollHeight - 2);
  await expect(page.getByText("Latest answer 6 ends.")).toBeInViewport();
  const latestComposerBox = await composer.boundingBox();
  expect(latestComposerBox!.y).toBeCloseTo(composerBox!.y, 0);
  expect(Math.abs(latestComposerBox!.y + latestComposerBox!.height - (panelBox!.y + panelBox!.height - 8))).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => window.scrollY)).toBe(pageScrollBefore);

  await page.getByRole("button", { name: "Close chat" }).click();
  await page.getByRole("button", { name: "Open Drivewise Assistant" }).click();
  await expect(page.getByText("Latest answer 6 ends.")).toBeInViewport();
  const reopenedScrollState = await messages.evaluate((element) => ({ scrollTop: element.scrollTop, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight }));
  expect(reopenedScrollState.scrollTop + reopenedScrollState.clientHeight).toBeGreaterThanOrEqual(reopenedScrollState.scrollHeight - 2);
});


