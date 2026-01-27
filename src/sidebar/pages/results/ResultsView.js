import { t } from '../../../shared/i18n.js'
import { formatCurrency, formatPercent } from '../../utils/formatters.js'

export function renderResultsView({ result, session, isHistorical, hasHistory }) {
  const data = result.result
  const currency = result.currency || 'EUR'

  const status = data.meta?.status || data.status
  const totals = data.totals?.breakdown || {}
  const grandTotal = data.totals?.grand_total ?? data.total_cost ?? 0
  const customsDuties = totals.customs?.duties ?? data.customs_cost ?? 0
  const customsVat = totals.customs?.vat ?? data.vat_cost ?? 0
  const customsClearance = totals.customs?.clearance ?? 0
  const customsTotal = customsDuties + customsVat + customsClearance
  const forwarderTotal = (totals.forwarder?.reception ?? 0) + (totals.forwarder?.storage ?? 0) + (totals.forwarder?.repackaging ?? 0) + (totals.forwarder?.reshipping ?? 0)

  return `
    <div class="mx-4">
      <!-- Header -->
      <div class="flex justify-between items-center mb-3">
        <div class="flex items-center space-x-3">
          <button class="muted-text p-2 cursor-pointer" id="back-button">
            <span class="icon icon-back h-8 w-8"></span>
          </button>
          <h1 class="text-2xl pl-4 font-semibold card-text">
            ${t("results.title")}
            ${isHistorical ? `<span class="text-sm muted-text ml-2">(${t("results.historical")})</span>` : ''}
          </h1>
        </div>
        ${hasHistory ? `
        <button class="muted-text p-2 cursor-pointer" id="history-button" title="${t("results.viewHistory")}">
          <span class="icon icon-history h-6 w-6"></span>
        </button>
        ` : ''}
      </div>

      <!-- Status Badge -->
      <div class="mb-4 flex items-center">
        <span class="inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(status)}">
          ${status}
        </span>
        <span class="text-sm muted-text ml-3">
          ${new Date(result.timestamp).toLocaleString()}
        </span>
      </div>

      <!-- Summary Cards -->
      <div class="mb-4">
        ${(() => {
          const showForwarder = forwarderTotal > 0 && session.forwardersEnabled
          const showCustoms = customsTotal > 0 && session.importFeesEnabled
          const hasCategories = showForwarder || showCustoms
          const hasBothCategories = showForwarder && showCustoms
          
          // Si on a les deux catégories : layout en 2 lignes
          if (hasBothCategories) {
            return `
              <!-- First row: Coût total, Produits, Livraison, Assurance -->
              <div class="grid grid-cols-2 gap-3 mb-3">
                ${renderSummaryCard(t("results.totalCost"), formatCurrency(grandTotal, currency), 'primary')}
                ${renderSummaryCard(t("results.productsCost"), formatCurrency(totals.products ?? data.products_cost ?? 0, currency))}
                ${renderSummaryCard(t("results.shippingCost"), formatCurrency(totals.shipping ?? data.shipping_cost ?? 0, currency))}
                ${renderSummaryCard(t("results.insuranceCost"), formatCurrency(totals.insurance ?? data.insurance_cost ?? 0, currency))}
              </div>
              
              <!-- Second row: Transitaire et Douane (cartes plus grandes) -->
              <div class="grid grid-cols-2 gap-3">
                ${renderCategoryCard(
                  'Transitaire',
                  formatCurrency(forwarderTotal, currency),
                  {
                    reception: { amount: totals.forwarder?.reception ?? 0 },
                    storage: { amount: totals.forwarder?.storage ?? 0 },
                    repackaging: { amount: totals.forwarder?.repackaging ?? 0 },
                    reshipping: { amount: totals.forwarder?.reshipping ?? 0 }
                  },
                  currency
                )}
                ${renderCategoryCard(
                  'Douane',
                  formatCurrency(customsTotal, currency),
                  totals.customs || {
                    duties: { amount: customsDuties },
                    vat: { amount: customsVat },
                    clearance: { amount: customsClearance }
                  },
                  currency
                )}
              </div>
            `
          }
          
          // Si on a une seule catégorie : layout en colonnes
          if (hasCategories) {
            const categoryCard = showForwarder 
              ? renderCategoryCard(
                  'Transitaire',
                  formatCurrency(forwarderTotal, currency),
                  {
                    reception: { amount: totals.forwarder?.reception ?? 0 },
                    storage: { amount: totals.forwarder?.storage ?? 0 },
                    repackaging: { amount: totals.forwarder?.repackaging ?? 0 },
                    reshipping: { amount: totals.forwarder?.reshipping ?? 0 }
                  },
                  currency
                )
              : renderCategoryCard(
                  'Douane',
                  formatCurrency(customsTotal, currency),
                  totals.customs || {
                    duties: { amount: customsDuties },
                    vat: { amount: customsVat },
                    clearance: { amount: customsClearance }
                  },
                  currency
                )
            
            return `
              <div class="grid grid-cols-2 gap-3">
                <!-- Left column: 4 summary cards -->
                <div class="grid grid-cols-2 gap-3">
                  ${renderSummaryCard(t("results.totalCost"), formatCurrency(grandTotal, currency), 'primary')}
                  ${renderSummaryCard(t("results.productsCost"), formatCurrency(totals.products ?? data.products_cost ?? 0, currency))}
                  ${renderSummaryCard(t("results.shippingCost"), formatCurrency(totals.shipping ?? data.shipping_cost ?? 0, currency))}
                  ${renderSummaryCard(t("results.insuranceCost"), formatCurrency(totals.insurance ?? data.insurance_cost ?? 0, currency))}
                </div>
                
                <!-- Right column: Category card -->
                <div class="h-full">
                  ${categoryCard}
                </div>
              </div>
            `
          }
          
          // Si aucune catégorie : layout classique 2x2
          return `
            <div class="grid grid-cols-2 gap-3">
              ${renderSummaryCard(t("results.totalCost"), formatCurrency(grandTotal, currency), 'primary')}
              ${renderSummaryCard(t("results.productsCost"), formatCurrency(totals.products ?? data.products_cost ?? 0, currency))}
              ${renderSummaryCard(t("results.shippingCost"), formatCurrency(totals.shipping ?? data.shipping_cost ?? 0, currency))}
              ${renderSummaryCard(t("results.insuranceCost"), formatCurrency(totals.insurance ?? data.insurance_cost ?? 0, currency))}
            </div>
          `
        })()}
      </div>



      ${session.forwardersEnabled ? renderForwarderFeesBreakdownCard(data, session, currency) : ''}

      <!-- Sellers Breakdown -->
      ${renderSellerCards(data, session, currency)}

      <!-- Action Buttons -->
      <div class="flex space-x-4 mt-6 mb-4">
        <button id="re-optimize-button" class="flex-1 flex items-center justify-center space-x-2 cursor-pointer primary-bg primary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm">
          <span class="icon icon-optimize h-5 w-5"></span>
          <span class="text-lg font-medium">${t("results.reOptimize")}</span>
        </button>
      </div>
    </div>
  `
}

