const app = document.getElementById("app")

async function init() {
  browser.storage.local.get(["darkMode"]).then((settings) => {
    if (settings.darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  })

  await initI18n()

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
            showScrapedDataModal()
          }
        });
      });
    }
  })
}

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
            <span class="icon icon-import h-8 w-8"></span>
          </button>
          <button class="muted-text p-2 cursor-pointer" id="settings-button" title="${t("common.settings")}">
            <span class="icon icon-settings h-8 w-8"></span>
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
                  <span class="icon icon-export h-6 w-6"></span>
                </button>
                <button class="muted-text p-1 cursor-pointer edit-button" data-id="${session.id}" title="${t("sessions.editSession")}">
                  <span class="icon icon-edit h-6 w-6"></span>
                </button>
                <button class="muted-text p-1 cursor-pointer delete-button" data-id="${session.id}" title="${t("sessions.deleteSession")}">
                  <span class="icon icon-delete h-6 w-6"></span>
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- New Session Button -->
      <button id="new-session-button" class="cursor-pointer mt-6 w-full flex items-center justify-center space-x-2 secondary-bg secondary-text px-4 py-3 rounded-xl hover:opacity-80 transition-colors duration-200 shadow-sm">
        <span class="icon icon-plus h-5 w-5"></span>
        <span class="text-lg font-medium">${t("sessions.createNew")}</span>
      </button>
    </div>
  `

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
            <span class="icon icon-back h-8 w-8"></span>
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
                <h2 class="text-xl font-medium card-text truncate">${product.name}${(session.manageQuantity !== false && product.quantity && product.quantity > 1) ? ` (×${product.quantity})` : ''}</h2>
                <p class="muted-text text-md truncate">
                  ${product.pages.length} ${t("products.pages")}
                  ${session.bundles && session.bundles.some(b => b.products && b.products.some(bp => bp.productId === product.id)) 
                    ? ` • ${session.bundles.filter(b => b.products && b.products.some(bp => bp.productId === product.id)).length} ${t("products.bundles")}` 
                    : ''}
                </p>
              </div>
              <div class="flex space-x-2 flex-shrink-0">
                <button class="muted-text p-1 cursor-pointer edit-button" data-id="${product.id}">
                  <span class="icon icon-edit h-6 w-6"></span>
                </button>
                <button class="muted-text p-1 cursor-pointer delete-button" data-id="${product.id}">
                  <span class="icon icon-delete h-6 w-6"></span>
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Action Buttons -->
      <div class="flex space-x-4 mt-6">
        <button id="new-product-button" class="flex-1 flex items-center justify-center space-x-2 cursor-pointer secondary-bg secondary-text px-4 py-3 rounded-xl hover:opacity-80 transition-colors duration-200 shadow-sm">
          <span class="icon icon-plus h-5 w-5"></span>
          <span class="text-lg font-medium">${t("products.newProduct")}</span>
        </button>
      </div>
      
      <div class="flex space-x-4 mt-4">
        <button id="edit-rules-button" class="flex-1 flex items-center justify-center space-x-2 cursor-pointer secondary-bg secondary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm border border-default">
          <span class="icon icon-delivery_rules h-5 w-5"></span>
          <span class="text-lg font-medium">${t("products.deliveryRules")}</span>
        </button>
        <button id="manage-alternatives-button" class="flex-1 flex items-center justify-center space-x-2 cursor-pointer secondary-bg secondary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm border border-default">
          <span class="icon icon-alternatives h-5 w-5"></span>
          <span class="text-lg font-medium">${t("products.manageAlternatives")}</span>
        </button>
      </div>

      <div class="flex space-x-4 my-4">
        <button id="optimize-button" class="flex-1 flex items-center justify-center space-x-2 cursor-pointer primary-bg primary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm">
          <span class="icon icon-optimize h-5 w-5"></span>
          <span class="text-lg font-medium">${t("products.optimize")}</span>
        </button>
      </div>
    </div>
  `

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
    SidebarAPI.optimizeSession(currentSession).then((result) => {
        if (result.success) {
          SidebarAPI.showOptimizationResults(result.result)
        } else {
          alert(`${t("optimization.failed")}: ${result.error}`)
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
        const productId = item.dataset.id
        currentProduct = productId
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
            <span class="icon icon-back h-8 w-8"></span>
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
                    ${page.insurancePrice > 0 ? `<p class="muted-text">${t("pages.insurance")}: ${page.insurancePrice} ${page.currency || ""}</p>` : ''}
                    ${page.itemsPerPurchase && page.itemsPerPurchase > 1 ? `<p class="muted-text">${t("pages.qtyPerPurchase")}: ${page.itemsPerPurchase}</p>` : ''}
                    ${page.maxPerPurchase ? `<p class="muted-text">${t("pages.maxPurchases")}: ${page.maxPerPurchase}</p>` : ''}
                  </div>
                </div>
                <div class="flex items-start space-x-2">
                  <button class="muted-text p-1 cursor-pointer open-page-button" data-url="${page.url}" title="${t("pages.openInNewTab")}">
                    <span class="icon icon-open_external h-6 w-6"></span>
                  </button>
                  <button class="muted-text p-1 cursor-pointer edit-page-button" data-id="${page.id}" title="${t("pages.editPageTitle")}">
                    <span class="icon icon-edit h-6 w-6"></span>
                  </button>
                  <button class="muted-text p-1 cursor-pointer delete-page-button" data-id="${page.id}" title="${t("pages.deletePageTitle")}">
                    <span class="icon icon-delete h-6 w-6"></span>
                  </button>
                </div>
              </div>
            </div>
            `).join('')}
            ${session.bundles && session.bundles.filter(b => b.products && b.products.some(bp => bp.productId === product.id)).map(bundle => `
            <div class="secondary-bg border border-default rounded-xl shadow-md p-4">
              <div class="flex justify-between items-start">
                <div class="flex-1 min-w-0 mr-4">
                  <div class="flex items-center space-x-2">
                    <span class="card-bg secondary-text text-xs font-semibold px-2.5 py-0.5 rounded border border-default">${t("products.bundle").toUpperCase()}</span>
                    <p class="text-lg font-medium card-text truncate">${bundle.seller || bundle.url}</p>
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
                              return prod ? `<li class="text-sm muted-text">• ${prod.name} ${(session.manageQuantity !== false && bp.quantity > 1) ? `(x${bp.quantity})` : ''}</li>` : ''
                            }).join('')
                          : `<li class="text-sm muted-text">${t("pages.noProducts")}</li>`
                        }
                      </ul>
                    </div>
                  </div>
                </div>
                <div class="flex items-start space-x-2">
                  <button class="muted-text p-1 cursor-pointer open-page-button" data-url="${bundle.url}" title="${t("pages.openInNewTab")}">
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
            `).join('')}
            `
          : `<div class="card-bg rounded-xl shadow-md p-6 muted-text text-center">${t("pages.noPages")}</div>`
        }
      </div>

      <!-- Add Page Button -->
      <button id="add-page-button" class="w-full mt-6 flex items-center justify-center space-x-2 cursor-pointer primary-bg primary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm">
        <span class="icon icon-plus h-5 w-5"></span>
        <span class="text-lg font-medium">${t("pages.addPage")}</span>
      </button>
    </div>
  `

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
          <span class="icon icon-back h-8 w-8"></span>
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
          <div class="toggle-switch"></div>
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
          if (darkMode) {
            document.documentElement.classList.add("dark")
          } else {
            document.documentElement.classList.remove("dark")
          }

          if (language !== getCurrentLanguage()) {
            await setLanguage(language)
          }

          currentView = "sessions"
          renderApp()
        })
    })
  })
}

function showNewSessionModal() {
  const modal = document.createElement("div")
    modal.innerHTML = `
      <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
        <div id="modalContent" class="card-bg rounded-lg shadow-lg w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
          <h3 class="text-lg font-medium card-text mb-4">${t("sessions.newSession")}</h3>
          <div class="mb-6">
            <input 
              type="text" 
              id="session-name" 
              placeholder="${t("sessions.enterSessionName")}" 
              class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            >
          </div>
          <div class="mb-6 flex items-center justify-between">
            <label class="text-sm font-medium secondary-text">${t("sessions.manageQuantities")}</label>
            <div class="flex items-center">
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="manage-quantities" class="sr-only peer">
                <div class="toggle-switch"></div>
              </label>
            </div>
          </div>

          <div class="mb-6 flex items-center justify-between">
            <label class="text-sm font-medium secondary-text">${t("sessions.ImportFeesManagement")}</label>
            <div class="flex items-center">
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="import-fees-management" class="sr-only peer">
                <div class="toggle-switch"></div>
              </label>
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

  const closeModal = () => {
    clearAllErrors(modal)
    document.body.removeChild(modal)
  }

  const saveSession = () => {
    clearAllErrors(modal)
    
    if (!validateRequiredField('session-name', t("sessions.sessionName"))) {
      return
    }
    
    const name = document.getElementById("session-name").value.trim()
    const manageQuantity = document.getElementById("manage-quantities").checked
    const importFeesEnabled = document.getElementById("import-fees-management").checked
    
    if (sessions.some(s => s.name === name)) {
      showFieldError('session-name', t("sessions.sessionExists"))
      return
    }

    const session = {
      name,
      manageQuantity,
      importFeesEnabled,
    }

    SidebarAPI.createSession(session).then((response) => {
      sessions = response.sessions
      currentSession = response.currentSession
      closeModal()
      renderApp()
    })
  }

  setupAutoFocus(modal)
  setupEscapeKey(modal, closeModal)
  setupEnterKey(modal, saveSession)
  const overlayEl = document.getElementById('modalOverlay')
  const contentEl = document.getElementById('modalContent')
  if (overlayEl) {
    overlayEl.addEventListener('click', closeModal)
  }
  if (contentEl) {
    contentEl.addEventListener('click', (ev) => ev.stopPropagation())
  }

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
        <div id="modalContent" class="card-bg rounded-lg shadow-lg w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
          <h3 class="text-lg font-medium card-text mb-4">${t("sessions.editSession")}</h3>
          <div class="mb-6">
            <input 
              type="text" 
              id="session-name" 
              value="${session.name}"
              class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            >
          </div>

          <div class="mb-6 flex items-center justify-between">
            <label class="text-sm font-medium secondary-text">${t("sessions.manageQuantities")}</label>
            <div class="flex items-center">
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="manage-quantities" class="sr-only peer" ${session.manageQuantity !== false ? "checked" : ""}>
                <div class="toggle-switch"></div>
              </label>
            </div>
          </div>

          <div class="mb-6 flex items-center justify-between">
            <label class="text-sm font-medium secondary-text">${t("sessions.ImportFeesManagement")}</label>
            <div class="flex items-center">
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="import-fees-management" class="sr-only peer" ${session.importFeesEnabled ? "checked" : ""}>
                <div class="toggle-switch"></div>
              </label>
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

  const closeModal = () => {
    clearAllErrors(modal)
    document.body.removeChild(modal)
  }

  const saveSession = () => {
    clearAllErrors(modal)
    
    if (!validateRequiredField('session-name', t("sessions.sessionName"))) {
      return
    }
    
    const name = modal.querySelector("#session-name").value.trim()
    const manageQuantity = modal.querySelector("#manage-quantities").checked
    const importFeesEnabled = modal.querySelector("#import-fees-management").checked
    
    const updatedSession = { ...session }
    
    updatedSession.name = name
    updatedSession.manageQuantity = manageQuantity
    updatedSession.importFeesEnabled = importFeesEnabled

    SidebarAPI.updateSession(session.id, updatedSession).then((response) => {
      sessions = response.sessions
      closeModal()
      renderApp()
    })
  }

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
    SidebarAPI.deleteSession(sessionId).then((response) => {
      sessions = response.sessions
      currentSession = response.currentSession
      document.body.removeChild(modal)
      renderApp()
    })
  })
}

