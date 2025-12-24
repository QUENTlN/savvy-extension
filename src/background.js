// Store for sessions, products, and pages
let sessions = []
let currentSession = null

// Initialize from storage (sessions, current session, and optionally knownParsers overrides)
browser.storage.local.get(["sessions", "currentSession", "knownParsers"]).then((result) => {
  sessions = result.sessions || []
  currentSession = result.currentSession || null

  // Allow overriding default parsers from storage if present
  if (result.knownParsers && typeof knownParsers !== "undefined") {
    knownParsers = result.knownParsers
  }
})

// Save to storage
function saveToStorage() {
  browser.storage.local.set({
    sessions,
    currentSession,
    knownParsers,
  })
}

// Message handlers map: treat background as a small JSON RPC API
const messageHandlers = {
  // Sessions
  createSession: (message) => {
    createSession(message.session)
    return { success: true, sessions, currentSession }
  },
  updateSession: (message) => {
    updateSession(message.sessionId, message.updatedSession)
    return { success: true, sessions, currentSession }
  },
  deleteSession: (message) => {
    deleteSession(message.sessionId)
    return { success: true, sessions, currentSession }
  },
  setCurrentSession: (message) => {
    setCurrentSession(message.sessionId)
    return { success: true, currentSession }
  },

  // Products
  createProduct: (message) => {
    createProduct(message.sessionId, message.product)
    return { success: true, sessions, currentSession }
  },
  deleteProduct: (message) => {
    deleteProduct(message.sessionId, message.productId)
    return { success: true, sessions, currentSession }
  },

  // Pages
  createPage: (message) => {
    createPage(message.sessionId, message.productId, message.page)
    return { success: true, sessions, currentSession }
  },
  deletePage: (message) => {
    deletePage(message.sessionId, message.productId, message.pageId)
    return { success: true, sessions, currentSession }
  },
  updatePage: (message) => {
    updatePage(message.sessionId, message.productId, message.pageId, message.updatedPage)
    return { success: true, sessions, currentSession }
  },

  // Bundles
  createBundle: (message) => {
    createBundle(message.sessionId, message.bundle)
    return { success: true, sessions, currentSession }
  },
  updateBundle: (message) => {
    updateBundle(message.sessionId, message.bundleId, message.updatedBundle)
    return { success: true, sessions, currentSession }
  },
  deleteBundle: (message) => {
    deleteBundle(message.sessionId, message.bundleId)
    return { success: true, sessions, currentSession }
  },

  // Alternative groups
  createAlternativeGroup: (message) => {
    createAlternativeGroup(message.sessionId, message.group)
    return { success: true, sessions, currentSession }
  },
  updateAlternativeGroup: (message) => {
    updateAlternativeGroup(message.sessionId, message.groupId, message.updatedGroup)
    return { success: true, sessions, currentSession }
  },
  deleteAlternativeGroup: (message) => {
    deleteAlternativeGroup(message.sessionId, message.groupId)
    return { success: true, sessions, currentSession }
  },

  // Customs categories
  createCustomsCategory: (message) => {
    createCustomsCategory(message.sessionId, message.category, message.defaultVAT)
    return { success: true, sessions, currentSession }
  },
  updateCustomsCategory: (message) => {
    updateCustomsCategory(message.sessionId, message.categoryId, message.updatedCategory, message.defaultVAT)
    return { success: true, sessions, currentSession }
  },
  deleteCustomsCategory: (message) => {
    deleteCustomsCategory(message.sessionId, message.categoryId, message.defaultVAT)
    return { success: true, sessions, currentSession }
  },

  // Read-only queries
  getSessions: () => ({ sessions, currentSession }),
  getCurrentSession: () => ({ currentSession }),
  getKnownParsers: () => ({ knownParsers }),

  // Actions
  scrapePage: (message, sender) => {
    scrapePage(message.tabId)
    // No response expected by caller
    return undefined
  },

  // Optimization
  optimizeSession: async (message) => {
    return optimizeSession(message.sessionId)
  },

  // Open optimization results in a new tab
  showOptimizationResults: (message) => {
    browser.tabs.create({
      url: "results/results.html",
    })
    return { success: true }
  },
}

