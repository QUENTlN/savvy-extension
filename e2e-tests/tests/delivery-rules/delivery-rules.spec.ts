import { test, expect } from "../../fixtures/extension.fixture";
import { seedStorage, clearStorage } from "../../fixtures/storage.fixture";
import {
  createSessionData,
  createProductData,
  createOfferData,
  resetCounters,
} from "../../fixtures/data.fixture";
import { SidebarPage } from "../../helpers/sidebar";
import { Selectors } from "../../helpers/selectors";

test.describe("Delivery Rules", () => {
  test.beforeEach(async ({ sidebarPage }) => {
    resetCounters();
    await clearStorage(sidebarPage);
  });

  function createSessionWithSellers(sellers: string[]) {
    const products = sellers.map((seller, i) =>
      createProductData({
        name: `Product ${i + 1}`,
        offers: [createOfferData({ seller, price: 10 + i * 5 })],
      })
    );
    return createSessionData({
      name: "Delivery Rules Session",
      products,
    });
  }

  test("should navigate to delivery rules from products", async ({ sidebarPage }) => {
    const session = createSessionWithSellers(["Seller A"]);

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Delivery Rules Session");
    await sidebar.products.waitForView();

    // Click delivery rules button
    await sidebar.products.clickDeliveryRules();
    await sidebar.deliveryRules.waitForView();

    // Should be on delivery rules view (back button visible)
    const backButton = sidebarPage.locator(Selectors.backButton);
    await expect(backButton).toBeVisible();
  });

  test("should display seller cards for each unique seller", async ({ sidebarPage }) => {
    const session = createSessionWithSellers(["Amazon", "eBay"]);

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Delivery Rules Session");
    await sidebar.products.waitForView();
    await sidebar.products.clickDeliveryRules();
    await sidebar.deliveryRules.waitForView();

    // Should have 2 seller cards
    const sellerCount = await sidebar.deliveryRules.getSellerCount();
    expect(sellerCount).toBe(2);

    const sellerNames = await sidebar.deliveryRules.getSellerNames();
    expect(sellerNames).toContain("Amazon");
    expect(sellerNames).toContain("eBay");
  });

  test("should open seller editor and go back", async ({ sidebarPage }) => {
    const session = createSessionWithSellers(["Amazon"]);

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Delivery Rules Session");
    await sidebar.products.waitForView();
    await sidebar.products.clickDeliveryRules();
    await sidebar.deliveryRules.waitForView();

    // Click edit on the seller
    await sidebar.deliveryRules.clickEditSeller("Amazon");

    // Should now be in seller editing mode - back-to-list button should be visible
    await sidebarPage.waitForTimeout(300);
    const backToListButton = sidebarPage.locator("#back-to-list-button");
    await expect(backToListButton).toBeVisible();

    // Verify we're in the seller editor (header shows seller name)
    const pageText = await sidebarPage.textContent("body");
    expect(pageText).toContain("Amazon");
  });

  test("should go back to products from delivery rules", async ({ sidebarPage }) => {
    const session = createSessionWithSellers(["Seller A"]);

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Delivery Rules Session");
    await sidebar.products.waitForView();
    await sidebar.products.clickDeliveryRules();
    await sidebar.deliveryRules.waitForView();

    // Go back
    await sidebar.goBack();

    await sidebar.products.waitForView();
    const newProductButton = sidebarPage.locator(Selectors.products.newProductButton);
    await expect(newProductButton).toBeVisible();
  });

  test("should display no seller cards when no offers exist", async ({ sidebarPage }) => {
    const session = createSessionData({
      name: "Delivery Rules Session",
      products: [createProductData({ name: "Empty Product", offers: [] })],
    });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Delivery Rules Session");
    await sidebar.products.waitForView();
    await sidebar.products.clickDeliveryRules();
    await sidebar.deliveryRules.waitForView();

    // No sellers = no seller cards
    const sellerCount = await sidebar.deliveryRules.getSellerCount();
    expect(sellerCount).toBe(0);
  });
});
