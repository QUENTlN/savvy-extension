// Thin client for talking to the background script from the sidebar.
// All runtime messages should go through this module.

import { browser } from '../shared/browser.js';

export const SidebarAPI = {
  // Sessions
  getSessions() {
    return browser.runtime.sendMessage({ action: "getSessions" })
  },

  createSession(session) {
    return browser.runtime.sendMessage({
      action: "createSession",
      session,
    })
  },

  updateSession(sessionId, updatedSession) {
    return browser.runtime.sendMessage({
      action: "updateSession",
      sessionId,
      updatedSession,
    })
  },

  deleteSession(sessionId) {
    return browser.runtime.sendMessage({
      action: "deleteSession",
      sessionId,
    })
  },

  setCurrentSession(sessionId) {
    return browser.runtime.sendMessage({
      action: "setCurrentSession",
      sessionId,
    })
  },

  // Products
  createProduct(sessionId, product) {
    return browser.runtime.sendMessage({
      action: "createProduct",
      sessionId,
      product,
    })
  },

  deleteProduct(sessionId, productId) {
    return browser.runtime.sendMessage({
      action: "deleteProduct",
      sessionId,
      productId,
    })
  },

  // Offers
  createOffer(sessionId, productId, offer) {
    return browser.runtime.sendMessage({
      action: "createOffer",
      sessionId,
      productId,
      offer,
    })
  },

  deleteOffer(sessionId, productId, offerId) {
    return browser.runtime.sendMessage({
      action: "deleteOffer",
      sessionId,
      productId,
      offerId,
    })
  },

  updateOffer(sessionId, productId, offerId, updatedOffer) {
    return browser.runtime.sendMessage({
      action: "updateOffer",
      sessionId,
      productId,
      offerId,
      updatedOffer,
    })
  },

  // Bundles
  createBundle(sessionId, bundle) {
    return browser.runtime.sendMessage({
      action: "createBundle",
      sessionId,
      bundle,
    })
  },

  updateBundle(sessionId, bundleId, updatedBundle) {
    return browser.runtime.sendMessage({
      action: "updateBundle",
      sessionId,
      bundleId,
      updatedBundle,
    })
  },

  deleteBundle(sessionId, bundleId) {
    return browser.runtime.sendMessage({
      action: "deleteBundle",
      sessionId,
      bundleId,
    })
  },

  // Alternatives
  createAlternativeGroup(sessionId, group) {
    return browser.runtime.sendMessage({
      action: "createAlternativeGroup",
      sessionId,
      group,
    })
  },

  updateAlternativeGroup(sessionId, groupId, updatedGroup) {
    return browser.runtime.sendMessage({
      action: "updateAlternativeGroup",
      sessionId,
      groupId,
      updatedGroup,
    })
  },

  deleteAlternativeGroup(sessionId, groupId) {
    return browser.runtime.sendMessage({
      action: "deleteAlternativeGroup",
      sessionId,
      groupId,
    })
  },

  // Customs Categories
  createCustomsCategory(sessionId, category, defaultVAT) {
    return browser.runtime.sendMessage({
      action: "createCustomsCategory",
      sessionId,
      category,
      defaultVAT,
    })
  },

  updateCustomsCategory(sessionId, categoryId, updatedCategory, defaultVAT) {
    return browser.runtime.sendMessage({
      action: "updateCustomsCategory",
      sessionId,
      categoryId,
      updatedCategory,
      defaultVAT,
    })
  },

  deleteCustomsCategory(sessionId, categoryId) {
    return browser.runtime.sendMessage({
      action: "deleteCustomsCategory",
      sessionId,
      categoryId,
    })
  },

  // Forwarders
  createForwarder(sessionId, forwarder) {
    return browser.runtime.sendMessage({
      action: "createForwarder",
      sessionId,
      forwarder,
    })
  },

  updateForwarder(sessionId, forwarderId, updatedForwarder) {
    return browser.runtime.sendMessage({
      action: "updateForwarder",
      sessionId,
      forwarderId,
      updatedForwarder,
    })
  },

  deleteForwarder(sessionId, forwarderId) {
    return browser.runtime.sendMessage({
      action: "deleteForwarder",
      sessionId,
      forwarderId,
    })
  },

  // Optimization
  optimizeSession(sessionData) {
    return browser.runtime.sendMessage({
      action: "optimizeSession",
      sessionData,
    })
  },

  saveOptimizationResult(sessionId, result, sessionSnapshot, currency) {
    return browser.runtime.sendMessage({
      action: "saveOptimizationResult",
      sessionId,
      result,
      sessionSnapshot,
      currency,
    })
  },

  getOptimizationResults(sessionId) {
    return browser.runtime.sendMessage({
      action: "getOptimizationResults",
      sessionId,
    })
  },

  getOptimizationHistory(sessionId) {
    return browser.runtime.sendMessage({
      action: "getOptimizationHistory",
      sessionId,
    })
  },

  // Scraping
  requestScrapeForTab(tabId) {
    return browser.runtime.sendMessage({
      action: "scrapePage",
      tabId,
    })
  },
}


