import { t } from '../../../shared/i18n.js'
import {
    getValueLabel,
    getHelpTextForMode,
    renderFixedInputs,
    renderPercentageInputs,
    renderTieredInputs,
    renderOrderAmountInputs,
    renderDimensionInputs,
    renderCombinedInputs,
    renderVolumePackagesInputs,
    renderRangeRow,
    renderSimplePackingModeSelector
} from './FeeCalculationView.js'
import { getCurrencySymbol } from '../../utils/formatters.js'
import { StorageService } from '../../utils/StorageService.js'
import { Store } from '../../state.js'

// ============================================================================
// EXTRACTION HELPERS
// ============================================================================

export function extractRangesFromInputs(prefix, container, nullableFields = ['max']) {
    const rangeInputs = Array.from(container.querySelectorAll(`input[name^="${prefix}_range_"]`))
    const rangesMap = {}

    rangeInputs.forEach(inp => {
        const match = inp.name.match(new RegExp(`${prefix}_range_(\\d+)_(.+)`))
        if (match) {
            const idx = match[1]
            const field = match[2]
            if (!rangesMap[idx]) rangesMap[idx] = {}

            const isEmpty = inp.value === '' || inp.value === null || inp.value === undefined
            if (nullableFields.includes(field) && isEmpty) {
                rangesMap[idx][field] = null
            } else {
                const parsedValue = parseFloat(inp.value)
                rangesMap[idx][field] = isNaN(parsedValue) ? 0 : parsedValue
            }
        }
    })

    return Object.values(rangesMap)
}

export function extractCalculationRule(prefix, container) {
    const typeRadio = container.querySelector(`input[name="${prefix}_type"]:checked`)
    const type = typeRadio ? typeRadio.value : 'fixed'

    const rule = { type }

    // Extract packingMode for all types (it may or may not be present depending on forwardersEnabled)
    const packingModeRadio = container.querySelector(`input[name="${prefix}_packingMode"]:checked`)
    if (packingModeRadio) {
        rule.packingMode = packingModeRadio.value
    }

    if (type === 'fixed') {
        const amountInput = container.querySelector(`input[name="${prefix}_amount"]`)
        rule.amount = amountInput ? parseFloat(amountInput.value) || 0 : 0
    } else if (type === 'percentage') {
        const baseRadio = container.querySelector(`input[name="${prefix}_base"]:checked`)
        rule.base = baseRadio ? baseRadio.value : 'order'
        const rateInput = container.querySelector(`input[name="${prefix}_rate"]`)
        const ratePercent = rateInput ? parseFloat(rateInput.value) || 0 : 0
        rule.rate = ratePercent / 100
    } else if (['quantity', 'distance', 'weight', 'volume'].includes(type)) {
        const unitSelect = container.querySelector(`select[name="${prefix}_unit"]`)
        if (unitSelect) rule.unit = unitSelect.value

        const isTieredCb = container.querySelector(`input[name="${prefix}_isTiered"]`)
        rule.isTiered = isTieredCb ? isTieredCb.checked : false

        if (!rule.isTiered) {
            const amountInput = container.querySelector(`input[name="${prefix}_amount"]`)
            rule.amount = amountInput ? parseFloat(amountInput.value) || 0 : 0
        } else {
            const valTypeRadio = container.querySelector(`input[name="${prefix}_tierValueType"]:checked`)
            rule.tierValueType = valTypeRadio ? valTypeRadio.value : 'fixed'

            const valModeRadio = container.querySelector(`input[name="${prefix}_tierValueMode"]:checked`)
            rule.tierValueMode = valModeRadio ? valModeRadio.value : 'perUnit'

            rule.ranges = extractRangesFromInputs(prefix, container, ['max'])
        }
    } else if (type === 'dimension') {
        const unitSelect = container.querySelector(`select[name="${prefix}_unit"]`)
        if (unitSelect) rule.unit = unitSelect.value

        // Extract packing mode
        const packingModeRadio = container.querySelector(`input[name="${prefix}_packingMode"]:checked`)
        rule.packingMode = packingModeRadio ? packingModeRadio.value : 'grouped'

        // Extract allowConversion
        const allowConversionCb = container.querySelector(`input[name="${prefix}_allowConversion"]`)
        rule.allowConversion = allowConversionCb ? allowConversionCb.checked : false

        rule.ranges = extractRangesFromInputs(prefix, container, ['maxL', 'maxW', 'maxH'])

    } else if (['weight_volume', 'weight_dimension'].includes(type)) {
        const wUnit = container.querySelector(`select[name="${prefix}_weightUnit"]`)
        if (wUnit) rule.weightUnit = wUnit.value
        const vUnit = container.querySelector(`select[name="${prefix}_volUnit"]`)
        if (vUnit) rule.volUnit = vUnit.value

        // Extract packing mode
        const packingModeRadio = container.querySelector(`input[name="${prefix}_packingMode"]:checked`)
        rule.packingMode = packingModeRadio ? packingModeRadio.value : 'grouped'

        // Extract allowConversion
        const allowConversionCb = container.querySelector(`input[name="${prefix}_allowConversion"]`)
        rule.allowConversion = allowConversionCb ? allowConversionCb.checked : false

        rule.ranges = extractRangesFromInputs(prefix, container, ['maxWeight', 'maxVol'])
    } else if (type === 'volume_packages') {
        const unitSelect = container.querySelector(`select[name="${prefix}_unit"]`)
        if (unitSelect) rule.unit = unitSelect.value

        // Extract packing mode
        const packingModeRadio = container.querySelector(`input[name="${prefix}_packingMode"]:checked`)
        rule.packingMode = packingModeRadio ? packingModeRadio.value : 'grouped'

        // Extract allowConversion
        const allowConversionCb = container.querySelector(`input[name="${prefix}_allowConversion"]`)
        rule.allowConversion = allowConversionCb ? allowConversionCb.checked : false

        rule.ranges = extractRangesFromInputs(prefix, container, ['maxVol'])
    } else if (type === 'order_amount') {
        // Always tiered, always 'total' mode
        rule.tierValueMode = 'total'

        const valTypeRadio = container.querySelector(`input[name="${prefix}_tierValueType"]:checked`)
        rule.tierValueType = valTypeRadio ? valTypeRadio.value : 'fixed'

        rule.ranges = extractRangesFromInputs(prefix, container, ['max'])
    }

    // Convert percentage values from percent to decimal
    if (rule.ranges && (rule.tierValueType === 'pctOrder' || rule.tierValueType === 'pctDelivery')) {
        rule.ranges = rule.ranges.map(range => ({
            ...range,
            value: range.value !== undefined ? range.value / 100 : range.value
        }))
    }

    return rule
}

