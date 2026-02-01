// Seller-related utility functions

export function getUniqueSellers(session) {
  const sellers = new Set();

  session.products.forEach((product) => {
    product.offers.forEach((offer) => {
      if (offer.seller) {
        sellers.add(offer.seller);
      }
    });
  });

  if (session.bundles) {
    session.bundles.forEach((bundle) => {
      if (bundle.seller) {
        sellers.add(bundle.seller);
      }
    });
  }

  return Array.from(sellers);
}

export function ensureDefaultRule(session, seller) {
  if (!session.deliveryRules) session.deliveryRules = [];

  const existingRule = session.deliveryRules.find((r) => r.seller === seller);

  if (!existingRule) {
    const defaultRule = {
      seller: seller,
      billingMethod: "global",
      calculationMethod: {
        type: "cumul",
      },
    };
    session.deliveryRules.push(defaultRule);
    return true;
  }

  return false;
}

export function getRule(session, seller) {
  const rule = (session.deliveryRules || []).find((r) => r.seller === seller) || {};
  if (!rule.billingMethod) {
    rule.billingMethod = "global";
  }
  return rule;
}

export function getSellerProducts(session, seller) {
  return session.products.filter((p) => p.offers.some((offer) => offer.seller === seller));
}
