// Default configuration for known parsers used by the scraper content script.

export const knownParsers = {
  amazon: {
    price: {
      strategy: "extractPrice",
      selector: ".reinventPricePriceToPayMargin",
    },
    shippingPrice: {
      strategy: "none",
    },
    insurancePrice: {
      strategy: "none",
    },
    currency: {
      strategy: "extractCurrency",
      selector: ".reinventPricePriceToPayMargin",
    },
    seller: {
      strategy: "domainName",
    },
  },
  ebay: {
    price: {
      strategy: "extractPrice",
      selector: ".x-price-primary > span:nth-child(1)",
    },
    shippingPrice: {
      strategy: "extractPrice",
      selector:
        "div.false > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > span:nth-child(1)",
    },
    insurancePrice: {
      strategy: "none",
    },
    currency: {
      strategy: "extractCurrency",
      selector: ".x-price-primary > span:nth-child(1)",
    },
    seller: {
      strategy: "domainNameAndSeller",
      selector: ".x-sellercard-atf__info__about-seller > a:nth-child(1) > span:nth-child(1)",
    },
  },
  "neokyo.com": {
    price: {
      strategy: "splitPriceCurrency",
      selector: ".product-price-converted",
      param: "price",
    },
    shippingPrice: {
      strategy: "splitPriceCurrency",
      selector: "p.col-9:nth-child(12) > strong:nth-child(1)",
      param: "price",
    },
    insurancePrice: {
      strategy: "none",
    },
    currency: {
      strategy: "splitPriceCurrency",
      selector: ".product-price-converted",
      param: "currency",
    },
    seller: {
      strategy: "urlParameter",
      selector: "a.col-9:nth-child(2)",
      param: "store_name",
    },
  },
  pccomponentes: {
    price: {
      strategy: "extractPrice",
      selector: "#pdp-price-current-integer",
    },
    shippingPrice: {
      strategy: "none",
    },
    insurancePrice: {
      strategy: "extractPrice",
      selector:
        "#pdp-section-warranties-list > div:nth-child(3) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1)",
    },
    currency: {
      strategy: "extractCurrency",
      selector: "#pdp-price-current-integer",
    },
    seller: {
      strategy: "domainName",
    },
  },
  // Add more known parsers here
};