function renderSummaryCard(label, value, variant = 'default') {
  const bgClass = variant === 'primary' ? 'primary-bg primary-text' : 'card-bg'
  return `
    <div class="${bgClass} rounded-xl shadow-sm p-3 text-center">
      <p class="text-sm ${variant === 'primary' ? '' : 'muted-text'}">${label}</p>
      <p class="text-xl font-semibold">${value}</p>
    </div>
  `
}

function renderCategoryCard(label, value, details = null, currency = 'EUR') {
  let detailsHtml = ''
  
  if (details) {
    const detailItems = []
    
    // Helper pour obtenir le montant (gère les deux formats: nombre simple ou objet avec amount)
    const getAmount = (item) => {
      if (typeof item === 'number') return item
      return item?.amount ?? 0
    }
    
    // Helper pour obtenir le taux (si disponible)
    const getRate = (item) => {
      if (typeof item === 'object' && item?.rate) return item.rate
      return null
    }
    
    // Pour le transitaire
    if (details.reception !== undefined) {
      const amount = getAmount(details.reception)
      if (amount > 0) {
        detailItems.push({ label: t("results.forwarderReception"), amount })
      }
      const storageAmount = getAmount(details.storage)
      if (storageAmount > 0) {
        detailItems.push({ label: t("results.forwarderStorage"), amount: storageAmount })
      }
      const repackagingAmount = getAmount(details.repackaging)
      if (repackagingAmount > 0) {
        detailItems.push({ label: t("results.forwarderRepackaging"), amount: repackagingAmount })
      }
      const reshippingAmount = getAmount(details.reshipping)
      if (reshippingAmount > 0) {
        detailItems.push({ label: t("results.forwarderReShipping"), amount: reshippingAmount })
      }
    }
    
    // Pour la douane
    if (details.duties !== undefined) {
      const dutiesAmount = getAmount(details.duties)
      if (dutiesAmount > 0) {
        const rate = getRate(details.duties)
        const rateStr = rate ? ` (${formatPercent(rate)}%)` : ''
        detailItems.push({ label: `${t("results.customsCost")}${rateStr}`, amount: dutiesAmount })
      }
      const vatAmount = getAmount(details.vat)
      if (vatAmount > 0) {
        const rate = getRate(details.vat)
        const rateStr = rate ? ` (${formatPercent(rate)}%)` : ''
        detailItems.push({ label: `${t("results.vatCost")}${rateStr}`, amount: vatAmount })
      }
      const clearanceAmount = getAmount(details.clearance)
      if (clearanceAmount > 0) {
        detailItems.push({ label: t("results.customsClearanceFee"), amount: clearanceAmount })
      }
    }
    
    if (detailItems.length > 0) {
      detailsHtml = `
        <div class="mt-3 pt-3 border-t border-default space-y-1.5">
          ${detailItems.map(item => `
            <div class="flex justify-between text-xs">
              <span class="muted-text">${item.label}</span>
              <span class="muted-text">${formatCurrency(item.amount, currency)}</span>
            </div>
          `).join('')}
        </div>
      `
    }
  }
  
  return `
    <div class="card-bg rounded-xl shadow-sm p-4 text-center h-full flex flex-col">
      <div>
        <p class="text-sm muted-text mb-1">${label}</p>
        <p class="text-2xl font-semibold card-text">${value}</p>
      </div>
      ${detailsHtml ? `<div class="mt-auto">${detailsHtml}</div>` : ''}
    </div>
  `
}

