import { t } from '../../../shared/i18n.js'
import { CURRENCIES, DEFAULT_CURRENCY } from '../../../shared/config/currencies.js'
import { getCurrencySymbol } from '../../utils/formatters.js'
import { getUniqueSellers } from '../../utils/sellers.js'
import { renderRadioOption, renderToggleSwitch, renderConditionalThresholdInput } from '../../components/formElements.js'
import { renderCalculationRules } from '../../components/fees/index.js'

// ============================================================================
// GROUP ITEM RENDERER
// ============================================================================

export function renderGroupItem(session, seller, group, gIdx, safeSellerId, getSellerProducts, rule) {
    return `
        <div class="group-item p-4 border border-default rounded-lg bg-[hsl(var(--card))]" data-index="${gIdx}">
            <div class="flex justify-between items-center mb-4">
                <input type="text" class="group-name-input bg-transparent border-b border-default focus:border-primary focus:outline-none font-medium text-sm" value="${group.name || ''}" placeholder="${t("deliveryRules.groupName")}">
                <button class="text-red-500 hover:text-red-700 delete-group-btn transition-colors p-1">
                    <span class="icon icon-delete h-5 w-5"></span>
                </button>
            </div>
            <div class="mb-4">
                 <p class="text-xs font-semibold secondary-text mb-2 uppercase tracking-wide px-1">${t("deliveryRules.products")}</p>
                 <div class="max-h-40 overflow-y-auto border border-default rounded-lg p-2 bg-[hsl(var(--muted))] scrollbar-thin">
                     ${getSellerProducts(session, seller).map(prod => `
                        <label class="flex items-center space-x-3 py-2 px-1 cursor-pointer group">
                            <input type="checkbox" class="group-product-checkbox sr-only peer" data-seller="${seller}" data-group-index="${gIdx}" value="${prod.id}" ${group.productIds && group.productIds.includes(prod.id) ? 'checked' : ''}>
                            <div class="w-4 h-4 rounded border border-default flex items-center justify-center peer-checked:border-[hsl(var(--primary))] peer-checked:bg-[hsl(var(--primary))] transition-all">
                                <div class="w-1.5 h-1.5 rounded-sm bg-white scale-0 peer-checked:scale-100 transition-transform"></div>
                            </div>
                            <span class="text-sm secondary-text peer-checked:card-text transition-colors truncate" title="${prod.name}">${prod.name}</span>
                        </label>
                    `).join('')}
                 </div>
            </div>
            <div class="mb-4 bg-[hsl(var(--muted))] rounded-lg p-3 border border-default">
                <div class="flex items-center justify-between">
                    <span class="text-sm font-medium card-text">${t("deliveryRules.freeDeliveryCondition")}</span>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" class="group-free-shipping-checkbox sr-only peer" ${group.freeShippingThreshold !== null && group.freeShippingThreshold !== undefined && group.freeShippingThreshold !== '' ? 'checked' : ''}>
                        <div class="toggle-switch"></div>
                    </label>
                </div>
                <div class="mt-3 group-free-shipping-threshold" style="display: ${group.freeShippingThreshold !== null && group.freeShippingThreshold !== undefined && group.freeShippingThreshold !== '' ? 'block' : 'none'}">
                    <label class="block text-xs secondary-text mb-1 ml-1">${t("deliveryRules.freeDeliveryThreshold")}</label>
                    <input type="number" class="w-full px-3 py-2 border border-default input-bg card-text rounded-md group-free-shipping-input focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" value="${group.freeShippingThreshold || ''}" placeholder="0.00" step="0.01">
                </div>
            </div>
            <div class="step-3-group">
                 ${renderCalculationRules(`group_${safeSellerId}_${gIdx}`, group.calculationMethod || { type: 'fixed' }, {
                    preset: 'sellerShipping',
                    session: session,
                    currency: rule.currency || session.currency || DEFAULT_CURRENCY
                })}
            </div>
        </div>
    `
}

// ============================================================================
// SELLER EDITOR VIEW SECTIONS
// ============================================================================

export function renderSellerEditorHeader(seller) {
    return `
        <div class="flex items-center space-x-3 mb-4">
            <button class="muted-text p-2 cursor-pointer" id="back-to-list-button">
                <span class="icon icon-back h-8 w-8"></span>
            </button>
            <h1 class="text-2xl font-semibold card-text truncate flex-1">${seller}</h1>
        </div>
    `
}

export function renderSameSellerSelector(session, seller, copiedFrom) {
    const otherSellers = getUniqueSellers(session).filter(s => s !== seller)

    return `
        <div class="mb-6">
            <label class="block text-sm font-medium secondary-text mb-1">${t("deliveryRules.sameSellerAs")}</label>
            <select class="same-seller-select w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border-transparent" data-seller="${seller}">
                <option value="None" ${copiedFrom === 'None' ? 'selected' : ''}>${t("deliveryRules.none")}</option>
                ${otherSellers.map(s2 => `<option value="${s2}" ${copiedFrom === s2 ? 'selected' : ''}>${s2}</option>`).join('')}
            </select>
        </div>
    `
}

