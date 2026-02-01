import { t } from "../../../../shared/i18n.js";
import { createModal } from "../../../utils/createModal.js";
import { clearAllErrors, showFieldError, clearFieldError } from "../../../modals.js";
import { getCurrencySymbol } from "../../../utils/formatters.js";
import { CURRENCIES } from "../../../../shared/config/currencies.js";

/**
 * Renders the currency conversion form
 * @param {string[]} foreignCurrencies - Array of foreign currency codes
 * @param {string} targetCurrency - User's default currency
 * @returns {string} HTML string
 */
function renderCurrencyConversionForm(foreignCurrencies, targetCurrency) {
  const targetSymbol = getCurrencySymbol(targetCurrency);
  const target = CURRENCIES.find((c) => c.code === targetCurrency);
  const targetLabel = target?.label || targetCurrency;
  const targetCode = target?.code || targetCurrency;

  const fieldsHtml = foreignCurrencies
    .map((currencyCode) => {
      const symbol = getCurrencySymbol(currencyCode);
      const label = CURRENCIES.find((c) => c.code === currencyCode)?.label || currencyCode;

      return `
      <div class="group p-4 rounded-2xl secondary-bg border border-default focus-within:ring-2 focus-within:ring-primary focus-within:card-bg transition-all">
        <div class="grid grid-cols-[30px_1fr] items-center gap-3">
          <div class="text-left">
            <span class="muted-text font-medium text-xl">=</span>
          </div>

          <div>
            <div class="flex items-center justify-between gap-3">
              <div>
                <input
                  type="number"
                  id="rate-${currencyCode}"
                  data-currency="${currencyCode}"
                  step="0.0001"
                  placeholder="1"
                  class="w-full bg-transparent text-xl font-black card-text outline-none border-none p-0 focus:ring-0 placeholder:opacity-40"
                />
              </div>

              <div class="flex flex-col items-end min-w-fit">
                <span class="font-bold card-text text-lg">${symbol} ${currencyCode}</span>
                <span class="text-[10px] uppercase font-bold muted-text tracking-tight">${label}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  return `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
      <div id="modalContent" class="card-bg rounded-lg shadow-lg w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-medium card-text mb-2">${t("currencyConversion.title")}</h3>
        <p class="text-sm muted-text mb-6">
          ${t("currencyConversion.description")}
        </p>

        <div class="flex items-center p-4 rounded-2xl card-bg border border-default shadow-sm">
          <div class="flex items-center justify-between gap-3">
            <span class="text-2xl font-black card-text">1</span>
            <div class="flex flex-col min-w-fit">
              <span class="font-bold card-text text-lg">${targetSymbol} ${targetCode}</span>
              <span class="text-[10px] uppercase font-bold muted-text tracking-tight">${targetLabel}</span>
            </div>
          </div>
        </div>

        <div class="px-5">
          <div class="border-l-2 border-dotted border-default h-4 ml-1"></div>
        </div>

        <div class="space-y-4">
          ${fieldsHtml}
        </div>

        <div class="flex justify-end space-x-4 mt-6">
          <button id="cancel-button" class="px-4 py-2 secondary-text font-medium hover:secondary-bg cursor-pointer rounded">
            ${t("common.cancel")}
          </button>
          <button id="save-button" class="px-4 py-2 primary-bg primary-text font-medium cursor-pointer rounded">
            ${t("currencyConversion.convert")}
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Validates conversion rate inputs
 * @param {HTMLElement} modal - Modal element
 * @param {string[]} foreignCurrencies - Array of currency codes
 * @returns {boolean} True if all rates are valid
 */
function validateConversionRates(modal, foreignCurrencies) {
  clearAllErrors(modal);

  let isValid = true;

  foreignCurrencies.forEach((currencyCode) => {
    const input = modal.querySelector(`#rate-${currencyCode}`);
    const value = parseFloat(input.value);

    if (!input.value || isNaN(value) || value <= 0) {
      showFieldError(`rate-${currencyCode}`, t("currencyConversion.invalidRate"));
      isValid = false;
    } else {
      clearFieldError(`rate-${currencyCode}`);
    }
  });

  return isValid;
}

/**
 * Collects conversion rates from form
 * @param {HTMLElement} modal - Modal element
 * @param {string[]} foreignCurrencies - Array of currency codes
 * @returns {Object} Map of currency code to conversion rate
 */
function collectConversionRates(modal, foreignCurrencies) {
  const rates = {};

  foreignCurrencies.forEach((currencyCode) => {
    const input = modal.querySelector(`#rate-${currencyCode}`);
    rates[currencyCode] = parseFloat(input.value);
  });

  return rates;
}

/**
 * Shows modal to collect currency conversion rates
 * @param {string[]} foreignCurrencies - Array of foreign currency codes
 * @param {string} targetCurrency - User's default currency
 * @returns {Promise<Object|null>} Map of rates or null if cancelled
 */
export function showCurrencyConversionModal(foreignCurrencies, targetCurrency) {
  return new Promise((resolve) => {
    const content = renderCurrencyConversionForm(foreignCurrencies, targetCurrency);

    const { modal, closeModal } = createModal(content, {
      onSave: () => {
        if (!validateConversionRates(modal, foreignCurrencies)) {
          return false; // Keep modal open
        }

        const rates = collectConversionRates(modal, foreignCurrencies);
        resolve(rates);
        return true;
      },
      onClose: () => {
        resolve(null); // User cancelled
      },
      autoFocus: true,
      escapeToClose: true,
      enterToSave: true,
    });
  });
}
