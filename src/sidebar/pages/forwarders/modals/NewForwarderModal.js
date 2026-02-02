import { t } from "../../../../shared/i18n.js";
import * as actions from "../ForwardersActions.js";
import { setupAutoFocus, setupEscapeKey, setupEnterKey } from "../../../modals.js";
import { validateRequiredField, clearAllErrors } from "../../../modals.js";

export function showNewForwarderModal() {
  const modal = document.createElement("div");
  modal.innerHTML = `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div id="modalContent" class="card-bg rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-semibold card-text mb-4">${t("forwarders.newForwarder")}</h2>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium secondary-text mb-1">${t("forwarders.forwarderName")}</label>
            <input type="text" id="forwarder-name" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none" placeholder="${t("forwarders.forwarderNamePlaceholder")}">
            <div id="forwarder-name-error" class="error-message"></div>
          </div>
        </div>

        <div class="flex space-x-3 mt-6">
          <button id="cancel-button" class="flex-1 px-4 py-3 secondary-bg secondary-text rounded-lg hover:opacity-90 transition-colors font-medium">
            ${t("common.cancel")}
          </button>
          <button id="save-button" class="flex-1 px-4 py-3 primary-bg primary-text rounded-lg hover:opacity-90 transition-colors font-medium">
            ${t("common.save")}
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  setupAutoFocus(modal);
  setupEscapeKey(modal, closeModal);
  setupEnterKey(modal, saveModal);

  function closeModal() {
    clearAllErrors(modal);
    document.body.removeChild(modal);
  }

  function saveModal() {
    // Validate
    if (!validateRequiredField("forwarder-name", t("forwarders.forwarderName"))) return;

    // Get data
    const name = document.getElementById("forwarder-name").value.trim();

    // Create forwarder
    const forwarder = { name };

    actions.createForwarder(forwarder).then(() => {
      // Navigate to editor to configure fees
      const session = actions.getSession();
      const newForwarder = session.forwarders[session.forwarders.length - 1];
      actions.navigateToEditor(newForwarder.id);
      closeModal();
    });
  }

  modal.querySelector("#modalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "modalOverlay") closeModal();
  });
  modal.querySelector("#cancel-button").addEventListener("click", closeModal);
  modal.querySelector("#save-button").addEventListener("click", saveModal);
}
