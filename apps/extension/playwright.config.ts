import { defineConfig } from "@playwright/test";

// PROJECT_SPEC.md §5 / Prompt 12 step 5 — loads the *built* extension
// against saved ATS application-form fixtures and asserts the fill engine
// behaves correctly in a real Chromium, not just under jsdom.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  timeout: 30_000,
});
