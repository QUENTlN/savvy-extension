import type { Page, Locator } from "@playwright/test";
import { Selectors } from "./selectors";

/**
 * Page Object Model for the Savvy sidebar
 * Provides high-level methods for interacting with the extension UI
 */
export class SidebarPage {
  constructor(public readonly page: Page) {}

  // Navigation helpers
  async waitForView(viewIndicator: string): Promise<void> {
    await this.page.waitForSelector(viewIndicator, { state: "visible", timeout: 10000 });
  }

  async goBack(): Promise<void> {
    await this.page.click(Selectors.backButton);
    await this.page.waitForTimeout(300);
  }

  // View accessors
  get sessions(): SessionsView {
    return new SessionsView(this.page);
  }

  get products(): ProductsView {
    return new ProductsView(this.page);
  }

  get offers(): OffersView {
    return new OffersView(this.page);
  }

  get results(): ResultsView {
    return new ResultsView(this.page);
  }

  get settings(): SettingsView {
    return new SettingsView(this.page);
  }

  get deliveryRules(): DeliveryRulesView {
    return new DeliveryRulesView(this.page);
  }

  get alternatives(): AlternativesView {
    return new AlternativesView(this.page);
  }

  get importFees(): ImportFeesView {
    return new ImportFeesView(this.page);
  }

  get forwarders(): ForwardersView {
    return new ForwardersView(this.page);
  }

  get history(): HistoryView {
    return new HistoryView(this.page);
  }
}

/**
 * Sessions list view interactions
 */
export class SessionsView {
  constructor(private page: Page) {}

  async waitForView(): Promise<void> {
    await this.page.waitForSelector(Selectors.sessions.newSessionButton, { state: "visible" });
  }

  async getSessionCards(): Promise<Locator> {
    return this.page.locator(Selectors.sessions.sessionCard);
  }

  async getSessionCount(): Promise<number> {
    return await this.page.locator(Selectors.sessions.sessionCard).count();
  }

  async clickNewSession(): Promise<void> {
    await this.page.click(Selectors.sessions.newSessionButton);
    await this.page.waitForTimeout(200);
  }

  async clickSession(sessionId: string): Promise<void> {
    await this.page.click(`${Selectors.sessions.sessionCardById(sessionId)} .flex-1`);
    await this.page.waitForTimeout(300);
  }

  async clickSessionByName(name: string): Promise<void> {
    await this.page.click(`.session-item:has-text("${name}") .flex-1`);
    await this.page.waitForTimeout(300);
  }

  async editSession(sessionId: string): Promise<void> {
    await this.page.click(
      `${Selectors.sessions.sessionCardById(sessionId)} ${Selectors.sessions.editButton}`
    );
    await this.page.waitForTimeout(200);
  }

  async editSessionByName(name: string): Promise<void> {
    await this.page.click(`.session-item:has-text("${name}") .edit-button`);
    await this.page.waitForTimeout(200);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.page.click(
      `${Selectors.sessions.sessionCardById(sessionId)} ${Selectors.sessions.deleteButton}`
    );
    await this.page.waitForTimeout(200);
  }

  async deleteSessionByName(name: string): Promise<void> {
    await this.page.click(`.session-item:has-text("${name}") .delete-button`);
    await this.page.waitForTimeout(200);
  }

  async openSettings(): Promise<void> {
    await this.page.click(Selectors.sessions.settingsButton);
    await this.page.waitForTimeout(300);
  }

  async getSessionNames(): Promise<string[]> {
    const names = await this.page.locator(Selectors.sessions.sessionName).allTextContents();
    return names;
  }
}

/**
 * Products list view interactions
 */
export class ProductsView {
  constructor(private page: Page) {}

  async waitForView(): Promise<void> {
    await this.page.waitForSelector(Selectors.products.newProductButton, { state: "visible" });
  }

  async getProductCards(): Promise<Locator> {
    return this.page.locator(Selectors.products.productCard);
  }

  async getProductCount(): Promise<number> {
    return await this.page.locator(Selectors.products.productCard).count();
  }

  async clickNewProduct(): Promise<void> {
    await this.page.click(Selectors.products.newProductButton);
    await this.page.waitForTimeout(200);
  }

  async clickProduct(productId: string): Promise<void> {
    await this.page.click(`${Selectors.products.productCardById(productId)} .flex-1`);
    await this.page.waitForTimeout(300);
  }

  async clickProductByName(name: string): Promise<void> {
    await this.page.click(`.product-item:has-text("${name}") .flex-1`);
    await this.page.waitForTimeout(300);
  }

  async editProduct(productId: string): Promise<void> {
    await this.page.click(
      `${Selectors.products.productCardById(productId)} ${Selectors.products.editButton}`
    );
    await this.page.waitForTimeout(200);
  }