export function renderRuleCurrencySelector(session, rule) {
    const ruleCurrency = rule.currency || session.currency || DEFAULT_CURRENCY

    return `
        <div class="mb-6">
            <label class="block text-sm font-medium secondary-text mb-1">${t("forwarders.currency")}</label>
            <select class="rule-currency-select w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border-transparent">
                ${CURRENCIES.map(c => `<option value="${c.code}" ${ruleCurrency === c.code ? 'selected' : ''}>${c.code} - ${c.label} (${c.symbol})</option>`).join('')}
            </select>
        </div>
    `
}

export function renderGlobalFreeShippingContainer(rule, billingMethod) {
    const globalThreshold = rule.globalFreeShippingThreshold || ''
    const hasThreshold = globalThreshold !== null && globalThreshold !== undefined && globalThreshold !== ''
    const visible = billingMethod === 'global' || billingMethod === 'groups'

    return `
        <div class="mb-6 global-free-shipping-container bg-[hsl(var(--muted))] rounded-xl p-4 border border-default" style="display: ${visible ? 'block' : 'none'}">
            ${renderToggleSwitch({
                id: 'global-free-shipping-checkbox',
                label: t("deliveryRules.freeDeliveryCondition"),
                checked: hasThreshold,
                additionalClasses: 'global-free-shipping-checkbox'
            })}
            ${renderConditionalThresholdInput({
                containerClass: 'mt-3 global-free-shipping-threshold',
                inputClass: 'global-free-shipping-input',
                label: t("deliveryRules.freeDeliveryThreshold"),
                value: globalThreshold,
                visible: hasThreshold
            })}
        </div>
    `
}

// ============================================================================
// FORWARDER CHAIN SECTION
// ============================================================================

export function renderForwarderChainSection(session, rule) {
    if (!session.forwardersEnabled) return ''

    const forwarderChain = rule.forwarderChain || []
    const forwarders = session.forwarders || []

    return `
        <div class="forwarder-chain-section mb-8 p-6 bg-[hsl(var(--muted))]/30 rounded-xl border border-default">
            <h3 class="text-lg font-semibold card-text mb-2">${t("deliveryRules.forwarderChain")}</h3>
            <p class="text-sm secondary-text mb-4">${t("deliveryRules.forwarderChainHelp")}</p>

            ${forwarderChain.length === 0 ? `
                <p class="text-sm italic secondary-text mb-4">${t("deliveryRules.directShipping")}</p>
            ` : `
                <div class="space-y-2 mb-4 forwarder-chain-list">
                    ${forwarderChain
                        .sort((a, b) => a.order - b.order)
                        .map((link, idx) => {
                            const forwarder = forwarders.find(f => f.id === link.forwarderId)
                            return `
                                <div class="flex items-center justify-between p-3 bg-[hsl(var(--card))] rounded-lg border border-default forwarder-chain-item" data-index="${idx}" data-forwarder-id="${link.forwarderId}">
                                    <div class="flex items-center space-x-3">
                                        <span class="font-semibold secondary-text text-sm">#${idx + 1}</span>
                                        <span class="font-medium card-text">${forwarder ? forwarder.name : 'Unknown'}</span>
                                    </div>
                                    <div class="flex space-x-2">
                                        ${idx > 0 ? `<button class="move-up-btn p-1 secondary-text hover:text-primary transition-colors" data-index="${idx}" title="${t("deliveryRules.moveUp")}">
                                            <span class="icon icon-up h-5 w-5">↑</span>
                                        </button>` : '<div class="w-7"></div>'}
                                        ${idx < forwarderChain.length - 1 ? `<button class="move-down-btn p-1 secondary-text hover:text-primary transition-colors" data-index="${idx}" title="${t("deliveryRules.moveDown")}">
                                            <span class="icon icon-down h-5 w-5">↓</span>
                                        </button>` : '<div class="w-7"></div>'}
                                        <button class="remove-forwarder-btn p-1 secondary-text hover:text-red-500 transition-colors" data-index="${idx}" title="${t("deliveryRules.removeFromChain")}">
                                            <span class="icon icon-delete h-5 w-5">×</span>
                                        </button>
                                    </div>
                                </div>
                            `
                        }).join('')}
                </div>
            `}

            <button class="add-forwarder-to-chain-btn w-full py-3 flex items-center justify-center space-x-2 secondary-bg secondary-text rounded-lg hover:opacity-90 transition-colors border border-default">
                <span class="icon icon-plus h-5 w-5">+</span>
                <span class="font-medium">${t("deliveryRules.addToChain")}</span>
            </button>
        </div>
    `
}

