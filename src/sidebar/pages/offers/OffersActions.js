import { Store } from "../../state.js";
import { SidebarAPI } from "../../api.js";
import { browser } from "../../../shared/browser.js";

export function navigateToProducts() {
  Store.setState({ currentView: "products" });
}

export function getSession() {
  return Store.state.sessions.find((s) => s.id === Store.state.currentSession);
}

export function getProduct() {
  const session = getSession();
  return session?.products.find((p) => p.id === Store.state.currentProduct);
}

export function requestScrapeForCurrentTab() {
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    if (tabs && tabs[0]) {
      SidebarAPI.requestScrapeForTab(tabs[0].id);
    }
  });
}

export function updateOffer(sessionId, productId, offerId, offerData) {
  return Store.sync(SidebarAPI.updateOffer(sessionId, productId, offerId, offerData));
}

export function deleteOffer(sessionId, productId, offerId) {
  return Store.sync(SidebarAPI.deleteOffer(sessionId, productId, offerId));
}

export function updateBundle(sessionId, bundleId, bundleData) {
  return Store.sync(SidebarAPI.updateBundle(sessionId, bundleId, bundleData));
}

export function deleteBundle(sessionId, bundleId) {
  return Store.sync(SidebarAPI.deleteBundle(sessionId, bundleId));
}

export function createOffer(sessionId, productId, offerData) {
  return Store.sync(SidebarAPI.createOffer(sessionId, productId, offerData));
}

export function createBundle(sessionId, bundleData) {
  return Store.sync(SidebarAPI.createBundle(sessionId, bundleData));
}

export function openInNewTab(url) {
  if (url) {
    try {
      browser.tabs.create({ url });
    } catch {
      window.open(url, "_blank", "noopener");
    }
  }
}

export function getScrapedData() {
  return Store.state.scrapedData;
}

export function clearScrapedData() {
  Store.setState({ scrapedData: null }, true);
}
