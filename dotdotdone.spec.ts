import { test, expect, Page } from "@playwright/test";

const URL = "https://hypnosh.github.io/DotDotDone/";

// ── helpers ───────────────────────────────────────────────────────────────────
async function goto(page: Page) {
  await page.goto(URL);
  await page.waitForLoadState("networkidle");
}

// Exact selectors from source
const SEL = {
  // input: placeholder="What are we focusing on?"
  labelInput: 'input[placeholder="What are we focusing on?"]',

  // Duration pills: "15m", "25m", "45m", "60m"
  dur15: 'button:has-text("15m")',
  dur25: 'button:has-text("25m")',
  dur45: 'button:has-text("45m")',
  dur60: 'button:has-text("60m")',

  // Primary action button (text changes by status)
  startBtn:      'button:has-text("Start Session")',
  pauseBtn:      'button:has-text("Pause")',
  resumeBtn:     'button:has-text("Resume")',
  endSessionBtn: 'button:has-text("End session")',  // mid-session early-end
  endAndLogBtn:  'button:has-text("End & Log")',    // post-timer
  continueBtn:   'button:has-text("Continue")',

  // History
  exportBtn:     'button:has-text("Export CSV")',
  historyList:   '#history-list',

  // Edit/delete (dropdown)
  entryMenu:     '[aria-label="Entry actions"]',

  // Timer display (MM:SS big text)
  timerDisplay:  '.tabular-nums',
};

// ── 1. PAGE LOAD ──────────────────────────────────────────────────────────────
test.describe("Page load", () => {
  test("loads without JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await goto(page);
    expect(errors).toHaveLength(0);
  });

  test("title is DotDotDone", async ({ page }) => {
    await goto(page);
    await expect(page).toHaveTitle(/DotDotDone/i);
  });

  test("timer shows 25:00 on load (default duration)", async ({ page }) => {
    await goto(page);
    // Big timer display — first .tabular-nums is the clock
    const timer = page.locator(SEL.timerDisplay).first();
    await expect(timer).toBeVisible();
    await expect(timer).toHaveText("25:00");
  });

  test("label input visible and editable", async ({ page }) => {
    await goto(page);
    await expect(page.locator(SEL.labelInput)).toBeVisible();
  });

  test("all four duration pills visible", async ({ page }) => {
    await goto(page);
    for (const sel of [SEL.dur15, SEL.dur25, SEL.dur45, SEL.dur60]) {
      await expect(page.locator(sel)).toBeVisible();
    }
  });
});

// ── 2. DURATION PICKER ────────────────────────────────────────────────────────
test.describe("Duration picker", () => {
  test("selecting 15m updates timer to 15:00", async ({ page }) => {
    await goto(page);
    await page.locator(SEL.dur15).click();
    await expect(page.locator(SEL.timerDisplay).first()).toHaveText("15:00");
  });

  test("selecting 60m updates timer to 60:00", async ({ page }) => {
    await goto(page);
    await page.locator(SEL.dur60).click();
    await expect(page.locator(SEL.timerDisplay).first()).toHaveText("60:00");
  });

  test("duration pills hidden while running", async ({ page }) => {
    await goto(page);
    await page.locator(SEL.startBtn).click();
    await expect(page.locator(SEL.dur25)).not.toBeVisible();
  });
});

// ── 3. LABEL INPUT ────────────────────────────────────────────────────────────
test.describe("Label input", () => {
  test("accepts text", async ({ page }) => {
    await goto(page);
    await page.locator(SEL.labelInput).fill("Poker study");
    await expect(page.locator(SEL.labelInput)).toHaveValue("Poker study");
  });

  test("disabled while running", async ({ page }) => {
    await goto(page);
    await page.locator(SEL.startBtn).click();
    await expect(page.locator(SEL.labelInput)).toBeDisabled();
  });
});

