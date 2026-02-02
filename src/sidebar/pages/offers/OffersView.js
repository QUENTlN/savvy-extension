import { t } from "../../../shared/i18n.js";
import { formatNumber, getCurrencySymbol } from "../../utils/formatters.js";
import { DEFAULT_CURRENCY } from "../../../shared/config/currencies.js";

export function renderOffersView({ session, product }) {
  return `
    <div class="mx-4">
      <!-- Header -->
      <div class="flex justify-between items-center mb-3">
        <div class="flex items-center space-x-3">
          <button class="muted-text p-2 cursor-pointer" id="back-button">
            <span class="icon icon-back h-8 w-8"></span>
          </button>
          <h1 class="text-2xl pl-4 font-semibold card-text">${product.name}</h1>
        </div>
      </div>

      <!-- Offers List -->
      <div class="space-y-4">
        ${
          product.offers.length > 0 ||
          (session.bundles &&
            session.bundles.some(
              (b) => b.products && b.products.some((bp) => bp.productId === product.id)
            ))
            ? `
            ${product.offers.map((offer) => renderOfferCard(offer)).join("")}
            ${renderBundleCards(session, product)}
            `
            : `<div class="card-bg rounded-xl shadow-md p-6 muted-text text-center">${t("offers.noOffers")}</div>`
        }
      </div>

      <!-- Add Offer Button -->
      <button id="add-offer-button" class="w-full mt-6 flex items-center justify-center space-x-2 cursor-pointer primary-bg primary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm">
        <span class="icon icon-plus h-5 w-5"></span>
        <span class="text-lg font-medium">${t("offers.addOffer")}</span>
      </button>
    </div>
  `;
}

function renderOfferCard(offer) {
  // Fallback to default currency if offer doesn't have one
  const currency = offer.currency || DEFAULT_CURRENCY;

  return `
    <div class="card-bg rounded-xl shadow-md p-4">
      <div class="flex justify-between items-start">
        <div class="flex-1 min-w-0 mr-4">
          <p class="text-lg font-medium text-[hsl(var(--foreground))] truncate">${offer.seller || offer.url}</p>
          <div class="mt-1 space-y-1">
            <p class="muted-text">${t("offers.price")}: ${formatPrice(offer.price, currency)}</p>
            <p class="muted-text">${t("offers.shipping")}: ${formatPrice(offer.shippingPrice, currency)}</p>
            ${offer.insurancePrice > 0 ? `<p class="muted-text">${t("offers.insurance")}: ${formatNumber(offer.insurancePrice)} ${getCurrencySymbol(currency)}</p>` : ""}
            ${offer.itemsPerPurchase && offer.itemsPerPurchase > 1 ? `<p class="muted-text">${t("offers.qtyPerPurchase")}: ${offer.itemsPerPurchase}</p>` : ""}
            ${offer.maxPerPurchase ? `<p class="muted-text">${t("offers.maxPurchases")}: ${offer.maxPerPurchase}</p>` : ""}
          </div>
        </div>
        <div class="flex items-start space-x-2">
          <button class="muted-text p-1 cursor-pointer open-offer-button" data-url="${offer.url}" title="${t("offers.openInNewTab")}">
            <span class="icon icon-open_external h-6 w-6"></span>
          </button>
          <button class="muted-text p-1 cursor-pointer edit-offer-button" data-id="${offer.id}" title="${t("offers.editOfferTitle")}">
            <span class="icon icon-edit h-6 w-6"></span>
          </button>
          <button class="muted-text p-1 cursor-pointer delete-offer-button" data-id="${offer.id}" title="${t("offers.deleteOfferTitle")}">
            <span class="icon icon-delete h-6 w-6"></span>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderBundleCards(session, product) {
  if (!session.bundles) return "";

  const productBundles = session.bundles.filter(
    (b) => b.products && b.products.some((bp) => bp.productId === product.id)
  );

  return productBundles
    .map((bundle) => {
      // Fallback to default currency if bundle doesn't have one
      const currency = bundle.currency || DEFAULT_CURRENCY;

      return `
    <div class="secondary-bg border border-default rounded-xl shadow-md p-4">
      <div class="flex justify-between items-start">
        <div class="flex-1 min-w-0 mr-4">
          <div class="flex items-center space-x-2">
            <span class="card-bg secondary-text text-xs font-semibold px-2.5 py-0.5 rounded border border-default">${t("products.bundle").toUpperCase()}</span>
            <p class="text-lg font-medium card-text truncate">${bundle.seller || bundle.url}</p>
          </div>
          <div class="mt-1 space-y-1">
            <p class="muted-text">${t("offers.price")}: ${formatPrice(bundle.price, currency)}</p>
            <p class="muted-text">${t("offers.shipping")}: ${formatPrice(bundle.shippingPrice, currency)}</p>
            ${bundle.itemsPerPurchase && bundle.itemsPerPurchase > 1 ? `<p class="muted-text">${t("offers.qtyPerPurchase")}: ${bundle.itemsPerPurchase}</p>` : ""}
            ${bundle.maxPerPurchase ? `<p class="muted-text">${t("offers.maxPurchases")}: ${bundle.maxPerPurchase}</p>` : ""}
            <div class="mt-2">
              <p class="text-sm font-medium secondary-text">${t("offers.productsInBundle")}:</p>
              <ul class="mt-1 space-y-1">
                ${
                  bundle.products && bundle.products.length > 0
                    ? bundle.products
                        .map((bp) => {
                          const prod = session.products.find((p) => p.id === bp.productId);
                          return prod
                            ? `<li class="text-sm muted-text">• ${prod.name} ${session.manageQuantity !== false && bp.quantity > 1 ? `(x${bp.quantity})` : ""}</li>`
                            : "";
                        })
                        .join("")
                    : `<li class="text-sm muted-text">${t("offers.noProducts")}</li>`
                }
              </ul>
            </div>
          </div>
        </div>
        <div class="flex items-start space-x-2">
          <button class="muted-text p-1 cursor-pointer open-offer-button" data-url="${bundle.url}" title="${t("offers.openInNewTab")}">
            <span class="icon icon-open_external h-6 w-6"></span>
          </button>
          <button class="muted-text p-1 cursor-pointer edit-bundle-button" data-id="${bundle.id}" title="${t("bundles.editBundle")}">
            <span class="icon icon-edit h-6 w-6"></span>
          </button>
          <button class="muted-text p-1 cursor-pointer delete-bundle-button" data-id="${bundle.id}" title="${t("bundles.deleteBundle")}">
            <span class="icon icon-delete h-6 w-6"></span>
          </button>
        </div>
      </div>
    </div>
  `;
    })
    .join("");
}

function formatPrice(price, currency) {
  if (price === undefined || price === null || price === "") return t("offers.na");
  try {
    return Number(price) === 0
      ? t("offers.free")
      : `${formatNumber(price)} ${getCurrencySymbol(currency)}`;
  } catch {
    return `${price} ${getCurrencySymbol(currency)}`;
  }
}
