import { test, expect } from "../../fixtures/extension.fixture";
import { seedStorage, clearStorage } from "../../fixtures/storage.fixture";
import {
  createSessionData,
  createProductData,
  createOfferData,
  resetCounters,
} from "../../fixtures/data.fixture";
import { SidebarPage, ModalHelper } from "../../helpers/sidebar";
import { Selectors } from "../../helpers/selectors";

test.describe("Product CRUD operations", () => {
  test.beforeEach(async ({ sidebarPage }) => {
    resetCounters();
    await clearStorage(sidebarPage);
  });

  test("should display empty state when session has no products", async ({ sidebarPage }) => {
    const session = createSessionData({ name: "Empty Session", products: [] });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);
    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Empty Session");

    await sidebar.products.waitForView();
    const productCount = await sidebar.products.getProductCount();
    expect(productCount).toBe(0);

    // New product button should be visible
    const newProductButton = sidebarPage.locator(Selectors.products.newProductButton);
    await expect(newProductButton).toBeVisible();
  });

  test("should create a new product", async ({ sidebarPage }) => {
    const session = createSessionData({ name: "Test Session", products: [] });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);
    const modal = new ModalHelper(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Test Session");
    await sidebar.products.waitForView();

    await sidebar.products.clickNewProduct();

    await modal.waitForModal();

    // Fill in product name using the specific ID
    await sidebarPage.locator("#product-name").fill("New Product");

    // Save the product
    await modal.save();

    // Verify product was created
    await sidebarPage.waitForTimeout(500);
    const productNames = await sidebar.products.getProductNames();
    expect(productNames.some((name) => name.includes("New Product"))).toBe(true);
  });

  test("should navigate to offers when clicking a product", async ({ sidebarPage }) => {
    const session = createSessionData({ name: "Test Session", products: [] });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);
    const modal = new ModalHelper(sidebarPage);

    // First create a product
    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Test Session");
    await sidebar.products.waitForView();

    await sidebar.products.clickNewProduct();
    await modal.waitForModal();
    await sidebarPage.locator("#product-name").fill("Clickable Product");
    await modal.save();

    await sidebarPage.waitForTimeout(300);

    // Now click the product to go to offers
    await sidebar.products.clickProductByName("Clickable Product");

    // Should now be on offers view
    await sidebar.offers.waitForView();
    const title = sidebarPage.locator(Selectors.offers.title);
    await expect(title).toContainText("Clickable Product");
  });

  test("should go back to sessions view", async ({ sidebarPage }) => {
    const session = createSessionData({ name: "Test Session" });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);
    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Test Session");

    await sidebar.products.waitForView();
    await sidebar.goBack();

    await sidebar.sessions.waitForView();
    const newSessionButton = sidebarPage.locator(Selectors.sessions.newSessionButton);
    await expect(newSessionButton).toBeVisible();
  });

  test("should edit a product name", async ({ sidebarPage }) => {
    const product = createProductData({ name: "Original Product" });
    const session = createSessionData({
      name: "Edit Test Session",
      products: [product],
    });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);
    const modal = new ModalHelper(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Edit Test Session");
    await sidebar.products.waitForView();

    // Click edit on the product
    await sidebar.products.editProductByName("Original Product");
    await modal.waitForModal();

    // Clear and fill new name
    const nameInput = sidebarPage.locator("#product-name");
    await nameInput.clear();
    await nameInput.fill("Updated Product");

    await modal.save();

    // Verify name was updated
    await sidebarPage.waitForTimeout(500);
    const productNames = await sidebar.products.getProductNames();
    expect(productNames.some((name) => name.includes("Updated Product"))).toBe(true);
    expect(productNames.some((name) => name.includes("Original Product"))).toBe(false);
  });

  test("should delete a product", async ({ sidebarPage }) => {
    const product = createProductData({
      name: "Product to Delete",
      offers: [createOfferData({ seller: "Some Seller" })],
    });
    const session = createSessionData({
      name: "Delete Test Session",
      products: [product],
    });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);
    const modal = new ModalHelper(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Delete Test Session");
    await sidebar.products.waitForView();

    expect(await sidebar.products.getProductCount()).toBe(1);

    // Click delete on the product
    await sidebar.products.deleteProductByName("Product to Delete");

    // Confirm deletion in modal
    await modal.waitForModal();
    await modal.confirmDelete();

    // Verify product was deleted
    await sidebarPage.waitForTimeout(500);
    expect(await sidebar.products.getProductCount()).toBe(0);
  });
});