export function renderBillingMethodSection(rule, safeSellerId) {
    const billingMethod = rule.billingMethod || 'global'

    return `
        <div class="step-1 mb-6">
            <h5 class="text-sm font-semibold secondary-text mb-2">${t("deliveryRules.billingMethod")}</h5>
            <div class="space-y-3 mb-4">
                ${renderRadioOption({
                    name: `billing-method-${safeSellerId}`,
                    value: 'global',
                    checked: billingMethod === 'global',
                    label: t("deliveryRules.sameFee"),
                    helpText: t("deliveryRules.billingMethodSameFeeHelp"),
                    additionalClasses: 'billing-method-radio'
                })}
                ${renderRadioOption({
                    name: `billing-method-${safeSellerId}`,
                    value: 'groups',
                    checked: billingMethod === 'groups',
                    label: t("deliveryRules.dependsOnProducts"),
                    helpText: t("deliveryRules.billingMethodDependsHelp"),
                    additionalClasses: 'billing-method-radio'
                })}
                ${renderRadioOption({
                    name: `billing-method-${safeSellerId}`,
                    value: 'free',
                    checked: billingMethod === 'free',
                    label: t("deliveryRules.freeDelivery"),
                    helpText: null,
                    helpIcon: false,
                    additionalClasses: 'billing-method-radio'
                })}
            </div>
            ${renderGlobalFreeShippingContainer(rule, billingMethod)}
        </div>
    `
}

export function renderGroupsSection(session, seller, rule, safeSellerId, getSellerProducts) {
    const billingMethod = rule.billingMethod || 'global'
    const visible = billingMethod === 'groups'

    return `
        <div class="step-2 mb-6" id="groups-container-${safeSellerId}" style="display: ${visible ? 'block' : 'none'}">
            <h5 class="text-sm font-semibold secondary-text mb-3 px-1">${t("deliveryRules.dependsOnProducts")}</h5>

            <div class="groups-list space-y-4 mb-6" data-seller="${seller}">
                ${(rule.groups || []).map((group, gIdx) => renderGroupItem(session, seller, group, gIdx, safeSellerId, getSellerProducts, rule)).join('')}
            </div>

            <button class="add-group-btn w-full py-3 flex items-center justify-center space-x-2 text-sm font-semibold secondary-bg secondary-text hover:bg-[hsl(var(--muted))] rounded-xl border border-default transition-all shadow-sm" data-seller="${seller}">
                <span class="icon icon-plus h-4 w-4"></span>
                <span>${t("deliveryRules.addGroup")}</span>
            </button>
        </div>
    `
}

export function renderGlobalCalculationSection(rule, safeSellerId, session) {
    const billingMethod = rule.billingMethod || 'global'
    const visible = billingMethod === 'global'

    return `
        <div class="step-3-global mb-6" id="calc-global-${safeSellerId}" style="display: ${visible ? 'block' : 'none'}">
            ${renderCalculationRules(`global_${safeSellerId}`, rule.calculationMethod || {}, {
                preset: 'sellerShipping',
                session: session,
                showFreeOption: false,
                currency: rule.currency || session.currency || DEFAULT_CURRENCY
            })}
        </div>
    `
}

export function renderCustomsFeesSection(session, rule, seller) {
    if (!session.importFeesEnabled) return ''

    const ruleCurrency = rule.currency || session.currency || DEFAULT_CURRENCY
    const currencySymbol = getCurrencySymbol(ruleCurrency)

    return `
        <div class="mt-6 pt-6 border-t border-default">
            <label class="block text-sm font-medium secondary-text mb-1">${t("deliveryRules.customsClearanceFees")} (${currencySymbol})</label>
            <div class="flex gap-3">
                <input type="number" step="0.01" value="${rule.customsClearanceFee || 0}" class="customs-clearance-fees flex-1 px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border-transparent" data-seller="${seller}" placeholder="0.00">
            </div>
        </div>
    `
}

export function renderCustomConfigContainer(session, seller, rule, safeSellerId, copiedFrom, getSellerProducts) {
    const visible = copiedFrom === 'None'

    return `
        <div class="custom-config-container" style="display: ${visible ? 'block' : 'none'}">
            ${renderRuleCurrencySelector(session, rule)}
            ${renderForwarderChainSection(session, rule)}
            ${renderBillingMethodSection(rule, safeSellerId)}
            ${renderGroupsSection(session, seller, rule, safeSellerId, getSellerProducts)}
            ${renderGlobalCalculationSection(rule, safeSellerId, session)}
            ${renderCustomsFeesSection(session, rule, seller)}
        </div>
    `
}

export function renderSaveButton() {
    return `
        <button id="save-seller-rules" class="w-full mt-8 flex items-center justify-center space-x-2 cursor-pointer primary-bg primary-text px-4 py-4 rounded-xl hover:opacity-90 transition-all shadow-md">
            <span class="text-lg font-semibold">${t("common.save")}</span>
        </button>
    `
}

// ============================================================================
// MAIN SELLER RULES VIEW
// ============================================================================

export function renderSellerRulesView({ session, seller, rule, safeSellerId, copiedFrom, getSellerProducts }) {
    return `
        <div class="mx-4 pb-8">
            ${renderSellerEditorHeader(seller)}
            <div class="seller-card card-bg rounded-xl shadow-md p-6 border border-default">
                ${renderSameSellerSelector(session, seller, copiedFrom)}
                ${renderCustomConfigContainer(session, seller, rule, safeSellerId, copiedFrom, getSellerProducts)}
                ${renderSaveButton()}
            </div>
        </div>
    `
}
