import { test, expect } from "../../fixtures/extension.fixture";
import { seedStorage, clearStorage } from "../../fixtures/storage.fixture";
import { createSessionData, resetCounters } from "../../fixtures/data.fixture";
import { SidebarPage, ModalHelper } from "../../helpers/sidebar";

/**
 * Tests for offer display functionality.
 * Note: Actual scraping from content scripts cannot be easily tested in E2E
 * since it requires a real webpage context. These tests focus on the UI aspects.
 */
test.describe("Offer display", () => {
  test.beforeEach(async ({ sidebarPage }) => {
    resetCounters();
    await clearStorage(sidebarPage);
  });

  test("should display product ready to receive offers", async ({ sidebarPage }) => {
    const session = createSessionData({
      name: "Scraping Test Session",
      products: [],
    });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);
    const modal = new ModalHelper(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Scraping Test Session");
    await sidebar.products.waitForView();

    // Create a product
    await sidebar.products.clickNewProduct();
    await modal.waitForModal();
    await sidebarPage.locator("#product-name").fill("Product for Scraping");
    await modal.save();

    await sidebarPage.waitForTimeout(300);

    // Navigate to offers view
    await sidebar.products.clickProductByName("Product for Scraping");
    await sidebar.offers.waitForView();

    // Product should be ready to receive offers (0 offers initially)
    const offerCount = await sidebar.offers.getOfferCount();
    expect(offerCount).toBe(0);
  });

  test("should navigate between products and offers", async ({ sidebarPage }) => {
    const session = createSessionData({
      name: "Multi-product Session",
      products: [],
    });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);
    const modal = new ModalHelper(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Multi-product Session");
    await sidebar.products.waitForView();

    // Create first product
    await sidebar.products.clickNewProduct();
    await modal.waitForModal();
    await sidebarPage.locator("#product-name").fill("Product A");
    await modal.save();
    await sidebarPage.waitForTimeout(300);

    // Create second product
    await sidebar.products.clickNewProduct();
    await modal.waitForModal();
    await sidebarPage.locator("#product-name").fill("Product B");
    await modal.save();
    await sidebarPage.waitForTimeout(300);

    // Navigate to first product's offers
    await sidebar.products.clickProductByName("Product A");
    await sidebar.offers.waitForView();

    // Go back
    await sidebar.goBack();
    await sidebar.products.waitForView();

    // Navigate to second product's offers
    await sidebar.products.clickProductByName("Product B");
    await sidebar.offers.waitForView();

    // Verify we're viewing Product B
    const title = sidebarPage.locator("h1.card-text");
    await expect(title).toContainText("Product B");
  });
});
