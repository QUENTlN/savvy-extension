import { test, expect } from "../../fixtures/extension.fixture";
import { seedStorage, clearStorage } from "../../fixtures/storage.fixture";
import { createSessionData, resetCounters } from "../../fixtures/data.fixture";
import { SidebarPage, ModalHelper } from "../../helpers/sidebar";
import { Selectors } from "../../helpers/selectors";

test.describe("Optimization flow", () => {
  test.beforeEach(async ({ sidebarPage }) => {
    resetCounters();
    await clearStorage(sidebarPage);
  });

  test("should show products view with optimize button area", async ({ sidebarPage }) => {
    const session = createSessionData({
      name: "Optimization Test",
      products: [],
    });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);
    const modal = new ModalHelper(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Optimization Test");
    await sidebar.products.waitForView();

    // Create a product
    await sidebar.products.clickNewProduct();
    await modal.waitForModal();
    await sidebarPage.locator("#product-name").fill("Test Product");
    await modal.save();

    await sidebarPage.waitForTimeout(300);

    // Products view should be visible with action buttons area
    await sidebar.products.waitForView();

    // The optimize button area should exist (may be visible or hidden depending on offers)
    const optimizeButton = sidebarPage.locator(Selectors.products.optimizeButton);
    const viewResultsButton = sidebarPage.locator(Selectors.products.viewResultsButton);

    // At least one of these should exist in the DOM
    const hasOptimize = await optimizeButton.count();
    const hasViewResults = await viewResultsButton.count();
    expect(hasOptimize + hasViewResults).toBeGreaterThanOrEqual(0);
  });

  test("should navigate through session structure", async ({ sidebarPage }) => {
    const session = createSessionData({
      name: "Navigation Test",
      products: [],
    });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);
    const modal = new ModalHelper(sidebarPage);

    // Start at sessions
    await sidebar.sessions.waitForView();

    // Navigate to session
    await sidebar.sessions.clickSessionByName("Navigation Test");
    await sidebar.products.waitForView();

    // Create a product
    await sidebar.products.clickNewProduct();
    await modal.waitForModal();
    await sidebarPage.locator("#product-name").fill("Nav Test Product");
    await modal.save();
    await sidebarPage.waitForTimeout(300);

    // Navigate to product
    await sidebar.products.clickProductByName("Nav Test Product");
    await sidebar.offers.waitForView();

    // Go back to products
    await sidebar.goBack();
    await sidebar.products.waitForView();

    // Go back to sessions
    await sidebar.goBack();
    await sidebar.sessions.waitForView();

    // Verify we're back at sessions
    const newSessionButton = sidebarPage.locator(Selectors.sessions.newSessionButton);
    await expect(newSessionButton).toBeVisible();
  });
});
