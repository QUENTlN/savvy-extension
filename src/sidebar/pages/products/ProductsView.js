import { t } from '../../../shared/i18n.js'

export function renderProductsView({ session, optimizationState = {}, rateLimit = null }) {
  return `
    <div class="mx-4">
      <!-- Header -->
      <div class="flex justify-between items-center mb-3">
        <div class="flex items-center space-x-3">
          <button class="muted-text p-2 cursor-pointer" id="back-button">
            <span class="icon icon-back h-8 w-8"></span>
          </button>
          <h1 class="text-2xl pl-4 font-semibold card-text">${session.name}</h1>
        </div>
      </div>

      <!-- Product Cards -->
      <div class="space-y-4">
        ${session.products.map(product => renderProductCard(product, session)).join('')}
      </div>

      <!-- Action Buttons -->
      <div class="flex space-x-4 mt-6">
        <button id="new-product-button" class="flex-1 flex items-center justify-center space-x-2 cursor-pointer secondary-bg secondary-text px-4 py-3 rounded-xl hover:opacity-80 transition-colors duration-200 shadow-sm">
          <span class="icon icon-plus h-5 w-5"></span>
          <span class="text-lg font-medium">${t("products.newProduct")}</span>
        </button>
      </div>

      <div class="flex space-x-4 mt-4">
        <button id="edit-rules-button" class="flex-1 flex items-center justify-center space-x-2 cursor-pointer secondary-bg secondary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm border border-default">
          <span class="icon icon-delivery_rules h-5 w-5"></span>
          <span class="text-lg font-medium">${t("products.deliveryRules")}</span>
        </button>
        <button id="manage-alternatives-button" class="flex-1 flex items-center justify-center space-x-2 cursor-pointer secondary-bg secondary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm border border-default">
          <span class="icon icon-alternatives h-5 w-5"></span>
          <span class="text-lg font-medium">${t("products.manageAlternatives")}</span>
        </button>
      </div>

      ${session.forwardersEnabled ? `
      <div class="flex space-x-4 mt-4">
        <button id="forwarders-button" class="flex-1 flex items-center justify-center space-x-2 cursor-pointer secondary-bg secondary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm border border-default">
          <span class="icon icon-forwarding h-5 w-5"></span>
          <span class="text-lg font-medium">${t("products.forwarders")}</span>
        </button>
      </div>
      ` : ''}

      ${session.importFeesEnabled ? `
      <div class="flex space-x-4 mt-4">
        <button id="import-fees-button" class="flex-1 flex items-center justify-center space-x-2 cursor-pointer secondary-bg secondary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm border border-default">
          <span class="icon icon-customs h-5 w-5"></span>
          <span class="text-lg font-medium">${t("products.importFees")}</span>
        </button>
      </div>
      ` : ''}

      ${renderOptimizeSection(optimizationState, rateLimit)}
    </div>
  `
}

function renderOptimizeSection(optimizationState, rateLimit) {
  const { hasResults, isModified, hasHistory } = optimizationState

  // Render rate limit indicator if available
  const rateLimitIndicator = rateLimit && rateLimit.remaining !== null
    ? `<div class="text-center mt-2 text-sm muted-text">
        ${t("optimization.quotaRemaining").replace("{remaining}", rateLimit.remaining).replace("{limit}", rateLimit.limit)}
       </div>`
    : ''

  if (hasResults && !isModified) {
    // Show "View Results" button
    return `
      <div class="flex space-x-4 my-4">
        <button id="view-results-button" class="flex-1 flex items-center justify-center space-x-2 cursor-pointer primary-bg primary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm">
          <span class="icon icon-results h-5 w-5"></span>
          <span class="text-lg font-medium">${t("products.viewResults")}</span>
        </button>
        ${hasHistory ? `
        <button id="history-button" class="flex items-center justify-center cursor-pointer secondary-bg secondary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm border border-default" title="${t("products.history")}">
          <span class="icon icon-history h-5 w-5"></span>
        </button>
        ` : ''}
      </div>
      ${rateLimitIndicator}
    `
  } else {
    // Show "Optimize" button (with optional history button)
    return `
      <div class="flex space-x-4 my-4">
        <button id="optimize-button" class="flex-1 flex items-center justify-center space-x-2 cursor-pointer primary-bg primary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm">
          <span class="icon icon-optimize h-5 w-5"></span>
          <span class="text-lg font-medium">${t("products.optimize")}</span>
        </button>
        ${hasHistory ? `
        <button id="history-button" class="flex items-center justify-center cursor-pointer secondary-bg secondary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm border border-default" title="${t("products.history")}">
          <span class="icon icon-history h-5 w-5"></span>
        </button>
        ` : ''}
      </div>
      ${rateLimitIndicator}
    `
  }
}

function renderProductCard(product, session) {
  const bundleCount = session.bundles
    ? session.bundles.filter(b => b.products && b.products.some(bp => bp.productId === product.id)).length
    : 0

  return `
    <div class="card-bg rounded-xl shadow-md p-4 product-item" data-id="${product.id}">
      <div class="flex justify-between items-center cursor-pointer">
        <div class="flex-1 min-w-0 mr-4 cursor-pointer">
          <h2 class="text-xl font-medium card-text truncate">${product.name}${(session.manageQuantity !== false && product.quantity && product.quantity > 1) ? ` (×${product.quantity})` : ''}</h2>
          <p class="muted-text text-md truncate">
            ${product.offers.length} ${t("products.offers")}
            ${bundleCount > 0 ? ` • ${bundleCount} ${t("products.bundles")}` : ''}
          </p>
        </div>
        <div class="flex space-x-2 flex-shrink-0">
          <button class="muted-text p-1 cursor-pointer edit-button" data-id="${product.id}">
            <span class="icon icon-edit h-6 w-6"></span>
          </button>
          <button class="muted-text p-1 cursor-pointer delete-button" data-id="${product.id}">
            <span class="icon icon-delete h-6 w-6"></span>
          </button>
        </div>
      </div>
    </div>
  `
}
