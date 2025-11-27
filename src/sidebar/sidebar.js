// DOM Elements
const app = document.getElementById("app")

// Declare browser
const browser = window.browser || window.chrome

// State
let sessions = []
let currentSession = null
let currentView = "sessions" // 'sessions', 'products', 'pages', 'settings'
let currentProduct = null
let scrapedData = null

// Initialize
function init() {
  // Load data from storage
  browser.runtime.sendMessage({ action: "getSessions" }).then((response) => {
    sessions = response.sessions
    currentSession = response.currentSession
    renderApp()
  })

  // Listen for messages from background script
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "scrapedData") {
      browser.windows.getCurrent().then(currentWindow => {
        browser.windows.getLastFocused().then(focusedWindow => {
          if (currentWindow.id === focusedWindow.id) {
            scrapedData = message.data
            console.log("Received scraped data in active window:", scrapedData)
            showScrapedDataModal()
          } else {
            console.log("Ignoring scraped data in inactive window")
          }
        });
      });
    }
  })
}

// Render functions
function renderApp() {
  switch (currentView) {
    case "sessions":
      renderSessionsView()
      break
    case "products":
      renderProductsView()
      break
    case "pages":
      renderPagesView()
      break
    case "settings":
      renderSettingsView()
      break
    case "deliveryRules":
      renderDeliveryRulesView()
      break
    default:
      renderSessionsView()
  }
}

function renderSessionsView() {
  app.innerHTML = `
    <div class="mx-4">
      <!-- Header -->
      <div class="flex justify-between items-center mb-3">
        <h1 class="text-2xl font-semibold text-gray-800">Sessions list</h1>
        <button class="text-gray-600 p-2 cursor-pointer" id="settings-button">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      <!-- Session Cards -->
      <div class="space-y-4">
        ${sessions.map(session => `
          <div class="bg-white rounded-xl shadow-md p-4 session-item" data-id="${session.id}">
            <div class="flex justify-between items-center">
              <div class="flex-1 min-w-0 mr-4 cursor-pointer">
                <h2 class="text-xl font-medium text-gray-800 truncate">${session.name}</h2>
                <p class="text-gray-600 text-md truncate">${session.products.length} Products</p>
              </div>
              <div class="flex space-x-2 flex-shrink-0">
                <button class="text-gray-600 p-1 cursor-pointer edit-button" data-id="${session.id}">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button class="text-gray-600 p-1 cursor-pointer delete-button" data-id="${session.id}">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- New Session Button -->
      <button id="new-session-button" class="cursor-pointer mt-6 w-full flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 transition-colors duration-200 shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span class="text-lg font-medium">Create New Session</span>
      </button>
    </div>
  `

  // Add event listeners
  document.getElementById("settings-button").addEventListener("click", () => {
    currentView = "settings"
    renderApp()
  })

  document.getElementById("new-session-button").addEventListener("click", () => {
    showNewSessionModal()
  })

  document.querySelectorAll(".session-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      if (!e.target.closest(".edit-button") && !e.target.closest(".delete-button")) {
        const sessionId = item.dataset.id
        currentSession = sessionId
        browser.runtime.sendMessage({
          action: "setCurrentSession",
          sessionId,
        })
        currentView = "products"
        renderApp()
      }
    })
  })

  document.querySelectorAll(".edit-button").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation()
      const sessionId = button.dataset.id
      const session = sessions.find((s) => s.id === sessionId)
      showEditSessionModal(session)
    })
  })

  document.querySelectorAll(".delete-button").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation()
      const sessionId = button.dataset.id
      showDeleteSessionModal(sessionId)
    })
  })
}

function renderProductsView() {
  const session = sessions.find((s) => s.id === currentSession)
  if (!session) {
    currentView = "sessions"
    renderApp()
    return
  }

  app.innerHTML = `
    <div class="mx-4">
      <!-- Header -->
      <div class="flex justify-between items-center mb-3">
        <div class="flex items-center space-x-3">
          <button class="text-gray-600 p-2 cursor-pointer" id="back-button">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 class="text-2xl pl-4 font-semibold text-gray-800">${session.name}</h1>
        </div>
      </div>

      <!-- Product Cards -->
      <div class="space-y-4">
        ${session.products.map(product => `
          <div class="bg-white rounded-xl shadow-md p-4 product-item" data-id="${product.id}">
            <div class="flex justify-between items-center cursor-pointer">
              <div class="flex-1 min-w-0 mr-4 cursor-pointer">
                <h2 class="text-xl font-medium text-gray-800 truncate">${product.name}</h2>
                <p class="text-gray-600 text-md truncate">
                  ${product.pages.length} Pages
                  ${session.bundles && session.bundles.some(b => b.products.includes(product.id)) 
                    ? ` • ${session.bundles.filter(b => b.products.includes(product.id)).length} Bundles` 
                    : ''}
                </p>
              </div>
              <div class="flex space-x-2 flex-shrink-0">
                <button class="text-gray-600 p-1 cursor-pointer edit-button" data-id="${product.id}">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button class="text-gray-600 p-1 cursor-pointer delete-button" data-id="${product.id}">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Action Buttons -->
      <div class="flex space-x-4 mt-6">
        <button id="new-product-button" class="flex-1 flex items-center justify-center space-x-2 cursor-pointer bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 transition-colors duration-200 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span class="text-lg font-medium">New Product</span>
        </button>
      </div>
      
      <div class="flex space-x-4 mt-4">
        <button id="edit-rules-button" class="flex-1 flex items-center justify-center space-x-2 cursor-pointer bg-blue-50 text-blue-700 px-4 py-3 rounded-xl hover:bg-blue-100 transition-colors duration-200 shadow-sm border border-blue-200">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span class="text-lg font-medium">Delivery Rules</span>
        </button>
        <button id="optimize-button" class="flex-1 flex items-center justify-center space-x-2 cursor-pointer bg-gray-800 text-white px-4 py-3 rounded-xl hover:bg-gray-700 transition-colors duration-200 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span class="text-lg font-medium">Optimize</span>
        </button>
      </div>
    </div>
  `

  // Add event listeners
  document.getElementById("back-button").addEventListener("click", () => {
    currentView = "sessions"
    renderApp()
  })

  document.getElementById("new-product-button").addEventListener("click", () => {
    showNewProductModal()
  })

  document.getElementById("edit-rules-button").addEventListener("click", () => {
    currentView = "deliveryRules"
    renderApp()
  })

  document.getElementById("optimize-button").addEventListener("click", () => {
    // Trigger optimization directly
    browser.runtime
      .sendMessage({
        action: "optimizeSession",
        sessionId: currentSession,
      })
      .then((result) => {
        if (result.success) {
          // Open results page
          browser.runtime.sendMessage({
            action: "showOptimizationResults",
            result: result.result,
          })
        } else {
          alert(`Optimization failed: ${result.error}`)
        }
      })
  })

  document.querySelectorAll(".product-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      if (!e.target.closest(".edit-button") && !e.target.closest(".delete-button")) {
        console.log("Product item clicked ",item);
        const productId = item.dataset.id
        currentProduct = productId
        console.log("Current product set to ",currentProduct);
        currentView = "pages"
        renderApp()
      }
    })
  })

  document.querySelectorAll(".edit-button").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation()
      const productId = button.dataset.id
      const product = session.products.find((p) => p.id === productId)
      showEditProductModal(product)
    })
  })

  document.querySelectorAll(".delete-button").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation()
      const productId = button.dataset.id
      showDeleteProductModal(productId)
    })
  })
}

