const app = document.getElementById("app")

async function init() {
  browser.storage.local.get(["darkMode", "currency"]).then(async (settings) => {
    if (settings.darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
    
    const currencyCode = settings.currency || DEFAULT_CURRENCY
    const currency = CURRENCIES.find(c => c.code === currencyCode)
    if (currency) currentCurrencySymbol = currency.symbol
    
    await initI18n()
    
    SidebarAPI.getSessions().then((response) => {
      sessions = response.sessions
      currentSession = response.currentSession
      renderApp()
    })
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
  browser.storage.local.get(["darkMode", "language", "currency", "defaultWeightUnit", "defaultVolumeUnit", "defaultDimensionUnit", "defaultDistanceUnit"]).then((settings) => {
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
        <select id="language" class="w-full px-4 py-2 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
          ${LANGUAGES.map(lang => `<option value="${lang.code}" ${(settings.language || getCurrentLanguage()) === lang.code ? "selected" : ""}>${lang.nativeName}</option>`).join('')}
        </select>
        </div>

        <div class="card-bg rounded-xl shadow-md p-4">
        <label class="block text-sm font-medium secondary-text mb-1">${t("settings.defaultCurrency")}</label>
        <select id="currency" class="w-full px-4 py-2 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
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

        <div class="card-bg rounded-xl shadow-md p-4">
        <label class="block text-sm font-medium secondary-text mb-1">${t("settings.defaultWeightUnit")}</label>
        <select id="default-weight-unit" class="w-full px-4 py-2 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
           ${WEIGHT_UNITS.map(u => `<option value="${u.value}" ${(settings.defaultWeightUnit || DEFAULT_WEIGHT_UNIT) === u.value ? "selected" : ""}>${t("attributes.units." + u.label)}</option>`).join('')}
        </select>
        </div>

        <div class="card-bg rounded-xl shadow-md p-4">
        <label class="block text-sm font-medium secondary-text mb-1">${t("settings.defaultVolumeUnit")}</label>
        <select id="default-volume-unit" class="w-full px-4 py-2 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
          ${VOLUME_UNITS.map(u => `<option value="${u.value}" ${(settings.defaultVolumeUnit || DEFAULT_VOLUME_UNIT) === u.value ? "selected" : ""}>${t("attributes.units." + u.value)}</option>`).join('')}
        </select>
        </div>

        <div class="card-bg rounded-xl shadow-md p-4">
        <label class="block text-sm font-medium secondary-text mb-1">${t("settings.defaultDimensionUnit")}</label>
        <select id="default-dimension-unit" class="w-full px-4 py-2 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
          ${DIMENSION_UNITS.map(u => `<option value="${u.value}" ${(settings.defaultDimensionUnit || DEFAULT_DIMENSION_UNIT) === u.value ? "selected" : ""}>${t("attributes.units." + u.value)}</option>`).join('')}
        </select>
        </div>

        <div class="card-bg rounded-xl shadow-md p-4">
        <label class="block text-sm font-medium secondary-text mb-1">${t("settings.defaultDistanceUnit")}</label>
        <select id="default-distance-unit" class="w-full px-4 py-2 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
          ${DISTANCE_UNITS.map(u => `<option value="${u.value}" ${(settings.defaultDistanceUnit || DEFAULT_DISTANCE_UNIT) === u.value ? "selected" : ""}>${t("attributes.units." + u.value)}</option>`).join('')}
        </select>
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
      const defaultWeightUnit = document.getElementById("default-weight-unit").value
      const defaultVolumeUnit = document.getElementById("default-volume-unit").value
      const defaultDimensionUnit = document.getElementById("default-dimension-unit").value
      const defaultDistanceUnit = document.getElementById("default-distance-unit").value

      browser.storage.local
        .set({
          darkMode,
          language,
          currency,
          defaultWeightUnit,
          defaultVolumeUnit,
          defaultDimensionUnit,
          defaultDistanceUnit
        })
        .then(async () => {
          const c = CURRENCIES.find(curr => curr.code === currency)
          if (c) currentCurrencySymbol = c.symbol
          
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
          <label for="session-name" class="block text-sm font-medium secondary-text mb-1">${t("sessions.sessionName")}</label>
          <input 
            type="text" 
            id="session-name" 
            placeholder="${t("sessions.enterSessionName")}" 
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
        </div>

        <div class="mb-6 flex items-center justify-between">
          <label for="manage-quantity" class="text-sm font-medium secondary-text">${t("sessions.manageQuantities")}</label>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="manage-quantity" class="sr-only peer">
            <div class="toggle-switch"></div>
          </label>
        </div>

        <div class="mb-6 flex items-center justify-between">
          <label for="import-fees-enabled" class="text-sm font-medium secondary-text">${t("sessions.ImportFeesManagement")}</label>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="import-fees-enabled" class="sr-only peer">
            <div class="toggle-switch"></div>
          </label>
        </div>

        <div class="mb-6 flex items-center justify-between">
          <label for="manage-weight" class="text-sm font-medium secondary-text">${t("sessions.manageWeight")}</label>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="manage-weight" class="sr-only peer">
            <div class="toggle-switch"></div>
          </label>
        </div>

        <div class="mb-6 flex items-center justify-between">
          <label for="manage-volume" class="text-sm font-medium secondary-text">${t("sessions.manageVolume")}</label>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="manage-volume" class="sr-only peer">
            <div class="toggle-switch"></div>
          </label>
        </div>

        <div class="mb-6 flex items-center justify-between">
          <label for="manage-dimension" class="text-sm font-medium secondary-text">${t("sessions.manageDimension")}</label>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="manage-dimension" class="sr-only peer">
            <div class="toggle-switch"></div>
          </label>
        </div>

        <div class="mb-6 flex items-center justify-between">
          <label for="manage-distance" class="text-sm font-medium secondary-text">${t("sessions.manageDistance")}</label>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="manage-distance" class="sr-only peer">
            <div class="toggle-switch"></div>
          </label>
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
    const manageQuantity = document.getElementById("manage-quantity").checked
    const importFeesEnabled = document.getElementById("import-fees-enabled").checked
    const manageWeight = document.getElementById("manage-weight").checked
    const manageVolume = document.getElementById("manage-volume").checked
    const manageDimension = document.getElementById("manage-dimension").checked
    const manageDistance = document.getElementById("manage-distance").checked
    
    if (sessions.some(s => s.name === name)) {
      showFieldError('session-name', t("sessions.sessionExists"))
      return
    }

    const session = {
      name,
      manageQuantity,
      importFeesEnabled,
      manageWeight,
      manageVolume,
      manageDimension,
      manageDistance,
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

  // Fallback listeners for safety (redundant but harmless if IDs match)
  const overlay = modal.querySelector("#modalOverlay")
  if (overlay) overlay.addEventListener("click", closeModal)

  const content = modal.querySelector("#modalContent")
  if (content) content.addEventListener("click", (event) => event.stopPropagation())

  const cancelBtn = modal.querySelector("#cancel-button")
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal)

  const saveBtn = modal.querySelector("#save-button")
  if (saveBtn) saveBtn.addEventListener("click", saveSession)
}

function showEditSessionModal(session) {
  const modal = document.createElement("div") 
  modal.innerHTML = `
      <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
        <div id="modalContent" class="card-bg rounded-lg shadow-lg w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
          <h3 class="text-lg font-medium card-text mb-4">${t("sessions.editSession")}</h3>
          <div class="mb-6">
            <label for="edit-session-name" class="block text-sm font-medium secondary-text mb-1">${t("sessions.sessionName")}</label>
            <input 
              type="text" 
              id="edit-session-name" 
              value="${session.name}"
              class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
          </div>

          <div class="mb-6 flex items-center justify-between">
            <label for="edit-manage-quantity" class="text-sm font-medium secondary-text">${t("sessions.manageQuantities")}</label>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="edit-manage-quantity" class="sr-only peer" ${session.manageQuantity !== false ? "checked" : ""}>
              <div class="toggle-switch"></div>
            </label>
          </div>

          <div class="mb-6 flex items-center justify-between">
            <label for="edit-import-fees-enabled" class="text-sm font-medium secondary-text">${t("sessions.ImportFeesManagement")}</label>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="edit-import-fees-enabled" class="sr-only peer" ${session.importFeesEnabled ? "checked" : ""}>
              <div class="toggle-switch"></div>
            </label>
          </div>

          <div class="mb-6 flex items-center justify-between">
            <label for="edit-manage-weight" class="text-sm font-medium secondary-text">${t("sessions.manageWeight")}</label>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="edit-manage-weight" class="sr-only peer" ${session.manageWeight ? "checked" : ""}>
              <div class="toggle-switch"></div>
            </label>
          </div>

          <div class="mb-6 flex items-center justify-between">
            <label for="edit-manage-volume" class="text-sm font-medium secondary-text">${t("sessions.manageVolume")}</label>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="edit-manage-volume" class="sr-only peer" ${session.manageVolume ? "checked" : ""}>
              <div class="toggle-switch"></div>
            </label>
          </div>

          <div class="mb-6 flex items-center justify-between">
            <label for="edit-manage-dimension" class="text-sm font-medium secondary-text">${t("sessions.manageDimension")}</label>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="edit-manage-dimension" class="sr-only peer" ${session.manageDimension ? "checked" : ""}>
              <div class="toggle-switch"></div>
            </label>
          </div>

          <div class="mb-6 flex items-center justify-between">
            <label for="edit-manage-distance" class="text-sm font-medium secondary-text">${t("sessions.manageDistance")}</label>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="edit-manage-distance" class="sr-only peer" ${session.manageDistance ? "checked" : ""}>
              <div class="toggle-switch"></div>
            </label>
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

    if (!validateRequiredField('edit-session-name', t("sessions.sessionName"))) {
      return
    }

    const name = document.getElementById("edit-session-name").value.trim()
    const manageQuantity = document.getElementById("edit-manage-quantity").checked
    const importFeesEnabled = document.getElementById("edit-import-fees-enabled").checked
    const manageWeight = document.getElementById("edit-manage-weight").checked
    const manageVolume = document.getElementById("edit-manage-volume").checked
    const manageDimension = document.getElementById("edit-manage-dimension").checked
    const manageDistance = document.getElementById("edit-manage-distance").checked

    const updatedSession = { ...session }

    updatedSession.name = name
    updatedSession.manageQuantity = manageQuantity
    updatedSession.importFeesEnabled = importFeesEnabled
    updatedSession.manageWeight = manageWeight
    updatedSession.manageVolume = manageVolume
    updatedSession.manageDimension = manageDimension
    updatedSession.manageDistance = manageDistance

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
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
          <p class="mt-1 text-sm muted-text">${t("modals.howManyNeeded")}</p>
        </div>
        ` : ''}

        ${session.manageWeight ? `
        <div class="mb-6">
          <label class="block text-sm font-medium secondary-text mb-1">${t("attributes.weight")}</label>
          <div class="flex space-x-2">
            <input 
              type="number" 
              id="product-weight" 
              step="0.01"
              min="0"
              class="flex-1 px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
            <select id="product-weight-unit" class="px-2 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
              ${WEIGHT_UNITS.map(u => `<option value="${u.value}">${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
            </select>
          </div>
        </div>
        ` : ''}

        ${session.manageVolume ? `
        <div class="mb-6">
          <label class="block text-sm font-medium secondary-text mb-1">${t("attributes.volume")}</label>
          <div id="product-volume-input" class="flex space-x-2 hidden">
            <input
              type="number"
              id="product-volume-single"
              placeholder="${t("attributes.volume")}"
              step="0.01"
              min="0"
              class="flex-1 min-w-0 px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
            <select id="product-volume-unit" class="max-w-[50%] px-2 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary truncate">
               ${VOLUME_UNITS.map(u => `<option value="${u.value}" data-type="${u.type}">${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
            </select>
          </div>
          <div id="product-dimensions-inputs" class="space-y-2">
            <select id="product-volume-unit-dim" class="w-full px-2 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
               ${VOLUME_UNITS.map(u => `<option value="${u.value}" data-type="${u.type}">${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
            </select>
            <div class="grid grid-cols-3 gap-2">
              <input type="number" id="product-length" placeholder="${t("attributes.length")}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
              <input type="number" id="product-width" placeholder="${t("attributes.width")}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
              <input type="number" id="product-height" placeholder="${t("attributes.height")}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            </div>
          </div>
        </div>
        ` : ''}

        ${session.manageDimension ? `
        <div class="mb-6">
          <label class="block text-sm font-medium secondary-text mb-1">${t("attributes.dimension")}</label>
          <div class="mb-2">
            <select id="product-dimension-unit" class="w-full px-4 py-2 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
               ${DIMENSION_UNITS.map(u => `<option value="${u.value}">${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
            </select>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div>
              <input
                type="number"
                id="product-dim-length"
                placeholder="${t("attributes.length")}"
                step="0.01"
                min="0"
                class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
            </div>
            <div>
              <input
                type="number"
                id="product-dim-width"
                placeholder="${t("attributes.width")}"
                step="0.01"
                min="0"
                class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
            </div>
            <div>
              <input
                type="number"
                id="product-dim-height"
                placeholder="${t("attributes.height")}"
                step="0.01"
                min="0"
                class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
            </div>
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
          <p class="mt-1 text-sm muted-text">${t("modals.compatibilityHelp")}</p>

          <div id="compatible-products-list" class="mt-3 space-y-2" style="display:block; max-height:220px; overflow:auto;">
            ${sessions.find(s => s.id === currentSession).products.map(p => `
              <div class="flex items-center">
                <input type="checkbox" id="compat-${p.id}" value="${p.id}" class="compat-checkbox h-4 w-4 accent-primary border-default rounded focus:ring-primary">
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

  // Setup volume unit change handlers (must be before dispatching change events)
  const volumeUnitSelect = document.getElementById("product-volume-unit")
  const volumeUnitSelectDim = document.getElementById("product-volume-unit-dim")
  const dimInputs = document.getElementById("product-dimensions-inputs")
  const volInput = document.getElementById("product-volume-input")

  const handleVolumeUnitChange = (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex]
      const type = selectedOption.dataset.type
      const value = e.target.value

      // Sync both selects
      if (volumeUnitSelect) volumeUnitSelect.value = value
      if (volumeUnitSelectDim) volumeUnitSelectDim.value = value

      if (type === "volumetric") {
          dimInputs?.classList.add("hidden")
          volInput?.classList.remove("hidden")
          volInput?.classList.add("flex")
      } else {
          dimInputs?.classList.remove("hidden")
          volInput?.classList.add("hidden")
          volInput?.classList.remove("flex")
      }
  }

  if (volumeUnitSelect) volumeUnitSelect.addEventListener("change", handleVolumeUnitChange)
  if (volumeUnitSelectDim) volumeUnitSelectDim.addEventListener("change", handleVolumeUnitChange)

  // Initialize default units
  browser.storage.local.get(["defaultWeightUnit", "defaultVolumeUnit", "defaultDimensionUnit"]).then((res) => {
      const weightUnitSelect = document.getElementById("product-weight-unit")
      if (weightUnitSelect) {
          weightUnitSelect.value = res.defaultWeightUnit || DEFAULT_WEIGHT_UNIT
      }

      const defaultVolUnit = res.defaultVolumeUnit || DEFAULT_VOLUME_UNIT
      if (volumeUnitSelect) volumeUnitSelect.value = defaultVolUnit
      if (volumeUnitSelectDim) volumeUnitSelectDim.value = defaultVolUnit

      // Trigger change event to set correct visibility
      const selectToTrigger = volumeUnitSelect || volumeUnitSelectDim
      if (selectToTrigger) selectToTrigger.dispatchEvent(new Event('change'))

      const dimensionUnitSelect = document.getElementById("product-dimension-unit")
      if (dimensionUnitSelect) {
          dimensionUnitSelect.value = res.defaultDimensionUnit || DEFAULT_DIMENSION_UNIT
      }
  })

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

  const saveNewProduct = () => {
    clearAllErrors(modal)

    if (!validateRequiredField('product-name', t("products.productName"))) {
      return
    }

    const name = document.getElementById("product-name").value.trim()
    const quantityInput = document.getElementById("product-quantity")
    const quantity = quantityInput ? (parseInt(quantityInput.value) || 1) : 1

    const weightInput = document.getElementById("product-weight")
    const weight = weightInput ? (parseFloat(weightInput.value) || null) : null
    const weightUnit = document.getElementById("product-weight-unit")?.value || null

    const volumeUnitSelect = document.getElementById("product-volume-unit") || document.getElementById("product-volume-unit-dim")
    const volumeUnit = volumeUnitSelect?.value || null
    const isVolumetric = volumeUnitSelect?.options[volumeUnitSelect.selectedIndex]?.dataset.type === "volumetric"

    let length = null
    let width = null
    let height = null
    let volume = null

    if (volumeUnit) {
        if (!isVolumetric) {
            const lengthInput = document.getElementById("product-length")
            length = lengthInput ? (parseFloat(lengthInput.value) || null) : null

            const widthInput = document.getElementById("product-width")
            width = widthInput ? (parseFloat(widthInput.value) || null) : null

            const heightInput = document.getElementById("product-height")
            height = heightInput ? (parseFloat(heightInput.value) || null) : null
        } else {
            const volInput = document.getElementById("product-volume-single")
            volume = volInput ? (parseFloat(volInput.value) || null) : null
        }
    }

    // Collect dimension values (separate from volume)
    const dimensionUnitSelect = document.getElementById("product-dimension-unit")
    const dimensionUnit = dimensionUnitSelect?.value || null
    let dimLength = null
    let dimWidth = null
    let dimHeight = null

    if (dimensionUnit) {
        const dimLengthInput = document.getElementById("product-dim-length")
        dimLength = dimLengthInput ? (parseFloat(dimLengthInput.value) || null) : null

        const dimWidthInput = document.getElementById("product-dim-width")
        dimWidth = dimWidthInput ? (parseFloat(dimWidthInput.value) || null) : null

        const dimHeightInput = document.getElementById("product-dim-height")
        dimHeight = dimHeightInput ? (parseFloat(dimHeightInput.value) || null) : null
    }

    const compatibleProducts = []
    document.querySelectorAll('#compatible-products-list input.compat-checkbox:checked').forEach(cb => compatibleProducts.push(cb.value))

    SidebarAPI.createProduct(currentSession, {
      name,
      quantity,
      weight,
      weightUnit,
      length,
      width,
      height,
      volume,
      volumeUnit,
      dimLength,
      dimWidth,
      dimHeight,
      dimensionUnit,
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
  setupEnterKey(modal, saveNewProduct)

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

  document.getElementById("save-button").addEventListener("click", saveNewProduct)
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
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
          <p class="mt-1 text-sm muted-text">${t("modals.howManyNeeded")}</p>
        </div>
        ` : ''}

        ${session.manageWeight ? `
        <div class="mb-6">
          <label class="block text-sm font-medium secondary-text mb-1">${t("attributes.weight")}</label>
          <div class="flex space-x-2">
            <input 
              type="number" 
              id="product-weight" 
              value="${product.weight || ''}"
              step="0.01"
              min="0"
              class="flex-1 px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
            <select id="product-weight-unit" class="px-2 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
              ${WEIGHT_UNITS.map(u => `<option value="${u.value}" ${product.weightUnit === u.value ? "selected" : ""}>${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
            </select>
          </div>
        </div>
        ` : ''}

        ${session.manageVolume ? `
        <div class="mb-6">
          <label class="block text-sm font-medium secondary-text mb-1">${t("attributes.volume")}</label>
          <div id="product-volume-input" class="flex space-x-2 hidden">
            <input type="number" id="product-volume-single" value="${product.volume || ''}" placeholder="${t("attributes.volume")}" step="0.01" min="0" class="flex-1 min-w-0 px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <select id="product-volume-unit" class="max-w-[50%] px-2 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary truncate">
               ${VOLUME_UNITS.map(u => `<option value="${u.value}" data-type="${u.type}" ${product.volumeUnit === u.value ? "selected" : ""}>${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
            </select>
          </div>
          <div id="product-dimensions-inputs" class="space-y-2">
            <select id="product-volume-unit-dim" class="w-full px-2 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
               ${VOLUME_UNITS.map(u => `<option value="${u.value}" data-type="${u.type}" ${product.volumeUnit === u.value ? "selected" : ""}>${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
            </select>
            <div class="grid grid-cols-3 gap-2">
              <input type="number" id="product-length" value="${product.length || ''}" placeholder="${t("attributes.length")}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
              <input type="number" id="product-width" value="${product.width || ''}" placeholder="${t("attributes.width")}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
              <input type="number" id="product-height" value="${product.height || ''}" placeholder="${t("attributes.height")}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            </div>
          </div>
        </div>
        ` : ''}

        ${session.manageDimension ? `
        <div class="mb-6">
          <label class="block text-sm font-medium secondary-text mb-1">${t("attributes.dimension")}</label>
          <select id="product-dimension-unit" class="w-full px-4 py-2 mb-2 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
             ${DIMENSION_UNITS.map(u => `<option value="${u.value}" ${product.dimensionUnit === u.value ? "selected" : ""}>${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
          </select>
          <div class="grid grid-cols-3 gap-2">
            <input type="number" id="product-dim-length" value="${product.dimLength || ''}" placeholder="${t("attributes.length")}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <input type="number" id="product-dim-width" value="${product.dimWidth || ''}" placeholder="${t("attributes.width")}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <input type="number" id="product-dim-height" value="${product.dimHeight || ''}" placeholder="${t("attributes.height")}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
          </div>
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
                <input type="checkbox" id="compat-${p.id}" value="${p.id}" class="compat-checkbox h-4 w-4 accent-primary border-default rounded focus:ring-primary" ${product.limitedCompatibilityWith && product.limitedCompatibilityWith.includes(p.id) ? 'checked' : ''}>
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

  // Setup volume unit change handlers (must be before dispatching change events)
  const volumeUnitSelect = document.getElementById("product-volume-unit")
  const volumeUnitSelectDim = document.getElementById("product-volume-unit-dim")
  const dimInputs = document.getElementById("product-dimensions-inputs")
  const volInput = document.getElementById("product-volume-input")

  const handleVolumeUnitChange = (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex]
      const type = selectedOption.dataset.type
      const value = e.target.value

      // Sync both selects
      if (volumeUnitSelect) volumeUnitSelect.value = value
      if (volumeUnitSelectDim) volumeUnitSelectDim.value = value

      if (type === "volumetric") {
          dimInputs?.classList.add("hidden")
          volInput?.classList.remove("hidden")
          volInput?.classList.add("flex")
      } else {
          dimInputs?.classList.remove("hidden")
          volInput?.classList.add("hidden")
          volInput?.classList.remove("flex")
      }
  }

  if (volumeUnitSelect) volumeUnitSelect.addEventListener("change", handleVolumeUnitChange)
  if (volumeUnitSelectDim) volumeUnitSelectDim.addEventListener("change", handleVolumeUnitChange)

  // Initialize defaults if not set
  if (!product.weightUnit) {
      browser.storage.local.get("defaultWeightUnit").then(res => {
           const weightUnitSelect = document.getElementById("product-weight-unit")
           if (weightUnitSelect) weightUnitSelect.value = res.defaultWeightUnit || DEFAULT_WEIGHT_UNIT
      })
  }

  if (!product.volumeUnit) {
      browser.storage.local.get("defaultVolumeUnit").then(res => {
           const defaultVolUnit = res.defaultVolumeUnit || DEFAULT_VOLUME_UNIT
           if (volumeUnitSelect) volumeUnitSelect.value = defaultVolUnit
           if (volumeUnitSelectDim) volumeUnitSelectDim.value = defaultVolUnit
           const selectToTrigger = volumeUnitSelect || volumeUnitSelectDim
           if (selectToTrigger) selectToTrigger.dispatchEvent(new Event('change'))
      })
  } else {
       // Trigger change for initial visibility based on saved unit
       const selectToTrigger = volumeUnitSelect || volumeUnitSelectDim
       if (selectToTrigger) selectToTrigger.dispatchEvent(new Event('change'))
  }

  if (!product.dimensionUnit) {
      browser.storage.local.get("defaultDimensionUnit").then(res => {
           const dimensionUnitSelect = document.getElementById("product-dimension-unit")
           if (dimensionUnitSelect) dimensionUnitSelect.value = res.defaultDimensionUnit || DEFAULT_DIMENSION_UNIT
      })
  }

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

    const weightInput = document.getElementById("product-weight")
    const weight = weightInput ? (parseFloat(weightInput.value) || null) : null
    const weightUnit = document.getElementById("product-weight-unit")?.value || null

    const volumeUnitSelect = document.getElementById("product-volume-unit") || document.getElementById("product-volume-unit-dim")
    const volumeUnit = volumeUnitSelect?.value || null
    const isVolumetric = volumeUnitSelect?.options[volumeUnitSelect.selectedIndex]?.dataset.type === "volumetric"

    let length = null
    let width = null
    let height = null
    let volume = null

    if (volumeUnit) {
        if (!isVolumetric) {
            const lengthInput = document.getElementById("product-length")
            length = lengthInput ? (parseFloat(lengthInput.value) || null) : null

            const widthInput = document.getElementById("product-width")
            width = widthInput ? (parseFloat(widthInput.value) || null) : null

            const heightInput = document.getElementById("product-height")
            height = heightInput ? (parseFloat(heightInput.value) || null) : null
        } else {
            const volInput = document.getElementById("product-volume-single")
            volume = volInput ? (parseFloat(volInput.value) || null) : null
        }
    }

    // Collect dimension values (separate from volume)
    const dimensionUnitSelect = document.getElementById("product-dimension-unit")
    const dimensionUnit = dimensionUnitSelect?.value || null
    let dimLength = null
    let dimWidth = null
    let dimHeight = null

    if (dimensionUnit) {
        const dimLengthInput = document.getElementById("product-dim-length")
        dimLength = dimLengthInput ? (parseFloat(dimLengthInput.value) || null) : null

        const dimWidthInput = document.getElementById("product-dim-width")
        dimWidth = dimWidthInput ? (parseFloat(dimWidthInput.value) || null) : null

        const dimHeightInput = document.getElementById("product-dim-height")
        dimHeight = dimHeightInput ? (parseFloat(dimHeightInput.value) || null) : null
    }

    const prod = session.products.find(p => p.id === product.id)
    if (!prod) return
    prod.name = name
    prod.quantity = quantity
    prod.weight = weight
    prod.weightUnit = weightUnit
    prod.length = length
    prod.width = width
    prod.height = height
    prod.volume = volume
    prod.volumeUnit = volumeUnit
    prod.dimLength = dimLength
    prod.dimWidth = dimWidth
    prod.dimHeight = dimHeight
    prod.dimensionUnit = dimensionUnit
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
  const product = session.products.find(p => p.id === currentProduct)
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
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
        </div>

        <div class="mb-6">
          <label for="page-price" class="block text-sm font-medium secondary-text mb-1">${t("modals.price")}</label>
          <input 
            type="text" 
            id="page-price" 
            value="${page.price || ""}"
            placeholder="${t("modals.enterPrice")}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
        </div>

        <div class="mb-6">
          <label for="page-shipping" class="block text-sm font-medium secondary-text mb-1">${t("modals.shippingPrice")}</label>
          <input 
            type="text" 
            id="page-shipping" 
            value="${page.shippingPrice || ""}"
            placeholder="${t("modals.enterShipping")}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
        </div>

        <div class="mb-6">
          <label for="page-insurance" class="block text-sm font-medium secondary-text mb-1">${t("modals.insurancePrice")}</label>
          <input 
            type="text" 
            id="page-insurance" 
            value="${page.insurancePrice || ""}"
            placeholder="${t("modals.enterInsurance")}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
        </div>

        <div class="mb-6">
          <label for="page-currency" class="block text-sm font-medium secondary-text mb-1">${t("modals.currency")}</label>
          <select 
            id="page-currency" 
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
          <p class="mt-1 text-sm muted-text">${t("modals.maxPerPurchaseHelp")}</p>
        </div>
        ` : ''}

        ${session.manageWeight ? `
        <div class="mb-6">
          <label class="block text-sm font-medium secondary-text mb-1">${t("attributes.weight")}</label>
          <div class="flex space-x-2">
            <input
              type="number"
              id="page-weight"
              value="${page.weight || ''}"
              placeholder="${product.weight ? product.weight + ' ' + (product.weightUnit || '') : ''}"
              step="0.01"
              min="0"
              class="flex-1 px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
            <select id="page-weight-unit" class="px-2 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
              ${WEIGHT_UNITS.map(u => `<option value="${u.value}" ${(page.weightUnit || product.weightUnit) === u.value ? "selected" : ""}>${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
            </select>
          </div>
        </div>
        ` : ''}

        ${session.manageVolume ? `
        <div class="mb-6">
          <label class="block text-sm font-medium secondary-text mb-1">${t("attributes.volume")}</label>
          <div id="page-volume-input" class="flex space-x-2 hidden">
            <input type="number" id="page-volume-single" value="${page.volume || ''}" placeholder="${product.volume ? product.volume + ' ' + (product.volumeUnit || '') : ''}" step="0.01" min="0" class="flex-1 min-w-0 px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <select id="page-volume-unit" class="max-w-[50%] px-2 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary truncate">
               ${VOLUME_UNITS.map(u => `<option value="${u.value}" data-type="${u.type}" ${(page.volumeUnit || product.volumeUnit) === u.value ? "selected" : ""}>${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
            </select>
          </div>
          <div id="page-dimensions-inputs" class="space-y-2">
            <select id="page-volume-unit-dim" class="w-full px-2 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
               ${VOLUME_UNITS.map(u => `<option value="${u.value}" data-type="${u.type}" ${(page.volumeUnit || product.volumeUnit) === u.value ? "selected" : ""}>${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
            </select>
            <div class="grid grid-cols-3 gap-2">
              <input type="number" id="page-length" value="${page.length || ''}" placeholder="${product.length ? product.length + ' ' + (product.volumeUnit || '') : ''}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
              <input type="number" id="page-width" value="${page.width || ''}" placeholder="${product.width ? product.width + ' ' + (product.volumeUnit || '') : ''}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
              <input type="number" id="page-height" value="${page.height || ''}" placeholder="${product.height ? product.height + ' ' + (product.volumeUnit || '') : ''}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            </div>
          </div>
        </div>
        ` : ''}

        ${session.manageDimension ? `
        <div class="mb-6">
          <label class="block text-sm font-medium secondary-text mb-1">${t("attributes.dimension")}</label>
          <select id="page-dimension-unit" class="w-full px-4 py-2 mb-2 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
             ${DIMENSION_UNITS.map(u => `<option value="${u.value}" ${(page.dimensionUnit || product.dimensionUnit) === u.value ? "selected" : ""}>${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
          </select>
          <div class="grid grid-cols-3 gap-2">
            <input type="number" id="page-dim-length" value="${page.dimLength || ''}" placeholder="${product.dimLength ? product.dimLength + ' ' + (product.dimensionUnit || '') : ''}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <input type="number" id="page-dim-width" value="${page.dimWidth || ''}" placeholder="${product.dimWidth ? product.dimWidth + ' ' + (product.dimensionUnit || '') : ''}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <input type="number" id="page-dim-height" value="${page.dimHeight || ''}" placeholder="${product.dimHeight ? product.dimHeight + ' ' + (product.dimensionUnit || '') : ''}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
          </div>
        </div>
        ` : ''}

        ${session.manageDistance ? `
        <div class="mb-6">
          <label class="block text-sm font-medium secondary-text mb-1">${t("attributes.distance")}</label>
          <div class="flex space-x-2">
            <input
              type="number"
              id="page-distance"
              value="${page.distance || ''}"
              step="0.01"
              min="0"
              class="flex-1 px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
            <select id="page-distance-unit" class="px-2 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
              ${DISTANCE_UNITS.map(u => `<option value="${u.value}" ${page.distanceUnit === u.value ? "selected" : ""}>${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
            </select>
          </div>
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

  // Setup volume unit change handlers (must be before dispatching change events)
  const volumeUnitSelect = document.getElementById("page-volume-unit")
  const volumeUnitSelectDim = document.getElementById("page-volume-unit-dim")
  const dimInputs = document.getElementById("page-dimensions-inputs")
  const volInput = document.getElementById("page-volume-input")

  const handleVolumeUnitChange = (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex]
      const type = selectedOption.dataset.type
      const value = e.target.value

      // Sync both selects
      if (volumeUnitSelect) volumeUnitSelect.value = value
      if (volumeUnitSelectDim) volumeUnitSelectDim.value = value

      if (type === "volumetric") {
          dimInputs?.classList.add("hidden")
          volInput?.classList.remove("hidden")
          volInput?.classList.add("flex")
      } else {
          dimInputs?.classList.remove("hidden")
          volInput?.classList.add("hidden")
          volInput?.classList.remove("flex")
      }
  }

  if (volumeUnitSelect) volumeUnitSelect.addEventListener("change", handleVolumeUnitChange)
  if (volumeUnitSelectDim) volumeUnitSelectDim.addEventListener("change", handleVolumeUnitChange)

  // Initialize defaults if not set
  if (!page.weightUnit) {
      browser.storage.local.get("defaultWeightUnit").then(res => {
           const weightUnitSelect = document.getElementById("page-weight-unit")
           if (weightUnitSelect) weightUnitSelect.value = res.defaultWeightUnit || DEFAULT_WEIGHT_UNIT
      })
  }

  if (!page.volumeUnit) {
      browser.storage.local.get("defaultVolumeUnit").then(res => {
           const defaultVolUnit = res.defaultVolumeUnit || DEFAULT_VOLUME_UNIT
           if (volumeUnitSelect) volumeUnitSelect.value = defaultVolUnit
           if (volumeUnitSelectDim) volumeUnitSelectDim.value = defaultVolUnit
           const selectToTrigger = volumeUnitSelect || volumeUnitSelectDim
           if (selectToTrigger) selectToTrigger.dispatchEvent(new Event('change'))
      })
  } else {
       const selectToTrigger = volumeUnitSelect || volumeUnitSelectDim
       if (selectToTrigger) selectToTrigger.dispatchEvent(new Event('change'))
  }

  if (!page.dimensionUnit) {
      browser.storage.local.get("defaultDimensionUnit").then(res => {
           const dimensionUnitSelect = document.getElementById("page-dimension-unit")
           if (dimensionUnitSelect) dimensionUnitSelect.value = res.defaultDimensionUnit || DEFAULT_DIMENSION_UNIT
      })
  }

  if (!page.distanceUnit) {
      browser.storage.local.get("defaultDistanceUnit").then(res => {
           const distanceUnitSelect = document.getElementById("page-distance-unit")
           if (distanceUnitSelect) distanceUnitSelect.value = res.defaultDistanceUnit || DEFAULT_DISTANCE_UNIT
      })
  }

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

    const weightInput = document.getElementById("page-weight")
    const weight = weightInput ? (parseFloat(weightInput.value) || null) : null
    const weightUnit = document.getElementById("page-weight-unit")?.value || null

    const volumeUnitSelectSave = document.getElementById("page-volume-unit") || document.getElementById("page-volume-unit-dim")
    const volumeUnit = volumeUnitSelectSave?.value || null
    const isVolumetric = volumeUnitSelectSave?.options[volumeUnitSelectSave.selectedIndex]?.dataset.type === "volumetric"

    let length = null
    let width = null
    let height = null
    let volume = null

    if (volumeUnit) {
        if (!isVolumetric) {
            const lengthInput = document.getElementById("page-length")
            length = lengthInput ? (parseFloat(lengthInput.value) || null) : null

            const widthInput = document.getElementById("page-width")
            width = widthInput ? (parseFloat(widthInput.value) || null) : null

            const heightInput = document.getElementById("page-height")
            height = heightInput ? (parseFloat(heightInput.value) || null) : null
        } else {
            const volInput = document.getElementById("page-volume-single")
            volume = volInput ? (parseFloat(volInput.value) || null) : null
        }
    }

    // Collect dimension values (separate from volume)
    const dimensionUnitSelect = document.getElementById("page-dimension-unit")
    const dimensionUnit = dimensionUnitSelect?.value || null
    let dimLength = null
    let dimWidth = null
    let dimHeight = null

    if (dimensionUnit) {
        const dimLengthInput = document.getElementById("page-dim-length")
        dimLength = dimLengthInput ? (parseFloat(dimLengthInput.value) || null) : null

        const dimWidthInput = document.getElementById("page-dim-width")
        dimWidth = dimWidthInput ? (parseFloat(dimWidthInput.value) || null) : null

        const dimHeightInput = document.getElementById("page-dim-height")
        dimHeight = dimHeightInput ? (parseFloat(dimHeightInput.value) || null) : null
    }

    // Collect distance value
    const distanceInput = document.getElementById("page-distance")
    const distance = distanceInput ? (parseFloat(distanceInput.value) || null) : null
    const distanceUnit = document.getElementById("page-distance-unit")?.value || null

    const updatedPage = {
      price,
      shippingPrice,
      insurancePrice,
      seller,
      currency,
      itemsPerPurchase,
      ...(maxPerPurchase !== null && { maxPerPurchase }),
      ...(customsCategoryId && { customsCategoryId }),
      ...(weight !== null && { weight }),
      ...(weightUnit && { weightUnit }),
      ...(length !== null && { length }),
      ...(width !== null && { width }),
      ...(height !== null && { height }),
      ...(volume !== null && { volume }),
      ...(volumeUnit && { volumeUnit }),
      ...(dimLength !== null && { dimLength }),
      ...(dimWidth !== null && { dimWidth }),
      ...(dimHeight !== null && { dimHeight }),
      ...(dimensionUnit && { dimensionUnit }),
      ...(distance !== null && { distance }),
      ...(distanceUnit && { distanceUnit }),
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
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                  class="bundle-edit-checkbox h-4 w-4 accent-primary border-default rounded focus:ring-2 focus:ring-primary"
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
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
        </div>

        <div class="mb-6">
          <label for="page-shipping" class="block text-sm font-medium secondary-text mb-1">${t("modals.shippingPrice")}</label>
          <input 
            type="text" 
            id="page-shipping" 
            value="${bundle.shippingPrice || ""}"
            placeholder="${t("modals.enterShipping")}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
        </div>

        <div class="mb-6">
          <label for="page-insurance" class="block text-sm font-medium secondary-text mb-1">${t("modals.insurancePrice")}</label>
          <input 
            type="text" 
            id="page-insurance" 
            value="${bundle.insurancePrice || ""}"
            placeholder="${t("modals.enterInsurance")}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
        </div>

        <div class="mb-6">
          <label for="page-currency" class="block text-sm font-medium secondary-text mb-1">${t("pages.currency")}</label>
          <select 
            id="page-currency" 
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
          <p class="mt-1 text-sm muted-text">${t("modals.maxPerPurchaseHelpBundle")}</p>
        </div>
        ` : ''}

        ${session.manageWeight ? `
        <div class="mb-6">
          <label class="block text-sm font-medium secondary-text mb-1">${t("attributes.weight")}</label>
          <div class="flex space-x-2">
            <input 
              type="number" 
              id="page-weight" 
              value="${bundle.weight || ''}"
              step="0.01"
              min="0"
              class="flex-1 px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
            <select id="page-weight-unit" class="px-2 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
              ${WEIGHT_UNITS.map(u => `<option value="${u.value}" ${bundle.weightUnit === u.value ? "selected" : ""}>${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
            </select>
          </div>
        </div>
        ` : ''}

        ${session.manageVolume ? `
        <div class="mb-6">
          <label class="block text-sm font-medium secondary-text mb-1">${t("attributes.volume")}</label>
          <div id="page-volume-input" class="flex space-x-2 hidden">
            <input type="number" id="page-volume-single" value="${bundle.volume || ''}" placeholder="${t("attributes.volume")}" step="0.01" min="0" class="flex-1 min-w-0 px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <select id="page-volume-unit" class="max-w-[50%] px-2 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary truncate">
               ${VOLUME_UNITS.map(u => `<option value="${u.value}" data-type="${u.type}" ${bundle.volumeUnit === u.value ? "selected" : ""}>${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
            </select>
          </div>
          <div id="page-dimensions-inputs" class="space-y-2">
            <select id="page-volume-unit-dim" class="w-full px-2 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
               ${VOLUME_UNITS.map(u => `<option value="${u.value}" data-type="${u.type}" ${bundle.volumeUnit === u.value ? "selected" : ""}>${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
            </select>
            <div class="grid grid-cols-3 gap-2">
              <input type="number" id="page-length" value="${bundle.length || ''}" placeholder="${t("attributes.length")}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
              <input type="number" id="page-width" value="${bundle.width || ''}" placeholder="${t("attributes.width")}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
              <input type="number" id="page-height" value="${bundle.height || ''}" placeholder="${t("attributes.height")}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            </div>
          </div>
        </div>
        ` : ''}

        ${session.manageDimension ? `
        <div class="mb-6">
          <label class="block text-sm font-medium secondary-text mb-1">${t("attributes.dimension")}</label>
          <select id="page-dimension-unit" class="w-full px-4 py-2 mb-2 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
             ${DIMENSION_UNITS.map(u => `<option value="${u.value}" ${bundle.dimensionUnit === u.value ? "selected" : ""}>${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
          </select>
          <div class="grid grid-cols-3 gap-2">
            <input type="number" id="page-dim-length" value="${bundle.dimLength || ''}" placeholder="${t("attributes.length")}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <input type="number" id="page-dim-width" value="${bundle.dimWidth || ''}" placeholder="${t("attributes.width")}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <input type="number" id="page-dim-height" value="${bundle.dimHeight || ''}" placeholder="${t("attributes.height")}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
          </div>
        </div>
        ` : ''}

        ${session.manageDistance ? `
        <div class="mb-6">
          <label class="block text-sm font-medium secondary-text mb-1">${t("attributes.distance")}</label>
          <div class="flex space-x-2">
            <input
              type="number"
              id="page-distance"
              value="${bundle.distance || ''}"
              step="0.01"
              min="0"
              class="flex-1 px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
            <select id="page-distance-unit" class="px-2 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
              ${DISTANCE_UNITS.map(u => `<option value="${u.value}" ${bundle.distanceUnit === u.value ? "selected" : ""}>${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
            </select>
          </div>
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

  // Setup volume unit change handlers (must be before dispatching change events)
  const volumeUnitSelect = document.getElementById("page-volume-unit")
  const volumeUnitSelectDim = document.getElementById("page-volume-unit-dim")
  const dimInputs = document.getElementById("page-dimensions-inputs")
  const volInput = document.getElementById("page-volume-input")

  const handleVolumeUnitChange = (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex]
      const type = selectedOption.dataset.type
      const value = e.target.value

      // Sync both selects
      if (volumeUnitSelect) volumeUnitSelect.value = value
      if (volumeUnitSelectDim) volumeUnitSelectDim.value = value

      if (type === "volumetric") {
          dimInputs?.classList.add("hidden")
          volInput?.classList.remove("hidden")
          volInput?.classList.add("flex")
      } else {
          dimInputs?.classList.remove("hidden")
          volInput?.classList.add("hidden")
          volInput?.classList.remove("flex")
      }
  }

  if (volumeUnitSelect) volumeUnitSelect.addEventListener("change", handleVolumeUnitChange)
  if (volumeUnitSelectDim) volumeUnitSelectDim.addEventListener("change", handleVolumeUnitChange)

  // Initialize defaults if not set
  if (!bundle.weightUnit) {
      browser.storage.local.get("defaultWeightUnit").then(res => {
           const weightUnitSelect = document.getElementById("page-weight-unit")
           if (weightUnitSelect) weightUnitSelect.value = res.defaultWeightUnit || DEFAULT_WEIGHT_UNIT
      })
  }

  if (!bundle.volumeUnit) {
      browser.storage.local.get("defaultVolumeUnit").then(res => {
           const defaultVolUnit = res.defaultVolumeUnit || DEFAULT_VOLUME_UNIT
           if (volumeUnitSelect) volumeUnitSelect.value = defaultVolUnit
           if (volumeUnitSelectDim) volumeUnitSelectDim.value = defaultVolUnit
           const selectToTrigger = volumeUnitSelect || volumeUnitSelectDim
           if (selectToTrigger) selectToTrigger.dispatchEvent(new Event('change'))
      })
  } else {
       const selectToTrigger = volumeUnitSelect || volumeUnitSelectDim
       if (selectToTrigger) selectToTrigger.dispatchEvent(new Event('change'))
  }

  if (!bundle.dimensionUnit) {
      browser.storage.local.get("defaultDimensionUnit").then(res => {
           const dimensionUnitSelect = document.getElementById("page-dimension-unit")
           if (dimensionUnitSelect) dimensionUnitSelect.value = res.defaultDimensionUnit || DEFAULT_DIMENSION_UNIT
      })
  }

  if (!bundle.distanceUnit) {
      browser.storage.local.get("defaultDistanceUnit").then(res => {
           const distanceUnitSelect = document.getElementById("page-distance-unit")
           if (distanceUnitSelect) distanceUnitSelect.value = res.defaultDistanceUnit || DEFAULT_DISTANCE_UNIT
      })
  }

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

    const weightInput = document.getElementById("page-weight")
    const weight = weightInput ? (parseFloat(weightInput.value) || null) : null
    const weightUnit = document.getElementById("page-weight-unit")?.value || null

    const volumeUnitSelectSave = document.getElementById("page-volume-unit") || document.getElementById("page-volume-unit-dim")
    const volumeUnit = volumeUnitSelectSave?.value || null
    const isVolumetric = volumeUnitSelectSave?.options[volumeUnitSelectSave.selectedIndex]?.dataset.type === "volumetric"

    let length = null
    let width = null
    let height = null
    let volume = null

    if (volumeUnit) {
        if (!isVolumetric) {
            const lengthInput = document.getElementById("page-length")
            length = lengthInput ? (parseFloat(lengthInput.value) || null) : null

            const widthInput = document.getElementById("page-width")
            width = widthInput ? (parseFloat(widthInput.value) || null) : null

            const heightInput = document.getElementById("page-height")
            height = heightInput ? (parseFloat(heightInput.value) || null) : null
        } else {
            const volInput = document.getElementById("page-volume-single")
            volume = volInput ? (parseFloat(volInput.value) || null) : null
        }
    }

    // Collect dimension values (separate from volume)
    const dimensionUnitSelect = document.getElementById("page-dimension-unit")
    const dimensionUnit = dimensionUnitSelect?.value || null
    let dimLength = null
    let dimWidth = null
    let dimHeight = null

    if (dimensionUnit) {
        const dimLengthInput = document.getElementById("page-dim-length")
        dimLength = dimLengthInput ? (parseFloat(dimLengthInput.value) || null) : null

        const dimWidthInput = document.getElementById("page-dim-width")
        dimWidth = dimWidthInput ? (parseFloat(dimWidthInput.value) || null) : null

        const dimHeightInput = document.getElementById("page-dim-height")
        dimHeight = dimHeightInput ? (parseFloat(dimHeightInput.value) || null) : null
    }

    // Collect distance value
    const distanceInput = document.getElementById("page-distance")
    const distance = distanceInput ? (parseFloat(distanceInput.value) || null) : null
    const distanceUnit = document.getElementById("page-distance-unit")?.value || null

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
      ...(weight !== null && { weight }),
      ...(weightUnit && { weightUnit }),
      ...(length !== null && { length }),
      ...(width !== null && { width }),
      ...(height !== null && { height }),
      ...(volume !== null && { volume }),
      ...(volumeUnit && { volumeUnit }),
      ...(dimLength !== null && { dimLength }),
      ...(dimWidth !== null && { dimWidth }),
      ...(dimHeight !== null && { dimHeight }),
      ...(dimensionUnit && { dimensionUnit }),
      ...(distance !== null && { distance }),
      ...(distanceUnit && { distanceUnit }),
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
                  class="bundle-product-checkbox h-4 w-4 accent-primary border-default rounded focus:ring-primary"
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
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
        </div>

        <div class="mb-6">
          <label for="page-price" class="block text-sm font-medium secondary-text mb-1">${t("modals.price")}</label>
          <input 
            type="text" 
            id="page-price" 
            value="${scrapedData.hasKnownParser ? (scrapedData.price || "") : ""}"
            placeholder="${t("modals.enterPrice")}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
        </div>

        <div class="mb-6">
          <label for="page-shipping" class="block text-sm font-medium secondary-text mb-1">${t("modals.shippingPrice")}</label>
          <input 
            type="text" 
            id="page-shipping" 
            value="${scrapedData.hasKnownParser ? (scrapedData.shippingPrice || "") : ""}"
            placeholder="${t("modals.enterShipping")}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
        </div>

        <div class="mb-6">
          <label for="page-insurance" class="block text-sm font-medium secondary-text mb-1">${t("modals.insurancePrice")}</label>
          <input 
            type="text" 
            id="page-insurance" 
            value="${scrapedData.hasKnownParser ? (scrapedData.insurancePrice || "") : ""}"
            placeholder="${t("modals.enterInsurance")}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
        </div>

        <div class="mb-6">
          <label for="page-currency" class="block text-sm font-medium secondary-text mb-1">${t("modals.currency")}</label>
          <select 
            id="page-currency" 
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
          <p class="mt-1 text-sm muted-text">${t("modals.maxPerPurchaseHelp")}</p>
        </div>
        ` : ''}

        ${session.manageWeight ? `
        <div class="mb-6">
          <label class="block text-sm font-medium secondary-text mb-1">${t("attributes.weight")}</label>
          <div class="flex space-x-2">
            <input
              type="number"
              id="page-weight"
              value=""
              placeholder="${product.weight ? product.weight + ' ' + (product.weightUnit || '') : ''}"
              step="0.01"
              min="0"
              class="flex-1 px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
            <select id="page-weight-unit" class="px-2 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
              ${WEIGHT_UNITS.map(u => `<option value="${u.value}" ${product.weightUnit === u.value ? "selected" : ""}>${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
            </select>
          </div>
        </div>
        ` : ''}

        ${session.manageVolume ? `
        <div class="mb-6">
          <label class="block text-sm font-medium secondary-text mb-1">${t("attributes.volume")}</label>
          <div id="page-volume-input" class="flex space-x-2 hidden">
            <input type="number" id="page-volume-single" value="" placeholder="${product.volume ? product.volume + ' ' + (product.volumeUnit || '') : ''}" step="0.01" min="0" class="flex-1 min-w-0 px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <select id="page-volume-unit" class="max-w-[50%] px-2 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary truncate">
               ${VOLUME_UNITS.map(u => `<option value="${u.value}" data-type="${u.type}" ${product.volumeUnit === u.value ? "selected" : ""}>${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
            </select>
          </div>
          <div id="page-dimensions-inputs" class="space-y-2">
            <select id="page-volume-unit-dim" class="w-full px-2 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
               ${VOLUME_UNITS.map(u => `<option value="${u.value}" data-type="${u.type}" ${product.volumeUnit === u.value ? "selected" : ""}>${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
            </select>
            <div class="grid grid-cols-3 gap-2">
              <input type="number" id="page-length" value="" placeholder="${product.length ? product.length + ' ' + (product.volumeUnit || '') : ''}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
              <input type="number" id="page-width" value="" placeholder="${product.width ? product.width + ' ' + (product.volumeUnit || '') : ''}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
              <input type="number" id="page-height" value="" placeholder="${product.height ? product.height + ' ' + (product.volumeUnit || '') : ''}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            </div>
          </div>
        </div>
        ` : ''}

        ${session.manageDimension ? `
        <div class="mb-6">
          <label class="block text-sm font-medium secondary-text mb-1">${t("attributes.dimension")}</label>
          <select id="page-dimension-unit" class="w-full px-4 py-2 mb-2 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
             ${DIMENSION_UNITS.map(u => `<option value="${u.value}" ${product.dimensionUnit === u.value ? "selected" : ""}>${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
          </select>
          <div class="grid grid-cols-3 gap-2">
            <input type="number" id="page-dim-length" value="" placeholder="${product.dimLength ? product.dimLength + ' ' + (product.dimensionUnit || '') : ''}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <input type="number" id="page-dim-width" value="" placeholder="${product.dimWidth ? product.dimWidth + ' ' + (product.dimensionUnit || '') : ''}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <input type="number" id="page-dim-height" value="" placeholder="${product.dimHeight ? product.dimHeight + ' ' + (product.dimensionUnit || '') : ''}" step="0.01" min="0" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
          </div>
        </div>
        ` : ''}

        ${session.manageDistance ? `
        <div class="mb-6">
          <label class="block text-sm font-medium secondary-text mb-1">${t("attributes.distance")}</label>
          <div class="flex space-x-2">
            <input type="number" id="page-distance" value="" step="0.01" min="0" class="flex-1 px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <select id="page-distance-unit" class="px-2 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
              ${DISTANCE_UNITS.map(u => `<option value="${u.value}">${t("attributes.units." + u.value)} (${u.label})</option>`).join('')}
            </select>
          </div>
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

  // Setup volume unit change handlers (must be before dispatching change events)
  const volumeUnitSelect = document.getElementById("page-volume-unit")
  const volumeUnitSelectDim = document.getElementById("page-volume-unit-dim")
  const dimInputs = document.getElementById("page-dimensions-inputs")
  const volInput = document.getElementById("page-volume-input")

  const handleVolumeUnitChange = (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex]
      const type = selectedOption.dataset.type
      const value = e.target.value

      // Sync both selects
      if (volumeUnitSelect) volumeUnitSelect.value = value
      if (volumeUnitSelectDim) volumeUnitSelectDim.value = value

      if (type === "volumetric") {
          dimInputs?.classList.add("hidden")
          volInput?.classList.remove("hidden")
          volInput?.classList.add("flex")
      } else {
          dimInputs?.classList.remove("hidden")
          volInput?.classList.add("hidden")
          volInput?.classList.remove("flex")
      }
  }

  if (volumeUnitSelect) volumeUnitSelect.addEventListener("change", handleVolumeUnitChange)
  if (volumeUnitSelectDim) volumeUnitSelectDim.addEventListener("change", handleVolumeUnitChange)

  // Initialize defaults
  browser.storage.local.get(["defaultWeightUnit", "defaultVolumeUnit", "defaultDimensionUnit", "defaultDistanceUnit"]).then((res) => {
      const weightUnitSelect = document.getElementById("page-weight-unit")
      if (weightUnitSelect) {
          weightUnitSelect.value = res.defaultWeightUnit || DEFAULT_WEIGHT_UNIT
      }

      const defaultVolUnit = res.defaultVolumeUnit || DEFAULT_VOLUME_UNIT
      if (volumeUnitSelect) volumeUnitSelect.value = defaultVolUnit
      if (volumeUnitSelectDim) volumeUnitSelectDim.value = defaultVolUnit
      // Trigger change event to set correct visibility
      const selectToTrigger = volumeUnitSelect || volumeUnitSelectDim
      if (selectToTrigger) selectToTrigger.dispatchEvent(new Event('change'))

      const dimensionUnitSelect = document.getElementById("page-dimension-unit")
      if (dimensionUnitSelect) {
          dimensionUnitSelect.value = res.defaultDimensionUnit || DEFAULT_DIMENSION_UNIT
      }

      const distanceUnitSelect = document.getElementById("page-distance-unit")
      if (distanceUnitSelect) {
          distanceUnitSelect.value = res.defaultDistanceUnit || DEFAULT_DISTANCE_UNIT
      }
  })

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

    const weightInput = document.getElementById("page-weight")
    const weight = weightInput ? (parseFloat(weightInput.value) || null) : null
    const weightUnit = document.getElementById("page-weight-unit")?.value || null

    const volumeUnitSelectSave = document.getElementById("page-volume-unit") || document.getElementById("page-volume-unit-dim")
    const volumeUnit = volumeUnitSelectSave?.value || null
    const isVolumetric = volumeUnitSelectSave?.options[volumeUnitSelectSave.selectedIndex]?.dataset.type === "volumetric"

    let length = null
    let width = null
    let height = null
    let volume = null

    if (volumeUnit) {
        if (!isVolumetric) {
            const lengthInput = document.getElementById("page-length")
            length = lengthInput ? (parseFloat(lengthInput.value) || null) : null

            const widthInput = document.getElementById("page-width")
            width = widthInput ? (parseFloat(widthInput.value) || null) : null

            const heightInput = document.getElementById("page-height")
            height = heightInput ? (parseFloat(heightInput.value) || null) : null
        } else {
            const volInput = document.getElementById("page-volume-single")
            volume = volInput ? (parseFloat(volInput.value) || null) : null
        }
    }

    // Collect dimension values (separate from volume)
    const dimensionUnitSelect = document.getElementById("page-dimension-unit")
    const dimensionUnit = dimensionUnitSelect?.value || null
    let dimLength = null
    let dimWidth = null
    let dimHeight = null

    if (dimensionUnit) {
        const dimLengthInput = document.getElementById("page-dim-length")
        dimLength = dimLengthInput ? (parseFloat(dimLengthInput.value) || null) : null

        const dimWidthInput = document.getElementById("page-dim-width")
        dimWidth = dimWidthInput ? (parseFloat(dimWidthInput.value) || null) : null

        const dimHeightInput = document.getElementById("page-dim-height")
        dimHeight = dimHeightInput ? (parseFloat(dimHeightInput.value) || null) : null
    }

    // Collect distance values
    const distanceInput = document.getElementById("page-distance")
    const distance = distanceInput ? (parseFloat(distanceInput.value) || null) : null
    const distanceUnit = document.getElementById("page-distance-unit")?.value || null

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
        ...(weight !== null && { weight }),
        ...(weightUnit && { weightUnit }),
        ...(length !== null && { length }),
        ...(width !== null && { width }),
        ...(height !== null && { height }),
        ...(volume !== null && { volume }),
        ...(volumeUnit && { volumeUnit }),
        ...(dimLength !== null && { dimLength }),
        ...(dimWidth !== null && { dimWidth }),
        ...(dimHeight !== null && { dimHeight }),
        ...(dimensionUnit && { dimensionUnit }),
        ...(distance !== null && { distance }),
        ...(distanceUnit && { distanceUnit }),
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
        ...(weight !== null && { weight }),
        ...(weightUnit && { weightUnit }),
        ...(length !== null && { length }),
        ...(width !== null && { width }),
        ...(height !== null && { height }),
        ...(volume !== null && { volume }),
        ...(volumeUnit && { volumeUnit }),
        ...(dimLength !== null && { dimLength }),
        ...(dimWidth !== null && { dimWidth }),
        ...(dimHeight !== null && { dimHeight }),
        ...(dimensionUnit && { dimensionUnit }),
        ...(distance !== null && { distance }),
        ...(distanceUnit && { distanceUnit }),
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


function renderCalculationRules(prefix, ruleData, showFreeOption = true) {
    if (!ruleData) ruleData = { type: 'fixed' };
    let type = ruleData.type || 'fixed';

    if (!showFreeOption && type === 'free') type = 'fixed';

    const session = sessions.find(s => s.id === currentSession);

    // Build types list based on session options
    const allTypes = [
        { value: 'item', label: t('deliveryRules.typeItem'), help: t('deliveryRules.typeItemHelp'), always: true },
        { value: 'free', label: t('deliveryRules.freeDelivery'), help: t('deliveryRules.freeDeliveryHelp'), always: true },
        { value: 'fixed', label: t('deliveryRules.typeFixed'), help: t('deliveryRules.typeFixedHelp'), always: true },
        { value: 'percentage', label: t('deliveryRules.typePercentage'), help: t('deliveryRules.typePercentageHelp'), always: true },
        { value: 'quantity', label: t('deliveryRules.typeQuantity'), help: t('deliveryRules.typeQuantityHelp'), always: true },
        { value: 'distance', label: t('deliveryRules.typeDistance'), help: t('deliveryRules.typeDistanceHelp'), requires: ['manageDistance'] },
        { value: 'weight', label: t('deliveryRules.typeWeight'), help: t('deliveryRules.typeWeightHelp'), requires: ['manageWeight'] },
        { value: 'volume', label: t('deliveryRules.typeVolume'), help: t('deliveryRules.typeVolumeHelp'), requires: ['manageVolume'] },
        { value: 'dimension', label: t('deliveryRules.typeDimension'), help: t('deliveryRules.typeDimensionHelp'), requires: ['manageDimension'] },
        { value: 'weight_volume', label: t('deliveryRules.typeWeightVolume'), help: t('deliveryRules.typeWeightVolumeHelp'), requires: ['manageWeight', 'manageVolume'] },
        { value: 'weight_dimension', label: t('deliveryRules.typeWeightDimension'), help: t('deliveryRules.typeWeightDimensionHelp'), requires: ['manageWeight', 'manageDimension'] },
    ];

    const types = allTypes.filter(tType => {
        if (!showFreeOption && tType.value === 'free') return false;
        if (tType.always) return true;
        if (tType.requires) {
            return tType.requires.every(req => session && session[req]);
        }
        return true;
    });

    let html = `<div class="calculation-rules-container space-y-4" data-prefix="${prefix}">`;

    // Type Selector
    html += `<div>
        <h5 class="text-sm font-semibold secondary-text mb-3">${t("deliveryRules.pricingType")}</h5>
        <div class="grid grid-cols-2 gap-2 mb-4">`;
    types.forEach(tType => {
        const checkedStatus = type === tType.value ? 'checked' : '';
        const radioId = `${prefix}_type_${tType.value}`;
        html += `
            <div class="relative group">
                <label for="${radioId}" class="flex items-center space-x-2 p-3 border border-default rounded-xl cursor-pointer hover:bg-[hsl(var(--muted))] transition-all bg-[hsl(var(--card))] has-[:checked]:bg-[hsl(var(--muted))] has-[:checked]:border-[hsl(var(--primary))] has-[:checked]:shadow-sm has-[:checked]:ring-1 has-[:checked]:ring-[hsl(var(--primary))]/10 group">
                    <input type="radio" id="${radioId}" name="${prefix}_type" value="${tType.value}" class="calculation-type-radio sr-only peer" ${checkedStatus}>
                    <div class="w-4 h-4 flex-shrink-0 rounded-full border border-default flex items-center justify-center peer-checked:border-[hsl(var(--primary))] peer-checked:bg-[hsl(var(--primary))] transition-all">
                        <div class="w-1.5 h-1.5 rounded-full bg-white scale-0 peer-checked:scale-100 transition-transform"></div>
                    </div>
                    <span class="text-xs font-medium secondary-text peer-checked:card-text transition-colors flex-1 truncate" title="${tType.label}">${tType.label}</span>
                    <div class="icon icon-help w-3.5 h-3.5 secondary-text opacity-40 hover:opacity-100 transition-opacity cursor-help" title="${tType.help}"></div>
                </label>
            </div>
        `;
    });
    html += `</div></div>`;

    // Dynamic Fields Area
    html += `<div class="calculation-inputs p-4 border border-default rounded bg-[hsl(var(--card))]">`;

    if (type === 'fixed') {
        html += renderFixedInputs(prefix, ruleData);
    } else if (type === 'percentage') {
        html += renderPercentageInputs(prefix, ruleData);
    } else if (['quantity', 'distance', 'weight', 'volume'].includes(type)) {
       html += renderTieredInputs(prefix, ruleData, type);
    } else if (type === 'dimension') {
        html += renderDimensionInputs(prefix, ruleData);
    } else if (['weight_volume', 'weight_dimension'].includes(type)) {
        html += renderCombinedInputs(prefix, ruleData, type);
    } else if (type === 'item') {
         // No specific inputs for 'item' (sum of shipping prices)
         html += `<p class="text-sm secondary-text italic">${t('deliveryRules.typeItem')}</p>`;
    } else if (type === 'free') {
         html += `<p class="text-sm font-medium card-text italic">${t('deliveryRules.freeDelivery')}</p>`;
    }

    html += `</div></div>`;
    return html;
}

function renderFixedInputs(prefix, data) {
    return `
        <div class="mb-3">
            <label class="block text-sm font-medium secondary-text mb-1">${t('deliveryRules.amount')}</label>
            <input type="number" step="0.01" class="w-full bg-transparent border border-default rounded px-3 py-2 text-sm focus:border-primary focus:outline-none" 
                name="${prefix}_amount" value="${data.amount || 0}">
        </div>
    `;
}

function renderPercentageInputs(prefix, data) {
    return `
        <div class="mb-3">
            <label class="block text-sm font-medium secondary-text mb-1">${t('deliveryRules.pctOrderLabel')}</label>
             <input type="number" step="0.01" class="w-full bg-transparent border border-default rounded px-3 py-2 text-sm focus:border-primary focus:outline-none" 
                name="${prefix}_rate" value="${data.rate || 0}">
        </div>
    `;
}

function renderRangeRow(type, prefix, idx, range = {}, tierValueType = 'fixed', tierValueMode = 'perUnit', unit = '', unit2 = '') {
    let inputs = '';
    
    // Générer le label de valeur dynamique
    const valueLabel = getValueLabel(type, tierValueType, tierValueMode, unit, unit2);
    
    if (type === 'dimension') {
        inputs = `
            <div class="flex-1">
                <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm text-center focus:ring-1 focus:ring-primary focus:outline-none" placeholder="∞" value="${range.maxL || ''}" name="${prefix}_range_${idx}_maxL">
            </div>
            <div class="flex-1">
                <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm text-center focus:ring-1 focus:ring-primary focus:outline-none" placeholder="∞" value="${range.maxW || ''}" name="${prefix}_range_${idx}_maxW">
            </div>
            <div class="flex-1">
                <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm text-center focus:ring-1 focus:ring-primary focus:outline-none" placeholder="∞" value="${range.maxH || ''}" name="${prefix}_range_${idx}_maxH">
            </div>
            <div class="flex-[1.5]">
                <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none font-medium" placeholder="0.00" value="${range.value || ''}" name="${prefix}_range_${idx}_value">
            </div>
        `;
    } else if (type === 'weight_volume') {
        inputs = `
            <div class="flex-1">
               <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm text-center focus:ring-1 focus:ring-primary focus:outline-none" placeholder="∞" name="${prefix}_range_${idx}_maxWeight" value="${range.maxWeight || ''}">
            </div>
            <div class="flex-1">
               <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm text-center focus:ring-1 focus:ring-primary focus:outline-none" placeholder="∞" name="${prefix}_range_${idx}_maxVol" value="${range.maxVol || ''}">
            </div>
            <div class="flex-[1.5]">
               <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none font-medium" placeholder="0.00" name="${prefix}_range_${idx}_value" value="${range.value || ''}">
            </div>
        `;
    } else if (type === 'weight_dimension') {
        inputs = `
            <div class="flex-1">
               <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm text-center focus:ring-1 focus:ring-primary focus:outline-none" placeholder="∞" name="${prefix}_range_${idx}_maxWeight" value="${range.maxWeight || ''}">
            </div>
            <div class="flex-1">
               <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm text-center focus:ring-1 focus:ring-primary focus:outline-none" placeholder="∞" name="${prefix}_range_${idx}_maxL" value="${range.maxL || ''}">
            </div>
            <div class="flex-1">
               <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm text-center focus:ring-1 focus:ring-primary focus:outline-none" placeholder="∞" name="${prefix}_range_${idx}_maxW" value="${range.maxW || ''}">
            </div>
            <div class="flex-1">
               <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm text-center focus:ring-1 focus:ring-primary focus:outline-none" placeholder="∞" name="${prefix}_range_${idx}_maxH" value="${range.maxH || ''}">
            </div>
            <div class="flex-1">
               <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none font-medium" placeholder="0.00" name="${prefix}_range_${idx}_value" value="${range.value || ''}">
            </div>
        `;
    } else {
        const isQuantity = type === 'quantity';
        const stepValue = isQuantity ? '1' : '0.01';
        inputs = `
            <div class="flex-[2] relative">
               <span class="absolute -top-3 left-0 w-full truncate text-[8px] secondary-text font-bold uppercase transition-opacity group-hover/row:opacity-100 opacity-60">${t('deliveryRules.startingFrom')}</span>
               <input type="number" step="${stepValue}" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none" placeholder="0" value="${range.min || 0}" name="${prefix}_range_${idx}_min">
            </div>
            <div class="flex-[2] relative">
               <span class="absolute -top-3 left-0 w-full truncate text-[8px] secondary-text font-bold uppercase transition-opacity group-hover/row:opacity-100 opacity-60">${t('deliveryRules.upTo')}</span>
               <input type="number" step="${stepValue}" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none text-center" placeholder="∞" value="${range.max || ''}" name="${prefix}_range_${idx}_max">
            </div>
            <div class="flex-[2] relative">
               <span class="absolute -top-3 left-0 w-full truncate text-[8px] secondary-text font-bold uppercase transition-opacity group-hover/row:opacity-100 opacity-60">${t('deliveryRules.value')} (${valueLabel})</span>
               <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none font-medium text-center" placeholder="0.00" value="${range.value || ''}" name="${prefix}_range_${idx}_value">
            </div>
        `;
    }

    return `
        <div class="flex items-center gap-2 range-row bg-[hsl(var(--muted))]/50 p-1.5 rounded-lg border border-default/30 hover:border-primary/30 transition-all group/row" data-index="${idx}">
            ${inputs}
            <div class="w-8 flex-shrink-0 flex justify-center">
                <button class="remove-range-btn text-gray-400 hover:text-red-500 transition-colors p-1" data-prefix="${prefix}" data-index="${idx}">
                    <span class="icon icon-delete h-4 w-4"></span>
                </button>
            </div>
        </div>
    `;
}

function getUnitOptions(type) {
    if (type === 'weight') return WEIGHT_UNITS;
    if (type === 'volume') return VOLUME_UNITS;
    if (type === 'distance') return DISTANCE_UNITS;
    if (type === 'dimension') return DIMENSION_UNITS;
    return [];
}

function getValueLabel(type, tierValueType, tierValueMode, unit = '', unit2 = '') {
    const isPerUnit = tierValueMode === 'perUnit';
    
    // Déterminer le préfixe selon tierValueType
    let prefix = '';
    if (tierValueType === 'fixed') {
        prefix = currentCurrencySymbol;
    } else if (tierValueType === 'pctOrder') {
        prefix = '%commande';
    } else if (tierValueType === 'pctDelivery') {
        prefix = '%livraison';
    }
    
    if (!isPerUnit) {
        // Montant total : juste le préfixe
        return prefix;
    }
    
    // Par unité : préfixe + unité
    let unitLabel = '';
    if (type === 'quantity') {
        unitLabel = '/article';
    } else if (type === 'distance') {
        unitLabel = `/${unit || 'km'}`;
    } else if (type === 'weight') {
        unitLabel = `/${unit || 'kg'}`;
    } else if (type === 'volume') {
        unitLabel = `/${unit || 'L'}`;
    } else if (type === 'dimension') {
        // Pour dimension, on utilise l'unité de dimension
        unitLabel = `/${unit || 'cm'}`;
    } else if (type === 'weight_dimension') {
        // Pour weight_dimension, on utilise l'unité de dimension
        unitLabel = `/${unit2 || 'cm'}`;
    } else if (type === 'weight_volume') {
        // Pour weight_volume, on utilise l'unité de volume
        unitLabel = `/${unit2 || 'L'}`;
    }
    
    return prefix + unitLabel;
}

function getHelpTextForMode(type, tierValueMode) {
    if (tierValueMode === 'perUnit') {
        if (type === 'quantity') {
            return t('deliveryRules.tierValueModeQuantityPerUnitHelp') || 'La valeur est multipliée par le nombre d\'articles';
        } else if (type === 'distance') {
            return t('deliveryRules.tierValueModeDistancePerUnitHelp') || 'La valeur est multipliée par la distance';
        } else if (type === 'weight') {
            return t('deliveryRules.tierValueModeWeightPerUnitHelp') || 'La valeur est multipliée par le poids';
        } else if (type === 'volume') {
            return t('deliveryRules.tierValueModeVolumePerUnitHelp') || 'La valeur est multipliée par le volume';
        }
        return t('deliveryRules.tierValueModePerUnitHelp');
    } else {
        return t('deliveryRules.tierValueModeTotalHelp');
    }
}

function renderTieredInputs(prefix, data, type) {
    const isTiered = data.isTiered || false;
    const units = getUnitOptions(type);
    let html = '';

    // Unit Selector (Top level)
    if (units.length > 0) {
        html += `
            <div class="mb-4">
                <label class="block text-xs font-semibold secondary-text mb-1 uppercase tracking-wide">${t('deliveryRules.unit')}</label>
                <select name="${prefix}_unit" class="w-full bg-[hsl(var(--card))] border border-default rounded-md px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors">
                    ${units.map(u => `<option value="${u.value}" ${data.unit === u.value ? 'selected' : ''}>${u.label}</option>`).join('')}
                </select>
            </div>
        `;
    }

    // Mode Toggle (Simple/Advanced) - represented by "Is Tiered"
    // "Single Rate" vs "Tiered Pricing"
    html += `
        <div class="mb-6 bg-[hsl(var(--muted))] p-1 rounded-lg inline-flex">
             <label class="px-3 py-1 rounded-md text-sm cursor-pointer transition-all ${!isTiered ? 'bg-[hsl(var(--card))] shadow-sm font-medium' : 'secondary-text'}">
                <input type="radio" name="${prefix}_mode_toggle" class="hidden is-tiered-toggle" value="single" ${!isTiered ? 'checked' : ''}>
                ${t('deliveryRules.singleRate')}
            </label>
            <label class="px-3 py-1 rounded-md text-sm cursor-pointer transition-all ${isTiered ? 'bg-[hsl(var(--card))] shadow-sm font-medium' : 'secondary-text'}">
                <input type="radio" name="${prefix}_mode_toggle" class="hidden is-tiered-toggle" value="tiered" ${isTiered ? 'checked' : ''}>
                ${t('deliveryRules.tieredPricing')}
            </label>
            <!-- Hidden actual checkbox for logic compatibility -->
            <input type="checkbox" name="${prefix}_isTiered" class="is-tiered-checkbox hidden" ${isTiered ? 'checked' : ''}>
        </div>
    `;

    if (!isTiered) {
        // Single Rate/Amount
        let amountLabel = t('deliveryRules.amount')
        if (type === 'quantity') {
            amountLabel = t('deliveryRules.unitCost')
        } else if (['distance', 'weight', 'volume'].includes(type)) {
            const unit = data.unit || (units[0] ? units[0].value : '')
            amountLabel = `${t('deliveryRules.amount')} (${currentCurrencySymbol}/${unit})`
        }

        html += `
             <div class="mb-3">
                <label class="block text-sm font-medium secondary-text mb-1">${amountLabel}</label>
                <div class="relative">
                    <input type="number" step="0.01" class="w-full bg-transparent border border-default rounded px-3 py-2 text-sm focus:border-primary focus:outline-none pl-3" 
                        name="${prefix}_amount" value="${data.amount || 0}">
                </div>
            </div>
        `;
    } else {
        // Tiered Options
        const tierType = data.tierType || 'global';
        const tierValueType = data.tierValueType || 'fixed';
        const tierValueMode = data.tierValueMode || 'perUnit';
        const unit = data.unit || (units[0] ? units[0].value : '');

        // Segmented Control for Value Mode
        html += `
            <div class="mb-4">
                <label class="block text-xs font-semibold secondary-text mb-2">${t('deliveryRules.tierValueMode')}</label>
                <div class="bg-[hsl(var(--muted))] p-1 rounded-lg inline-flex">
                    <label class="px-3 py-1 rounded-md text-sm cursor-pointer transition-all ${tierValueMode === 'perUnit' ? 'bg-[hsl(var(--card))] shadow-sm font-medium' : 'secondary-text'}">
                        <input type="radio" name="${prefix}_tierValueMode" value="perUnit" class="hidden tier-value-mode-toggle" ${tierValueMode === 'perUnit' ? 'checked' : ''}>
                        ${t('deliveryRules.tierValueModePerUnit')}
                    </label>
                    <label class="px-3 py-1 rounded-md text-sm cursor-pointer transition-all ${tierValueMode === 'total' ? 'bg-[hsl(var(--card))] shadow-sm font-medium' : 'secondary-text'}">
                        <input type="radio" name="${prefix}_tierValueMode" value="total" class="hidden tier-value-mode-toggle" ${tierValueMode === 'total' ? 'checked' : ''}>
                        ${t('deliveryRules.tierValueModeTotal')}
                    </label>
                </div>
                <p class="text-[10px] secondary-text italic mt-2 px-1 tier-value-mode-help">
                    ${getHelpTextForMode(type, tierValueMode)}
                </p>
            </div>
        `;

        html += `
             <div class="mb-4">
                <div class="ranges-container space-y-2 mb-4" data-prefix="${prefix}" data-type="${type}" data-tier-value-type="${tierValueType}" data-tier-value-mode="${tierValueMode}" data-unit="${unit}">
                    ${(() => {
                        // Create default tiers when switching to tiered mode for applicable types
                        const shouldCreateDefaults = isTiered &&
                                                     (!data.ranges || data.ranges.length === 0) &&
                                                     ['quantity', 'distance', 'weight', 'volume'].includes(type);

                        if (shouldCreateDefaults) {
                            const minStart = type === 'quantity' ? 1 : 0;
                            const maxFirst = 10;
                            const minSecond = type === 'quantity' ? 11 : 10;

                            data.ranges = [
                                { min: minStart, max: maxFirst, value: 0 },
                                { min: minSecond, max: null, value: 0 }
                            ];
                        }

                        return (data.ranges || []).map((range, idx) =>
                            renderRangeRow(type, prefix, idx, range, tierValueType, tierValueMode, unit)
                        ).join('');
                    })()}
                    ${(!data.ranges || data.ranges.length === 0) ? `<div class="empty-placeholder text-xs secondary-text italic text-center py-4 bg-[hsl(var(--muted))] rounded-lg border border-dashed border-default">${t('deliveryRules.addRange')}</div>` : ''}
                </div>

                <button class="add-range-btn w-full py-2 flex items-center justify-center space-x-2 text-sm font-medium text-primary hover:bg-[hsl(var(--primary))]/10 rounded-md border border-dashed border-[hsl(var(--primary))]/30 transition-all" data-prefix="${prefix}">
                    <span class="text-lg leading-none">+</span>
                    <span>${t('deliveryRules.addRange')}</span>
                </button>
            </div>

            <!-- Advanced Settings -->
            <details class="text-xs group mt-4">
                <summary class="cursor-pointer secondary-text font-medium hover:text-primary transition-colors py-2 px-3 flex items-center gap-2 select-none rounded-md hover:bg-[hsl(var(--muted))]">
                    <span class="transition-transform group-open:rotate-90">▶</span>
                    <span>${t('deliveryRules.advancedSettings') || 'Advanced Settings'}</span>
                </summary>
                <div class="mt-2 p-3 bg-[hsl(var(--muted))] rounded-lg border border-default space-y-3">
                    <div>
                        <div class="flex items-center gap-1.5 mb-1">
                            <label class="block text-xs font-semibold">${t('deliveryRules.tierType')}</label>
                            <div class="icon icon-info w-3.5 h-3.5 opacity-70 cursor-help" title="${t('deliveryRules.tierTypeHelp')}"></div>
                        </div>
                        <div class="flex space-x-6">
                            <label class="flex items-center cursor-pointer group">
                                <input type="radio" name="${prefix}_tierType" value="global" class="sr-only peer" ${tierType === 'global' ? 'checked' : ''}>
                                <div class="w-4 h-4 rounded-full border border-default flex items-center justify-center mr-2 peer-checked:border-[hsl(var(--primary))] peer-checked:bg-[hsl(var(--primary))] transition-all">
                                    <div class="w-1.5 h-1.5 rounded-full bg-white scale-0 peer-checked:scale-100 transition-transform"></div>
                                </div>
                                <span class="secondary-text peer-checked:card-text transition-colors">${t('deliveryRules.tierGlobal')}</span>
                            </label>
                            <label class="flex items-center cursor-pointer group">
                                <input type="radio" name="${prefix}_tierType" value="cumulative" class="sr-only peer" ${tierType === 'cumulative' ? 'checked' : ''}>
                                <div class="w-4 h-4 rounded-full border border-default flex items-center justify-center mr-2 peer-checked:border-[hsl(var(--primary))] peer-checked:bg-[hsl(var(--primary))] transition-all">
                                    <div class="w-1.5 h-1.5 rounded-full bg-white scale-0 peer-checked:scale-100 transition-transform"></div>
                                </div>
                                <span class="secondary-text peer-checked:card-text transition-colors">${t('deliveryRules.tierCumulative')}</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-semibold mb-1">${t('deliveryRules.tierValueType')}</label>
                        <div class="flex flex-wrap gap-4">
                             <label class="flex items-center cursor-pointer group">
                                <input type="radio" name="${prefix}_tierValueType" value="fixed" class="sr-only peer" ${tierValueType === 'fixed' ? 'checked' : ''}>
                                <div class="w-4 h-4 rounded-full border border-default flex items-center justify-center mr-2 peer-checked:border-[hsl(var(--primary))] peer-checked:bg-[hsl(var(--primary))] transition-all">
                                    <div class="w-1.5 h-1.5 rounded-full bg-white scale-0 peer-checked:scale-100 transition-transform"></div>
                                </div>
                                <span class="secondary-text peer-checked:card-text transition-colors">${t('deliveryRules.valFixed')}</span>
                            </label>
                             <label class="flex items-center cursor-pointer group">
                                <input type="radio" name="${prefix}_tierValueType" value="pctOrder" class="sr-only peer" ${tierValueType === 'pctOrder' ? 'checked' : ''}>
                                <div class="w-4 h-4 rounded-full border border-default flex items-center justify-center mr-2 peer-checked:border-[hsl(var(--primary))] peer-checked:bg-[hsl(var(--primary))] transition-all">
                                    <div class="w-1.5 h-1.5 rounded-full bg-white scale-0 peer-checked:scale-100 transition-transform"></div>
                                </div>
                                <span class="secondary-text peer-checked:card-text transition-colors">${t('deliveryRules.valPctOrder')}</span>
                            </label>
                             <label class="flex items-center cursor-pointer group">
                                <input type="radio" name="${prefix}_tierValueType" value="pctDelivery" class="sr-only peer" ${tierValueType === 'pctDelivery' ? 'checked' : ''}>
                                <div class="w-4 h-4 rounded-full border border-default flex items-center justify-center mr-2 peer-checked:border-[hsl(var(--primary))] peer-checked:bg-[hsl(var(--primary))] transition-all">
                                    <div class="w-1.5 h-1.5 rounded-full bg-white scale-0 peer-checked:scale-100 transition-transform"></div>
                                </div>
                                <span class="secondary-text peer-checked:card-text transition-colors">${t('deliveryRules.valPctDelivery')}</span>
                            </label>
                        </div>
                    </div>
                </div>
            </details>
        `;
    }
    return html;
}

function renderDimensionInputs(prefix, data) {
    const isTiered = data.isTiered || false;
    const units = DIMENSION_UNITS;
    let html = '';

    // Unit Selector
    html += `
        <div class="mb-4">
            <label class="block text-xs font-semibold secondary-text mb-1 uppercase tracking-wide">${t('deliveryRules.unit')}</label>
            <select name="${prefix}_unit" class="w-full bg-[hsl(var(--card))] border border-default rounded-md px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors">
                ${units.map(u => `<option value="${u.value}" ${data.unit === u.value ? 'selected' : ''}>${u.label}</option>`).join('')}
            </select>
        </div>
    `;

    // Mode Toggle
    html += `
        <div class="mb-6 bg-[hsl(var(--muted))] p-1 rounded-lg inline-flex">
             <label class="px-3 py-1 rounded-md text-sm cursor-pointer transition-all ${!isTiered ? 'bg-[hsl(var(--card))] shadow-sm font-medium' : 'secondary-text'}">
                <input type="radio" name="${prefix}_mode_toggle" class="hidden is-tiered-toggle" value="single" ${!isTiered ? 'checked' : ''}>
                ${t('deliveryRules.singleRate')}
            </label>
            <label class="px-3 py-1 rounded-md text-sm cursor-pointer transition-all ${isTiered ? 'bg-[hsl(var(--card))] shadow-sm font-medium' : 'secondary-text'}">
                <input type="radio" name="${prefix}_mode_toggle" class="hidden is-tiered-toggle" value="tiered" ${isTiered ? 'checked' : ''}>
                ${t('deliveryRules.tieredPricing')}
            </label>
            <input type="checkbox" name="${prefix}_isTiered" class="is-tiered-checkbox hidden" ${isTiered ? 'checked' : ''}>
        </div>
    `;

    if (!isTiered) {
        // Single Rate (Max Dimensions -> Amount)
        html += `
             <div class="mb-4 p-4 bg-[hsl(var(--muted))] rounded-lg border border-default/50">
                 <div class="grid grid-cols-3 gap-4 mb-4">
                    <div>
                        <label class="block text-xs font-semibold secondary-text mb-1">${t('deliveryRules.length')} (Max)</label>
                        <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none" name="${prefix}_maxL" value="${data.maxL || ''}" placeholder="∞">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold secondary-text mb-1">${t('deliveryRules.width')} (Max)</label>
                        <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none" name="${prefix}_maxW" value="${data.maxW || ''}" placeholder="∞">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold secondary-text mb-1">${t('deliveryRules.height')} (Max)</label>
                        <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none" name="${prefix}_maxH" value="${data.maxH || ''}" placeholder="∞">
                    </div>
                 </div>
                 
                <div>
                    <label class="block text-xs font-semibold secondary-text mb-1">${t('deliveryRules.amount')}</label>
                    <div class="relative">
                        <input type="number" step="0.01" class="w-full bg-[hsl(var(--card))] border border-default rounded px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none pl-3 font-medium" 
                        name="${prefix}_amount" value="${data.amount || 0}">
                    </div>
                </div>
            </div>
        `;
    } else {
        // Tiered Options
        const tierType = data.tierType || 'global';
        const tierValueType = data.tierValueType || 'fixed';
        const tierValueMode = data.tierValueMode || 'perUnit';
        const unit = data.unit || (units[0] ? units[0].value : '');

        const valueLabel = getValueLabel('dimension', tierValueType, tierValueMode, unit);

        html += `
             <div class="mb-4">
                <p class="text-[10px] secondary-text italic mb-3 px-1 flex items-center gap-1.5">
                    <span class="icon icon-info w-3.5 h-3.5 flex-shrink-0 opacity-70"></span>
                    <span>${t('deliveryRules.tieredMaxLimitHelp')}</span>
                </p>

                <div class="flex gap-2 mb-2 text-xs font-semibold secondary-text uppercase tracking-wider pl-2 pr-2">
                    <div class="flex-1">Max ${t('deliveryRules.length')}</div>
                    <div class="flex-1">Max ${t('deliveryRules.width')}</div>
                    <div class="flex-1">Max ${t('deliveryRules.height')}</div>
                    <div class="flex-[1.5]">${t('deliveryRules.value')} (${valueLabel})</div>
                    <div class="w-8"></div>
                </div>

                <div class="ranges-container space-y-2 mb-4" data-prefix="${prefix}" data-type="dimension" data-tier-value-type="${tierValueType}" data-tier-value-mode="${tierValueMode}" data-unit="${unit}">
                     ${(data.ranges || []).map((range, idx) => renderRangeRow('dimension', prefix, idx, range, tierValueType, tierValueMode, unit)).join('')}
                    ${(!data.ranges || data.ranges.length === 0) ? `<div class="empty-placeholder text-xs secondary-text italic text-center py-4 bg-[hsl(var(--muted))] rounded-lg border border-dashed border-default">${t('deliveryRules.addRange')}</div>` : ''}
                </div>

                <button class="add-range-btn w-full py-2 flex items-center justify-center space-x-2 text-sm font-medium text-primary hover:bg-[hsl(var(--primary))]/10 rounded-md border border-dashed border-[hsl(var(--primary))]/30 transition-all" data-prefix="${prefix}">
                    <span class="text-lg leading-none">+</span>
                    <span>${t('deliveryRules.addRange')}</span>
                </button>
            </div>

            <!-- Advanced Settings -->
            <details class="text-xs group mt-4">
                <summary class="cursor-pointer secondary-text font-medium hover:text-primary transition-colors py-2 px-3 flex items-center gap-2 select-none rounded-md hover:bg-[hsl(var(--muted))]">
                    <span class="transition-transform group-open:rotate-90">▶</span>
                    <span>${t('deliveryRules.advancedSettings') || 'Advanced Settings'}</span>
                </summary>
                <div class="mt-2 p-3 bg-[hsl(var(--muted))] rounded-lg border border-default space-y-3">
                    <div>
                        <div class="flex items-center gap-1.5 mb-1">
                            <label class="block text-xs font-semibold">${t('deliveryRules.tierType')}</label>
                            <div class="icon icon-info w-3.5 h-3.5 opacity-70 cursor-help" title="${t('deliveryRules.tierTypeHelp')}"></div>
                        </div>
                        <div class="flex space-x-6">
                            <label class="flex items-center cursor-pointer group">
                                <input type="radio" name="${prefix}_tierType" value="global" class="sr-only peer" ${tierType === 'global' ? 'checked' : ''}>
                                <div class="w-4 h-4 rounded-full border border-default flex items-center justify-center mr-2 peer-checked:border-[hsl(var(--primary))] peer-checked:bg-[hsl(var(--primary))] transition-all">
                                    <div class="w-1.5 h-1.5 rounded-full bg-white scale-0 peer-checked:scale-100 transition-transform"></div>
                                </div>
                                <span class="secondary-text peer-checked:card-text transition-colors">${t('deliveryRules.tierGlobal')}</span>
                            </label>
                            <label class="flex items-center cursor-pointer group">
                                <input type="radio" name="${prefix}_tierType" value="cumulative" class="sr-only peer" ${tierType === 'cumulative' ? 'checked' : ''}>
                                <div class="w-4 h-4 rounded-full border border-default flex items-center justify-center mr-2 peer-checked:border-[hsl(var(--primary))] peer-checked:bg-[hsl(var(--primary))] transition-all">
                                    <div class="w-1.5 h-1.5 rounded-full bg-white scale-0 peer-checked:scale-100 transition-transform"></div>
                                </div>
                                <span class="secondary-text peer-checked:card-text transition-colors">${t('deliveryRules.tierCumulative')}</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-semibold mb-1">${t('deliveryRules.tierValueType')}</label>
                        <div class="flex flex-wrap gap-4">
                             <label class="flex items-center cursor-pointer group">
                                <input type="radio" name="${prefix}_tierValueType" value="fixed" class="sr-only peer" ${tierValueType === 'fixed' ? 'checked' : ''}>
                                <div class="w-4 h-4 rounded-full border border-default flex items-center justify-center mr-2 peer-checked:border-[hsl(var(--primary))] peer-checked:bg-[hsl(var(--primary))] transition-all">
                                    <div class="w-1.5 h-1.5 rounded-full bg-white scale-0 peer-checked:scale-100 transition-transform"></div>
                                </div>
                                <span class="secondary-text peer-checked:card-text transition-colors">${t('deliveryRules.valFixed')}</span>
                            </label>
                             <label class="flex items-center cursor-pointer group">
                                <input type="radio" name="${prefix}_tierValueType" value="pctOrder" class="sr-only peer" ${tierValueType === 'pctOrder' ? 'checked' : ''}>
                                <div class="w-4 h-4 rounded-full border border-default flex items-center justify-center mr-2 peer-checked:border-[hsl(var(--primary))] peer-checked:bg-[hsl(var(--primary))] transition-all">
                                    <div class="w-1.5 h-1.5 rounded-full bg-white scale-0 peer-checked:scale-100 transition-transform"></div>
                                </div>
                                <span class="secondary-text peer-checked:card-text transition-colors">${t('deliveryRules.valPctOrder')}</span>
                            </label>
                             <label class="flex items-center cursor-pointer group">
                                <input type="radio" name="${prefix}_tierValueType" value="pctDelivery" class="sr-only peer" ${tierValueType === 'pctDelivery' ? 'checked' : ''}>
                                <div class="w-4 h-4 rounded-full border border-default flex items-center justify-center mr-2 peer-checked:border-[hsl(var(--primary))] peer-checked:bg-[hsl(var(--primary))] transition-all">
                                    <div class="w-1.5 h-1.5 rounded-full bg-white scale-0 peer-checked:scale-100 transition-transform"></div>
                                </div>
                                <span class="secondary-text peer-checked:card-text transition-colors">${t('deliveryRules.valPctDelivery')}</span>
                            </label>
                        </div>
                    </div>
                </div>
            </details>
        `;
    }
    return html;
}

function renderCombinedInputs(prefix, data, type) {
    const weightUnits = WEIGHT_UNITS;
    const volUnits = type === 'weight_dimension' ? DIMENSION_UNITS : VOLUME_UNITS;
    const tierValueType = data.tierValueType || 'fixed';
    const tierValueMode = data.tierValueMode || 'perUnit';
    const weightUnit = data.weightUnit || (weightUnits[0] ? weightUnits[0].value : '');
    const volUnit = data.volUnit || (volUnits[0] ? volUnits[0].value : '');
     
    let html = '';
     
    // Units
    html += `<div class="flex space-x-4 mb-4">
        <div class="w-1/2">
             <label class="block text-xs font-semibold secondary-text mb-1 uppercase tracking-wide">${t('deliveryRules.weight')} ${t('deliveryRules.unit')}</label>
             <select name="${prefix}_weightUnit" class="w-full bg-[hsl(var(--card))] border border-default rounded-md px-3 py-2 text-sm focus:border-primary focus:outline-none">
                ${weightUnits.map(u => `<option value="${u.value}" ${data.weightUnit === u.value ? 'selected' : ''}>${u.label}</option>`).join('')}
             </select>
        </div>
        <div class="w-1/2">
             <label class="block text-xs font-semibold secondary-text mb-1 uppercase tracking-wide">${type === 'weight_dimension' ? t('deliveryRules.dimension') : t('deliveryRules.volume')} ${t('deliveryRules.unit')}</label>
             <select name="${prefix}_volUnit" class="w-full bg-[hsl(var(--card))] border border-default rounded-md px-3 py-2 text-sm focus:border-primary focus:outline-none">
                ${volUnits.map(u => `<option value="${u.value}" ${data.volUnit === u.value ? 'selected' : ''}>${u.label}</option>`).join('')}
             </select>
        </div>
    </div>`;

    const valueLabel = getValueLabel(type, tierValueType, tierValueMode, weightUnit, volUnit);

    html += `
            <div class="mb-4">
                <p class="text-[10px] secondary-text italic mb-3 px-1 flex items-center gap-1.5">
                    <span class="icon icon-info w-3.5 h-3.5 flex-shrink-0 opacity-70"></span>
                    <span>${t('deliveryRules.tieredMaxLimitHelp')}</span>
                </p>
                <div class="flex gap-2 mb-2 text-xs font-semibold secondary-text uppercase tracking-wider pl-2 pr-2">
                    <div class="flex-1">Max ${t('deliveryRules.weight')}</div>
                    ${type === 'weight_dimension' ? `
                        <div class="flex-1">Max ${t('deliveryRules.length')}</div>
                        <div class="flex-1">Max ${t('deliveryRules.width')}</div>
                        <div class="flex-1">Max ${t('deliveryRules.height')}</div>
                        <div class="flex-1">${t('deliveryRules.value')} (${valueLabel})</div>
                    ` : `
                        <div class="flex-1">Max ${t('deliveryRules.volume')}</div>
                        <div class="flex-[1.5]">${t('deliveryRules.value')} (${valueLabel})</div>
                    `}
                    <div class="w-8"></div>
                </div>

                <div class="ranges-container space-y-2 mb-4" data-prefix="${prefix}" data-type="${type}" data-tier-value-type="${tierValueType}" data-tier-value-mode="${tierValueMode}" data-unit="${weightUnit}" data-unit2="${volUnit}">
                    ${(data.ranges || []).map((range, idx) => renderRangeRow(type, prefix, idx, range, tierValueType, tierValueMode, weightUnit, volUnit)).join('')}
                     ${(!data.ranges || data.ranges.length === 0) ? `<div class="empty-placeholder text-xs secondary-text italic text-center py-4 bg-[hsl(var(--muted))] rounded-lg border border-dashed border-default">${t('deliveryRules.addRange')}</div>` : ''}
                </div>

                <button class="add-range-btn w-full py-2 flex items-center justify-center space-x-2 text-sm font-medium text-primary hover:bg-[hsl(var(--primary))]/10 rounded-md border border-dashed border-[hsl(var(--primary))]/30 transition-all" data-prefix="${prefix}">
                    <span class="text-lg leading-none">+</span>
                    <span>${t('deliveryRules.addRange')}</span>
                </button>
            </div>
    `;

    return html;
}

function updateValueLabels(container, prefix, type, data) {
    // Get current values
    const tierValueType = data.tierValueType || 'fixed';
    const tierValueMode = data.tierValueMode || 'perUnit';
    const unit = data.unit || '';
    const weightUnit = data.weightUnit || '';
    const volUnit = data.volUnit || '';

    // Generate the label
    let valueLabel = '';
    if (['quantity', 'distance', 'weight', 'volume'].includes(type)) {
        valueLabel = getValueLabel(type, tierValueType, tierValueMode, unit);
    } else if (type === 'dimension') {
        valueLabel = getValueLabel('dimension', tierValueType, tierValueMode, unit);
    } else if (['weight_volume', 'weight_dimension'].includes(type)) {
        valueLabel = getValueLabel(type, tierValueType, tierValueMode, weightUnit, volUnit);
    }

    // For dimension, weight_volume, weight_dimension: update header row only (no spans in range rows)
    if (['dimension', 'weight_volume', 'weight_dimension'].includes(type)) {
        const rangesContainer = container.querySelector('.ranges-container');
        if (rangesContainer) {
            // Find the header row (it's the previous sibling with class 'flex')
            let headerRow = rangesContainer.previousElementSibling;
            while (headerRow && !headerRow.classList.contains('flex')) {
                headerRow = headerRow.previousElementSibling;
            }

            if (headerRow) {
                // Find all divs in the header row
                const headerDivs = Array.from(headerRow.querySelectorAll('div'));
                // Find the div that contains the "Valeur" text
                const valueHeaderDiv = headerDivs.find(div => {
                    const text = div.textContent || '';
                    return text.includes(t('deliveryRules.value'));
                });

                if (valueHeaderDiv) {
                    // Update the text content directly
                    valueHeaderDiv.textContent = `${t('deliveryRules.value')} (${valueLabel})`;
                }
            }
        }
    }
    // For quantity, distance, weight, volume: update spans in range rows only (no header row)
    else if (['quantity', 'distance', 'weight', 'volume'].includes(type)) {
        const rangeRows = container.querySelectorAll('.range-row');
        rangeRows.forEach(row => {
            const valueInput = row.querySelector('input[name$="_value"]');
            if (valueInput) {
                const parent = valueInput.parentElement;
                const existingSpan = parent.querySelector('span.absolute');
                if (existingSpan) {
                    existingSpan.textContent = `${t('deliveryRules.value')} (${valueLabel})`;
                }
            }
        });
    }
}

function extractCalculationRule(prefix, container) {
    const typeRadio = container.querySelector(`input[name="${prefix}_type"]:checked`);
    const type = typeRadio ? typeRadio.value : 'fixed';
    
    const rule = { type };
    
    if (type === 'fixed') {
        const amountInput = container.querySelector(`input[name="${prefix}_amount"]`);
        rule.amount = amountInput ? parseFloat(amountInput.value) || 0 : 0;
    } else if (type === 'percentage') {
        const baseRadio = container.querySelector(`input[name="${prefix}_base"]:checked`);
        rule.base = baseRadio ? baseRadio.value : 'order';
        const rateInput = container.querySelector(`input[name="${prefix}_rate"]`);
        rule.rate = rateInput ? parseFloat(rateInput.value) || 0 : 0;
    } else if (['quantity', 'distance', 'weight', 'volume'].includes(type)) { // EXCLUDE dimension
        const unitSelect = container.querySelector(`select[name="${prefix}_unit"]`);
        if (unitSelect) rule.unit = unitSelect.value;
        
        const isTieredCb = container.querySelector(`input[name="${prefix}_isTiered"]`);
        rule.isTiered = isTieredCb ? isTieredCb.checked : false;
        
        if (!rule.isTiered) {
             const amountInput = container.querySelector(`input[name="${prefix}_amount"]`);
             rule.amount = amountInput ? parseFloat(amountInput.value) || 0 : 0;
        } else {
             const tierTypeRadio = container.querySelector(`input[name="${prefix}_tierType"]:checked`);
             rule.tierType = tierTypeRadio ? tierTypeRadio.value : 'global';
             
             const valTypeRadio = container.querySelector(`input[name="${prefix}_tierValueType"]:checked`);
             rule.tierValueType = valTypeRadio ? valTypeRadio.value : 'fixed';
             
             const valModeRadio = container.querySelector(`input[name="${prefix}_tierValueMode"]:checked`);
             rule.tierValueMode = valModeRadio ? valModeRadio.value : 'perUnit';
             
             rule.ranges = [];
             // name="${prefix}_range_${idx}_min"
             const rangeInputs = Array.from(container.querySelectorAll(`input[name^="${prefix}_range_"]`));
             const rangesMap = {};
             rangeInputs.forEach(inp => {
                 const match = inp.name.match(new RegExp(`${prefix}_range_(\\d+)_(.+)`));
                 if (match) {
                     const idx = match[1];
                     const field = match[2]; // min, max, value
                     if (!rangesMap[idx]) rangesMap[idx] = {};

                     // Handle infinity: empty max field should be null, not 0
                     if (field === 'max' && (inp.value === '' || inp.value === null || inp.value === undefined)) {
                         rangesMap[idx][field] = null;
                     } else {
                         const parsedValue = parseFloat(inp.value);
                         rangesMap[idx][field] = isNaN(parsedValue) ? 0 : parsedValue;
                     }
                 }
             });
             rule.ranges = Object.values(rangesMap);
        }
    } else if (type === 'dimension') {
        const unitSelect = container.querySelector(`select[name="${prefix}_unit"]`);
        if (unitSelect) rule.unit = unitSelect.value;

        const isTieredCb = container.querySelector(`input[name="${prefix}_isTiered"]`);
        rule.isTiered = isTieredCb ? isTieredCb.checked : false;
        
        if (!rule.isTiered) {
            const maxL = container.querySelector(`input[name="${prefix}_maxL"]`);
            const maxW = container.querySelector(`input[name="${prefix}_maxW"]`);
            const maxH = container.querySelector(`input[name="${prefix}_maxH"]`);
            const amount = container.querySelector(`input[name="${prefix}_amount"]`);
            rule.maxL = maxL ? parseFloat(maxL.value) || 0 : 0;
            rule.maxW = maxW ? parseFloat(maxW.value) || 0 : 0;
            rule.maxH = maxH ? parseFloat(maxH.value) || 0 : 0;
            rule.amount = amount ? parseFloat(amount.value) || 0 : 0;
        } else {
             const tierTypeRadio = container.querySelector(`input[name="${prefix}_tierType"]:checked`);
             rule.tierType = tierTypeRadio ? tierTypeRadio.value : 'global';
             const valTypeRadio = container.querySelector(`input[name="${prefix}_tierValueType"]:checked`);
             rule.tierValueType = valTypeRadio ? valTypeRadio.value : 'fixed';
             
             const valModeRadio = container.querySelector(`input[name="${prefix}_tierValueMode"]:checked`);
             rule.tierValueMode = valModeRadio ? valModeRadio.value : 'perUnit';

             rule.ranges = [];
             const rangeInputs = Array.from(container.querySelectorAll(`input[name^="${prefix}_range_"]`));
             const rangesMap = {};
             rangeInputs.forEach(inp => {
                 const match = inp.name.match(new RegExp(`${prefix}_range_(\\d+)_(.+)`));
                 if (match) {
                     const idx = match[1];
                     const field = match[2]; // maxL, maxW, maxH, value
                     if (!rangesMap[idx]) rangesMap[idx] = {};

                     // Handle infinity: empty max fields should be null, not 0
                     if (['maxL', 'maxW', 'maxH'].includes(field) && (inp.value === '' || inp.value === null || inp.value === undefined)) {
                         rangesMap[idx][field] = null;
                     } else {
                         const parsedValue = parseFloat(inp.value);
                         rangesMap[idx][field] = isNaN(parsedValue) ? 0 : parsedValue;
                     }
                 }
             });
             rule.ranges = Object.values(rangesMap);
        }

    } else if (['weight_volume', 'weight_dimension'].includes(type)) {
         const wUnit = container.querySelector(`select[name="${prefix}_weightUnit"]`);
         if (wUnit) rule.weightUnit = wUnit.value;
         const vUnit = container.querySelector(`select[name="${prefix}_volUnit"]`);
         if (vUnit) rule.volUnit = vUnit.value;
         
         const valTypeRadio = container.querySelector(`input[name="${prefix}_tierValueType"]:checked`);
         if (valTypeRadio) rule.tierValueType = valTypeRadio.value;
         
         const valModeRadio = container.querySelector(`input[name="${prefix}_tierValueMode"]:checked`);
         if (valModeRadio) rule.tierValueMode = valModeRadio.value;
         
         rule.ranges = [];
         const rangeInputs = Array.from(container.querySelectorAll(`input[name^="${prefix}_range_"]`));
         const rangesMap = {};
         rangeInputs.forEach(inp => {
             const match = inp.name.match(new RegExp(`${prefix}_range_(\\d+)_(.+)`));
             if (match) {
                 const idx = match[1];
                 const field = match[2]; // maxWeight, maxVol, value
                 if (!rangesMap[idx]) rangesMap[idx] = {};

                 // Handle infinity: empty max fields should be null, not 0
                 if (['maxWeight', 'maxVol'].includes(field) && (inp.value === '' || inp.value === null || inp.value === undefined)) {
                     rangesMap[idx][field] = null;
                 } else {
                     const parsedValue = parseFloat(inp.value);
                     rangesMap[idx][field] = isNaN(parsedValue) ? 0 : parsedValue;
                 }
             }
         });
         rule.ranges = Object.values(rangesMap);
    }
    
    return rule;
}

// ============================================================================
// HTML COMPONENT HELPERS
// ============================================================================

/**
 * Génère un radio button avec son label et icône help
 */
function renderRadioOption(config) {
  const { name, value, checked, label, helpText, helpIcon = true, additionalClasses = '' } = config
  const radioId = `${name}_${value}`
  
  return `
    <div class="relative ${additionalClasses}">
      <label for="${radioId}" class="flex items-center p-4 border border-default rounded-xl cursor-pointer hover:bg-[hsl(var(--muted))] transition-all bg-[hsl(var(--card))] has-[:checked]:border-[hsl(var(--primary))] has-[:checked]:bg-[hsl(var(--muted))]/50 has-[:checked]:ring-1 has-[:checked]:ring-[hsl(var(--primary))]/20">
        <input type="radio" id="${radioId}" name="${name}" value="${value}" class="sr-only peer" ${checked ? 'checked' : ''}>
        <div class="w-5 h-5 rounded-full border border-default flex items-center justify-center mr-3 peer-checked:border-[hsl(var(--primary))] peer-checked:bg-[hsl(var(--primary))] transition-all">
          <div class="w-2 h-2 rounded-full bg-white scale-0 peer-checked:scale-100 transition-transform"></div>
        </div>
        <span class="card-text font-medium text-sm transition-colors peer-checked:text-primary flex-1 truncate">${label}</span>
        ${helpIcon && helpText ? `<div class="icon icon-help w-4 h-4 secondary-text opacity-40 hover:opacity-100 transition-opacity cursor-help" title="${helpText}"></div>` : ''}
      </label>
    </div>
  `
}

/**
 * Génère un toggle switch avec son label
 */
function renderToggleSwitch(config) {
  const { id, label, checked, containerClass = '', additionalAttrs = '' } = config
  
  return `
    <div class="${containerClass}">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium card-text">${label}</span>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" id="${id}" class="sr-only peer" ${checked ? 'checked' : ''} ${additionalAttrs}>
          <div class="toggle-switch"></div>
        </label>
      </div>
    </div>
  `
}

/**
 * Génère un input de seuil conditionnel
 */
function renderConditionalThresholdInput(config) {
  const { containerClass, inputClass, label, value, visible, placeholder = '0.00', additionalAttrs = '' } = config
  
  return `
    <div class="${containerClass}" style="display: ${visible ? 'block' : 'none'}">
      <label class="block text-xs secondary-text mb-1 ml-1">${label}</label>
      <input type="number" class="w-full px-3 py-2 border border-default input-bg card-text rounded-md ${inputClass} focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" value="${value || ''}" placeholder="${placeholder}" step="0.01" ${additionalAttrs}>
    </div>
  `
}

/**
 * Génère un bouton d'action primaire ou secondaire
 */
function renderActionButton(config) {
  const { id, label, icon, primary = true, fullWidth = false, additionalClass = '' } = config
  const bgClass = primary ? 'primary-bg primary-text' : 'secondary-bg secondary-text'
  const widthClass = fullWidth ? 'w-full' : ''
  
  return `
    <button id="${id}" class="${widthClass} flex items-center justify-center space-x-2 cursor-pointer ${bgClass} px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm border border-default ${additionalClass}">
      ${icon ? `<span class="icon icon-${icon} h-5 w-5"></span>` : ''}
      <span class="text-base font-medium">${label}</span>
    </button>
  `
}

// ============================================================================
// END HTML COMPONENT HELPERS
// ============================================================================

// ============================================================================
// TIER VALIDATION MODULE
// ============================================================================

/**
 * Get the type of a calculation rule container
 */
function getTierType(container) {
    const prefix = container.dataset.prefix;
    const typeRadio = container.querySelector(`input[name="${prefix}_type"]:checked`);
    return typeRadio ? typeRadio.value : 'quantity';
}

/**
 * Check if a type requires integer values (quantity only)
 */
function requiresInteger(type) {
    return type === 'quantity';
}

/**
 * Get minimum value for first tier based on type
 */
function getMinValueForFirstTier(type) {
    return requiresInteger(type) ? 1 : 0;
}

/**
 * Parse a tier range from DOM inputs
 */
function parseTierRange(row, type) {
    const minInput = row.querySelector('input[name$="_min"]');
    const maxInput = row.querySelector('input[name$="_max"]');
    const valueInput = row.querySelector('input[name$="_value"]');

    // Parse max value - if it's an invalid number (NaN), treat it as null but keep the input for validation
    let maxValue = null;
    if (maxInput && maxInput.value !== '') {
        const parsed = parseFloat(maxInput.value);
        maxValue = !isNaN(parsed) ? parsed : null;
    }

    return {
        row: row,
        index: parseInt(row.dataset.index),
        min: minInput ? parseFloat(minInput.value) || 0 : 0,
        max: maxValue,
        value: valueInput ? parseFloat(valueInput.value) || 0 : 0,
        minInput: minInput,
        maxInput: maxInput,
        valueInput: valueInput
    };
}

/**
 * Get all tier ranges from a container
 */
function getAllTierRanges(container, type) {
    const rangesContainer = container.querySelector('.ranges-container');
    if (!rangesContainer) return [];

    const rows = Array.from(rangesContainer.querySelectorAll('.range-row'));
    return rows.map(row => parseTierRange(row, type));
}

/**
 * Show validation error on an input field
 * @param {HTMLElement} input - The input element
 * @param {string} message - Error message
 * @param {string} severity - 'warning' (orange) or 'error' (red)
 */
function showTierInputError(input, message, severity = 'warning') {
    if (!input) return;

    // Remove existing error state
    clearTierInputError(input);

    // Add appropriate border color
    if (severity === 'error') {
        input.classList.add('!border-red-500', 'focus:!ring-red-500');
        input.dataset.errorSeverity = 'error';
    } else {
        input.classList.add('!border-orange-500', 'focus:!ring-orange-500');
        input.dataset.errorSeverity = 'warning';
    }

    // Add error message below the row (after it, not inside it)
    const row = input.closest('.range-row');
    if (row) {
        // Check if there's already an error div after this row
        let errorDiv = row.nextElementSibling;
        if (!errorDiv || !errorDiv.classList.contains('tier-error-message')) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'tier-error-message text-xs mt-1 px-2 mb-2';
            // Insert after the row, not inside it
            row.parentNode.insertBefore(errorDiv, row.nextSibling);
        }

        if (severity === 'error') {
            errorDiv.className = 'tier-error-message text-xs text-red-500 mt-1 px-2 mb-2';
        } else {
            errorDiv.className = 'tier-error-message text-xs text-orange-500 mt-1 px-2 mb-2';
        }

        errorDiv.textContent = message;
    }
}

/**
 * Clear validation error from an input field
 */
function clearTierInputError(input) {
    if (!input) return;

    input.classList.remove('!border-red-500', 'focus:!ring-red-500', '!border-orange-500', 'focus:!ring-orange-500');
    delete input.dataset.errorSeverity;

    const row = input.closest('.range-row');
    if (row) {
        // Check if next sibling is an error message
        const errorDiv = row.nextElementSibling;
        if (errorDiv && errorDiv.classList.contains('tier-error-message')) {
            errorDiv.remove();
        }
    }
}

/**
 * Clear all validation errors in a container
 */
function clearAllTierErrors(container) {
    const inputs = container.querySelectorAll('input[data-error-severity]');
    inputs.forEach(input => clearTierInputError(input));

    const errorDivs = container.querySelectorAll('.tier-error-message');
    errorDivs.forEach(div => div.remove());

    // Clear container-level errors
    const rangesContainer = container.querySelector('.ranges-container');
    if (rangesContainer) {
        const containerError = rangesContainer.querySelector('.tier-container-error');
        if (containerError) containerError.remove();
    }
}

/**
 * Validate that min is >= 0 (or >= 1 for first quantity tier)
 */
function validateMinValue(range, type, isFirstTier, severity = 'warning') {
    const minRequired = isFirstTier ? getMinValueForFirstTier(type) : 0;

    if (range.min < minRequired) {
        const message = isFirstTier && requiresInteger(type)
            ? t('validation.tier.minMustBeOne')
            : t('validation.tier.minMustBeZeroOrMore');
        showTierInputError(range.minInput, message, severity);
        return false;
    }

    return true;
}

/**
 * Validate that max > min (when max is not empty)
 */
function validateMaxGreaterThanMin(range, type, severity = 'warning') {
    if (range.max !== null && range.max <= range.min) {
        showTierInputError(range.maxInput, t('validation.tier.maxMustBeGreaterThanMin'), severity);
        return false;
    }

    return true;
}

/**
 * Validate that field values are valid numbers
 */
function validateNumericFields(range, type, severity = 'warning', isLastTier = false) {
    let valid = true;

    // Check min is a valid number
    if (range.minInput) {
        const minValue = range.minInput.value.trim();
        if (minValue === '' || isNaN(parseFloat(minValue))) {
            showTierInputError(range.minInput, t('validation.tier.mustBeNumber'), severity);
            valid = false;
        }
    }

    // Check max is a valid number
    // Empty max is only allowed for the last tier (means infinity)
    if (range.maxInput) {
        const maxValue = range.maxInput.value.trim();

        if (maxValue === '') {
            // Empty max is only valid for the last tier
            if (!isLastTier) {
                showTierInputError(range.maxInput, t('validation.tier.mustBeNumber'), severity);
                valid = false;
            }
        } else if (isNaN(parseFloat(maxValue))) {
            // Non-empty but invalid number
            showTierInputError(range.maxInput, t('validation.tier.mustBeNumber'), severity);
            valid = false;
        }
    }

    // Check value is a valid number (always for submission, only if filled for live)
    if (range.valueInput) {
        const valueStr = range.valueInput.value.trim();
        if (severity === 'error') {
            // Submission: value must be filled and valid
            if (valueStr === '' || isNaN(parseFloat(valueStr))) {
                showTierInputError(range.valueInput, t('validation.tier.mustBeNumber'), severity);
                valid = false;
            }
        } else {
            // Live validation: only validate if something is entered
            if (valueStr !== '' && isNaN(parseFloat(valueStr))) {
                showTierInputError(range.valueInput, t('validation.tier.mustBeNumber'), severity);
                valid = false;
            }
        }
    }

    return valid;
}

/**
 * Validate integer constraint for quantity types
 */
function validateIntegerConstraint(range, type, severity = 'warning') {
    if (!requiresInteger(type)) return true;

    let valid = true;

    // Check min is integer
    if (!isNaN(range.min) && range.min !== Math.floor(range.min)) {
        showTierInputError(range.minInput, t('validation.tier.mustBeInteger'), severity);
        valid = false;
    }

    // Check max is integer (if not null)
    if (range.max !== null && !isNaN(range.max) && range.max !== Math.floor(range.max)) {
        showTierInputError(range.maxInput, t('validation.tier.mustBeInteger'), severity);
        valid = false;
    }

    return valid;
}

/**
 * Validate value is filled and >= 0
 */
function validateValueField(range, severity = 'warning') {
    if (!range.valueInput) return true;

    const valueStr = range.valueInput.value.trim();

    // Check if empty (only for submission validation)
    if (severity === 'error' && valueStr === '') {
        showTierInputError(range.valueInput, t('validation.tier.valueRequired'), severity);
        return false;
    }

    // Check if negative
    if (range.value < 0) {
        showTierInputError(range.valueInput, t('validation.tier.valueMustBePositive'), severity);
        return false;
    }

    return true;
}

/**
 * Validate continuity between consecutive tiers (no gaps)
 */
function validateContinuity(currentRange, previousRange, type, severity = 'warning') {
    if (!previousRange) return true;

    // Previous tier must have a max
    if (previousRange.max === null) {
        // This is handled by validateLastTierInfinity
        return true;
    }

    const expectedMin = requiresInteger(type) ? previousRange.max + 1 : previousRange.max;

    if (currentRange.min !== expectedMin) {
        const message = t('validation.tier.gapBetweenTiers');
        showTierInputError(currentRange.minInput, message, severity);
        return false;
    }

    return true;
}

/**
 * Validate no overlaps between tiers
 */
function validateNoOverlap(currentRange, previousRange, type, severity = 'warning') {
    if (!previousRange || previousRange.max === null) return true;

    const minRequired = requiresInteger(type) ? previousRange.max + 1 : previousRange.max;

    if (currentRange.min < minRequired) {
        showTierInputError(currentRange.minInput, t('validation.tier.overlapDetected'), severity);
        return false;
    }

    return true;
}

/**
 * Validate that last tier has empty max (infinity)
 */
function validateLastTierInfinity(ranges, severity = 'error') {
    if (ranges.length === 0) return true;

    const lastRange = ranges[ranges.length - 1];
    if (lastRange.max !== null) {
        showTierInputError(lastRange.maxInput, t('validation.tier.lastTierMustBeInfinity'), severity);
        return false;
    }

    return true;
}

/**
 * Validate at least one tier exists
 */
function validateAtLeastOneTier(ranges, container, severity = 'error') {
    if (ranges.length === 0) {
        // Show error message in the ranges container
        const rangesContainer = container.querySelector('.ranges-container');
        if (rangesContainer) {
            let errorDiv = rangesContainer.querySelector('.tier-container-error');
            if (!errorDiv) {
                errorDiv = document.createElement('div');
                errorDiv.className = 'tier-container-error text-sm text-red-500 text-center py-2 px-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-300 dark:border-red-700';
                rangesContainer.insertBefore(errorDiv, rangesContainer.firstChild);
            }
            errorDiv.textContent = t('validation.tier.atLeastOneTierRequired');
        }
        return false;
    }

    // Remove container error if exists
    const rangesContainer = container.querySelector('.ranges-container');
    if (rangesContainer) {
        const errorDiv = rangesContainer.querySelector('.tier-container-error');
        if (errorDiv) errorDiv.remove();
    }

    return true;
}

/**
 * Validate no duplicate ranges
 */
function validateNoDuplicates(ranges, severity = 'error') {
    const seen = new Set();
    let valid = true;

    ranges.forEach(range => {
        const key = `${range.min}-${range.max}`;
        if (seen.has(key)) {
            showTierInputError(range.minInput, t('validation.tier.duplicateRange'), severity);
            showTierInputError(range.maxInput, t('validation.tier.duplicateRange'), severity);
            valid = false;
        }
        seen.add(key);
    });

    return valid;
}

/**
 * Perform live validation on a single input field
 */
function performLiveValidation(input, container) {
    const type = getTierType(container);
    const ranges = getAllTierRanges(container, type);
    const row = input.closest('.range-row');

    if (!row) return;

    const currentRange = parseTierRange(row, type);
    const currentIndex = ranges.findIndex(r => r.row === row);
    const isFirstTier = currentIndex === 0;
    const isLastTier = currentIndex === ranges.length - 1;
    const previousRange = currentIndex > 0 ? ranges[currentIndex - 1] : null;

    // Clear existing error on this input
    clearTierInputError(input);

    // Determine which field was blurred
    const fieldName = input.name.split('_').pop();

    if (fieldName === 'min') {
        // First validate it's a number
        if (!validateNumericFields(currentRange, type, 'warning', isLastTier)) return;

        validateMinValue(currentRange, type, isFirstTier, 'warning');
        validateIntegerConstraint(currentRange, type, 'warning');
        validateContinuity(currentRange, previousRange, type, 'warning');
        validateNoOverlap(currentRange, previousRange, type, 'warning');
    } else if (fieldName === 'max') {
        // First validate it's a number
        if (!validateNumericFields(currentRange, type, 'warning', isLastTier)) return;

        validateMaxGreaterThanMin(currentRange, type, 'warning');
        validateIntegerConstraint(currentRange, type, 'warning');

        // Check continuity of NEXT tier if it exists
        if (currentIndex < ranges.length - 1) {
            const nextRange = ranges[currentIndex + 1];
            const nextMinInput = nextRange.minInput;
            clearTierInputError(nextMinInput);

            // Re-parse next range as auto-continuity may have updated it
            const updatedNextRange = parseTierRange(nextRange.row, type);
            validateContinuity(updatedNextRange, currentRange, type, 'warning');
        }
    } else if (fieldName === 'value') {
        // Validate it's a valid number and positive
        validateNumericFields(currentRange, type, 'warning', isLastTier);
        if (currentRange.value < 0) {
            validateValueField(currentRange, 'warning');
        }
    }
}

/**
 * Perform complete validation before submission
 * Returns true if all validations pass, false otherwise
 */
function performSubmissionValidation(container) {
    const type = getTierType(container);
    const ranges = getAllTierRanges(container, type);

    // Clear all existing errors
    clearAllTierErrors(container);

    let valid = true;

    // Rule 1: At least one tier must exist
    if (!validateAtLeastOneTier(ranges, container, 'error')) {
        valid = false;
    }

    if (ranges.length === 0) {
        return false; // Can't proceed with other validations
    }

    // Rule 2: Last tier must have empty max (infinity)
    if (!validateLastTierInfinity(ranges, 'error')) {
        valid = false;
    }

    // Rule 3: No duplicate ranges
    if (!validateNoDuplicates(ranges, 'error')) {
        valid = false;
    }

    // Rule 4-10: Validate each tier
    ranges.forEach((range, index) => {
        const isFirstTier = index === 0;
        const isLastTier = index === ranges.length - 1;
        const previousRange = index > 0 ? ranges[index - 1] : null;

        // FIRST: Validate all fields are valid numbers
        if (!validateNumericFields(range, type, 'error', isLastTier)) {
            valid = false;
            return; // Skip other validations if fields aren't valid numbers
        }

        // Min >= 0 (or >= 1 for first quantity tier)
        if (!validateMinValue(range, type, isFirstTier, 'error')) {
            valid = false;
        }

        // Max > Min (when max is not empty)
        if (!validateMaxGreaterThanMin(range, type, 'error')) {
            valid = false;
        }

        // Integer constraint for quantity
        if (!validateIntegerConstraint(range, type, 'error')) {
            valid = false;
        }

        // No gaps between consecutive tiers
        if (!validateContinuity(range, previousRange, type, 'error')) {
            valid = false;
        }

        // No overlaps
        if (!validateNoOverlap(range, previousRange, type, 'error')) {
            valid = false;
        }

        // Value must be filled and >= 0
        if (!validateValueField(range, 'error')) {
            valid = false;
        }
    });

    return valid;
}

/**
 * Validate numeric fields for non-tiered calculation types (Fixed, Percentage)
 */
function validateNonTieredFields(container) {
    const prefix = container.dataset.prefix;
    const type = getTierType(container);
    let valid = true;

    // Validate Fixed amount
    if (type === 'fixed') {
        const amountInput = container.querySelector(`input[name="${prefix}_amount"]`);
        if (amountInput) {
            const value = parseFloat(amountInput.value);
            if (isNaN(value) || amountInput.value.trim() === '') {
                amountInput.classList.add('!border-red-500', 'focus:!ring-red-500');

                // Add error message after the input
                let errorDiv = amountInput.parentElement.querySelector('.field-error-message');
                if (!errorDiv) {
                    errorDiv = document.createElement('div');
                    errorDiv.className = 'field-error-message text-xs text-red-500 mt-1';
                    amountInput.parentElement.appendChild(errorDiv);
                }
                errorDiv.textContent = t('validation.tier.mustBeNumber');
                valid = false;
            } else {
                amountInput.classList.remove('!border-red-500', 'focus:!ring-red-500');
                const errorDiv = amountInput.parentElement.querySelector('.field-error-message');
                if (errorDiv) errorDiv.remove();
            }
        }
    }

    // Validate Percentage rate
    if (type === 'percentage') {
        const rateInput = container.querySelector(`input[name="${prefix}_rate"]`);
        if (rateInput) {
            const value = parseFloat(rateInput.value);
            if (isNaN(value) || rateInput.value.trim() === '') {
                rateInput.classList.add('!border-red-500', 'focus:!ring-red-500');

                // Add error message after the input
                let errorDiv = rateInput.parentElement.querySelector('.field-error-message');
                if (!errorDiv) {
                    errorDiv = document.createElement('div');
                    errorDiv.className = 'field-error-message text-xs text-red-500 mt-1';
                    rateInput.parentElement.appendChild(errorDiv);
                }
                errorDiv.textContent = t('validation.tier.mustBeNumber');
                valid = false;
            } else {
                rateInput.classList.remove('!border-red-500', 'focus:!ring-red-500');
                const errorDiv = rateInput.parentElement.querySelector('.field-error-message');
                if (errorDiv) errorDiv.remove();
            }
        }
    }

    return valid;
}

/**
 * Validate all tier-based forms in the current view
 * Used before saving
 */
function validateAllTierForms() {
    let allValid = true;

    // Find all calculation rule containers
    const containers = document.querySelectorAll('.calculation-rules-container');

    containers.forEach(container => {
        const prefix = container.dataset.prefix;
        const type = getTierType(container);
        const isTieredCb = container.querySelector(`input[name="${prefix}_isTiered"]`);

        // Validate non-tiered modes (Fixed, Percentage)
        if (!isTieredCb || !isTieredCb.checked) {
            if (!validateNonTieredFields(container)) {
                allValid = false;
            }
        }
        // Validate tiered modes
        else {
            // Only validate types that use min/max/value structure
            if (['quantity', 'distance', 'weight', 'volume'].includes(type)) {
                if (!performSubmissionValidation(container)) {
                    allValid = false;
                }
            }
        }
    });

    return allValid;
}

// ============================================================================
// END TIER VALIDATION MODULE
// ============================================================================

// ============================================================================
// EVENT HANDLERS MODULE
// ============================================================================

/**
 * Configure les listeners pour la sélection "Same Seller"
 */
function setupSameSellerListener(container) {
  const sameSellerSelect = container.querySelector('.same-seller-select')
  if (!sameSellerSelect) return
  
  sameSellerSelect.addEventListener('change', (e) => {
    const value = e.target.value
    const configContainer = container.querySelector('.custom-config-container')
    if (!configContainer) return
    
    configContainer.style.display = (value && value !== 'None') ? 'none' : 'block'
  })
}

/**
 * Configure les listeners pour les billing method radios
 */
function setupBillingMethodListeners(container, safeSellerId) {
  const radios = container.querySelectorAll('.billing-method-radio')
  radios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const val = e.target.value
      toggleBillingMethodSections(safeSellerId, val)
    })
  })
}

/**
 * Toggle la visibilité des sections selon le billing method
 */
function toggleBillingMethodSections(safeSellerId, method) {
  const globalFreeContainer = document.querySelector('.global-free-shipping-container')
  const groupsContainer = document.getElementById(`groups-container-${safeSellerId}`)
  const globalCalcContainer = document.getElementById(`calc-global-${safeSellerId}`)
  
  switch(method) {
    case 'global':
      if (globalFreeContainer) globalFreeContainer.style.display = 'block'
      if (groupsContainer) groupsContainer.style.display = 'none'
      if (globalCalcContainer) globalCalcContainer.style.display = 'block'
      break
    case 'groups':
      if (globalFreeContainer) globalFreeContainer.style.display = 'none'
      if (groupsContainer) groupsContainer.style.display = 'block'
      if (globalCalcContainer) globalCalcContainer.style.display = 'none'
      break
    case 'free':
      if (globalFreeContainer) globalFreeContainer.style.display = 'none'
      if (groupsContainer) groupsContainer.style.display = 'none'
      if (globalCalcContainer) globalCalcContainer.style.display = 'none'
      break
  }
}

/**
 * Configure le listener pour le toggle de free shipping
 */
function setupFreeShippingToggle(container, selector, thresholdSelector) {
  const checkbox = container.querySelector(selector)
  if (!checkbox) return
  
  checkbox.addEventListener('change', (e) => {
    const inputDiv = container.querySelector(thresholdSelector)
    if (inputDiv) {
      inputDiv.style.display = e.target.checked ? 'block' : 'none'
    }
  })
}

/**
 * Configure le listener pour le bouton "Add Group"
 */
function setupAddGroupButtonListener(session, seller, safeSellerId) {
  const addGroupBtn = document.querySelector('.add-group-btn')
  if (!addGroupBtn) return
  
  addGroupBtn.addEventListener('click', () => {
    const container = document.querySelector('.groups-list')
    const index = container.children.length
    const newGroupHtml = renderGroupItem(session, seller, { name: t("deliveryRules.newGroupPlaceholder") }, index, safeSellerId)
    
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = newGroupHtml
    container.appendChild(tempDiv.firstElementChild)
  })
}

// ============================================================================
// END EVENT HANDLERS MODULE
// ============================================================================

function getRule(session, seller) {
  const rule = (session.deliveryRules || []).find(r => r.seller === seller) || {}
  // Migration/Default logic
  if (!rule.billingMethod) {
    if (rule.type) { // Existing rule
       rule.billingMethod = 'global'
    } else {
       rule.billingMethod = 'global' // Default
    }
  }
  return rule
}

function getSellerProducts(session, seller) {
  return session.products.filter(p => 
    p.pages.some(page => page.seller === seller)
  )
}

function renderSellerRecapCard(session, seller, rule) {
  const billingMethod = rule.billingMethod || 'global'
  const copiedFrom = rule.copiedFrom || null

  // Helper to render detailed calculation method
  function renderCalcMethodDetails(calcMethod, indent = false) {
    if (!calcMethod || !calcMethod.type) return ''

    const type = calcMethod.type
    const indentClass = indent ? 'ml-4' : ''
    let html = ''

    if (type === 'free') {
      html = `<div class="${indentClass} text-sm card-text font-medium">${t("deliveryRules.freeDelivery")}</div>`
    } else if (type === 'item') {
      html = `<div class="${indentClass} text-sm secondary-text italic">${t("deliveryRules.typeItem")}</div>`
    } else if (type === 'fixed') {
      const amount = calcMethod.amount || 0
      html = `
        <div class="${indentClass} text-sm secondary-text">
          <span class="font-medium">${t("deliveryRules.typeFixed")}:</span>
          <span class="card-text font-semibold">${amount.toFixed(2)} ${currentCurrencySymbol}</span>
        </div>
      `
    } else if (type === 'percentage') {
      const rate = calcMethod.rate || 0
      const base = calcMethod.base || 'order'
      const baseLabel = base === 'order' ? t("deliveryRules.baseOrder") : t("deliveryRules.baseDelivery")
      html = `
        <div class="${indentClass} text-sm secondary-text">
          <span class="font-medium">${t("deliveryRules.typePercentage")}:</span>
          <span class="card-text font-semibold">${(rate * 100).toFixed(2)}%</span>
          <span class="text-xs muted-text">(${baseLabel})</span>
        </div>
      `
    } else {
      // Other types: quantity, distance, weight, volume, dimension, weight_volume, weight_dimension
      const typeLabels = {
        'quantity': t("deliveryRules.typeQuantity"),
        'distance': t("deliveryRules.typeDistance"),
        'weight': t("deliveryRules.typeWeight"),
        'volume': t("deliveryRules.typeVolume"),
        'dimension': t("deliveryRules.typeDimension"),
        'weight_volume': t("deliveryRules.typeWeightVolume"),
        'weight_dimension': t("deliveryRules.typeWeightDimension")
      }

      const ranges = calcMethod.ranges || []
      const isTiered = calcMethod.isTiered !== false && ranges.length > 0

      if (isTiered) {
        // Tiered pricing with ranges
        const tierValueType = calcMethod.tierValueType || 'fixed'
        const tierValueMode = calcMethod.tierValueMode || 'total'

        html = `
          <div class="${indentClass} text-sm">
            <div class="font-medium secondary-text mb-1">
              ${typeLabels[type] || type}
              <span class="text-xs muted-text font-normal ml-1">
                (${ranges.length} ${ranges.length === 1 ? t("deliveryRules.addRange").toLowerCase() : t("deliveryRules.ranges").toLowerCase()})
              </span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-xs border-collapse">
                <thead>
                  <tr class="border-b border-default">
                    <th class="text-left py-1 px-2 secondary-text font-medium">${t("deliveryRules.min")}</th>
                    <th class="text-left py-1 px-2 secondary-text font-medium">${t("deliveryRules.max")}</th>
                    <th class="text-left py-1 px-2 secondary-text font-medium">${t("deliveryRules.value")}</th>
                  </tr>
                </thead>
                <tbody>
                  ${ranges.map((range, idx) => {
                    const min = range.min !== undefined && range.min !== null ? range.min : ''
                    const max = range.max !== undefined && range.max !== null ? range.max : '∞'
                    let value = range.value || 0

                    let valueDisplay = ''
                    if (tierValueType === 'fixed') {
                      valueDisplay = `${value.toFixed(2)} ${currentCurrencySymbol}`
                    } else if (tierValueType === 'pctOrder' || tierValueType === 'pctDelivery') {
                      valueDisplay = `${(value * 100).toFixed(2)}%`
                    }

                    if (tierValueMode === 'perUnit') {
                      valueDisplay += ` / ${t("deliveryRules.unit").toLowerCase()}`
                    }

                    return `
                      <tr class="border-b border-default/50">
                        <td class="py-1 px-2 card-text">${min}</td>
                        <td class="py-1 px-2 card-text">${max}</td>
                        <td class="py-1 px-2 card-text font-medium">${valueDisplay}</td>
                      </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `
      } else if (calcMethod.amount !== undefined) {
        // Simple pricing (non-tiered)
        const amount = calcMethod.amount || 0
        const unit = calcMethod.unit || ''
        let unitLabel = unit

        // Get unit label from translations if available
        if (unit && t(`attributes.units.${unit}`)) {
          unitLabel = t(`attributes.units.${unit}`)
        }

        html = `
          <div class="${indentClass} text-sm secondary-text">
            <span class="font-medium">${typeLabels[type] || type}:</span>
            <span class="card-text font-semibold">${amount.toFixed(2)} ${currentCurrencySymbol}</span>
            ${unit ? `<span class="text-xs muted-text"> / ${unitLabel}</span>` : ''}
          </div>
        `
      } else {
        // Fallback for unknown structure
        html = `<div class="${indentClass} text-sm muted-text italic">${typeLabels[type] || type}</div>`
      }
    }

    return html
  }

  let detailsHtml = ''

  if (copiedFrom) {
    detailsHtml = `
      <div class="p-3 secondary-bg rounded-lg border border-default">
        <p class="text-sm secondary-text">
          <span class="font-medium">${t("deliveryRules.sameSellerAs")}:</span>
          <span class="card-text font-semibold">${copiedFrom}</span>
        </p>
      </div>
    `
  } else if (billingMethod === 'free') {
    detailsHtml = `
      <div class="p-3 secondary-bg rounded-lg border border-default">
        <p class="text-sm card-text font-medium">${t("deliveryRules.freeDelivery")}</p>
      </div>
    `
  } else if (billingMethod === 'global') {
    detailsHtml = `
      <div class="p-3 secondary-bg rounded-lg border border-default space-y-2">
        <p class="text-xs font-semibold secondary-text uppercase tracking-wide">${t("deliveryRules.sameFee")}</p>
        ${renderCalcMethodDetails(rule.calculationMethod)}
    `
    if (rule.globalFreeShipping && rule.globalFreeShippingThreshold) {
      detailsHtml += `
        <div class="pt-2 mt-2 border-t border-default">
          <p class="text-xs secondary-text">
            <span class="font-medium">${t("deliveryRules.freeShippingThreshold")}</span>
            <span class="card-text font-semibold ml-1">${rule.globalFreeShippingThreshold.toFixed(2)} ${currentCurrencySymbol}</span>
          </p>
        </div>
      `
    }
    detailsHtml += `</div>`
  } else if (billingMethod === 'groups') {
    const groupCount = (rule.groups || []).length
    detailsHtml = `
      <div class="p-3 secondary-bg rounded-lg border border-default space-y-3">
        <p class="text-xs font-semibold secondary-text uppercase tracking-wide">
          ${groupCount} ${groupCount === 1 ? t("deliveryRules.addGroup") : t("deliveryRules.addGroup") + 's'}
        </p>
    `
    ;(rule.groups || []).forEach((group, idx) => {
      const productCount = (group.productIds || []).length
      detailsHtml += `
        <div class="p-2 bg-[hsl(var(--card))] rounded border border-default/50 space-y-1">
          <div class="flex justify-between items-start">
            <p class="text-sm font-medium card-text">${group.name || t("deliveryRules.newGroupPlaceholder")}</p>
            <span class="text-xs secondary-text bg-[hsl(var(--muted))] px-2 py-0.5 rounded">
              ${productCount} ${productCount === 1 ? t("sessions.product") : t("sessions.products")}
            </span>
          </div>
          ${renderCalcMethodDetails(group.calculationMethod, false)}
      `
      if (group.freeShipping && group.freeShippingThreshold) {
        detailsHtml += `
          <div class="pt-1 mt-1 border-t border-default/50">
            <p class="text-xs secondary-text">
              <span class="font-medium">${t("deliveryRules.freeShippingThreshold")}</span>
              <span class="card-text font-semibold ml-1">${group.freeShippingThreshold.toFixed(2)} ${currentCurrencySymbol}</span>
            </p>
          </div>
        `
      }
      detailsHtml += `</div>`
    })
    detailsHtml += `</div>`
  }

  // Add customs clearance fee if present
  if (session.importFeesEnabled && rule.customsClearanceFee) {
    detailsHtml += `
      <div class="p-3 mt-2 secondary-bg rounded-lg border border-default">
        <p class="text-sm secondary-text">
          <span class="font-medium">${t("deliveryRules.customsClearanceFees")}:</span>
          <span class="card-text font-semibold">${rule.customsClearanceFee.toFixed(2)} ${currentCurrencySymbol}</span>
        </p>
      </div>
    `
  }

  return `
  <div class="card-bg rounded-xl shadow-md p-4 border border-default">
    <div class="flex justify-between items-start mb-3">
      <h4 class="text-lg font-semibold card-text">${seller}</h4>
      <button class="edit-seller-btn text-sm secondary-bg secondary-text px-4 py-2 rounded-lg hover:opacity-80 transition-colors duration-200 border border-default flex-shrink-0" data-seller="${seller}">
        ${t("common.edit")}
      </button>
    </div>
    <div class="space-y-2">
      ${detailsHtml}
    </div>
  </div>
  `
}

function renderGroupItem(session, seller, group, gIdx, safeSellerId) {
  return `
    <div class="group-item p-4 border border-default rounded-lg bg-[hsl(var(--card))]" data-index="${gIdx}">
        <div class="flex justify-between items-center mb-4">
            <input type="text" class="group-name-input bg-transparent border-b border-default focus:border-primary focus:outline-none font-medium text-sm" value="${group.name || ''}" placeholder="${t("deliveryRules.groupName")}">
            <button class="text-red-500 hover:text-red-700 delete-group-btn transition-colors p-1">
                <span class="icon icon-delete h-5 w-5"></span>
            </button>
        </div>
        <div class="mb-4">
             <p class="text-xs font-semibold secondary-text mb-2 uppercase tracking-wide px-1">${t("deliveryRules.products")}</p>
             <div class="max-h-40 overflow-y-auto border border-default rounded-lg p-2 bg-[hsl(var(--muted))] scrollbar-thin">
                 ${getSellerProducts(session, seller).map(prod => `
                    <label class="flex items-center space-x-3 py-2 px-1 cursor-pointer group">
                        <input type="checkbox" class="group-product-checkbox sr-only peer" data-seller="${seller}" data-group-index="${gIdx}" value="${prod.id}" ${group.productIds && group.productIds.includes(prod.id) ? 'checked' : ''}>
                        <div class="w-4 h-4 rounded border border-default flex items-center justify-center peer-checked:border-[hsl(var(--primary))] peer-checked:bg-[hsl(var(--primary))] transition-all">
                            <div class="w-1.5 h-1.5 rounded-sm bg-white scale-0 peer-checked:scale-100 transition-transform"></div>
                        </div>
                        <span class="text-sm secondary-text peer-checked:card-text transition-colors truncate" title="${prod.name}">${prod.name}</span>
                    </label>
                `).join('')}
             </div>
        </div>
        <div class="mb-4 bg-[hsl(var(--muted))] rounded-lg p-3 border border-default">
            <div class="flex items-center justify-between">
                <span class="text-sm font-medium card-text">${t("deliveryRules.freeDeliveryCondition")}</span>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" class="group-free-shipping-checkbox sr-only peer" ${group.freeShipping ? 'checked' : ''}>
                    <div class="toggle-switch"></div>
                </label>
            </div>
            <div class="mt-3 group-free-shipping-threshold" style="display: ${group.freeShipping ? 'block' : 'none'}">
                <label class="block text-xs secondary-text mb-1 ml-1">${t("deliveryRules.freeDeliveryThreshold")}</label>
                <input type="number" class="w-full px-3 py-2 border border-default input-bg card-text rounded-md group-free-shipping-input focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" value="${group.freeShippingThreshold || ''}" placeholder="0.00" step="0.01">
            </div>
        </div>
        <div class="step-3-group">
             ${renderCalculationRules(`group_${safeSellerId}_${gIdx}`, group.calculationMethod || { type: 'fixed' })}
        </div>
    </div>
  `;
}

// ============================================================================
// SELLER DELIVERY RULES VIEW - HELPER FUNCTIONS
// ============================================================================

/**
 * Rendu du header avec bouton retour et titre
 */
function renderSellerEditorHeader(seller) {
  return `
    <div class="flex items-center space-x-3 mb-4">
      <button class="muted-text p-2 cursor-pointer" id="back-to-list-button">
        <span class="icon icon-back h-8 w-8"></span>
      </button>
      <h1 class="text-2xl font-semibold card-text truncate flex-1">${seller}</h1>
    </div>
  `
}

/**
 * Rendu du sélecteur "Same Seller As"
 */
function renderSameSellerSelector(session, seller, copiedFrom) {
  const otherSellers = getUniqueSellers(session).filter(s => s !== seller)
  
  return `
    <div class="mb-6">
      <label class="block text-sm font-medium secondary-text mb-1">${t("deliveryRules.sameSellerAs")}</label>
      <select class="same-seller-select w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border-transparent" data-seller="${seller}">
        <option value="None" ${copiedFrom === 'None' ? 'selected' : ''}>${t("deliveryRules.none")}</option>
        ${otherSellers.map(s2 => `<option value="${s2}" ${copiedFrom === s2 ? 'selected' : ''}>${s2}</option>`).join('')}
      </select>
    </div>
  `
}

/**
 * Rendu du container global free shipping
 */
function renderGlobalFreeShippingContainer(rule, billingMethod) {
  const globalFree = rule.globalFreeShipping || false
  const globalThreshold = rule.globalFreeShippingThreshold || ''
  const visible = billingMethod === 'global'
  
  return `
    <div class="mb-6 global-free-shipping-container bg-[hsl(var(--muted))] rounded-xl p-4 border border-default" style="display: ${visible ? 'block' : 'none'}">
      ${renderToggleSwitch({
        id: 'global-free-shipping-checkbox',
        label: t("deliveryRules.freeDeliveryCondition"),
        checked: globalFree,
        additionalAttrs: 'class="global-free-shipping-checkbox"'
      })}
      ${renderConditionalThresholdInput({
        containerClass: 'mt-3 global-free-shipping-threshold',
        inputClass: 'global-free-shipping-input',
        label: t("deliveryRules.freeDeliveryThreshold"),
        value: globalThreshold,
        visible: globalFree
      })}
    </div>
  `
}

/**
 * Rendu de la section Billing Method
 */
function renderBillingMethodSection(rule, safeSellerId, seller) {
  const billingMethod = rule.billingMethod || 'global'
  
  return `
    <div class="step-1 mb-6">
      <h5 class="text-sm font-semibold secondary-text mb-2">${t("deliveryRules.billingMethod")}</h5>
      <div class="space-y-3 mb-4">
        ${renderRadioOption({
          name: `billing-method-${safeSellerId}`,
          value: 'global',
          checked: billingMethod === 'global',
          label: t("deliveryRules.sameFee"),
          helpText: t("deliveryRules.billingMethodSameFeeHelp"),
          additionalClasses: 'billing-method-radio'
        })}
        ${renderRadioOption({
          name: `billing-method-${safeSellerId}`,
          value: 'groups',
          checked: billingMethod === 'groups',
          label: t("deliveryRules.dependsOnProducts"),
          helpText: t("deliveryRules.billingMethodDependsHelp"),
          additionalClasses: 'billing-method-radio'
        })}
        ${renderRadioOption({
          name: `billing-method-${safeSellerId}`,
          value: 'free',
          checked: billingMethod === 'free',
          label: t("deliveryRules.freeDelivery"),
          helpText: null,
          helpIcon: false,
          additionalClasses: 'billing-method-radio'
        })}
      </div>
      ${renderGlobalFreeShippingContainer(rule, billingMethod)}
    </div>
  `
}

/**
 * Rendu de la section Groupes de produits
 */
function renderGroupsSection(session, seller, rule, safeSellerId) {
  const billingMethod = rule.billingMethod || 'global'
  const visible = billingMethod === 'groups'
  
  return `
    <div class="step-2 mb-6" id="groups-container-${safeSellerId}" style="display: ${visible ? 'block' : 'none'}">
      <h5 class="text-sm font-semibold secondary-text mb-3 px-1">${t("deliveryRules.dependsOnProducts")}</h5>
      
      <div class="groups-list space-y-4 mb-6" data-seller="${seller}">
        ${(rule.groups || []).map((group, gIdx) => renderGroupItem(session, seller, group, gIdx, safeSellerId)).join('')}
      </div>
      
      <button class="add-group-btn w-full py-3 flex items-center justify-center space-x-2 text-sm font-semibold secondary-bg secondary-text hover:bg-[hsl(var(--muted))] rounded-xl border border-default transition-all shadow-sm" data-seller="${seller}">
        <span class="icon icon-plus h-4 w-4"></span>
        <span>${t("deliveryRules.addGroup")}</span>
      </button>
    </div>
  `
}

/**
 * Rendu de la section Calculation Rules (Global)
 */
function renderGlobalCalculationSection(rule, safeSellerId) {
  const billingMethod = rule.billingMethod || 'global'
  const visible = billingMethod === 'global'
  
  return `
    <div class="step-3-global mb-6" id="calc-global-${safeSellerId}" style="display: ${visible ? 'block' : 'none'}">
      ${renderCalculationRules(`global_${safeSellerId}`, rule.calculationMethod || {}, false)}
    </div>
  `
}

/**
 * Rendu de la section Customs Fees
 */
function renderCustomsFeesSection(session, rule, seller) {
  if (!session.importFeesEnabled) return ''
  
  return `
    <div class="mt-6 pt-6 border-t border-default">
      <label class="block text-sm font-medium secondary-text mb-1">${t("deliveryRules.customsClearanceFees")}</label>
      <input type="number" step="0.01" value="${rule.customsClearanceFee || 0}" class="customs-clearance-fees w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border-transparent" data-seller="${seller}">
    </div>
  `
}

/**
 * Rendu du container de configuration personnalisée
 */
function renderCustomConfigContainer(session, seller, rule, safeSellerId, copiedFrom) {
  const visible = copiedFrom === 'None'
  
  return `
    <div class="custom-config-container" style="display: ${visible ? 'block' : 'none'}">
      ${renderBillingMethodSection(rule, safeSellerId, seller)}
      ${renderGroupsSection(session, seller, rule, safeSellerId)}
      ${renderGlobalCalculationSection(rule, safeSellerId)}
      ${renderCustomsFeesSection(session, rule, seller)}
    </div>
  `
}

/**
 * Rendu du bouton de sauvegarde
 */
function renderSaveButton() {
  return `
    <button id="save-seller-rules" class="w-full mt-8 flex items-center justify-center space-x-2 cursor-pointer primary-bg primary-text px-4 py-4 rounded-xl hover:opacity-90 transition-all shadow-md">
      <span class="text-lg font-semibold">${t("common.save")}</span>
    </button>
  `
}

// ============================================================================
// END SELLER DELIVERY RULES VIEW - HELPER FUNCTIONS
// ============================================================================

function renderSellerDeliveryRulesView(seller) {
  const session = sessions.find((s) => s.id === currentSession)
  const rule = getRule(session, seller)
  const safeSellerId = seller.replace(/\s+/g, '-')
  const copiedFrom = rule.copiedFrom || 'None'
  
  // Build HTML using helper functions
  app.innerHTML = `
    <div class="mx-4 pb-8">
      ${renderSellerEditorHeader(seller)}
      <div class="seller-card card-bg rounded-xl shadow-md p-6 border border-default">
        ${renderSameSellerSelector(session, seller, copiedFrom)}
        ${renderCustomConfigContainer(session, seller, rule, safeSellerId, copiedFrom)}
        ${renderSaveButton()}
      </div>
    </div>
  `

  // Setup event listeners using helper functions
  const sellerCard = document.querySelector('.seller-card')
  if (!sellerCard) return

  // Back button
  document.getElementById("back-to-list-button")?.addEventListener("click", () => {
    currentRulesView = "list"
    currentSellerEditing = null
    renderApp()
  })

  // Same Seller selector
  setupSameSellerListener(sellerCard)

  // Billing Method radios
  setupBillingMethodListeners(sellerCard, safeSellerId)

  // Free Shipping toggles
  setupFreeShippingToggle(sellerCard, '.global-free-shipping-checkbox', '.global-free-shipping-threshold')

  // Add Group button
  setupAddGroupButtonListener(session, seller, safeSellerId)

  // Scoped Event Delegation for the seller editor
  sellerCard.addEventListener('click', (e) => {
    if (e.target.closest('.delete-group-btn')) {
        e.target.closest('.group-item').remove()
    }
  })

  sellerCard.addEventListener('change', (e) => {
    if (e.target.classList.contains('group-free-shipping-checkbox')) {
        const groupItem = e.target.closest('.group-item')
        const thresholdDiv = groupItem.querySelector('.group-free-shipping-threshold')
        if (thresholdDiv) thresholdDiv.style.display = e.target.checked ? 'block' : 'none'
    }
    
    if (e.target.classList.contains('calculation-type-radio')) {
        const container = e.target.closest('.calculation-rules-container')
        const prefix = container.dataset.prefix
        const newType = e.target.value
        const inputsContainer = container.querySelector('.calculation-inputs')

        // Clear all tier errors when changing calculation type
        clearAllTierErrors(container);

        let newHtml = ''
        if (newType === 'fixed') newHtml = renderFixedInputs(prefix, { type: 'fixed' })
        else if (newType === 'percentage') newHtml = renderPercentageInputs(prefix, { type: 'percentage' })
        else if (['quantity', 'distance', 'weight', 'volume'].includes(newType)) newHtml = renderTieredInputs(prefix, { type: newType }, newType)
        else if (newType === 'dimension') newHtml = renderDimensionInputs(prefix, { type: newType })
        else if (['weight_volume', 'weight_dimension'].includes(newType)) newHtml = renderCombinedInputs(prefix, { type: newType }, newType)
        else if (newType === 'item') newHtml = `<p class="text-sm secondary-text italic">${t('deliveryRules.typeItem')}</p>`

        inputsContainer.innerHTML = newHtml
    }

    if (e.target.classList.contains('is-tiered-toggle') || e.target.classList.contains('is-tiered-checkbox')) {
        const element = e.target
        const container = element.closest('.calculation-rules-container')
        const prefix = container.dataset.prefix

        // Clear any existing validation errors when switching modes
        clearAllTierErrors(container);

        // Extract current data to preserve values
        const data = extractCalculationRule(prefix, container)

        // Update isTiered based on the toggle that just changed
        data.isTiered = element.classList.contains('is-tiered-toggle') ? (element.value === 'tiered') : element.checked

        const type = data.type
        const inputsContainer = container.querySelector('.calculation-inputs')

        if (type === 'dimension') {
            inputsContainer.innerHTML = renderDimensionInputs(prefix, data)
        } else if (['weight_volume', 'weight_dimension'].includes(type)) {
            inputsContainer.innerHTML = renderCombinedInputs(prefix, data, type)
        } else {
            inputsContainer.innerHTML = renderTieredInputs(prefix, data, type)
        }
    }

    // Update labels when unit changes
    if (e.target.name && e.target.name.endsWith('_unit')) {
        const select = e.target
        const container = select.closest('.calculation-rules-container')
        const prefix = container.dataset.prefix
        
        // Extract current data to preserve values
        const data = extractCalculationRule(prefix, container)
        const type = data.type
        
        const inputsContainer = container.querySelector('.calculation-inputs')
        
        if (!data.isTiered && ['distance', 'weight', 'volume'].includes(type)) {
            // Re-render only if simple mode and type is one of those to update the label
            inputsContainer.innerHTML = renderTieredInputs(prefix, data, type)
        } else if (data.isTiered) {
            // Update labels dynamically for tiered mode
            updateValueLabels(container, prefix, type, data)
        }
    }

    // Update labels when tierValueMode changes
    if (e.target.classList.contains('tier-value-mode-toggle')) {
        const element = e.target
        const container = element.closest('.calculation-rules-container')
        const prefix = container.dataset.prefix
        
        // Extract current data to preserve values
        const data = extractCalculationRule(prefix, container)
        const type = data.type
        
        // Update the help text
        const helpText = container.querySelector('.tier-value-mode-help')
        if (helpText) {
            helpText.textContent = getHelpTextForMode(type, element.value)
        }
        
        // Update visual state of segmented control
        const labels = container.querySelectorAll(`label:has(input[name="${prefix}_tierValueMode"])`)
        labels.forEach(label => {
            const radio = label.querySelector('input')
            if (radio.value === element.value) {
                label.classList.add('bg-[hsl(var(--card))]', 'shadow-sm', 'font-medium')
                label.classList.remove('secondary-text')
            } else {
                label.classList.remove('bg-[hsl(var(--card))]', 'shadow-sm', 'font-medium')
                label.classList.add('secondary-text')
            }
        })
        
        // Update labels dynamically
        updateValueLabels(container, prefix, type, data)
    }

    // Update labels when tierValueType changes
    if (e.target.name && e.target.name.endsWith('_tierValueType')) {
        const element = e.target
        const container = element.closest('.calculation-rules-container')
        const prefix = container.dataset.prefix
        
        // Extract current data to preserve values
        const data = extractCalculationRule(prefix, container)
        const type = data.type
        
        // Update labels dynamically
        updateValueLabels(container, prefix, type, data)
    }

    // Auto-continuity: When a MAX changes, update the NEXT row's MIN
    if (e.target.name && e.target.name.includes('_range_') && e.target.name.endsWith('_max')) {
        const input = e.target
        const row = input.closest('.range-row')
        const nextRow = row?.nextElementSibling
        if (nextRow && nextRow.classList.contains('range-row')) {
            const container = row.closest('.calculation-rules-container')
            const prefix = container.dataset.prefix
            const typeRadio = container.querySelector(`input[name="${prefix}_type"]:checked`)
            const type = typeRadio ? typeRadio.value : 'quantity'
            
            if (!['dimension', 'weight_volume', 'weight_dimension'].includes(type) && !input.name.includes('_maxL') && !input.name.includes('_maxW') && !input.name.includes('_maxH') && !input.name.includes('_maxWeight') && !input.name.includes('_maxVol')) {
                const nextMinInput = nextRow.querySelector('input[name$="_min"]')
                if (nextMinInput) {
                    const val = parseFloat(input.value) || 0
                    nextMinInput.value = (type === 'quantity') ? val + 1 : val
                }
            }
        }
    }
  })

  // ============================================================================
  // TIER VALIDATION: Live validation on blur
  // ============================================================================
  sellerCard.addEventListener('blur', (e) => {
    const input = e.target;

    if (input.tagName !== 'INPUT') return;

    const container = input.closest('.calculation-rules-container');
    if (!container) return;

    const prefix = container.dataset.prefix;

    // Check if this is a tier input field
    if (input.name && input.name.includes('_range_')) {
      const isTieredCb = container.querySelector(`input[name="${prefix}_isTiered"]`);

      // Only validate if tiered mode is enabled
      if (isTieredCb && isTieredCb.checked) {
        const type = getTierType(container);

        // Only validate types that use min/max/value structure
        if (['quantity', 'distance', 'weight', 'volume'].includes(type)) {
          performLiveValidation(input, container);
        }
      }
    }
    // Validate Fixed amount field
    else if (input.name === `${prefix}_amount`) {
      const value = parseFloat(input.value);
      if (isNaN(value) || input.value.trim() === '') {
        input.classList.add('!border-orange-500', 'focus:!ring-orange-500');

        let errorDiv = input.parentElement.querySelector('.field-error-message');
        if (!errorDiv) {
          errorDiv = document.createElement('div');
          errorDiv.className = 'field-error-message text-xs text-orange-500 mt-1';
          input.parentElement.appendChild(errorDiv);
        }
        errorDiv.textContent = t('validation.tier.mustBeNumber');
      } else {
        input.classList.remove('!border-orange-500', 'focus:!ring-orange-500');
        const errorDiv = input.parentElement.querySelector('.field-error-message');
        if (errorDiv) errorDiv.remove();
      }
    }
    // Validate Percentage rate field
    else if (input.name === `${prefix}_rate`) {
      const value = parseFloat(input.value);
      if (isNaN(value) || input.value.trim() === '') {
        input.classList.add('!border-orange-500', 'focus:!ring-orange-500');

        let errorDiv = input.parentElement.querySelector('.field-error-message');
        if (!errorDiv) {
          errorDiv = document.createElement('div');
          errorDiv.className = 'field-error-message text-xs text-orange-500 mt-1';
          input.parentElement.appendChild(errorDiv);
        }
        errorDiv.textContent = t('validation.tier.mustBeNumber');
      } else {
        input.classList.remove('!border-orange-500', 'focus:!ring-orange-500');
        const errorDiv = input.parentElement.querySelector('.field-error-message');
        if (errorDiv) errorDiv.remove();
      }
    }
  }, true); // Use capture phase to ensure we catch blur events

  sellerCard.addEventListener('click', (e) => {
    if (e.target.closest('.add-range-btn')) {
        const btn = e.target.closest('.add-range-btn')
        const prefix = btn.dataset.prefix
        const container = btn.closest('.calculation-rules-container')
        const rangesContainer = container.querySelector('.ranges-container')
        if (!rangesContainer) return
        
        const typeRadio = container.querySelector(`input[name="${prefix}_type"]:checked`)
        const type = typeRadio ? typeRadio.value : 'quantity'
        
        // Extract current data to get tierValueType, tierValueMode, and units
        const data = extractCalculationRule(prefix, container)
        const tierValueType = data.tierValueType || 'fixed'
        const tierValueMode = data.tierValueMode || 'perUnit'
        const unit = data.unit || ''
        const weightUnit = data.weightUnit || ''
        const volUnit = data.volUnit || ''
        
        const existingRows = rangesContainer.querySelectorAll('.range-row')
        const newIndex = existingRows.length
        
        let newMin = 0

        if (existingRows.length > 0 && !['dimension', 'weight_volume', 'weight_dimension'].includes(type)) {
            const lastRow = existingRows[existingRows.length - 1]
            const maxInput = lastRow.querySelector('input[name$="_max"]')
            const minInput = lastRow.querySelector('input[name$="_min"]')

            // Smart insertion: if last tier is infinite (max is null/empty)
            if (maxInput && (maxInput.value === '' || maxInput.value === null)) {
                // Calculate diff from previous tier, default to 10
                let diff = 10;
                if (existingRows.length >= 2) {
                    const prevRow = existingRows[existingRows.length - 2]
                    const prevMinInput = prevRow.querySelector('input[name$="_min"]')
                    const lastMin = parseFloat(minInput.value) || 0
                    const prevMin = parseFloat(prevMinInput.value) || 0
                    diff = lastMin - prevMin || 10
                }

                // Calculate new max for the currently-infinite tier
                const lastMin = parseFloat(minInput.value) || 0
                const newMaxForLast = lastMin + diff

                // Update the last tier's max (make it finite)
                maxInput.value = newMaxForLast

                // New tier starts after the updated max
                newMin = type === 'quantity' ? newMaxForLast + 1 : newMaxForLast
            }
            // Original logic: last tier has a finite max
            else if (maxInput && maxInput.value !== '') {
                const lastMax = parseFloat(maxInput.value) || 0
                newMin = type === 'quantity' ? lastMax + 1 : lastMax
            }
        } else if (existingRows.length === 0 && type === 'quantity') {
            newMin = 1
        }
        
        // Determine which units to pass based on type
        let unitParam = unit;
        let unit2Param = '';
        if (['weight_volume', 'weight_dimension'].includes(type)) {
            unitParam = weightUnit;
            unit2Param = volUnit;
        }
        
        const rowHtml = renderRangeRow(type, prefix, newIndex, { min: newMin }, tierValueType, tierValueMode, unitParam, unit2Param);
        const temp = document.createElement('div')
        temp.innerHTML = rowHtml
        
        // Remove empty placeholder if any
        const placeholder = rangesContainer.querySelector('.empty-placeholder')
        if (placeholder) placeholder.remove()
        
        rangesContainer.appendChild(temp.firstElementChild)
    }
    
    if (e.target.closest('.remove-range-btn')) {
        const row = e.target.closest('.range-row')
        const container = row.closest('.ranges-container')
        const calcContainer = row.closest('.calculation-rules-container');

        // Clear errors on all remaining rows after removal
        if (calcContainer) {
            clearAllTierErrors(calcContainer);
        }

        row.remove()

        // Re-validate after removal (live validation)
        if (calcContainer) {
            const type = getTierType(calcContainer);
            const ranges = getAllTierRanges(calcContainer, type);

            // Validate continuity between remaining tiers
            ranges.forEach((range, index) => {
                if (index > 0) {
                    const previousRange = ranges[index - 1];
                    validateContinuity(range, previousRange, type, 'warning');
                }
            });
        }

        // If empty, add back placeholder
        if (container.querySelectorAll('.range-row').length === 0) {
            container.innerHTML = `<div class="empty-placeholder text-xs secondary-text italic text-center py-4 bg-[hsl(var(--muted))] rounded-lg border border-dashed border-default">${t('deliveryRules.addRange')}</div>`
        }
    }
  })

  document.getElementById("save-seller-rules").addEventListener("click", () => {
    // TIER VALIDATION: Validate all tier-based forms before saving
    if (!validateAllTierForms()) {
      // Show error toast
      const errorMessage = document.createElement('div');
      errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
      errorMessage.textContent = t('validation.tier.fixErrorsBeforeSaving');
      document.body.appendChild(errorMessage);

      setTimeout(() => {
        errorMessage.remove();
      }, 5000);

      return; // Stop save operation
    }

    // Save logic for ONE seller
    const currentRule = { seller }
    const sameSelect = document.querySelector('.same-seller-select')
    const copiedFromValue = sameSelect && sameSelect.value !== 'None' ? sameSelect.value : null
    
    if (copiedFromValue) {
        currentRule.copiedFrom = copiedFromValue
    } else {
        const billingRadio = document.querySelector(`input[name="billing-method-${safeSellerId}"]:checked`)
        currentRule.billingMethod = billingRadio ? billingRadio.value : 'global'
        
        if (currentRule.billingMethod === 'global') {
            const globalCb = document.querySelector('.global-free-shipping-checkbox')
            currentRule.globalFreeShipping = globalCb ? globalCb.checked : false
            if (currentRule.globalFreeShipping) {
                const globalInput = document.querySelector('.global-free-shipping-input')
                currentRule.globalFreeShippingThreshold = parseFloat(globalInput.value) || 0
            }
            currentRule.calculationMethod = extractCalculationRule(`global_${safeSellerId}`, document)
        } else if (currentRule.billingMethod === 'groups') {
            currentRule.groups = []
            document.querySelectorAll('.group-item').forEach((groupDiv, idx) => {
                const name = groupDiv.querySelector('.group-name-input').value
                const freeShipping = groupDiv.querySelector('.group-free-shipping-checkbox').checked
                const freeThreshold = parseFloat(groupDiv.querySelector('.group-free-shipping-input').value) || 0
                const productIds = Array.from(groupDiv.querySelectorAll('.group-product-checkbox:checked')).map(cb => cb.value)
                const calcMethod = extractCalculationRule(`group_${safeSellerId}_${idx}`, groupDiv)
                currentRule.groups.push({
                    id: Date.now().toString() + Math.random().toString().slice(2,6),
                    name, freeShipping, freeShippingThreshold: freeThreshold, productIds, calculationMethod: calcMethod
                })
            })
        } else if (currentRule.billingMethod === 'free') {
            currentRule.calculationMethod = { type: 'free' }
        }
        
        if (session.importFeesEnabled) {
            const customsFeeInput = document.querySelector('.customs-clearance-fees')
            if (customsFeeInput) currentRule.customsClearanceFee = parseFloat(customsFeeInput.value) || 0
        }
    }

    // Update session.deliveryRules
    if (!session.deliveryRules) session.deliveryRules = []
    const ruleIndex = session.deliveryRules.findIndex(r => r.seller === seller)
    if (ruleIndex > -1) session.deliveryRules[ruleIndex] = currentRule
    else session.deliveryRules.push(currentRule)

    SidebarAPI.updateSession(currentSession, session).then((response) => {
        sessions = response.sessions
        currentRulesView = "list"
        currentSellerEditing = null
        renderApp()
    })
  })
}

function renderDeliveryRulesView() {
  const session = sessions.find((s) => s.id === currentSession)
  if (!session) {
    currentView = "sessions"
    renderApp()
    return
  }

  if (currentRulesView === "edit" && currentSellerEditing) {
    renderSellerDeliveryRulesView(currentSellerEditing)
    return
  }


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
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border-transparent"
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
        <h3 class="text-lg font-semibold card-text mb-2 px-1">${t("deliveryRules.sellerRules")}</h3>
        ${getUniqueSellers(session).map(seller => {
          const rule = getRule(session, seller)
          return renderSellerRecapCard(session, seller, rule)
        }).join('')}
      </div>

      ${session.importFeesEnabled ? `
      <button id="save-customs-button" class="w-full mt-6 flex items-center justify-center space-x-2 cursor-pointer primary-bg primary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm">
        <span class="text-lg font-medium">${t("common.save")}</span>
      </button>
      ` : ''}
    </div>
  `

  document.getElementById("back-button").addEventListener("click", () => {
    currentView = "products"
    renderApp()
  })

  // Edit Seller button listeners
  document.querySelectorAll(".edit-seller-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      currentSellerEditing = btn.dataset.seller
      currentRulesView = "edit"
      renderApp()
    })
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

  const saveCustomsBtn = document.getElementById("save-customs-button")
  if (saveCustomsBtn) {
    saveCustomsBtn.addEventListener("click", () => {
      // Save defaultVAT logic
      const defaultVATInput = document.getElementById("default-vat")
      if (defaultVATInput) {
        const defaultVATPercent = parseFloat(defaultVATInput.value)
        if (!isNaN(defaultVATPercent) && defaultVATPercent >= 0 && defaultVATPercent <= 100) {
          session.defaultVAT = defaultVATPercent / 100
        } else {
          session.defaultVAT = null
        }
      }

      SidebarAPI.updateSession(currentSession, session).then((response) => {
        sessions = response.sessions
        currentView = "products"
        renderApp()
      })
    })
  }
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
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
          <input type="text" id="group-name" placeholder="${t("alternatives.groupNamePlaceholder")}" class="w-full px-4 py-2 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
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
            <input type="checkbox" id="${optionId}-prod-${p.id}" value="${p.id}" class="product-checkbox h-4 w-4 accent-primary border-default rounded focus:ring-primary" ${initialProd ? 'checked' : ''}>
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
          <input type="text" id="group-name" value="${group.name}" class="w-full px-4 py-2 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
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
            <input type="checkbox" id="${optionId}-prod-${p.id}" value="${p.id}" class="product-checkbox h-4 w-4 accent-primary border-default rounded focus:ring-primary" ${initialProd ? 'checked' : ''}>
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