// ============================================================================
// UPDATE VALUE LABELS
// ============================================================================

export function updateNonTieredCurrencyLabels(container, currency) {
    if (!currency) return

    const symbol = getCurrencySymbol(currency)

    // Update non-tiered amount labels that contain currency symbols
    const amountLabels = container.querySelectorAll('label')
    amountLabels.forEach(label => {
        const text = label.textContent
        // Match pattern like "Montant (€/kg)" or "Amount ($/item)"
        // Use [^\/]+ to match any currency symbol (one or more non-slash characters)
        const match = text.match(/^(.+?)\s*\([^\/]+\/(.*?)\)$/)
        if (match) {
            const prefix = match[1].trim()  // e.g., "Montant" or "Amount"
            const unit = match[2]           // e.g., "kg", "item"
            label.textContent = `${prefix} (${symbol}/${unit})`
        }
    })
}

export function updateValueLabels(container, prefix, type, data, currency = null) {
    const tierValueType = data.tierValueType || 'fixed'
    const tierValueMode = data.tierValueMode || 'perUnit'
    const unit = data.unit || ''
    const weightUnit = data.weightUnit || ''
    const volUnit = data.volUnit || ''

    let valueLabel = ''
    if (type === 'weight_volume' || type === 'weight_dimension') {
        valueLabel = getValueLabel(type, 'fixed', 'total', weightUnit, volUnit, currency)
    } else if (type === 'dimension') {
        valueLabel = getValueLabel(type, 'fixed', 'total', unit, '', currency)
    } else {
        valueLabel = getValueLabel(type, tierValueType, tierValueMode, unit, '', currency)
    }

    if (['dimension', 'weight_volume', 'weight_dimension'].includes(type)) {
        const rangesContainer = container.querySelector('.ranges-container')
        if (rangesContainer) {
            let headerRow = rangesContainer.previousElementSibling
            while (headerRow && !headerRow.classList.contains('flex')) {
                headerRow = headerRow.previousElementSibling
            }

            if (headerRow) {
                const headerDivs = Array.from(headerRow.querySelectorAll('div'))
                const valueHeaderDiv = headerDivs.find(div => {
                    const text = div.textContent || ''
                    return text.includes(t('deliveryRules.value'))
                })

                if (valueHeaderDiv) {
                    valueHeaderDiv.textContent = `${t('deliveryRules.value')} (${valueLabel})`
                }
            }
        }
    } else if (['quantity', 'distance', 'weight', 'volume'].includes(type)) {
        const rangeRows = container.querySelectorAll('.range-row')
        rangeRows.forEach(row => {
            const valueInput = row.querySelector('input[name$="_value"]')
            if (valueInput) {
                const parent = valueInput.parentElement
                const existingSpan = parent.querySelector('span.absolute')
                if (existingSpan) {
                    existingSpan.textContent = `${t('deliveryRules.value')} (${valueLabel})`
                }
            }
        })
    }
}

