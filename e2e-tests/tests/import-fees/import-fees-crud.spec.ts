import { test, expect } from "../../fixtures/extension.fixture";
import { seedStorage, clearStorage } from "../../fixtures/storage.fixture";
import {
  createSessionData,
  createProductData,
  createOfferData,
  createCustomsCategoryData,
  resetCounters,
} from "../../fixtures/data.fixture";
import { SidebarPage, ModalHelper } from "../../helpers/sidebar";
import { Selectors } from "../../helpers/selectors";

test.describe("Import Fees CRUD", () => {
  test.beforeEach(async ({ sidebarPage }) => {
    resetCounters();
    await clearStorage(sidebarPage);
  });

  function createImportFeesSession(
    overrides: { customsCategories?: ReturnType<typeof createCustomsCategoryData>[] } = {}
  ) {
    const product = createProductData({
      name: "Import Product",
      offers: [createOfferData({ seller: "Import Seller" })],
    });
    return createSessionData({
      name: "Import Fees Session",
      products: [product],
      importFeesEnabled: true,
      customsCategories: overrides.customsCategories || [],
    });
  }

  test("should navigate to import fees from products", async ({ sidebarPage }) => {
    const session = createImportFeesSession();

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Import Fees Session");
    await sidebar.products.waitForView();

    // Click import fees button
    await sidebar.products.clickImportFees();
    await sidebar.importFees.waitForView();

    // Default VAT input should be visible
    const vatInput = sidebarPage.locator(Selectors.importFees.defaultVat);
    await expect(vatInput).toBeVisible();
  });

  test("should display default VAT input", async ({ sidebarPage }) => {
    const session = createImportFeesSession();

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Import Fees Session");
    await sidebar.products.waitForView();
    await sidebar.products.clickImportFees();
    await sidebar.importFees.waitForView();

    // Default VAT input should be visible
    const vatInput = sidebarPage.locator(Selectors.importFees.defaultVat);
    await expect(vatInput).toBeVisible();

    // Add category button should be visible
    const addCategoryBtn = sidebarPage.locator(Selectors.importFees.addCategoryBtn);
    await expect(addCategoryBtn).toBeVisible();
  });

  test("should set default VAT rate", async ({ sidebarPage }) => {
    const session = createImportFeesSession();

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Import Fees Session");
    await sidebar.products.waitForView();
    await sidebar.products.clickImportFees();
    await sidebar.importFees.waitForView();

    // Set a default VAT rate
    await sidebar.importFees.setDefaultVAT("20");

    // Save — auto-navigates to products view
    await sidebar.importFees.save();
    await sidebar.products.waitForView();

    // Verify the value persisted by navigating back to import fees
    await sidebar.products.clickImportFees();
    await sidebar.importFees.waitForView();

    const vatValue = await sidebar.importFees.getDefaultVAT();
    expect(vatValue).toBe("20");
  });

  test("should display seeded customs categories", async ({ sidebarPage }) => {
    const category = createCustomsCategoryData({
      name: "Electronics",
      dutyRate: 3.5,
      vatRate: 20,
    });
    const session = createImportFeesSession({ customsCategories: [category] });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Import Fees Session");
    await sidebar.products.waitForView();
    await sidebar.products.clickImportFees();
    await sidebar.importFees.waitForView();

    // Should display 1 category
    const categoryCount = await sidebar.importFees.getCategoryCount();
    expect(categoryCount).toBe(1);

    // Verify category name is displayed
    const pageText = await sidebarPage.textContent("body");
    expect(pageText).toContain("Electronics");
  });

  test("should delete a customs category", async ({ sidebarPage }) => {
    const category = createCustomsCategoryData({
      name: "Category to Delete",
      dutyRate: 5,
      vatRate: 20,
    });
    const session = createImportFeesSession({ customsCategories: [category] });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);
    const modal = new ModalHelper(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Import Fees Session");
    await sidebar.products.waitForView();
    await sidebar.products.clickImportFees();
    await sidebar.importFees.waitForView();

    expect(await sidebar.importFees.getCategoryCount()).toBe(1);

    // Delete the category
    await sidebar.importFees.clickDeleteCategoryByIndex(0);

    // Confirm deletion
    await modal.waitForModal();
    await modal.confirmDelete();

    // Verify category was deleted
    await sidebarPage.waitForTimeout(500);
    expect(await sidebar.importFees.getCategoryCount()).toBe(0);
  });

  test("should go back to products from import fees", async ({ sidebarPage }) => {
    const session = createImportFeesSession();

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Import Fees Session");
    await sidebar.products.waitForView();
    await sidebar.products.clickImportFees();
    await sidebar.importFees.waitForView();

    // Go back
    await sidebar.goBack();

    await sidebar.products.waitForView();
    const newProductButton = sidebarPage.locator(Selectors.products.newProductButton);
    await expect(newProductButton).toBeVisible();
  });
});
