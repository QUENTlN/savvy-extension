import type {
  Session,
  Product,
  Offer,
  Bundle,
  DeliveryRule,
  Forwarder,
  AlternativeGroup,
  CustomsCategory,
} from "./storage.fixture";

let sessionCounter = 0;
let productCounter = 0;
let offerCounter = 0;
let bundleCounter = 0;
let forwarderCounter = 0;
let alternativeGroupCounter = 0;
let customsCategoryCounter = 0;

/**
 * Resets all counters - call this in beforeEach if needed
 */
export function resetCounters(): void {
  sessionCounter = 0;
  productCounter = 0;
  offerCounter = 0;
  bundleCounter = 0;
  forwarderCounter = 0;
  alternativeGroupCounter = 0;
  customsCategoryCounter = 0;
}

/**
 * Creates a unique session ID
 */
export function createSessionId(): string {
  return `session-${++sessionCounter}-${Date.now()}`;
}

/**
 * Creates a unique product ID
 */
export function createProductId(): string {
  return `product-${++productCounter}-${Date.now()}`;
}

/**
 * Creates a unique offer ID
 */
export function createOfferId(): string {
  return `offer-${++offerCounter}-${Date.now()}`;
}

/**
 * Creates a unique bundle ID
 */
export function createBundleId(): string {
  return `bundle-${++bundleCounter}-${Date.now()}`;
}

/**
 * Creates a unique forwarder ID
 */
export function createForwarderId(): string {
  return `forwarder-${++forwarderCounter}-${Date.now()}`;
}

/**
 * Creates a unique alternative group ID
 */
export function createAlternativeGroupId(): string {
  return `alt-group-${++alternativeGroupCounter}-${Date.now()}`;
}

/**
 * Creates a unique customs category ID
 */
export function createCustomsCategoryId(): string {
  return `customs-cat-${++customsCategoryCounter}-${Date.now()}`;
}

/**
 * Creates test offer data with reasonable defaults
 */
export function createOfferData(overrides: Partial<Offer> = {}): Offer {
  return {
    id: createOfferId(),
    url: "https://example.com/product",
    seller: "Test Seller",
    price: 29.99,
    shippingPrice: 5.99,
    currency: "EUR",
    ...overrides,
  };
}

/**
 * Creates test product data with reasonable defaults
 */
export function createProductData(overrides: Partial<Product> = {}): Product {
  const id = overrides.id || createProductId();
  return {
    id,
    name: `Test Product ${productCounter}`,
    quantity: 1,
    offers: [],
    ...overrides,
  };
}

/**
 * Creates test session data with reasonable defaults
 */
export function createSessionData(overrides: Partial<Session> = {}): Session {
  const id = overrides.id || createSessionId();
  return {
    id,
    name: `Test Session ${sessionCounter}`,
    products: [],
    bundles: [],
    deliveryRules: [],
    alternativeGroups: [],
    customsCategories: [],
    forwarders: [],
    forwardersEnabled: false,
    importFeesEnabled: false,
    manageQuantity: true,
    ...overrides,
  };
}

/**
 * Creates test bundle data with reasonable defaults
 */
export function createBundleData(productIds: string[], overrides: Partial<Bundle> = {}): Bundle {
  return {
    id: createBundleId(),
    url: "https://example.com/bundle",
    seller: "Bundle Seller",
    price: 49.99,
    shippingPrice: 7.99,
    currency: "EUR",
    products: productIds.map((productId) => ({ productId, quantity: 1 })),
    ...overrides,
  };
}

/**
 * Creates test delivery rule data
 */
export function createDeliveryRuleData(
  seller: string,
  overrides: Partial<DeliveryRule> = {}
): DeliveryRule {
  return {
    seller,
    billingMethod: "perItem",
    ...overrides,
  };
}

/**
 * Creates test forwarder data with simple fee structure
 */
