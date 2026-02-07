import type { Page, BrowserContext } from "@playwright/test";

/**
 * Page-level API mocking for the optimization endpoint.
 *
 * Chrome MV3 service worker fetch requests are NOT intercepted by Playwright's
 * context.route(). Instead, we monkey-patch chrome.runtime.sendMessage in the
 * sidebar page to return mock responses for the "optimizeSession" action.
 * All other messages pass through to the real background script.
 */

export interface MockOptimizationResponse {
  meta: {
    status: "OPTIMAL" | "FEASIBLE" | "INFEASIBLE" | "ERROR";
    computation_time_ms?: number;
  };
  totals: {
    grand_total: number;
    breakdown: {
      products: number;
      shipping: number;
      insurance: number;
    };
  };
  solution: {
    offers: Array<{
      ids: { product: string; offer: string };
      seller: string;
      quantity: number;
      pricing: { unit_price: number; product_total: number };
      costs: { shipping: { amount: number } };
      url: string;
    }>;
    bundles: Array<unknown>;
  };
  logistics: {
    shipping: Array<{ seller: string; amount: number }>;
  };
}

/**
 * Install a sendMessage mock on the page that intercepts "optimizeSession"
 * and returns the given response. All other messages pass through.
 */
async function installOptimizeMock(page: Page, mockResponse: object): Promise<void> {
  await page.evaluate((resp) => {
    const api = (globalThis as { chrome?: { runtime: Record<string, unknown> } }).chrome;
    if (!api || !api.runtime) return;

    // Store original if not already stored
    if (!api.runtime.__originalSendMessage) {
      api.runtime.__originalSendMessage = (api.runtime.sendMessage as Function).bind(api.runtime);
    }

    const original = api.runtime.__originalSendMessage as Function;

    // Override sendMessage to intercept optimizeSession
    api.runtime.sendMessage = function (message: { action?: string }, callback?: Function) {
      if (message && message.action === "optimizeSession") {
        // Return mock response
        if (typeof callback === "function") {
          setTimeout(() => callback(resp), 50);
          return undefined;
        }
        // Promise-based (Chrome MV3)
        return new Promise((resolve: (v: unknown) => void) => setTimeout(() => resolve(resp), 50));
      }
      // Pass through to original for all other messages
      return original(message, callback);
    };
  }, mockResponse);
}

/**
 * Mock the optimization API with a successful response
 */
export async function mockOptimizeSuccess(
  page: Page,
  response?: Partial<MockOptimizationResponse>
): Promise<void> {
  const defaultResponse: MockOptimizationResponse = {
    meta: { status: "OPTIMAL", computation_time_ms: 150 },
    totals: {
      grand_total: 99.99,
      breakdown: { products: 69.99, shipping: 20.0, insurance: 10.0 },
    },
    solution: {
      offers: [
        {
          ids: { product: "p1", offer: "o1" },
          seller: "Seller 1",
          quantity: 1,
          pricing: { unit_price: 49.99, product_total: 49.99 },
          costs: { shipping: { amount: 5.99 } },
          url: "https://example.com/offer1",
        },
      ],
      bundles: [],
    },
    logistics: { shipping: [{ seller: "Seller 1", amount: 5.99 }] },
  };

  const finalResponse = { ...defaultResponse, ...response };

  await installOptimizeMock(page, {
    success: true,
    result: finalResponse,
    sessionSnapshot: JSON.stringify({ products: [], bundles: [], deliveryRules: [] }),
    rateLimit: { limit: 100, remaining: 50, reset: Date.now() + 3600000 },
  });
}

/**
 * Mock the optimization API with an infeasible (no solution) response
 */
export async function mockOptimizeInfeasible(page: Page): Promise<void> {
  await installOptimizeMock(page, {
    success: true,
    result: {
      meta: { status: "INFEASIBLE", computation_time_ms: 50 },
      totals: { grand_total: 0, breakdown: { products: 0, shipping: 0, insurance: 0 } },
      solution: { offers: [], bundles: [] },
      logistics: { shipping: [] },
    },
    sessionSnapshot: JSON.stringify({ products: [], bundles: [], deliveryRules: [] }),
    rateLimit: { limit: 100, remaining: 50, reset: Date.now() + 3600000 },
  });
}

/**
 * Mock the optimization API with a server error
 */
export async function mockOptimizeError(page: Page): Promise<void> {
  await installOptimizeMock(page, {
    success: false,
    error: "Internal server error",
    errorCode: "SERVER_ERROR",
  });
}

/**
 * Mock the optimization API with rate limit exceeded
 */
export async function mockOptimizeRateLimited(page: Page): Promise<void> {
  await installOptimizeMock(page, {
    success: false,
    error: "Rate limit exceeded. Please try again later.",
    rateLimited: true,
    errorCode: "RATE_LIMITED",
  });
}

/**
 * Remove the optimization mock and restore original sendMessage
 */
export async function clearOptimizeMock(page: Page): Promise<void> {
  await page.evaluate(() => {
    const api = (globalThis as { chrome?: { runtime: Record<string, unknown> } }).chrome;
    if (!api || !api.runtime) return;

    if (api.runtime.__originalSendMessage) {
      api.runtime.sendMessage = api.runtime.__originalSendMessage;
      delete api.runtime.__originalSendMessage;
    }
  });
}

/**
 * No-op for backward compatibility.
 * Context-level route mocking doesn't work for Chrome MV3 service worker requests.
 * Page reloads (from seedStorage/clearStorage) automatically clear page-level mocks.
 */
export async function clearContextApiMocks(_context: BrowserContext): Promise<void> {
  // No-op — page-level mocks are cleared by page reloads
}
