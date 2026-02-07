import { test, expect } from "../../fixtures/extension.fixture";
import { seedStorage, clearStorage } from "../../fixtures/storage.fixture";
import {
  createSessionData,
  createProductData,
  createOfferData,
  createBundleData,
  resetCounters,
} from "../../fixtures/data.fixture";
import { SidebarPage, ModalHelper } from "../../helpers/sidebar";
import { Selectors } from "../../helpers/selectors";

test.describe("Offer CRUD operations", () => {
  test.beforeEach(async ({ sidebarPage }) => {
    resetCounters();
    await clearStorage(sidebarPage);
  });

  test("should display seeded offers with correct details", async ({ sidebarPage }) => {
    const offer1 = createOfferData({
      seller: "Amazon",
      price: 25.99,
      shippingPrice: 3.99,
      currency: "EUR",
    });
    const offer2 = createOfferData({
      seller: "eBay",
      price: 22.5,
      shippingPrice: 5.0,
      currency: "EUR",
    });
    const product = createProductData({
      name: "Test Product",
      offers: [offer1, offer2],
    });
    const session = createSessionData({
      name: "Offers Session",
      products: [product],
    });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);
    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Offers Session");
    await sidebar.products.waitForView();
    await sidebar.products.clickProductByName("Test Product");
    await sidebar.offers.waitForView();

    // Should display 2 offers
    const offerCount = await sidebar.offers.getOfferCount();
    expect(offerCount).toBe(2);

    // Verify sellers are displayed
    const sellers = await sidebar.offers.getOfferSellers();
    expect(sellers).toContain("Amazon");
    expect(sellers).toContain("eBay");
  });

  test("should edit an existing offer", async ({ sidebarPage }) => {
    const offer = createOfferData({
      seller: "Original Seller",
      price: 30.0,
      shippingPrice: 5.0,
    });
    const product = createProductData({
      name: "Edit Offer Product",
      offers: [offer],
    });
    const session = createSessionData({
      name: "Edit Offer Session",
      products: [product],
    });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);
    const modal = new ModalHelper(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Edit Offer Session");
    await sidebar.products.waitForView();
    await sidebar.products.clickProductByName("Edit Offer Product");
    await sidebar.offers.waitForView();

    expect(await sidebar.offers.getOfferCount()).toBe(1);

    // Click edit on the first offer
    await sidebar.offers.clickFirstEditOffer();
    await modal.waitForModal();

    // Change the price
    const priceInput = sidebarPage.locator("#offer-price");
    await priceInput.clear();
    await priceInput.fill("45.00");

    await modal.save();

    // Verify offer still exists (was updated, not duplicated)
    await sidebarPage.waitForTimeout(500);
    expect(await sidebar.offers.getOfferCount()).toBe(1);

    // Verify the page shows the updated price
    const offerText = await sidebarPage.locator(Selectors.offers.offerCard).first().textContent();
    expect(offerText).toContain("45");
  });

  test("should delete an offer", async ({ sidebarPage }) => {
    const offer = createOfferData({
      seller: "Delete Me Seller",
      price: 15.0,
      shippingPrice: 2.0,
    });
    const product = createProductData({
      name: "Delete Offer Product",
      offers: [offer],
    });
    const session = createSessionData({
      name: "Delete Offer Session",
      products: [product],
    });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);
    const modal = new ModalHelper(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Delete Offer Session");
    await sidebar.products.waitForView();
    await sidebar.products.clickProductByName("Delete Offer Product");
    await sidebar.offers.waitForView();

    expect(await sidebar.offers.getOfferCount()).toBe(1);

    // Click delete on the first offer
    await sidebar.offers.clickFirstDeleteOffer();

    // Confirm deletion
    await modal.waitForModal();
    await modal.confirmDelete();

    // Verify offer was deleted
    await sidebarPage.waitForTimeout(500);
    expect(await sidebar.offers.getOfferCount()).toBe(0);
  });

  test("should display seeded bundle on offer view", async ({ sidebarPage }) => {
    const product1 = createProductData({ name: "Bundle Product A" });
    const product2 = createProductData({ name: "Bundle Product B" });
    const bundle = createBundleData([product1.id, product2.id], {
      seller: "Bundle Store",
      price: 79.99,
      shippingPrice: 0,
    });
    const session = createSessionData({
      name: "Bundle Session",
      products: [product1, product2],
      bundles: [bundle],
    });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Bundle Session");
    await sidebar.products.waitForView();
    await sidebar.products.clickProductByName("Bundle Product A");
    await sidebar.offers.waitForView();

    // Should display the bundle card
    const bundleCount = await sidebar.offers.getBundleCount();
    expect(bundleCount).toBeGreaterThanOrEqual(1);
  });

  test("should delete a bundle", async ({ sidebarPage }) => {
    const product1 = createProductData({ name: "Del Bundle Prod A" });
    const product2 = createProductData({ name: "Del Bundle Prod B" });
    const bundle = createBundleData([product1.id, product2.id], {
      seller: "Bundle Seller",
      price: 49.99,
      shippingPrice: 5.0,
    });
    const session = createSessionData({
      name: "Delete Bundle Session",
      products: [product1, product2],
      bundles: [bundle],
    });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);
    const modal = new ModalHelper(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Delete Bundle Session");
    await sidebar.products.waitForView();
    await sidebar.products.clickProductByName("Del Bundle Prod A");
    await sidebar.offers.waitForView();

    const initialBundleCount = await sidebar.offers.getBundleCount();
    expect(initialBundleCount).toBeGreaterThanOrEqual(1);

    // Click delete on the first bundle
    await sidebar.offers.clickFirstDeleteBundle();

    // Confirm deletion
    await modal.waitForModal();
    await modal.confirmDelete();

    // Verify bundle was deleted
    await sidebarPage.waitForTimeout(500);
    const finalBundleCount = await sidebar.offers.getBundleCount();
    expect(finalBundleCount).toBe(initialBundleCount - 1);
  });

  test("should go back to products from offers", async ({ sidebarPage }) => {
    const product = createProductData({
      name: "Nav Product",
      offers: [createOfferData()],
    });
    const session = createSessionData({
      name: "Nav Session",
      products: [product],
    });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Nav Session");
    await sidebar.products.waitForView();
    await sidebar.products.clickProductByName("Nav Product");
    await sidebar.offers.waitForView();

    // Go back
    await sidebar.goBack();

    await sidebar.products.waitForView();
    const newProductButton = sidebarPage.locator(Selectors.products.newProductButton);
    await expect(newProductButton).toBeVisible();
  });
});
