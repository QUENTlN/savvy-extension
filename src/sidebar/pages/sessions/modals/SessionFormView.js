import { t } from "../../../../shared/i18n.js";

/**
 * Renders a session form view for both creating and editing sessions.
 *
 * @param {Object|null} [session=null] - Session to edit, or null for new session
 * @returns {string} HTML string
 */
export function renderSessionFormView(session = null) {
  const isEdit = !!session;
  const prefix = isEdit ? "edit-" : "";

  const title = isEdit ? t("sessions.editSession") : t("sessions.newSession");
  const name = session?.name || "";
  const namePlaceholder = isEdit ? "" : t("sessions.enterSessionName");

  const manageQuantity = session ? session.manageQuantity !== false : false;
  const importFeesEnabled = session?.importFeesEnabled || false;
  const forwardersEnabled = session?.forwardersEnabled || false;
  const manageWeight = session?.manageWeight || false;
  const manageVolume = session?.manageVolume || false;
  const manageDimension = session?.manageDimension || false;
  const manageDistance = session?.manageDistance || false;

  const renderToggle = (id, label, checked) => `
    <div class="mb-6 flex items-center justify-between">
      <label for="${prefix}${id}" class="text-sm font-medium secondary-text">${label}</label>
      <label class="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" id="${prefix}${id}" class="sr-only peer" ${checked ? "checked" : ""}>
        <div class="toggle-switch"></div>
      </label>
    </div>
  `;

  return `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
      <div id="modalContent" class="card-bg rounded-lg shadow-lg w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-medium card-text mb-4">${title}</h3>

        <div class="mb-6">
          <label for="${prefix}session-name" class="block text-sm font-medium secondary-text mb-1">${t("sessions.sessionName")}</label>
          <input
            type="text"
            id="${prefix}session-name"
            value="${name}"
            ${namePlaceholder ? `placeholder="${namePlaceholder}"` : ""}
            class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
        </div>

        ${renderToggle("manage-quantity", t("sessions.manageQuantities"), manageQuantity)}
        ${renderToggle("import-fees-enabled", t("sessions.ImportFeesManagement"), importFeesEnabled)}
        ${renderToggle("forwarders-enabled", t("sessions.forwardersManagement"), forwardersEnabled)}
        ${renderToggle("manage-weight", t("sessions.manageWeight"), manageWeight)}
        ${renderToggle("manage-volume", t("sessions.manageVolume"), manageVolume)}
        ${renderToggle("manage-dimension", t("sessions.manageDimension"), manageDimension)}
        ${renderToggle("manage-distance", t("sessions.manageDistance"), manageDistance)}

        <div class="flex justify-end space-x-4">
          <button id="cancel-button" class="px-4 py-2 secondary-text font-medium hover:secondary-bg cursor-pointer rounded">${t("common.cancel")}</button>
          <button id="save-button" class="px-4 py-2 primary-bg primary-text font-medium cursor-pointer rounded flex items-center">
            ${t("common.save")}
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Collects session form data from the DOM.
 * @param {boolean} isEdit - Whether this is an edit form (uses "edit-" prefix)
 * @returns {Object} Session form data
 */
export function collectSessionFormData(isEdit = false) {
  const prefix = isEdit ? "edit-" : "";

  return {
    name: document.getElementById(`${prefix}session-name`).value.trim(),
    manageQuantity: document.getElementById(`${prefix}manage-quantity`).checked,
    importFeesEnabled: document.getElementById(`${prefix}import-fees-enabled`).checked,
    forwardersEnabled: document.getElementById(`${prefix}forwarders-enabled`).checked,
    manageWeight: document.getElementById(`${prefix}manage-weight`).checked,
    manageVolume: document.getElementById(`${prefix}manage-volume`).checked,
    manageDimension: document.getElementById(`${prefix}manage-dimension`).checked,
    manageDistance: document.getElementById(`${prefix}manage-distance`).checked,
  };
}