function renderPagesView() {
  const session = sessions.find((s) => s.id === currentSession)
  const product = session.products.find((p) => p.id === currentProduct)
  console.log("Rendering pages for product ",product);

  if (!session || !product) {
    currentView = "products"
    renderApp()
    return
  }

  app.innerHTML = `
    <div class="mx-4">
      <!-- Header -->
      <div class="flex justify-between items-center mb-3">
        <div class="flex items-center space-x-3">
          <button class="text-gray-600 p-2 cursor-pointer" id="back-button">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 class="text-2xl pl-4 font-semibold text-gray-800">${product.name}</h1>
        </div>
      </div>

      <!-- Pages List -->
      <div class="space-y-4">
        ${product.pages.length > 0 || (session.bundles && session.bundles.some(b => b.products.includes(product.id)))
          ? `
            ${product.pages.map(page => `
            <div class="bg-white rounded-xl shadow-md p-4">
              <div class="flex justify-between items-start">
                <div class="flex-1 min-w-0 mr-4">
                  <p class="text-lg font-medium text-gray-900 truncate">${page.seller || page.url}</p>
                  <div class="mt-1 space-y-1">
                    <p class="text-gray-600">Price: ${(() => {
                      const p = page.price
                      if (p === undefined || p === null || p === "") return "N/A"
                      try {
                        return Number(p) === 0 ? "Free" : `${p} ${page.currency || ""}`
                      } catch (e) {
                        return `${p} ${page.currency || ""}`
                      }
                    })()}</p>
                    <p class="text-gray-600">Shipping: ${(() => {
                      const s = page.shippingPrice
                      if (s === undefined || s === null || s === "") return "N/A"
                      try {
                        return Number(s) === 0 ? "Free" : `${s} ${page.currency || ""}`
                      } catch (e) {
                        return `${s} ${page.currency || ""}`
                      }
                    })()}</p>
                  </div>
                </div>
                <div class="flex items-start space-x-2">
                  <button class="text-gray-600 p-1 cursor-pointer open-page-button" data-url="${page.url}" title="Open in new tab">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 48 48" stroke="currentColor">
                      <path d="M 41.470703 4.9863281 A 1.50015 1.50015 0 0 0 41.308594 5 L 27.5 5 A 1.50015 1.50015 0 1 0 27.5 8 L 37.878906 8 L 22.439453 23.439453 A 1.50015 1.50015 0 1 0 24.560547 25.560547 L 40 10.121094 L 40 20.5 A 1.50015 1.50015 0 1 0 43 20.5 L 43 6.6894531 A 1.50015 1.50015 0 0 0 41.470703 4.9863281 z M 12.5 8 C 8.3754991 8 5 11.375499 5 15.5 L 5 35.5 C 5 39.624501 8.3754991 43 12.5 43 L 32.5 43 C 36.624501 43 40 39.624501 40 35.5 L 40 25.5 A 1.50015 1.50015 0 1 0 37 25.5 L 37 35.5 C 37 38.003499 35.003499 40 32.5 40 L 12.5 40 C 9.9965009 40 8 38.003499 8 35.5 L 8 15.5 C 8 12.996501 9.9965009 11 12.5 11 L 22.5 11 A 1.50015 1.50015 0 1 0 22.5 8 L 12.5 8 z"></path>
                    </svg>
                  </button>
                  <button class="text-gray-600 p-1 cursor-pointer edit-page-button" data-id="${page.id}" title="Edit page">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button class="text-gray-600 p-1 cursor-pointer delete-page-button" data-id="${page.id}" title="Delete page">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            `).join('')}
            ${session.bundles && session.bundles.filter(b => b.products.includes(product.id)).map(bundle => `
            <div class="bg-blue-50 border border-blue-200 rounded-xl shadow-md p-4">
              <div class="flex justify-between items-start">
                <div class="flex-1 min-w-0 mr-4">
                  <div class="flex items-center space-x-2">
                    <span class="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">BUNDLE</span>
                    <p class="text-lg font-medium text-gray-900 truncate">${bundle.seller || bundle.url}</p>
                  </div>
                  <div class="mt-1 space-y-1">
                    <p class="text-gray-600">Price: ${(() => {
                      const p = bundle.price
                      if (p === undefined || p === null || p === "") return "N/A"
                      try {
                        return Number(p) === 0 ? "Free" : `${p} ${bundle.currency || ""}`
                      } catch (e) {
                        return `${p} ${bundle.currency || ""}`
                      }
                    })()}</p>
                    <p class="text-gray-600">Shipping: ${(() => {
                      const s = bundle.shippingPrice
                      if (s === undefined || s === null || s === "") return "N/A"
                      try {
                        return Number(s) === 0 ? "Free" : `${s} ${bundle.currency || ""}`
                      } catch (e) {
                        return `${s} ${bundle.currency || ""}`
                      }
                    })()}</p>
                  </div>
                </div>
                <div class="flex items-start space-x-2">
                  <button class="text-gray-600 p-1 cursor-pointer open-page-button" data-url="${bundle.url}" title="Open in new tab">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 48 48" stroke="currentColor">
                      <path d="M 41.470703 4.9863281 A 1.50015 1.50015 0 0 0 41.308594 5 L 27.5 5 A 1.50015 1.50015 0 1 0 27.5 8 L 37.878906 8 L 22.439453 23.439453 A 1.50015 1.50015 0 1 0 24.560547 25.560547 L 40 10.121094 L 40 20.5 A 1.50015 1.50015 0 1 0 43 20.5 L 43 6.6894531 A 1.50015 1.50015 0 0 0 41.470703 4.9863281 z M 12.5 8 C 8.3754991 8 5 11.375499 5 15.5 L 5 35.5 C 5 39.624501 8.3754991 43 12.5 43 L 32.5 43 C 36.624501 43 40 39.624501 40 35.5 L 40 25.5 A 1.50015 1.50015 0 1 0 37 25.5 L 37 35.5 C 37 38.003499 35.003499 40 32.5 40 L 12.5 40 C 9.9965009 40 8 38.003499 8 35.5 L 8 15.5 C 8 12.996501 9.9965009 11 12.5 11 L 22.5 11 A 1.50015 1.50015 0 1 0 22.5 8 L 12.5 8 z"></path>
                    </svg>
                  </button>
                  <button class="text-gray-600 p-1 cursor-pointer edit-bundle-button" data-id="${bundle.id}" title="Edit bundle">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button class="text-gray-600 p-1 cursor-pointer delete-bundle-button" data-id="${bundle.id}" title="Delete bundle">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            `).join('')}
            `
          : '<div class="bg-white rounded-xl shadow-md p-6 text-gray-500 text-center">No pages added yet</div>'
        }
      </div>

      <!-- Add Page Button -->
      <button id="add-page-button" class="w-full mt-6 flex items-center justify-center space-x-2 cursor-pointer bg-gray-800 text-white px-4 py-3 rounded-xl hover:bg-gray-700 transition-colors duration-200 shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span class="text-lg font-medium">Add Page</span>
      </button>
    </div>
  `

  // Add event listeners
  document.getElementById("back-button").addEventListener("click", () => {
    currentView = "products"
    renderApp()
  })

  document.getElementById("add-page-button").addEventListener("click", () => {
    // Request scraping of the current page
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      browser.runtime.sendMessage({
        action: "scrapePage",
        tabId: tabs[0].id,
      })
    })
  })

  document.querySelectorAll(".delete-page-button").forEach((button) => {
    button.addEventListener("click", () => {
      const pageId = button.dataset.id
      showDeletePageModal(pageId)
    })
  })

  document.querySelectorAll(".delete-bundle-button").forEach((button) => {
    button.addEventListener("click", () => {
      const bundleId = button.dataset.id
      showDeleteBundleModal(bundleId)
    })
  })

  document.querySelectorAll(".edit-page-button").forEach((button) => {
    button.addEventListener("click", () => {
      const pageId = button.dataset.id
      const session = sessions.find((s) => s.id === currentSession)
      const product = session.products.find((p) => p.id === currentProduct)
      const page = product.pages.find((p) => p.id === pageId)
      showEditPageModal(page)
    })
  })

  document.querySelectorAll(".edit-bundle-button").forEach((button) => {
    button.addEventListener("click", () => {
      const bundleId = button.dataset.id
      const session = sessions.find((s) => s.id === currentSession)
      const bundle = session.bundles.find((b) => b.id === bundleId)
      showEditBundleModal(bundle)
    })
  })

  // Open page in new tab buttons
  document.querySelectorAll('.open-page-button').forEach((button) => {
    button.addEventListener('click', (e) => {
      e.stopPropagation()
      const url = button.dataset.url
      if (url) {
        try {
          browser.tabs.create({ url })
        } catch (err) {
          // Fallback for environments where browser.tabs may not be available
          window.open(url, '_blank', 'noopener')
        }
      }
    })
  })
}

function renderSettingsView() {
  // Get settings from storage
  browser.storage.local.get(["darkMode", "language", "currency", "displayMode"]).then((settings) => {
    app.innerHTML = `
      <div class="mx-4">
      <!-- Header -->
      <div class="flex justify-between items-center mb-3">
        <div class="flex items-center space-x-3">
        <button class="text-gray-600 p-2 cursor-pointer" id="back-button">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 class="text-2xl pl-4 font-semibold text-gray-800">Settings</h1>
        </div>
      </div>

      <!-- Settings Form -->
      <div class="space-y-6">
        <div class="bg-white rounded-xl shadow-md p-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">Language</label>
        <select id="language" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500">
          <option value="en" ${settings.language === "en" ? "selected" : ""}>English</option>
          <option value="fr" ${settings.language === "fr" ? "selected" : ""}>Français</option>
          <option value="es" ${settings.language === "es" ? "selected" : ""}>Español</option>
        </select>
        </div>

        <div class="bg-white rounded-xl shadow-md p-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">Default currency</label>
        <select id="currency" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500">
          <option value="USD" ${settings.currency === "USD" ? "selected" : ""}>US Dollar - $</option>
          <option value="EUR" ${settings.currency === "EUR" ? "selected" : ""}>Euro - €</option>
          <option value="GBP" ${settings.currency === "GBP" ? "selected" : ""}>British Pound - £</option>
        </select>
        </div>

        <div class="bg-white rounded-xl shadow-md p-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">Dark mode</label>
        <div class="flex items-center">
          <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" id="dark-mode" class="sr-only peer" ${settings.darkMode ? "checked" : ""}>
          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-800"></div>
          </label>
        </div>
        </div>

        <div class="bg-white rounded-xl shadow-md p-4">
        <label class="block text-sm font-medium text-gray-700 mb-3">Display mode</label>
        <div class="space-y-2">
          <div class="flex items-center">
          <input type="radio" id="sidebar-mode" name="display-mode" value="sidebar" ${settings.displayMode === "sidebar" ? "checked" : ""} class="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300">
          <label for="sidebar-mode" class="ml-2 text-gray-700">Sidebar</label>
          </div>
          <div class="flex items-center">
          <input type="radio" id="popup-mode" name="display-mode" value="popup" ${settings.displayMode === "popup" ? "checked" : ""} class="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300">
          <label for="popup-mode" class="ml-2 text-gray-700">Pop-up</label>
          </div>
        </div>
        </div>
      </div>

      <!-- Save Button -->
      <button id="save-settings-button" class="w-full mt-6 flex items-center justify-center space-x-2 cursor-pointer bg-gray-800 text-white px-4 py-3 rounded-xl hover:bg-gray-700 transition-colors duration-200 shadow-sm">
        <span class="text-lg font-medium">Save Settings</span>
      </button>
      </div>
    `

    // Add event listeners
    document.getElementById("back-button").addEventListener("click", () => {
      currentView = "sessions"
      renderApp()
    })

    document.getElementById("save-settings-button").addEventListener("click", () => {
      const darkMode = document.getElementById("dark-mode").checked
      const language = document.getElementById("language").value
      const currency = document.getElementById("currency").value
      const displayMode = document.querySelector('input[name="display-mode"]:checked').value

      browser.storage.local
        .set({
          darkMode,
          language,
          currency,
          displayMode,
        })
        .then(() => {
          // Apply settings
          if (darkMode) {
            document.body.classList.add("dark-mode")
          } else {
            document.body.classList.remove("dark-mode")
          }

          currentView = "sessions"
          renderApp()
        })
    })
  })
}
// Modal functions
function showNewSessionModal() {
  const modal = document.createElement("div")
    modal.innerHTML = `
      <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
        <div id="modalContent" class="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
          <h3 class="text-lg font-medium text-gray-800 mb-4">New Session</h3>
          <input 
            type="text" 
            id="session-name" 
            placeholder="Enter session name" 
            class="w-full px-4 py-3 border border-gray-300 rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
          
          <div class="flex justify-end space-x-4">
            <button id="cancel-button" class="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 cursor-pointer rounded">Cancel</button>
            <button id="save-button" class="px-4 py-2 bg-gray-800 text-white font-medium cursor-pointer rounded flex items-center">
              Save
            </button>
          </div>
        </div>
      </div>
  `

  document.body.appendChild(modal)

  // Close modal when clicking overlay (and prevent propagation when clicking content)
  const overlayEl = document.getElementById('modalOverlay')
  const contentEl = document.getElementById('modalContent')
  if (overlayEl) {
    overlayEl.addEventListener('click', () => {
      document.body.removeChild(modal)
    })
  }
  if (contentEl) {
    contentEl.addEventListener('click', (ev) => ev.stopPropagation())
  }

  // Close button (top-right X)
  const closeBtn = document.getElementById('close-optimization')
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(modal)
    })
  }

  document.querySelector("#modalOverlay").addEventListener("click", () => {
    document.body.removeChild(modal)
  })

  document.querySelector("#modalContent").addEventListener("click", (event) => {
    event.stopPropagation()
  })

  document.getElementById("cancel-button").addEventListener("click", () => {
    document.body.removeChild(modal)
  })

  document.getElementById("save-button").addEventListener("click", () => {
    const name = document.getElementById("session-name").value.trim()
    if (name) {
      browser.runtime
        .sendMessage({
          action: "createSession",
          name,
        })
        .then((response) => {
          sessions = response.sessions
          currentSession = response.currentSession
          document.body.removeChild(modal)
          renderApp()
        })
    }
  })
}

