// Shared UI state for the sidebar
// This centralizes the main variables used across views and modals.

let sessions = []
let currentSession = null
let currentView = "sessions" // 'sessions', 'products', 'pages', 'settings', 'deliveryRules', 'alternatives'
let currentRulesView = "list" // 'list', 'edit'
let currentSellerEditing = null
let currentProduct = null
let scrapedData = null
let currentCurrencySymbol = '€'


