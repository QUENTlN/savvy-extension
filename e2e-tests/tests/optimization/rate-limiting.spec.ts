import { test, expect } from "../../fixtures/extension.fixture";
import { clearStorage } from "../../fixtures/storage.fixture";
import { resetCounters } from "../../fixtures/data.fixture";
import { SidebarPage, ModalHelper } from "../../helpers/sidebar";

/**
 * Tests for UI availability related to optimization.
 * Note: Full optimization testing requires products with offers,
 * which requires scraping functionality that's not testable in E2E.
 */
test.describe("Optimization UI", () => {
  test.beforeEach(async ({ sidebarPage }) => {
    resetCounters();
    await clearStorage(sidebarPage);
  });

  test("should display products view action buttons area", async ({ sidebarPage }) => {
    const sidebar = new SidebarPage(sidebarPage);
    const modal = new ModalHelper(sidebarPage);

    // Create a session
    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickNewSession();
    await modal.waitForModal();
    await sidebarPage.locator("#session-name").fill("UI Test Session");
    await modal.save();
    await sidebarPage.waitForTimeout(300);

    // Navigate to session
    await sidebar.sessions.clickSessionByName("UI Test Session");
    await sidebar.products.waitForView();

    // Create a product
    await sidebar.products.clickNewProduct();
    await modal.waitForModal();
    await sidebarPage.locator("#product-name").fill("Test Product");
    await modal.save();

    await sidebarPage.waitForTimeout(300);

    // Verify products view is functional
    const productNames = await sidebar.products.getProductNames();
    expect(productNames.some((name) => name.includes("Test Product"))).toBe(true);
  });

  test("should handle app state after navigation", async ({ sidebarPage }) => {
    const sidebar = new SidebarPage(sidebarPage);
    const modal = new ModalHelper(sidebarPage);

    // Create session and navigate
    await sidebar.sessions.waitForView();
    await sidebar.sessions.clickNewSession();
    await modal.waitForModal();
    await sidebarPage.locator("#session-name").fill("State Test Session");
    await modal.save();
    await sidebarPage.waitForTimeout(300);

    await sidebar.sessions.clickSessionByName("State Test Session");
    await sidebar.products.waitForView();

    // Go back
    await sidebar.goBack();
    await sidebar.sessions.waitForView();

    // App should still be functional
    const appElement = sidebarPage.locator("#app");
    await expect(appElement).toBeVisible();

    // Should be able to create another session
    await sidebar.sessions.clickNewSession();
    await modal.waitForModal();
    await sidebarPage.locator("#session-name").fill("Another Session");
    await modal.save();

    await sidebarPage.waitForTimeout(300);
    const sessionNames = await sidebar.sessions.getSessionNames();
    expect(sessionNames).toContain("Another Session");
  });
});
