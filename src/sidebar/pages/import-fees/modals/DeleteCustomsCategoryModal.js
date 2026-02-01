import { t } from "../../../../shared/i18n.js";
import * as actions from "../ImportFeesActions.js";
import { showConfirmationModal } from "../../../utils/index.js";

export function showDeleteCustomsCategoryModal(categoryId) {
  showConfirmationModal({
    title: t("deliveryRules.deleteCategory"),
    message: t("deliveryRules.confirmDeleteCategory"),
    onConfirm: async () => {
      // Check if there's a default VAT input on the page
      let defaultVAT = null;
      const defaultVATInput = document.getElementById("default-vat");
      if (defaultVATInput) {
        const val = parseFloat(defaultVATInput.value);
        if (!isNaN(val) && val >= 0 && val <= 100) {
          defaultVAT = val / 100;
        }
      }
      await actions.deleteCustomsCategory(categoryId, defaultVAT);
    },
  });
}
