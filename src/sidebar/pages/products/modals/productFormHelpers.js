import { t } from "../../../../shared/i18n.js";

/**
 * Sets up the compatibility toggle button behavior.
 * @param {boolean} [startExpanded=false] - Whether to start with section expanded
 */
export function setupCompatibilityToggle(startExpanded = false) {
  const toggleBtn = document.getElementById("toggle-compatibility");
  const compatSection = document.getElementById("limited-compatibility-section");

  if (!toggleBtn || !compatSection) return;

  if (startExpanded) {
    compatSection.style.display = "block";
    toggleBtn.innerHTML = `
      <span class="icon icon-up h-4 w-4 mr-1"></span>
      ${t("modals.hideCompatibility")}
    `;
  }

  toggleBtn.addEventListener("click", () => {
    if (compatSection.style.display === "none") {
      compatSection.style.display = "block";
      toggleBtn.innerHTML = `
        <span class="icon icon-up h-4 w-4 mr-1"></span>
        ${t("modals.hideCompatibility")}
      `;
    } else {
      compatSection.style.display = "none";
      toggleBtn.innerHTML = `
        <span class="icon icon-down h-4 w-4 mr-1"></span>
        ${t("modals.showCompatibility")}
      `;
    }
  });
}

/**
 * Collects all form data from the product form.
 * @returns {Object} Product form data
 */
export function collectProductFormData() {
  const name = document.getElementById("product-name").value.trim();
  const quantityInput = document.getElementById("product-quantity");
  const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;

  const weightInput = document.getElementById("product-weight");
  const weight = weightInput ? parseFloat(weightInput.value) || null : null;
  const weightUnit = document.getElementById("product-weight-unit")?.value || null;

  const volumeUnitSelect = document.getElementById("product-volume-unit");
  const volumeUnit = volumeUnitSelect?.value || null;
  const volInput = document.getElementById("product-volume-single");
  const volume = volInput ? parseFloat(volInput.value) || null : null;

  const dimensionUnitSelect = document.getElementById("product-dimension-unit");
  const dimensionUnit = dimensionUnitSelect?.value || null;

  let length = null;
  let width = null;
  let height = null;

  if (dimensionUnit) {
    const lengthInput = document.getElementById("product-dim-length");
    length = lengthInput ? parseFloat(lengthInput.value) || null : null;

    const widthInput = document.getElementById("product-dim-width");
    width = widthInput ? parseFloat(widthInput.value) || null : null;

    const heightInput = document.getElementById("product-dim-height");
    height = heightInput ? parseFloat(heightInput.value) || null : null;
  }

  const limitedCompatibilityWith = [];
  document
    .querySelectorAll("#compatible-products-list input.compat-checkbox:checked")
    .forEach((cb) => {
      if (!cb.disabled) {
        limitedCompatibilityWith.push(cb.value);
      }
    });

  return {
    name,
    quantity,
    weight,
    weightUnit,
    volume,
    volumeUnit,
    length,
    width,
    height,
    dimensionUnit,
    limitedCompatibilityWith,
  };
}

/**
 * Updates bidirectional compatibility links between products.
 * @param {Array} products - All products in the session
 * @param {Object} currentProduct - The product being edited
 * @param {Array} newCompatibleIds - New list of compatible product IDs
 */
export function updateBidirectionalCompatibility(products, currentProduct, newCompatibleIds) {
  products.forEach((other) => {
    if (other.id === currentProduct.id) return;

    other.limitedCompatibilityWith = other.limitedCompatibilityWith || [];
    const shouldInclude = newCompatibleIds.includes(other.id);
    const currentlyHas = other.limitedCompatibilityWith.includes(currentProduct.id);

    if (shouldInclude && !currentlyHas) {
      other.limitedCompatibilityWith.push(currentProduct.id);
    } else if (!shouldInclude && currentlyHas) {
      other.limitedCompatibilityWith = other.limitedCompatibilityWith.filter(
        (x) => x !== currentProduct.id
      );
    }
  });
}
