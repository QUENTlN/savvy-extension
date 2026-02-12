import type { Page, Route } from "@playwright/test";

// API base URL pattern - matches both local and production
const API_URL_PATTERN = "**/api/v1/optimize";
const API_URL_REGEX = /\/api\/v[0-9]+\/optimize/;

export interface OptimizationResponse {
  meta: {
    status: "OPTIMAL" | "FEASIBLE" | "INFEASIBLE" | "ERROR";
    solveTimeMs?: number;
  };
  totals: {
    grandTotal: number;
    breakdown: {
      products: number;
      shipping: number;
      insurance: number;
      customs?: {
        duties: number;
        vat: number;
        clearance: number;
      };
      forwarder?: {
        reception: number;
        storage: number;
        repackaging: number;
        reshipping: number;
      };
    };
  };
  solution: {
    offers: Array<{
      ids: { product: string; offer: string };
      seller: string;
      quantity: number;
      pricing: { unitPrice: number; productTotal: number };
      costs: {
        shipping: { amount: number };
        insurance?: { amount: number };
        customs?: { duties: { amount: number }; vat: { amount: number } };
      };
      url: string;
    }>;
    bundles: Array<{
      ids: { bundle: string; products: string[] };
      seller: string;
      quantity: number;
      pricing: { unitPrice: number; productTotal: number };
      costs: { shipping: { amount: number } };
    }>;
  };
  logistics: {
    shipping: Array<{ seller: string; amount: number }>;
  };
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Creates a successful optimization response
 */
export function createSuccessResponse(
  options: {
    totalCost?: number;
    status?: "OPTIMAL" | "FEASIBLE";
    sellers?: string[];
  } = {}
): OptimizationResponse {
  const { totalCost = 99.99, status = "OPTIMAL", sellers = ["Test Seller"] } = options;

  return {
    meta: { status, solveTimeMs: 150 },
    totals: {
      grandTotal: totalCost,
      breakdown: {
        products: totalCost * 0.7,
        shipping: totalCost * 0.2,
        insurance: totalCost * 0.1,
      },
    },
    solution: {
      offers: sellers.map((seller, i) => ({
        ids: { product: `product-${i}`, offer: `offer-${i}` },
        seller,
        quantity: 1,
        pricing: {
          unitPrice: totalCost / sellers.length,
          productTotal: totalCost / sellers.length,
        },
        costs: { shipping: { amount: 5.99 } },
        url: `https://example.com/${seller.toLowerCase().replace(/\s/g, "-")}`,
      })),
      bundles: [],
    },
    logistics: {
      shipping: sellers.map((seller) => ({ seller, amount: 5.99 })),
    },
  };
}

/**
 * Creates an infeasible (no solution) response
 */
export function createInfeasibleResponse(): OptimizationResponse {
  return {
    meta: { status: "INFEASIBLE", solveTimeMs: 50 },
    totals: {
      grandTotal: 0,
      breakdown: { products: 0, shipping: 0, insurance: 0 },
    },
    solution: { offers: [], bundles: [] },
    logistics: { shipping: [] },
  };
}

/**
 * Creates an error response
 */
export function createErrorResponse(message: string = "Internal server error"): { error: string } {
  return { error: message };
}

/**
 * Mocks the optimization API with a successful response
 */
export async function mockOptimizationSuccess(
  page: Page,
  response: OptimizationResponse = createSuccessResponse(),
  rateLimit: RateLimitInfo = { limit: 30, remaining: 29, reset: Date.now() + 3600000 }
): Promise<void> {
  await page.route(API_URL_PATTERN, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "X-RateLimit-Limit": String(rateLimit.limit),
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.reset),
      },
      body: JSON.stringify(response),
    });
  });
}

/**
 * Mocks the optimization API with a rate limit exceeded (429) response
 */
export async function mockRateLimitExceeded(
  page: Page,
  resetTime: number = Date.now() + 3600000
): Promise<void> {
  await page.route(API_URL_PATTERN, async (route: Route) => {
    await route.fulfill({
      status: 429,
      contentType: "application/json",
      headers: {
        "X-RateLimit-Limit": "30",
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(resetTime),
        "Retry-After": "3600",
      },
      body: JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
    });
  });
}

/**
 * Mocks the optimization API with a server error (500) response
 */
export async function mockServerError(
  page: Page,
  message: string = "Internal server error"
): Promise<void> {
  await page.route(API_URL_PATTERN, async (route: Route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify(createErrorResponse(message)),
    });
  });
}

/**
 * Mocks the optimization API with a network error
 */
export async function mockNetworkError(page: Page): Promise<void> {
  await page.route(API_URL_PATTERN, async (route: Route) => {
    await route.abort("failed");
  });
}

/**
 * Mocks the optimization API with a delayed response
 */
export async function mockDelayedResponse(
  page: Page,
  delayMs: number,
  response: OptimizationResponse = createSuccessResponse()
): Promise<void> {
  await page.route(API_URL_PATTERN, async (route: Route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "X-RateLimit-Limit": "30",
        "X-RateLimit-Remaining": "29",
        "X-RateLimit-Reset": String(Date.now() + 3600000),
      },
      body: JSON.stringify(response),
    });
  });
}

/**
 * Clears all route handlers for the optimization API
 */
export async function clearApiMocks(page: Page): Promise<void> {
  await page.unroute(API_URL_PATTERN);
}

/**
 * Captures optimization API requests for inspection
 */
export function captureOptimizationRequests(page: Page): Array<{ url: string; body: unknown }> {
  const requests: Array<{ url: string; body: unknown }> = [];

  page.on("request", (request) => {
    if (API_URL_REGEX.test(request.url())) {
      try {
        requests.push({
          url: request.url(),
          body: JSON.parse(request.postData() || "{}"),
        });
      } catch {
        requests.push({ url: request.url(), body: null });
      }
    }
  });

  return requests;
}
