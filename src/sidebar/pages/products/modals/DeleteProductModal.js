import { t } from "../../../../shared/i18n.js";
import * as actions from "../ProductsActions.js";
import { Store } from "../../../state.js";
import { showConfirmationModal } from "../../../utils/index.js";

export function showDeleteProductModal(productId) {
  showConfirmationModal({
    title: t("products.deleteProduct"),
    message: t("products.confirmDelete"),
    confirmText: t("products.deleteButton"),
    onConfirm: async () => {
      await actions.deleteProduct(Store.state.currentSession, productId);
    },
  });
}