  async editProductByName(name: string): Promise<void> {
    await this.page.click(`.product-item:has-text("${name}") .edit-button`);
    await this.page.waitForTimeout(200);
  }

  async deleteProduct(productId: string): Promise<void> {
    await this.page.click(
      `${Selectors.products.productCardById(productId)} ${Selectors.products.deleteButton}`
    );
    await this.page.waitForTimeout(200);
  }

  async deleteProductByName(name: string): Promise<void> {
    await this.page.click(`.product-item:has-text("${name}") .delete-button`);
    await this.page.waitForTimeout(200);
  }

  async clickOptimize(): Promise<void> {
    await this.page.click(Selectors.products.optimizeButton);
    await this.page.waitForTimeout(300);
  }

  async clickViewResults(): Promise<void> {
    await this.page.click(Selectors.products.viewResultsButton);
    await this.page.waitForTimeout(300);
  }

  async isOptimizeButtonVisible(): Promise<boolean> {
    return await this.page.locator(Selectors.products.optimizeButton).isVisible();
  }

  async isViewResultsButtonVisible(): Promise<boolean> {
    return await this.page.locator(Selectors.products.viewResultsButton).isVisible();
  }

  async getProductNames(): Promise<string[]> {
    const cards = this.page.locator(Selectors.products.productCard);
    const names: string[] = [];
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      const name = await cards.nth(i).locator("h2").textContent();
      if (name) names.push(name.trim());
    }
    return names;
  }

  async clickDeliveryRules(): Promise<void> {
    await this.page.click(Selectors.products.deliveryRulesButton);
    await this.page.waitForTimeout(300);
  }

  async clickAlternatives(): Promise<void> {
    await this.page.click(Selectors.products.alternativesButton);
    await this.page.waitForTimeout(300);
  }

  async clickImportFees(): Promise<void> {
    await this.page.click(Selectors.products.importFeesButton);
    await this.page.waitForTimeout(300);
  }

  async clickForwarders(): Promise<void> {
    await this.page.click(Selectors.products.forwardersButton);
    await this.page.waitForTimeout(300);
  }

  async clickHistory(): Promise<void> {
    await this.page.click(Selectors.products.historyButton);
    await this.page.waitForTimeout(300);
  }
}

/**
 * Offers list view interactions
 */
export class OffersView {
  constructor(private page: Page) {}

  async waitForView(): Promise<void> {
    await this.page.waitForSelector(Selectors.offers.addOfferButton, { state: "visible" });
  }

  async getOfferCount(): Promise<number> {
    return await this.page.locator(Selectors.offers.offerCard).count();
  }

  async getBundleCount(): Promise<number> {
    return await this.page.locator(Selectors.offers.bundleCard).count();
  }

  async clickAddOffer(): Promise<void> {
    await this.page.click(Selectors.offers.addOfferButton);
    await this.page.waitForTimeout(200);
  }

  async editOffer(offerId: string): Promise<void> {
    await this.page.click(`${Selectors.offers.editOfferButton}[data-id="${offerId}"]`);
    await this.page.waitForTimeout(200);
  }

  async deleteOffer(offerId: string): Promise<void> {
    await this.page.click(`${Selectors.offers.deleteOfferButton}[data-id="${offerId}"]`);
    await this.page.waitForTimeout(200);
  }

  async clickFirstEditOffer(): Promise<void> {
    await this.page.locator(Selectors.offers.editOfferButton).first().click();
    await this.page.waitForTimeout(200);
  }

  async clickFirstDeleteOffer(): Promise<void> {
    await this.page.locator(Selectors.offers.deleteOfferButton).first().click();
    await this.page.waitForTimeout(200);
  }

  async clickFirstDeleteBundle(): Promise<void> {
    await this.page.locator(Selectors.offers.deleteBundleButton).first().click();
    await this.page.waitForTimeout(200);
  }

  async hasNoOffersMessage(): Promise<boolean> {
    const noOffers = this.page.locator(
      '.card-bg:has-text("No offers"), .card-bg:has-text("Aucune offre")'
    );
    return await noOffers.isVisible();
  }

  async getOfferSellers(): Promise<string[]> {
    const sellers = await this.page
      .locator(`${Selectors.offers.offerCard} .text-lg.font-medium`)
      .allTextContents();
    return sellers;
  }
}

/**
 * Delivery Rules view interactions
 */
export class DeliveryRulesView {
  constructor(private page: Page) {}

  async waitForView(): Promise<void> {
    // Wait for the delivery rules view by checking for back button and seller cards or empty state
    await this.page.waitForSelector(Selectors.backButton, { state: "visible", timeout: 10000 });
    await this.page.waitForTimeout(300);
  }

  async getSellerCount(): Promise<number> {
    return await this.page.locator(Selectors.deliveryRules.sellerCard).count();
  }

