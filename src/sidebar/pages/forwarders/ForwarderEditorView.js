import { t } from "../../../shared/i18n.js";
import { CURRENCIES, DEFAULT_CURRENCY } from "../../../shared/config/currencies.js";
import { renderCalculationRules } from "../../components/fees/index.js";
import { escapeHTML } from "../../utils/sanitize.js";

const BILLING_MODES = [
  { value: "perOrder", labelKey: "forwarders.billingMode.perOrder" },
  { value: "perIncomingPackage", labelKey: "forwarders.billingMode.perIncomingPackage" },
  { value: "perOutgoingPackage", labelKey: "forwarders.billingMode.perOutgoingPackage" },
];

const CONSOLIDATION_MODES = [
  {
    value: "as_is",
    labelKey: "forwarders.consolidationMode.asIs",
    helpKey: "forwarders.consolidationMode.asIsHelp",
  },
  {
    value: "consolidate",
    labelKey: "forwarders.consolidationMode.consolidate",
    helpKey: "forwarders.consolidationMode.consolidateHelp",
  },
  {
    value: "single",
    labelKey: "forwarders.consolidationMode.single",
    helpKey: "forwarders.consolidationMode.singleHelp",
  },
];

function renderBillingModeSelector(prefix, billingMode) {
  return `
    <div class="mb-4">
      <label class="block text-sm font-medium secondary-text mb-1">${t("forwarders.billingMode.label")}</label>
      <select name="${prefix}-billingMode" class="w-full px-3 py-2 border border-default input-bg card-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none">
        ${BILLING_MODES.map((mode) => `<option value="${mode.value}" ${billingMode === mode.value ? "selected" : ""}>${t(mode.labelKey)}</option>`).join("")}
      </select>
    </div>
  `;
}

function renderConsolidationModeSelector(consolidationMode) {
  return `
    <div class="mb-4">
      <label class="block text-sm font-medium secondary-text mb-2">${t("forwarders.consolidationMode.title")}</label>
      <p class="text-xs secondary-text mb-3">${t("forwarders.consolidationMode.description")}</p>
      <div class="space-y-2">
        ${CONSOLIDATION_MODES.map(
          (mode) => `
          <label class="flex items-start space-x-3 cursor-pointer p-2 rounded-lg border border-default hover:bg-[hsl(var(--muted))] transition-colors ${consolidationMode === mode.value ? "bg-[hsl(var(--muted))] border-[hsl(var(--primary))]" : ""}">
            <input type="radio" name="consolidationMode" value="${mode.value}" ${consolidationMode === mode.value ? "checked" : ""} class="mt-0.5 accent-[hsl(var(--primary))]">
            <div class="flex-1">
              <span class="text-sm font-medium card-text">${t(mode.labelKey)}</span>
              <p class="text-xs secondary-text mt-0.5">${t(mode.helpKey)}</p>
            </div>
          </label>
        `
        ).join("")}
      </div>
    </div>
  `;
}