// ============================================================================
// TIER VALIDATION
// ============================================================================

export function getTierType(container) {
    const prefix = container.dataset.prefix
    const typeRadio = container.querySelector(`input[name="${prefix}_type"]:checked`)
    return typeRadio ? typeRadio.value : 'quantity'
}

export function requiresInteger(type) {
    return type === 'quantity'
}

export function getMinValueForFirstTier(type) {
    return requiresInteger(type) ? 1 : 0
}

export function parseTierRange(row, type) {
    const minInput = row.querySelector('input[name$="_min"]')
    const maxInput = row.querySelector('input[name$="_max"]')
    const valueInput = row.querySelector('input[name$="_value"]')

    let maxValue = null
    if (maxInput && maxInput.value !== '') {
        const parsed = parseFloat(maxInput.value)
        maxValue = !isNaN(parsed) ? parsed : null
    }

    return {
        row: row,
        index: parseInt(row.dataset.index),
        min: minInput ? parseFloat(minInput.value) || 0 : 0,
        max: maxValue,
        value: valueInput ? parseFloat(valueInput.value) || 0 : 0,
        minInput: minInput,
        maxInput: maxInput,
        valueInput: valueInput
    }
}

export function getAllTierRanges(container, type) {
    const rangesContainer = container.querySelector('.ranges-container')
    if (!rangesContainer) return []

    const rows = Array.from(rangesContainer.querySelectorAll('.range-row'))
    return rows.map(row => parseTierRange(row, type))
}

export function showTierInputError(input, message, severity = 'warning') {
    if (!input) return

    clearTierInputError(input)

    if (severity === 'error') {
        input.classList.add('!border-red-500', 'focus:!ring-red-500')
        input.dataset.errorSeverity = 'error'
    } else {
        input.classList.add('!border-orange-500', 'focus:!ring-orange-500')
        input.dataset.errorSeverity = 'warning'
    }

    const row = input.closest('.range-row')
    if (row) {
        let errorDiv = row.nextElementSibling
        if (!errorDiv || !errorDiv.classList.contains('tier-error-message')) {
            errorDiv = document.createElement('div')
            errorDiv.className = 'tier-error-message text-xs mt-1 px-2 mb-2'
            row.parentNode.insertBefore(errorDiv, row.nextSibling)
        }

        if (severity === 'error') {
            errorDiv.className = 'tier-error-message text-xs text-red-500 mt-1 px-2 mb-2'
        } else {
            errorDiv.className = 'tier-error-message text-xs text-orange-500 mt-1 px-2 mb-2'
        }

        errorDiv.textContent = message
    }
}

export function clearTierInputError(input) {
    if (!input) return

    input.classList.remove('!border-red-500', 'focus:!ring-red-500', '!border-orange-500', 'focus:!ring-orange-500')
    delete input.dataset.errorSeverity

    const row = input.closest('.range-row')
    if (row) {
        const errorDiv = row.nextElementSibling
        if (errorDiv && errorDiv.classList.contains('tier-error-message')) {
            errorDiv.remove()
        }
    }
}

export function clearAllTierErrors(container) {
    const inputs = container.querySelectorAll('input[data-error-severity]')
    inputs.forEach(input => clearTierInputError(input))

    const errorDivs = container.querySelectorAll('.tier-error-message')
    errorDivs.forEach(div => div.remove())

    const rangesContainer = container.querySelector('.ranges-container')
    if (rangesContainer) {
        const containerError = rangesContainer.querySelector('.tier-container-error')
        if (containerError) containerError.remove()
    }
}

export function validateMinValue(range, type, isFirstTier, severity = 'warning') {
    const minRequired = isFirstTier ? getMinValueForFirstTier(type) : 0

    if (range.min < minRequired) {
        const message = isFirstTier && requiresInteger(type)
            ? t('validation.tier.minMustBeOne')
            : t('validation.tier.minMustBeZeroOrMore')
        showTierInputError(range.minInput, message, severity)
        return false
    }

    return true
}