  async getSellerNames(): Promise<string[]> {
    const buttons = this.page.locator(Selectors.deliveryRules.sellerCard);
    const names: string[] = [];
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const name = await buttons.nth(i).getAttribute("data-seller");
      if (name) names.push(name);
    }
    return names;
  }

  async clickEditSeller(seller: string): Promise<void> {
    await this.page.click(Selectors.deliveryRules.editSellerBtnByName(seller));
    await this.page.waitForTimeout(300);
  }
}

/**
 * Alternatives view interactions
 */
export class AlternativesView {
  constructor(private page: Page) {}

  async waitForView(): Promise<void> {
    await this.page.waitForSelector(Selectors.alternatives.newGroupButton, {
      state: "visible",
      timeout: 10000,
    });
  }

  async getGroupCount(): Promise<number> {
    return await this.page.locator(Selectors.alternatives.groupItem).count();
  }

  async clickNewGroup(): Promise<void> {
    await this.page.click(Selectors.alternatives.newGroupButton);
    await this.page.waitForTimeout(200);
  }

  async deleteGroupByIndex(index: number): Promise<void> {
    await this.page.locator(Selectors.alternatives.deleteGroupButton).nth(index).click();
    await this.page.waitForTimeout(200);
  }
}

/**
 * Import Fees view interactions
 */
export class ImportFeesView {
  constructor(private page: Page) {}

  async waitForView(): Promise<void> {
    await this.page.waitForSelector(Selectors.importFees.defaultVat, {
      state: "visible",
      timeout: 10000,
    });
  }

  async getDefaultVAT(): Promise<string> {
    return await this.page.inputValue(Selectors.importFees.defaultVat);
  }

  async setDefaultVAT(value: string): Promise<void> {
    await this.page.locator(Selectors.importFees.defaultVat).fill(value);
  }

  async clickAddCategory(): Promise<void> {
    await this.page.click(Selectors.importFees.addCategoryBtn);
    await this.page.waitForTimeout(200);
  }

  async getCategoryCount(): Promise<number> {
    return await this.page.locator(Selectors.importFees.editCategoryBtn).count();
  }

  async clickDeleteCategoryByIndex(index: number): Promise<void> {
    await this.page.locator(Selectors.importFees.deleteCategoryBtn).nth(index).click();
    await this.page.waitForTimeout(200);
  }

  async save(): Promise<void> {
    await this.page.click(Selectors.importFees.saveButton);
    await this.page.waitForTimeout(300);
  }
}

/**
 * Forwarders view interactions
 */
export class ForwardersView {
  constructor(private page: Page) {}

  async waitForView(): Promise<void> {
    await this.page.waitForSelector(Selectors.forwarders.addForwarderButton, {
      state: "visible",
      timeout: 10000,
    });
  }

  async getForwarderCount(): Promise<number> {
    return await this.page.locator(Selectors.forwarders.forwarderCard).count();
  }

  async clickAddForwarder(): Promise<void> {
    await this.page.click(Selectors.forwarders.addForwarderButton);
    await this.page.waitForTimeout(200);
  }

  async clickDeleteForwarderByIndex(index: number): Promise<void> {
    await this.page.locator(Selectors.forwarders.deleteForwarderButton).nth(index).click();
    await this.page.waitForTimeout(200);
  }
}

/**
 * History view interactions
 */
export class HistoryView {
  constructor(private page: Page) {}

  async waitForView(): Promise<void> {
    await this.page.waitForSelector(Selectors.backButton, { state: "visible", timeout: 10000 });
    await this.page.waitForTimeout(300);
  }

  async getHistoryCount(): Promise<number> {
    return await this.page.locator(Selectors.history.historyItem).count();
  }

  async clickHistoryItem(index: number): Promise<void> {
    await this.page.locator(Selectors.history.historyItem).nth(index).click();
    await this.page.waitForTimeout(300);
  }
}

/**
 * Results view interactions
 */
export class ResultsView {
  constructor(private page: Page) {}

  async waitForView(): Promise<void> {
    await this.page.waitForSelector(Selectors.results.reOptimizeButton, { state: "visible" });
  }

  async getStatus(): Promise<string> {
    const badge = this.page.locator(Selectors.results.statusBadge).first();
    return (await badge.textContent()) || "";
  }

  async getTotalCost(): Promise<string> {
    const total = this.page.locator(Selectors.results.totalCostCard).first();
    return (await total.textContent()) || "";
  }

  async clickReOptimize(): Promise<void> {
    await this.page.click(Selectors.results.reOptimizeButton);
    await this.page.waitForTimeout(300);
  }

  async getSellerNames(): Promise<string[]> {
    const names = await this.page.locator(`${Selectors.results.sellerCard} h2`).allTextContents();
    return names;
  }

  async clickHistory(): Promise<void> {
    await this.page.click(Selectors.results.historyButton);
    await this.page.waitForTimeout(300);
  }
}

