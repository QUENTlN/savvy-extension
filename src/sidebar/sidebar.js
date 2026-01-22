// ES6 Module imports
import { browser } from '../shared/browser.js';
import { CURRENCIES, DEFAULT_CURRENCY } from '../shared/config/currencies.js';
import { initI18n } from '../shared/i18n.js';
import { Store } from './state.js';
import { SidebarAPI } from './api.js';
import { initSessionsPage } from './pages/sessions/SessionsPage.js';
import { initProductsPage } from './pages/products/ProductsPage.js';
import { initOffersPage } from './pages/offers/OffersPage.js';
import { initSettingsPage } from './pages/settings/SettingsPage.js';
import { initDeliveryRulesPage } from './pages/delivery-rules/DeliveryRulesPage.js';
import { initAlternativesPage } from './pages/alternatives/AlternativesPage.js';
import { initImportFeesPage } from './pages/import-fees/ImportFeesPage.js';
import { initForwardersPage } from './pages/forwarders/ForwardersPage.js';
import { initResultsPage } from './pages/results/ResultsPage.js'
import { initHistoryPage } from './pages/history/HistoryPage.js';

const app = document.getElementById("app")

async function init() {
  // Subscribe renderApp to Store changes (auto re-render on state change)
  Store.subscribe(() => renderApp())

  browser.storage.local.get(["darkMode", "currency"]).then(async (settings) => {
    if (settings.darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }

    const currencyCode = settings.currency || DEFAULT_CURRENCY
    const currency = CURRENCIES.find(c => c.code === currencyCode)
    if (currency) Store.setState({ currency: currency.symbol }, true)

    await initI18n()

    SidebarAPI.getSessions().then((response) => {
      Store.init(response)
      renderApp() // Initial render
    })
  })

  // Listen for messages from background script
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "scrapedData") {
      browser.windows.getCurrent().then(currentWindow => {
        browser.windows.getLastFocused().then(focusedWindow => {
          if (currentWindow.id === focusedWindow.id) {
            const session = Store.state.sessions.find(s => s.id === Store.state.currentSession)
            const product = session?.products.find(p => p.id === Store.state.currentProduct)
            if (session && product) {
              // Just set the state - OffersPage will handle showing the modal
              Store.setState({ scrapedData: message.data })
            }
          }
        });
      });
    }
  })
}

function renderApp() {
  switch (Store.state.currentView) {
    case "sessions":
      initSessionsPage(app)
      break
    case "products":
      initProductsPage(app)
      break
    case "offers":
      initOffersPage(app)
      break
    case "settings":
      initSettingsPage(app)
      break
    case "deliveryRules":
      initDeliveryRulesPage(app)
      break
    case "alternatives":
      initAlternativesPage(app)
      break
    case "importFees":
      initImportFeesPage(app)
      break
    case "forwarders":
      initForwardersPage(app)
      break
    case "results":
      initResultsPage(app)
      break
    case "history":
      initHistoryPage(app)
      break
    default:
      initSessionsPage(app)
  }
}

document.addEventListener("DOMContentLoaded", init)