export function validateMaxGreaterThanMin(range, type, severity = 'warning') {
    if (range.max !== null && range.max <= range.min) {
        showTierInputError(range.maxInput, t('validation.tier.maxMustBeGreaterThanMin'), severity)
        return false
    }

    return true
}

export function validateNumericFields(range, type, severity = 'warning', isLastTier = false) {
    let valid = true

    if (range.minInput) {
        const minValue = range.minInput.value.trim()
        if (minValue === '' || isNaN(parseFloat(minValue))) {
            showTierInputError(range.minInput, t('validation.tier.mustBeNumber'), severity)
            valid = false
        }
    }

    if (range.maxInput) {
        const maxValue = range.maxInput.value.trim()

        if (maxValue === '') {
            if (!isLastTier) {
                showTierInputError(range.maxInput, t('validation.tier.mustBeNumber'), severity)
                valid = false
            }
        } else if (isNaN(parseFloat(maxValue))) {
            showTierInputError(range.maxInput, t('validation.tier.mustBeNumber'), severity)
            valid = false
        }
    }

    if (range.valueInput) {
        const valueStr = range.valueInput.value.trim()
        if (severity === 'error') {
            if (valueStr === '' || isNaN(parseFloat(valueStr))) {
                showTierInputError(range.valueInput, t('validation.tier.mustBeNumber'), severity)
                valid = false
            }
        } else {
            if (valueStr !== '' && isNaN(parseFloat(valueStr))) {
                showTierInputError(range.valueInput, t('validation.tier.mustBeNumber'), severity)
                valid = false
            }
        }
    }

    return valid
}

export function validateIntegerConstraint(range, type, severity = 'warning') {
    if (!requiresInteger(type)) return true

    let valid = true

    if (!isNaN(range.min) && range.min !== Math.floor(range.min)) {
        showTierInputError(range.minInput, t('validation.tier.mustBeInteger'), severity)
        valid = false
    }

    if (range.max !== null && !isNaN(range.max) && range.max !== Math.floor(range.max)) {
        showTierInputError(range.maxInput, t('validation.tier.mustBeInteger'), severity)
        valid = false
    }

    return valid
}

export function validateValueField(range, severity = 'warning') {
    if (!range.valueInput) return true

    const valueStr = range.valueInput.value.trim()

    if (severity === 'error' && valueStr === '') {
        showTierInputError(range.valueInput, t('validation.tier.valueRequired'), severity)
        return false
    }

    if (range.value < 0) {
        showTierInputError(range.valueInput, t('validation.tier.valueMustBePositive'), severity)
        return false
    }

    return true
}

export function validateContinuity(currentRange, previousRange, type, severity = 'warning') {
    if (!previousRange) return true

    if (previousRange.max === null) {
        return true
    }

    const expectedMin = requiresInteger(type) ? previousRange.max + 1 : previousRange.max

    if (currentRange.min !== expectedMin) {
        const message = t('validation.tier.gapBetweenTiers')
        showTierInputError(currentRange.minInput, message, severity)
        return false
    }

    return true
}

export function validateNoOverlap(currentRange, previousRange, type, severity = 'warning') {
    if (!previousRange || previousRange.max === null) return true

    const minRequired = requiresInteger(type) ? previousRange.max + 1 : previousRange.max

    if (currentRange.min < minRequired) {
        showTierInputError(currentRange.minInput, t('validation.tier.overlapDetected'), severity)
        return false
    }

    return true
}

export function validateLastTierInfinity(ranges, severity = 'error') {
    if (ranges.length === 0) return true

    const lastRange = ranges[ranges.length - 1]
    if (lastRange.max !== null) {
        showTierInputError(lastRange.maxInput, t('validation.tier.lastTierMustBeInfinity'), severity)
        return false
    }

    return true
}

export function validateAtLeastOneTier(ranges, container, severity = 'error') {
    if (ranges.length === 0) {
        const rangesContainer = container.querySelector('.ranges-container')
        if (rangesContainer) {
            let errorDiv = rangesContainer.querySelector('.tier-container-error')
            if (!errorDiv) {
                errorDiv = document.createElement('div')
                errorDiv.className = 'tier-container-error text-xs text-red-500 mt-1 px-2 mb-2'
                rangesContainer.insertBefore(errorDiv, rangesContainer.firstChild)
            }
            errorDiv.textContent = t('validation.tier.atLeastOneTierRequired')
        }
        return false
    }

    const rangesContainer = container.querySelector('.ranges-container')
    if (rangesContainer) {
        const errorDiv = rangesContainer.querySelector('.tier-container-error')
        if (errorDiv) errorDiv.remove()
    }

    return true
}

