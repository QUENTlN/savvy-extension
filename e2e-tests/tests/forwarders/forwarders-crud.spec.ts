import { test, expect } from "../../fixtures/extension.fixture";
import { seedStorage, clearStorage } from "../../fixtures/storage.fixture";
import {
  createSessionData,
  createProductData,
  createOfferData,
  createForwarderData,
  resetCounters,
} from "../../fixtures/data.fixture";
import { SidebarPage, ModalHelper } from "../../helpers/sidebar";
import { Selectors } from "../../helpers/selectors";

test.describe("Forwarders CRUD", () => {
  test.beforeEach(async ({ sidebarPage }) => {
    resetCounters();
    await clearStorage(sidebarPage);
  });

  function createForwardersSession(
    overrides: { forwarders?: ReturnType<typeof createForwarderData>[] } = {}
  ) {
    const product = createProductData({
      name: "Fwd Product",
      offers: [createOfferData({ seller: "Fwd Seller" })],
    });
    return createSessionData({
      name: "Forwarders Session",
      products: [product],
      forwardersEnabled: true,
      forwarders: overrides.forwarders || [],
    });
  }

  test("should display empty forwarders state", async ({ sidebarPage }) => {
    const session = createForwardersSession();

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Forwarders Session");
    await sidebar.products.waitForView();

    // Click forwarders button
    await sidebar.products.clickForwarders();
    await sidebar.forwarders.waitForView();

    // Add forwarder button should be visible
    const addButton = sidebarPage.locator(Selectors.forwarders.addForwarderButton);
    await expect(addButton).toBeVisible();

    // No forwarders should exist
    const forwarderCount = await sidebar.forwarders.getForwarderCount();
    expect(forwarderCount).toBe(0);
  });

  test("should create a new forwarder", async ({ sidebarPage }) => {
    const session = createForwardersSession();

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);
    const modal = new ModalHelper(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Forwarders Session");
    await sidebar.products.waitForView();
    await sidebar.products.clickForwarders();
    await sidebar.forwarders.waitForView();

    // Click add forwarder
    await sidebar.forwarders.clickAddForwarder();
    await modal.waitForModal();

    // Fill in forwarder name
    const nameInput = sidebarPage.locator("#forwarder-name");
    await nameInput.fill("DHL Express");

    await modal.save();

    // After creation, the UI auto-navigates to the forwarder editor
    // Go back to the forwarders list
    await sidebarPage.waitForTimeout(500);
    await sidebar.goBack();
    await sidebar.forwarders.waitForView();

    // Verify forwarder was created
    const forwarderCount = await sidebar.forwarders.getForwarderCount();
    expect(forwarderCount).toBe(1);

    // Verify the name is displayed
    const pageText = await sidebarPage.textContent("body");
    expect(pageText).toContain("DHL Express");
  });

  test("should display seeded forwarders", async ({ sidebarPage }) => {
    const forwarder1 = createForwarderData({ name: "UPS" });
    const forwarder2 = createForwarderData({ name: "FedEx" });
    const session = createForwardersSession({ forwarders: [forwarder1, forwarder2] });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Forwarders Session");
    await sidebar.products.waitForView();
    await sidebar.products.clickForwarders();
    await sidebar.forwarders.waitForView();

    // Should display 2 forwarders
    const forwarderCount = await sidebar.forwarders.getForwarderCount();
    expect(forwarderCount).toBe(2);

    // Verify names are displayed
    const pageText = await sidebarPage.textContent("body");
    expect(pageText).toContain("UPS");
    expect(pageText).toContain("FedEx");
  });

  test("should delete a forwarder", async ({ sidebarPage }) => {
    const forwarder = createForwarderData({ name: "Forwarder to Delete" });
    const session = createForwardersSession({ forwarders: [forwarder] });

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);
    const modal = new ModalHelper(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Forwarders Session");
    await sidebar.products.waitForView();
    await sidebar.products.clickForwarders();
    await sidebar.forwarders.waitForView();

    expect(await sidebar.forwarders.getForwarderCount()).toBe(1);

    // Delete the forwarder
    await sidebar.forwarders.clickDeleteForwarderByIndex(0);

    // Confirm deletion
    await modal.waitForModal();
    await modal.confirmDelete();

    // Verify forwarder was deleted
    await sidebarPage.waitForTimeout(500);
    expect(await sidebar.forwarders.getForwarderCount()).toBe(0);
  });

  test("should go back to products from forwarders", async ({ sidebarPage }) => {
    const session = createForwardersSession();

    await seedStorage(sidebarPage, {
      sessions: [session],
      currentSession: null,
    });

    const sidebar = new SidebarPage(sidebarPage);

    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickSessionByName("Forwarders Session");
    await sidebar.products.waitForView();
    await sidebar.products.clickForwarders();
    await sidebar.forwarders.waitForView();

    // Go back
    await sidebar.goBack();

    await sidebar.products.waitForView();
    const newProductButton = sidebarPage.locator(Selectors.products.newProductButton);
    await expect(newProductButton).toBeVisible();
  });
});
