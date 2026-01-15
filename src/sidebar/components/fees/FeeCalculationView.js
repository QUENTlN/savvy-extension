import { t } from '../../../shared/i18n.js'
import { WEIGHT_UNITS, VOLUME_UNITS, DIMENSION_UNITS, DISTANCE_UNITS, DEFAULT_WEIGHT_UNIT, DEFAULT_VOLUME_UNIT, DEFAULT_DIMENSION_UNIT, DEFAULT_DISTANCE_UNIT } from '../../../shared/config/units.js'
import { DEFAULT_CURRENCY } from '../../../shared/config/currencies.js'
import { Store } from '../../state.js'
import { formatPercent, getCurrencySymbol } from '../../utils/formatters.js'
import { FEE_CONFIG_PRESETS, filterAvailableTypes } from './FeeCalculationTypes.js'

// ============================================================================
// UNIT HELPERS
// ============================================================================

export function getUnitOptions(type) {
    if (type === 'weight') return WEIGHT_UNITS
    if (type === 'volume') return VOLUME_UNITS
    if (type === 'distance') return DISTANCE_UNITS
    if (type === 'dimension') return DIMENSION_UNITS
    return []
}

export function getUnitLabel(type, unitValue) {
    const units = getUnitOptions(type)
    const unit = units.find(u => u.value === unitValue)
    return unit ? unit.label : unitValue
}

export function getValueLabel(type, tierValueType, tierValueMode, unit = '', unit2 = '', currency = null) {
    const isPerUnit = tierValueMode === 'perUnit'
    const currencyCode = currency || Store.state.currency

    let prefix = ''
    if (tierValueType === 'fixed') {
        prefix = getCurrencySymbol(currencyCode)
    } else if (tierValueType === 'pctOrder') {
        prefix = '%commande'
    } else if (tierValueType === 'pctDelivery') {
        prefix = '%livraison'
    }

    if (!isPerUnit) {
        return prefix
    }

    let unitLabel = ''
    if (type === 'quantity') {
        unitLabel = `/${t('attributes.item')}`
    } else if (type === 'distance') {
        const unitVal = unit || DEFAULT_DISTANCE_UNIT
        unitLabel = `/${getUnitLabel('distance', unitVal)}`
    } else if (type === 'weight') {
        const unitVal = unit || DEFAULT_WEIGHT_UNIT
        unitLabel = `/${getUnitLabel('weight', unitVal)}`
    } else if (type === 'volume') {
        const unitVal = unit || DEFAULT_VOLUME_UNIT
        unitLabel = `/${getUnitLabel('volume', unitVal)}`
    } else if (type === 'dimension') {
        unitLabel = ''
    } else if (type === 'weight_dimension') {
        unitLabel = ''
    } else if (type === 'weight_volume') {
        unitLabel = ''
    } else if (type === 'volume_packages') {
        unitLabel = ''
    }

    return prefix + unitLabel
}

export function getHelpTextForMode(type, tierValueMode) {
    if (tierValueMode === 'perUnit') {
        if (type === 'quantity') {
            return t('deliveryRules.tierValueModeQuantityPerUnitHelp')
        } else if (type === 'distance') {
            return t('deliveryRules.tierValueModeDistancePerUnitHelp')
        } else if (type === 'weight') {
            return t('deliveryRules.tierValueModeWeightPerUnitHelp')
        } else if (type === 'volume') {
            return t('deliveryRules.tierValueModeVolumePerUnitHelp')
        }
        return t('deliveryRules.tierValueModePerUnitHelp')
    } else {
        return t('deliveryRules.tierValueModeTotalHelp')
    }
}

// ============================================================================
// CALCULATION RULES RENDERERS
// ============================================================================

export function renderFixedInputs(prefix, data, currency = null) {
    const currencyCode = currency || DEFAULT_CURRENCY
    const currencySymbol = getCurrencySymbol(currencyCode)
    return `
        <div class="mb-3">
            <label class="block text-sm font-medium secondary-text mb-1">${t('deliveryRules.amount')} (${currencySymbol})</label>
            <input type="number" step="0.01" class="w-full bg-transparent border border-default rounded px-3 py-2 text-sm focus:border-primary focus:outline-none"
                name="${prefix}_amount" value="${data.amount || 0}">
        </div>
    `
}

export function renderPercentageInputs(prefix, data) {
    const ratePercent = formatPercent(data.rate || 0)
    return `
        <div class="mb-3">
            <label class="block text-sm font-medium secondary-text mb-1">${t('deliveryRules.pctOrderLabel')}</label>
             <input type="number" step="0.01" class="w-full bg-transparent border border-default rounded px-3 py-2 text-sm focus:border-primary focus:outline-none"
                name="${prefix}_rate" value="${ratePercent}">
        </div>
    `
}

