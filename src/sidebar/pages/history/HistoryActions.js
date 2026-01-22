import { Store } from '../../state.js'
import { SidebarAPI } from '../../api.js'

export function navigateToProducts() {
  Store.setState({ currentView: 'products' })
}

export function getSession() {
  return Store.state.sessions.find(s => s.id === Store.state.currentSession)
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
    viewingHistory: true,
    currentView: 'results'
  })
}
