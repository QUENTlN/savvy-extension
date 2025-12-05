// DOM Elements
const app = document.getElementById("app")

// Initialize
async function init() {
  // Load dark mode preference and apply it
  browser.storage.local.get(["darkMode"]).then((settings) => {
    if (settings.darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  })

  // Initialize i18n system
  await initI18n()

  // Load data from storage
  SidebarAPI.getSessions().then((response) => {
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
    case "alternatives":
      renderAlternativesView()
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
        <h1 class="text-2xl font-semibold card-text">${t("sessions.title")}</h1>
        <div class="flex space-x-2">
          <button class="muted-text p-2 cursor-pointer" id="import-session-button" title="${t("sessions.importSession")}">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button class="muted-text p-2 cursor-pointer" id="settings-button" title="${t("common.settings")}">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Session Cards -->
      <div class="space-y-4">
        ${sessions.map(session => `
          <div class="card-bg rounded-xl shadow-md p-4 session-item" data-id="${session.id}">
            <div class="flex justify-between items-center">
              <div class="flex-1 min-w-0 mr-4 cursor-pointer">
                <h2 class="text-xl font-medium card-text truncate">${session.name}</h2>
                <p class="muted-text text-md truncate">${session.products.length} ${t("sessions.products")}</p>
              </div>
              <div class="flex space-x-2 flex-shrink-0">
                <button class="muted-text p-1 cursor-pointer export-button" data-id="${session.id}" title="${t("sessions.exportSession")}">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </button>
                <button class="muted-text p-1 cursor-pointer edit-button" data-id="${session.id}" title="${t("sessions.editSession")}">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button class="muted-text p-1 cursor-pointer delete-button" data-id="${session.id}" title="${t("sessions.deleteSession")}">
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
      <button id="new-session-button" class="cursor-pointer mt-6 w-full flex items-center justify-center space-x-2 secondary-bg secondary-text px-4 py-3 rounded-xl hover:opacity-80 transition-colors duration-200 shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span class="text-lg font-medium">${t("sessions.createNew")}</span>
      </button>
    </div>
  `

  // Add event listeners
  document.getElementById("import-session-button").addEventListener("click", () => {
    importSession()
  })

  document.getElementById("settings-button").addEventListener("click", () => {
    currentView = "settings"
    renderApp()
  })

  document.getElementById("new-session-button").addEventListener("click", () => {
    showNewSessionModal()
  })

  document.querySelectorAll(".session-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      if (!e.target.closest(".edit-button") && !e.target.closest(".delete-button") && !e.target.closest(".export-button")) {
        const sessionId = item.dataset.id
        currentSession = sessionId
        SidebarAPI.setCurrentSession(sessionId)
        currentView = "products"
        renderApp()
      }
    })
  })

  document.querySelectorAll(".export-button").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation()
      const sessionId = button.dataset.id
      const session = sessions.find((s) => s.id === sessionId)
      exportSession(session)
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
          <button class="muted-text p-2 cursor-pointer" id="back-button">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 class="text-2xl pl-4 font-semibold card-text">${session.name}</h1>
        </div>
      </div>

      <!-- Product Cards -->
      <div class="space-y-4">
        ${session.products.map(product => `
          <div class="card-bg rounded-xl shadow-md p-4 product-item" data-id="${product.id}">
            <div class="flex justify-between items-center cursor-pointer">
              <div class="flex-1 min-w-0 mr-4 cursor-pointer">
                <h2 class="text-xl font-medium card-text truncate">${product.name}${product.quantity && product.quantity > 1 ? ` (×${product.quantity})` : ''}</h2>
                <p class="muted-text text-md truncate">
                  ${product.pages.length} ${t("products.pages")}
                  ${session.bundles && session.bundles.some(b => b.products && b.products.some(bp => bp.productId === product.id)) 
                    ? ` • ${session.bundles.filter(b => b.products && b.products.some(bp => bp.productId === product.id)).length} ${t("products.bundles")}` 
                    : ''}
                </p>
              </div>
              <div class="flex space-x-2 flex-shrink-0">
                <button class="muted-text p-1 cursor-pointer edit-button" data-id="${product.id}">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button class="muted-text p-1 cursor-pointer delete-button" data-id="${product.id}">
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
        <button id="new-product-button" class="flex-1 flex items-center justify-center space-x-2 cursor-pointer secondary-bg secondary-text px-4 py-3 rounded-xl hover:opacity-80 transition-colors duration-200 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span class="text-lg font-medium">${t("products.newProduct")}</span>
        </button>
      </div>
      
      <div class="flex space-x-4 mt-4">
        <button id="edit-rules-button" class="flex-1 flex items-center justify-center space-x-2 cursor-pointer secondary-bg secondary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm border border-default">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span class="text-lg font-medium">${t("products.deliveryRules")}</span>
        </button>
        <button id="manage-alternatives-button" class="flex-1 flex items-center justify-center space-x-2 cursor-pointer secondary-bg secondary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm border border-default">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span class="text-lg font-medium">${t("products.manageAlternatives")}</span>
        </button>
      </div>

      <div class="flex space-x-4 mt-4">
        <button id="optimize-button" class="flex-1 flex items-center justify-center space-x-2 cursor-pointer primary-bg primary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span class="text-lg font-medium">${t("products.optimize")}</span>
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
    SidebarAPI.optimizeSession(currentSession).then((result) => {
        if (result.success) {
          // Open results page
          SidebarAPI.showOptimizationResults(result.result)
        } else {
          alert(`Optimization failed: ${result.error}`)
        }
      })
  })

  document.getElementById("manage-alternatives-button").addEventListener("click", () => {
    currentView = "alternatives"
    renderApp()
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
          <button class="muted-text p-2 cursor-pointer" id="back-button">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 class="text-2xl pl-4 font-semibold card-text">${product.name}</h1>
        </div>
      </div>

      <!-- Pages List -->
      <div class="space-y-4">
        ${product.pages.length > 0 || (session.bundles && session.bundles.some(b => b.products && b.products.some(bp => bp.productId === product.id)))
          ? `
            ${product.pages.map(page => `
            <div class="card-bg rounded-xl shadow-md p-4">
              <div class="flex justify-between items-start">
                <div class="flex-1 min-w-0 mr-4">
                  <p class="text-lg font-medium text-[hsl(var(--foreground))] truncate">${page.seller || page.url}</p>
                  <div class="mt-1 space-y-1">
                    <p class="muted-text">${t("pages.price")}: ${(() => {
                      const p = page.price
                      if (p === undefined || p === null || p === "") return t("pages.na")
                      try {
                        return Number(p) === 0 ? t("pages.free") : `${p} ${page.currency || ""}`
                      } catch (e) {
                        return `${p} ${page.currency || ""}`
                      }
                    })()}</p>
                    <p class="muted-text">${t("pages.shipping")}: ${(() => {
                      const s = page.shippingPrice
                      if (s === undefined || s === null || s === "") return t("pages.na")
                      try {
                        return Number(s) === 0 ? t("pages.free") : `${s} ${page.currency || ""}`
                      } catch (e) {
                        return `${s} ${page.currency || ""}`
                      }
                    })()}</p>
                    ${page.itemsPerPurchase && page.itemsPerPurchase > 1 ? `<p class="muted-text">${t("pages.qtyPerPurchase")}: ${page.itemsPerPurchase}</p>` : ''}
                    ${page.maxPerPurchase ? `<p class="muted-text">${t("pages.maxPurchases")}: ${page.maxPerPurchase}</p>` : ''}
                  </div>
                </div>
                <div class="flex items-start space-x-2">
                  <button class="muted-text p-1 cursor-pointer open-page-button" data-url="${page.url}" title="${t("pages.openInNewTab")}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 48 48" stroke="currentColor">
                      <path d="M 41.470703 4.9863281 A 1.50015 1.50015 0 0 0 41.308594 5 L 27.5 5 A 1.50015 1.50015 0 1 0 27.5 8 L 37.878906 8 L 22.439453 23.439453 A 1.50015 1.50015 0 1 0 24.560547 25.560547 L 40 10.121094 L 40 20.5 A 1.50015 1.50015 0 1 0 43 20.5 L 43 6.6894531 A 1.50015 1.50015 0 0 0 41.470703 4.9863281 z M 12.5 8 C 8.3754991 8 5 11.375499 5 15.5 L 5 35.5 C 5 39.624501 8.3754991 43 12.5 43 L 32.5 43 C 36.624501 43 40 39.624501 40 35.5 L 40 25.5 A 1.50015 1.50015 0 1 0 37 25.5 L 37 35.5 C 37 38.003499 35.003499 40 32.5 40 L 12.5 40 C 9.9965009 40 8 38.003499 8 35.5 L 8 15.5 C 8 12.996501 9.9965009 11 12.5 11 L 22.5 11 A 1.50015 1.50015 0 1 0 22.5 8 L 12.5 8 z"></path>
                    </svg>
                  </button>
                  <button class="muted-text p-1 cursor-pointer edit-page-button" data-id="${page.id}" title="${t("pages.editPageTitle")}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button class="muted-text p-1 cursor-pointer delete-page-button" data-id="${page.id}" title="${t("pages.deletePageTitle")}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            `).join('')}
            ${session.bundles && session.bundles.filter(b => b.products && b.products.some(bp => bp.productId === product.id)).map(bundle => `
            <div class="bg-blue-50 border border-blue-200 rounded-xl shadow-md p-4">
              <div class="flex justify-between items-start">
                <div class="flex-1 min-w-0 mr-4">
                  <div class="flex items-center space-x-2">
                    <span class="bg-blue-100 muted-text text-xs font-semibold px-2.5 py-0.5 rounded">${t("products.bundle").toUpperCase()}</span>
                    <p class="text-lg font-medium text-[hsl(var(--foreground))] truncate">${bundle.seller || bundle.url}</p>
                  </div>
                  <div class="mt-1 space-y-1">
                    <p class="muted-text">${t("pages.price")}: ${(() => {
                      const p = bundle.price
                      if (p === undefined || p === null || p === "") return t("pages.na")
                      try {
                        return Number(p) === 0 ? t("pages.free") : `${p} ${bundle.currency || ""}`
                      } catch (e) {
                        return `${p} ${bundle.currency || ""}`
                      }
                    })()}</p>
                    <p class="muted-text">${t("pages.shipping")}: ${(() => {
                      const s = bundle.shippingPrice
                      if (s === undefined || s === null || s === "") return t("pages.na")
                      try {
                        return Number(s) === 0 ? t("pages.free") : `${s} ${bundle.currency || ""}`
                      } catch (e) {
                        return `${s} ${bundle.currency || ""}`
                      }
                    })()}</p>
                    ${bundle.itemsPerPurchase && bundle.itemsPerPurchase > 1 ? `<p class="muted-text">${t("pages.qtyPerPurchase")}: ${bundle.itemsPerPurchase}</p>` : ''}
                    ${bundle.maxPerPurchase ? `<p class="muted-text">${t("pages.maxPurchases")}: ${bundle.maxPerPurchase}</p>` : ''}
                    <div class="mt-2">
                      <p class="text-sm font-medium secondary-text">${t("pages.productsInBundle")}:</p>
                      <ul class="mt-1 space-y-1">
                        ${bundle.products && bundle.products.length > 0 
                          ? bundle.products.map(bp => {
                              const prod = session.products.find(p => p.id === bp.productId)
                              return prod ? `<li class="text-sm muted-text">• ${prod.name} ${bp.quantity > 1 ? `(x${bp.quantity})` : ''}</li>` : ''
                            }).join('')
                          : `<li class="text-sm muted-text">${t("pages.noProducts")}</li>`
                        }
                      </ul>
                    </div>
                  </div>
                </div>
                <div class="flex items-start space-x-2">
                  <button class="muted-text p-1 cursor-pointer open-page-button" data-url="${bundle.url}" title="${t("pages.openInNewTab")}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 48 48" stroke="currentColor">
                      <path d="M 41.470703 4.9863281 A 1.50015 1.50015 0 0 0 41.308594 5 L 27.5 5 A 1.50015 1.50015 0 1 0 27.5 8 L 37.878906 8 L 22.439453 23.439453 A 1.50015 1.50015 0 1 0 24.560547 25.560547 L 40 10.121094 L 40 20.5 A 1.50015 1.50015 0 1 0 43 20.5 L 43 6.6894531 A 1.50015 1.50015 0 0 0 41.470703 4.9863281 z M 12.5 8 C 8.3754991 8 5 11.375499 5 15.5 L 5 35.5 C 5 39.624501 8.3754991 43 12.5 43 L 32.5 43 C 36.624501 43 40 39.624501 40 35.5 L 40 25.5 A 1.50015 1.50015 0 1 0 37 25.5 L 37 35.5 C 37 38.003499 35.003499 40 32.5 40 L 12.5 40 C 9.9965009 40 8 38.003499 8 35.5 L 8 15.5 C 8 12.996501 9.9965009 11 12.5 11 L 22.5 11 A 1.50015 1.50015 0 1 0 22.5 8 L 12.5 8 z"></path>
                    </svg>
                  </button>
                  <button class="muted-text p-1 cursor-pointer edit-bundle-button" data-id="${bundle.id}" title="${t("bundles.editBundle")}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button class="muted-text p-1 cursor-pointer delete-bundle-button" data-id="${bundle.id}" title="${t("bundles.deleteBundle")}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            `).join('')}
            `
          : `<div class="card-bg rounded-xl shadow-md p-6 muted-text text-center">${t("pages.noPages")}</div>`
        }
      </div>

      <!-- Add Page Button -->
      <button id="add-page-button" class="w-full mt-6 flex items-center justify-center space-x-2 cursor-pointer primary-bg primary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span class="text-lg font-medium">${t("pages.addPage")}</span>
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
      if (tabs && tabs[0]) {
        SidebarAPI.requestScrapeForTab(tabs[0].id)
      }
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
  browser.storage.local.get(["darkMode", "language", "currency"]).then((settings) => {
    app.innerHTML = `
      <div class="mx-4">
      <!-- Header -->
      <div class="flex justify-between items-center mb-3">
        <div class="flex items-center space-x-3">
        <button class="muted-text p-2 cursor-pointer" id="back-button">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 class="text-2xl pl-4 font-semibold card-text">${t("settings.title")}</h1>
        </div>
      </div>

      <!-- Settings Form -->
      <div class="space-y-6">
        <div class="card-bg rounded-xl shadow-md p-4">
        <label class="block text-sm font-medium secondary-text mb-1">${t("settings.language")}</label>
        <select id="language" class="w-full px-4 py-2 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500">
          ${LANGUAGES.map(lang => `<option value="${lang.code}" ${(settings.language || getCurrentLanguage()) === lang.code ? "selected" : ""}>${lang.nativeName}</option>`).join('')}
        </select>
        </div>

        <div class="card-bg rounded-xl shadow-md p-4">
        <label class="block text-sm font-medium secondary-text mb-1">${t("settings.defaultCurrency")}</label>
        <select id="currency" class="w-full px-4 py-2 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500">
          ${CURRENCIES.map(c => `<option value="${c.code}" ${(settings.currency || DEFAULT_CURRENCY) === c.code ? "selected" : ""}>${c.label} - ${c.symbol}</option>`).join('')}
        </select>
        </div>

        <div class="card-bg rounded-xl shadow-md p-4">
        <label class="block text-sm font-medium secondary-text mb-1">${t("settings.darkMode")}</label>
        <div class="flex items-center">
          <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" id="dark-mode" class="sr-only peer" ${settings.darkMode ? "checked" : ""}>
          <div class="w-11 h-6 secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-100 after:border after:border-gray-300 dark:after:border-gray-600 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[hsl(var(--primary))] dark:peer-checked:after:bg-[hsl(var(--primary-foreground))]"></div>
          </label>
        </div>
        </div>


      </div>

      <!-- Save Button -->
      <button id="save-settings-button" class="w-full mt-6 flex items-center justify-center space-x-2 cursor-pointer primary-bg primary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm">
        <span class="text-lg font-medium">${t("settings.saveSettings")}</span>
      </button>
      </div>
    `

    // Add event listeners
    document.getElementById("back-button").addEventListener("click", () => {
      currentView = "sessions"
      renderApp()
    })

    document.getElementById("save-settings-button").addEventListener("click", async () => {
      const darkMode = document.getElementById("dark-mode").checked
      const language = document.getElementById("language").value
      const currency = document.getElementById("currency").value


      browser.storage.local
        .set({
          darkMode,
          language,
          currency,
        })
        .then(async () => {
          // Apply dark mode
          if (darkMode) {
            document.documentElement.classList.add("dark")
          } else {
            document.documentElement.classList.remove("dark")
          }

          // Change language if different
          if (language !== getCurrentLanguage()) {
            await setLanguage(language)
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
        <div id="modalContent" class="card-bg rounded-lg shadow-lg w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
          <h3 class="text-lg font-medium card-text mb-4">${t("sessions.newSession")}</h3>
          <input 
            type="text" 
            id="session-name" 
            placeholder="${t("sessions.enterSessionName")}" 
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
          
          <div class="flex justify-end space-x-4">
            <button id="cancel-button" class="px-4 py-2 secondary-text font-medium hover:secondary-bg cursor-pointer rounded">${t("common.cancel")}</button>
            <button id="save-button" class="px-4 py-2 primary-bg primary-text font-medium cursor-pointer rounded flex items-center">
              ${t("common.save")}
            </button>
          </div>
        </div>
      </div>
  `

  document.body.appendChild(modal)

  const closeModal = () => {
    clearAllErrors(modal)
    document.body.removeChild(modal)
  }

  const saveSession = () => {
    clearAllErrors(modal)
    
    // Validate
    if (!validateRequiredField('session-name', 'Session name')) {
      return
    }
    
    const name = document.getElementById("session-name").value.trim()
    
    if (sessions.some(s => s.name === name)) {
      showFieldError('session-name', 'A session with this name already exists')
      return
    }

    browser.runtime
      .sendMessage({
        action: "createSession",
        name,
      })
      .then((response) => {
        sessions = response.sessions
        currentSession = response.currentSession
        closeModal()
        renderApp()
      })
  }

  // Setup UX improvements
  setupAutoFocus(modal)
  setupEscapeKey(modal, closeModal)
  setupEnterKey(modal, saveSession)

  // Close modal when clicking overlay (and prevent propagation when clicking content)
  const overlayEl = document.getElementById('modalOverlay')
  const contentEl = document.getElementById('modalContent')
  if (overlayEl) {
    overlayEl.addEventListener('click', closeModal)
  }
  if (contentEl) {
    contentEl.addEventListener('click', (ev) => ev.stopPropagation())
  }

  // Close button (top-right X)
  const closeBtn = document.getElementById('close-optimization')
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal)
  }

  document.querySelector("#modalOverlay").addEventListener("click", closeModal)

  document.querySelector("#modalContent").addEventListener("click", (event) => {
    event.stopPropagation()
  })

  document.getElementById("cancel-button").addEventListener("click", closeModal)

  document.getElementById("save-button").addEventListener("click", saveSession)
}

function showEditSessionModal(session) {
  const modal = document.createElement("div") 
  modal.innerHTML = `
      <div id="modalOverlay" class="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
        <div id="modalContent" class="card-bg rounded-lg shadow-lg w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
          <h3 class="text-lg font-medium card-text mb-4">${t("sessions.editSession")}</h3>
          <input 
            type="text" 
            id="session-name" 
            value="${session.name}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
          
          <div class="flex justify-end space-x-4">
            <button id="cancel-button" class="px-4 py-2 secondary-text font-medium hover:secondary-bg cursor-pointer rounded">${t("common.cancel")}</button>
            <button id="save-button" class="px-4 py-2 primary-bg primary-text font-medium cursor-pointer rounded flex items-center">
              ${t("common.save")}
            </button>
          </div>
        </div>
      </div>
  `

  document.body.appendChild(modal)

  const closeModal = () => {
    clearAllErrors(modal)
    document.body.removeChild(modal)
  }

  const saveSession = () => {
    clearAllErrors(modal)
    
    // Validate
    if (!validateRequiredField('session-name', 'Session name')) {
      return
    }
    
    const name = document.getElementById("session-name").value.trim()
    session.name = name
    browser.runtime
      .sendMessage({
        action: "updateSession",
        session,
      })
      .then((response) => {
        sessions = response.sessions
        closeModal()
        renderApp()
      })
  }

  // Setup UX improvements
  setupAutoFocus(modal)
  setupEscapeKey(modal, closeModal)
  setupEnterKey(modal, saveSession)

  document.querySelector("#modalOverlay").addEventListener("click", closeModal)

  document.querySelector("#modalContent").addEventListener("click", (event) => {
    event.stopPropagation()
  })

  document.getElementById("cancel-button").addEventListener("click", closeModal)

  document.getElementById("save-button").addEventListener("click", saveSession)
}

function showDeleteSessionModal(sessionId) {
  const modal = document.createElement("div")
  modal.className = "modal"
  modal.innerHTML = `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
      <div id="modalContent" class="card-bg rounded-lg shadow-lg w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-medium card-text mb-4">${t("sessions.confirmDelete")}</h3>
        
        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 secondary-text font-medium hover:secondary-bg cursor-pointer rounded">${t("common.cancel")}</button>
          <button id="delete-button" class="px-4 py-2 primary-bg primary-text font-medium cursor-pointer rounded flex items-center">
            ${t("common.delete")}
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
      <div id="modalContent" class="card-bg rounded-lg shadow-lg w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-medium card-text mb-4">${t("products.newProduct")}</h3>
        
        <div class="mb-6">
          <label for="product-name" class="block text-sm font-medium secondary-text mb-1">${t("modals.productName")}</label>
          <input 
            type="text" 
            id="product-name" 
            placeholder="${t("modals.enterProductName")}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="product-quantity" class="block text-sm font-medium secondary-text mb-1">${t("modals.quantityNeeded")}</label>
          <input 
            type="number" 
            id="product-quantity" 
            value="1"
            min="1"
            step="1"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
          <p class="mt-1 text-sm muted-text">${t("modals.howManyNeeded")}</p>
        </div>

        <div class="mb-6">
          <button id="toggle-compatibility" class="text-sm text-blue-600 hover:muted-text font-medium flex items-center cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
            ${t("modals.showCompatibility")}
          </button>
        </div>



        <div class="mb-6" id="limited-compatibility-section" style="display:none;">
          <label class="block text-sm font-medium secondary-text mb-1">${t("modals.limitedCompatibility")}</label>
          <p class="mt-1 text-sm muted-text">${t("modals.compatibilityHelp")}</p>

          <div id="compatible-products-list" class="mt-3 space-y-2" style="display:block; max-height:220px; overflow:auto;">
            ${sessions.find(s => s.id === currentSession).products.map(p => `
              <div class="flex items-center">
                <input type="checkbox" id="compat-${p.id}" value="${p.id}" class="compat-checkbox h-4 w-4 accent-gray-800 border-default rounded focus:ring-gray-500">
                <label for="compat-${p.id}" class="ml-2 text-sm secondary-text">${p.name}</label>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 secondary-text font-medium hover:secondary-bg cursor-pointer rounded">${t("common.cancel")}</button>
          <button id="save-button" class="px-4 py-2 primary-bg primary-text font-medium cursor-pointer rounded flex items-center">
            ${t("common.save")}
          </button>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  // Toggle compatibility section
  const toggleBtn = document.getElementById('toggle-compatibility')
  const compatSection = document.getElementById('limited-compatibility-section')
  
  toggleBtn.addEventListener('click', () => {
    if (compatSection.style.display === 'none') {
      compatSection.style.display = 'block'
      toggleBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
        </svg>
        ${t("modals.hideCompatibility")}
      `
    } else {
      compatSection.style.display = 'none'
      toggleBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
        ${t("modals.showCompatibility")}
      `
      // Clear selections when hiding? Maybe not, user might just want to collapse it.
    }
  })

  const closeModal = () => {
    clearAllErrors(modal)
    document.body.removeChild(modal)
  }

  const saveProduct = () => {
    clearAllErrors(modal)
    
    // Validate
    if (!validateRequiredField('product-name', 'Product name')) {
      return
    }
    
    const name = document.getElementById("product-name").value.trim()
    const quantity = parseInt(document.getElementById("product-quantity").value) || 1

    // collect compatible products
    const compatibleProducts = []
    document.querySelectorAll('#compatible-products-list input.compat-checkbox:checked').forEach(cb => compatibleProducts.push(cb.value))

    // Create product first to get an id, then update reciprocal alternatives
    SidebarAPI.createProduct(currentSession, {
      name,
      quantity,
      limitedCompatibilityWith: compatibleProducts,
    }).then((response) => {
        // sessions returned with new product
        sessions = response.sessions
        const session = sessions.find(s => s.id === currentSession)
        const newProduct = session.products[session.products.length - 1]

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
        if (compatibleProducts.length > 0) {
          SidebarAPI.updateSession(currentSession, session).then((resp) => {
            sessions = resp.sessions
            closeModal()
            renderApp()
          })
        } else {
          closeModal()
          renderApp()
        }
      })
  }

  // Setup UX improvements
  setupAutoFocus(modal)
  setupEscapeKey(modal, closeModal)
  setupEnterKey(modal, saveProduct)

  // Close modal when clicking overlay (and prevent propagation when clicking content)
  const overlayEl = document.getElementById('modalOverlay')
  const contentEl = document.getElementById('modalContent')
  if (overlayEl) {
    overlayEl.addEventListener('click', closeModal)
  }
  if (contentEl) {
    contentEl.addEventListener('click', (ev) => ev.stopPropagation())
  }

  // Close button (top-right X)
  const closeBtn = document.getElementById('close-optimization')
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal)
  }

  document.querySelector("#modalOverlay").addEventListener("click", closeModal)

  document.querySelector("#modalContent").addEventListener("click", (event) => {
    event.stopPropagation()
  })

  document.getElementById("cancel-button").addEventListener("click", closeModal)

  document.getElementById("save-button").addEventListener("click", saveProduct)
}

