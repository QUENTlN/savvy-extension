import { t } from '../../../shared/i18n.js'
import { formatCurrency } from '../../utils/formatters.js'

export function renderHistoryView({ history, session }) {
  return `
    <div class="mx-4">
      <!-- Header -->
      <div class="flex justify-between items-center mb-3">
        <div class="flex items-center space-x-3">
          <button class="muted-text p-2 cursor-pointer" id="back-button">
            <span class="icon icon-back h-8 w-8"></span>
          </button>
          <h1 class="text-2xl pl-4 font-semibold card-text">
            ${t("results.historyTitle")}
          </h1>
        </div>
      </div>

      <!-- History List -->
      <div class="mt-4">
        ${history.length === 0 ? `
          <div class="card-bg rounded-xl p-6 text-center">
            <p class="muted-text">${t("results.noHistory")}</p>
          </div>
        ` : `
          <div class="space-y-3">
            ${history.map((item, index) => renderHistoryItem(item, index)).join('')}
          </div>
        `}
      </div>
    </div>
  `
}

function renderHistoryItem(item, index) {
  const data = item.result
  const currency = item.currency || 'EUR'

  // v2.0 API format: data.meta.status, data.totals.grand_total
  const status = data.meta?.status ?? data.status
  const totalCost = data.totals?.grand_total ?? data.total_cost ?? 0

  return `
    <div class="card-bg rounded-lg p-3 cursor-pointer hover:opacity-80 transition-opacity history-item" data-index="${index}">
      <div class="flex justify-between items-center">
        <div>
          <p class="card-text font-medium">${formatCurrency(totalCost, currency)}</p>
          <p class="text-sm muted-text">${new Date(item.timestamp).toLocaleString()}</p>
        </div>
        <span class="inline-block px-2 py-1 rounded text-xs font-medium ${getStatusClass(status)}">
          ${status}
        </span>
      </div>
    </div>
  `
}

function getStatusClass(status) {
  switch (status) {
    case 'OPTIMAL':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'FEASIBLE':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'INFEASIBLE':
    case 'ERROR':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }
}
