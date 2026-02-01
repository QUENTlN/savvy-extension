import { t } from "../../../../shared/i18n.js";

function renderFeeSummary(fees) {
  if (!fees) return t("forwarders.noFeesConfigured");

  const feeTypes = ["reception", "storage", "repackaging", "reShipping"];
  const configured = feeTypes.filter((type) => {
    const calcMethod = fees[type]?.calculationMethod;
    return calcMethod && calcMethod.type !== "free";
  });

  if (configured.length === 0) {
    return t("forwarders.allFeesFree");
  }

  return configured
    .map((type) => {
      const calcMethod = fees[type].calculationMethod;
      let desc = "";

      if (calcMethod.type === "fixed") {
        desc = `${calcMethod.amount || 0}`;
      } else if (calcMethod.type === "percentage") {
        desc = `${(calcMethod.rate * 100).toFixed(1)}%`;
      } else if (calcMethod.type === "cumul") {
        desc = t("deliveryRules.typeCumul");
      } else if (calcMethod.isTiered && calcMethod.ranges) {
        desc = `${t("deliveryRules.tieredPricing")} (${calcMethod.ranges.length} ${t("deliveryRules.ranges")})`;
      } else {
        desc = t(
          `deliveryRules.type${calcMethod.type.charAt(0).toUpperCase() + calcMethod.type.slice(1)}`
        );
      }

      return `${t(`forwarders.${type}`)}: ${desc}`;
    })
    .join(" • ");
}

export function renderForwarderCard(forwarder) {
  return `
    <div class="card-bg rounded-xl shadow-md p-4 forwarder-item" data-id="${forwarder.id}">
      <div class="flex justify-between items-start">
        <div class="flex-1 min-w-0 mr-4">
          <h2 class="text-xl font-medium card-text mb-2">${forwarder.name}</h2>
          <p class="text-sm secondary-text mb-1">${renderFeeSummary(forwarder.fees)}</p>
        </div>
        <div class="flex space-x-2 flex-shrink-0">
          <button class="secondary-text p-1 cursor-pointer edit-forwarder-button" data-id="${forwarder.id}" title="${t("common.edit")}">
            <span class="icon icon-edit h-6 w-6"></span>
          </button>
          <button class="secondary-text p-1 cursor-pointer delete-forwarder-button" data-id="${forwarder.id}" title="${t("common.delete")}">
            <span class="icon icon-delete h-6 w-6"></span>
          </button>
        </div>
      </div>
    </div>
  `;
}
