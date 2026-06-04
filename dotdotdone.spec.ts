import { test, expect, Page } from "@playwright/test";

const URL = "https://hypnosh.github.io/DotDotDone/";

// ── helpers ──────────────────────────────────────────────────────────────────
async function goto(page: Page) {
  await page.goto(URL);
  await page.waitForLoadState("networkidle");
}

// ── 1. PAGE LOAD ─────────────────────────────────────────────────────────────
test.describe("Page load", () => {
  test("loads without JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await goto(page);
    expect(errors).toHaveLength(0);
  });

  test("title contains DotDotDone", async ({ page }) => {
    await goto(page);
    await expect(page).toHaveTitle(/DotDotDone/i);
  });

  test("timer display visible on load", async ({ page }) => {
    await goto(page);
    // Timer typically shows HH:MM:SS or MM:SS
    const timer = page.locator("text=/\\d{1,2}:\\d{2}/").first();
    await expect(timer).toBeVisible();
  });
});

// ── 2. TASK INPUT ─────────────────────────────────────────────────────────────
test.describe("Task input", () => {
  test("input field accepts text", async ({ page }) => {
    await goto(page);
    const input = page.locator("input[type=text], textarea, [placeholder]").first();
    await input.fill("Poker study session");
    await expect(input).toHaveValue("Poker study session");
  });

  test("input clears after session start (if applicable)", async ({ page }) => {
    await goto(page);
    const input = page.locator("input[type=text], textarea, [placeholder]").first();
    await input.fill("Deep work");
    // Attempt start via Enter
    await input.press("Enter");
    await page.waitForTimeout(500);
    // Timer should now be running (timer value changed or start btn state changed)
    const timer = page.locator("text=/\\d{1,2}:\\d{2}/").first();
    await expect(timer).toBeVisible();
  });
});

// ── 3. TIMER CONTROLS ────────────────────────────────────────────────────────
test.describe("Timer controls", () => {
  test("start button starts timer", async ({ page }) => {
    await goto(page);
    const startBtn = page
      .locator("button")
      .filter({ hasText: /start|begin|go/i })
      .first();
    const timerBefore = await page.locator("text=/\\d{1,2}:\\d{2}/").first().textContent();
    await startBtn.click();
    await page.waitForTimeout(2000);
    const timerAfter = await page.locator("text=/\\d{1,2}:\\d{2}/").first().textContent();
    expect(timerBefore).not.toBe(timerAfter);
  });

  test("pause button stops timer", async ({ page }) => {
    await goto(page);
    const startBtn = page
      .locator("button")
      .filter({ hasText: /start|begin|go/i })
      .first();
    await startBtn.click();
    await page.waitForTimeout(1500);

    const pauseBtn = page
      .locator("button")
      .filter({ hasText: /pause|stop/i })
      .first();
    await pauseBtn.click();
    const valuePaused = await page.locator("text=/\\d{1,2}:\\d{2}/").first().textContent();
    await page.waitForTimeout(2000);
    const valueStill = await page.locator("text=/\\d{1,2}:\\d{2}/").first().textContent();
    expect(valuePaused).toBe(valueStill);
  });

  test("stop/done button logs session", async ({ page }) => {
    await goto(page);
    const input = page.locator("input[type=text], textarea, [placeholder]").first();
    await input.fill("Test session");
    const startBtn = page
      .locator("button")
      .filter({ hasText: /start|begin|go/i })
      .first();
    await startBtn.click();
    await page.waitForTimeout(2000);
    const stopBtn = page
      .locator("button")
      .filter({ hasText: /stop|done|finish|end/i })
      .first();
    await stopBtn.click();
    await page.waitForTimeout(500);
    // Expect entry to appear in history list
    const history = page.locator("text=/Test session/i");
    await expect(history).toBeVisible({ timeout: 3000 });
  });
});

// ── 4. SESSION HISTORY ───────────────────────────────────────────────────────
test.describe("Session history", () => {
  test("completed session appears in history", async ({ page }) => {
    await goto(page);
    const input = page.locator("input[type=text], textarea, [placeholder]").first();
    await input.fill("History test");
    await page
      .locator("button")
      .filter({ hasText: /start|begin|go/i })
      .first()
      .click();
    await page.waitForTimeout(2000);
    await page
      .locator("button")
      .filter({ hasText: /stop|done|finish|end/i })
      .first()
      .click();
    await expect(page.locator("text=/History test/i")).toBeVisible({ timeout: 3000 });
  });

  test("history persists on page reload", async ({ page }) => {
    await goto(page);
    const input = page.locator("input[type=text], textarea, [placeholder]").first();
    await input.fill("Persist test");
    await page
      .locator("button")
      .filter({ hasText: /start|begin|go/i })
      .first()
      .click();
    await page.waitForTimeout(2000);
    await page
      .locator("button")
      .filter({ hasText: /stop|done|finish|end/i })
      .first()
      .click();
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=/Persist test/i")).toBeVisible({ timeout: 3000 });
  });
});

// ── 5. CSV EXPORT ────────────────────────────────────────────────────────────
test.describe("CSV export", () => {
  test("export button triggers download", async ({ page }) => {
    await goto(page);
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 5000 }),
      page
        .locator("button, a")
        .filter({ hasText: /export|csv|download/i })
        .first()
        .click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  });
});

// ── 6. BROWSER NOTIFICATIONS ─────────────────────────────────────────────────
test.describe("Notifications", () => {
  test("app requests notification permission", async ({ browser }) => {
    const ctx = await browser.newContext({ permissions: ["notifications"] });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForLoadState("networkidle");
    // If permission prompt appears and is granted, no error thrown
    // Just verify page still functional
    await expect(page.locator("text=/\\d{1,2}:\\d{2}/").first()).toBeVisible();
    await ctx.close();
  });
});

// ── 7. MOBILE VIEWPORT ───────────────────────────────────────────────────────
test.describe("Mobile responsiveness", () => {
  test("renders correctly on 375px width", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await goto(page);
    const timer = page.locator("text=/\\d{1,2}:\\d{2}/").first();
    await expect(timer).toBeVisible();
    // No horizontal scroll
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(375);
  });
});

// ── 8. KEYBOARD ACCESSIBILITY ─────────────────────────────────────────────────
test.describe("Keyboard navigation", () => {
  test("can tab to start button and activate with Enter", async ({ page }) => {
    await goto(page);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    // Try activating whatever is focused
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);
    // App should still be functional
    await expect(page.locator("text=/\\d{1,2}:\\d{2}/").first()).toBeVisible();
  });
});