/**
 * Settings view interactions
 */
export class SettingsView {
  constructor(private page: Page) {}

  async waitForView(): Promise<void> {
    await this.page.waitForSelector(Selectors.settings.saveButton, { state: "visible" });
  }

  async selectLanguage(languageCode: string): Promise<void> {
    await this.page.selectOption(Selectors.settings.languageSelect, languageCode);
  }

  async selectCurrency(currencyCode: string): Promise<void> {
    await this.page.selectOption(Selectors.settings.currencySelect, currencyCode);
  }

  async toggleDarkMode(): Promise<void> {
    // The checkbox has sr-only class (visually hidden) so use JavaScript to toggle it
    await this.page.locator(Selectors.settings.darkModeToggle).evaluate((el: HTMLInputElement) => {
      el.click();
    });
  }

  async isDarkModeEnabled(): Promise<boolean> {
    // The checkbox may be hidden, so use evaluate to get its checked state
    return await this.page
      .locator(Selectors.settings.darkModeToggle)
      .evaluate((el: HTMLInputElement) => el.checked);
  }

  async getSelectedCurrency(): Promise<string> {
    return await this.page.inputValue(Selectors.settings.currencySelect);
  }

  async getSelectedLanguage(): Promise<string> {
    return await this.page.inputValue(Selectors.settings.languageSelect);
  }

  async save(): Promise<void> {
    await this.page.click(Selectors.settings.saveButton);
    await this.page.waitForTimeout(500);
  }
}

/**
 * Modal interaction helpers
 */
export class ModalHelper {
  constructor(private page: Page) {}

  async waitForModal(): Promise<void> {
    // Wait for the modal overlay to be visible (the overlay has fixed positioning)
    await this.page.waitForSelector("#modalOverlay", { state: "visible", timeout: 10000 });
    // Wait for modal content to be visible
    await this.page.waitForSelector("#modalContent", { state: "visible", timeout: 5000 });
  }

  async isVisible(): Promise<boolean> {
    return await this.page.locator("#modalOverlay").isVisible();
  }

  async close(): Promise<void> {
    const closeBtn = this.page.locator("#cancel-button");
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      // Fallback: press Escape
      await this.page.keyboard.press("Escape");
    }
    await this.page.waitForSelector("#modalOverlay", { state: "hidden" }).catch(() => {});
    await this.page.waitForTimeout(200);
  }

  async save(): Promise<void> {
    await this.page.locator("#save-button").click();
    // Wait for modal to close
    await this.page.waitForSelector("#modalOverlay", { state: "hidden" }).catch(() => {});
    await this.page.waitForTimeout(300);
  }

  async confirmDelete(): Promise<void> {
    // Try delete button first, then confirm button
    const deleteBtn = this.page.locator("#delete-button");
    const confirmBtn = this.page.locator("#confirm-button");

    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
    } else if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    } else {
      // Some modals use save-button for confirmation
      await this.page.locator("#save-button").click();
    }

    // Wait for modal to close
    await this.page.waitForSelector("#modalOverlay", { state: "hidden" }).catch(() => {});
    await this.page.waitForTimeout(300);
  }

  async fillName(name: string): Promise<void> {
    // Find the first visible input for name
    const nameInputs = [
      ".modal input#session-name",
      ".modal input#product-name",
      '.modal input[name="name"]',
      '.modal input[type="text"]:first-of-type',
    ];

    for (const selector of nameInputs) {
      const input = this.page.locator(selector).first();
      if (await input.isVisible().catch(() => false)) {
        await input.fill(name);
        return;
      }
    }

    // Fallback: use first text input in modal
    await this.page.locator('.modal input[type="text"]').first().fill(name);
  }

  async fillUrl(url: string): Promise<void> {
    const urlInput = this.page
      .locator('.modal input#url, .modal input[name="url"], .modal input[type="url"]')
      .first();
    await urlInput.fill(url);
  }

  async fillPrice(price: string): Promise<void> {
    const priceInput = this.page.locator('.modal input#price, .modal input[name="price"]').first();
    await priceInput.fill(price);
  }

  async fillShippingPrice(price: string): Promise<void> {
    const shippingInput = this.page
      .locator(
        '.modal input#shippingPrice, .modal input#shipping-price, .modal input[name="shippingPrice"]'
      )
      .first();
    await shippingInput.fill(price);
  }

  async fillSeller(seller: string): Promise<void> {
    const sellerInput = this.page
      .locator('.modal input#seller, .modal input[name="seller"]')
      .first();
    await sellerInput.fill(seller);
  }

  async fillQuantity(quantity: string): Promise<void> {
    const qtyInput = this.page
      .locator('.modal input#quantity, .modal input[name="quantity"]')
      .first();
    await qtyInput.fill(quantity);
  }
}