function showEditProductModal(product) {
  const modal = document.createElement("div")
  modal.className = "modal"
  modal.innerHTML = `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
      <div id="modalContent" class="card-bg rounded-lg shadow-lg w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-medium card-text mb-4">${t("products.editProduct")}</h3>
        
        <div class="mb-6">
          <label for="product-name" class="block text-sm font-medium secondary-text mb-1">${t("modals.productName")}</label>
          <input 
            type="text" 
            id="product-name" 
            value="${product.name}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="product-quantity" class="block text-sm font-medium secondary-text mb-1">${t("modals.quantityNeeded")}</label>
          <input 
            type="number" 
            id="product-quantity" 
            value="${product.quantity || 1}"
            min="1"
            step="1"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
          <p class="mt-1 text-sm muted-text">${t("modals.howManyNeeded")}</p>
        </div>

        ${sessions.find(s => s.id === currentSession).alternativeGroups && sessions.find(s => s.id === currentSession).alternativeGroups.some(g => g.options.some(opt => opt.productIds.includes(product.id))) ? `
          <div class="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div class="flex">
              <svg class="h-5 w-5 text-amber-400 mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <p class="text-sm text-amber-800">${t("modals.alternativeGroupWarning")}</p>
            </div>
          </div>
        ` : ''}

        <div class="mb-6">
          <button id="toggle-compatibility" class="text-sm text-blue-600 hover:muted-text font-medium flex items-center cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
            ${t("modals.showCompatibility")}
          </button>
        </div>



        <div class="mb-6" id="limited-compatibility-section" style="display:none;">
          <label class="block text-sm font-medium secondary-text mb-1">${t("modals.limitedCompatibility")}</label>
          <p class="mt-1 text-sm muted-text">${t("modals.compatibilityHelpEdit")}</p>

          <div id="compatible-products-list" class="mt-3 space-y-2" style="max-height:220px; overflow:auto;">
            ${sessions.find(s => s.id === currentSession).products.filter(p => p.id !== product.id).map(p => `
              <div class="flex items-center">
                <input type="checkbox" id="compat-${p.id}" value="${p.id}" class="compat-checkbox h-4 w-4 accent-gray-800 border-default rounded focus:ring-gray-500" ${product.limitedCompatibilityWith && product.limitedCompatibilityWith.includes(p.id) ? 'checked' : ''}>
                <label for="compat-${p.id}" class="ml-2 text-sm secondary-text">${p.name}</label>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 secondary-text font-medium hover:secondary-bg cursor-pointer rounded">${t("common.cancel")}</button>
          <button id="save-button" class="px-4 py-2 primary-bg primary-text font-medium cursor-pointer rounded flex items-center">
            ${t("common.save")}
          </button>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  // Toggle compatibility section
  const toggleBtn = document.getElementById('toggle-compatibility')
  const compatSection = document.getElementById('limited-compatibility-section')
  
  // Initialize state based on whether there are existing selections
  const hasSelections = product.limitedCompatibilityWith && product.limitedCompatibilityWith.length > 0
  if (hasSelections) {
    compatSection.style.display = 'block'
    toggleBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
      </svg>
      ${t("modals.hideCompatibility")}
    `
  }

  toggleBtn.addEventListener('click', () => {
    if (compatSection.style.display === 'none') {
      compatSection.style.display = 'block'
      toggleBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
        </svg>
        ${t("modals.hideCompatibility")}
      `
    } else {
      compatSection.style.display = 'none'
      toggleBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
        ${t("modals.showCompatibility")}
      `
    }
  })



  const closeModal = () => {
    clearAllErrors(modal)
    document.body.removeChild(modal)
  }

  const saveProduct = () => {
    clearAllErrors(modal)
    
    // Validate
    if (!validateRequiredField('product-name', 'Product name')) {
      return
    }
    
    const name = document.getElementById("product-name").value.trim()
    const quantity = parseInt(document.getElementById("product-quantity").value) || 1
    

    // collect compatible products
    const compatibleProducts = []
    document.querySelectorAll('#compatible-products-list input.compat-checkbox:checked').forEach(cb => {
      if (cb.disabled) return
      compatibleProducts.push(cb.value)
    })

    const session = sessions.find(s => s.id === currentSession)

    // update product fields
    const prod = session.products.find(p => p.id === product.id)
    if (!prod) return
    prod.name = name
    prod.quantity = quantity
    prod.limitedCompatibilityWith = compatibleProducts

    // Ensure bidirectional links: for each product in session, add/remove reciprocal
    session.products.forEach((other) => {
      if (other.id === prod.id) return

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
    SidebarAPI.updateSession(currentSession, session).then((response) => {
      sessions = response.sessions
      closeModal()
      renderApp()
    })
  }

  // Setup UX improvements
  setupAutoFocus(modal)
  setupEscapeKey(modal, closeModal)
  setupEnterKey(modal, saveProduct)

  // Close modal when clicking overlay
  document.querySelector("#modalOverlay")?.addEventListener("click", closeModal)
  document.querySelector("#modalContent")?.addEventListener("click", (event) => {
    event.stopPropagation()
  })

  document.getElementById("cancel-button").addEventListener("click", closeModal)

  document.getElementById("save-button").addEventListener("click", saveProduct)
}

function showEditPageModal(page) {
  const modal = document.createElement("div")
  modal.className = "modal"
  modal.innerHTML = `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
      <div id="modalContent" class="card-bg rounded-lg shadow-lg w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-medium card-text mb-4">${t("pages.editPage")}</h3>
        
        <div class="mb-6">
          <label for="page-url" class="block text-sm font-medium secondary-text mb-1">${t("modals.url")}</label>
          <input 
            type="text" 
            id="page-url" 
            value="${page.url}" 
            readonly
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="page-price" class="block text-sm font-medium secondary-text mb-1">${t("modals.price")}</label>
          <input 
            type="text" 
            id="page-price" 
            value="${page.price || ""}"
            placeholder="${t("modals.enterPrice")}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="page-currency" class="block text-sm font-medium secondary-text mb-1">${t("modals.currency")}</label>
          <select 
            id="page-currency" 
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
            <option value="FREE" ${page.currency === "FREE" ? "selected" : ""}>${t("pages.free")}</option>
            ${CURRENCIES.map(c => `<option value="${c.code}" ${page.currency === c.code ? "selected" : ""}>${c.label} - ${c.symbol}</option>`).join('')}
          </select>
        </div>

        <div class="mb-6">
          <label for="page-shipping" class="block text-sm font-medium secondary-text mb-1">${t("modals.shippingPrice")}</label>
          <input 
            type="text" 
            id="page-shipping" 
            value="${page.shippingPrice || ""}"
            placeholder="${t("modals.enterShipping")}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="page-seller" class="block text-sm font-medium secondary-text mb-1">${t("modals.seller")}</label>
          <input 
            type="text" 
            id="page-seller" 
            value="${page.seller || ""}"
            placeholder="${t("modals.enterSeller")}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="items-per-purchase" class="block text-sm font-medium secondary-text mb-1">${t("modals.itemsPerPurchase")}</label>
          <input 
            type="number" 
            id="items-per-purchase" 
            value="${page.itemsPerPurchase || 1}"
            min="1"
            step="1"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
          <p class="mt-1 text-sm muted-text">${t("modals.itemsPerPurchaseHelp")}</p>
        </div>

        <div class="mb-6">
          <label for="max-per-purchase" class="block text-sm font-medium secondary-text mb-1">${t("modals.maxPerPurchase")} (${t("modals.optional")})</label>
          <input 
            type="number" 
            id="max-per-purchase" 
            value="${page.maxPerPurchase || ""}"
            min="1"
            step="1"
            placeholder="${t("modals.leaveEmptyIfUnlimited")}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
          <p class="mt-1 text-sm muted-text">${t("modals.maxPerPurchaseHelp")}</p>
        </div>

        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 secondary-text font-medium hover:secondary-bg cursor-pointer rounded">${t("common.cancel")}</button>
          <button id="save-button" class="px-4 py-2 primary-bg primary-text font-medium cursor-pointer rounded flex items-center">
            ${t("common.save")}
          </button>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  const closeModal = () => {
    clearAllErrors(modal)
    document.body.removeChild(modal)
  }

  const savePage = () => {
    clearAllErrors(modal)

    const price = document.getElementById("page-price").value
    const shippingPrice = document.getElementById("page-shipping").value
    const seller = document.getElementById("page-seller").value
    const currency = document.getElementById("page-currency").value
    const itemsPerPurchaseValue = document.getElementById("items-per-purchase").value
    const itemsPerPurchase = itemsPerPurchaseValue ? parseInt(itemsPerPurchaseValue) : null
    const maxPerPurchaseValue = document.getElementById("max-per-purchase").value
    const maxPerPurchase = maxPerPurchaseValue ? parseInt(maxPerPurchaseValue) : null

    // Validation
    let isValid = true
    if (currency !== 'FREE') {
      if (!validateRequiredField('page-price', 'Price')) isValid = false
      if (!validateRequiredField('page-shipping', 'Shipping price')) isValid = false
    }
    if (!validateRequiredField('page-seller', 'Seller')) isValid = false
    
    if (!itemsPerPurchaseValue) {
      showFieldError('items-per-purchase', 'Items per purchase is required')
      isValid = false
    } else if (itemsPerPurchase < 1) {
      showFieldError('items-per-purchase', 'Must be at least 1')
      isValid = false
    }

    if (maxPerPurchase !== null && maxPerPurchase < 1) {
      showFieldError('max-per-purchase', 'Must be at least 1')
      isValid = false
    }
    
    if (!isValid) return

    const updatedPage = {
      price,
      shippingPrice,
      seller,
      currency,
      itemsPerPurchase,
      ...(maxPerPurchase !== null && { maxPerPurchase }),
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
        closeModal()
        renderApp()
      })
  }

  // Setup UX improvements
  setupAutoFocus(modal)
  setupEscapeKey(modal, closeModal)
  setupEnterKey(modal, savePage)

  document.querySelector("#modalOverlay")?.addEventListener("click", closeModal)
  document.querySelector("#modalContent")?.addEventListener("click", (event) => {
    event.stopPropagation()
  })

  document.getElementById("cancel-button").addEventListener("click", closeModal)
  document.getElementById("save-button").addEventListener("click", savePage)
}

