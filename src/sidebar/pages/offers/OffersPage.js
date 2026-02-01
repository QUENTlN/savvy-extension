import { renderOffersView } from "./OffersView.js";
import * as actions from "./OffersActions.js";
import {
  showEditOfferModal,
  showDeleteOfferModal,
  showDeleteBundleModal,
  showScrapedDataModal,
} from "./modals/index.js";
import { Store } from "../../state.js";

export function initOffersPage(app) {
  const session = actions.getSession();
  const product = actions.getProduct();

  if (!session || !product) {
    Store.setState({ currentView: "products" });
    return;
  }

  app.innerHTML = renderOffersView({ session, product });
  attachEventListeners(session, product);

  // Check if there's scraped data to show
  const scrapedData = actions.getScrapedData();
  if (scrapedData) {
    // Clear immediately to prevent showing modal twice on re-render
    actions.clearScrapedData();
    showScrapedDataModal(session, product, scrapedData);
  }
}

function attachEventListeners(session, product) {
  document.getElementById("back-button")?.addEventListener("click", actions.navigateToProducts);

  document
    .getElementById("add-offer-button")
    ?.addEventListener("click", actions.requestScrapeForCurrentTab);

  // Delete offer buttons
  document.querySelectorAll(".delete-offer-button").forEach((button) => {
    button.addEventListener("click", () => {
      showDeleteOfferModal(button.dataset.id);
    });
  });

  // Delete bundle buttons
  document.querySelectorAll(".delete-bundle-button").forEach((button) => {
    button.addEventListener("click", () => {
      showDeleteBundleModal(button.dataset.id);
    });
  });

  // Edit offer buttons
  document.querySelectorAll(".edit-offer-button").forEach((button) => {
    button.addEventListener("click", () => {
      const offer = product.offers.find((o) => o.id === button.dataset.id);
      showEditOfferModal(offer, session, product);
    });
  });

  // Edit bundle buttons
  document.querySelectorAll(".edit-bundle-button").forEach((button) => {
    button.addEventListener("click", () => {
      const bundle = session.bundles.find((b) => b.id === button.dataset.id);
      showEditOfferModal(bundle, session, null);
    });
  });

  // Open in new tab buttons
  document.querySelectorAll(".open-offer-button").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      actions.openInNewTab(button.dataset.url);
    });
  });
}
