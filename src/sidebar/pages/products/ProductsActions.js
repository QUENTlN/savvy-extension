import { Store } from '../../state.js'
import { SidebarAPI } from '../../api.js'

export function navigateToSessions() {
  Store.setState({ currentView: 'sessions' })
}

export function navigateToOffers(productId) {
  Store.setState({
    currentProduct: productId,
    currentView: 'offers'
  })
}

export function navigateToDeliveryRules() {
  Store.setState({ currentView: 'deliveryRules' })
}

export function navigateToAlternatives() {
  Store.setState({ currentView: 'alternatives' })
}

export function navigateToImportFees() {
  Store.setState({ currentView: 'importFees' })
}

export function navigateToForwarders() {
  Store.setState({ currentView: 'forwarders', currentForwarderEditing: null })
}

export function getSession() {
  return Store.state.sessions.find(s => s.id === Store.state.currentSession)
}

export function createProduct(sessionId, productData) {
  return Store.sync(SidebarAPI.createProduct(sessionId, productData))
}

export function updateProduct(sessionId, productId, productData) {
  return Store.sync(SidebarAPI.updateProduct(sessionId, productId, productData))
}

export function updateSession(sessionId, sessionData) {
  return Store.sync(SidebarAPI.updateSession(sessionId, sessionData))
}

export function deleteProduct(sessionId, productId) {
  return Store.sync(SidebarAPI.deleteProduct(sessionId, productId))
}

export function optimizeSession(sessionData) {
  return SidebarAPI.optimizeSession(sessionData)
}

export function navigateToResults() {
  Store.setState({
    currentView: 'results',
    viewingHistory: false
  })
}

export async function loadOptimizationState(session) {
  const response = await SidebarAPI.getOptimizationResults(session.id)

  if (!response.current) {
    return { hasResults: false, isModified: false, hasHistory: false }
  }

  // Check if session was modified
  const currentSnapshot = computeSessionSnapshot(session)
  const isModified = currentSnapshot !== response.current.sessionSnapshot

  // Store current result in state for later viewing
  if (!isModified) {
    Store.setState({
      currentOptimizationResult: response.current,
      hasOptimizationHistory: response.hasHistory
    }, true)
  } else {
    Store.setState({
      hasOptimizationHistory: response.hasHistory
    }, true)
  }

  return {
    hasResults: true,
    isModified,
    hasHistory: response.hasHistory
  }
}

export async function loadOptimizationHistory() {
  const session = getSession()
  if (!session) return []
  const response = await SidebarAPI.getOptimizationHistory(session.id)
  return response.history || []
}

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
