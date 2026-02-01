import { renderDeliveryRulesView } from "./DeliveryRulesView.js";
import { initSellerRulesPage } from "./SellerRulesPage.js";
import * as actions from "./DeliveryRulesActions.js";
import { Store } from "../../state.js";
import { SidebarAPI } from "../../api.js";

export function initDeliveryRulesPage(app) {
  const session = actions.getSession();

  if (!session) {
    Store.setState({ currentView: "sessions" });
    return;
  }

  // If in edit mode, show the seller editing view
  if (actions.isInEditMode()) {
    initSellerRulesPage(actions.getCurrentSellerEditing());
    return;
  }

  // Ensure all sellers have default delivery rules
  const { getUniqueSellers, ensureDefaultRule } = actions;
  const sellers = getUniqueSellers(session);
  let hasNewRules = false;

  sellers.forEach((seller) => {
    const created = ensureDefaultRule(session, seller);
    if (created) {
      hasNewRules = true;
    }
  });

  if (hasNewRules) {
    Store.sync(SidebarAPI.updateSession(Store.state.currentSession, session));
  }

  // Render the list view
  app.innerHTML = renderDeliveryRulesView({ session });
  attachEventListeners();
}

function attachEventListeners() {
  document.getElementById("back-button")?.addEventListener("click", actions.navigateToProducts);

  document.querySelectorAll(".edit-seller-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      actions.navigateToEditSeller(btn.dataset.seller);
    });
  });
}
