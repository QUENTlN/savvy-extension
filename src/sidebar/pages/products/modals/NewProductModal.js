import { renderProductFormView } from "./ProductFormView.js";
import * as actions from "../ProductsActions.js";
import { t } from "../../../../shared/i18n.js";
import { Store } from "../../../state.js";
import { createModal, StorageService } from "../../../utils/index.js";
import { clearAllErrors, validateRequiredField } from "../../../modals.js";
import { setupCompatibilityToggle, collectProductFormData } from "./productFormHelpers.js";

export async function showNewProductModal(session) {
  const content = renderProductFormView({
    product: null,
    session,
    products: session.products,
  });

  const { modal } = createModal(content, {
    onSave: async () => {
      clearAllErrors(modal);

      if (!validateRequiredField("product-name", t("products.productName"))) {
        return false;
      }

      const formData = collectProductFormData();

      await actions.createProduct(Store.state.currentSession, formData);

      // If user selected compatible products, ensure bidirectional links
      if (formData.limitedCompatibilityWith.length > 0) {
        const currentSession = actions.getSession();
        const newProduct = currentSession.products[currentSession.products.length - 1];

        currentSession.products.forEach((prod) => {
          if (formData.limitedCompatibilityWith.includes(prod.id)) {
            prod.limitedCompatibilityWith = prod.limitedCompatibilityWith || [];
            if (!prod.limitedCompatibilityWith.includes(newProduct.id)) {
              prod.limitedCompatibilityWith.push(newProduct.id);
            }
          }
        });
        await actions.updateSession(Store.state.currentSession, currentSession);
      }
    },
  });

  // Initialize default units
  const defaults = await StorageService.getDefaults();
  const weightUnitSelect = document.getElementById("product-weight-unit");
  if (weightUnitSelect) weightUnitSelect.value = defaults.weightUnit;

  const volumeUnitSelect = document.getElementById("product-volume-unit");
  if (volumeUnitSelect) volumeUnitSelect.value = defaults.volumeUnit;

  const dimensionUnitSelect = document.getElementById("product-dimension-unit");
  if (dimensionUnitSelect) dimensionUnitSelect.value = defaults.dimensionUnit;

  setupCompatibilityToggle();
}
