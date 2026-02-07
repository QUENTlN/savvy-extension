import { test, expect } from "../../fixtures/extension.fixture";
import { seedStorage, clearStorage } from "../../fixtures/storage.fixture";
import { createCompleteOptimizableSession, resetCounters } from "../../fixtures/data.fixture";
import { SidebarPage } from "../../helpers/sidebar";
import { Selectors } from "../../helpers/selectors";
import {
  mockOptimizeSuccess,
  mockOptimizeInfeasible,
  mockOptimizeError,
  mockOptimizeRateLimited,
  clearContextApiMocks,
} from "../../helpers/api-mock";

test.describe("Optimization with mocked API", () => {
  test.beforeEach(async ({ sidebarPage, context }) => {
    resetCounters();
    await clearStorage(sidebarPage);
    await clearContextApiMocks(context).catch(() => {});
  });

  test.afterEach(async ({ context }) => {
    await clearContextApiMocks(context).catch(() => {});
  });

  test("should optimize and display results with OPTIMAL status", async ({ sidebarPage }) => {
    const session = createCompleteOptimizableSession({
      sessionName: "Optimize Session",
      productCount: 2,
      offersPerProduct: 2,
    });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    // Mock the API with a successful response (page-level interception)
    await mockOptimizeSuccess(sidebarPage, {
      meta: { status: "OPTIMAL", computation_time_ms: 150 },
      totals: {
        grand_total: 87.5,
        breakdown: { products: 60.0, shipping: 17.5, insurance: 10.0 },
      },
      solution: {
        offers: [
          {
            ids: { product: "p1", offer: "o1" },
            seller: "Seller 1",
            quantity: 1,
            pricing: { unit_price: 30.0, product_total: 30.0 },
            costs: { shipping: { amount: 5.0 } },
            url: "https://example.com/offer1",
          },
          {
            ids: { product: "p2", offer: "o2" },
            seller: "Seller 2",
            quantity: 1,
            pricing: { unit_price: 30.0, product_total: 30.0 },
            costs: { shipping: { amount: 5.0 } },
            url: "https://example.com/offer2",
          },
        ],
        bundles: [],
      },
      logistics: {
        shipping: [
          { seller: "Seller 1", amount: 5.0 },
          { seller: "Seller 2", amount: 5.0 },
        ],
      },
    });

    const sidebar = new SidebarPage(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Optimize Session");
    await sidebar.products.waitForView();

    // Click optimize
    await sidebar.products.clickOptimize();

    // Wait for results view to appear
    await sidebar.results.waitForView();

    // Verify OPTIMAL status
    const status = await sidebar.results.getStatus();
    expect(status.toUpperCase()).toContain("OPTIMAL");

    // Verify total cost is displayed
    const totalCost = await sidebar.results.getTotalCost();
    expect(totalCost).toContain("87");

    // Verify re-optimize button exists
    const reOptimize = sidebarPage.locator(Selectors.results.reOptimizeButton);
    await expect(reOptimize).toBeVisible();
  });

  test("should handle INFEASIBLE result", async ({ sidebarPage }) => {
    const session = createCompleteOptimizableSession({
      sessionName: "Infeasible Session",
    });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    // Mock infeasible response (page-level interception)
    await mockOptimizeInfeasible(sidebarPage);

    const sidebar = new SidebarPage(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Infeasible Session");
    await sidebar.products.waitForView();
    await sidebar.products.clickOptimize();

    // Wait for response to be processed
    await sidebarPage.waitForTimeout(2000);

    // The result should show INFEASIBLE status or an error message
    // Check if results view appeared with INFEASIBLE status
    const resultsVisible = await sidebarPage
      .locator(Selectors.results.reOptimizeButton)
      .isVisible()
      .catch(() => false);

    if (resultsVisible) {
      const status = await sidebar.results.getStatus();
      expect(status.toUpperCase()).toContain("INFEASIBLE");
    } else {
      // An error toast or message should be displayed
      const pageText = await sidebarPage.textContent("body");
      expect(
        pageText?.toLowerCase().includes("infeasible") ||
          pageText?.toLowerCase().includes("no solution") ||
          pageText?.toLowerCase().includes("impossible")
      ).toBeTruthy();
    }
  });

  test("should handle API error gracefully", async ({ sidebarPage }) => {
    const session = createCompleteOptimizableSession({
      sessionName: "Error Session",
    });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    // Mock server error (page-level interception)
    await mockOptimizeError(sidebarPage);

    const sidebar = new SidebarPage(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Error Session");
    await sidebar.products.waitForView();
    await sidebar.products.clickOptimize();

    // Wait for error to be processed
    await sidebarPage.waitForTimeout(2000);

    // Should still be on products view (not results) or show an error
    const pageText = await sidebarPage.textContent("body");
    const hasError =
      pageText?.toLowerCase().includes("error") ||
      pageText?.toLowerCase().includes("erreur") ||
      pageText?.toLowerCase().includes("failed");
    const stillOnProducts = await sidebarPage
      .locator(Selectors.products.newProductButton)
      .isVisible()
      .catch(() => false);

    // Either we show an error message or we stay on products
    expect(hasError || stillOnProducts).toBeTruthy();
  });

  test("should handle rate limit exceeded", async ({ sidebarPage }) => {
    const session = createCompleteOptimizableSession({
      sessionName: "Rate Limit Session",
    });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    // Mock rate limit response (page-level interception)
    await mockOptimizeRateLimited(sidebarPage);

    const sidebar = new SidebarPage(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Rate Limit Session");
    await sidebar.products.waitForView();
    await sidebar.products.clickOptimize();

    // Wait for response
    await sidebarPage.waitForTimeout(2000);

    // Should show rate limit message or error
    const pageText = await sidebarPage.textContent("body");
    const hasRateLimitMessage =
      pageText?.toLowerCase().includes("rate") ||
      pageText?.toLowerCase().includes("limit") ||
      pageText?.toLowerCase().includes("error") ||
      pageText?.toLowerCase().includes("erreur");

    expect(hasRateLimitMessage).toBeTruthy();
  });
});
