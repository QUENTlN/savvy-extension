import { renderSessionsView } from "./SessionsView.js";
import * as actions from "./SessionsActions.js";
import {
  showNewSessionModal,
  showEditSessionModal,
  showDeleteSessionModal,
} from "./modals/index.js";
import { Store } from "../../state.js";
import { importSession, exportSession } from "../../utils/exportImport.js";

export function initSessionsPage(app) {
  app.innerHTML = renderSessionsView({ sessions: Store.state.sessions });
  attachEventListeners();
}

function attachEventListeners() {
  document.getElementById("import-session-button")?.addEventListener("click", importSession);

  document.getElementById("settings-button")?.addEventListener("click", actions.navigateToSettings);

  document.getElementById("new-session-button")?.addEventListener("click", showNewSessionModal);

  document.querySelectorAll(".session-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      if (!e.target.closest(".edit-button, .delete-button, .export-button")) {
        actions.navigateToProducts(item.dataset.id);
      }
    });
  });

  document.querySelectorAll(".export-button").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const session = Store.state.sessions.find((s) => s.id === btn.dataset.id);
      exportSession(session);
    });
  });

  document.querySelectorAll(".edit-button").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const session = Store.state.sessions.find((s) => s.id === btn.dataset.id);
      showEditSessionModal(session);
    });
  });

  document.querySelectorAll(".delete-button").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      showDeleteSessionModal(btn.dataset.id);
    });
  });
}
