import { t } from "../../../../shared/i18n.js";
import * as actions from "../ImportFeesActions.js";
import {
  setupAutoFocus,
  setupEscapeKey,
  setupEnterKey,
  clearAllErrors,
  validateRequiredField,
  showFieldError,
} from "../../../modals.js";
import { formatPercent } from "../../../utils/formatters.js";

export function showNewCustomsCategoryModal() {
  const session = actions.getSession();
  const defaultVATInput = document.getElementById("default-vat");
  let defaultVATPercentage = "";
  if (defaultVATInput && defaultVATInput.value) {
    defaultVATPercentage = defaultVATInput.value;
  } else if (session.defaultVAT) {
    defaultVATPercentage = formatPercent(session.defaultVAT);
  }

  const modal = document.createElement("div");
  modal.innerHTML = `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
      <div id="modalContent" class="card-bg rounded-lg shadow-lg w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-medium card-text mb-4">${t("deliveryRules.newCategory")}</h3>

        <div class="mb-6">
          <label for="category-name" class="block text-sm font-medium secondary-text mb-1">${t("deliveryRules.categoryName")}</label>
          <input
            type="text"
            id="category-name"
            placeholder="${t("modals.enterCategoryName")}"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
        </div>

        <div class="mb-6">
          <label for="duty-rate" class="block text-sm font-medium secondary-text mb-1">${t("deliveryRules.dutyRate")} (%)</label>
          <input
            type="number"
            id="duty-rate"
            step="0.01"
            min="0"
            max="100"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
        </div>

        <div class="mb-6">
          <label for="vat-rate" class="block text-sm font-medium secondary-text mb-1">${t("deliveryRules.vatRate")} (%)</label>
          <input
            type="number"
            id="vat-rate"
            value="${defaultVATPercentage}"
            step="0.01"
            min="0"
            max="100"
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
        </div>

        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 secondary-text font-medium hover:secondary-bg cursor-pointer rounded">${t("common.cancel")}</button>
          <button id="save-button" class="px-4 py-2 primary-bg primary-text font-medium cursor-pointer rounded flex items-center">${t("common.save")}</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => {
    clearAllErrors(modal);
    document.body.removeChild(modal);
  };

  const save = () => {
    clearAllErrors(modal);

    if (!validateRequiredField("category-name", t("deliveryRules.categoryName"))) return;

    const name = document.getElementById("category-name").value.trim();
    const dutyRateValue = document.getElementById("duty-rate").value.trim();
    const vatRateValue = document.getElementById("vat-rate").value.trim();
    const dutyRatePercent = dutyRateValue === "" ? 0 : parseFloat(dutyRateValue);
    const vatRatePercent = vatRateValue === "" ? 0 : parseFloat(vatRateValue);

    if (isNaN(dutyRatePercent) || dutyRatePercent < 0 || dutyRatePercent > 100) {
      showFieldError("duty-rate", t("modals.invalidNumber"));
      return;
    }

    if (isNaN(vatRatePercent) || vatRatePercent < 0 || vatRatePercent > 100) {
      showFieldError("vat-rate", t("modals.invalidNumber"));
      return;
    }

    const dutyRate = dutyRatePercent / 100;
    const vatRate = vatRatePercent / 100;

    const category = { name, dutyRate, vatRate };

    let defaultVAT = null;
    const mainVATInput = document.getElementById("default-vat");
    if (mainVATInput) {
      const val = parseFloat(mainVATInput.value);
      if (!isNaN(val) && val >= 0 && val <= 100) {
        defaultVAT = val / 100;
      }
    }

    actions.createCustomsCategory(category, defaultVAT).then(() => {
      closeModal();
    });
  };

  setupAutoFocus(modal);
  setupEscapeKey(modal, closeModal);
  setupEnterKey(modal, save);

  modal.querySelector("#modalOverlay").addEventListener("click", closeModal);
  modal.querySelector("#modalContent").addEventListener("click", (e) => e.stopPropagation());
  modal.querySelector("#cancel-button").addEventListener("click", closeModal);
  modal.querySelector("#save-button").addEventListener("click", save);
}
