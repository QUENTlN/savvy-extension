import { t } from "../../../shared/i18n.js";

export function renderSessionsView({ sessions }) {
  return `
    <div class="mx-4">
      <!-- Header -->
      <div class="flex justify-between items-center mb-3">
        <h1 class="text-2xl font-semibold card-text">${t("sessions.title")}</h1>
        <div class="flex space-x-2">
          <button class="muted-text p-2 cursor-pointer" id="import-session-button" title="${t("sessions.importSession")}">
            <span class="icon icon-import h-8 w-8"></span>
          </button>
          <button class="muted-text p-2 cursor-pointer" id="settings-button" title="${t("common.settings")}">
            <span class="icon icon-settings h-8 w-8"></span>
          </button>
        </div>
      </div>

      <!-- Session Cards -->
      <div class="space-y-4">
        ${sessions.map((session) => renderSessionCard(session)).join("")}
      </div>

      <!-- New Session Button -->
      <button id="new-session-button" class="cursor-pointer mt-6 w-full flex items-center justify-center space-x-2 secondary-bg secondary-text px-4 py-3 rounded-xl hover:opacity-80 transition-colors duration-200 shadow-sm">
        <span class="icon icon-plus h-5 w-5"></span>
        <span class="text-lg font-medium">${t("sessions.createNew")}</span>
      </button>
    </div>
  `;
}

function renderSessionCard(session) {
  return `
    <div class="card-bg rounded-xl shadow-md p-4 session-item" data-id="${session.id}">
      <div class="flex justify-between items-center">
        <div class="flex-1 min-w-0 mr-4 cursor-pointer">
          <h2 class="text-xl font-medium card-text truncate">${session.name}</h2>
          <p class="muted-text text-md truncate">${session.products.length} ${t("sessions.products")}</p>
        </div>
        <div class="flex space-x-2 flex-shrink-0">
          <button class="muted-text p-1 cursor-pointer export-button" data-id="${session.id}" title="${t("sessions.exportSession")}">
            <span class="icon icon-export h-6 w-6"></span>
          </button>
          <button class="muted-text p-1 cursor-pointer edit-button" data-id="${session.id}" title="${t("sessions.editSession")}">
            <span class="icon icon-edit h-6 w-6"></span>
          </button>
          <button class="muted-text p-1 cursor-pointer delete-button" data-id="${session.id}" title="${t("sessions.deleteSession")}">
            <span class="icon icon-delete h-6 w-6"></span>
          </button>
        </div>
      </div>
    </div>
  `;
}