function showNewProductModal() {
  const session = sessions.find(s => s.id === currentSession)
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

        ${session.manageQuantity !== false ? `
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
        ` : ''}

        <div class="mb-6">
          <button id="toggle-compatibility" class="text-sm secondary-text hover:opacity-80 font-medium flex items-center cursor-pointer">
            <span class="icon icon-chevron_down h-4 w-4 mr-1"></span>
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

  const toggleBtn = document.getElementById('toggle-compatibility')
  const compatSection = document.getElementById('limited-compatibility-section')
  
  toggleBtn.addEventListener('click', () => {
    if (compatSection.style.display === 'none') {
      compatSection.style.display = 'block'
      toggleBtn.innerHTML = `
        <span class="icon icon-chevron_up h-4 w-4 mr-1"></span>
        ${t("modals.hideCompatibility")}
      `
    } else {
      compatSection.style.display = 'none'
      toggleBtn.innerHTML = `
        <span class="icon icon-chevron_down h-4 w-4 mr-1"></span>
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
    
    if (!validateRequiredField('product-name', t("products.productName"))) {
      return
    }
    
    const name = document.getElementById("product-name").value.trim()
    const quantityInput = document.getElementById("product-quantity")
    const quantity = quantityInput ? (parseInt(quantityInput.value) || 1) : 1

    const compatibleProducts = []
    document.querySelectorAll('#compatible-products-list input.compat-checkbox:checked').forEach(cb => compatibleProducts.push(cb.value))

    SidebarAPI.createProduct(currentSession, {
      name,
      quantity,
      limitedCompatibilityWith: compatibleProducts,
    }).then((response) => {
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

  setupAutoFocus(modal)
  setupEscapeKey(modal, closeModal)
  setupEnterKey(modal, saveProduct)

  const overlayEl = document.getElementById('modalOverlay')
  const contentEl = document.getElementById('modalContent')
  if (overlayEl) {
    overlayEl.addEventListener('click', closeModal)
  }
  if (contentEl) {
    contentEl.addEventListener('click', (ev) => ev.stopPropagation())
  }

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
  const session = sessions.find(s => s.id === currentSession)
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

        ${session.manageQuantity !== false ? `
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
        ` : ''}

        ${sessions.find(s => s.id === currentSession).alternativeGroups && sessions.find(s => s.id === currentSession).alternativeGroups.some(g => g.options.some(opt => opt.products?.some(p => p.productId === product.id))) ? `
          <div class="mb-6 secondary-bg border border-default rounded-lg p-3">
            <div class="flex">
              <span class="icon icon-warning h-5 w-5 muted-text mr-2 flex-shrink-0"></span>
              <p class="text-sm secondary-text">${t("modals.alternativeGroupWarning")}</p>
            </div>
          </div>
        ` : ''}

        <div class="mb-6">
          <button id="toggle-compatibility" class="text-sm secondary-text hover:opacity-80 font-medium flex items-center cursor-pointer">
            <span class="icon icon-chevron_down h-4 w-4 mr-1"></span>
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

  const toggleBtn = document.getElementById('toggle-compatibility')
  const compatSection = document.getElementById('limited-compatibility-section')
  
  const hasSelections = product.limitedCompatibilityWith && product.limitedCompatibilityWith.length > 0
  if (hasSelections) {
    compatSection.style.display = 'block'
    toggleBtn.innerHTML = `
      <span class="icon icon-chevron_up h-4 w-4 mr-1"></span>
      ${t("modals.hideCompatibility")}
    `
  }

  toggleBtn.addEventListener('click', () => {
    if (compatSection.style.display === 'none') {
      compatSection.style.display = 'block'
      toggleBtn.innerHTML = `
        <span class="icon icon-chevron_up h-4 w-4 mr-1"></span>
        ${t("modals.hideCompatibility")}
      `
    } else {
      compatSection.style.display = 'none'
      toggleBtn.innerHTML = `
        <span class="icon icon-chevron_down h-4 w-4 mr-1"></span>
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
    
    if (!validateRequiredField('product-name', t("products.productName"))) {
      return
    }
    
    const name = document.getElementById("product-name").value.trim()
    const quantityInput = document.getElementById("product-quantity")
    const quantity = quantityInput ? (parseInt(quantityInput.value) || 1) : 1
    
    const compatibleProducts = []
    document.querySelectorAll('#compatible-products-list input.compat-checkbox:checked').forEach(cb => {
      if (cb.disabled) return
      compatibleProducts.push(cb.value)
    })

    const session = sessions.find(s => s.id === currentSession)

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

    SidebarAPI.updateSession(currentSession, session).then((response) => {
      sessions = response.sessions
      closeModal()
      renderApp()
    })
  }

  setupAutoFocus(modal)
  setupEscapeKey(modal, closeModal)
  setupEnterKey(modal, saveProduct)
  document.querySelector("#modalOverlay")?.addEventListener("click", closeModal)
  document.querySelector("#modalContent")?.addEventListener("click", (event) => {
    event.stopPropagation()
  })

  document.getElementById("cancel-button").addEventListener("click", closeModal)

  document.getElementById("save-button").addEventListener("click", saveProduct)
}

function showEditPageModal(page) {
  const session = sessions.find(s => s.id === currentSession)
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
          <label for="page-insurance" class="block text-sm font-medium secondary-text mb-1">${t("modals.insurancePrice")}</label>
          <input 
            type="text" 
            id="page-insurance" 
            value="${page.insurancePrice || ""}"
            placeholder="${t("modals.enterInsurance")}"
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
          <label for="page-seller" class="block text-sm font-medium secondary-text mb-1">${t("modals.seller")}</label>
          <input 
            type="text" 
            id="page-seller" 
            value="${page.seller || ""}"
            placeholder="${t("modals.enterSeller")}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        ${session.importFeesEnabled ? `
        <div class="mb-6">
          <div class="flex items-center mb-1">
            <label for="customs-category" class="text-sm font-medium secondary-text">${t("modals.customsCategory")}</label>
            <div class="ml-2 icon icon-help w-4 h-4 secondary-text cursor-help" title="${t("modals.howToAddCategory")}"></div>
          </div>
          <select 
            id="customs-category" 
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
            <option value="">${t("modals.noCustomsDuties")}</option>
            ${(session.customsCategories || []).map(cat => `<option value="${cat.id}" ${page.customsCategoryId === cat.id ? 'selected' : ''}>${cat.name}</option>`).join('')}
          </select>
        </div>
        ` : ''}

        ${session.manageQuantity !== false ? `
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
        ` : ''}

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
    const insurancePrice = document.getElementById("page-insurance").value
    const seller = document.getElementById("page-seller").value
    const currency = document.getElementById("page-currency").value
    const itemsPerPurchaseValue = document.getElementById("items-per-purchase")?.value
    const itemsPerPurchase = itemsPerPurchaseValue ? parseInt(itemsPerPurchaseValue) : null
    const maxPerPurchaseValue = document.getElementById("max-per-purchase")?.value
    const maxPerPurchase = maxPerPurchaseValue ? parseInt(maxPerPurchaseValue) : null
    const customsCategoryElement = document.getElementById("customs-category")
    const customsCategoryId = customsCategoryElement ? (customsCategoryElement.value || null) : null

    let isValid = true
    if (currency !== 'FREE') {
      if (!validateRequiredField('page-price', t("pages.price"))) isValid = false
      if (!validateRequiredField('page-shipping', t("modals.shippingPrice"))) isValid = false
      if (!validateRequiredField('page-insurance', t("modals.insurancePrice"))) isValid = false
    }
    if (!validateRequiredField('page-seller', t("pages.seller"))) isValid = false
    
    if (session.manageQuantity !== false) {
      if (!itemsPerPurchaseValue) {
        showFieldError('items-per-purchase', t("modals.itemsPerPurchaseRequired"))
        isValid = false
      } else if (itemsPerPurchase < 1) {
        showFieldError('items-per-purchase', t("modals.minOne"))
        isValid = false
      }

      if (maxPerPurchase !== null && maxPerPurchase < 1) {
        showFieldError('max-per-purchase', t("modals.minOne"))
        isValid = false
      }
    }
    
    if (!isValid) return

    const updatedPage = {
      price,
      shippingPrice,
      insurancePrice,
      seller,
      currency,
      itemsPerPurchase,
      ...(maxPerPurchase !== null && { maxPerPurchase }),
      ...(customsCategoryId && { customsCategoryId }),
    }

    SidebarAPI.updatePage(currentSession, currentProduct, page.id, updatedPage).then((response) => {
      sessions = response.sessions
      closeModal()
      renderApp()
    })
  }

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
        <h3 class="text-lg font-medium card-text mb-4">${t("bundles.editBundle")}</h3>
        
        <div class="mb-6">
          <label for="page-url" class="block text-sm font-medium secondary-text mb-1">${t("pages.url")}</label>
          <input 
            type="text" 
            id="page-url" 
            value="${bundle.url}" 
            readonly
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label class="block text-sm font-medium secondary-text mb-2">${t("modals.selectProductsInBundle")}</label>
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
                ${session.manageQuantity !== false ? `
                <input type="number" 
                  id="bundle-product-qty-${p.id}" 
                  min="1" 
                  step="1" 
                  value="${productQty}"
                  class="bundle-edit-qty w-20 px-2 py-1 border border-default input-bg card-text rounded text-sm ${isChecked ? '' : 'hidden'}"
                  placeholder="${t("modals.qtyPlaceholder")}"
                >
                ` : ''}
              </div>
            `
                }
              )
              .join("")}
          </div>
        </div>

        <div class="mb-6">
          <label for="page-price" class="block text-sm font-medium secondary-text mb-1">${t("pages.price")}</label>
          <input 
            type="text" 
            id="page-price" 
            value="${bundle.price || ""}"
            placeholder="${t("modals.enterPrice")}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="page-shipping" class="block text-sm font-medium secondary-text mb-1">${t("modals.shippingPrice")}</label>
          <input 
            type="text" 
            id="page-shipping" 
            value="${bundle.shippingPrice || ""}"
            placeholder="${t("modals.enterShipping")}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="page-insurance" class="block text-sm font-medium secondary-text mb-1">${t("modals.insurancePrice")}</label>
          <input 
            type="text" 
            id="page-insurance" 
            value="${bundle.insurancePrice || ""}"
            placeholder="${t("modals.enterInsurance")}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="page-currency" class="block text-sm font-medium secondary-text mb-1">${t("pages.currency")}</label>
          <select 
            id="page-currency" 
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
            <option value="FREE" ${bundle.currency === "FREE" ? "selected" : ""}>${t("pages.free")}</option>
            ${CURRENCIES.map(c => `<option value="${c.code}" ${bundle.currency === c.code ? "selected" : ""}>${c.label} - ${c.symbol}</option>`).join('')}
          </select>
        </div>

        <div class="mb-6">
          <label for="page-seller" class="block text-sm font-medium secondary-text mb-1">${t("pages.seller")}</label>
          <input 
            type="text" 
            id="page-seller" 
            value="${bundle.seller || ""}"
            placeholder="${t("modals.enterSeller")}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        ${session.importFeesEnabled ? `
        <div class="mb-6">
          <div class="flex items-center mb-1">
            <label for="customs-category" class="text-sm font-medium secondary-text">${t("modals.customsCategory")}</label>
            <div class="ml-2 icon icon-help w-4 h-4 secondary-text cursor-help" title="${t("modals.howToAddCategory")}"></div>
          </div>
          <select 
            id="customs-category" 
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
            <option value="">${t("modals.noCustomsDuties")}</option>
            ${(session.customsCategories || []).map(cat => `<option value="${cat.id}" ${bundle.customsCategoryId === cat.id ? 'selected' : ''}>${cat.name}</option>`).join('')}
          </select>
        </div>
        ` : ''}

        ${session.manageQuantity !== false ? `
        <div class="mb-6">
          <label for="items-per-purchase" class="block text-sm font-medium secondary-text mb-1">${t("modals.itemsPerPurchase")}</label>
          <input 
            type="number" 
            id="items-per-purchase" 
            value="${bundle.itemsPerPurchase || 1}"
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
            value="${bundle.maxPerPurchase || ""}"
            min="1"
            step="1"
            placeholder="${t("modals.leaveEmptyIfUnlimited")}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
          <p class="mt-1 text-sm muted-text">${t("modals.maxPerPurchaseHelpBundle")}</p>
        </div>
        ` : ''}

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
    const insurancePrice = document.getElementById("page-insurance").value
    const seller = document.getElementById("page-seller").value
    const currency = document.getElementById("page-currency").value
    const itemsPerPurchaseValue = document.getElementById("items-per-purchase")?.value
    const itemsPerPurchase = itemsPerPurchaseValue ? parseInt(itemsPerPurchaseValue) : null
    const maxPerPurchaseValue = document.getElementById("max-per-purchase")?.value
    const maxPerPurchase = maxPerPurchaseValue ? parseInt(maxPerPurchaseValue) : null
    const customsCategoryElement = document.getElementById("customs-category")
    const customsCategoryId = customsCategoryElement ? (customsCategoryElement.value || null) : null
    
    let isValid = true
    if (currency !== 'FREE') {
      if (!validateRequiredField('page-price', t("pages.price"))) isValid = false
      if (!validateRequiredField('page-shipping', t("modals.shippingPrice"))) isValid = false
      if (!validateRequiredField('page-insurance', t("modals.insurancePrice"))) isValid = false
    }
    if (!validateRequiredField('page-seller', t("pages.seller"))) isValid = false
    
    if (session.manageQuantity !== false) {
      if (!itemsPerPurchaseValue) {
        showFieldError('items-per-purchase', t("modals.itemsPerPurchaseRequired"))
        isValid = false
      } else if (itemsPerPurchase < 1) {
        showFieldError('items-per-purchase', t("modals.minOne"))
        isValid = false
      }

      if (maxPerPurchase !== null && maxPerPurchase < 1) {
        showFieldError('max-per-purchase', t("modals.minOne"))
        isValid = false
      }
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
      insurancePrice,
      seller,
      currency,
      products,
      itemsPerPurchase,
      ...(maxPerPurchase !== null && { maxPerPurchase }),
      ...(customsCategoryId && { customsCategoryId }),
    }

    SidebarAPI.updateBundle(currentSession, bundle.id, updatedBundle).then((response) => {
      sessions = response.sessions
      closeModal()
      renderApp()
    })
  }

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
        <h3 class="text-lg font-medium card-text mb-4">${t("bundles.deleteBundle")}</h3>
        <p class="muted-text mb-6">${t("bundles.confirmDelete")}</p>
        
        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 secondary-text font-medium hover:secondary-bg cursor-pointer rounded">${t("common.cancel")}</button>
          <button id="delete-button" class="px-4 py-2 primary-bg primary-text font-medium cursor-pointer rounded flex items-center">
            ${t("bundles.deleteButton")}
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
    SidebarAPI.deleteBundle(currentSession, bundleId).then((response) => {
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
        <h3 class="text-lg font-medium card-text mb-4">${t("products.deleteProduct")}</h3>
        <p class="muted-text mb-6">${t("products.confirmDelete")}</p>
        
        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 secondary-text font-medium hover:secondary-bg cursor-pointer rounded">${t("common.cancel")}</button>
          <button id="delete-button" class="px-4 py-2 primary-bg primary-text font-medium cursor-pointer rounded flex items-center">
            ${t("products.deleteButton")}
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
    SidebarAPI.deleteProduct(currentSession, productId).then((response) => {
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
    SidebarAPI.deletePage(currentSession, currentProduct, pageId).then((response) => {
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
              <div class="toggle-switch"></div>
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
                ${session.manageQuantity !== false ? `
                <input type="number" 
                  id="product-qty-${p.id}" 
                  min="1" 
                  step="1" 
                  value="1"
                  class="bundle-product-qty w-20 px-2 py-1 border border-default input-bg card-text rounded text-sm ${p.id === product.id ? '' : 'hidden'}"
                  placeholder="Qty"
                >
                ` : ''}
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
          <label for="page-insurance" class="block text-sm font-medium secondary-text mb-1">${t("modals.insurancePrice")}</label>
          <input 
            type="text" 
            id="page-insurance" 
            value="${scrapedData.hasKnownParser ? (scrapedData.insurancePrice || "") : ""}"
            placeholder="${t("modals.enterInsurance")}"
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
            ${CURRENCIES.map(c => `<option value="${c.code}" ${scrapedData.priceCurrency === c.code ? "selected" : ""}>${c.label} - ${c.symbol}</option>`).join('')}
          </select>
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

        ${session.importFeesEnabled ? `
        <div class="mb-6">
          <div class="flex items-center mb-1">
            <label for="customs-category" class="text-sm font-medium secondary-text">${t("modals.customsCategory")}</label>
            <div class="ml-2 icon icon-help w-4 h-4 secondary-text cursor-help" title="${t("modals.howToAddCategory")}"></div>
          </div>
          <select 
            id="customs-category" 
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
            <option value="">${t("modals.noCustomsDuties")}</option>
            ${(session.customsCategories || []).map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('')}
          </select>
        </div>
        ` : ''}

        ${session.manageQuantity !== false ? `
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
        ` : ''}

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
    const insurancePrice = document.getElementById("page-insurance").value
    const seller = document.getElementById("page-seller").value
    const currency = document.getElementById("page-currency").value
    const itemsPerPurchaseValue = document.getElementById("items-per-purchase")?.value
    const itemsPerPurchase = itemsPerPurchaseValue ? parseInt(itemsPerPurchaseValue) : null
    const maxPerPurchaseValue = document.getElementById("max-per-purchase")?.value
    const maxPerPurchase = maxPerPurchaseValue ? parseInt(maxPerPurchaseValue) : null
    const customsCategoryElement = document.getElementById("customs-category")
    const customsCategoryId = customsCategoryElement ? (customsCategoryElement.value || null) : null

    let isValid = true
    if (currency !== 'FREE') {
      if (!validateRequiredField('page-price', t("pages.price"))) isValid = false
      if (!validateRequiredField('page-shipping', t("modals.shippingPrice"))) isValid = false
      if (!validateRequiredField('page-insurance', t("modals.insurancePrice"))) isValid = false
    }
    if (!validateRequiredField('page-seller', t("pages.seller"))) isValid = false
    
    if (session.manageQuantity !== false) {
      if (!itemsPerPurchaseValue) {
        showFieldError('items-per-purchase', t("modals.itemsPerPurchaseRequired"))
        isValid = false
      } else if (itemsPerPurchase < 1) {
        showFieldError('items-per-purchase', t("modals.minOne"))
        isValid = false
      }

      if (maxPerPurchase !== null && maxPerPurchase < 1) {
        showFieldError('max-per-purchase', t("modals.minOne"))
        isValid = false
      }
    }
    
    if (!isValid) return

    if (isBundle) {
      const bundle = {
        url,
        price,
        shippingPrice,
        insurancePrice,
        seller,
        currency,
        itemsPerPurchase,
        ...(maxPerPurchase !== null && { maxPerPurchase }),
        ...(customsCategoryId && { customsCategoryId }),
        products: [],
        timestamp: new Date().toISOString(),
      }
      
      document.querySelectorAll('#product-selection .bundle-product-checkbox:checked').forEach((checkbox) => {
        const productId = checkbox.value
        const qtyInput = document.getElementById(`product-qty-${productId}`)
        const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1
        bundle.products.push({ productId, quantity })
      })

      SidebarAPI.createBundle(currentSession, bundle).then((response) => {
        sessions = response.sessions
        closeModal()
        currentView = "pages"
        renderApp()
      })
    } else {
            const page = {
        url,
        price,
        shippingPrice,
        insurancePrice,
        seller,
        currency,
        itemsPerPurchase,
        ...(maxPerPurchase !== null && { maxPerPurchase }),
        ...(customsCategoryId && { customsCategoryId }),
        timestamp: new Date().toISOString(),
      }

      SidebarAPI.createPage(currentSession, currentProduct, page).then((response) => {
        sessions = response.sessions
        closeModal()
        currentView = "pages"
        renderApp()
      })
    }
  }

  setupAutoFocus(modal)
  setupEscapeKey(modal, closeModal)
  setupEnterKey(modal, saveScrapedData)

  document.getElementById("cancel-button").addEventListener("click", closeModal)
  document.getElementById("save-button").addEventListener("click", saveScrapedData)

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

  const getRule = (seller) => (session.deliveryRules || []).find(r => r.seller === seller) || {}

  app.innerHTML = `
    <div class="mx-4 pb-8">
      <!-- Header -->
      <div class="flex justify-between items-center mb-3">
        <div class="flex items-center space-x-3">
          <button class="muted-text p-2 cursor-pointer" id="back-button">
            <span class="icon icon-back h-8 w-8"></span>
          </button>
          <h1 class="text-2xl pl-4 font-semibold card-text">${t("deliveryRules.title")}</h1>
        </div>
      </div>

      <p class="text-sm muted-text mb-6">${t("deliveryRules.subtitle")}</p>

      ${session.importFeesEnabled ? `
      <!-- Customs Tax Configuration -->
      <div class="mb-8 card-bg rounded-xl shadow-md p-6 border border-default">
        <h2 class="text-xl font-semibold card-text mb-4">${t("deliveryRules.importFeeSection")}</h2>
        
        <!-- Default VAT Rate -->
        <div class="mb-6">
          <label for="default-vat" class="block text-sm font-medium secondary-text mb-1">${t("deliveryRules.defaultVAT")} (%)</label>
          <input 
            type="number" 
            id="default-vat" 
            value="${session.defaultVAT ? (session.defaultVAT * 100) : ''}"
            step="0.01"
            min="0"
            max="100"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <!-- Product Categories -->
        <div class="mb-4">
          <h3 class="text-lg font-medium card-text mb-3">${t("deliveryRules.productCategories")}</h3>
          
          ${(session.customsCategories && session.customsCategories.length > 0) ? `
          <div class="space-y-2 mb-4">
            ${session.customsCategories.map(cat => `
              <div class="flex items-center justify-between p-3 secondary-bg rounded-lg border border-default">
                <div class="flex-1">
                  <p class="font-medium card-text">${cat.name}</p>
                  <p class="text-sm muted-text">
                    ${t("deliveryRules.dutyRate")}: ${(cat.dutyRate * 100)}%<br>
                    ${t("deliveryRules.vatRate")}: ${(cat.vatRate * 100)}%
                  </p>
                </div>
                <div class="flex space-x-2">
                  <button class="muted-text p-1 cursor-pointer edit-category-btn" data-id="${cat.id}">
                    <span class="icon icon-edit h-5 w-5"></span>
                  </button>
                  <button class="muted-text p-1 cursor-pointer delete-category-btn" data-id="${cat.id}">
                    <span class="icon icon-delete h-5 w-5"></span>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
          ` : `
          <p class="text-sm muted-text mb-4">${t("deliveryRules.noCategoriesYet")}</p>
          `}

          <button id="add-category-btn" class="w-full flex items-center justify-center space-x-2 cursor-pointer secondary-bg secondary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm border border-default">
            <span class="icon icon-plus h-5 w-5"></span>
            <span class="text-base font-medium">${t("deliveryRules.addCategory")}</span>
          </button>
        </div>
      </div>
      ` : ''}

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
                <div class="toggle-switch"></div>
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

            ${session.importFeesEnabled ? `
            <div class="mb-4" style="display: ${copiedFrom !== 'None' ? 'none' : 'block'}">
              <label class="block text-sm font-medium secondary-text mb-1">
                ${t("deliveryRules.customsClearanceFees")}
                <span class="icon icon-help w-4 h-4 ml-1 cursor-help" title="${t("deliveryRules.customsClearanceFeesHelp")}"></span>
              </label>
              <input type="number" class="customs-clearance-fees w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent" data-seller="${seller}" step="0.01" min="0" value="${rule.customsClearanceFee || 0}">
            </div>
            ` : ''}
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

  document.getElementById("back-button").addEventListener("click", () => {
    currentView = "products"
    renderApp()
  })

  // Customs category event listeners
  const addCategoryBtn = document.getElementById("add-category-btn")
  if (addCategoryBtn) {
    addCategoryBtn.addEventListener("click", () => {
      showNewCustomsCategoryModal()
    })
  }

  document.querySelectorAll(".edit-category-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const categoryId = btn.dataset.id
      const category = session.customsCategories.find(c => c.id === categoryId)
      if (category) {
        showEditCustomsCategoryModal(category)
      }
    })
  })

  document.querySelectorAll(".delete-category-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const categoryId = btn.dataset.id
      showDeleteCustomsCategoryModal(categoryId)
    })
  })


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
        if (deliveryRow) deliveryRow.parentElement.style.display = 'none'
        if (optionsContainer) optionsContainer.style.display = 'none'
      } else {
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
    const deliveryRules = []

    getUniqueSellers(session).forEach((seller) => {
      const sameSelect = document.querySelector(`.same-seller-select[data-seller="${seller}"]`)
      const copiedFrom = sameSelect && sameSelect.value && sameSelect.value !== 'None' ? sameSelect.value : null
      
      const rule = { seller }
      if (copiedFrom) {
        rule.copiedFrom = copiedFrom
      }

      const effectiveSeller = copiedFrom || seller

      const freeToggle = document.querySelector(`.free-delivery-toggle[data-seller="${effectiveSeller}"]`)
      const isFree = freeToggle ? freeToggle.checked : false

      if (isFree) {
        rule.type = 'free'
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

      // Collect customs clearance fee if enabled
      const customsFeeInput = document.querySelector(`.customs-clearance-fees[data-seller="${effectiveSeller}"]`)
      if (customsFeeInput) {
        rule.customsClearanceFee = Number.parseFloat(customsFeeInput.value) || 0
      }
      
      if (copiedFrom) {
        rule.copiedFrom = copiedFrom
      }

      deliveryRules.push(rule)
    })

    session.deliveryRules = deliveryRules

    // Save defaultVAT if customs tax is enabled
    if (session.importFeesEnabled) {
      const defaultVATInput = document.getElementById("default-vat")
      if (defaultVATInput) {
        const defaultVATPercent = parseFloat(defaultVATInput.value)
        if (!isNaN(defaultVATPercent) && defaultVATPercent >= 0 && defaultVATPercent <= 100) {
          session.defaultVAT = defaultVATPercent / 100
        } else {
          session.defaultVAT = null
        }
      }
    }

    SidebarAPI.updateSession(currentSession, session).then((response) => {
      sessions = response.sessions
      currentView = "products"
      renderApp()
    })
  })
}

// Customs Category Modals
function showNewCustomsCategoryModal() {
  const session = sessions.find(s => s.id === currentSession)
  // Get current defaultVAT value from input field if it exists (already in percentage)
  const defaultVATInput = document.getElementById("default-vat")
  let defaultVATPercentage = ''
  if (defaultVATInput && defaultVATInput.value) {
    // Input field exists and has a value - it's already in percentage format
    defaultVATPercentage = defaultVATInput.value
  } else if (session.defaultVAT) {
    // No input value, use session value and convert from decimal to percentage
    defaultVATPercentage = (session.defaultVAT * 100)
  }
  const modal = document.createElement("div")
  modal.innerHTML = `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
      <div id="modalContent" class="card-bg rounded-lg shadow-lg w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-medium card-text mb-4">${t("deliveryRules.newCategory")}</h3>
        
        <div class="mb-6">
          <label for="category-name" class="block text-sm font-medium secondary-text mb-1">${t("deliveryRules.categoryName")}</label>
          <input 
            type="text" 
            id="category-name" 
            placeholder="${t("modals.enterCategoryName")}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="duty-rate" class="block text-sm font-medium secondary-text mb-1">${t("deliveryRules.dutyRate")} (%)</label>
          <input 
            type="number" 
            id="duty-rate" 
            step="0.01"
            min="0"
            max="100"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="vat-rate" class="block text-sm font-medium secondary-text mb-1">${t("deliveryRules.vatRate")} (%)</label>
          <input 
            type="number" 
            id="vat-rate" 
            value="${defaultVATPercentage}"
            step="0.01"
            min="0"
            max="100"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 secondary-text font-medium hover:secondary-bg cursor-pointer rounded">${t("common.cancel")}</button>
          <button id="save-button" class="px-4 py-2 primary-bg primary-text font-medium cursor-pointer rounded flex items-center">${t("common.save")}</button>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  const closeModal = () => {
    clearAllErrors(modal)
    document.body.removeChild(modal)
  }

  const save = () => {
    clearAllErrors(modal)

    if (!validateRequiredField('category-name', t("deliveryRules.categoryName"))) return
    if (!validateRequiredField('duty-rate', t("deliveryRules.dutyRate"))) return
    if (!validateRequiredField('vat-rate', t("deliveryRules.vatRate"))) return

    const name = document.getElementById("category-name").value.trim()
    const dutyRatePercent = parseFloat(document.getElementById("duty-rate").value)
    const vatRatePercent = parseFloat(document.getElementById("vat-rate").value)

    if (isNaN(dutyRatePercent) || dutyRatePercent < 0 || dutyRatePercent > 100) {
      showFieldError('duty-rate', t("modals.invalidNumber"))
      return
    }

    if (isNaN(vatRatePercent) || vatRatePercent < 0 || vatRatePercent > 100) {
      showFieldError('vat-rate', t("modals.invalidNumber"))
      return
    }

    // Convert percentages to decimals for storage
    const dutyRate = dutyRatePercent / 100
    const vatRate = vatRatePercent / 100

    const category = { name, dutyRate, vatRate }

    // Get current defaultVAT from the main view inputs to persist it
    let defaultVAT = null
    const defaultVATInput = document.getElementById("default-vat")
    if (defaultVATInput) {
      const val = parseFloat(defaultVATInput.value)
      if (!isNaN(val) && val >= 0 && val <= 100) {
        defaultVAT = val / 100
      }
    }

    SidebarAPI.createCustomsCategory(currentSession, category, defaultVAT).then((response) => {
      sessions = response.sessions
      closeModal()
      renderApp()
    })
  }

  setupAutoFocus(modal)
  setupEscapeKey(modal, closeModal)
  setupEnterKey(modal, save)

  document.getElementById("modalOverlay").addEventListener("click", closeModal)
  document.getElementById("modalContent").addEventListener("click", e => e.stopPropagation())
  document.getElementById("cancel-button").addEventListener("click", closeModal)
  document.getElementById("save-button").addEventListener("click", save)
}

function showEditCustomsCategoryModal(category) {
  const modal = document.createElement("div")
  modal.innerHTML = `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
      <div id="modalContent" class="card-bg rounded-lg shadow-lg w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-medium card-text mb-4">${t("deliveryRules.editCategory")}</h3>
        
        <div class="mb-6">
          <label for="category-name" class="block text-sm font-medium secondary-text mb-1">${t("deliveryRules.categoryName")}</label>
          <input 
            type="text" 
            id="category-name" 
            value="${category.name}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="duty-rate" class="block text-sm font-medium secondary-text mb-1">${t("deliveryRules.dutyRate")} (%)</label>
          <input 
            type="number" 
            id="duty-rate" 
            value="${(category.dutyRate * 100)}"
            step="0.01"
            min="0"
            max="100"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="mb-6">
          <label for="vat-rate" class="block text-sm font-medium secondary-text mb-1">${t("deliveryRules.vatRate")} (%)</label>
          <input 
            type="number" 
            id="vat-rate" 
            value="${(category.vatRate * 100)}"
            step="0.01"
            min="0"
            max="100"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
        </div>

        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 secondary-text font-medium hover:secondary-bg cursor-pointer rounded">${t("common.cancel")}</button>
          <button id="save-button" class="px-4 py-2 primary-bg primary-text font-medium cursor-pointer rounded flex items-center">${t("common.save")}</button>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  const closeModal = () => {
    clearAllErrors(modal)
    document.body.removeChild(modal)
  }

  const save = () => {
    clearAllErrors(modal)

    if (!validateRequiredField('category-name', t("deliveryRules.categoryName"))) return
    if (!validateRequiredField('duty-rate', t("deliveryRules.dutyRate"))) return
    if (!validateRequiredField('vat-rate', t("deliveryRules.vatRate"))) return

    const name = document.getElementById("category-name").value.trim()
    const dutyRatePercent = parseFloat(document.getElementById("duty-rate").value)
    const vatRatePercent = parseFloat(document.getElementById("vat-rate").value)

    if (isNaN(dutyRatePercent) || dutyRatePercent < 0 || dutyRatePercent > 100) {
      showFieldError('duty-rate', t("modals.invalidNumber"))
      return
    }

    if (isNaN(vatRatePercent) || vatRatePercent < 0 || vatRatePercent > 100) {
      showFieldError('vat-rate', t("modals.invalidNumber"))
      return
    }

    // Convert percentages to decimals for storage
    const dutyRate = dutyRatePercent / 100
    const vatRate = vatRatePercent / 100

    const updatedCategory = { name, dutyRate, vatRate }

    // Get current defaultVAT from the main view inputs to persist it
    let defaultVAT = null
    const defaultVATInput = document.getElementById("default-vat")
    if (defaultVATInput) {
      const val = parseFloat(defaultVATInput.value)
      if (!isNaN(val) && val >= 0 && val <= 100) {
        defaultVAT = val / 100
      }
    }

    SidebarAPI.updateCustomsCategory(currentSession, category.id, updatedCategory, defaultVAT).then(() => {
      sessions = response.sessions
      closeModal()
      renderApp()
    })
  }

  setupAutoFocus(modal)
  setupEscapeKey(modal, closeModal)
  setupEnterKey(modal, save)

  document.getElementById("modalOverlay").addEventListener("click", closeModal)
  document.getElementById("modalContent").addEventListener("click", e => e.stopPropagation())
  document.getElementById("cancel-button").addEventListener("click", closeModal)
  document.getElementById("save-button").addEventListener("click", save)
}

function showDeleteCustomsCategoryModal(categoryId) {
  const modal = document.createElement("div")
  modal.innerHTML = `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
      <div id="modalContent" class="card-bg rounded-lg shadow-lg w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-medium card-text mb-4">${t("deliveryRules.deleteCategory")}</h3>
        <p class="muted-text mb-6">${t("deliveryRules.confirmDeleteCategory")}</p>
        
        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 secondary-text font-medium hover:secondary-bg cursor-pointer rounded">${t("common.cancel")}</button>
          <button id="delete-button" class="px-4 py-2 primary-bg primary-text font-medium cursor-pointer rounded flex items-center">${t("common.delete")}</button>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  const close = () => document.body.removeChild(modal)

  document.getElementById("modalOverlay").addEventListener("click", close)
  document.getElementById("modalContent").addEventListener("click", e => e.stopPropagation())
  document.getElementById("cancel-button").addEventListener("click", close)

  document.getElementById("delete-button").addEventListener("click", () => {
    // Get current defaultVAT from the main view inputs to persist it
    let defaultVAT = null
    const defaultVATInput = document.getElementById("default-vat")
    if (defaultVATInput) {
      const val = parseFloat(defaultVATInput.value)
      if (!isNaN(val) && val >= 0 && val <= 100) {
        defaultVAT = val / 100
      }
    }

    SidebarAPI.deleteCustomsCategory(currentSession, categoryId, defaultVAT).then((response) => {
      sessions = response.sessions
      close()
      renderApp()
    })
  })
}


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
          
          if (!sessionData.name || !Array.isArray(sessionData.products)) {
            alert(t("sessions.invalidFormat"));
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

          SidebarAPI.createSession(name).then(response => {
             const newSessionId = response.currentSession;
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
            <span class="icon icon-back h-8 w-8"></span>
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
                  <span class="icon icon-edit h-6 w-6"></span>
                </button>
                <button class="muted-text p-1 cursor-pointer delete-group-button" data-id="${group.id}">
                  <span class="icon icon-delete h-6 w-6"></span>
                </button>
              </div>
            </div>
          </div>
        `).join('') : `<div class="text-center muted-text py-8">${t("alternatives.noGroups")}</div>`}
      </div>

      <button id="new-group-button" class="w-full mt-6 flex items-center justify-center space-x-2 cursor-pointer primary-bg primary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm">
        <span class="icon icon-plus h-5 w-5"></span>
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

        ${session.manageQuantity !== false ? `
        <div class="mb-4 card-bg border border-default rounded-lg p-3">
          <div class="flex">
            <span class="icon icon-warning h-5 w-5 muted-text mr-2 flex-shrink-0"></span>
            <p class="text-sm muted-text">${t("alternatives.quantityInfo")}</p>
          </div>
        </div>
        ` : ''}

        <div class="flex-1 overflow-y-auto mb-4">
          <label class="block text-sm font-medium secondary-text mb-2">${t("alternatives.options")}</label>
          <div id="options-container" class="space-y-4">
            <!-- Options will be added here -->
          </div>
          <button id="add-option-button" class="mt-2 text-sm secondary-text hover:opacity-80 font-medium flex items-center cursor-pointer">
            <span class="icon icon-plus h-4 w-4 mr-1"></span>
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
        <button class="muted-text hover:opacity-70 cursor-pointer remove-option-btn">
          <span class="icon icon-close h-5 w-5"></span>
        </button>
      </div>
      <div class="space-y-2 max-h-64 overflow-y-auto">
        ${products.map(p => {
          const initialProd = initialProducts.find(ip => ip.productId === p.id)
          return `
          <div class="flex items-center gap-2">
            <input type="checkbox" id="${optionId}-prod-${p.id}" value="${p.id}" class="product-checkbox h-4 w-4 accent-gray-800 border-default rounded focus:ring-gray-500" ${initialProd ? 'checked' : ''}>
            <label for="${optionId}-prod-${p.id}" class="flex-1 text-sm secondary-text truncate">${p.name}</label>
            ${session.manageQuantity !== false ? `
            <input type="number" id="${optionId}-qty-${p.id}" min="1" step="1" value="${initialProd ? initialProd.quantity : 1}" class="qty-input w-16 px-2 py-1 border border-default input-bg card-text rounded text-sm ${initialProd ? '' : 'hidden'}">
            ` : ''}
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

  const closeModal = () => {
    clearAllErrors(modal)
    document.body.removeChild(modal)
  }

  const saveGroup = () => {
    clearAllErrors(modal)

    if (!validateRequiredField('group-name', t("alternatives.groupName"))) {
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
        optDiv.classList.add('error-border')
        hasEmptyOption = true
      }
    })

    if (hasEmptyOption) {
      const container = document.getElementById('options-container')
      let errorMsg = container.nextElementSibling
      if (!errorMsg || !errorMsg.classList.contains('field-error-message')) {
        errorMsg = document.createElement('p')
        errorMsg.className = 'field-error-message text-sm error-text mt-1'
        container.parentNode.insertBefore(errorMsg, container.nextSibling)
      }
      errorMsg.textContent = t("alternatives.errorOptionEmpty")
      return
    } else {
      const container = document.getElementById('options-container')
      const errorMsg = container.nextElementSibling
      if (errorMsg && errorMsg.classList.contains('field-error-message')) {
        errorMsg.remove()
      }
      document.querySelectorAll('#options-container > div').forEach(d => d.classList.remove('error-border'))
    }

    if (options.length < 2) {
      const container = document.getElementById('options-container')
      let errorMsg = container.nextElementSibling
      if (!errorMsg || !errorMsg.classList.contains('field-error-message')) {
        errorMsg = document.createElement('p')
        errorMsg.className = 'field-error-message text-sm error-text mt-1'
        container.parentNode.insertBefore(errorMsg, container.nextSibling)
      }
      errorMsg.textContent = t("alternatives.errorMinOptions")
      return
    }

    // Check for duplicate options
    const signatures = options.map(opt => {
      const sorted = [...opt.products].sort((a, b) => a.productId.localeCompare(b.productId))
      return sorted.map(p => `${p.productId}:${p.quantity}`).join('|')
    })
    
    const uniqueSignatures = new Set(signatures)
    if (uniqueSignatures.size !== options.length) {
      const container = document.getElementById('options-container')
      let errorMsg = container.nextElementSibling
      if (!errorMsg || !errorMsg.classList.contains('field-error-message')) {
        errorMsg = document.createElement('p')
        errorMsg.className = 'field-error-message text-sm error-text mt-1'
        container.parentNode.insertBefore(errorMsg, container.nextSibling)
      }
      errorMsg.textContent = t("alternatives.errorDuplicateOptions")
      return
    }

    SidebarAPI.createAlternativeGroup(currentSession, { name, options }).then(response => {
      sessions = response.sessions
      closeModal()
      renderAlternativesView()
    })
  }

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

        ${session.manageQuantity !== false ? `
        <div class="mb-4 card-bg border border-default rounded-lg p-3">
          <div class="flex">
            <span class="icon icon-warning h-5 w-5 muted-text mr-2 flex-shrink-0"></span>
            <p class="text-sm muted-text">${t("alternatives.quantityInfo")}</p>
          </div>
        </div>
        ` : ''}

        <div class="flex-1 overflow-y-auto mb-4">
          <label class="block text-sm font-medium secondary-text mb-2">${t("alternatives.options")}</label>
          <div id="options-container" class="space-y-4">
            <!-- Options will be added here -->
          </div>
          <button id="add-option-button" class="mt-2 text-sm secondary-text hover:opacity-80 font-medium flex items-center cursor-pointer">
            <span class="icon icon-plus h-4 w-4 mr-1"></span>
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
        <button class="muted-text hover:opacity-70 cursor-pointer remove-option-btn">
          <span class="icon icon-close h-5 w-5"></span>
        </button>
      </div>
      <div class="space-y-2 max-h-64 overflow-y-auto">
        ${products.map(p => {
          const initialProd = initialProducts.find(ip => ip.productId === p.id)
          return `
          <div class="flex items-center gap-2">
            <input type="checkbox" id="${optionId}-prod-${p.id}" value="${p.id}" class="product-checkbox h-4 w-4 accent-gray-800 border-default rounded focus:ring-gray-500" ${initialProd ? 'checked' : ''}>
            <label for="${optionId}-prod-${p.id}" class="flex-1 text-sm secondary-text truncate">${p.name}</label>
            ${session.manageQuantity !== false ? `
            <input type="number" id="${optionId}-qty-${p.id}" min="1" step="1" value="${initialProd ? initialProd.quantity : 1}" class="qty-input w-16 px-2 py-1 border border-default input-bg card-text rounded text-sm ${initialProd ? '' : 'hidden'}">
            ` : ''}
          </div>
        `}).join('')}
      </div>
    `
    
    div.querySelector('.remove-option-btn').addEventListener('click', () => {
      div.remove()
    })

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

  if (group.options && group.options.length > 0) {
    group.options.forEach(opt => addOption(opt.products))
  } else {
    addOption()
  }

  document.getElementById('add-option-button').addEventListener('click', () => addOption())

  const closeModal = () => {
    clearAllErrors(modal)
    document.body.removeChild(modal)
  }

  const saveGroup = () => {
    clearAllErrors(modal)

    if (!validateRequiredField('group-name', t("alternatives.groupName"))) {
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
        optDiv.classList.add('error-border')
        hasEmptyOption = true
      }
    })

    if (hasEmptyOption) {
      const container = document.getElementById('options-container')
      let errorMsg = container.nextElementSibling
      if (!errorMsg || !errorMsg.classList.contains('field-error-message')) {
        errorMsg = document.createElement('p')
        errorMsg.className = 'field-error-message text-sm error-text mt-1'
        container.parentNode.insertBefore(errorMsg, container.nextSibling)
      }
      errorMsg.textContent = t("alternatives.errorOptionEmpty")
      return
    } else {
      // Clear error
      const container = document.getElementById('options-container')
      const errorMsg = container.nextElementSibling
      if (errorMsg && errorMsg.classList.contains('field-error-message')) {
        errorMsg.remove()
      }
      document.querySelectorAll('#options-container > div').forEach(d => d.classList.remove('error-border'))
    }

    if (options.length < 2) {
      const container = document.getElementById('options-container')
      let errorMsg = container.nextElementSibling
      if (!errorMsg || !errorMsg.classList.contains('field-error-message')) {
        errorMsg = document.createElement('p')
        errorMsg.className = 'field-error-message text-sm error-text mt-1'
        container.parentNode.insertBefore(errorMsg, container.nextSibling)
      }
      errorMsg.textContent = t("alternatives.errorMinOptions")
      return
    }

    // Check for duplicate options
    const signatures = options.map(opt => {
      const sorted = [...opt.products].sort((a, b) => a.productId.localeCompare(b.productId))
      return sorted.map(p => `${p.productId}:${p.quantity}`).join('|')
    })
    
    const uniqueSignatures = new Set(signatures)
    if (uniqueSignatures.size !== options.length) {
      const container = document.getElementById('options-container')
      let errorMsg = container.nextElementSibling
      if (!errorMsg || !errorMsg.classList.contains('field-error-message')) {
        errorMsg = document.createElement('p')
        errorMsg.className = 'field-error-message text-sm error-text mt-1'
        container.parentNode.insertBefore(errorMsg, container.nextSibling)
      }
      errorMsg.textContent = t("alternatives.errorDuplicateOptions")
      return
    }

    SidebarAPI.updateAlternativeGroup(currentSession, group.id, { name, options }).then(response => {
      sessions = response.sessions
      closeModal()
      renderAlternativesView()
    })
  }

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
