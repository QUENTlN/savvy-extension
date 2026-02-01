import { t } from "../../../shared/i18n.js";
import { renderForwarderCard } from "./components/ForwarderCard.js";

export function renderForwardersView({ session }) {
  const forwarders = session.forwarders || [];

  return `
    <div class="mx-4">
      <!-- Header -->
      <div class="flex justify-between items-center mb-3">
        <div class="flex items-center space-x-3">
          <button class="muted-text p-2 cursor-pointer" id="back-button">
            <span class="icon icon-back h-8 w-8"></span>
          </button>
          <h1 class="text-2xl pl-4 font-semibold card-text">${t("forwarders.title")}</h1>
        </div>
      </div>

      <p class="text-sm muted-text mb-6 px-2">${t("forwarders.subtitle")}</p>

      <!-- Add Forwarder Button -->
      <div class="mb-6">
        <button id="add-forwarder-button" class="w-full flex items-center justify-center space-x-2 cursor-pointer secondary-bg secondary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm border border-default">
          <span class="icon icon-plus h-5 w-5"></span>
          <span class="text-base font-medium">${t("forwarders.addForwarder")}</span>
        </button>
      </div>

      <!-- Forwarders List -->
      ${
        forwarders.length === 0
          ? `
        <div class="text-center py-12">
          <p class="text-lg secondary-text italic">${t("forwarders.noForwarders")}</p>
        </div>
      `
          : `
        <div class="space-y-4">
          ${forwarders.map((forwarder) => renderForwarderCard(forwarder)).join("")}
        </div>
      `
      }
    </div>
  `;
}
