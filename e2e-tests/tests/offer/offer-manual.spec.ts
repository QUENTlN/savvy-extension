import { test, expect } from "../../fixtures/extension.fixture";
import { seedStorage, clearStorage } from "../../fixtures/storage.fixture";
import { createSessionData, resetCounters } from "../../fixtures/data.fixture";
import { SidebarPage, ModalHelper } from "../../helpers/sidebar";
import { Selectors } from "../../helpers/selectors";

test.describe("Offer view operations", () => {
  test.beforeEach(async ({ sidebarPage }) => {
    resetCounters();
    await clearStorage(sidebarPage);
  });

  test("should display empty offers view for product", async ({ sidebarPage }) => {
    const session = createSessionData({
      name: "Test Session",
      products: [],
    });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);
    const modal = new ModalHelper(sidebarPage);

    // Create a product
    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Test Session");
    await sidebar.products.waitForView();

    await sidebar.products.clickNewProduct();
    await modal.waitForModal();
    await sidebarPage.locator("#product-name").fill("Empty Product");
    await modal.save();

    await sidebarPage.waitForTimeout(300);

    // Navigate to the product's offers
    await sidebar.products.clickProductByName("Empty Product");

    await sidebar.offers.waitForView();

    // Should show "no offers" or empty state
    const offerCount = await sidebar.offers.getOfferCount();
    expect(offerCount).toBe(0);

    // Add offer button should be visible
    const addOfferButton = sidebarPage.locator(Selectors.offers.addOfferButton);
    await expect(addOfferButton).toBeVisible();
  });

  test("should go back to products view from offers", async ({ sidebarPage }) => {
    const session = createSessionData({
      name: "Test Session",
      products: [],
    });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);
    const modal = new ModalHelper(sidebarPage);

    // Create a product
    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Test Session");
    await sidebar.products.waitForView();

    await sidebar.products.clickNewProduct();
    await modal.waitForModal();
    await sidebarPage.locator("#product-name").fill("Test Product");
    await modal.save();

    await sidebarPage.waitForTimeout(300);

    // Navigate to offers
    await sidebar.products.clickProductByName("Test Product");
    await sidebar.offers.waitForView();

    // Go back
    await sidebar.goBack();

    await sidebar.products.waitForView();
    const newProductButton = sidebarPage.locator(Selectors.products.newProductButton);
    await expect(newProductButton).toBeVisible();
  });

  test("should display product name in offers view title", async ({ sidebarPage }) => {
    const session = createSessionData({
      name: "Test Session",
      products: [],
    });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);
    const modal = new ModalHelper(sidebarPage);

    // Create a product with a specific name
    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Test Session");
    await sidebar.products.waitForView();

    await sidebar.products.clickNewProduct();
    await modal.waitForModal();
    await sidebarPage.locator("#product-name").fill("My Special Product");
    await modal.save();

    await sidebarPage.waitForTimeout(300);

    // Navigate to offers
    await sidebar.products.clickProductByName("My Special Product");
    await sidebar.offers.waitForView();

    // The title should contain the product name
    const title = sidebarPage.locator(Selectors.offers.title);
    await expect(title).toContainText("My Special Product");
  });
});
