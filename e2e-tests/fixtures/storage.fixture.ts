import type { Page } from "@playwright/test";

// Types for WebExtension APIs (used in page.evaluate context)
interface RuntimeLastError {
  message: string;
}

interface RuntimeAPI {
  sendMessage: (message: ExtensionMessage, callback: (response: ExtensionResponse) => void) => void;
  lastError?: RuntimeLastError;
}

interface StorageResult {
  sessions?: Session[];
  currentSession?: string | null;
  currency?: string;
  darkMode?: boolean;
  language?: string;
  defaultWeightUnit?: string;
}

interface StorageArea {
  get: (keys: string | string[], callback: (result: StorageResult) => void) => void;
  set: (items: Record<string, unknown>, callback: () => void) => void;
}

interface StorageAPI {
  local: StorageArea;
}

interface BrowserAPI {
  runtime: RuntimeAPI;
  storage: StorageAPI;
}

interface ExtensionMessage {
  action: string;
  sessionId?: string;
  session?: {
    id: string;
    name: string;
    manageQuantity?: boolean;
    importFeesEnabled?: boolean;
    forwardersEnabled?: boolean;
  };
  product?: {
    id: string;
    name: string;
    quantity?: number;
  };
  productId?: string;
  offer?: Offer;
  bundle?: Bundle;
  group?: AlternativeGroup;
  groupId?: string;
  category?: CustomsCategory;
  categoryId?: string;
  defaultVAT?: number;
  forwarder?: Forwarder;
  forwarderId?: string;
  result?: object;
  sessionSnapshot?: string;
  currency?: string;
  updatedSession?: object;
}

interface ExtensionResponse {
  sessions?: { id: string; name: string }[];
  success?: boolean;
  error?: string;
}

interface GlobalWithBrowser {
  chrome?: BrowserAPI;
  browser?: BrowserAPI;
}

export interface Session {
  id: string;
  name: string;
  products: Product[];
  bundles?: Bundle[];
  deliveryRules?: DeliveryRule[];
  alternativeGroups?: AlternativeGroup[];
  customsCategories?: CustomsCategory[];
  forwarders?: Forwarder[];
  forwardersEnabled?: boolean;
  importFeesEnabled?: boolean;
  manageQuantity?: boolean;
  defaultVAT?: number;
}

export interface Product {
  id: string;
  name: string;
  quantity?: number;
  offers: Offer[];
}

export interface Offer {
  id: string;
  url: string;
  seller: string;
  price: number;
  shippingPrice: number;
  insurancePrice?: number;
  currency?: string;
  itemsPerPurchase?: number;
  maxPerPurchase?: number;
}

export interface Bundle {
  id: string;
  name?: string;
  url: string;
  seller: string;
  price: number;
  shippingPrice: number;
  insurancePrice?: number;
  products: { productId: string; quantity: number }[];
  currency?: string;
}

export interface DeliveryRule {
  seller: string;
  billingMethod?: string;
  calculationMethod?: {
    type: string;
    amount?: number;
    rate?: number;
  };
  currency?: string;
  groups?: { name: string; productIds: string[]; calculationMethod?: object }[];
  forwarderChain?: { forwarderId: string; order: number }[];
  customsClearanceFee?: number;
  customsFeeCurrency?: string;
}

export interface AlternativeGroup {
  id: string;
  name: string;
  options: { products: { productId: string; quantity: number }[] }[];
}

export interface CustomsCategory {
  id: string;
  name: string;
  dutyRate: number;
  vatRate: number;
}

export interface Forwarder {
  id: string;
  name: string;
  currency?: string;
  fees?: {
    reception?: { calculationMethod?: { type: string; amount?: number } };
    storage?: { calculationMethod?: { type: string; amount?: number } };
    repackaging?: { calculationMethod?: { type: string; amount?: number } };
    reShipping?: { calculationMethod?: { type: string; amount?: number } };
    consolidationMode?: string;
  };
}

export interface StorageData {
  sessions: Session[];
  currentSession: string | null;
}

export interface Settings {
  currency?: string;
  darkMode?: boolean;
  language?: string;
  defaultWeightUnit?: string;
  defaultVolumeUnit?: string;
  defaultDimensionUnit?: string;
  defaultDistanceUnit?: string;
}