function renderSellerCards(data, session, currency) {
  // v2.0 API format: data.solution.offers, data.solution.bundles, data.logistics.shipping
  const offers = data.solution?.offers || data.selected_offers || []
  const bundles = data.solution?.bundles || data.selected_bundles || []
  const shippingBreakdown = data.logistics?.shipping || data.shipping_breakdown || []

  // Group offers and bundles by seller
  const sellerMap = new Map()

  // Add offers to seller map
  for (const offer of offers) {
    const seller = offer.seller
    if (!sellerMap.has(seller)) {
      sellerMap.set(seller, { offers: [], bundles: [], shipping: null })
    }
    sellerMap.get(seller).offers.push(offer)
  }

  // Add bundles to seller map
  for (const bundle of bundles) {
    const seller = bundle.seller
    if (!sellerMap.has(seller)) {
      sellerMap.set(seller, { offers: [], bundles: [], shipping: null })
    }
    sellerMap.get(seller).bundles.push(bundle)
  }

  // Add shipping info to seller map
  for (const ship of shippingBreakdown) {
    if (sellerMap.has(ship.seller)) {
      sellerMap.get(ship.seller).shipping = ship
    }
  }

  // Get delivery rules for groups
  const deliveryRules = session.deliveryRules || []

  // Render a card for each seller
  return Array.from(sellerMap.entries()).map(([seller, sellerData]) => {
    const rule = deliveryRules.find(r => r.seller === seller)
    const hasGroups = rule?.billingMethod === 'groups' && rule?.groups?.length > 0

    return renderSellerCard(seller, sellerData, session, currency, hasGroups ? rule.groups : null)
  }).join('')
}

// Helper to format breakdown tooltip
function getCustomsBreakdownTooltip(customs, currency) {
  if (!customs) return ''
  const parts = []
  if (customs.duties?.amount > 0) {
    const rate = customs.duties.rate ? ` (${formatPercent(customs.duties.rate)}%)` : ''
    parts.push(`<div class="flex justify-between gap-4"><span>${t("results.customsCost")}:${rate}</span> <span class="font-medium">${formatCurrency(customs.duties.amount, currency)}</span></div>`)
  }
  if (customs.vat?.amount > 0) {
    const rate = customs.vat.rate ? ` (${formatPercent(customs.vat.rate)}%)` : ''
    parts.push(`<div class="flex justify-between gap-4"><span>${t("results.vatCost")}:${rate}</span> <span class="font-medium">${formatCurrency(customs.vat.amount, currency)}</span></div>`)
  }
  if (customs.clearance?.amount > 0) parts.push(`<div class="flex justify-between gap-4"><span>${t("results.customsClearanceFee")}:</span> <span class="font-medium">${formatCurrency(customs.clearance.amount, currency)}</span></div>`)
  return parts.join('')
}

function getForwarderBreakdownTooltip(forwarder, currency) {
  if (!forwarder) return ''
  const parts = []
  if (forwarder.reception?.amount > 0) parts.push(`<div class="flex justify-between gap-4"><span>${t("results.forwarderReception")}:</span> <span class="font-medium">${formatCurrency(forwarder.reception.amount, currency)}</span></div>`)
  if (forwarder.storage?.amount > 0) parts.push(`<div class="flex justify-between gap-4"><span>${t("results.forwarderStorage")}:</span> <span class="font-medium">${formatCurrency(forwarder.storage.amount, currency)}</span></div>`)
  if (forwarder.repackaging?.amount > 0) parts.push(`<div class="flex justify-between gap-4"><span>${t("results.forwarderRepackaging")}:</span> <span class="font-medium">${formatCurrency(forwarder.repackaging.amount, currency)}</span></div>`)
  if (forwarder.reshipping?.amount > 0) parts.push(`<div class="flex justify-between gap-4"><span>${t("results.forwarderReShipping")}:</span> <span class="font-medium">${formatCurrency(forwarder.reshipping.amount, currency)}</span></div>`)
  return parts.join('')
}

