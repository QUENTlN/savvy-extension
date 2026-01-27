import { browser } from '../shared/browser.js';
import { knownParsers as defaultKnownParsers } from '../shared/config/knownParsers.js';

let sessions = []
let currentSession = null
let parsers = defaultKnownParsers

// Initialize from storage (sessions, current session, and optionally knownParsers overrides)
browser.storage.local.get(["sessions", "currentSession", "knownParsers"]).then((result) => {
  sessions = result.sessions || []
  currentSession = result.currentSession || null

  // Allow overriding default parsers from storage if present
  if (result.knownParsers) {
    parsers = result.knownParsers
  }
})

// Save to storage
function saveToStorage() {
  browser.storage.local.set({
    sessions,
    currentSession,
    knownParsers: parsers,
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

  // Offers
  createOffer: (message) => {
    createOffer(message.sessionId, message.productId, message.offer)
    return { success: true, sessions, currentSession }
  },
  deleteOffer: (message) => {
    deleteOffer(message.sessionId, message.productId, message.offerId)
    return { success: true, sessions, currentSession }
  },
  updateOffer: (message) => {
    updateOffer(message.sessionId, message.productId, message.offerId, message.updatedOffer)
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

  // Forwarders
  createForwarder: (message) => {
    createForwarder(message.sessionId, message.forwarder)
    return { success: true, sessions, currentSession }
  },
  updateForwarder: (message) => {
    updateForwarder(message.sessionId, message.forwarderId, message.updatedForwarder)
    return { success: true, sessions, currentSession }
  },
  deleteForwarder: (message) => {
    deleteForwarder(message.sessionId, message.forwarderId)
    return { success: true, sessions, currentSession }
  },

  // Read-only queries
  getSessions: () => ({ sessions, currentSession }),
  getCurrentSession: () => ({ currentSession }),
  getKnownParsers: () => ({ knownParsers: parsers }),

  // Actions
  scrapePage: (message, sender) => {
    scrapePage(message.tabId)
    // No response expected by caller
    return undefined
  },

  // Optimization
  optimizeSession: async (message) => {
    return optimizeSession(message.sessionData)
  },

  // Optimization results management
  saveOptimizationResult: async (message) => {
    return saveOptimizationResult(message.sessionId, message.result, message.sessionSnapshot, message.currency)
  },
  getOptimizationResults: async (message) => {
    return getOptimizationResults(message.sessionId)
  },
  getOptimizationHistory: async (message) => {
    return getOptimizationHistory(message.sessionId)
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
    forwardersEnabled: data.forwardersEnabled,
    manageWeight: data.manageWeight,
    manageVolume: data.manageVolume,
    manageDimension: data.manageDimension,
    manageDistance: data.manageDistance,
    customsCategories: [],
    forwarders: [],
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
    product.offers = []
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

// Offer management
function createOffer(sessionId, productId, offer) {
  const session = sessions.find((s) => s.id === sessionId)
  if (session) {
    const product = session.products.find((p) => p.id === productId)
    if (product) {
      offer.id = Date.now().toString()
      offer.itemsPerPurchase = offer.itemsPerPurchase || 1
      if (offer.maxPerPurchase !== undefined && offer.maxPerPurchase !== null && offer.maxPerPurchase !== '') {
        offer.maxPerPurchase = Number(offer.maxPerPurchase)
      }
      product.offers.push(offer)
      saveToStorage()
    }
  }
}

function deleteOffer(sessionId, productId, offerId) {
  const session = sessions.find((s) => s.id === sessionId)
  if (session) {
    const product = session.products.find((p) => p.id === productId)
    if (product) {
      product.offers = product.offers.filter((o) => o.id !== offerId)
      saveToStorage()
    }
  }
}

function updateOffer(sessionId, productId, offerId, updatedOffer) {
  const session = sessions.find((s) => s.id === sessionId)
  if (session) {
    const product = session.products.find((p) => p.id === productId)
    if (product) {
      const offerIndex = product.offers.findIndex((o) => o.id === offerId)
      if (offerIndex !== -1) {
        product.offers[offerIndex] = { ...product.offers[offerIndex], ...updatedOffer }
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

async function optimizeSession(sessionData) {
  if (!sessionData) return { success: false, error: "Session data not provided" }

  try {
    const response = await fetch("http://localhost:8000/api/v1/optimize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sessionData),
    })

    const responseText = await response.text()

    if (!response.ok) {
      // Parse error message from response
      try {
        const errorData = JSON.parse(responseText)
        throw new Error(errorData.detail || `API error: ${response.status}`)
      } catch (parseError) {
        throw new Error(`API error ${response.status}: ${responseText.substring(0, 200)}`)
      }
    }

    const result = JSON.parse(responseText)
    const sessionSnapshot = computeSessionSnapshot(sessionData)
    return { success: true, result, sessionSnapshot }
  } catch (error) {
    console.error("Optimization error:", error)
    return { success: false, error: error.message }
  }
}

// Compute a snapshot of session data for modification detection
function computeSessionSnapshot(session) {
  const relevantData = {
    products: session.products,
    bundles: session.bundles,
    alternativeGroups: session.alternativeGroups,
    deliveryRules: session.deliveryRules,
    customsCategories: session.customsCategories,
    forwarders: session.forwarders
  }
  return JSON.stringify(relevantData)
}

// Optimization Results Management
async function saveOptimizationResult(sessionId, result, sessionSnapshot, currency) {
  const storage = await browser.storage.local.get("optimizationResults")
  const results = storage.optimizationResults || {}

  const newResult = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    sessionSnapshot,
    result,
    currency
  }

  if (!results[sessionId]) {
    results[sessionId] = { current: null, history: [] }
  }

  // Move current to history if exists
  if (results[sessionId].current) {
    results[sessionId].history.unshift(results[sessionId].current)
    // Keep max 10 history items
    results[sessionId].history = results[sessionId].history.slice(0, 10)
  }

  results[sessionId].current = newResult

  await browser.storage.local.set({ optimizationResults: results })
  return { success: true, result: newResult }
}

async function getOptimizationResults(sessionId) {
  const storage = await browser.storage.local.get("optimizationResults")
  const results = storage.optimizationResults || {}
  return {
    success: true,
    current: results[sessionId]?.current || null,
    hasHistory: (results[sessionId]?.history?.length || 0) > 0
  }
}

async function getOptimizationHistory(sessionId) {
  const storage = await browser.storage.local.get("optimizationResults")
  const results = storage.optimizationResults || {}
  return {
    success: true,
    history: results[sessionId]?.history || []
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

// Forwarder management
function createForwarder(sessionId, forwarder) {
  const session = sessions.find((s) => s.id === sessionId)
  if (session) {
    if (!session.forwarders) session.forwarders = []
    forwarder.id = Date.now().toString()

    // Initialize default currency if not provided
    if (!forwarder.currency) {
      forwarder.currency = 'EUR'
    }

    // Initialize default fee structure if not provided
    if (!forwarder.fees) {
      forwarder.fees = {
        reception: { calculationMethod: { type: 'fixed', amount: 0 } },
        storage: { calculationMethod: { type: 'free' } },
        repackaging: { calculationMethod: { type: 'free' } },
        reShipping: { calculationMethod: { type: 'fixed', amount: 0 } },
        consolidationMode: 'single'
      }
    }

    session.forwarders.push(forwarder)
    saveToStorage()
  }
}

function updateForwarder(sessionId, forwarderId, updatedForwarder) {
  const session = sessions.find((s) => s.id === sessionId)
  if (session && session.forwarders) {
    const forwarderIndex = session.forwarders.findIndex((f) => f.id === forwarderId)
    if (forwarderIndex !== -1) {
      session.forwarders[forwarderIndex] = {
        ...session.forwarders[forwarderIndex],
        ...updatedForwarder
      }
      saveToStorage()
    }
  }
}

function deleteForwarder(sessionId, forwarderId) {
  const session = sessions.find((s) => s.id === sessionId)
  if (session && session.forwarders) {
    // Remove from forwarders list
    session.forwarders = session.forwarders.filter((f) => f.id !== forwarderId)

    // Clean up references in delivery rules
    if (session.deliveryRules) {
      session.deliveryRules.forEach(rule => {
        if (rule.forwarderChain) {
          rule.forwarderChain = rule.forwarderChain.filter(
            link => link.forwarderId !== forwarderId
          )
          // Re-order remaining chain
          rule.forwarderChain.forEach((link, idx) => {
            link.order = idx
          })
        }
      })
    }

    saveToStorage()
  }
}