// Central runtime message listener
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Ignore messages from non-active tabs when they have a tab context
  if (sender.tab && !sender.tab.active) {
    return false
  }

  const handler = messageHandlers[message.action]
  if (!handler) {
    return false
  }

  try {
    const result = handler(message, sender, sendResponse)

    // Async handler returning a Promise
    if (result && typeof result.then === "function") {
      result
        .then((data) => {
          sendResponse(data)
        })
        .catch((error) => {
          console.error("Error in async background handler:", error)
          sendResponse({ success: false, error: error.message || String(error) })
        })
      return true // Keep the message channel open for async response
    }

    // Synchronous handler result
    if (typeof result !== "undefined") {
      sendResponse(result)
    }
  } catch (error) {
    console.error("Error in background handler:", error)
    sendResponse({ success: false, error: error.message || String(error) })
  }

  return false
})

// Session management
function createSession(data) {
  const newSession = {
    id: Date.now().toString(),
    name: data.name,
    manageQuantity: data.manageQuantity,
    importFeesEnabled: data.importFeesEnabled,
    manageWeight: data.manageWeight,
    manageVolume: data.manageVolume,
    manageDimension: data.manageDimension,
    manageDistance: data.manageDistance,
    customsCategories: [],
    products: [],
    bundles: [],
    alternativeGroups: [],
    created: new Date().toISOString(),
  }
  sessions.push(newSession)
  currentSession = newSession.id
  saveToStorage()
}

function updateSession(sessionId, updatedSession) {
  const sessionIndex = sessions.findIndex((s) => s.id === sessionId)
  if (sessionIndex !== -1) {
    sessions[sessionIndex] = { ...sessions[sessionIndex], ...updatedSession }
    saveToStorage()
  }
}

function deleteSession(sessionId) {
  sessions = sessions.filter((session) => session.id !== sessionId)
  if (currentSession === sessionId) {
    currentSession = sessions.length > 0 ? sessions[0].id : null
  }
  saveToStorage()
}

function setCurrentSession(sessionId) {
  currentSession = sessionId
  saveToStorage()
}

// Product management
function createProduct(sessionId, product) {
  const session = sessions.find((s) => s.id === sessionId)
  if (session) {
    product.id = Date.now().toString()
    product.pages = []
    product.quantity = product.quantity || 1
    session.products.push(product)
    saveToStorage()
  }
}

function deleteProduct(sessionId, productId) {
  const session = sessions.find((s) => s.id === sessionId)
  if (session) {
    session.products = session.products.filter((p) => p.id !== productId)
    saveToStorage()
  }
}

// Page management
function createPage(sessionId, productId, page) {
  const session = sessions.find((s) => s.id === sessionId)
  if (session) {
    const product = session.products.find((p) => p.id === productId)
    if (product) {
      page.id = Date.now().toString()
      page.itemsPerPurchase = page.itemsPerPurchase || 1
      if (page.maxPerPurchase !== undefined && page.maxPerPurchase !== null && page.maxPerPurchase !== '') {
        page.maxPerPurchase = Number(page.maxPerPurchase)
      }
      product.pages.push(page)
      saveToStorage()
    }
  }
}

function deletePage(sessionId, productId, pageId) {
  const session = sessions.find((s) => s.id === sessionId)
  if (session) {
    const product = session.products.find((p) => p.id === productId)
    if (product) {
      product.pages = product.pages.filter((p) => p.id !== pageId)
      saveToStorage()
    }
  }
}

function updatePage(sessionId, productId, pageId, updatedPage) {
  const session = sessions.find((s) => s.id === sessionId)
  if (session) {
    const product = session.products.find((p) => p.id === productId)
    if (product) {
      const pageIndex = product.pages.findIndex((p) => p.id === pageId)
      if (pageIndex !== -1) {
        product.pages[pageIndex] = { ...product.pages[pageIndex], ...updatedPage }
        saveToStorage()
      }
    }
  }
}

// Bundle management
function createBundle(sessionId, bundle) {
  const session = sessions.find((s) => s.id === sessionId)
  if (session) {
    if (!session.bundles) session.bundles = []
    bundle.id = Date.now().toString()
    session.bundles.push(bundle)
    saveToStorage()
  }
}

function updateBundle(sessionId, bundleId, updatedBundle) {
  const session = sessions.find((s) => s.id === sessionId)
  if (session && session.bundles) {
    const bundleIndex = session.bundles.findIndex((b) => b.id === bundleId)
    if (bundleIndex !== -1) {
      session.bundles[bundleIndex] = { ...session.bundles[bundleIndex], ...updatedBundle }
      saveToStorage()
    }
  }
}