function showEditSessionModal(session) {
  const modal = document.createElement("div") 
  modal.innerHTML = `
      <div id="modalOverlay" class="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
        <div id="modalContent" class="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6" onclick="event.stopPropagation()">
          <h3 class="text-lg font-medium text-gray-800 mb-4">Edit Session</h3>
          <input 
            type="text" 
            id="session-name" 
            value="${session.name}"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
          
          <div class="flex justify-end space-x-4">
            <button id="cancel-button" class="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 cursor-pointer rounded">Cancel</button>
            <button id="save-button" class="px-4 py-2 bg-gray-800 text-white font-medium cursor-pointer rounded flex items-center">
              Save
            </button>
          </div>
        </div>
      </div>
  `

  document.body.appendChild(modal)

  document.querySelector("#modalOverlay").addEventListener("click", () => {
    document.body.removeChild(modal)
  })

  document.querySelector("#modalContent").addEventListener("click", (event) => {
    event.stopPropagation()
  })

  document.getElementById("cancel-button").addEventListener("click", () => {
    document.body.removeChild(modal)
  })

  document.getElementById("save-button").addEventListener("click", () => {
    const name = document.getElementById("session-name").value.trim()
    if (name) {
      session.name = name
      browser.runtime
        .sendMessage({
          action: "updateSession",
          session,
        })
        .then((response) => {
          sessions = response.sessions
          document.body.removeChild(modal)
          renderApp()
        })
    }
  })
}

function showDeleteSessionModal(sessionId) {
  const modal = document.createElement("div")
  modal.className = "modal"
  modal.innerHTML = `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
      <div id="modalContent" class="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
        <h3 class="text-lg font-medium text-gray-800 mb-4">Are you sure you want to delete?</h3>
        
        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 cursor-pointer rounded">Cancel</button>
          <button id="delete-button" class="px-4 py-2 bg-gray-800 text-white font-medium cursor-pointer rounded flex items-center">
            Delete
          </button>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  document.querySelector("#modalOverlay").addEventListener("click", () => {
    document.body.removeChild(modal)
  })

  document.querySelector("#modalContent").addEventListener("click", (event) => {
    event.stopPropagation()
  })

  document.getElementById("cancel-button").addEventListener("click", () => {
    document.body.removeChild(modal)
  })

  document.getElementById("delete-button").addEventListener("click", () => {
    browser.runtime
      .sendMessage({
        action: "deleteSession",
        sessionId,
      })
      .then((response) => {
        sessions = response.sessions
        currentSession = response.currentSession
        document.body.removeChild(modal)
        renderApp()
      })
  })
}

function showNewProductModal() {
  const modal = document.createElement("div")
  modal.className = "modal"
  modal.innerHTML = `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
      <div id="modalContent" class="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
        <h3 class="text-lg font-medium text-gray-800 mb-4">New Product</h3>
        
        <div class="mb-6">
          <label for="product-name" class="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
          <input 
            type="text" 
            id="product-name" 
            placeholder="Enter product name"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6" id="has-alternatives-section" style="display:${sessions.find(s => s.id === currentSession).products.length > 0 ? 'block' : 'none'};">
          <label class="block text-sm font-medium text-gray-700 mb-1">Has alternatives</label>
          <p class="mt-1 text-sm text-gray-500">If the product can be replaced by another, select which ones.</p>

          <div id="alternatives-list" class="mt-3 space-y-2" style="display:block; max-height:220px; overflow:auto;">
            ${sessions.find(s => s.id === currentSession).products.map(p => `
              <div class="flex items-center">
                <input type="checkbox" id="alt-${p.id}" value="${p.id}" class="alt-checkbox h-4 w-4 accent-gray-800 border-gray-300 rounded focus:ring-gray-500">
                <label for="alt-${p.id}" class="ml-2 text-sm text-gray-700">${p.name}</label>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="mb-6" id="limited-compatibility-section" style="display:none;">
          <label class="block text-sm font-medium text-gray-700 mb-1">Limited Compatibility</label>
          <p class="mt-1 text-sm text-gray-500">If this product is not compatible with all the others, select which ones.</p>

          <div id="compatible-products-list" class="mt-3 space-y-2" style="display:block; max-height:220px; overflow:auto;">
            ${sessions.find(s => s.id === currentSession).products.map(p => `
              <div class="flex items-center">
                <input type="checkbox" id="compat-${p.id}" value="${p.id}" class="compat-checkbox h-4 w-4 accent-gray-800 border-gray-300 rounded focus:ring-gray-500">
                <label for="compat-${p.id}" class="ml-2 text-sm text-gray-700">${p.name}</label>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 cursor-pointer rounded">Cancel</button>
          <button id="save-button" class="px-4 py-2 bg-gray-800 text-white font-medium cursor-pointer rounded flex items-center">
            Save
          </button>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  // Wire alternatives list to show/hide limited compatibility section
  const altListElNew = document.getElementById('alternatives-list')
  const limitedSectionNew = document.getElementById('limited-compatibility-section')
  const compatProductsListNew = document.getElementById('compatible-products-list')
  
  // Check if any alternatives are selected and show/hide limited compatibility section
  function updateLimitedCompatibilitySectionNew() {
    const selectedAlts = Array.from(document.querySelectorAll('#alternatives-list input.alt-checkbox:checked')).length > 0
    if (limitedSectionNew) limitedSectionNew.style.display = selectedAlts ? 'block' : 'none'
    if (!selectedAlts && compatProductsListNew) {
      // Clear compatible products selection if hiding the section
      document.querySelectorAll('#compatible-products-list input.compat-checkbox:checked').forEach(cb => cb.checked = false)
    }
  }
  
  // Add listeners to all alternative checkboxes
  document.querySelectorAll('#alternatives-list input.alt-checkbox').forEach(cb => {
    cb.addEventListener('change', updateLimitedCompatibilitySectionNew)
  })

  // Close modal when clicking overlay (and prevent propagation when clicking content)
  const overlayEl = document.getElementById('modalOverlay')
  const contentEl = document.getElementById('modalContent')
  if (overlayEl) {
    overlayEl.addEventListener('click', () => {
      document.body.removeChild(modal)
    })
  }
  if (contentEl) {
    contentEl.addEventListener('click', (ev) => ev.stopPropagation())
  }

  // Close button (top-right X)
  const closeBtn = document.getElementById('close-optimization')
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(modal)
    })
  }

  document.querySelector("#modalOverlay").addEventListener("click", () => {
    document.body.removeChild(modal)
  })

  document.querySelector("#modalContent").addEventListener("click", (event) => {
    event.stopPropagation()
  })

  document.getElementById("cancel-button").addEventListener("click", () => {
    document.body.removeChild(modal)
  })

  document.getElementById("save-button").addEventListener("click", () => {
    const name = document.getElementById("product-name").value.trim()

    // collect selected alternatives
    const selectedAlts = []
    document.querySelectorAll('#alternatives-list input.alt-checkbox:checked').forEach(cb => selectedAlts.push(cb.value))

    // collect compatible products
    const compatibleProducts = []
    document.querySelectorAll('#compatible-products-list input.compat-checkbox:checked').forEach(cb => compatibleProducts.push(cb.value))

    if (name) {
      // Create product first to get an id, then update reciprocal alternatives
      browser.runtime
        .sendMessage({
          action: "createProduct",
          sessionId: currentSession,
          product: {
            name,
            alternatives: selectedAlts,
            limitedCompatibilityWith: compatibleProducts,
          },
        })
        .then((response) => {
          // sessions returned with new product
          sessions = response.sessions
          const session = sessions.find(s => s.id === currentSession)
          const newProduct = session.products[session.products.length - 1]

          // If user selected alternatives, ensure bidirectional links
          if (selectedAlts.length > 0) {
            session.products.forEach((prod) => {
              if (selectedAlts.includes(prod.id)) {
                prod.alternatives = prod.alternatives || []
                if (!prod.alternatives.includes(newProduct.id)) prod.alternatives.push(newProduct.id)
              }
            })
          }

          // If user selected compatible products, ensure bidirectional links
          if (compatibleProducts.length > 0) {
            session.products.forEach((prod) => {
              if (compatibleProducts.includes(prod.id)) {
                prod.limitedCompatibilityWith = prod.limitedCompatibilityWith || []
                if (!prod.limitedCompatibilityWith.includes(newProduct.id)) prod.limitedCompatibilityWith.push(newProduct.id)
              }
            })
          }

          // Save updated session if there are bidirectional links to persist
          if (selectedAlts.length > 0 || compatibleProducts.length > 0) {
            browser.runtime.sendMessage({ action: 'updateSession', sessionId: currentSession, updatedSession: session, session }).then((resp) => {
              sessions = resp.sessions
              document.body.removeChild(modal)
              renderApp()
            })
          } else {
            document.body.removeChild(modal)
            renderApp()
          }
        })
    }
  })
}

