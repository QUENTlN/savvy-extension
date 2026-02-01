import { CURRENCIES, DEFAULT_CURRENCY } from "../../../shared/config/currencies.js";
import { LANGUAGES } from "../../../shared/config/languages.js";
import {
  WEIGHT_UNITS,
  VOLUME_UNITS,
  DIMENSION_UNITS,
  DISTANCE_UNITS,
  DEFAULT_WEIGHT_UNIT,
  DEFAULT_VOLUME_UNIT,
  DEFAULT_DIMENSION_UNIT,
  DEFAULT_DISTANCE_UNIT,
} from "../../../shared/config/units.js";
import { t, getCurrentLanguage } from "../../../shared/i18n.js";

export function renderSettingsView({ settings }) {
  return `
    <div class="mx-4">
      <!-- Header -->
      <div class="flex justify-between items-center mb-3">
        <div class="flex items-center space-x-3">
          <button class="muted-text p-2 cursor-pointer" id="back-button">
            <span class="icon icon-back h-8 w-8"></span>
          </button>
          <h1 class="text-2xl pl-4 font-semibold card-text">${t("settings.title")}</h1>
        </div>
      </div>

      <!-- Settings Form -->
      <div class="space-y-6">
        <div class="card-bg rounded-xl shadow-md p-4">
          <label class="block text-sm font-medium secondary-text mb-1">${t("settings.language")}</label>
          <select id="language" class="w-full px-4 py-2 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            ${LANGUAGES.map((lang) => `<option value="${lang.code}" ${(settings.language || getCurrentLanguage()) === lang.code ? "selected" : ""}>${lang.nativeName}</option>`).join("")}
          </select>
        </div>

        <div class="card-bg rounded-xl shadow-md p-4">
          <label class="block text-sm font-medium secondary-text mb-1">${t("settings.defaultCurrency")}</label>
          <select id="currency" class="w-full px-4 py-2 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            ${CURRENCIES.map((c) => `<option value="${c.code}" ${(settings.currency || DEFAULT_CURRENCY) === c.code ? "selected" : ""}>${c.label} - ${c.symbol}</option>`).join("")}
          </select>
        </div>

        <div class="card-bg rounded-xl shadow-md p-4">
          <label class="block text-sm font-medium secondary-text mb-1">${t("settings.darkMode")}</label>
          <div class="flex items-center">
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="dark-mode" class="sr-only peer" ${settings.darkMode ? "checked" : ""}>
              <div class="toggle-switch"></div>
            </label>
          </div>
        </div>

        <div class="card-bg rounded-xl shadow-md p-4">
          <label class="block text-sm font-medium secondary-text mb-1">${t("settings.defaultWeightUnit")}</label>
          <select id="default-weight-unit" class="w-full px-4 py-2 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            ${WEIGHT_UNITS.map((u) => `<option value="${u.value}" ${(settings.defaultWeightUnit || DEFAULT_WEIGHT_UNIT) === u.value ? "selected" : ""}>${t("attributes.units." + u.value)} (${u.label})</option>`).join("")}
          </select>
        </div>

        <div class="card-bg rounded-xl shadow-md p-4">
          <label class="block text-sm font-medium secondary-text mb-1">${t("settings.defaultVolumeUnit")}</label>
          <select id="default-volume-unit" class="w-full px-4 py-2 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            ${VOLUME_UNITS.map((u) => `<option value="${u.value}" ${(settings.defaultVolumeUnit || DEFAULT_VOLUME_UNIT) === u.value ? "selected" : ""}>${t("attributes.units." + u.value)} (${u.label})</option>`).join("")}
          </select>
        </div>

        <div class="card-bg rounded-xl shadow-md p-4">
          <label class="block text-sm font-medium secondary-text mb-1">${t("settings.defaultDimensionUnit")}</label>
          <select id="default-dimension-unit" class="w-full px-4 py-2 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            ${DIMENSION_UNITS.map((u) => `<option value="${u.value}" ${(settings.defaultDimensionUnit || DEFAULT_DIMENSION_UNIT) === u.value ? "selected" : ""}>${t("attributes.units." + u.value)} (${u.label})</option>`).join("")}
          </select>
        </div>

        <div class="card-bg rounded-xl shadow-md p-4">
          <label class="block text-sm font-medium secondary-text mb-1">${t("settings.defaultDistanceUnit")}</label>
          <select id="default-distance-unit" class="w-full px-4 py-2 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            ${DISTANCE_UNITS.map((u) => `<option value="${u.value}" ${(settings.defaultDistanceUnit || DEFAULT_DISTANCE_UNIT) === u.value ? "selected" : ""}>${t("attributes.units." + u.value)} (${u.label})</option>`).join("")}
          </select>
        </div>
      </div>

      <!-- Save Button -->
      <button id="save-settings-button" class="w-full mt-6 flex items-center justify-center space-x-2 cursor-pointer primary-bg primary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm">
        <span class="text-lg font-medium">${t("settings.saveSettings")}</span>
      </button>
    </div>
  `;
}
