import { test, expect } from "../../fixtures/extension.fixture";
import { seedStorage, clearStorage } from "../../fixtures/storage.fixture";
import { createCompleteOptimizableSession, resetCounters } from "../../fixtures/data.fixture";
import { SidebarPage } from "../../helpers/sidebar";
import { Selectors } from "../../helpers/selectors";
import { mockOptimizeSuccess, clearContextApiMocks } from "../../helpers/api-mock";

test.describe("Results display", () => {
  test.beforeEach(async ({ sidebarPage, context }) => {
    resetCounters();
    await clearStorage(sidebarPage);
    await clearContextApiMocks(context).catch(() => {});
  });

  test.afterEach(async ({ context }) => {
    await clearContextApiMocks(context).catch(() => {});
  });

  async function optimizeAndGetResults(
    sidebarPage: import("@playwright/test").Page,
    sidebar: SidebarPage
  ) {
    const session = createCompleteOptimizableSession({
      sessionName: "Results Session",
      productCount: 2,
      offersPerProduct: 2,
    });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    // Mock at page level (after seedStorage reload)
    await mockOptimizeSuccess(sidebarPage, {
      meta: { status: "OPTIMAL", computation_time_ms: 100 },
      totals: {
        grand_total: 75.0,
        breakdown: { products: 50.0, shipping: 15.0, insurance: 10.0 },
      },
      solution: {
        offers: [
          {
            ids: { product: "p1", offer: "o1" },
            seller: "Store Alpha",
            quantity: 1,
            pricing: { unit_price: 25.0, product_total: 25.0 },
            costs: { shipping: { amount: 5.0 } },
            url: "https://example.com/alpha",
          },
          {
            ids: { product: "p2", offer: "o2" },
            seller: "Store Beta",
            quantity: 1,
            pricing: { unit_price: 25.0, product_total: 25.0 },
            costs: { shipping: { amount: 5.0 } },
            url: "https://example.com/beta",
          },
        ],
        bundles: [],
      },
      logistics: {
        shipping: [
          { seller: "Store Alpha", amount: 5.0 },
          { seller: "Store Beta", amount: 5.0 },
        ],
      },
    });

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Results Session");
    await sidebar.products.waitForView();
    await sidebar.products.clickOptimize();
    await sidebar.results.waitForView();
  }

  test("should display optimization result breakdown", async ({ sidebarPage }) => {
    const sidebar = new SidebarPage(sidebarPage);
    await optimizeAndGetResults(sidebarPage, sidebar);

    // Verify status badge
    const status = await sidebar.results.getStatus();
    expect(status.toUpperCase()).toContain("OPTIMAL");

    // Verify total cost is displayed
    const totalCost = await sidebar.results.getTotalCost();
    expect(totalCost).toContain("75");

    // Verify re-optimize button exists
    const reOptimize = sidebarPage.locator(Selectors.results.reOptimizeButton);
    await expect(reOptimize).toBeVisible();
  });

  test("should navigate back to products via re-optimize", async ({ sidebarPage }) => {
    const sidebar = new SidebarPage(sidebarPage);
    await optimizeAndGetResults(sidebarPage, sidebar);

    // Click re-optimize
    await sidebar.results.clickReOptimize();

    // Should be back on products view
    await sidebar.products.waitForView();
    const newProductButton = sidebarPage.locator(Selectors.products.newProductButton);
    await expect(newProductButton).toBeVisible();
  });

  test("should navigate back to products via back button", async ({ sidebarPage }) => {
    const sidebar = new SidebarPage(sidebarPage);
    await optimizeAndGetResults(sidebarPage, sidebar);

    // Click back
    await sidebar.goBack();

    // Should be back on products view
    await sidebar.products.waitForView();
    const newProductButton = sidebarPage.locator(Selectors.products.newProductButton);
    await expect(newProductButton).toBeVisible();
  });
});
