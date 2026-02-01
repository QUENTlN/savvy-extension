import { renderProductFormView } from "./ProductFormView.js";
import * as actions from "../ProductsActions.js";
import { t } from "../../../../shared/i18n.js";
import { Store } from "../../../state.js";
import { createModal, StorageService } from "../../../utils/index.js";
import { clearAllErrors, validateRequiredField } from "../../../modals.js";
import {
  setupCompatibilityToggle,
  collectProductFormData,
  updateBidirectionalCompatibility,
} from "./productFormHelpers.js";

export async function showEditProductModal(product, session) {
  // Check if product is in an alternative group
  const hasAlternativeGroupWarning =
    session.alternativeGroups &&
    session.alternativeGroups.some((g) =>
      g.options.some((opt) => opt.products?.some((p) => p.productId === product.id))
    );

  const content = renderProductFormView({
    product,
    session,
    products: session.products,
    hasAlternativeGroupWarning,
  });

  const { modal, closeModal } = createModal(content, {
    onSave: async () => {
      clearAllErrors(modal);

      if (!validateRequiredField("product-name", t("products.productName"))) {
        return false;
      }

      const formData = collectProductFormData();
      const currentSession = actions.getSession();
      const prod = currentSession.products.find((p) => p.id === product.id);
      if (!prod) return false;

      Object.assign(prod, formData);
      updateBidirectionalCompatibility(
        currentSession.products,
        prod,
        formData.limitedCompatibilityWith
      );

      await actions.updateSession(Store.state.currentSession, currentSession);
    },
  });

  // Initialize defaults if not set
  const defaults = await StorageService.getDefaults();
  if (!product.weightUnit) {
    const el = document.getElementById("product-weight-unit");
    if (el) el.value = defaults.weightUnit;
  }
  if (!product.volumeUnit) {
    const el = document.getElementById("product-volume-unit");
    if (el) el.value = defaults.volumeUnit;
  }
  if (!product.dimensionUnit) {
    const el = document.getElementById("product-dimension-unit");
    if (el) el.value = defaults.dimensionUnit;
  }

  // Setup compatibility toggle
  const hasSelections =
    product.limitedCompatibilityWith && product.limitedCompatibilityWith.length > 0;
  setupCompatibilityToggle(hasSelections);
}
