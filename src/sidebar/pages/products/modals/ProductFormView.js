import { t } from "../../../../shared/i18n.js";
import { WEIGHT_UNITS, VOLUME_UNITS, DIMENSION_UNITS } from "../../../../shared/config/units.js";
import { escapeHTML } from "../../../utils/sanitize.js";

/**
 * Renders a product form view for both creating and editing products.
 *
 * @param {Object} options - Configuration options
 * @param {Object|null} [options.product=null] - Product to edit, or null for new product
 * @param {Object} options.session - Current session
 * @param {Array} [options.products=[]] - List of all products (for compatibility selection)
 * @param {boolean} [options.hasAlternativeGroupWarning=false] - Whether to show alternative group warning
 * @returns {string} HTML string
 */
export function renderProductFormView({
  product = null,
  session,
  products = [],
  hasAlternativeGroupWarning = false,
}) {
  const isEdit = !!product;

  const title = isEdit ? t("products.editProduct") : t("products.newProduct");
  const name = product?.name || "";
  const namePlaceholder = isEdit ? "" : t("modals.enterProductName");
  const quantity = product?.quantity || 1;
  const weight = product?.weight ?? "";
  const volume = product?.volume ?? "";
  const length = product?.length ?? "";
  const width = product?.width ?? "";
  const height = product?.height ?? "";
  const compatHelpKey = isEdit ? "modals.compatibilityHelpEdit" : "modals.compatibilityHelp";

  // For edit, exclude the current product from compatibility list
  const compatibleProducts = isEdit ? products.filter((p) => p.id !== product.id) : products;

  const renderUnitOptions = (units, selectedUnit) => {
    return units
      .map((u) => {
        const selected = selectedUnit === u.value ? "selected" : "";
        return `<option value="${u.value}" ${selected}>${t("attributes.units." + u.value)} (${u.label})</option>`;
      })
      .join("");
  };

  const isCompatChecked = (productId) => {
    if (!isEdit || !product.limitedCompatibilityWith) return false;
    return product.limitedCompatibilityWith.includes(productId);
  };

  return `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
      <div id="modalContent" class="card-bg rounded-lg shadow-lg w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-medium card-text mb-4">${title}</h3>

        <div class="mb-6">
          <label for="product-name" class="block text-sm font-medium secondary-text mb-1">${t("modals.productName")}</label>
          <input
            type="text"
            id="product-name"
            value="${escapeHTML(name)}"
            ${namePlaceholder ? `placeholder="${namePlaceholder}"` : ""}
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
        </div>

        ${
          session.manageQuantity !== false
            ? `
        <div class="mb-6">
          <label for="product-quantity" class="block text-sm font-medium secondary-text mb-1">${t("modals.quantityNeeded")}</label>
          <input
            type="number"
            id="product-quantity"
            value="${quantity}"
            min="1"
            step="1"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
          <p class="mt-1 text-sm muted-text">${t("modals.howManyNeeded")}</p>
        </div>
        `
            : ""
        }

        ${
          session.manageWeight
            ? `
        <div class="mb-6">
          <label class="block text-sm font-medium secondary-text mb-1">${t("attributes.weight")}</label>
          <div class="flex space-x-2">
            <input
              type="number"
              id="product-weight"
              placeholder="${t("attributes.weight")}"
              value="${weight}"
              step="0.01"
              min="0"
              class="flex-1 px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
            <select id="product-weight-unit" class="px-2 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
              ${renderUnitOptions(WEIGHT_UNITS, product?.weightUnit)}
            </select>
          </div>
        </div>
        `
            : ""
        }

        ${
          session.manageVolume
            ? `
        <div class="mb-6">
          <label class="block text-sm font-medium secondary-text mb-1">${t("attributes.volume")}</label>
          <div id="product-volume-input" class="flex space-x-2">
            <input
              type="number"
              id="product-volume-single"
              value="${volume}"
              placeholder="${t("attributes.volume")}"
              step="0.01"
              min="0"
              class="flex-1 min-w-0 px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
            <select id="product-volume-unit" class="max-w-[50%] px-2 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary truncate">
              ${renderUnitOptions(VOLUME_UNITS, product?.volumeUnit)}
            </select>
          </div>
        </div>
        `
            : ""
        }

        ${
          session.manageDimension
            ? `
        <div class="mb-6">
          <label class="block text-sm font-medium secondary-text mb-1">${t("attributes.dimension")}</label>
          <select id="product-dimension-unit" class="w-full px-4 py-2 mb-2 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            ${renderUnitOptions(DIMENSION_UNITS, product?.dimensionUnit)}
          </select>
          <div class="grid grid-cols-3 gap-2">
            <input type="number" id="product-dim-length" value="${length}" placeholder="${t("attributes.length")}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <input type="number" id="product-dim-width" value="${width}" placeholder="${t("attributes.width")}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <input type="number" id="product-dim-height" value="${height}" placeholder="${t("attributes.height")}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
          </div>
        </div>
        `
            : ""
        }

        ${
          hasAlternativeGroupWarning
            ? `
          <div class="mb-6 secondary-bg border border-default rounded-lg p-3">
            <div class="flex">
              <span class="icon icon-warning h-5 w-5 muted-text mr-2 flex-shrink-0"></span>
              <p class="text-sm secondary-text">${t("modals.alternativeGroupWarning")}</p>
            </div>
          </div>
        `
            : ""
        }

        <div class="mb-6">
          <button id="toggle-compatibility" class="text-sm secondary-text hover:opacity-80 font-medium flex items-center cursor-pointer">
            <span class="icon icon-down h-4 w-4 mr-1"></span>
            ${t("modals.showCompatibility")}
          </button>
        </div>

        <div class="mb-6" id="limited-compatibility-section" style="display:none;">
          <label class="block text-sm font-medium secondary-text mb-1">${t("modals.limitedCompatibility")}</label>
          <p class="mt-1 text-sm muted-text">${t(compatHelpKey)}</p>

          <div id="compatible-products-list" class="mt-3 space-y-2" style="max-height:220px; overflow:auto;">
            ${compatibleProducts
              .map(
                (p) => `
              <div class="flex items-center">
                <input type="checkbox" id="compat-${p.id}" value="${p.id}" class="compat-checkbox h-4 w-4 accent-primary border-default rounded focus:ring-primary" ${isCompatChecked(p.id) ? "checked" : ""}>
                <label for="compat-${p.id}" class="ml-2 text-sm secondary-text">${escapeHTML(p.name)}</label>
              </div>
            `
              )
              .join("")}
          </div>
        </div>

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