function renderSellerCard(seller, sellerData, session, currency, groups) {
  const { offers, bundles, shipping } = sellerData
  const shippingAmount = shipping?.amount || 0

  // 1. Calculate Totals & Determine Visible Columns
  let productsTotal = 0
  let insuranceTotal = 0
  let customsTotal = 0
  let forwarderTotal = 0
  let totalQuantity = 0

  let totalCustomsDetail = { duties: 0, vat: 0, clearance: 0 }
  let totalForwarderDetail = { reception: 0, storage: 0, repackaging: 0, reshipping: 0 }

  let showInsurance = false
  let showCustoms = false
  let showForwarder = session.forwardersEnabled

  // Helper to process item for totals and visibility
  const processItem = (item) => {
    // Products
    productsTotal += (item.pricing?.product_total ?? item.total_price ?? 0)

    // Quantity
    totalQuantity += item.quantity

    // Insurance
    let itemInsurance = 0
    if (item.costs?.insurance?.amount) {
      itemInsurance = item.costs.insurance.amount
    } else {
      // Fallback
      if (item.ids?.offer) { // Offer
        const originalOffer = findOriginalOffer(item, session)
        if (originalOffer?.insurancePrice) itemInsurance = originalOffer.insurancePrice * item.quantity
      } else if (item.ids?.bundle) { // Bundle
        const bundleId = item.ids.bundle
        const originalBundle = session.bundles?.find(b => b.id === bundleId)
        if (originalBundle?.insurancePrice) itemInsurance = originalBundle.insurancePrice * item.quantity
      }
    }
    insuranceTotal += itemInsurance
    if (itemInsurance > 0) showInsurance = true

    // Customs
    let itemCustoms = 0
    if (item.costs?.customs) {
      itemCustoms += (item.costs.customs.duties?.amount || 0)
      itemCustoms += (item.costs.customs.vat?.amount || 0)
      itemCustoms += (item.costs.customs.clearance?.amount || 0)
    }
    customsTotal += itemCustoms
    if (itemCustoms > 0) showCustoms = true

    // Forwarder
    let itemForwarder = 0
    if (item.costs?.forwarder) {
      itemForwarder += (item.costs.forwarder.reception?.amount || 0)
      itemForwarder += (item.costs.forwarder.storage?.amount || 0)
      itemForwarder += (item.costs.forwarder.repackaging?.amount || 0)
      itemForwarder += (item.costs.forwarder.reshipping?.amount || 0)
    }
    forwarderTotal += itemForwarder
    if (itemForwarder > 0) showForwarder = true

    // Aggregate Details for Footer Tooltips
    if (item.costs?.customs) {
      totalCustomsDetail.duties += (item.costs.customs.duties?.amount || 0)
      totalCustomsDetail.vat += (item.costs.customs.vat?.amount || 0)
      totalCustomsDetail.clearance += (item.costs.customs.clearance?.amount || 0)
    }
    if (item.costs?.forwarder) {
      totalForwarderDetail.reception += (item.costs.forwarder.reception?.amount || 0)
      totalForwarderDetail.storage += (item.costs.forwarder.storage?.amount || 0)
      totalForwarderDetail.repackaging += (item.costs.forwarder.repackaging?.amount || 0)
      totalForwarderDetail.reshipping += (item.costs.forwarder.reshipping?.amount || 0)
    }
  }

  offers.forEach(processItem)
  bundles.forEach(processItem)

  // 2. Prepare Columns Config
  const columns = {
    qty: session.manageQuantity,
    insurance: showInsurance,
    customs: showCustoms,
    forwarder: showForwarder
  }

  const sellerTotal = productsTotal + shippingAmount + insuranceTotal + customsTotal + forwarderTotal

  const footerCustomsTooltip = getCustomsBreakdownTooltip({
    duties: { amount: totalCustomsDetail.duties },
    vat: { amount: totalCustomsDetail.vat },
    clearance: { amount: totalCustomsDetail.clearance }
  }, currency)

  const footerForwarderTooltip = getForwarderBreakdownTooltip({
    reception: { amount: totalForwarderDetail.reception },
    storage: { amount: totalForwarderDetail.storage },
    repackaging: { amount: totalForwarderDetail.repackaging },
    reshipping: { amount: totalForwarderDetail.reshipping }
  }, currency)

  return `
    <div class="card-bg rounded-xl shadow-md p-4 mb-4">
      <!-- Seller Header -->
      <div class="flex justify-between items-center mb-3 pb-2 border-b border-default">
        <h2 class="text-lg font-semibold card-text">${seller}</h2>
        <p class="text-lg font-semibold card-text">${formatCurrency(sellerTotal, currency)}</p>
      </div>

      <!-- Detailed Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-xs muted-text uppercase border-b border-default">
            <tr>
              <th class="py-2 pr-2 font-medium">${t("sessions.product")}</th>
              ${columns.qty ? `<th class="py-2 px-2 text-right font-medium">${t("results.qty")}</th>` : ''}
              <th class="py-2 px-2 text-right font-medium">${t("offers.price")}</th>
              <th class="py-2 px-2 text-right font-medium">${t("offers.shipping")}</th>
              ${columns.insurance ? `<th class="py-2 px-2 text-right font-medium">${t("offers.insurance")}</th>` : ''}
              ${columns.forwarder ? `<th class="py-2 px-2 text-right font-medium">Transitaire</th>` : ''}
              ${columns.customs ? `<th class="py-2 px-2 text-right font-medium">Douane</th>` : ''}
              <th class="py-2 pl-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-dotted divide-gray-200 dark:divide-gray-700">
             ${groups ? renderGroupedItemsRows(offers, bundles, groups, session, currency, columns) : renderFlatItemsRows(offers, bundles, session, currency, columns)}
          </tbody>
          <tfoot class="font-semibold border-t border-default card-text">
            <tr>
              <td class="py-3 pr-2 text-right">Total</td>
              ${columns.qty ? `<td class="py-3 px-2 text-right">${totalQuantity}</td>` : ''}
              <td class="py-3 px-2 text-right">${formatCurrency(productsTotal, currency)}</td>
              <td class="py-3 px-2 text-right">${formatCurrency(shippingAmount, currency)}</td>
              ${columns.insurance ? `<td class="py-3 px-2 text-right">${formatCurrency(insuranceTotal, currency)}</td>` : ''}
              ${columns.forwarder ? `
                <td class="py-3 px-2 text-right" ${footerForwarderTooltip ? `data-tooltip-html='${footerForwarderTooltip.replace(/'/g, "&#39;")}' style="cursor: help; text-decoration: underline dotted; text-underline-offset: 4px;"` : ''}>
                  ${formatCurrency(forwarderTotal, currency)}
                </td>` : ''}
              ${columns.customs ? `
                <td class="py-3 px-2 text-right" ${footerCustomsTooltip ? `data-tooltip-html='${footerCustomsTooltip.replace(/'/g, "&#39;")}' style="cursor: help; text-decoration: underline dotted; text-underline-offset: 4px;"` : ''}>
                  ${formatCurrency(customsTotal, currency)}
                </td>` : ''}
              <td class="py-3 pl-2 text-right">${formatCurrency(sellerTotal, currency)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      ${(() => {
      const rule = session.deliveryRules?.find(r => r.seller === seller)
      if (rule?.forwarderChain?.length > 0) {
        const chainLinks = [...rule.forwarderChain].sort((a, b) => a.order - b.order)
        const forwarderNames = chainLinks.map(link => {
          const fw = session.forwarders?.find(f => f.id === link.forwarderId)
          return fw?.name || link.forwarderId
        })
        if (forwarderNames.length > 0) {
          const fullChain = [seller, ...forwarderNames, t("results.you")]
          return `
               <div class="mt-4 pt-3 border-t border-dashed border-default flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                 <span class="font-medium flex items-center gap-1">
                   <span class="icon icon-forwarding h-4 w-4"></span>
                   ${t("results.forwarderChainDetails")}:
                 </span>
                 <div class="flex items-center gap-1.5 ml-1">
                   ${fullChain.join('<span class="text-gray-300 dark:text-gray-600">→</span>')}
                 </div>
               </div>
             `
        }
      }
      return ''
    })()}
    </div>
  `
}

