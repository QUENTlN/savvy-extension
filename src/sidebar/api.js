// Thin client for talking to the background script from the sidebar.
// All runtime messages should go through this module.

const SidebarAPI = {
  // Sessions
  getSessions() {
    return browser.runtime.sendMessage({ action: "getSessions" })
  },

  updateSession(sessionId, updatedSession) {
    return browser.runtime.sendMessage({
      action: "updateSession",
      sessionId,
      updatedSession,
    })
  },

  createSession(name) {
    return browser.runtime.sendMessage({
      action: "createSession",
      name,
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

  // Pages
  addPage(sessionId, productId, page) {
    return browser.runtime.sendMessage({
      action: "addPage",
      sessionId,
      productId,
      page,
    })
  },

  deletePage(sessionId, productId, pageId) {
    return browser.runtime.sendMessage({
      action: "deletePage",
      sessionId,
      productId,
      pageId,
    })
  },

  updatePage(sessionId, productId, pageId, updatedPage) {
    return browser.runtime.sendMessage({
      action: "updatePage",
      sessionId,
      productId,
      pageId,
      updatedPage,
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

  // Optimization
  optimizeSession(sessionId) {
    return browser.runtime.sendMessage({
      action: "optimizeSession",
      sessionId,
    })
  },

  showOptimizationResults(result) {
    return browser.runtime.sendMessage({
      action: "showOptimizationResults",
      result,
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


