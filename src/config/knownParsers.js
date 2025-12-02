// Default configuration for known parsers used by the scraper content script.
// This file is loaded before `background.js` so that `knownParsers` is available globally.

let knownParsers = {
  amazon: {
    price: {
      strategy: "extractPrice",
      selector: ".reinventPricePriceToPayMargin",
    },
    priceCurrency: {
      strategy: "extractCurrency",
      selector: ".reinventPricePriceToPayMargin",
    },
    shippingPrice: {
      strategy: "none",
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
    priceCurrency: {
      strategy: "extractCurrency",
      selector: ".x-price-primary > span:nth-child(1)",
    },
    shippingPrice: {
      strategy: "extractPrice",
      selector:
        "div.false > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > span:nth-child(1)",
    },
    seller: {
      strategy: "domainNameAndSeller",
      selector:
        ".x-sellercard-atf__info__about-seller > a:nth-child(1) > span:nth-child(1)",
    },
  },
  "neokyo.com": {
    price: {
      strategy: "splitPriceCurrency",
      selector: ".product-price-converted",
      param: "price",
    },
    priceCurrency: {
      strategy: "splitPriceCurrency",
      selector: ".product-price-converted",
      param: "currency",
    },
    shippingPrice: {
      strategy: "splitPriceCurrency",
      selector: "p.col-9:nth-child(12) > strong:nth-child(1)",
      param: "price",
    },
    seller: {
      strategy: "urlParameter",
      selector: "a.col-9:nth-child(2)",
      param: "store_name",
    },
  },
  // Add more known parsers here
}


