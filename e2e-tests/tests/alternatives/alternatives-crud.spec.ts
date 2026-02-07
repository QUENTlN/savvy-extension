import { test, expect } from "../../fixtures/extension.fixture";
import { seedStorage, clearStorage } from "../../fixtures/storage.fixture";
import {
  createSessionData,
  createProductData,
  createOfferData,
  createAlternativeGroupData,
  resetCounters,
} from "../../fixtures/data.fixture";
import { SidebarPage, ModalHelper } from "../../helpers/sidebar";
import { Selectors } from "../../helpers/selectors";

test.describe("Alternatives CRUD", () => {
  test.beforeEach(async ({ sidebarPage }) => {
    resetCounters();
    await clearStorage(sidebarPage);
  });

  function createSessionWithProducts() {
    const product1 = createProductData({
      name: "Alt Product A",
      offers: [createOfferData({ seller: "Seller A" })],
    });
    const product2 = createProductData({
      name: "Alt Product B",
      offers: [createOfferData({ seller: "Seller B" })],
    });
    return createSessionData({
      name: "Alternatives Session",
      products: [product1, product2],
    });
  }

  test("should navigate to alternatives from products", async ({ sidebarPage }) => {
    const session = createSessionWithProducts();

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Alternatives Session");
    await sidebar.products.waitForView();

    // Click alternatives button
    await sidebar.products.clickAlternatives();
    await sidebar.alternatives.waitForView();

    // New group button should be visible
    const newGroupButton = sidebarPage.locator(Selectors.alternatives.newGroupButton);
    await expect(newGroupButton).toBeVisible();
  });

  test("should display empty state when no groups exist", async ({ sidebarPage }) => {
    const session = createSessionWithProducts();

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Alternatives Session");
    await sidebar.products.waitForView();
    await sidebar.products.clickAlternatives();
    await sidebar.alternatives.waitForView();

    // No groups should exist
    const groupCount = await sidebar.alternatives.getGroupCount();
    expect(groupCount).toBe(0);
  });

  test("should display seeded alternative groups", async ({ sidebarPage }) => {
    const session = createSessionWithProducts();

    // Add alternative groups
    const group = createAlternativeGroupData({
      name: "Seeded Group",
      options: [
        { products: [{ productId: session.products[0].id, quantity: 1 }] },
        { products: [{ productId: session.products[1].id, quantity: 1 }] },
      ],
    });
    session.alternativeGroups = [group];

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Alternatives Session");
    await sidebar.products.waitForView();
    await sidebar.products.clickAlternatives();
    await sidebar.alternatives.waitForView();

    // Should display the seeded group
    const groupCount = await sidebar.alternatives.getGroupCount();
    expect(groupCount).toBe(1);

    // Verify the group name is displayed
    const pageText = await sidebarPage.textContent("body");
    expect(pageText).toContain("Seeded Group");
  });

  test("should delete an alternative group", async ({ sidebarPage }) => {
    const session = createSessionWithProducts();

    const group = createAlternativeGroupData({
      name: "Group to Delete",
      options: [
        { products: [{ productId: session.products[0].id, quantity: 1 }] },
        { products: [{ productId: session.products[1].id, quantity: 1 }] },
      ],
    });
    session.alternativeGroups = [group];

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);
    const modal = new ModalHelper(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Alternatives Session");
    await sidebar.products.waitForView();
    await sidebar.products.clickAlternatives();
    await sidebar.alternatives.waitForView();

    expect(await sidebar.alternatives.getGroupCount()).toBe(1);

    // Delete the group
    await sidebar.alternatives.deleteGroupByIndex(0);

    // Confirm deletion
    await modal.waitForModal();
    await modal.confirmDelete();

    // Verify group was deleted
    await sidebarPage.waitForTimeout(500);
    expect(await sidebar.alternatives.getGroupCount()).toBe(0);
  });

  test("should go back to products from alternatives", async ({ sidebarPage }) => {
    const session = createSessionWithProducts();

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Alternatives Session");
    await sidebar.products.waitForView();
    await sidebar.products.clickAlternatives();
    await sidebar.alternatives.waitForView();

    // Go back
    await sidebar.goBack();

    await sidebar.products.waitForView();
    const newProductButton = sidebarPage.locator(Selectors.products.newProductButton);
    await expect(newProductButton).toBeVisible();
  });
});