export function renderRangeRow(type, prefix, idx, range = {}, tierValueType = 'fixed', tierValueMode = 'perUnit', unit = '', unit2 = '', currency = null) {
    let inputs = ''

    const valueLabel = getValueLabel(type, tierValueType, tierValueMode, unit, unit2, currency)

    const isPercentType = tierValueType === 'pctOrder' || tierValueType === 'pctDelivery'
    const displayValue = range.value !== undefined && range.value !== ''
        ? (isPercentType ? formatPercent(range.value) : range.value)
        : ''

    if (type === 'dimension') {
        inputs = `
            <div class="flex-1">
                <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm text-center focus:ring-1 focus:ring-primary focus:outline-none" placeholder="∞" value="${range.maxL || ''}" name="${prefix}_range_${idx}_maxL">
            </div>
            <div class="flex-1">
                <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm text-center focus:ring-1 focus:ring-primary focus:outline-none" placeholder="∞" value="${range.maxW || ''}" name="${prefix}_range_${idx}_maxW">
            </div>
            <div class="flex-1">
                <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm text-center focus:ring-1 focus:ring-primary focus:outline-none" placeholder="∞" value="${range.maxH || ''}" name="${prefix}_range_${idx}_maxH">
            </div>
            <div class="flex-[1.5]">
                <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none font-medium" placeholder="0.00" value="${displayValue}" name="${prefix}_range_${idx}_value">
            </div>
        `
    } else if (type === 'weight_volume') {
        inputs = `
            <div class="flex-1">
               <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm text-center focus:ring-1 focus:ring-primary focus:outline-none" placeholder="∞" name="${prefix}_range_${idx}_maxWeight" value="${range.maxWeight || ''}">
            </div>
            <div class="flex-1">
               <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm text-center focus:ring-1 focus:ring-primary focus:outline-none" placeholder="∞" name="${prefix}_range_${idx}_maxVol" value="${range.maxVol || ''}">
            </div>
            <div class="flex-[1.5]">
               <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none font-medium" placeholder="0.00" name="${prefix}_range_${idx}_value" value="${displayValue}">
            </div>
        `
    } else if (type === 'weight_dimension') {
        inputs = `
            <div class="flex-1">
               <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm text-center focus:ring-1 focus:ring-primary focus:outline-none" placeholder="∞" name="${prefix}_range_${idx}_maxWeight" value="${range.maxWeight || ''}">
            </div>
            <div class="flex-1">
               <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm text-center focus:ring-1 focus:ring-primary focus:outline-none" placeholder="∞" name="${prefix}_range_${idx}_maxL" value="${range.maxL || ''}">
            </div>
            <div class="flex-1">
               <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm text-center focus:ring-1 focus:ring-primary focus:outline-none" placeholder="∞" name="${prefix}_range_${idx}_maxW" value="${range.maxW || ''}">
            </div>
            <div class="flex-1">
               <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm text-center focus:ring-1 focus:ring-primary focus:outline-none" placeholder="∞" name="${prefix}_range_${idx}_maxH" value="${range.maxH || ''}">
            </div>
            <div class="flex-1">
               <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none font-medium" placeholder="0.00" name="${prefix}_range_${idx}_value" value="${displayValue}">
            </div>
        `
    } else if (type === 'volume_packages') {
        inputs = `
            <div class="flex-1">
               <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm text-center focus:ring-1 focus:ring-primary focus:outline-none" placeholder="∞" name="${prefix}_range_${idx}_maxVol" value="${range.maxVol || ''}">
            </div>
            <div class="flex-[1.5]">
               <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none font-medium" placeholder="0.00" name="${prefix}_range_${idx}_value" value="${displayValue}">
            </div>
        `
    } else {
        const isQuantity = type === 'quantity'
        const stepValue = isQuantity ? '1' : '0.01'
        inputs = `
            <div class="flex-[2] relative">
               <span class="absolute -top-3 left-0 w-full truncate text-[8px] secondary-text font-bold uppercase transition-opacity group-hover/row:opacity-100 opacity-60">${t('deliveryRules.startingFrom')}</span>
               <input type="number" step="${stepValue}" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none" placeholder="0" value="${range.min || 0}" name="${prefix}_range_${idx}_min">
            </div>
            <div class="flex-[2] relative">
               <span class="absolute -top-3 left-0 w-full truncate text-[8px] secondary-text font-bold uppercase transition-opacity group-hover/row:opacity-100 opacity-60">${t('deliveryRules.upTo')}</span>
               <input type="number" step="${stepValue}" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none text-center" placeholder="∞" value="${range.max || ''}" name="${prefix}_range_${idx}_max">
            </div>
            <div class="flex-[2] relative">
               <span class="absolute -top-3 left-0 w-full truncate text-[8px] secondary-text font-bold transition-opacity group-hover/row:opacity-100 opacity-60"><span class="uppercase">${t('deliveryRules.value')}</span> (${valueLabel})</span>
               <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none font-medium text-center" placeholder="0.00" value="${displayValue}" name="${prefix}_range_${idx}_value">
            </div>
        `
    }

    return `
        <div class="flex items-center gap-2 range-row bg-[hsl(var(--muted))]/50 p-1.5 rounded-lg border border-default/30 hover:border-primary/30 transition-all group/row" data-index="${idx}">
            ${inputs}
            <div class="w-8 flex-shrink-0 flex justify-center">
                <button class="remove-range-btn text-gray-400 hover:text-red-500 transition-colors p-1" data-prefix="${prefix}" data-index="${idx}">
                    <span class="icon icon-delete h-4 w-4"></span>
                </button>
            </div>
        </div>
    `
}

