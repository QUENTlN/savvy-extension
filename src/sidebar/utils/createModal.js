import { setupAutoFocus, setupEscapeKey, setupEnterKey, clearAllErrors } from "../modals.js";

/**
 * Creates and displays a modal dialog with common functionality.
 *
 * @param {string} content - HTML content for the modal
 * @param {Object} options - Configuration options
 * @param {Function} [options.onSave] - Callback when save button is clicked
 * @param {Function} [options.onClose] - Callback when modal is closed
 * @param {string} [options.saveButtonId='save-button'] - ID of the save button
 * @param {string} [options.cancelButtonId='cancel-button'] - ID of the cancel button
 * @param {boolean} [options.autoFocus=true] - Whether to auto-focus first input
 * @param {boolean} [options.escapeToClose=true] - Whether Escape key closes modal
 * @param {boolean} [options.enterToSave=true] - Whether Enter key triggers save
 * @param {boolean} [options.clickOutsideToClose=true] - Whether clicking outside closes modal
 * @returns {{ modal: HTMLElement, closeModal: Function }}
 */
export function createModal(content, options = {}) {
  const {
    onSave,
    onClose,
    saveButtonId = "save-button",
    cancelButtonId = "cancel-button",
    autoFocus = true,
    escapeToClose = true,
    enterToSave = true,
    clickOutsideToClose = true,
  } = options;

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = content;
  document.body.appendChild(modal);

  const closeModal = () => {
    clearAllErrors(modal);
    if (onClose) onClose();
    if (document.body.contains(modal)) {
      document.body.removeChild(modal);
    }
  };

  const handleSave = async () => {
    if (onSave) {
      const result = await onSave();
      if (result !== false) {
        closeModal();
      }
    }
  };

  if (autoFocus) {
    setupAutoFocus(modal);
  }

  if (escapeToClose) {
    setupEscapeKey(modal, closeModal);
  }

  if (enterToSave && onSave) {
    setupEnterKey(modal, handleSave);
  }

  if (clickOutsideToClose) {
    modal.querySelector("#modalOverlay")?.addEventListener("click", closeModal);
    modal.querySelector("#modalContent")?.addEventListener("click", (e) => e.stopPropagation());
  }

  modal.querySelector(`#${cancelButtonId}`)?.addEventListener("click", closeModal);

  if (onSave) {
    modal.querySelector(`#${saveButtonId}`)?.addEventListener("click", handleSave);
  }

  return { modal, closeModal };
}