function showEditProductModal(product) {
  const modal = document.createElement("div")
  modal.className = "modal"
  modal.innerHTML = `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
      <div id="modalContent" class="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
        <h3 class="text-lg font-medium text-gray-800 mb-4">Edit Product</h3>
        
        <div class="mb-6">
          <label for="product-name" class="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
          <input 
            type="text" 
            id="product-name" 
            value="${product.name}"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6" id="has-alternatives-section" style="display:${sessions.find(s => s.id === currentSession).products.length > 1 ? 'block' : 'none'};">
          <label class="block text-sm font-medium text-gray-700 mb-1">Has alternatives</label>
          <p class="mt-1 text-sm text-gray-500">If the product can be replaced by another, select which ones.</p>

          <div id="alternatives-list" class="mt-3 space-y-2" style="display:block; max-height:220px; overflow:auto;">
            ${sessions.find(s => s.id === currentSession).products.filter(p => p.id !== product.id).map(p => `
              <div class="flex items-center">
                <input type="checkbox" id="alt-${p.id}" value="${p.id}" class="alt-checkbox h-4 w-4 accent-gray-800 border-gray-300 rounded focus:ring-gray-500" ${product.alternatives && product.alternatives.includes(p.id) ? 'checked' : ''}>
                <label for="alt-${p.id}" class="ml-2 text-sm text-gray-700">${p.name}</label>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="mb-6" id="limited-compatibility-section" style="display:none;">
          <label class="block text-sm font-medium text-gray-700 mb-1">Limited Compatibility</label>
          <p class="mt-1 text-sm text-gray-500">If this product is not compatible with all the others, you will need to select which ones.</p>

          <div id="compatible-products-list" class="mt-3 space-y-2" style="max-height:220px; overflow:auto;">
            ${sessions.find(s => s.id === currentSession).products.filter(p => p.id !== product.id).map(p => `
              <div class="flex items-center">
                <input type="checkbox" id="compat-${p.id}" value="${p.id}" class="compat-checkbox h-4 w-4 accent-gray-800 border-gray-300 rounded focus:ring-gray-500" ${product.limitedCompatibilityWith && product.limitedCompatibilityWith.includes(p.id) ? 'checked' : ''}>
                <label for="compat-${p.id}" class="ml-2 text-sm text-gray-700">${p.name}</label>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 cursor-pointer rounded">Cancel</button>
          <button id="save-button" class="px-4 py-2 bg-gray-800 text-white font-medium cursor-pointer rounded flex items-center">
            Save
          </button>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  // Setup limited compatibility section visibility based on selected alternatives
  const limitedSectionEdit = document.getElementById('limited-compatibility-section')
  const compatProductsListEdit = document.getElementById('compatible-products-list')

  // Check if any alternatives are selected and show/hide limited compatibility section
  function updateLimitedCompatibilitySectionEdit() {
    const selectedAlts = Array.from(document.querySelectorAll('#alternatives-list input.alt-checkbox:checked')).length > 0
    if (limitedSectionEdit) limitedSectionEdit.style.display = selectedAlts ? 'block' : 'none'
    if (!selectedAlts && compatProductsListEdit) {
      // Clear compatible products selection if hiding the section
      document.querySelectorAll('#compatible-products-list input.compat-checkbox:checked').forEach(cb => cb.checked = false)
    }
  }

  // Add listeners to all alternative checkboxes
  document.querySelectorAll('#alternatives-list input.alt-checkbox').forEach(cb => {
    cb.addEventListener('change', updateLimitedCompatibilitySectionEdit)
  })

  document.getElementById("cancel-button").addEventListener("click", () => {
    document.body.removeChild(modal)
  })

  document.getElementById("save-button").addEventListener("click", () => {
    const name = document.getElementById("product-name").value.trim()
    
    // collect selected alternatives
    const selectedAlts = []
    document.querySelectorAll('#alternatives-list input.alt-checkbox:checked').forEach(cb => {
      if (cb.disabled) return
      selectedAlts.push(cb.value)
    })

    // collect compatible products
    const compatibleProducts = []
    document.querySelectorAll('#compatible-products-list input.compat-checkbox:checked').forEach(cb => {
      if (cb.disabled) return
      compatibleProducts.push(cb.value)
    })

    if (name) {
      const session = sessions.find(s => s.id === currentSession)

      // update product fields
      const prod = session.products.find(p => p.id === product.id)
      if (!prod) return
      prod.name = name
      prod.alternatives = selectedAlts
      prod.limitedCompatibilityWith = compatibleProducts

      // Ensure bidirectional links: for each product in session, add/remove reciprocal
      session.products.forEach((other) => {
        if (other.id === prod.id) return
        
        // Handle alternatives bidirectional link
        other.alternatives = other.alternatives || []
        const shouldIncludeAlt = selectedAlts.includes(other.id)
        const currentlyHasAlt = other.alternatives.includes(prod.id)
        if (shouldIncludeAlt && !currentlyHasAlt) {
          other.alternatives.push(prod.id)
        } else if (!shouldIncludeAlt && currentlyHasAlt) {
          other.alternatives = other.alternatives.filter(x => x !== prod.id)
        }

        // Handle limitedCompatibilityWith bidirectional link
        other.limitedCompatibilityWith = other.limitedCompatibilityWith || []
        const shouldIncludeCompat = compatibleProducts.includes(other.id)
        const currentlyHasCompat = other.limitedCompatibilityWith.includes(prod.id)
        if (shouldIncludeCompat && !currentlyHasCompat) {
          other.limitedCompatibilityWith.push(prod.id)
        } else if (!shouldIncludeCompat && currentlyHasCompat) {
          other.limitedCompatibilityWith = other.limitedCompatibilityWith.filter(x => x !== prod.id)
        }
      })

      // Save entire session to persist reciprocal changes
  browser.runtime.sendMessage({ action: 'updateSession', sessionId: currentSession, updatedSession: session, session }).then((response) => {
        sessions = response.sessions
        document.body.removeChild(modal)
        renderApp()
      })
    }
  })
}

function showEditPageModal(page) {
  const modal = document.createElement("div")
  modal.className = "modal"
  modal.innerHTML = `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
      <div id="modalContent" class="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
        <h3 class="text-lg font-medium text-gray-800 mb-4">Edit Page</h3>
        
        <div class="mb-6">
          <label for="page-url" class="block text-sm font-medium text-gray-700 mb-1">URL</label>
          <input 
            type="text" 
            id="page-url" 
            value="${page.url}" 
            readonly
            class="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="page-price" class="block text-sm font-medium text-gray-700 mb-1">Price</label>
          <input 
            type="text" 
            id="page-price" 
            value="${page.price || ""}"
            placeholder="Enter price"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="page-currency" class="block text-sm font-medium text-gray-700 mb-1">Currency</label>
          <select 
            id="page-currency" 
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
            <option value="FREE" ${page.currency === "FREE" ? "selected" : ""}>Free</option>
            <option value="EUR" ${page.currency === "EUR" ? "selected" : ""}>Euro - €</option>
            <option value="USD" ${page.currency === "USD" ? "selected" : ""}>United States Dollar - $</option>
            <option value="GBP" ${page.currency === "GBP" ? "selected" : ""}>United Kingdom Pound - £</option>
            <!-- Add other currencies as needed -->
          </select>
        </div>

        <div class="mb-6">
          <label for="page-shipping" class="block text-sm font-medium text-gray-700 mb-1">Shipping Price</label>
          <input 
            type="text" 
            id="page-shipping" 
            value="${page.shippingPrice || ""}"
            placeholder="Enter shipping price"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="page-seller" class="block text-sm font-medium text-gray-700 mb-1">Seller</label>
          <input 
            type="text" 
            id="page-seller" 
            value="${page.seller || ""}"
            placeholder="Enter seller name"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 cursor-pointer rounded">Cancel</button>
          <button id="save-button" class="px-4 py-2 bg-gray-800 text-white font-medium cursor-pointer rounded flex items-center">
            Save
          </button>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  document.querySelector("#modalOverlay").addEventListener("click", () => {
    document.body.removeChild(modal)
  })

  document.querySelector("#modalContent").addEventListener("click", (event) => {
    event.stopPropagation()
  })

  document.getElementById("cancel-button").addEventListener("click", () => {
    document.body.removeChild(modal)
  })

  document.getElementById("save-button").addEventListener("click", () => {
    const price = document.getElementById("page-price").value
    const shippingPrice = document.getElementById("page-shipping").value
    const seller = document.getElementById("page-seller").value
    const currency = document.getElementById("page-currency").value

    const updatedPage = {
      price,
      shippingPrice,
      seller,
      currency,
    }

    browser.runtime
      .sendMessage({
        action: "updatePage",
        sessionId: currentSession,
        productId: currentProduct,
        pageId: page.id,
        updatedPage,
      })
      .then((response) => {
        sessions = response.sessions
        document.body.removeChild(modal)
        renderApp()
      })
  })
}

function showEditBundleModal(bundle) {
  const session = sessions.find((s) => s.id === currentSession)
  const modal = document.createElement("div")
  modal.className = "modal"
  modal.innerHTML = `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
      <div id="modalContent" class="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
        <h3 class="text-lg font-medium text-gray-800 mb-4">Edit Bundle</h3>
        
        <div class="mb-6">
          <label for="page-url" class="block text-sm font-medium text-gray-700 mb-1">URL</label>
          <input 
            type="text" 
            id="page-url" 
            value="${bundle.url}" 
            readonly
            class="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">Select products in this bundle:</label>
          <div class="space-y-2">
            ${session.products
              .map(
                (p) => `
              <div class="flex items-center">
                <input type="checkbox" 
                  id="product-${p.id}" 
                  value="${p.id}" 
                  ${bundle.products.includes(p.id) ? "checked" : ""}
                  class="h-4 w-4 accent-gray-800 border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                >
                <label for="product-${p.id}" class="ml-2 text-sm text-gray-700">${p.name}</label>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>

        <div class="mb-6">
          <label for="page-price" class="block text-sm font-medium text-gray-700 mb-1">Price</label>
          <input 
            type="text" 
            id="page-price" 
            value="${bundle.price || ""}"
            placeholder="Enter price"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="page-currency" class="block text-sm font-medium text-gray-700 mb-1">Currency</label>
          <select 
            id="page-currency" 
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
            <option value="FREE" ${bundle.currency === "FREE" ? "selected" : ""}>Free</option>
            <option value="EUR" ${bundle.currency === "EUR" ? "selected" : ""}>Euro - €</option>
            <option value="USD" ${bundle.currency === "USD" ? "selected" : ""}>United States Dollar - $</option>
            <option value="GBP" ${bundle.currency === "GBP" ? "selected" : ""}>United Kingdom Pound - £</option>
            <!-- Add other currencies as needed -->
          </select>
        </div>

        <div class="mb-6">
          <label for="page-shipping" class="block text-sm font-medium text-gray-700 mb-1">Shipping Price</label>
          <input 
            type="text" 
            id="page-shipping" 
            value="${bundle.shippingPrice || ""}"
            placeholder="Enter shipping price"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="page-seller" class="block text-sm font-medium text-gray-700 mb-1">Seller</label>
          <input 
            type="text" 
            id="page-seller" 
            value="${bundle.seller || ""}"
            placeholder="Enter seller name"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 cursor-pointer rounded">Cancel</button>
          <button id="save-button" class="px-4 py-2 bg-gray-800 text-white font-medium cursor-pointer rounded flex items-center">
            Save
          </button>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  document.querySelector("#modalOverlay").addEventListener("click", () => {
    document.body.removeChild(modal)
  })

  document.querySelector("#modalContent").addEventListener("click", (event) => {
    event.stopPropagation()
  })

  document.getElementById("cancel-button").addEventListener("click", () => {
    document.body.removeChild(modal)
  })

  document.getElementById("save-button").addEventListener("click", () => {
    const price = document.getElementById("page-price").value
    const shippingPrice = document.getElementById("page-shipping").value
    const seller = document.getElementById("page-seller").value
    const currency = document.getElementById("page-currency").value
    
    const products = []
    document.querySelectorAll('#modalContent input[type="checkbox"]:checked').forEach((checkbox) => {
      products.push(checkbox.value)
    })

    const updatedBundle = {
      price,
      shippingPrice,
      seller,
      currency,
      products,
    }

    browser.runtime
      .sendMessage({
        action: "updateBundle",
        sessionId: currentSession,
        bundleId: bundle.id,
        updatedBundle,
      })
      .then((response) => {
        sessions = response.sessions
        document.body.removeChild(modal)
        renderApp()
      })
  })
}

function showDeleteBundleModal(bundleId) {
  const modal = document.createElement("div")
  modal.className = "modal"
  modal.innerHTML = `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
      <div id="modalContent" class="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
        <h3 class="text-lg font-medium text-gray-800 mb-4">Delete Bundle</h3>
        <p class="text-gray-600 mb-6">Are you sure you want to delete this bundle?</p>
        
        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 cursor-pointer rounded">Cancel</button>
          <button id="delete-button" class="px-4 py-2 bg-gray-800 text-white font-medium cursor-pointer rounded flex items-center">
            Delete
          </button>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  document.querySelector("#modalOverlay").addEventListener("click", () => {
    document.body.removeChild(modal)
  })

  document.querySelector("#modalContent").addEventListener("click", (event) => {
    event.stopPropagation()
  })

  document.getElementById("cancel-button").addEventListener("click", () => {
    document.body.removeChild(modal)
  })

  document.getElementById("delete-button").addEventListener("click", () => {
    browser.runtime
      .sendMessage({
        action: "deleteBundle",
        sessionId: currentSession,
        bundleId,
      })
      .then((response) => {
        sessions = response.sessions
        document.body.removeChild(modal)
        renderApp()
      })
  })
}

function showDeleteProductModal(productId) {
  const modal = document.createElement("div")
  modal.className = "modal"
  modal.innerHTML = `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
      <div id="modalContent" class="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
        <h3 class="text-lg font-medium text-gray-800 mb-4">Delete Product</h3>
        <p class="text-gray-600 mb-6">Are you sure you want to delete this product?</p>
        
        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 cursor-pointer rounded">Cancel</button>
          <button id="delete-button" class="px-4 py-2 bg-gray-800 text-white font-medium cursor-pointer rounded flex items-center">
            Delete
          </button>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  document.querySelector("#modalOverlay").addEventListener("click", () => {
    document.body.removeChild(modal)
  })

  document.querySelector("#modalContent").addEventListener("click", (event) => {
    event.stopPropagation()
  })

  document.getElementById("cancel-button").addEventListener("click", () => {
    document.body.removeChild(modal)
  })

  document.getElementById("delete-button").addEventListener("click", () => {
    browser.runtime
      .sendMessage({
        action: "deleteProduct",
        sessionId: currentSession,
        productId,
      })
      .then((response) => {
        sessions = response.sessions
        document.body.removeChild(modal)
        renderApp()
      })
  })
}

function showDeletePageModal(pageId) {
  const modal = document.createElement("div")
  modal.className = "modal"
  modal.innerHTML = `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
      <div id="modalContent" class="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
        <h3 class="text-lg font-medium text-gray-800 mb-4">Delete Page</h3>
        <p class="text-gray-600 mb-6">Are you sure you want to delete this page?</p>
        
        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 cursor-pointer rounded">Cancel</button>
          <button id="delete-button" class="px-4 py-2 bg-gray-800 text-white font-medium cursor-pointer rounded flex items-center">
            Delete
          </button>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  document.querySelector("#modalOverlay").addEventListener("click", () => {
    document.body.removeChild(modal)
  })

  document.querySelector("#modalContent").addEventListener("click", (event) => {
    event.stopPropagation()
  })

  document.getElementById("cancel-button").addEventListener("click", () => {
    document.body.removeChild(modal)
  })

  document.getElementById("delete-button").addEventListener("click", () => {
    browser.runtime
      .sendMessage({
        action: "deletePage",
        sessionId: currentSession,
        productId: currentProduct,
        pageId,
      })
      .then((response) => {
        sessions = response.sessions
        document.body.removeChild(modal)
        renderApp()
      })
  })
}

function showScrapedDataModal() {
  if (!scrapedData) return

  const session = sessions.find((s) => s.id === currentSession)
  const product = session.products.find((p) => p.id === currentProduct)

  const modal = document.createElement("div")
  modal.className = "modal"

  const hasKnownParser = scrapedData.hasKnownParser;
  modal.innerHTML = `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
      <div id="modalContent" class="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
        <h3 class="text-lg font-medium text-gray-800 mb-4">Add Page for ${product.name}</h3>
        
        ${!hasKnownParser ? 
          `<p class="text-sm text-gray-500 mb-4">This website doesn't have a known parser. Please enter the details manually.</p>` 
          : ''
        }

        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-1">Is this a bundle?</label>
          <div class="flex items-center">
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="is-bundle" class="sr-only peer">
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-800"></div>
            </label>
          </div>
          <p class="mt-1 text-sm text-gray-500">A bundle contains multiple products with a single price and shipping cost.</p>
        </div>

        <div id="product-selection" class="mb-6" style="display: none;">
          <label class="block text-sm font-medium text-gray-700 mb-2">Select products in this bundle:</label>
          <div class="space-y-2">
            ${session.products
              .map(
                (p) => `
              <div class="flex items-center">
                <input type="checkbox" 
                  id="product-${p.id}" 
                  value="${p.id}" 
                  ${p.id === product.id ? "checked disabled" : ""}
                  class="h-4 w-4 accent-gray-800 border-gray-300 rounded focus:ring-gray-500"
                >
                <label for="product-${p.id}" class="ml-2 text-sm text-gray-700">${p.name}</label>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>

        <div class="mb-6">
          <label for="page-url" class="block text-sm font-medium text-gray-700 mb-1">URL</label>
          <input 
            type="text" 
            id="page-url" 
            value="${scrapedData.url}" 
            readonly
            class="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="page-price" class="block text-sm font-medium text-gray-700 mb-1">Price</label>
          <input 
            type="text" 
            id="page-price" 
            value="${scrapedData.hasKnownParser ? (scrapedData.price || "") : ""}"
            placeholder="Enter price"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="page-currency" class="block text-sm font-medium text-gray-700 mb-1">Currency</label>
          <select 
            id="page-currency" 
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
            <option value="FREE" ${scrapedData.priceCurrency === "FREE" ? "selected" : ""}>Free</option>
            <option value="ALL" ${scrapedData.priceCurrency === "ALL" ? "selected" : ""}>Albania Lek - Lek</option>
            <option value="AFN" ${scrapedData.priceCurrency === "AFN" ? "selected" : ""}>Afghanistan Afghani - ؋</option>
            <option value="ARS" ${scrapedData.priceCurrency === "ARS" ? "selected" : ""}>Argentina Peso - $</option>
            <option value="AWG" ${scrapedData.priceCurrency === "AWG" ? "selected" : ""}>Aruba Guilder - ƒ</option>
            <option value="AUD" ${scrapedData.priceCurrency === "AUD" ? "selected" : ""}>Australia Dollar - $</option>
            <option value="AZN" ${scrapedData.priceCurrency === "AZN" ? "selected" : ""}>Azerbaijan Manat - ₼</option>
            <option value="BSD" ${scrapedData.priceCurrency === "BSD" ? "selected" : ""}>Bahamas Dollar - $</option>
            <option value="BBD" ${scrapedData.priceCurrency === "BBD" ? "selected" : ""}>Barbados Dollar - $</option>
            <option value="BYN" ${scrapedData.priceCurrency === "BYN" ? "selected" : ""}>Belarus Ruble - Br</option>
            <option value="BZD" ${scrapedData.priceCurrency === "BZD" ? "selected" : ""}>Belize Dollar - BZ$</option>
            <option value="BMD" ${scrapedData.priceCurrency === "BMD" ? "selected" : ""}>Bermuda Dollar - $</option>
            <option value="BOB" ${scrapedData.priceCurrency === "BOB" ? "selected" : ""}>Bolivia Bolíviano - $b</option>
            <option value="BAM" ${scrapedData.priceCurrency === "BAM" ? "selected" : ""}>Bosnia and Herzegovina Mark - KM</option>
            <option value="BWP" ${scrapedData.priceCurrency === "BWP" ? "selected" : ""}>Botswana Pula - P</option>
            <option value="BGN" ${scrapedData.priceCurrency === "BGN" ? "selected" : ""}>Bulgaria Lev - лв</option>
            <option value="BRL" ${scrapedData.priceCurrency === "BRL" ? "selected" : ""}>Brazil Real - R$</option>
            <option value="BND" ${scrapedData.priceCurrency === "BND" ? "selected" : ""}>Brunei Dollar - $</option>
            <option value="KHR" ${scrapedData.priceCurrency === "KHR" ? "selected" : ""}>Cambodia Riel - ៛</option>
            <option value="CAD" ${scrapedData.priceCurrency === "CAD" ? "selected" : ""}>Canada Dollar - $</option>
            <option value="KYD" ${scrapedData.priceCurrency === "KYD" ? "selected" : ""}>Cayman Islands Dollar - $</option>
            <option value="CLP" ${scrapedData.priceCurrency === "CLP" ? "selected" : ""}>Chile Peso - $</option>
            <option value="CNY" ${scrapedData.priceCurrency === "CNY" ? "selected" : ""}>China Yuan Renminbi - ¥</option>
            <option value="COP" ${scrapedData.priceCurrency === "COP" ? "selected" : ""}>Colombia Peso - $</option>
            <option value="CRC" ${scrapedData.priceCurrency === "CRC" ? "selected" : ""}>Costa Rica Colon - ₡</option>
            <option value="HRK" ${scrapedData.priceCurrency === "HRK" ? "selected" : ""}>Croatia Kuna - kn</option>
            <option value="CUP" ${scrapedData.priceCurrency === "CUP" ? "selected" : ""}>Cuba Peso - ₱</option>
            <option value="CZK" ${scrapedData.priceCurrency === "CZK" ? "selected" : ""}>Czech Republic Koruna - Kč</option>
            <option value="DKK" ${scrapedData.priceCurrency === "DKK" ? "selected" : ""}>Denmark Krone - kr</option>
            <option value="DOP" ${scrapedData.priceCurrency === "DOP" ? "selected" : ""}>Dominican Republic Peso - RD$</option>
            <option value="XCD" ${scrapedData.priceCurrency === "XCD" ? "selected" : ""}>East Caribbean Dollar - $</option>
            <option value="EGP" ${scrapedData.priceCurrency === "EGP" ? "selected" : ""}>Egypt Pound - £</option>
            <option value="EUR" ${scrapedData.priceCurrency === "EUR" ? "selected" : ""}>Euro - €</option>
            <option value="FKP" ${scrapedData.priceCurrency === "FKP" ? "selected" : ""}>Falkland Islands Pound - £</option>
            <option value="FJD" ${scrapedData.priceCurrency === "FJD" ? "selected" : ""}>Fiji Dollar - $</option>
            <option value="GHS" ${scrapedData.priceCurrency === "GHS" ? "selected" : ""}>Ghana Cedi - ¢</option>
            <option value="GIP" ${scrapedData.priceCurrency === "GIP" ? "selected" : ""}>Gibraltar Pound - £</option>
            <option value="GTQ" ${scrapedData.priceCurrency === "GTQ" ? "selected" : ""}>Guatemala Quetzal - Q</option>
            <option value="GGP" ${scrapedData.priceCurrency === "GGP" ? "selected" : ""}>Guernsey Pound - £</option>
            <option value="GYD" ${scrapedData.priceCurrency === "GYD" ? "selected" : ""}>Guyana Dollar - $</option>
            <option value="HNL" ${scrapedData.priceCurrency === "HNL" ? "selected" : ""}>Honduras Lempira - L</option>
            <option value="HKD" ${scrapedData.priceCurrency === "HKD" ? "selected" : ""}>Hong Kong Dollar - $</option>
            <option value="HUF" ${scrapedData.priceCurrency === "HUF" ? "selected" : ""}>Hungary Forint - Ft</option>
            <option value="ISK" ${scrapedData.priceCurrency === "ISK" ? "selected" : ""}>Iceland Krona - kr</option>
            <option value="INR" ${scrapedData.priceCurrency === "INR" ? "selected" : ""}>India Rupee - ₹</option>
            <option value="IDR" ${scrapedData.priceCurrency === "IDR" ? "selected" : ""}>Indonesia Rupiah - Rp</option>
            <option value="IRR" ${scrapedData.priceCurrency === "IRR" ? "selected" : ""}>Iran Rial - ﷼</option>
            <option value="IMP" ${scrapedData.priceCurrency === "IMP" ? "selected" : ""}>Isle of Man Pound - £</option>
            <option value="ILS" ${scrapedData.priceCurrency === "ILS" ? "selected" : ""}>Israel Shekel - ₪</option>
            <option value="JMD" ${scrapedData.priceCurrency === "JMD" ? "selected" : ""}>Jamaica Dollar - J$</option>
            <option value="JPY" ${scrapedData.priceCurrency === "JPY" ? "selected" : ""}>Japan Yen - ¥</option>
            <option value="JEP" ${scrapedData.priceCurrency === "JEP" ? "selected" : ""}>Jersey Pound - £</option>
            <option value="KZT" ${scrapedData.priceCurrency === "KZT" ? "selected" : ""}>Kazakhstan Tenge - лв</option>
            <option value="KPW" ${scrapedData.priceCurrency === "KPW" ? "selected" : ""}>Korea (North) Won - ₩</option>
            <option value="KRW" ${scrapedData.priceCurrency === "KRW" ? "selected" : ""}>Korea (South) Won - ₩</option>
            <option value="KGS" ${scrapedData.priceCurrency === "KGS" ? "selected" : ""}>Kyrgyzstan Som - лв</option>
            <option value="LAK" ${scrapedData.priceCurrency === "LAK" ? "selected" : ""}>Laos Kip - ₭</option>
            <option value="LBP" ${scrapedData.priceCurrency === "LBP" ? "selected" : ""}>Lebanon Pound - £</option>
            <option value="LRD" ${scrapedData.priceCurrency === "LRD" ? "selected" : ""}>Liberia Dollar - $</option>
            <option value="MKD" ${scrapedData.priceCurrency === "MKD" ? "selected" : ""}>Macedonia Denar - ден</option>
            <option value="MYR" ${scrapedData.priceCurrency === "MYR" ? "selected" : ""}>Malaysia Ringgit - RM</option>
            <option value="MUR" ${scrapedData.priceCurrency === "MUR" ? "selected" : ""}>Mauritius Rupee - ₨</option>
            <option value="MXN" ${scrapedData.priceCurrency === "MXN" ? "selected" : ""}>Mexico Peso - $</option>
            <option value="MNT" ${scrapedData.priceCurrency === "MNT" ? "selected" : ""}>Mongolia Tughrik - ₮</option>
            <option value="MZN" ${scrapedData.priceCurrency === "MZN" ? "selected" : ""}>Mozambique Metical - MT</option>
            <option value="NAD" ${scrapedData.priceCurrency === "NAD" ? "selected" : ""}>Namibia Dollar - $</option>
            <option value="NPR" ${scrapedData.priceCurrency === "NPR" ? "selected" : ""}>Nepal Rupee - ₨</option>
            <option value="ANG" ${scrapedData.priceCurrency === "ANG" ? "selected" : ""}>Netherlands Antilles Guilder - ƒ</option>
            <option value="NZD" ${scrapedData.priceCurrency === "NZD" ? "selected" : ""}>New Zealand Dollar - $</option>
            <option value="NIO" ${scrapedData.priceCurrency === "NIO" ? "selected" : ""}>Nicaragua Cordoba - C$</option>
            <option value="NGN" ${scrapedData.priceCurrency === "NGN" ? "selected" : ""}>Nigeria Naira - ₦</option>
            <option value="NOK" ${scrapedData.priceCurrency === "NOK" ? "selected" : ""}>Norway Krone - kr</option>
            <option value="OMR" ${scrapedData.priceCurrency === "OMR" ? "selected" : ""}>Oman Rial - ﷼</option>
            <option value="PKR" ${scrapedData.priceCurrency === "PKR" ? "selected" : ""}>Pakistan Rupee - ₨</option>
            <option value="PAB" ${scrapedData.priceCurrency === "PAB" ? "selected" : ""}>Panama Balboa - B/.</option>
            <option value="PYG" ${scrapedData.priceCurrency === "PYG" ? "selected" : ""}>Paraguay Guarani - Gs</option>
            <option value="PEN" ${scrapedData.priceCurrency === "PEN" ? "selected" : ""}>Peru Sol - S/.</option>
            <option value="PHP" ${scrapedData.priceCurrency === "PHP" ? "selected" : ""}>Philippines Peso - ₱</option>
            <option value="PLN" ${scrapedData.priceCurrency === "PLN" ? "selected" : ""}>Poland Zloty - zł</option>
            <option value="QAR" ${scrapedData.priceCurrency === "QAR" ? "selected" : ""}>Qatar Riyal - ﷼</option>
            <option value="RON" ${scrapedData.priceCurrency === "RON" ? "selected" : ""}>Romania Leu - lei</option>
            <option value="RUB" ${scrapedData.priceCurrency === "RUB" ? "selected" : ""}>Russia Ruble - ₽</option>
            <option value="SHP" ${scrapedData.priceCurrency === "SHP" ? "selected" : ""}>Saint Helena Pound - £</option>
            <option value="SAR" ${scrapedData.priceCurrency === "SAR" ? "selected" : ""}>Saudi Arabia Riyal - ﷼</option>
            <option value="RSD" ${scrapedData.priceCurrency === "RSD" ? "selected" : ""}>Serbia Dinar - Дин.</option>
            <option value="SCR" ${scrapedData.priceCurrency === "SCR" ? "selected" : ""}>Seychelles Rupee - ₨</option>
            <option value="SGD" ${scrapedData.priceCurrency === "SGD" ? "selected" : ""}>Singapore Dollar - $</option>
            <option value="SBD" ${scrapedData.priceCurrency === "SBD" ? "selected" : ""}>Solomon Islands Dollar - $</option>
            <option value="SOS" ${scrapedData.priceCurrency === "SOS" ? "selected" : ""}>Somalia Shilling - S</option>
            <option value="ZAR" ${scrapedData.priceCurrency === "ZAR" ? "selected" : ""}>South Africa Rand - R</option>
            <option value="LKR" ${scrapedData.priceCurrency === "LKR" ? "selected" : ""}>Sri Lanka Rupee - ₨</option>
            <option value="SEK" ${scrapedData.priceCurrency === "SEK" ? "selected" : ""}>Sweden Krona - kr</option>
            <option value="CHF" ${scrapedData.priceCurrency === "CHF" ? "selected" : ""}>Switzerland Franc - CHF</option>
            <option value="SRD" ${scrapedData.priceCurrency === "SRD" ? "selected" : ""}>Suriname Dollar - $</option>
            <option value="SYP" ${scrapedData.priceCurrency === "SYP" ? "selected" : ""}>Syria Pound - £</option>
            <option value="TWD" ${scrapedData.priceCurrency === "TWD" ? "selected" : ""}>Taiwan New Dollar - NT$</option>
            <option value="THB" ${scrapedData.priceCurrency === "THB" ? "selected" : ""}>Thailand Baht - ฿</option>
            <option value="TTD" ${scrapedData.priceCurrency === "TTD" ? "selected" : ""}>Trinidad and Tobago Dollar - TT$</option>
            <option value="TRY" ${scrapedData.priceCurrency === "TRY" ? "selected" : ""}>Turkey Lira - ₺</option>
            <option value="TVD" ${scrapedData.priceCurrency === "TVD" ? "selected" : ""}>Tuvalu Dollar - $</option>
            <option value="UAH" ${scrapedData.priceCurrency === "UAH" ? "selected" : ""}>Ukraine Hryvnia - ₴</option>
            <option value="GBP" ${scrapedData.priceCurrency === "GBP" ? "selected" : ""}>United Kingdom Pound - £</option>
            <option value="USD" ${scrapedData.priceCurrency === "USD" ? "selected" : ""}>United States Dollar - $</option>
            <option value="UYU" ${scrapedData.priceCurrency === "UYU" ? "selected" : ""}>Uruguay Peso - $U</option>
            <option value="UZS" ${scrapedData.priceCurrency === "UZS" ? "selected" : ""}>Uzbekistan Som - лв</option>
            <option value="VEF" ${scrapedData.priceCurrency === "VEF" ? "selected" : ""}>Venezuela Bolívar - Bs</option>
            <option value="VND" ${scrapedData.priceCurrency === "VND" ? "selected" : ""}>Viet Nam Dong - ₫</option>
            <option value="YER" ${scrapedData.priceCurrency === "YER" ? "selected" : ""}>Yemen Rial - ﷼</option>
            <option value="ZWD" ${scrapedData.priceCurrency === "ZWD" ? "selected" : ""}>Zimbabwe Dollar - Z$</option>
          </select>
        </div>

        <div class="mb-6">
          <label for="page-shipping" class="block text-sm font-medium text-gray-700 mb-1">Shipping Price</label>
          <input 
            type="text" 
            id="page-shipping" 
            value="${scrapedData.hasKnownParser ? (scrapedData.shippingPrice || "") : ""}"
            placeholder="Enter shipping price"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="page-seller" class="block text-sm font-medium text-gray-700 mb-1">Seller</label>
          <input 
            type="text" 
            id="page-seller" 
            value="${scrapedData.hasKnownParser ? (scrapedData.seller || "") : ""}"
            placeholder="Enter seller name"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 cursor-pointer rounded">Cancel</button>
          <button id="save-button" class="px-4 py-2 bg-gray-800 text-white font-medium cursor-pointer rounded flex items-center">
            Save
          </button>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  // Toggle bundle product selection
  document.getElementById("is-bundle").addEventListener("change", (e) => {
    const productSelection = document.getElementById("product-selection")
    if (e.target.checked) {
      productSelection.style.display = "block"
    } else {
      productSelection.style.display = "none"
    }
  })

  document.getElementById("cancel-button").addEventListener("click", () => {
    document.body.removeChild(modal)
    scrapedData = null
  })

  document.getElementById("save-button").addEventListener("click", () => {
    const isBundle = document.getElementById("is-bundle").checked
    const url = document.getElementById("page-url").value
    const price = document.getElementById("page-price").value
    const shippingPrice = document.getElementById("page-shipping").value
    const seller = document.getElementById("page-seller").value
    const currency = document.getElementById("page-currency").value

    if (isBundle) {
      const bundle = {
        url,
        price,
        shippingPrice,
        seller,
        currency,
        products: [],
        timestamp: new Date().toISOString(),
      }
      
      document.querySelectorAll('#product-selection input[type="checkbox"]:checked').forEach((checkbox) => {
        bundle.products.push(checkbox.value)
      })

      browser.runtime
        .sendMessage({
          action: "createBundle",
          sessionId: currentSession,
          bundle,
        })
        .then((response) => {
          sessions = response.sessions
          document.body.removeChild(modal)
          scrapedData = null

          // Show product details again
          currentView = "pages"
          renderApp()
        })
    } else {
      const page = {
        url,
        price,
        shippingPrice,
        seller,
        currency,
        timestamp: new Date().toISOString(),
      }

      browser.runtime
        .sendMessage({
          action: "addPage",
          sessionId: currentSession,
          productId: currentProduct,
          page,
        })
        .then((response) => {
          sessions = response.sessions
          document.body.removeChild(modal)
          scrapedData = null

          // Show product details again
          currentView = "pages"
          renderApp()
        })
    }
  })
}

function renderDeliveryRulesView() {
  const session = sessions.find((s) => s.id === currentSession)
  if (!session) {
    currentView = "sessions"
    renderApp()
    return
  }

  // Helper to safely get nested properties
  const getRule = (seller) => (session.deliveryRules || []).find(r => r.seller === seller) || {}

  app.innerHTML = `
    <div class="mx-4 pb-8">
      <!-- Header -->
      <div class="flex justify-between items-center mb-3">
        <div class="flex items-center space-x-3">
          <button class="text-gray-600 p-2 cursor-pointer" id="back-button">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 class="text-2xl pl-4 font-semibold text-gray-800">Delivery Rules</h1>
        </div>
      </div>

      <p class="text-sm text-gray-500 mb-6">Configure delivery settings for each seller.</p>

      <div class="space-y-4 seller-settings">
        ${getUniqueSellers(session)
          .map(
            (seller) => {
              const rule = getRule(seller)
              const copiedFrom = rule.copiedFrom || 'None'
              const isFree = rule.type === 'free'
              const type = rule.type === 'free' ? 'fixed' : (rule.type || 'fixed') // Default to fixed if free or undefined
              
              return `
          <div class="mb-4 seller-card bg-white rounded-xl shadow-md p-4 border border-gray-100">
            <h4 class="text-lg font-medium text-gray-800 mb-3 truncate border-b pb-2">${seller}</h4>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">Same seller as :</label>
              <select class="same-seller-select w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent" data-seller="${seller}">
                <option value="None" ${copiedFrom === 'None' ? 'selected' : ''}>None</option>
                ${getUniqueSellers(session).filter(s => s !== seller).map(s2 => `<option value="${s2}" ${copiedFrom === s2 ? 'selected' : ''}>${s2}</option>`).join('')}
              </select>
            </div>

            <div class="mb-4 flex items-center justify-between free-delivery-row" style="display: ${copiedFrom !== 'None' ? 'none' : 'flex'}">
              <label class="text-sm font-medium text-gray-700">Free delivery</label>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" class="free-delivery-toggle sr-only peer" data-seller="${seller}" ${isFree ? 'checked' : ''}>
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-800"></div>
              </label>
            </div>

            <div class="mb-4 delivery-type-row" style="display: ${copiedFrom !== 'None' || isFree ? 'none' : 'block'}">
              <label class="block text-sm font-medium text-gray-700 mb-1">Delivery pricing type</label>
              <select class="delivery-type w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent" data-seller="${seller}">
                <option value="fixed" ${type === 'fixed' ? 'selected' : ''}>Addition of per-item delivery prices</option>
                <option value="first-item" ${type === 'first-item' ? 'selected' : ''}>First item full price then discounted additional</option>
                <option value="free-threshold" ${type === 'free-threshold' ? 'selected' : ''}>Free above threshold</option>
              </select>
            </div>

            <div id="delivery-options-${seller.replace(/\s+/g, "-")}" style="display: ${copiedFrom !== 'None' || isFree ? 'none' : 'block'}">
              <div class="option-block option-fixed fixed-price mb-3" data-option="fixed" style="display: none;">
                <!-- No extra fields for fixed -->
              </div>

              <div class="option-block option-first first-item mb-3" data-option="first-item" style="display: ${type === 'first-item' ? 'block' : 'none'};">
                <label class="block text-sm font-medium text-gray-700 mb-1">First item price</label>
                <input type="number" class="first-item-price w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent" data-seller="${seller}" step="0.01" min="0" value="${rule.firstItemPrice || ''}">
              </div>

              <div class="option-block option-first-additional first-item mb-3" data-option="first-item-additional" style="display: ${type === 'first-item' ? 'block' : 'none'};">
                <label class="block text-sm font-medium text-gray-700 mb-1">Delivery price for following product</label>
                <input type="number" class="following-items-price w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent" data-seller="${seller}" step="0.01" min="0" value="${rule.additionalItemsPrice || ''}">
              </div>

              <div class="option-block option-free free-threshold mb-3" data-option="free-threshold" style="display: ${type === 'free-threshold' || isFree ? 'block' : 'none'};">
                <label class="block text-sm font-medium text-gray-700 mb-1">Free delivery over :</label>
                <input type="number" class="free-threshold-value w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent" data-seller="${seller}" step="0.01" min="0" value="${rule.threshold || ''}">
              </div>
            </div>
          </div>
        `
            }
          )
          .join("")}
      </div>

      <button id="save-rules-button" class="w-full mt-6 flex items-center justify-center space-x-2 cursor-pointer bg-gray-800 text-white px-4 py-3 rounded-xl hover:bg-gray-700 transition-colors duration-200 shadow-sm">
        <span class="text-lg font-medium">Save Rules</span>
      </button>
    </div>
  `

  // Add event listeners
  document.getElementById("back-button").addEventListener("click", () => {
    currentView = "products"
    renderApp()
  })

  // Wire same-seller select and free delivery toggles
  document.querySelectorAll('.same-seller-select').forEach((sel) => {
    sel.addEventListener('change', (e) => {
      const seller = e.target.dataset.seller
      const value = e.target.value

      const sellerCard = sel.closest('.seller-card')
      const freeRow = sellerCard.querySelector('.free-delivery-row')
      const deliveryRow = sellerCard.querySelector('.delivery-type-row')
      const optionsContainer = document.getElementById(`delivery-options-${seller.replace(/\s+/g, "-")}`)

      if (value && value !== 'None') {
        // Hide controls
        if (freeRow) freeRow.style.display = 'none'
        if (deliveryRow) deliveryRow.style.display = 'none'
        if (optionsContainer) optionsContainer.style.display = 'none'
      } else {
        // Show controls
        if (freeRow) freeRow.style.display = 'flex'
        
        // Check if free delivery is enabled to decide visibility of other controls
        const freeToggle = sellerCard.querySelector('.free-delivery-toggle')
        if (freeToggle && !freeToggle.checked) {
          if (deliveryRow) deliveryRow.style.display = 'block'
          if (optionsContainer) optionsContainer.style.display = 'block'
        }
      }
    })
  })

  // Free delivery toggle behavior
  document.querySelectorAll('.free-delivery-toggle').forEach((toggle) => {
    toggle.addEventListener('change', (e) => {
      const seller = e.target.dataset.seller
      const checked = e.target.checked
      const optionsContainer = document.getElementById(`delivery-options-${seller.replace(/\s+/g, "-")}`)
      const deliveryRow = document.querySelector(`.delivery-type[data-seller="${seller}"]`)
      
      if (!optionsContainer || !deliveryRow) return

      if (checked) {
        // If delivery is free (always), hide delivery type selector and all option fields
        // But show threshold field if it was free-threshold? No, "Free delivery" toggle usually means ALWAYS free (threshold 0) or just free. 
        // Based on previous logic: "Free delivery" toggle seemed to imply simple free delivery.
        // Actually, let's look at previous logic:
        // if (isFree) { rule.type = 'free'; rule.threshold = ... }
        // Wait, if "Free delivery" toggle is ON, it showed nothing in previous code?
        // Previous code: if (checked) { hide deliveryRow; hide optionsContainer }
        // So it means unconditionally free.
        
        if (deliveryRow) deliveryRow.parentElement.style.display = 'none'
        if (optionsContainer) optionsContainer.style.display = 'none'
      } else {
        // show delivery type selector
        if (deliveryRow) deliveryRow.parentElement.style.display = 'block'
        if (optionsContainer) {
          optionsContainer.style.display = 'block'
          // Trigger change on delivery type to show correct fields
          const typeSelect = document.querySelector(`.delivery-type[data-seller="${seller}"]`)
          if (typeSelect) typeSelect.dispatchEvent(new Event('change'))
        }
      }
    })
  })

  // Add event listeners for delivery type changes
  document.querySelectorAll(".delivery-type").forEach((select) => {
    select.addEventListener("change", (e) => {
      const seller = e.target.dataset.seller
      const optionsContainer = document.getElementById(`delivery-options-${seller.replace(/\s+/g, "-")}`)
      if (!optionsContainer) return

      // Hide all option blocks
      optionsContainer.querySelectorAll('.option-block').forEach((el) => {
        el.style.display = 'none'
      })

      // Show selected option blocks
      const selectedType = e.target.value
      if (selectedType === 'fixed') {
        // 'Addition of per-item delivery price' has no extra fields to display
      } else if (selectedType === 'free-threshold') {
        optionsContainer.querySelectorAll('.option-block[data-option="free-threshold"]').forEach((el) => (el.style.display = 'block'))
      } else if (selectedType === 'first-item') {
        optionsContainer.querySelectorAll('.option-block[data-option="first-item"]').forEach((el) => (el.style.display = 'block'))
        optionsContainer.querySelectorAll('.option-block[data-option="first-item-additional"]').forEach((el) => (el.style.display = 'block'))
      }
    })
  })

  document.getElementById("save-rules-button").addEventListener("click", () => {
    // Collect delivery rules
    const deliveryRules = []

    getUniqueSellers(session).forEach((seller) => {
      const sameSelect = document.querySelector(`.same-seller-select[data-seller="${seller}"]`)
      const copiedFrom = sameSelect && sameSelect.value && sameSelect.value !== 'None' ? sameSelect.value : null

      // If copied, we just record the source. The backend/optimizer will handle resolving the values.
      // But for UI consistency if we re-open, we might want to know it's copied.
      
      // We need to resolve values to save them? Or just save "copiedFrom"?
      // Previous implementation:
      // if (sameSelect && ... !== 'None') rule.copiedFrom = sameSelect.value
      // And it also tried to resolve effectiveSeller to get values.
      // Let's stick to saving the configuration.
      
      const rule = { seller }
      if (copiedFrom) {
        rule.copiedFrom = copiedFrom
        // We can optionally copy the values from the source seller right now for the rule object, 
        // but strictly speaking 'copiedFrom' is enough if the consumer logic handles it.
        // However, to be safe and consistent with previous logic, let's grab values from the UI 
        // (which might be hidden/disabled) or just rely on the fact that we will look up the source.
        // The previous logic did: const effectiveSeller = ...
        // Let's do that.
      }

      // We always save the values present in the inputs, even if hidden, 
      // OR we look at the effective seller's inputs.
      // Since we didn't implement the "copy values to disabled inputs" logic in this new view 
      // (I removed the complex copy logic to simplify, assuming 'copiedFrom' is the source of truth),
      // we should rely on 'copiedFrom'. 
      // BUT, `optimizeSession` in background.js expects `deliveryRules` array. 
      // Does `optimizeSession` handle `copiedFrom`? 
      // Checking background.js... `optimizeSession` just passes `deliveryRules` to the backend.
      // So the backend must handle it, OR we must resolve it here.
      // The previous `showOptimizationModal` logic DID resolve it before creating the JSON.
      // It did: `const effectiveSeller = ...` and read inputs from that seller.
      // So I should do the same here to ensure the saved rules are complete.

      const effectiveSeller = copiedFrom || seller
      
      const freeToggle = document.querySelector(`.free-delivery-toggle[data-seller="${effectiveSeller}"]`)
      const isFree = freeToggle ? freeToggle.checked : false

      if (isFree) {
        rule.type = 'free'
        // For free type, we might still want a threshold if it was "free-threshold" but the toggle overrides it?
        // In previous logic: if (isFree) { rule.type = 'free'; rule.threshold = ... }
        // Wait, if isFree (the toggle) is true, it means ALWAYS free. 
        // But the previous code read `.free-threshold-value`. 
        // Let's check the previous code again.
        // `const thresholdInput = document.querySelector('.free-threshold-value[data-seller="${effectiveSeller}"]')`
        // `rule.threshold = ...`
        // This implies even if "Free delivery" toggle is ON, it looks for a threshold?
        // But the UI hid the options. So the threshold would be whatever was there or empty.
        // If the toggle means "Always Free", threshold should probably be 0.
        // Let's assume 0 if hidden.
        rule.threshold = 0 
      } else {
        const typeSelect = document.querySelector(`.delivery-type[data-seller="${effectiveSeller}"]`)
        const type = typeSelect ? typeSelect.value : 'fixed'
        rule.type = type

        if (type === 'fixed') {
          // No extra fields
        } else if (type === 'first-item') {
          const first = document.querySelector(`.first-item-price[data-seller="${effectiveSeller}"]`)
          const additional = document.querySelector(`.following-items-price[data-seller="${effectiveSeller}"]`)
          rule.firstItemPrice = Number.parseFloat(first && first.value) || 0
          rule.additionalItemsPrice = Number.parseFloat(additional && additional.value) || 0
        } else if (type === 'free-threshold') {
          const threshold = document.querySelector(`.free-threshold-value[data-seller="${effectiveSeller}"]`)
          rule.threshold = Number.parseFloat(threshold && threshold.value) || 0
        }
      }
      
      if (copiedFrom) {
        rule.copiedFrom = copiedFrom
      }

      deliveryRules.push(rule)
    })

    // Update session
    session.deliveryRules = deliveryRules

    browser.runtime
      .sendMessage({
        action: "updateSession",
        sessionId: currentSession,
        updatedSession: session,
      })
      .then((response) => {
        sessions = response.sessions
        // Go back to product list
        currentView = "products"
        renderApp()
      })
  })
}

// Helper functions
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

// Initialize the app
document.addEventListener("DOMContentLoaded", init)
