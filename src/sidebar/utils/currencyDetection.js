/**
 * Scans session for all unique currencies
 * @param {Object} session - Session object
 * @returns {Set<string>} Set of unique currency codes
 */
export function detectAllCurrencies(session) {
  const currencies = new Set();

  // Offers
  session.products?.forEach((product) => {
    product.offers?.forEach((offer) => {
      if (offer.currency) currencies.add(offer.currency);
    });
  });

  // Bundles
  session.bundles?.forEach((bundle) => {
    if (bundle.currency) currencies.add(bundle.currency);
  });

  // Delivery Rules
  session.deliveryRules?.forEach((rule) => {
    if (rule.currency) currencies.add(rule.currency);
  });

  // Forwarders
  session.forwarders?.forEach((forwarder) => {
    if (forwarder.currency) currencies.add(forwarder.currency);
  });

  return currencies;
}

/**
 * Gets currencies that differ from target currency
 * @param {Object} session - Session object
 * @param {string} targetCurrency - User's default currency
 * @returns {string[]} Array of foreign currency codes
 */
export function getForeignCurrencies(session, targetCurrency) {
  const allCurrencies = detectAllCurrencies(session);
  allCurrencies.delete(targetCurrency); // Remove target currency
  return Array.from(allCurrencies).sort();
}
