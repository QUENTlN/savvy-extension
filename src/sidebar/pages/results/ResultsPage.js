import { renderResultsView } from './ResultsView.js'
import * as actions from './ResultsActions.js'
import { Store } from '../../state.js'

export function initResultsPage(app) {
  const session = actions.getSession()
  const result = actions.getCurrentResult()
  const isHistorical = actions.isViewingHistory()
  const hasHistory = actions.hasHistory()

  if (!session || !result) {
    Store.setState({ currentView: 'products' })
    return
  }

  app.innerHTML = renderResultsView({ result, session, isHistorical, hasHistory })
  attachEventListeners(session)
}

function attachEventListeners(session) {
  document.getElementById("back-button")?.addEventListener("click", actions.navigateToProducts)

  document.getElementById("history-button")?.addEventListener("click", () => {
    Store.setState({ currentView: 'history' })
  })

  document.getElementById("re-optimize-button")?.addEventListener("click", () => {
    Store.setState({
      currentView: 'products',
      currentOptimizationResult: null,
      viewingHistory: false
    })
  })

  // Open offer/bundle URLs in new tab
  document.querySelectorAll(".open-offer-button").forEach(button => {
    button.addEventListener("click", () => {
      const url = button.dataset.url
      if (url) {
        window.open(url, "_blank")
      }
    })
  })

  // Initialize new JS-based Tooltip Manager
  new TooltipManager()
}

class TooltipManager {
  constructor() {
    this.tooltip = document.createElement('div')
    this.tooltip.className = 'fixed invisible opacity-0 transition-opacity z-[9999] min-w-[200px] w-max max-w-xs bg-[hsl(var(--popover))] text-[hsl(var(--popover-foreground))] text-xs rounded-lg shadow-xl border border-[hsl(var(--border))] p-3 pointer-events-none'
    document.body.appendChild(this.tooltip)

    this.handleMouseOver = this.handleMouseOver.bind(this)
    this.handleMouseOut = this.handleMouseOut.bind(this)

    document.addEventListener('mouseover', this.handleMouseOver)
    document.addEventListener('mouseout', this.handleMouseOut)
  }

  handleMouseOver(e) {
    const target = e.target.closest('[data-tooltip-html]')
    if (!target) return

    const html = target.getAttribute('data-tooltip-html')
    if (!html) return

    this.tooltip.innerHTML = html

    const rect = target.getBoundingClientRect()
    const tooltipRect = this.tooltip.getBoundingClientRect()

    // Calculate position (default: top center relative to target)
    let top = rect.top - tooltipRect.height - 8
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2)

    // Viewport bound checks
    if (top < 0) {
      top = rect.bottom + 8 // Flip to bottom if clipping top
    }
    if (left < 0) {
      left = 8 // Constrain left
    } else if (left + tooltipRect.width > window.innerWidth) {
      left = window.innerWidth - tooltipRect.width - 8 // Constrain right
    }

    this.tooltip.style.top = `${top}px`
    this.tooltip.style.left = `${left}px`
    this.tooltip.classList.remove('invisible', 'opacity-0')
  }

  handleMouseOut(e) {
    const target = e.target.closest('[data-tooltip-html]')
    if (target) {
      this.tooltip.classList.add('invisible', 'opacity-0')
    }
  }

  destroy() {
    document.removeEventListener('mouseover', this.handleMouseOver)
    document.removeEventListener('mouseout', this.handleMouseOut)
    this.tooltip.remove()
  }
}
