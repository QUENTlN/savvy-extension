import { renderAlternativesView } from "./AlternativesView.js";
import * as actions from "./AlternativesActions.js";
import {
  showNewAlternativeGroupModal,
  showEditAlternativeGroupModal,
  showDeleteAlternativeGroupModal,
} from "./modals/index.js";
import { Store } from "../../state.js";

export function initAlternativesPage(app) {
  const session = actions.getSession();

  if (!session) {
    Store.setState({ currentView: "sessions" });
    return;
  }

  app.innerHTML = renderAlternativesView({ session });
  attachEventListeners(session);
}

function attachEventListeners(session) {
  document.getElementById("back-button")?.addEventListener("click", actions.navigateToProducts);

  document.getElementById("new-group-button")?.addEventListener("click", () => {
    showNewAlternativeGroupModal();
  });

  document.querySelectorAll(".edit-group-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const groupId = btn.dataset.id;
      const group = session.alternativeGroups.find((g) => g.id === groupId);
      showEditAlternativeGroupModal(group);
    });
  });

  document.querySelectorAll(".delete-group-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const groupId = btn.dataset.id;
      showDeleteAlternativeGroupModal(groupId);
    });
  });
}