export function createForwarderData(overrides: Partial<Forwarder> = {}): Forwarder {
  return {
    id: createForwarderId(),
    name: `Test Forwarder ${forwarderCounter}`,
    currency: "EUR",
    fees: {
      reception: { calculationMethod: { type: "fixed", amount: 5 } },
      storage: { calculationMethod: { type: "fixed", amount: 2 } },
      repackaging: { calculationMethod: { type: "fixed", amount: 3 } },
      reShipping: { calculationMethod: { type: "fixed", amount: 10 } },
      consolidationMode: "single",
    },
    ...overrides,
  };
}

/**
 * Creates test alternative group data
 */
export function createAlternativeGroupData(
  overrides: Partial<AlternativeGroup> & { options?: AlternativeGroup["options"] } = {}
): AlternativeGroup {
  return {
    id: createAlternativeGroupId(),
    name: `Alt Group ${alternativeGroupCounter}`,
    options: [{ products: [] }],
    ...overrides,
  };
}

/**
 * Creates test customs category data
 */
export function createCustomsCategoryData(
  overrides: Partial<CustomsCategory> = {}
): CustomsCategory {
  return {
    id: createCustomsCategoryId(),
    name: `Category ${customsCategoryCounter}`,
    dutyRate: 5,
    vatRate: 20,
    ...overrides,
  };
}

/**
 * Creates a complete session with products and offers for testing
 */
export function createCompleteSessionData(
  options: {
    productCount?: number;
    offersPerProduct?: number;
    sessionName?: string;
  } = {}
): Session {
  const { productCount = 2, offersPerProduct = 2, sessionName } = options;

  const products: Product[] = [];

  for (let i = 0; i < productCount; i++) {
    const product = createProductData({ name: `Product ${i + 1}` });

    for (let j = 0; j < offersPerProduct; j++) {
      product.offers.push(
        createOfferData({
          seller: `Seller ${j + 1}`,
          price: 10 + j * 5 + i * 10,
          shippingPrice: 2 + j,
        })
      );
    }

    products.push(product);
  }

  return createSessionData({
    name: sessionName || `Complete Test Session`,
    products,
    manageQuantity: true,
  });
}

/**
 * Creates a complete session ready for optimization (with delivery rules for each seller)
 */
export function createCompleteOptimizableSession(
  options: {
    productCount?: number;
    offersPerProduct?: number;
    sessionName?: string;
  } = {}
): Session {
  const session = createCompleteSessionData(options);

  // Collect unique sellers from all offers
  const sellers = new Set<string>();
  for (const product of session.products) {
    for (const offer of product.offers) {
      sellers.add(offer.seller);
    }
  }

  // Create delivery rules for each seller
  session.deliveryRules = Array.from(sellers).map((seller) =>
    createDeliveryRuleData(seller, {
      billingMethod: "free",
    })
  );

  return session;
}

/**
 * Creates mock optimization API response
 */
export function createOptimizationResult(
  session: Session,
  options: {
    status?: "OPTIMAL" | "FEASIBLE" | "INFEASIBLE";
    totalCost?: number;
  } = {}
): object {
  const { status = "OPTIMAL", totalCost = 99.99 } = options;

  const selectedOffers = session.products.flatMap((product) => {
    if (product.offers.length === 0) return [];
    const offer = product.offers[0]; // Select first offer for simplicity
    return [
      {
        ids: {
          product: product.id,
          offer: offer.id,
        },
        seller: offer.seller,
        quantity: product.quantity || 1,
        pricing: {
          unit_price: offer.price,
          product_total: offer.price * (product.quantity || 1),
        },
        costs: {
          shipping: { amount: offer.shippingPrice },
          insurance: { amount: offer.insurancePrice || 0 },
        },
        url: offer.url,
      },
    ];
  });

  return {
    meta: { status },
    totals: {
      grand_total: totalCost,
      breakdown: {
        products: totalCost * 0.7,
        shipping: totalCost * 0.2,
        insurance: totalCost * 0.1,
      },
    },
    solution: {
      offers: selectedOffers,
      bundles: [],
    },
    logistics: {
      shipping: selectedOffers.map((o) => ({
        seller: o.seller,
        amount: o.costs.shipping.amount,
      })),
    },
  };
}