function showEditBundleModal(bundle) {
  const session = sessions.find((s) => s.id === currentSession)
  const modal = document.createElement("div")
  modal.className = "modal"
  modal.innerHTML = `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
      <div id="modalContent" class="card-bg rounded-lg shadow-lg w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-medium card-text mb-4">Edit Bundle</h3>
        
        <div class="mb-6">
          <label for="page-url" class="block text-sm font-medium secondary-text mb-1">URL</label>
          <input 
            type="text" 
            id="page-url" 
            value="${bundle.url}" 
            readonly
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label class="block text-sm font-medium secondary-text mb-2">Select products in this bundle:</label>
          <div class="space-y-2">
            ${session.products
              .map(
                (p) => {
                  const bundleProduct = bundle.products && bundle.products.find(bp => bp.productId === p.id)
                  const isChecked = !!bundleProduct
                  const productQty = bundleProduct ? bundleProduct.quantity : 1
                  
                  return `
              <div class="flex items-center space-x-2">
                <input type="checkbox" 
                  id="product-${p.id}" 
                  value="${p.id}" 
                  ${isChecked ? "checked" : ""}
                  class="bundle-edit-checkbox h-4 w-4 accent-gray-800 border-default rounded focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                >
                <label for="product-${p.id}" class="flex-1 text-sm secondary-text">${p.name}</label>
                <input type="number" 
                  id="bundle-product-qty-${p.id}" 
                  min="1" 
                  step="1" 
                  value="${productQty}"
                  class="bundle-edit-qty w-20 px-2 py-1 border border-default input-bg card-text rounded text-sm ${isChecked ? '' : 'hidden'}"
                  placeholder="Qty"
                >
              </div>
            `
                }
              )
              .join("")}
          </div>
        </div>

        <div class="mb-6">
          <label for="page-price" class="block text-sm font-medium secondary-text mb-1">Price</label>
          <input 
            type="text" 
            id="page-price" 
            value="${bundle.price || ""}"
            placeholder="Enter price"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="page-currency" class="block text-sm font-medium secondary-text mb-1">Currency</label>
          <select 
            id="page-currency" 
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
            <option value="FREE" ${bundle.currency === "FREE" ? "selected" : ""}>Free</option>
            ${CURRENCIES.map(c => `<option value="${c.code}" ${bundle.currency === c.code ? "selected" : ""}>${c.label} - ${c.symbol}</option>`).join('')}
          </select>
        </div>

        <div class="mb-6">
          <label for="page-shipping" class="block text-sm font-medium secondary-text mb-1">Shipping Price</label>
          <input 
            type="text" 
            id="page-shipping" 
            value="${bundle.shippingPrice || ""}"
            placeholder="Enter shipping price"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="page-seller" class="block text-sm font-medium secondary-text mb-1">Seller</label>
          <input 
            type="text" 
            id="page-seller" 
            value="${bundle.seller || ""}"
            placeholder="Enter seller name"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="items-per-purchase" class="block text-sm font-medium secondary-text mb-1">Items per Purchase</label>
          <input 
            type="number" 
            id="items-per-purchase" 
            value="${bundle.itemsPerPurchase || 1}"
            min="1"
            step="1"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
          <p class="mt-1 text-sm muted-text">How many items are included in one purchase</p>
        </div>

        <div class="mb-6">
          <label for="max-per-purchase" class="block text-sm font-medium secondary-text mb-1">Max per Purchase (Optional)</label>
          <input 
            type="number" 
            id="max-per-purchase" 
            value="${bundle.maxPerPurchase || ""}"
            min="1"
            step="1"
            placeholder="Leave empty if unlimited"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
          <p class="mt-1 text-sm muted-text">Maximum number of times you can purchase from this bundle</p>
        </div>

        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 secondary-text font-medium hover:secondary-bg cursor-pointer rounded">Cancel</button>
          <button id="save-button" class="px-4 py-2 primary-bg primary-text font-medium cursor-pointer rounded flex items-center">
            Save
          </button>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  // Toggle quantity input visibility when checkbox changes
  document.querySelectorAll('.bundle-edit-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const productId = e.target.value
      const qtyInput = document.getElementById(`bundle-product-qty-${productId}`)
      if (qtyInput) {
        qtyInput.classList.toggle('hidden', !e.target.checked)
      }
    })
  })

  const closeModal = () => {
    clearAllErrors(modal)
    document.body.removeChild(modal)
  }

  const saveBundle = () => {
    clearAllErrors(modal)

    const price = document.getElementById("page-price").value
    const shippingPrice = document.getElementById("page-shipping").value
    const seller = document.getElementById("page-seller").value
    const currency = document.getElementById("page-currency").value
    const itemsPerPurchaseValue = document.getElementById("items-per-purchase").value
    const itemsPerPurchase = itemsPerPurchaseValue ? parseInt(itemsPerPurchaseValue) : null
    const maxPerPurchaseValue = document.getElementById("max-per-purchase").value
    const maxPerPurchase = maxPerPurchaseValue ? parseInt(maxPerPurchaseValue) : null
    
    // Validation
    let isValid = true
    if (currency !== 'FREE') {
      if (!validateRequiredField('page-price', 'Price')) isValid = false
      if (!validateRequiredField('page-shipping', 'Shipping price')) isValid = false
    }
    if (!validateRequiredField('page-seller', 'Seller')) isValid = false
    
    if (!itemsPerPurchaseValue) {
      showFieldError('items-per-purchase', 'Items per purchase is required')
      isValid = false
    } else if (itemsPerPurchase < 1) {
      showFieldError('items-per-purchase', 'Must be at least 1')
      isValid = false
    }

    if (maxPerPurchase !== null && maxPerPurchase < 1) {
      showFieldError('max-per-purchase', 'Must be at least 1')
      isValid = false
    }
    
    if (!isValid) return

    const products = []
    document.querySelectorAll('.bundle-edit-checkbox:checked').forEach((checkbox) => {
      const productId = checkbox.value
      const qtyInput = document.getElementById(`bundle-product-qty-${productId}`)
      const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1
      products.push({ productId, quantity })
    })

    const updatedBundle = {
      price,
      shippingPrice,
      seller,
      currency,
      products,
      itemsPerPurchase,
      ...(maxPerPurchase !== null && { maxPerPurchase }),
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
        closeModal()
        renderApp()
      })
  }

  // Setup UX improvements
  setupAutoFocus(modal)
  setupEscapeKey(modal, closeModal)
  setupEnterKey(modal, saveBundle)

  document.querySelector("#modalOverlay")?.addEventListener("click", closeModal)
  document.querySelector("#modalContent")?.addEventListener("click", (event) => {
    event.stopPropagation()
  })

  document.getElementById("cancel-button").addEventListener("click", closeModal)
  document.getElementById("save-button").addEventListener("click", saveBundle)
}

function showDeleteBundleModal(bundleId) {
  const modal = document.createElement("div")
  modal.className = "modal"
  modal.innerHTML = `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
      <div id="modalContent" class="card-bg rounded-lg shadow-lg w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-medium card-text mb-4">Delete Bundle</h3>
        <p class="muted-text mb-6">Are you sure you want to delete this bundle?</p>
        
        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 secondary-text font-medium hover:secondary-bg cursor-pointer rounded">Cancel</button>
          <button id="delete-button" class="px-4 py-2 primary-bg primary-text font-medium cursor-pointer rounded flex items-center">
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
      <div id="modalContent" class="card-bg rounded-lg shadow-lg w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-medium card-text mb-4">Delete Product</h3>
        <p class="muted-text mb-6">Are you sure you want to delete this product?</p>
        
        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 secondary-text font-medium hover:secondary-bg cursor-pointer rounded">Cancel</button>
          <button id="delete-button" class="px-4 py-2 primary-bg primary-text font-medium cursor-pointer rounded flex items-center">
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
      <div id="modalContent" class="card-bg rounded-lg shadow-lg w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-medium card-text mb-4">${t("pages.deletePage")}</h3>
        <p class="muted-text mb-6">${t("pages.confirmDelete")}</p>
        
        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 secondary-text font-medium hover:secondary-bg cursor-pointer rounded">${t("common.cancel")}</button>
          <button id="delete-button" class="px-4 py-2 primary-bg primary-text font-medium cursor-pointer rounded flex items-center">
            ${t("pages.deleteButton")}
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
      <div id="modalContent" class="card-bg rounded-lg shadow-lg w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-medium card-text mb-4">${t("modals.addPageFor")} ${product.name}</h3>
        
        ${!hasKnownParser ? 
          `<p class="text-sm muted-text mb-4">${t("modals.noKnownParser")}</p>` 
          : ''
        }

        <div class="mb-6">
          <label class="block text-sm font-medium secondary-text mb-1">${t("modals.isBundle")}</label>
          <div class="flex items-center">
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="is-bundle" class="sr-only peer">
              <div class="w-11 h-6 secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-100 after:border after:border-gray-300 dark:after:border-gray-600 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[hsl(var(--primary))] dark:peer-checked:after:bg-[hsl(var(--primary-foreground))]"></div>
            </label>
          </div>
          <p class="mt-1 text-sm muted-text">${t("modals.bundleExplanation")}</p>
        </div>

        <div id="product-selection" class="mb-6" style="display: none;">
          <label class="block text-sm font-medium secondary-text mb-2">${t("modals.selectProductsInBundle")}</label>
          <div class="space-y-2">
            ${session.products
              .map(
                (p) => `
              <div class="flex items-center space-x-2">
                <input type="checkbox" 
                  id="product-${p.id}" 
                  value="${p.id}" 
                  ${p.id === product.id ? "checked disabled" : ""}
                  class="bundle-product-checkbox h-4 w-4 accent-gray-800 border-default rounded focus:ring-gray-500"
                >
                <label for="product-${p.id}" class="flex-1 text-sm secondary-text">${p.name}</label>
                <input type="number" 
                  id="product-qty-${p.id}" 
                  min="1" 
                  step="1" 
                  value="1"
                  class="bundle-product-qty w-20 px-2 py-1 border border-default input-bg card-text rounded text-sm ${p.id === product.id ? '' : 'hidden'}"
                  placeholder="Qty"
                >
              </div>
            `,
              )
              .join("")}
          </div>
        </div>

        <div class="mb-6">
          <label for="page-url" class="block text-sm font-medium secondary-text mb-1">${t("modals.url")}</label>
          <input 
            type="text" 
            id="page-url" 
            value="${scrapedData.url}" 
            readonly
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="page-price" class="block text-sm font-medium secondary-text mb-1">${t("modals.price")}</label>
          <input 
            type="text" 
            id="page-price" 
            value="${scrapedData.hasKnownParser ? (scrapedData.price || "") : ""}"
            placeholder="${t("modals.enterPrice")}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="page-currency" class="block text-sm font-medium secondary-text mb-1">${t("modals.currency")}</label>
          <select 
            id="page-currency" 
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
            <option value="FREE" ${scrapedData.priceCurrency === "FREE" ? "selected" : ""}>${t("pages.free")}</option>
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
          <label for="page-shipping" class="block text-sm font-medium secondary-text mb-1">${t("modals.shippingPrice")}</label>
          <input 
            type="text" 
            id="page-shipping" 
            value="${scrapedData.hasKnownParser ? (scrapedData.shippingPrice || "") : ""}"
            placeholder="${t("modals.enterShipping")}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="page-seller" class="block text-sm font-medium secondary-text mb-1">${t("modals.seller")}</label>
          <input 
            type="text" 
            id="page-seller" 
            value="${scrapedData.hasKnownParser ? (scrapedData.seller || "") : ""}"
            placeholder="${t("modals.enterSeller")}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="items-per-purchase" class="block text-sm font-medium secondary-text mb-1">${t("modals.itemsPerPurchase")}</label>
          <input 
            type="number" 
            id="items-per-purchase" 
            value="1"
            min="1"
            step="1"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
          <p class="mt-1 text-sm muted-text">${t("modals.itemsPerPurchaseHelp")}</p>
        </div>

        <div class="mb-6">
          <label for="max-per-purchase" class="block text-sm font-medium secondary-text mb-1">${t("modals.maxPerPurchase")} (${t("modals.optional")})</label>
          <input 
            type="number" 
            id="max-per-purchase" 
            value=""
            min="1"
            step="1"
            placeholder="${t("modals.leaveEmptyIfUnlimited")}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
          <p class="mt-1 text-sm muted-text">${t("modals.maxPerPurchaseHelp")}</p>
        </div>

        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 secondary-text font-medium hover:secondary-bg cursor-pointer rounded">${t("common.cancel")}</button>
          <button id="save-button" class="px-4 py-2 primary-bg primary-text font-medium cursor-pointer rounded flex items-center">
            ${t("common.save")}
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

  // Toggle quantity input visibility when checkbox changes
  document.querySelectorAll('.bundle-product-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const productId = e.target.value
      const qtyInput = document.getElementById(`product-qty-${productId}`)
      if (qtyInput && !e.target.disabled) {
        qtyInput.classList.toggle('hidden', !e.target.checked)
      }
    })
  })

  const closeModal = () => {
    clearAllErrors(modal)
    document.body.removeChild(modal)
    scrapedData = null
  }

  const saveScrapedData = () => {
    clearAllErrors(modal)

    const isBundle = document.getElementById("is-bundle").checked
    const url = document.getElementById("page-url").value
    const price = document.getElementById("page-price").value
    const shippingPrice = document.getElementById("page-shipping").value
    const seller = document.getElementById("page-seller").value
    const currency = document.getElementById("page-currency").value
    const itemsPerPurchaseValue = document.getElementById("items-per-purchase").value
    const itemsPerPurchase = itemsPerPurchaseValue ? parseInt(itemsPerPurchaseValue) : null
    const maxPerPurchaseValue = document.getElementById("max-per-purchase").value
    const maxPerPurchase = maxPerPurchaseValue ? parseInt(maxPerPurchaseValue) : null

    // Validation
    let isValid = true
    if (currency !== 'FREE') {
      if (!validateRequiredField('page-price', 'Price')) isValid = false
      if (!validateRequiredField('page-shipping', 'Shipping price')) isValid = false
    }
    if (!validateRequiredField('page-seller', 'Seller')) isValid = false
    
    if (!itemsPerPurchaseValue) {
      showFieldError('items-per-purchase', 'Items per purchase is required')
      isValid = false
    } else if (itemsPerPurchase < 1) {
      showFieldError('items-per-purchase', 'Must be at least 1')
      isValid = false
    }

    if (maxPerPurchase !== null && maxPerPurchase < 1) {
      showFieldError('max-per-purchase', 'Must be at least 1')
      isValid = false
    }
    
    if (!isValid) return

    if (isBundle) {
      const bundle = {
        url,
        price,
        shippingPrice,
        seller,
        currency,
        itemsPerPurchase,
        ...(maxPerPurchase !== null && { maxPerPurchase }),
        products: [],
        timestamp: new Date().toISOString(),
      }
      
      document.querySelectorAll('#product-selection .bundle-product-checkbox:checked').forEach((checkbox) => {
        const productId = checkbox.value
        const qtyInput = document.getElementById(`product-qty-${productId}`)
        const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1
        bundle.products.push({ productId, quantity })
      })

      browser.runtime
        .sendMessage({
          action: "createBundle",
          sessionId: currentSession,
          bundle,
        })
        .then((response) => {
          sessions = response.sessions
          closeModal()

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
        itemsPerPurchase,
        ...(maxPerPurchase !== null && { maxPerPurchase }),
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
          closeModal()

          // Show product details again
          currentView = "pages"
          renderApp()
        })
    }
  }

  // Setup UX improvements
  setupAutoFocus(modal)
  setupEscapeKey(modal, closeModal)
  setupEnterKey(modal, saveScrapedData)

  document.getElementById("cancel-button").addEventListener("click", closeModal)
  document.getElementById("save-button").addEventListener("click", saveScrapedData)
  
  // Close modal when clicking overlay
  document.querySelector("#modalOverlay")?.addEventListener("click", closeModal)
  document.querySelector("#modalContent")?.addEventListener("click", (event) => {
    event.stopPropagation()
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
          <button class="muted-text p-2 cursor-pointer" id="back-button">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 class="text-2xl pl-4 font-semibold card-text">${t("deliveryRules.title")}</h1>
        </div>
      </div>

      <p class="text-sm muted-text mb-6">${t("deliveryRules.subtitle")}</p>

      <div class="space-y-4 seller-settings">
        ${getUniqueSellers(session)
          .map(
            (seller) => {
              const rule = getRule(seller)
              const copiedFrom = rule.copiedFrom || 'None'
              const isFree = rule.type === 'free'
              const type = rule.type === 'free' ? 'fixed' : (rule.type || 'fixed') // Default to fixed if free or undefined
              
              return `
          <div class="mb-4 seller-card card-bg rounded-xl shadow-md p-4 border border-default">
            <h4 class="text-lg font-medium card-text mb-3 truncate border-b pb-2">${seller}</h4>

            <div class="mb-4">
              <label class="block text-sm font-medium secondary-text mb-1">${t("deliveryRules.sameSellerAs")}</label>
              <select class="same-seller-select w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent" data-seller="${seller}">
                <option value="None" ${copiedFrom === 'None' ? 'selected' : ''}>${t("deliveryRules.none")}</option>
                ${getUniqueSellers(session).filter(s => s !== seller).map(s2 => `<option value="${s2}" ${copiedFrom === s2 ? 'selected' : ''}>${s2}</option>`).join('')}
              </select>
            </div>

            <div class="mb-4 flex items-center justify-between free-delivery-row" style="display: ${copiedFrom !== 'None' ? 'none' : 'flex'}">
              <label class="text-sm font-medium secondary-text">${t("deliveryRules.freeDelivery")}</label>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" class="free-delivery-toggle sr-only peer" data-seller="${seller}" ${isFree ? 'checked' : ''}>
                <div class="w-11 h-6 secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-100 after:border after:border-gray-300 dark:after:border-gray-600 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[hsl(var(--primary))] dark:peer-checked:after:bg-[hsl(var(--primary-foreground))]"></div>
              </label>
            </div>

            <div class="mb-4 delivery-type-row" style="display: ${copiedFrom !== 'None' || isFree ? 'none' : 'block'}">
              <label class="block text-sm font-medium secondary-text mb-1">${t("deliveryRules.pricingType")}</label>
              <select class="delivery-type w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent" data-seller="${seller}">
                <option value="fixed" ${type === 'fixed' ? 'selected' : ''}>${t("deliveryRules.typeFixed")}</option>
                <option value="first-item" ${type === 'first-item' ? 'selected' : ''}>${t("deliveryRules.typeFirstItem")}</option>
                <option value="free-threshold" ${type === 'free-threshold' ? 'selected' : ''}>${t("deliveryRules.typeFreeThreshold")}</option>
              </select>
            </div>

            <div id="delivery-options-${seller.replace(/\s+/g, "-")}" style="display: ${copiedFrom !== 'None' || isFree ? 'none' : 'block'}">
              <div class="option-block option-fixed fixed-price mb-3" data-option="fixed" style="display: none;">
                <!-- No extra fields for fixed -->
              </div>

              <div class="option-block option-first first-item mb-3" data-option="first-item" style="display: ${type === 'first-item' ? 'block' : 'none'};">
                <label class="block text-sm font-medium secondary-text mb-1">${t("deliveryRules.firstItemPrice")}</label>
                <input type="number" class="first-item-price w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent" data-seller="${seller}" step="0.01" min="0" value="${rule.firstItemPrice || ''}">
              </div>

              <div class="option-block option-first-additional first-item mb-3" data-option="first-item-additional" style="display: ${type === 'first-item' ? 'block' : 'none'};">
                <label class="block text-sm font-medium secondary-text mb-1">${t("deliveryRules.followingItemsPrice")}</label>
                <input type="number" class="following-items-price w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent" data-seller="${seller}" step="0.01" min="0" value="${rule.additionalItemsPrice || ''}">
              </div>

              <div class="option-block option-free free-threshold mb-3" data-option="free-threshold" style="display: ${type === 'free-threshold' || isFree ? 'block' : 'none'};">
                <label class="block text-sm font-medium secondary-text mb-1">${t("deliveryRules.freeDeliveryOver")}</label>
                <input type="number" class="free-threshold-value w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent" data-seller="${seller}" step="0.01" min="0" value="${rule.threshold || ''}">
              </div>
            </div>
          </div>
        `
            }
          )
          .join("")}
      </div>

      <button id="save-rules-button" class="w-full mt-6 flex items-center justify-center space-x-2 cursor-pointer primary-bg primary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm">
        <span class="text-lg font-medium">${t("deliveryRules.saveRules")}</span>
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

function exportSession(session) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(session, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", `session-${session.name}.json`);
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

function importSession() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  
  input.onchange = e => { 
     const file = e.target.files[0]; 
     const reader = new FileReader();
     reader.readAsText(file,'UTF-8');
     reader.onload = readerEvent => {
        try {
          const content = readerEvent.target.result;
          const sessionData = JSON.parse(content);
          
          // Basic validation
          if (!sessionData.name || !Array.isArray(sessionData.products)) {
            alert("Invalid session file format");
            return;
          }

          // Check for name collision
          let name = sessionData.name
          while (sessions.some(s => s.name === name)) {
             name = prompt(`The session name "${name}" is already taken. Please enter a new name:`, name + " (Imported)")
             if (name === null) return // User cancelled
             name = name.trim()
             if (!name) return // Empty name
          }
          sessionData.name = name

          // Create new session with checked name
          SidebarAPI.createSession(name).then(response => {
             const newSessionId = response.currentSession;
             
             // Update the new session with imported data
             // We need to preserve the new ID but overwrite other fields
             const updatedSession = {
               ...sessionData,
               id: newSessionId,
               created: new Date().toISOString()
             };

             SidebarAPI.updateSession(newSessionId, updatedSession).then(updateResponse => {
               sessions = updateResponse.sessions;
               currentSession = newSessionId;
               renderApp();
             });
          });

        } catch (err) {
          alert("Error parsing session file: " + err.message);
        }
     }
  }
  
  input.click();
}

function renderAlternativesView() {
  const session = sessions.find((s) => s.id === currentSession)
  if (!session) {
    currentView = "sessions"
    renderApp()
    return
  }
  
  const groups = session.alternativeGroups || []

  app.innerHTML = `
    <div class="mx-4">
      <!-- Header -->
      <div class="flex justify-between items-center mb-3">
        <div class="flex items-center space-x-3">
          <button class="muted-text p-2 cursor-pointer" id="back-button">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 class="text-2xl pl-4 font-semibold card-text">${t("alternatives.title")}</h1>
        </div>
      </div>

      <div class="space-y-4">
        ${groups.length > 0 ? groups.map(group => `
          <div class="card-bg rounded-xl shadow-md p-4 group-item">
            <div class="flex justify-between items-start">
              <div class="flex-1 min-w-0 mr-4">
                <h2 class="text-xl font-medium card-text truncate">${group.name}</h2>
                <div class="mt-2 space-y-1">
                  ${group.options.map((opt, idx) => `
                    <div class="text-sm muted-text">
                      <span class="font-medium">${t("alternatives.option")} ${idx + 1}:</span> 
                      ${opt.products ? opt.products.map(p => {
                        const prod = session.products.find(product => product.id === p.productId)
                        const qty = p.quantity > 1 ? ` (×${p.quantity})` : ''
                        return prod ? `${prod.name}${qty}` : t("pages.noProducts")
                      }).join(' + ') : t("pages.noProducts")}
                    </div>
                  `).join('')}
                </div>
              </div>
              <div class="flex space-x-2 flex-shrink-0">
                <button class="muted-text p-1 cursor-pointer edit-group-button" data-id="${group.id}">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button class="muted-text p-1 cursor-pointer delete-group-button" data-id="${group.id}">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        `).join('') : `<div class="text-center muted-text py-8">${t("alternatives.noGroups")}</div>`}
      </div>

      <button id="new-group-button" class="w-full mt-6 flex items-center justify-center space-x-2 cursor-pointer primary-bg primary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span class="text-lg font-medium">${t("alternatives.newGroup")}</span>
      </button>
    </div>
  `

  document.getElementById("back-button").addEventListener("click", () => {
    currentView = "products"
    renderApp()
  })

  document.getElementById("new-group-button").addEventListener("click", () => {
    showNewAlternativeGroupModal()
  })

  document.querySelectorAll(".edit-group-button").forEach(btn => {
    btn.addEventListener("click", () => {
      const groupId = btn.dataset.id
      const group = session.alternativeGroups.find(g => g.id === groupId)
      showEditAlternativeGroupModal(group)
    })
  })

  document.querySelectorAll(".delete-group-button").forEach(btn => {
    btn.addEventListener("click", () => {
      const groupId = btn.dataset.id
      showDeleteAlternativeGroupModal(groupId)
    })
  })
}

// Alternative Group Modals
function showNewAlternativeGroupModal() {
  const session = sessions.find((s) => s.id === currentSession)
  const products = session.products

  const modal = document.createElement("div")
  modal.innerHTML = `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
      <div id="modalContent" class="card-bg rounded-lg shadow-lg w-full max-w-2xl mx-4 p-6 flex flex-col max-h-[90vh]">
        <h3 class="text-lg font-medium card-text mb-4">${t("alternatives.newGroup")}</h3>
        
        <div class="mb-4">
          <label class="block text-sm font-medium secondary-text mb-1">${t("alternatives.groupName")}</label>
          <input type="text" id="group-name" placeholder="${t("alternatives.groupNamePlaceholder")}" class="w-full px-4 py-2 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500">
        </div>

        <div class="mb-4 card-bg border border-default rounded-lg p-3">
          <div class="flex">
            <svg class="h-5 w-5 muted-text mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            <p class="text-sm muted-text">${t("alternatives.quantityInfo")}</p>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto mb-4">
          <label class="block text-sm font-medium secondary-text mb-2">${t("alternatives.options")}</label>
          <div id="options-container" class="space-y-4">
            <!-- Options will be added here -->
          </div>
          <button id="add-option-button" class="mt-2 text-sm text-blue-600 hover:muted-text font-medium flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            ${t("alternatives.addOption")}
          </button>
        </div>

        <div class="flex justify-end space-x-4 pt-4 border-t">
          <button id="cancel-button" class="px-4 py-2 secondary-text font-medium hover:secondary-bg cursor-pointer rounded">${t("common.cancel")}</button>
          <button id="save-button" class="px-4 py-2 primary-bg primary-text font-medium cursor-pointer rounded flex items-center">${t("common.save")}</button>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  let optionCount = 0
  const addOption = (initialProducts = []) => {
    optionCount++
    const optionId = `option-${Date.now()}-${optionCount}`
    const div = document.createElement('div')
    div.className = "secondary-bg p-3 rounded-lg border border-default relative"
    div.innerHTML = `
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm font-semibold secondary-text">Option ${optionCount}</span>
        <button class="text-red-500 hover:text-red-700 remove-option-btn">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="space-y-2 max-h-64 overflow-y-auto">
        ${products.map(p => {
          const initialProd = initialProducts.find(ip => ip.productId === p.id)
          return `
          <div class="flex items-center gap-2">
            <input type="checkbox" id="${optionId}-prod-${p.id}" value="${p.id}" class="product-checkbox h-4 w-4 accent-gray-800 border-default rounded focus:ring-gray-500" ${initialProd ? 'checked' : ''}>
            <label for="${optionId}-prod-${p.id}" class="flex-1 text-sm secondary-text truncate">${p.name}</label>
            <input type="number" id="${optionId}-qty-${p.id}" min="1" step="1" value="${initialProd ? initialProd.quantity : 1}" class="qty-input w-16 px-2 py-1 border border-default input-bg card-text rounded text-sm ${initialProd ? '' : 'hidden'}">
          </div>
        `}).join('')}
      </div>
    `
    
    div.querySelector('.remove-option-btn').addEventListener('click', () => {
      div.remove()
    })

    // Toggle quantity input visibility when checkbox changes
    div.querySelectorAll('.product-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const prodId = e.target.value
        const qtyInput = div.querySelector(`#${optionId}-qty-${prodId}`)
        if (qtyInput) {
          qtyInput.classList.toggle('hidden', !e.target.checked)
        }
      })
    })

    document.getElementById('options-container').appendChild(div)
  }

  // Add two initial empty options
  addOption()
  addOption()

  document.getElementById('add-option-button').addEventListener('click', () => addOption())

  // Modal closing logic
  const closeModal = () => {
    clearAllErrors(modal)
    document.body.removeChild(modal)
  }

  const saveGroup = () => {
    clearAllErrors(modal)

    // Validate Group Name
    if (!validateRequiredField('group-name', 'Group Name')) {
      return
    }

    const name = document.getElementById('group-name').value.trim()

    const options = []
    let hasEmptyOption = false
    document.querySelectorAll('#options-container > div').forEach(optDiv => {
      const products = []
      optDiv.querySelectorAll('.product-checkbox:checked').forEach(cb => {
        const productId = cb.value
        const qtyInput = optDiv.querySelector(`[id$="-qty-${productId}"]`)
        const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1
        products.push({ productId, quantity })
      })
      
      if (products.length > 0) {
        options.push({ products })
      } else {
        // Mark empty options visually? Or just ignore them but warn if total valid options < 2
        // Let's mark them as invalid if we need to enforce "at least 1 product per option" for *existing* option blocks
        // But maybe user added an option block and didn't select anything yet.
        // The requirement is "dont au moins 1 par option et au moins 2 options"
        // So every visible option block MUST have at least 1 product? Or we just filter out empty ones?
        // "dont au moins 1 par option" suggests every defined option must be valid.
        optDiv.classList.add('border-red-500')
        hasEmptyOption = true
      }
    })

    if (hasEmptyOption) {
      // Show a general error or alert?
      // Let's add a message at the bottom
      const container = document.getElementById('options-container')
      let errorMsg = container.nextElementSibling
      if (!errorMsg || !errorMsg.classList.contains('field-error-message')) {
        errorMsg = document.createElement('p')
        errorMsg.className = 'field-error-message text-sm text-red-600 mt-1'
        container.parentNode.insertBefore(errorMsg, container.nextSibling)
      }
      errorMsg.textContent = 'Each option must have at least one product selected.'
      return
    } else {
      // Clear error
      const container = document.getElementById('options-container')
      const errorMsg = container.nextElementSibling
      if (errorMsg && errorMsg.classList.contains('field-error-message')) {
        errorMsg.remove()
      }
      document.querySelectorAll('#options-container > div').forEach(d => d.classList.remove('border-red-500'))
    }

    if (options.length < 2) {
      const container = document.getElementById('options-container')
      let errorMsg = container.nextElementSibling
      if (!errorMsg || !errorMsg.classList.contains('field-error-message')) {
        errorMsg = document.createElement('p')
        errorMsg.className = 'field-error-message text-sm text-red-600 mt-1'
        container.parentNode.insertBefore(errorMsg, container.nextSibling)
      }
      errorMsg.textContent = 'Please add at least two options with selected products.'
      return
    }

    SidebarAPI.createAlternativeGroup(currentSession, { name, options }).then(response => {
      sessions = response.sessions
      closeModal()
      renderAlternativesView()
    })
  }

  // Setup UX improvements
  setupAutoFocus(modal)
  setupEscapeKey(modal, closeModal)
  setupEnterKey(modal, saveGroup)

  document.getElementById('modalOverlay').addEventListener('click', closeModal)
  document.getElementById('modalContent').addEventListener('click', e => e.stopPropagation())
  document.getElementById('cancel-button').addEventListener('click', closeModal)
  document.getElementById('save-button').addEventListener('click', saveGroup)
}