export function validateNoDuplicates(ranges, severity = 'error') {
    const seen = new Set()
    let valid = true

    ranges.forEach(range => {
        const key = `${range.min}-${range.max}`
        if (seen.has(key)) {
            showTierInputError(range.minInput, t('validation.tier.duplicateRange'), severity)
            showTierInputError(range.maxInput, t('validation.tier.duplicateRange'), severity)
            valid = false
        }
        seen.add(key)
    })

    return valid
}

export function performLiveValidation(input, container) {
    const type = getTierType(container)
    const ranges = getAllTierRanges(container, type)
    const row = input.closest('.range-row')

    if (!row) return

    const currentRange = parseTierRange(row, type)
    const currentIndex = ranges.findIndex(r => r.row === row)
    const isFirstTier = currentIndex === 0
    const isLastTier = currentIndex === ranges.length - 1
    const previousRange = currentIndex > 0 ? ranges[currentIndex - 1] : null

    clearTierInputError(input)

    const fieldName = input.name.split('_').pop()

    if (fieldName === 'min') {
        if (!validateNumericFields(currentRange, type, 'warning', isLastTier)) return

        validateMinValue(currentRange, type, isFirstTier, 'warning')
        validateIntegerConstraint(currentRange, type, 'warning')
        validateContinuity(currentRange, previousRange, type, 'warning')
        validateNoOverlap(currentRange, previousRange, type, 'warning')
    } else if (fieldName === 'max') {
        if (!validateNumericFields(currentRange, type, 'warning', isLastTier)) return

        validateMaxGreaterThanMin(currentRange, type, 'warning')
        validateIntegerConstraint(currentRange, type, 'warning')

        if (currentIndex < ranges.length - 1) {
            const nextRange = ranges[currentIndex + 1]
            const nextMinInput = nextRange.minInput
            clearTierInputError(nextMinInput)
            const updatedNextRange = parseTierRange(nextRange.row, type)
            validateContinuity(updatedNextRange, currentRange, type, 'warning')
        }
    } else if (fieldName === 'value') {
        validateNumericFields(currentRange, type, 'warning', isLastTier)
        if (currentRange.value < 0) {
            validateValueField(currentRange, 'warning')
        }
    }
}

export function performSubmissionValidation(container) {
    const type = getTierType(container)
    const ranges = getAllTierRanges(container, type)

    clearAllTierErrors(container)

    let valid = true

    if (!validateAtLeastOneTier(ranges, container, 'error')) {
        valid = false
    }

    if (ranges.length === 0) {
        return false
    }

    if (!validateLastTierInfinity(ranges, 'error')) {
        valid = false
    }

    if (!validateNoDuplicates(ranges, 'error')) {
        valid = false
    }

    ranges.forEach((range, index) => {
        const isFirstTier = index === 0
        const isLastTier = index === ranges.length - 1
        const previousRange = index > 0 ? ranges[index - 1] : null

        if (!validateNumericFields(range, type, 'error', isLastTier)) {
            valid = false
            return
        }

        if (!validateMinValue(range, type, isFirstTier, 'error')) {
            valid = false
        }

        if (!validateMaxGreaterThanMin(range, type, 'error')) {
            valid = false
        }

        if (!validateIntegerConstraint(range, type, 'error')) {
            valid = false
        }

        if (!validateContinuity(range, previousRange, type, 'error')) {
            valid = false
        }

        if (!validateNoOverlap(range, previousRange, type, 'error')) {
            valid = false
        }

        if (!validateValueField(range, 'error')) {
            valid = false
        }
    })

    return valid
}

export function validateNumericInput(input, errorKey = 'validation.tier.mustBeNumber') {
    if (!input) return true

    const value = parseFloat(input.value)
    const isValid = !isNaN(value) && input.value.trim() !== ''

    if (!isValid) {
        input.classList.add('!border-red-500', 'focus:!ring-red-500')
        let errorDiv = input.parentElement.querySelector('.field-error-message')
        if (!errorDiv) {
            errorDiv = document.createElement('div')
            errorDiv.className = 'field-error-message text-xs text-red-500 mt-1'
            input.parentElement.appendChild(errorDiv)
        }
        errorDiv.textContent = t(errorKey)
    } else {
        input.classList.remove('!border-red-500', 'focus:!ring-red-500')
        const errorDiv = input.parentElement.querySelector('.field-error-message')
        if (errorDiv) errorDiv.remove()
    }

    return isValid
}

