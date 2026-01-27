// ============================================================================
// FEE CALCULATION TYPES AND PRESETS
// ============================================================================

/**
 * Fee calculation type configurations
 * Each type has metadata about its category and requirements
 */
export const FEE_CALCULATION_TYPES = {
    // Simple types (always available)
    free: { category: 'simple', requiresTiers: false },
    fixed: { category: 'simple', requiresTiers: false },
    percentage: { category: 'simple', requiresTiers: false },

    // Cumul-based (seller only)
    cumul: { category: 'cumul', requiresTiers: false, sellerOnly: true },

    // Tierable types (may require session features)
    quantity: { category: 'tierable', requiresTiers: true },
    distance: { category: 'tierable', requiresTiers: true, requires: ['manageDistance'] },
    weight: { category: 'tierable', requiresTiers: true, requires: ['manageWeight'] },
    volume: { category: 'tierable', requiresTiers: true, requires: ['manageVolume'] },

    // Order amount-based (always tiered)
    order_amount: { category: 'order_amount', requiresTiers: true, alwaysTiered: true },

    // Dimension-based
    dimension: { category: 'dimension', requiresTiers: true, requires: ['manageDimension'] },

    // Combined types
    weight_volume: { category: 'combined', requiresTiers: true, requires: ['manageWeight', 'manageVolume'] },
    weight_dimension: { category: 'combined', requiresTiers: true, requires: ['manageWeight', 'manageDimension'] },
    volume_packages: { category: 'combined', requiresTiers: true, requires: ['manageVolume'] },
}

/**
 * Label contexts for different fee types
 * 'delivery' uses shipping-specific labels
 * 'forwarder' uses generic fee labels
 */
export const LABEL_CONTEXTS = {
    delivery: 'deliveryRules',
    forwarder: 'forwarderFees',
}

/**
 * Preset configurations for different contexts
 */
export const FEE_CONFIG_PRESETS = {
    // Full configuration for seller shipping fees (includes 'cumul')
    sellerShipping: {
        availableTypes: ['cumul', 'free', 'fixed', 'percentage', 'quantity', 'distance', 'weight', 'volume', 'order_amount', 'dimension', 'weight_volume', 'weight_dimension', 'volume_packages'],
        includeItem: true,
        labelContext: 'delivery',
    },

    // Full configuration for forwarder re-shipping fees (no 'cumul')
    forwarderReShipping: {
        availableTypes: ['free', 'fixed', 'percentage', 'quantity', 'weight', 'volume', 'dimension', 'weight_volume', 'weight_dimension', 'volume_packages'],
        includeItem: false,
        labelContext: 'forwarder',
    },

    // Simple configuration for reception/repackaging fees
    simpleOnly: {
        availableTypes: ['free', 'fixed', 'percentage'],
        includeItem: false,
        labelContext: 'forwarder',
    },

    // Reception fees with quantity, weight, and volume support
    receptionWithQuantity: {
        availableTypes: ['free', 'fixed', 'percentage', 'quantity', 'weight', 'volume'],
        includeItem: false,
        labelContext: 'forwarder',
    },

    // Storage fees with dimension and volume support (no advanced settings)
    storageWithDimensionVolume: {
        availableTypes: ['free', 'fixed', 'percentage', 'weight', 'volume', 'order_amount', 'dimension', 'weight_volume', 'weight_dimension', 'volume_packages'],
        includeItem: false,
        hideAdvancedSettings: true,
        labelContext: 'forwarder',
    },

    // Repackaging fees with all methods (no advanced settings)
    repackagingWithAdvanced: {
        availableTypes: ['free', 'fixed', 'percentage', 'quantity', 'weight', 'volume', 'order_amount', 'dimension', 'weight_volume', 'weight_dimension', 'volume_packages'],
        includeItem: false,
        hideAdvancedSettings: true,
        labelContext: 'forwarder',
    },
}

/**
 * Get type configuration
 * @param {string} type - The fee calculation type
 * @returns {object} Type configuration object
 */
export function getTypeConfig(type) {
    return FEE_CALCULATION_TYPES[type] || null
}

/**
 * Filter available types based on configuration and session features
 * @param {string[]} availableTypes - List of type values to filter
 * @param {object|null} session - Session object with feature flags
 * @param {boolean} includeItem - Whether to include 'cumul' type
 * @returns {string[]} Filtered list of available type values
 */
export function filterAvailableTypes(availableTypes, session, includeItem = true) {
    return availableTypes.filter(typeValue => {
        const config = FEE_CALCULATION_TYPES[typeValue]
        if (!config) return false

        // Filter out 'cumul' if not included
        if (typeValue === 'cumul' && !includeItem) return false

        // Check session feature requirements
        if (config.requires && config.requires.length > 0) {
            if (!session) return false
            return config.requires.every(req => session[req])
        }

        return true
    })
}
