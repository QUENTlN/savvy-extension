import { t } from "../../../../shared/i18n.js";
import * as actions from "../ForwardersActions.js";
import { setupEscapeKey } from "../../../modals.js";

export function showDeleteForwarderModal(forwarder) {
  const session = actions.getSession();

  // Check if forwarder is used in delivery rules
  const usedInRules =
    session.deliveryRules?.some((rule) =>
      rule.forwarderChain?.some((link) => link.forwarderId === forwarder.id)
    ) || false;

  const modal = document.createElement("div");
  modal.innerHTML = `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div id="modalContent" class="card-bg rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-semibold card-text mb-4">${t("forwarders.deleteForwarder")}</h2>

        <p class="secondary-text mb-4">
          ${t("forwarders.deleteConfirmation", { name: forwarder.name })}
        </p>

        ${
          usedInRules
            ? `
          <div class="p-4 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg mb-4">
            <p class="text-sm text-yellow-800 dark:text-yellow-200">
              ${t("forwarders.deleteWarningUsed")}
            </p>
          </div>
        `
            : ""
        }

        <div class="flex space-x-3 mt-6">
          <button id="cancel-button" class="flex-1 px-4 py-3 secondary-bg secondary-text rounded-lg hover:opacity-90 transition-colors font-medium">
            ${t("common.cancel")}
          </button>
          <button id="confirm-button" class="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium">
            ${t("common.delete")}
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  setupEscapeKey(modal, closeModal);

  function closeModal() {
    document.body.removeChild(modal);
  }

  function confirmDelete() {
    actions.deleteForwarder(forwarder.id).then(() => {
      closeModal();
    });
  }

  modal.querySelector("#modalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "modalOverlay") closeModal();
  });
  modal.querySelector("#cancel-button").addEventListener("click", closeModal);
  modal.querySelector("#confirm-button").addEventListener("click", confirmDelete);
}
