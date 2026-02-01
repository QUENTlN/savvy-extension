import { deepCloneSession } from "./sessionHelpers.js";

/**
 * Converts a single monetary value
 * @param {number} amount - Amount to convert (in source currency)
 * @param {number} rate - Conversion rate (1 target = X source)
 * @returns {number} Converted amount (in target currency)
 */
function convertAmount(amount, rate) {
  if (amount === null || amount === undefined || amount === "") return amount;
  // Rate format: "1 EUR = X USD", so to convert USD to EUR: amount / rate
  return parseFloat((parseFloat(amount) / rate).toFixed(2));
}

/**
 * Converts a calculation method object
 * @param {Object} calculationMethod - Calculation method with type and amount
 * @param {number} rate - Conversion rate
 * @returns {Object} Converted calculation method
 */
function convertCalculationMethod(calculationMethod, rate) {
  if (!calculationMethod) return calculationMethod;

  const converted = { ...calculationMethod };

  // Fixed amount
  if (converted.amount !== undefined) {
    converted.amount = convertAmount(converted.amount, rate);
  }

  // Tiered ranges
  if (converted.ranges && Array.isArray(converted.ranges)) {
    converted.ranges = converted.ranges.map((range) => ({
      ...range,
      min: convertAmount(range.min, rate),
      max: range.max ? convertAmount(range.max, rate) : null,
      value: convertAmount(range.value, rate),
    }));
  }

  return converted;
}

/**
 * Converts an offer/bundle to target currency
 * @param {Object} item - Offer or bundle object
 * @param {Object} rates - Conversion rates map
 * @param {string} targetCurrency - Target currency code
 * @returns {Object} Converted item
 */
function convertItem(item, rates, targetCurrency) {
  if (!item.currency || item.currency === targetCurrency) {
    return item; // Already in target currency
  }

  const rate = rates[item.currency];
  if (!rate) {
    throw new Error(`No conversion rate provided for ${item.currency}`);
  }

  const converted = { ...item };
  converted.price = convertAmount(item.price, rate);
  converted.shippingPrice = convertAmount(item.shippingPrice, rate);
  converted.insurancePrice = convertAmount(item.insurancePrice, rate);
  converted.currency = targetCurrency;

  return converted;
}

/**
 * Converts a delivery rule to target currency
 * @param {Object} rule - Delivery rule object
 * @param {Object} rates - Conversion rates map
 * @param {string} targetCurrency - Target currency code
 * @returns {Object} Converted rule
 */
function convertDeliveryRule(rule, rates, targetCurrency) {
  if (!rule.currency || rule.currency === targetCurrency) {
    return rule;
  }

  const rate = rates[rule.currency];
  if (!rate) {
    throw new Error(`No conversion rate provided for ${rule.currency}`);
  }

  const converted = { ...rule };

  // Global thresholds and fees
  converted.globalFreeShippingThreshold = convertAmount(rule.globalFreeShippingThreshold, rate);
  converted.customsClearanceFee = convertAmount(rule.customsClearanceFee, rate);

  // Calculation method
  if (rule.calculationMethod) {
    converted.calculationMethod = convertCalculationMethod(rule.calculationMethod, rate);
  }

  // Groups
  if (rule.groups && Array.isArray(rule.groups)) {
    converted.groups = rule.groups.map((group) => ({
      ...group,
      freeShippingThreshold: convertAmount(group.freeShippingThreshold, rate),
      calculationMethod: convertCalculationMethod(group.calculationMethod, rate),
    }));
  }

  converted.currency = targetCurrency;
  return converted;
}

/**
 * Converts a forwarder to target currency
 * @param {Object} forwarder - Forwarder object
 * @param {Object} rates - Conversion rates map
 * @param {string} targetCurrency - Target currency code
 * @returns {Object} Converted forwarder
 */
function convertForwarder(forwarder, rates, targetCurrency) {
  if (!forwarder.currency || forwarder.currency === targetCurrency) {
    return forwarder;
  }

  const rate = rates[forwarder.currency];
  if (!rate) {
    throw new Error(`No conversion rate provided for ${forwarder.currency}`);
  }

  const converted = { ...forwarder };

  if (forwarder.fees) {
    converted.fees = {
      reception: {
        calculationMethod: convertCalculationMethod(
          forwarder.fees.reception?.calculationMethod,
          rate
        ),
      },
      storage: {
        calculationMethod: convertCalculationMethod(
          forwarder.fees.storage?.calculationMethod,
          rate
        ),
      },
      repackaging: {
        calculationMethod: convertCalculationMethod(
          forwarder.fees.repackaging?.calculationMethod,
          rate
        ),
      },
      reShipping: {
        calculationMethod: convertCalculationMethod(
          forwarder.fees.reShipping?.calculationMethod,
          rate
        ),
      },
    };
  }

  converted.currency = targetCurrency;
  return converted;
}

/**
 * Converts entire session to target currency
 * @param {Object} session - Session object
 * @param {Object} rates - Map of currency code to conversion rate (1 target = X source)
 *                         Example: { "USD": 1.10 } means "1 EUR = 1.10 USD"
 * @param {string} targetCurrency - Target currency code
 * @returns {Object} Deep-cloned session with all values converted
 */
export function convertSessionCurrency(session, rates, targetCurrency) {
  const convertedSession = deepCloneSession(session);

  // Convert offers
  convertedSession.products?.forEach((product) => {
    if (product.offers) {
      product.offers = product.offers.map((offer) => convertItem(offer, rates, targetCurrency));
    }
  });

  // Convert bundles
  if (convertedSession.bundles) {
    convertedSession.bundles = convertedSession.bundles.map((bundle) =>
      convertItem(bundle, rates, targetCurrency)
    );
  }

  // Convert delivery rules
  if (convertedSession.deliveryRules) {
    convertedSession.deliveryRules = convertedSession.deliveryRules.map((rule) =>
      convertDeliveryRule(rule, rates, targetCurrency)
    );
  }

  // Convert forwarders
  if (convertedSession.forwarders) {
    convertedSession.forwarders = convertedSession.forwarders.map((forwarder) =>
      convertForwarder(forwarder, rates, targetCurrency)
    );
  }

  return convertedSession;
}