/**
 * Seeds sessions via the background script's messaging API.
 * This ensures the background script's in-memory state is updated.
 */
export async function seedStorage(page: Page, data: Partial<StorageData>): Promise<void> {
  // Use the background script's API to create sessions
  // This ensures the in-memory state is properly synchronized
  await page.evaluate(async (storageData) => {
    const api =
      (globalThis as GlobalWithBrowser).chrome || (globalThis as GlobalWithBrowser).browser;
    if (!api || !api.runtime) {
      throw new Error("Extension runtime API not available");
    }

    // Helper to send message and wait for response
    const sendMessage = (msg: ExtensionMessage): Promise<ExtensionResponse> => {
      return new Promise((resolve, reject) => {
        api.runtime.sendMessage(msg, (response: ExtensionResponse) => {
          if (api.runtime.lastError) {
            reject(new Error(api.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
    };

    // Get current sessions to delete them first
    const current = (await sendMessage({ action: "getSessions" })) as ExtensionResponse;

    // Delete all existing sessions
    for (const session of current.sessions || []) {
      await sendMessage({ action: "deleteSession", sessionId: session.id });
    }

    // Helper to read full session data from storage
    const getSessionsFromStorage = (): Promise<
      Array<{ id: string; name: string; products: Array<{ id: string; name: string }> }>
    > => {
      return new Promise((resolve) => {
        api.storage.local.get(["sessions"], (result: StorageResult) => {
          resolve(
            (result.sessions as Array<{
              id: string;
              name: string;
              products: Array<{ id: string; name: string }>;
            }>) || []
          );
        });
      });
    };

    // Create new sessions from seed data
    if (storageData.sessions) {
      for (const session of storageData.sessions) {
        // Create the session first
        await sendMessage({
          action: "createSession",
          session: {
            id: session.id,
            name: session.name,
            manageQuantity: session.manageQuantity ?? true,
            importFeesEnabled: session.importFeesEnabled ?? false,
            forwardersEnabled: session.forwardersEnabled ?? false,
          },
        });

        // Retrieve the real session ID (background assigns its own IDs via Date.now())
        const sessionsResp = (await sendMessage({
          action: "getSessions",
        })) as ExtensionResponse;
        const realSession = (sessionsResp.sessions || []).find((s) => s.name === session.name);
        const realSessionId = realSession?.id || session.id;

        // Then add products to the session using the REAL session ID
        if (session.products) {
          for (const product of session.products) {
            await sendMessage({
              action: "createProduct",
              sessionId: realSessionId,
              product: {
                id: product.id,
                name: product.name,
                quantity: product.quantity ?? 1,
              },
            });
            // Small delay to prevent Date.now() ID collisions between products
            await new Promise((r) => setTimeout(r, 5));
          }

          // Read full session data from storage to get real product IDs
          const storedSessions = await getSessionsFromStorage();
          const storedSession = storedSessions.find((s) => s.id === realSessionId);

          // Build seed product ID → real product ID mapping (match by name)
          const seedToRealProductId: Record<string, string> = {};
          if (storedSession?.products) {
            for (const seedProduct of session.products) {
              const realProduct = storedSession.products.find((p) => p.name === seedProduct.name);
              if (realProduct) {
                seedToRealProductId[seedProduct.id] = realProduct.id;
              }
            }
          }

          // Add offers using real session and product IDs
          for (const product of session.products) {
            const realProductId = seedToRealProductId[product.id];
            if (!realProductId) continue;

            if (product.offers) {
              for (const offer of product.offers) {
                await sendMessage({
                  action: "createOffer",
                  sessionId: realSessionId,
                  productId: realProductId,
                  offer: offer,
                });
                // Small delay to prevent Date.now() ID collisions between offers
                await new Promise((r) => setTimeout(r, 5));
              }
            }
          }

          // Add bundles with mapped product IDs
          if (session.bundles) {
            for (const bundle of session.bundles) {
              const mappedBundle = {
                ...bundle,
                products: bundle.products.map((p) => ({
                  ...p,
                  productId: seedToRealProductId[p.productId] || p.productId,
                })),
              };
              await sendMessage({
                action: "createBundle",
                sessionId: realSessionId,
                bundle: mappedBundle,
              });
            }
          }

          // Add alternative groups with mapped product IDs
          if (session.alternativeGroups) {
            for (const group of session.alternativeGroups) {
              const mappedGroup = {
                ...group,
                options: group.options.map((opt) => ({
                  products: opt.products.map((p) => ({
                    ...p,
                    productId: seedToRealProductId[p.productId] || p.productId,
                  })),
                })),
              };
              await sendMessage({
                action: "createAlternativeGroup",
                sessionId: realSessionId,
                group: mappedGroup,
              });
            }
          }
        } else {
          // No products — still add bundles, alternative groups if any
          if (session.bundles) {
            for (const bundle of session.bundles) {
              await sendMessage({
                action: "createBundle",
                sessionId: realSessionId,
                bundle: bundle,
              });
            }
          }

          if (session.alternativeGroups) {
            for (const group of session.alternativeGroups) {
              await sendMessage({
                action: "createAlternativeGroup",
                sessionId: realSessionId,
                group: group,
              });
            }
          }
        }

        // Add customs categories
        if (session.customsCategories) {
          for (const category of session.customsCategories) {
            await sendMessage({
              action: "createCustomsCategory",
              sessionId: realSessionId,
              category: category,
            });
          }
        }

        // Set default VAT if specified
        if (session.defaultVAT !== undefined) {
          await sendMessage({
            action: "updateSession",
            sessionId: realSessionId,
            updatedSession: { defaultVAT: session.defaultVAT },
          });
        }

        // Add forwarders
        if (session.forwarders) {
          for (const forwarder of session.forwarders) {
            await sendMessage({
              action: "createForwarder",
              sessionId: realSessionId,
              forwarder: forwarder,
            });
          }
        }

        // Set delivery rules via updateSession (createSession doesn't include them)
        if (session.deliveryRules && session.deliveryRules.length > 0) {
          await sendMessage({
            action: "updateSession",
            sessionId: realSessionId,
            updatedSession: { deliveryRules: session.deliveryRules },
          });
        }
      }
    }

    // Set current session if specified
    if (storageData.currentSession) {
      await sendMessage({
        action: "setCurrentSession",
        sessionId: storageData.currentSession,
      });
    }
  }, data);

  // Reload to ensure UI is in sync
  await page.reload();
  await page.waitForSelector("#app", { state: "attached" });

  // Wait for content to render
  await page.waitForFunction(
    () => {
      const app = document.getElementById("app");
      return app && app.innerHTML.trim().length > 0;
    },
    { timeout: 10000 }
  );

  await page.waitForTimeout(200);
}

/**
 * Clears all sessions via the background script's messaging API.
 */
export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const api =
      (globalThis as GlobalWithBrowser).chrome || (globalThis as GlobalWithBrowser).browser;
    if (!api || !api.runtime) {
      throw new Error("Extension runtime API not available");
    }

    // Helper to send message and wait for response
    const sendMessage = (msg: ExtensionMessage): Promise<ExtensionResponse> => {
      return new Promise((resolve, reject) => {
        api.runtime.sendMessage(msg, (response: ExtensionResponse) => {
          if (api.runtime.lastError) {
            reject(new Error(api.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
    };

    // Get current sessions and delete them all
    const current = (await sendMessage({ action: "getSessions" })) as ExtensionResponse;
    for (const session of current.sessions || []) {
      await sendMessage({ action: "deleteSession", sessionId: session.id });
    }
  });

  // Reload to ensure UI is in sync
  await page.reload();
  await page.waitForSelector("#app", { state: "attached" });

  // Wait for content to render
  await page.waitForFunction(
    () => {
      const app = document.getElementById("app");
      return app && app.innerHTML.trim().length > 0;
    },
    { timeout: 10000 }
  );

  await page.waitForTimeout(200);
}

/**
 * Gets current storage data
 */
export async function getStorage(page: Page): Promise<StorageData> {
  return await page.evaluate(() => {
    return new Promise<StorageData>((resolve, reject) => {
      const api =
        (globalThis as GlobalWithBrowser).chrome || (globalThis as GlobalWithBrowser).browser;
      if (!api || !api.storage) {
        reject(new Error("Extension storage API not available"));
        return;
      }
      api.storage.local.get(["sessions", "currentSession"], (result: StorageResult) => {
        if (api.runtime.lastError) {
          reject(new Error(api.runtime.lastError.message));
        } else {
          resolve({
            sessions: result.sessions || [],
            currentSession: result.currentSession || null,
          });
        }
      });
    });
  });
}

/**
 * Seeds settings in browser.storage.local
 * Settings are stored as individual keys, not under a "settings" object
 */
export async function seedSettings(page: Page, settings: Settings): Promise<void> {
  await page.evaluate((settingsData) => {
    return new Promise<void>((resolve, reject) => {
      const api =
        (globalThis as GlobalWithBrowser).chrome || (globalThis as GlobalWithBrowser).browser;
      if (!api || !api.storage) {
        reject(new Error("Extension storage API not available"));
        return;
      }
      // Settings are stored as individual keys
      const storageData: Record<string, unknown> = {};
      if (settingsData.currency !== undefined) storageData.currency = settingsData.currency;
      if (settingsData.darkMode !== undefined) storageData.darkMode = settingsData.darkMode;
      if (settingsData.language !== undefined) storageData.language = settingsData.language;
      if (settingsData.defaultWeightUnit !== undefined)
        storageData.defaultWeightUnit = settingsData.defaultWeightUnit;

      api.storage.local.set(storageData, () => {
        if (api.runtime.lastError) {
          reject(new Error(api.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }, settings);

  await page.reload();
  await page.waitForSelector("#app", { state: "attached" });

  // Wait for content to render
  await page.waitForFunction(
    () => {
      const app = document.getElementById("app");
      return app && app.innerHTML.trim().length > 0;
    },
    { timeout: 10000 }
  );

  await page.waitForTimeout(200);
}

/**
 * Gets current settings from storage
 * Settings are stored as individual keys, not under a "settings" object
 */
export async function getSettings(page: Page): Promise<Settings> {
  return await page.evaluate(() => {
    return new Promise<Settings>((resolve, reject) => {
      const api =
        (globalThis as GlobalWithBrowser).chrome || (globalThis as GlobalWithBrowser).browser;
      if (!api || !api.storage) {
        reject(new Error("Extension storage API not available"));
        return;
      }
      // Settings are stored as individual keys
      api.storage.local.get(
        ["currency", "darkMode", "language", "defaultWeightUnit"],
        (result: StorageResult) => {
          if (api.runtime.lastError) {
            reject(new Error(api.runtime.lastError.message));
          } else {
            resolve({
              currency: result.currency,
              darkMode: result.darkMode,
              language: result.language,
              defaultWeightUnit: result.defaultWeightUnit,
            });
          }
        }
      );
    });
  });
}

/**
 * Seeds an optimization result via the background script's messaging API.
 */
export async function seedOptimizationResult(
  page: Page,
  sessionName: string,
  result: object,
  currency: string = "EUR"
): Promise<void> {
  await page.evaluate(
    async ({ sessionName: name, result: res, currency: cur }) => {
      const api =
        (globalThis as GlobalWithBrowser).chrome || (globalThis as GlobalWithBrowser).browser;
      if (!api || !api.runtime) {
        throw new Error("Extension runtime API not available");
      }

      const sendMessage = (msg: ExtensionMessage): Promise<ExtensionResponse> => {
        return new Promise((resolve, reject) => {
          api.runtime.sendMessage(msg, (response: ExtensionResponse) => {
            if (api.runtime.lastError) {
              reject(new Error(api.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        });
      };

      // Find the session by name to get the real ID
      const sessionsResp = (await sendMessage({ action: "getSessions" })) as ExtensionResponse;
      const session = (sessionsResp.sessions || []).find((s) => s.name === name);
      if (!session) {
        throw new Error(`Session "${name}" not found`);
      }

      // Create a minimal session snapshot
      const sessionSnapshot = JSON.stringify({ products: [], bundles: [], deliveryRules: [] });

      await sendMessage({
        action: "saveOptimizationResult",
        sessionId: session.id,
        result: res,
        sessionSnapshot: sessionSnapshot,
        currency: cur,
      });
    },
    { sessionName, result, currency }
  );

  // Reload to ensure UI is in sync
  await page.reload();
  await page.waitForSelector("#app", { state: "attached" });
  await page.waitForFunction(
    () => {
      const app = document.getElementById("app");
      return app && app.innerHTML.trim().length > 0;
    },
    { timeout: 10000 }
  );
  await page.waitForTimeout(200);
}