export function validateNonTieredFields(container) {
    const prefix = container.dataset.prefix
    const type = getTierType(container)

    if (type === 'fixed') {
        return validateNumericInput(container.querySelector(`input[name="${prefix}_amount"]`))
    } else if (type === 'percentage') {
        return validateNumericInput(container.querySelector(`input[name="${prefix}_rate"]`))
    }

    return true
}

export function validateAllTierForms() {
    let allValid = true

    const containers = document.querySelectorAll('.calculation-rules-container')

    containers.forEach(container => {
        const prefix = container.dataset.prefix
        const type = getTierType(container)
        const isTieredCb = container.querySelector(`input[name="${prefix}_isTiered"]`)

        if (!isTieredCb || !isTieredCb.checked) {
            if (!validateNonTieredFields(container)) {
                allValid = false
            }
        } else {
            if (['quantity', 'distance', 'weight', 'volume'].includes(type)) {
                if (!performSubmissionValidation(container)) {
                    allValid = false
                }
            }
        }
    })

    return allValid
}

// ============================================================================
// CURRENCY HELPERS
// ============================================================================

export function getCurrentCurrency() {
    // Try to get currency from seller rule currency selector
    const ruleCurrencySelect = document.querySelector('.rule-currency-select')
    if (ruleCurrencySelect) {
        return ruleCurrencySelect.value
    }

    // Try to get currency from forwarder currency selector
    const forwarderCurrencySelect = document.getElementById('forwarder-currency')
    if (forwarderCurrencySelect) {
        return forwarderCurrencySelect.value
    }

    // Fallback to session currency or default
    return null
}

// ============================================================================
// CHANGE EVENT HANDLERS
// ============================================================================

export async function handleCalculationTypeChange(e) {
    const container = e.target.closest('.calculation-rules-container')
    const prefix = container.dataset.prefix
    const newType = e.target.value
    const inputsContainer = container.querySelector('.calculation-inputs')
    const currency = getCurrentCurrency()

    clearAllTierErrors(container)

    const defaults = await StorageService.getDefaults()
    const getDefaultUnitForType = (type) => {
        if (type === 'weight') return defaults.weightUnit
        if (type === 'volume') return defaults.volumeUnit
        if (type === 'distance') return defaults.distanceUnit
        if (type === 'dimension') return defaults.dimensionUnit
        return ''
    }

    // Check if both volume and dimension are managed (needed for allowConversion)
    const session = Store.getCurrentSession()
    const canConvert = session?.manageVolume && session?.manageDimension

    // Determine if we should show packingMode selector (for sellerShipping with forwarders enabled)
    // Check if this is a seller shipping context by looking at the prefix
    const isSellerShipping = prefix.includes('seller') || prefix.includes('global') || prefix.includes('group')
    const showPackingMode = session?.forwardersEnabled && isSellerShipping

    let newHtml = ''
    if (newType === 'fixed') {
        newHtml = renderFixedInputs(prefix, { type: 'fixed' }, currency, showPackingMode)
    } else if (newType === 'percentage') {
        newHtml = renderPercentageInputs(prefix, { type: 'percentage' }, showPackingMode)
    } else if (['quantity', 'distance', 'weight', 'volume'].includes(newType)) {
        const data = { type: newType, unit: getDefaultUnitForType(newType) }
        newHtml = renderTieredInputs(prefix, data, newType, false, currency, showPackingMode)
    } else if (newType === 'order_amount') {
        const data = { type: newType }
        newHtml = renderOrderAmountInputs(prefix, data, false, currency, showPackingMode)
    } else if (newType === 'dimension') {
        const data = { type: newType, unit: getDefaultUnitForType(newType) }
        newHtml = renderDimensionInputs(prefix, data, currency, canConvert)
    } else if (['weight_volume', 'weight_dimension'].includes(newType)) {
        const data = { type: newType, weightUnit: getDefaultUnitForType('weight'), volUnit: getDefaultUnitForType('volume') }
        newHtml = renderCombinedInputs(prefix, data, newType, currency, canConvert)
    } else if (newType === 'volume_packages') {
        const data = { type: newType, unit: getDefaultUnitForType('volume') }
        newHtml = renderVolumePackagesInputs(prefix, data, currency, canConvert)
    } else if (newType === 'cumul') {
        newHtml = `<p class="text-sm secondary-text italic mb-3">${t('deliveryRules.typeCumul')}</p>`
        if (showPackingMode) {
            newHtml += renderSimplePackingModeSelector(prefix, 'single')
        }
    } else if (newType === 'free') {
        newHtml = `<p class="text-sm font-medium card-text italic mb-3">${t('deliveryRules.freeDelivery')}</p>`
        if (showPackingMode) {
            newHtml += renderSimplePackingModeSelector(prefix, 'single')
        }
    }

    inputsContainer.innerHTML = newHtml
}