export function renderTieredInputs(prefix, data, type, hideAdvancedSettings = false, currency = null) {
    const currencyCode = currency || DEFAULT_CURRENCY
    const isTiered = data.isTiered || false
    const units = getUnitOptions(type)
    let html = ''

    if (units.length > 0) {
        let defaultUnit = ''
        if (type === 'weight') defaultUnit = DEFAULT_WEIGHT_UNIT
        else if (type === 'volume') defaultUnit = DEFAULT_VOLUME_UNIT
        else if (type === 'distance') defaultUnit = DEFAULT_DISTANCE_UNIT
        else if (type === 'quantity') defaultUnit = ''

        html += `
            <div class="mb-4">
                <label class="block text-xs font-semibold secondary-text mb-1 tracking-wide">${t('deliveryRules.unit')}</label>
                <select name="${prefix}_unit" class="w-full bg-[hsl(var(--card))] border border-default rounded-md px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors">
                    ${units.map(u => `<option value="${u.value}" ${(data.unit || defaultUnit) === u.value ? 'selected' : ''}>${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
                </select>
            </div>
        `
    }

    html += `
        <div class="mb-6 bg-[hsl(var(--muted))] p-1 rounded-lg inline-flex">
             <label class="px-3 py-1 rounded-md text-sm cursor-pointer transition-all ${!isTiered ? 'bg-[hsl(var(--card))] shadow-sm font-medium' : 'secondary-text'}">
                <input type="radio" name="${prefix}_mode_toggle" class="hidden is-tiered-toggle" value="single" ${!isTiered ? 'checked' : ''}>
                ${t('deliveryRules.singleRate')}
            </label>
            <label class="px-3 py-1 rounded-md text-sm cursor-pointer transition-all ${isTiered ? 'bg-[hsl(var(--card))] shadow-sm font-medium' : 'secondary-text'}">
                <input type="radio" name="${prefix}_mode_toggle" class="hidden is-tiered-toggle" value="tiered" ${isTiered ? 'checked' : ''}>
                ${t('deliveryRules.tieredPricing')}
            </label>
            <!-- Hidden actual checkbox for logic compatibility -->
            <input type="checkbox" name="${prefix}_isTiered" class="is-tiered-checkbox hidden" ${isTiered ? 'checked' : ''}>
        </div>
    `

    if (!isTiered) {
        let amountLabel = t('deliveryRules.amount')
        if (type === 'quantity') {
            amountLabel = `${t('deliveryRules.unitCost')} (${getCurrencySymbol(currencyCode)})`
        } else if (['distance', 'weight', 'volume'].includes(type)) {
            const unitValue = data.unit || (units[0] ? units[0].value : '')
            const unitLabel = getUnitLabel(type, unitValue)
            amountLabel = `${t('deliveryRules.amount')} (${getCurrencySymbol(currencyCode)}/${unitLabel})`
        }

        html += `
             <div class="mb-3">
                <label class="block text-sm font-medium secondary-text mb-1">${amountLabel}</label>
                <div class="relative">
                    <input type="number" step="0.01" class="w-full bg-transparent border border-default rounded px-3 py-2 text-sm focus:border-primary focus:outline-none pl-3"
                        name="${prefix}_amount" value="${data.amount || 0}">
                </div>
            </div>
        `
    } else {
        const tierValueType = data.tierValueType || 'fixed'
        const tierValueMode = data.tierValueMode || 'perUnit'
        const unit = data.unit || (units[0] ? units[0].value : '')

        html += `
            <div class="mb-4">
                <label class="block text-xs font-semibold secondary-text mb-2">${t('deliveryRules.tierValueMode')}</label>
                <div class="bg-[hsl(var(--muted))] p-1 rounded-lg inline-flex">
                    <label class="px-3 py-1 rounded-md text-sm cursor-pointer transition-all ${tierValueMode === 'perUnit' ? 'bg-[hsl(var(--card))] shadow-sm font-medium' : 'secondary-text'}">
                        <input type="radio" name="${prefix}_tierValueMode" value="perUnit" class="hidden tier-value-mode-toggle" ${tierValueMode === 'perUnit' ? 'checked' : ''}>
                        ${t('deliveryRules.tierValueModePerUnit')}
                    </label>
                    <label class="px-3 py-1 rounded-md text-sm cursor-pointer transition-all ${tierValueMode === 'total' ? 'bg-[hsl(var(--card))] shadow-sm font-medium' : 'secondary-text'}">
                        <input type="radio" name="${prefix}_tierValueMode" value="total" class="hidden tier-value-mode-toggle" ${tierValueMode === 'total' ? 'checked' : ''}>
                        ${t('deliveryRules.tierValueModeTotal')}
                    </label>
                </div>
                <p class="text-[10px] secondary-text italic mt-2 px-1 tier-value-mode-help">
                    ${getHelpTextForMode(type, tierValueMode)}
                </p>
            </div>
        `

        html += `
             <div class="mb-4">
                <div class="ranges-container space-y-2 mb-4" data-prefix="${prefix}" data-type="${type}" data-tier-value-type="${tierValueType}" data-tier-value-mode="${tierValueMode}" data-unit="${unit}">
                    ${(() => {
                        const shouldCreateDefaults = isTiered &&
                                                     (!data.ranges || data.ranges.length === 0) &&
                                                     ['quantity', 'distance', 'weight', 'volume'].includes(type)

                        if (shouldCreateDefaults) {
                            const minStart = type === 'quantity' ? 1 : 0
                            const maxFirst = 10
                            const minSecond = type === 'quantity' ? 11 : 10

                            data.ranges = [
                                { min: minStart, max: maxFirst, value: 0 },
                                { min: minSecond, max: null, value: 0 }
                            ]
                        }

                        return (data.ranges || []).map((range, idx) =>
                            renderRangeRow(type, prefix, idx, range, tierValueType, tierValueMode, unit, '', currencyCode)
                        ).join('')
                    })()}
                    ${(!data.ranges || data.ranges.length === 0) ? `<div class="empty-placeholder text-xs secondary-text italic text-center p-4 bg-[hsl(var(--muted))] rounded-lg border border-dashed border-default">${t('deliveryRules.noRange')}</div>` : ''}
                </div>

                <button class="add-range-btn w-full py-2 flex items-center justify-center space-x-2 text-sm font-medium text-primary hover:bg-[hsl(var(--primary))]/10 rounded-md border border-dashed border-[hsl(var(--primary))]/30 transition-all" data-prefix="${prefix}">
                    <span class="text-lg leading-none">+</span>
                    <span>${t('deliveryRules.addRange')}</span>
                </button>
            </div>

            ${hideAdvancedSettings ? `
                <!-- Hidden inputs to force tierType and tierValueType when advanced settings are hidden -->
                <input type="hidden" name="${prefix}_tierType" value="global">
                <input type="hidden" name="${prefix}_tierValueType" value="fixed">
            ` : `
                <!-- Advanced Settings -->
                <details class="text-xs group mt-4">
                    <summary class="cursor-pointer secondary-text font-medium hover:text-primary transition-colors py-2 px-3 flex items-center gap-2 select-none rounded-md hover:bg-[hsl(var(--muted))]">
                        <span class="transition-transform group-open:rotate-90">▶</span>
                        <span>${t('deliveryRules.advancedSettings') || 'Advanced Settings'}</span>
                    </summary>
                    <div class="mt-2 p-3 bg-[hsl(var(--muted))] rounded-lg border border-default space-y-3">
                        <!-- tierType always set to 'global' via hidden input above -->
                        <div>
                            <label class="block text-xs font-semibold mb-1">${t('deliveryRules.tierValueType')}</label>
                            <div class="flex flex-wrap gap-4">
                                 <label class="flex items-center cursor-pointer group">
                                    <input type="radio" name="${prefix}_tierValueType" value="fixed" class="sr-only peer" ${tierValueType === 'fixed' ? 'checked' : ''}>
                                    <div class="w-4 h-4 rounded-full border border-default flex items-center justify-center mr-2 peer-checked:border-[hsl(var(--primary))] peer-checked:bg-[hsl(var(--primary))] transition-all">
                                        <div class="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary-foreground))] scale-0 peer-checked:scale-100 transition-transform"></div>
                                    </div>
                                    <span class="secondary-text peer-checked:card-text transition-colors">${t('deliveryRules.valFixed')}</span>
                                </label>
                                 <label class="flex items-center cursor-pointer group">
                                    <input type="radio" name="${prefix}_tierValueType" value="pctOrder" class="sr-only peer" ${tierValueType === 'pctOrder' ? 'checked' : ''}>
                                    <div class="w-4 h-4 rounded-full border border-default flex items-center justify-center mr-2 peer-checked:border-[hsl(var(--primary))] peer-checked:bg-[hsl(var(--primary))] transition-all">
                                        <div class="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary-foreground))] scale-0 peer-checked:scale-100 transition-transform"></div>
                                    </div>
                                    <span class="secondary-text peer-checked:card-text transition-colors">${t('deliveryRules.valPctOrder')}</span>
                                </label>
                                 <label class="flex items-center cursor-pointer group">
                                    <input type="radio" name="${prefix}_tierValueType" value="pctDelivery" class="sr-only peer" ${tierValueType === 'pctDelivery' ? 'checked' : ''}>
                                    <div class="w-4 h-4 rounded-full border border-default flex items-center justify-center mr-2 peer-checked:border-[hsl(var(--primary))] peer-checked:bg-[hsl(var(--primary))] transition-all">
                                        <div class="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary-foreground))] scale-0 peer-checked:scale-100 transition-transform"></div>
                                    </div>
                                    <span class="secondary-text peer-checked:card-text transition-colors">${t('deliveryRules.valPctDelivery')}</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </details>
            `}
        `
    }
    return html
}

export function renderDimensionInputs(prefix, data, currency = null) {
    const currencyCode = currency || DEFAULT_CURRENCY
    const units = DIMENSION_UNITS
    const unit = data.unit || DEFAULT_DIMENSION_UNIT

    const valueLabel = getCurrencySymbol(currencyCode)

    let html = ''

    html += `
        <div class="mb-4">
            <label class="block text-xs font-semibold secondary-text mb-1 tracking-wide">${t('deliveryRules.unit')}</label>
            <select name="${prefix}_unit" class="w-full bg-[hsl(var(--card))] border border-default rounded-md px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors">
                ${units.map(u => `<option value="${u.value}" ${unit === u.value ? 'selected' : ''}>${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
            </select>
        </div>
    `

    // Packing mode selector
    const packingMode = data.packingMode || 'grouped'
    html += `
        <div class="mb-4">
            <label class="block text-xs font-semibold secondary-text mb-2 tracking-wide">${t('deliveryRules.packingMode')}</label>
            <div class="bg-[hsl(var(--muted))] p-1 rounded-lg inline-flex w-full">
                <label class="flex-1 px-3 py-2 rounded-md text-xs cursor-pointer transition-all text-center ${packingMode === 'perItem' ? 'bg-[hsl(var(--card))] shadow-sm font-medium card-text' : 'secondary-text'}">
                    <input type="radio" name="${prefix}_packingMode" value="perItem" class="hidden" ${packingMode === 'perItem' ? 'checked' : ''}>
                    ${t('deliveryRules.packingModePerItem')}
                </label>
                <label class="flex-1 px-3 py-2 rounded-md text-xs cursor-pointer transition-all text-center ${packingMode === 'grouped' ? 'bg-[hsl(var(--card))] shadow-sm font-medium card-text' : 'secondary-text'}">
                    <input type="radio" name="${prefix}_packingMode" value="grouped" class="hidden" ${packingMode === 'grouped' ? 'checked' : ''}>
                    ${t('deliveryRules.packingModeGrouped')}
                </label>
                <label class="flex-1 px-3 py-2 rounded-md text-xs cursor-pointer transition-all text-center ${packingMode === 'single' ? 'bg-[hsl(var(--card))] shadow-sm font-medium card-text' : 'secondary-text'}">
                    <input type="radio" name="${prefix}_packingMode" value="single" class="hidden" ${packingMode === 'single' ? 'checked' : ''}>
                    ${t('deliveryRules.packingModeSingle')}
                </label>
            </div>
            <p class="text-[10px] secondary-text italic mt-2 px-1">
                ${packingMode === 'perItem' ? t('deliveryRules.packingModePerItemHelp') :
                  packingMode === 'single' ? t('deliveryRules.packingModeSingleHelp') :
                  t('deliveryRules.packingModeGroupedHelp')}
            </p>
        </div>
    `

    // Allow conversion checkbox
    const allowConversion = data.allowConversion || false
    html += `
        <div class="mb-4">
            <label class="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" name="${prefix}_allowConversion"
                       class="w-4 h-4 rounded border-default accent-[hsl(var(--primary))]"
                       ${allowConversion ? 'checked' : ''}>
                <span class="text-sm secondary-text">${t('deliveryRules.allowConversion')}</span>
                <span class="icon icon-help w-3.5 h-3.5 secondary-text opacity-40"
                      title="${t('deliveryRules.allowConversionDimensionHelp')}"></span>
            </label>
        </div>
    `

    html += `
         <div class="mb-4">
            <p class="text-[10px] secondary-text italic mb-3 px-1 flex items-center gap-1.5">
                <span class="icon icon-info w-3.5 h-3.5 flex-shrink-0 opacity-70"></span>
                <span>${t('deliveryRules.tieredMaxLimitHelp')}</span>
            </p>

            <div class="flex gap-2 mb-2 text-xs font-semibold secondary-text uppercase tracking-wider pl-2 pr-2">
                <div class="flex-1">Max ${t('deliveryRules.length')}</div>
                <div class="flex-1">Max ${t('deliveryRules.width')}</div>
                <div class="flex-1">Max ${t('deliveryRules.height')}</div>
                <div class="flex-[1.5]">${t('deliveryRules.value')} (${valueLabel})</div>
                <div class="w-8"></div>
            </div>

            <div class="ranges-container space-y-2 mb-4" data-prefix="${prefix}" data-type="dimension" data-unit="${unit}">
                 ${(data.ranges || []).map((range, idx) => renderRangeRow('dimension', prefix, idx, range, 'fixed', 'total', unit, '', currencyCode)).join('')}

                ${(!data.ranges || data.ranges.length === 0) ? `<div class="empty-placeholder text-xs secondary-text italic text-center p-4 bg-[hsl(var(--muted))] rounded-lg border border-dashed border-default">${t('deliveryRules.noRange')}</div>` : ''}
            </div>

            <button class="add-range-btn w-full py-2 flex items-center justify-center space-x-2 text-sm font-medium text-primary hover:bg-[hsl(var(--primary))]/10 rounded-md border border-dashed border-[hsl(var(--primary))]/30 transition-all" data-prefix="${prefix}">
                <span class="text-lg leading-none">+</span>
                <span>${t('deliveryRules.addRange')}</span>
            </button>
        </div>

        <!-- Hidden inputs to ensure correct data structure -->
        <input type="hidden" name="${prefix}_tierType" value="global">
    `

    return html
}

export function renderOrderAmountInputs(prefix, data, hideAdvancedSettings = false, currency = null) {
    const currencyCode = currency || DEFAULT_CURRENCY
    const tierValueType = data.tierValueType || 'fixed'
    const currencySymbol = getCurrencySymbol(currencyCode)

    let html = ''

    const valueLabel = tierValueType === 'fixed' ? currencySymbol :
                      tierValueType === 'pctOrder' ? '%commande' :
                      tierValueType === 'pctDelivery' ? '%livraison' : currencySymbol

    const isPercentType = tierValueType === 'pctOrder' || tierValueType === 'pctDelivery'

    html += `
        <div class="mb-4">
            <div class="ranges-container space-y-2 mb-4" data-prefix="${prefix}" data-type="order_amount" data-tier-value-type="${tierValueType}" data-tier-value-mode="total">
                ${(() => {
                    const shouldCreateDefaults = (!data.ranges || data.ranges.length === 0)

                    if (shouldCreateDefaults) {
                        data.ranges = [
                            { min: 0, max: 100, value: 0 },
                            { min: 100, max: null, value: 0 }
                        ]
                    }

                    return (data.ranges || []).map((range, idx) => {
                        const displayValue = range.value !== undefined && range.value !== ''
                            ? (isPercentType ? formatPercent(range.value) : range.value)
                            : ''

                        return `
                            <div class="flex items-center gap-2 range-row bg-[hsl(var(--muted))]/50 p-1.5 rounded-lg border border-default/30 hover:border-primary/30 transition-all group/row" data-index="${idx}">
                                <div class="flex-[2] relative">
                                   <span class="absolute -top-3 left-0 w-full truncate text-[8px] secondary-text font-bold uppercase transition-opacity group-hover/row:opacity-100 opacity-60">${t('deliveryRules.startingFrom')}</span>
                                   <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none" placeholder="0" value="${range.min || 0}" name="${prefix}_range_${idx}_min">
                                </div>
                                <div class="flex-[2] relative">
                                   <span class="absolute -top-3 left-0 w-full truncate text-[8px] secondary-text font-bold uppercase transition-opacity group-hover/row:opacity-100 opacity-60">${t('deliveryRules.upTo')}</span>
                                   <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none text-center" placeholder="∞" value="${range.max || ''}" name="${prefix}_range_${idx}_max">
                                </div>
                                <div class="flex-[2] relative">
                                   <span class="absolute -top-3 left-0 w-full truncate text-[8px] secondary-text font-bold transition-opacity group-hover/row:opacity-100 opacity-60"><span class="uppercase">${t('deliveryRules.value')}</span> (${valueLabel})</span>
                                   <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none font-medium text-center" placeholder="0.00" value="${displayValue}" name="${prefix}_range_${idx}_value">
                                </div>
                                <div class="w-8 flex-shrink-0 flex justify-center">
                                    <button class="remove-range-btn text-gray-400 hover:text-red-500 transition-colors p-1" data-prefix="${prefix}" data-index="${idx}">
                                        <span class="icon icon-delete h-4 w-4"></span>
                                    </button>
                                </div>
                            </div>
                        `
                    }).join('')
                })()}
                ${(!data.ranges || data.ranges.length === 0) ? `<div class="empty-placeholder text-xs secondary-text italic text-center p-4 bg-[hsl(var(--muted))] rounded-lg border border-dashed border-default">${t('deliveryRules.noRange')}</div>` : ''}
            </div>

            <button class="add-range-btn w-full py-2 flex items-center justify-center space-x-2 text-sm font-medium text-primary hover:bg-[hsl(var(--primary))]/10 rounded-md border border-dashed border-[hsl(var(--primary))]/30 transition-all" data-prefix="${prefix}">
                <span class="text-lg leading-none">+</span>
                <span>${t('deliveryRules.addRange')}</span>
            </button>
        </div>

        ${hideAdvancedSettings ? `
            <!-- Hidden inputs to force tierType and tierValueType when advanced settings are hidden -->
            <input type="hidden" name="${prefix}_tierType" value="global">
            <input type="hidden" name="${prefix}_tierValueType" value="fixed">
        ` : `
            <!-- Advanced Settings -->
            <details class="text-xs group mt-4">
                <summary class="cursor-pointer secondary-text font-medium hover:text-primary transition-colors py-2 px-3 flex items-center gap-2 select-none rounded-md hover:bg-[hsl(var(--muted))]">
                    <span class="transition-transform group-open:rotate-90">▶</span>
                    <span>${t('deliveryRules.advancedSettings') || 'Advanced Settings'}</span>
                </summary>
                <div class="mt-2 p-3 bg-[hsl(var(--muted))] rounded-lg border border-default space-y-3">
                    <div>
                        <label class="block text-xs font-semibold mb-1">${t('deliveryRules.tierValueType')}</label>
                        <div class="flex flex-wrap gap-4">
                             <label class="flex items-center cursor-pointer group">
                                <input type="radio" name="${prefix}_tierValueType" value="fixed" class="sr-only peer" ${tierValueType === 'fixed' ? 'checked' : ''}>
                                <div class="w-4 h-4 rounded-full border border-default flex items-center justify-center mr-2 peer-checked:border-[hsl(var(--primary))] peer-checked:bg-[hsl(var(--primary))] transition-all">
                                    <div class="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary-foreground))] scale-0 peer-checked:scale-100 transition-transform"></div>
                                </div>
                                <span class="secondary-text peer-checked:card-text transition-colors">${t('deliveryRules.valFixed')}</span>
                            </label>
                             <label class="flex items-center cursor-pointer group">
                                <input type="radio" name="${prefix}_tierValueType" value="pctOrder" class="sr-only peer" ${tierValueType === 'pctOrder' ? 'checked' : ''}>
                                <div class="w-4 h-4 rounded-full border border-default flex items-center justify-center mr-2 peer-checked:border-[hsl(var(--primary))] peer-checked:bg-[hsl(var(--primary))] transition-all">
                                    <div class="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary-foreground))] scale-0 peer-checked:scale-100 transition-transform"></div>
                                </div>
                                <span class="secondary-text peer-checked:card-text transition-colors">${t('deliveryRules.valPctOrder')}</span>
                            </label>
                             <label class="flex items-center cursor-pointer group">
                                <input type="radio" name="${prefix}_tierValueType" value="pctDelivery" class="sr-only peer" ${tierValueType === 'pctDelivery' ? 'checked' : ''}>
                                <div class="w-4 h-4 rounded-full border border-default flex items-center justify-center mr-2 peer-checked:border-[hsl(var(--primary))] peer-checked:bg-[hsl(var(--primary))] transition-all">
                                    <div class="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary-foreground))] scale-0 peer-checked:scale-100 transition-transform"></div>
                                </div>
                                <span class="secondary-text peer-checked:card-text transition-colors">${t('deliveryRules.valPctDelivery')}</span>
                            </label>
                        </div>
                    </div>
                </div>
            </details>
        `}
    `
    return html
}

export function renderCombinedInputs(prefix, data, type, currency = null) {
    const currencyCode = currency || DEFAULT_CURRENCY
    const weightUnits = WEIGHT_UNITS
    const volUnits = type === 'weight_dimension' ? DIMENSION_UNITS : VOLUME_UNITS
    const weightUnit = data.weightUnit || (weightUnits[0] ? weightUnits[0].value : '')

    const volUnit = data.volUnit || (volUnits[0] ? volUnits[0].value : '')

    let html = ''

    const defaultVolUnit = type === 'weight_dimension' ? DEFAULT_DIMENSION_UNIT : DEFAULT_VOLUME_UNIT
    html += `<div class="flex space-x-4 mb-4">
        <div class="w-1/2">
             <label class="block text-xs font-semibold secondary-text mb-1 tracking-wide">${t('deliveryRules.weight')} ${t('deliveryRules.unit')}</label>
             <select name="${prefix}_weightUnit" class="w-full bg-[hsl(var(--card))] border border-default rounded-md px-3 py-2 text-sm focus:border-primary focus:outline-none">
                ${weightUnits.map(u => `<option value="${u.value}" ${(data.weightUnit || DEFAULT_WEIGHT_UNIT) === u.value ? 'selected' : ''}>${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
             </select>
        </div>
        <div class="w-1/2">
             <label class="block text-xs font-semibold secondary-text mb-1 tracking-wide">${type === 'weight_dimension' ? t('deliveryRules.dimension') : t('deliveryRules.volume')} ${t('deliveryRules.unit')}</label>
             <select name="${prefix}_volUnit" class="w-full bg-[hsl(var(--card))] border border-default rounded-md px-3 py-2 text-sm focus:border-primary focus:outline-none">
                ${volUnits.map(u => `<option value="${u.value}" ${(data.volUnit || defaultVolUnit) === u.value ? 'selected' : ''}>${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
             </select>
        </div>
    </div>`

    // Packing mode selector
    const packingMode = data.packingMode || 'grouped'
    html += `
        <div class="mb-4">
            <label class="block text-xs font-semibold secondary-text mb-2 tracking-wide">${t('deliveryRules.packingMode')}</label>
            <div class="bg-[hsl(var(--muted))] p-1 rounded-lg inline-flex w-full">
                <label class="flex-1 px-3 py-2 rounded-md text-xs cursor-pointer transition-all text-center ${packingMode === 'perItem' ? 'bg-[hsl(var(--card))] shadow-sm font-medium card-text' : 'secondary-text'}">
                    <input type="radio" name="${prefix}_packingMode" value="perItem" class="hidden" ${packingMode === 'perItem' ? 'checked' : ''}>
                    ${t('deliveryRules.packingModePerItem')}
                </label>
                <label class="flex-1 px-3 py-2 rounded-md text-xs cursor-pointer transition-all text-center ${packingMode === 'grouped' ? 'bg-[hsl(var(--card))] shadow-sm font-medium card-text' : 'secondary-text'}">
                    <input type="radio" name="${prefix}_packingMode" value="grouped" class="hidden" ${packingMode === 'grouped' ? 'checked' : ''}>
                    ${t('deliveryRules.packingModeGrouped')}
                </label>
                <label class="flex-1 px-3 py-2 rounded-md text-xs cursor-pointer transition-all text-center ${packingMode === 'single' ? 'bg-[hsl(var(--card))] shadow-sm font-medium card-text' : 'secondary-text'}">
                    <input type="radio" name="${prefix}_packingMode" value="single" class="hidden" ${packingMode === 'single' ? 'checked' : ''}>
                    ${t('deliveryRules.packingModeSingle')}
                </label>
            </div>
            <p class="text-[10px] secondary-text italic mt-2 px-1">
                ${packingMode === 'perItem' ? t('deliveryRules.packingModePerItemHelp') :
                  packingMode === 'single' ? t('deliveryRules.packingModeSingleHelp') :
                  t('deliveryRules.packingModeGroupedHelp')}
            </p>
        </div>
    `

    // Allow conversion checkbox
    const allowConversion = data.allowConversion || false
    const conversionHelpKey = type === 'weight_dimension' ? 'allowConversionDimensionHelp' : 'allowConversionVolumeHelp'
    html += `
        <div class="mb-4">
            <label class="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" name="${prefix}_allowConversion"
                       class="w-4 h-4 rounded border-default accent-[hsl(var(--primary))]"
                       ${allowConversion ? 'checked' : ''}>
                <span class="text-sm secondary-text">${t('deliveryRules.allowConversion')}</span>
                <span class="icon icon-help w-3.5 h-3.5 secondary-text opacity-40"
                      title="${t('deliveryRules.' + conversionHelpKey)}"></span>
            </label>
        </div>
    `

    const valueLabel = getValueLabel(type, 'fixed', 'total', weightUnit, volUnit, currencyCode)


    html += `
            <div class="mb-4">
                <p class="text-[10px] secondary-text italic mb-3 px-1 flex items-center gap-1.5">
                    <span class="icon icon-info w-3.5 h-3.5 flex-shrink-0 opacity-70"></span>
                    <span>${t('deliveryRules.tieredMaxLimitHelp')}</span>
                </p>
                <div class="flex gap-2 mb-2 text-xs font-semibold secondary-text uppercase tracking-wider pl-2 pr-2">
                    <div class="flex-1">Max ${t('deliveryRules.weight')}</div>
                    ${type === 'weight_dimension' ? `
                        <div class="flex-1">Max ${t('deliveryRules.length')}</div>
                        <div class="flex-1">Max ${t('deliveryRules.width')}</div>
                        <div class="flex-1">Max ${t('deliveryRules.height')}</div>
                        <div class="flex-1">${t('deliveryRules.value')} (${valueLabel})</div>
                    ` : `
                        <div class="flex-1">Max ${t('deliveryRules.volume')}</div>
                        <div class="flex-[1.5]">${t('deliveryRules.value')} (${valueLabel})</div>
                    `}
                    <div class="w-8"></div>
                </div>

                <div class="ranges-container space-y-2 mb-4" data-prefix="${prefix}" data-type="${type}" data-unit="${weightUnit}" data-unit2="${volUnit}">
                    ${(data.ranges || []).map((range, idx) => renderRangeRow(type, prefix, idx, range, 'fixed', 'total', weightUnit, volUnit, currencyCode)).join('')}

                    ${(!data.ranges || data.ranges.length === 0) ? `<div class="empty-placeholder text-xs secondary-text italic text-center p-4 bg-[hsl(var(--muted))] rounded-lg border border-dashed border-default">${t('deliveryRules.noRange')}</div>` : ''}
                </div>

                <button class="add-range-btn w-full py-2 flex items-center justify-center space-x-2 text-sm font-medium text-primary hover:bg-[hsl(var(--primary))]/10 rounded-md border border-dashed border-[hsl(var(--primary))]/30 transition-all" data-prefix="${prefix}">
                    <span class="text-lg leading-none">+</span>
                    <span>${t('deliveryRules.addRange')}</span>
                </button>
            </div>
    `

    return html
}

export function renderVolumePackagesInputs(prefix, data, currency = null) {
    const currencyCode = currency || DEFAULT_CURRENCY
    const volUnits = VOLUME_UNITS
    const volUnit = data.unit || DEFAULT_VOLUME_UNIT

    let html = ''

    // Volume unit selector
    html += `<div class="mb-4">
        <label class="block text-xs font-semibold secondary-text mb-1 tracking-wide">${t('deliveryRules.volume')} ${t('deliveryRules.unit')}</label>
        <select name="${prefix}_unit" class="w-full bg-[hsl(var(--card))] border border-default rounded-md px-3 py-2 text-sm focus:border-primary focus:outline-none">
            ${volUnits.map(u => `<option value="${u.value}" ${volUnit === u.value ? 'selected' : ''}>${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
        </select>
    </div>`

    // Packing mode selector
    const packingMode = data.packingMode || 'grouped'
    html += `
        <div class="mb-4">
            <label class="block text-xs font-semibold secondary-text mb-2 tracking-wide">${t('deliveryRules.packingMode')}</label>
            <div class="bg-[hsl(var(--muted))] p-1 rounded-lg inline-flex w-full">
                <label class="flex-1 px-3 py-2 rounded-md text-xs cursor-pointer transition-all text-center ${packingMode === 'perItem' ? 'bg-[hsl(var(--card))] shadow-sm font-medium card-text' : 'secondary-text'}">
                    <input type="radio" name="${prefix}_packingMode" value="perItem" class="hidden" ${packingMode === 'perItem' ? 'checked' : ''}>
                    ${t('deliveryRules.packingModePerItem')}
                </label>
                <label class="flex-1 px-3 py-2 rounded-md text-xs cursor-pointer transition-all text-center ${packingMode === 'grouped' ? 'bg-[hsl(var(--card))] shadow-sm font-medium card-text' : 'secondary-text'}">
                    <input type="radio" name="${prefix}_packingMode" value="grouped" class="hidden" ${packingMode === 'grouped' ? 'checked' : ''}>
                    ${t('deliveryRules.packingModeGrouped')}
                </label>
                <label class="flex-1 px-3 py-2 rounded-md text-xs cursor-pointer transition-all text-center ${packingMode === 'single' ? 'bg-[hsl(var(--card))] shadow-sm font-medium card-text' : 'secondary-text'}">
                    <input type="radio" name="${prefix}_packingMode" value="single" class="hidden" ${packingMode === 'single' ? 'checked' : ''}>
                    ${t('deliveryRules.packingModeSingle')}
                </label>
            </div>
            <p class="text-[10px] secondary-text italic mt-2 px-1">
                ${packingMode === 'perItem' ? t('deliveryRules.packingModePerItemHelp') :
                  packingMode === 'single' ? t('deliveryRules.packingModeSingleHelp') :
                  t('deliveryRules.packingModeGroupedHelp')}
            </p>
        </div>
    `

    // Allow conversion checkbox
    const allowConversion = data.allowConversion || false
    html += `
        <div class="mb-4">
            <label class="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" name="${prefix}_allowConversion"
                       class="w-4 h-4 rounded border-default accent-[hsl(var(--primary))]"
                       ${allowConversion ? 'checked' : ''}>
                <span class="text-sm secondary-text">${t('deliveryRules.allowConversion')}</span>
                <span class="icon icon-help w-3.5 h-3.5 secondary-text opacity-40"
                      title="${t('deliveryRules.allowConversionVolumeHelp')}"></span>
            </label>
        </div>
    `

    const valueLabel = getCurrencySymbol(currencyCode)

    // Ranges table with only Max Volume and Value columns
    html += `
        <div class="mb-4">
            <p class="text-[10px] secondary-text italic mb-3 px-1 flex items-center gap-1.5">
                <span class="icon icon-info w-3.5 h-3.5 flex-shrink-0 opacity-70"></span>
                <span>${t('deliveryRules.tieredMaxLimitHelp')}</span>
            </p>

            <div class="flex gap-2 mb-2 text-xs font-semibold secondary-text uppercase tracking-wider pl-2 pr-2">
                <div class="flex-1">Max ${t('deliveryRules.volume')}</div>
                <div class="flex-[1.5]">${t('deliveryRules.value')} (${valueLabel})</div>
                <div class="w-8"></div>
            </div>

            <div class="ranges-container space-y-2 mb-4" data-prefix="${prefix}" data-type="volume_packages" data-unit="${volUnit}">
                ${(data.ranges || []).map((range, idx) => renderRangeRow('volume_packages', prefix, idx, range, 'fixed', 'total', volUnit, '', currencyCode)).join('')}
                ${(!data.ranges || data.ranges.length === 0) ? `<div class="empty-placeholder text-xs secondary-text italic text-center p-4 bg-[hsl(var(--muted))] rounded-lg border border-dashed border-default">${t('deliveryRules.noRange')}</div>` : ''}
            </div>

            <button class="add-range-btn w-full py-2 flex items-center justify-center space-x-2 text-sm font-medium text-primary hover:bg-[hsl(var(--primary))]/10 rounded-md border border-dashed border-[hsl(var(--primary))]/30 transition-all" data-prefix="${prefix}">
                <span class="text-lg leading-none">+</span>
                <span>${t('deliveryRules.addRange')}</span>
            </button>
        </div>
    `

    return html
}

/**
 * Render calculation rules with configurable types
 * @param {string} prefix - Form field prefix
 * @param {object} ruleData - Current rule data
 * @param {object} config - Configuration options
 * @param {string} config.preset - Preset name ('sellerShipping', 'forwarderReShipping', 'simpleOnly')
 * @param {object|null} config.session - Session for feature flag checking
 * @param {boolean} config.showFreeOption - Whether to show the free option (default: true)
 */
export function renderCalculationRules(prefix, ruleData, config = {}) {
    const {
        preset = 'sellerShipping',
        session = null,
        showFreeOption = true,
        currency = null,
    } = config

    if (!ruleData) ruleData = { type: 'fixed' }
    let type = ruleData.type || 'fixed'

    if (!showFreeOption && type === 'free') type = 'fixed'

    // Get preset configuration
    const presetConfig = FEE_CONFIG_PRESETS[preset] || FEE_CONFIG_PRESETS.sellerShipping
    const effectiveSession = session || Store.state.sessions?.find(s => s.id === Store.state.currentSession)
    const currencyCode = currency || effectiveSession?.currency || DEFAULT_CURRENCY

    // Filter available types based on preset and session features
    const availableTypeValues = filterAvailableTypes(
        presetConfig.availableTypes,
        effectiveSession,
        presetConfig.includeItem
    ).filter(t => showFreeOption || t !== 'free')

    // Type definitions with labels and help text
    const typeDefinitions = {
        cumul: { label: t('deliveryRules.typeCumul'), help: t('deliveryRules.typeCumulHelp') },
        free: { label: t('deliveryRules.freeDelivery'), help: t('deliveryRules.freeDeliveryHelp') },
        fixed: { label: t('deliveryRules.typeFixed'), help: t('deliveryRules.typeFixedHelp') },
        percentage: { label: t('deliveryRules.typePercentage'), help: t('deliveryRules.typePercentageHelp') },
        quantity: { label: t('deliveryRules.typeQuantity'), help: t('deliveryRules.typeQuantityHelp') },
        distance: { label: t('deliveryRules.typeDistance'), help: t('deliveryRules.typeDistanceHelp') },
        weight: { label: t('deliveryRules.typeWeight'), help: t('deliveryRules.typeWeightHelp') },
        volume: { label: t('deliveryRules.typeVolume'), help: t('deliveryRules.typeVolumeHelp') },
        order_amount: { label: t('deliveryRules.typeOrderAmount'), help: t('deliveryRules.typeOrderAmountHelp') },
        dimension: { label: t('deliveryRules.typeDimension'), help: t('deliveryRules.typeDimensionHelp') },
        weight_volume: { label: t('deliveryRules.typeWeightVolume'), help: t('deliveryRules.typeWeightVolumeHelp') },
        weight_dimension: { label: t('deliveryRules.typeWeightDimension'), help: t('deliveryRules.typeWeightDimensionHelp') },
        volume_packages: { label: t('deliveryRules.typeVolumePackages'), help: t('deliveryRules.typeVolumePackagesHelp') },
    }

    const types = availableTypeValues.map(value => ({
        value,
        label: typeDefinitions[value]?.label || value,
        help: typeDefinitions[value]?.help || ''
    }))

    let html = `<div class="calculation-rules-container space-y-4" data-prefix="${prefix}">`

    html += `<div>
        <h5 class="text-sm font-semibold secondary-text mb-3">${t("deliveryRules.pricingType")}</h5>
        <div class="grid grid-cols-2 gap-2 mb-4">`
    types.forEach(tType => {
        const checkedStatus = type === tType.value ? 'checked' : ''
        const radioId = `${prefix}_type_${tType.value}`
        html += `
            <div class="relative group">
                <label for="${radioId}" class="flex items-center space-x-2 p-3 border border-default rounded-xl cursor-pointer hover:bg-[hsl(var(--muted))] transition-all bg-[hsl(var(--card))] has-[:checked]:bg-[hsl(var(--muted))] has-[:checked]:border-[hsl(var(--primary))] has-[:checked]:shadow-sm has-[:checked]:ring-1 has-[:checked]:ring-[hsl(var(--primary))]/10 group">
                    <input type="radio" id="${radioId}" name="${prefix}_type" value="${tType.value}" class="calculation-type-radio sr-only peer" ${checkedStatus}>
                    <div class="w-4 h-4 flex-shrink-0 rounded-full border border-default flex items-center justify-center peer-checked:border-[hsl(var(--primary))] peer-checked:bg-[hsl(var(--primary))] transition-all">
                        <div class="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary-foreground))] scale-0 peer-checked:scale-100 transition-transform"></div>
                    </div>
                    <span class="text-xs font-medium secondary-text peer-checked:card-text transition-colors flex-1 truncate" title="${tType.label}">${tType.label}</span>
                    <div class="icon icon-help w-3.5 h-3.5 secondary-text opacity-40 hover:opacity-100 transition-opacity cursor-help" title="${tType.help}"></div>
                </label>
            </div>
        `
    })
    html += `</div></div>`

    html += `<div class="calculation-inputs p-4 border border-default rounded bg-[hsl(var(--card))]">`

    const hideAdvancedSettings = presetConfig.hideAdvancedSettings || false

    const TYPE_RENDERERS = {
        cumul: () => `<p class="text-sm secondary-text italic">${t('deliveryRules.typeCumul')}</p>`,
        free: () => `<p class="text-sm font-medium card-text italic">${t('deliveryRules.freeDelivery')}</p>`,
        fixed: (p, d) => renderFixedInputs(p, d, currencyCode),
        percentage: (p, d) => renderPercentageInputs(p, d),
        quantity: (p, d) => renderTieredInputs(p, d, 'quantity', hideAdvancedSettings, currencyCode),
        distance: (p, d) => renderTieredInputs(p, d, 'distance', hideAdvancedSettings, currencyCode),
        weight: (p, d) => renderTieredInputs(p, d, 'weight', hideAdvancedSettings, currencyCode),
        volume: (p, d) => renderTieredInputs(p, d, 'volume', hideAdvancedSettings, currencyCode),
        order_amount: (p, d) => renderOrderAmountInputs(p, d, hideAdvancedSettings, currencyCode),
        dimension: (p, d) => renderDimensionInputs(p, d, currencyCode),
        weight_volume: (p, d) => renderCombinedInputs(p, d, 'weight_volume', currencyCode),
        weight_dimension: (p, d) => renderCombinedInputs(p, d, 'weight_dimension', currencyCode),
        volume_packages: (p, d) => renderVolumePackagesInputs(p, d, currencyCode),
    }

    const renderer = TYPE_RENDERERS[type]
    if (renderer) html += renderer(prefix, ruleData)

    html += `</div></div>`
    return html
}