// ── 4. TIMER CONTROLS ─────────────────────────────────────────────────────────
test.describe("Timer controls", () => {
  test("Start Session button visible on idle", async ({ page }) => {
    await goto(page);
    await expect(page.locator(SEL.startBtn)).toBeVisible();
  });

  test("clicking Start Session starts countdown", async ({ page }) => {
    await goto(page);
    const before = await page.locator(SEL.timerDisplay).first().textContent();
    await page.locator(SEL.startBtn).click();
    await page.waitForTimeout(2200);
    const after = await page.locator(SEL.timerDisplay).first().textContent();
    expect(before).not.toBe(after);
  });

  test("Pause freezes timer", async ({ page }) => {
    await goto(page);
    await page.locator(SEL.startBtn).click();
    await page.waitForTimeout(1500);
    await page.locator(SEL.pauseBtn).click();
    const v1 = await page.locator(SEL.timerDisplay).first().textContent();
    await page.waitForTimeout(2000);
    const v2 = await page.locator(SEL.timerDisplay).first().textContent();
    expect(v1).toBe(v2);
  });

  test("Resume restarts countdown after pause", async ({ page }) => {
    await goto(page);
    await page.locator(SEL.startBtn).click();
    await page.waitForTimeout(1000);
    await page.locator(SEL.pauseBtn).click();
    await expect(page.locator(SEL.resumeBtn)).toBeVisible();
    const v1 = await page.locator(SEL.timerDisplay).first().textContent();
    await page.locator(SEL.resumeBtn).click();
    await page.waitForTimeout(2000);
    const v2 = await page.locator(SEL.timerDisplay).first().textContent();
    expect(v1).not.toBe(v2);
  });

  test("End session mid-run logs session and returns to idle", async ({ page }) => {
    await goto(page);
    await page.locator(SEL.labelInput).fill("Mid-run end test");
    await page.locator(SEL.startBtn).click();
    await page.waitForTimeout(1500);
    await page.locator(SEL.endSessionBtn).click();
    await page.waitForTimeout(500);
    // Should be back to idle — Start Session visible
    await expect(page.locator(SEL.startBtn)).toBeVisible();
    // Session logged in history
    await expect(page.locator('text="Mid-run end test"')).toBeVisible({ timeout: 3000 });
  });

  test("browser tab title updates when running", async ({ page }) => {
    await goto(page);
    await page.locator(SEL.labelInput).fill("Focus block");
    await page.locator(SEL.startBtn).click();
    await page.waitForTimeout(1500);
    const title = await page.title();
    // Should contain MM:SS pattern and label
    expect(title).toMatch(/\d{2}:\d{2}/);
    expect(title).toContain("Focus block");
  });

  test("tab title shows (P) when paused", async ({ page }) => {
    await goto(page);
    await page.locator(SEL.startBtn).click();
    await page.waitForTimeout(1000);
    await page.locator(SEL.pauseBtn).click();
    const title = await page.title();
    expect(title).toMatch(/^\(P\)/);
  });
});

// ── 5. SESSION HISTORY ────────────────────────────────────────────────────────
test.describe("Session history", () => {
  test("ended session appears in history list", async ({ page }) => {
    await goto(page);
    await page.locator(SEL.labelInput).fill("History entry");
    await page.locator(SEL.startBtn).click();
    await page.waitForTimeout(1500);
    await page.locator(SEL.endSessionBtn).click();
    await expect(page.locator('text="History entry"')).toBeVisible({ timeout: 3000 });
  });

  test("history persists on reload (localStorage)", async ({ page }) => {
    await goto(page);
    await page.locator(SEL.labelInput).fill("Persist check");
    await page.locator(SEL.startBtn).click();
    await page.waitForTimeout(1500);
    await page.locator(SEL.endSessionBtn).click();
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator('text="Persist check"')).toBeVisible({ timeout: 3000 });
  });

  test("entry has edit and delete options in dropdown", async ({ page }) => {
    await goto(page);
    await page.locator(SEL.labelInput).fill("Editable entry");
    await page.locator(SEL.startBtn).click();
    await page.waitForTimeout(1000);
    await page.locator(SEL.endSessionBtn).click();
    await page.waitForTimeout(500);
    await page.locator(SEL.entryMenu).first().click();
    await expect(page.locator('text="Edit"')).toBeVisible();
    await expect(page.locator('text="Delete"')).toBeVisible();
  });

  test("edit dialog updates entry label", async ({ page }) => {
    await goto(page);
    await page.locator(SEL.labelInput).fill("Old label");
    await page.locator(SEL.startBtn).click();
    await page.waitForTimeout(1000);
    await page.locator(SEL.endSessionBtn).click();
    await page.waitForTimeout(500);
    await page.locator(SEL.entryMenu).first().click();
    await page.locator('text="Edit"').click();
    const editInput = page.locator('input[placeholder="Untitled session"]');
    await editInput.clear();
    await editInput.fill("New label");
    await page.locator('button:has-text("Save")').click();
    await expect(page.locator('text="New label"')).toBeVisible({ timeout: 3000 });
  });

  test("delete confirmation removes entry", async ({ page }) => {
    await goto(page);
    await page.locator(SEL.labelInput).fill("Delete me");
    await page.locator(SEL.startBtn).click();
    await page.waitForTimeout(1000);
    await page.locator(SEL.endSessionBtn).click();
    await page.waitForTimeout(500);
    await page.locator(SEL.entryMenu).first().click();
    await page.locator('text="Delete"').click();
    // Alert dialog — confirm
    await page.locator('button:has-text("Delete")').last().click();
    await expect(page.locator('text="Delete me"')).not.toBeVisible({ timeout: 3000 });
  });
});

