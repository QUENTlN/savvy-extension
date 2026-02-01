import { t } from '../../../shared/i18n.js'
import { DEFAULT_CURRENCY } from '../../../shared/config/currencies.js'
import { getCurrencySymbol } from '../../utils/formatters.js'
import { Store } from '../../state.js'
import { SidebarAPI } from '../../api.js'
import { renderGroupItem, renderForwarderChainSection } from './SellerRulesView.js'
import { showAssignForwarderModal } from './modals/AssignForwarderModal.js'
import { showToast } from '../../utils/toast.js'
import {
    extractCalculationRule,
    updateValueLabels,
    updateNonTieredCurrencyLabels,
    validateAllTierForms,
    handleCalculationTypeChange,
    handleTieredToggle,
    handleUnitChange,
    handleTierValueModeChange,
    handleTierValueTypeChange,
    handleMaxChange,
    handleAddRange,
    handleRemoveRange,
    handlePackingModeChange,
} from '../../components/fees/index.js'
import { CURRENCIES } from '../../../shared/config/currencies.js'

// Re-export event handlers for use in SellerRulesPage
export {
    handleCalculationTypeChange,
    handleTieredToggle,
    handleUnitChange,
    handleTierValueModeChange,
    handleTierValueTypeChange,
    handleMaxChange,
    handleAddRange,
    handleRemoveRange,
    handlePackingModeChange,
}

// ============================================================================
// DATA MANAGEMENT
// ============================================================================

export function getSession() {
    return Store.state.sessions.find(s => s.id === Store.state.currentSession)
}

export function getRule(session, seller) {
    const rule = (session.deliveryRules || []).find(r => r.seller === seller) || {}
    if (!rule.billingMethod) {
        rule.billingMethod = 'global'
    }
    return rule
}

export function getSellerProducts(session, seller) {
    return session.products.filter(p =>
        p.offers.some(offer => offer.seller === seller)
    )
}

export function ensureDefaultRule(session, seller) {
    if (!session.deliveryRules) session.deliveryRules = []

    const existingRule = session.deliveryRules.find(r => r.seller === seller)

    if (!existingRule) {
        const defaultRule = {
            seller: seller,
            billingMethod: 'global',
            calculationMethod: {
                type: 'cumul'
            }
        }
        session.deliveryRules.push(defaultRule)
        return true
    }

    return false
}

export function navigateToList() {
    Store.setState({ currentRulesView: 'list', currentSellerEditing: null })
}

// ============================================================================
// EVENT HANDLER SETUP
// ============================================================================

export function setupSameSellerListener(container) {
    const sameSellerSelect = container.querySelector('.same-seller-select')
    if (!sameSellerSelect) return

    sameSellerSelect.addEventListener('change', (e) => {
        const value = e.target.value
        const configContainer = container.querySelector('.custom-config-container')
        if (!configContainer) return

        configContainer.style.display = (value && value !== 'None') ? 'none' : 'block'
    })
}

export function setupBillingMethodListeners(container, safeSellerId) {
    const radios = container.querySelectorAll('.billing-method-radio')
    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const val = e.target.value
            toggleBillingMethodSections(safeSellerId, val)
        })
    })
}

export function toggleBillingMethodSections(safeSellerId, method) {
    const globalFreeContainer = document.querySelector('.global-free-shipping-container')
    const groupsContainer = document.getElementById(`groups-container-${safeSellerId}`)
    const globalCalcContainer = document.getElementById(`calc-global-${safeSellerId}`)

    switch(method) {
        case 'global':
            if (globalFreeContainer) globalFreeContainer.style.display = 'block'
            if (groupsContainer) groupsContainer.style.display = 'none'
            if (globalCalcContainer) globalCalcContainer.style.display = 'block'
            break
        case 'groups':
            if (globalFreeContainer) globalFreeContainer.style.display = 'block'
            if (groupsContainer) groupsContainer.style.display = 'block'
            if (globalCalcContainer) globalCalcContainer.style.display = 'none'
            break
        case 'free':
            if (globalFreeContainer) globalFreeContainer.style.display = 'none'
            if (groupsContainer) groupsContainer.style.display = 'none'
            if (globalCalcContainer) globalCalcContainer.style.display = 'none'
            break
    }
}

export function setupFreeShippingToggle(container, selector, thresholdSelector) {
    const checkbox = container.querySelector(selector)
    if (!checkbox) return

    checkbox.addEventListener('change', (e) => {
        const inputDiv = container.querySelector(thresholdSelector)
        if (inputDiv) {
            inputDiv.style.display = e.target.checked ? 'block' : 'none'
        }
    })
}