export function handleTieredToggle(e) {
    const element = e.target
    const container = element.closest('.calculation-rules-container')
    const prefix = container.dataset.prefix
    const currency = getCurrentCurrency()

    clearAllTierErrors(container)

    const data = extractCalculationRule(prefix, container)
    const type = data.type

    // Dimension type doesn't support toggle anymore - always uses ranges
    if (type === 'dimension') {
        return
    }

    data.isTiered = element.classList.contains('is-tiered-toggle') ? (element.value === 'tiered') : element.checked

    const inputsContainer = container.querySelector('.calculation-inputs')

    // Determine if we should show packingMode selector
    const session = Store.getCurrentSession()
    const isSellerShipping = prefix.includes('seller') || prefix.includes('global') || prefix.includes('group')
    const showPackingMode = session?.forwardersEnabled && isSellerShipping

    if (['weight_volume', 'weight_dimension'].includes(type)) {
        inputsContainer.innerHTML = renderCombinedInputs(prefix, data, type, currency)
    } else {
        inputsContainer.innerHTML = renderTieredInputs(prefix, data, type, false, currency, showPackingMode)
    }
}

export function handleUnitChange(e, container) {
    const select = e.target
    const prefix = container.dataset.prefix
    const data = extractCalculationRule(prefix, container)
    const type = data.type
    const currency = getCurrentCurrency()

    const inputsContainer = container.querySelector('.calculation-inputs')

    // Determine if we should show packingMode selector
    const session = Store.getCurrentSession()
    const isSellerShipping = prefix.includes('seller') || prefix.includes('global') || prefix.includes('group')
    const showPackingMode = session?.forwardersEnabled && isSellerShipping

    if (!data.isTiered && ['distance', 'weight', 'volume'].includes(type)) {
        inputsContainer.innerHTML = renderTieredInputs(prefix, data, type, false, currency, showPackingMode)
    } else if (data.isTiered) {
        updateValueLabels(container, prefix, type, data, currency)
    }
}

export function handleTierValueModeChange(e, container) {
    const element = e.target
    const prefix = container.dataset.prefix
    const data = extractCalculationRule(prefix, container)
    const type = data.type
    const currency = getCurrentCurrency()
    const helpText = container.querySelector('.tier-value-mode-help')
    if (helpText) {
        helpText.textContent = getHelpTextForMode(type, element.value)
    }
    const labels = container.querySelectorAll(`label:has(input[name="${prefix}_tierValueMode"])`)
    labels.forEach(label => {
        const radio = label.querySelector('input')
        if (radio.value === element.value) {
            label.classList.add('bg-[hsl(var(--card))]', 'shadow-sm', 'font-medium')
            label.classList.remove('secondary-text')
        } else {
            label.classList.remove('bg-[hsl(var(--card))]', 'shadow-sm', 'font-medium')
            label.classList.add('secondary-text')
        }
    })
    updateValueLabels(container, prefix, type, data, currency)
}

export function handleTierValueTypeChange(e, container) {
    const prefix = container.dataset.prefix
    const data = extractCalculationRule(prefix, container)
    const type = data.type
    const currency = getCurrentCurrency()
    updateValueLabels(container, prefix, type, data, currency)
}

export function handleMaxChange(e, container) {
    const input = e.target
    const row = input.closest('.range-row')
    const nextRow = row?.nextElementSibling
    if (nextRow && nextRow.classList.contains('range-row')) {
        const prefix = container.dataset.prefix
        const typeRadio = container.querySelector(`input[name="${prefix}_type"]:checked`)
        const type = typeRadio ? typeRadio.value : 'quantity'

        if (!['dimension', 'weight_volume', 'weight_dimension'].includes(type) && !input.name.includes('_maxL') && !input.name.includes('_maxW') && !input.name.includes('_maxH') && !input.name.includes('_maxWeight') && !input.name.includes('_maxVol')) {
            const nextMinInput = nextRow.querySelector('input[name$="_min"]')
            if (nextMinInput) {
                const val = parseFloat(input.value) || 0
                nextMinInput.value = (type === 'quantity') ? val + 1 : val
            }
        }
    }
}

