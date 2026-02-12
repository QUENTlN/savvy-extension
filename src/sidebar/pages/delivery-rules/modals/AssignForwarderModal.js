import { t } from "../../../../shared/i18n.js";
import { setupEscapeKey, setupEnterKey, setupAutoFocus } from "../../../modals.js";
import { showToast } from "../../../utils/toast.js";
import { escapeHTML } from "../../../utils/sanitize.js";

export function showAssignForwarderModal(session, onSelect) {
  const forwarders = session.forwarders || [];

  if (forwarders.length === 0) {
    showToast(
      t("deliveryRules.noForwardersAvailable") ||
        "No forwarders available. Please create forwarders first.",
      { type: "error" }
    );
    return;
  }

  const modal = document.createElement("div");
  modal.innerHTML = `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div id="modalContent" class="card-bg rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-semibold card-text mb-4">${t("deliveryRules.selectForwarder")}</h2>

        <div class="mb-4">
          <label class="block text-sm font-medium secondary-text mb-2">${t("forwarders.forwarderName")}</label>
          <select id="forwarder-select" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none">
            <option value="">-- ${t("deliveryRules.selectForwarder")} --</option>
            ${forwarders
              .map(
                (f) => `
              <option value="${f.id}">${escapeHTML(f.name)}</option>
            `
              )
              .join("")}
          </select>
        </div>

        <div class="flex space-x-3 mt-6">
          <button id="cancel-button" class="flex-1 px-4 py-3 secondary-bg secondary-text rounded-lg hover:opacity-90 transition-colors font-medium">
            ${t("common.cancel")}
          </button>
          <button id="add-button" class="flex-1 px-4 py-3 primary-bg primary-text rounded-lg hover:opacity-90 transition-colors font-medium">
            ${t("deliveryRules.addToChain")}
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  setupAutoFocus(modal);
  setupEscapeKey(modal, closeModal);

  function closeModal() {
    document.body.removeChild(modal);
  }

  function addForwarder() {
    const select = document.getElementById("forwarder-select");
    const forwarderId = select.value;

    if (!forwarderId) {
      showToast(t("deliveryRules.pleaseSelectForwarder") || "Please select a forwarder", {
        type: "error",
      });
      return;
    }

    onSelect(forwarderId);
    closeModal();
  }

  setupEnterKey(modal, addForwarder);

  modal.querySelector("#modalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "modalOverlay") closeModal();
  });
  modal.querySelector("#cancel-button").addEventListener("click", closeModal);
  modal.querySelector("#add-button").addEventListener("click", addForwarder);
}