function renderFeeSection(prefix, label, feeData, forwarder, preset = "simpleOnly") {
  const calcMethod = feeData?.calculationMethod || { type: "free" };
  const billingMode = feeData?.billingMode || "perOrder";
  const consolidationMode = forwarder.fees?.consolidationMode || "single";
  const isRepackaging = prefix === "repackaging";
  const isAsIs = consolidationMode === "as_is";

  // Check if reShipping method is bin-packing compatible
  const reShippingType = forwarder.fees?.reShipping?.calculationMethod?.type || "free";
  const BIN_PACKING_TYPES = ["dimension", "weight_volume", "weight_dimension", "volume_packages"];
  const showConsolidateWarning =
    consolidationMode === "consolidate" && !BIN_PACKING_TYPES.includes(reShippingType);

  return `
    <div class="fee-section mb-6 p-4 border border-default rounded-lg bg-[hsl(var(--card))]" data-fee-section="${prefix}">
      <h3 class="text-lg font-semibold card-text mb-4">${label}</h3>
      ${isRepackaging ? renderConsolidationModeSelector(consolidationMode) : ""}

      ${
        isRepackaging
          ? `
        <!-- As-is notice -->
        <p class="text-xs italic secondary-text mb-3 ${isAsIs ? "" : "hidden"}" id="as-is-notice">
          <span class="icon icon-info inline-block w-3 h-3 mr-1 align-middle"></span>
          ${t("forwarders.consolidationMode.asIsNotice")}
        </p>

        <!-- Consolidate warning -->
        <p class="text-xs italic text-amber-600 dark:text-amber-400 mb-3 ${showConsolidateWarning ? "" : "hidden"}" id="consolidate-warning">
          <span class="icon icon-warning inline-block w-3 h-3 mr-1 align-middle"></span>
          ${t("forwarders.consolidationMode.consolidateWarning")}
        </p>

        <!-- Conditional fields wrapper -->
        <div id="repackaging-conditional-fields" class="${isAsIs ? "opacity-50 pointer-events-none" : ""}">
          ${renderBillingModeSelector(prefix, billingMode)}
          ${renderCalculationRules(prefix, calcMethod, {
            preset,
            currency: forwarder.currency || DEFAULT_CURRENCY,
          })}
        </div>
      `
          : renderCalculationRules(prefix, calcMethod, {
              preset,
              currency: forwarder.currency || DEFAULT_CURRENCY,
            })
      }
    </div>
  `;
}

export function renderForwarderEditorView({ forwarder }) {
  return `
    <div class="mx-4">
      <!-- Header -->
      <div class="flex justify-between items-center mb-3">
        <div class="flex items-center space-x-3">
          <button class="muted-text p-2 cursor-pointer" id="back-button">
            <span class="icon icon-back h-8 w-8"></span>
          </button>
          <h1 class="text-2xl pl-4 font-semibold card-text">${t("forwarders.editForwarder")}</h1>
        </div>
      </div>

      <!-- Forwarder Name -->
      <div class="mb-6">
        <label class="block text-sm font-medium secondary-text mb-1">${t("forwarders.forwarderName")}</label>
        <input type="text" id="forwarder-name" value="${escapeHTML(forwarder.name)}" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none">
      </div>

      <!-- Currency -->
      <div class="mb-6">
        <label class="block text-sm font-medium secondary-text mb-1">${t("forwarders.currency")}</label>
        <select id="forwarder-currency" class="w-full px-4 py-3 border border-default input-bg card-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none">
          ${CURRENCIES.map((c) => `<option value="${c.code}" ${(forwarder.currency || DEFAULT_CURRENCY) === c.code ? "selected" : ""}>${c.code} - ${c.label} (${c.symbol})</option>`).join("")}
        </select>
      </div>

      <!-- Fee Sections -->
      ${renderFeeSection("reception", t("forwarders.receptionFees"), forwarder.fees?.reception, forwarder, "receptionWithQuantity")}
      ${renderFeeSection("storage", t("forwarders.storageFees"), forwarder.fees?.storage, forwarder, "storageWithDimensionVolume")}
      ${renderFeeSection("repackaging", t("forwarders.repackagingFees"), forwarder.fees?.repackaging, forwarder, "repackagingWithAdvanced")}
      ${renderFeeSection("reShipping", t("forwarders.reShippingFees"), forwarder.fees?.reShipping, forwarder, "forwarderReShipping")}

      <!-- Save Button -->
      <div class="flex space-x-4 my-6">
        <button id="cancel-button" class="flex-1 px-4 py-3 secondary-bg secondary-text rounded-lg hover:opacity-90 transition-colors font-medium">
          ${t("common.cancel")}
        </button>
        <button id="save-button" class="flex-1 px-4 py-3 primary-bg primary-text rounded-lg hover:opacity-90 transition-colors font-medium">
          ${t("common.save")}
        </button>
      </div>
    </div>
  `;
}
