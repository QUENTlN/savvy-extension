import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const extensionPath = path.resolve(__dirname, "../build/chrome");

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  fullyParallel: false, // Extensions require sequential execution per context
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Extensions don't work well with parallel workers
  reporter: [["html", { open: "never", outputFolder: "./playwright-report" }], ["list"]],
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-extension",
      use: {
        ...devices["Desktop Chrome"],
        // Extension testing requires persistent context, configured in fixtures
      },
    },
  ],
});

export { extensionPath };
