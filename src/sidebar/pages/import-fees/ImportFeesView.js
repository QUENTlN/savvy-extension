import { t } from "../../../shared/i18n.js";
import { formatPercent } from "../../utils/formatters.js";
import { escapeHTML } from "../../utils/sanitize.js";

export function renderImportFeesView({ session }) {
  return `
    <div class="mx-4 pb-8">
      <!-- Header -->
      <div class="flex justify-between items-center mb-3">
        <div class="flex items-center space-x-3">
          <button class="muted-text p-2 cursor-pointer" id="back-button">
            <span class="icon icon-back h-8 w-8"></span>
          </button>
          <h1 class="text-2xl pl-4 font-semibold card-text">${t("deliveryRules.importFeeSection")}</h1>
        </div>
      </div>

      <p class="text-sm muted-text mb-6">${t("importFees.subtitle")}</p>

      <!-- Default VAT Rate -->
      <div class="mb-6 card-bg rounded-xl shadow-md p-6 border border-default">
        <label for="default-vat" class="block text-sm font-medium secondary-text mb-1">${t("deliveryRules.defaultVAT")} (%)</label>
        <input
          type="number"
          id="default-vat"
          value="${session.defaultVAT ? formatPercent(session.defaultVAT) : ""}"
          step="0.01"
          min="0"
          max="100"
          class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border-transparent"
        >
      </div>

      <!-- Product Categories -->
      <div class="mb-6 card-bg rounded-xl shadow-md p-6 border border-default">
        <h3 class="text-lg font-medium card-text mb-3">${t("deliveryRules.productCategories")}</h3>

        ${
          session.customsCategories && session.customsCategories.length > 0
            ? `
        <div class="space-y-2 mb-4">
          ${session.customsCategories
            .map(
              (cat) => `
            <div class="flex items-center justify-between p-3 secondary-bg rounded-lg border border-default">
              <div class="flex-1">
                <p class="font-medium card-text">${escapeHTML(cat.name)}</p>
                <p class="text-sm muted-text">
                  ${t("deliveryRules.dutyRate")}: ${formatPercent(cat.dutyRate)}%<br>
                  ${t("deliveryRules.vatRate")}: ${formatPercent(cat.vatRate)}%
                </p>
              </div>
              <div class="flex space-x-2">
                <button class="muted-text p-1 cursor-pointer edit-category-btn" data-id="${cat.id}">
                  <span class="icon icon-edit h-5 w-5"></span>
                </button>
                <button class="muted-text p-1 cursor-pointer delete-category-btn" data-id="${cat.id}">
                  <span class="icon icon-delete h-5 w-5"></span>
                </button>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
        `
            : `
        <p class="text-sm muted-text mb-4">${t("deliveryRules.noCategoriesYet")}</p>
        `
        }

        <button id="add-category-btn" class="w-full flex items-center justify-center space-x-2 cursor-pointer secondary-bg secondary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm border border-default">
          <span class="icon icon-plus h-5 w-5"></span>
          <span class="text-base font-medium">${t("deliveryRules.addCategory")}</span>
        </button>
      </div>

      <button id="save-import-fees-button" class="w-full flex items-center justify-center space-x-2 cursor-pointer primary-bg primary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm">
        <span class="text-lg font-medium">${t("common.save")}</span>
      </button>
    </div>
  `;
}
