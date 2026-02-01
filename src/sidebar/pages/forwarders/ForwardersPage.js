import * as actions from "./ForwardersActions.js";
import { renderForwardersView } from "./ForwardersView.js";
import { Store } from "../../state.js";
import { showNewForwarderModal } from "./modals/NewForwarderModal.js";
import { showDeleteForwarderModal } from "./modals/DeleteForwarderModal.js";

export async function initForwardersPage(app) {
  // Check if we're in editor mode
  if (Store.state.currentForwarderEditing) {
    const { initForwarderEditorPage } = await import("./ForwarderEditorPage.js");
    initForwarderEditorPage(app);
    return;
  }

  const session = actions.getSession();
  if (!session) {
    Store.setState({ currentView: "sessions" });
    return;
  }

  if (!session.forwardersEnabled) {
    Store.setState({ currentView: "products" });
    return;
  }

  // Render the list view
  app.innerHTML = renderForwardersView({ session });

  // Attach event listeners
  document.getElementById("back-button")?.addEventListener("click", actions.navigateToProducts);

  document.getElementById("add-forwarder-button")?.addEventListener("click", () => {
    showNewForwarderModal();
  });

  // Edit forwarder buttons
  document.querySelectorAll(".edit-forwarder-button").forEach((button) => {
    button.addEventListener("click", () => {
      const forwarderId = button.dataset.id;
      actions.navigateToEditor(forwarderId);
    });
  });

  // Delete forwarder buttons
  document.querySelectorAll(".delete-forwarder-button").forEach((button) => {
    button.addEventListener("click", () => {
      const forwarderId = button.dataset.id;
      const forwarder = session.forwarders.find((f) => f.id === forwarderId);
      if (forwarder) {
        showDeleteForwarderModal(forwarder);
      }
    });
  });
}