function renderGroupedItemsRows(offers, bundles, groups, session, currency, columns) {
  // Match offers/bundles to groups
  const groupedItems = groups.map(group => {
    const groupProductIds = new Set(group.productIds || [])
    const groupOffers = offers.filter(o => {
      const productId = o.ids?.product ?? o.product_id
      return groupProductIds.has(productId)
    })
    const groupBundles = bundles.filter(b => {
      const productIds = b.ids?.products ?? b.product_ids ?? []
      return productIds.some(pid => groupProductIds.has(pid))
    })
    return { group, offers: groupOffers, bundles: groupBundles }
  }).filter(g => g.offers.length > 0 || g.bundles.length > 0)

  // Find ungrouped
  const allGroupProductIds = new Set(groups.flatMap(g => g.productIds || []))
  const ungroupedOffers = offers.filter(o => !allGroupProductIds.has(o.ids?.product ?? o.product_id))
  const ungroupedBundles = bundles.filter(b => !(b.ids?.products ?? b.product_ids ?? []).some(pid => allGroupProductIds.has(pid)))

  let html = ''

  for (const { group, offers: gOffers, bundles: gBundles } of groupedItems) {
    const colSpan = 3 + (columns.qty ? 1 : 0) + (columns.insurance ? 1 : 0) + (columns.customs ? 1 : 0) + (columns.forwarder ? 1 : 0)
    html += `
      <tr class="bg-gray-50 dark:bg-gray-800/50">
        <td colspan="${colSpan}" class="py-2 pl-2 text-xs font-semibold muted-text">${group.name || t("results.group")}</td>
      </tr>
      ${gOffers.map(o => renderOfferRow(o, session, currency, columns)).join('')}
      ${gBundles.map(b => renderBundleRow(b, session, currency, columns)).join('')}
    `
  }

  if (ungroupedOffers.length > 0 || ungroupedBundles.length > 0) {
    html += `
      ${ungroupedOffers.map(o => renderOfferRow(o, session, currency, columns)).join('')}
      ${ungroupedBundles.map(b => renderBundleRow(b, session, currency, columns)).join('')}
    `
  }

  return html
}

function renderFlatItemsRows(offers, bundles, session, currency, columns) {
  return `
    ${offers.map(o => renderOfferRow(o, session, currency, columns)).join('')}
    ${bundles.map(b => renderBundleRow(b, session, currency, columns)).join('')}
  `
}

