import { t } from "../../shared/i18n.js";
import { createModal } from "./createModal.js";

/**
 * Shows a generic confirmation modal dialog.
 *
 * @param {Object} options - Configuration options
 * @param {string} options.title - Title text for the modal
 * @param {string} [options.message] - Optional confirmation message
 * @param {string} [options.confirmText] - Text for confirm button (defaults to "Delete")
 * @param {Function} options.onConfirm - Async callback to execute on confirm
 * @param {boolean} [options.isDanger=true] - Whether to use danger styling
 */
export function showConfirmationModal({
  title,
  message = null,
  confirmText = null,
  onConfirm,
  isDanger = true,
}) {
  const buttonText = confirmText || t("common.delete");

  const content = `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
      <div id="modalContent" class="card-bg rounded-lg shadow-lg w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-medium card-text mb-4">${title}</h3>
        ${message ? `<p class="muted-text mb-6">${message}</p>` : ""}

        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 secondary-text font-medium hover:secondary-bg cursor-pointer rounded">${t("common.cancel")}</button>
          <button id="confirm-button" class="px-4 py-2 ${isDanger ? "primary-bg primary-text" : "accent-bg accent-text"} font-medium cursor-pointer rounded flex items-center">${buttonText}</button>
        </div>
      </div>
    </div>
  `;

  createModal(content, {
    onSave: onConfirm,
    saveButtonId: "confirm-button",
    enterToSave: false,
    autoFocus: false,
  });
}
