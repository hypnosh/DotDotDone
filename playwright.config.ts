import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "dotdotdone.spec.ts",
  timeout: 30_000,
  retries: 1,
  workers: 2,

  use: {
    baseURL: "https://dotdotdone.recaptured.in/",
    headless: true,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Clear localStorage between tests so sessions don't bleed across
    storageState: undefined,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
});
