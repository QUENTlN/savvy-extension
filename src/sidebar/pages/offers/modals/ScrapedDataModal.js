import { renderOfferFormView } from "./OfferFormView.js";
import {
  collectOfferFormData,
  setupBundleToggle,
  setupProductSelection,
  shouldSaveAsBundle,
  getSelectedProductId,
  validateOfferForm,
} from "./offerFormHelpers.js";
import * as actions from "../OffersActions.js";
import { Store } from "../../../state.js";
import { createModal } from "../../../utils/index.js";

/**
 * Shows a modal to create a new Offer or Bundle from scraped data.
 *
 * @param {Object} session - Session containing products and settings
 * @param {Object} product - Current product for which to create the offer
 * @param {Object} scrapedData - Scraped data from the content script
 */
export function showScrapedDataModal(session, product, scrapedData) {
  const { modal } = createModal(
    renderOfferFormView({ offer: null, session, product, scrapedData }),
    {
      onSave: () => saveOffer(modal, session, product),
      onClose: () => actions.clearScrapedData(),
    }
  );

  // Setup toggle and product selection
  setupBundleToggle(modal);
  setupProductSelection(modal);
}

async function saveOffer(modal, session, product) {
  // Validate form
  if (!validateOfferForm(modal, session)) {
    return false;
  }

  // Collect form data
  const formData = collectOfferFormData(session);
  const shouldBeBundle = shouldSaveAsBundle();

  // Build the data object for save
  const saveData = buildSaveData(formData, session);

  const sessionId = Store.state.currentSession;

  if (shouldBeBundle) {
    // Create as bundle (2+ products)
    saveData.products = formData.products;
    await actions.createBundle(sessionId, saveData);
  } else {
    // Create as offer (1 product)
    const targetProductId = getSelectedProductId() || product.id;
    await actions.createOffer(sessionId, targetProductId, saveData);
  }

  actions.clearScrapedData();
  return true;
}

function buildSaveData(formData, session) {
  const data = {
    url: formData.url,
    price: formData.price,
    shippingPrice: formData.shippingPrice,
    insurancePrice: formData.insurancePrice,
    currency: formData.currency,
    seller: formData.seller,
  };

  if (formData.customsCategoryId) {
    data.customsCategoryId = formData.customsCategoryId;
  }

  if (session.manageQuantity !== false) {
    data.itemsPerPurchase = formData.itemsPerPurchase;
    if (formData.maxPerPurchase) {
      data.maxPerPurchase = formData.maxPerPurchase;
    }
  }

  if (formData.weight) {
    data.weight = formData.weight;
    data.weightUnit = formData.weightUnit;
  }

  if (formData.volume) {
    data.volume = formData.volume;
    data.volumeUnit = formData.volumeUnit;
  }

  if (formData.length || formData.width || formData.height) {
    if (formData.length) data.length = formData.length;
    if (formData.width) data.width = formData.width;
    if (formData.height) data.height = formData.height;
    data.dimensionUnit = formData.dimensionUnit;
  }

  if (formData.distance) {
    data.distance = formData.distance;
    data.distanceUnit = formData.distanceUnit;
  }

  return data;
}