export function setupCurrencyChangeListener(container) {
    const currencySelect = container.querySelector('.rule-currency-select')
    if (!currencySelect) return

    currencySelect.addEventListener('change', (e) => {
        const newCurrency = e.target.value

        // Update customs fees label
        const customsInput = container.querySelector('.customs-clearance-fees')
        if (customsInput) {
            const customsLabel = customsInput.previousElementSibling
            if (customsLabel && customsLabel.tagName === 'LABEL') {
                const currencySymbol = getCurrencySymbol(newCurrency)
                const labelText = customsLabel.textContent
                // Match pattern like "Frais de dédouanement (€)" or "Customs fees ($)"
                const match = labelText.match(/^(.+?)\s*\(.+?\)$/)
                if (match) {
                    customsLabel.textContent = `${match[1]} (${currencySymbol})`
                }
            }
        }

        // Update all calculation containers
        const calcContainers = container.querySelectorAll('.calculation-rules-container')
        calcContainers.forEach(calcContainer => {
            const prefix = calcContainer.dataset.prefix
            if (!prefix) return

            const data = extractCalculationRule(prefix, calcContainer)
            const type = data.type

            // Update tiered value labels
            const isTieredType = data.isTiered || ['weight_volume', 'weight_dimension'].includes(type)
            if (isTieredType && ['quantity', 'distance', 'weight', 'volume', 'dimension', 'weight_volume', 'weight_dimension'].includes(type)) {
                updateValueLabels(calcContainer, prefix, type, data, newCurrency)
            }

            // Update non-tiered currency labels (amount labels with currency symbols)
            updateNonTieredCurrencyLabels(calcContainer, newCurrency)
        })
    })
}

export function setupAddGroupButtonListener(session, seller, safeSellerId) {
    const addGroupBtn = document.querySelector('.add-group-btn')
    if (!addGroupBtn) return

    addGroupBtn.addEventListener('click', () => {
        const container = document.querySelector('.groups-list')
        const index = container.children.length
        const rule = getRule(session, seller)
        const newGroupHtml = renderGroupItem(session, seller, { name: t("deliveryRules.newGroupPlaceholder") }, index, safeSellerId, getSellerProducts, rule)

        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = newGroupHtml
        container.appendChild(tempDiv.firstElementChild)
    })
}

// ============================================================================
// FORWARDER CHAIN HANDLERS
// ============================================================================

export function handleAddForwarderToChain(session, seller) {
    showAssignForwarderModal(session, (forwarderId) => {
        const rule = getRule(session, seller)
        if (!rule.forwarderChain) rule.forwarderChain = []

        const maxOrder = rule.forwarderChain.length > 0
            ? Math.max(...rule.forwarderChain.map(f => f.order))
            : -1

        rule.forwarderChain.push({
            forwarderId,
            order: maxOrder + 1
        })

        // Re-render the forwarder chain section
        const oldSection = document.querySelector('.forwarder-chain-section')
        if (oldSection) {
            const newHtml = renderForwarderChainSection(session, rule)
            const temp = document.createElement('div')
            temp.innerHTML = newHtml
            oldSection.replaceWith(temp.firstElementChild)
        }
    })
}

export function handleMoveForwarderUp(seller, index) {
    const session = getSession()
    const rule = getRule(session, seller)
    if (!rule.forwarderChain) return

    const sorted = rule.forwarderChain.sort((a, b) => a.order - b.order)
    if (index === 0 || index >= sorted.length) return

    // Swap order values
    const tempOrder = sorted[index].order
    sorted[index].order = sorted[index - 1].order
    sorted[index - 1].order = tempOrder

    // Re-render the forwarder chain section
    const oldSection = document.querySelector('.forwarder-chain-section')
    if (oldSection) {
        const newHtml = renderForwarderChainSection(session, rule)
        const temp = document.createElement('div')
        temp.innerHTML = newHtml
        oldSection.replaceWith(temp.firstElementChild)
    }
}

export function handleMoveForwarderDown(seller, index) {
    const session = getSession()
    const rule = getRule(session, seller)
    if (!rule.forwarderChain) return

    const sorted = rule.forwarderChain.sort((a, b) => a.order - b.order)
    if (index < 0 || index >= sorted.length - 1) return

    // Swap order values
    const tempOrder = sorted[index].order
    sorted[index].order = sorted[index + 1].order
    sorted[index + 1].order = tempOrder

    // Re-render the forwarder chain section
    const oldSection = document.querySelector('.forwarder-chain-section')
    if (oldSection) {
        const newHtml = renderForwarderChainSection(session, rule)
        const temp = document.createElement('div')
        temp.innerHTML = newHtml
        oldSection.replaceWith(temp.firstElementChild)
    }
}

export function handleRemoveForwarder(seller, index) {
    const session = getSession()
    const rule = getRule(session, seller)
    if (!rule.forwarderChain) return

    const sorted = rule.forwarderChain.sort((a, b) => a.order - b.order)
    if (index < 0 || index >= sorted.length) return

    // Remove the forwarder at this index
    const forwarderToRemove = sorted[index]
    rule.forwarderChain = rule.forwarderChain.filter(f => f !== forwarderToRemove)

    // Re-normalize order values
    rule.forwarderChain.sort((a, b) => a.order - b.order).forEach((f, i) => {
        f.order = i
    })

    // Re-render the forwarder chain section
    const oldSection = document.querySelector('.forwarder-chain-section')
    if (oldSection) {
        const newHtml = renderForwarderChainSection(session, rule)
        const temp = document.createElement('div')
        temp.innerHTML = newHtml
        oldSection.replaceWith(temp.firstElementChild)
    }
}