// ── 6. CSV EXPORT ─────────────────────────────────────────────────────────────
test.describe("CSV export", () => {
  test("Export CSV button triggers download after session logged", async ({ page }) => {
    await goto(page);
    // Log a session first (export button only appears when sessions > 0)
    await page.locator(SEL.labelInput).fill("Export test");
    await page.locator(SEL.startBtn).click();
    await page.waitForTimeout(1000);
    await page.locator(SEL.endSessionBtn).click();
    await page.waitForTimeout(500);

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 5000 }),
      page.locator(SEL.exportBtn).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  });

  test("Export CSV hidden when no sessions", async ({ page }) => {
    // Clear storage before test
    await goto(page);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator(SEL.exportBtn)).not.toBeVisible();
  });
});

// ── 7. CALENDAR HISTORY FILTER ────────────────────────────────────────────────
test.describe("Calendar filter", () => {
  test("calendar renders after session logged", async ({ page }) => {
    await goto(page);
    await page.locator(SEL.labelInput).fill("Calendar test");
    await page.locator(SEL.startBtn).click();
    await page.waitForTimeout(1000);
    await page.locator(SEL.endSessionBtn).click();
    await page.waitForTimeout(500);
    // Calendar is a shadcn Calendar component
    await expect(page.locator('.rdp, [role="grid"]')).toBeVisible({ timeout: 3000 });
  });
});

// ── 8. NOTIFICATIONS ──────────────────────────────────────────────────────────
test.describe("Notifications", () => {
  test("'Enable notifications' hint visible by default (permission not granted)", async ({ page }) => {
    await goto(page);
    // Default: permission is 'default', so hint should appear
    // It's conditionally rendered when permissionState !== 'granted' && !== 'unsupported'
    // In test browser, Notification.permission = 'default' so hint is shown
    const hint = page.locator('button:has-text("Enable notifications")');
    // Only assert visible if Notification API is available in test browser
    const hasNotif = await page.evaluate(() => "Notification" in window);
    if (hasNotif) {
      await expect(hint).toBeVisible();
    }
  });

  test("notification hint hidden after permission granted", async ({ browser }) => {
    const ctx = await browser.newContext({ permissions: ["notifications"] });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForLoadState("networkidle");
    await expect(page.locator('button:has-text("Enable notifications")')).not.toBeVisible();
    await ctx.close();
  });
});

// ── 9. MOBILE VIEWPORT ────────────────────────────────────────────────────────
test.describe("Mobile responsiveness", () => {
  test("timer and start button visible on 375px width", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await goto(page);
    await expect(page.locator(SEL.timerDisplay).first()).toBeVisible();
    await expect(page.locator(SEL.startBtn)).toBeVisible();
  });

  test("no horizontal overflow on 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await goto(page);
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(375);
  });
});

// ── 10. "WHY I BUILT THIS" MODAL ──────────────────────────────────────────────
test.describe("Why modal", () => {
  test("opens and closes", async ({ page }) => {
    await goto(page);
    await page.locator('button:has-text("Why I Built This")').click();
    await expect(page.locator('h3:has-text("Why I Built This")')).toBeVisible();
    await page.locator('button:has-text("Close")').click();
    await expect(page.locator('h3:has-text("Why I Built This")')).not.toBeVisible();
  });
});
