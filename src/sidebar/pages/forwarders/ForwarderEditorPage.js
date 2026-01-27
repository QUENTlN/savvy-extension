import * as actions from './ForwarderEditorActions.js'
import { renderForwarderEditorView } from './ForwarderEditorView.js'
import { Store } from '../../state.js'
import { t } from '../../../shared/i18n.js'
import {
  handleCalculationTypeChange,
  handleTieredToggle,
  handleUnitChange,
  handleTierValueModeChange,
  handleTierValueTypeChange,
  handleMaxChange,
  handleAddRange,
  handleRemoveRange,
  getTierType,
  performLiveValidation
} from '../../components/fees/index.js'

// Bin-packing compatible reShipping types
const BIN_PACKING_TYPES = ['dimension', 'weight_volume', 'weight_dimension', 'volume_packages']

/**
 * Handle consolidationMode change
 * - as_is: disable repackaging billing/calculation fields
 * - consolidate: show warning if reShipping method is not bin-packing compatible
 * - single: normal behavior
 */
function handleConsolidationModeChange(mode) {
  const conditionalFields = document.getElementById('repackaging-conditional-fields')
  const asIsNotice = document.getElementById('as-is-notice')
  const consolidateWarning = document.getElementById('consolidate-warning')

  if (mode === 'as_is') {
    // Disable repackaging fields
    conditionalFields?.classList.add('opacity-50', 'pointer-events-none')
    asIsNotice?.classList.remove('hidden')
    consolidateWarning?.classList.add('hidden')
  } else {
    // Re-enable repackaging fields
    conditionalFields?.classList.remove('opacity-50', 'pointer-events-none')
    asIsNotice?.classList.add('hidden')

    // Validate compatibility if "consolidate"
    if (mode === 'consolidate') {
      validateConsolidationWithReShipping()
    } else {
      consolidateWarning?.classList.add('hidden')
    }
  }
}

/**
 * Validate consolidation mode with reShipping type
 * Shows a warning if consolidate mode is used with a non-bin-packing reShipping method
 */
function validateConsolidationWithReShipping() {
  const consolidationMode = document.querySelector('input[name="consolidationMode"]:checked')?.value
  const reShippingContainer = document.querySelector('[data-fee-section="reShipping"] .calculation-rules-container')
  const reShippingType = reShippingContainer?.querySelector('.calculation-type-radio:checked')?.value
  const warning = document.getElementById('consolidate-warning')

  if (consolidationMode === 'consolidate' && reShippingType && !BIN_PACKING_TYPES.includes(reShippingType)) {
    warning?.classList.remove('hidden')
  } else {
    warning?.classList.add('hidden')
  }
}

/**
 * Setup event listeners for consolidation mode interactions
 */
function setupConsolidationModeInteractions(app) {
  app.addEventListener('change', (e) => {
    // Handle consolidationMode radio change
    if (e.target.name === 'consolidationMode') {
      handleConsolidationModeChange(e.target.value)
    }

    // Handle reShipping type change - revalidate if in consolidate mode
    const reShippingContainer = e.target.closest('[data-fee-section="reShipping"]')
    if (reShippingContainer && e.target.classList.contains('calculation-type-radio')) {
      validateConsolidationWithReShipping()
    }
  })
}

export function initForwarderEditorPage(app) {
  const session = actions.getSession()
  if (!session) {
    Store.setState({ currentView: 'sessions' })
    return
  }

  const forwarder = actions.getForwarder()
  if (!forwarder) {
    Store.setState({ currentForwarderEditing: null })
    return
  }

  // Render the editor view
  app.innerHTML = renderForwarderEditorView({ forwarder })

  // Attach event listeners
  document.getElementById('back-button')?.addEventListener('click', actions.navigateToList)
  document.getElementById('cancel-button')?.addEventListener('click', actions.navigateToList)
  document.getElementById('save-button')?.addEventListener('click', actions.saveForwarder)

  // Setup currency change listener
  actions.setupCurrencyChangeListener()

  // Setup consolidation mode interactions
  setupConsolidationModeInteractions(app)

  // Event delegation for change events
  app.addEventListener('change', (e) => {
    // Calculation type radio
    if (e.target.classList.contains('calculation-type-radio')) {
      handleCalculationTypeChange(e)
    }

    // Tiered toggle
    if (e.target.classList.contains('is-tiered-toggle') || e.target.classList.contains('is-tiered-checkbox')) {
      handleTieredToggle(e)
    }

    // Unit change
    if (e.target.name && e.target.name.endsWith('_unit')) {
      const container = e.target.closest('.calculation-rules-container')
      handleUnitChange(e, container)
    }

    // Tier value mode toggle
    if (e.target.classList.contains('tier-value-mode-toggle')) {
      const container = e.target.closest('.calculation-rules-container')
      handleTierValueModeChange(e, container)
    }

    // Tier value type change
    if (e.target.name && e.target.name.endsWith('_tierValueType')) {
      const container = e.target.closest('.calculation-rules-container')
      handleTierValueTypeChange(e, container)
    }

    // Max field change (update next row's min)
    if (e.target.name && e.target.name.includes('_range_') && e.target.name.endsWith('_max')) {
      const container = e.target.closest('.calculation-rules-container')
      handleMaxChange(e, container)
    }
  })

  // Event delegation for click events
  app.addEventListener('click', (e) => {
    if (e.target.closest('.add-range-btn')) {
      const container = e.target.closest('.calculation-rules-container')
      handleAddRange(e, container)
    }
    if (e.target.closest('.remove-range-btn')) {
      handleRemoveRange(e)
    }
  })

  // Blur events for live validation
  app.addEventListener('blur', (e) => {
    const input = e.target

    if (input.tagName !== 'INPUT') return

    const container = input.closest('.calculation-rules-container')
    if (!container) return

    const prefix = container.dataset.prefix

    // Tier input field validation
    if (input.name && input.name.includes('_range_')) {
      const isTieredCb = container.querySelector(`input[name="${prefix}_isTiered"]`)

      if (isTieredCb && isTieredCb.checked) {
        const type = getTierType(container)

        if (['quantity', 'distance', 'weight', 'volume'].includes(type)) {
          performLiveValidation(input, container)
        }
      }
    }
  }, true)
}