function renderOfferRow(offer, session, currency, columns) {
  const productId = offer.ids?.product ?? offer.product_id
  const product = session.products?.find(p => p.id === productId)
  const originalOffer = findOriginalOffer(offer, session)
  const productPrice = offer.pricing?.product_total ?? offer.total_price ?? 0
  const shippingCost = offer.costs?.shipping?.amount ?? 0

  // Insurance
  let insurance = 0
  if (offer.costs?.insurance?.amount) {
    insurance = offer.costs.insurance.amount
  } else if (originalOffer?.insurancePrice) {
    insurance = originalOffer.insurancePrice * offer.quantity
  }

  // Customs
  let customs = 0
  if (offer.costs?.customs) {
    customs += (offer.costs.customs.duties?.amount || 0) + (offer.costs.customs.vat?.amount || 0) + (offer.costs.customs.clearance?.amount || 0)
  }

  // Forwarder
  let forwarder = 0
  if (offer.costs?.forwarder) {
    forwarder += (offer.costs.forwarder.reception?.amount || 0) + (offer.costs.forwarder.storage?.amount || 0)
    forwarder += (offer.costs.forwarder.repackaging?.amount || 0) + (offer.costs.forwarder.reshipping?.amount || 0)
  }

  const rowTotal = productPrice + shippingCost + insurance + customs + forwarder
  // Use affiliated_url from API if available, fallback to url from API, then original offer
  const offerUrl = offer.affiliated_url || offer.url || originalOffer?.url

  const customsTooltip = getCustomsBreakdownTooltip(offer.costs?.customs, currency)
  const forwarderTooltip = getForwarderBreakdownTooltip(offer.costs?.forwarder, currency)

  return renderTableRow({
    name: product?.name || productId,
    url: offerUrl,
    quantity: offer.quantity,
    price: productPrice,
    shipping: shippingCost,
    insurance,
    customs,
    forwarder,
    total: rowTotal,
    currency,
    columns,
    customsTooltip,
    forwarderTooltip
  })
}

function renderBundleRow(bundle, session, currency, columns) {
  const bundleId = bundle.ids?.bundle ?? bundle.bundle_id
  const productIds = bundle.ids?.products ?? bundle.product_ids ?? []
  const originalBundle = session.bundles?.find(b => b.id === bundleId)

  const productPrice = bundle.pricing?.product_total ?? bundle.total_price ?? 0
  const shippingCost = bundle.costs?.shipping?.amount ?? 0

  // Insurance
  let insurance = 0
  if (bundle.costs?.insurance?.amount) {
    insurance = bundle.costs.insurance.amount
  } else if (originalBundle?.insurancePrice) {
    insurance = originalBundle.insurancePrice * bundle.quantity
  }

  // Customs
  let customs = 0
  if (bundle.costs?.customs) {
    customs += (bundle.costs.customs.duties?.amount || 0) + (bundle.costs.customs.vat?.amount || 0) + (bundle.costs.customs.clearance?.amount || 0)
  }

  // Forwarder
  let forwarder = 0
  if (bundle.costs?.forwarder) {
    forwarder += (bundle.costs.forwarder.reception?.amount || 0) + (bundle.costs.forwarder.storage?.amount || 0) + (bundle.costs.forwarder.repackaging?.amount || 0) + (bundle.costs.forwarder.reshipping?.amount || 0)
  }

  const rowTotal = productPrice + shippingCost + insurance + customs + forwarder

  const productNames = productIds.map(pid => {
    const product = session.products?.find(p => p.id === pid)
    return product?.name || pid
  }).join(', ')

  const customsTooltip = getCustomsBreakdownTooltip(bundle.costs?.customs, currency)
  const forwarderTooltip = getForwarderBreakdownTooltip(bundle.costs?.forwarder, currency)

  // Use affiliated_url from API if available, fallback to url from API, then original bundle
  const bundleUrl = bundle.affiliated_url || bundle.url || originalBundle?.url

  return renderTableRow({
    name: `${originalBundle?.name || t("results.bundle")}: ${productNames}`,
    url: bundleUrl,
    quantity: bundle.quantity,
    price: productPrice,
    shipping: shippingCost,
    insurance,
    customs,
    forwarder,
    total: rowTotal,
    currency,
    columns,
    customsTooltip,
    forwarderTooltip
  })
}

function renderTableRow({ name, url, quantity, price, shipping, insurance, customs, forwarder, total, currency, columns, customsTooltip, forwarderTooltip }) {
  return `
    <tr class="group transition-colors">
      <td class="py-2 pr-2">
         <div class="flex items-center gap-2">
            ${url ? `
             <button class="open-offer-button flex items-center gap-1 group/link text-left" data-url="${url}" title="${t("offers.openInNewTab")}">
               <span class="card-text font-medium text-sm truncate max-w-[150px] sm:max-w-[200px] group-hover/link:text-[hsl(var(--primary))] transition-colors" title="${name}">${name}</span>
               <span class="icon icon-open_external h-4 w-4 text-gray-400 group-hover/link:text-[hsl(var(--primary))] transition-colors"></span>
             </button>
            ` : `
               <span class="card-text font-medium text-sm truncate max-w-[150px] sm:max-w-[200px]" title="${name}">${name}</span>
            `}
         </div>
      </td>
      ${columns.qty ? `<td class="py-2 px-2 text-right card-text">${quantity}</td>` : ''}
      <td class="py-2 px-2 text-right card-text">${formatCurrency(price, currency)}</td>
      <td class="py-2 px-2 text-right card-text">${formatCurrency(shipping, currency)}</td>
      ${columns.insurance ? `<td class="py-2 px-2 text-right card-text">${formatCurrency(insurance, currency)}</td>` : ''}
      ${columns.forwarder ? `
        <td class="py-2 px-2 text-right card-text" ${forwarderTooltip ? `data-tooltip-html='${forwarderTooltip.replace(/'/g, "&#39;")}' style="cursor: help; text-decoration: underline dotted; text-underline-offset: 4px;"` : ''}>
          ${formatCurrency(forwarder, currency)}
        </td>` : ''}
      ${columns.customs ? `
        <td class="py-2 px-2 text-right card-text" ${customsTooltip ? `data-tooltip-html='${customsTooltip.replace(/'/g, "&#39;")}' style="cursor: help; text-decoration: underline dotted; text-underline-offset: 4px;"` : ''}>
          ${formatCurrency(customs, currency)}
        </td>` : ''}
      <td class="py-2 pl-2 text-right font-medium card-text">${formatCurrency(total, currency)}</td>
    </tr>
  `
}


