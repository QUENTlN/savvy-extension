import { Store } from '../../state.js'
import { SidebarAPI } from '../../api.js'
import { extractCalculationRule, validateAllTierForms, updateValueLabels, updateNonTieredCurrencyLabels } from '../../components/fees/index.js'
import { t } from '../../../shared/i18n.js'
import { showToast } from '../../utils/toast.js'

export function getSession() {
  return Store.state.sessions.find(s => s.id === Store.state.currentSession)
}

export function getForwarder() {
  const session = getSession()
  if (!session) return null
  return session.forwarders.find(f => f.id === Store.state.currentForwarderEditing)
}

export function navigateToList() {
  Store.setState({ currentForwarderEditing: null })
}

export function updateForwarder(forwarderId, updatedForwarder) {
  return Store.sync(SidebarAPI.updateForwarder(Store.state.currentSession, forwarderId, updatedForwarder))
}

export function extractFeeData(prefix) {
  const calculationMethod = extractCalculationRule(prefix, document)
  return { calculationMethod }
}

export function saveForwarder() {
  // Validate all tier forms before saving
  if (!validateAllTierForms()) {
    showToast(t('validation.tier.fixErrorsBeforeSaving'), { type: 'error' })
    return
  }

  const forwarder = getForwarder()
  if (!forwarder) return

  const nameInput = document.getElementById('forwarder-name')
  const name = nameInput ? nameInput.value.trim() : forwarder.name

  const currencySelect = document.getElementById('forwarder-currency')
  const currency = currencySelect ? currencySelect.value : forwarder.currency

  const fees = {
    reception: extractFeeData('reception'),
    storage: extractFeeData('storage'),
    repackaging: extractFeeData('repackaging'),
    reShipping: extractFeeData('reShipping')
  }

  updateForwarder(forwarder.id, { name, currency, fees }).then(() => {
    navigateToList()
  })
}

export function setupCurrencyChangeListener() {
  const currencySelect = document.getElementById('forwarder-currency')
  if (!currencySelect) return

  currencySelect.addEventListener('change', (e) => {
    const newCurrency = e.target.value

    // Update all fee section calculation containers
    const calcContainers = document.querySelectorAll('.calculation-rules-container')
    calcContainers.forEach(calcContainer => {
      const prefix = calcContainer.dataset.prefix
      if (!prefix) return

      const data = extractCalculationRule(prefix, calcContainer)
      const type = data.type

      // Update tiered value labels
      const isTieredType = data.isTiered || ['weight_volume', 'weight_dimension'].includes(type)
      if (isTieredType && ['quantity', 'distance', 'weight', 'volume', 'dimension', 'weight_volume', 'weight_dimension'].includes(type)) {
        updateValueLabels(calcContainer, prefix, type, data, newCurrency)
      }

      // Update non-tiered currency labels (amount labels with currency symbols)
      updateNonTieredCurrencyLabels(calcContainer, newCurrency)
    })
  })
}
