import { Store } from '../../state.js'
import { SidebarAPI } from '../../api.js'

export function navigateToProducts() {
  Store.setState({
    currentView: 'products',
    currentOptimizationResult: null,
    viewingHistory: false
  })
}

export function getSession() {
  return Store.state.sessions.find(s => s.id === Store.state.currentSession)
}

export function getCurrentResult() {
  return Store.state.currentOptimizationResult
}

export function isViewingHistory() {
  return Store.state.viewingHistory
}

export function hasHistory() {
  return Store.state.hasOptimizationHistory
}

export async function loadHistory() {
  const session = getSession()
  if (!session) return []
  const response = await SidebarAPI.getOptimizationHistory(session.id)
  return response.history || []
}

export function viewHistoricalResult(result) {
  Store.setState({
    currentOptimizationResult: result,
    viewingHistory: true
  })
}
