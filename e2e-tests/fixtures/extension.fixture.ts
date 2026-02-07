import {
  test as base,
  chromium,
  type BrowserContext,
  type Page,
  type Worker,
} from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

interface BrowserAPI {
  runtime: {
    sendMessage: (message: { action: string }, callback: (result: unknown) => void) => void;
    lastError?: { message: string };
  };
}

interface GlobalWithBrowser {
  chrome?: BrowserAPI;
  browser?: BrowserAPI;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const extensionPath = path.resolve(__dirname, "../../build/chrome");

export type ExtensionFixtures = {
  context: BrowserContext;
  extensionId: string;
  backgroundWorker: Worker;
  sidebarPage: Page;
};

/**
 * Custom test fixture that loads the Chrome extension and provides access
 * to the extension context and sidebar page.
 *
 * The extension is loaded via --load-extension and the service worker is
 * ensured to be active before tests run.
 */
export const test = base.extend<ExtensionFixtures>({
  // Override context to use persistent context with extension loaded
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        // Use new headless mode (supports extensions) unless headed/debug requested
        ...(process.env.HEADED || process.env.PWDEBUG ? [] : ["--headless=new"]),
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        "--no-first-run",
        "--disable-default-apps",
        "--disable-component-extensions-with-background-pages",
      ],
    });
    await use(context);
    await context.close();
  },

  // Get extension ID and ensure service worker is active
  extensionId: async ({ context }, use) => {
    // Wait for the service worker to be registered
    let serviceWorker = context.serviceWorkers()[0];
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent("serviceworker");
    }

    // Extract extension ID from service worker URL
    // URL format: chrome-extension://<extensionId>/background.service-worker.js
    const extensionId = serviceWorker.url().split("/")[2];
    await use(extensionId);
  },

  // Expose the background service worker for direct interaction
  backgroundWorker: async ({ context }, use) => {
    let serviceWorker = context.serviceWorkers()[0];
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent("serviceworker");
    }
    await use(serviceWorker);
  },

  // Navigate to sidebar page within extension context
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sidebarPage: async ({ context, extensionId, backgroundWorker }, use) => {
    const sidebarUrl = `chrome-extension://${extensionId}/sidebar/sidebar.html`;
    const page = await context.newPage();

    // Navigate to sidebar
    await page.goto(sidebarUrl);

    // Wait for the app container
    await page.waitForSelector("#app", { state: "attached" });

    // CRITICAL: Wait for the extension messaging to be ready
    // We do this by checking if chrome.runtime is available and
    // then attempting a getSessions call to verify the background script responds
    const isExtensionReady = await page.evaluate(async () => {
      // Check if we have extension APIs
      const api =
        (globalThis as GlobalWithBrowser).chrome || (globalThis as GlobalWithBrowser).browser;
      if (!api || !api.runtime || !api.runtime.sendMessage) {
        console.error("Extension APIs not available");
        return false;
      }

      // Try to communicate with background script
      try {
        const response = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Timeout")), 5000);
          api.runtime.sendMessage({ action: "getSessions" }, (result: unknown) => {
            clearTimeout(timeout);
            if (api.runtime.lastError) {
              reject(new Error(api.runtime.lastError.message));
            } else {
              resolve(result);
            }
          });
        });
        console.log("Extension ready, got response:", response);
        return true;
      } catch (err) {
        console.error("Failed to communicate with background:", err);
        return false;
      }
    });

    if (!isExtensionReady) {
      throw new Error("Extension failed to initialize - background script not responding");
    }

    // Wait for the sidebar to actually render content
    await page.waitForFunction(
      () => {
        const app = document.getElementById("app");
        return app && app.innerHTML.trim().length > 0;
      },
      { timeout: 10000 }
    );

    // Small wait for UI to settle
    await page.waitForTimeout(200);

    await use(page);
    await page.close();
  },
});

export { expect } from "@playwright/test";
