import { renderImportFeesView } from "./ImportFeesView.js";
import * as actions from "./ImportFeesActions.js";
import {
  showNewCustomsCategoryModal,
  showEditCustomsCategoryModal,
  showDeleteCustomsCategoryModal,
} from "./modals/index.js";
import { Store } from "../../state.js";

export function initImportFeesPage(app) {
  const session = actions.getSession();

  if (!session) {
    Store.setState({ currentView: "sessions" });
    return;
  }

  if (!session.importFeesEnabled) {
    Store.setState({ currentView: "products" });
    return;
  }

  app.innerHTML = renderImportFeesView({ session });
  attachEventListeners(session);
}

function attachEventListeners(session) {
  document.getElementById("back-button")?.addEventListener("click", actions.navigateToProducts);

  document.getElementById("add-category-btn")?.addEventListener("click", () => {
    showNewCustomsCategoryModal();
  });

  document.querySelectorAll(".edit-category-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const categoryId = btn.dataset.id;
      const category = session.customsCategories.find((c) => c.id === categoryId);
      if (category) {
        showEditCustomsCategoryModal(category);
      }
    });
  });

  document.querySelectorAll(".delete-category-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const categoryId = btn.dataset.id;
      showDeleteCustomsCategoryModal(categoryId);
    });
  });

  document.getElementById("save-import-fees-button")?.addEventListener("click", () => {
    const defaultVATInput = document.getElementById("default-vat");
    let defaultVAT = null;
    if (defaultVATInput) {
      const defaultVATPercent = parseFloat(defaultVATInput.value);
      if (!isNaN(defaultVATPercent) && defaultVATPercent >= 0 && defaultVATPercent <= 100) {
        defaultVAT = defaultVATPercent / 100;
      }
    }

    actions.saveImportFees(session, defaultVAT);
  });
}
