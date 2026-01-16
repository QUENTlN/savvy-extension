import { renderProductsView } from './ProductsView.js'
import * as actions from './ProductsActions.js'
import { showNewProductModal, showEditProductModal, showDeleteProductModal, showCurrencyConversionModal } from './modals/index.js'
import { Store } from '../../state.js'
import { t } from '../../../shared/i18n.js'
import { getForeignCurrencies } from '../../utils/currencyDetection.js'
import { convertSessionCurrency } from '../../utils/currencyConversion.js'
import { StorageService } from '../../utils/StorageService.js'
import { showToast } from '../../utils/toast.js'

export function initProductsPage(app) {
  const session = actions.getSession()

  if (!session) {
    Store.setState({ currentView: 'sessions' })
    return
  }

  app.innerHTML = renderProductsView({ session })
  attachEventListeners(session)
}

function attachEventListeners(session) {
  document.getElementById("back-button")?.addEventListener("click", actions.navigateToSessions)

  document.getElementById("new-product-button")?.addEventListener("click", () => {
    showNewProductModal(session)
  })

  document.getElementById("edit-rules-button")?.addEventListener("click", actions.navigateToDeliveryRules)

  document.getElementById("manage-alternatives-button")?.addEventListener("click", actions.navigateToAlternatives)

  if (session.forwardersEnabled) {
    document.getElementById("forwarders-button")?.addEventListener("click", actions.navigateToForwarders)
  }

  if (session.importFeesEnabled) {
    document.getElementById("import-fees-button")?.addEventListener("click", actions.navigateToImportFees)
  }

  document.getElementById("optimize-button")?.addEventListener("click", async () => {
    const session = actions.getSession()

    if (!session) {
      showToast(t("optimization.sessionNotFound") || "Session not found", { type: 'error' })
      return
    }

    // Check if there are products
    const products = session.products || []
    if (products.length === 0) {
      showToast(t("optimization.noProducts"), { type: 'error' })
      return
    }

    // Collect all product IDs that are in bundles
    const bundles = session.bundles || []
    const productIdsInBundles = new Set()
    bundles.forEach(bundle => {
      (bundle.products || []).forEach(bp => productIdsInBundles.add(bp.productId))
    })

    // Check each product has offers or is in a bundle
    for (const product of products) {
      const hasOffers = (product.offers || []).length > 0
      const isInBundle = productIdsInBundles.has(product.id)

      if (!hasOffers && !isInBundle) {
        showToast(t("optimization.productWithoutOffer").replace("{name}", product.name), { type: 'error' })
        return
      }
    }

    // Collect all sellers from offers and bundles
    const sellersFromOffers = new Set()
    products.forEach(p => {
      (p.offers || []).forEach(offer => {
        if (offer.seller) sellersFromOffers.add(offer.seller)
      })
    })
    bundles.forEach(bundle => {
      if (bundle.seller) sellersFromOffers.add(bundle.seller)
    })

    // Get delivery rules sellers
    const deliveryRules = session.deliveryRules || []
    const sellersWithRules = new Set()
    deliveryRules.forEach(rule => {
      if (rule.seller) sellersWithRules.add(rule.seller)
      // Also add sellers that are copied from other sellers
      if (rule.copiedFrom) sellersWithRules.add(rule.seller)
    })

    // Check all offer/bundle sellers have delivery rules
    for (const seller of sellersFromOffers) {
      if (!sellersWithRules.has(seller)) {
        showToast(t("optimization.missingDeliveryRule").replace("{seller}", seller), { type: 'error' })
        return
      }
    }

    try {
      // Get user's default currency
      const settings = await StorageService.getUserSettings()
      const targetCurrency = settings.currency

      // Detect foreign currencies
      const foreignCurrencies = getForeignCurrencies(session, targetCurrency)

      let sessionToOptimize = session

      // If foreign currencies exist, show conversion modal
      if (foreignCurrencies.length > 0) {
        const rates = await showCurrencyConversionModal(foreignCurrencies, targetCurrency)

        // User cancelled
        if (!rates) {
          return
        }

        // Convert session's currencies
        sessionToOptimize = convertSessionCurrency(session, rates, targetCurrency)
      }

      // Proceed with optimization using converted session
      const result = await actions.optimizeSession(sessionToOptimize)

      if (result.success) {
        actions.showOptimizationResults(result.result)
      } else {
        showToast(`${t("optimization.failed")}: ${result.error}`, { type: 'error' })
      }
    } catch (error) {
      console.error("Optimization error:", error)
      showToast(`${t("optimization.failed")}: ${error.message}`, { type: 'error' })
    }
  })

  // Product item clicks (navigate to offers)
  document.querySelectorAll(".product-item").forEach(item => {
    item.addEventListener("click", (e) => {
      if (!e.target.closest(".edit-button") && !e.target.closest(".delete-button")) {
        actions.navigateToOffers(item.dataset.id)
      }
    })
  })

  // Edit buttons
  document.querySelectorAll(".edit-button").forEach(button => {
    button.addEventListener("click", (e) => {
      e.stopPropagation()
      const product = session.products.find(p => p.id === button.dataset.id)
      showEditProductModal(product, session)
    })
  })

  // Delete buttons
  document.querySelectorAll(".delete-button").forEach(button => {
    button.addEventListener("click", (e) => {
      e.stopPropagation()
      showDeleteProductModal(button.dataset.id)
    })
  })
}