function showEditAlternativeGroupModal(group) {
  const session = sessions.find((s) => s.id === currentSession)
  const products = session.products

  const modal = document.createElement("div")
  modal.innerHTML = `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
      <div id="modalContent" class="card-bg rounded-lg shadow-lg w-full max-w-2xl mx-4 p-6 flex flex-col max-h-[90vh]">
        <h3 class="text-lg font-medium card-text mb-4">${t("alternatives.editGroup")}</h3>
        
        <div class="mb-4">
          <label class="block text-sm font-medium secondary-text mb-1">${t("alternatives.groupName")}</label>
          <input type="text" id="group-name" value="${group.name}" class="w-full px-4 py-2 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500">
        </div>

        <div class="mb-4 card-bg border border-default rounded-lg p-3">
          <div class="flex">
            <svg class="h-5 w-5 muted-text mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            <p class="text-sm muted-text">${t("alternatives.quantityInfo")}</p>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto mb-4">
          <label class="block text-sm font-medium secondary-text mb-2">${t("alternatives.options")}</label>
          <div id="options-container" class="space-y-4">
            <!-- Options will be added here -->
          </div>
          <button id="add-option-button" class="mt-2 text-sm text-blue-600 hover:muted-text font-medium flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            ${t("alternatives.addOption")}
          </button>
        </div>

        <div class="flex justify-end space-x-4 pt-4 border-t">
          <button id="cancel-button" class="px-4 py-2 secondary-text font-medium hover:secondary-bg cursor-pointer rounded">${t("common.cancel")}</button>
          <button id="save-button" class="px-4 py-2 primary-bg primary-text font-medium cursor-pointer rounded flex items-center">${t("common.save")}</button>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  let optionCount = 0
  const addOption = (initialProducts = []) => {
    optionCount++
    const optionId = `option-${Date.now()}-${optionCount}`
    const div = document.createElement('div')
    div.className = "secondary-bg p-3 rounded-lg border border-default relative"
    div.innerHTML = `
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm font-semibold secondary-text">Option ${optionCount}</span>
        <button class="text-red-500 hover:text-red-700 remove-option-btn">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="space-y-2 max-h-64 overflow-y-auto">
        ${products.map(p => {
          const initialProd = initialProducts.find(ip => ip.productId === p.id)
          return `
          <div class="flex items-center gap-2">
            <input type="checkbox" id="${optionId}-prod-${p.id}" value="${p.id}" class="product-checkbox h-4 w-4 accent-gray-800 border-default rounded focus:ring-gray-500" ${initialProd ? 'checked' : ''}>
            <label for="${optionId}-prod-${p.id}" class="flex-1 text-sm secondary-text truncate">${p.name}</label>
            <input type="number" id="${optionId}-qty-${p.id}" min="1" step="1" value="${initialProd ? initialProd.quantity : 1}" class="qty-input w-16 px-2 py-1 border border-default input-bg card-text rounded text-sm ${initialProd ? '' : 'hidden'}">
          </div>
        `}).join('')}
      </div>
    `
    
    div.querySelector('.remove-option-btn').addEventListener('click', () => {
      div.remove()
    })

    // Toggle quantity input visibility when checkbox changes
    div.querySelectorAll('.product-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const prodId = e.target.value
        const qtyInput = div.querySelector(`#${optionId}-qty-${prodId}`)
        if (qtyInput) {
          qtyInput.classList.toggle('hidden', !e.target.checked)
        }

      })
    })

    document.getElementById('options-container').appendChild(div)
  }

  // Load existing options
  if (group.options && group.options.length > 0) {
    group.options.forEach(opt => addOption(opt.products))
  } else {
    addOption()
  }

  document.getElementById('add-option-button').addEventListener('click', () => addOption())

  // Modal closing logic
  const closeModal = () => {
    clearAllErrors(modal)
    document.body.removeChild(modal)
  }

  const saveGroup = () => {
    clearAllErrors(modal)

    // Validate Group Name
    if (!validateRequiredField('group-name', 'Group Name')) {
      return
    }

    const name = document.getElementById('group-name').value.trim()

    const options = []
    let hasEmptyOption = false
    document.querySelectorAll('#options-container > div').forEach(optDiv => {
      const products = []
      optDiv.querySelectorAll('.product-checkbox:checked').forEach(cb => {
        const productId = cb.value
        const qtyInput = optDiv.querySelector(`[id$="-qty-${productId}"]`)
        const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1
        products.push({ productId, quantity })
      })
      
      if (products.length > 0) {
        options.push({ products })
      } else {
        optDiv.classList.add('border-red-500')
        hasEmptyOption = true
      }
    })

    if (hasEmptyOption) {
      const container = document.getElementById('options-container')
      let errorMsg = container.nextElementSibling
      if (!errorMsg || !errorMsg.classList.contains('field-error-message')) {
        errorMsg = document.createElement('p')
        errorMsg.className = 'field-error-message text-sm text-red-600 mt-1'
        container.parentNode.insertBefore(errorMsg, container.nextSibling)
      }
      errorMsg.textContent = 'Each option must have at least one product selected.'
      return
    } else {
      // Clear error
      const container = document.getElementById('options-container')
      const errorMsg = container.nextElementSibling
      if (errorMsg && errorMsg.classList.contains('field-error-message')) {
        errorMsg.remove()
      }
      document.querySelectorAll('#options-container > div').forEach(d => d.classList.remove('border-red-500'))
    }

    if (options.length < 2) {
      const container = document.getElementById('options-container')
      let errorMsg = container.nextElementSibling
      if (!errorMsg || !errorMsg.classList.contains('field-error-message')) {
        errorMsg = document.createElement('p')
        errorMsg.className = 'field-error-message text-sm text-red-600 mt-1'
        container.parentNode.insertBefore(errorMsg, container.nextSibling)
      }
      errorMsg.textContent = 'Please add at least two options with selected products.'
      return
    }

    SidebarAPI.updateAlternativeGroup(currentSession, group.id, { name, options }).then(response => {
      sessions = response.sessions
      closeModal()
      renderAlternativesView()
    })
  }

  // Setup UX improvements
  setupAutoFocus(modal)
  setupEscapeKey(modal, closeModal)
  setupEnterKey(modal, saveGroup)

  document.getElementById('modalOverlay').addEventListener('click', closeModal)
  document.getElementById('modalContent').addEventListener('click', e => e.stopPropagation())
  document.getElementById('cancel-button').addEventListener('click', closeModal)
  document.getElementById('save-button').addEventListener('click', saveGroup)
}
function showDeleteAlternativeGroupModal(groupId) {
  const modal = document.createElement("div")
  modal.innerHTML = `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
      <div id="modalContent" class="card-bg rounded-lg shadow-lg w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-medium card-text mb-4">${t("alternatives.deleteGroup")}</h3>
        <p class="muted-text mb-6">${t("alternatives.confirmDelete")}</p>
        
        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 secondary-text font-medium hover:secondary-bg cursor-pointer rounded">${t("common.cancel")}</button>
          <button id="delete-button" class="px-4 py-2 primary-bg primary-text font-medium cursor-pointer rounded flex items-center">${t("alternatives.deleteButton")}</button>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  const close = () => document.body.removeChild(modal)
  document.getElementById('modalOverlay').addEventListener('click', close)
  document.getElementById('modalContent').addEventListener('click', e => e.stopPropagation())
  document.getElementById('cancel-button').addEventListener('click', close)

  document.getElementById('delete-button').addEventListener('click', () => {
    SidebarAPI.deleteAlternativeGroup(currentSession, groupId).then(response => {
      sessions = response.sessions
      close()
      renderAlternativesView()
    })
  })
}

// Initialize the app
document.addEventListener("DOMContentLoaded", init)