function renderGroupedItems(offers, bundles, groups, session, currency) {
  // Match offers/bundles to groups based on product IDs
  // v2.0 uses offer.ids.product, old format uses offer.product_id
  const groupedItems = groups.map(group => {
    const groupProductIds = new Set(group.productIds || [])
    const groupOffers = offers.filter(o => {
      const productId = o.ids?.product ?? o.product_id
      return groupProductIds.has(productId)
    })
    const groupBundles = bundles.filter(b => {
      const productIds = b.ids?.products ?? b.product_ids ?? []
      return productIds.some(pid => groupProductIds.has(pid))
    })
    return { group, offers: groupOffers, bundles: groupBundles }
  }).filter(g => g.offers.length > 0 || g.bundles.length > 0)

  // Find items not in any group
  const allGroupProductIds = new Set(groups.flatMap(g => g.productIds || []))
  const ungroupedOffers = offers.filter(o => {
    const productId = o.ids?.product ?? o.product_id
    return !allGroupProductIds.has(productId)
  })
  const ungroupedBundles = bundles.filter(b => {
    const productIds = b.ids?.products ?? b.product_ids ?? []
    return !productIds.some(pid => allGroupProductIds.has(pid))
  })

  let html = ''

  // Render grouped items
  for (const { group, offers: gOffers, bundles: gBundles } of groupedItems) {
    html += `
      <div class="mb-3">
        <p class="text-sm font-medium muted-text mb-2">${group.name || t("results.group")}</p>
        <div class="pl-2 border-l-2 border-default">
          ${gOffers.map(o => renderOfferItem(o, session, currency)).join('')}
          ${gBundles.map(b => renderBundleItem(b, session, currency)).join('')}
        </div>
      </div>
    `
  }

  // Render ungrouped items
  if (ungroupedOffers.length > 0 || ungroupedBundles.length > 0) {
    html += `
      <div class="mb-3">
        ${ungroupedOffers.map(o => renderOfferItem(o, session, currency)).join('')}
        ${ungroupedBundles.map(b => renderBundleItem(b, session, currency)).join('')}
      </div>
    `
  }

  return html
}

function renderFlatItems(offers, bundles, session, currency) {
  return `
    <div class="space-y-1">
      ${offers.map(o => renderOfferItem(o, session, currency)).join('')}
      ${bundles.map(b => renderBundleItem(b, session, currency)).join('')}
    </div>
  `
}

function findOriginalOffer(selectedOffer, session) {
  // v2.0 uses ids.offer, old format uses offer_id
  const offerId = selectedOffer.ids?.offer ?? selectedOffer.offer_id
  for (const product of (session.products || [])) {
    const offer = product.offers?.find(o => o.id === offerId)
    if (offer) return offer
  }
  return null
}

function renderOfferItem(offer, session, currency) {
  // v2.0 uses ids.product, ids.offer, pricing.product_total
  const productId = offer.ids?.product ?? offer.product_id
  const offerId = offer.ids?.offer ?? offer.offer_id
  const totalPrice = offer.pricing?.product_total ?? offer.total_price ?? 0

  const product = session.products?.find(p => p.id === productId)
  const originalOffer = findOriginalOffer(offer, session)

  // v2.0 has costs.insurance.amount, fallback to original offer lookup
  let insurance = 0
  if (offer.costs?.insurance?.amount) {
    insurance = offer.costs.insurance.amount
  } else if (originalOffer?.insurancePrice) {
    insurance = originalOffer.insurancePrice * offer.quantity
  }

  const showQty = session.manageQuantity
  // Use affiliated_url from API if available, fallback to url from API, then original offer
  const offerUrl = offer.affiliated_url || offer.url || originalOffer?.url || ''

  const details = []
  if (showQty) details.push(`${t("results.qty")}: ${offer.quantity}`)
  if (insurance > 0) details.push(`${t("offers.insurance")}: ${formatCurrency(insurance, currency)}`)

  return `
    <div class="flex items-center py-2 gap-3">
      ${offerUrl ? `
      <button class="open-offer-button primary-bg primary-text p-2 rounded-lg cursor-pointer hover:opacity-90 transition-opacity" data-url="${offerUrl}" title="${t("offers.openInNewTab")}">
        <span class="icon icon-open_external h-5 w-5"></span>
      </button>
      ` : ''}
      <div class="flex-1 min-w-0">
        <p class="card-text font-medium truncate">${product?.name || productId}</p>
        ${details.length > 0 ? `<p class="text-sm muted-text">${details.join(' • ')}</p>` : ''}
      </div>
      <p class="card-text font-medium whitespace-nowrap">${formatCurrency(totalPrice, currency)}</p>
    </div>
  `
}

