// Store for sessions, products, and pages
let sessions = []
let currentSession = null
let knownParsers = {
  "amazon": {
    "price": {
      "strategy": "extractPrice",
      "selector": ".reinventPricePriceToPayMargin"
    },
    "priceCurrency": {
      "strategy": "extractCurrency",
      "selector": ".reinventPricePriceToPayMargin"
    },
    "shippingPrice": {
      "strategy": "none"
    },
    "seller": {
      "strategy": "domainName"
    }
  },
  "ebay": {
    "price": {
      "strategy": "extractPrice",
      "selector": ".x-price-primary > span:nth-child(1)"  
    },
    "priceCurrency": {
      "strategy": "extractCurrency",
      "selector": ".x-price-primary > span:nth-child(1)"
    },
    "shippingPrice": {
      "strategy": "extractPrice",
      "selector": "div.false > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > span:nth-child(1)"  
    },
    "seller": {
      "strategy": "domainNameAndSeller",
      "selector": ".x-sellercard-atf__info__about-seller > a:nth-child(1) > span:nth-child(1)"
    }
  },
  "neokyo.com": {
    "price": {
      "strategy": "splitPriceCurrency",
      "selector": ".product-price-converted",
      "param": "price"
    },
    "priceCurrency": {
      "strategy": "splitPriceCurrency",
      "selector": ".product-price-converted",
      "param": "currency"
    },
    "shippingPrice": {
      "strategy": "splitPriceCurrency",
      "selector": "p.col-9:nth-child(12) > strong:nth-child(1)",
      "param": "price"
    },
    "seller": {
      "strategy": "urlParameter",
      "selector": "a.col-9:nth-child(2)",
      "param": "store_name"
    }
}
  // Add more known parsers here
}

// Initialize from storage
var browser = browser || chrome // Declare browser before using it

console.log(knownParsers)

browser.storage.local.get(["sessions", "currentSession", "knownParsers"]).then((result) => {
  if (result.sessions) sessions = result.sessions
  if (result.currentSession) currentSession = result.currentSession
})

console.log(knownParsers)

// Save to storage
function saveToStorage() {
  browser.storage.local.set({
    sessions,
    currentSession,
    knownParsers,
  })
}

// Message handlers
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Vérifier si le message provient d'une tab active
  if (sender.tab && !sender.tab.active) {
    return false;
  }
  
  switch (message.action) {
    case "createSession":
      createSession(message.name)
      sendResponse({ success: true, sessions, currentSession })
      break
    case "updateSession":
      updateSession(message.sessionId, message.updatedSession)
      sendResponse({ success: true, sessions, currentSession })
      break
    case "deleteSession":
      deleteSession(message.sessionId)
      sendResponse({ success: true, sessions, currentSession })
      break
    case "setCurrentSession":
      setCurrentSession(message.sessionId)
      sendResponse({ success: true, currentSession })
      break
    case "createProduct":
      createProduct(message.sessionId, message.product)
      sendResponse({ success: true, sessions, currentSession })
      break
    case "deleteProduct":
      deleteProduct(message.sessionId, message.productId)
      sendResponse({ success: true, sessions, currentSession })
      break
    case "addPage":
      addPage(message.sessionId, message.productId, message.page)
      sendResponse({ success: true, sessions, currentSession })
      break
    case "deletePage":
      deletePage(message.sessionId, message.productId, message.pageId)
      sendResponse({ success: true, sessions, currentSession })
      break
    case "updatePage":
      updatePage(message.sessionId, message.productId, message.pageId, message.updatedPage)
      sendResponse({ success: true, sessions, currentSession })
      break
    case "createBundle":
      createBundle(message.sessionId, message.bundle)
      sendResponse({ success: true, sessions, currentSession })
      break
    case "updateBundle":
      updateBundle(message.sessionId, message.bundleId, message.updatedBundle)
      sendResponse({ success: true, sessions, currentSession })
      break
    case "deleteBundle":
      deleteBundle(message.sessionId, message.bundleId)
      sendResponse({ success: true, sessions, currentSession })
      break
    case "getSessions":
      sendResponse({ sessions, currentSession })
      break
    case "getCurrentSession":
      sendResponse({ currentSession })
      break
    case "getKnownParsers":
      sendResponse({ knownParsers })
      break
    case "scrapePage":
      console.log("Scrape page request received for tab:", sender, message)
      scrapePage(message.tabId)
      break
    case "optimizeSession":
      optimizeSession(message.sessionId).then((result) => sendResponse(result))
      return true // For async response
  }
})

// Session management
function createSession(name) {
  const newSession = {
    id: Date.now().toString(),
    name,
    products: [],
    bundles: [],
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
function addPage(sessionId, productId, page) {
  const session = sessions.find((s) => s.id === sessionId)
  if (session) {
    const product = session.products.find((p) => p.id === productId)
    if (product) {
      page.id = Date.now().toString()
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

// Scraping
function scrapePage(tabId) {
  console.log("Checking tab status before scraping:", tabId);
  browser.tabs.get(tabId).then(tab => {
    if (tab.active) {
      console.log("Sending scrape message to active tab:", tabId);
      browser.tabs.sendMessage(tabId, { action: "scrape" })
        .catch(error => console.error("Error sending scrape message:", error));
    } else {
      console.log("Tab is not active, skipping scrape:", tabId);
    }
  }).catch(error => console.error("Error checking tab status:", error));
}

// Optimization
function getUniqueSellers(session) {
  const sellers = new Set()

  session.products.forEach((product) => {
    product.pages.forEach((page) => {
      if (page.seller) {
        sellers.add(page.seller)
      }
    })
  })

  if (session.bundles) {
    session.bundles.forEach((bundle) => {
      if (bundle.seller) {
        sellers.add(bundle.seller)
      }
    })
  }

  return Array.from(sellers)
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
        pages: product.pages.map((page) => ({
          id: page.id,
          url: page.url,
          price: page.price,
          shippingPrice: page.shippingPrice,
          currency: page.currency,
          seller: page.seller,
        })),
        alternatives: product.alternatives || [],
        limitedCompatibilityWith: product.limitedCompatibilityWith || [],
      })),
      bundles: session.bundles || [],
      sellers: getUniqueSellers(session),
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

// Open optimization results in a new tab
browser.runtime.onMessage.addListener((message) => {
  if (message.action === "showOptimizationResults") {
    browser.tabs.create({
      url: "results/results.html",
    })
  }
})
