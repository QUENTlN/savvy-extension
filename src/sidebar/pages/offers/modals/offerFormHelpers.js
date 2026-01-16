import { t } from '../../../../shared/i18n.js'
import { validateRequiredField, clearAllErrors, showFieldError } from '../../../modals.js'
import { showToast } from '../../../utils/toast.js'

// Helper to parse price: empty → 0, invalid non-empty → null (error)
function parsePrice(str) {
  if (str === '') return 0
  // Allow comma as decimal separator
  const normalized = str.replace(',', '.')
  // Check if it's a valid number format (digits, optional decimal point, digits)
  if (!/^-?\d*\.?\d+$/.test(normalized)) {
    return null // Invalid format
  }
  const val = parseFloat(normalized)
  return Number.isFinite(val) ? val : null
}

/**
 * Validates a price field value. Returns true if valid, false if invalid.
 * Empty values are valid (will be converted to 0).
 */
export function validatePriceField(value) {
  return parsePrice(value.trim()) !== null
}

/**
 * Collects and returns all form data from the offer form.
 *
 * @param {Object} session - Session with settings
 * @returns {Object} Form data including products array
 */
export function collectOfferFormData(session) {
  const url = document.getElementById("offer-url").value.trim()
  const priceStr = document.getElementById("offer-price").value.trim()
  const shippingStr = document.getElementById("offer-shipping").value.trim()
  const insuranceStr = document.getElementById("offer-insurance").value.trim()
  const currency = document.getElementById("offer-currency").value
  const seller = document.getElementById("offer-seller").value.trim()

  // Parse prices - empty/invalid values become 0
  const price = parsePrice(priceStr)
  const shippingPrice = parsePrice(shippingStr)
  const insurancePrice = parsePrice(insuranceStr)

  // Build base data
  const data = {
    url,
    price,
    shippingPrice,
    insurancePrice,
    currency: currency,
    seller,
  }

  // Collect selected products
  const products = []
  document.querySelectorAll(".bundle-product-checkbox:checked").forEach(checkbox => {
    const productId = checkbox.value
    const qtyInput = document.getElementById(`product-qty-${productId}`)
    const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1
    products.push({ productId, quantity })
  })
  data.products = products

  // Customs category
  const customsCategoryEl = document.getElementById("customs-category")
  if (customsCategoryEl) {
    data.customsCategoryId = customsCategoryEl.value || null
  }

  // Quantity fields
  if (session.manageQuantity !== false) {
    const itemsPerPurchase = parseInt(document.getElementById("items-per-purchase")?.value) || 1
    const maxPerPurchase = parseInt(document.getElementById("max-per-purchase")?.value) || null
    data.itemsPerPurchase = itemsPerPurchase
    data.maxPerPurchase = maxPerPurchase
  }

  // Weight
  if (session.manageWeight) {
    const weight = parseFloat(document.getElementById("offer-weight")?.value)
    const weightUnit = document.getElementById("offer-weight-unit")?.value
    if (!isNaN(weight) && weight > 0) {
      data.weight = weight
      data.weightUnit = weightUnit
    }
  }

  // Volume
  if (session.manageVolume) {
    const volume = parseFloat(document.getElementById("offer-volume-single")?.value)
    const volumeUnit = document.getElementById("offer-volume-unit")?.value
    if (!isNaN(volume) && volume > 0) {
      data.volume = volume
      data.volumeUnit = volumeUnit
    }
  }

  // Dimension
  if (session.manageDimension) {
    const length = parseFloat(document.getElementById("offer-dim-length")?.value)
    const width = parseFloat(document.getElementById("offer-dim-width")?.value)
    const height = parseFloat(document.getElementById("offer-dim-height")?.value)
    const dimensionUnit = document.getElementById("offer-dimension-unit")?.value
    if (!isNaN(length) && length > 0) data.length = length
    if (!isNaN(width) && width > 0) data.width = width
    if (!isNaN(height) && height > 0) data.height = height
    if (data.length || data.width || data.height) {
      data.dimensionUnit = dimensionUnit
    }
  }

  // Distance
  if (session.manageDistance) {
    const distance = parseFloat(document.getElementById("offer-distance")?.value)
    const distanceUnit = document.getElementById("offer-distance-unit")?.value
    if (!isNaN(distance) && distance > 0) {
      data.distance = distance
      data.distanceUnit = distanceUnit
    }
  }

  return data
}

/**
 * Validates the offer form and returns true if valid.
 *
 * @param {HTMLElement} modal - Modal element for error display
 * @param {Object} session - Session with settings
 * @returns {boolean} True if form is valid
 */
export function validateOfferForm(modal, session) {
  clearAllErrors(modal)

  // URL is required
  if (!validateRequiredField('offer-url', t("modals.url"))) return false

  // Price is required
  if (!validateRequiredField('offer-price', t("modals.price"))) return false

  // Validate price formats (non-empty invalid values)
  const priceStr = document.getElementById("offer-price").value.trim()
  const shippingStr = document.getElementById("offer-shipping").value.trim()
  const insuranceStr = document.getElementById("offer-insurance").value.trim()

  if (parsePrice(priceStr) === null) {
    showFieldError('offer-price', t("modals.invalidNumber"))
    return false
  }
  if (parsePrice(shippingStr) === null) {
    showFieldError('offer-shipping', t("modals.invalidNumber"))
    return false
  }
  if (parsePrice(insuranceStr) === null) {
    showFieldError('offer-insurance', t("modals.invalidNumber"))
    return false
  }

  // Check product selection if in bundle mode
  const isBundleToggle = document.getElementById("is-bundle")
  const productSelection = document.getElementById("product-selection")

  if (productSelection && productSelection.style.display !== 'none') {
    const checkedProducts = document.querySelectorAll(".bundle-product-checkbox:checked")
    if (checkedProducts.length === 0) {
      showToast(t("modals.selectAtLeastOneProduct"), { type: 'error' })
      return false
    }
  }

  return true
}

/**
 * Sets up the bundle toggle to show/hide product selection.
 *
 * @param {HTMLElement} modal - Modal element
 */
export function setupBundleToggle(modal) {
  const bundleCheckbox = modal.querySelector("#is-bundle")
  const productSelection = modal.querySelector("#product-selection")

  if (bundleCheckbox && productSelection) {
    bundleCheckbox.addEventListener("change", () => {
      productSelection.style.display = bundleCheckbox.checked ? "block" : "none"
    })
  }
}

/**
 * Sets up product checkboxes to show/hide quantity inputs.
 *
 * @param {HTMLElement} modal - Modal element
 */
export function setupProductSelection(modal) {
  modal.querySelectorAll(".bundle-product-checkbox").forEach(checkbox => {
    checkbox.addEventListener("change", () => {
      const qtyInput = document.getElementById(`product-qty-${checkbox.value}`)
      if (qtyInput) {
        qtyInput.classList.toggle("hidden", !checkbox.checked)
      }
    })
  })
}

/**
 * Determines if the form should save as a bundle based on selected products.
 *
 * @returns {boolean} True if 2+ products are selected (bundle), false for single product (page)
 */
export function shouldSaveAsBundle() {
  const checkedProducts = document.querySelectorAll(".bundle-product-checkbox:checked")
  return checkedProducts.length >= 2
}

/**
 * Gets the single selected product ID (for page mode).
 *
 * @returns {string|null} Product ID or null if multiple/none selected
 */
export function getSelectedProductId() {
  const checkedProducts = document.querySelectorAll(".bundle-product-checkbox:checked")
  if (checkedProducts.length === 1) {
    return checkedProducts[0].value
  }
  return null
}