function deleteBundle(sessionId, bundleId) {
  const session = sessions.find((s) => s.id === sessionId)
  if (session && session.bundles) {
    session.bundles = session.bundles.filter((b) => b.id !== bundleId)
    saveToStorage()
  }
}

// Alternative Group management
function createAlternativeGroup(sessionId, group) {
  const session = sessions.find((s) => s.id === sessionId)
  if (session) {
    if (!session.alternativeGroups) session.alternativeGroups = []
    group.id = Date.now().toString()
    session.alternativeGroups.push(group)
    saveToStorage()
  }
}

function updateAlternativeGroup(sessionId, groupId, updatedGroup) {
  const session = sessions.find((s) => s.id === sessionId)
  if (session && session.alternativeGroups) {
    const groupIndex = session.alternativeGroups.findIndex((g) => g.id === groupId)
    if (groupIndex !== -1) {
      session.alternativeGroups[groupIndex] = { ...session.alternativeGroups[groupIndex], ...updatedGroup }
      saveToStorage()
    }
  }
}

function deleteAlternativeGroup(sessionId, groupId) {
  const session = sessions.find((s) => s.id === sessionId)
  if (session && session.alternativeGroups) {
    session.alternativeGroups = session.alternativeGroups.filter((g) => g.id !== groupId)
    saveToStorage()
  }
}

// Scraping
function scrapePage(tabId) {
  browser.tabs.get(tabId).then(tab => {
    if (tab.active) {
      browser.tabs.sendMessage(tabId, { action: "scrape" })
        .catch(error => console.error("Error sending scrape message:", error));
    }
  }).catch(error => console.error("Error checking tab status:", error));
}

async function optimizeSession(sessionId) {
  const session = sessions.find((s) => s.id === sessionId)
  if (!session) return { success: false, error: "Session not found" }

  try {
    // Prepare data for the backend
    const data = {
      session: {
        id: session.id,
        name: session.name,
        created: session.created,
      },
      products: session.products.map((product) => ({
        id: product.id,
        name: product.name,
        quantity: product.quantity || 1,
        pages: product.pages.map((page) => ({
          id: page.id,
          url: page.url,
          price: page.price,
          shippingPrice: page.shippingPrice,
          currency: page.currency,
          seller: page.seller,
          itemsPerPurchase: page.itemsPerPurchase || 1,
          ...(page.maxPerPurchase !== undefined && page.maxPerPurchase !== null && page.maxPerPurchase !== '' && { maxPerPurchase: page.maxPerPurchase }),
        })),
        limitedCompatibilityWith: product.limitedCompatibilityWith || [],
      })),
      bundles: session.bundles || [],
      alternativeGroups: session.alternativeGroups || [],
      deliveryRules: session.deliveryRules || [],
    }

    // Call backend API
    const response = await fetch("https://your-backend-api.com/optimize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const result = await response.json()
    return { success: true, result }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Customs Category management
function createCustomsCategory(sessionId, category, defaultVAT) {
  const session = sessions.find((s) => s.id === sessionId)
  if (session) {
    if (!session.customsCategories) session.customsCategories = []
    category.id = Date.now().toString()
    session.customsCategories.push(category)
    if (defaultVAT !== undefined && defaultVAT !== null) {
      session.defaultVAT = defaultVAT
    }
    saveToStorage()
  }
}

function updateCustomsCategory(sessionId, categoryId, updatedCategory, defaultVAT) {
  const session = sessions.find((s) => s.id === sessionId)
  if (session && session.customsCategories) {
    const categoryIndex = session.customsCategories.findIndex((c) => c.id === categoryId)
    if (categoryIndex !== -1) {
      session.customsCategories[categoryIndex] = { ...session.customsCategories[categoryIndex], ...updatedCategory }
      if (defaultVAT !== undefined && defaultVAT !== null) {
        session.defaultVAT = defaultVAT
      }
      saveToStorage()
    }
  }
}

function deleteCustomsCategory(sessionId, categoryId, defaultVAT) {
  const session = sessions.find((s) => s.id === sessionId)
  if (session && session.customsCategories) {
    session.customsCategories = session.customsCategories.filter((c) => c.id !== categoryId)
    if (defaultVAT !== undefined && defaultVAT !== null) {
      session.defaultVAT = defaultVAT
    }
    saveToStorage()
  }
}