// ============================================================================
// SAVE HANDLER
// ============================================================================

export function saveSellerRules(seller, safeSellerId, session) {
    if (!validateAllTierForms()) {
        showToast(t('validation.tier.fixErrorsBeforeSaving'), { type: 'error' })
        return
    }

    const currentRule = { seller }
    const sameSelect = document.querySelector('.same-seller-select')
    const copiedFromValue = sameSelect && sameSelect.value !== 'None' ? sameSelect.value : null

    if (copiedFromValue) {
        currentRule.copiedFrom = copiedFromValue
    } else {
        // Extract currency
        const ruleCurrencySelect = document.querySelector('.rule-currency-select')
        currentRule.currency = ruleCurrencySelect?.value || DEFAULT_CURRENCY

        const billingRadio = document.querySelector(`input[name="billing-method-${safeSellerId}"]:checked`)
        currentRule.billingMethod = billingRadio ? billingRadio.value : 'global'

        // Extract global free shipping threshold (available for both 'global' and 'groups' modes)
        // The checkbox state is deduced from whether a threshold exists, so we only save the threshold
        if (currentRule.billingMethod === 'global' || currentRule.billingMethod === 'groups') {
            const globalCb = document.querySelector('.global-free-shipping-checkbox')
            if (globalCb && globalCb.checked) {
                const globalInput = document.querySelector('.global-free-shipping-input')
                const threshold = parseFloat(globalInput.value)
                if (!isNaN(threshold) && threshold >= 0) {
                    currentRule.globalFreeShippingThreshold = threshold
                }
            }
        }

        if (currentRule.billingMethod === 'global') {
            currentRule.calculationMethod = extractCalculationRule(`global_${safeSellerId}`, document)

            // Extract distance from calculation method form (only shown when type='distance')
            const globalDistanceInput = document.querySelector(`[name="global_${safeSellerId}_distanceValue"]`)
            const globalDistanceUnitSelect = document.querySelector(`[name="global_${safeSellerId}_unit"]`)
            if (globalDistanceInput && globalDistanceInput.value) {
                const distance = parseFloat(globalDistanceInput.value)
                if (!isNaN(distance) && distance >= 0) {
                    currentRule.distance = distance
                    currentRule.distanceUnit = globalDistanceUnitSelect?.value || 'km'
                }
            }
        } else if (currentRule.billingMethod === 'groups') {
            currentRule.groups = []
            document.querySelectorAll('.group-item').forEach((groupDiv, idx) => {
                const name = groupDiv.querySelector('.group-name-input').value
                const freeShippingCb = groupDiv.querySelector('.group-free-shipping-checkbox')
                const productIds = Array.from(groupDiv.querySelectorAll('.group-product-checkbox:checked')).map(cb => cb.value)
                const calcMethod = extractCalculationRule(`group_${safeSellerId}_${idx}`, groupDiv)

                const group = {
                    id: Date.now().toString() + Math.random().toString().slice(2,6),
                    name,
                    productIds,
                    calculationMethod: calcMethod
                }

                // Extract distance from calculation method form (only shown when type='distance')
                const groupDistanceInput = groupDiv.querySelector(`[name="group_${safeSellerId}_${idx}_distanceValue"]`)
                const groupDistanceUnitSelect = groupDiv.querySelector(`[name="group_${safeSellerId}_${idx}_unit"]`)
                if (groupDistanceInput && groupDistanceInput.value) {
                    const distance = parseFloat(groupDistanceInput.value)
                    if (!isNaN(distance) && distance >= 0) {
                        group.distance = distance
                        group.distanceUnit = groupDistanceUnitSelect?.value || 'km'
                    }
                }

                // Only save threshold if checkbox is checked (checkbox state deduced from threshold existence)
                if (freeShippingCb && freeShippingCb.checked) {
                    const freeThresholdInput = groupDiv.querySelector('.group-free-shipping-input')
                    const threshold = parseFloat(freeThresholdInput.value)
                    if (!isNaN(threshold) && threshold >= 0) {
                        group.freeShippingThreshold = threshold
                    }
                }

                currentRule.groups.push(group)
            })
        } else if (currentRule.billingMethod === 'free') {
            currentRule.calculationMethod = { type: 'free' }
        }

        if (session.importFeesEnabled) {
            const customsFeeInput = document.querySelector('.customs-clearance-fees')
            if (customsFeeInput) currentRule.customsClearanceFee = parseFloat(customsFeeInput.value) || 0
        }
    }

    // Extract forwarder chain from the current rule in session
    const existingRule = getRule(session, seller)
    if (existingRule && existingRule.forwarderChain) {
        currentRule.forwarderChain = existingRule.forwarderChain
    }

    if (!session.deliveryRules) session.deliveryRules = []
    const ruleIndex = session.deliveryRules.findIndex(r => r.seller === seller)
    if (ruleIndex > -1) session.deliveryRules[ruleIndex] = currentRule
    else session.deliveryRules.push(currentRule)

    Store.sync(SidebarAPI.updateSession(Store.state.currentSession, session)).then(() => {
        Store.setState({ currentRulesView: 'list', currentSellerEditing: null })
    })
}
