import { test, expect } from "../../fixtures/extension.fixture";
import { clearStorage, seedSettings, getSettings } from "../../fixtures/storage.fixture";
import { resetCounters } from "../../fixtures/data.fixture";
import { SidebarPage, ModalHelper } from "../../helpers/sidebar";
import { Selectors } from "../../helpers/selectors";

test.describe("Settings persistence", () => {
  test.beforeEach(async ({ sidebarPage }) => {
    resetCounters();
    await clearStorage(sidebarPage);
  });

  test("should navigate to settings from sessions view", async ({ sidebarPage }) => {
    const sidebar = new SidebarPage(sidebarPage);
    await sidebar.sessions.waitForView();

    await sidebar.sessions.openSettings();

    await sidebar.settings.waitForView();
    const saveButton = sidebarPage.locator(Selectors.settings.saveButton);
    await expect(saveButton).toBeVisible();
  });

  test("should display default settings", async ({ sidebarPage }) => {
    const sidebar = new SidebarPage(sidebarPage);
    await sidebar.sessions.waitForView();
    await sidebar.sessions.openSettings();

    await sidebar.settings.waitForView();

    // Verify settings elements are present
    const currencySelect = sidebarPage.locator(Selectors.settings.currencySelect);
    const languageSelect = sidebarPage.locator(Selectors.settings.languageSelect);
    const darkModeToggle = sidebarPage.locator(Selectors.settings.darkModeToggle);

    await expect(currencySelect).toBeVisible();
    await expect(languageSelect).toBeVisible();
    await expect(darkModeToggle).toBeVisible();
  });

  test("should change and persist currency setting", async ({ sidebarPage }) => {
    const sidebar = new SidebarPage(sidebarPage);
    await sidebar.sessions.waitForView();
    await sidebar.sessions.openSettings();

    await sidebar.settings.waitForView();

    // Change currency to USD
    await sidebar.settings.selectCurrency("USD");
    await sidebar.settings.save();

    // Reload page to verify persistence
    await sidebarPage.reload();
    await sidebarPage.waitForSelector("#app", { state: "attached" });
    await sidebarPage.waitForTimeout(500);

    // Verify currency is still USD
    const settings = await getSettings(sidebarPage);
    expect(settings.currency).toBe("USD");
  });

  test("should toggle and persist dark mode", async ({ sidebarPage }) => {
    const sidebar = new SidebarPage(sidebarPage);
    await sidebar.sessions.waitForView();
    await sidebar.sessions.openSettings();

    await sidebar.settings.waitForView();

    // Enable dark mode via JavaScript and save
    await sidebarPage.locator("#dark-mode").evaluate((el: HTMLInputElement) => {
      el.checked = true;
    });
    await sidebar.settings.save();

    // Reload and verify persistence
    await sidebarPage.reload();
    await sidebarPage.waitForSelector("#app", { state: "attached" });
    await sidebarPage.waitForTimeout(500);

    const settings = await getSettings(sidebarPage);
    expect(settings.darkMode).toBe(true);
  });

  test("should change and persist language setting", async ({ sidebarPage }) => {
    const sidebar = new SidebarPage(sidebarPage);
    await sidebar.sessions.waitForView();
    await sidebar.sessions.openSettings();

    await sidebar.settings.waitForView();

    // Change language to French (available: en, fr, es)
    await sidebar.settings.selectLanguage("fr");
    await sidebar.settings.save();

    // Reload to verify persistence
    await sidebarPage.reload();
    await sidebarPage.waitForSelector("#app", { state: "attached" });
    await sidebarPage.waitForTimeout(500);

    const settings = await getSettings(sidebarPage);
    expect(settings.language).toBe("fr");
  });

  test("should load seeded settings", async ({ sidebarPage }) => {
    // Pre-seed settings
    await seedSettings(sidebarPage, {
      currency: "GBP",
      darkMode: true,
      language: "en",
    });

    const sidebar = new SidebarPage(sidebarPage);
    await sidebar.sessions.waitForView();
    await sidebar.sessions.openSettings();

    await sidebar.settings.waitForView();

    // Verify seeded settings are loaded
    const settings = await getSettings(sidebarPage);
    expect(settings.currency).toBe("GBP");
    expect(settings.darkMode).toBe(true);
    expect(settings.language).toBe("en");
  });

  test("should go back to sessions from settings", async ({ sidebarPage }) => {
    const sidebar = new SidebarPage(sidebarPage);
    await sidebar.sessions.waitForView();
    await sidebar.sessions.openSettings();

    await sidebar.settings.waitForView();
    await sidebar.goBack();

    await sidebar.sessions.waitForView();
    const newSessionButton = sidebarPage.locator(Selectors.sessions.newSessionButton);
    await expect(newSessionButton).toBeVisible();
  });

  test("should preserve settings when sessions change", async ({ sidebarPage }) => {
    // Set up settings first
    await seedSettings(sidebarPage, {
      currency: "JPY",
      darkMode: false,
      language: "en",
    });

    const sidebar = new SidebarPage(sidebarPage);
    const modal = new ModalHelper(sidebarPage);

    await sidebar.sessions.waitForView();

    // Create a session
    await sidebar.sessions.clickNewSession();
    await modal.waitForModal();
    await sidebarPage.locator("#session-name").fill("Test Session");
    await modal.save();

    await sidebarPage.waitForTimeout(300);

    // Navigate to session
    await sidebar.sessions.clickSessionByName("Test Session");
    await sidebar.products.waitForView();

    // Go back
    await sidebar.goBack();
    await sidebar.sessions.waitForView();

    // Check settings are still there
    const settings = await getSettings(sidebarPage);
    expect(settings.currency).toBe("JPY");
    expect(settings.language).toBe("en");
  });

  test("should handle multiple settings changes at once", async ({ sidebarPage }) => {
    const sidebar = new SidebarPage(sidebarPage);
    await sidebar.sessions.waitForView();
    await sidebar.sessions.openSettings();

    await sidebar.settings.waitForView();

    // Change multiple settings (use available language: es for Spanish)
    await sidebar.settings.selectCurrency("CHF");
    await sidebar.settings.selectLanguage("es");

    const isDark = await sidebar.settings.isDarkModeEnabled();
    if (!isDark) {
      await sidebar.settings.toggleDarkMode();
    }

    await sidebar.settings.save();

    // Verify all changes persisted
    await sidebarPage.reload();
    await sidebarPage.waitForSelector("#app", { state: "attached" });
    await sidebarPage.waitForTimeout(500);

    const settings = await getSettings(sidebarPage);
    expect(settings.currency).toBe("CHF");
    expect(settings.language).toBe("es");
    expect(settings.darkMode).toBe(true);
  });
});
