import { t } from "../../../../shared/i18n.js";
import { CURRENCIES } from "../../../../shared/config/currencies.js";
import {
  WEIGHT_UNITS,
  VOLUME_UNITS,
  DIMENSION_UNITS,
  DEFAULT_WEIGHT_UNIT,
  DEFAULT_VOLUME_UNIT,
  DEFAULT_DIMENSION_UNIT,
} from "../../../../shared/config/units.js";

/**
 * Renders a unified offer form for both Pages and Bundles.
 *
 * @param {Object} options
 * @param {Object|null} options.offer - Existing page or bundle to edit (null for new)
 * @param {Object} options.session - Session containing products and settings
 * @param {Object|null} options.product - Current product context (for new pages)
 * @param {Object|null} options.scrapedData - Scraped data for pre-filling (new offers)
 * @returns {string} HTML content
 */
export function renderOfferFormView({ offer = null, session, product = null, scrapedData = null }) {
  const isEdit = !!offer;
  const isBundle = isEdit && offer.products && offer.products.length > 0;
  const hasKnownParser = scrapedData?.hasKnownParser;

  // Determine title
  let title;
  if (isEdit) {
    title = isBundle ? t("bundles.editBundle") : t("offers.editPage");
  } else {
    title = t("modals.addOfferFor") + " " + (product?.name || "");
  }

  // Source data for form values
  const data = offer || scrapedData || {};

  // For new offers with scraped data, only use values if parser is known
  const getValue = (field) => {
    if (isEdit) return data[field] || "";
    if (scrapedData && hasKnownParser) return scrapedData[field] || "";
    return "";
  };

  // Currency handling
  const getCurrency = () => {
    if (isEdit) return offer.currency || "";
    if (scrapedData) return scrapedData.currency || "";
    return "";
  };

  return `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
      <div id="modalContent" class="card-bg rounded-lg shadow-lg w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-medium card-text mb-4">${title}</h3>

        ${
          !isEdit && !hasKnownParser
            ? `<p class="text-sm muted-text mb-4">${t("modals.noKnownParser")}</p>`
            : ""
        }

        ${renderBundleToggle(isEdit, isBundle)}

        ${renderProductSelection(session, product, offer, isEdit, isBundle)}

        ${renderUrlField(data.url || "")}

        ${renderPriceFields(getValue)}

        ${renderCurrencyField(getCurrency())}

        ${renderSellerField(getValue("seller"))}

        ${session.importFeesEnabled ? renderCustomsCategoryField(session, data.customsCategoryId) : ""}

        ${session.manageQuantity !== false ? renderQuantityFields(data) : ""}

        ${session.manageWeight ? renderWeightField(data, product, isBundle) : ""}

        ${session.manageVolume ? renderVolumeField(data, product, isBundle) : ""}

        ${session.manageDimension ? renderDimensionField(data, product, isBundle) : ""}

        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 secondary-text font-medium hover:secondary-bg cursor-pointer rounded">${t("common.cancel")}</button>
          <button id="save-button" class="px-4 py-2 primary-bg primary-text font-medium cursor-pointer rounded flex items-center">
            ${t("common.save")}
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderBundleToggle(isEdit, isBundle) {
  // For editing bundles, always show product selection (no toggle needed)
  if (isEdit && isBundle) return "";

  return `
    <div class="mb-6">
      <label class="block text-sm font-medium secondary-text mb-1">${t("modals.isBundle")}</label>
      <div class="flex items-center">
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" id="is-bundle" class="sr-only peer">
          <div class="toggle-switch"></div>
        </label>
      </div>
      <p class="mt-1 text-sm muted-text">${t("modals.bundleExplanation")}</p>
    </div>
  `;
}

function renderProductSelection(session, product, offer, isEdit, isBundle) {
  // Determine which products are checked and their quantities
  const checkedProducts = new Map();

  if (isBundle && offer?.products) {
    // Editing a bundle: use bundle's product list
    offer.products.forEach((bp) => {
      checkedProducts.set(bp.productId, bp.quantity || 1);
    });
  } else if (product) {
    // New offer or editing page: current product is pre-checked
    checkedProducts.set(product.id, 1);
  }

  // Display style: visible for bundles, hidden otherwise (toggle controls)
  const displayStyle = isBundle ? "block" : "none";

  return `
    <div id="product-selection" class="mb-6" style="display: ${displayStyle};">
      <label class="block text-sm font-medium secondary-text mb-2">${t("modals.selectProductsInBundle")}</label>
      <div class="space-y-2">
        ${session.products
          .map((p) => {
            const isChecked = checkedProducts.has(p.id);
            const quantity = checkedProducts.get(p.id) || 1;
            const isCurrentProduct = product && p.id === product.id && !isEdit;

            return `
            <div class="flex items-center space-x-2">
              <input type="checkbox"
                id="product-${p.id}"
                value="${p.id}"
                ${isChecked ? "checked" : ""}
                ${isCurrentProduct ? "disabled" : ""}
                class="bundle-product-checkbox h-4 w-4 accent-primary border-default rounded focus:ring-primary"
              >
              <label for="product-${p.id}" class="flex-1 text-sm secondary-text">${p.name}</label>
              ${
                session.manageQuantity !== false
                  ? `
              <input type="number"
                id="product-qty-${p.id}"
                min="1"
                step="1"
                value="${quantity}"
                class="bundle-product-qty w-20 px-2 py-1 border border-default input-bg card-text rounded text-sm ${isChecked ? "" : "hidden"}"
                placeholder="${t("modals.qtyPlaceholder")}"
              >
              `
                  : ""
              }
            </div>
          `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderUrlField(url) {
  return `
    <div class="mb-6">
      <label for="offer-url" class="block text-sm font-medium secondary-text mb-1">${t("modals.url")}</label>
      <input
        type="text"
        id="offer-url"
        value="${url}"
        readonly
        class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
      >
    </div>
  `;
}

function renderPriceFields(getValue) {
  return `
    <div class="mb-6">
      <label for="offer-price" class="block text-sm font-medium secondary-text mb-1">${t("modals.price")}</label>
      <input
        type="text"
        id="offer-price"
        value="${getValue("price")}"
        placeholder="${t("modals.enterPrice")}"
        class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
      >
    </div>

    <div class="mb-6">
      <label for="offer-shipping" class="block text-sm font-medium secondary-text mb-1">${t("modals.shippingPrice")}</label>
      <input
        type="text"
        id="offer-shipping"
        value="${getValue("shippingPrice")}"
        placeholder="${t("modals.enterShipping")}"
        class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
      >
    </div>

    <div class="mb-6">
      <label for="offer-insurance" class="block text-sm font-medium secondary-text mb-1">${t("modals.insurancePrice")}</label>
      <input
        type="text"
        id="offer-insurance"
        value="${getValue("insurancePrice")}"
        placeholder="${t("modals.enterInsurance")}"
        class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
      >
    </div>
  `;
}

function renderCurrencyField(currency) {
  return `
    <div class="mb-6">
      <label for="offer-currency" class="block text-sm font-medium secondary-text mb-1">${t("modals.currency")}</label>
      <select
        id="offer-currency"
        class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
      >
        ${CURRENCIES.map((c) => `<option value="${c.code}" ${currency === c.code ? "selected" : ""}>${c.label} - ${c.symbol}</option>`).join("")}
      </select>
    </div>
  `;
}

function renderSellerField(seller) {
  return `
    <div class="mb-6">
      <label for="offer-seller" class="block text-sm font-medium secondary-text mb-1">${t("modals.seller")}</label>
      <input
        type="text"
        id="offer-seller"
        value="${seller}"
        placeholder="${t("modals.enterSeller")}"
        class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
      >
    </div>
  `;
}

function renderCustomsCategoryField(session, customsCategoryId) {
  return `
    <div class="mb-6">
      <div class="flex items-center mb-1">
        <label for="customs-category" class="text-sm font-medium secondary-text">${t("modals.customsCategory")}</label>
        <div class="ml-2 icon icon-help w-4 h-4 secondary-text cursor-help" title="${t("modals.howToAddCategory")}"></div>
      </div>
      <select
        id="customs-category"
        class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">${t("modals.noCustomsDuties")}</option>
        ${(session.customsCategories || []).map((cat) => `<option value="${cat.id}" ${customsCategoryId === cat.id ? "selected" : ""}>${cat.name}</option>`).join("")}
      </select>
    </div>
  `;
}

function renderQuantityFields(data) {
  return `
    <div class="mb-6">
      <label for="items-per-purchase" class="block text-sm font-medium secondary-text mb-1">${t("modals.itemsPerPurchase")}</label>
      <input
        type="number"
        id="items-per-purchase"
        value="${data.itemsPerPurchase || 1}"
        min="1"
        step="1"
        class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
      >
      <p class="mt-1 text-sm muted-text">${t("modals.itemsPerPurchaseHelp")}</p>
    </div>

    <div class="mb-6">
      <label for="max-per-purchase" class="block text-sm font-medium secondary-text mb-1">${t("modals.maxPerPurchase")} (${t("modals.optional")})</label>
      <input
        type="number"
        id="max-per-purchase"
        value="${data.maxPerPurchase || ""}"
        min="1"
        step="1"
        placeholder="${t("modals.leaveEmptyIfUnlimited")}"
        class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
      >
      <p class="mt-1 text-sm muted-text">${t("modals.maxPerPurchaseHelp")}</p>
    </div>
  `;
}

function renderWeightField(data, product, isBundle) {
  const placeholder =
    !isBundle && product?.weight ? product.weight + " " + (product.weightUnit || "") : "";

  return `
    <div class="mb-6">
      <label class="block text-sm font-medium secondary-text mb-1">${t("attributes.weight")}</label>
      <div class="flex space-x-2">
        <input
          type="number"
          id="offer-weight"
          value="${data.weight || ""}"
          placeholder="${placeholder}"
          step="0.01"
          min="0"
          class="flex-1 px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
        <select id="offer-weight-unit" class="px-2 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
          ${WEIGHT_UNITS.map((u) => `<option value="${u.value}" ${(data.weightUnit || product?.weightUnit || DEFAULT_WEIGHT_UNIT) === u.value ? "selected" : ""}>${t("attributes.units." + u.value)} (${u.label})</option>`).join("")}
        </select>
      </div>
    </div>
  `;
}

function renderVolumeField(data, product, isBundle) {
  const placeholder =
    !isBundle && product?.volume ? product.volume + " " + (product.volumeUnit || "") : "";

  return `
    <div class="mb-6">
      <label class="block text-sm font-medium secondary-text mb-1">${t("attributes.volume")}</label>
      <div id="offer-volume-input" class="flex space-x-2">
        <input type="number" id="offer-volume-single" value="${data.volume || ""}" placeholder="${placeholder}" step="0.01" min="0" class="flex-1 min-w-0 px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
        <select id="offer-volume-unit" class="max-w-[50%] px-2 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary truncate">
          ${VOLUME_UNITS.map((u) => `<option value="${u.value}" ${(data.volumeUnit || product?.volumeUnit || DEFAULT_VOLUME_UNIT) === u.value ? "selected" : ""}>${t("attributes.units." + u.value)} (${u.label})</option>`).join("")}
        </select>
      </div>
    </div>
  `;
}

function renderDimensionField(data, product, isBundle) {
  const lengthPlaceholder = !isBundle && product?.length ? product.length : "";
  const widthPlaceholder = !isBundle && product?.width ? product.width : "";
  const heightPlaceholder = !isBundle && product?.height ? product.height : "";

  return `
    <div class="mb-6">
      <label class="block text-sm font-medium secondary-text mb-1">${t("attributes.dimension")}</label>
      <select id="offer-dimension-unit" class="w-full px-4 py-2 mb-2 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
        ${DIMENSION_UNITS.map((u) => `<option value="${u.value}" ${(data.dimensionUnit || product?.dimensionUnit || DEFAULT_DIMENSION_UNIT) === u.value ? "selected" : ""}>${t("attributes.units." + u.value)} (${u.label})</option>`).join("")}
      </select>
      <div class="grid grid-cols-3 gap-2">
        <input type="number" id="offer-dim-length" value="${data.length || ""}" placeholder="${lengthPlaceholder}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
        <input type="number" id="offer-dim-width" value="${data.width || ""}" placeholder="${widthPlaceholder}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
        <input type="number" id="offer-dim-height" value="${data.height || ""}" placeholder="${heightPlaceholder}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
      </div>
    </div>
  `;
}
