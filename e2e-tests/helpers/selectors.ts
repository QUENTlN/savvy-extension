/**
 * Centralized UI selectors for the Savvy extension sidebar
 * These match the DOM structure from the View files
 */

export const Selectors = {
  // Common
  app: "#app",
  backButton: "#back-button",

  // Sessions View
  sessions: {
    title: 'h1:has-text("Sessions"), h1:has-text("Projets")',
    newSessionButton: "#new-session-button",
    settingsButton: "#settings-button",
    importButton: "#import-session-button",
    sessionCard: ".session-item",
    sessionCardById: (id: string) => `.session-item[data-id="${id}"]`,
    editButton: ".edit-button",
    deleteButton: ".delete-button",
    exportButton: ".export-button",
    sessionName: ".session-item h2",
  },

  // Products View
  products: {
    title: "h1.card-text",
    newProductButton: "#new-product-button",
    optimizeButton: "#optimize-button",
    viewResultsButton: "#view-results-button",
    historyButton: "#history-button",
    deliveryRulesButton: "#edit-rules-button",
    alternativesButton: "#manage-alternatives-button",
    forwardersButton: "#forwarders-button",
    importFeesButton: "#import-fees-button",
    productCard: ".product-item",
    productCardById: (id: string) => `.product-item[data-id="${id}"]`,
    editButton: ".edit-button",
    deleteButton: ".delete-button",
    productName: ".product-item h2",
    rateLimitIndicator: '.muted-text:has-text("remaining")',
  },

  // Offers View
  offers: {
    title: "h1.card-text",
    addOfferButton: "#add-offer-button",
    offerCard: ".card-bg:has(.edit-offer-button)",
    editOfferButton: ".edit-offer-button",
    deleteOfferButton: ".delete-offer-button",
    openOfferButton: ".open-offer-button",
    bundleCard: ".secondary-bg:has(.edit-bundle-button)",
    editBundleButton: ".edit-bundle-button",
    deleteBundleButton: ".delete-bundle-button",
    noOffersMessage: ':has-text("No offers"), :has-text("Aucune offre")',
  },

  // Delivery Rules View
  deliveryRules: {
    editSellerBtn: ".edit-seller-btn",
    editSellerBtnByName: (seller: string) => `.edit-seller-btn[data-seller="${seller}"]`,
    sellerCard: ".edit-seller-btn",
  },

  // Alternatives View
  alternatives: {
    newGroupButton: "#new-group-button",
    editGroupButton: ".edit-group-button",
    editGroupButtonById: (id: string) => `.edit-group-button[data-id="${id}"]`,
    deleteGroupButton: ".delete-group-button",
    deleteGroupButtonById: (id: string) => `.delete-group-button[data-id="${id}"]`,
    groupItem: ".edit-group-button",
  },

  // Import Fees View
  importFees: {
    defaultVat: "#default-vat",
    addCategoryBtn: "#add-category-btn",
    editCategoryBtn: ".edit-category-btn",
    editCategoryBtnById: (id: string) => `.edit-category-btn[data-id="${id}"]`,
    deleteCategoryBtn: ".delete-category-btn",
    deleteCategoryBtnById: (id: string) => `.delete-category-btn[data-id="${id}"]`,
    saveButton: "#save-import-fees-button",
  },

  // Forwarders View
  forwarders: {
    addForwarderButton: "#add-forwarder-button",
    editForwarderButton: ".edit-forwarder-button",
    editForwarderButtonById: (id: string) => `.edit-forwarder-button[data-id="${id}"]`,
    deleteForwarderButton: ".delete-forwarder-button",
    deleteForwarderButtonById: (id: string) => `.delete-forwarder-button[data-id="${id}"]`,
    forwarderCard: ".edit-forwarder-button",
  },

  // History View
  history: {
    historyItem: ".history-item",
    historyItemByIndex: (index: number) => `.history-item[data-index="${index}"]`,
  },

  // Results View
  results: {
    title: 'h1:has-text("Results"), h1:has-text("Résultats")',
    statusBadge: ".rounded-full",
    totalCostCard: ".primary-bg .text-xl",
    reOptimizeButton: "#re-optimize-button",
    historyButton: "#history-button",
    sellerCard: ".card-bg:has(table)",
    openOfferButton: ".open-offer-button",
  },

  // Settings View
  settings: {
    title: 'h1:has-text("Settings"), h1:has-text("Paramètres")',
    languageSelect: "#language",
    currencySelect: "#currency",
    darkModeToggle: "#dark-mode",
    weightUnitSelect: "#default-weight-unit",
    volumeUnitSelect: "#default-volume-unit",
    dimensionUnitSelect: "#default-dimension-unit",
    distanceUnitSelect: "#default-distance-unit",
    saveButton: "#save-settings-button",
  },

  // Modals
  modal: {
    container: ".modal",
    overlay: "#modalOverlay",
    content: "#modalContent",
    closeButton: "#cancel-button",
    saveButton: "#save-button",
    deleteButton: "#delete-button",
    confirmButton: "#confirm-button, #delete-button",
    // Form fields (scoped to modal)
    nameInput: '.modal input#session-name, .modal input#product-name, .modal input[name="name"]',
    urlInput: '.modal input#url, .modal input[name="url"]',
    priceInput: '.modal input#price, .modal input[name="price"]',
    shippingPriceInput:
      '.modal input#shippingPrice, .modal input#shipping-price, .modal input[name="shippingPrice"]',
    sellerInput: '.modal input#seller, .modal input[name="seller"]',
    quantityInput: '.modal input#quantity, .modal input[name="quantity"]',
  },

  // Toast notifications
  toast: {
    container: '.toast, [role="alert"]',
    success: ".toast-success, .bg-green",
    error: ".toast-error, .bg-red",
  },

  // Loading states
  loading: {
    spinner: ".animate-spin, .loading",
    overlay: ".loading-overlay",
  },
} as const;

/**
 * Helper to construct data-testid selectors
 */
export function testId(id: string): string {
  return `[data-testid="${id}"]`;
}

/**
 * Helper to construct text-based selectors (case-insensitive)
 */
export function hasText(text: string): string {
  return `:has-text("${text}")`;
}

/**
 * Helper to construct exact text match selectors
 */
export function exactText(text: string): string {
  return `text="${text}"`;
}