function renderBundleItem(bundle, session, currency) {
  // v2.0 uses ids.bundle, ids.products, pricing.product_total
  const bundleId = bundle.ids?.bundle ?? bundle.bundle_id
  const productIds = bundle.ids?.products ?? bundle.product_ids ?? []
  const totalPrice = bundle.pricing?.product_total ?? bundle.total_price ?? 0

  const bundleObj = session.bundles?.find(b => b.id === bundleId)

  // v2.0 has costs.insurance.amount, fallback to original bundle lookup
  let insurance = 0
  if (bundle.costs?.insurance?.amount) {
    insurance = bundle.costs.insurance.amount
  } else if (bundleObj?.insurancePrice) {
    insurance = bundleObj.insurancePrice * bundle.quantity
  }

  const showQty = session.manageQuantity
  // Use affiliated_url from API if available, fallback to url from API, then original bundle
  const bundleUrl = bundle.affiliated_url || bundle.url || bundleObj?.url || ''

  // Get product names in bundle
  const productNames = productIds.map(pid => {
    const product = session.products?.find(p => p.id === pid)
    return product?.name || pid
  }).join(', ')

  const details = []
  if (showQty) details.push(`${t("results.qty")}: ${bundle.quantity}`)
  if (productNames) details.push(productNames)
  if (insurance > 0) details.push(`${t("offers.insurance")}: ${formatCurrency(insurance, currency)}`)

  return `
    <div class="flex items-center py-2 gap-3">
      ${bundleUrl ? `
      <button class="open-offer-button primary-bg primary-text p-2 rounded-lg cursor-pointer hover:opacity-90 transition-opacity" data-url="${bundleUrl}" title="${t("offers.openInNewTab")}">
        <span class="icon icon-open_external h-5 w-5"></span>
      </button>
      ` : ''}
      <div class="flex-1 min-w-0">
        <p class="card-text font-medium truncate">${bundleObj?.name || t("results.bundle")}</p>
        ${details.length > 0 ? `<p class="text-sm muted-text truncate">${details.join(' • ')}</p>` : ''}
      </div>
      <p class="card-text font-medium whitespace-nowrap">${formatCurrency(totalPrice, currency)}</p>
    </div>
  `
}

function getStatusClass(status) {
  switch (status) {
    case 'OPTIMAL':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'FEASIBLE':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'INFEASIBLE':
    case 'ERROR':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }
}



function renderForwarderFeesBreakdownCard(data, session, currency) {
  // v2.0 API format: data.logistics.forwarders
  const forwarders = data.logistics?.forwarders
  const breakdown = data.forwarder_fees_breakdown

  // Use v2.0 format if available
  const total = forwarders?.total ?? breakdown?.total ?? 0
  const byProvider = forwarders?.by_provider ?? breakdown?.by_forwarder ?? {}

  if (total <= 0) return ''

  const forwarderNames = Object.keys(byProvider)
  if (forwarderNames.length === 0) return ''

  return `
    <div class="card-bg rounded-xl shadow-md p-4 mb-4">
      <h3 class="text-lg font-semibold card-text mb-3">${t("results.forwarderFeesBreakdown")}</h3>
      <div class="space-y-3">
        ${forwarderNames.map(name => {
    const detail = byProvider[name]
    // v2.0 uses 'reshipping', old format uses 're_shipping'
    const reshipping = detail.reshipping ?? detail.re_shipping ?? 0
    return `
            <div class="border-b border-default pb-2 last:border-0 last:pb-0">
              <div class="flex justify-between text-sm font-medium mb-1">
                <span class="card-text">${name}</span>
                <span class="card-text">${formatCurrency(detail.total, currency)}</span>
              </div>
              <div class="space-y-1 pl-2">
                ${detail.reception > 0 ? `
                <div class="flex justify-between text-xs">
                  <span class="muted-text">${t("results.forwarderReception")}</span>
                  <span class="muted-text">${formatCurrency(detail.reception, currency)}</span>
                </div>
                ` : ''}
                ${detail.storage > 0 ? `
                <div class="flex justify-between text-xs">
                  <span class="muted-text">${t("results.forwarderStorage")}</span>
                  <span class="muted-text">${formatCurrency(detail.storage, currency)}</span>
                </div>
                ` : ''}
                ${detail.repackaging > 0 ? `
                <div class="flex justify-between text-xs">
                  <span class="muted-text">${t("results.forwarderRepackaging")}</span>
                  <span class="muted-text">${formatCurrency(detail.repackaging, currency)}</span>
                </div>
                ` : ''}
                ${reshipping > 0 ? `
                <div class="flex justify-between text-xs">
                  <span class="muted-text">${t("results.forwarderReShipping")}</span>
                  <span class="muted-text">${formatCurrency(reshipping, currency)}</span>
                </div>
                ` : ''}
              </div>
            </div>
          `
  }).join('')}
      </div>
    </div>
  `
}
