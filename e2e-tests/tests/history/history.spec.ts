import { test, expect } from "../../fixtures/extension.fixture";
import { seedStorage, clearStorage } from "../../fixtures/storage.fixture";
import {
  createCompleteOptimizableSession,
  createCompleteSessionData,
  resetCounters,
} from "../../fixtures/data.fixture";
import { SidebarPage } from "../../helpers/sidebar";
import { Selectors } from "../../helpers/selectors";
import { mockOptimizeSuccess, clearContextApiMocks } from "../../helpers/api-mock";

test.describe("History", () => {
  test.beforeEach(async ({ sidebarPage, context }) => {
    resetCounters();
    await clearStorage(sidebarPage);
    await clearContextApiMocks(context).catch(() => {});
  });

  test.afterEach(async ({ context }) => {
    await clearContextApiMocks(context).catch(() => {});
  });

  const mockResponse = {
    meta: { status: "OPTIMAL" as const, solveTimeMs: 100 },
    totals: {
      grandTotal: 50.0,
      breakdown: { products: 35.0, shipping: 10.0, insurance: 5.0 },
    },
    solution: {
      offers: [
        {
          ids: { product: "p1", offer: "o1" },
          seller: "Seller 1",
          quantity: 1,
          pricing: { unitPrice: 25.0, productTotal: 25.0 },
          costs: { shipping: { amount: 5.0 } },
          url: "https://example.com/offer1",
        },
      ],
      bundles: [],
    },
    logistics: { shipping: [{ seller: "Seller 1", amount: 5.0 }] },
  };

  /**
   * Optimizes twice to create history.
   * First optimization creates `current`, second moves it to `history` and sets new `current`.
   * After this, `hasHistory` is true and the history button becomes visible.
   */
  async function optimizeTwiceForHistory(
    sidebarPage: import("@playwright/test").Page,
    sidebar: SidebarPage,
    sessionName: string
  ) {
    // Mock at page level (after seedStorage reload)
    await mockOptimizeSuccess(sidebarPage, mockResponse);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName(sessionName);
    await sidebar.products.waitForView();

    // First optimization: creates current, history = []
    await sidebar.products.clickOptimize();
    await sidebar.results.waitForView();
    await sidebar.results.clickReOptimize();
    await sidebar.products.waitForView();

    // Second optimization: moves current to history, sets new current → hasHistory = true
    await sidebar.products.clickOptimize();
    await sidebar.results.waitForView();
    await sidebar.results.clickReOptimize();
    await sidebar.products.waitForView();
  }

  test("should not show history button when no optimization has been done", async ({
    sidebarPage,
  }) => {
    const session = createCompleteSessionData({
      sessionName: "History Session",
    });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("History Session");
    await sidebar.products.waitForView();

    // History button should NOT be visible when there's no optimization history
    const historyButton = sidebarPage.locator(Selectors.products.historyButton);
    await expect(historyButton).not.toBeVisible();
  });

  test("should display history items after two optimizations", async ({ sidebarPage }) => {
    const session = createCompleteOptimizableSession({
      sessionName: "History Opt Session",
      productCount: 2,
      offersPerProduct: 2,
    });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);
    await optimizeTwiceForHistory(sidebarPage, sidebar, "History Opt Session");

    // Now history button should be visible
    const historyButton = sidebarPage.locator(Selectors.products.historyButton);
    await expect(historyButton).toBeVisible();

    // Navigate to history
    await sidebar.products.clickHistory();
    await sidebar.history.waitForView();

    // Should have at least one history item
    const historyCount = await sidebar.history.getHistoryCount();
    expect(historyCount).toBeGreaterThanOrEqual(1);
  });

  test("should view historical result", async ({ sidebarPage }) => {
    const session = createCompleteOptimizableSession({
      sessionName: "View History Session",
      productCount: 2,
      offersPerProduct: 2,
    });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);
    await optimizeTwiceForHistory(sidebarPage, sidebar, "View History Session");

    // Navigate to history
    await sidebar.products.clickHistory();
    await sidebar.history.waitForView();

    const historyCount = await sidebar.history.getHistoryCount();
    expect(historyCount).toBeGreaterThanOrEqual(1);

    // Click on the first history item
    await sidebar.history.clickHistoryItem(0);

    // Should show results view
    await sidebarPage.waitForTimeout(1000);

    // Verify we can see results content
    const pageText = await sidebarPage.textContent("body");
    expect(
      pageText?.includes("50") || pageText?.includes("OPTIMAL") || pageText?.includes("Optimal")
    ).toBeTruthy();
  });

  test("should go back to products from history", async ({ sidebarPage }) => {
    const session = createCompleteOptimizableSession({
      sessionName: "Back From History Session",
      productCount: 2,
      offersPerProduct: 2,
    });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);
    await optimizeTwiceForHistory(sidebarPage, sidebar, "Back From History Session");

    // Navigate to history
    await sidebar.products.clickHistory();
    await sidebar.history.waitForView();

    // Go back
    await sidebar.goBack();

    await sidebar.products.waitForView();
    const newProductButton = sidebarPage.locator(Selectors.products.newProductButton);
    await expect(newProductButton).toBeVisible();
  });
});