export function handlePackingModeChange(e) {
    const radio = e.target
    const container = radio.closest('[data-prefix]')
    if (!container) return

    const value = radio.value
    const helpText = container.querySelector('p.text-\\[10px\\]')
    
    if (helpText) {
        if (value === 'perItem') {
            helpText.textContent = t('deliveryRules.packingModePerItemHelp')
        } else if (value === 'single') {
            helpText.textContent = t('deliveryRules.packingModeSingleHelp')
        } else {
            helpText.textContent = t('deliveryRules.packingModeGroupedHelp')
        }
    }

    // Update button styles
    const labels = container.querySelectorAll(`label:has(input[name="${radio.name}"])`)
    labels.forEach(label => {
        const input = label.querySelector('input')
        if (input.value === value) {
            label.classList.add('bg-[hsl(var(--card))]', 'shadow-sm', 'font-medium', 'card-text')
            label.classList.remove('secondary-text')
        } else {
            label.classList.remove('bg-[hsl(var(--card))]', 'shadow-sm', 'font-medium', 'card-text')
            label.classList.add('secondary-text')
        }
    })
}

export function handleAddRange(e, container) {
    const btn = e.target.closest('.add-range-btn')
    const prefix = btn.dataset.prefix
    const rangesContainer = container.querySelector('.ranges-container')
    if (!rangesContainer) return

    const typeRadio = container.querySelector(`input[name="${prefix}_type"]:checked`)
    const type = typeRadio ? typeRadio.value : 'quantity'

    const data = extractCalculationRule(prefix, container)
    const tierValueType = data.tierValueType || 'fixed'
    const tierValueMode = data.tierValueMode || 'perUnit'
    const unit = data.unit || ''
    const weightUnit = data.weightUnit || ''
    const volUnit = data.volUnit || ''

    const existingRows = rangesContainer.querySelectorAll('.range-row')
    const newIndex = existingRows.length

    let newMin = 0

    if (existingRows.length > 0 && !['dimension', 'weight_volume', 'weight_dimension'].includes(type)) {
        const lastRow = existingRows[existingRows.length - 1]
        const maxInput = lastRow.querySelector('input[name$="_max"]')
        const minInput = lastRow.querySelector('input[name$="_min"]')

        if (maxInput && (maxInput.value === '' || maxInput.value === null)) {
            let diff = 10
            if (existingRows.length >= 2) {
                const prevRow = existingRows[existingRows.length - 2]
                const prevMinInput = prevRow.querySelector('input[name$="_min"]')
                const lastMin = parseFloat(minInput.value) || 0
                const prevMin = parseFloat(prevMinInput.value) || 0
                diff = lastMin - prevMin || 10
            }

            const lastMin = parseFloat(minInput.value) || 0
            const newMaxForLast = lastMin + diff

            maxInput.value = newMaxForLast

            newMin = type === 'quantity' ? newMaxForLast + 1 : newMaxForLast
        } else if (maxInput && maxInput.value !== '') {
            const lastMax = parseFloat(maxInput.value) || 0
            newMin = type === 'quantity' ? lastMax + 1 : lastMax
        }
    } else if (existingRows.length === 0 && type === 'quantity') {
        newMin = 1
    }

    let unitParam = unit
    let unit2Param = ''
    if (['weight_volume', 'weight_dimension'].includes(type)) {
        unitParam = weightUnit
        unit2Param = volUnit
    }

    const currency = getCurrentCurrency()
    const rowHtml = renderRangeRow(type, prefix, newIndex, { min: newMin }, tierValueType, tierValueMode, unitParam, unit2Param, currency)

    const temp = document.createElement('div')
    temp.innerHTML = rowHtml
    const placeholder = rangesContainer.querySelector('.empty-placeholder')
    if (placeholder) placeholder.remove()

    rangesContainer.appendChild(temp.firstElementChild)
}

export function handleRemoveRange(e) {
    const row = e.target.closest('.range-row')
    const container = row.closest('.ranges-container')
    const calcContainer = row.closest('.calculation-rules-container')

    if (calcContainer) {
        clearAllTierErrors(calcContainer)
    }

    row.remove()

    if (calcContainer) {
        const type = getTierType(calcContainer)
        const ranges = getAllTierRanges(calcContainer, type)

        ranges.forEach((range, index) => {
            if (index > 0) {
                const previousRange = ranges[index - 1]
                validateContinuity(range, previousRange, type, 'warning')
            }
        })
    }

    if (container.querySelectorAll('.range-row').length === 0) {
        container.innerHTML = `<div class="empty-placeholder text-xs secondary-text italic text-center p-4 bg-[hsl(var(--muted))] rounded-lg border border-dashed border-default">${t('deliveryRules.noRange')}</div>`
    }
}
